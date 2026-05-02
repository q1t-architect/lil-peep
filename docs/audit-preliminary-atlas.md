# Сводный предварительный аудит Neighborly MVP

> Автор: Atlas (тимлид)
> Дата: 2026-05-02
> Статус: Предварительный — ожидаются полные аудиты от команды (Proof, Muse, Spark, Bounds, Kinetic, Flux)

---

## 1. Executive Summary

Пользователь жалуется на три вещи:
1. **Долгая загрузка** при заходе в Messages, Notifications, Profile
2. **Пустая карта** (на скриншоте подтверждено: Mapbox 401)
3. **Нет видимого функционала** для создания объявлений и других core-фич

Все три проблемы имеют общий корень: архитектура MVP ориентирована на demo/локальную разработку, а не на production user experience.

---

## 2. Проблема: Долгая загрузка разделов

### 2.1 Root cause — client-only auth waterfall

`AuthProvider` (в `layout.tsx`) при каждой загрузке любой страницы делает:
```
1. supabase.auth.getUser()          → round-trip к Supabase
2. если user → fetchProfile()       → ещё один round-trip
3. только потом рендер шапки        → layout shift, skeleton
```

При переходе между страницами (client-side navigation) `useAuth()` не кэширует результат — каждая страница заново проходит через это. Пользователь видит:
- страница загрузилась → шапка в состоянии loading (скелетон круглого аватара)
- потом появляется UserMenu или "Sign In"
- потом только контент

### 2.2 Messages — полностью client-side waterfall

Страница `/messages/page.tsx` — пустая обёртка:
```tsx
export default function MessagesPage() {
  return <MessagesClient />;  // zero server data
}
```

Внутри `MessagesClient`:
```
1. Ждём authLoading (из AuthProvider)
2. Запрос conversations + JOIN profiles
3. Запрос messages для превью каждого чата
4. Подписка realtime
```

Это 3+ последовательных запроса в браузере. Сервер не подготовил данные.

### 2.3 Notifications — `force-dynamic` без кэша

```tsx
export const dynamic = "force-dynamic";
```

Каждый заход = SSR с нуля: `getUser()` + `notifications.select()`. Нет ISR, нет `unstable_cache`, нет `revalidate`.

### 2.4 Profile — три последовательных Supabase-запроса

```
1. getUser()
2. profiles.select().eq(id, user.id).single()
3. listings.select().eq(owner_id, user.id)
```

Без parallel fetching, без кэширования.

### 2.5 Unread badge — лишний запрос в шапке

`useUnreadCount` добавляет ещё один client-side запрос на каждую страницу:
```
getUser() + count(*) from notifications WHERE read = false
```

Итого на странице Messages с открытым чатом: **5+ одновременных/последовательных запросов к Supabase**.

---

## 3. Проблема: "Много авторизаций"

### 3.1 Визуальный эффект

Пользователь видит на каждой странице:
1. Страница загружается
2. Шапка показывает skeleton (loading state)
3. Потом либо "Sign In" кнопка, либо аватар
4. Контент появляется позже

Это создаёт ощущение что "система постоянно проверяет кто я".

### 3.2 Нет middleware для защиты роутов

Каждая страница сама решает что делать с неавторизованным:
- `/profile` → `redirect("/login")`
- `/messages` → показывает "Please sign in" плашку (но страница уже загрузилась)
- `/notifications` → просто пустой список
- `/listing/new` → `redirect("/signin")` (разный путь! `/login` vs `/signin`)

Нет единого middleware с `matcher` для защищённых роутов.

### 3.3 Нет server-side session probe

Next.js App Router позволяет в layout.tsx (Server Component) получить сессию и пробросить вниз. Это устранило бы client-side waterfall. Вместо этого весь auth на клиенте.

---

## 4. Проблема: Карта пустая (подтверждено скриншотом)

### 4.1 Диагноз

На скриншоте DevTools Network:
- Фильтр: `mapbox`
- 2 запроса: `light-v11` и `dark-v11`
- **Оба: Status 401 Unauthorized**

### 4.2 Почему 401

`NEXT_PUBLIC_MAPBOX_TOKEN` — переменная с префиксом `NEXT_PUBLIC_` в Next.js **встраивается в JS бандл на этапе билда**. Если на Vercel (production) эта переменная:
- не добавлена в Project Settings → Environment Variables
- или добавлена но после последнего деплоя (требует redeploy)

то в production бандле значение `undefined` или пустая строка. Mapbox API отвергает такой токен → 401.

### 4.3 Локально работает, в проде нет

В `.env.local` в workspace токен есть — поэтому `next dev` и `next build` локально работают. В Vercel — другой набор env vars.

**Fix:** добавить `NEXT_PUBLIC_MAPBOX_TOKEN` в Vercel dashboard → Project → Settings → Environment Variables → redeploy.

### 4.4 Fallback отсутствует

В коде нет обработки ошибки загрузки карты. Если токен невалиден — пользователь видит пустой тёмный прямоугольник с +/− кнопками. Нет сообщения "Map failed to load", нет fallback на статичную карту или список.

---

## 5. Проблема: Нет видимого функционала для создания объявлений

### 5.1 Код для создания существует

- Страница: `/listing/new/page.tsx`
- Форма: `ListingFormClient.tsx` (495 строк)
- Мутация: `createListing()` в `listings.client.ts`
- Server-side защита: redirect если неавторизован

### 5.2 Но в UI нет ссылки

В `AppShell.tsx` (навигация) нет пункта:
- "Post item"
- "Create listing"
- "+" кнопка
- "Add listing"

Пользователь должен вручную вбить `/listing/new` в адресную строку. Для marketplace это критичный разрыв — core action недоступен.

### 5.3 Есть ли другие недостающие фичи?

Предварительный список (детали в аудите Spark):
- Search (глобальный поиск по listings, не только фильтр)
- Favorites / bookmarks
- "I want to borrow this" flow (borrower request)
- Pickup scheduling
- Return confirmation
- My listings management (pause, delete, mark as given)
- Reviews / ratings после обмена
- In-app payments (symbolic fee, deposit)
- Push / email notifications
- Content moderation / admin panel

---

## 6. Дополнительные наблюдения (не упомянутые пользователем)

### 6.1 `0 listings`

На скриншоте под фильтрами: "0 listings". Возможные причины:
- Supabase таблица listings пустая
- Или auth-задержка мешает загрузке до отображения
- Или `getNearbyListings()` возвращает пустой массив (PostGIS функция `nearby_listings` не работает или нет данных с координатами)

### 6.2 Разные auth пути

- `/login` — страница логина
- `/signin` — редирект при отсутствии auth
- `/auth/sign-in` — ссылка в сообщениях "Please sign in"
- `/(auth)/login` — layout для auth

Нет единообразия. Пользователь может запутаться.

### 6.3 Auth pages вне защищённого layout

Страницы `(auth)/forgot-password`, `login`, `signup` используют `AuthLayout` с декорациями, но не проверяют "а не залогинен ли уже пользователь". Если залогиненный откроет `/login` — увидит форму логина вместо редиректа на профиль.

### 6.4 `listingFilters.ts` — упрощён после удаления mocks

После моего рефактора `listingFilters.ts` работает с реальными данными, но фильтрация происходит на клиенте после загрузки всех listings. Для большого каталога это не масштабируется.

---

## 7. Критичность проблем (предварительная оценка Atlas)

| Проблема | Критичность | Почему |
|----------|------------|--------|
| Mapbox 401 / пустая карта | **P0 — блокер** | Core feature не работает. Пользователь не видит где вещи. |
| Нет кнопки "Create listing" | **P0 — блокер** | Core action недоступен. Marketplace без возможности создать объявление. |
| Auth waterfall на каждой странице | **P1 — высокая** | Все разделы тормозят, пользователь видит loading/skeleton постоянно. |
| Messages полностью client-side | **P1 — высокая** | Чат — ключевая фича, загружается медленно, нет server prefetch. |
| `force-dynamic` без кэша | **P1 — высокая** | Notifications и Profile тормозят, нет progressive enhancement. |
| `0 listings` — нет данных или не грузятся | **P1 — высокая** | Если listings не отображаются — весь смысл платформы теряется. |
| Отсутствующий функционал (borrow, pickup, reviews) | **P2 — средняя** | Можно запустить MVP без этого, но конверсия и trust пострадают. |
| Нет middleware для auth | **P2 — средняя** | Не критично но создаёт inconsistent UX. |

---

## 8. Быстрые wins (что можно сделать быстро для максимального impact)

1. **Добавить `NEXT_PUBLIC_MAPBOX_TOKEN` в Vercel + redeploy** — карта сразу заработает
2. **Добавить "Post item" кнопку в шапку** (или FAB на мобильном) — core action станет доступен
3. **Проверить Supabase — есть ли listings в таблице?** — если пусто, добавить seed data
4. **В AuthProvider добавить `staleTime` или кэширование** — уменьшить количество getUser() запросов
5. **Сделать `/messages` server component** — prefetch conversations на сервере

---

## 9. Следующие шаги

1. Ожидать полные аудиты от команды (6 документов)
2. Собрать всё в единый `docs/audit-master.md` с cross-references
3. Сформировать prioritized roadmap на основе всех 7 аудитов
4. Согласовать с Тимуром что фиксим в первую очередь
5. Начать implementation по одобренным задачам

---

*Этот документ создан Atlas на основе code review и скриншота пользователя. Полные аудиты от специализированных членов команды ожидаются и дополнят эту картину.*
