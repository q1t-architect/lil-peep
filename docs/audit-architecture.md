# Architectural Audit — Neighborly MVP
**Date:** 2026-05-02  
**Scope:** Data flow, caching, state management, scalability  
**Auditor:** Flux (architecture review pass)

---

## 1. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Request                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ middleware.ts│  updateSession() — cookie refresh
                    │             │  route auth guard → /login redirect
                    └──────┬──────┘
                           │
          ┌────────────────┴────────────────┐
          │ Protected routes                 │ Public routes
          │ /listing/new, /messages, etc.    │ /, /listing/[id], /profile/[id]
          └────────────┬─────────────────────┘
                       │
          ┌────────────▼─────────────────────────────┐
          │  Server Component (page.tsx)              │
          │  ─────────────────────────────────────── │
          │  await createClient()                     │
          │  await getListing(id)                     │  ← listings.server.ts
          │  await supabase.auth.getUser()            │  ← session check
          │  await getListingsByOwner(id)             │
          └────────────┬─────────────────────────────┘
                       │  props: listing, currentUserId, listings[]
          ┌────────────▼─────────────────────────────┐
          │  Client Component (*Client.tsx)           │
          │  ─────────────────────────────────────── │
          │  useAuth() → { user, profile, loading }   │  ← AuthProvider context
          │  useState / local UI state                │
          │  createClient() for mutations             │  ← listings.client.ts
          │  Supabase realtime subscriptions          │  ← useUnreadCount hook
          └──────────────────────────────────────────┘

Auth Context Bootstrap:
  mount → supabase.auth.getUser() → fetch profiles row
        → onAuthStateChange() listener (persistent)

Notification badge:
  mount + user → supabase.channel("notifications-badge")
               → postgres_changes on notifications table
               → getUnreadCount() on any change
```

---

## 2. Architecture Decisions Review (ADR-Style)

### ADR-01: Server Components as primary data-fetching layer

**Decision:** All listing/profile queries run in Server Components (`page.tsx`). Client Components receive data as props.

**Assessment: ✅ Correct for MVP.**

Eliminates loading spinners for initial data, sends minimal JS to browser, enables streaming. The pattern is consistent:
- `src/app/page.tsx` → `getNearbyListings()` → `HomePageClient`
- `src/app/listing/[id]/page.tsx` → `getListing()` → `ListingDetailClient`
- `src/app/profile/[id]/page.tsx` → profile + `getListingsByOwner()` → `ProfileClient`

**Risk:** Prop drilling is currently one level deep (Server → Client) and non-problematic. If component tree deepens, consider React Context or Server Component composition instead of multi-level prop drilling.

---

### ADR-02: `listings.server.ts` / `listings.client.ts` separation

**Decision:** Server queries in `listings.server.ts`, client mutations in `listings.client.ts`. File naming enforces the boundary.

**Assessment: ✅ Correct pattern.**

The naming convention (`*.server.ts`, `*.client.ts`) mirrors Next.js module conventions and makes the boundary explicit. Prevents accidental import of server-only code into client bundles.

**Gap:** The adapter layer (WKT parsing, field normalization) lives entirely in `listings.server.ts`. If a client-side listing update needs to display the same normalized data immediately (optimistic UI), there's no shared adapter. For now this is fine — the app re-fetches on navigation.

---

### ADR-03: AuthProvider as React Context

**Decision:** Global auth state (`user`, `profile`, `loading`) is distributed via React Context wrapping the entire app.

**Assessment: ✅ Proportionate for MVP. Not overkill.**

Auth state is genuinely global (AppShell nav, any protected component, owner checks). Context is the right tool. The implementation is correct:
1. `getUser()` on mount avoids flash of unauthenticated state
2. `onAuthStateChange` keeps state live without polling
3. Profile fetched once on SIGNED_IN event

**Risk (minor):** Every Context value change re-renders all consumers. Since `user` and `profile` only change on login/logout, this is a non-issue in practice.

**Risk (real):** `loading` flag is `true` until the async `getUser()` resolves on first render. AppShell shows a skeleton during this window. This is correct behavior but adds ~100–200ms perceived latency on first load. A server-side `currentUserId` prop (already done in `ListingDetailClient`) is the right mitigation pattern and should be extended to other critical components.

---

### ADR-04: Supabase Realtime for notification badge

**Decision:** `AppShell` subscribes to `postgres_changes` on the `notifications` table (filtered by `user_id`) to update the unread count badge live.

**Assessment: ⚠️ Works, but has a leak risk.**

The subscription is created in a `useEffect` and cleaned up on unmount. However:
1. The channel is named `"notifications-badge"` — a static string. If `AppShell` remounts (e.g., during route transitions that unmount/remount the layout), duplicate channels may briefly coexist before cleanup.
2. The `user` dependency in `useEffect` is correct — subscription is torn down and re-created on auth change.
3. Supabase free tier allows 200 concurrent realtime connections. A single user opening the app in multiple tabs creates multiple subscriptions.

**Recommendation:** Use a singleton realtime manager or move the subscription to a dedicated hook with a ref-based deduplication guard.

---

### ADR-05: No Server Actions — direct Supabase client calls from Client Components

**Decision:** Mutations (create/update/delete listing, submit report, send message, create reservation) call `createClient()` directly from Client Components.

**Assessment: ⚠️ Acceptable now, creates exposure at scale.**

This means:
- The Supabase anon key is used for all mutations (expected — RLS enforces authorization)
- No server-side validation layer between the client and the database
- RLS policies are the only security barrier

This is the standard Supabase pattern. The risk is that complex business logic (e.g., "a user can only have 3 active reservations") must live in RLS policies or DB triggers, not application code. Currently there is no such logic, so it's fine.

**At scale:** If business rules become complex (rate limiting, fraud detection, payment processing), the lack of a server-side API layer becomes a significant gap. Server Actions would be the natural upgrade path in Next.js 15.

---

### ADR-06: PostGIS for geolocation

**Decision:** Listing locations stored as PostGIS `GEOGRAPHY(POINT)`. The `nearby_listings()` RPC function handles distance queries. Client-side: WKT strings are parsed in `parseLocation()` and converted to `{ x: lng, y: lat }`.

**Assessment: ✅ Correct tool. Execution has gaps.**

The schema creates a GIST index on `listings.location`, which is correct. However:
- `getNearbyListings()` currently uses `.eq("status", "available")` — a full table scan with client-side filtering, **not** the `nearby_listings()` RPC
- `distanceKm` is hardcoded to `0` in the adapter (geolocation-based distance not yet implemented)
- The radius filter in `listingFilters.ts` (`distanceKm <= radiusKm`) always passes through all listings because `distanceKm === 0`

**Impact:** The map shows listings at correct coordinates (PostGIS coords → Mapbox), but distance-based filtering is entirely non-functional. Radius slider in FilterBar has no effect.

---

## 3. Caching Strategy

### Current state: No caching

Every page load triggers a fresh Supabase query. There is no:
- `React.cache()` wrapper on server fetches
- `unstable_cache` from Next.js
- SWR or React Query on the client
- HTTP cache headers on API responses
- Redis/Upstash for computed aggregates

### Why this is acceptable for an MVP

The Supabase JS client uses `fetch` internally. Next.js 15 `fetch` is cached by default per-request in Server Components (request memoization). This means multiple calls to `getListing(id)` within a single render tree won't result in multiple HTTP round-trips — but there's no cross-request caching.

### What breaks under load

| Scenario | Current behavior | Impact |
|----------|-----------------|--------|
| 100 users load homepage simultaneously | 100 queries to Supabase | Supabase handles this fine at MVP scale |
| Homepage re-renders on each visit | Fresh DB query every time | No stale data risk, but no performance benefit |
| Listing detail page | 2 queries: getListing + auth.getUser | Acceptable |
| Profile page | 3 queries: profile + listings + auth | Acceptable |

### Recommended caching additions (priority order)

**1. `React.cache()` on hot read paths** (low effort, high impact)

Wrap `getListing()` and `getNearbyListings()` in `React.cache()`. This deduplicates identical calls within a single React render tree for free.

**2. Next.js `unstable_cache` for homepage listings** (medium effort)

The homepage listing query (`getNearbyListings`) can be cached with a 60-second TTL since listing freshness is not critical to the second. Invalidate on listing create/update via `revalidateTag`.

**3. SWR for client-side notification count** (medium effort)

The notification badge currently uses Supabase realtime. SWR with a `refreshInterval` would be simpler and avoid realtime connection overhead.

**4. React Query for messages page** (high effort, deferred)

The messages page likely has complex polling/realtime needs. React Query's `useInfiniteQuery` + Supabase realtime is the production-ready pattern.

---

## 4. Scalability Bottlenecks

### At 1,000 listings — current behavior is fine
The `getNearbyListings()` query filters by `status = 'available'` and the `listings.status` column has an index. Supabase will handle 1K rows with sub-10ms query times.

### At 10,000 listings — first problems appear

| Problem | Cause | Fix |
|---------|-------|-----|
| Homepage loads all available listings | No `LIMIT` clause | Add `LIMIT 50` + pagination or cursor |
| Map renders all pins at once | GeoJSON FeatureCollection with 10K features | Cluster-only at zoom < 12, paginate on zoom-in |
| FilterBar applies radius filter client-side | `distanceKm === 0` for all DB listings | Fix: use PostGIS `nearby_listings()` RPC with actual radius |
| Full table scan on `status` | N/A — index exists | ✅ Already indexed |

### At 100,000 listings — structural changes needed

1. **Missing `LIMIT` is critical.** A query returning 100K rows will timeout or exhaust memory.
2. **The WKT `parseLocation()` adapter runs per-row in JavaScript.** At 100K rows this is 100K regex executions. Fix: select `ST_AsGeoJSON(location)` or `ST_X(location)`, `ST_Y(location)` directly.
3. **`getNearbyListings()` doesn't use `nearby_listings()` RPC** — the GIST index goes unused. At 100K rows, a full-scan filtered by status is slow.
4. **Realtime channels:** Supabase free tier caps at 200 concurrent connections. With 100K users, this requires a Pro plan + channel management strategy (subscribe only when tab is active, unsubscribe on blur).

### N+1 query analysis

**Current:** `listings.server.ts` uses `.select("*, owner:profiles(*)")` — a single JOIN query. No N+1. ✅

**Risk surface:** The `ReviewsSection` and `ProfileReviews` components fetch reviews independently from the listing/profile page. This is two separate queries (page + component), not N+1 per se, but is an extra round-trip that could be consolidated into the initial server fetch.

### Image storage

Supabase Storage bucket `listing-photos` allows 5MB per file. At 100K listings with 4 photos each, that's potentially 400K objects. Supabase handles this fine (S3-backed), but:
- No CDN configured in `next.config.ts` beyond the Supabase CDN origin
- No image optimization pipeline (resize, WebP conversion) — all uploads are raw
- `next/image` handles browser-side optimization but the source images are unprocessed

---

## 5. Auth Architecture

### Middleware (correct)

`src/middleware.ts` calls `updateSession()` on every non-asset request. This:
1. Reads the Supabase session from cookies
2. Refreshes the JWT if expired (using the refresh token)
3. Writes updated cookies back to the response

This is the correct @supabase/ssr pattern for Next.js App Router. ✅

### Server-side session validation (partially correct)

`listing/[id]/page.tsx` calls `supabase.auth.getUser()` after fetching the listing. This returns the authenticated user from the server-side session cookie. `currentUserId` is passed to the Client Component for the owner check — correct pattern.

**Gap:** Not all protected routes validate the session on the server. The middleware redirects unauthenticated users, but once inside a protected page, the Server Component doesn't always re-verify the user before rendering sensitive data. For read-only data this is acceptable (RLS handles it). For write operations, RLS is the actual gate.

### JWT refresh strategy (handled by Supabase)

Supabase JWTs expire in 1 hour by default. The middleware's `updateSession()` call automatically refreshes using the refresh token (valid for 7 days by default). This is transparent to the application. ✅

### Auth flow summary

```
1. User signs up → Supabase Auth creates auth.users row
2. DB trigger fires → INSERT into public.profiles (auto-created)
3. AuthProvider mounts → getUser() → fetch profile → set context
4. onAuthStateChange → keeps context fresh for tab lifetime
5. Middleware → updateSession() on every request → JWT refresh
6. RLS → all DB operations scoped to auth.uid() automatically
```

---

## 6. Summary: Recommendations by Priority

### Immediate (before any production traffic)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 1 | `getNearbyListings()` has no `LIMIT` | Add `.limit(100)` and cursor-based pagination | 30 min |
| 2 | Distance filter non-functional (`distanceKm === 0`) | Call `nearby_listings()` RPC with user coords | 2h |
| 3 | `parseLocation()` unused now that `location: {x,y}` exists | Remove dead code, select `ST_X/ST_Y` directly | 30 min |

### Short-term (before public launch)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 4 | No caching on homepage | `React.cache()` + `unstable_cache` with 60s TTL | 2h |
| 5 | Realtime channel leak potential | Ref-based dedup guard in useUnreadCount | 1h |
| 6 | ReviewsSection extra round-trip | Include reviews in initial page query | 2h |
| 7 | No image optimization pipeline | Supabase image transform or Cloudflare Images | 4h |

### Medium-term (at 10K+ listings)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 8 | Map loads all pins at once | Server-side clustering at zoom levels | 1 day |
| 9 | No pagination on any list view | Cursor-based pagination in all server queries | 1 day |
| 10 | No server-side validation layer | Server Actions for mutations with Zod validation | 2 days |
| 11 | Complex business rules in components | Extract to Server Actions + DB constraints | 2 days |

### Deferred (scaling phase)

- React Query for messages + realtime hybrid
- Redis (Upstash) for hot aggregates (listing counts, user stats)
- Background jobs (Supabase Edge Functions) for notifications + email
- CDN for static listing images (Cloudflare R2 or similar)

---

## 7. Overall Assessment

**Architecture grade: B+ for an MVP**

The data flow is clean, the server/client boundary is well-defined, auth is correctly implemented, and the database schema shows good engineering (PostGIS, RLS, triggers). The main gaps are in the caching layer (none) and in the distance-based filtering (broken). These are typical MVP shortcuts that are acceptable at zero traffic but must be addressed before any public launch.

The absence of Server Actions is a conscious trade-off — direct Supabase SDK calls are simpler and RLS is a legitimate security layer. The risk is that complex business logic becomes scattered across components. For Neighborly's current feature surface this is manageable.

The realtime implementation is functional but fragile at scale. The current Supabase Realtime usage (one channel for notification count) is appropriate; the concern would arise if more components add independent subscriptions without a centralized manager.
