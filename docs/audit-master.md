# Audit Master — Neighborly MVP

> **Дата:** 2026-05-02
> **Статус:** Все 6 аудитов завершены
> **Авторы:** Atlas (lead), Proof (technical), Muse (UX/UI), Spark (product), Bounds (security), Kinetic (performance), Flux (architecture)

---

## Executive Summary

Neighborly MVP — это **архитектурно сильный проект** (Next.js 15, Supabase, PostGIS, RLS, чат production-ready) с **6 критическими блокерами**, которые делают его неготовым к продакшну.

**Тезис:** Фундамент на place, но платформа продаёт demo-опыт вместо marketplace. Core loop «найти → забронировать → забрать → вернуть → оставить отзыв» разорван на 3 из 5 этапов.

---

## P0 — Critical Blockers (запуск без фикса невозможен)

| # | Проблема | Аудитор | Почему блокер |
|---|---------|---------|--------------|
| 1 | **Mapbox 401 / пустая карта** | Atlas, Proof, Muse, Kinetic | Core feature не работает. 401 на всех mapbox-запросах. Тайлы не грузятся. Пользователь видит тёмный прямоугольник. |
| 2 | **Нет кнопки «Create listing»** | Atlas, Spark, Muse | Единственный путь — прямой URL `/listing/new`. Для marketplace это смертельно. Core action недоступен для 99% пользователей. |
| 3 | **«Request to borrow» — фейк** | Spark, Proof | Кнопка показывает `toast("demo")`, не записывает в БД. Владелец не узнаёт о запросе. Borrower не получает статус. |
| 4 | **ReservationModal — orphaned** | Spark, Proof | Полностью реализованный 4-шаговый модал ни разу не импортирован и не использован в приложении. |
| 5 | **Reviews — schema без UI** | Spark | Таблица `reviews` создана, RLS настроен, но в профиле только `{/* Placeholder */}`. «Trust-first» — пустой claim. |
| 6 | **Редирект на `/signin` вместо `/login`** | Proof | `listing/new/page.tsx` и `listing/[id]/edit/page.tsx` редиректят на несуществующий маршрут. Пользователь получает 404. |
| 7 | **Edit listing невидим для владельца** | Proof | `currentUserId` не передаётся в `ListingDetailClient`. `isOwner` всегда `false`. Владелец никогда не видит кнопку редактирования. |
| 8 | **Ссылка `/auth/sign-in` в Messages** | Proof | Несуществующий маршрут. Пользователь получает 404 вместо страницы входа. |
| 9 | **Нет LIMIT в запросах** | Flux | `getNearbyListings`, `getListingsByOwner` — без `LIMIT`. При 10K+ listings — timeout, OOM, Vercel function crash. |
| 10 | **Нет content moderation** | Bounds | Любой авторизованный пользователь может создать любое объявление. Нет pre-moderation, post-moderation, auto-scan. |
| 11 | **Нет rate limiting** | Bounds | Auth, listings, messages — без лимитов. Credential stuffing, spam, brute force возможны. |
| 12 | **GDPR — critical gaps** | Bounds | Нет privacy policy, consent flow, data deletion, cookie banner, DPO contact. |
| 13 | **Нет report/block UI** | Bounds | Backend частично есть, но пользователь не может пожаловаться или заблокировать. |

---

## P1 — High (сильно влияет на UX / безопасность / производительность)

| # | Проблема | Аудитор | Влияние |
|---|---------|---------|---------|
| 1 | **Auth waterfall на каждой странице** | Atlas, Kinetic, Flux | 2–4 последовательных Supabase-запроса перед отрисовкой. TTI ~1200–1500ms. Пользователь видит skeleton постоянно. |
| 2 | **Realtime без user-filter** | Proof | `useUnreadCount` и inbox-канал получают данные всех пользователей системы. Утечка в клиентскую память, лишний noise. |
| 3 | **Mapbox в initial bundle всех страниц** | Kinetic | ~625KB gz (74% bundle). Карта грузится даже на `/messages` где не нужна. |
| 4 | **Нет server-side prefetch для Messages** | Atlas, Spark | Страница `/messages` — пустая обёртка. Весь контент тянется в браузере (3+ последовательных запроса). |
| 5 | **Нет кэширования совсем** | Flux | Нет `React.cache`, `unstable_cache`, SWR, React Query. Каждый заход = с нуля к Supabase. |
| 6 | **Нет favorites / bookmarks** | Spark | Пользователь не может сохранить понравившуюся вещь. Нет раздела "Saved" в профиле. |
| 7 | **Radius filter сломан** | Flux | `distanceKm === 0` для всех DB-листингов. Фильтр «5 km» не работает. |
| 8 | **AuthProvider race condition** | Proof | `getUser()` и `onAuthStateChange` могут рассинхронизироваться. 3+ Supabase клиента создаются при инициализации. |

---

## P2 — Medium (tech debt, UX friction)

| # | Проблема | Аудитор |
|---|---------|---------|
| 1 | **Empty states = мёртвые концы** | Muse | «0 listings», «No messages» — нет CTA, нет onboarding. Пользователь застревает. |
| 2 | **Нет onboarding для нового пользователя** | Spark, Muse | Первый визит — нет guided tour, tooltip'ов, empty state с призывом. |
| 3 | **Нет мобильной нижней навигации** | Muse | Только десктопная шапка. На телефоне карта занимает 75% экрана, навигация неудобна. |
| 4 | **Нет Server Actions** | Flux | Вся бизнес-логика разбросана по client components. Mutations через прямой Supabase client. |
| 5 | **Double query в `getNearbyListings`** | Proof, Flux | PostGIS path делает 2 последовательных запроса вместо JOIN. |
| 6 | **`as unknown as T` / `as any`** | Proof | 6 мест в коде обходят TypeScript. |
| 7 | **Metadata base отсутствует** | Proof | OG images сломаны, социальные ссылки показывают некорректные превью. |
| 8 | **Нет `prefers-reduced-motion`** | Proof, Muse | Анимации Framer Motion не учитывают accessibility preference. |
| 9 | **Profile edit — хрупкий URL parse** | Proof | `new URL(avatar_url)` может кинуть на некорректных URL. |

---

## P3 — Low (code quality, minor)

| # | Проблема | Аудитор |
|---|---------|---------|
| 1 | `storage.ts` — мёртвый код (~200 строк) | Proof |
| 2 | `sitemap.ts` — только статические страницы | Proof |
| 3 | `console.error` в продакшн | Proof |
| 4 | Разные auth пути (`/login`, `/signin`, `/auth/sign-in`) | Atlas |
| 5 | Auth pages не проверяют "уже залогинен" | Atlas |
| 6 | `listingFilters.ts` — клиентская фильтрация всех listings | Atlas |

---

## Cross-Cutting Issues (упомянуты в 3+ аудитах)

### Mapbox 401
- **Atlas:** Диагностировал по скриншоту пользователя
- **Proof:** Подтвердил: `NEXT_PUBLIC_MAPBOX_TOKEN` в `.env.local`, но не в Vercel
- **Kinetic:** Mapbox тянет 74% bundle — даже если бы работал, это performance bomb
- **Muse:** Пустая карта — нет fallback UI, пользователь видит тёмный прямоугольник

**Вердикт:** Скорее всего URL restrictions в Mapbox dashboard. Токен может быть restricted by referer/domain и `lil-peep-opal.vercel.app` не в whitelist.

### Auth Waterfall
- **Atlas:** Описал client-only auth без server-side probe
- **Kinetic:** Замерил: 2–4 последовательных запроса, TTI ~1200–1500ms
- **Flux:** Нет кэша — каждый заход с нуля
- **Proof:** Race condition в AuthProvider, множественные Supabase клиенты

### Missing Core Loop
- **Spark:** 5 из 11 шагов core loop отсутствуют или фейковые
- **Bounds:** Trust & safety gap делает физический обмен рискованным
- **Muse:** Нет CTA в empty states — пользователь не знает что делать дальше
- **Flux:** Нет LIMIT — масштабирование невозможно

---

## Quick Wins (высокий impact, низкий effort)

| # | Fix | Effort | Impact | Кто может |
|---|-----|--------|--------|-----------|
| 1 | Добавить `NEXT_PUBLIC_MAPBOX_TOKEN` whitelist в Mapbox dashboard + redeploy | 5 мин | P0 unblock | Тимур (owner) |
| 2 | Добавить «+ Post item» кнопку в шапку / FAB на мобильном | 30 мин | P0 unblock | Atlas |
| 3 | Исправить `redirect("/signin")` → `redirect("/login")` (2 файла) | 5 мин | P0 fix | Atlas |
| 4 | Передать `currentUserId` в `ListingDetailClient` | 10 мин | P0 fix | Atlas |
| 5 | Исправить `href="/auth/sign-in"` → `href="/login"` | 2 мин | P0 fix | Atlas |
| 6 | Lazy-load `InteractiveMap` (dynamic import) | 20 мин | P1 perf | Atlas |
| 7 | Добавить `LIMIT`/`OFFSET` ко всем listing queries | 30 мин | P1 scale | Atlas |
| 8 | Подключить `ReservationModal` к кнопке «Request to borrow» | 1–2 ч | P0 core | Atlas |

---

## Full Fix Roadmap (приоритизированный)

### Phase 1 — Unblock (1–2 дня)
- [ ] Fix Mapbox 401 (URL restrictions или env var)
- [ ] Fix все P0 редиректы и broken links
- [ ] Fix `currentUserId` → edit button видна владельцу
- [ ] Добавить «+ Post item» в навигацию
- [ ] Подключить `ReservationModal` к borrow flow (backend insert)
- [ ] Reviews: базовый UI + create review flow

### Phase 2 — Performance & UX (2–3 дня)
- [ ] Lazy-load Mapbox (dynamic import)
- [ ] AuthProvider caching / staleTime
- [ ] Server-side prefetch для Messages
- [ ] Empty state CTAs («Создай первое объявление!»)
- [ ] Mobile bottom navigation
- [ ] LIMIT/OFFSET + pagination
- [ ] Realtime channel filters по user_id

### Phase 3 — Trust & Safety (3–5 дней)
- [ ] Content moderation (auto-scan на upload)
- [ ] Rate limiting (auth, listings, messages)
- [ ] Report/block UI + backend
- [ ] GDPR: privacy policy, consent, deletion flow
- [ ] Pickup code persistence + scheduling
- [ ] Password strength (zxcvbn)
- [ ] MFA для high-value actions

### Phase 4 — Polish (1–2 недели)
- [ ] Server Actions для mutations
- [ ] React Query / SWR кэширование
- [ ] Full-text search (Supabase `fts`)
- [ ] Favorites/bookmarks
- [ ] Onboarding flow
- [ ] OG images + metadata
- [ ] Accessibility audit (aria, keyboard, reduced-motion)

---

## Положительные находки (что работает хорошо)

| Аспект | Аудитор | Оценка |
|--------|---------|--------|
| RLS policies | Bounds, Proof | ✅ Well-designed, minor gaps only |
| Middleware + session refresh | Bounds, Flux | ✅ Correct 3-layer auth guard |
| PostGIS + spatial indexing | Flux, Spark | ✅ GIST index, `nearby_listings` RPC |
| Chat architecture | Spark, Bounds | ✅ Production-ready: realtime, optimistic, dedup |
| Dark/light theme | Muse | ✅ Consistent, MutationObserver sync |
| Design system | Muse | ✅ Glassmorphism, consistent tokens |
| Code quality | All | ✅ Clean, readable, well-commented |
| Schema foresight | Spark, Flux | ✅ `reviews`, `conversations`, `notifications` — future-proof |

---

## Источники

| Документ | Автор | Размер |
|----------|-------|--------|
| `docs/audit-preliminary-atlas.md` | Atlas | 12KB |
| `docs/audit-technical.md` | Proof | 24KB |
| `docs/audit-product.md` | Spark | 27KB |
| `docs/audit-security.md` | Bounds | 26KB |
| `docs/audit-security-notes.md` | Bounds | 4KB |
| `docs/audit-performance.md` | Kinetic | 14KB |
| `docs/audit-architecture.md` | Flux | 18KB |

---

*Следующий шаг: согласовать с Тимуром какие фазы/задачи запускать в первую очередь, затем декомпозировать в team_tasks и начать implementation.*
