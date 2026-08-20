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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
