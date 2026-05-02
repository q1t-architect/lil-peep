# Security & Trust Audit — Neighborly MVP

> **Author:** Bounds (Product Analyst)  
> **Date:** 2026-05-02  
> **Scope:** Auth, RLS, content moderation, messaging safety, data privacy (GDPR), physical safety, financial safety, rate limiting  
> **Methodology:** Static code analysis of workspace `/home/wn/.goclaw/workspace/teams/019db24f-513d-7c2b-a7a9-ce32340c49b6/lil-peep/`, Supabase migrations, Next.js middleware, and component code. No dynamic testing performed.

---

## 1. Executive Summary

Neighborly MVP is a **password-based** Next.js + Supabase marketplace for physical item exchange. The architecture shows **solid RLS foundations** but has **critical gaps in content moderation, rate limiting, GDPR compliance, and trust & safety features** that make it unsuitable for production use with strangers exchanging physical goods.

### Overall Risk Rating: 🔴 **HIGH** 

| Domain | Rating | Key Issue |
|--------|--------|-----------|
| Auth Security | 🟡 Medium | No rate limiting, weak password policy, no MFA |
| RLS / Data Access | 🟢 Low-Medium | Well-designed policies, minor gaps |
| Content Moderation | 🔴 Critical | Zero pre/post moderation, no reporting |
| Messaging Safety | 🔴 High | No content scanning, contact leak possible, no block/report |
| GDPR / Privacy | 🔴 Critical | No privacy policy, no consent, no deletion flow |
| Physical Safety | 🔴 High | Safety page is copy-only, no pickup codes, no emergency mechanism |
| Financial Safety | 🟢 Low | No payments in MVP |
| Rate Limiting | 🔴 Critical | None implemented anywhere |

---

## 2. Auth Security

### 2.1 Authentication Method

**Password-based authentication** via Supabase Auth.

- **Signup**: `supabase.auth.signUp({ email, password, options: { data: { name } } })`
- **Login**: `supabase.auth.signInWithPassword({ email, password })`
- **Email confirmation**: Required (`confirmed` state shown in UI, resend available)
- **Password reset**: `resetPasswordForEmail()` with redirect to `/auth/confirm`
- **Session**: Cookie-based JWT via `@supabase/ssr`, refresh handled in middleware

**No magic links** are offered. Password is the only method.

### 2.2 Session Management

| Aspect | Status | Detail |
|--------|--------|--------|
| Session lifetime | ✅ Managed by Supabase | Default 1 week, refresh handled automatically |
| Session refresh | ✅ Middleware | `updateSession()` refreshes tokens on every request |
| Session revocation | ✅ Supabase built-in | Admin can revoke, user can sign out |
| Concurrent sessions | ⚠️ Not limited | One user can have unlimited active sessions |
| Device/session listing | ❌ Not implemented | User cannot see or revoke specific sessions |
| "Remember me" | ❌ Not implemented | Always remembered |

### 2.3 Password Policy

```typescript
// From signup/page.tsx
if (password.length < 8) errors.password = t("auth.valPasswordTooShort");
```

**Critical gap**: Only **minimum length (8 chars)** is enforced. No requirements for:
- Uppercase / lowercase mix
- Numbers
- Special characters
- Common password blacklist
- Password strength indicator

**Recommendation**: Enforce NIST SP 800-63B guidelines (minimum 8 chars, block common passwords, allow long passphrases). Consider integrating `zxcvbn` for strength estimation.

### 2.4 Brute Force Protection

**🔴 CRITICAL GAP**: No rate limiting on auth endpoints.

- Login page (`/login`): Unlimited attempts, no CAPTCHA, no delay
- Signup page (`/signup`): Unlimited account creation
- Password reset (`/forgot-password`): Unlimited reset emails can be triggered
- Supabase free tier: Default rate limits exist but are **provider-level**, not application-level

**Risk**: Credential stuffing, account enumeration via "already registered" message, password reset spam.

### 2.5 Multi-Factor Authentication (MFA)

**❌ Not implemented.** For a marketplace where strangers meet in person, MFA is highly recommended at least for high-value actions (changing email, deleting account).

### 2.6 Open Redirect Vulnerability

```typescript
// auth/confirm/route.ts — GOOD PRACTICE
const destination = next.startsWith('/') ? next : '/'
```

✅ **Properly mitigated**. The `next` parameter is validated to start with `/`, preventing open redirects to external domains.

### 2.7 Auth Pages — Logged-in User Handling

```typescript
// middleware.ts
if (user && isAuthPage(pathname)) {
  const redirectTo = searchParams.get('redirect')
  // ... redirect away
}
```

✅ **Properly handled**. Logged-in users hitting `/login`, `/signup`, or `/forgot-password` are redirected away.

### 2.8 Middleware Route Protection

Protected routes in `middleware.ts`:
- `/listing/new`
- `/listing/:id/edit`
- `/profile` (exact)
- `/profile/edit`
- `/messages` and `/messages/*`
- `/notifications`

**⚠️ Gap**: `/profile/[id]` (public profile viewing) is **not protected** — by design, but worth noting. `/listing/[id]` (viewing) is also unprotected — correct.

**⚠️ Gap**: No protection for API routes (if any exist beyond Supabase RPC).

---

## 3. RLS Policies — Data Access Control

### 3.1 Summary Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Rating |
|-------|--------|--------|--------|--------|--------|
| `profiles` | All | — | Own | — | ✅ Good |
| `listings` | All | Own | Own | Own | ✅ Good |
| `conversations` | Participants | Participants | — | — | ✅ Good |
| `messages` | Participants | Sender+Participant | — | — | ✅ Good |
| `notifications` | Own | Own | Own | Own | ✅ Good |
| `reviews` | All | Reviewer | — | — | ✅ Good |

### 3.2 Positive Findings

1. **Conversations isolation**: `chk_different_participants CHECK (participant_1 <> participant_2)` prevents self-messaging.
2. **Messages RLS**: Both `sender_id` AND participant check required for INSERT.
3. **Notifications**: `FOR ALL` restricted to `auth.uid() = user_id`.
4. **Reviews**: `UNIQUE (listing_id, reviewer_id)` prevents duplicate reviews.
5. **Storage path-based ownership**: `(storage.foldername(name))[1] = auth.uid()::text` ties files to user ID.

### 3.3 RLS Gaps & Risks

#### 🔴 GAP-RLS-1: Listing owner_id references profiles.id, not auth.users.id

```sql
CREATE TABLE listings (
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);
```

**Risk**: If a profile is deleted (via `ON DELETE CASCADE`), the listing disappears. But if `auth.users` row is deleted via admin, profile cascade deletes → listing cascade deletes. This is actually **correct** for data consistency. However, there is **no FK from profiles.id to auth.users.id** — Supabase handles this via trigger. If trigger fails, orphaned profiles possible.

#### 🟡 GAP-RLS-2: Storage RLS does not verify listing ownership

```sql
CREATE POLICY "listing_photos_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Risk**: Any authenticated user can upload to `{any_user_id}/{any_listing_id}/{index}.ext`. The RLS only checks that first path segment equals current user's UUID. It does **not** verify that:
- The user owns the listing
- The listing exists
- The index is within 0-4

A malicious user could upload inappropriate images to another user's listing path. While the listing row wouldn't reference these images, public URLs would be guessable.

**Recommendation**: Add a `listing_photos` metadata table linking storage paths to listings, or use a server-side upload endpoint that validates ownership.

#### 🟡 GAP-RLS-3: `nearby_listings` uses SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION nearby_listings(...)
RETURNS TABLE (...) AS $$ ... $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Risk**: The function bypasses RLS. It only returns `status = 'available'` listings, which is correct. But any bug in the function logic could expose more data. **Mitigated** by the function's WHERE clause.

#### 🟡 GAP-RLS-4: No row-level rate limiting

Any authenticated user can:
- Create unlimited listings
- Send unlimited messages
- Create unlimited conversations
- Upload unlimited photos (within bucket size limits)

---

## 4. Content Moderation

### 4.1 Current State: 🔴 NONE

| Control | Status | Detail |
|---------|--------|--------|
| Pre-approval for listings | ❌ No | Any authenticated user can publish instantly |
| Post-approval / flagging | ❌ No | No admin review workflow |
| Automated content scanning | ❌ No | No AI/ML for inappropriate content |
| Spam detection | ❌ No | No rate limits on creation |
| Illegal goods detection | ❌ No | No keyword or image scanning |
| User reporting | ❌ No | "One-tap reporting" mentioned on safety page but **not implemented** |
| Admin panel | ❌ No | No moderation dashboard |
| Ban/suspend user | ❌ No | No mechanism |
| Content takedown | ❌ No | Manual SQL required |

### 4.2 Listing Creation Flow

```typescript
// listing/new/page.tsx
export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return <ListingFormClient userId={user.id} />;
}
```

**Only auth check** — no additional verification (email confirmed, profile complete, not banned, etc.).

### 4.3 What Can Be Posted

- Title, description, category, images, location, neighborhood, price
- **No content validation** beyond required fields
- **No image moderation** (inappropriate, copyrighted, violent content)
- **No keyword filtering** (weapons, drugs, etc.)
- **No link validation** (description could contain phishing URLs)

### 4.4 Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Add `status = 'pending'` for new listings, require admin approval | Medium |
| P0 | Implement user reporting (report button on listings, messages, profiles) | Low |
| P1 | Add keyword-based auto-flagging for prohibited items | Low |
| P1 | Integrate image moderation API (AWS Rekognition, Google Vision) | Medium |
| P2 | Build admin moderation dashboard | High |
| P2 | Implement user trust score / reputation system for auto-approval | High |

---

## 5. Messaging Safety

### 5.1 Architecture

On-platform messaging via Supabase Realtime:
- `conversations` table: links two participants + optional listing
- `messages` table: content + sender + conversation FK
- Realtime subscription: `supabase.channel().on('postgres_changes')`

### 5.2 Positive Findings

✅ **RLS properly isolates conversations** — only participants can read/write  
✅ **Content stored on-platform** — not external service  
✅ **Optimistic UI with deduplication** — prevents duplicate messages on reconnection

### 5.3 🔴 Critical Gaps

#### GAP-MSG-1: No content scanning
Messages are plain text with **zero filtering**:
- Phone numbers: `"Call me at +34 612 345 678"` — fully allowed
- Email addresses: `"Contact me at scam@evil.com"` — fully allowed
- External links: `"Click here: http://phishing-site.com"` — fully allowed
- Off-platform payment requests: `"Pay me via Bizum to this number"` — fully allowed
- Threats, harassment, hate speech — no detection

**Risk**: Users can easily move conversation off-platform, bypassing all safety measures. Scammers can phish, harassers can threaten.

#### GAP-MSG-2: No block/report in messaging UI
The `MessagesClient.tsx` has:
- Send message
- Select conversation
- View history
- **No "Block user" button**
- **No "Report message" button**
- **No "Delete conversation" option**

#### GAP-MSG-3: No message retention / expiration policy
Messages persist indefinitely. No auto-deletion, no "disappearing messages" option.

#### GAP-MSG-4: No conversation initiation controls
Any authenticated user can start a conversation with any other user about any listing. No opt-in required.

### 5.4 Recommendations

| Priority | Action |
|----------|--------|
| P0 | Add regex-based PII detection (phone, email, URLs) with warning/flagging |
| P0 | Add "Report" and "Block" buttons to every conversation |
| P1 | Implement message rate limiting (max X messages per minute) |
| P1 | Add "Only accept messages from verified users" option |
| P2 | Consider message expiration (e.g., auto-delete 30 days after exchange) |

---

## 6. Data Privacy / GDPR Compliance

### 6.1 GDPR Readiness Assessment

| Requirement | Status | Detail |
|-------------|--------|--------|
| **Lawful basis** | ❌ Missing | No privacy policy, no consent mechanism |
| **Transparency** | ❌ Missing | No privacy policy page, no cookie notice |
| **Data minimization** | 🟡 Partial | Collects name, email, avatar, neighborhood, location, bio, messages |
| **Purpose limitation** | 🟡 Partial | Data used for core features, but no documented purposes |
| **Accuracy** | ✅ OK | Users can edit profile |
| **Storage limitation** | ❌ Missing | No retention policy, data kept indefinitely |
| **Security** | 🟡 Partial | RLS present, but no encryption at rest docs, no audit logging |
| **Accountability** | ❌ Missing | No DPO, no Records of Processing Activities |
| **Right to access** | ❌ Missing | No "Download my data" feature |
| **Right to rectification** | ✅ OK | Profile edit available |
| **Right to erasure** | ❌ Missing | No account deletion flow |
| **Right to restrict** | ❌ Missing | Not implemented |
| **Right to portability** | ❌ Missing | No data export |
| **Right to object** | ❌ Missing | No opt-out for non-essential processing |
| **Consent** | ❌ Missing | No cookie consent, no marketing consent |

### 6.2 PII Inventory

| Data | Location | Who Can Access | Risk Level |
|------|----------|----------------|------------|
| Email | `auth.users.email` | User + Supabase admin | Medium |
| Name | `profiles.name` | Public (all users) | Low |
| Avatar URL | `profiles.avatar_url` | Public | Low |
| Neighborhood | `profiles.neighborhood` | Public | Low |
| Exact location | `profiles.location` (PostGIS) | Public (if queried) | **High** |
| Bio | `profiles.bio` | Public | Low |
| Messages content | `messages.content` | Conversation participants | Medium |
| IP address | Supabase logs | Supabase/Admin | Medium |

### 6.3 🔴 Critical Gaps

#### GAP-GDPR-1: No privacy policy or terms of service
**Risk**: Cannot lawfully process EU user data. Fines up to 4% global revenue.

#### GAP-GDPR-2: No cookie consent banner
**Risk**: GDPR + ePrivacy Directive violation. Next.js + analytics likely set cookies.

#### GAP-GDPR-3: No account deletion flow
**Risk**: Right to erasure violation. Users cannot delete their account and associated data.

**What should be deleted on account deletion**:
- `auth.users` row → cascades to `profiles` (cascade)
- `profiles` row → cascades to `listings` (cascade)
- `listings` row → cascades to `reviews` (cascade)
- `conversations` where user is participant
- `messages` sent by user
- `notifications` for user
- Storage files (avatars, listing photos)
- **Currently**: Partial cascade exists but no UI flow.

#### GAP-GDPR-4: No data export / portability
Users cannot download their listings, messages, reviews in a structured format.

### 6.4 Recommendations

| Priority | Action |
|----------|--------|
| P0 | Create `/privacy` and `/terms` pages with GDPR-compliant language |
| P0 | Add cookie consent banner with opt-in for non-essential cookies |
| P0 | Implement "Delete my account" in profile settings with full cascade |
| P1 | Add "Download my data" export (JSON/CSV) |
| P1 | Document data retention policy (e.g., delete messages 1 year after last activity) |
| P2 | Add DPO contact email in privacy policy |
| P2 | Implement audit log for admin data access |

---

## 7. Physical Safety

### 7.1 Safety Page (`/safety`)

The page exists with four pillars:
1. "Meet in well-lit public places"
2. "Pickup codes for both sides"
3. "Transparent reputation"
4. "Report quickly, act fairly"

**Problem**: These are **marketing copy only**. None are implemented in the product.

### 7.2 Exact Location Exposure

| Feature | Status | Risk |
|---------|--------|------|
| Listing neighborhood | ✅ Shows neighborhood name | Low |
| Listing map pin | ❌ Shows **exact coordinates** | **High** |
| User profile location | ❌ Stores exact coordinates in `profiles.location` | **High** |

**Risk**: A malicious user can query the map or listing detail to see the **exact GPS coordinates** of where an item is located. Combined with public profile data, this creates stalking risk.

**Recommendation**: 
- Round coordinates to ~100m precision before displaying
- Or show only neighborhood + "approximate location" on map
- Only reveal exact location after exchange is confirmed

### 7.3 Pickup Codes

**❌ Not implemented.** The safety page mentions "verification token confirms the right person" but no code generation, validation, or exchange flow exists in the codebase.

### 7.4 Emergency / Reporting

| Feature | Status |
|---------|--------|
| Emergency contact button | ❌ Not implemented |
| Report user from profile | ❌ Not implemented |
| Report listing | ❌ Not implemented |
| Report message | ❌ Not implemented |
| Block user | ❌ Not implemented |
| Safety check-in / share location with friend | ❌ Not implemented |

### 7.5 Recommendations

| Priority | Action |
|----------|--------|
| P0 | Round map coordinates to 100m for public display |
| P0 | Implement pickup code generation (6-digit, single-use) |
| P0 | Add "Report" button on every profile, listing, and message |
| P1 | Add "Share pickup plan" (optional: send location + time to trusted contact) |
| P1 | Add "Block user" functionality (prevents messages, hides listings) |
| P2 | In-app safety tips before first exchange |

---

## 8. Financial Safety

### 8.1 Payment Processing

**✅ No payments in MVP.** The `price_type` enum has `'free' | 'symbolic'` but no Stripe, PayPal, or other integration exists. No PCI-DSS concerns.

### 8.2 "Symbolic" Price

```typescript
// Schema
price_type   price_type     NOT NULL DEFAULT 'free'
price_euro   NUMERIC(6, 2)
```

If symbolic prices are intended to be paid in cash during pickup, this is low risk. If online payment is planned for future, escrow mechanism should be designed early.

### 8.3 Recommendations

| Priority | Action |
|----------|--------|
| P2 | If adding payments later: implement escrow (funds held until pickup confirmed) |
| P2 | Add "Price: Free / Symbolic (€X, cash on pickup)" clarity in UI |

---

## 9. Rate Limiting

### 9.1 Current State: 🔴 NONE

No rate limiting exists at any layer:

| Endpoint/Action | Limit | Risk |
|-----------------|-------|------|
| Login attempts | Unlimited | Brute force, credential stuffing |
| Signup attempts | Unlimited | Spam accounts, email enumeration |
| Password reset emails | Unlimited | Email abuse, DoS on user's inbox |
| Listing creation | Unlimited | Spam listings, catalog pollution |
| Messages per minute | Unlimited | Spam, harassment |
| Conversation creation | Unlimited | Harassment via unsolicited messages |
| Photo uploads | Unlimited (within bucket limits) | Storage abuse |
| API calls via Supabase client | Unlimited | Data scraping, DoS |

### 9.2 Supabase Default Limits

Supabase free tier has **project-level** rate limits (e.g., 1000 requests/minute), but these are:
1. **Not user-specific** — one user can consume the entire quota
2. **Not action-specific** — login and listing creation count the same
3. **Not punitive** — no user ban or CAPTCHA trigger

### 9.3 Recommendations

| Layer | Action | Implementation |
|-------|--------|----------------|
| Auth | Max 5 login attempts per IP per 5 min | Supabase or custom middleware |
| Auth | Max 3 password resets per email per hour | Supabase or custom endpoint |
| Signup | Max 3 accounts per IP per hour | Custom middleware + CAPTCHA |
| Listings | Max 10 listings per user per day | RLS or trigger |
| Messages | Max 30 messages per user per minute | RLS or application logic |
| API | Implement API key + rate limiting for public endpoints | Vercel Edge Config or Redis |

---

## 10. Risk Matrix

| # | Risk | Likelihood | Impact | Score | Priority |
|---|------|------------|--------|-------|----------|
| 1 | **No content moderation** — scams, illegal goods, harassment | High | Critical | 🔴 **Critical** | P0 |
| 2 | **No rate limiting** — brute force, spam, abuse | High | Critical | 🔴 **Critical** | P0 |
| 3 | **No GDPR compliance** — fines, legal liability | High (if EU users) | Critical | 🔴 **Critical** | P0 |
| 4 | **Exact GPS exposed** — stalking risk | Medium | Critical | 🔴 **Critical** | P0 |
| 5 | **No messaging safeguards** — off-platform contact, phishing | High | High | 🔴 **High** | P0 |
| 6 | **No report/block** — repeat offenders can't be stopped | Medium | High | 🔴 **High** | P0 |
| 7 | **Weak password policy** — account takeover | Medium | High | 🟡 **High** | P1 |
| 8 | **No pickup codes** — item theft, wrong person | Medium | Medium | 🟡 **Medium** | P1 |
| 9 | **Storage RLS path ownership only** — malicious uploads | Low | Medium | 🟡 **Medium** | P1 |
| 10 | **No MFA** — account security | Low | Medium | 🟡 **Medium** | P2 |
| 11 | **No session management UI** — can't revoke sessions | Low | Low | 🟢 **Low** | P2 |
| 12 | **No data retention policy** — storage growth | Medium | Low | 🟢 **Low** | P2 |

---

## 11. Compliance Checklist

### 11.1 GDPR (EU Users)

- [ ] Privacy policy page (`/privacy`)
- [ ] Terms of service page (`/terms`)
- [ ] Cookie consent banner with opt-in
- [ ] Lawful basis documentation
- [ ] Data retention policy documented
- [ ] "Delete my account" flow with full cascade
- [ ] "Download my data" export feature
- [ ] DPO contact information
- [ ] Records of Processing Activities (RoPA)
- [ ] Data Processing Agreement with Supabase
- [ ] International transfer safeguards (if applicable)

### 11.2 Marketplace Regulations (EU Digital Services Act — if >50 users)

- [ ] Illegal goods detection and takedown mechanism
- [ ] Trusted flagger system
- [ ] Transparency reporting on moderation actions
- [ ] Terms and conditions enforcement
- [ ] User complaint handling mechanism

### 11.3 General Security Best Practices

- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting on all public endpoints
- [ ] Input validation and sanitization
- [ ] Dependency vulnerability scanning
- [ ] Security audit logging
- [ ] Incident response plan
- [ ] Penetration testing (before production)

---

## 12. Recommendations by Priority

### P0 — Block Production Launch

1. **Implement rate limiting** on auth, listing creation, messaging
2. **Add content moderation** — at minimum: keyword flagging + admin approval for listings
3. **Add report/block system** — report button on profiles, listings, messages; block prevents interaction
4. **Create privacy policy + terms** + cookie consent
5. **Implement account deletion** with full data cascade
6. **Round GPS coordinates** to 100m for public display
7. **Add message PII detection** — warn users when sharing phone/email

### P1 — High Priority (Fix Within 2 Weeks)

8. **Strengthen password policy** — minimum 12 chars, complexity requirements, zxcvbn integration
9. **Add email confirmation enforcement** — don't allow listing creation until email confirmed
10. **Implement pickup codes** — 6-digit codes for exchange verification
11. **Fix storage RLS** — validate listing ownership before allowing photo upload
12. **Add listing creation limits** — max X per user per day
13. **Add "verified user" badge** with light identity verification

### P2 — Medium Priority (Post-MVP)

14. **Add MFA** — TOTP for sensitive actions
15. **Build admin moderation dashboard**
16. **Integrate image moderation API**
17. **Add data export feature**
18. **Implement security headers** in Next.js config
19. **Add audit logging** for admin actions and security events
20. **Dependency vulnerability scanning** (Snyk/Dependabot)

---

## 13. Specific Code References

### Positive Security Patterns Found

```
src/middleware.ts:35-45      — isProtectedRoute() properly guards sensitive pages
src/middleware.ts:68-72      — Open redirect mitigated via next.startsWith('/')
src/app/auth/confirm/route.ts:18 — Code exchange with redirect validation
supabase/migrations/001: — RLS policies on all tables
supabase/migrations/002: — Storage path-based ownership
src/lib/storage.ts:43-51   — Client-side file validation (MIME + size)
```

### Vulnerable / Risky Patterns Found

```
src/app/(auth)/login/page.tsx:45-50 — No rate limiting on signInWithPassword
src/app/(auth)/signup/page.tsx:58-65 — No rate limiting on signUp
src/app/(auth)/forgot-password/page.tsx:31-36 — Unlimited reset emails
src/components/messages/MessagesClient.tsx:308-320 — No content validation on send
src/components/auth/AuthProvider.tsx:47 — Profile fetched client-side, waterfall
next.config.ts:4-11 — No security headers (CSP, HSTS)
```

---

## 14. Appendix: Data Flow Diagram

```
User (Browser)
  ├─ Auth: Supabase Auth (email+password, JWT cookie)
  ├─ Listings: Supabase RPC (nearby_listings) + RLS
  ├─ Messages: Supabase Realtime (INSERT subscription)
  ├─ Uploads: Supabase Storage (avatars, listing-photos)
  └─ Profile: Supabase profiles table (RLS: own update, all read)

Supabase
  ├─ auth.users (email, encrypted password, metadata)
  ├─ profiles (public data, location)
  ├─ listings (owner_id, content, images[], location)
  ├─ conversations (p1, p2, listing_id)
  ├─ messages (conversation_id, sender_id, content)
  ├─ notifications (user_id, title, body)
  ├─ reviews (listing_id, reviewer_id, reviewee_id, rating)
  └─ storage (avatars, listing-photos)

Admin/Moderation
  └─ ❌ No interface exists
```

---

*This audit is based on static code analysis as of 2026-05-02. Dynamic testing (penetration testing, fuzzing) would likely reveal additional vulnerabilities.*
