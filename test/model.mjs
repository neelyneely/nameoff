/* Model tests for Name·Off.
 *
 * No test framework on purpose: the app is one browser-global file with no
 * exports, so rather than importing anything we compile src/app.jsx the way
 * build.mjs does and run it in a vm with a stubbed React. That puts every
 * module-scope table and helper (FEAT, namesFor, suggestNames, endOf, ...) in
 * reach, which is where the logic worth testing lives.
 *
 *   npm test
 */
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const js = execFileSync("npx", ["esbuild", "src/app.jsx", "--loader:.jsx=jsx", "--jsx=transform"],
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

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`);
};
const ge = (label, got, min) => {
  const ok = got >= min; ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label} (${got} >= ${min})`);
};
const group = (t) => console.log(`\n— ${t}`);

group("nicknames, spellings and voter colors");
const nicksOf = (g, id) => run(`namesFor(${JSON.stringify(g)}, [], []).find(n => n.id === ${JSON.stringify(id)}).nicks`);
const setOverlays = (a, h) => run(`ADDED_NICKS = ${JSON.stringify(a)}; HIDDEN_NICKS = ${JSON.stringify(h)};`);

// --- baseline -------------------------------------------------------------
setOverlays({}, {});
eq("shipped nicks unchanged", nicksOf("boy", "finnegan"), ["Finn", "Finny"]);

// --- hiding a SHIPPED nickname (the thing that was impossible before) ------
setOverlays({}, { "boy:finnegan": ["Finn"] });
eq("shipped nick can be hidden", nicksOf("boy", "finnegan"), ["Finny"]);

// --- hide is per gender: a unisex name keeps the other sex's list ----------
setOverlays({}, { "girl:shae": ["Shay"] });
eq("hide is gendered (girl)", nicksOf("girl", "shae"), []);
eq("hide is gendered (boy)",  nicksOf("boy",  "shae"), ["Shay"]);

// --- rename = hide + add --------------------------------------------------
setOverlays({ "girl:bridget": ["Birdy"] }, { "girl:bridget": ["Birdie"] });
eq("renamed shipped nick", nicksOf("girl", "bridget"), ["Jett", "Bridie", "Birdy"]);

// --- legacy gender-agnostic hide key still applies ------------------------
setOverlays({}, { sloane: ["Lo"] });
eq("legacy hide key", nicksOf("girl", "sloane"), ["Sloey", "Loey"]);

// --- baseNicksOf resolves all three sources ------------------------------
eq("baseNicksOf: roster", run(`baseNicksOf("girl","bridget",[])`), ["Birdie", "Jett", "Bridie"]);
eq("baseNicksOf: custom", run(`baseNicksOf("girl","zzz",[{id:"zzz",nicks:["Z"]}])`), ["Z"]);
eq("baseNicksOf: candidate has some", run(`baseNicksOf("girl","saoirse",[]).length > 0`), true);
eq("baseNicksOf: unknown", run(`baseNicksOf("girl","nope",[])`), []);

// --- spelling override still drives the display name ---------------------
setOverlays({}, {});
run(`applySpellings({ finnegan: "Finegan" })`);
eq("rename shows new spelling", run(`namesFor("boy",[],[]).find(n=>n.id==="finnegan").name`), "Finegan");
eq("rename keeps the id (votes survive)", run(`namesFor("boy",[],[]).some(n=>n.id==="finnegan")`), true);
run(`applySpellings({})`);
eq("revert restores the shipped spelling", run(`namesFor("boy",[],[]).find(n=>n.id==="finnegan").name`), "Finnegan");

// --- guest colors ---------------------------------------------------------
const keys = ["haley", "meg", "dad", "sam", "jo", "kate", "pat", "rob"];
// colors are handed out from the assembled roster, so build one the way the app does
run(`assemble({ profiles: ${JSON.stringify(keys.map((k) => ({ key: k, name: k })))} })`);
const cols = keys.map((k) => run(`pColor(${JSON.stringify(k)})`));
eq("every guest gets a distinct color", new Set(cols).size, keys.length);
eq("guest color is stable", run(`pColor("haley")`), run(`pColor("haley")`));
eq("unknown key still gets a color", typeof run(`pColor("ghost")`), "string");
eq("owners keep their own colors", [run(`pColor("claire")`), run(`pColor("andrew")`)], ["#C9821A", "#3F6CA3"]);
eq("no guest collides with an owner", cols.filter(c => c === "#C9821A" || c === "#3F6CA3").length, 0);

group("names you already love");
// --- derivation accuracy against every curated row ------------------------
const acc = run(`(()=>{
  const nameOf = Object.assign({}, CAND_NAME, Object.fromEntries([...NAMES.boy,...NAMES.girl].map(n=>[n.id,n.name])));
  let eOK=0,eN=0,sOK=0,sN=0,sNear=0;
  for (const [id,f] of Object.entries(FEAT)) {
    const nm = nameOf[id] || id;
    if (f.end){ eN++; if (endOf(nm)===f.end) eOK++; }
    if (f.syl){ sN++; const g=sylOf(nm); if(g===f.syl) sOK++; else if(Math.abs(g-f.syl)===1) sNear++; }
  }
  return {end:eOK/eN, syl:sOK/sN, sylNear:(sOK+sNear)/sN, n:eN};
})()`);
console.log(`   [dictionary: ${acc.n} curated rows]`);
ge("endOf matches curated ending", +(acc.end*100).toFixed(1), 99);
ge("sylOf exact", +(acc.syl*100).toFixed(1), 87);
ge("sylOf within one", +(acc.sylNear*100).toFixed(1), 99.9);

// --- resolution + derived vectors ----------------------------------------
eq("known name resolves", run(`!!FEAT[slug("Matilda")]`), true);
eq("unknown name does not", run(`!!FEAT[slug("Zephyr")]`), false);
eq("derived vector for an unknown", run(`JSON.stringify(derivedFeat("Zephyr","girl",["nat","lyr"]))`),
   JSON.stringify({end:"r",syl:2,s:["nat","lyr"],lean:"g"}));
eq("accents/punctuation survive", run(`endOf("Brontë")`), "e");
eq("syllables: Wren", run(`sylOf("Wren")`), 1);
eq("syllables: Juniper", run(`sylOf("Juniper")`), 3);

// --- the behavioural test: do likes actually move the feed? ---------------
// Target a tag the cold-start PRIOR does NOT reward ("lit" and "pun" are absent
// from it), otherwise the baseline is already saturated and nothing can be shown.
const shareOf = (likes, tag) => run(`(()=>{
  const d = assemble({});
  d.girl.claire.likes = ${JSON.stringify(likes)};
  const out = suggestNames(d,"claire","girl").slice(0,10);
  return { share: out.filter(x => x.f.s.includes(${JSON.stringify(tag)})).length / out.length,
           ids: out.map(x=>x.c.id), names: out.map(x=>x.c.name) };
})()`);

for (const tag of ["lit", "pun"]) {
  // five resolvable girls' names carrying that tag, chosen from the table itself
  const picks = run(`(()=>{
    const pool = [...CAND.girl, ...CAND.unisex].filter(c => FEAT[c.id] && FEAT[c.id].s.includes(${JSON.stringify(tag)}));
    return pool.slice(0, 5).map(c => c.id);
  })()`);
  const likes = Object.fromEntries(picks.map(id => [id, { n: id, t: 1 }]));
  const before = shareOf({}, tag), after = shareOf(likes, tag);
  console.log(`   ["${tag}" share of top 10 — before ${(before.share*100).toFixed(0)}%, after ${(after.share*100).toFixed(0)}%]`);
  ge(`liking "${tag}" names raises their share`, Math.round(after.share*100), Math.round(before.share*100) + 10);
  eq(`liked "${tag}" names are never suggested back`, picks.some(id => after.ids.includes(id)), false);
}

const base = shareOf({}, "lit");
const tagged = shareOf({ zephyr:{n:"Zephyr",t:1,f:{end:"r",syl:2,s:["nat","lyr"],lean:"g"}},
                         xanthe:{n:"Xanthe",t:1,f:{end:"e",syl:2,s:["nat","lyr"],lean:"g"}} }, "lit");
eq("a tagged unknown name also moves the feed", tagged.ids.join()!==base.ids.join(), true);

// --- back-compat ----------------------------------------------------------
eq("profile saved before this change still loads", run(`(()=>{
  const d = assemble({"girl:claire":{ratings:{},matches:{},votes:3}});
  return JSON.stringify(d.girl.claire.likes)==="{}" && suggestNames(d,"claire","girl").length>0;
})()`), true);

group("taste comparison");

// A profile with real signal. Note WHERE the signal has to go: tasteProfile
// trains on the roster (~24 names) and on `explore` tallies — the mash-up
// reactions — so a realistic profile is mostly explore, which is exactly what
// the live store looks like (Claire: 151 votes, 658 tunes).
run(`globalThis.TD = (() => {
  const d = assemble({});
  const pg = d.girl.claire;
  [...CAND.girl, ...CAND.unisex].slice(0, 120).forEach((c, i) => {
    // mash-ups hand out one winner and one loser, so the tallies skew negative
    pg.explore[c.id] = { s: (i % 3 === 0) ? 1.0 : -0.6, n: 2 };
  });
  namesFor("girl", [], []).slice(0, 3).forEach((n) => pg.vetoed.push(n.id));
  pg.votes = 60;
  return d;
})()`);

eq("tasteProfile returns a count alongside each weight", run(`(()=>{
  const t = tasteProfile(TD, "claire", "girl");
  const k = Object.keys(t)[0];
  return typeof t[k].v === "number" && typeof t[k].n === "number";
})()`), true);

eq("normalise drops the 2- and 3-bucket kinds that always land on ±1", run(`(()=>{
  const n = normaliseTaste(tasteProfile(TD, "claire", "girl"));
  return Object.keys(n).some(k => k.startsWith("nick:") || k.startsWith("lean:"));
})()`), false);

eq("normalise drops features under the sample floor", run(`(()=>{
  const raw = tasteProfile(TD, "claire", "girl");
  const n = normaliseTaste(raw);
  return Object.keys(n).every(k => raw[k].n >= TASTE_MIN_N);
})()`), true);

// The bug this whole design exists to avoid: raw weights are nearly all negative,
// so "what do you both like" reads as empty if you compare them directly.
eq("raw weights are mostly negative (why they're never shown)", run(`(()=>{
  const t = tasteProfile(TD, "claire", "girl");
  const vals = Object.values(t).map(x => x.v);
  return vals.filter(v => v < 0).length > vals.length / 2;
})()`), true);
eq("...but normalised ones straddle zero", run(`(()=>{
  const n = Object.values(normaliseTaste(tasteProfile(TD, "claire", "girl")));
  return n.some(v => v > 0) && n.some(v => v < 0);
})()`), true);

eq("a voter with almost nothing yields too little to compare", run(`(()=>{
  const d = assemble({});
  d.girl.claire.votes = 1;
  return Object.keys(normaliseTaste(tasteProfile(d, "claire", "girl"))).length < TASTE_MIN_BUCKETS;
})()`), true);

eq("sideMembers resolves the group sides", run(`(()=>{
  const d = assemble({});
  d.girl.claire.votes = 3; d.girl.andrew.votes = 3;
  return JSON.stringify(sideMembers(d, "girl", "us")) === '["claire","andrew"]'
      && JSON.stringify(sideMembers(d, "girl", "haley")) === '["haley"]';
})()`), true);

eq("labels read as words, not feature keys", run(`JSON.stringify([tasteLabel("s:vin"), tasteLabel("o:ir"), tasteLabel("end:a"), tasteLabel("syl:1")])`),
   JSON.stringify(["vintage", "Irish", "ends in -a", "1 syllable"]));

group("recommender responds to the person, not just to having been reacted to");

// A heavy tuner is the case that was broken: with hundreds of tallies, the
// DIRECT own-tally term outranked the whole taste model, so the list could only
// ever hand back names you'd already seen in the tuner. Names never reacted to
// must still be able to reach the list.
run(`globalThis.HEAVY = (() => {
  const d = assemble({});
  const pg = d.girl.claire;
  pg.votes = 150;
  [...CAND.girl, ...CAND.unisex].filter(c => FEAT[c.id]).slice(0, 400).forEach((c, i) => {
    pg.explore[c.id] = { s: (i % 3 === 0) ? 1.4 : -0.6, n: 2 };
  });
  return d;
})()`);

const untunedInTop = run(`(()=>{
  const ex = HEAVY.girl.claire.explore;
  return suggestNames(HEAVY, "claire", "girl").slice(0, 12).filter(x => !ex[x.c.id]).length;
})()`);
console.log(`   [untuned names in the top 12: ${untunedInTop}]`);
ge("a name you never tuned can still be suggested", untunedInTop, 2);

// The z-scoring is the fix. Raw weights land within a whisker of each other at
// the top of the pool — less than one mash-up win is worth — so scoring on them
// makes the ranking "did you react to this", not "does this fit you".
const spreads = run(`(()=>{
  const acc = tasteProfile(HEAVY, "claire", "girl");
  const raw = Object.values(acc).map(a => a.v);
  const z = Object.values(zScoreTaste(acc, RANK_KINDS, TASTE_MIN_N, RANK_MIN_BUCKETS));
  const sp = (v) => Math.max(...v) - Math.min(...v);
  return { raw: sp(raw), z: sp(z) };
})()`);
console.log(`   [feature spread — raw ${spreads.raw.toFixed(2)}, z-scored ${spreads.z.toFixed(2)}]`);
ge("z-scoring separates features the raw weights left flat", +(spreads.z / spreads.raw).toFixed(2), 1.5);

// Tunes are evidence. Someone who only ever uses the tuner used to keep the
// app's generic cold-start taste at full strength no matter how much they taught it.
const alphaOf = (votes, tunes) => run(`(()=>{
  const d = assemble({}); const pg = d.girl.claire; pg.votes = ${votes};
  [...CAND.girl].slice(0, ${tunes}).forEach((c) => { pg.explore[c.id] = { s: 1.0, n: 1 }; });
  const ex = pg.explore;
  const n = Object.values(ex).reduce((a, e) => a + (e.n || 0), 0);
  return Math.max(0, Math.min(1, 1 - ((pg.votes||0) + TUNE_AS_VOTES * n) / 15));
})()`);
eq("no evidence at all leaves the prior at full strength", alphaOf(0, 0), 1);
eq("tuning alone retires the cold-start prior", alphaOf(0, 40), 0);
eq("a light tuner is still partly on the prior", alphaOf(0, 4) > 0 && alphaOf(0, 4) < 1, true);

// Cold start must not move: with no evidence the prior IS the score, so the
// rescale that put it in the same units as the z-scores can't reorder it.
eq("cold start ranks exactly as it did before", run(`JSON.stringify({
  girl: suggestNames(assemble({}), "claire", "girl").slice(0, 12).map(x => x.c.id),
  boy:  suggestNames(assemble({}), "claire", "boy").slice(0, 12).map(x => x.c.id),
})`), JSON.stringify({
  girl: ["ellison","bellamy","larkin","remy","romilly","emeri","avelyn","carey","tegan","finley","cassidy","waverly"],
  boy:  ["ellison","cassidy","bellamy","carey","larkin","tiernan","grayden","treyton","rustin","jagger","dempsey","conley"],
}));

group("a tune teaches the list(s) the name actually belongs to");

// The tuner alternates boy/girl on its own, so routing every reaction into the
// gender on screen sent half of someone's tuning to the list they weren't reading.
eq("a unisex name tuned on the boys side also teaches the girls side", run(`(()=>{
  const u = CAND.unisex.find(c => FEAT[c.id] && FEAT[c.id].lean === "u");
  return JSON.stringify(tuneGenders(u.id, "boy").sort());
})()`), JSON.stringify(["boy", "girl"]));

eq("a girls-only name tuned on the girls side stays there", run(`(()=>{
  const c = CAND.girl.find(x => FEAT[x.id] && FEAT[x.id].lean === "g");
  return JSON.stringify(tuneGenders(c.id, "girl"));
})()`), JSON.stringify(["girl"]));

eq("a name we have no row for teaches both", run(`JSON.stringify(tuneGenders("qqzzxx", "girl").sort())`),
   JSON.stringify(["boy", "girl"]));

eq("the reaction always lands on the gender it was made under", run(`(()=>{
  const c = CAND.boy.find(x => FEAT[x.id] && FEAT[x.id].lean === "b");
  return tuneGenders(c.id, "girl").includes("girl");
})()`), true);

group("every suggestion says why it is there");

const whys = run(`(()=>{
  const out = suggestNames(HEAVY, "claire", "girl").slice(0, 12);
  return { all: out.every(x => Array.isArray(x.why) && x.why.length > 0),
           flat: out.flatMap(x => x.why),
           sample: out[0].why };
})()`);
console.log(`   [top suggestion reads: "${whys.sample.join(" · ")}"]`);
eq("no suggestion is unexplained", whys.all, true);
// tasteProfile's weights are ranking scores, negative for nearly everything and
// meaningless to a person — the reason line is words or it is nothing.
eq("a reason never leaks a weight", whys.flat.some(w => /\d/.test(w)), false);
eq("reasons read as words, not feature keys", whys.flat.some(w => w.includes(":")), false);

eq("a name carried by its own tuner tally says so plainly", run(`(()=>{
  const parts = [{ k: "s:vin", v: 0.1 }];
  return whyFor(parts, 5).includes("you liked this one in the tuner");
})()`), true);
eq("a name carried by taste does not claim you tuned it", run(`(()=>{
  const parts = [{ k: "s:vin", v: 2.0 }];
  return whyFor(parts, 0).join();
})()`), "vintage");
eq("features you score badly on are never given as reasons", run(`(()=>{
  return whyFor([{ k: "s:vin", v: -3 }, { k: "end:a", v: 1 }], 0).join();
})()`), "ends in -a");

group("the visible list is not one idea twelve times");

// A straight best-match sort puts a single narrow cluster in every slot, which is
// what makes the screen read as twelve spellings of the same name.
// The case this exists for is THIN data: with only a roster to learn from, the
// model spikes on one feature and every slot comes back the same shape. (That is
// exactly what a voter looks like right after clearing their tuner history.)
run(`globalThis.THIN = (() => {
  const d = assemble({});
  const pg = d.girl.claire;
  pg.votes = 150;
  namesFor("girl", [], []).forEach((n, i) => { pg.ratings[n.id] = START + (i < 8 ? 160 : -60); pg.matches[n.id] = 6; });
  return d;
})()`);

const spread = run(`(()=>{
  const plain = suggestNames(THIN, "claire", "girl").slice(0, 12);
  const mixed = diversify(suggestNames(THIN, "claire", "girl"), "girl", 12).slice(0, 12);
  const ends = (o) => new Set(o.map(x => x.f.end)).size;
  // What the re-ranking actually optimises: how much the listed names resemble
  // EACH OTHER. Distinct style-tag counts are a readable proxy but they wobble on
  // synthetic data, so the assertion goes on the quantity being minimised.
  const overlap = (o) => {
    const v = o.map(x => featVec(x.c.id, "girl"));
    let sum = 0, n = 0;
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { sum += featOverlap(v[i], v[j]); n++; }
    return n ? sum / n : 0;
  };
  return { plainOv: overlap(plain), mixedOv: overlap(mixed),
           plainEnds: ends(plain), mixedEnds: ends(mixed),
           topKept: plain[0].c.id === mixed[0].c.id,
           count: mixed.length };
})()`);
console.log(`   [how alike the 12 are: ${spread.plainOv.toFixed(2)} -> ${spread.mixedOv.toFixed(2)}; distinct endings ${spread.plainEnds} -> ${spread.mixedEnds}]`);
eq("the listed names resemble each other less", spread.mixedOv < spread.plainOv, true);
ge("more different endings reach the page", spread.mixedEnds, spread.plainEnds + 1);
eq("the best match still leads the list", spread.topKept, true);
eq("the list is still full", spread.count, 12);

// Re-ranking must not invent, drop or duplicate candidates.
eq("spreading reorders without losing anyone", run(`(()=>{
  const all = suggestNames(THIN, "claire", "girl");
  const out = diversify(all, "girl", 12);
  const a = all.map(x => x.c.id).sort().join(), b = out.map(x => x.c.id).sort().join();
  return a === b && new Set(out.map(x => x.c.id)).size === out.length;
})()`), true);

eq("a pool smaller than the window still comes back whole", run(`(()=>{
  const all = suggestNames(THIN, "claire", "girl").slice(0, 4);
  return diversify(all, "girl", 12).length === 4;
})()`), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
