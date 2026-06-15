
const { useState, useEffect, useRef, useCallback } = React;

/* ----------------------------- palette + type ---------------------------- */
const C = {
  bg:"#E6D9BC", paper:"#F4EBD3", ink:"#2C2114", muted:"#6E5C40", line:"#D2C49E",
  teal:"#2E4756", ochre:"#C9821A", sage:"#566B36", clay:"#A4663A",
  // Per-person identity colors — used everywhere a person's data is shown.
  claire:"#C9821A", andrew:"#4C6B3A",
  // Per-gender identity + soft background tints for the Vote banner / Rankings.
  girl:"#B5677B", boy:"#5B7493", girlTint:"#EFE0E2", boyTint:"#DFE6EC",
};
// Color for a profile's own data (Claire = orangey-yellow, Andrew = sage green).
const pColor = (p) => (p === "claire" ? C.claire : C.andrew);
// Per-gender helpers: accent color, soft background tint, and banner label.
const gColor = (g) => (g === "boy" ? C.boy : C.girl);
const gTint = (g) => (g === "boy" ? C.boyTint : C.girlTint);
const gLabel = (g) => (g === "boy" ? "BOYS" : "GIRLS");
// Strip the wrapping quotes from meaning strings (e.g. Cornish · 'joyful' -> joyful).
const cleanMeaning = (s) => (s ? s.replace(/['']/g, "") : s);
// Linear blend between two #rrggbb colors. t in [0,1].
const hexLerp = (a, b, t) => {
  const ch = (h, i) => parseInt(h.slice(i, i + 2), 16);
  const mix = (i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, "0");
  return `#${mix(1)}${mix(3)}${mix(5)}`;
};
// Ranking gradient (stays in palette): top of list = green, middle = amber, bottom = orange.
const rankColor = (pos) => (pos <= 0.5 ? hexLerp("#566B36", "#C9821A", pos / 0.5) : hexLerp("#C9821A", "#B5652E", (pos - 0.5) / 0.5));
const DISPLAY = "var(--disp)";
const BODY = "var(--body)";

/* -------------------------------- icons ---------------------------------- */
function Ic({ n, s = 16, c = "currentColor", fill = "none" }) {
  const paths = {
    check:"M20 6 9 17l-5-5", plus:"M12 5v14M5 12h14", x:"M18 6 6 18M6 6l12 12",
    list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    reset:"M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4",
    back:"M19 12H5M12 19l-7-7 7-7",
    trophy:"M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3",
    swords:"M3 3l7 7M14 14l7 7M21 3l-7 7M10 14l-7 7",
    trend:"M3 17l6-6 4 4 8-8M21 7v6h-6",
    sync:"M21 12a9 9 0 1 1-2.6-6.3M21 4v4h-4",
    star:"M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z",
  };
  const ban = n === "ban";
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {ban ? (<g><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6 18.4 18.4" /></g>)
        : (<path d={paths[n] || ""} />)}
    </svg>
  );
}

/* -------------------------------- names ---------------------------------- */
const U = (id, name, nicks = []) => ({ id, name, nicks, unisex: true });
const UNISEX = [ U("lennon","Lennon",["Len","Lenny"]), U("sullivan","Sullivan",["Sully","Sunny"]), U("rory","Rory",["Ro","Rors"]), U("shae","Shae") ];
const NAMES = {
  boy: [
    { id:"finnegan", name:"Finnegan", nicks:["Finn"] },
    { id:"sean", name:"Sean", nicks:["Jack"] },
    { id:"keegan", name:"Keegan", nicks:["Key","Keegs"] },
    { id:"callan", name:"Callan", nicks:["Cal"] },
    { id:"calvin", name:"Calvin", nicks:["Cal"] },
    { id:"mcallister", name:"McAllister", nicks:["Mack","Allister"] },
    ...UNISEX,
  ],
  girl: [
    { id:"sloane", name:"Sloane", nicks:["Sloey","Loey","Lo"] },
    { id:"rowan", name:"Rowan", nicks:["Winnie","Robbie"] },
    { id:"devin", name:"Devin", nicks:["Dev","Devvy"] },
    { id:"marlowe", name:"Marlowe", nicks:["Lo","Lowie"] },
    { id:"keelan", name:"Keelin", nicks:["Ollie","Keeley"] },
    { id:"cloda", name:"Cloda", nicks:["Lo","Lowie","Cloey"] },
    { id:"lowen", name:"Lowen", nicks:["Lo","Lowie","Winnie"] },
    { id:"bridget", name:"Bridget", nicks:["Birdie","Jett"] },
    { id:"merritt", name:"Merritt", nicks:["Merry","Ritt"] },
    { id:"maira", name:"Maira", nicks:["Malley"] },
    { id:"fiona", name:"Fiona", nicks:["Fio","Oona"] },
    ...UNISEX,
  ],
};
const PROFILES = { claire:"Claire", andrew:"Andrew" };
const START = 1500;
const BLOCK = 2; // matchups voted per gender before the Vote flow flips to the other
const HISTORY_CAP = 200;

/* ---------------------- US popularity (SSA, by year) ---------------------
 * POP[id][gender] = { year: rank }. Use null for a year outside the top 1000.
 * SSA only ranks the top 1000 per sex. Fill these in from ssa.gov/oact/babynames.
 * Seeded with Sloane (girl) as the working example. */
const POP = {
  // boys — formal bracket names
  finnegan:   { boy: { 2020:409, 2021:378, 2022:446, 2023:491, 2024:494, 2025:526 } },
  sean:       { boy: { 2020:334, 2021:362, 2022:397, 2023:427, 2024:435, 2025:489 } },
  keegan:     { boy: { 2020:496, 2021:492, 2022:566, 2023:627, 2024:593, 2025:621 } },
  callan:     { boy: { 2020:434, 2021:374, 2022:354, 2023:339, 2024:242, 2025:190 } },
  calvin:     { boy: { 2020:144, 2021:145, 2022:148, 2023:152, 2024:140, 2025:132 } },
  mcallister: { boy: { 2025:null } },
  // nickname-only entries, shown next to their formal name via COMBINE
  finn:       { boy: { 2020:179, 2021:184, 2022:177, 2023:187, 2024:198, 2025:206 } },
  jack:       { boy: { 2020:21,  2021:11,  2022:15,  2023:14,  2024:15,  2025:15  } },
  cal:        { boy: { 2020:937, 2021:879, 2022:748, 2023:712, 2024:670, 2025:543 } },
  mack:       { boy: { 2020:505, 2021:474, 2022:504, 2023:545, 2024:499, 2025:463 } },
  allister:   { boy: { 2020:961, 2021:902, 2022:929, 2023:921, 2024:909, 2025:897 } },
  mac:        { boy: { 2020:934, 2021:674, 2022:605, 2023:656, 2024:697, 2025:696 } },
  shawn:      { boy: { 2020:452, 2021:501, 2022:568, 2023:633, 2024:638, 2025:682 } },
  callen:     { boy: { 2020:534, 2021:459, 2022:459, 2023:450, 2024:480, 2025:516 } },
  // girls
  sloane:   { girl: { 2020:181, 2021:145, 2022:140, 2023:151, 2024:153, 2025:141 } },
  sloan:    { girl: { 2020:665, 2021:572, 2022:634, 2023:689, 2024:766, 2025:840 } },
  rowan:    { girl: { 2020:255, 2021:241, 2022:277, 2023:234, 2024:266, 2025:249 } },
  devin:    { girl: { 2025:null } },
  marlowe:  { girl: { 2020:927, 2021:899, 2022:779, 2023:836, 2024:625, 2025:523 } },
  keelan:   { girl: { 2025:null } },
  cloda:    { girl: { 2025:null } },
  lowen:    { girl: { 2025:null } },
  bridget:  { girl: { 2020:750, 2021:722, 2022:793, 2023:750, 2024:706, 2025:724 } },
  merritt:  { girl: { 2020:null, 2021:null, 2022:null, 2023:null, 2024:null, 2025:703 } },
  maira:    { girl: { 2025:null } },
  fiona:    { girl: { 2020:295, 2021:299, 2022:360, 2023:400, 2024:405, 2025:470 } },
  // unisex (both brackets)
  lennon:   { girl: { 2020:299, 2021:238, 2022:228, 2023:243, 2024:235, 2025:214 },
              boy:  { 2020:691, 2021:673, 2022:663, 2023:756, 2024:786, 2025:808 } },
  sullivan: { girl: { 2025:null },
              boy:  { 2020:398, 2021:372, 2022:366, 2023:358, 2024:339, 2025:314 } },
  rory:     { girl: { 2020:458, 2021:399, 2022:336, 2023:305, 2024:287, 2025:230 },
              boy:  { 2020:330, 2021:295, 2022:280, 2023:242, 2024:227, 2025:199 } },
  shae:     { girl: { 2020:934, 2021:903, 2022:914, 2023:1000, 2024:null, 2025:null }, boy: { 2025:null } },
  // shared nickname (girl)
  winnie:   { girl: { 2020:771, 2021:693, 2022:592, 2023:611, 2024:548, 2025:475 } },
  sunny:    { girl: { 2020:691, 2021:642, 2022:553, 2023:406, 2024:370, 2025:390 } },
};
// A bracket name can show one or more linked names' ranks alongside it (e.g. nickname Finn under Finnegan).
const COMBINE = {
  finnegan:   { boy: [{ id:"finn",  label:"Finn"  }] },
  sean:       { boy: [{ id:"jack",  label:"Jack"  }] },
  callan:     { boy: [{ id:"cal",   label:"Cal"   }] },
  calvin:     { boy: [{ id:"cal",   label:"Cal"   }] },
  mcallister: { boy: [{ ids:["mack","mac"], label:"Mack/Mac" }, { id:"allister", label:"Allister" }] },
  rowan:      { girl: [{ id:"winnie", label:"Winnie" }] },
  lowen:      { girl: [{ id:"winnie", label:"Winnie" }] },
  sullivan:   { girl: [{ id:"sunny", label:"Sunny" }] },
};
// 2025 share of US births of that sex (percent). Only ranked names have a value.
const PCT = {
  sloane:{girl:0.118}, sloan:{girl:0.018}, rowan:{girl:0.071}, fiona:{girl:0.037},
  bridget:{girl:0.022}, merritt:{girl:0.023}, marlowe:{girl:0.033},
  finnegan:{boy:0.031}, sean:{boy:0.034}, keegan:{boy:0.024}, callan:{boy:0.104}, calvin:{boy:0.148},
  lennon:{girl:0.081, boy:0.017}, sullivan:{boy:0.059}, rory:{girl:0.076, boy:0.096},
  finn:{boy:0.093}, jack:{boy:0.477}, cal:{boy:0.030}, mack:{boy:0.036}, mac:{boy:0.021}, allister:{boy:0.014},
  shawn:{boy:0.022}, callen:{boy:0.032}, winnie:{girl:0.037}, sunny:{girl:0.045},
};
// Spelling variants of the SAME bracket name → its functional popularity sums these in (with the name's own share).
const VARIANTS = {
  sloane: { girl: { ids:["sloan"],  label:"Sloane/Sloan" } },
  sean:   { boy:  { ids:["shawn"],  label:"Sean/Shawn" } },
  callan: { boy:  { ids:["callen"], label:"Callan/Callen" } },
};
// Short origin · meaning one-liners (keyed by name id).
const MEANING = {
  // boys
  finnegan: "Irish · 'fair, white'",
  sean:     "Irish form of John · 'God is gracious'",
  keegan:   "Irish · 'little fire; fiery one'",
  callan:   "Irish · 'mighty in battle'",
  calvin:   "Latin · 'bald'",
  mcallister:"Scottish · 'son of Alexander'",
  // girls
  sloane:   "Irish · 'raider, warrior'",
  rowan:    "Irish · 'little red one'; also the rowan tree",
  devin:    "Irish · 'little poet; fawn'",
  marlowe:  "English · 'lake remnants' place name",
  keelan:   "Irish · 'slender and fair'",
  cloda:    "Irish · river in Tipperary",
  lowen:    "Cornish · 'joyful, happy'",
  bridget:  "Irish · 'exalted one', goddess of fire & poetry",
  merritt:  "English · 'boundary gate' surname",
  maira:    "Irish form of Mary · 'beloved; wished-for child'",
  fiona:    "Scottish · 'fair, white'",
  // unisex
  lennon:   "Irish · 'lover, sweetheart'",
  sullivan: "Irish · 'dark-eyed; hawk-eyed'",
  rory:     "Irish · 'red king'",
  shae:     "Irish · 'hawk-like; stately'",
};
const pctOf = (id, gender) => (PCT[id] && PCT[id][gender] != null) ? PCT[id][gender] : null;
const fmtPct = (p) => p == null ? null : (p < 0.01 ? "<0.01%" : p.toFixed(2) + "%");
// Estimate a rank from a percent by interpolating known (percent, rank) pairs for that sex.
function approxRank(pct, gender) {
  if (pct == null) return null;
  const pts = [];
  Object.keys(PCT).forEach((id) => {
    const p = PCT[id] && PCT[id][gender];
    const r = POP[id] && POP[id][gender] && POP[id][gender][2025];
    if (p != null && r != null) pts.push({ p, r });
  });
  pts.sort((a, b) => a.p - b.p);
  if (pts.length < 2) return null;
  const clamp = (r) => { r = Math.round(r); return r < 1 ? 1 : (r > 1000 ? null : r); };
  // Below the calibration range: extrapolate up the first segment's slope (rarer → higher rank).
  if (pct <= pts[0].p) {
    const s = (pts[1].r - pts[0].r) / (pts[1].p - pts[0].p);
    return clamp(pts[0].r + (pct - pts[0].p) * s);
  }
  // Above the range (e.g. a popular merged name): extrapolate down the last segment's slope.
  if (pct >= pts[pts.length - 1].p) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const s = (b.r - a.r) / (b.p - a.p);
    return clamp(b.r + (pct - b.p) * s);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (pct >= pts[i].p && pct <= pts[i + 1].p) {
      const t = (pct - pts[i].p) / (pts[i + 1].p - pts[i].p);
      return clamp(pts[i].r + t * (pts[i + 1].r - pts[i].r));
    }
  }
  return null;
}
// Estimate a percent from a rank (inverse of approxRank) using the same 2025 calibration.
function rankToPct(rank, gender) {
  if (rank == null) return null;
  const pts = [];
  Object.keys(PCT).forEach((id) => {
    const p = PCT[id] && PCT[id][gender];
    const r = POP[id] && POP[id][gender] && POP[id][gender][2025];
    if (p != null && r != null) pts.push({ r, p });
  });
  pts.sort((a, b) => a.r - b.r);
  if (pts.length < 2) return null;
  const pos = (v) => (v < 0 ? 0 : v);
  if (rank <= pts[0].r) { const s = (pts[1].p - pts[0].p) / (pts[1].r - pts[0].r); return pos(pts[0].p + (rank - pts[0].r) * s); }
  if (rank >= pts[pts.length - 1].r) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; const s = (b.p - a.p) / (b.r - a.r); return pos(b.p + (rank - b.r) * s); }
  for (let i = 0; i < pts.length - 1; i++) {
    if (rank >= pts[i].r && rank <= pts[i + 1].r) {
      const t = (rank - pts[i].r) / (pts[i + 1].r - pts[i].r);
      return pos(pts[i].p + t * (pts[i + 1].p - pts[i].p));
    }
  }
  return null;
}
// Tier from a name's current rank (how common the name itself is).
function tierOf(rank) {
  if (rank == null) return { label:"Rare", color:C.muted };
  if (rank <= 25) return { label:"Super popular", color:C.clay };
  if (rank <= 100) return { label:"Very popular", color:C.ochre };
  if (rank <= 300) return { label:"Familiar", color:C.sage };
  return { label:"Uncommon", color:C.teal };
}
const PopModeCtx = React.createContext("rank");
function popSeries(id, gender) {
  const m = POP[id] && POP[id][gender];
  if (!m) return null;
  const years = Object.keys(m).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;
  return years.map((y) => ({ year: y, rank: m[y] })); // rank may be null = NR
}

/* ------------------------------- storage --------------------------------- */
const SB_URL_KEY = "nameoff_sb_url";
const SB_KEY_KEY = "nameoff_sb_key";
// Baked-in shared config: anyone opening the app auto-connects — no pasting needed.
// (Publishable key is client-safe by design; access is still governed by the table's RLS policies.)
const DEFAULT_URL = "https://wjyxrdyknopxevvydmdh.supabase.co";
const DEFAULT_KEY = "sb_publishable_41Rep4y244JEtrBHUAGWRw_-jKxxEzO";
const LP = "nameoff:";
const TABLE = "nameoff_kv";
const kCore = (g, p) => `${g}:${p}`;
const kHist = (g, p) => `hist:${g}:${p}`;

const normUrl = (u) => (u || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "").replace(/\/+$/, "");
function makeStore() {
  let url = normUrl(localStorage.getItem(SB_URL_KEY) || DEFAULT_URL);
  let key = localStorage.getItem(SB_KEY_KEY) || DEFAULT_KEY;
  const rest = () => `${url}/rest/v1/${TABLE}`;
  const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
  return {
    get configured() { return !!(url && key); },
    get url() { return url; },
    get key() { return key; },
    setConfig(u, k) {
      url = normUrl(u);
      key = (k || "").trim();
      url ? localStorage.setItem(SB_URL_KEY, url) : localStorage.removeItem(SB_URL_KEY);
      key ? localStorage.setItem(SB_KEY_KEY, key) : localStorage.removeItem(SB_KEY_KEY);
    },
    async getAll() {
      if (this.configured) {
        const res = await fetch(`${rest()}?select=key,value`, { headers: headers() });
        if (!res.ok) throw new Error(`read failed (${res.status}): check URL, anon key, and table/policies`);
        const rows = await res.json();
        if (!Array.isArray(rows)) throw new Error("unexpected response (is the table created?)");
        const out = {};
        rows.forEach((r) => { out[r.key] = r.value; });
        return out;
      }
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const lk = localStorage.key(i);
        if (lk && lk.startsWith(LP)) { try { out[lk.slice(LP.length)] = JSON.parse(localStorage.getItem(lk)); } catch {} }
      }
      return out;
    },
    async setKeys(updates) {
      if (this.configured) {
        const rows = Object.keys(updates).map((k) => ({ key: k, value: updates[k] }));
        if (!rows.length) return;
        const res = await fetch(rest(), {
          method: "POST",
          headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(rows),
        });
        if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`save failed (${res.status}) ${t.slice(0, 100)}`); }
        return;
      }
      Object.keys(updates).forEach((k) => localStorage.setItem(LP + k, JSON.stringify(updates[k])));
    },
  };
}

/* ------------------------------- helpers --------------------------------- */
const clone = (o) => JSON.parse(JSON.stringify(o));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "name";
const uniqueId = (base, taken) => { let id = base, k = 2; while (taken.has(id)) { id = base + "-" + k; k++; } return id; };

function namesFor(gender, custom, removed) {
  const baseNames = new Set(NAMES[gender].map((n) => n.name.toLowerCase()));
  const extra = (custom || [])
    .filter((c) => (c.gender === gender || c.gender === "both") && !baseNames.has(c.name.toLowerCase()))
    .map((c) => ({ id: c.id, name: c.name, nicks: c.nicks || [], unisex: c.gender === "both", custom: true }));
  const rm = new Set(removed || []);
  return [...NAMES[gender], ...extra].filter((n) => !rm.has(n.id));
}
const findName = (names, id) => names.find((n) => n.id === id) || { id, name: id, nicks: [] };
const coreOf = (pg) => ({ ratings: pg.ratings, matches: pg.matches, votes: pg.votes, vetoed: pg.vetoed, starred: pg.starred });
const trimHistory = (h) => {
  let a = h.slice(-HISTORY_CAP);
  while (JSON.stringify(a).length > 45000 && a.length > 10) a = a.slice(Math.ceil(a.length * 0.1));
  return a;
};

function emptyPG(gender, custom) {
  const ratings = {}, matches = {};
  namesFor(gender, custom).forEach((n) => { ratings[n.id] = START; matches[n.id] = 0; });
  return { ratings, matches, votes: 0, vetoed: [], starred: [], history: [] };
}
function assemble(map) {
  const custom = Array.isArray(map.custom) ? map.custom : [];
  const removed = Array.isArray(map.removed) ? map.removed : [];
  const notes = (map.notes && typeof map.notes === "object") ? map.notes : {};
  const data = { custom, removed, notes, boy: {}, girl: {} };
  ["boy", "girl"].forEach((g) => ["claire", "andrew"].forEach((p) => {
    const core = map[kCore(g, p)] || {};
    const hist = map[kHist(g, p)];
    const pg = {
      ratings: core.ratings || {}, matches: core.matches || {},
      votes: core.votes || 0, vetoed: core.vetoed || [], starred: core.starred || [],
      history: Array.isArray(hist) ? hist : [],
    };
    namesFor(g, custom).forEach((n) => {
      if (pg.ratings[n.id] == null) pg.ratings[n.id] = START;
      if (pg.matches[n.id] == null) pg.matches[n.id] = 0;
    });
    data[g][p] = pg;
  }));
  return data;
}
function updateElo(ratings, winId, loseId, K = 32) {
  const Rw = ratings[winId] ?? START, Rl = ratings[loseId] ?? START;
  const Ew = 1 / (1 + Math.pow(10, (Rl - Rw) / 400));
  return { ...ratings, [winId]: Rw + K * (1 - Ew), [loseId]: Rl + K * (0 - (1 - Ew)) };
}
function pickPair(names, pg, last) {
  if (names.length < 2) return null;
  const m = (id) => pg.matches[id] || 0;
  const minM = Math.min(...names.map((n) => m(n.id)));
  const poolA = names.filter((n) => m(n.id) === minM);
  const A = poolA[Math.floor(Math.random() * poolA.length)];
  const rA = pg.ratings[A.id] ?? START;
  const others = names.filter((n) => n.id !== A.id).sort((x, y) => {
    if (m(x.id) !== m(y.id)) return m(x.id) - m(y.id);
    return Math.abs((pg.ratings[x.id] ?? START) - rA) - Math.abs((pg.ratings[y.id] ?? START) - rA);
  });
  const topB = others.slice(0, Math.min(4, others.length));
  let B = topB[Math.floor(Math.random() * topB.length)];
  if (last && ((last[0] === A.id && last[1] === B.id) || (last[0] === B.id && last[1] === A.id)) && others.length > 1) {
    const alt = others.filter((n) => n.id !== B.id);
    B = alt[Math.floor(Math.random() * Math.min(4, alt.length))];
  }
  return Math.random() < 0.5 ? [A.id, B.id] : [B.id, A.id];
}
const ranksOf = (ratings, names) =>
  [...names].sort((a, b) => (ratings[b.id] ?? START) - (ratings[a.id] ?? START))
    .reduce((o, n, i) => { o[n.id] = i + 1; return o; }, {});

const store = makeStore();

/* ============================== component ================================ */
function App() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState("claire");
  const [voteGender, setVoteGender] = useState("girl"); // gender of the current Vote matchup
  const [blockCount, setBlockCount] = useState(0);       // matchups done in the current gender block
  const [view, setView] = useState("vote");
  const [pair, setPair] = useState(null);
  const [picked, setPicked] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [undo, setUndo] = useState([]); // in-session stack of reversible matchups (per profile)
  const [showAdd, setShowAdd] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [popMode, setPopMode] = useState(() => localStorage.getItem("nameoff_popmode") || "rank");
  const changePopMode = (m) => { setPopMode(m); try { localStorage.setItem("nameoff_popmode", m); } catch {} };
  const [sync, setSync] = useState({ on: store.configured, status: store.configured ? "syncing" : "local", at: null, err: "" });
  const dataRef = useRef(null);
  const savingRef = useRef(false);
  const pendingPairRef = useRef(null); // forces the pair effect to use a specific matchup (for go-back)

  const load = useCallback(async () => {
    try {
      const map = await store.getAll();
      const d = assemble(map);
      dataRef.current = d; setData(d);
      setSync((s) => ({ ...s, on: store.configured, status: store.configured ? "synced" : "local", at: Date.now(), err: "" }));
    } catch (e) {
      setSync((s) => ({ ...s, status: "error", err: String(e.message || e) }));
      if (!dataRef.current) { const d = assemble({}); dataRef.current = d; setData(d); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // background pull so each partner's votes flow in
  useEffect(() => {
    if (!store.configured) return;
    const tick = async () => {
      if (savingRef.current || document.hidden) return;
      try {
        const map = await store.getAll();
        const d = assemble(map);
        dataRef.current = d; setData(d);
        setSync((s) => ({ ...s, status: "synced", at: Date.now(), err: "" }));
      } catch (e) { setSync((s) => ({ ...s, status: "error", err: String(e.message || e) })); }
    };
    const iv = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => { clearInterval(iv); window.removeEventListener("focus", tick); };
  }, [sync.on]);

  const save = useCallback(async (updates) => {
    savingRef.current = true;
    setSync((s) => ({ ...s, status: s.on ? "saving" : "local" }));
    try {
      await store.setKeys(updates);
      setSync((s) => ({ ...s, status: s.on ? "synced" : "local", at: Date.now(), err: "" }));
    } catch (e) {
      setSync((s) => ({ ...s, status: "error", err: String(e.message || e) }));
    } finally { savingRef.current = false; }
  }, []);

  const otherG = (g) => (g === "girl" ? "boy" : "girl");
  const poolFor = (d, g) => {
    const pg2 = d[g][profile];
    return namesFor(g, d.custom, d.removed).filter((n) => !pg2.vetoed.includes(n.id));
  };
  const votable = (d, g) => poolFor(d, g).length >= 2;
  // Decide the gender for the NEXT matchup given how many were just completed.
  const advance = (d, curG, completed) => {
    let g = curG, c = completed;
    if (c >= BLOCK) { g = otherG(curG); c = 0; }
    if (!votable(d, g) && votable(d, otherG(g))) { g = otherG(g); c = 0; }
    return { g, c };
  };

  useEffect(() => {
    if (!data) return;
    if (pendingPairRef.current) { setPair(pendingPairRef.current); pendingPairRef.current = null; setPicked(null); return; }
    setPair(pickPair(poolFor(data, voteGender), data[voteGender][profile], null));
    setPicked(null);
  }, [data && 1, voteGender, profile]); // eslint-disable-line

  // If the starting gender can't field a pair, flip once on load.
  useEffect(() => {
    if (!data) return;
    if (!votable(data, voteGender) && votable(data, otherG(voteGender))) { setVoteGender(otherG(voteGender)); setBlockCount(0); }
  }, [data && 1]); // eslint-disable-line

  const pg = data ? data[voteGender][profile] : null;
  const names = data ? namesFor(voteGender, data.custom, data.removed) : [];

  const vote = (winId, loseId) => {
    if (picked) return;
    setPicked(winId);
    const g = voteGender;
    const next = clone(dataRef.current);
    const cur = next[g][profile];
    const beforeCore = clone(coreOf(cur));      // snapshots for go-back
    const beforeHist = clone(cur.history);
    cur.ratings = updateElo(cur.ratings, winId, loseId);
    cur.matches[winId] = (cur.matches[winId] || 0) + 1;
    cur.matches[loseId] = (cur.matches[loseId] || 0) + 1;
    cur.votes += 1;
    const snap = {};
    namesFor(g, next.custom).forEach((n) => { snap[n.id] = Math.round(cur.ratings[n.id]); });
    cur.history.push({ m: cur.votes, t: Date.now(), r: snap });
    cur.history = trimHistory(cur.history);
    dataRef.current = next;
    const entry = { g, profile, pair, core: beforeCore, hist: beforeHist, blockCount };
    setTimeout(() => {
      setData(next);
      save({ [kCore(g, profile)]: coreOf(cur), [kHist(g, profile)]: cur.history });
      setUndo((u) => [...u.slice(-49), entry]);
      const completed = blockCount + 1;
      const { g: ng, c } = advance(next, g, completed);
      if (ng !== g) { setVoteGender(ng); setBlockCount(c); }            // pair effect re-picks for new gender
      else { setBlockCount(completed); setPair(pickPair(poolFor(next, ng), next[ng][profile], pair)); }
      setPicked(null);
    }, 280);
  };
  const skip = () => {
    if (picked) return;
    const completed = blockCount + 1;
    const { g, c } = advance(dataRef.current, voteGender, completed);
    if (g !== voteGender) { setVoteGender(g); setBlockCount(c); }
    else { setBlockCount(completed); setPair(pickPair(poolFor(dataRef.current, g), dataRef.current[g][profile], pair)); }
  };
  // Step back through this session's votes and re-decide them.
  const canGoBack = undo.some((e) => e.profile === profile);
  const goBack = () => {
    let idx = -1;
    for (let i = undo.length - 1; i >= 0; i--) { if (undo[i].profile === profile) { idx = i; break; } }
    if (idx < 0) return;
    const entry = undo[idx];
    const next = clone(dataRef.current);
    next[entry.g][profile] = { ...next[entry.g][profile], ...entry.core, history: entry.hist };
    dataRef.current = next; setData(next);
    save({ [kCore(entry.g, profile)]: coreOf(next[entry.g][profile]), [kHist(entry.g, profile)]: next[entry.g][profile].history });
    setUndo((u) => u.filter((_, i) => i !== idx));
    setBlockCount(entry.blockCount);
    setView("vote");
    pendingPairRef.current = entry.pair;
    if (entry.g !== voteGender) { setVoteGender(entry.g); }
    else { pendingPairRef.current = null; setPair(entry.pair); setPicked(null); }
  };

  const vetoCurrent = (id) => {
    const g = voteGender;
    const next = clone(dataRef.current);
    if (!next[g][profile].vetoed.includes(id)) next[g][profile].vetoed.push(id);
    dataRef.current = next; setData(next); setPicked(null);
    save({ [kCore(g, profile)]: coreOf(next[g][profile]) });
    if (votable(next, g)) { setPair(pickPair(poolFor(next, g), next[g][profile], null)); }
    else if (votable(next, otherG(g))) { setVoteGender(otherG(g)); setBlockCount(0); }
    else { setPair(null); }
  };
  const unveto = (g, profileKey, id) => {
    const next = clone(dataRef.current);
    next[g][profileKey].vetoed = next[g][profileKey].vetoed.filter((x) => x !== id);
    dataRef.current = next; setData(next);
    save({ [kCore(g, profileKey)]: coreOf(next[g][profileKey]) });
  };

  const addName = (name, nicksStr, g) => {
    const next = clone(dataRef.current);
    const dupe = (next.custom || []).some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.gender === g);
    const baseDupe = (g === "both" ? ["boy", "girl"] : [g]).some((gg) =>
      NAMES[gg].some((n) => n.name.toLowerCase() === name.trim().toLowerCase()));
    if (dupe || baseDupe) return;
    const taken = new Set([...NAMES.boy, ...NAMES.girl].map((n) => n.id).concat((next.custom || []).map((c) => c.id)));
    const id = uniqueId(slug(name), taken);
    const nicks = nicksStr.split(",").map((s) => s.trim()).filter(Boolean);
    next.custom = [...(next.custom || []), { id, name: name.trim(), nicks, gender: g }];
    dataRef.current = next; setData(next);
    save({ custom: next.custom });
  };
  const removeCustom = (id) => {
    const next = clone(dataRef.current);
    next.custom = (next.custom || []).filter((c) => c.id !== id);
    dataRef.current = next; setData(next);
    save({ custom: next.custom });
    if (pair && pair.includes(id)) setPair(pickPair(poolFor(next, voteGender), next[voteGender][profile], null));
  };

  const removeName = (id) => {
    const next = clone(dataRef.current);
    next.removed = Array.from(new Set([...(next.removed || []), id]));
    dataRef.current = next; setData(next);
    save({ removed: next.removed });
    if (pair && pair.includes(id)) setPair(pickPair(poolFor(next, voteGender), next[voteGender][profile], null));
  };
  const restoreName = (id) => {
    const next = clone(dataRef.current);
    next.removed = (next.removed || []).filter((x) => x !== id);
    dataRef.current = next; setData(next);
    save({ removed: next.removed });
  };

  const toggleStar = (g, id) => {
    const next = clone(dataRef.current);
    const cur = next[g][profile];
    cur.starred = cur.starred || [];
    cur.starred = cur.starred.includes(id) ? cur.starred.filter((x) => x !== id) : [...cur.starred, id];
    dataRef.current = next; setData(next);
    save({ [kCore(g, profile)]: coreOf(cur) });
  };
  const setNote = (id, text) => {
    const next = clone(dataRef.current);
    const notes = { ...(next.notes || {}) };
    const entry = { ...(notes[id] || {}) };
    if (text && text.trim()) entry[profile] = text.trim(); else delete entry[profile];
    if (Object.keys(entry).length) notes[id] = entry; else delete notes[id];
    next.notes = notes;
    dataRef.current = next; setData(next);
    save({ notes });
  };

  const doReset = () => {
    const g = voteGender;
    const next = clone(dataRef.current);
    next[g][profile] = emptyPG(g, next.custom);
    dataRef.current = next; setData(next);
    save({ [kCore(g, profile)]: coreOf(next[g][profile]), [kHist(g, profile)]: [] });
    setUndo((u) => u.filter((e) => !(e.profile === profile && e.g === g)));
    setPair(pickPair(poolFor(next, g), next[g][profile], null));
    setConfirmReset(false);
  };

  const connect = async (newUrl, newKey) => {
    store.setConfig(newUrl, newKey);
    setSync({ on: store.configured, status: store.configured ? "syncing" : "local", at: null, err: "" });
    await load();
  };

  if (!data) return <div className="boot" style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:14 }}>Loading your names…</div>;

  return (
    <PopModeCtx.Provider value={popMode}>
    <div className="wrap">
      <Header profile={profile} setProfile={setProfile}
        showAdd={showAdd} setShowAdd={setShowAdd}
        popMode={popMode} setPopMode={changePopMode} />
      {showAdd && <AddPanel custom={data.custom} onAdd={addName} onRemove={removeCustom} />}
      <Tabs view={view} setView={setView} />

      {view === "vote" && <Vote names={names} gender={voteGender} pair={pair} picked={picked} onVote={vote} onSkip={skip} onVeto={vetoCurrent}
        starred={pg.starred || []} onStar={(id) => toggleStar(voteGender, id)} onBack={goBack} canGoBack={canGoBack} profile={profile} />}
      {view === "rankings" && <Rankings data={data} profile={profile} onUnveto={unveto} onStar={toggleStar} onRemove={removeName} onRestore={restoreName} notes={data.notes} onSetNote={setNote} />}
      {view === "trends" && <Trends data={data} profile={profile} />}

      {view === "vote" && (
        <div style={{ marginTop: 32, display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:C.muted }}>
          <span>{pg.votes} matchup{pg.votes === 1 ? "" : "s"} as <b style={{ color:pColor(profile) }}>{PROFILES[profile]}</b> · {voteGender === "boy" ? "boys" : "girls"}</span>
          {confirmReset ? (
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              Reset {PROFILES[profile]}’s {voteGender === "boy" ? "boys" : "girls"}?
              <button onClick={doReset} style={{ padding:"4px 8px", borderRadius:6, fontWeight:600, background:C.clay, color:"#fff" }}>Yes</button>
              <button onClick={() => setConfirmReset(false)} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.line}` }}>No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="lift" style={{ display:"flex", alignItems:"center", gap:4, color:C.muted }}>
              <Ic n="reset" s={12} /> reset
            </button>
          )}
        </div>
      )}
    </div>
    </PopModeCtx.Provider>
  );
}

/* ------------------------------- header ---------------------------------- */
function Seg({ items, value, onChange, active = C.sage }) {
  // `active` may be a color, or a function (key) => color for per-item tints.
  const colorFor = (k) => (typeof active === "function" ? active(k) : active);
  return (
    <div style={{ display:"flex", gap:4, padding:4, borderRadius:999, background:C.paper, border:`1px solid ${C.line}` }}>
      {items.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className="lift"
          style={{ padding:"4px 12px", borderRadius:999, fontSize:14, fontWeight:600,
            ...(value === k ? { background: colorFor(k), color:"#fff" } : { color: C.muted }) }}>{label}</button>
      ))}
    </div>
  );
}
function syncDot(sync) {
  if (!sync.on) return C.muted;
  if (sync.status === "error") return C.clay;
  if (sync.status === "saving" || sync.status === "syncing") return C.ochre;
  return C.sage;
}
function Header({ profile, setProfile, showAdd, setShowAdd, popMode, setPopMode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <h1 className="disp" style={{ margin:0, letterSpacing:"0.06em", fontSize:32, fontWeight:800, textTransform:"uppercase" }}>
          Name<span style={{ color:C.sage }}>·</span>Off
        </h1>
        <Seg items={Object.entries(PROFILES)} value={profile} onChange={setProfile} active={pColor} />
      </div>
      <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ marginRight:"auto" }}>
          <Seg items={[["rank","#"],["pct","%"]]} value={popMode} onChange={setPopMode} active={C.teal} />
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="lift"
          style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:999, fontSize:12, fontWeight:700,
            ...(showAdd ? { background:C.sage, color:"#fff" } : { background:C.paper, color:C.sage, border:`1px solid ${C.line}` }) }}>
          <Ic n={showAdd ? "x" : "plus"} s={13} /> {showAdd ? "Close" : "Add name"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ sync panel ------------------------------- */
function SyncPanel({ sync, onConnect, onClose }) {
  const [url, setUrl] = useState(store.url);
  const [key, setKey] = useState(store.key);
  const status = !sync.on ? "Local only on this device, not shared."
    : sync.status === "error" ? `Sync error: ${sync.err || "check the URL, anon key, and that the table + policies exist"}`
    : sync.status === "saving" ? "Saving…" : sync.status === "syncing" ? "Connecting…"
    : `Synced${sync.at ? " · " + new Date(sync.at).toLocaleTimeString() : ""}`;
  const field = { flex:1, minWidth:200, padding:"8px 10px", borderRadius:8, background:C.bg, border:`1px solid ${C.line}`, color:C.ink, fontSize:13 };
  return (
    <div style={{ borderRadius:12, padding:12, marginBottom:16, background:C.paper, border:`1px solid ${C.line}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span className="disp" style={{ fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", fontSize:14 }}>Shared sync · Supabase</span>
        <button onClick={onClose} className="lift" style={{ color:C.muted }}><Ic n="x" s={15} /></button>
      </div>
      <p style={{ fontSize:12, color:C.muted, margin:"6px 0 8px" }}>
        Paste your Supabase <b>Project URL</b> and <b>anon public key</b> (Settings → API). Enter the same two on both phones to share one ranking. Leave blank to stay local.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" style={field} />
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="anon public key (eyJ…)" style={field} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={() => onConnect(url, key)} className="lift" style={{ padding:"8px 14px", borderRadius:8, fontWeight:700, background:C.sage, color:"#fff" }}>Connect</button>
          {sync.on && <button onClick={() => { setUrl(""); setKey(""); onConnect("", ""); }} className="lift" style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${C.line}`, color:C.muted }}>Disconnect</button>}
        </div>
      </div>
      <div style={{ fontSize:11, marginTop:8, color: sync.status === "error" ? C.clay : C.muted }}>{status}</div>
    </div>
  );
}

/* ------------------------------ add panel -------------------------------- */
function AddPanel({ custom, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [nicks, setNicks] = useState("");
  const [g, setG] = useState("girl");
  const submit = () => { if (!name.trim()) return; onAdd(name, nicks, g); setName(""); setNicks(""); };
  const inputStyle = { padding:"8px 10px", borderRadius:8, background:C.bg, border:`1px solid ${C.line}`, color:C.ink, fontSize:13, width:"100%" };
  return (
    <div style={{ borderRadius:12, padding:12, marginBottom:16, background:C.paper, border:`1px solid ${C.line}` }}>
      <div className="addgrid">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Full name (e.g. Eleanor)" style={inputStyle} />
        <input value={nicks} onChange={(e) => setNicks(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Nicknames, comma-separated" style={inputStyle} />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, flexWrap:"wrap" }}>
        <Seg items={[["girl","Girl"],["boy","Boy"],["both","Both"]]} value={g} onChange={setG} />
        <button onClick={submit} className="lift" style={{ padding:"6px 16px", borderRadius:8, fontWeight:700, background:C.clay, color:"#fff" }}>Add</button>
      </div>
      {custom.length > 0 && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.line}` }}>
          <div style={{ fontSize:12, marginBottom:6, color:C.muted }}>Names you’ve added</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {custom.map((c) => (
              <span key={c.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:999, fontSize:12, background:C.bg, border:`1px solid ${C.line}` }}>
                <b style={{ color:C.ink }}>{c.name}</b>
                <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.04em", color:C.muted }}>{c.gender === "both" ? "both" : c.gender}</span>
                <button onClick={() => onRemove(c.id)} className="lift" style={{ color:C.clay }} aria-label={`Remove ${c.name}`}><Ic n="x" s={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- tabs ----------------------------------- */
function Tabs({ view, setView }) {
  const items = [["vote","Vote","swords"],["rankings","Rankings","trophy"],["trends","Trends","trend"]];
  return (
    <div style={{ display:"flex", gap:4, marginBottom:20, padding:4, borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
      {items.map(([k, label, icon]) => (
        <button key={k} onClick={() => setView(k)} className="lift"
          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 0", borderRadius:8, fontSize:14, fontWeight:600,
            ...(view === k ? { background:C.bg, color:C.ink, boxShadow:"0 1px 0 rgba(0,0,0,0.04)" } : { color:C.muted }) }}>
          <Ic n={icon} s={15} /> {label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------- popularity display -------------------------- */
function Sparkline({ series, w = 200, h = 46, color = C.sage, compact = false, mode = "rank", gender = "girl", approx = false }) {
  const pts = series.filter((p) => p.rank != null);
  const [hi, setHi] = React.useState(null);
  if (pts.length < 2) return null;
  const ranks = pts.map((p) => p.rank);
  const minR = Math.min(...ranks), maxR = Math.max(...ranks);
  const yrs = pts.map((p) => p.year);
  const minYr = Math.min(...yrs), maxYr = Math.max(...yrs);
  const padX = 8, yTop = 13, yBot = h - 5; // headroom up top for the hover label
  const X = (yr) => (maxYr === minYr ? w / 2 : ((yr - minYr) / (maxYr - minYr)) * (w - padX * 2) + padX);
  const Y = (r) => (maxR === minR ? (yTop + yBot) / 2 : ((r - minR) / (maxR - minR)) * (yBot - yTop) + yTop); // smaller rank = higher
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(p.year).toFixed(1)},${Y(p.rank).toFixed(1)}`).join(" ");
  const hp = hi != null ? pts[hi] : null;
  const lblX = hp ? Math.max(22, Math.min(w - 22, X(hp.year))) : 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", touchAction: "manipulation" }}
      onMouseLeave={() => setHi(null)}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {hp && <line x1={X(hp.year)} y1={yTop - 3} x2={X(hp.year)} y2={yBot + 2} stroke={color} strokeWidth="0.75" strokeDasharray="2 2" opacity="0.55" />}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.year)} cy={Y(p.rank)} r={hi === i ? 3.4 : 2.1} fill={color} />
          <rect x={X(p.year) - (w / pts.length) / 2} y={0} width={w / pts.length} height={h} fill="transparent"
            style={{ cursor: "pointer" }} onMouseEnter={() => setHi(i)}
            onClick={(e) => { e.stopPropagation(); setHi(i === hi ? null : i); }} />
        </g>
      ))}
      {hp && <text x={lblX} y={6} fontSize="9.5" fontWeight="700" fill={C.ink} textAnchor="middle">{
        mode === "pct" ? `${hp.year} · ≈${fmtPct(rankToPct(hp.rank, gender)) || "<0.01%"}` : `${hp.year} · ${approx ? "≈#" : "#"}${hp.rank}`
      }</text>}
    </svg>
  );
}
const capId = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const rankOf = (id, gender) => { const s = popSeries(id, gender); return s ? s[s.length - 1].rank : null; };
// Per-year series for the chart. For names with spelling variants, fold the variants
// in by year (rank→%→sum→back to an estimated rank) so it's ONE combined line.
function displaySeries(id, gender) {
  const base = popSeries(id, gender);
  if (!base) return null;
  const vinfo = VARIANTS[id] && VARIANTS[id][gender];
  if (!vinfo) return base;
  return base.map((pt) => {
    let sum = rankToPct(pt.rank, gender) || 0;
    vinfo.ids.forEach((vid) => {
      const vr = POP[vid] && POP[vid][gender] && POP[vid][gender][pt.year];
      sum += rankToPct(vr, gender) || 0;
    });
    return { year: pt.year, rank: sum > 0 ? approxRank(sum, gender) : null };
  });
}
// Everything PopLine needs: functional (spelling-merged) figure + breakdown pieces.
function funcPop(id, gender) {
  const raw = popSeries(id, gender);
  if (!raw) return null;
  const ownRank = raw[raw.length - 1].rank;
  const ownPct = pctOf(id, gender);
  const vinfo = VARIANTS[id] && VARIANTS[id][gender];
  const vids = vinfo ? vinfo.ids : [];
  const spell = [{ label: capId(id), rank: ownRank, pct: ownPct }]
    .concat(vids.map((v) => ({ label: capId(v), rank: rankOf(v, gender), pct: pctOf(v, gender) })));
  const funcPct = spell.reduce((s, c) => s + (c.pct || 0), 0) || null;
  const hasVar = vids.length > 0;
  const funcRank = hasVar ? approxRank(funcPct, gender) : ownRank;
  const nicks = ((COMBINE[id] && COMBINE[id][gender]) || []).map((lk) => {
    if (lk.ids) {
      const sum = lk.ids.reduce((s, v) => s + (pctOf(v, gender) || 0), 0) || null;
      return { label: lk.label, pct: sum, rank: approxRank(sum, gender), approx: true };
    }
    return { label: lk.label, pct: pctOf(lk.id, gender), rank: rankOf(lk.id, gender), approx: false };
  });
  return { series: displaySeries(id, gender), funcPct, funcRank, hasVar, spell, nicks, year: raw[raw.length - 1].year };
}
function fmtRank(rank, approx, compact) {
  if (rank == null) return compact ? "1000+" : "Outside top 1000";
  return (approx ? "≈#" : "#") + rank;
}
function PopLine({ id, gender, compact = false }) {
  const popMode = React.useContext(PopModeCtx);
  const [open, setOpen] = React.useState(false);
  const fp = funcPop(id, gender);
  if (!fp) return null;
  const tier = tierOf(fp.funcRank);
  const main = popMode === "pct"
    ? (fmtPct(fp.funcPct) || (fp.funcRank == null ? "<0.01%" : "n/a"))
    : (fp.funcRank == null ? (compact ? "1000+" : "Outside top 1000")
        : (fp.hasVar ? "≈#" : "US #") + fp.funcRank);
  const hasBreakdown = fp.hasVar || (compact && (fp.nicks.length > 0 || !!MEANING[id]));
  const cell = (r, p, approx) => popMode === "pct"
    ? (fmtPct(p) || (r == null ? "1000+" : "n/a"))
    : fmtRank(r, approx, true);
  return (
    <div style={{ marginTop: compact ? 2 : 6, width: compact ? "auto" : "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: compact ? "flex-start" : "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>
          {main}{!compact ? ` · ${fp.year}` : ""}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "1px 5px", borderRadius: 999, background: `${tier.color}1A`, color: tier.color }}>{tier.label}</span>
        {hasBreakdown && (
          <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            aria-label="Show breakdown" title="Show breakdown"
            style={{ fontSize: 9, fontWeight: 700, width: 15, height: 15, lineHeight: "13px", textAlign: "center", borderRadius: 999, border: `1px solid ${C.line}`, background: open ? C.line : "transparent", color: C.muted, cursor: "pointer", padding: 0 }}>i</button>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: compact ? "flex-start" : "center", marginTop: 3 }}>
        <Sparkline series={fp.series} w={compact ? 130 : 190} h={compact ? 34 : 44} color={C.sage} compact={compact} mode={popMode} gender={gender} approx={fp.hasVar} />
      </div>
      {open && hasBreakdown && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 5, padding: "7px 9px", borderRadius: 10, background: `${C.sage}12`, border: `1px solid ${C.line}`, fontSize: 10.5, color: C.ink, lineHeight: 1.5 }}>
          {compact && MEANING[id] && (
            <div style={{ marginBottom: (fp.hasVar || fp.nicks.length) ? 6 : 0, fontStyle: "italic" }}>{MEANING[id]}</div>
          )}
          {fp.hasVar && (
            <div style={{ marginBottom: (compact && fp.nicks.length) ? 6 : 0 }}>
              <div style={{ fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 9, marginBottom: 2 }}>Spelling → counts as one</div>
              {fp.spell.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{c.label}</span><span style={{ color: C.muted }}>{cell(c.rank, c.pct, false)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700, borderTop: `1px solid ${C.line}`, marginTop: 2, paddingTop: 2 }}>
                <span>Combined</span><span>{popMode === "pct" ? fmtPct(fp.funcPct) : fmtRank(fp.funcRank, true, true)}</span>
              </div>
            </div>
          )}
          {compact && fp.nicks.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 9, marginBottom: 2 }}>Everyday name</div>
              {fp.nicks.map((nk, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{nk.label}</span><span style={{ color: C.muted }}>{cell(nk.rank, nk.pct, nk.approx)}</span>
                </div>
              ))}
            </div>
          )}
          {(fp.hasVar || (compact && fp.nicks.length > 0)) && (
            <div style={{ marginTop: 5, fontSize: 9, color: C.muted, fontStyle: "italic" }}>≈ estimated from birth share · {fp.year} SSA data</div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- vote ----------------------------------- */
function NameCard({ n, gender, accent, onPick, onVeto, picked, dim, starred, onStar }) {
  const chosen = picked === n.id;
  const popMode = React.useContext(PopModeCtx);
  const fp = funcPop(n.id, gender);
  const popNicks = (fp ? fp.nicks : []).filter((nk) => nk.rank != null || nk.pct != null);
  return (
    <div role="button" tabIndex={picked ? -1 : 0} aria-label={`Pick ${n.name}`}
      onClick={() => !picked && onPick()}
      onKeyDown={(e) => { if (!picked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(); } }}
      className="lift" style={{
        flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-start", borderRadius:16, padding:"44px 16px 22px", textAlign:"center", position:"relative", background:C.paper,
        border:`2px solid ${chosen ? accent : C.line}`, minHeight:180,
        boxShadow: chosen ? `0 0 0 4px ${accent}22` : "0 2px 0 rgba(0,0,0,0.05)",
        opacity: dim ? 0.4 : 1, transform: chosen ? "translateY(-3px)" : "none", cursor: picked ? "default" : "pointer",
      }}>
      {onStar && (
        <button onClick={(e) => { e.stopPropagation(); onStar(); }} aria-label={starred ? `Unstar ${n.name}` : `Star ${n.name}`} title="Favorite"
          className="lift" style={{ position:"absolute", top:10, left:10, display:"flex", alignItems:"center", padding:"4px", borderRadius:999, color:C.ochre, opacity: starred ? 1 : 0.55 }}>
          <Ic n="star" s={17} c={C.ochre} fill={starred ? C.ochre : "none"} />
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); onVeto(); }} disabled={!!picked} aria-label={`Veto ${n.name}`}
        className="lift" style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:999, color:C.clay, background:C.bg, border:`1px solid ${C.line}` }}>
        <Ic n="ban" s={13} /> Veto
      </button>
      {/* Fixed-height slots so every parallel row lines up across both cards. */}
      <div style={{ minHeight:46, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span className="disp" style={{ fontSize:36, fontWeight:800, lineHeight:1.04, color:C.ink }}>{n.name}</span>
      </div>
      <div style={{ minHeight:24, marginTop:8, fontSize:17, fontWeight:600, color:C.ink }}>{n.nicks.length > 0 ? n.nicks.join(" · ") : ""}</div>
      <div style={{ minHeight:36, marginTop:6, fontSize:12.5, color:C.muted, fontStyle:"italic", lineHeight:1.4 }}>{MEANING[n.id] ? cleanMeaning(MEANING[n.id]) : ""}</div>
      <div style={{ minHeight:88, marginTop:6, display:"flex", justifyContent:"center" }}><PopLine id={n.id} gender={gender} /></div>
      <div style={{ minHeight:50, marginTop:8 }}>
        {popNicks.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:C.muted, marginBottom:5 }}>Goes by</div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
              {popNicks.map((nk, i) => {
                const fig = popMode === "pct" ? (fmtPct(nk.pct) || "") : (nk.rank == null ? "1000+" : (nk.approx ? "≈#" : "#") + nk.rank);
                return (
                  <span key={i} title="How common this nickname is on its own" style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}`, color:C.ink, lineHeight:1.4 }}>
                    {nk.label} <span style={{ color:C.muted, fontWeight:600 }}>{fig}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function Vote({ names, gender, pair, picked, onVote, onSkip, onVeto, starred, onStar, onBack, canGoBack, profile }) {
  const banner = (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
      <span className="disp" style={{ fontSize:14, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color: gColor(gender),
        padding:"6px 22px", borderRadius:999, background: gTint(gender), border:`1px solid ${C.line}` }}>{gLabel(gender)}</span>
    </div>
  );
  if (!pair) return (
    <div>
      {banner}
      <p style={{ fontSize:14, borderRadius:12, padding:"32px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
        Not enough names left to compare. Un-veto a few in Rankings, or add more names.
      </p>
    </div>
  );
  const [a, b] = pair;
  const na = findName(names, a), nb = findName(names, b);
  return (
    <div>
      {banner}
      <div className="cards">
        <NameCard n={na} gender={gender} accent={C.teal} picked={picked} dim={picked && picked !== a} onPick={() => onVote(a, b)} onVeto={() => onVeto(a)} starred={starred.includes(a)} onStar={() => onStar(a)} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span className="disp" style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:C.muted }}>vs</span>
        </div>
        <NameCard n={nb} gender={gender} accent={C.sage} picked={picked} dim={picked && picked !== b} onPick={() => onVote(b, a)} onVeto={() => onVeto(b)} starred={starred.includes(b)} onStar={() => onStar(b)} />
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:16, flexWrap:"wrap" }}>
        <button onClick={onBack} disabled={!canGoBack} className="lift" title="Revisit your last vote and change it"
          style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}`, color: canGoBack ? C.teal : C.line, cursor: canGoBack ? "pointer" : "default" }}>
          <Ic n="back" s={14} c={canGoBack ? C.teal : C.line} /> Go back
        </button>
        <button onClick={onSkip} disabled={!!picked} className="lift" style={{ fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:999, color:C.muted, border:`1px solid ${C.line}`, background:C.paper }}>Can’t decide, skip</button>
      </div>
    </div>
  );
}

/* ----------------------------- rankings ---------------------------------- */
function NoteBlock({ id, notes, profile, onSetNote }) {
  const otherKey = profile === "claire" ? "andrew" : "claire";
  const mine = (notes[id] && notes[id][profile]) || "";
  const theirs = (notes[id] && notes[id][otherKey]) || "";
  const [val, setVal] = useState(mine);
  const dirty = val.trim() !== mine;
  return (
    <div style={{ marginTop:8, padding:"8px 10px", borderRadius:10, background:`${C.sage}10`, border:`1px solid ${C.line}` }}>
      {theirs
        ? <div style={{ fontSize:12, color:C.ink, marginBottom:6, lineHeight:1.4 }}><b style={{ color:pColor(otherKey) }}>{PROFILES[otherKey]}:</b> {theirs}</div>
        : <div style={{ fontSize:11, color:C.muted, marginBottom:6, fontStyle:"italic" }}>{PROFILES[otherKey]} hasn’t added a note.</div>}
      <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={2}
        placeholder={`${PROFILES[profile]}’s note (only you can edit this)`}
        style={{ width:"100%", boxSizing:"border-box", fontSize:12, padding:"6px 8px", borderRadius:8, border:`1px solid ${C.line}`, background:C.bg, color:C.ink, resize:"vertical", fontFamily:"inherit" }} />
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <button onClick={() => onSetNote(id, val)} disabled={!dirty} className="lift" style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:999, background: dirty ? C.sage : C.line, color: dirty ? "#fff" : C.muted }}>Save</button>
        {mine && <button onClick={() => { setVal(""); onSetNote(id, ""); }} className="lift" style={{ fontSize:11, padding:"4px 10px", borderRadius:999, border:`1px solid ${C.line}`, color:C.clay }}>Delete mine</button>}
      </div>
    </div>
  );
}
function RankRow({ r, i, n, mode, gender, max, min, profile, cStar, aStar, onStar, notes, onSetNote }) {
  const [showNote, setShowNote] = useState(false);
  const pctW = max === min ? 50 : ((r.score - min) / (max - min)) * 100;
  const accent = rankColor(n > 1 ? i / (n - 1) : 0);
  const iStar = (profile === "claire" ? cStar : aStar).includes(r.n.id);
  const both = cStar.includes(r.n.id) && aStar.includes(r.n.id);
  const noteCount = notes[r.n.id] ? Object.keys(notes[r.n.id]).length : 0;
  return (
    <li style={{ borderRadius:12, padding:"10px 12px", background:C.paper, border:`1px solid ${both ? C.ochre : C.line}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span className="disp" style={{ width:24, textAlign:"center", fontSize:18, fontWeight:700, color: accent }}>{i + 1}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span className="disp" style={{ fontSize:18, fontWeight:700, color:C.ink }}>{r.n.name}</span>
            {r.n.custom && <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", color:C.sage }}>added</span>}
            {both && <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:999, background:`${C.ochre}1A`, color:C.ochre }}>★ both</span>}
            {mode === "combined" && r.c != null && (
              <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:999, background: r.split ? `${C.clay}1A` : C.line }}>
                {r.split && <span style={{ color:C.clay, fontWeight:700 }}>split · </span>}
                <span style={{ color:C.claire, fontWeight:700 }}>C#{r.c}</span>
                <span style={{ color:C.muted }}> · </span>
                <span style={{ color:C.andrew, fontWeight:700 }}>A#{r.a}</span>
              </span>
            )}
            <PopLine id={r.n.id} gender={gender} compact />
          </div>
          {r.n.nicks.length > 0 && <div style={{ fontSize:12, color:C.muted }}>{r.n.nicks.join(" · ")}</div>}
          <div style={{ height:6, borderRadius:999, marginTop:6, background:C.line }}>
            <div style={{ height:6, borderRadius:999, width:`${pctW}%`, background:accent }} />
          </div>
        </div>
        <button onClick={() => onStar(r.n.id)} className="lift" aria-label="Favorite" title="Favorite" style={{ display:"flex", padding:2, color:C.ochre, opacity: iStar ? 1 : 0.4 }}>
          <Ic n="star" s={18} c={C.ochre} fill={iStar ? C.ochre : "none"} />
        </button>
      </div>
      <button onClick={() => setShowNote((s) => !s)} className="lift" style={{ marginTop:6, fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:999, border:`1px solid ${C.line}`, background:"transparent", color: noteCount ? C.sage : C.muted }}>
        ✎ {showNote ? "hide note" : (noteCount ? `notes · ${noteCount}` : "add note")}
      </button>
      {showNote && <NoteBlock id={r.n.id} notes={notes} profile={profile} onSetNote={onSetNote} />}
    </li>
  );
}
function Rankings({ data, profile, onUnveto, onStar, onRemove, onRestore, notes, onSetNote }) {
  const [mode, setMode] = useState("combined");
  return (
    <div>
      <div style={{ display:"flex", gap:4, marginBottom:14, padding:4, borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
        {[["combined","Combined"],["claire","Claire"],["andrew","Andrew"]].map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} className="lift" style={{ flex:1, padding:"7px 0", borderRadius:8, fontSize:14, fontWeight:700,
            ...(mode === k ? { background: k === "claire" ? C.claire : k === "andrew" ? C.andrew : C.teal, color:"#fff" } : { color:C.muted }) }}>{label}</button>
        ))}
      </div>
      <div className="twocol">
        <GenderRankColumn gender="girl" title="Girls" mode={mode} data={data} profile={profile} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onStar={onStar} />
        <GenderRankColumn gender="boy" title="Boys" mode={mode} data={data} profile={profile} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onStar={onStar} />
      </div>
      <ManageNames data={data} onRemove={onRemove} onRestore={onRestore} />
    </div>
  );
}
function GenderRankColumn({ gender, title, mode, data, profile, notes, onSetNote, onUnveto, onStar }) {
  notes = notes || {};
  const names = namesFor(gender, data.custom, data.removed);
  const cR = data[gender].claire.ratings, aR = data[gender].andrew.ratings;
  const cVeto = data[gender].claire.vetoed, aVeto = data[gender].andrew.vetoed;
  const cStar = data[gender].claire.starred || [], aStar = data[gender].andrew.starred || [];
  const cRank = ranksOf(cR, names), aRank = ranksOf(aR, names);
  const splitGap = Math.ceil(names.length / 3);
  const isVetoed = (id) => mode === "combined" ? (cVeto.includes(id) || aVeto.includes(id)) : (mode === "claire" ? cVeto : aVeto).includes(id);

  const cVotes = data[gender].claire.votes, aVotes = data[gender].andrew.votes;
  const cVoted = cVotes > 0, aVoted = aVotes > 0;
  // A profile that hasn't voted sits at START for every name — that's not a real
  // opinion, so don't blend it in. Only combine the two once BOTH have voted.
  const combineBoth = cVoted && aVoted;

  let rows;
  if (mode === "combined") {
    if (combineBoth) {
      rows = names.map((n) => {
        const avg = ((cR[n.id] ?? START) + (aR[n.id] ?? START)) / 2;
        const split = Math.abs(cRank[n.id] - aRank[n.id]) >= splitGap;
        return { n, score: avg, c: cRank[n.id], a: aRank[n.id], split };
      });
    } else {
      // Only one has voted — show their ratings alone, no C#/A# split badge
      // (the other has no real ranking yet).
      const soloR = cVoted ? cR : aR;
      rows = names.map((n) => ({ n, score: soloR[n.id] ?? START }));
    }
  } else {
    const R = mode === "claire" ? cR : aR;
    rows = names.map((n) => ({ n, score: R[n.id] ?? START }));
  }
  const live = rows.filter((r) => !isVetoed(r.n.id)).sort((x, y) => y.score - x.score);
  const dead = rows.filter((r) => isVetoed(r.n.id));
  const max = Math.max(...live.map((r) => r.score), START + 1);
  const min = Math.min(...live.map((r) => r.score), START - 1);
  // No real ranking to show until the relevant person/people have voted.
  const noData = mode === "combined" ? (!cVoted && !aVoted) : (mode === "claire" ? !cVoted : !aVoted);
  const emptyMsg = mode === "combined"
    ? "Neither of you has voted yet. Head to the Vote tab to start ranking."
    : `${mode === "claire" ? "Claire" : "Andrew"} hasn’t voted yet. Go to the Vote tab (as ${mode === "claire" ? "Claire" : "Andrew"}) to start ranking.`;
  const vetoLabel = (id) => { const w = []; if (cVeto.includes(id)) w.push("Claire"); if (aVeto.includes(id)) w.push("Andrew"); return w.join(" & "); };

  // agreement / disagreement summary for the combined view
  const bothVoted = cVotes > 0 && aVotes > 0;
  const pool = names.filter((n) => !cVeto.includes(n.id) && !aVeto.includes(n.id));
  const Np = pool.length;
  const scored = pool.map((n) => ({ n, c: cRank[n.id], a: aRank[n.id], gap: Math.abs(cRank[n.id] - aRank[n.id]), avg: (cRank[n.id] + aRank[n.id]) / 2 }));
  const agree = scored.filter((x) => x.avg <= Np / 2).sort((p, q) => p.gap - q.gap || p.avg - q.avg).slice(0, 3);
  const clash = [...scored].sort((p, q) => q.gap - p.gap).filter((x) => x.gap >= splitGap).slice(0, 3);

  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${gColor(gender)}` }}>
        <h3 className="disp" style={{ margin:0, fontSize:20, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:gColor(gender) }}>{title}</h3>
      </div>
      {noData ? (
        <div style={{ borderRadius:12, padding:"40px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
          <p style={{ fontSize:14, margin:0 }}>{emptyMsg}</p>
        </div>
      ) : (<>
      {mode === "combined" && bothVoted && (agree.length > 0 || clash.length > 0) && (
        <div style={{ marginBottom:12, borderRadius:12, padding:"10px 12px", background:C.paper, border:`1px solid ${C.line}` }}>
          {agree.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom: clash.length ? 8 : 0 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.sage, textTransform:"uppercase", letterSpacing:"0.04em", display:"inline-flex", alignItems:"center", gap:4 }}><Ic n="check" s={12} c={C.sage} /> You both love</span>
              {agree.map((x) => <span key={x.n.id} style={{ fontSize:12, fontWeight:700, padding:"2px 9px", borderRadius:999, background:`${C.sage}1A`, color:C.sage }}>{x.n.name}</span>)}
            </div>
          )}
          {clash.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.clay, textTransform:"uppercase", letterSpacing:"0.04em" }}>↔ You’re split on</span>
              {clash.map((x) => <span key={x.n.id} style={{ fontSize:12, fontWeight:700, padding:"2px 9px", borderRadius:999, background:`${C.clay}1A`, color:C.clay }}>{x.n.name} <span style={{ fontWeight:700 }}><span style={{ color:C.claire }}>C#{x.c}</span>·<span style={{ color:C.andrew }}>A#{x.a}</span></span></span>)}
            </div>
          )}
        </div>
      )}
      <p style={{ fontSize:12, marginBottom:12, color:C.muted }}>
        {mode === "combined"
          ? (combineBoth
              ? `Average of both ratings. Claire: ${cVotes} votes · Andrew: ${aVotes} votes. ★ both = you’ve both starred it.`
              : `Only ${cVoted ? "Claire" : "Andrew"} has voted so far. Showing their ratings alone; the combined ranking appears once you’ve both voted.`)
          : `${mode === "claire" ? "Claire" : "Andrew"}’s ratings · ${mode === "claire" ? cVotes : aVotes} votes cast.`}
      </p>
      <ol style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {live.map((r, i) => (
          <RankRow key={r.n.id} r={r} i={i} n={live.length} mode={mode} gender={gender} max={max} min={min}
            profile={profile} cStar={cStar} aStar={aStar} onStar={(id) => onStar(gender, id)} notes={notes} onSetNote={onSetNote} />
        ))}
      </ol>
      {dead.length > 0 && (
        <div style={{ marginTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, color:C.clay }}>
            <Ic n="ban" s={12} /> Vetoed
          </div>
          <ul style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {dead.map((r) => (
              <li key={r.n.id} style={{ borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:12, background:C.paper, border:`1px dashed ${C.line}`, opacity:0.85 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <span className="disp" style={{ fontSize:16, fontWeight:700, color:C.muted, textDecoration:"line-through" }}>{r.n.name}</span>
                  <span style={{ fontSize:10, marginLeft:8, color:C.clay }}>vetoed by {vetoLabel(r.n.id)}</span>
                </div>
                {mode !== "combined" && (
                  <button onClick={() => onUnveto(gender, mode, r.n.id)} className="lift" style={{ fontSize:12, padding:"4px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.sage }}>restore</button>
                )}
              </li>
            ))}
          </ul>
          {mode === "combined" && <p style={{ fontSize:11, marginTop:8, color:C.muted }}>Switch to Claire or Andrew to restore a vetoed name.</p>}
        </div>
      )}
      </>)}
    </div>
  );
}

/* --------------------------- manage names -------------------------------- */
function ManageNames({ data, onRemove, onRestore }) {
  const [open, setOpen] = useState(false);
  const { custom, removed } = data;
  const sortByName = (a, b) => a.name.localeCompare(b.name);
  const allById = {};
  ["boy", "girl"].forEach((g) => NAMES[g].forEach((n) => { allById[n.id] = n.name; }));
  (custom || []).forEach((c) => { allById[c.id] = c.name; });
  const removedList = (removed || []).map((id) => ({ id, name: allById[id] || id }));
  const Col = ({ title, gender }) => {
    const list = [...namesFor(gender, custom, removed)].sort(sortByName);
    return (
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8 }}>
          <h4 className="disp" style={{ margin:0, fontSize:15, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:gColor(gender) }}>{title}</h4>
          <span style={{ fontSize:12, color:C.muted }}>{list.length}</span>
        </div>
        <ul style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {list.map((n) => (
            <li key={n.id} style={{ display:"flex", alignItems:"center", gap:6, borderRadius:999, padding:"4px 6px 4px 12px", background:C.paper, border:`1px solid ${C.line}` }}>
              <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{n.name}</span>
              {n.custom && <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.06em", color:C.sage }}>added</span>}
              <button onClick={() => onRemove(n.id)} className="lift" aria-label={`Remove ${n.name}`} title="Remove from app"
                style={{ display:"flex", alignItems:"center", padding:2, borderRadius:999, color:C.muted }}>
                <Ic n="x" s={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <div style={{ marginTop:26, borderTop:`1px solid ${C.line}`, paddingTop:16 }}>
      <button onClick={() => setOpen((o) => !o)} className="lift"
        style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:C.muted }}>
        <Ic n="list" s={15} /> Manage names {open ? "▾" : "▸"}
      </button>
      {open && (
        <div style={{ marginTop:12 }}>
          <p style={{ fontSize:12, marginBottom:12, color:C.muted }}>Remove a name for both of you, or restore one you removed. Add new names with the “+ Add name” button up top.</p>
          <div className="twocol"><Col title="Girls" gender="girl" /><Col title="Boys" gender="boy" /></div>
          {removedList.length > 0 && (
            <div style={{ marginTop:18 }}>
              <h4 className="disp" style={{ margin:"0 0 8px", fontSize:13, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:C.muted }}>Removed · {removedList.length}</h4>
              <ul style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {removedList.map((r) => (
                  <li key={r.id} style={{ display:"flex", alignItems:"center", gap:8, borderRadius:999, padding:"4px 6px 4px 12px", background:C.paper, border:`1px dashed ${C.line}` }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.muted, textDecoration:"line-through" }}>{r.name}</span>
                    <button onClick={() => onRestore(r.id)} className="lift" style={{ fontSize:11, padding:"3px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.sage }}>restore</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- trends ---------------------------------- */
const LINE_COLORS = ["#2E4756","#C9821A","#566B36","#B5677B","#5B7493","#A4663A","#7A5BA6","#3A6EA5"];
function TrendChart({ lines, xUnit = "votes" }) {
  const W = 600, H = 240, padL = 14, padR = 12, padT = 12, padB = 26;
  const allPts = lines.flatMap((l) => l.points);
  if (!allPts.length) return null;
  const xsAll = allPts.map((p) => p.x), ysAll = allPts.map((p) => p.y);
  const maxX = Math.max(...xsAll, 1);
  let minY = Math.min(...ysAll, START), maxY = Math.max(...ysAll, START);
  if (minY === maxY) { minY -= 20; maxY += 20; } else { const p = (maxY - minY) * 0.12; minY -= p; maxY += p; }
  const X = (v) => padL + (v / maxX) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - minY) / (maxY - minY)) * (H - padT - padB);
  const yticks = []; for (let i = 0; i <= 4; i++) yticks.push(minY + (maxY - minY) * i / 4);
  const uniqX = Array.from(new Set(xsAll)).sort((a, b) => a - b);
  const [hx, setHx] = useState(null);
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (W / r.width);
    let best = uniqX[0], bd = Infinity;
    uniqX.forEach((xv) => { const d = Math.abs(X(xv) - lx); if (d < bd) { bd = d; best = xv; } });
    setHx(best);
  };
  const valAt = (l, xv) => {
    let chosen = null;
    l.points.forEach((p) => { if (p.x <= xv && (!chosen || p.x > chosen.x)) chosen = p; });
    return chosen ? chosen.y : (l.points[0] ? l.points[0].y : null);
  };
  return (
    <div ref={ref} style={{ position:"relative", borderRadius:12, padding:8, background:C.paper, border:`1px solid ${C.line}` }}
      onMouseMove={onMove} onMouseLeave={() => setHx(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
        {yticks.map((t, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={Y(t)} y2={Y(t)} stroke={C.line} strokeDasharray="3 3" />
        ))}
        <text x={padL} y={H - 6} fontSize="10" fill={C.muted}>0</text>
        <text x={W - padR} y={H - 6} fontSize="10" fill={C.muted} textAnchor="end">{maxX} {xUnit}</text>
        {hx != null && <line x1={X(hx)} x2={X(hx)} y1={padT} y2={H - padB} stroke={C.clay} strokeWidth="1" opacity="0.5" />}
        {lines.map((l) => (
          <polyline key={l.id} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={l.dash ? "6 4" : undefined}
            points={l.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} />
        ))}
        {hx != null && lines.map((l) => {
          const v = valAt(l, hx); return v == null ? null : <circle key={l.id} cx={X(hx)} cy={Y(v)} r="3" fill={l.color} />;
        })}
      </svg>
      {hx != null && (
        <div style={{ position:"absolute", top:8, left:48, background:C.bg, border:`1px solid ${C.line}`, borderRadius:8, padding:"6px 8px", fontSize:11, pointerEvents:"none" }}>
          <div style={{ color:C.muted, marginBottom:2 }}>after {hx} {xUnit} · highest first</div>
          {[...lines].sort((a, b) => (valAt(b, hx) ?? 0) - (valAt(a, hx) ?? 0)).map((l) => (
            <div key={l.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:999, background:l.color }} />
              <span style={{ color:C.ink }}>{l.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const trendEmpty = (msg) => (
  <div style={{ borderRadius:12, padding:"40px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
    <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}><Ic n="trend" s={26} c={C.line} /></div>
    <p style={{ fontSize:14, margin:0 }}>{msg}</p>
  </div>
);
function ByNameTrends({ pg, names, profileName }) {
  const ranked = [...names].sort((a, b) => (pg.ratings[b.id] ?? START) - (pg.ratings[a.id] ?? START));
  // Default to every name still in play (not vetoed) so all trend lines show.
  const [sel, setSel] = useState(() => ranked.filter((n) => !(pg.vetoed || []).includes(n.id)).map((n) => n.id));
  if (!pg.history || pg.history.length < 2) return trendEmpty(`Cast a few votes as ${profileName} to start a trend line.`);
  const lines = sel.map((id, i) => ({
    id, name: findName(names, id).name, color: LINE_COLORS[i % LINE_COLORS.length],
    points: [{ x: 0, y: START }, ...pg.history.map((h) => ({ x: h.m, y: h.r[id] ?? START }))],
  }));
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <div>
      <p style={{ fontSize:12, marginBottom:8, color:C.muted }}>{profileName}’s rating over {pg.votes} votes. Tap names to add or remove lines.</p>
      <TrendChart lines={lines} />
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
        {ranked.map((n) => {
          const on = sel.includes(n.id); const ci = sel.indexOf(n.id);
          return (
            <button key={n.id} onClick={() => toggle(n.id)} className="lift" style={{ fontSize:12, padding:"4px 10px", borderRadius:999, fontWeight:600,
              ...(on ? { background: LINE_COLORS[ci % LINE_COLORS.length], color:"#fff" } : { background:C.paper, color:C.muted, border:`1px solid ${C.line}` }) }}>{n.name}</button>
          );
        })}
      </div>
    </div>
  );
}
function CompareTrends({ data, gender, names }) {
  const cD = data[gender].claire, aD = data[gender].andrew;
  const ranked = [...names].sort((a, b) =>
    ((cD.ratings[b.id] ?? START) + (aD.ratings[b.id] ?? START)) - ((cD.ratings[a.id] ?? START) + (aD.ratings[a.id] ?? START)));
  const [pick, setPick] = useState(() => (ranked[0] ? ranked[0].id : null));
  if (!cD.votes && !aD.votes) return trendEmpty("Vote as both Claire and Andrew to compare your trends for a name.");
  const id = pick && names.some((n) => n.id === pick) ? pick : ranked[0].id;
  const lineFor = (pg) => [{ x: 0, y: START }, ...pg.history.map((h) => ({ x: h.m, y: h.r[id] ?? START }))];
  const lines = [];
  if (cD.history.length) lines.push({ id: "claire", name: "Claire", color: C.claire, points: lineFor(cD) });
  if (aD.history.length) lines.push({ id: "andrew", name: "Andrew", color: C.andrew, dash: true, points: lineFor(aD) });
  return (
    <div>
      <p style={{ fontSize:12, marginBottom:8, color:C.muted }}>
        Rating for <b style={{ color:C.ink }}>{findName(names, id).name}</b> · Claire (solid) vs Andrew (dashed). Pick a name below.
      </p>
      <TrendChart lines={lines} />
      <div style={{ display:"flex", gap:14, marginTop:8, fontSize:11, color:C.muted }}>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:18, height:0, borderTop:`2px solid ${C.claire}` }} /> Claire</span>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:18, height:0, borderTop:`2px dashed ${C.andrew}` }} /> Andrew</span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
        {ranked.map((n) => (
          <button key={n.id} onClick={() => setPick(n.id)} className="lift" style={{ fontSize:12, padding:"4px 10px", borderRadius:999, fontWeight:600,
            ...(n.id === id ? { background: C.sage, color:"#fff" } : { background:C.paper, color:C.muted, border:`1px solid ${C.line}` }) }}>{n.name}</button>
        ))}
      </div>
    </div>
  );
}
function Trends({ data, profile }) {
  const [mode, setMode] = useState("byName");
  const [g, setG] = useState("girl");
  const names = namesFor(g, data.custom, data.removed);
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <Seg items={[["girl","Girls"],["boy","Boys"]]} value={g} onChange={setG} active={gColor} />
        <Seg items={[["byName", "By name"], ["compare", "Compare us"]]} value={mode} onChange={setMode} />
      </div>
      {mode === "byName"
        ? <ByNameTrends pg={data[g][profile]} names={names} profileName={PROFILES[profile]} />
        : <CompareTrends data={data} gender={g} names={names} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
