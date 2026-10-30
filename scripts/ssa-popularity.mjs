/* Regenerate the SSA_POP block in src/app.jsx from the SSA national data.
 *
 *   node scripts/ssa-popularity.mjs        (then npm test && npm run build)
 *
 * Also writes RESPELL: Name ideas candidates spelled an uncommon way (Klara, Rider)
 * mapped to the common spelling (Clara, Ryder) — see spellKey below.
 *
 * Covers every name on the voting roster (built-in + names added in the app, read
 * live from Supabase), each renamed spelling, and every spelling listed in
 * VARIANTS or a COMBINE nickname pill. Source: data/ssa/yob2020.txt … yob2025.txt
 * — the SSA "National data"
 * files (name,sex,count; every name with 5+ births). The copies here came from the
 * mirror at github.com/moisesvasquez/us-baby-names (data/raw), checked against
 * SSA's published ranks (Sloane #141, Calvin #132, Iris #61 in 2025). ssa.gov blocks scripted
 * downloads, so to add a year, download names.zip from
 * https://www.ssa.gov/oact/babynames/limits.html in a browser, copy the new
 * yobYYYY.txt into data/ssa/, and bump YEARS.
 *
 * Ranks are plain ordinal positions by count, which matches SSA's own top-1000
 * ranks. Percent of births is count / listed births × SCALE: SSA's published
 * percentages divide by ALL births of that sex (including names under 5), which
 * comes out at ~0.92 of the listed-births share. SCALE is the median of that
 * ratio over the curated PCT table, so new figures sit on the same calibration.
 */
import vm from "node:vm";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const SCALE = { girl: 0.917, boy: 0.929 };
const APP = "src/app.jsx";

// --- SSA tables: norm(name) -> { girl: {year: {rank, count}}, boy: … } ---
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const ssa = {}, total = { girl: 0, boy: 0 };
for (const y of YEARS) {
  const rows = { girl: [], boy: [] };
  for (const line of fs.readFileSync(`data/ssa/yob${y}.txt`, "utf8").split(/\r?\n/)) {
    if (!line) continue;
    const [n, sex, c] = line.split(",");
    rows[sex === "F" ? "girl" : "boy"].push([n, +c]);
  }
  for (const g of ["girl", "boy"]) {
    rows[g].sort((a, b) => b[1] - a[1]);
    rows[g].forEach(([n, c], i) => { ((ssa[norm(n)] ||= {})[g] ||= {})[y] = { rank: i + 1, count: c }; });
    if (y === YEARS[YEARS.length - 1]) total[g] = rows[g].reduce((s, r) => s + r[1], 0);
  }
}

// --- the app's own tables, the way test/model.mjs loads them ---
const js = execFileSync("npx", ["esbuild", APP, "--loader:.jsx=jsx", "--jsx=transform"],
  { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const noop = () => {};
const ctx = vm.createContext({
  React: { useState: () => [null, noop], useEffect: noop, useRef: () => ({}), useCallback: (f) => f,
           createContext: () => ({ Provider: noop }), useContext: () => null, createElement: () => ({}), Fragment: "f" },
  ReactDOM: { createRoot: () => ({ render: noop }) },
  document: { getElementById: () => null, createElement: () => ({ style: {} }) },
  window: {}, localStorage: { getItem: () => null, setItem: noop }, fetch: noop, console,
});
vm.runInContext(js, ctx);
const run = (src) => vm.runInContext(src, ctx);

// Names added in the app live in Supabase, not in app.jsx (read-only fetch).
const [url, key] = run("[DEFAULT_URL, DEFAULT_KEY]");
const res = await fetch(`${url}/rest/v1/nameoff_kv?select=key,value&key=in.(custom,spellings)`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
const live = Object.fromEntries((await res.json()).map((r) => [r.key, r.value]));
ctx.LIVE = { custom: live.custom || [], spellings: live.spellings || {} };

const want = run(`(() => {
  const spell = { ...DEFAULT_SPELLINGS, ...LIVE.spellings }, out = [];
  for (const g of ["girl", "boy"]) {
    for (const n of namesFor(g, LIVE.custom, [])) {
      out.push({ id: n.id, g, roster: true });
      if (spell[n.id]) out.push({ id: slug(spell[n.id]), g, roster: true });
    }
    for (const id in VARIANTS) if (VARIANTS[id][g]) VARIANTS[id][g].ids.forEach((v) => out.push({ id: v, g }));
    // Nickname pills that add several spellings up (Mack/Mac, Allister/Alistair…).
    for (const id in COMBINE) (COMBINE[id][g] || []).forEach((lk) => (lk.ids || [lk.id]).forEach((v) => out.push({ id: v, g })));
  }
  return out.map((w) => ({ ...w, self: VARIANTS[w.id] && VARIANTS[w.id][w.g] && VARIANTS[w.id][w.g].self }));
})()`);

// --- Name ideas: candidates spelled an uncommon way → the common spelling ---
// A spelling key that only folds differences of LETTERS, not sound: y/i, -ie/-ey/-ee,
// ph/f, ck/k, hard c/k, a silent h, doubled consonants, the silent e of -ette/-elle/
// -anne, -ore/-or. Looser rules measured badly: a general silent-e rule turned Jake
// into Jack and Carolyn into Caroline; folding double vowels made Keely Kelly.
const spellKey = (n) => {
  let s = n.toLowerCase().replace(/[^a-z]/g, "").replace(/ph/g, "f").replace(/ck/g, "k");
  s = s.replace(/c(?=[aoulrt]|$)/g, "k").replace(/(?<=.)y/g, "i").replace(/(ie|ee|ey|i)$/, "i");
  s = s.replace(/(?<=[aeiou])h$/, "").replace(/(?<=[aeiou])h(?=[^aeiou])/g, "");
  s = s.replace(/(tt|ll|nn|ss)e$/, "$1").replace(/ore$/, "or").replace(/([^aeiou])\1+/g, "$1");
  return s;
};
// Same letters-only key, different sound — hand-checked, keep their own spelling.
const NOT_RESPELLED = new Set(["dana", "lennie", "davy", "lenna", "milla"]);
const RECENT = YEARS.slice(-3);
const recent = (n, g) => RECENT.reduce((t, y) => t + ((ssa[n] && ssa[n][g] && ssa[n][g][y]) ? ssa[n][g][y].count : 0), 0);
const byKey = { girl: {}, boy: {} };
for (const n in ssa) for (const g in ssa[n]) (byKey[g][spellKey(n)] ||= []).push(n);
const respell = {};
for (const c of run("CANDS.map((c) => ({ id: c.id, name: c.name, g: c.gender }))")) {
  if (NOT_RESPELLED.has(c.id)) continue;
  const gs = c.g === "u" ? ["girl", "boy"] : [c.g], me = norm(c.name);
  const own = gs.reduce((t, g) => t + recent(me, g), 0);
  if (own >= 1000) continue;                       // an established spelling in its own right
  let best = null;
  for (const g of gs) for (const n of byKey[g][spellKey(me)] || []) {
    const k = recent(n, g);
    if (n !== me && k >= Math.max(3 * own, 30) && (!best || k > best.k)) best = { n, k };
  }
  if (best) {
    respell[c.id] = best.n.charAt(0).toUpperCase() + best.n.slice(1);
    gs.forEach((g) => want.push({ id: best.n, g }));  // its SSA row backs the candidate's popularity
  }
}

const out = {}, missing = [];
for (const { id, g, roster, self } of want) {
  const src = norm(self || id.replace(/-\d+$/, ""));
  const s = ssa[src] && ssa[src][g];
  if (!s) { if (roster) (out[id] ||= {})[g] ||= [...YEARS.map(() => null), null]; else missing.push(`${id} (${g})`); continue; }
  const last = s[YEARS[YEARS.length - 1]];
  const pct = last ? +((last.count / total[g]) * 100 * SCALE[g]).toPrecision(3) : null;
  (out[id] ||= {})[g] = [...YEARS.map((y) => (s[y] ? s[y].rank : null)), pct];
}

// Curated rows that disagree with the data by more than a few places — worth a look.
const drift = run("Object.keys(POP)").flatMap((id) => ["girl", "boy"].map((g) => {
  const r = run(`POP[${JSON.stringify(id)}] && POP[${JSON.stringify(id)}].${g} && POP[${JSON.stringify(id)}].${g}[2025]`);
  const s = ssa[norm(id)] && ssa[norm(id)][g] && ssa[norm(id)][g][2025];
  return r != null && s && Math.abs(s.rank - r) > 5 && r <= 1000 ? `${id} ${g}: app #${r}, SSA #${s.rank}` : null;
})).filter(Boolean);

const body = Object.keys(out).sort().map((id) => {
  const k = /^[a-z]+$/.test(id) ? id : JSON.stringify(id);
  return `  ${k}: { ${Object.entries(out[id]).map(([g, r]) => `${g}:${JSON.stringify(r)}`).join(", ")} },`;
}).join("\n");
let src = fs.readFileSync(APP, "utf8");
const re = /(\/\/ <ssa-pop>[^\n]*\n)[\s\S]*?(\n\/\/ <\/ssa-pop>)/;
if (!re.test(src)) throw new Error("no <ssa-pop> markers in " + APP);
src = src.replace(re, `$1const SSA_POP = {\n${body}\n};$2`);
const reR = /(\/\/ <respell>[^\n]*\n)[\s\S]*?(\n\/\/ <\/respell>)/;
if (!reR.test(src)) throw new Error("no <respell> markers in " + APP);
const rbody = Object.keys(respell).sort().map((id) => `${/^[a-z]+$/.test(id) ? id : JSON.stringify(id)}:${JSON.stringify(respell[id])}`);
const lines = []; for (let i = 0; i < rbody.length; i += 8) lines.push("  " + rbody.slice(i, i + 8).join(", ") + ",");
src = src.replace(reR, `$1const RESPELL = {\n${lines.join("\n")}\n};$2`);
fs.writeFileSync(APP, src);
console.log(`SSA_POP: ${Object.keys(out).length} names; RESPELL: ${Object.keys(respell).length} candidates — written to ${APP}`);
if (missing.length) console.log(`VARIANTS spellings with no SSA data (drop them): ${missing.join(", ")}`);
if (drift.length) console.log(`Curated POP rows off from SSA 2025:\n  ${drift.join("\n  ")}`);
