# ASK Bot Admin API Documentation

This document outlines all the available endpoints for the ASK Bot Administration Dashboard. 

## Base URL
**Production / Deployed Endpoint:**
```text
https://us-central1-askwhatsappbot.cloudfunctions.net/adminApi/admin
```

**Local Development Endpoint:**
```text
http://localhost:3000/admin
```

## Authentication
All admin routes are protected by Firebase Auth. You must include a valid Firebase ID token in the `Authorization` header of every request.

**Header Format:**
```text
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 1. Users (`/users`)
Manage WhatsApp bot subscribers.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users (supports pagination/filtering) |
| `GET` | `/users/:phone` | Get a specific user by phone number |
| `POST` | `/users` | Create a new user manually |
| `PUT` | `/users/:phone` | Update user details or progress manually |
| `DELETE` | `/users/:phone` | Delete a user |

## 2. Global Config (`/config`)
Manage global bot settings (e.g., active topics, general system states).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/config/global` | Fetch the global configuration document |
| `PUT` | `/config/global` | Update the global configuration document |

## 3. Quests Curriculum (`/quests`)
Manage the "Bible in a Year" weekly quest content.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/quests` | List all available quest weeks |
| `GET` | `/quests/:weekNumber` | Get detailed content for a specific week |
| `POST` | `/quests/:weekNumber` | Create a new quest week |
| `PUT` | `/quests/:weekNumber` | Update an existing quest week |
| `DELETE`| `/quests/:weekNumber` | Delete a quest week |

## 4. Journey / Prayer Cards (`/prayer-cards`)
Manage the daily sequential Journey cards.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/prayer-cards` | List all journey prayer cards |
| `GET` | `/prayer-cards/:cardId` | Get a specific journey card |
| `POST` | `/prayer-cards/:cardId` | Create a new journey card |
| `PUT` | `/prayer-cards/:cardId` | Update an existing journey card |
| `DELETE`| `/prayer-cards/:cardId` | Delete a journey card |

## 5. Need Themes & Prayers (`/themes`)
Manage the categorical "Need" themes (e.g., Anxiety, Peace) and their respective prayer pools.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/themes` | List all themes |
| `GET` | `/themes/:themeId` | Get a specific theme |
| `POST` | `/themes/:themeId` | Create a new theme |
| `PUT` | `/themes/:themeId` | Update an existing theme |
| `DELETE`| `/themes/:themeId` | Delete a theme |
| `GET` | `/themes/:themeId/prayers` | List all prayers under a specific theme |
| `GET` | `/themes/:themeId/prayers/:prayerId` | Get a specific prayer in a theme |
| `POST` | `/themes/:themeId/prayers/:prayerId` | Create a new prayer for a theme |
| `PUT` | `/themes/:themeId/prayers/:prayerId` | Update a prayer in a theme |
| `DELETE`| `/themes/:themeId/prayers/:prayerId` | Delete a prayer in a theme |

## 6. Daily Declarations (`/daily-declarations`)
Manage the daily morning declarations sent to users.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/daily-declarations/:date` | Get the declaration for a specific date (Format: `YYYY-MM-DD`) |
| `POST` | `/daily-declarations/:date` | Create or update the declaration for a specific date |

## 7. Media & Categories (`/media`, `/media-categories`)
Manage uploaded media assets (images/audio) and their organizational categories.

**Categories:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/media-categories` | List all media categories |
| `POST` | `/media-categories` | Create a new media category |
| `GET` | `/media-categories/:categoryId` | Get a specific category |
| `DELETE`| `/media-categories/:categoryId` | Delete a category |

**Media Items:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/media` | List all media items (supports filtering by category) |
| `POST` | `/media` | Register a new media item (after upload) |
| `GET` | `/media/:mediaId` | Get a specific media item |
| `DELETE`| `/media/:mediaId` | Delete a media item |
| `POST` | `/media/upload-url` | Generate a pre-signed Cloudflare R2 URL for direct uploads |

## 8. Morning Devotion (`/morning-devotion`)
Preview and manage the journey morning card grid. Content is stored in `prayerCards` + linked `prayerThemes` prayers; these endpoints compose and validate what the cron worker sends.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/morning-devotion/cards` | List prayer cards with completeness status (optional `?journeyStage=1`) |
| `GET` | `/morning-devotion/preview` | Preview composed WhatsApp message (`?journeyStage=1&journeyDayIndex=1`) |

**Preview query params:** `name`, `streak`, `vineStage`, `activeKnockTheme`, `knockPrayerIndex` (all optional).

**Editor workflow:** Update card via `PUT /prayer-cards/:cardId`, prayer via `PUT /themes/:themeId/prayers/:prayerId`, then call preview to verify.

## 10. Delivery Logs (`/delivery-logs`)
Pipeline observability for morning cards, reminders, and other outbound messages. **Not Pub/Sub** — logs are written to Firestore (`deliveryLogs`, `dispatchRuns`) with 30-day auto-expiry; pin entries to keep them longer.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/delivery-logs` | List logs (`?type=MORNING_CARD&status=failed&userId=&since=&limit=`) |
| `GET` | `/delivery-logs/morning/summary` | Today’s morning stats (`?date=YYYY-MM-DD`) |
| `GET` | `/delivery-logs/dispatch-runs` | MinuteTick aggregates (`?duty=morning&since=`) |
| `PATCH` | `/delivery-logs/:logId/pin` | Pin a log entry (skip auto-purge) |

**Morning summary fields:** `eligible`, `dispatched`, `sent`, `failed`, `skipped`, `totalLeaseBlocked`, `recentFailures[]`.

## 11. KNOCK Menu (`/knock-menu`)
Manage the theme selection menu image shown when users type KNOCK.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/knock-menu` | Get current menu config (`knockMenu/current`) |
| `PUT` | `/knock-menu` | Update menu image URL and optional instruction caption |
