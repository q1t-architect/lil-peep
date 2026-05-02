# Performance Audit — Neighborly (lil-peep)

**Дата:** 2026-05-02  
**Аудитор:** Kinetic  
**Источник данных:** Статический анализ кода + network screenshot (Vercel deploy)  
**Жалоба:** «Долго грузится каждый раз когда заходишь»

---

## Краткий вывод

Сайт грузится медленно по трём взаимосвязанным причинам:

1. **Auth waterfall** — каждая страница делает 2–4 последовательных Supabase-запроса перед отрисовкой контента
2. **Нет code splitting** — тяжёлые библиотеки (Mapbox ~600KB gz) попадают в initial bundle всех страниц
3. **Дублирование запросов** — `useUnreadCount` делает отдельный `getUser()` на каждой странице параллельно с `AuthProvider`

---

## 1. Waterfall диаграммы

### 1.1 Главная страница (`/`)

```
БРАУЗЕР                           NETWORK

0ms    ── HTML (SSR/SSG) ──────────────────────► ~50ms
50ms   ── JS bundle (initial) ────────────────►  ~800ms
       │  includes: mapbox-gl (~600KB gz)
       │  includes: react-map-gl
       │  includes: framer-motion
850ms  AuthProvider.mount()
850ms  ├── getUser() ──────────────────────────► ~100ms
950ms  │   └── fetchProfile(userId) ───────────► ~100ms   ← SEQUENTIAL
1050ms │       └── setLoading(false)
       │
850ms  useUnreadCount.mount() (параллельно)
850ms  ├── getUser() ──────────────────────────► ~100ms   ← ДУБЛИРУЕТ AuthProvider
950ms  └── count(notifications) ──────────────► ~80ms
       │   └── subscribe(realtime channel)
       │
1050ms AppShell rendered (nav visible)
1050ms HomePageClient rendered
1050ms ├── fetchListings() ─────────────────────► ~150ms
1200ms └── InteractiveMap: load mapbox styles
1200ms     ├── mapbox://styles/mapbox/light-v11 ► ~200ms
1200ms     └── mapbox://styles/mapbox/dark-v11  ► ~200ms  ← ОДНОВРЕМЕННО (баг)

ИТОГО до интерактивности: ~1200–1400ms
```

**Bottleneck #1:** JS bundle блокирует гидрацию ~800ms  
**Bottleneck #2:** Auth waterfall добавляет ~200ms после бандла  
**Bottleneck #3:** Два стиля Mapbox загружаются одновременно (баг MutationObserver)

---

### 1.2 Страница сообщений (`/messages`)

```
БРАУЗЕР                           NETWORK

0ms    ── HTML (пустой shell) ─────────────────► ~50ms
50ms   ── JS bundle ────────────────────────────► ~800ms
850ms  AuthProvider: getUser() ─────────────────► ~100ms
950ms              : fetchProfile() ─────────────► ~100ms  ← SEQUENTIAL
1050ms useUnreadCount: getUser() ──────────────► ~100ms   ← ДУБЛИРУЕТ
1050ms MessagesClient: ждёт auth (authLoading)
1150ms MessagesClient: fetchConversations() ───► ~120ms   ← SEQUENTIAL после auth
1270ms MessagesClient: [user кликает чат]
1270ms              : fetchMessages(convId) ────► ~100ms  ← SEQUENTIAL после conv

ИТОГО до первого сообщения: ~1400–1500ms
```

**Это 3-уровневый последовательный waterfall.** Каждый уровень ждёт предыдущего.

---

### 1.3 Страница уведомлений (`/notifications`)

```
БРАУЗЕР                           NETWORK

0ms    ── HTML (force-dynamic SSR) ─────────────► ~180ms  ← SSR на каждый запрос
180ms  ── JS bundle ────────────────────────────► ~800ms
980ms  AuthProvider: getUser() ...
       (+ те же waterfalls, что выше)
```

`force-dynamic` отключает любое кэширование. Страница полностью рендерится на сервере при каждом входе, но при этом содержимое всё равно загружается клиентом (данные не передаются через RSC).

---

## 2. Bundle Analysis

### Оценка состава initial bundle

| Библиотека | Размер (gz) | Загружается на | Необходимо на |
|---|---|---|---|
| `mapbox-gl` v2.15 | ~600KB | всех страницах | только `/` |
| `react-map-gl` | ~25KB | всех страницах | только `/` |
| `framer-motion` v11 | ~45KB | всех страницах | там где используется |
| `@supabase/ssr` + client | ~40KB | всех страницах | нужно |
| React + Next.js runtime | ~130KB | всех страницах | нужно |

**Общий initial bundle: ~840KB gz (оценка)**  
Из них ~625KB (74%) не нужны на страницах без карты.

### Отсутствие `dynamic()` imports

В codebase не найдено ни одного `next/dynamic()` вызова. Все тяжёлые компоненты импортируются статически:

```ts
// src/components/map/InteractiveMap.tsx — импортируется в HomePageClient
import Map, { Source, Layer, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
```

`HomePageClient` импортируется в `page.tsx` напрямую — весь Mapbox попадает в bundle `/`.

---

## 3. Выявленные проблемы

### P0 — Критические (прямое влияние на perceived performance)

#### P0-1: Mapbox в initial bundle (все страницы)
- **Проблема:** `mapbox-gl` (~600KB gz) грузится на каждой странице, включая `/messages`, `/profile`, `/notifications`
- **Эффект:** +600ms к Time-to-Interactive на всех страницах
- **Причина:** Нет `dynamic()` wrapping для `InteractiveMap` / `HomePageClient`

#### P0-2: Auth double waterfall
- **Проблема:** `AuthProvider` делает `getUser()` → `fetchProfile()` последовательно. До завершения обоих — `loading: true`, весь контент скрыт.
- **Эффект:** +200ms к каждой странице, заблокированный рендер
- **Причина:** Sequential calls вместо параллельных; нет серверной инициализации сессии

#### P0-3: Два Mapbox стиля одновременно (баг)
- **Проблема:** `useState` инициализирует `light-v11`. `MutationObserver` срабатывает немедленно после mount и переключает на `dark-v11`. Оба запроса летят параллельно.
- **Эффект:** Двойная нагрузка на Mapbox CDN, 401 ошибки на скриншоте, карта не отображается
- **Причина:** `MutationObserver` срабатывает раньше, чем Mapbox успевает загрузить первый стиль; неправильная инициализация начального стиля

---

### P1 — Высокий приоритет

#### P1-1: `useUnreadCount` дублирует `getUser()`
- **Проблема:** Хук вызывается из `AppShell` (корневой layout) на каждой странице. Делает собственный `getUser()` — тот же запрос, что и `AuthProvider`.
- **Эффект:** Лишний Supabase API call на каждой странице, лишний realtime channel
- **Файл:** `src/hooks/useUnreadCount.ts`

#### P1-2: Messages — 3-уровневый client waterfall
- **Проблема:** `MessagesClient` ждёт `!authLoading` → грузит conversations → user кликает → грузит messages. Три последовательных асинхронных барьера.
- **Эффект:** 1.4–1.5s до первого видимого сообщения
- **Файл:** `src/components/messages/MessagesClient.tsx`

#### P1-3: Profile — 3 последовательных запроса
- **Проблема:** `src/app/profile/page.tsx` делает `getUser()` → `profiles.select()` → `listings.select()` последовательно. Нет `Promise.all`.
- **Эффект:** +200ms на страницу профиля (лишние ~100ms от сериализации)

---

### P2 — Средний приоритет

#### P2-1: ThemeProvider — 2 рендера до стабильного состояния
- **Проблема:** `mounted: false` → рендер без темы → `useEffect: setMounted(true)` → рендер с темой. Два цикла до применения `dark`/`light` класса.
- **Эффект:** Потенциальный FOUC (flash of unstyled content), layout shift на первом рендере
- **Файл:** `src/components/providers/ThemeProvider.tsx`

#### P2-2: `body { transition: background-color 0.45s }`
- **Проблема:** CSS transition применяется при каждом изменении background-color — включая page transitions и theme init.
- **Эффект:** Каждый переход между страницами сопровождается 450ms фоновым fade. Визуально ощущается как «залипание».
- **Файл:** `src/app/globals.css`

#### P2-3: `force-dynamic` на Notifications без данных через RSC
- **Проблема:** Страница объявлена `force-dynamic` (SSR при каждом запросе), но данные всё равно грузятся клиентом. SSR overhead есть, ISR преимуществ нет.
- **Эффект:** +130–180ms к TTFB на страницу уведомлений
- **Файл:** `src/app/notifications/page.tsx`

#### P2-4: Realtime channel proliferation
- **Проблема:** `useUnreadCount` создаёт realtime channel на каждой странице при mount. При быстрой навигации между страницами каналы могут не успевать cleanup.
- **Эффект:** Лишние WebSocket subscriptions, нагрузка на Supabase realtime

---

### P3 — Низкий приоритет

#### P3-1: Нет `loading.tsx` для тяжёлых маршрутов
- Next.js App Router поддерживает `loading.tsx` для мгновенного skeleton UI во время RSC fetch. Ни один маршрут не имеет этого файла.

#### P3-2: `framer-motion` в bundle без lazy loading
- Используется для анимаций карточек. Может быть загружен только там, где нужен.

---

## 4. Приоритизированный план устранений

| # | Проблема | Ожидаемый выигрыш | Сложность |
|---|---|---|---|
| 1 | Mapbox в `dynamic()` + `ssr: false` | −600KB из initial bundle | Низкая |
| 2 | Исправить инициализацию стиля Mapbox (баг двойного fetch) | Карта начинает работать | Низкая |
| 3 | `useUnreadCount` использует user из контекста AuthProvider | −1 getUser() per page | Низкая |
| 4 | AuthProvider: параллельные запросы через `Promise.all` | −100ms per page | Низкая |
| 5 | Messages: передать userId через server component (как в /tmp/neighborly-demo) | Убирает 1 уровень waterfall | Средняя |
| 6 | Profile: `Promise.all` для параллельных запросов | −100ms | Минимальная |
| 7 | ThemeProvider: инициализация без двух рендеров (inline script) | Убирает FOUC | Средняя |
| 8 | Убрать `body transition` или сократить до 150ms | Ощущение скорости | Минимальная |
| 9 | `force-dynamic` → ISR на Notifications | −180ms TTFB | Средняя |
| 10 | `loading.tsx` для `/messages`, `/profile` | Мгновенный skeleton | Низкая |

---

## 5. Подтверждённые баги (из скриншота)

```
lil-peep-opal.vercel.app — Network log:
  GET mapbox://styles/mapbox/light-v11  → 401 Unauthorized
  GET mapbox://styles/mapbox/dark-v11   → 401 Unauthorized
  (оба запроса в одном frame)
  
  Listings shown: 0
  Map tiles: не загружены
```

**Вывод:** Карта полностью нерабочая в деплое. Вероятно, `NEXT_PUBLIC_MAPBOX_TOKEN` не добавлен в Vercel environment variables. Двойной fetch стилей — отдельный баг в логике определения темы.

---

## 6. Метрики (оценка до/после топ-3 фиксов)

| Метрика | Сейчас | После фиксов 1–4 |
|---|---|---|
| Initial JS (gz) | ~840KB | ~215KB |
| Time-to-Interactive (главная) | ~1400ms | ~700ms |
| Time-to-Interactive (остальные) | ~1200ms | ~500ms |
| Supabase calls per page load | 3–4 | 1–2 |
| Mapbox style requests | 2 (баг) | 1 |

---

*Документ подготовлен на основе статического анализа. Реальные цифры могут отличаться в зависимости от latency до Supabase/Mapbox CDN и размера бандла после build.*
