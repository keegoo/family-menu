# Development Plan — Family Menu

## Goal

A personal web app for the family to browse the home menu (菜谱), see dish details, and pick dishes into a shared cart (e.g. what to cook this week). Popularity statistics show how often each dish was chosen. A backup endpoint makes the whole app relocatable as a downloadable zip.

**MVP**

- Homepage: dishes listed in sections by category (炒菜、炖菜、主食 etc.)
- Dish detail page: large pictures, 食材, 佐料, steps
- Cart page: shared family cart; add from homepage and detail page; quantities; confirm
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
- Dishes may include an optional 做法 (steps) text field.
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
| `dishes` | id, name, category_id, description, steps, created_at, updated_at |
| `dish_images` | id, dish_id, path, sort (first = cover) |
| `ingredients` | id, dish_id, name, amount, sort |
| `seasonings` | id, dish_id, name, amount, sort |
| `cart_items` | id, dish_id, quantity, created_at |
| `order_stats` | dish_id (PK), count, last_ordered_at |

**API sketch**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dishes` | dish list (with cover image + category) |
| GET | `/api/dishes/:id` | full detail (images, 食材, 佐料) |
| POST/PUT/DELETE | `/api/dishes[/:id]` | create / update / delete |
| POST | `/api/dishes/:id/images` | photo upload (multipart) |
| GET | `/api/categories` | category list (ordered) |
| GET | `/api/cart` | cart items with dish info |
| POST | `/api/cart/items` | add dish to cart (+1 if present) |
| PATCH/DELETE | `/api/cart/items/:id` | change quantity / remove |
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

**Depends on**

- None.

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

**Verification**

Run `npm run dev`, open the page, call the health endpoint, then temporarily add a semicolon and confirm lint flags it.

**Learn**

- Why dev uses two servers (Vite hot reload + Express API) and what the proxy does.
- How ESLint + Prettier enforce style mechanically instead of by memory.

### TASK-002 — SQLite data layer and seed data

**Goal**

The database schema exists, is initialized on startup, and can be seeded with categories and sample dishes so the UI has data to show.

**Depends on**

- TASK-001

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

**Verification**

Inspect with `sqlite3 data/family-menu.db '.tables'` (or a small node one-liner), spot-check a seeded dish's rows.

**Learn**

- Relational schema design: why 食材 live in their own table instead of one big column.
- Why a file DB fits this app: single file, zero servers, backup = copy.

### TASK-003 — Homepage: first end-to-end slice

**Goal**

The homepage renders dishes fetched from the database through the API, grouped into category sections — proving the full architecture (DB → API → UI) works.

**Depends on**

- TASK-002

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

**Verification**

`npm run dev`; check sections and cards; use devtools phone emulation for the column change; stop the server and reload to see the error state.

**Learn**

- The full end-to-end flow and why a thin slice first beats building all layers separately.
- Client-side grouping of flat list data.

### TASK-004 — Dish detail page

**Goal**

`/dish/:id` shows everything about a dish: image gallery, name, category, 食材, 佐料, and 做法.

**Depends on**

- TASK-003

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

**Verification**

Click through several seeded dishes, test an invented id like `/dish/999`, and stop the server mid-navigation.

**Learn**

- REST detail routes and status codes (200 vs 404 vs 500).

### TASK-005 — Dish management: add / edit / delete with photos

**Goal**

The family can manage the menu from the UI — no touching the database directly.

**Depends on**

- TASK-004

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

**Verification**

Create → view → edit → delete a test dish end-to-end; try uploading a 15 MB file and a `.txt`.

**Learn**

- Multipart/form-data vs JSON bodies; static file serving.
- Controlled forms and dynamic form rows in React.

### TASK-006 — Add to cart from homepage and detail page

**Goal**

Anyone can add dishes to the shared family cart from either page.

**Depends on**

- TASK-004

**What to do**

- Server: `POST /api/cart/items` (`{dishId}`; increments quantity if already present), `GET /api/cart` (items joined with dish info).
- Client: an add button ("加入购物车") on each homepage card and on the detail page; visual feedback on tap (e.g. button briefly shows "已加入"); a small cart-count badge in the nav.

**How to implement**

- Cart state is server-side (Decision Point 3); pages just refetch on mount. A tiny shared helper (`api.addToCart`) avoids duplicating the logic.
- Feedback must not rely on `:hover` (touch) — use a short state toggle.

**Acceptance criteria**

- [ ] Adding the same dish twice results in quantity 2 (visible via the API / a later page).
- [ ] Two browser windows see the same cart.
- [ ] Both entry points work on phone and desktop.

**Verification**

Add from homepage, then from detail; check `GET /api/cart`; open a second browser (or incognito window) and confirm the cart is shared.

**Learn**

- Shared state on the server vs local state — when each is right.

### TASK-007 — Cart page with quantity controls and confirm

**Goal**

The cart page shows chosen items with quantity controls, remove, and a confirm action that records stats (Decision Point 4) and clears the cart.

**Depends on**

- TASK-006

**What to do**

- Server: `PATCH /api/cart/items/:id` (quantity), `DELETE /api/cart/items/:id`, `POST /api/cart/confirm` — in a transaction, increment `order_stats` per cart item, then clear the cart.
- Client: cart page (`/cart`) — rows with thumbnail, name, − / + quantity, remove; a total; a 确认 button; empty-cart state.

**How to implement**

- `confirm` is one atomic DB transaction: stats and cart change together or not at all.
- Navigation: 菜单 / 购物车 (with badge) / 统计.

**Acceptance criteria**

- [ ] Quantity changes persist across reloads.
- [ ] Removing an item updates the badge.
- [ ] Confirm increments each dish's stats exactly once per quantity and empties the cart.
- [ ] Empty cart shows a friendly hint linking back to the menu.

**Verification**

Fill the cart, reload, adjust quantities, confirm, then check `GET /api/stats` reflects the counts and the cart is empty.

**Learn**

- Database transactions and why confirm must be atomic.

### TASK-008 — Statistics view

**Goal**

A popularity page: dishes ranked by order count, showing how often the family cooks each one.

**Depends on**

- TASK-007

**What to do**

- Server: `GET /api/stats` → dishes with `order_count` (join `order_stats`), sorted descending, plus total orders.
- Client: stats page (`/stats`) — ranked list with cover thumbnails, count badges; top-3 visually highlighted; dishes with zero orders listed at the bottom (or hidden behind a toggle — pick one).

**How to implement**

- A single SQL join; no client-side math.

**Acceptance criteria**

- [ ] After confirming carts, the ranking matches reality.
- [ ] Counts and ordering survive reloads.
- [ ] Renders reasonably on a phone.

**Verification**

Confirm a cart containing dish A twice and dish B once; verify the ranking order and counts.

**Learn**

- SQL joins and aggregation vs doing it in JS.

### TASK-009 — Backup API

**Goal**

One-click backup: download the entire app's data (database + photos) as a zip, for relocation or safekeeping.

**Depends on**

- TASK-005 (uploads directory must exist and be standardized)

**What to do**

- Server: `GET /api/backup` streams a zip of `data/` (db + uploads) with a timestamped filename, using a streaming zip library (e.g. `archiver`).
- README section: how to restore — unzip into `data/` on the new machine, `npm run seed`-free start, done.

**How to implement**

- Stream the zip directly to the response rather than building it in memory.
- Back up the live SQLite file safely (`VACUUM INTO` or a snapshot copy before zipping) so the backup isn't corrupted by concurrent writes.

**Acceptance criteria**

- [ ] Downloading `/api/backup` yields a zip containing the db and all uploaded photos.
- [ ] Unzipping it into a fresh checkout and starting the server shows identical data (test this once).

**Verification**

Take a backup, move the zip to a temp folder, unzip, point a second server instance at it, compare homepage + stats.

**Learn**

- Why a file-based DB makes backup/relocation almost free — the whole "database" is one file.
- Streaming responses for large payloads.

### TASK-010 — Responsive and reliability pass

**Goal**

Every page honestly satisfies AGENTS.md rule 4 (phone / tablet / desktop) and fails visibly instead of silently.

**Depends on**

- TASK-003 through TASK-008

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

**Verification**

Manual walkthrough per page at three widths, plus a run with the API down.

**Learn**

- Mobile-first thinking: reorganizing layouts, not just shrinking them.

### TASK-011 — Production build and deployment

**Goal**

The app runs as one server outside development: Express serves the built client, the API, and the photos.

**Depends on**

- TASK-009, TASK-010

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

**Verification**

Run the production command locally, open it from another device on the LAN, exercise home → detail → cart → confirm → stats → backup.

**Learn**

- Difference between dev servers and a production static build; single-process deployment.

---

## Post-MVP (fun ideas, in suggested order)

1. **Shopping list** — aggregate the cart's 食材 into a grouped checklist (盐/油/菜…), printable.
2. **今天吃什么** — a random dish picker, optionally filtered by category. The eternal family question, solved.
3. **Dish ratings (⭐)** — a "family favorites" filter and stats weighted by rating.
4. **Weekly meal plan** — pick 7 dishes onto a calendar; cart confirms feed it.
5. **Structured 做法 steps** — turn the steps text into a numbered list with a big-text "cooking mode".
6. **中/EN language toggle** — if the family is bilingual.
