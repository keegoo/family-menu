# Development Plan — Family Menu

## Goal

A personal web app for the family to browse the home menu (菜谱), see dish details, and choose dishes for a shared selection (e.g. what to cook this week). Popularity statistics show how often each dish was chosen. A backup endpoint makes the whole app relocatable as a downloadable zip.

**MVP**

- Homepage: dishes listed in sections by category (炒菜、炖菜、主食 etc.)
- Dish detail page: large pictures, 食材, 佐料, 做法
- Selection page: shared family selection; choose from homepage and detail page; remove; confirm
- Stats: popularity by order count
- Dish management: add / edit / delete dishes with photo upload
- Backup API: download a zip of the database + photos
- Responsive: phone, tablet, desktop (per AGENTS.md)

**Out of scope (later)**

- Accounts / authentication, shopping-list aggregation, random dish picker, ratings, weekly meal plan, i18n, Docker/K8s, DB migration tooling.

## Open Questions

1. **Deployment target** — where will this run? Home computer, NAS, or a VPS? Only affects TASK-011 (Docker or not). Everything before it is independent.
2. **UI language** — the plan assumes Chinese UI labels (the categories are Chinese). Confirm or switch.

## Assumptions

- One shared family cart, no user accounts — everyone at home uses the same cart.
- "Order" = confirming the cart; stats count confirmations (see Decision Point 4).
- The 做法 is optional free text stored in the `dishes.description` field — there is no separate steps field/table.
- Seed data provides sample dishes; real photos are added by the family after MVP.
- Code and commits in English, UI text in Chinese.

## Architecture

- **Client**: Vite + React SPA with react-router. Styling per AGENTS.md: inline style objects (`const STYLES = {...}`) for base styles; media queries, `:hover`, and keyframes in a companion `.css` file per component.
- **Server**: Node.js + Express, REST JSON API. Serves `/uploads` (photos) and, in production, the built client.
- **Storage**: SQLite, a single file (`data/family-menu.db`), plus photos on disk (`data/uploads/`).
- **Project layout**: one `package.json`; `client/` and `server/` folders; `npm run dev` starts both via `concurrently`.

**Data model**

| Table | Fields |
|---|---|
| `categories` | id, name, sort |
| `dishes` | id, name, category_id, description, created_at, updated_at |
| `dish_images` | id, dish_id, path, sort (first = cover) |
| `ingredients` | id, dish_id, name, amount, sort |
| `seasonings` | id, dish_id, name, amount, sort |
| `cart_items` | id, dish_id (unique), created_at — one row per chosen dish, no quantities |
| `order_stats` | dish_id (PK), count, last_ordered_at |

**API sketch**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dishes` | dish list (with cover image + category) |
| GET | `/api/dishes/:id` | full detail (images, 食材, 佐料) |
| POST/PUT/DELETE | `/api/dishes[/:id]` | create / update / delete |
| POST | `/api/dishes/:id/images` | photo upload (multipart) |
| GET | `/api/categories` | category list (ordered) |
| GET | `/api/cart` | chosen dishes with dish info |
| PUT | `/api/cart` | replace the selection (`{dishIds}`) — one batch sync from the client |
| POST | `/api/cart/items` | choose a dish (idempotent — one row per dish; legacy per-tap helper) |
| DELETE | `/api/cart/items/:id` | remove a dish from the selection (legacy per-tap helper) |
| POST | `/api/cart/confirm` | record stats, clear cart |
| GET | `/api/stats` | dish popularity (order counts) |
| GET | `/api/backup` | zip download of `data/` |

## Decision Points

### Decision Point 1 — File database: SQLite vs JSON file

**Recommendation**: SQLite via `better-sqlite3`.

**Why**: Still one file on disk (backup = copy the file), but transactional — concurrent writes from several phones can't corrupt it — and real queries make stats trivial. Synchronous API, no ORM needed, ~zero configuration.

**Alternative**: A JSON file (e.g. lowdb). Slightly simpler to read, but concurrent writes can lose data, and "queries" are just array filters. Fine for a read-only menu, weaker once a shared cart exists.

### Decision Point 2 — Stack: Vite + React SPA with Express API vs Next.js

**Recommendation**: Vite + React SPA, separate Express server.

**Why**: Matches the AGENTS.md conventions directly, each side is small and easy to understand, one static build. A family app doesn't need SSR.

**Alternative**: Next.js would merge frontend and backend into one app — convenient for deployment, but adds framework concepts (SSR, server components) that aren't needed here and muddies the learning curve.

### Decision Point 3 — Shared cart and no accounts

**Recommendation**: One server-side cart in the DB, no login.

**Why**: A family app's point is that anyone's phone sees the same cart. Server-side also makes stats accurate. No auth keeps setup simple — it runs on the home network.

**Alternative**: Per-device `localStorage` carts (no backend work, but carts aren't shared). If the app is later exposed to the internet, add a single shared password/PIN in front of it (a small middleware), not full accounts.

### Decision Point 4 — What counts as an "order" for stats

**Recommendation**: Confirmations. The cart page has a 确认 button; pressing it increments each dish's `order_stats.count` and clears the cart.

**Why**: Adding to cart is just browsing; confirming means "we're actually cooking these". Stats then mean something.

**Alternative**: Count on add-to-cart (simpler, one less endpoint, but stats inflate from casual taps).

---

## Tasks

### TASK-001 — Project foundation

**Goal**

A runnable dev environment: Vite + React client, Express server, one command to start both, lint/format enforcing the AGENTS.md rules.

**What to do**

- Create `package.json` (scripts: `dev`, `build`, `lint`, `format`), `client/` (Vite React), `server/` (Express with `GET /api/health`).
- `npm run dev` starts both servers via `concurrently`; Vite proxies `/api` to Express.
- ESLint + Prettier per project conventions (no semicolons, single quotes) — if the config files from the earlier setup already exist, keep and adapt them; otherwise add them here.

**How to implement**

- Vite: `client/` with `src/main.jsx`, `src/App.jsx`, react-router installed.
- Express: `server/index.js` exposing `/api/health` returning JSON, and a dev port (e.g. 3000); Vite dev server on 5173 with `server.proxy` for `/api` and `/uploads`.
- `npm run dev` → `concurrently "node server/index.js" "vite"`.

**Acceptance criteria**

- [ ] `npm run dev` starts both; the placeholder page renders at localhost:5173.
- [ ] `GET /api/health` (directly and through the proxy) returns ok.
- [ ] `npm run lint` and `npm run format:check` pass; adding a semicolon to any `.jsx` file fails the check.

### TASK-002 — SQLite data layer and seed data

**Goal**

The database schema exists, is initialized on startup, and can be seeded with categories and sample dishes so the UI has data to show.

**What to do**

- Add `better-sqlite3`. Create `server/db.js` (opens/creates `data/family-menu.db`, runs schema) and `server/schema.sql` with the tables above.
- Create `server/seed.js` (`npm run seed`): categories 炒菜/炖菜/主食/汤 (with sort order) and 4–6 sample dishes with 食材/佐料/做法. No photos needed (seed without images; the UI must handle image-less dishes).
- Ensure `data/` is gitignored (schema + seed script are the source of truth).

**How to implement**

- Keep SQL in `schema.sql`, read and executed once at startup (`CREATE TABLE IF NOT EXISTS`).
- Seed wipes and recreates data (family-scale, idempotent enough) — or inserts only if `dishes` is empty; pick one and state it in the script header.

**Acceptance criteria**

- [ ] `npm run seed` produces a valid `data/family-menu.db`.
- [ ] All tables exist with foreign keys (`dishes.category_id`, `ingredients.dish_id`, etc.).
- [ ] Seed contains ≥3 categories and ≥4 dishes with ingredients.

### TASK-003 — Homepage: first end-to-end slice

**Goal**

The homepage renders dishes fetched from the database through the API, grouped into category sections — proving the full architecture (DB → API → UI) works.

**What to do**

- Server: `GET /api/dishes` (join cover image + category name; include a section-sort-friendly order) and `GET /api/categories`.
- Client: Home page fetches both; renders sections per category, each a responsive grid of dish cards (cover photo or a placeholder, name).

**How to implement**

- Card click navigates to `/dish/:id` (detail page comes in TASK-004; a stub is fine).
- Styling per AGENTS.md: base layout in `STYLES` objects; the grid column-count changes via media queries in `Home.css`.
- Fetch via a small `api.js` helper; show a loading and an error state (not silent).

**Acceptance criteria**

- [ ] Sections appear in category sort order, empty categories hidden.
- [ ] Every seeded dish shows with its category and cover/placeholder.
- [ ] Grid is 1 column on a phone width and multi-column on desktop.
- [ ] API failure shows a visible error message.

### TASK-004 — Dish detail page

**Goal**

`/dish/:id` shows everything about a dish: image gallery, name, category, 食材, 佐料, and 做法 (the `description` field).

**What to do**

- Server: `GET /api/dishes/:id` returning the dish with its images, ingredients, seasonings.
- Client: detail page — large image area (first image large, extras below), 食材 and 佐料 as lists, 做法 text, back navigation. A not-found state for unknown ids.

**How to implement**

- 404s return proper status codes; the client distinguishes "not found" from "error".
- Reuse the fetch helper and error/loading patterns from TASK-003.

**Acceptance criteria**

- [ ] Clicking a homepage card opens the right dish with all fields rendered.
- [ ] Multiple images display; image-less dishes show a placeholder.
- [ ] Unknown id shows a friendly not-found; broken API shows an error state.
- [ ] Readable at phone width.

### TASK-005 — Dish management: add / edit / delete with photos

**Goal**

The family can manage the menu from the UI — no touching the database directly.

**What to do**

- Server: `POST /api/dishes`, `PUT /api/dishes/:id`, `DELETE /api/dishes/:id`; `POST /api/dishes/:id/images` (multipart via multer → `data/uploads/`, served at `/uploads`); category creation inline (an unknown category name in a dish create upserts a new category).
- Client: dish form page (`/dish/new`, `/dish/:id/edit`) — name, category (select + new-category input), dynamic 食材 rows (name + amount), 佐料 rows, 做法 textarea, multi-file photo upload with preview. Delete button with confirmation.

**How to implement**

- Form as a controlled React component; dynamic ingredient rows = array in state with add/remove buttons.
- Upload: accept jpg/png/webp, cap at ~10 MB per file, return validation errors the form displays.
- After save: navigate to the new dish's detail page.

**Acceptance criteria**

- [ ] A dish created with photos and 3 食材 appears on the homepage and detail page correctly.
- [ ] Editing changes persist; deleting (after confirm) removes the dish and its files.
- [ ] Oversized or wrong-type uploads are rejected with a clear message.
- [ ] A new category typed into the form appears as a homepage section.

### TASK-006 — Choose dishes from the homepage with batch sync

**Goal**

Anyone can choose dishes for the shared family selection from the homepage. A dish is either chosen or not — there are no quantities.

**What to do**

- Server: `GET /api/cart` (chosen dishes joined with dish info) and `PUT /api/cart` (`{dishIds}`) which replaces the selection in one transaction. (Per-tap `POST`/`DELETE /api/cart/items` also exist as legacy helpers but the client does not use them.)
- Client: tapping a dish card toggles the dish in the local selection, with visual feedback (green border + ✓ badge on chosen cards). A "详情" link on each card opens the dish page. The dish page itself is pure information — no choose button. A 🛒 icon in the nav shows the current count plus an "unsaved" dot when there are local changes; tapping it sends the whole selection to the server in one request.

**How to implement**

- Selection state lives in `App` (local, not per-tap synced); tapping 🛒 calls `api.syncCart(selectedIds)`. On mount the server's selection is loaded as the starting point.
- Feedback must not rely on `:hover` (touch) — use short state toggles. The "详情" link stops event propagation so it does not trigger the card toggle.

**Acceptance criteria**

- [ ] Tapping a card adds the dish; tapping it again removes it; the 🛒 count follows.
- [ ] The unsaved dot appears after a change and disappears after tapping 🛒; `GET /api/cart` then matches the local selection.
- [ ] The 详情 link opens the detail page without toggling the dish.
- [ ] Works on phone and desktop.

### TASK-007 — Cart summary page: date/time plan and confirm

**Goal**

Tapping the 🛒 icon opens a summary page of the chosen dishes, where the family picks a date and time (when to eat — a meal plan) and confirms; confirming records stats (Decision Point 4) and clears the selection.

**What to do**

- Server: `POST /api/cart/confirm` — in a transaction, increment `order_stats` per chosen dish, then clear the selection. (`DELETE /api/cart/items/:dishId` already arrived in TASK-006 for the card toggle.)
- Client: cart summary page (`/cart`) — rows with thumbnail, name, remove; date/time pickers; a 确认 button; empty-selection state.

**How to implement**

- `confirm` is one atomic DB transaction: stats and selection change together or not at all.
- Navigation: 菜单 / 🛒 已选 (count badge; tapping it syncs then opens `/cart`) / 统计.

**Acceptance criteria**

- [ ] Synced selections persist across reloads (loaded from the server on mount).
- [ ] Tapping 🛒 syncs, then opens `/cart`.
- [ ] Confirm increments each chosen dish's stats by exactly 1 and empties the selection.
- [ ] Empty selection shows a friendly hint linking back to the menu.

### TASK-008 — Statistics view

**Goal**

A popularity page: dishes ranked by order count, showing how often the family cooks each one.

**What to do**

- Server: `GET /api/stats` → dishes with `order_count` (join `order_stats`), sorted descending, plus total orders.
- Client: stats page (`/stats`) — ranked list with cover thumbnails, count badges; top-3 visually highlighted; dishes with zero orders listed at the bottom (or hidden behind a toggle — pick one).

**How to implement**

- A single SQL join; no client-side math.

**Acceptance criteria**

- [ ] After confirming carts, the ranking matches reality.
- [ ] Counts and ordering survive reloads.
- [ ] Renders reasonably on a phone.

### TASK-009 — Backup API

**Goal**

One-click backup: download the entire app's data (database + photos) as a zip, for relocation or safekeeping.

**What to do**

- Server: `GET /api/backup` streams a zip of `data/` (db + uploads) with a timestamped filename, using a streaming zip library (e.g. `archiver`).
- README section: how to restore — unzip into `data/` on the new machine, `npm run seed`-free start, done.

**How to implement**

- Stream the zip directly to the response rather than building it in memory.
- Back up the live SQLite file safely (`VACUUM INTO` or a snapshot copy before zipping) so the backup isn't corrupted by concurrent writes.

**Acceptance criteria**

- [ ] Downloading `/api/backup` yields a zip containing the db and all uploaded photos.
- [ ] Unzipping it into a fresh checkout and starting the server shows identical data (test this once).

### TASK-010 — Responsive and reliability pass

**Goal**

Every page honestly satisfies AGENTS.md rule 4 (phone / tablet / desktop) and fails visibly instead of silently.

**What to do**

- Walk every page at 375 / 768 / 1280 px widths; fix layout, touch-target size (≥44 px), and image handling issues.
- Ensure all media queries live in companion `.css` files (not in style objects), per the conventions.
- Add missing loading / error / empty states to any fetch-driven view.
- Add a 404 page for unknown routes.
- Form validation messages from TASK-005 render inline.

**How to implement**

- Use devtools device emulation; note that phones have no hover, so critical actions must be visible without it.
- Keep a per-page checklist in the PR/commit message.

**Acceptance criteria**

- [ ] Home, detail, form, cart, and stats pages are usable at all three widths.
- [ ] No interaction requires hover to be discoverable.
- [ ] Every fetch has loading/error/empty handling; a stopped server never yields a blank page.
- [ ] `npm run lint` and `npm run format` still pass.

### TASK-011 — Production build and deployment

**Goal**

The app runs as one server outside development: Express serves the built client, the API, and the photos.

**What to do**

- `npm run build` (Vite) outputs to a folder Express serves statically; Express falls back to `index.html` for client routes.
- `PORT` from env; README with install/seed/build/start steps for the deployment target (see Open Question 1).
- Optional, depending on target: a Dockerfile (NAS) or systemd/pm2 notes (home PC).

**How to implement**

- Production start: `npm run build && node server/index.js` — one process.
- Serve `/uploads` with sensible cache headers; everything else the client handles.

**Acceptance criteria**

- [ ] After build + start, the app is fully usable at the server's address from a phone on the same network.
- [ ] Deep links (e.g. `/dish/3`) work on direct load (no 404).
- [ ] The backup endpoint works in the production build.

---

## Post-MVP (fun ideas, in suggested order)

1. **Shopping list** — aggregate the cart's 食材 into a grouped checklist (盐/油/菜…), printable.
2. **今天吃什么** — a random dish picker, optionally filtered by category. The eternal family question, solved.
3. **Dish ratings (⭐)** — a "family favorites" filter and stats weighted by rating.
4. **Weekly meal plan** — pick 7 dishes onto a calendar; cart confirms feed it.
5. **Structured 做法 steps** — split the 做法 text (currently free text in `description`) into a numbered list with a big-text "cooking mode".
6. **中/EN language toggle** — if the family is bilingual.
