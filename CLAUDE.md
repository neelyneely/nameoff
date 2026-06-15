# Name·Off — project brief for Claude Code

A single-file, offline web app for ranking baby names head-to-head (Elo voting),
used by two people: **Claire** and **Andrew**. It syncs via Supabase and is hosted
on **Cloudflare Pages**. The goal of moving here: edit → build → deploy with one
command, no more manual Cloudflare uploads.

## Project layout
```
src/app.jsx     <- THE source of truth (all app logic + data). Edit this.
src/head.html   <- the <head> + all CSS. Edit this for styling/layout.
build.mjs       <- compiles app.jsx and inlines everything into dist/index.html
package.json    <- scripts + deps
supabase.sql    <- one-time backend setup (already run; here for reference)
dist/index.html <- BUILD OUTPUT (generated; this is what deploys). Do not hand-edit.
```

## Build & deploy
```bash
npm install            # first time only
npm run build          # writes dist/index.html (fully self-contained, offline)
npm run deploy         # builds, then deploys dist/ to Cloudflare Pages
```

### First-time Cloudflare setup (do once)
1. Authenticate Wrangler — either:
   - `npx wrangler login` (opens a browser), **or**
   - set env vars `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Create the Pages project (it must be a **Pages** project, not a Worker):
   `npx wrangler pages project create nameoff`
   - If a different project name is used, update `--project-name` in package.json.
3. After that, `npm run deploy` handles everything on each change.

(Alternative: connect the Pages project to a Git repo for push-to-deploy. If so,
commit `dist/index.html` and set the Pages output dir to `dist` with no build
command — or run `npm run build` as the build command.)

## Hard rules — do not break these
- **`src/app.jsx` is the only source file.** After ANY edit to it (or head.html),
  run `npm run build` so dist/index.html reflects the change.
- **React is used via globals** (`React`, `ReactDOM`), **classic JSX runtime**,
  **no `import`/`export` in app.jsx.** Don't convert it to ES modules or JSX
  automatic runtime — the build inlines the React UMD bundles and expects globals.
- **Keep React pinned to v18.** v19 dropped the UMD builds the inline step relies on.
- **The output must stay 100% offline.** No CDN `<script>`/`<link>` tags, no external
  fetches for assets. React + the app are inlined into one HTML file by design.
  (The app DOES call Supabase at runtime for sync — that's expected and fine.)
- **CSS lives in `src/head.html`**, not in app.jsx.

## How the app works (so edits stay consistent)
- **Sync:** Supabase REST, single table `nameoff_kv` (key TEXT primary key, value JSONB).
  `DEFAULT_URL` / `DEFAULT_KEY` are baked into app.jsx so anyone opening the app
  auto-connects (the key is a **publishable/client-safe** key — safe to ship).
  If the Supabase keys ever rotate, update those two constants and rebuild.
- **Profiles:** `claire` and `andrew`. **Genders:** `boy`, `girl`.
- **Per-profile/per-gender state:** `ratings, matches, votes, vetoed[], starred[], history[]`
  (Elo, START rating, K=32).
- **Global (shared) state:** `removed[]` (names hidden for both), `notes{}` (shared;
  each person edits only their own note), `custom[]` (added names).
- **Data maps in app.jsx:**
  - `NAMES{boy,girl}`, `UNISEX` — the candidate names + nicknames.
  - `POP` — SSA national ranks by year (2020–2025; `null` = not in top 1000).
  - `PCT` — 2025 % of births (used to interpolate ranks).
  - `COMBINE` — links a name to nickname-popularity entries (shown as pills).
  - `VARIANTS` — spelling variants that should count as ONE name (merged by % → rank).
  - `MEANING` — one-line origin/meaning per name.
  - `approxRank()` / `rankToPct()` — calibration between % of births and rank.
  - `tierOf()` — popularity tier labels/colors.
- **Views (tabs):** Vote, Rankings, Trends, All.

## Style/UX conventions already in place
- MCM warm palette in the `C` object (app.jsx); Futura-ish display font.
- Vote cards are equal height, content vertically centered, and **stack vertically
  on phones** (≤560px media query in head.html).
- The "i" info button only shows what the card doesn't already display (spelling-variant
  breakdown on the vote card; fuller breakdown in compact list views).
- Keep the existing code style and formatting; don't reformat the whole file.
