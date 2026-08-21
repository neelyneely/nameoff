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
npm test               # 33 model checks (see test/model.mjs) — run before deploying
npm run build          # writes dist/index.html (fully self-contained, offline)
npm run deploy         # builds, then deploys dist/ to Cloudflare Pages
```
`npm run deploy` only reaches PRODUCTION from `main`. Cloudflare Pages names the
deployment after the current git branch, so deploying from a branch silently
publishes a preview URL instead — the command still prints "Success". Check
https://nameoff.pages.dev itself, not the command output.

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
  (Elo, START rating, K=32), plus `explore{}` (Tune-your-taste tallies),
  `dismissed{}` (passed suggestions) and `likes{}` (see below). All private to
  that voter. A missing key reads as empty, so old profiles keep loading.
- **`likes{}` — "names you already love"** (Name ideas tab). A private taste
  signal that trains the recommender and NEVER joins voting; "+ Add name" is the
  one that puts a name in front of everyone. Shape:
  `{ matilda: {n:"Matilda", t}, zephyr: {n:"Zephyr", t, f:{end,syl,s[],lean}} }`.
  `f` appears only when `FEAT` has no row for the name — then `endOf`/`sylOf`
  read what they can off the spelling and the person taps a vibe tag or two.
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
  - `tasteProfile()` — what one voter's model has learned, `{key: {v, n}}`.
    **Never render `v` to a person.** These are ranking scores, not opinions: a
    veto trains at −4 and a mash-up loser at −0.6, so nearly every value comes
    out negative and a naive "things you both like" filter returns *nothing*.
    Only a value's position against that same person's own baseline means
    anything — always go through `normaliseTaste()`, which z-scores within each
    feature kind. It also drops `nick` (2 buckets) and `lean` (3): too few
    buckets to normalise, so they pin every voter to ±1 and show up as fake
    agreement. `TASTE_MIN_N` (5) keeps one-off endings from dominating on noise.
    Signal lives mostly in `explore` (mash-up tallies), not the ~24-name roster,
    so a realistic test profile has to be built from tunes.
  - `endOf()` / `sylOf()` — features for a name no table knows. **`endOf` is the
    plain last letter.** That looks too naive but it was measured against all
    2036 curated rows: last-letter 99.4%, last-letter-plus-digraphs 98.6%, and a
    proper phonetic silent-e rule only 86.4%. Maeve→v and Cormac→k are real, and
    they are 13 rows out of 2036. Don't "improve" this; cleverer measured worse.
- **Views (tabs):** Vote, Name ideas, Rankings. (Trends was removed — its Elo-over-
  time chart wasn't decision-useful; its scatter became Rankings' "Compare" mode.)

## Design system — use the tokens, never a literal
Defined at the top of app.jsx next to the `C` palette, mirrored as CSS custom
properties in head.html. These exist because the file had drifted to 22 font sizes,
11 radii and ~40 padding combos, which is what made the app read busy.
- `T` — type scale, six steps: `display` 44 (the matchup name), `title` 26 (screen
  and column headings), `name` 17 (a name in a list), `body` 14, `meta` 12,
  `micro` 11 (uppercase tracked labels only). **Nothing renders below 11px.**
- `S` — spacing on a 4px base: `xs` 4, `sm` 8, `md` 12, `lg` 20, `xl` 32.
- `R` — three radii: `block` 0 (flat color fields), `card` 10 (containers),
  `pill` 999 — reserved for the person chip and nickname chips ONLY. Everything
  else is square-shouldered; that's what keeps it mid-century rather than generic.
- `LABEL` — the uppercase micro-label style (the one place letterspacing is used).

## Vocabulary — two words for "no", and they mean different things
- **Veto** — removes the name for BOTH of you. The couple's power.
- **Hard pass** — removes it for you only (guests, and dismissing a suggestion).
A control keeps its name through the whole flow: the button that says Hard pass
produces a toast that says Hard-passed. The one flourish that stays is the
"💀 {name} can't stand this one" line on a rankings row — the family likes it.
Don't reintroduce "not for me" or "Pass" as a third synonym.

## Style/UX conventions already in place
- MCM warm palette in the `C` object (app.jsx); Futura-ish display font.
- **The matchup is where the app raises its voice** — two flat, saturated color
  fields and the names at `T.display`. Everything else on that screen stays quiet.
  Only the name, pronunciation, nicknames and a one-line popularity figure live on
  the card; meaning, the trend chart, nickname figures and the spelling breakdown
  are all behind the "i". Keep it that way — the card fits two names on a phone
  screen only because it carries four rows, and that's the whole point of it.
- Vote cards are equal height (flex `align-items:stretch`) with content vertically
  centered, and **stack vertically on phones** (≤560px media query in head.html).
  They are NOT built from fixed-height slots any more; don't add minHeights back.
- The "i" info button only shows what the card doesn't already display.
- Keep the existing code style and formatting; don't reformat the whole file.

## Regression check after UI work
Build, then serve a **local-only** copy (blank `DEFAULT_URL` in a copy of
dist/index.html so click-testing can't write to the shared Supabase), and measure
the matchup at a 390px width — both cards must fit above ~650px:
```js
const c=[...document.querySelectorAll('.cards > div')];
Math.round(c[c.length-1].getBoundingClientRect().bottom + scrollY)  // want <= 650
```
