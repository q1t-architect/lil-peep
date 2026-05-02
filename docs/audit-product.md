# Продуктовый аудит Neighborly MVP

> Автор: Spark (фронтенд)  
> Дата: 2026-05-02  
> Статус: Завершён — ожидает ревью Atlas  
> На основе: code review полного репозитория (`src/`, `supabase/migrations/`, `docs/audit-preliminary-atlas.md`)

---

## TL;DR

**Это MVP с серьёзными дырками.** Фундамент сильный (Next.js 15, Supabase, PostGIS, Realtime chat), но core user loop «найти → забронировать → забрать → вернуть → оставить отзыв» разорван на трёх из пяти этапов. Платформа выглядит как marketplace, но продаёт демо-опыт. Запуск в прод без дозаполнения критических gap’ов невозможен.

---

## 1. Core Loop: от "зашёл на сайт" до "получил/отдал вещь"

### 1.1 User story пошагово

| Шаг | Статус | Реализация | Оценка |
|-----|--------|-----------|--------|
| 1. Открыть сайт, увидеть карту/список | ✅ | `HomePage` + `InteractiveMap` + `ListingCard` | Работает |
| 2. Зарегистрироваться / войти | ✅ | Supabase Auth, `login`, `signup`, email confirmation | Работает |
| 3. Создать объявление | ⚠️ | Форма `ListingFormClient` есть, **но нет ссылки в UI** | Функционал спрятан |
| 4. Найти вещь через карту/фильтры | ✅ | `nearby_listings` RPC, `FilterBar`, категории | Работает |
| 5. Просмотреть детали вещи | ✅ | `ListingDetailClient`, галерея, owner card | Работает |
| 6. Нажать "Request to borrow" | ❌ | `onClick={() => showToast("Reservation request sent (demo).")}` | **Фейк — нет backend-записи** |
| 7. Получить подтверждение от owner | ❌ | Нет reservation flow, нет статуса "pending" | Отсутствует |
| 8. Договориться о pickup в чате | ⚠️ | Chat есть, но нет pickup scheduling / calendar | Частично |
| 9. Подтвердить получение (pickup code) | ❌ | `ReservationModal` генерирует случайный код, не сохраняет | Демо-only |
| 10. Вернуть вещь / подтвердить возврат | ❌ | Нет return flow, нет сроков аренды | Отсутствует |
| 11. Оставить отзыв / рейтинг | ❌ | `reviews` таблица в schema, но UI не использует | Отсутствует |

### 1.2 Где разрывы

**Критические разрывы (без них marketplace не работает):**

1. **"Request to borrow" — пустышка.** Кнопка на странице listing показывает toast и ничего не записывает в БД. Владелец не узнает о запросе. Borrower не получает статус. Это не flow, это анимация.

2. **ReservationModal — orphaned component.** Красивый 4-шаговый модал (borrow/reserve → fee review → confirm → pickup code) существует в `src/components/reservation/ReservationModal.tsx`, но **не импортирован и не использован** ни на одной странице. Проверил все imports — нигде не подключён.

3. **Нет transition между статусами.** Schema определяет `listing_status` ENUM (`available` → `reserved` → `given`), но в UI нет механизма перехода. Owner не может "отдать" вещь. Borrower не может "вернуть". Статус меняется только через Edit form.

4. **Reviews — schema без UI.** Таблица `reviews` создана (001_initial_schema.sql), RLS настроен, но `ProfileViewClient` содержит комментарий `{/* Placeholder for future reviews from Supabase */}`. Создание отзыва после сделки невозможно. Рейтинг (`profiles.rating`) отображается, но никогда не обновляется — он static/default.

---

## 2. Listing Lifecycle

```
[Создать]      ✅ createListing() → insert в БД
[Опубликовать] ✅ status = 'available' по умолчанию
[Найти]        ✅ nearby_listings RPC + карта + фильтры
[Забронировать]❌ Нет booking flow. Toast-demo.
[Забрать]      ❌ Нет pickup scheduling, нет pickup code persistence
[Вернуть]      ❌ Нет return flow, due dates, return confirmation
[Завершить]    ❌ Нет "mark as returned/complete"
[Отзыв]        ❌ Reviews table существует, UI — нет
```

### 2.1 Что реализовано

- **CRUD listings**: создать, редактировать (`/listing/[id]/edit`), удалить (`deleteListing`). Server-side RLS защищает.
- **Geo-данные**: PostGIS POINT, `nearby_listings` функция, индекс GIST.
- **Фото**: upload в Supabase Storage (`listing-photos` bucket), до 5 фото, валидация MIME/size.
- **Статусы в schema**: `available | reserved | given` — но управление статусом только через Edit form.

### 2.2 Чего нет

- **Status workflow UI**: Owner не может одним кликом "Mark as given" или "Pause listing".
- **Due dates / borrowing period**: Нет поля `borrowed_until`, нет reminder'ов.
- **Return handoff**: Нет подтверждения возврата обеими сторонами.
- **Listing history**: Нет архива завершённых сделок.

---

## 3. Missing Features — deep dive

### 3.1 Search (not just filter)

**Текущее состояние:** `FilterBar` имеет текстовое поле `query`, которое фильтрует **уже загруженные** listings на клиенте (`filterListings` в `listingFilters.ts`).

**Проблемы:**
- Нет server-side full-text search (PostGIS `nearby_listings` не ищет по тексту).
- При 1000+ listings клиент загрузит все, а потом отфильтрует — не масштабируется.
- Нет autocomplete, нет search suggestions.
- Нет search by owner name.

**Gap:** Medium — для MVP Madrid-only с небольшим каталогом клиентская фильтрация терпима, но это tech debt.

### 3.2 Favorites / Bookmarks

**Статус:** ❌ Полностью отсутствуют.

Нет таблицы `favorites`, нет UI-кнопки ♡ на карточке, нет раздела "Saved" в профиле. Для marketplace, где user может вернуться к понравившейся вещи — критично.

### 3.3 Listing Status Management

**Статус:** ⚠️ Partial.

- Владелец может редактировать listing (`/listing/[id]/edit`) и изменить `status` через dropdown.
- Нет быстрых actions в профиле: "Pause", "Mark as given", "Re-list", "Delete".
- Нет bulk actions.
- Нет "Expired" статуса для auto-archive.

### 3.4 Borrower Request Flow ("I want to borrow this")

**Статус:** ❌ Демо.

- `ListingDetailClient`: `onClick={() => showToast("Reservation request sent (demo).")}`
- Нет таблицы `reservations` или `borrow_requests`.
- Нет статуса "pending" для listing.
- Owner не получает notification о запросе (в `notifications` таблице тип `reservation` есть, но вставка не происходит).

### 3.5 Pickup Scheduling / Calendar

**Статус:** ❌ Отсутствует.

- Chat есть, но нет inline-календаря для выбора слота.
- Нет `pickup_time`, `pickup_location_detail` полей.
- `ReservationModal` показывает "Chat opens to arrange a safe public handoff" — но это copy, не функционал.

### 3.6 Return Confirmation / Pickup Code

**Статус:** ❌ Демо.

- `ReservationModal` шаг 3 генерирует `randomCode()` — случайная строка в браузере.
- Нет таблицы `pickup_codes` или `reservations` для хранения.
- Нет проверки кода при встрече.
- Нет QR-кода или deep link.

### 3.7 Dispute / Report Mechanism

**Статус:** ❌ Демо.

- "Report listing" кнопка: `showToast("Report submitted (demo).")`
- Нет таблицы `reports`.
- Нет moderation dashboard.
- Нет блокировки user → user.

### 3.8 Push Notifications

**Статус:** ❌ Отсутствуют.

- In-app notifications: ✅ (таблица `notifications`, `NotificationsClient`, `useUnreadCount` с realtime)
- Email notifications: ❌ Нет интеграции (Resend, SendGrid, Supabase hooks не настроены).
- Push (Web Push / mobile): ❌ Нет.

### 3.9 In-App Payments (deposit, symbolic fee)

**Статус:** ❌ Демо.

- `ReservationModal` показывает "Symbolic platform fee" (€0.05 для free, €0.50 для symbolic).
- Нет payment provider (Stripe, Adyen, etc.).
- Нет `payments` или `transactions` таблицы.
- Fee не собирается — чисто copy.
- Deposit: не предусмотрен в schema.

---

## 4. Trust & Safety

### 4.1 Что реализовано

| Фича | Статус | Примечание |
|------|--------|-----------|
| Verified badge | ✅ | `profiles.verified` BOOLEAN, отображается |
| Rating display | ⚠️ | Показывается, но **не обновляется** — static |
| Exchanges count | ⚠️ | Показывается, но **не инкрементируется** |
| Safety guidelines | ✅ | `/safety` страница с контентом |
| Community standards | ✅ | `ProfileViewClient` показывает 3 пункта |
| RLS policies | ✅ | Все таблицы защищены, политики на SELECT/INSERT/UPDATE/DELETE |
| Chat on-platform | ✅ | Сообщения в Supabase, RLS по участникам conversation |
| Report listing (UI) | ⚠️ | Кнопка есть, но backend — нет |

### 4.2 Чего не хватает для "trust-first"

1. **Reviews с контентом.** Schema есть, UI нет. User не может прочитать, что другие сказали о владельце. Rating без reviews — пустой индикатор.

2. **Rating evolution.** `profiles.rating` и `exchanges` — default 0. Нет trigger'а на `INSERT` в `reviews` для пересчёта. Нет `UPDATE` profile при завершении сделки.

3. **Identity verification flow.** `verified` — boolean ручного админа. Нет self-verification (email → phone → ID document). Для hyperlocal trust это критично.

4. **Block / mute user.** Нет таблицы `blocks`. В чате нет "Report user" или "Block".

5. **Content moderation.** Нет auto-flag для listings (спам, запрещённые предметы). Нет moderation queue.

6. **Pickup safety.** Safety page говорит "public meetups", но нет in-app safety checklist перед pickup, нет "Share my location with friend", нет emergency contact.

---

## 5. Engagement

### 5.1 Onboarding

**Статус:** ❌ Отсутствует.

- Новый пользователь после регистрации попадает на Home page с пустой картой.
- Нет welcome modal, нет "Add your first listing" CTA, нет tooltips.
- Профиль создаётся auto-trigger'ом (`handle_new_user`), но с пустым `name`, `bio`, `neighborhood`.
- Пользователь не знает, что делать дальше.

### 5.2 Empty States

| Место | Empty state | CTA |
|-------|-------------|-----|
| Home (0 listings) | ✅ "Quiet block" с подзаголовком | ❌ Нет кнопки "Post first item" |
| Profile (0 listings) | ✅ "No listings yet" текст | ❌ Нет кнопки "Create listing" |
| Messages (0 conversations) | ✅ "No conversations yet" | ❌ Нет "Start browsing" |
| Notifications | ✅ "No notifications yet" | ❌ Нет action |

**Проблема:** Empty states описательные, но не конверсионные. Нет явного CTA, который ведёт к core action.

### 5.3 Referral / Gamification

**Статус:** ❌ Отсутствуют.

- Нет referral code / invite friends.
- `exchanges` count есть в schema, но не инкрементируется → не gamification.
- Нет badges ("First borrow", "Super neighbor", "Carbon saver").
- Нет leaderboard / neighborhood stats.

### 5.4 Wishlist

**Статус:** ⚠️ Static demo.

- `WISHLIST_TAGS` в `constants.ts` — хардкод: "Hammer", "Drill", "Football boots"...
- Отображаются на Home page как non-interactive tags.
- Нет "I need this" функционала, нет уведомлений "Your wishlist item appeared".

---

## 6. Monetization

### 6.1 Модель

**Заявленная:** Symbolic service fee (€0.05–€0.50) — "like a stamp on a postcard".

**Реальная:** Нет.

### 6.2 Что в коде

- `price_type` ENUM: `free | symbolic`
- `price_euro` NUMERIC(6,2) — позволяет хранить сумму
- `ReservationModal` демонстрирует fee на шаге 2
- **Нет:** payment provider, `transactions` table, `payments` table, payout logic, fee collection.

### 6.3 Deposit

- Не предусмотрен в schema.
- Нет escrow / hold logic.

### 6.4 Вывод

Монетизация — copy-only. Для запуска это допустимо (MVP = бесплатно), но для sustainability model нужна интеграция Stripe Connect или аналога. Приоритет: P2 (после работающего core loop).

---

## 7. Platform Vision Alignment

### 7.1 "Sustainable neighborhoods"

| Где заявлено | Где отражено | Оценка |
|-------------|-------------|--------|
| Metadata / copy | `title`, `description`, safety page | ✅ |
| Функционал (carbon saved, reuse count) | ❌ Нет | ❌ |
| Neighborhood-level аналитика | ❌ Нет | ❌ |
| Environmental impact tracker | ❌ Нет | ❌ |

**Gap:** Значения в copy, но нет метрик. User не видит "You saved 2kg CO₂ by borrowing instead of buying". Нет neighborhood dashboard.

### 7.2 "Trust-first"

| Где заявлено | Где отражено | Оценка |
|-------------|-------------|--------|
| Verified badge | ✅ Отображается | ✅ |
| Reviews | ⚠️ Schema есть, UI нет | ❌ |
| Safety guidelines | ✅ `/safety` | ✅ |
| On-platform chat | ✅ | ✅ |
| Identity verification | ❌ Ручной boolean | ❌ |
| Pickup code for safety | ❌ Демо | ❌ |

**Gap:** Trust-first — больше copy, чем система. Reviews, identity proof, dispute resolution — отсутствуют.

### 7.3 "Hyperlocal"

| Где заявлено | Где отражено | Оценка |
|-------------|-------------|--------|
| Map-first discovery | ✅ `InteractiveMap` + `nearby_listings` | ✅ |
| Neighborhood filter | ✅ `FilterBar` + `MADRID_NEIGHBORHOODS` | ✅ |
| Radius-based search | ✅ `radiusKm` в фильтрах | ✅ |
| Location in profile | ✅ | ✅ |
| Neighborhood feed | ❌ Нет (только map + list) | ❌ |
| "What's available in my building/block" | ❌ Нет precision filter | ❌ |

**Gap:** Hyperlocal работает для map discovery, но нет community layer (neighborhood feed, local events, neighbor introductions).

---

## 8. Competitive Gap

### 8.1 Wallapop (Spain)

| Wallapop | Neighborly |
|-----------|-----------|
| Full search + categories + filters | Client-side filter only |
| Favorites (♡) + saved searches | ❌ |
| Seller reviews (текст + звёзды) | Schema есть, UI нет |
| In-app payments (shipping + face-to-face) | ❌ |
| Shipping option | ❌ (pickup only by design — ok) |
| Bump / promote listing | ❌ |
| User blocking / reporting | Report demo only |

### 8.2 Olivia (community app)

| Olivia | Neighborly |
|--------|-----------|
| Community groups / interests | ❌ |
| Events / meetups | ❌ |
| Skill sharing (not just items) | ❌ |
| Neighbor introductions | ❌ |
| Local recommendations | ❌ |

### 8.3 Nextdoor

| Nextdoor | Neighborly |
|----------|-----------|
| Neighborhood verification (address) | ❌ |
| Community feed (posts, alerts) | ❌ |
| Local business recommendations | ❌ |
| Crime/safety alerts | ❌ |
| Lost & found | ❌ (можно через listings, но не отдельно) |

### 8.4 Borrow / Rent-specific (Fat Llama, etc.)

| Fat Llama | Neighborly |
|-----------|-----------|
| Date range picker (borrow period) | ❌ |
| Deposit / insurance | ❌ |
| Return tracking | ❌ |
| Item condition photos (before/after) | ❌ |
| Late fee calculation | ❌ |

---

## 9. Must-have / Should-have / Could-have / Won't-have

### P0 — Must-have (без этого нельзя запускать)

| # | Фича | Почему критично |
|---|------|----------------|
| 1 | **"Create listing" в навигации** | Core action недоступен. Atlas: P0. |
| 2 | **Работающий borrow/reservation flow** | Без него marketplace — каталог без транзакций. Нужна таблица `reservations`, UI flow, status transitions. |
| 3 | **Reviews UI + creation flow** | Trust-first без reviews — пустой claim. Нужен `CreateReview` компонент, отображение на профиле, пересчёт rating. |
| 4 | **Fix Mapbox 401 в проде** | Core feature (карта) не работает. Atlas: P0. |
| 5 | **Seed data / listings в БД** | "0 listings" на скриншоте. Нужны реальные данные или fallback. |
| 6 | **ReservationModal подключить к listing detail** | Компонент уже написан, но orphaned. Подключение = быстрый win. |

### P1 — Should-have (сильно влияет на конверсию / UX)

| # | Фича | Почему |
|---|------|--------|
| 7 | **Server-side auth + prefetch** | Устранить auth waterfall. Atlas детально описал. |
| 8 | **Favorites / bookmarks** | Базовое ожидание от marketplace. Таблица + UI-кнопка + раздел в профиле. |
| 9 | **Pickup scheduling (date/time picker)** | Без этого borrower и owner мучаются в чате. Минимум: `pickup_time` + reminder notification. |
| 10 | **Return confirmation flow** | Завершение сделки + release listing back to available (или archive). |
| 11 | **Onboarding для нового пользователя** | Welcome flow: "Complete profile" → "Browse listings" → "Post first item". |
| 12 | **Empty state CTAs** | Каждый empty state → кнопка к core action. |
| 13 | **Report / block user (backend)** | Safety-critical. Таблица `reports` + admin view. |
| 14 | **Search API (server-side)** | Для масштаба. PostGIS + full-text search. |

### P2 — Could-have (улучшат продукт, но не блокеры)

| # | Фича | Почему |
|---|------|--------|
| 15 | **Payment integration (Stripe Connect)** | Symbolic fee monetization. Сложно, но нужно для sustainability. |
| 16 | **Push / email notifications** | Supabase webhook → Resend/SendGrid. Увеличит engagement. |
| 17 | **Identity verification (phone/ID)** | Повысит trust, но friction для onboarding. |
| 18 | **Wishlist с alerts** | "Notify me when X appears". Увеличит retention. |
| 19 | **Gamification badges** | "First exchange", "Carbon saver". Engagement boost. |
| 20 | **Neighborhood feed / community layer** | Конкуренция с Nextdoor/Olivia. Отличает от pure marketplace. |
| 21 | **Referral program** | Organic growth. Low priority для MVP. |

### Won't-have (для MVP — post-launch)

| # | Фича | Почему отложено |
|---|------|----------------|
| 22 | **Shipping integration** | Противоречит hyperlocal / pickup-only positioning. |
| 23 | **Mobile native app** | "App coming soon" бейдж в UI. PWA достаточно. |
| 24 | **Multi-city expansion** | Madrid-only MVP. PostGIS готов, но маркетинг не масштабирован. |
| 25 | **AI-powered recommendations** | Недостаточно данных для ML. |
| 26 | **Insurance / damage claims** | Сложно юридически. Для MVP — community standards. |

---

## 10. Critical Gaps Summary

### 🔴 Blockers (запуск невозможен)

1. **"Request to borrow" — пустышка.** Marketplace без транзакций — это каталог. Нужен реальный reservation flow с записью в БД, notification owner'у, status transition.
2. **Нет кнопки "Create listing" в UI.** Пользователь не найдёт core action.
3. **Reviews — schema без UI.** Trust-first claim не подкреплён.
4. **Карта не работает в проде.** Mapbox 401.
5. **0 listings.** Нет данных или они не отображаются.

### 🟡 High (сильно влияет на retention/conversion)

6. **Auth waterfall** — каждая страница тормозит.
7. **Favorites** — базовое ожидание marketplace.
8. **Pickup scheduling** — без этого coordination в чате — friction.
9. **Return flow** — без завершения сделки нет closure, нет reviews.
10. **Onboarding + empty state CTAs** — новые users теряются.

### 🟢 Medium (улучшения)

11. **Payments** — можно запустить бесплатно, добавить позже.
12. **Push/email notifications** — in-app работает, остальное — enhancement.
13. **Identity verification** — manual `verified` flag достаточен для MVP.

---

## 11. Vision Gap Analysis

| Vision Claim | Реальность | Severity |
|-------------|-----------|----------|
| "Trust-first profiles" | Rating отображается, но не обновляется. Reviews не работают. Identity verification ручная. | 🔴 High |
| "Sustainable neighborhoods" | Copy-only. Нет carbon tracker, reuse metrics, environmental impact. | 🟡 Medium |
| "Hyperlocal discovery" | Map + PostGIS ✅, но нет neighborhood community layer (feed, events). | 🟡 Medium |
| "Symbol fee — like a stamp" | Copy-only. Нет обработки платежей. | 🟢 Low (для MVP) |

**Итог:** Платформа говорит trust-first, sustainable, hyperlocal — но delivers map-based classifieds с chat. Core differentiators (trust system, environmental impact, community) — в copy, не в функционале.

---

## 12. Roadmap мыслей (последовательность)

### Phase 1: "It actually works" (2–3 недели)
- [ ] Подключить `ReservationModal` к `ListingDetailClient`
- [ ] Создать `reservations` таблицу (borrower_id, listing_id, status, pickup_time, code)
- [ ] Реализовать backend для borrow request: insert reservation, notify owner
- [ ] Добавить "Create listing" в шапку / FAB
- [ ] Fix Mapbox token в проде
- [ ] Reviews UI: `ReviewList` + `CreateReviewForm` + rating recalculation trigger
- [ ] Seed data: 20–30 listings с фото, 5–10 profiles

### Phase 2: "Trust & Engagement" (2–3 недели)
- [ ] Favorites: таблица + ♡ кнопка + профиль раздел
- [ ] Pickup scheduling: date/time picker, `pickup_time` поле, reminder notifications
- [ ] Return confirmation: borrower "mark returned", owner "confirm returned", listing → available или archive
- [ ] Onboarding flow: 3-step welcome
- [ ] Empty state CTAs
- [ ] Server-side auth prefetch (Atlas audit)

### Phase 3: "Scale & Monetize" (4+ недели)
- [ ] Search API (PostGIS + text search)
- [ ] Payment: Stripe Connect symbolic fee
- [ ] Push / email notifications (Supabase webhooks → Resend)
- [ ] Identity verification (phone/ID doc)
- [ ] Neighborhood community feed
- [ ] Admin moderation dashboard

---

## 13. Сильные стороны MVP (не всё плохо)

Несмотря на gap'ы, фундамент **архитектурно силён**:

1. **Stack:** Next.js 15 App Router + React 19 + TypeScript strict + Tailwind — современно, масштабируемо.
2. **Supabase интеграция:** Auth, PostgreSQL, Realtime, Storage, PostGIS — всё связано правильно.
3. **RLS:** Все таблицы защищены, политики корректны.
4. **Chat:** Realtime подписка, optimistic updates, inbox-level + per-conversation channels — production-ready.
5. **Map:** Mapbox + react-map-gl, geo-данные в PostGIS, `nearby_listings` RPC — solid foundation.
6. **Storage:** Avatars + listing photos с валидацией, RLS, size limits.
7. **i18n:** EN/ES locale toggle с `useLocale` hook.
8. **UI quality:** Glassmorphism, адаптивность, dark mode, animations (Framer Motion), accessibility (aria-labels, semantic HTML).
9. **Schema foresight:** `reviews`, `conversations`, `notifications`, `listings.status` — схема предусматривает будущий функционал.

**Вывод:** Это не "плохой код". Это **хороший фундамент с недостроенным верхним этажем.** Большинство gap'ов — missing features, не архитектурные проблемы. Достраивать быстрее, чем переписывать.

---

*Документ создан на основе полного code review репозитория lil-peep. Рекомендуется cross-reference с аудитами Proof (QA), Bounds (product spec), Forge (DB/API), Muse (design) для приоритизации.*
