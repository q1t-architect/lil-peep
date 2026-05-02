# Technical Audit: Neighborly MVP

**Аудитор:** Proof  
**Дата:** 2026-05-02  
**Источник:** `/home/wn/.goclaw/workspace/teams/.../lil-peep/` (workspace copy)  
**TypeScript:** `strict: true`, `noEmit: true`

---

## Сводка

| Приоритет | Кол-во |
|-----------|--------|
| P0 — Critical (блокирует продакшн) | 4 |
| P1 — High (влияет на UX / безопасность) | 6 |
| P2 — Medium (tech debt / корректность) | 7 |
| P3 — Low (code quality / minor) | 6 |

---

## P0 — Critical

### P0-1: Редирект на несуществующий маршрут `/signin`

**Файлы:**
- `src/app/listing/new/page.tsx:9` — `if (!user) redirect("/signin")`
- `src/app/listing/[id]/edit/page.tsx:13` — `if (!user) redirect("/signin")`

**Проблема:** Маршрут `/signin` не существует в приложении. Существующий маршрут: `/login` (роут `src/app/(auth)/login/page.tsx`). Неаутентифицированный пользователь, попытавшийся создать объявление или отредактировать его, получит 404 вместо страницы входа.

**Контекст:** Middleware (`src/lib/supabase/middleware.ts`) корректно перенаправляет на `/login`, но Server Component делает собственный дополнительный check и использует неверный путь.

---

### P0-2: Кнопка "Request to borrow" — demo stub, не подключена к Supabase

**Файл:** `src/components/listing/ListingDetailClient.tsx:99`

```tsx
onClick={() => showToast("Reservation request sent (demo).")}
```

**Проблема:** Основная коммерческая функция приложения — бронирование — не работает. `ReservationModal` компонент полностью реализован (`src/components/reservation/ReservationModal.tsx`), но нигде не импортируется. Нет insert в таблицу `reservations`.

---

### P0-3: `currentUserId` не передаётся в `ListingDetailClient`

**Файлы:**
- `src/app/listing/[id]/page.tsx:33` — `return <ListingDetailClient listing={listing} />`
- `src/components/listing/ListingDetailClient.tsx:14` — `currentUserId?: string`

**Проблема:** Server Component не получает текущего пользователя и не передаёт `currentUserId`. Проп определён как optional, дефолт — `undefined`. Следствие: `isOwner` всегда `false`, кнопка "Edit listing" **никогда не показывается** владельцу объявления.

**Исправление:** В `listing/[id]/page.tsx` нужно вызвать `supabase.auth.getUser()` и передать `currentUserId={user?.id}`.

---

### P0-4: Ссылка на `/auth/sign-in` в MessagesClient

**Файл:** `src/components/messages/MessagesClient.tsx:207`

```tsx
<a href="/auth/sign-in" className="text-brand underline underline-offset-2">
  sign in
</a>
```

**Проблема:** Маршрут `/auth/sign-in` не существует (существует только `/auth/confirm/route.ts` как API-роут). Пользователь получит 404. Должно быть `/login`.

---

## P1 — High

### P1-1: Realtime каналы без user-filter — утечка данных между пользователями

**Файлы:**
- `src/hooks/useUnreadCount.ts:32-42` — подписка на `notifications` без фильтра по `user_id`
- `src/components/messages/MessagesClient.tsx:147-165` — inbox-канал подписывается на **все** INSERT в `messages` (фильтрация client-side по `convIdSet`)

**Проблема:**

`useUnreadCount`: `postgres_changes` подписка не имеет `filter: 'user_id=eq.${userId}'`. Каждое уведомление любого пользователя в системе вызовет `fetchCount()`. При большом числе пользователей — постоянный noise и лишние запросы к БД.

`MessagesClient` inbox: сервер шлёт в браузер каждое новое сообщение из всей таблицы `messages`, а браузер фильтрует по `convIdSet`. Это утечка чужих сообщений в клиентскую память (хотя и не отображается в UI). Также `convIdSet` создаётся в момент загрузки и не обновляется — новые conversations, появившиеся после загрузки, не попадут в set.

**Рекомендация:** Добавить `filter: \`user_id=eq.${user.id}\`` в `useUnreadCount`. В inbox-канале использовать `filter: \`sender_id=eq.${user.id},conversation_id=in.(${convIds.join(',')})\`` или RLS на уровне Supabase.

---

### P1-2: AuthProvider — Race condition + множественные клиенты Supabase

**Файл:** `src/components/auth/AuthProvider.tsx:46-72`

**Проблемы:**

1. **Race condition:** `supabase.auth.getUser()` запускается (строка 47), потом регистрируется `onAuthStateChange` (строка 53). Если между этими двумя вызовами произойдёт auth event (маловероятно, но возможно при быстрой навигации), состояние будет рассинхронизировано.

2. **Множественные клиенты:** `createClient()` вызывается в `useEffect` (строка 46) и в `fetchProfile()` (строка 63). `fetchProfile` вызывается как из `useEffect`, так и из `onAuthStateChange`. Итого минимум 3 разных экземпляра Supabase клиента создаются при инициализации компонента. `createBrowserClient` из `@supabase/ssr` возвращает синглтон при повторных вызовах с теми же ключами, но это деталь реализации библиотеки, не гарантия.

**Рекомендация:** Вынести `createClient()` за пределы `useEffect`, в тело компонента с `useMemo(() => createClient(), [])`.

---

### P1-3: `listings.server.ts` — Double-query N+1 для PostGIS RPC

**Файл:** `src/lib/listings.server.ts:62-90`

```typescript
// Query 1: RPC для координат
const { data, error } = await supabase.rpc("nearby_listings", { ... });

// Query 2: Отдельный запрос за профилями всех owner'ов
const ownerIds = [...new Set(data.map((l: ListingRow) => l.owner_id))];
const { data: profiles } = await supabase.from("profiles").select(...).in("id", ownerIds);
```

**Проблема:** При наличии lat/lng выполняется 2 последовательных запроса. Нет JOIN на уровне RPC. Для 50 объявлений с 50 разными владельцами — один большой дополнительный round trip к БД.

**Рекомендация:** Модифицировать SQL-функцию `nearby_listings` в Supabase для JOIN с `profiles`, чтобы возвращать данные владельца в одном запросе.

---

### P1-4: `as unknown as Type` — опасные type casts

**Файлы:**
- `src/lib/listings.server.ts:57` — `return data as unknown as ListingWithOwner`
- `src/lib/listings.server.ts:101` — `return data as unknown as ListingWithOwner[]`
- `src/lib/listings.server.ts:116` — `return data as unknown as ListingWithOwner[]`
- `src/components/messages/MessagesClient.tsx:123` — `(c.profile2 as unknown as Profile)`

**Проблема:** `as unknown as T` — это явный обход системы типов TypeScript. Ошибки в структуре данных от Supabase (изменение схемы БД, опечатка в `select`) не будут пойманы компилятором. В строгом режиме (`strict: true`) это антипаттерн.

**Рекомендация:** Использовать [Supabase type generation](https://supabase.com/docs/guides/api/rest/generating-types) — `supabase gen types typescript` — и типизировать ответы через generated types. Тогда casts не нужны.

---

### P1-5: `InteractiveMap.tsx` — `as any` для Mapbox source

**Файл:** `src/components/map/InteractiveMap.tsx:123`

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const source = mapRef.current?.getMap().getSource("listings") as any;
source?.getClusterExpansionZoom(...)
```

**Проблема:** `getSource()` возвращает `AnySourceImpl` из Mapbox типов, который не имеет `getClusterExpansionZoom`. Cast to `any` подавляет ошибку. Если API Mapbox изменится, ошибка проявится только в рантайме.

**Рекомендация:** Cast к `mapboxgl.GeoJSONSource` вместо `any`.

---

### P1-6: Mapbox токен — вероятная причина 401 в production

**Файлы:**
- `src/components/map/InteractiveMap.tsx:11` — `const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
- `src/components/listing/ListingFormClient.tsx:57` — `const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN`

**Анализ:**
- `.env.local` содержит `NEXT_PUBLIC_MAPBOX_TOKEN` (значение присутствует в файле).
- В production (Vercel) `.env.local` не деплоится — это локальный файл.
- Если `NEXT_PUBLIC_MAPBOX_TOKEN` не добавлен в Vercel Dashboard → Settings → Environment Variables, то в production токен будет `undefined`.
- Mapbox с `undefined` токеном вернёт 401.

**Диагноз:** 401 в production подтверждается. Токен нужно добавить в Vercel env vars.

**Дополнительно:** `process.env.NEXT_PUBLIC_MAPBOX_TOKEN!` — non-null assertion без runtime check. Если токен `undefined`, ошибка будет Silent (Mapbox просто вернёт 401, не throw).

---

## P2 — Medium

### P2-1: `app/layout.tsx` — отсутствует `metadataBase`

**Файл:** `src/app/layout.tsx:22-27`

```typescript
export const metadata: Metadata = {
  title: "Neighborly — Local borrow & give marketplace",
  description: "...",
  // metadataBase отсутствует
};
```

**Проблема:** Без `metadataBase` Next.js не может разрешить относительные URLs в `openGraph.images` и `twitter.images`. Превью в социальных сетях (Twitter/X, Facebook, LinkedIn) будут отображаться без изображения или с неверным URL.

**Рекомендация:** Добавить `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://neighborly.app")`.

---

### P2-2: `app/page.tsx` — отсутствует `dynamic = "force-dynamic"` или `revalidate`

**Файл:** `src/app/page.tsx`

**Проблема:** `HomePage` — Server Component, который вызывает `getNearbyListings()` → `createClient()` → `await cookies()`. Вызов `cookies()` делает страницу динамической автоматически в Next.js 15. Это означает полный SSR на каждый запрос, без возможности cache. Для публичной главной страницы это избыточно.

**Рекомендация:** Либо добавить `export const revalidate = 60` (ISR), либо разделить публичный и аутентифицированный контент. Для текущего MVP — не критично, но влияет на TTFB.

---

### P2-3: `notifications/page.tsx` — `force-dynamic` корректен, но можно оптимизировать

**Файл:** `src/app/notifications/page.tsx:5`

```typescript
export const dynamic = "force-dynamic";
```

**Проблема:** `force-dynamic` полностью отключает кэширование. Для notifications это обосновано (данные меняются часто), но страница перестраивается на каждый запрос даже при неизменённых данных.

**Рекомендация:** Допустимо в MVP. При масштабировании — рассмотреть `revalidate: 30` + ручную инвалидацию через revalidatePath при новых notifications.

---

### P2-4: `ProfileEditClient.tsx` — Хрупкий парсинг URL для удаления аватара

**Файл:** `src/components/profile/ProfileEditClient.tsx:36-39`

```typescript
const oldPath = avatarUrl.split("/avatars/")[1];
if (oldPath) {
  await supabase.storage.from(BUCKET).remove([oldPath]);
}
```

**Также строка 64:**
```typescript
const oldPath = avatarUrl.split("/avatars/")[1]?.split("?")[0];
```

**Проблема:** URL парсится через `split("/avatars/")`. Если URL изменится (другой CDN, другой bucket path, добавится query param в неожиданном месте), удаление старого аватара молча упадёт. В строке 36 нет обрезки `?t=` query param (добавленного самим же кодом на строке 54: `publicUrl + "?t=" + Date.now()`), поэтому при повторной загрузке аватара старый файл не будет удалён корректно.

**Рекомендация:** Хранить `path` (относительный путь в bucket) отдельно от `publicUrl`, либо использовать утилиту `uploadAvatar` из `src/lib/storage.ts` (которая уже делает это правильно).

---

### P2-5: `ListingFormClient.tsx` — `console.error` остаётся в продакшн коде

**Файл:** `src/components/listing/ListingFormClient.tsx:164`

```typescript
console.error("Photo upload error:", error.message);
```

**Также строка 184:**
```typescript
console.error("Submit error:", err);
```

**Проблема:** `console.error` в клиентском компоненте пишет в браузерную консоль пользователя. В production это может раскрыть детали ошибок Supabase (bucket policies, network details). Нет централизованного error logging.

**Рекомендация:** Заменить на toast с generic сообщением об ошибке (уже есть `setToast`), убрать `console.error`. Добавить централизованный error reporter (Sentry, etc.) если нужны production logs.

---

### P2-6: `sitemap.ts` — только статические страницы

**Файл:** `src/app/sitemap.ts`

**Проблема:** Sitemap содержит только 4 статических URL. Все публичные страницы объявлений (`/listing/[id]`) и публичные профили (`/profile/[id]`) не включены. Поисковые роботы не проиндексируют контент.

**Рекомендация:** Сделать `sitemap()` async, добавить `getNearbyListings()` и `getPublicProfiles()` запросы, включить dynamic URLs.

---

### P2-7: Cookie `options` имеет тип `Record<string, unknown>` вместо правильного типа

**Файлы:**
- `src/lib/supabase/server.ts:20` — `options: Record<string, unknown>`
- `src/lib/supabase/middleware.ts:25` — `options: Record<string, unknown>`

**Проблема:** `@supabase/ssr` ожидает `CookieOptions` (конкретный тип из пакета). Использование `Record<string, unknown>` — workaround, который скрывает возможные проблемы с cookie-атрибутами (SameSite, Secure, HttpOnly). Если API `@supabase/ssr` изменится, ошибки не будут пойманы TypeScript.

---

## P3 — Low

### P3-1: `src/lib/storage.ts` — мёртвый код (не импортируется нигде)

**Файл:** `src/lib/storage.ts` (весь файл, ~200 строк)

**Проблема:** Полноценная библиотека утилит для Storage (`uploadAvatar`, `uploadListingPhoto`, `deleteAvatar`, `deleteListingPhotos` и др.) не импортируется ни одним компонентом. `ProfileEditClient` и `ListingFormClient` реализуют storage-операции inline, игнорируя эту библиотеку.

**Замечание:** `storage.ts` содержит более корректную реализацию (правильное удаление по extension, листинг bucket перед удалением). Это противоречие.

---

### P3-2: `ReservationModal.tsx` — мёртвый код (не импортируется нигде)

**Файл:** `src/components/reservation/ReservationModal.tsx` (весь файл, ~200 строк)

**Проблема:** Компонент полностью реализован (multi-step flow, pickup code generation), но нигде не импортируется. Связано с P0-2 — должен быть подключён к `ListingDetailClient`.

---

### P3-3: `ListingFormClient.tsx` — `getPhotoSrc()` определена, не используется

**Файл:** `src/components/listing/ListingFormClient.tsx:33-35`

```typescript
function getPhotoSrc(entry: PhotoEntry): string {
  return entry.type === "url" ? entry.url : entry.preview;
}
```

**Проблема:** Функция объявлена, но не вызывается. В JSX вместо неё используется inline тернарный оператор. ESLint strict может выдать `no-unused-vars`.

---

### P3-4: `ListingFormClient.tsx` — `<label>` без `htmlFor`

**Файл:** `src/components/listing/ListingFormClient.tsx` — все `<label>` элементы

**Проблема:** Ни один `<label>` не имеет `htmlFor`, соответствующего `id` инпута. Кликнуть по лейблу для фокуса на поле не получится. Screen readers не смогут корректно ассоциировать label с полем.

**Исключение:** Label на строке ~207 (`auth/login/page.tsx`) использует нестандартный паттерн `<label>...<input /></label>` (обёртка), который браузеры поддерживают, но он нестандартен в React-экосистеме.

---

### P3-5: `ProfileViewClient.tsx` — пустой `<div>` как placeholder

**Файл:** `src/components/profile/ProfileViewClient.tsx:159`

```tsx
<div>{/* Placeholder for future reviews from Supabase */}</div>
```

**Проблема:** Пустой div занимает место в DOM и создаёт некорректную grid-разметку (2-колонный grid, где первая колонка пуста). Нужно либо убрать, либо заменить реальным контентом.

---

### P3-6: Глобальные анимации без `prefers-reduced-motion`

**Файл:** `src/app/globals.css`

**Проблема:** CSS не содержит `@media (prefers-reduced-motion: reduce)`. Framer Motion анимации (используются в большинстве компонентов) и CSS `animate-*` классы не отключаются для пользователей с системной настройкой "уменьшить движение". Нарушение WCAG 2.1 SC 2.3.3 (AAA) и потенциально 2.3.1 (AA при частоте flash > 3 Hz).

---

## TypeScript — Итог

**Компилятор:** `strict: true`, `noEmit: true`  
**Статус сборки:** Чистая (0 ошибок при `npm run build` на актуальном коде)

**Замечания:**
- Нет использования `any` напрямую — только `as unknown as T` и единичный `as any` (P1-4, P1-5)
- Нет `@ts-ignore` или `@ts-expect-error`
- Нет `TODO`/`FIXME` комментариев в коде
- Нет `console.log` — только `console.error` (P2-5)
- Типы в основном локальные, не генерируются из Supabase schema (P1-4)

---

## Supabase — Итог

| Аспект | Статус |
|--------|--------|
| Connection reuse | ⚠️ Множественные client instances в AuthProvider (P1-2) |
| N+1 queries | ⚠️ Double-query в `getNearbyListings` с PostGIS (P1-3) |
| Realtime cleanup | ✅ Все каналы чистятся в `return () => removeChannel()` |
| Realtime filters | ❌ Inbox и notifications без user-level filter (P1-1) |
| RLS | Не проверялось (вне scope этого аудита) |
| Auth middleware | ✅ Корректный `updateSession` с refresh |

---

## Auth Flow — Итог

| Аспект | Статус |
|--------|--------|
| Middleware | ✅ Защищает все private routes |
| Server Components | ⚠️ Дублирует auth check (middleware + server page) |
| Redirect paths | ❌ `/signin` вместо `/login` в new/edit pages (P0-1) |
| AuthProvider | ⚠️ Race condition + multiple clients (P1-2) |
| Open redirect | ✅ Защита в auth/confirm/route.ts |
| Session refresh | ✅ Middleware вызывает getUser() на каждый запрос |

---

## Приоритизированный план исправлений

### Немедленно (P0)
1. `listing/new/page.tsx:9` + `listing/[id]/edit/page.tsx:13` — заменить `/signin` → `/login`
2. `listing/[id]/page.tsx` — добавить `getUser()`, передать `currentUserId`
3. `MessagesClient.tsx:207` — заменить `/auth/sign-in` → `/login`
4. `ListingDetailClient.tsx` — подключить `ReservationModal`, убрать demo stub

### Следующая итерация (P1)
5. Realtime фильтры в `useUnreadCount` и inbox-channel
6. `AuthProvider` — вынести `createClient()` в useMemo, устранить race
7. `getNearbyListings` — добавить JOIN в SQL функцию
8. Vercel env vars — добавить `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SITE_URL`

### Технический долг (P2-P3)
9. Supabase type generation для замены `as unknown as`
10. `ProfileEditClient` — использовать `storage.ts` или починить URL parse
11. `sitemap.ts` — добавить dynamic URLs
12. `metadataBase` в `layout.tsx`
13. `storage.ts` и `ReservationModal.tsx` — подключить или удалить
14. `getPhotoSrc`, пустой profile `<div>` — убрать
15. `prefers-reduced-motion` в `globals.css`
