# Security Audit Research Notes (Bounds)

## Files Read So Far

### 1. Schema & RLS (001_initial_schema.sql, 002_storage_buckets.sql)
- **Auth**: Supabase Auth with profiles table linked via FK to auth.users
- **RLS**: Generally well-structured
  - profiles: SELECT all, UPDATE own only
  - listings: SELECT all, INSERT/UPDATE/DELETE own only
  - conversations: SELECT/INSERT by participants only
  - messages: SELECT by participants, INSERT by sender+participant
  - notifications: ALL by owner only
  - reviews: SELECT all, INSERT by reviewer only
  - storage: avatars/listing-photos SELECT all, INSERT/UPDATE/DELETE by owner (path-based)
- **Concern**: listings.owner_id references profiles.id, not auth.users.id — could allow orphaned listings if profile deleted but auth.user remains
- **Concern**: `SECURITY DEFINER` on `nearby_listings` bypasses RLS (by design for RPC)
- **Concern**: storage RLS for listing-photos uses `foldername()[1] = auth.uid()` but listing owner may change; no validation that user owns the listing

### 2. Auth Flow
- **Password-based auth** (not magic links) — signUp with email+password, email confirmation required
- **Session management**: Supabase SSR with cookie-based sessions, refresh handled by middleware
- **Middleware** (`src/middleware.ts`): Protected routes: /listing/new, /listing/*/edit, /profile, /profile/edit, /messages, /notifications
- **AuthProvider** (client): getUser() on mount + onAuthStateChange listener, fetches profile from Supabase
- **No rate limiting** visible on auth endpoints
- **Password validation**: min 8 chars, no complexity requirements
- **No 2FA/MFA support**

### 3. Storage Security
- **Validation**: MIME type (jpeg/png/webp), file size (2MB avatar, 5MB photo)
- **Client-side validation** in `storage.ts` — can be bypassed
- **Bucket-level limits** also set (good defense in depth)
- **Content scanning**: None (no AV/malware scanning)
- **Path validation**: `foldername()[1] = auth.uid()` — first segment must match user ID

### 4. Content Moderation
- **No pre-approval** for listings — any authenticated user can create
- **No content scanning** (spam, illegal goods, hate speech)
- **No report/block system** (safety page mentions "one-tap reporting" but no implementation found)
- **No admin panel** or moderation tools

### 5. Messaging Safety
- **On-platform messaging** via conversations/messages tables
- **RLS**: Only participants can read/write
- **No content scanning** of messages
- **No contact sharing prevention** — content is plain text, user could write "call me at +34..."
- **No report/block** in messaging UI

### 6. Data Privacy / GDPR
- **No privacy policy** or terms of service pages
- **No consent mechanism** for data collection
- **No data deletion flow** (account deletion)
- **No cookie consent** banner
- **No DPO contact**
- **PII collected**: email (auth.users), name, avatar_url, neighborhood, location (profiles), messages content
- **No data retention policy**
- **Right to access/export**: Not implemented
- **Right to erasure**: Not implemented

### 7. Physical Safety
- **Safety page** (`/safety`) exists with generic guidelines
- **No pickup codes** implemented (mentioned in copy but not in code)
- **No exact address sharing** — listings use neighborhood + map coordinates (but map shows precise location)
- **No emergency contact**
- **No reporting mechanism**

### 8. Financial Safety
- **No payments** in MVP — "symbolic" price type exists but no payment processing
- **No PCI concerns** (no card data)
- **No escrow**

### 9. Rate Limiting
- **None visible** — no API rate limiting, no auth brute force protection, no listing creation limits
- Supabase free tier has default limits but no app-level controls

## Still Need to Read
- Messages components (content handling, contact leak prevention)
- Profile pages (data exposure)
- Listing creation (validation, moderation)
- AppShell (navigation, auth state)
- .env.local (secrets exposure)
- next.config.ts (security headers)
- package.json (dependencies vulnerabilities)
