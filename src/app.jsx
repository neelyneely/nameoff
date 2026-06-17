
const { useState, useEffect, useRef, useCallback } = React;

/* ----------------------------- palette + type ---------------------------- */
const C = {
  bg:"#E6D9BC", paper:"#F4EBD3", ink:"#2C2114", muted:"#6E5C40", line:"#D2C49E",
  teal:"#2E4756", ochre:"#C9821A", sage:"#566B36", clay:"#A4663A",
  // Per-person identity colors, used everywhere a person's data is shown.
  claire:"#C9821A", andrew:"#3F6CA3",
  // Per-gender identity + soft background tints for the Vote banner / Rankings.
  girl:"#B5677B", boy:"#5B7493", girlTint:"#EFE0E2", boyTint:"#DFE6EC",
  // Stronger pink/blue fills for the Vote cards so the round is obvious at a glance.
  girlCard:"#EFD0D8", boyCard:"#CFDDEA",
};
// Color for a profile's own data (Claire = orangey-yellow, Andrew = sage green).
const pColor = (p) => (p === "claire" ? C.claire : p === "andrew" ? C.andrew : C.teal);
// Per-gender helpers: accent color, soft background tint, and banner label.
const gColor = (g) => (g === "boy" ? C.boy : C.girl);
const gTint = (g) => (g === "boy" ? C.boyTint : C.girlTint);
const gCard = (g) => (g === "boy" ? C.boyCard : C.girlCard);
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
    heart:"M12 21C12 21 3.5 14.5 3.5 8.8 3.5 5.9 5.6 4 8 4c1.7 0 3.2 1 4 2.5C12.8 5 14.3 4 16 4c2.4 0 4.5 1.9 4.5 4.8C20.5 14.5 12 21 12 21z",
    trophy:"M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3",
    swords:"M3 3l7 7M14 14l7 7M21 3l-7 7M10 14l-7 7",
    trend:"M3 17l6-6 4 4 8-8M21 7v6h-6",
    sync:"M21 12a9 9 0 1 1-2.6-6.3M21 4v4h-4",
    star:"M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z",
    spark:"M12 3l1.7 5.1L19 9l-5.3 1.5L12 16l-1.7-5.5L5 9l5.3-.9zM18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
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
const UNISEX = [ U("lennon","Lennon",["Len","Lenny","Lenz"]), U("sullivan","Sullivan",["Sully","Sunny","Van"]), U("rory","Rory",["Ro","Rors","Ror"]), U("shae","Shae",["Shay"]) ];
const UNISEX_IDS = new Set(UNISEX.map((u) => u.id)); // popularity shown combined across boys + girls
const NAMES = {
  boy: [
    { id:"finnegan", name:"Finnegan", nicks:["Finn","Finny"] },
    { id:"sean", name:"Sean", nicks:["Jack","Seanie"] },
    { id:"keegan", name:"Keegan", nicks:["Key","Keegs","Keeg"] },
    { id:"callan", name:"Callan", nicks:["Cal","Cally"] },
    { id:"calvin", name:"Calvin", nicks:["Cal","Vin","Cale"] },
    { id:"mcallister", name:"McAllister", nicks:["Mack","Allister","Mac"] },
    ...UNISEX,
  ],
  girl: [
    { id:"sloane", name:"Sloane", nicks:["Sloey","Loey","Lo"] },
    { id:"rowan", name:"Rowan", nicks:["Winnie","Robbie","Ro"] },
    { id:"devin", name:"Devin", nicks:["Dev","Devvy"] },
    { id:"marlowe", name:"Marlowe", nicks:["Lo","Lowie","Marlo"] },
    { id:"keelan", name:"Keelin", nicks:["Ollie","Keeley","Keels"] },
    { id:"cloda", name:"Cloda", nicks:["Lo","Lowie","Cloey"] },
    { id:"lowen", name:"Lowen", nicks:["Lo","Lowie","Winnie"] },
    { id:"bridget", name:"Bridget", nicks:["Birdie","Jett","Bridie"] },
    { id:"merritt", name:"Merritt", nicks:["Merry","Ritt"] },
    { id:"maira", name:"Maira", nicks:["Malley","Mai","Mara"] },
    { id:"fiona", name:"Fiona", nicks:["Fio","Oona","Finn","Fee"] },
    ...UNISEX,
  ],
};
const PROFILES = { claire:"Claire", andrew:"Andrew" };
const OWNERS = ["claire", "andrew"];   // only these two feed the official Rankings
const OWNER_NAMES = { claire:"Claire", andrew:"Andrew" };
const UNLOCK_VOTES = 10;               // votes a person must cast before Rankings + Trends unlock
const isOwner = (p) => OWNERS.includes(p);
const START = 1500;
const BLOCK = 2; // matchups voted per gender before the Vote flow flips to the other
const HISTORY_CAP = 200;

/* ---------------------- US popularity (SSA, by year) ---------------------
 * POP[id][gender] = { year: rank }. Use null for a year outside the top 1000.
 * SSA only ranks the top 1000 per sex. Fill these in from ssa.gov/oact/babynames.
 * Seeded with Sloane (girl) as the working example. */
const POP = {
  // boys: formal bracket names
  finnegan:   { boy: { 2020:409, 2021:378, 2022:446, 2023:491, 2024:494, 2025:526 } },
  sean:       { boy: { 2020:334, 2021:362, 2022:397, 2023:427, 2024:435, 2025:489 } },
  keegan:     { boy: { 2020:496, 2021:492, 2022:566, 2023:627, 2024:593, 2025:621 } },
  callan:     { boy: { 2020:434, 2021:374, 2022:354, 2023:339, 2024:242, 2025:190 } },
  calvin:     { boy: { 2020:144, 2021:145, 2022:148, 2023:152, 2024:140, 2025:132 } },
  mcallister: { boy: { 2025:null } },
  conall:     { boy: { 2025:null } },
  seamus:     { boy: { 2025:null } },
  lennox:     { boy: { 2020:292, 2021:254, 2022:248, 2023:265, 2024:264, 2025:289 } },
  "jean-ralphio": { boy: { 2025:null } },
  albert:     { boy: { 2020:523, 2021:563, 2022:613, 2023:587, 2024:607, 2025:614 } },
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
  wren:     { girl: { 2020:360, 2021:252, 2022:184, 2023:195, 2024:213, 2025:231 } },
  maeve:    { girl: { 2020:174, 2021:124, 2022:103, 2023:73, 2024:75, 2025:76 } },
  niamh:    { girl: { 2025:null } },
  savannah: { girl: { 2020:67, 2021:67, 2022:76, 2023:92, 2024:108, 2025:135 } },
  margaret: { girl: { 2020:126, 2021:125, 2022:127, 2023:132, 2024:119, 2025:112 } },
  leona:    { girl: { 2020:483, 2021:515, 2022:531, 2023:520, 2024:487, 2025:429 } },
  // unisex (both brackets)
  lennon:   { girl: { 2020:299, 2021:238, 2022:228, 2023:243, 2024:235, 2025:214 },
              boy:  { 2020:691, 2021:673, 2022:663, 2023:756, 2024:786, 2025:808 } },
  sullivan: { girl: { 2025:null },
              boy:  { 2020:398, 2021:372, 2022:366, 2023:358, 2024:339, 2025:314 } },
  rory:     { girl: { 2020:458, 2021:399, 2022:336, 2023:305, 2024:287, 2025:230 },
              boy:  { 2020:330, 2021:295, 2022:280, 2023:242, 2024:227, 2025:199 } },
  shae:     { girl: { 2020:934, 2021:903, 2022:914, 2023:1000, 2024:null, 2025:null }, boy: { 2025:null } },
  walker:   { girl: { 2025:null },
              boy:  { 2020:206, 2021:130, 2022:78, 2023:85, 2024:82, 2025:78 } },
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
  wren:       { girl: [{ id:"winnie", label:"Winnie" }] },
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
  maeve:{girl:0.17}, wren:{girl:0.076}, lennox:{boy:0.063}, walker:{boy:0.22},
  savannah:{girl:0.122}, margaret:{girl:0.139}, leona:{girl:0.041}, albert:{boy:0.025},
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
  conall:   "Irish · 'strong as a wolf'",
  seamus:   "Irish form of James · 'supplanter'",
  lennox:   "Scottish · 'place of elms'",
  "jean-ralphio":"Fictional · Parks & Rec's one-man hype machine",
  albert:   "German · 'noble and bright'",
  // girls
  sloane:   "Irish · 'raider, warrior'",
  rowan:    "Irish · 'little red one'; also the rowan tree",
  devin:    "Irish · 'little poet; fawn'",
  marlowe:  "English · place name, 'land left where a lake drained'",
  keelan:   "Irish · 'slender and fair'",
  cloda:    "Irish · river in Tipperary",
  lowen:    "Cornish · 'joyful, happy'",
  bridget:  "Irish · 'exalted one', goddess of fire & poetry",
  merritt:  "English · 'boundary gate' surname",
  maira:    "Irish form of Mary · 'beloved; wished-for child'",
  fiona:    "Scottish · 'fair, white'",
  wren:     "English · the small, lively songbird",
  maeve:    "Irish · 'she who intoxicates'; warrior queen Medb",
  niamh:    "Irish · 'bright, radiant'",
  savannah: "English · flat tropical grassland; from Taíno 'sabana'",
  margaret: "Greek · 'pearl'",
  leona:    "Latin · 'lioness'",
  walker:   "English · 'cloth-walker, fuller' surname",
  // unisex
  lennon:   "Irish · 'lover, sweetheart'",
  sullivan: "Irish · 'dark-eyed; hawk-eyed'",
  rory:     "Irish · 'red king'",
  shae:     "Irish · 'hawk-like; stately'",
};

/* ===================== suggestions ("For you") ============================
 * A content-based recommender that runs fully offline. We tag every roster
 * name AND a curated candidate pool with a small feature vector (origin, style,
 * ending sound, syllables, gender lean). At runtime we read the current voter's
 * Elo ratings + stars + vetoes, learn which features they gravitate toward, and
 * score the unseen candidates by similarity. "Add to voting" turns a candidate
 * into a normal custom name; because candidate ids are the slug of the name,
 * their MEANING/POP entries (folded in below) light up automatically once added.
 *
 * Origin codes: ir Irish · sc Scottish · we Welsh · co Cornish · en English
 *   · no Norse/Scandinavian · la Latin · gr Greek · ge German · fr French
 *   · sk Sanskrit. Style tags: sur surname-name · vin vintage · nat nature
 *   · lyr soft/lyrical · pun strong/punchy · lit literary. */
const ORIGIN_LABEL = { ir:"Irish", sc:"Scottish", we:"Welsh", co:"Cornish", en:"English", no:"Scandinavian", la:"Latin", gr:"Greek", ge:"German", fr:"French", sk:"Sanskrit", he:"Hebrew" };
const STYLE_LABEL  = { sur:"surname-name", vin:"vintage", nat:"nature", lyr:"soft", pun:"strong", lit:"literary" };

// Feature vectors for the EXISTING roster (the recommender's training signal).
const FEAT = {
  finnegan:{o:"ir",s:["sur"],end:"n",syl:3,lean:"b"},
  sean:{o:"ir",s:["pun"],end:"n",syl:1,lean:"b"},
  keegan:{o:"ir",s:["sur"],end:"n",syl:2,lean:"b"},
  callan:{o:"ir",s:["sur"],end:"n",syl:2,lean:"b"},
  calvin:{o:"la",s:["vin"],end:"n",syl:2,lean:"b"},
  mcallister:{o:"sc",s:["sur"],end:"r",syl:3,lean:"b"},
  conall:{o:"ir",s:["pun"],end:"l",syl:2,lean:"b"},
  seamus:{o:"ir",s:["vin"],end:"s",syl:2,lean:"b"},
  lennox:{o:"sc",s:["sur","pun"],end:"x",syl:2,lean:"b"},
  sloane:{o:"ir",s:["sur","pun"],end:"n",syl:1,lean:"g"},
  rowan:{o:"ir",s:["sur","nat"],end:"n",syl:2,lean:"g"},
  devin:{o:"ir",s:["sur"],end:"n",syl:2,lean:"g"},
  marlowe:{o:"en",s:["sur","lit","lyr"],end:"o",syl:2,lean:"g"},
  keelan:{o:"ir",s:["lyr"],end:"n",syl:2,lean:"g"},
  cloda:{o:"ir",s:["lyr","nat"],end:"a",syl:2,lean:"g"},
  lowen:{o:"co",s:["lyr"],end:"n",syl:2,lean:"g"},
  bridget:{o:"ir",s:["vin"],end:"t",syl:2,lean:"g"},
  merritt:{o:"en",s:["sur","pun"],end:"t",syl:2,lean:"g"},
  maira:{o:"ir",s:["lyr"],end:"a",syl:2,lean:"g"},
  fiona:{o:"sc",s:["lyr"],end:"a",syl:3,lean:"g"},
  maeve:{o:"ir",s:["pun","vin"],end:"v",syl:1,lean:"g"},
  wren:{o:"en",s:["nat","pun"],end:"n",syl:1,lean:"g"},
  niamh:{o:"ir",s:["lyr"],end:"v",syl:1,lean:"g"},
  lennon:{o:"ir",s:["sur","lit"],end:"n",syl:2,lean:"u"},
  sullivan:{o:"ir",s:["sur"],end:"n",syl:3,lean:"u"},
  rory:{o:"ir",s:["lyr"],end:"y",syl:2,lean:"u"},
  shae:{o:"ir",s:["lyr"],end:"y",syl:1,lean:"u"},
};

// Curated candidate pool (wide net across origins). gender: "boy"|"girl"|"u".
// rank = recent SSA-ish national rank (null = outside top 1000 / very rare).
// NOTE: names already in the roster (maeve, wren, lennox, walker, ...) are
// intentionally excluded here so their real popularity history isn't clobbered.
const C0 = (gender, id, name, nicks, o, s, end, syl, rank, m) => ({ gender, id, name, nicks, o, s, end, syl, rank, m });
const CANDS = [
  // girls
  C0("girl","greer","Greer",[],"sc",["sur","pun"],"r",1,{girl:null},"Scottish · watchful, guardian"),
  C0("girl","maren","Maren",[],"no",["lyr"],"n",2,{girl:680},"Scandinavian · of the sea"),
  C0("girl","della","Della",["Dell"],"en",["vin","lyr"],"a",2,{girl:820},"English · noble, bright"),
  C0("girl","iris","Iris",[],"gr",["nat","vin"],"s",2,{girl:115},"Greek · rainbow; the flower"),
  C0("girl","romy","Romy",[],"ge",["lyr","vin"],"y",2,{girl:760},"German · pet form of Rosemarie"),
  C0("girl","juniper","Juniper",["Junie","June"],"la",["nat","lyr"],"r",3,{girl:240},"Latin · the evergreen juniper"),
  C0("girl","esme","Esme",[],"fr",["lyr","vin","lit"],"y",2,{girl:610},"French · esteemed, beloved"),
  C0("girl","marigold","Marigold",["Goldie","Mari"],"en",["nat","vin"],"d",3,{girl:null},"English · the golden marigold flower"),
  C0("girl","bryn","Bryn",[],"we",["pun","sur"],"n",1,{girl:null},"Welsh · hill, mound"),
  C0("girl","tegan","Tegan",[],"we",["lyr","sur"],"n",2,{girl:null},"Welsh · fair, lovely"),
  C0("girl","eira","Eira",[],"we",["nat","lyr"],"a",2,{girl:null},"Welsh · snow"),
  C0("girl","elowen","Elowen",["Elo","Winnie"],"co",["lyr","nat"],"n",3,{girl:null},"Cornish · elm tree"),
  C0("girl","maisie","Maisie",[],"sc",["vin","lyr"],"y",2,{girl:520},"Scottish · pearl; pet form of Margaret"),
  C0("girl","nora","Nora",[],"ir",["vin","lyr"],"a",2,{girl:32},"Irish · light, honor"),
  C0("girl","saoirse","Saoirse",["Sersh"],"ir",["lyr","lit"],"a",2,{girl:710},"Irish · freedom"),
  C0("girl","maple","Maple",[],"en",["nat"],"l",2,{girl:null},"English · the maple tree"),
  C0("girl","thea","Thea",[],"gr",["lyr","vin"],"a",2,{girl:200},"Greek · goddess; divine"),
  C0("girl","wilder","Wilder",[],"en",["sur","nat","pun"],"r",2,{girl:null},"English · untamed, wild"),
  // boys
  C0("boy","ames","Ames",[],"en",["sur","pun"],"s",1,{boy:null},"English · friend"),
  C0("boy","cassius","Cassius",["Cass","Cash"],"la",["vin","lit"],"s",3,{boy:350},"Latin · hollow"),
  C0("boy","linus","Linus",["Lin"],"gr",["vin","lit"],"s",2,{boy:null},"Greek · flax; the mythic musician"),
  C0("boy","thorne","Thorne",[],"en",["sur","nat","pun"],"n",1,{boy:null},"English · thorn bush"),
  C0("boy","cormac","Cormac",["Mac","Cory"],"ir",["pun","vin"],"k",2,{boy:null},"Irish · charioteer; raven's son"),
  C0("boy","bowen","Bowen",["Bo"],"we",["sur","lyr"],"n",2,{boy:350},"Welsh · son of Owen"),
  C0("boy","brennan","Brennan",[],"ir",["sur"],"n",2,{boy:690},"Irish · descendant of the brave one"),
  C0("boy","tiernan","Tiernan",["Tiern"],"ir",["sur","lyr"],"n",3,{boy:null},"Irish · little lord"),
  C0("boy","sutton","Sutton",[],"en",["sur"],"n",2,{boy:700},"English · from the south town"),
  C0("boy","auden","Auden",[],"en",["sur","lit","vin"],"n",2,{boy:null},"English · old friend"),
  C0("boy","thatcher","Thatcher",[],"en",["sur"],"r",2,{boy:830},"English · roof-thatcher"),
  C0("boy","emmett","Emmett",[],"en",["vin","sur"],"t",2,{boy:135},"English · universal; whole"),
  C0("boy","ronan","Ronan",[],"ir",["lyr"],"n",2,{boy:340},"Irish · little seal"),
  C0("boy","desmond","Desmond",["Des","Dez"],"ir",["vin","sur"],"d",2,{boy:600},"Irish · from South Munster"),
  C0("boy","silas","Silas",[],"la",["vin","lit"],"s",2,{boy:100},"Latin · of the forest"),
  C0("boy","everett","Everett",["Ev","Rhett"],"en",["sur","vin"],"t",3,{boy:80},"English · brave as a wild boar"),
  C0("boy","cassian","Cassian",["Cass"],"la",["lyr","lit"],"n",3,{boy:710},"Latin · from the Cassia family"),
  C0("boy","arlo","Arlo",[],"en",["lyr","vin"],"o",2,{boy:180},"English · between two hills"),
  // unisex
  C0("u","ellis","Ellis",[],"we",["sur","lyr"],"s",2,{girl:760,boy:250},"Welsh · benevolent, kindly"),
  C0("u","arden","Arden",[],"en",["sur","nat","lit"],"n",2,{girl:620,boy:640},"English · valley of the eagle; great forest"),
  C0("u","reese","Reese",[],"we",["sur","pun"],"s",1,{girl:340,boy:520},"Welsh · ardor, enthusiasm"),
  C0("u","quinn","Quinn",[],"ir",["sur","pun"],"n",1,{girl:80,boy:420},"Irish · descendant of Conn; chief"),
  C0("u","walker","Walker",[],"en",["sur","pun"],"r",2,{girl:null,boy:78},"English · cloth-walker, fuller"),
  C0("u","emerson","Emerson",["Em","Ember"],"en",["sur","lit"],"n",3,{girl:150,boy:400},"English · son of Emery"),
  C0("u","sage","Sage",[],"la",["nat","lyr"],"j",1,{girl:240,boy:620},"Latin · wise; the herb"),
  C0("u","lark","Lark",[],"en",["nat","pun"],"k",1,{girl:null,boy:null},"English · the songbird; lighthearted"),
  C0("u","ellison","Ellison",["Ellie","Sonny"],"en",["sur","lyr"],"n",3,{girl:900,boy:null},"English · son of Ellis"),
  C0("u","indigo","Indigo",["Indie"],"gr",["nat","lyr","lit"],"o",3,{girl:null,boy:null},"Greek · the deep-blue dye"),
  C0("u","sailor","Sailor",[],"en",["nat","sur"],"r",2,{girl:null,boy:null},"English · one who sails"),
  C0("u","ocean","Ocean",[],"gr",["nat"],"n",2,{girl:null,boy:null},"Greek · the sea"),
  // --- expanded mainstream pool ---
  C0("girl","hazel","Hazel",[],"en",["nat","vin"],"l",2,{girl:21},"English · the hazelnut tree"),
  C0("girl","violet","Violet",[],"la",["nat","vin"],"t",2,{girl:13},"Latin · the violet flower"),
  C0("girl","eleanor","Eleanor",["Ellie","Nell"],"fr",["vin","lyr"],"r",3,{girl:12},"French · shining light"),
  C0("girl","josephine","Josephine",["Jo","Josie","Posy"],"he",["vin","lyr"],"e",3,{girl:53},"Hebrew · God will add"),
  C0("girl","genevieve","Genevieve",["Gen","Vivi","Evie"],"fr",["vin","lyr","lit"],"e",3,{girl:null},"French · of the race of women"),
  C0("girl","eloise","Eloise",["Ellie","Lou"],"fr",["vin","lyr"],"e",3,{girl:49},"French · healthy and wide"),
  C0("girl","clara","Clara",[],"la",["vin","lyr"],"a",2,{girl:63},"Latin · bright, clear"),
  C0("girl","cora","Cora",[],"gr",["vin","lyr"],"a",2,{girl:113},"Greek · maiden"),
  C0("girl","stella","Stella",[],"la",["vin","nat"],"a",2,{girl:52},"Latin · star"),
  C0("girl","aurora","Aurora",["Rosie"],"la",["nat","lit"],"a",3,{girl:15},"Latin · dawn"),
  C0("girl","adeline","Adeline",["Addie"],"fr",["vin","lyr"],"e",3,{girl:59},"French · noble"),
  C0("girl","vivian","Vivian",["Vivi","Viv"],"la",["vin"],"n",3,{girl:72},"Latin · alive"),
  C0("girl","beatrice","Beatrice",["Bea","Trixie"],"la",["vin","lit"],"e",3,{girl:508},"Latin · she who brings happiness"),
  C0("girl","margot","Margot",["Margie"],"fr",["vin"],"t",2,{girl:102},"French · pearl"),
  C0("girl","sylvie","Sylvie",[],"fr",["nat","lyr"],"e",2,{girl:282},"French · of the forest"),
  C0("girl","daphne","Daphne",[],"gr",["nat","lyr","lit"],"e",2,{girl:178},"Greek · laurel tree"),
  C0("girl","rosalie","Rosalie",["Rosie"],"fr",["vin","lyr"],"e",3,{girl:171},"French · rose"),
  C0("girl","florence","Florence",["Flo","Florrie"],"la",["vin"],"e",2,{girl:391},"Latin · flourishing, prosperous"),
  C0("girl","edith","Edith",["Edie"],"en",["vin"],"h",2,{girl:499},"English · prosperous in war"),
  C0("girl","tessa","Tessa",["Tess"],"gr",["lyr"],"a",2,{girl:311},"Greek · to harvest"),
  C0("girl","lucy","Lucy",[],"la",["vin","lyr"],"y",2,{girl:25},"Latin · light"),
  C0("girl","alice","Alice",[],"en",["vin","lit"],"e",2,{girl:65},"English · noble"),
  C0("girl","naomi","Naomi",[],"he",["vin"],"i",3,{girl:47},"Hebrew · pleasantness"),
  C0("girl","lydia","Lydia",[],"gr",["vin","lit"],"a",3,{girl:92},"Greek · woman of Lydia"),
  C0("girl","ruby","Ruby",[],"en",["nat","vin"],"y",2,{girl:64},"English · the red gemstone"),
  C0("girl","pearl","Pearl",[],"en",["nat","vin"],"l",1,{girl:777},"English · the pearl gem"),
  C0("girl","maggie","Maggie",[],"gr",["vin","lyr"],"e",2,{girl:294},"Greek · pearl"),
  C0("girl","frances","Frances",["Frankie","Fran"],"la",["vin"],"s",2,{girl:318},"Latin · free one"),
  C0("girl","matilda","Matilda",["Tilly","Mattie"],"ge",["vin","lit"],"a",3,{girl:365},"German · mighty in battle"),
  C0("girl","cecilia","Cecilia",["Cece"],"la",["vin","lyr"],"a",4,{girl:108},"Latin · patron of music"),
  C0("girl","harriet","Harriet",["Hattie"],"ge",["vin"],"t",3,{girl:null},"German · home ruler"),
  C0("girl","poppy","Poppy",[],"en",["nat","lyr"],"y",2,{girl:292},"English · the poppy flower"),
  C0("girl","ivy","Ivy",[],"en",["nat","lyr"],"y",2,{girl:39},"English · the ivy plant"),
  C0("girl","june","June",["Junie"],"la",["nat","vin"],"e",1,{girl:150},"Latin · young; the month"),
  C0("girl","eliza","Eliza",["Liza"],"he",["vin"],"a",3,{girl:115},"Hebrew · my God is an oath"),
  C0("girl","phoebe","Phoebe",[],"gr",["lyr","lit"],"e",2,{girl:157},"Greek · bright, radiant"),
  C0("girl","adelaide","Adelaide",["Addie"],"ge",["vin"],"e",3,{girl:289},"German · noble, kind"),
  C0("girl","mabel","Mabel",[],"la",["vin"],"l",2,{girl:201},"Latin · lovable"),
  C0("girl","helena","Helena",["Lena"],"gr",["vin","lyr"],"a",3,{girl:363},"Greek · light, torch"),
  C0("girl","flora","Flora",[],"la",["nat","vin"],"a",2,{girl:607},"Latin · flower"),
  C0("girl","celia","Celia",[],"la",["vin","lyr"],"a",3,{girl:774},"Latin · heavenly"),
  C0("girl","agnes","Agnes",[],"gr",["vin"],"s",2,{girl:null},"Greek · pure, holy"),
  C0("girl","vera","Vera",[],"la",["vin"],"a",2,{girl:205},"Latin · truth"),
  C0("boy","theodore","Theodore",["Theo","Teddy"],"gr",["vin","lit"],"e",3,{boy:4},"Greek · gift of God"),
  C0("boy","felix","Felix",[],"la",["vin","lit"],"x",2,{boy:175},"Latin · happy, lucky"),
  C0("boy","hugo","Hugo",[],"ge",["vin"],"o",2,{boy:378},"German · mind, intellect"),
  C0("boy","august","August",["Gus","Auggie"],"la",["vin","nat"],"t",2,{boy:81},"Latin · great, venerable"),
  C0("boy","miles","Miles",["Milo"],"la",["vin"],"s",1,{boy:44},"Latin · soldier"),
  C0("boy","oscar","Oscar",["Ozzie"],"en",["vin"],"r",2,{boy:223},"English · divine spear"),
  C0("boy","leo","Leo",[],"la",["nat","vin"],"o",2,{boy:19},"Latin · lion"),
  C0("boy","julian","Julian",["Jules"],"la",["vin","lit"],"n",3,{boy:25},"Latin · youthful"),
  C0("boy","sebastian","Sebastian",["Seb","Bash"],"gr",["vin","lit"],"n",3,{boy:16},"Greek · venerable, revered"),
  C0("boy","atticus","Atticus",[],"la",["lit"],"s",3,{boy:281},"Latin · from Attica"),
  C0("boy","ezra","Ezra",[],"he",["vin","lit"],"a",2,{boy:20},"Hebrew · help"),
  C0("boy","jude","Jude",[],"he",["vin"],"e",1,{boy:155},"Hebrew · praised"),
  C0("boy","wesley","Wesley",["Wes"],"en",["sur"],"y",2,{boy:52},"English · western meadow"),
  C0("boy","graham","Graham",[],"sc",["sur"],"m",2,{boy:120},"Scottish · gravelly homestead"),
  C0("boy","beckett","Beckett",["Beck"],"en",["sur","lit"],"t",2,{boy:141},"English · bee cottage"),
  C0("boy","nathaniel","Nathaniel",["Nate"],"he",["vin"],"l",4,{boy:140},"Hebrew · gift of God"),
  C0("boy","simon","Simon",[],"he",["vin"],"n",2,{boy:230},"Hebrew · he has heard"),
  C0("boy","vincent","Vincent",["Vince","Vinny"],"la",["vin"],"t",2,{boy:107},"Latin · conquering"),
  C0("boy","frederick","Frederick",["Fred","Freddie"],"ge",["vin"],"k",3,{boy:435},"German · peaceful ruler"),
  C0("boy","edward","Edward",["Ned","Teddy"],"en",["vin"],"d",2,{boy:224},"English · wealthy guardian"),
  C0("boy","george","George",["Georgie"],"gr",["vin"],"e",1,{boy:126},"Greek · farmer, earth-worker"),
  C0("boy","walter","Walter",["Walt","Wally"],"ge",["vin"],"r",2,{boy:252},"German · army ruler"),
  C0("boy","bennett","Bennett",["Ben"],"en",["sur","vin"],"t",2,{boy:40},"English · blessed"),
  C0("boy","arthur","Arthur",["Art","Artie"],"en",["vin","lit"],"r",2,{boy:87},"English · bear; the legendary king"),
  C0("boy","louis","Louis",["Lou","Louie"],"fr",["vin"],"s",2,{boy:249},"French · renowned warrior"),
  C0("boy","otis","Otis",[],"ge",["vin","sur"],"s",2,{boy:652},"German · wealthy"),
  C0("boy","caleb","Caleb",["Cale"],"he",["vin"],"b",2,{boy:58},"Hebrew · devotion to God"),
  C0("boy","eli","Eli",[],"he",["vin"],"i",2,{boy:104},"Hebrew · ascended, uplifted"),
  C0("boy","asher","Asher",["Ash"],"he",["vin","nat"],"r",2,{boy:28},"Hebrew · happy, blessed"),
  C0("boy","levi","Levi",[],"he",["vin"],"i",2,{boy:12},"Hebrew · joined, attached"),
  C0("boy","jonah","Jonah",[],"he",["vin"],"h",2,{boy:128},"Hebrew · dove"),
  C0("boy","milo","Milo",[],"ge",["vin"],"o",2,{boy:119},"German · merciful"),
  C0("boy","dean","Dean",[],"en",["sur","vin"],"n",1,{boy:125},"English · valley"),
  C0("boy","reid","Reid",[],"sc",["sur"],"d",1,{boy:293},"Scottish · red-haired"),
  C0("boy","cole","Cole",[],"en",["sur"],"e",1,{boy:182},"English · swarthy, coal-black"),
  C0("boy","jasper","Jasper",[],"en",["vin"],"r",2,{boy:129},"English · bringer of treasure"),
  C0("boy","hugh","Hugh",[],"en",["vin"],"h",1,{boy:732},"English · mind, spirit"),
  C0("boy","wells","Wells",[],"en",["sur","nat"],"s",1,{boy:347},"English · springs, water source"),
  C0("boy","ford","Ford",[],"en",["sur"],"d",1,{boy:null},"English · river crossing"),
  C0("boy","roman","Roman",[],"la",["vin"],"n",2,{boy:42},"Latin · citizen of Rome"),
  C0("boy","victor","Victor",["Vic"],"la",["vin"],"r",2,{boy:211},"Latin · conqueror"),
  C0("boy","philip","Philip",["Phil","Pip"],"gr",["vin"],"p",2,{boy:528},"Greek · lover of horses"),
  C0("u","sawyer","Sawyer",[],"en",["sur","lit"],"r",2,{girl:291,boy:122},"English · woodcutter"),
  C0("u","riley","Riley",[],"ir",["sur","lyr"],"y",2,{girl:48,boy:208},"Irish · valiant; rye clearing"),
  C0("u","parker","Parker",[],"en",["sur"],"r",2,{girl:106,boy:102},"English · park keeper"),
  C0("u","blake","Blake",[],"en",["sur"],"e",1,{girl:295,boy:316},"English · dark; pale"),
  C0("u","hayden","Hayden",[],"en",["sur"],"n",2,{girl:437,boy:161},"English · hay valley"),
  C0("u","finley","Finley",["Finn"],"sc",["sur","lyr"],"y",2,{girl:415,boy:333},"Scottish · fair-haired hero"),
  C0("u","tatum","Tatum",[],"en",["sur"],"m",2,{girl:189,boy:202},"English · Tata homestead"),
  C0("u","spencer","Spencer",[],"en",["sur"],"r",2,{girl:null,boy:null},"English · steward, dispenser"),
  C0("u","hollis","Hollis",[],"en",["sur","nat"],"s",2,{girl:null,boy:894},"English · by the holly trees"),
  C0("u","brooks","Brooks",[],"en",["sur","nat"],"s",1,{girl:null,boy:64},"English · of the brook"),
  C0("u","eden","Eden",[],"he",["nat"],"n",2,{girl:70,boy:544},"Hebrew · paradise, delight"),
  C0("u","emery","Emery",[],"ge",["sur"],"y",3,{girl:74,boy:815},"German · brave, powerful"),
  C0("u","aubrey","Aubrey",[],"fr",["vin","lyr"],"y",2,{girl:146,boy:null},"French · elf ruler"),

  // --- batch 3 ---
  C0("girl","abigail","Abigail",["Abby","Gail"],"he",["vin"],"l",3,{girl:41},"Hebrew · my father is joy"),
  C0("girl","amelia","Amelia",["Amy","Mia","Millie"],"ge",["vin","lyr"],"a",4,{girl:4},"German · work, industrious"),
  C0("girl","anna","Anna",["Annie"],"he",["vin"],"a",2,{girl:107},"Hebrew · grace, favor"),
  C0("girl","arabella","Arabella",["Bella","Bell"],"la",["vin","lyr"],"a",4,{girl:213},"Latin · yielding to prayer"),
  C0("girl","audrey","Audrey",["Aud"],"en",["vin"],"y",2,{girl:86},"English · noble strength"),
  C0("girl","ava","Ava",[],"la",["lyr"],"a",2,{girl:11},"Latin · bird, life"),
  C0("girl","betty","Betty",["Bett"],"he",["vin"],"y",2,{girl:null},"Hebrew · pledged to God"),
  C0("girl","blythe","Blythe",[],"en",["lyr","lit"],"e",1,{girl:null},"English · happy, carefree"),
  C0("girl","briar","Briar",[],"en",["nat"],"r",2,{girl:400},"English · thorny shrub"),
  C0("girl","camille","Camille",["Cami"],"fr",["lyr","vin"],"e",2,{girl:240},"French · young attendant"),
  C0("girl","caroline","Caroline",["Caro","Carrie"],"fr",["vin"],"e",3,{girl:96},"French · free woman"),
  C0("girl","charlotte","Charlotte",["Lottie","Charlie"],"fr",["vin"],"e",2,{girl:2},"French · free woman"),
  C0("girl","clementine","Clementine",["Clem","Clemmie"],"la",["vin","nat"],"e",3,{girl:null},"Latin · mild, merciful"),
  C0("girl","colette","Colette",[],"fr",["vin","lyr"],"e",2,{girl:316},"French · victory of the people"),
  C0("girl","cordelia","Cordelia",["Delia","Cordie"],"la",["lit","vin"],"a",4,{girl:981},"Latin · heart, daughter of the sea"),
  C0("girl","dahlia","Dahlia",[],"no",["nat","lyr"],"a",3,{girl:215},"Scandinavian · valley flower"),
  C0("girl","delphine","Delphine",[],"fr",["lyr","nat"],"e",2,{girl:null},"French · dolphin"),
  C0("girl","diana","Diana",["Di"],"la",["vin"],"a",3,{girl:244},"Latin · divine, heavenly"),
  C0("girl","elise","Elise",["Lise"],"fr",["lyr"],"e",2,{girl:223},"French · pledged to God"),
  C0("girl","elizabeth","Elizabeth",["Liz","Beth","Eliza"],"he",["vin"],"h",4,{girl:17},"Hebrew · pledged to God"),
  C0("girl","ella","Ella",[],"en",["lyr"],"a",2,{girl:29},"English · fairy maiden"),
  C0("girl","emily","Emily",["Em","Emmy"],"la",["vin","lit"],"y",3,{girl:34},"Latin · rival, eager"),
  C0("girl","emma","Emma",["Em"],"ge",["vin"],"a",2,{girl:3},"German · whole, universal"),
  C0("girl","estelle","Estelle",["Stella"],"fr",["vin","lyr"],"e",2,{girl:573},"French · star"),
  C0("girl","evelyn","Evelyn",["Evie","Eve"],"en",["vin"],"n",3,{girl:8},"English · wished-for child"),
  C0("girl","fern","Fern",[],"en",["nat"],"n",1,{girl:null},"English · fern plant"),
  C0("girl","georgia","Georgia",["Georgie"],"gr",["vin"],"a",3,{girl:99},"Greek · farmer, earthworker"),
  C0("girl","gwendolyn","Gwendolyn",["Gwen"],"we",["vin","lyr"],"n",3,{girl:null},"Welsh · white ring, blessed"),
  C0("girl","hannah","Hannah",["Hanna"],"he",["vin"],"h",2,{girl:56},"Hebrew · grace, favor"),
  C0("girl","heidi","Heidi",[],"ge",["vin"],"i",2,{girl:340},"German · noble, serene"),
  C0("girl","imogen","Imogen",["Immy"],"en",["lit","vin"],"n",3,{girl:null},"English · maiden, beloved"),
  C0("girl","isabel","Isabel",["Belle","Izzy"],"he",["vin","lyr"],"l",3,{girl:177},"Hebrew · pledged to God"),
  C0("girl","isla","Isla",[],"sc",["nat","lyr"],"a",2,{girl:28},"Scottish · island"),
  C0("girl","josie","Josie",[],"he",["vin"],"e",2,{girl:82},"Hebrew · God will add"),
  C0("girl","julia","Julia",["Jules"],"la",["vin"],"a",3,{girl:131},"Latin · youthful"),
  C0("girl","juliet","Juliet",["Jules"],"la",["lit","lyr"],"t",3,{girl:274},"Latin · youthful"),
  C0("girl","laurel","Laurel",[],"la",["nat"],"l",2,{girl:734},"Latin · laurel tree, honor"),
  C0("girl","lillian","Lillian",["Lily","Lil"],"la",["vin","nat"],"n",3,{girl:57},"Latin · lily flower"),
  C0("girl","lily","Lily",[],"en",["nat","lyr"],"y",2,{girl:18},"English · lily flower, purity"),
  C0("girl","louisa","Louisa",["Lou"],"ge",["vin","lit"],"a",3,{girl:697},"German · renowned warrior"),
  C0("girl","maud","Maud",[],"ge",["vin"],"d",1,{girl:null},"German · mighty in battle"),
  C0("girl","meadow","Meadow",[],"en",["nat"],"w",2,{girl:286},"English · grassy field"),
  C0("girl","nadia","Nadia",[],"no",["lyr"],"a",3,{girl:565},"Scandinavian · hope"),
  C0("girl","natalie","Natalie",["Nat"],"la",["vin"],"e",3,{girl:89},"Latin · born on Christmas"),
  C0("girl","nell","Nell",[],"en",["vin","lyr"],"l",1,{girl:null},"English · bright, shining one"),
  C0("girl","olive","Olive",["Liv"],"la",["nat","vin"],"e",2,{girl:197},"Latin · olive tree, peace"),
  C0("girl","olivia","Olivia",["Liv","Livvy"],"la",["vin","lyr"],"a",4,{girl:1},"Latin · olive tree, peace"),
  C0("girl","ophelia","Ophelia",[],"gr",["lit","lyr"],"a",4,{girl:264},"Greek · help, aid"),
  C0("girl","penelope","Penelope",["Penny","Nell"],"gr",["vin","lit"],"e",4,{girl:22},"Greek · weaver"),
  C0("girl","lucille","Lucille",["Lucy"],"la",["vin"],"e",2,{girl:null},"Latin · light"),
  C0("girl","primrose","Primrose",["Prim","Rose"],"en",["nat","lit"],"e",2,{girl:null},"English · first rose"),
  C0("girl","rose","Rose",["Rosie"],"la",["nat","vin"],"e",1,{girl:114},"Latin · rose flower"),
  C0("girl","rosemary","Rosemary",["Rosie","Romy"],"la",["nat","vin"],"y",3,{girl:null},"Latin · dew of the sea"),
  C0("girl","ruth","Ruth",[],"he",["vin"],"h",1,{girl:173},"Hebrew · friend, compassion"),
  C0("girl","sadie","Sadie",[],"he",["vin"],"e",2,{girl:50},"Hebrew · princess"),
  C0("girl","scarlett","Scarlett",["Scar"],"en",["lit","pun"],"t",2,{girl:32},"English · bright red, rich cloth"),
  C0("girl","sophie","Sophie",[],"gr",["lyr","vin"],"e",2,{girl:55},"Greek · wisdom"),
  C0("girl","susannah","Susannah",["Susie","Anna"],"he",["vin"],"h",3,{girl:null},"Hebrew · lily, graceful"),
  C0("girl","talia","Talia",[],"he",["lyr"],"a",3,{girl:265},"Hebrew · dew from God"),
  C0("girl","tabitha","Tabitha",["Tabby"],"gr",["vin"],"a",3,{girl:null},"Greek · gazelle"),
  C0("girl","verena","Verena",["Vera"],"la",["vin","lyr"],"a",3,{girl:null},"Latin · truth, integrity"),
  C0("girl","willa","Willa",[],"ge",["vin","lit"],"a",2,{girl:422},"German · resolute protector"),
  C0("girl","winifred","Winifred",["Winnie","Freddie"],"we",["vin"],"d",3,{girl:923},"Welsh · blessed peace"),
  C0("girl","wynne","Wynne",[],"we",["lyr","nat"],"e",1,{girl:null},"Welsh · fair, blessed"),
  C0("boy","aaron","Aaron",[],"he",["vin"],"n",2,{boy:80},"Hebrew · exalted, mountain of strength"),
  C0("boy","adam","Adam",[],"he",["vin"],"m",2,{boy:101},"Hebrew · man, earth"),
  C0("boy","alexander","Alexander",["Alex","Xander"],"gr",["vin"],"r",4,{boy:30},"Greek · defender of the people"),
  C0("boy","alistair","Alistair",["Al"],"sc",["sur","vin"],"r",3,{boy:897},"Scottish · defender of the people"),
  C0("boy","anson","Anson",[],"en",["sur","vin"],"n",2,{boy:null},"English · son of Agnes"),
  C0("boy","barrett","Barrett",[],"ge",["sur","pun"],"t",2,{boy:171},"German · bear strength"),
  C0("boy","benjamin","Benjamin",["Ben","Benny"],"he",["vin"],"n",3,{boy:11},"Hebrew · son of the right hand"),
  C0("boy","brody","Brody",[],"sc",["sur"],"y",2,{boy:236},"Scottish · ditch, muddy place"),
  C0("boy","bruce","Bruce",[],"sc",["sur","pun"],"e",1,{boy:536},"Scottish · from the brushwood"),
  C0("boy","byron","Byron",[],"en",["sur","lit"],"n",2,{boy:981},"English · at the cattle barns"),
  C0("boy","callum","Callum",["Cal"],"sc",["lyr"],"m",2,{boy:118},"Scottish · dove"),
  C0("boy","carter","Carter",[],"en",["sur"],"r",2,{boy:45},"English · cart driver"),
  C0("boy","charles","Charles",["Charlie","Chuck"],"ge",["vin"],"s",1,{boy:48},"German · free man"),
  C0("boy","clark","Clark",[],"en",["sur","vin"],"k",1,{boy:377},"English · scholar, clergyman"),
  C0("boy","colin","Colin",[],"sc",["vin"],"n",2,{boy:null},"Scottish · young pup, dove"),
  C0("boy","crawford","Crawford",["Ford"],"sc",["sur"],"d",2,{boy:null},"Scottish · ford of the crows"),
  C0("boy","curtis","Curtis",["Curt"],"fr",["sur","vin"],"s",2,{boy:985},"French · courteous, refined"),
  C0("boy","daniel","Daniel",["Dan","Danny"],"he",["vin"],"l",3,{boy:22},"Hebrew · God is my judge"),
  C0("boy","david","David",["Dave","Davy"],"he",["vin"],"d",2,{boy:35},"Hebrew · beloved"),
  C0("boy","declan","Declan",[],"ir",["lyr"],"n",2,{boy:139},"Irish · full of goodness"),
  C0("boy","dominic","Dominic",["Dom","Nic"],"la",["vin"],"c",3,{boy:106},"Latin · belonging to the Lord"),
  C0("boy","duncan","Duncan",[],"sc",["sur","vin"],"n",2,{boy:null},"Scottish · dark warrior"),
  C0("boy","garrett","Garrett",[],"ir",["sur","pun"],"t",2,{boy:564},"Irish · spear strength"),
  C0("boy","forrest","Forrest",[],"en",["nat","sur"],"t",2,{boy:374},"English · woodsman, of the forest"),
  C0("boy","francis","Francis",["Frank"],"la",["vin"],"s",2,{boy:420},"Latin · free man, Frenchman"),
  C0("boy","gabriel","Gabriel",["Gabe"],"he",["vin"],"l",3,{boy:37},"Hebrew · God is my strength"),
  C0("boy","grant","Grant",[],"sc",["sur","pun"],"t",1,{boy:null},"Scottish · great, tall"),
  C0("boy","gregory","Gregory",["Greg"],"gr",["vin"],"y",3,{boy:593},"Greek · watchful, vigilant"),
  C0("boy","harrison","Harrison",["Harry"],"en",["sur"],"n",3,{boy:116},"English · son of Harry"),
  C0("boy","henry","Henry",["Hank","Harry"],"ge",["vin"],"y",2,{boy:5},"German · ruler of the home"),
  C0("boy","isaac","Isaac",["Ike"],"he",["vin"],"c",2,{boy:47},"Hebrew · he will laugh"),
  C0("boy","jack","Jack",[],"en",["vin","pun"],"k",1,{boy:15},"English · God is gracious"),
  C0("boy","jacob","Jacob",["Jake"],"he",["vin"],"b",2,{boy:43},"Hebrew · supplanter, holder of the heel"),
  C0("boy","james","James",["Jamie","Jim"],"he",["vin"],"s",1,{boy:6},"Hebrew · supplanter"),
  C0("boy","joseph","Joseph",["Joe","Joey"],"he",["vin"],"h",2,{boy:29},"Hebrew · God will add"),
  C0("boy","joshua","Joshua",["Josh"],"he",["vin"],"a",3,{boy:66},"Hebrew · God is salvation"),
  C0("boy","leland","Leland",["Lee"],"en",["sur","nat"],"d",2,{boy:494},"English · meadow land"),
  C0("boy","lincoln","Lincoln",["Linc"],"en",["sur"],"n",2,{boy:69},"English · lake colony"),
  C0("boy","luke","Luke",[],"gr",["vin","pun"],"e",1,{boy:33},"Greek · light-giving"),
  C0("boy","malcolm","Malcolm",["Mal"],"sc",["vin","sur"],"m",2,{boy:272},"Scottish · devotee of Saint Columba"),
  C0("boy","marcus","Marcus",["Marc"],"la",["vin"],"s",2,{boy:258},"Latin · warlike, of Mars"),
  C0("boy","martin","Martin",["Marty"],"la",["vin"],"n",2,{boy:335},"Latin · warlike, of Mars"),
  C0("boy","maxwell","Maxwell",["Max"],"sc",["sur","pun"],"l",2,{boy:189},"Scottish · great spring, large stream"),
  C0("boy","micah","Micah",[],"he",["vin"],"h",2,{boy:90},"Hebrew · who is like God"),
  C0("boy","nathan","Nathan",["Nate"],"he",["vin"],"n",2,{boy:63},"Hebrew · he gave, gift"),
  C0("boy","nicholas","Nicholas",["Nick"],"gr",["vin"],"s",3,{boy:112},"Greek · victory of the people"),
  C0("boy","noah","Noah",[],"he",["vin"],"h",2,{boy:2},"Hebrew · rest, comfort"),
  C0("boy","owen","Owen",[],"we",["vin"],"n",2,{boy:31},"Welsh · young warrior, well-born"),
  C0("boy","patrick","Patrick",["Pat"],"ir",["vin"],"k",2,{boy:235},"Irish · nobleman"),
  C0("boy","paul","Paul",[],"la",["vin"],"l",1,{boy:262},"Latin · small, humble"),
  C0("boy","peter","Peter",["Pete"],"gr",["vin"],"r",2,{boy:187},"Greek · rock, stone"),
  C0("boy","porter","Porter",[],"en",["sur"],"r",2,{boy:560},"English · gatekeeper, carrier"),
  C0("boy","preston","Preston",[],"en",["sur"],"n",2,{boy:299},"English · priest town"),
  C0("boy","raymond","Raymond",["Ray"],"ge",["vin"],"d",2,{boy:395},"German · wise protector"),
  C0("boy","rhys","Rhys",[],"we",["pun"],"s",1,{boy:412},"Welsh · ardor, enthusiasm"),
  C0("boy","robert","Robert",["Rob","Bob","Bobby"],"ge",["vin"],"t",2,{boy:92},"German · bright fame"),
  C0("boy","russell","Russell",["Russ"],"fr",["sur","vin"],"l",2,{boy:345},"French · little red one"),
  C0("boy","samuel","Samuel",["Sam","Sammy"],"he",["vin"],"l",3,{boy:18},"Hebrew · God has heard"),
  C0("boy","stuart","Stuart",["Stu"],"sc",["sur","vin"],"t",2,{boy:null},"Scottish · steward, household guardian"),
  C0("boy","theo","Theo",[],"gr",["vin","lyr"],"o",2,{boy:82},"Greek · gift of God"),
  C0("boy","thomas","Thomas",["Tom","Tommy"],"he",["vin"],"s",2,{boy:34},"Hebrew · twin"),
  C0("boy","timothy","Timothy",["Tim","Timmy"],"gr",["vin"],"y",3,{boy:203},"Greek · honoring God"),
  C0("boy","tobias","Tobias",["Toby"],"he",["vin","lit"],"s",3,{boy:283},"Hebrew · God is good"),
  C0("boy","warren","Warren",[],"ge",["sur","vin"],"n",2,{boy:240},"German · guard, watchman"),
  C0("boy","william","William",["Will","Liam","Billy"],"ge",["vin"],"m",2,{boy:9},"German · resolute protector"),
  C0("boy","winston","Winston",["Win"],"en",["sur","vin"],"n",2,{boy:382},"English · joyful stone, friend town"),
  C0("u","alex","Alex",[],"gr",["pun"],"x",2,{girl:null,boy:232},"Greek · defender of the people"),
  C0("u","avery","Avery",[],"en",["sur"],"y",3,{girl:37,boy:291},"English · ruler of elves"),
  C0("u","bellamy","Bellamy",[],"fr",["sur","lyr"],"y",3,{girl:797,boy:721},"French · fine friend"),
  C0("u","campbell","Campbell",[],"sc",["sur"],"l",2,{girl:617,boy:764},"Scottish · crooked mouth"),
  C0("u","carey","Carey",[],"ir",["sur","lyr"],"y",2,{girl:null,boy:null},"Irish · dark one, near the castle"),
  C0("u","darcy","Darcy",[],"fr",["sur","lit"],"y",2,{girl:857,boy:null},"French · from Arcy, dark"),
  C0("u","ellery","Ellery",[],"en",["sur","lit"],"y",3,{girl:null,boy:null},"English · alder tree island"),
  C0("u","finch","Finch",[],"en",["nat","sur"],"h",1,{girl:null,boy:null},"English · finch bird"),
  C0("u","flynn","Flynn",[],"ir",["sur","pun"],"n",1,{girl:null,boy:828},"Irish · son of the red-haired one"),
  C0("u","harlow","Harlow",[],"en",["sur"],"w",2,{girl:309,boy:null},"English · army hill, rock hill"),
  C0("u","larkin","Larkin",[],"ir",["sur","lyr"],"n",2,{girl:null,boy:null},"Irish · fierce, rough"),
  C0("u","keaton","Keaton",[],"en",["sur"],"n",2,{girl:null,boy:771},"English · place of hawks"),
  C0("u","lane","Lane",[],"en",["sur","nat"],"e",1,{girl:null,boy:250},"English · narrow path"),
  C0("u","marsh","Marsh",[],"en",["nat","sur"],"h",1,{girl:null,boy:null},"English · marshland"),
  C0("u","monroe","Monroe",[],"sc",["sur"],"e",2,{girl:467,boy:null},"Scottish · mouth of the Roe river"),
  C0("u","murphy","Murphy",[],"ir",["sur","pun"],"y",2,{girl:397,boy:754},"Irish · sea warrior"),
  C0("u","nico","Nico",[],"gr",["lyr"],"o",2,{girl:null,boy:174},"Greek · victory of the people"),
  C0("u","remy","Remy",[],"fr",["lyr","sur"],"y",2,{girl:721,boy:408},"French · oarsman, from Rheims"),
  C0("u","teddy","Teddy",[],"gr",["vin"],"y",2,{girl:null,boy:823},"Greek · gift of God"),

  // --- batch 4 (second tier) ---
  C0("girl","adela","Adela",["Della","Addie"],"ge",["vin"],"a",3,{girl:null},"German · noble"),
  C0("girl","alma","Alma",[],"la",["vin"],"a",2,{girl:449},"Latin · nourishing soul"),
  C0("girl","amabel","Amabel",["Mabel","Amy"],"la",["vin","lyr"],"l",3,{girl:null},"Latin · lovable"),
  C0("girl","anwen","Anwen",[],"we",["lyr"],"n",2,{girl:null},"Welsh · very fair"),
  C0("girl","beatrix","Beatrix",["Bea","Trixie"],"la",["vin","lit"],"x",3,{girl:null},"Latin · she who brings happiness"),
  C0("girl","bess","Bess",[],"he",["vin"],"s",1,{girl:null},"Hebrew · pledged to God"),
  C0("girl","birdie","Birdie",[],"en",["vin","nat"],"e",2,{girl:670},"English · little bird"),
  C0("girl","bronwen","Bronwen",["Bron"],"we",["lyr"],"n",2,{girl:null},"Welsh · white breast"),
  C0("girl","calla","Calla",[],"gr",["nat","lyr"],"a",2,{girl:null},"Greek · beautiful lily"),
  C0("girl","cassia","Cassia",["Cass"],"gr",["nat"],"a",3,{girl:null},"Greek · cinnamon spice tree"),
  C0("girl","catherine","Catherine",["Kate","Cathy","Kit"],"gr",["vin"],"e",3,{girl:314},"Greek · pure"),
  C0("girl","cecily","Cecily",["Cissy"],"la",["vin","lit"],"y",3,{girl:null},"Latin · blind, dedicated"),
  C0("girl","clarissa","Clarissa",["Clara","Rissa"],"la",["vin","lit"],"a",3,{girl:null},"Latin · bright and clear"),
  C0("girl","constance","Constance",["Connie"],"la",["vin"],"e",2,{girl:null},"Latin · steadfast"),
  C0("girl","cressida","Cressida",["Cress"],"gr",["lit"],"a",3,{girl:null},"Greek · golden"),
  C0("girl","delia","Delia",[],"gr",["vin","lyr"],"a",3,{girl:null},"Greek · of Delos"),
  C0("girl","dorothea","Dorothea",["Dot","Thea"],"gr",["vin"],"a",4,{girl:null},"Greek · gift of God"),
  C0("girl","elspeth","Elspeth",["Elsie"],"sc",["vin","lyr"],"h",2,{girl:null},"Scottish · pledged to God"),
  C0("girl","emmeline","Emmeline",["Emmie","Em"],"fr",["vin","lyr"],"e",3,{girl:922},"French · industrious"),
  C0("girl","ernestine","Ernestine",["Ernie"],"ge",["vin"],"e",3,{girl:null},"German · serious, resolute"),
  C0("girl","etta","Etta",[],"ge",["vin","lyr"],"a",2,{girl:930},"German · ruler of the home"),
  C0("girl","euphemia","Euphemia",["Effie"],"gr",["vin"],"a",4,{girl:null},"Greek · well spoken"),
  C0("girl","evangeline","Evangeline",["Eva","Evie"],"gr",["lyr","lit"],"e",4,{girl:147},"Greek · bearer of good news"),
  C0("girl","faye","Faye",[],"en",["vin","lyr"],"e",1,{girl:515},"English · fairy"),
  C0("girl","flannery","Flannery",["Flann"],"ir",["sur","lit"],"y",3,{girl:null},"Irish · red valor"),
  C0("girl","gemma","Gemma",[],"la",["vin"],"a",2,{girl:170},"Latin · precious gem"),
  C0("girl","gillian","Gillian",["Gill","Jilly"],"la",["vin"],"n",3,{girl:null},"Latin · youthful"),
  C0("girl","giselle","Giselle",[],"ge",["lyr"],"e",2,{girl:382},"German · pledge"),
  C0("girl","gloria","Gloria",["Glory"],"la",["vin"],"a",3,{girl:655},"Latin · glory"),
  C0("girl","greta","Greta",[],"ge",["vin"],"a",2,{girl:908},"German · pearl"),
  C0("girl","hester","Hester",["Hettie"],"gr",["vin","lit"],"r",2,{girl:null},"Greek · star"),
  C0("girl","honora","Honora",["Nora","Honey"],"la",["vin"],"a",3,{girl:null},"Latin · honor"),
  C0("girl","isadora","Isadora",["Izzy","Dora"],"gr",["vin","lit"],"a",4,{girl:null},"Greek · gift of Isis"),
  C0("girl","jessamine","Jessamine",["Jessa"],"fr",["nat","lyr"],"e",3,{girl:null},"French · jasmine flower"),
  C0("girl","johanna","Johanna",["Jo","Hanna"],"he",["vin"],"a",3,{girl:871},"Hebrew · God is gracious"),
  C0("girl","lavinia","Lavinia",["Vinnie","Lavi"],"la",["vin","lit"],"a",4,{girl:null},"Latin · woman of Rome"),
  C0("girl","leonora","Leonora",["Nora","Leo"],"gr",["vin","lyr"],"a",4,{girl:null},"Greek · light"),
  C0("girl","lilias","Lilias",["Lily"],"sc",["vin","nat"],"s",3,{girl:null},"Scottish · lily flower"),
  C0("girl","lottie","Lottie",[],"fr",["vin","lyr"],"e",2,{girl:528},"French · free woman"),
  C0("girl","lucinda","Lucinda",["Lucy","Cindy"],"la",["vin","lit"],"a",3,{girl:null},"Latin · light"),
  C0("girl","magnolia","Magnolia",["Maggie","Nola"],"la",["nat"],"a",4,{girl:124},"Latin · magnolia flower"),
  C0("girl","marguerite","Marguerite",["Daisy","Rita"],"fr",["vin","nat"],"e",3,{girl:null},"French · daisy, pearl"),
  C0("girl","marina","Marina",["Rina"],"la",["nat"],"a",3,{girl:602},"Latin · of the sea"),
  C0("girl","meredith","Meredith",["Merry"],"we",["sur","vin"],"h",3,{girl:469},"Welsh · great lord"),
  C0("girl","mirabel","Mirabel",["Mira","Belle"],"la",["vin","lyr"],"l",3,{girl:null},"Latin · wondrous"),
  C0("girl","nessa","Nessa",[],"ir",["lyr"],"a",2,{girl:null},"Irish · headstrong"),
  C0("girl","odette","Odette",[],"fr",["vin","lit"],"e",2,{girl:883},"French · wealthy"),
  C0("girl","orla","Orla",[],"ir",["lyr"],"a",2,{girl:null},"Irish · golden princess"),
  C0("girl","petra","Petra",[],"gr",["vin","pun"],"a",2,{girl:null},"Greek · rock"),
  C0("girl","philippa","Philippa",["Pippa","Phil"],"gr",["vin"],"a",3,{girl:null},"Greek · lover of horses"),
  C0("girl","prudence","Prudence",["Pru"],"la",["vin","lit"],"e",2,{girl:null},"Latin · good judgment"),
  C0("girl","romilly","Romilly",["Romy"],"fr",["sur","lyr"],"y",3,{girl:null},"French · man of Rome"),
  C0("girl","rosamund","Rosamund",["Rosa","Roz"],"ge",["vin","nat"],"d",3,{girl:null},"German · horse protection"),
  C0("girl","selma","Selma",[],"no",["vin"],"a",2,{girl:null},"Scandinavian · divine helmet"),
  C0("girl","seraphina","Seraphina",["Sera","Fina"],"he",["vin","lyr"],"a",4,{girl:600},"Hebrew · fiery, burning ones"),
  C0("girl","sybil","Sybil",["Sybbie"],"gr",["vin","lit"],"l",2,{girl:null},"Greek · prophetess"),
  C0("girl","theodora","Theodora",["Thea","Dora"],"gr",["vin"],"a",4,{girl:726},"Greek · gift of God"),
  C0("girl","ursula","Ursula",["Sula"],"la",["vin","lit"],"a",3,{girl:null},"Latin · little bear"),
  C0("girl","wilhelmina","Wilhelmina",["Mina","Billie"],"ge",["vin"],"a",4,{girl:null},"German · resolute protector"),
  C0("boy","abner","Abner",[],"he",["vin"],"r",2,{boy:874},"Hebrew · father of light"),
  C0("boy","alaric","Alaric",["Rick","Al"],"ge",["vin","pun"],"c",3,{boy:null},"German · ruler of all"),
  C0("boy","alden","Alden",[],"en",["sur","vin"],"n",2,{boy:598},"English · old friend"),
  C0("boy","ambrose","Ambrose",[],"gr",["vin","lit"],"e",2,{boy:735},"Greek · immortal"),
  C0("boy","anselm","Anselm",[],"ge",["vin"],"m",2,{boy:null},"German · God protection"),
  C0("boy","archer","Archer",["Archie"],"en",["sur","pun"],"r",2,{boy:98},"English · bowman"),
  C0("boy","augustus","Augustus",["Gus","Augie"],"la",["vin"],"s",3,{boy:407},"Latin · great, venerable"),
  C0("boy","barnaby","Barnaby",["Barney"],"he",["vin","lit"],"y",3,{boy:null},"Hebrew · son of consolation"),
  C0("boy","basil","Basil",[],"gr",["vin","nat"],"l",2,{boy:null},"Greek · royal, kingly"),
  C0("boy","bertram","Bertram",["Bert"],"ge",["vin"],"m",2,{boy:null},"German · bright raven"),
  C0("boy","booker","Booker",[],"en",["sur"],"r",2,{boy:null},"English · scribe, bookmaker"),
  C0("boy","boyd","Boyd",[],"sc",["sur"],"d",1,{boy:null},"Scottish · yellow, fair"),
  C0("boy","bram","Bram",[],"he",["vin","lit"],"m",1,{boy:null},"Hebrew · father of multitudes"),
  C0("boy","caspar","Caspar",["Cas"],"la",["vin"],"r",2,{boy:null},"Latin · treasurer"),
  C0("boy","cedric","Cedric",["Ced"],"en",["vin","lit"],"c",2,{boy:null},"English · bounty, war chief"),
  C0("boy","clement","Clement",["Clem"],"la",["vin"],"t",2,{boy:null},"Latin · merciful"),
  C0("boy","conrad","Conrad",["Connie"],"ge",["vin","pun"],"d",2,{boy:417},"German · bold counsel"),
  C0("boy","cyrus","Cyrus",["Cy"],"gr",["vin","pun"],"s",2,{boy:268},"Greek · lord, sun"),
  C0("boy","edmund","Edmund",["Ed","Ned"],"en",["vin","lit"],"d",2,{boy:null},"English · wealthy protector"),
  C0("boy","edwin","Edwin",["Ed","Win"],"en",["vin"],"n",2,{boy:398},"English · rich friend"),
  C0("boy","elias","Elias",["Eli"],"he",["vin"],"s",3,{boy:13},"Hebrew · the Lord is my God"),
  C0("boy","ellington","Ellington",["Elling"],"en",["sur"],"n",3,{boy:null},"English · Ellas town"),
  C0("boy","everard","Everard",["Ev"],"en",["vin","pun"],"d",3,{boy:null},"English · brave as a boar"),
  C0("boy","ferdinand","Ferdinand",["Ferdie"],"ge",["vin"],"d",3,{boy:null},"German · bold voyager"),
  C0("boy","florian","Florian",[],"la",["vin","nat"],"n",3,{boy:null},"Latin · flowering"),
  C0("boy","foster","Foster",[],"en",["sur"],"r",2,{boy:901},"English · forester"),
  C0("boy","franklin","Franklin",["Frank"],"en",["vin","sur"],"n",2,{boy:359},"English · free landholder"),
  C0("boy","gerald","Gerald",["Gerry"],"ge",["vin"],"d",2,{boy:null},"German · ruler with spear"),
  C0("boy","giles","Giles",[],"gr",["vin","lit"],"s",1,{boy:null},"Greek · young goat, shield"),
  C0("boy","godfrey","Godfrey",[],"ge",["vin"],"y",2,{boy:null},"German · peace of God"),
  C0("boy","hamish","Hamish",[],"sc",["vin"],"h",2,{boy:null},"Scottish · supplanter"),
  C0("boy","harlan","Harlan",[],"en",["sur","vin"],"n",2,{boy:617},"English · rocky land"),
  C0("boy","hartley","Hartley",["Hart"],"en",["sur","nat"],"y",2,{boy:null},"English · stag meadow"),
  C0("boy","horace","Horace",[],"la",["vin","lit"],"e",2,{boy:null},"Latin · timekeeper"),
  C0("boy","ignatius","Ignatius",["Iggy"],"la",["vin","lit"],"s",4,{boy:null},"Latin · fiery"),
  C0("boy","ivan","Ivan",[],"he",["vin"],"n",2,{boy:163},"Hebrew · God is gracious"),
  C0("boy","lionel","Lionel",["Leo"],"la",["vin","pun"],"l",3,{boy:659},"Latin · young lion"),
  C0("boy","lucius","Lucius",["Luce"],"la",["vin","lit"],"s",2,{boy:null},"Latin · light"),
  C0("boy","ludovic","Ludovic",["Ludo"],"ge",["vin"],"c",3,{boy:null},"German · famous warrior"),
  C0("boy","mortimer","Mortimer",["Morty"],"fr",["vin","sur"],"r",3,{boy:null},"French · still water"),
  C0("boy","nigel","Nigel",[],"la",["vin"],"l",2,{boy:null},"Latin · champion"),
  C0("boy","oswald","Oswald",["Oz","Ozzie"],"en",["vin","pun"],"d",2,{boy:null},"English · divine power"),
  C0("boy","percival","Percival",["Percy"],"fr",["vin","lit"],"l",3,{boy:null},"French · pierce the valley"),
  C0("boy","phineas","Phineas",["Finn"],"he",["vin","lit"],"s",3,{boy:null},"Hebrew · oracle"),
  C0("boy","quentin","Quentin",["Quin"],"la",["vin","sur"],"n",2,{boy:968},"Latin · fifth"),
  C0("boy","reuben","Reuben",["Rube"],"he",["vin"],"n",2,{boy:889},"Hebrew · behold, a son"),
  C0("boy","roderick","Roderick",["Rory","Rod"],"ge",["vin","pun"],"k",3,{boy:null},"German · famous ruler"),
  C0("boy","roland","Roland",["Roly"],"ge",["vin","lit"],"d",2,{boy:608},"German · famous land"),
  C0("boy","rufus","Rufus",[],"la",["vin"],"s",2,{boy:null},"Latin · red haired"),
  C0("boy","rupert","Rupert",["Rue"],"ge",["vin","lit"],"t",2,{boy:null},"German · bright fame"),
  C0("boy","sterling","Sterling",[],"en",["sur","pun"],"g",2,{boy:346},"English · little star, pure"),
  C0("boy","tennyson","Tennyson",["Tenny"],"en",["sur","lit"],"n",3,{boy:null},"English · son of Dennis"),
  C0("boy","thaddeus","Thaddeus",["Thad","Tad"],"gr",["vin","lit"],"s",3,{boy:798},"Greek · courageous heart"),
  C0("boy","ulysses","Ulysses",["Uly"],"gr",["vin","lit"],"s",3,{boy:null},"Greek · wrathful, wounded"),
  C0("boy","upton","Upton",[],"en",["sur"],"n",2,{boy:null},"English · upper town"),
  C0("boy","vaughn","Vaughn",[],"we",["sur"],"n",1,{boy:null},"Welsh · small"),
  C0("boy","wallace","Wallace",["Wally"],"sc",["sur","vin"],"e",2,{boy:964},"Scottish · foreigner, Welshman"),
  C0("boy","whitaker","Whitaker",["Whit"],"en",["sur"],"r",3,{boy:null},"English · white field"),
  C0("boy","wilfred","Wilfred",["Will","Fred"],"en",["vin"],"d",2,{boy:null},"English · desires peace"),
  C0("boy","winslow","Winslow",["Win"],"en",["sur"],"w",2,{boy:null},"English · friends hill"),
  C0("u","ainsley","Ainsley",[],"sc",["sur","nat"],"y",2,{girl:483,boy:null},"Scottish · meadow, clearing"),
  C0("u","auberon","Auberon",["Bron"],"ge",["vin","lit"],"n",3,{girl:null,boy:null},"German · noble bear"),
  C0("u","baxter","Baxter",["Bax"],"en",["sur"],"r",2,{girl:null,boy:null},"English · baker"),
  C0("u","blair","Blair",[],"sc",["sur","nat"],"r",1,{girl:169,boy:null},"Scottish · plain, field"),
  C0("u","cassidy","Cassidy",["Cass"],"ir",["sur","lyr"],"y",3,{girl:541,boy:null},"Irish · curly haired"),
  C0("u","darby","Darby",[],"en",["sur","vin"],"y",2,{girl:null,boy:null},"English · deer settlement"),
  C0("u","easton","Easton",[],"en",["sur"],"n",2,{girl:null,boy:110},"English · east town"),
  C0("u","emlyn","Emlyn",[],"we",["lyr"],"n",2,{girl:null,boy:null},"Welsh · rival, flatterer"),
  C0("u","hadley","Hadley",[],"en",["sur","nat"],"y",2,{girl:121,boy:null},"English · heather meadow"),
  C0("u","haven","Haven",[],"en",["nat","lyr"],"n",2,{girl:190,boy:null},"English · safe place"),
  C0("u","holland","Holland",["Holly"],"en",["sur","nat"],"d",2,{girl:550,boy:null},"English · wooded land"),
  C0("u","kemp","Kemp",[],"en",["sur","pun"],"p",1,{girl:null,boy:null},"English · warrior, champion"),
  C0("u","linden","Linden",["Lin"],"en",["nat","vin"],"n",2,{girl:null,boy:null},"English · linden tree"),
  C0("u","oakley","Oakley",["Oak"],"en",["sur","nat"],"y",2,{girl:156,boy:454},"English · oak meadow"),
  C0("u","vesper","Vesper",[],"la",["nat","lit"],"r",2,{girl:null,boy:null},"Latin · evening star"),
  C0("u","waverly","Waverly",["Wave"],"en",["sur","nat"],"y",3,{girl:null,boy:null},"English · meadow of quaking aspens"),
  C0("u","winter","Winter",[],"en",["nat","lyr"],"r",2,{girl:426,boy:null},"English · winter season"),

  // --- batch 5 (SSA-filtered) ---
  C0("boy","liam","Liam",[],"ir",["sur"],"m",2,{boy:1},"Irish · strong-willed warrior"),
  C0("boy","oliver","Oliver",["Ollie"],"la",["nat","lit"],"r",3,{boy:3},"Latin · olive tree"),
  C0("boy","lucas","Lucas",["Luke"],"la",["lit"],"s",2,{boy:10},"Latin · light"),
  C0("boy","mason","Mason",["Mace"],"en",["sur"],"n",2,{boy:39},"English · stoneworker"),
  C0("boy","michael","Michael",["Mike","Mikey"],"he",["lit"],"l",2,{boy:21},"Hebrew · who is like God"),
  C0("boy","ethan","Ethan",[],"he",["lit"],"n",2,{boy:24},"Hebrew · strong and firm"),
  C0("boy","jackson","Jackson",["Jack"],"en",["sur"],"n",2,{boy:36},"English · son of Jack"),
  C0("boy","logan","Logan",[],"sc",["sur"],"n",2,{boy:53},"Scottish · little hollow"),
  C0("boy","hudson","Hudson",["Huddy"],"en",["sur"],"n",2,{boy:17},"English · son of Hugh"),
  C0("boy","john","John",["Johnny","Jack"],"he",["lit"],"n",1,{boy:23},"Hebrew · God is gracious"),
  C0("boy","cooper","Cooper",["Coop"],"en",["sur"],"r",2,{boy:27},"English · barrel maker"),
  C0("boy","dylan","Dylan",["Dyl"],"we",["lit"],"n",2,{boy:41},"Welsh · son of the sea"),
  C0("boy","wyatt","Wyatt",["Wy"],"en",["sur"],"t",2,{boy:38},"English · brave in war"),
  C0("boy","matthew","Matthew",["Matt","Matty"],"he",["lit"],"w",2,{boy:32},"Hebrew · gift of God"),
  C0("boy","grayson","Grayson",["Gray"],"en",["sur"],"n",2,{boy:51},"English · son of the steward"),
  C0("boy","anthony","Anthony",["Tony"],"la",["lit"],"y",3,{boy:46},"Latin · priceless one"),
  C0("boy","christopher","Christopher",["Chris","Topher"],"gr",["lit"],"r",3,{boy:68},"Greek · bearer of Christ"),
  C0("boy","andrew","Andrew",["Andy","Drew"],"gr",["lit"],"w",2,{boy:73},"Greek · manly and strong"),
  C0("boy","weston","Weston",["Wes"],"en",["sur"],"n",2,{boy:55},"English · western town"),
  C0("boy","waylon","Waylon",[],"en",["sur","lyr"],"n",2,{boy:56},"English · land by the road"),
  C0("boy","nolan","Nolan",[],"ir",["sur"],"n",2,{boy:65},"Irish · champion"),
  C0("boy","ryan","Ryan",[],"ir",["sur"],"n",2,{boy:99},"Irish · little king"),
  C0("boy","adrian","Adrian",["Ade"],"la",["lit"],"n",3,{boy:74},"Latin · from Hadria"),
  C0("u","cameron","Cameron",["Cam"],"sc",["sur"],"n",3,{girl:487,boy:76},"Scottish · crooked nose"),
  C0("boy","beau","Beau",[],"fr",["lyr"],"u",1,{boy:60},"French · handsome"),
  C0("boy","colton","Colton",["Colt"],"en",["sur"],"n",2,{boy:103},"English · coal town"),
  C0("boy","hunter","Hunter",[],"en",["sur","nat"],"r",2,{boy:130},"English · one who hunts"),
  C0("boy","ian","Ian",[],"sc",["lit"],"n",2,{boy:83},"Scottish · God is gracious"),
  C0("boy","landon","Landon",[],"en",["sur"],"n",2,{boy:127},"English · long hill"),
  C0("boy","jonathan","Jonathan",["Jon","Johnny"],"he",["lit"],"n",3,{boy:89},"Hebrew · gift of God"),
  C0("boy","connor","Connor",[],"ir",["sur"],"r",2,{boy:166},"Irish · lover of hounds"),
  C0("boy","jameson","Jameson",["Jamie"],"en",["sur"],"n",3,{boy:137},"English · son of James"),
  C0("u","jordan","Jordan",["Jordy"],"he",["lit"],"n",2,{girl:584,boy:131},"Hebrew · to flow down"),
  C0("boy","carson","Carson",[],"sc",["sur"],"n",2,{boy:124},"Scottish · son of the marsh dwellers"),
  C0("boy","austin","Austin",[],"la",["sur"],"n",2,{boy:113},"Latin · great and venerable"),
  C0("boy","xavier","Xavier",["Xav"],"gr",["lit"],"r",3,{boy:108},"Greek · bright"),
  C0("boy","evan","Evan",[],"we",["lit"],"n",2,{boy:153},"Welsh · God is gracious"),
  C0("boy","damian","Damian",[],"gr",["lit"],"n",3,{boy:109},"Greek · to tame"),
  C0("boy","jason","Jason",["Jay"],"gr",["lit"],"n",2,{boy:165},"Greek · healer"),
  C0("boy","chase","Chase",[],"fr",["sur"],"e",1,{boy:192},"French · huntsman"),
  C0("boy","tyler","Tyler",["Ty"],"en",["sur"],"r",2,{boy:220},"English · tile maker"),
  C0("boy","zachary","Zachary",["Zach","Zack"],"he",["lit"],"y",3,{boy:216},"Hebrew · the Lord remembers"),
  C0("boy","ashton","Ashton",["Ash"],"en",["sur"],"n",2,{boy:197},"English · ash tree town"),
  C0("boy","leon","Leon",[],"gr",["lit"],"n",2,{boy:138},"Greek · lion"),
  C0("boy","dawson","Dawson",[],"en",["sur"],"n",2,{boy:143},"English · son of David"),
  C0("boy","gavin","Gavin",[],"we",["lit"],"n",2,{boy:303},"Welsh · white hawk"),
  C0("u","charlie","Charlie",["Chuck"],"ge",["lit"],"e",2,{girl:133,boy:145},"German · free man"),
  C0("boy","max","Max",[],"la",["lit"],"x",1,{boy:180},"Latin · greatest"),
  C0("boy","rhett","Rhett",[],"en",["lit","sur"],"t",1,{boy:188},"English · advice"),
  C0("boy","kevin","Kevin",["Kev"],"ir",["lit"],"n",2,{boy:221},"Irish · handsome and gentle"),
  C0("u","elliott","Elliott",["Eli"],"he",["sur"],"t",3,{girl:599,boy:160},"Hebrew · the Lord is my God"),
  C0("boy","hayes","Hayes",[],"en",["sur"],"s",1,{boy:162},"English · hedged area"),
  C0("boy","brandon","Brandon",[],"en",["sur"],"n",2,{boy:261},"English · broom-covered hill"),
  C0("boy","justin","Justin",[],"la",["lit"],"n",2,{boy:233},"Latin · just and fair"),
  C0("boy","alan","Alan",["Al"],"ir",["lit"],"n",2,{boy:191},"Irish · handsome"),
  C0("boy","camden","Camden",["Cam"],"en",["sur"],"n",2,{boy:205},"English · winding valley"),
  C0("boy","king","King",[],"en",["sur","lyr"],"g",1,{boy:405},"English · ruler"),
  C0("boy","finn","Finn",[],"ir",["lit"],"n",1,{boy:206},"Irish · fair"),
  C0("boy","tucker","Tucker",["Tuck"],"en",["sur"],"r",2,{boy:181},"English · cloth fuller"),
  C0("boy","tristan","Tristan",["Tris"],"co",["lit"],"n",2,{boy:309},"Cornish · noise or sorrow"),
  C0("boy","jesse","Jesse",["Jess"],"he",["lit"],"e",2,{boy:184},"Hebrew · gift"),
  C0("boy","xander","Xander",["Xan"],"gr",["lit"],"r",2,{boy:259},"Greek · defender of the people"),
  C0("boy","tate","Tate",[],"en",["sur"],"e",1,{boy:194},"English · cheerful"),
  C0("boy","knox","Knox",[],"sc",["sur"],"x",1,{boy:196},"Scottish · round hill"),
  C0("boy","eric","Eric",["Rick"],"no",["lit"],"c",2,{boy:273},"Scandinavian · eternal ruler"),
  C0("u","rory","Rory",[],"ir",["lit"],"y",2,{girl:230,boy:199},"Irish · red king"),
  C0("boy","joel","Joel",[],"he",["lit"],"l",2,{boy:219},"Hebrew · the Lord is God"),
  C0("boy","richard","Richard",["Rich","Rick","Dick"],"ge",["lit"],"d",2,{boy:234},"German · brave ruler"),
  C0("boy","griffin","Griffin",["Griff"],"we",["sur"],"n",2,{boy:222},"Welsh · strong lord"),
  C0("boy","baker","Baker",[],"en",["sur"],"r",2,{boy:217},"English · baker"),
  C0("boy","colt","Colt",[],"en",["sur","nat"],"t",1,{boy:285},"English · young horse"),
  C0("boy","callahan","Callahan",["Cal"],"ir",["sur"],"n",3,{boy:227},"Irish · bright-headed"),
  C0("boy","holden","Holden",[],"en",["sur","lit"],"n",2,{boy:297},"English · deep valley"),
  C0("boy","remington","Remington",["Remy"],"en",["sur"],"n",3,{boy:307},"English · place on the riverbank"),
  C0("boy","jeremy","Jeremy",["Jem"],"he",["lit"],"y",3,{boy:292},"Hebrew · appointed by God"),
  C0("boy","nash","Nash",[],"en",["sur"],"h",1,{boy:255},"English · by the ash tree"),
  C0("boy","bryce","Bryce",[],"sc",["sur"],"e",1,{boy:357},"Scottish · speckled"),
  C0("boy","mark","Mark",[],"la",["lit"],"k",1,{boy:245},"Latin · warlike"),
  C0("u","dallas","Dallas",[],"sc",["sur"],"s",2,{girl:687,boy:238},"Scottish · meadow dwelling"),
  C0("boy","zane","Zane",[],"he",["lyr"],"e",1,{boy:324},"Hebrew · God is gracious"),
  C0("boy","harvey","Harvey",[],"fr",["sur"],"y",2,{boy:251},"French · battle worthy"),
  C0("boy","shepherd","Shepherd",["Shep"],"en",["sur","nat"],"d",2,{boy:246},"English · sheep herder"),
  C0("boy","cade","Cade",[],"en",["sur"],"e",1,{boy:248},"English · round or barrel"),
  C0("boy","maximus","Maximus",["Max"],"la",["lit"],"s",3,{boy:276},"Latin · greatest"),
  C0("boy","paxton","Paxton",["Pax"],"en",["sur"],"n",2,{boy:338},"English · peaceful town"),
  C0("boy","derek","Derek",[],"ge",["lit"],"k",2,{boy:284},"German · ruler of the people"),
  C0("boy","aidan","Aidan",[],"ir",["lit"],"n",2,{boy:326},"Irish · little fire"),
  C0("boy","brian","Brian",[],"ir",["lit"],"n",2,{boy:339},"Irish · high and noble"),
  C0("boy","brady","Brady",[],"ir",["sur"],"y",2,{boy:321},"Irish · broad meadow"),
  C0("boy","bradley","Bradley",["Brad"],"en",["sur"],"y",2,{boy:403},"English · broad meadow"),
  C0("boy","otto","Otto",[],"ge",["lit"],"o",2,{boy:277},"German · wealthy"),
  C0("boy","benson","Benson",["Ben"],"en",["sur"],"n",2,{boy:279},"English · son of Ben"),
  C0("boy","chance","Chance",[],"en",["lyr"],"e",1,{boy:442},"English · good fortune"),
  C0("boy","clayton","Clayton",["Clay"],"en",["sur"],"n",2,{boy:300},"English · town on clay"),
  C0("boy","cody","Cody",[],"ir",["sur"],"y",2,{boy:318},"Irish · helpful"),
  C0("boy","anderson","Anderson",["Andy"],"en",["sur"],"n",3,{boy:363},"English · son of Andrew"),
  C0("boy","sullivan","Sullivan",["Sully"],"ir",["sur"],"n",3,{boy:314},"Irish · dark eyes"),
  C0("boy","kyle","Kyle",[],"sc",["sur"],"e",1,{boy:509},"Scottish · narrow strait"),
  C0("boy","orion","Orion",[],"gr",["lit","nat"],"n",3,{boy:334},"Greek · the hunter"),
  C0("boy","banks","Banks",[],"en",["sur"],"s",1,{boy:310},"English · edge of a river"),
  C0("u","casey","Casey",[],"ir",["sur"],"y",2,{girl:null,boy:320},"Irish · vigilant"),
  C0("boy","colson","Colson",[],"en",["sur"],"n",2,{boy:311},"English · son of Nicholas"),
  C0("boy","archie","Archie",[],"ge",["lit"],"e",2,{boy:301},"German · truly brave"),
  C0("boy","prince","Prince",[],"la",["lyr"],"e",1,{boy:447},"Latin · royal son"),
  C0("boy","julius","Julius",["Jules"],"la",["sur","nat"],"s",3,{boy:424},"Latin · youthful, downy-bearded"),
  C0("boy","jake","Jake",[],"he",["nat"],"e",1,{boy:457},"Hebrew · supplanter"),
  C0("boy","stephen","Stephen",["Steve"],"gr",["sur","nat"],"n",2,{boy:383},"Greek · crown, garland"),
  C0("boy","wade","Wade",[],"en",["sur","nat"],"e",1,{boy:344},"English · at the river crossing"),
  C0("boy","kane","Kane",[],"ir",["sur"],"e",1,{boy:451},"Irish · little battler"),
  C0("boy","marshall","Marshall",[],"fr",["sur","nat"],"l",2,{boy:340},"French · keeper of horses"),
  C0("boy","titus","Titus",[],"la",["lit","nat"],"s",2,{boy:358},"Latin · title of honor"),
  C0("boy","jared","Jared",[],"he",["nat"],"d",2,{boy:396},"Hebrew · descent"),
  C0("boy","corbin","Corbin",[],"fr",["sur","nat"],"n",2,{boy:512},"French · little raven"),
  C0("boy","killian","Killian",[],"ir",["sur","nat"],"n",2,{boy:418},"Irish · little church"),
  C0("boy","tyson","Tyson",["Ty"],"fr",["sur"],"n",2,{boy:531},"French · firebrand"),
  C0("boy","lawson","Lawson",[],"en",["sur"],"n",2,{boy:381},"English · son of Lawrence"),
  C0("boy","grady","Grady",[],"ir",["sur"],"y",2,{boy:373},"Irish · noble, illustrious"),
  C0("boy","donovan","Donovan",["Don"],"ir",["sur"],"n",3,{boy:496},"Irish · dark chieftain"),
  C0("boy","jeffrey","Jeffrey",["Jeff"],"ge",["nat"],"y",2,{boy:552},"German · peaceful pledge"),
  C0("boy","johnny","Johnny",["John"],"he",["nat","pun"],"y",2,{boy:458},"Hebrew · God is gracious"),
  C0("boy","apollo","Apollo",[],"gr",["lit","nat"],"o",3,{boy:445},"Greek · god of light and music"),
  C0("boy","kieran","Kieran",[],"ir",["sur"],"n",2,{boy:389},"Irish · little dark one"),
  C0("boy","royce","Royce",[],"fr",["sur"],"e",1,{boy:500},"French · son of the king"),
  C0("boy","raphael","Raphael",["Rafe"],"he",["nat","lit"],"l",3,{boy:394},"Hebrew · God has healed"),
  C0("boy","noel","Noel",[],"fr",["nat"],"l",2,{boy:478},"French · Christmas, birthday"),
  C0("boy","andy","Andy",[],"gr",["nat"],"y",2,{boy:565},"Greek · manly, brave"),
  C0("boy","trevor","Trevor",[],"we",["sur","nat"],"r",2,{boy:680},"Welsh · big village"),
  C0("boy","hank","Hank",[],"ge",["nat"],"k",1,{boy:413},"German · ruler of the home"),
  C0("boy","reed","Reed",[],"en",["sur","nat"],"d",1,{boy:419},"English · red-haired"),
  C0("boy","troy","Troy",[],"ir",["sur","lit"],"y",1,{boy:533},"Irish · descendant of the foot-soldier"),
  C0("boy","leonidas","Leonidas",["Leo"],"gr",["lit","nat"],"s",4,{boy:510},"Greek · lionlike"),
  C0("boy","boone","Boone",[],"fr",["sur"],"e",1,{boy:423},"French · good"),
  C0("boy","damon","Damon",[],"gr",["lit","nat"],"n",2,{boy:501},"Greek · to tame, subdue"),
  C0("boy","frank","Frank",[],"ge",["nat"],"k",1,{boy:514},"German · free man"),
  C0("boy","lewis","Lewis",[],"ge",["sur","nat"],"s",2,{boy:433},"German · renowned warrior"),
  C0("boy","seth","Seth",[],"he",["nat"],"h",1,{boy:581},"Hebrew · appointed"),
  C0("boy","dalton","Dalton",[],"en",["sur","nat"],"n",2,{boy:448},"English · valley town"),
  C0("u","peyton","Peyton",[],"en",["sur"],"n",2,{girl:199,boy:684},"English · fighting mans estate"),
  C0("boy","tripp","Tripp",[],"en",["sur"],"p",1,{boy:522},"English · traveller"),
  C0("boy","dax","Dax",[],"fr",["sur"],"x",1,{boy:692},"French · from the town of Dax"),
  C0("boy","asa","Asa",[],"he",["nat"],"a",2,{boy:483},"Hebrew · healer, physician"),
  C0("boy","rocco","Rocco",[],"ge",["nat"],"o",2,{boy:459},"German · rest"),
  C0("boy","lucian","Lucian",[],"la",["lit","nat"],"n",3,{boy:462},"Latin · light"),
  C0("boy","mack","Mack",[],"sc",["sur"],"k",1,{boy:463},"Scottish · son of"),
  C0("boy","deacon","Deacon",[],"gr",["sur","nat"],"n",2,{boy:561},"Greek · messenger, servant"),
  C0("boy","gage","Gage",[],"fr",["sur"],"e",1,{boy:973},"French · pledge, oath"),
  C0("boy","denver","Denver",[],"en",["sur","nat"],"r",2,{boy:518},"English · green valley"),
  C0("boy","jonas","Jonas",[],"he",["nat"],"s",2,{boy:599},"Hebrew · dove"),
  C0("boy","caspian","Caspian",["Cas"],"en",["lit","nat"],"n",3,{boy:491},"English · of the Caspian Sea"),
  C0("boy","maximilian","Maximilian",["Max"],"la",["nat"],"n",5,{boy:590},"Latin · greatest"),
  C0("boy","shane","Shane",[],"ir",["nat"],"e",1,{boy:636},"Irish · God is gracious"),
  C0("boy","pierce","Pierce",[],"en",["sur","nat"],"e",1,{boy:505},"English · son of Piers, rock"),
  C0("boy","ridge","Ridge",[],"en",["sur","nat"],"e",1,{boy:530},"English · ridge of land"),
  C0("boy","cannon","Cannon",[],"fr",["sur"],"n",2,{boy:722},"French · church official"),
  C0("boy","lawrence","Lawrence",["Larry"],"la",["sur","nat"],"e",2,{boy:520},"Latin · from Laurentum"),
  C0("u","ariel","Ariel",[],"he",["lit","nat"],"l",3,{girl:356,boy:558},"Hebrew · lion of God"),
  C0("u","drew","Drew",[],"gr",["nat"],"w",1,{girl:706,boy:553},"Greek · manly, brave"),
  C0("boy","dorian","Dorian",[],"gr",["lit","nat"],"n",3,{boy:539},"Greek · of the Dorian tribe"),
  C0("boy","roy","Roy",[],"sc",["sur","nat"],"y",1,{boy:525},"Scottish · red-haired"),
  C0("boy","corey","Corey",[],"ir",["sur","nat"],"y",2,{boy:778},"Irish · from the hollow"),
  C0("boy","dexter","Dexter",["Dex"],"la",["sur","nat"],"r",2,{boy:693},"Latin · right-handed, skilled"),
  C0("boy","morgan","Morgan",[],"we",["sur","nat"],"n",2,{boy:559},"Welsh · sea-circle"),
  C0("boy","scott","Scott",[],"sc",["sur","nat"],"t",1,{boy:534},"Scottish · from Scotland"),
  C0("boy","drake","Drake",[],"en",["sur","nat"],"e",1,{boy:827},"English · dragon, male duck"),
  C0("boy","huxley","Huxley",["Hux"],"en",["sur"],"y",2,{boy:736},"English · Hughs meadow"),
  C0("boy","cal","Cal",[],"la",["nat"],"l",1,{boy:543},"Latin · bald, last"),
  C0("boy","clay","Clay",[],"en",["sur","nat"],"y",1,{boy:573},"English · clay settlement"),
  C0("boy","fletcher","Fletcher",[],"en",["sur"],"r",2,{boy:547},"English · arrow-maker"),
  C0("boy","derrick","Derrick",[],"ge",["nat"],"k",2,{boy:850},"German · ruler of the people"),
  C0("boy","ozzy","Ozzy",[],"en",["nat","pun"],"y",2,{boy:549},"English · divine power"),
  C0("boy","danny","Danny",[],"he",["nat"],"y",2,{boy:628},"Hebrew · God is my judge"),
  C0("boy","davis","Davis",[],"he",["sur","nat"],"s",2,{boy:668},"Hebrew · son of David"),
  C0("boy","ronald","Ronald",["Ron"],"no",["nat"],"d",2,{boy:638},"Scandinavian · rulers counselor"),
  C0("boy","rocky","Rocky",[],"en",["nat","pun"],"y",2,{boy:568},"English · rest, of the rocks"),
  C0("boy","skyler","Skyler",["Sky"],"en",["sur"],"r",2,{boy:783},"English · scholar, sky"),
  C0("boy","chandler","Chandler",[],"en",["sur"],"r",2,{boy:753},"English · candle-maker"),
  C0("boy","rhodes","Rhodes",[],"gr",["sur","nat"],"s",1,{boy:575},"Greek · where roses grow"),
  C0("boy","case","Case",[],"en",["sur","nat"],"e",1,{boy:733},"English · from a surname meaning box maker or settlement"),
  C0("u","jamie","Jamie",[],"sc",["nat"],"e",2,{girl:858,boy:577},"Scottish · pet form of James, supplanter"),
  C0("boy","colby","Colby",["Cole"],"en",["sur","nat"],"y",2,{boy:615},"English · from a place name meaning coal town"),
  C0("boy","alec","Alec",[],"sc",["nat"],"c",2,{boy:977},"Scottish · short form of Alexander, defender of men"),
  C0("u","taylor","Taylor",["Tay"],"en",["sur","nat"],"r",2,{girl:403,boy:685},"English · occupational surname for a tailor"),
  C0("boy","keith","Keith",[],"sc",["sur","nat"],"h",1,{boy:801},"Scottish · from a place name meaning wood"),
  C0("boy","donald","Donald",["Don","Donnie"],"sc",["nat"],"d",2,{boy:690},"Scottish · world ruler"),
  C0("boy","watson","Watson",[],"en",["sur"],"n",2,{boy:null},"English · surname meaning son of Walter"),
  C0("boy","edison","Edison",["Ed"],"en",["sur"],"n",3,{boy:870},"English · surname meaning son of Edward"),
  C0("boy","jerry","Jerry",[],"en",["nat"],"y",2,{boy:907},"English · pet form of Gerald or Jeremy"),
  C0("boy","mac","Mac",[],"sc",["nat","pun"],"c",1,{boy:696},"Scottish · short form of names meaning son of"),
  C0("u","quincy","Quincy",[],"fr",["sur"],"y",2,{girl:815,boy:654},"French · from a place name, estate of Quintus"),
  C0("boy","lachlan","Lachlan",["Lochie"],"sc",["nat"],"n",2,{boy:606},"Scottish · from the land of lochs"),
  C0("boy","marvin","Marvin",[],"we",["nat"],"n",2,{boy:699},"Welsh · sea friend"),
  C0("boy","zeke","Zeke",[],"he",["nat"],"e",1,{boy:803},"Hebrew · short form of Ezekiel, God strengthens"),
  C0("boy","trenton","Trenton",["Trent"],"en",["sur","nat"],"n",2,{boy:null},"English · from a place name, Trent town"),
  C0("boy","dustin","Dustin",["Dusty"],"en",["nat"],"n",2,{boy:729},"English · brave warrior, from Thurstan"),
  C0("boy","houston","Houston",[],"sc",["sur","nat"],"n",2,{boy:675},"Scottish · from Hugh town"),
  C0("boy","kingsley","Kingsley",["King"],"en",["sur"],"y",2,{boy:null},"English · from the kings meadow"),
  C0("boy","tony","Tony",[],"la",["nat"],"y",2,{boy:784},"Latin · short form of Anthony, priceless"),
  C0("boy","duke","Duke",[],"en",["nat","lit"],"e",1,{boy:695},"English · title meaning leader or noble"),
  C0("boy","leonard","Leonard",["Leo","Len"],"ge",["nat"],"d",2,{boy:637},"German · brave as a lion"),
  C0("boy","dennis","Dennis",["Den"],"gr",["nat"],"s",2,{boy:707},"Greek · follower of Dionysus"),
  C0("boy","wilson","Wilson",[],"en",["sur"],"n",2,{boy:673},"English · surname meaning son of William"),
  C0("boy","chris","Chris",[],"gr",["nat"],"s",1,{boy:646},"Greek · short form of Christopher, bearer of Christ"),
  C0("boy","sam","Sam",[],"he",["nat"],"m",1,{boy:647},"Hebrew · short form of Samuel, God has heard"),
  C0("boy","trey","Trey",[],"en",["nat","pun"],"y",1,{boy:890},"English · three, often a third son"),
  C0("boy","nixon","Nixon",[],"en",["sur"],"n",2,{boy:null},"English · surname meaning son of Nicholas"),
  C0("boy","ty","Ty",[],"en",["nat"],"y",1,{boy:813},"English · short form of Tyler or Tyrone"),
  C0("boy","wayne","Wayne",[],"en",["sur","nat"],"e",1,{boy:655},"English · occupational surname for a wagon maker"),
  C0("boy","bryant","Bryant",[],"ir",["sur","nat"],"t",2,{boy:null},"Irish · surname form of Brian, noble and strong"),
  C0("boy","tommy","Tommy",[],"gr",["nat"],"y",2,{boy:658},"Greek · pet form of Thomas, twin"),
  C0("boy","marcel","Marcel",[],"fr",["nat"],"l",2,{boy:731},"French · little warrior, from Marcus"),
  C0("u","lennon","Lennon",[],"ir",["sur","lyr"],"n",2,{girl:214,boy:808},"Irish · surname meaning little cloak or lover"),
  C0("boy","nelson","Nelson",[],"en",["sur"],"n",2,{boy:825},"English · surname meaning son of Neil"),
  C0("boy","devon","Devon",[],"en",["sur","nat"],"n",2,{boy:null},"English · from the county of Devon"),
  C0("boy","trace","Trace",[],"en",["nat","lit"],"e",1,{boy:758},"English · short form of Tracy, a path"),
  C0("boy","alvin","Alvin",[],"en",["nat"],"n",2,{boy:838},"English · noble friend"),
  C0("boy","junior","Junior",[],"la",["nat"],"r",2,{boy:752},"Latin · the younger"),
  C0("boy","rex","Rex",[],"la",["lit","nat"],"x",1,{boy:859},"Latin · king"),
  C0("boy","clyde","Clyde",[],"sc",["sur","nat"],"e",1,{boy:743},"Scottish · from the river Clyde"),
  C0("boy","roger","Roger",["Rog"],"ge",["nat"],"r",2,{boy:834},"German · famous spear"),
  C0("boy","brock","Brock",[],"en",["sur","nat"],"k",1,{boy:810},"English · surname meaning badger"),
  C0("boy","cullen","Cullen",[],"ir",["sur","nat"],"n",2,{boy:null},"Irish · surname meaning handsome"),
  C0("boy","harry","Harry",[],"en",["nat"],"y",2,{boy:775},"English · pet form of Henry, home ruler"),
  C0("boy","ricky","Ricky",[],"ge",["nat"],"y",2,{boy:949},"German · pet form of Richard, brave ruler"),
  C0("boy","evander","Evander",["Evan"],"gr",["nat","lit"],"r",3,{boy:698},"Greek · good man"),
  C0("boy","lee","Lee",[],"en",["sur","nat"],"e",1,{boy:727},"English · from the meadow or clearing"),
  C0("boy","bridger","Bridger",[],"en",["sur","nat"],"r",2,{boy:701},"English · one who lives by a bridge"),
  C0("u","robin","Robin",[],"en",["nat","lyr"],"n",2,{girl:704,boy:705},"English · pet form of Robert, bright fame"),
  C0("boy","jefferson","Jefferson",["Jeff"],"en",["sur"],"n",3,{boy:831},"English · surname meaning son of Geoffrey"),
  C0("boy","wes","Wes",[],"en",["nat"],"s",1,{boy:716},"English · short form of Wesley, west meadow"),
  C0("boy","grey","Grey",[],"en",["sur","nat"],"y",1,{boy:null},"English · the color grey, from a surname"),
  C0("boy","darren","Darren",[],"ir",["nat"],"n",2,{boy:null},"Irish · little great one"),
  C0("boy","neil","Neil",[],"ir",["nat"],"l",1,{boy:851},"Irish · champion or cloud"),
  C0("boy","jagger","Jagger",[],"en",["sur","lyr"],"r",2,{boy:885},"English · surname meaning carter or peddler"),
  C0("boy","brendan","Brendan",[],"ir",["nat"],"n",2,{boy:null},"Irish · prince"),
  C0("boy","ray","Ray",[],"en",["nat"],"y",1,{boy:792},"English · short form of Raymond, wise protector"),
  C0("boy","mitchell","Mitchell",["Mitch"],"en",["sur","nat"],"l",2,{boy:954},"English · surname form of Michael, who is like God"),
  C0("boy","jimmy","Jimmy",[],"en",["nat"],"y",2,{boy:847},"English · pet form of James, supplanter"),
  C0("boy","joe","Joe",[],"he",["nat"],"e",1,{boy:994},"Hebrew · short form of Joseph, he will add"),
  C0("boy","eddie","Eddie",[],"en",["nat"],"e",2,{boy:861},"English · pet form of Edward, wealthy guardian"),
  C0("boy","stanley","Stanley",["Stan"],"en",["sur","nat"],"y",2,{boy:863},"English · from the stony meadow"),
  C0("boy","douglas","Douglas",["Doug"],"sc",["sur","nat"],"s",2,{boy:807},"Scottish · from the dark river"),
  C0("boy","rudy","Rudy",[],"ge",["nat"],"y",2,{boy:739},"German · pet form of Rudolph, famous wolf"),
  C0("u","leighton","Leighton",[],"en",["sur","nat"],"n",2,{girl:342,boy:null},"English · from the herb garden town"),
  C0("boy","bode","Bode",[],"sc",["nat","lyr"],"e",1,{boy:748},"Scottish · messenger or herald"),
  C0("boy","melvin","Melvin",["Mel"],"sc",["nat"],"n",2,{boy:959},"Scottish · smooth chief"),
  C0("boy","orlando","Orlando",[],"ge",["lit","lyr"],"o",3,{boy:873},"German · famous land, form of Roland"),
  C0("boy","bear","Bear",[],"en",["nat","lit"],"r",1,{boy:853},"English · the animal, symbol of strength"),
  C0("boy","ben","Ben",[],"he",["nat"],"n",1,{boy:843},"Hebrew · short form of Benjamin, son of the right hand"),
  C0("boy","lance","Lance",[],"fr",["nat"],"e",1,{boy:862},"French · land or spear"),
  C0("boy","harley","Harley",[],"en",["sur","nat"],"y",2,{boy:null},"English · from the hares meadow"),
  C0("boy","barron","Barron",[],"en",["sur","nat"],"n",2,{boy:790},"English · young warrior or nobleman"),
  C0("boy","dash","Dash",[],"en",["nat","lit"],"h",1,{boy:null},"English · short form of Dashiell, lively"),
  C0("boy","fisher","Fisher",[],"en",["sur","nat"],"r",2,{boy:791},"English · occupational surname for a fisherman"),
  C0("boy","everest","Everest",[],"en",["nat","lit"],"t",3,{boy:796},"English · the great mountain, from a place name"),
  C0("boy","kellen","Kellen",["Kel"],"ir",["sur"],"n",2,{boy:null},"Irish · slender"),
  C0("boy","crosby","Crosby",["Cros"],"sc",["sur"],"y",2,{boy:null},"Scandinavian · village with crosses"),
  C0("boy","ira","Ira",[],"he",["lit"],"a",2,{boy:822},"Hebrew · watchful"),
  C0("boy","brewer","Brewer",[],"en",["sur","vin"],"r",2,{boy:804},"English · one who brews"),
  C0("boy","mccoy","Mccoy",[],"ir",["sur"],"y",2,{boy:806},"Irish · son of Aodh"),
  C0("boy","gary","Gary",[],"ge",["nat"],"y",2,{boy:null},"German · spear"),
  C0("boy","braden","Braden",["Brade"],"ir",["sur"],"n",2,{boy:null},"Irish · broad valley"),
  C0("boy","jones","Jones",[],"we",["sur"],"s",1,{boy:811},"Welsh · son of John"),
  C0("boy","carl","Carl",[],"ge",["nat"],"l",1,{boy:null},"German · free man"),
  C0("u","emory","Emory",[],"ge",["sur"],"y",3,{girl:339,boy:883},"German · brave power"),
  C0("boy","dane","Dane",[],"en",["sur"],"e",1,{boy:821},"English · from Denmark"),
  C0("boy","maurice","Maurice",["Mo"],"fr",["nat"],"e",2,{boy:null},"French · dark skinned"),
  C0("boy","alfred","Alfred",["Alf","Fred"],"en",["nat"],"d",2,{boy:840},"English · elf counsel"),
  C0("boy","larry","Larry",[],"la",["nat"],"y",2,{boy:null},"Latin · from Laurentum"),
  C0("boy","darwin","Darwin",[],"en",["sur"],"n",2,{boy:961},"English · dear friend"),
  C0("boy","eugene","Eugene",["Gene"],"gr",["nat"],"e",2,{boy:943},"Greek · well born"),
  C0("boy","benny","Benny",[],"he",["nat"],"y",2,{boy:841},"Hebrew · son of the right hand"),
  C0("boy","bobby","Bobby",[],"ge",["nat"],"y",2,{boy:null},"German · bright fame"),
  C0("boy","heath","Heath",[],"en",["sur","nat"],"h",1,{boy:932},"English · heathland dweller"),
  C0("boy","bronson","Bronson",[],"en",["sur"],"n",2,{boy:null},"English · son of the brown one"),
  C0("boy","judson","Judson",["Jud"],"en",["sur"],"n",2,{boy:934},"English · son of Jordan"),
  C0("boy","randy","Randy",[],"ge",["nat"],"y",2,{boy:null},"German · shield wolf"),
  C0("boy","rodney","Rodney",["Rod"],"en",["sur"],"y",2,{boy:null},"English · island clearing"),
  C0("boy","van","Van",[],"en",["sur"],"n",1,{boy:972},"English · short for names with van"),
  C0("boy","adler","Adler",[],"ge",["sur"],"r",2,{boy:871},"German · eagle"),
  C0("boy","branson","Branson",[],"en",["sur"],"n",2,{boy:null},"English · son of Brand"),
  C0("boy","joey","Joey",[],"he",["nat"],"y",2,{boy:877},"Hebrew · God will increase"),
  C0("boy","stefan","Stefan",["Stef"],"ge",["nat"],"n",2,{boy:null},"German · crown"),
  C0("boy","blaine","Blaine",[],"sc",["sur"],"e",1,{boy:992},"Scottish · yellow"),
  C0("boy","jacoby","Jacoby",["Jake"],"he",["sur"],"y",3,{boy:null},"Hebrew · supplanter"),
  C0("boy","shepard","Shepard",["Shep"],"en",["sur","vin"],"d",2,{boy:892},"English · sheep herder"),
  C0("boy","dion","Dion",[],"gr",["nat"],"n",2,{boy:null},"Greek · of Zeus"),
  C0("boy","kelvin","Kelvin",["Kel"],"sc",["sur"],"n",2,{boy:null},"Scottish · narrow river"),
  C0("u","scottie","Scottie",["Scott"],"sc",["nat"],"e",2,{girl:126,boy:909},"Scottish · from Scotland"),
  C0("boy","beck","Beck",[],"en",["sur","nat"],"k",1,{boy:913},"English · stream"),
  C0("boy","harold","Harold",["Hal","Harry"],"en",["nat"],"d",2,{boy:993},"English · army ruler"),
  C0("boy","stone","Stone",[],"en",["sur","nat"],"e",1,{boy:916},"English · stone"),
  C0("boy","fox","Fox",[],"en",["sur","nat"],"x",1,{boy:null},"English · fox"),
  C0("u","frankie","Frankie",[],"la",["nat"],"e",2,{girl:552,boy:922},"Latin · Frenchman"),
  C0("boy","brett","Brett",[],"en",["sur"],"t",1,{boy:null},"English · a Breton"),
  C0("boy","caius","Caius",[],"la",["lit"],"s",2,{boy:927},"Latin · rejoice"),
  C0("boy","gordon","Gordon",[],"sc",["sur"],"n",2,{boy:null},"Scottish · great hill"),
  C0("boy","terry","Terry",[],"ge",["nat"],"y",2,{boy:null},"German · power of the tribe"),
  C0("boy","vance","Vance",[],"en",["sur"],"e",1,{boy:null},"English · marshland"),
  C0("boy","howard","Howard",["Howie"],"en",["sur"],"d",2,{boy:null},"English · high guardian"),
  C0("boy","trent","Trent",[],"en",["sur","nat"],"t",1,{boy:null},"English · gushing waters"),
  C0("boy","turner","Turner",[],"en",["sur","vin"],"r",2,{boy:null},"English · lathe worker"),
  C0("boy","will","Will",[],"ge",["nat"],"l",1,{boy:null},"German · resolute protector"),
  C0("u","marley","Marley",[],"en",["sur"],"y",2,{girl:322,boy:null},"English · pleasant meadow"),
  C0("boy","marlon","Marlon",[],"fr",["nat"],"n",2,{boy:null},"French · little hawk"),
  C0("u","palmer","Palmer",[],"en",["sur","vin"],"r",2,{girl:232,boy:995},"English · pilgrim"),
  C0("boy","bowie","Bowie",[],"sc",["sur"],"e",2,{boy:null},"Scottish · yellow haired"),
  C0("boy","landry","Landry",[],"fr",["sur"],"y",2,{boy:996},"French · ruler"),
  C0("boy","elon","Elon",[],"he",["lit"],"n",2,{boy:null},"Hebrew · oak tree"),
  C0("boy","granger","Granger",[],"en",["sur","vin"],"r",2,{boy:null},"English · farm steward"),
  C0("boy","toby","Toby",[],"he",["nat"],"y",2,{boy:979},"Hebrew · God is good"),
  C0("boy","keenan","Keenan",[],"ir",["sur"],"n",2,{boy:null},"Irish · ancient"),
  C0("boy","reginald","Reginald",["Reggie"],"ge",["nat"],"d",3,{boy:null},"German · counsel ruler"),
  C0("boy","ronnie","Ronnie",[],"no",["nat"],"e",2,{boy:null},"Scandinavian · ruler with counsel"),
  C0("boy","aurelius","Aurelius",["Rel"],"la",["lit"],"s",4,{boy:991},"Latin · golden"),
  C0("boy","dimitri","Dimitri",[],"gr",["nat"],"i",3,{boy:null},"Greek · follower of Demeter"),
  C0("boy","willie","Willie",[],"ge",["nat"],"e",2,{boy:null},"German · resolute protector"),
  C0("boy","harris","Harris",[],"en",["sur"],"s",2,{boy:null},"English · son of Harry"),
  C0("boy","billy","Billy",[],"ge",["nat"],"y",2,{boy:null},"German · resolute protector"),
  C0("girl","sophia","Sophia",["Sophie","Soph"],"gr",["nat"],"a",3,{girl:5},"Greek · wisdom"),
  C0("girl","mia","Mia",[],"la",["sur"],"a",2,{girl:6},"Latin · mine or beloved"),
  C0("girl","isabella","Isabella",["Bella","Izzy","Belle"],"he",["lit"],"a",4,{girl:7},"Hebrew · pledged to God"),
  C0("girl","harper","Harper",["Harp"],"en",["sur","vin"],"r",2,{girl:16},"English · harp player"),
  C0("girl","luna","Luna",["Lu"],"la",["nat"],"a",2,{girl:27},"Latin · moon"),
  C0("girl","mila","Mila",[],"sc",["sur"],"a",2,{girl:43},"Slavic · gracious or dear"),
  C0("girl","chloe","Chloe",["Clo"],"gr",["lit"],"e",2,{girl:23},"Greek · blooming"),
  C0("girl","ellie","Ellie",["El"],"gr",["lyr"],"e",2,{girl:24},"Greek · bright shining one"),
  C0("girl","aria","Aria",["Ari"],"la",["lyr"],"a",3,{girl:26},"Italian · melody or air"),
  C0("girl","madison","Madison",["Maddie"],"en",["sur"],"n",3,{girl:40},"English · son of Maud"),
  C0("girl","layla","Layla",["Lay"],"he",["lyr"],"a",2,{girl:36},"Arabic · night"),
  C0("girl","grace","Grace",["Gracie"],"la",["nat","vin"],"e",1,{girl:38},"Latin · grace or favor"),
  C0("girl","zoe","Zoe",["Zo"],"gr",["lit"],"e",2,{girl:31},"Greek · life"),
  C0("girl","victoria","Victoria",["Vicky","Tori","Vic"],"la",["nat"],"a",4,{girl:54},"Latin · victory"),
  C0("girl","willow","Willow",["Will"],"en",["nat"],"w",2,{girl:44},"English · willow tree"),
  C0("girl","emilia","Emilia",["Emmy","Mia"],"la",["lit"],"a",4,{girl:45},"Latin · rival or eager"),
  C0("girl","elena","Elena",["Lena","Ellie"],"gr",["lit"],"a",3,{girl:42},"Greek · bright shining light"),
  C0("girl","everly","Everly",["Evie"],"en",["sur"],"y",3,{girl:91},"English · from the boar meadow"),
  C0("girl","addison","Addison",["Addie"],"en",["sur"],"n",3,{girl:84},"English · son of Adam"),
  C0("girl","leah","Leah",["Lee"],"he",["lit"],"h",2,{girl:58},"Hebrew · weary or delicate"),
  C0("girl","maya","Maya",["May"],"gr",["lit"],"a",2,{girl:62},"Greek · good mother or illusion"),
  C0("girl","delilah","Delilah",["Lila","Dee"],"he",["lit"],"h",3,{girl:51},"Hebrew · delicate"),
  C0("girl","brooklyn","Brooklyn",["Brook"],"en",["sur","nat"],"n",2,{girl:118},"English · broken land or marsh stream"),
  C0("girl","claire","Claire",[],"fr",["nat"],"e",1,{girl:68},"French · clear and bright"),
  C0("girl","bella","Bella",[],"la",["lyr"],"a",2,{girl:136},"Latin · beautiful"),
  C0("girl","skylar","Skylar",["Sky"],"en",["nat","vin"],"r",2,{girl:167},"Dutch · scholar"),
  C0("girl","autumn","Autumn",[],"la",["nat"],"n",2,{girl:88},"Latin · the fall season"),
  C0("girl","kennedy","Kennedy",["Kenny"],"ir",["sur"],"y",3,{girl:85},"Irish · helmeted chief"),
  C0("girl","millie","Millie",[],"ge",["lyr"],"e",2,{girl:73},"German · strong in work"),
  C0("girl","maria","Maria",["Ria"],"he",["lit"],"a",3,{girl:87},"Hebrew · beloved or bitter"),
  C0("girl","daisy","Daisy",[],"en",["nat"],"y",2,{girl:75},"English · the daisy flower"),
  C0("girl","athena","Athena",["Thena"],"gr",["lit"],"a",3,{girl:109},"Greek · goddess of wisdom"),
  C0("girl","gabriella","Gabriella",["Gabby","Ella","Bri"],"he",["lit"],"a",4,{girl:105},"Hebrew · God is my strength"),
  C0("girl","hailey","Hailey",["Hail"],"en",["sur","nat"],"y",2,{girl:104},"English · hay meadow"),
  C0("girl","melody","Melody",["Mel"],"gr",["lyr","vin"],"y",3,{girl:79},"Greek · song or tune"),
  C0("girl","allison","Allison",["Allie","Ally"],"ge",["sur"],"n",3,{girl:103},"German · noble"),
  C0("girl","jade","Jade",[],"la",["nat"],"e",1,{girl:95},"Spanish · the jade stone"),
  C0("girl","madeline","Madeline",["Maddie"],"gr",["lit"],"e",3,{girl:81},"Greek · woman of Magdala"),
  C0("girl","sarah","Sarah",["Sadie","Sally"],"he",["lit"],"h",2,{girl:90},"Hebrew · princess"),
  C0("girl","samantha","Samantha",["Sam","Sammy"],"he",["lit"],"a",3,{girl:151},"Hebrew · told by God"),
  C0("girl","piper","Piper",[],"en",["sur","vin"],"r",2,{girl:155},"English · pipe player"),
  C0("girl","eva","Eva",["Evie"],"he",["lit"],"a",2,{girl:134},"Hebrew · life or living one"),
  C0("girl","sienna","Sienna",["Sia"],"la",["nat"],"a",3,{girl:94},"Italian · reddish brown earth"),
  C0("girl","brielle","Brielle",["Bri"],"he",["lyr"],"e",2,{girl:143},"Hebrew · God is my strength"),
  C0("girl","melanie","Melanie",["Mel"],"gr",["lit"],"e",3,{girl:142},"Greek · dark or black"),
  C0("girl","reagan","Reagan",[],"ir",["sur"],"n",2,{girl:248},"Irish · little ruler"),
  C0("girl","mackenzie","Mackenzie",["Mack","Kenzie"],"sc",["sur"],"e",3,{girl:228},"Scottish · son of the fair one"),
  C0("girl","hallie","Hallie",[],"en",["sur","lyr"],"e",2,{girl:120},"English · dweller at the hall meadow"),
  C0("girl","elsie","Elsie",[],"he",["lyr"],"e",2,{girl:123},"Hebrew · pledged to God"),
  C0("girl","ashley","Ashley",["Ash"],"en",["sur","nat"],"y",2,{girl:164},"English · ash tree meadow"),
  C0("girl","valerie","Valerie",["Val"],"la",["lit"],"e",3,{girl:127},"Latin · strong and healthy"),
  C0("girl","kylie","Kylie",["Ky"],"ir",["sur"],"e",2,{girl:204},"Irish · narrow or graceful"),
  C0("girl","ember","Ember",[],"en",["nat"],"r",2,{girl:154},"English · glowing coal"),
  C0("girl","alexandra","Alexandra",["Alex","Lexi","Sandra"],"gr",["lit"],"a",4,{girl:237},"Greek · defender of mankind"),
  C0("girl","alana","Alana",["Lana"],"ir",["lyr"],"a",3,{girl:140},"Irish · little rock or harmony"),
  C0("girl","jasmine","Jasmine",["Jas","Jazzy"],"en",["nat"],"e",2,{girl:206},"Persian · jasmine flower"),
  C0("girl","summer","Summer",[],"en",["nat"],"r",2,{girl:152},"English · the summer season"),
  C0("girl","brianna","Brianna",["Bri"],"ir",["lit"],"a",3,{girl:222},"Irish · noble and strong"),
  C0("girl","andrea","Andrea",["Andie"],"gr",["lit"],"a",3,{girl:235},"Greek · brave and manly"),
  C0("girl","river","River",[],"en",["nat"],"r",2,{girl:220},"English · flowing water"),
  C0("girl","ariella","Ariella",["Ari","Ella"],"he",["lyr"],"a",4,{girl:174},"Hebrew · lion of God"),
  C0("girl","anastasia","Anastasia",["Ana","Stacy"],"gr",["lit"],"a",5,{girl:163},"Greek · resurrection"),
  C0("girl","bailey","Bailey",[],"en",["sur"],"y",2,{girl:209},"English · bailiff or steward"),
  C0("girl","callie","Callie",[],"gr",["lyr"],"e",2,{girl:175},"Greek · beautiful"),
  C0("girl","molly","Molly",[],"he",["lyr"],"y",2,{girl:196},"Hebrew · bitter or beloved"),
  C0("girl","harmony","Harmony",[],"gr",["vin"],"y",3,{girl:276},"Greek · agreement or concord"),
  C0("girl","ada","Ada",[],"ge",["lit"],"a",2,{girl:219},"German · noble"),
  C0("girl","annie","Annie",[],"he",["lyr"],"e",2,{girl:182},"Hebrew · grace or favor"),
  C0("girl","kimberly","Kimberly",["Kim","Kimmy"],"en",["sur"],"y",3,{girl:303},"English · royal fortress meadow"),
  C0("girl","lila","Lila",[],"he",["lyr"],"a",2,{girl:187},"Hebrew · night"),
  C0("girl","celeste","Celeste",["Celie"],"la",["lit"],"e",2,{girl:188},"Latin · heavenly"),
  C0("girl","amy","Amy",[],"fr",["lyr"],"y",2,{girl:257},"French · beloved"),
  C0("girl","juliana","Juliana",["Julie","Jules"],"la",["lit"],"a",4,{girl:256},"Latin · youthful"),
  C0("girl","london","London",[],"en",["sur","nat"],"n",2,{girl:431},"English · the city of London"),
  C0("girl","aspen","Aspen",[],"en",["nat"],"n",2,{girl:266},"English · aspen tree"),
  C0("girl","presley","Presley",[],"en",["sur"],"y",2,{girl:225},"English · priests meadow"),
  C0("girl","alyssa","Alyssa",["Lyssa"],"gr",["lit"],"a",3,{girl:453},"Greek · rational or noble"),
  C0("girl","noelle","Noelle",[],"fr",["lit"],"e",2,{girl:202},"French · Christmas"),
  C0("girl","gracie","Gracie",[],"la",["lyr"],"e",2,{girl:227},"Latin · grace or favor"),
  C0("girl","vanessa","Vanessa",["Nessa","Ness"],"gr",["lit"],"a",3,{girl:377},"Greek · butterfly"),
  C0("girl","leia","Leia",[],"he",["lyr"],"a",2,{girl:297},"Hebrew · weary or delicate"),
  C0("girl","delaney","Delaney",["Laney"],"ir",["sur"],"y",3,{girl:242},"Irish · dark challenger"),
  C0("girl","annabelle","Annabelle",["Anna","Belle"],"he",["lit"],"e",3,{girl:343},"Hebrew · grace and beauty"),
  C0("girl","jane","Jane",["Janie"],"he",["lit"],"e",1,{girl:221},"Hebrew · God is gracious"),
  C0("girl","angela","Angela",["Angie"],"gr",["lit"],"a",3,{girl:408},"Greek · messenger or angel"),
  C0("girl","rachel","Rachel",["Rae"],"he",["lit"],"l",2,{girl:250},"Hebrew · ewe or gentle one"),
  C0("girl","alexa","Alexa",["Lexi"],"gr",["lit"],"a",3,{girl:null},"Greek · defender of mankind"),
  C0("girl","lauren","Lauren",["Lori"],"la",["lit"],"n",2,{girl:401},"Latin · laurel or victory"),
  C0("girl","brooke","Brooke",[],"en",["nat","sur"],"e",1,{girl:313},"English · small stream"),
  C0("girl","lola","Lola",[],"la",["lyr"],"a",2,{girl:275},"Spanish · lady of sorrows"),
  C0("girl","sydney","Sydney",["Syd"],"en",["sur"],"y",2,{girl:348},"English · wide meadow island"),
  C0("girl","octavia","Octavia",["Tavi"],"la",["lit"],"a",4,{girl:308},"Latin · eighth"),
  C0("girl","rebecca","Rebecca",["Becca","Becky"],"he",["lit"],"a",3,{girl:350},"Hebrew · to bind or join"),
  C0("girl","lena","Lena",[],"gr",["lit"],"a",2,{girl:279},"Greek · bright shining light"),
  C0("girl","joanna","Joanna",["Jo","Anna"],"he",["lit"],"a",3,{girl:306},"Hebrew · God is gracious"),
  C0("girl","dakota","Dakota",["Kota"],"en",["sur","nat"],"a",3,{girl:296},"Sioux · friend or ally"),
  C0("girl","camilla","Camilla",["Cami"],"la",["lit"],"a",3,{girl:361},"Latin · young ceremonial attendant"),
  C0("girl","evie","Evie",[],"he",["lyr"],"e",2,{girl:270},"Hebrew · life or living one"),
  C0("girl","nicole","Nicole",["Nicki"],"gr",["lit"],"e",2,{girl:383},"Greek · victory of the people"),
  C0("girl","jocelyn","Jocelyn",["Joss"],"ge",["sur"],"n",3,{girl:393},"German · member of the Gauts"),
  C0("girl","paige","Paige",[],"en",["sur"],"e",1,{girl:346},"English · young attendant"),
  C0("girl","rosie","Rosie",[],"la",["nat","lyr"],"e",2,{girl:283},"Latin · rose flower"),
  C0("girl","phoenix","Phoenix",[],"gr",["nat","vin"],"x",2,{girl:534},"Greek · dark red or reborn bird"),
  C0("girl","angelina","Angelina",["Angie","Lina"],"gr",["lit"],"a",4,{girl:347},"Greek · messenger or angel"),
  C0("girl","aurelia","Aurelia",["Aura","Rilla"],"la",["lit"],"a",4,{girl:290},"Latin · golden"),
  C0("girl","sylvia","Sylvia",["Syl","Sylvie"],"la",["nat","lit"],"a",3,{girl:300},"Latin · from the forest"),
  C0("girl","kendall","Kendall",["Ken","Kenny"],"en",["sur"],"l",2,{girl:328},"English · valley of the river Kent"),
  C0("girl","elaine","Elaine",["Lainey"],"fr",["lit"],"e",2,{girl:305},"French · shining light"),
  C0("girl","francesca","Francesca",["Fran","Frankie","Cesca"],"la",["lit"],"a",3,{girl:307},"Latin · free one"),
  C0("girl","elodie","Elodie",["Ellie","Lodie"],"fr",["lyr"],"e",3,{girl:310},"French · foreign riches"),
  C0("girl","sabrina","Sabrina",["Brina","Bri"],"la",["lit","lyr"],"a",3,{girl:321},"Latin · river Severn"),
  C0("girl","serena","Serena",["Reni"],"la",["lit","nat"],"a",3,{girl:325},"Latin · calm serene"),
  C0("girl","regina","Regina",["Gina","Reggie"],"la",["lit"],"a",3,{girl:395},"Latin · queen"),
  C0("girl","hattie","Hattie",["Hat"],"ge",["lit"],"e",2,{girl:334},"German · estate ruler"),
  C0("girl","mira","Mira",["Mir"],"la",["lit","lyr"],"a",2,{girl:335},"Latin · wonderful"),
  C0("girl","michelle","Michelle",["Shelly","Mich"],"fr",["lit"],"e",2,{girl:465},"French · who is like God"),
  C0("girl","demi","Demi",[],"fr",["lit"],"i",2,{girl:381},"French · half"),
  C0("girl","melissa","Melissa",["Mel","Missy"],"gr",["nat","lit"],"a",3,{girl:420},"Greek · honey bee"),
  C0("girl","laura","Laura",["Laurie"],"la",["nat","lit"],"a",2,{girl:379},"Latin · laurel"),
  C0("girl","elle","Elle",[],"fr",["lit"],"e",1,{girl:461},"French · she"),
  C0("girl","gabrielle","Gabrielle",["Gabby","Brielle"],"he",["lit"],"e",3,{girl:633},"Hebrew · God is my strength"),
  C0("girl","lana","Lana",[],"la",["lyr"],"a",2,{girl:406},"Latin · light"),
  C0("girl","felicity","Felicity",["Fliss"],"la",["lit"],"y",4,{girl:473},"Latin · happiness"),
  C0("girl","annalise","Annalise",["Anna","Annie","Liese"],"ge",["lyr"],"e",3,{girl:409},"German · grace and oath"),
  C0("girl","veronica","Veronica",["Ronnie","Vera"],"la",["lit"],"a",4,{girl:427},"Latin · true image"),
  C0("girl","carmen","Carmen",[],"la",["lit","lyr"],"n",2,{girl:389},"Latin · song"),
  C0("girl","helen","Helen",["Nell","Lena"],"gr",["lit"],"n",2,{girl:462},"Greek · shining light"),
  C0("girl","bonnie","Bonnie",[],"sc",["lit"],"e",2,{girl:396},"Scottish · pretty good"),
  C0("girl","joy","Joy",[],"en",["lit","nat"],"y",1,{girl:419},"English · joy"),
  C0("girl","jessica","Jessica",["Jess","Jessie"],"he",["lit"],"a",3,{girl:665},"Hebrew · to behold"),
  C0("girl","allie","Allie",[],"ge",["lit"],"e",2,{girl:569},"German · noble"),
  C0("girl","kate","Kate",["Katie","Kat"],"gr",["lit"],"e",1,{girl:522},"Greek · pure"),
  C0("girl","holly","Holly",[],"en",["nat"],"y",2,{girl:416},"English · holly tree"),
  C0("girl","paris","Paris",[],"gr",["lit","sur"],"s",2,{girl:592},"Greek · the city Paris"),
  C0("girl","bianca","Bianca",[],"la",["lit","lyr"],"a",3,{girl:500},"Latin · white"),
  C0("girl","dorothy","Dorothy",["Dot","Dottie"],"gr",["lit"],"y",3,{girl:421},"Greek · gift of God"),
  C0("girl","opal","Opal",[],"la",["nat"],"l",2,{girl:423},"Latin · gemstone"),
  C0("girl","marceline","Marceline",["Marcy"],"fr",["lyr"],"e",3,{girl:424},"French · little warrior"),
  C0("girl","jennifer","Jennifer",["Jen","Jenny"],"we",["lit"],"r",3,{girl:586},"Welsh · fair one"),
  C0("girl","vienna","Vienna",[],"la",["sur"],"a",3,{girl:434},"Latin · the city Vienna"),
  C0("girl","lyra","Lyra",[],"gr",["lit","lyr"],"a",2,{girl:435},"Greek · lyre constellation"),
  C0("girl","danielle","Danielle",["Dani"],"he",["lit"],"e",2,{girl:549},"Hebrew · God is my judge"),
  C0("girl","stephanie","Stephanie",["Steph"],"gr",["lit"],"e",3,{girl:557},"Greek · crown"),
  C0("girl","lorelei","Lorelei",["Lori"],"ge",["lyr","lit"],"i",3,{girl:441},"German · murmuring rock"),
  C0("girl","jacqueline","Jacqueline",["Jackie","Jacqui"],"fr",["lit"],"e",3,{girl:558},"French · supplanter"),
  C0("girl","amanda","Amanda",["Mandy"],"la",["lit"],"a",3,{girl:493},"Latin · worthy of love"),
  C0("girl","emmy","Emmy",[],"ge",["lit"],"y",2,{girl:445},"German · whole universal"),
  C0("girl","calliope","Calliope",["Callie"],"gr",["lit","lyr"],"e",4,{girl:451},"Greek · beautiful voice"),
  C0("girl","jolene","Jolene",["Jo"],"en",["lyr"],"e",2,{girl:666},"English · pretty"),
  C0("girl","keira","Keira",[],"ir",["lyr"],"a",2,{girl:622},"Irish · dark haired"),
  C0("girl","eve","Eve",["Evie"],"he",["lit"],"e",1,{girl:519},"Hebrew · life"),
  C0("girl","winnie","Winnie",[],"we",["lit"],"e",2,{girl:475},"Welsh · holy peacemaking"),
  C0("girl","katie","Katie",["Kate"],"gr",["lit"],"e",2,{girl:646},"Greek · pure"),
  C0("girl","maxine","Maxine",["Max"],"la",["lit"],"e",2,{girl:497},"Latin · greatest"),
  C0("girl","mae","Mae",[],"en",["lit","nat"],"e",1,{girl:501},"English · the month of May"),
  C0("girl","shelby","Shelby",["Shel"],"en",["sur"],"y",2,{girl:649},"English · willow farm"),
  C0("girl","april","April",[],"la",["nat"],"l",2,{girl:542},"Latin · to open spring"),
  C0("girl","virginia","Virginia",["Ginny","Ginger"],"la",["lit","sur"],"a",4,{girl:526},"Latin · maiden"),
  C0("girl","sierra","Sierra",[],"la",["nat"],"a",3,{girl:616},"Latin · mountain range"),
  C0("girl","abby","Abby",[],"he",["lit"],"y",2,{girl:731},"Hebrew · my father is joy"),
  C0("girl","amber","Amber",[],"la",["nat"],"r",2,{girl:520},"Latin · amber gem"),
  C0("girl","louise","Louise",["Lou","Lulu"],"ge",["lit"],"e",2,{girl:516},"German · famous warrior"),
  C0("girl","clover","Clover",[],"en",["nat"],"r",2,{girl:517},"English · clover flower"),
  C0("girl","erin","Erin",[],"ir",["nat","lit"],"n",2,{girl:833},"Irish · Ireland"),
  C0("girl","jovie","Jovie",[],"la",["lyr"],"e",2,{girl:521},"Latin · joyful"),
  C0("girl","nellie","Nellie",["Nell"],"gr",["lit"],"e",2,{girl:533},"Greek · shining light"),
  C0("girl","kelsey","Kelsey",[],"en",["sur"],"y",2,{girl:814},"English · ship victory island"),
  C0("girl","rhea","Rhea",[],"gr",["lit"],"a",2,{girl:639},"Greek · flowing mother goddess"),
  C0("girl","amalia","Amalia",["Amy","Mali"],"ge",["lyr"],"a",4,{girl:566},"German · work industrious"),
  C0("girl","lenora","Lenora",["Nora","Lena"],"gr",["lyr","lit"],"a",3,{girl:539},"Greek · light"),
  C0("girl","mara","Mara",[],"he",["lit"],"a",2,{girl:589},"Hebrew · bitter"),
  C0("girl","miranda","Miranda",["Mira","Randa"],"la",["lit"],"a",3,{girl:656},"Latin · worthy of admiration"),
  C0("girl","priscilla","Priscilla",["Cilla","Pris"],"la",["lit"],"a",3,{girl:544},"Latin · ancient"),
  C0("girl","jenna","Jenna",["Jen"],"en",["vin"],"a",2,{girl:679},"English · fair one"),
  C0("girl","kendra","Kendra",["Ken"],"en",["vin"],"a",2,{girl:849},"English · knowing"),
  C0("girl","indie","Indie",[],"en",["vin","nat"],"e",2,{girl:634},"English · independent"),
  C0("girl","nola","Nola",[],"ir",["vin"],"a",2,{girl:822},"Irish · white shoulder"),
  C0("girl","myra","Myra",[],"gr",["vin","lyr"],"a",2,{girl:663},"Greek · myrrh"),
  C0("girl","zelda","Zelda",[],"ge",["vin"],"a",2,{girl:832},"German · grey battle"),
  C0("girl","mavis","Mavis",[],"fr",["nat"],"s",2,{girl:561},"French · songthrush"),
  C0("girl","davina","Davina",["Vina"],"he",["vin"],"a",3,{girl:749},"Hebrew · beloved"),
  C0("girl","lina","Lina",[],"ge",["vin","lyr"],"a",2,{girl:572},"German · tender"),
  C0("girl","angelica","Angelica",["Angie","Angel"],"la",["nat"],"a",4,{girl:708},"Latin · angelic"),
  C0("girl","halle","Halle",[],"en",["vin"],"e",2,{girl:596},"English · dweller at the hall"),
  C0("girl","anne","Anne",["Annie","Nan"],"he",["lit"],"e",1,{girl:619},"Hebrew · grace"),
  C0("girl","cleo","Cleo",[],"gr",["vin"],"o",2,{girl:577},"Greek · glory"),
  C0("girl","michaela","Michaela",["Mickey","Kayla"],"he",["vin"],"a",3,{girl:843},"Hebrew · who is like God"),
  C0("girl","cheyenne","Cheyenne",["Shy"],"en",["nat"],"e",2,{girl:920},"English · place name"),
  C0("girl","henley","Henley",[],"en",["sur","nat"],"y",2,{girl:null},"English · high meadow"),
  C0("girl","mina","Mina",[],"ge",["vin"],"a",2,{girl:597},"German · love"),
  C0("girl","eileen","Eileen",[],"ir",["vin"],"n",2,{girl:654},"Irish · radiant"),
  C0("girl","angie","Angie",[],"gr",["vin"],"e",2,{girl:705},"Greek · messenger"),
  C0("girl","leslie","Leslie",["Les"],"sc",["sur","nat"],"e",2,{girl:712},"Scottish · holly garden"),
  C0("girl","marie","Marie",[],"fr",["lit"],"e",2,{girl:618},"French · bitter or beloved"),
  C0("girl","cassandra","Cassandra",["Cassie","Sandra"],"gr",["lit"],"a",3,{girl:631},"Greek · shining upon man"),
  C0("girl","bethany","Bethany",["Beth"],"he",["lit"],"y",3,{girl:752},"Hebrew · house of figs"),
  C0("girl","rosa","Rosa",["Rosie"],"la",["nat"],"a",2,{girl:653},"Latin · rose"),
  C0("girl","loretta","Loretta",["Etta","Lori"],"la",["lyr"],"a",3,{girl:606},"Latin · laurel"),
  C0("girl","christina","Christina",["Chris","Tina"],"gr",["lit"],"a",3,{girl:770},"Greek · follower of Christ"),
  C0("girl","megan","Megan",["Meg"],"we",["vin"],"n",2,{girl:889},"Welsh · pearl"),
  C0("girl","julie","Julie",["Jules"],"la",["lit"],"e",2,{girl:873},"Latin · youthful"),
  C0("girl","liberty","Liberty",["Libby"],"en",["vin"],"y",3,{girl:null},"English · freedom"),
  C0("girl","irene","Irene",["Renie"],"gr",["lit"],"e",2,{girl:651},"Greek · peace"),
  C0("girl","carly","Carly",[],"en",["vin"],"y",2,{girl:null},"English · free man"),
  C0("girl","goldie","Goldie",[],"en",["nat","vin"],"e",2,{girl:621},"English · made of gold"),
  C0("girl","ila","Ila",[],"en",["vin"],"a",2,{girl:718},"English · island"),
  C0("girl","macy","Macy",[],"fr",["sur","vin"],"y",2,{girl:720},"French · Matthew estate"),
  C0("girl","selene","Selene",[],"gr",["lit"],"e",2,{girl:623},"Greek · moon"),
  C0("girl","winona","Winona",[],"en",["nat"],"a",3,{girl:627},"English · firstborn daughter"),
  C0("girl","melina","Melina",["Mel"],"gr",["lyr"],"a",3,{girl:660},"Greek · honey"),
  C0("girl","marilyn","Marilyn",["Mary"],"he",["vin"],"n",3,{girl:761},"Hebrew · beloved"),
  C0("girl","chelsea","Chelsea",["Chels"],"en",["nat"],"a",2,{girl:851},"English · chalk landing place"),
  C0("girl","coraline","Coraline",["Cora"],"la",["lit"],"e",3,{girl:683},"Latin · coral"),
  C0("girl","andie","Andie",[],"gr",["vin"],"e",2,{girl:650},"Greek · brave"),
  C0("girl","laney","Laney",[],"en",["vin"],"y",2,{girl:674},"English · bright one"),
  C0("girl","georgina","Georgina",["Gina"],"gr",["lyr"],"a",3,{girl:689},"Greek · farmer"),
  C0("girl","kyra","Kyra",[],"gr",["vin"],"a",2,{girl:830},"Greek · lady"),
  C0("girl","janelle","Janelle",["Jan"],"en",["vin"],"e",2,{girl:801},"English · God is gracious"),
  C0("girl","liv","Liv",[],"no",["vin"],"v",1,{girl:896},"Scandinavian · life"),
  C0("girl","martha","Martha",["Marty"],"he",["lit"],"a",2,{girl:713},"Hebrew · lady"),
  C0("girl","kara","Kara",[],"la",["vin"],"a",2,{girl:null},"Latin · dear"),
  C0("girl","dani","Dani",[],"he",["vin"],"i",2,{girl:747},"Hebrew · God is my judge"),
  C0("girl","penny","Penny",[],"gr",["vin"],"y",2,{girl:740},"Greek · weaver"),
  C0("girl","alena","Alena",[],"gr",["lyr"],"a",3,{girl:707},"Greek · light"),
  C0("girl","kenna","Kenna",[],"sc",["vin"],"a",2,{girl:759},"Scottish · handsome"),
  C0("girl","lara","Lara",[],"la",["lyr"],"a",2,{girl:693},"Latin · famous"),
  C0("girl","persephone","Persephone",["Persy"],"gr",["lit"],"e",4,{girl:735},"Greek · bringer of destruction"),
  C0("girl","fallon","Fallon",[],"ir",["sur"],"n",2,{girl:779},"Irish · leader"),
  C0("girl","billie","Billie",[],"ge",["vin"],"e",2,{girl:691},"German · resolute protector"),
  C0("girl","scout","Scout",[],"en",["lit"],"t",1,{girl:997},"English · one who scouts"),
  C0("girl","monica","Monica",["Mon"],"la",["lit"],"a",3,{girl:737},"Latin · advisor"),
  C0("girl","gwen","Gwen",[],"we",["vin"],"n",1,{girl:725},"Welsh · white fair"),
  C0("girl","milena","Milena",["Mila"],"sc",["lyr"],"a",3,{girl:950},"Scandinavian · gracious"),
  C0("girl","paula","Paula",[],"la",["vin"],"a",2,{girl:855},"Latin · small"),
  C0("girl","emerald","Emerald",["Em"],"en",["nat"],"d",3,{girl:741},"English · green gem"),
  C0("girl","amelie","Amelie",[],"fr",["lyr"],"e",3,{girl:828},"French · hardworking"),
  C0("girl","lacey","Lacey",[],"fr",["sur","vin"],"y",2,{girl:738},"French · from Lassy"),
  C0("girl","sky","Sky",[],"en",["nat"],"y",1,{girl:949},"English · the sky"),
  C0("girl","jolie","Jolie",[],"fr",["vin"],"e",2,{girl:null},"French · pretty"),
  C0("girl","jessie","Jessie",[],"he",["vin"],"e",2,{girl:824},"Hebrew · God beholds"),
  C0("girl","ramona","Ramona",["Mona"],"ge",["lit"],"a",3,{girl:733},"German · wise protector"),
  C0("girl","joelle","Joelle",["Jo"],"he",["vin"],"e",2,{girl:null},"Hebrew · Jehovah is God"),
  C0("girl","kelly","Kelly",[],"ir",["sur","vin"],"y",2,{girl:852},"Irish · bright headed"),
  C0("girl","teresa","Teresa",["Tess","Terri"],"gr",["lit"],"a",3,{girl:911},"Greek · harvester"),
  C0("girl","adele","Adele",[],"ge",["lit"],"e",2,{girl:751},"German · noble"),
  C0("girl","lettie","Lettie",[],"en",["vin"],"e",2,{girl:757},"English · joy"),
  C0("girl","livia","Livia",["Liv"],"la",["lit"],"a",3,{girl:820},"Latin · bluish or envious"),
  C0("girl","luella","Luella",["Lu","Ella"],"en",["lyr"],"a",3,{girl:780},"English · famous elf"),
  C0("girl","ruthie","Ruthie",["Ruth"],"he",["lit"],"e",2,{girl:781},"Hebrew · friend or companion"),
  C0("girl","judith","Judith",["Judy","Jude"],"he",["lit"],"h",2,{girl:790},"Hebrew · woman of Judea"),
  C0("girl","brittany","Brittany",["Britt"],"en",["nat"],"y",3,{girl:928},"English · from Brittany"),
  C0("girl","tiffany","Tiffany",["Tiff"],"gr",["lyr"],"y",3,{girl:880},"Greek · manifestation of God"),
  C0("girl","aura","Aura",[],"gr",["nat"],"a",2,{girl:817},"Greek · breeze or glow"),
  C0("girl","marianna","Marianna",["Mari","Anna"],"la",["lit"],"a",4,{girl:874},"Latin · combination of Mary and Anna"),
  C0("girl","karen","Karen",[],"sc",["lit"],"n",2,{girl:null},"Scandinavian · pure"),
  C0("girl","marjorie","Marjorie",["Marge","Margie"],"fr",["nat"],"e",3,{girl:null},"French · pearl"),
  C0("girl","celina","Celina",["Lina"],"la",["lyr"],"a",3,{girl:829},"Latin · heaven or sky"),
  C0("girl","annika","Annika",["Anni"],"sc",["lit"],"a",3,{girl:995},"Scandinavian · grace"),
  C0("girl","rosalyn","Rosalyn",["Rosie","Lyn"],"la",["lyr"],"n",3,{girl:null},"Latin · beautiful rose"),
  C0("girl","maddie","Maddie",[],"gr",["lyr"],"e",2,{girl:927},"Greek · from Magdala"),
  C0("girl","magdalena","Magdalena",["Maggie","Lena"],"gr",["lit"],"a",4,{girl:850},"Greek · from Magdala"),
  C0("girl","tara","Tara",[],"ir",["nat"],"a",2,{girl:847},"Irish · hill or rocky place"),
  C0("girl","lisa","Lisa",[],"he",["lit"],"a",2,{girl:991},"Hebrew · God is my oath"),
  C0("girl","barbara","Barbara",["Barb","Babs"],"gr",["lit"],"a",3,{girl:968},"Greek · foreign or stranger"),
  C0("girl","artemis","Artemis",[],"gr",["lit"],"s",3,{girl:null},"Greek · goddess of the hunt"),
  C0("girl","deborah","Deborah",["Debbie","Deb"],"he",["lit"],"h",3,{girl:864},"Hebrew · bee"),
  C0("girl","crystal","Crystal",["Crys"],"gr",["nat"],"l",2,{girl:null},"Greek · ice or clear gem"),
  C0("girl","lilia","Lilia",["Lily"],"la",["nat"],"a",3,{girl:859},"Latin · lily flower"),
  C0("girl","simone","Simone",["Sim"],"he",["lit"],"e",2,{girl:998},"Hebrew · one who hears"),
  C0("girl","denise","Denise",["Dee","Niecy"],"fr",["lit"],"e",2,{girl:null},"French · follower of Dionysus"),
  C0("girl","leanna","Leanna",["Lea","Anna"],"en",["lyr"],"a",3,{girl:890},"English · blend of Lee and Anna"),
  C0("girl","tilly","Tilly",[],"ge",["lyr"],"y",2,{girl:885},"German · mighty in battle"),
  C0("girl","mariel","Mariel",["Mari"],"he",["lit"],"l",3,{girl:893},"Hebrew · bitter or beloved"),
  C0("girl","nancy","Nancy",["Nan"],"he",["lit"],"y",2,{girl:967},"Hebrew · grace"),
  C0("girl","guinevere","Guinevere",["Gwen","Vera"],"we",["lit"],"e",3,{girl:899},"Welsh · white and smooth"),
  C0("girl","lexie","Lexie",["Lex"],"gr",["lyr"],"e",2,{girl:null},"Greek · defender of mankind"),
  C0("girl","cara","Cara",[],"la",["lyr"],"a",2,{girl:null},"Latin · beloved"),
  C0("girl","sapphire","Sapphire",["Saffy"],"gr",["nat"],"e",2,{girl:null},"Greek · blue gemstone"),
  C0("girl","elsa","Elsa",[],"he",["lit"],"a",2,{girl:null},"Hebrew · God is my oath"),
  C0("girl","carla","Carla",[],"ge",["lit"],"a",2,{girl:null},"German · free woman"),
  C0("girl","darla","Darla",[],"en",["lyr"],"a",2,{girl:941},"English · dear or beloved"),
  C0("girl","whitney","Whitney",[],"en",["sur"],"y",2,{girl:null},"English · white island"),
  C0("girl","elara","Elara",[],"gr",["lit"],"a",3,{girl:942},"Greek · moon of Jupiter"),
  C0("girl","mariella","Mariella",["Mari","Ella"],"he",["lyr"],"a",4,{girl:943},"Hebrew · beloved"),
  C0("girl","carolyn","Carolyn",["Carol","Lyn"],"fr",["lit"],"n",3,{girl:null},"French · free woman"),
  C0("girl","marcella","Marcella",["Marcy","Ella"],"la",["lit"],"a",3,{girl:948},"Latin · young warrior"),
  C0("girl","ansley","Ansley",[],"en",["sur"],"y",2,{girl:null},"English · clearing with a hermitage"),
  C0("girl","joyce","Joyce",[],"la",["lit"],"e",1,{girl:null},"Latin · joyous or lord"),
  C0("girl","jillian","Jillian",["Jill"],"la",["lit"],"n",3,{girl:null},"Latin · youthful"),
  C0("girl","corinne","Corinne",["Cora","Cori"],"gr",["lyr"],"e",2,{girl:999},"Greek · maiden"),
  C0("girl","vida","Vida",[],"he",["lit"],"a",2,{girl:null},"Hebrew · beloved"),
  C0("girl","belle","Belle",[],"fr",["lyr"],"e",1,{girl:null},"French · beautiful"),
  C0("girl","susan","Susan",["Sue","Suzie"],"he",["lit"],"n",2,{girl:null},"Hebrew · lily"),
  C0("girl","dana","Dana",[],"en",["lit"],"a",2,{girl:null},"English · from Denmark"),
  C0("girl","kathleen","Kathleen",["Kath","Kate"],"ir",["lit"],"n",2,{girl:null},"Irish · pure"),
  C0("girl","lavender","Lavender",["Lavi"],"la",["nat"],"r",3,{girl:null},"Latin · purple flowering herb"),
  C0("girl","sandra","Sandra",["Sandy"],"gr",["lit"],"a",2,{girl:null},"Greek · defender of mankind"),

  // --- batch 6 (top-1000..3000 tier) ---
  C0("boy","bastian","Bastian",["Bas"],"gr",["lit"],"n",2,{boy:1023},"Greek · venerable, revered"),
  C0("boy","merrick","Merrick",["Rick"],"we",["sur"],"k",2,{boy:1185},"Welsh · fame, power"),
  C0("boy","marc","Marc",[],"la",["nat"],"c",1,{boy:1238},"Latin · warlike, of Mars"),
  C0("boy","lyle","Lyle",[],"fr",["sur"],"e",1,{boy:1049},"French · the island"),
  C0("boy","ernest","Ernest",["Ernie"],"ge",["nat","vin"],"t",2,{boy:1041},"German · serious, resolute"),
  C0("boy","decker","Decker",["Deck"],"ge",["sur"],"r",2,{boy:1506},"German · roofer"),
  C0("boy","coleman","Coleman",["Cole"],"ir",["sur"],"n",2,{boy:1313},"Irish · dove"),
  C0("boy","ollie","Ollie",[],"en",["nat"],"e",2,{boy:1057},"English · diminutive of Oliver"),
  C0("boy","torin","Torin",[],"ir",["lit"],"n",2,{boy:1348},"Irish · chief"),
  C0("boy","gannon","Gannon",[],"ir",["sur"],"n",2,{boy:2220},"Irish · fair-skinned"),
  C0("boy","carmine","Carmine",[],"la",["lit","vin"],"e",2,{boy:1036},"Latin · song, crimson"),
  C0("boy","nickolas","Nickolas",["Nick"],"gr",["nat"],"s",3,{boy:1492},"Greek · victory of the people"),
  C0("boy","ren","Ren",[],"en",["lyr"],"n",1,{boy:1040},"English · short, ruler"),
  C0("boy","sunny","Sunny",[],"en",["nat"],"y",2,{boy:1077},"English · cheerful, bright"),
  C0("boy","ralph","Ralph",[],"en",["vin","sur"],"h",1,{boy:1048},"English · wolf counsel"),
  C0("boy","slade","Slade",[],"en",["sur","pun"],"e",1,{boy:1054},"English · valley"),
  C0("boy","randall","Randall",["Randy"],"en",["sur"],"l",2,{boy:1501},"English · shield wolf"),
  C0("boy","ever","Ever",[],"en",["nat","lyr"],"r",2,{boy:1203},"English · always, lasting"),
  C0("boy","ash","Ash",[],"en",["nat","pun"],"h",1,{boy:1181},"English · ash tree"),
  C0("boy","link","Link",[],"en",["pun"],"k",1,{boy:1576},"English · connection, short form"),
  C0("boy","wiley","Wiley",[],"en",["sur","pun"],"y",2,{boy:1222},"English · clever, crafty"),
  C0("boy","maxim","Maxim",["Max"],"la",["lit"],"m",2,{boy:1524},"Latin · greatest"),
  C0("boy","pierre","Pierre",[],"fr",["nat"],"e",1,{boy:1254},"French · stone, rock"),
  C0("u","kit","Kit",[],"en",["lit"],"t",1,{girl:1126,boy:1101},"English · diminutive of Christopher"),
  C0("boy","andreas","Andreas",["Andy"],"gr",["lit"],"s",3,{boy:1280},"Greek · manly, brave"),
  C0("boy","mattias","Mattias",["Matt"],"gr",["lit"],"s",3,{boy:1232},"Greek · gift, variant of Matthias"),
  C0("boy","maddux","Maddux",["Mad"],"we",["sur"],"x",2,{boy:1534},"Welsh · son of Madoc"),
  C0("boy","benton","Benton",["Ben"],"en",["sur"],"n",2,{boy:1631},"English · town in the bent grass"),
  C0("boy","markus","Markus",["Mark"],"la",["nat"],"s",2,{boy:1335},"Latin · of Mars, warlike"),
  C0("boy","emil","Emil",[],"la",["lit"],"l",2,{boy:1273},"Latin · rival, eager"),
  C0("boy","kaine","Kaine",[],"we",["sur"],"e",1,{boy:1428},"Welsh · beautiful, tribute"),
  C0("boy","norman","Norman",["Norm"],"ge",["vin","sur"],"n",2,{boy:1199},"German · northman"),
  C0("u","cedar","Cedar",[],"la",["nat"],"r",2,{girl:2853,boy:1251},"Latin · cedar tree"),
  C0("boy","sol","Sol",[],"la",["lit","pun"],"l",1,{boy:1145},"Latin · sun"),
  C0("boy","shaun","Shaun",[],"ir",["nat"],"n",1,{boy:1944},"Irish · variant of Sean, gift"),
  C0("boy","pierson","Pierson",["Pierce"],"en",["sur"],"n",2,{boy:1453},"English · son of Pier"),
  C0("boy","ansel","Ansel",[],"ge",["lit","sur"],"l",2,{boy:1140},"German · with divine protection"),
  C0("boy","gray","Gray",[],"en",["nat","sur"],"y",1,{boy:1420},"English · the color gray"),
  C0("boy","gilbert","Gilbert",["Gil"],"ge",["vin","sur"],"t",2,{boy:1330},"German · bright pledge"),
  C0("boy","rylen","Rylen",[],"en",["sur"],"n",2,{boy:1557},"English · rye land"),
  C0("boy","gibson","Gibson",["Gib"],"en",["sur","pun"],"n",2,{boy:1684},"English · son of Gilbert"),
  C0("boy","wylie","Wylie",[],"en",["sur","pun"],"e",2,{boy:1176},"English · resolute, crafty"),
  C0("boy","lenox","Lenox",["Len"],"sc",["sur"],"x",2,{boy:1353},"Scottish · with many elm trees"),
  C0("boy","canyon","Canyon",[],"en",["nat"],"n",2,{boy:1606},"English · deep gorge"),
  C0("boy","steele","Steele",[],"en",["sur","pun"],"e",1,{boy:1183},"English · steel, hard"),
  C0("boy","gentry","Gentry",[],"en",["sur"],"y",2,{boy:1820},"English · highborn, refined"),
  C0("boy","oren","Oren",[],"he",["nat"],"n",2,{boy:1184},"Hebrew · pine tree"),
  C0("u","cove","Cove",[],"en",["nat"],"e",1,{girl:1935,boy:1191},"English · small bay"),
  C0("boy","anton","Anton",[],"la",["nat"],"n",2,{boy:1391},"Latin · priceless, variant of Anthony"),
  C0("boy","rogan","Rogan",[],"ir",["sur"],"n",2,{boy:2006},"Irish · redhead"),
  C0("boy","jet","Jet",[],"en",["nat","pun"],"t",1,{boy:1249},"English · black gemstone"),
  C0("boy","viktor","Viktor",["Vik"],"la",["lit"],"r",2,{boy:1237},"Latin · conqueror"),
  C0("boy","eliot","Eliot",[],"en",["lit","sur"],"t",3,{boy:1406},"English · variant of Elliot"),
  C0("boy","westen","Westen",["West"],"en",["sur"],"n",2,{boy:1236},"English · western town"),
  C0("u","perry","Perry",[],"en",["sur"],"y",2,{girl:2219,boy:1372},"English · dweller by the pear tree"),
  C0("boy","monte","Monte",[],"la",["sur"],"e",2,{boy:1469},"Latin · mountain"),
  C0("boy","freddy","Freddy",[],"ge",["nat"],"y",2,{boy:1423},"German · peaceful ruler"),
  C0("boy","brent","Brent",[],"en",["sur"],"t",1,{boy:1513},"English · hill, high place"),
  C0("boy","riot","Riot",[],"en",["pun","lyr"],"t",2,{boy:1264},"English · uproar, wild energy"),
  C0("boy","craig","Craig",[],"sc",["sur","nat"],"g",1,{boy:1653},"Scottish · rock, crag"),
  C0("boy","truman","Truman",["True"],"en",["sur","pun"],"n",2,{boy:1547},"English · loyal, trusty man"),
  C0("boy","steve","Steve",[],"gr",["nat"],"e",1,{boy:1612},"Greek · crown, garland"),
  C0("boy","west","West",[],"en",["sur","nat"],"t",1,{boy:1252},"English · western direction"),
  C0("boy","carsen","Carsen",[],"sc",["sur"],"n",2,{boy:2204},"Scottish · son of the marsh dwellers"),
  C0("boy","valor","Valor",[],"la",["pun","lyr"],"r",2,{boy:1253},"Latin · courage, bravery"),
  C0("boy","bernard","Bernard",["Bernie"],"ge",["vin","sur"],"d",2,{boy:1365},"German · brave as a bear"),
  C0("boy","mars","Mars",[],"la",["pun","nat"],"s",1,{boy:1614},"Latin · god of war, the planet"),
  C0("boy","jonathon","Jonathon",["Jon"],"he",["nat"],"n",3,{boy:1489},"Hebrew · variant of Jonathan, gift"),
  C0("boy","percy","Percy",[],"fr",["vin","sur"],"y",2,{boy:1277},"French · pierce valley"),
  C0("boy","darrell","Darrell",[],"fr",["sur"],"l",2,{boy:1695},"French · open, beloved"),
  C0("u","ripley","Ripley",["Rip"],"en",["sur","pun"],"y",2,{girl:1029,boy:1263},"English · strip of clearing"),
  C0("boy","kallen","Kallen",[],"ir",["sur"],"n",2,{boy:1299},"Irish · powerful, mighty"),
  C0("boy","derick","Derick",[],"ge",["nat"],"k",2,{boy:1484},"German · variant of Derek, ruler"),
  C0("boy","milton","Milton",["Milt"],"en",["sur"],"n",2,{boy:1438},"English · mill town"),
  C0("boy","slater","Slater",[],"en",["sur"],"r",2,{boy:1267},"English · one who lays slate"),
  C0("boy","zack","Zack",[],"he",["nat"],"k",1,{boy:1425},"Hebrew · short form of Zachary"),
  C0("boy","ender","Ender",[],"en",["lit"],"r",2,{boy:1750},"English · literary, one who ends"),
  C0("boy","clifford","Clifford",["Cliff"],"en",["vin","sur"],"d",2,{boy:1357},"English · ford by the cliff"),
  C0("boy","ross","Ross",[],"sc",["sur","nat"],"s",1,{boy:1459},"Scottish · headland or cape"),
  C0("boy","garrison","Garrison",["Gary"],"en",["sur"],"n",3,{boy:1766},"English · garrison or fortified town"),
  C0("boy","wolfgang","Wolfgang",["Wolf"],"ge",["lit"],"g",2,{boy:1514},"German · path of the wolf"),
  C0("boy","conway","Conway",[],"we",["sur","nat"],"y",2,{boy:1289},"Welsh · holy water or hound of the plain"),
  C0("boy","emmet","Emmet",[],"en",["sur"],"t",2,{boy:1562},"English · universal or whole"),
  C0("boy","roan","Roan",[],"ir",["nat","sur"],"n",1,{boy:1305},"Irish · little redhead"),
  C0("boy","ewan","Ewan",[],"sc",["nat"],"n",2,{boy:1483},"Scottish · born of the yew tree"),
  C0("boy","dale","Dale",[],"en",["sur","nat"],"e",1,{boy:1416},"English · valley"),
  C0("boy","townes","Townes",[],"en",["sur"],"s",1,{boy:1316},"English · from the town"),
  C0("boy","clarence","Clarence",[],"en",["sur","lit"],"e",2,{boy:1507},"Latin · bright or clear"),
  C0("boy","barry","Barry",[],"ir",["sur","nat"],"y",2,{boy:1528},"Irish · fair haired or spear"),
  C0("boy","warner","Warner",[],"ge",["sur"],"r",2,{boy:1362},"German · guarding warrior"),
  C0("boy","alister","Alister",["Al"],"sc",["nat"],"r",3,{boy:1697},"Scottish · defender of the people"),
  C0("boy","benji","Benji",["Ben"],"he",["lyr"],"i",2,{boy:1344},"Hebrew · son of the right hand"),
  C0("boy","aston","Aston",[],"en",["sur","nat"],"n",2,{boy:1866},"English · east town"),
  C0("boy","clint","Clint",[],"en",["sur","nat"],"t",1,{boy:2388},"English · town on a hill"),
  C0("boy","vince","Vince",[],"en",["nat"],"e",1,{boy:1363},"Latin · conquering"),
  C0("u","channing","Channing",[],"en",["sur"],"g",2,{girl:3160,boy:1776},"English · young wolf"),
  C0("boy","alton","Alton",[],"en",["sur","nat"],"n",2,{boy:1608},"English · old town"),
  C0("boy","glenn","Glenn",[],"sc",["nat","sur"],"n",1,{boy:1450},"Scottish · valley"),
  C0("boy","guy","Guy",[],"fr",["lit"],"y",1,{boy:1640},"French · guide or leader"),
  C0("boy","clinton","Clinton",["Clint"],"en",["sur"],"n",2,{boy:1738},"English · town on a hill"),
  C0("u","ramsey","Ramsey",[],"en",["sur"],"y",2,{girl:2377,boy:1964},"English · wild garlic island"),
  C0("boy","baron","Baron",[],"en",["sur","nat"],"n",2,{boy:1375},"English · noble warrior or young man"),
  C0("boy","lenny","Lenny",["Len"],"ge",["nat"],"y",2,{boy:1419},"German · brave as a lion"),
  C0("boy","vernon","Vernon",[],"fr",["sur"],"n",2,{boy:1382},"French · place of alders"),
  C0("boy","kip","Kip",[],"en",["nat"],"p",1,{boy:1628},"English · pointed hill"),
  C0("boy","coy","Coy",[],"en",["nat","sur"],"y",1,{boy:1458},"English · quiet or modest"),
  C0("boy","huck","Huck",[],"en",["lit","nat"],"k",1,{boy:1915},"English · heart or mind"),
  C0("boy","scotty","Scotty",["Scott"],"sc",["nat"],"y",2,{boy:1394},"Scottish · from Scotland"),
  C0("boy","fredrick","Fredrick",["Fred"],"ge",["sur"],"k",2,{boy:1734},"German · peaceful ruler"),
  C0("u","jules","Jules",[],"fr",["lit"],"s",1,{girl:2124,boy:1397},"French · youthful or downy"),
  C0("boy","orson","Orson",[],"en",["lit","sur"],"n",2,{boy:1427},"Latin · bear cub"),
  C0("boy","alder","Alder",[],"en",["nat","sur"],"r",2,{boy:1407},"English · the alder tree"),
  C0("boy","todd","Todd",[],"en",["sur","nat"],"d",1,{boy:1611},"English · fox"),
  C0("boy","judd","Judd",[],"en",["sur"],"d",1,{boy:1702},"English · flowing or descending"),
  C0("boy","kent","Kent",[],"en",["sur","nat"],"t",1,{boy:1657},"English · edge or border"),
  C0("u","cypress","Cypress",[],"gr",["nat"],"s",2,{girl:2431,boy:1563},"Greek · the cypress tree"),
  C0("boy","quinten","Quinten",["Quin"],"en",["nat"],"n",2,{boy:2184},"Latin · the fifth"),
  C0("boy","carver","Carver",[],"en",["sur","nat"],"r",2,{boy:1508},"English · one who carves wood"),
  C0("boy","finnian","Finnian",["Finn"],"ir",["nat"],"n",3,{boy:1490},"Irish · fair or white"),
  C0("boy","nile","Nile",[],"en",["nat","sur"],"e",1,{boy:1840},"English · champion or river name"),
  C0("boy","riggins","Riggins",["Rigg"],"ir",["sur"],"s",2,{boy:1772},"Irish · ridge"),
  C0("boy","karl","Karl",[],"ge",["nat"],"l",1,{boy:1593},"German · free man"),
  C0("boy","eamon","Eamon",[],"ir",["nat"],"n",2,{boy:1651},"Irish · wealthy protector"),
  C0("boy","finneas","Finneas",["Finn"],"ir",["nat"],"s",3,{boy:1432},"Irish · oracle or fair"),
  C0("boy","ranger","Ranger",[],"en",["nat","sur"],"r",2,{boy:1573},"English · forest guardian"),
  C0("boy","leopold","Leopold",["Leo"],"ge",["lit"],"d",3,{boy:1996},"German · bold people"),
  C0("boy","hampton","Hampton",[],"en",["sur"],"n",2,{boy:1449},"English · home settlement"),
  C0("u","brighton","Brighton",[],"en",["sur","nat"],"n",2,{girl:2538,boy:1880},"English · bright town"),
  C0("boy","brenden","Brenden",[],"ir",["nat"],"n",2,{boy:2933},"Irish · prince or little raven"),
  C0("boy","leander","Leander",[],"gr",["lit"],"r",3,{boy:1461},"Greek · lion man"),
  C0("boy","woods","Woods",[],"en",["sur","nat"],"s",1,{boy:1466},"English · from the woods"),
  C0("boy","calloway","Calloway",["Cal"],"en",["sur"],"y",3,{boy:1475},"English · pebbled riverbank"),
  C0("boy","corbyn","Corbyn",[],"en",["sur"],"n",2,{boy:2278},"French · raven or dark haired"),
  C0("boy","kenton","Kenton",[],"en",["sur"],"n",2,{boy:1765},"English · royal town"),
  C0("u","storm","Storm",[],"en",["nat"],"m",1,{girl:1436,boy:2108},"English · tempest"),
  C0("boy","keller","Keller",[],"ge",["sur"],"r",2,{boy:1997},"German · cellar keeper"),
  C0("boy","arnold","Arnold",["Arnie"],"ge",["sur"],"d",2,{boy:1485},"German · eagle power"),
  C0("boy","cecil","Cecil",[],"en",["lit"],"l",2,{boy:1491},"Latin · blind or sixth"),
  C0("boy","fynn","Fynn",[],"ir",["nat"],"n",1,{boy:2197},"Irish · fair or white"),
  C0("boy","canon","Canon",[],"en",["nat","sur"],"n",2,{boy:2225},"English · church official or rule"),
  C0("boy","vito","Vito",[],"la",["lit"],"o",2,{boy:1500},"Italian · life"),
  C0("boy","clifton","Clifton",["Cliff"],"en",["sur"],"n",2,{boy:1917},"English · town by the cliff"),
  C0("boy","freddie","Freddie",["Fred"],"ge",["nat"],"e",2,{boy:1512},"German · peaceful ruler"),
  C0("boy","lester","Lester",[],"en",["sur"],"r",2,{boy:1636},"English · fortified place"),
  C0("boy","nestor","Nestor",[],"gr",["lit"],"r",2,{boy:1532},"Greek · traveler or wise one"),
  C0("boy","eddy","Eddy",["Ed"],"en",["nat"],"y",2,{boy:1605},"English · wealthy guardian"),
  C0("boy","daryl","Daryl",[],"fr",["sur"],"l",2,{boy:1538},"French · beloved or open"),
  C0("boy","monty","Monty",[],"fr",["nat"],"y",2,{boy:1542},"French · pointed hill"),
  C0("boy","hagen","Hagen",[],"ge",["sur","nat"],"n",2,{boy:2046},"German · enclosure or high son"),
  C0("boy","mickey","Mickey",["Mick"],"en",["nat"],"y",2,{boy:2042},"English · who is like God"),
  C0("boy","lloyd","Lloyd",[],"we",["sur"],"d",1,{boy:1551},"Welsh · grey or sacred"),
  C0("boy","vander","Vander",[],"en",["sur"],"r",2,{boy:1352},"Dutch · of the family"),
  C0("boy","ozzie","Ozzie",[],"en",["nat"],"e",2,{boy:1454},"English · divine power"),
  C0("boy","hansel","Hansel",[],"ge",["lit"],"l",2,{boy:1639},"German · gift from God"),
  C0("boy","everette","Everette",["Ev"],"en",["sur"],"e",3,{boy:1580},"English · brave as a wild boar"),
  C0("boy","calder","Calder",["Cal"],"sc",["sur","nat"],"r",2,{boy:1739},"Scottish · rough water or stream"),
  C0("boy","nate","Nate",[],"he",["vin"],"e",1,{boy:1747},"Hebrew · gift from God"),
  C0("boy","elton","Elton",[],"en",["sur","vin"],"n",2,{boy:2322},"English · from the old town"),
  C0("boy","neal","Neal",[],"ir",["vin"],"l",1,{boy:1910},"Irish · champion or cloud"),
  C0("boy","radley","Radley",[],"en",["sur","nat"],"y",2,{boy:1828},"English · red meadow"),
  C0("boy","niall","Niall",[],"ir",["sur"],"l",1,{boy:1700},"Irish · champion"),
  C0("boy","rockwell","Rockwell",["Rock"],"en",["sur"],"l",2,{boy:1933},"English · rock spring"),
  C0("boy","constantine","Constantine",["Con"],"la",["lit","vin"],"e",3,{boy:1582},"Latin · steadfast"),
  C0("boy","lyndon","Lyndon",["Lyn"],"en",["sur","vin"],"n",2,{boy:2190},"English · linden tree hill"),
  C0("boy","wolf","Wolf",[],"ge",["nat","sur"],"f",1,{boy:1889},"German · wolf"),
  C0("boy","chester","Chester",["Chet"],"en",["sur","vin"],"r",2,{boy:1598},"English · fortress or walled town"),
  C0("boy","arlen","Arlen",[],"ir",["sur"],"n",2,{boy:1599},"Irish · pledge or oath"),
  C0("boy","dashiell","Dashiell",["Dash"],"fr",["lit","sur"],"l",2,{boy:2296},"French · variant of de Chiel"),
  C0("boy","valen","Valen",[],"la",["vin"],"n",2,{boy:1610},"Latin · strong or healthy"),
  C0("u","laine","Laine",[],"en",["sur","nat"],"e",1,{girl:1460,boy:3480},"English · narrow path or lane"),
  C0("boy","olin","Olin",[],"sc",["sur"],"n",2,{boy:1839},"Scandinavian · ancestral heirloom"),
  C0("boy","jarvis","Jarvis",[],"en",["sur"],"s",2,{boy:2858},"English · spearman"),
  C0("boy","broderick","Broderick",["Brody"],"we",["sur","vin"],"k",3,{boy:2602},"Welsh · son of Rhydderch"),
  C0("u","lake","Lake",[],"en",["nat"],"e",1,{girl:3602,boy:2064},"English · body of water"),
  C0("boy","rivers","Rivers",["River"],"en",["nat","sur"],"s",2,{boy:2802},"English · flowing waters"),
  C0("boy","morris","Morris",["Mo"],"en",["sur","vin"],"s",2,{boy:1761},"English · dark skinned or Moorish"),
  C0("boy","irving","Irving",["Irv"],"sc",["sur","vin"],"g",2,{boy:1787},"Scottish · green water"),
  C0("u","marlo","Marlo",[],"en",["sur"],"o",2,{girl:1837,boy:1715},"English · marshland clearing"),
  C0("boy","levy","Levy",[],"he",["sur"],"y",2,{boy:1701},"Hebrew · joined or attached"),
  C0("boy","lonnie","Lonnie",[],"en",["vin"],"e",2,{boy:1845},"English · ready for battle"),
  C0("boy","woodrow","Woodrow",["Woody"],"en",["sur","vin"],"w",2,{boy:1644},"English · row of houses by a wood"),
  C0("boy","myron","Myron",[],"gr",["vin"],"n",2,{boy:1647},"Greek · fragrant oil"),
  C0("boy","brice","Brice",[],"we",["sur"],"e",1,{boy:2985},"Welsh · speckled or freckled"),
  C0("boy","jed","Jed",[],"he",["vin"],"d",1,{boy:1998},"Hebrew · beloved"),
  C0("boy","bennet","Bennet",["Ben"],"en",["sur","lit"],"t",2,{boy:1662},"English · blessed"),
  C0("boy","gene","Gene",[],"gr",["vin"],"e",1,{boy:2249},"Greek · wellborn or noble"),
  C0("boy","sylvan","Sylvan",[],"la",["nat","lyr"],"n",2,{boy:1670},"Latin · of the woods"),
  C0("boy","hardin","Hardin",[],"en",["sur"],"n",2,{boy:2115},"English · valley of hares"),
  C0("boy","brenton","Brenton",["Bren"],"en",["sur","vin"],"n",2,{boy:2102},"English · from Brent town"),
  C0("boy","earl","Earl",[],"en",["vin"],"l",1,{boy:2251},"English · nobleman"),
  C0("boy","kurt","Kurt",[],"ge",["vin"],"t",1,{boy:2270},"German · courteous or bold counsel"),
  C0("boy","oden","Oden",[],"sc",["lit"],"n",2,{boy:2021},"Norse · frenzy or inspiration"),
  C0("boy","wendell","Wendell",[],"ge",["sur","vin"],"l",2,{boy:2146},"German · wanderer"),
  C0("boy","meyer","Meyer",[],"ge",["sur"],"r",2,{boy:1693},"German · steward or farmer"),
  C0("boy","conan","Conan",[],"ir",["sur","lit"],"n",2,{boy:1686},"Irish · little wolf or hound"),
  C0("boy","fred","Fred",[],"ge",["vin"],"d",1,{boy:1937},"German · peaceful ruler"),
  C0("boy","cosmo","Cosmo",[],"gr",["lit","vin"],"o",2,{boy:1939},"Greek · order or universe"),
  C0("boy","dan","Dan",[],"he",["vin"],"n",1,{boy:1972},"Hebrew · judge"),
  C0("boy","lathan","Lathan",[],"en",["sur"],"n",2,{boy:2693},"English · barn or storehouse"),
  C0("u","huntley","Huntley",["Hunt"],"en",["sur","nat"],"y",2,{girl:2206,boy:2067},"English · hunters meadow"),
  C0("u","wynn","Wynn",[],"we",["nat","lyr"],"n",1,{girl:1703,boy:1709},"Welsh · fair or blessed"),
  C0("boy","orin","Orin",[],"ir",["sur"],"n",2,{boy:1859},"Irish · pale or fair"),
  C0("boy","stiles","Stiles",[],"en",["sur"],"s",1,{boy:2093},"English · steep paths or steps"),
  C0("boy","lysander","Lysander",["Sander"],"gr",["lit"],"r",3,{boy:1716},"Greek · liberator of men"),
  C0("boy","elan","Elan",[],"he",["nat"],"n",2,{boy:2505},"Hebrew · tree"),
  C0("boy","korben","Korben",[],"en",["sur","lit"],"n",2,{boy:3141},"English · variant of Corbin or raven"),
  C0("boy","sloan","Sloan",[],"ir",["sur"],"n",1,{boy:2259},"Irish · raider or warrior"),
  C0("boy","reggie","Reggie",[],"en",["vin"],"e",2,{boy:1858},"English · counsel power"),
  C0("boy","donnie","Donnie",[],"sc",["vin"],"e",2,{boy:1804},"Scottish · world ruler"),
  C0("boy","charley","Charley",[],"en",["vin"],"y",2,{boy:1835},"English · free man"),
  C0("boy","kasper","Kasper",[],"sc",["vin"],"r",2,{boy:1872},"Scandinavian · treasurer"),
  C0("boy","lamont","Lamont",[],"sc",["sur"],"t",2,{boy:2743},"Scottish · lawman"),
  C0("boy","hazen","Hazen",[],"en",["sur"],"n",2,{boy:1788},"English · son of Hayes"),
  C0("boy","lex","Lex",[],"gr",["vin"],"x",1,{boy:2313},"Greek · defender of men"),
  C0("boy","gauge","Gauge",[],"en",["sur"],"e",1,{boy:4115},"English · measure or assessor"),
  C0("boy","laurence","Laurence",["Larry"],"la",["lit","vin"],"e",2,{boy:1748},"Latin · from Laurentum"),
  C0("u","ridley","Ridley",[],"en",["sur","nat"],"y",2,{girl:2005,boy:2078},"English · reed clearing"),
  C0("boy","truitt","Truitt",[],"en",["sur"],"t",2,{boy:1756},"English · little or steadfast"),
  C0("boy","tobin","Tobin",[],"he",["sur"],"n",2,{boy:3189},"Hebrew · good or God is good"),
  C0("boy","domenic","Domenic",["Dom"],"la",["vin"],"c",3,{boy:2325},"Latin · of the Lord"),
  C0("boy","marlin","Marlin",[],"en",["sur","nat"],"n",2,{boy:1782},"English · little hawk"),
  C0("boy","emmit","Emmit",[],"ge",["sur","vin"],"t",2,{boy:3358},"German · industrious"),
  C0("boy","braeden","Braeden",["Brae"],"ir",["sur"],"n",2,{boy:3373},"Irish · little raven"),
  C0("boy","valentine","Valentine",["Val"],"la",["lit","vin"],"e",3,{boy:1793},"Latin · strong or healthy"),
  C0("boy","richie","Richie",[],"ge",["vin"],"e",2,{boy:1857},"German · brave ruler"),
  C0("boy","maxon","Maxon",["Max"],"en",["sur"],"n",2,{boy:2965},"English · son of Max"),
  C0("boy","jennings","Jennings",[],"en",["sur"],"s",2,{boy:1847},"English · son of John"),
  C0("boy","britton","Britton",["Brit"],"en",["sur","nat"],"n",2,{boy:2791},"English · from Britain or a Briton"),
  C0("boy","breck","Breck",[],"ir",["sur","nat"],"k",1,{boy:3026},"Irish · freckled"),
  C0("boy","glen","Glen",[],"sc",["nat","sur"],"n",1,{boy:2028},"Scottish · narrow valley"),
  C0("boy","callaway","Callaway",["Cal"],"en",["sur","nat"],"y",3,{boy:1822},"English · from the calf meadow"),
  C0("boy","raleigh","Raleigh",[],"en",["sur","nat"],"h",2,{boy:2214},"English · from the deer meadow"),
  C0("boy","korey","Korey",[],"ir",["sur"],"y",2,{boy:2746},"Irish · from the hollow"),
  C0("boy","theodor","Theodor",["Theo","Ted"],"gr",["lit","sur"],"r",3,{boy:1993},"Greek · gift of God"),
  C0("boy","dwight","Dwight",[],"en",["sur"],"t",1,{boy:2788},"English · white or fair"),
  C0("boy","maksim","Maksim",["Max"],"la",["lit"],"m",2,{boy:2464},"Latin · greatest"),
  C0("boy","caine","Caine",[],"we",["sur"],"e",1,{boy:2508},"Welsh · warrior"),
  C0("boy","roscoe","Roscoe",[],"no",["sur","nat"],"e",2,{boy:2239},"Norse · deer forest"),
  C0("boy","triston","Triston",["Tris"],"we",["lit","sur"],"n",2,{boy:2424},"Welsh · sorrowful or noise"),
  C0("boy","angus","Angus",["Gus"],"sc",["sur","lit"],"s",2,{boy:2389},"Scottish · one strength"),
  C0("boy","kelton","Kelton",[],"en",["sur","nat"],"n",2,{boy:3342},"English · town by the ridge"),
  C0("boy","marko","Marko",[],"la",["sur"],"o",2,{boy:2063},"Latin · warlike"),
  C0("boy","emile","Emile",[],"fr",["lit"],"e",2,{boy:2100},"French · rival or eager"),
  C0("boy","brendon","Brendon",["Bren"],"ir",["sur"],"n",2,{boy:2710},"Irish · prince"),
  C0("boy","fitz","Fitz",[],"en",["sur"],"z",1,{boy:3495},"English · son of"),
  C0("boy","fischer","Fischer",[],"ge",["sur"],"r",2,{boy:2221},"German · fisherman"),
  C0("boy","kolbe","Kolbe",[],"ge",["sur"],"e",2,{boy:1934},"German · from a place name"),
  C0("boy","sheldon","Sheldon",["Shel"],"en",["sur","nat"],"n",2,{boy:2774},"English · steep valley"),
  C0("boy","von","Von",[],"ge",["sur"],"n",1,{boy:2127},"German · of or from"),
  C0("boy","konrad","Konrad",["Kon"],"ge",["sur"],"d",2,{boy:2010},"German · bold counsel"),
  C0("boy","holt","Holt",[],"en",["sur","nat"],"t",1,{boy:1926},"English · small wood"),
  C0("boy","duane","Duane",[],"ir",["sur"],"e",2,{boy:2597},"Irish · dark"),
  C0("boy","klaus","Klaus",[],"ge",["lit"],"s",1,{boy:2242},"German · victory of the people"),
  C0("boy","diesel","Diesel",[],"ge",["pun","lyr"],"l",2,{boy:2359},"German · from Matthias"),
  C0("boy","reef","Reef",[],"en",["nat","lyr"],"f",1,{boy:2486},"English · ridge of rock"),
  C0("boy","branden","Branden",["Bran"],"en",["sur","nat"],"n",2,{boy:3372},"English · beacon hill"),
  C0("boy","armin","Armin",[],"ge",["lit"],"n",2,{boy:2052},"German · whole or universal"),
  C0("boy","lyon","Lyon",[],"fr",["nat","sur"],"n",2,{boy:2493},"French · lion"),
  C0("boy","riker","Riker",[],"ge",["sur"],"r",2,{boy:2684},"German · rich or powerful"),
  C0("boy","zaine","Zaine",[],"en",["lyr"],"e",1,{boy:2573},"English · variant of Zane"),
  C0("boy","stephon","Stephon",["Steph"],"gr",["sur"],"n",2,{boy:2772},"Greek · crown"),
  C0("u","austen","Austen",[],"la",["lit","sur"],"n",2,{girl:3506,boy:2536},"Latin · great or venerable"),
  C0("boy","rook","Rook",[],"en",["nat","lyr"],"k",1,{boy:1962},"English · rook bird or castle"),
  C0("boy","floyd","Floyd",[],"we",["sur"],"d",1,{boy:2250},"Welsh · grey haired"),
  C0("boy","demetri","Demetri",["Demi"],"gr",["lit"],"i",3,{boy:2705},"Greek · follower of Demeter"),
  C0("boy","penn","Penn",[],"en",["sur"],"n",1,{boy:2687},"English · enclosure or hill"),
  C0("boy","edmond","Edmond",["Ed"],"en",["lit","sur"],"d",2,{boy:2014},"English · wealthy protector"),
  C0("boy","cross","Cross",[],"en",["sur","nat"],"s",1,{boy:1974},"English · dweller by the cross"),
  C0("boy","bruin","Bruin",[],"ge",["nat","lyr"],"n",2,{boy:2298},"Dutch · brown bear"),
  C0("boy","parks","Parks",[],"en",["sur","nat"],"s",1,{boy:1980},"English · of the park"),
  C0("boy","zach","Zach",[],"he",["sur"],"h",1,{boy:2480},"Hebrew · remembered"),
  C0("boy","willem","Willem",["Will"],"ge",["sur"],"m",2,{boy:2574},"Dutch · resolute protector"),
  C0("boy","dave","Dave",[],"he",["sur"],"e",1,{boy:2474},"Hebrew · beloved"),
  C0("boy","paolo","Paolo",[],"la",["lit"],"o",3,{boy:1994},"Italian · small or humble"),
  C0("boy","robbie","Robbie",[],"ge",["sur"],"e",2,{boy:2110},"German · bright fame"),
  C0("boy","buck","Buck",[],"en",["nat","lyr"],"k",1,{boy:2004},"English · male deer"),
  C0("boy","rayne","Rayne",[],"en",["nat","lyr"],"e",1,{boy:2007},"English · queen or rain"),
  C0("boy","dru","Dru",[],"en",["sur"],"u",1,{boy:2386},"English · short for Drew"),
  C0("boy","ike","Ike",[],"he",["sur"],"e",1,{boy:2470},"Hebrew · he will laugh"),
  C0("boy","niles","Niles",[],"ir",["sur"],"s",1,{boy:2489},"Irish · champion"),
  C0("boy","cy","Cy",[],"gr",["sur"],"y",1,{boy:2570},"Greek · short for Cyrus"),
  C0("boy","gracen","Gracen",[],"en",["lyr"],"n",2,{boy:2977},"English · son of the steward"),
  C0("boy","hamilton","Hamilton",["Ham"],"sc",["sur","nat"],"n",3,{boy:3156},"Scottish · flat-topped hill"),
  C0("boy","buckley","Buckley",["Buck"],"en",["sur","nat"],"y",2,{boy:2205},"English · meadow of deer"),
  C0("boy","alfie","Alfie",[],"en",["sur"],"e",2,{boy:2076},"English · wise counsel"),
  C0("boy","harland","Harland",[],"en",["sur","nat"],"d",2,{boy:2045},"English · hare land"),
  C0("boy","theron","Theron",[],"gr",["lit"],"n",2,{boy:2456},"Greek · hunter"),
  C0("boy","clive","Clive",[],"en",["sur","vin"],"e",1,{boy:2412},"English · cliff or slope"),
  C0("boy","nolen","Nolen",[],"ir",["sur","vin"],"n",2,{boy:2371},"Irish · descendant of a champion"),
  C0("boy","fulton","Fulton",[],"en",["sur","vin"],"n",2,{boy:2158},"English · settlement enclosure"),
  C0("boy","merlin","Merlin",[],"we",["lit","lyr"],"n",2,{boy:2351},"Welsh · sea fortress"),
  C0("boy","burke","Burke",[],"en",["sur","vin"],"e",1,{boy:2667},"English · fortified hill"),
  C0("boy","dempsey","Dempsey",[],"ir",["sur","lyr"],"y",2,{boy:3022},"Irish · proud one"),
  C0("boy","teller","Teller",[],"en",["sur","nat"],"r",2,{boy:2092},"English · counter or storyteller"),
  C0("boy","sylvester","Sylvester",["Sly"],"la",["vin","lit"],"r",3,{boy:2212},"Latin · of the woods"),
  C0("boy","kirk","Kirk",[],"no",["sur","vin"],"k",1,{boy:2559},"Norse · church"),
  C0("boy","chet","Chet",[],"en",["vin","lyr"],"t",1,{boy:2203},"English · camp or fortress"),
  C0("boy","stefano","Stefano",["Stef"],"la",["vin","lyr"],"o",3,{boy:2545},"Italian · crown or garland"),
  C0("boy","locke","Locke",[],"en",["sur","lit"],"e",1,{boy:2191},"English · enclosure or stronghold"),
  C0("boy","conley","Conley",[],"ir",["sur","lyr"],"y",2,{boy:2533},"Irish · sensible one"),
  C0("boy","jimmie","Jimmie",["Jim"],"en",["vin","nat"],"e",2,{boy:3714},"English · supplanter"),
  C0("boy","dixon","Dixon",[],"en",["sur","vin"],"n",2,{boy:3163},"English · son of Dick"),
  C0("boy","caelan","Caelan",[],"ir",["lyr"],"n",2,{boy:2932},"Irish · slender or powerful"),
  C0("boy","banner","Banner",[],"en",["sur","lit"],"r",2,{boy:2160},"English · flag bearer"),
  C0("boy","nicolai","Nicolai",["Nico"],"gr",["vin","lyr"],"i",3,{boy:2585},"Greek · victory of the people"),
  C0("boy","herbert","Herbert",["Herb","Bert"],"ge",["vin"],"t",2,{boy:2660},"German · bright army"),
  C0("boy","kipp","Kipp",[],"en",["sur","lyr"],"p",1,{boy:2176},"English · pointed hill"),
  C0("boy","filip","Filip",["Phil"],"gr",["vin"],"p",2,{boy:2979},"Greek · lover of horses"),
  C0("boy","marius","Marius",[],"la",["lit","vin"],"s",3,{boy:2555},"Latin · of Mars or manly"),
  C0("boy","kris","Kris",[],"gr",["nat"],"s",1,{boy:3202},"Greek · follower of Christ"),
  C0("boy","heston","Heston",[],"en",["sur","vin"],"n",2,{boy:2320},"English · brushwood town"),
  C0("boy","grayden","Grayden",["Gray"],"en",["sur","lyr"],"n",2,{boy:2703},"English · son of the steward"),
  C0("boy","graeme","Graeme",[],"sc",["sur","vin"],"e",1,{boy:4018},"Scottish · gravelly homestead"),
  C0("boy","reeves","Reeves",[],"en",["sur","lit"],"s",1,{boy:2429},"English · steward or bailiff"),
  C0("boy","octavian","Octavian",["Tavi"],"la",["lit","vin"],"n",4,{boy:2583},"Latin · eighth"),
  C0("boy","alastair","Alastair",["Al"],"sc",["lit","vin"],"r",3,{boy:2164},"Scottish · defender of the people"),
  C0("boy","avett","Avett",[],"en",["sur","lyr"],"t",2,{boy:3837},"English · variant of Everett"),
  C0("boy","adair","Adair",[],"sc",["sur","lyr"],"r",2,{boy:2166},"Scottish · oak tree ford"),
  C0("boy","olsen","Olsen",[],"no",["sur","vin"],"n",2,{boy:2173},"Norse · son of Ole"),
  C0("boy","brandt","Brandt",[],"ge",["sur","vin"],"t",1,{boy:3740},"German · firebrand"),
  C0("boy","eldon","Eldon",[],"en",["sur","vin"],"n",2,{boy:2324},"English · Ellas hill"),
  C0("boy","willis","Willis",["Will"],"en",["sur","vin"],"s",2,{boy:2543},"English · son of William"),
  C0("boy","halen","Halen",[],"en",["sur","lyr"],"n",2,{boy:3115},"English · from the hall"),
  C0("boy","stockton","Stockton",["Stock"],"en",["sur","vin"],"n",2,{boy:3322},"English · tree-stump town"),
  C0("boy","abe","Abe",[],"he",["vin","nat"],"e",1,{boy:2229},"Hebrew · father of many"),
  C0("boy","treyton","Treyton",["Trey"],"en",["sur","lyr"],"n",2,{boy:5067},"English · hay settlement"),
  C0("boy","wayland","Wayland",[],"en",["lit","vin"],"d",2,{boy:2286},"English · land by the road"),
  C0("boy","marty","Marty",[],"la",["nat","vin"],"y",2,{boy:2910},"Latin · of Mars or warlike"),
  C0("boy","vinny","Vinny",[],"la",["nat","lyr"],"y",2,{boy:2231},"Latin · conquering"),
  C0("u","courtney","Courtney",[],"fr",["sur","vin"],"y",2,{girl:2344,boy:3167},"French · short nose or courtier"),
  C0("boy","harlen","Harlen",[],"en",["sur","lyr"],"n",2,{boy:2356},"English · hares land"),
  C0("boy","tyrus","Tyrus",["Ty"],"la",["vin","sur"],"s",2,{boy:3246},"Latin · from Tyre"),
  C0("boy","quade","Quade",[],"ir",["sur","lyr"],"e",1,{boy:2288},"Irish · descendant of Uaid"),
  C0("boy","brogan","Brogan",[],"ir",["sur","lyr"],"n",2,{boy:3440},"Irish · little shoe"),
  C0("boy","kenyon","Kenyon",[],"en",["sur","vin"],"n",2,{boy:3707},"English · settlement of Ennion"),
  C0("boy","mace","Mace",[],"en",["sur","lyr"],"e",1,{boy:2492},"English · gift of God or club"),
  C0("boy","carlton","Carlton",["Carl"],"en",["sur","vin"],"n",2,{boy:2931},"English · free mans town"),
  C0("boy","tye","Tye",[],"en",["sur","lyr"],"e",1,{boy:3247},"English · enclosed pasture"),
  C0("boy","steel","Steel",[],"en",["lit","vin"],"l",1,{boy:3134},"English · like steel"),
  C0("boy","rustin","Rustin",["Rusty"],"en",["sur","lyr"],"n",2,{boy:2261},"English · red-haired"),
  C0("boy","orrin","Orrin",[],"en",["lyr","vin"],"n",2,{boy:2263},"English · river or pine tree"),
  C0("boy","nevin","Nevin",[],"ir",["sur","lyr"],"n",2,{boy:3985},"Irish · little saint or holy"),
  C0("boy","murray","Murray",[],"sc",["sur","vin"],"y",2,{boy:2611},"Scottish · settlement by the sea"),
  C0("boy","kory","Kory",[],"ir",["nat","lyr"],"y",2,{boy:3340},"Irish · from the hollow"),
  C0("boy","hardy","Hardy",[],"ge",["sur","lit"],"y",2,{boy:2499},"German · bold and brave"),
  C0("boy","lynx","Lynx",[],"en",["nat","lit"],"x",1,{boy:2807},"English · wildcat"),
  C0("boy","tiger","Tiger",[],"en",["nat","lit"],"r",2,{boy:3671},"English · the big cat"),
  C0("boy","remmy","Remmy",[],"fr",["nat","lyr"],"y",2,{boy:2900},"French · oarsman"),
  C0("boy","manny","Manny",[],"he",["nat","vin"],"y",2,{boy:3199},"Hebrew · God is with us"),
  C0("boy","marek","Marek",[],"la",["vin","lyr"],"k",2,{boy:2615},"Polish · of Mars or warlike"),
  C0("boy","terence","Terence",["Terry"],"la",["nat"],"e",2,{boy:2729},"Latin · smooth or tender"),
  C0("boy","patton","Patton",["Pat"],"en",["sur"],"n",2,{boy:3262},"English · from the fighters town"),
  C0("u","marion","Marion",[],"fr",["nat"],"n",2,{girl:2042,boy:2491},"French · of the sea"),
  C0("u","marlow","Marlow",[],"en",["sur","lit"],"w",2,{girl:1165,boy:2312},"English · driftwood lake"),
  C0("boy","hawkins","Hawkins",["Hawk"],"en",["sur"],"s",2,{boy:3551},"English · son of Hawk"),
  C0("boy","bauer","Bauer",[],"ge",["sur"],"r",2,{boy:2509},"German · farmer"),
  C0("boy","fritz","Fritz",[],"ge",["nat"],"z",1,{boy:2755},"German · peaceful ruler"),
  C0("boy","larson","Larson",["Lars"],"sc",["sur"],"n",2,{boy:2616},"Scandinavian · son of Lars"),
  C0("u","loren","Loren",[],"la",["nat"],"n",2,{girl:3010,boy:3062},"Latin · from Laurentum"),
  C0("boy","pete","Pete",[],"gr",["nat"],"e",1,{boy:2370},"Greek · rock"),
  C0("boy","price","Price",[],"we",["sur"],"e",1,{boy:2347},"Welsh · son of Rhys"),
  C0("u","bennie","Bennie",["Ben"],"en",["nat"],"e",2,{girl:2817,boy:2535},"English · blessed son"),
  C0("boy","ken","Ken",[],"sc",["nat"],"n",1,{boy:3276},"Scottish · handsome"),
  C0("boy","zeno","Zeno",[],"gr",["nat"],"o",2,{boy:2517},"Greek · gift of Zeus"),
  C0("boy","sorin","Sorin",[],"la",["nat"],"n",2,{boy:2394},"Latin · sun"),
  C0("boy","walton","Walton",[],"en",["sur"],"n",2,{boy:2422},"English · walled town"),
  C0("boy","ferris","Ferris",[],"ir",["sur","lit"],"s",2,{boy:3159},"Irish · rock"),
  C0("boy","oakes","Oakes",[],"en",["sur","nat"],"s",1,{boy:2433},"English · by the oak trees"),
  C0("boy","walden","Walden",[],"en",["sur","lit"],"n",2,{boy:3187},"English · wooded valley"),
  C0("boy","rick","Rick",[],"ge",["nat"],"k",1,{boy:3047},"Germanic · powerful ruler"),
  C0("u","kirby","Kirby",[],"en",["sur"],"y",2,{girl:2664,boy:3275},"English · church settlement"),
  C0("boy","brant","Brant",[],"en",["sur"],"t",1,{boy:3371},"English · fiery torch"),
  C0("boy","gareth","Gareth",["Gare"],"we",["lit"],"h",2,{boy:2786},"Welsh · gentle"),
  C0("boy","tim","Tim",[],"gr",["nat"],"m",1,{boy:3190},"Greek · honoring"),
  C0("boy","saxon","Saxon",[],"en",["sur","nat"],"n",2,{boy:3097},"English · swordsman"),
  C0("boy","geoffrey","Geoffrey",["Geoff"],"ge",["nat","lit"],"y",2,{boy:3641},"Germanic · peace of God"),
  C0("boy","ward","Ward",[],"en",["sur","nat"],"d",1,{boy:2839},"English · guardian"),
  C0("boy","collier","Collier",[],"en",["sur"],"r",2,{boy:3079},"English · coal miner"),
  C0("boy","dutch","Dutch",[],"en",["nat"],"h",1,{boy:2472},"English · from the Netherlands"),
  C0("boy","rainer","Rainer",[],"ge",["nat"],"r",2,{boy:3399},"Germanic · wise army"),
  C0("boy","erwin","Erwin",[],"ge",["nat"],"n",2,{boy:2408},"Germanic · army friend"),
  C0("boy","herman","Herman",[],"ge",["nat"],"n",2,{boy:2384},"Germanic · army man"),
  C0("boy","welles","Welles",[],"en",["sur"],"s",1,{boy:2946},"English · by the springs"),
  C0("boy","bowman","Bowman",[],"en",["sur","nat"],"n",2,{boy:2414},"English · archer"),
  C0("boy","woodson","Woodson",[],"en",["sur"],"n",2,{boy:2421},"English · son of the woods"),
  C0("boy","audie","Audie",[],"en",["nat"],"e",2,{boy:3654},"English · noble strength"),
  C0("boy","erling","Erling",[],"sc",["nat"],"g",2,{boy:4353},"Scandinavian · descendant of a nobleman"),
  C0("boy","carsten","Carsten",[],"ge",["nat"],"n",2,{boy:4372},"German · Christian man"),
  C0("boy","zac","Zac",[],"he",["nat"],"c",1,{boy:3183},"Hebrew · the Lord remembers"),
  C0("boy","kerry","Kerry",[],"ir",["sur","nat"],"y",2,{boy:2466},"Irish · dark haired"),
  C0("u","tracy","Tracy",[],"fr",["sur","nat"],"y",2,{girl:2154,boy:3859},"French · domain of Thracius"),
  C0("boy","jeff","Jeff",[],"ge",["nat"],"f",1,{boy:3350},"Germanic · peace of God"),
  C0("boy","ronny","Ronny",[],"sc",["nat"],"y",2,{boy:3394},"Scandinavian · rules with counsel"),
  C0("boy","rusty","Rusty",[],"en",["nat","pun"],"y",2,{boy:2368},"English · red haired"),
  C0("boy","olivier","Olivier",["Ollie"],"fr",["nat"],"r",3,{boy:2551},"French · olive tree"),
  C0("boy","hart","Hart",[],"en",["sur","nat"],"t",1,{boy:2407},"English · stag"),
  C0("boy","chancellor","Chancellor",["Chance"],"en",["sur","vin"],"r",3,{boy:4513},"English · keeper of records"),
  C0("boy","judge","Judge",[],"en",["nat"],"e",1,{boy:2656},"English · one who judges"),
  C0("boy","llewyn","Llewyn",[],"we",["lit"],"n",2,{boy:4182},"Welsh · lionlike"),
  C0("boy","marshal","Marshal",["Marsh"],"fr",["sur","vin"],"l",2,{boy:3407},"French · one who keeps horses"),
  C0("boy","mercer","Mercer",[],"en",["sur","vin"],"r",2,{boy:2552},"English · merchant or trader"),
  C0("boy","wolfe","Wolfe",[],"en",["sur","nat"],"e",1,{boy:2837},"English · wolf"),
  C0("boy","pace","Pace",[],"en",["sur"],"e",1,{boy:3263},"English · peace"),
  C0("boy","kurtis","Kurtis",["Kurt"],"en",["vin"],"s",2,{boy:2744},"English · courteous"),
  C0("boy","holton","Holton",[],"en",["sur"],"n",2,{boy:3068},"English · settlement in a hollow"),
  C0("boy","bradford","Bradford",["Brad"],"en",["sur"],"d",2,{boy:3573},"English · broad ford"),
  C0("boy","berkley","Berkley",[],"en",["sur"],"y",2,{boy:3509},"English · birch tree meadow"),
  C0("boy","brix","Brix",[],"ge",["sur"],"x",1,{boy:3025},"German · dweller by the bridge"),
  C0("boy","alexei","Alexei",["Alex"],"gr",["vin"],"i",3,{boy:3308},"Greek · defender"),
  C0("boy","trystan","Trystan",["Trys"],"we",["lit","lyr"],"n",2,{boy:6171},"Welsh · noise or sorrowful"),
  C0("boy","cutter","Cutter",[],"en",["sur"],"r",2,{boy:2708},"English · one who cuts cloth"),
  C0("boy","gabe","Gabe",[],"he",["vin"],"e",1,{boy:4654},"Hebrew · short form of Gabriel"),
  C0("boy","rennick","Rennick",[],"en",["sur"],"k",2,{boy:5445},"English · powerful ruler"),
  C0("boy","dino","Dino",[],"en",["vin"],"o",2,{boy:2822},"Italian · little sword"),
  C0("boy","rowe","Rowe",[],"en",["sur"],"e",1,{boy:2608},"English · dweller by the hedgerow"),
  C0("boy","mikey","Mikey",[],"he",["vin"],"y",2,{boy:2613},"Hebrew · diminutive of Michael"),
  C0("boy","aramis","Aramis",[],"fr",["lit","vin"],"s",3,{boy:3751},"French · musketeer name"),
  C0("boy","cyril","Cyril",[],"gr",["vin"],"l",2,{boy:3165},"Greek · lordly"),
  C0("boy","hadrian","Hadrian",[],"la",["vin","lit"],"n",3,{boy:2627},"Latin · from Hadria"),
  C0("boy","beaumont","Beaumont",[],"fr",["sur","vin"],"t",2,{boy:2635},"French · beautiful mountain"),
  C0("boy","galen","Galen",[],"gr",["vin"],"n",2,{boy:4492},"Greek · calm or healer"),
  C0("boy","chadwick","Chadwick",["Chad"],"en",["sur"],"k",2,{boy:4234},"English · dairy farm of Chad"),
  C0("boy","stevie","Stevie",[],"gr",["vin"],"e",2,{boy:2642},"Greek · crown or garland"),
  C0("boy","creighton","Creighton",[],"en",["sur"],"n",2,{boy:3830},"English · rocky place"),
  C0("boy","alexandros","Alexandros",["Alex"],"gr",["lit","vin"],"s",4,{boy:2672},"Greek · defender of the people"),
  C0("boy","giacomo","Giacomo",[],"en",["lit","vin"],"o",3,{boy:2662},"Italian · supplanter"),
  C0("boy","weldon","Weldon",[],"en",["sur"],"n",2,{boy:2769},"English · hill with a spring"),
  C0("boy","gaspar","Gaspar",[],"fr",["vin"],"r",2,{boy:3071},"French · treasurer"),
  C0("boy","lawton","Lawton",[],"en",["sur"],"n",2,{boy:3273},"English · town on a hill"),
  C0("boy","sander","Sander",[],"gr",["vin"],"r",2,{boy:2996},"Greek · defender of men"),
  C0("boy","mathis","Mathis",[],"fr",["vin"],"s",2,{boy:3336},"French · gift of God"),
  C0("u","maven","Maven",[],"en",["vin"],"n",2,{girl:1583,boy:3531},"Yiddish · expert or connoisseur"),
  C0("boy","caeden","Caeden",[],"en",["vin"],"n",2,{boy:3739},"English · spirit of battle"),
  C0("boy","augusto","Augusto",[],"en",["vin","lit"],"o",3,{boy:2714},"Italian · majestic or venerable"),
  C0("boy","willard","Willard",["Will"],"en",["sur","vin"],"d",2,{boy:2722},"English · resolute or brave"),
  C0("boy","darin","Darin",[],"en",["vin"],"n",2,{boy:3645},"English · great one"),
  C0("u","clarke","Clarke",[],"en",["sur"],"e",1,{girl:1523,boy:3227},"English · scholar or clerk"),
  C0("boy","pearson","Pearson",[],"en",["sur"],"n",2,{boy:3601},"English · son of Piers"),
  C0("boy","pascal","Pascal",[],"fr",["vin","lit"],"l",2,{boy:3604},"French · born at Easter"),
  C0("boy","cale","Cale",[],"en",["vin"],"e",1,{boy:2760},"English · short form of Caleb"),
  C0("boy","eugenio","Eugenio",[],"en",["vin","lit"],"o",4,{boy:3285},"Italian · wellborn or noble"),
  C0("boy","kazimir","Kazimir",["Kaz"],"gr",["vin","lit"],"r",3,{boy:3793},"Slavic · destroyer of peace"),
  C0("boy","iain","Iain",[],"sc",["vin"],"n",2,{boy:7515},"Scottish · God is gracious"),
  C0("boy","tadhg","Tadhg",[],"ir",["lit","vin"],"g",1,{boy:3672},"Irish · poet or philosopher"),
  C0("boy","donatello","Donatello",[],"en",["lit","vin"],"o",4,{boy:4665},"Italian · given by God"),
  C0("boy","robinson","Robinson",["Robin"],"en",["sur","lit"],"n",3,{boy:3599},"English · son of Robin"),
  C0("boy","matt","Matt",[],"he",["vin"],"t",1,{boy:3786},"Hebrew · short form of Matthew"),
  C0("boy","blayne","Blayne",[],"ir",["vin"],"e",1,{boy:2986},"Irish · slender or lean"),
  C0("boy","niccolo","Niccolo",[],"en",["lit","vin"],"o",3,{boy:3054},"Italian · victory of the people"),
  C0("boy","wayde","Wayde",[],"en",["sur"],"e",1,{boy:2679},"English · at the ford"),
  C0("boy","cliff","Cliff",[],"en",["sur","nat"],"f",1,{boy:2929},"English · ford by a slope"),
  C0("boy","slate","Slate",[],"en",["nat"],"e",1,{boy:2681},"English · fine-grained rock"),
  C0("boy","roper","Roper",[],"en",["sur"],"r",2,{boy:3045},"English · maker of ropes"),
  C0("boy","dallin","Dallin",[],"en",["vin"],"n",2,{boy:3362},"English · from the valley"),
  C0("boy","talan","Talan",[],"en",["vin"],"n",2,{boy:3389},"English · claw or talon"),
  C0("boy","levin","Levin",[],"ge",["vin"],"n",2,{boy:3003},"German · dear friend"),
  C0("boy","quill","Quill",[],"en",["nat"],"l",1,{boy:3331},"English · feather pen"),
  C0("boy","cobe","Cobe",[],"he",["vin"],"e",1,{boy:4827},"Hebrew · short form of Cobey"),
  C0("boy","vidal","Vidal",[],"la",["vin","sur"],"l",2,{boy:3095},"Latin · life or vital"),
  C0("boy","timur","Timur",[],"gr",["vin","lit"],"r",2,{boy:2605},"Turkic · iron"),
  C0("boy","hershel","Hershel",[],"he",["vin"],"l",2,{boy:2701},"Yiddish · deer"),
  C0("boy","cedrick","Cedrick",["Ced"],"en",["vin"],"k",2,{boy:3368},"English · kindly or war chief"),
  C0("boy","kordell","Kordell",[],"en",["sur"],"l",2,{boy:3701},"English · maker of cord"),
  C0("boy","arch","Arch",["Archie"],"en",["sur","vin"],"h",1,{boy:2795},"English · bold or eminent"),
  C0("boy","walt","Walt",[],"en",["vin"],"t",1,{boy:3316},"English · ruler of the army"),
  C0("boy","darrin","Darrin",[],"ir",["vin"],"n",2,{boy:3435},"Irish · great"),
  C0("boy","wellington","Wellington",["Wells"],"en",["sur","lit"],"n",3,{boy:4262},"English · estate by the temple clearing"),
  C0("boy","wheeler","Wheeler",[],"en",["sur"],"r",2,{boy:3455},"English · wheel maker"),
  C0("boy","huey","Huey",[],"en",["vin"],"y",2,{boy:2976},"English · heart or mind"),
  C0("boy","thane","Thane",[],"en",["lit","nat"],"e",1,{boy:3388},"English · noble landholder"),
  C0("boy","hanson","Hanson",[],"en",["sur"],"n",2,{boy:3013},"English · son of Han"),
  C0("boy","dusty","Dusty",[],"en",["vin","nat"],"y",2,{boy:3563},"English · dusty place"),
  C0("boy","davy","Davy",[],"he",["vin"],"y",2,{boy:5174},"Welsh · beloved"),
  C0("boy","daren","Daren",[],"ir",["vin"],"n",2,{boy:3223},"Irish · great"),
  C0("boy","mick","Mick",[],"ir",["vin"],"k",1,{boy:4602},"Irish · short form of Michael"),
  C0("boy","ted","Ted",[],"en",["vin"],"d",1,{boy:3191},"English · gift of God"),
  C0("boy","rider","Rider",[],"en",["sur","nat"],"r",2,{boy:3679},"English · horseman"),
  C0("boy","lowell","Lowell",[],"fr",["sur"],"l",2,{boy:3272},"French · little wolf"),
  C0("boy","olen","Olen",[],"en",["vin"],"n",2,{boy:3473},"Scandinavian · ancestor"),
  C0("boy","cutler","Cutler",[],"en",["sur"],"r",2,{boy:3119},"English · knife maker"),
  C0("boy","dansby","Dansby",[],"en",["sur"],"y",2,{boy:4823},"English · Dans settlement"),
  C0("boy","brad","Brad",[],"en",["vin"],"d",1,{boy:4377},"English · broad clearing"),
  C0("boy","sagan","Sagan",[],"ir",["sur","lit"],"n",2,{boy:5434},"Irish · wise one"),
  C0("boy","pearce","Pearce",[],"en",["sur"],"e",1,{boy:4579},"English · rock"),
  C0("boy","reeve","Reeve",[],"en",["sur","vin"],"e",1,{boy:3468},"English · bailiff or steward"),
  C0("boy","karsten","Karsten",[],"ge",["sur"],"n",2,{boy:4193},"German · anointed"),
  C0("boy","chauncey","Chauncey",[],"en",["sur","vin"],"y",2,{boy:4512},"English · chancellor"),
  C0("boy","jim","Jim",[],"en",["vin"],"m",1,{boy:3149},"English · supplanter"),
  C0("boy","hubert","Hubert",[],"ge",["vin"],"t",2,{boy:3428},"German · bright heart"),
  C0("boy","graydon","Graydon",["Gray"],"en",["sur"],"n",2,{boy:5542},"English · gray hill"),
  C0("boy","prescott","Prescott",[],"en",["sur"],"t",2,{boy:2959},"English · priests cottage"),
  C0("boy","wilbur","Wilbur",[],"ge",["vin"],"r",2,{boy:3958},"German · resolute and bright"),
  C0("boy","carlisle","Carlisle",[],"en",["sur"],"e",2,{boy:3297},"English · fortified town"),
  C0("boy","kiernan","Kiernan",[],"ir",["sur"],"n",2,{boy:3419},"Irish · little dark one"),
  C0("boy","tilden","Tilden",[],"en",["sur"],"n",2,{boy:2993},"English · fertile valley"),
  C0("boy","arlow","Arlow",[],"ir",["sur","lyr"],"w",2,{boy:3175},"Irish · between two hills"),
  C0("boy","lochlann","Lochlann",["Loch"],"ir",["sur"],"n",2,{boy:3337},"Irish · land of the lakes"),
  C0("boy","frederic","Frederic",["Fred"],"ge",["vin"],"c",3,{boy:2978},"German · peaceful ruler"),
  C0("boy","shaw","Shaw",[],"en",["sur","nat"],"w",1,{boy:4727},"English · dweller by the wood"),
  C0("boy","stoney","Stoney",[],"en",["nat","vin"],"y",2,{boy:3251},"English · stony place"),
  C0("boy","whitten","Whitten",[],"en",["sur"],"n",2,{boy:2886},"English · white settlement"),
  C0("boy","witt","Witt",[],"en",["sur","vin"],"t",1,{boy:2945},"English · white or wise"),
  C0("boy","maclin","Maclin",[],"ir",["sur"],"n",2,{boy:4089},"Irish · son of Flann"),
  C0("girl","viola","Viola",["Vi"],"la",["lit","nat"],"a",3,{girl:1013},"Latin · violet flower"),
  C0("girl","erika","Erika",["Rika"],"no",["nat"],"a",3,{girl:1112},"Norse · eternal ruler"),
  C0("girl","christine","Christine",["Chris","Christy"],"gr",["sur","vin"],"e",2,{girl:1276},"Greek · follower of Christ"),
  C0("girl","beverly","Beverly",["Bev"],"en",["vin","nat"],"y",3,{girl:1019},"English · beaver stream"),
  C0("girl","claudia","Claudia",["Claude"],"la",["vin"],"a",3,{girl:1097},"Latin · lame or enclosure"),
  C0("girl","libby","Libby",[],"en",["nat"],"y",2,{girl:1147},"English · diminutive of Elizabeth"),
  C0("girl","shea","Shea",[],"ir",["sur","nat"],"a",1,{girl:1150},"Irish · admirable or hawk-like"),
  C0("girl","lindsey","Lindsey",["Lin"],"en",["sur"],"y",2,{girl:1370},"English · island of linden trees"),
  C0("girl","moriah","Moriah",["Mori"],"he",["nat","lyr"],"h",3,{girl:1093},"Hebrew · chosen by God"),
  C0("girl","montana","Montana",["Monty"],"la",["nat","sur"],"a",3,{girl:1033},"Latin · mountainous land"),
  C0("girl","bernadette","Bernadette",["Bernie","Detta"],"fr",["vin"],"e",3,{girl:1037},"French · brave as a bear"),
  C0("girl","renee","Renee",[],"fr",["vin"],"e",2,{girl:1100},"French · reborn"),
  C0("girl","rae","Rae",[],"en",["nat"],"e",1,{girl:1301},"English · ewe or grace"),
  C0("girl","antonia","Antonia",["Toni","Nia"],"la",["vin"],"a",4,{girl:1284},"Latin · priceless or praiseworthy"),
  C0("girl","desiree","Desiree",["Desi"],"fr",["lyr"],"e",3,{girl:1433},"French · desired"),
  C0("girl","adrienne","Adrienne",["Adri"],"la",["vin","sur"],"e",3,{girl:1683},"Latin · from Hadria"),
  C0("girl","dixie","Dixie",[],"en",["nat","lyr"],"e",2,{girl:1610},"English · tenth or southern region"),
  C0("girl","ann","Ann",["Annie"],"he",["vin"],"n",1,{girl:1079},"Hebrew · grace"),
  C0("girl","annelise","Annelise",["Anne","Lise"],"ge",["vin"],"e",3,{girl:1074},"German · grace and consecrated"),
  C0("girl","evalyn","Evalyn",["Eva","Lyn"],"en",["lyr"],"n",3,{girl:1432},"English · variant of Evelyn"),
  C0("girl","danica","Danica",["Dani"],"la",["nat","sur"],"a",3,{girl:1639},"Slavic · morning star"),
  C0("girl","marissa","Marissa",["Rissa"],"la",["lyr"],"a",3,{girl:1677},"Latin · of the sea"),
  C0("girl","alannah","Alannah",["Lana"],"ir",["lyr"],"h",3,{girl:1682},"Irish · little rock or dear child"),
  C0("girl","ivana","Ivana",["Iva"],"he",["vin"],"a",3,{girl:1103},"Slavic · God is gracious"),
  C0("girl","joan","Joan",["Joanie"],"he",["vin"],"n",1,{girl:1089},"Hebrew · God is gracious"),
  C0("girl","mollie","Mollie",["Moll"],"he",["nat"],"e",2,{girl:1113},"Hebrew · diminutive of Mary"),
  C0("girl","wendy","Wendy",["Wen"],"en",["lit","lyr"],"y",2,{girl:1341},"English · friend or literary coinage"),
  C0("girl","sally","Sally",["Sal"],"he",["nat"],"y",2,{girl:1151},"Hebrew · princess"),
  C0("girl","marian","Marian",["Mari"],"la",["vin","lit"],"n",3,{girl:1102},"Latin · of the sea or bitter"),
  C0("girl","rhiannon","Rhiannon",["Rhi"],"we",["lyr","lit"],"n",3,{girl:1119},"Welsh · great queen"),
  C0("girl","ida","Ida",[],"ge",["vin"],"a",2,{girl:1124},"German · industrious one"),
  C0("girl","sonia","Sonia",["Sonny"],"gr",["lyr"],"a",3,{girl:1300},"Greek · wisdom"),
  C0("girl","lucie","Lucie",["Lu"],"la",["vin"],"e",2,{girl:1130},"Latin · light"),
  C0("girl","annalee","Annalee",["Anna","Lee"],"he",["lyr"],"e",3,{girl:1206},"Hebrew · grace and meadow"),
  C0("girl","sharon","Sharon",[],"he",["vin","nat"],"n",2,{girl:1251},"Hebrew · a fertile plain"),
  C0("girl","brenda","Brenda",["Bren"],"no",["vin"],"a",2,{girl:1531},"Norse · sword or torch"),
  C0("girl","farrah","Farrah",[],"en",["lyr"],"h",2,{girl:1331},"English · beautiful or pleasant"),
  C0("girl","angeline","Angeline",["Angie"],"gr",["lyr"],"e",3,{girl:1580},"Greek · messenger or angel"),
  C0("girl","silvia","Silvia",["Sil"],"la",["nat","lit"],"a",3,{girl:1235},"Latin · of the forest"),
  C0("girl","robyn","Robyn",["Rob"],"en",["nat","sur"],"n",2,{girl:1437},"English · bright fame"),
  C0("girl","martina","Martina",["Tina","Marti"],"la",["vin"],"a",3,{girl:1368},"Latin · warlike or of Mars"),
  C0("girl","liz","Liz",[],"he",["nat"],"z",1,{girl:1259},"Hebrew · diminutive of Elizabeth"),
  C0("girl","melania","Melania",["Mel"],"gr",["vin"],"a",4,{girl:1170},"Greek · dark or black"),
  C0("girl","leni","Leni",[],"ge",["nat"],"i",2,{girl:1176},"German · diminutive of Helena"),
  C0("girl","emilie","Emilie",["Em","Emmie"],"la",["vin"],"e",3,{girl:1314},"Latin · rival or industrious"),
  C0("girl","yasmine","Yasmine",["Yas"],"fr",["nat","lyr"],"e",2,{girl:1183},"Persian · jasmine flower"),
  C0("girl","odessa","Odessa",["Odie"],"gr",["lit","lyr"],"a",3,{girl:1192},"Greek · long journey"),
  C0("girl","margaux","Margaux",["Margo"],"fr",["vin","lyr"],"x",2,{girl:1198},"French · pearl"),
  C0("girl","annabel","Annabel",["Anna","Bel"],"la",["lyr","lit"],"l",3,{girl:2074},"Latin · loving and beautiful"),
  C0("girl","tillie","Tillie",[],"ge",["nat"],"e",2,{girl:1263},"German · diminutive of Matilda"),
  C0("girl","rita","Rita",[],"la",["vin"],"a",2,{girl:1288},"Latin · pearl"),
  C0("girl","rue","Rue",[],"en",["nat","lit"],"e",1,{girl:1319},"English · herb of grace or regret"),
  C0("girl","cassie","Cassie",[],"gr",["nat"],"e",2,{girl:1283},"Greek · diminutive of Cassandra"),
  C0("girl","juno","Juno",[],"la",["lit","nat"],"o",2,{girl:1255},"Roman · queen of the gods"),
  C0("girl","marlene","Marlene",["Mar"],"ge",["vin"],"e",2,{girl:1264},"German · blend of Maria and Magdalene"),
  C0("girl","roslyn","Roslyn",["Roz"],"la",["lyr"],"n",2,{girl:1429},"Latin · pretty rose"),
  C0("girl","cambria","Cambria",["Cam"],"la",["sur","nat"],"a",3,{girl:1998},"Latin · poetic name for Wales"),
  C0("girl","heather","Heather",[],"en",["nat"],"r",2,{girl:1268},"English · flowering heath plant"),
  C0("girl","annette","Annette",["Annie","Nettie"],"fr",["vin"],"e",2,{girl:1451},"French · little grace"),
  C0("girl","emeri","Emeri",["Em"],"ge",["sur","lyr"],"i",3,{girl:1463},"German · brave power"),
  C0("girl","zella","Zella",[],"ge",["lyr"],"a",2,{girl:1733},"German · blessed or happy"),
  C0("girl","mattie","Mattie",[],"ge",["nat"],"e",2,{girl:1006},"German · diminutive of Matilda"),
  C0("girl","jewel","Jewel",[],"fr",["nat","lyr"],"l",1,{girl:1515},"French · precious gem"),
  C0("girl","lorraine","Lorraine",["Rainey"],"fr",["vin","sur"],"e",2,{girl:1045},"French · from the region of Lorraine"),
  C0("girl","roxanne","Roxanne",["Roxy"],"gr",["lyr"],"e",2,{girl:1311},"Persian · dawn or bright"),
  C0("girl","rowen","Rowen",["Ro"],"we",["sur","nat"],"n",2,{girl:1407},"Welsh · little redhead"),
  C0("girl","selina","Selina",["Lina"],"gr",["lyr"],"a",3,{girl:1272},"Greek · moon"),
  C0("girl","tess","Tess",[],"gr",["vin"],"s",1,{girl:1778},"Greek · harvester"),
  C0("girl","lorena","Lorena",["Lori"],"la",["lyr"],"a",3,{girl:1292},"Latin · laurel"),
  C0("girl","kristen","Kristen",["Kris"],"gr",["vin"],"n",2,{girl:1992},"Greek · follower of Christ"),
  C0("girl","giada","Giada",[],"en",["lyr"],"a",2,{girl:1440},"Italian · jade"),
  C0("girl","arwen","Arwen",[],"we",["lit"],"n",2,{girl:1385},"Welsh · noble maiden"),
  C0("girl","jessa","Jessa",["Jess"],"he",["nat"],"a",2,{girl:2227},"Hebrew · God beholds"),
  C0("girl","zinnia","Zinnia",["Zin"],"la",["nat"],"a",3,{girl:1285},"Latin · flower name"),
  C0("girl","carmella","Carmella",["Carm"],"la",["lyr"],"a",3,{girl:1290},"Latin · garden"),
  C0("girl","rosalynn","Rosalynn",["Rosa","Lynn"],"la",["lyr"],"n",3,{girl:1611},"Latin · pretty rose"),
  C0("girl","cristina","Cristina",["Cris","Tina"],"gr",["vin"],"a",3,{girl:1630},"Greek · follower of Christ"),
  C0("girl","kristina","Kristina",["Kris","Tina"],"gr",["vin"],"a",3,{girl:1729},"Greek · follower of Christ"),
  C0("girl","althea","Althea",["Thea"],"gr",["lyr"],"a",3,{girl:1308},"Greek · healer"),
  C0("girl","rosalind","Rosalind",["Roz"],"ge",["lit","lyr"],"d",3,{girl:1521},"Germanic · gentle horse"),
  C0("girl","elinor","Elinor",["Nell"],"gr",["vin"],"r",3,{girl:1509},"Greek · light"),
  C0("girl","carina","Carina",[],"la",["lyr"],"a",3,{girl:1578},"Latin · beloved"),
  C0("girl","janie","Janie",["Jane"],"he",["vin"],"e",2,{girl:1330},"Hebrew · God is gracious"),
  C0("girl","vivien","Vivien",["Viv"],"la",["lit"],"n",3,{girl:1844},"Latin · alive"),
  C0("girl","magdalene","Magdalene",["Maggie"],"gr",["lit"],"e",3,{girl:1343},"Greek · of Magdala"),
  C0("girl","anita","Anita",["Nita"],"he",["vin"],"a",3,{girl:1346},"Hebrew · grace"),
  C0("girl","elissa","Elissa",["Lissa"],"gr",["lyr"],"a",3,{girl:1850},"Greek · noble"),
  C0("girl","sidney","Sidney",["Sid"],"en",["sur","vin"],"y",2,{girl:1873},"English · wide island"),
  C0("girl","leora","Leora",["Lee"],"he",["lyr"],"a",3,{girl:1354},"Hebrew · light"),
  C0("girl","georgie","Georgie",["Geo"],"gr",["vin"],"e",2,{girl:1364},"Greek · farmer"),
  C0("girl","kasey","Kasey",[],"ir",["sur","vin"],"y",2,{girl:1875},"Irish · vigilant"),
  C0("girl","letty","Letty",[],"la",["vin"],"y",2,{girl:1383},"Latin · joy"),
  C0("girl","dottie","Dottie",["Dot"],"gr",["vin"],"e",2,{girl:1384},"Greek · gift of God"),
  C0("girl","ally","Ally",[],"gr",["vin"],"y",2,{girl:2137},"Greek · noble"),
  C0("girl","lori","Lori",[],"la",["vin"],"i",2,{girl:1727},"Latin · laurel"),
  C0("girl","pepper","Pepper",[],"en",["nat","pun"],"r",2,{girl:1905},"English · spice name"),
  C0("girl","theresa","Theresa",["Tess","Reese"],"gr",["vin"],"a",3,{girl:1549},"Greek · harvester"),
  C0("girl","inez","Inez",[],"gr",["lyr"],"z",2,{girl:1401},"Greek · pure"),
  C0("girl","katrina","Katrina",["Kat","Trina"],"gr",["vin"],"a",3,{girl:2226},"Greek · pure"),
  C0("girl","eleanore","Eleanore",["Ellie","Nora"],"gr",["lyr"],"e",3,{girl:1403},"Greek · light"),
  C0("girl","macey","Macey",[],"fr",["sur","vin"],"y",2,{girl:1613},"French · weapon bearer"),
  C0("girl","paulette","Paulette",[],"la",["lyr"],"e",2,{girl:1537},"Latin · small"),
  C0("girl","belinda","Belinda",["Linda"],"ge",["lyr"],"a",3,{girl:1831},"Germanic · bright serpent"),
  C0("girl","ester","Ester",[],"he",["nat"],"r",2,{girl:1576},"Hebrew · star"),
  C0("girl","brenna","Brenna",[],"ir",["lyr"],"a",2,{girl:1852},"Irish · raven"),
  C0("girl","pia","Pia",[],"la",["lyr"],"a",2,{girl:1453},"Latin · pious"),
  C0("girl","natalee","Natalee",["Nat"],"la",["vin"],"e",3,{girl:2726},"Latin · birthday"),
  C0("girl","alissa","Alissa",["Lissa"],"ge",["lyr"],"a",3,{girl:1961},"Germanic · noble"),
  C0("girl","georgiana","Georgiana",["Georgie"],"gr",["lit","lyr"],"a",4,{girl:1421},"Greek · farmer"),
  C0("girl","echo","Echo",[],"gr",["nat","lit"],"o",2,{girl:2340},"Greek · reflected sound"),
  C0("girl","bryanna","Bryanna",["Bry"],"ir",["lyr"],"a",3,{girl:2321},"Irish · strong"),
  C0("girl","julianne","Julianne",["Julie"],"la",["lyr"],"e",3,{girl:1994},"Latin · youthful"),
  C0("girl","geneva","Geneva",["Genie"],"fr",["vin"],"a",3,{girl:1660},"French · juniper"),
  C0("girl","gwyneth","Gwyneth",["Gwyn"],"we",["lyr"],"h",2,{girl:1774},"Welsh · blessed"),
  C0("girl","lindsay","Lindsay",["Lindy"],"en",["sur","vin"],"y",2,{girl:2199},"English · island of linden"),
  C0("girl","shirley","Shirley",[],"en",["sur","vin"],"y",2,{girl:1581},"English · bright meadow"),
  C0("girl","calista","Calista",["Callie"],"gr",["lyr"],"a",3,{girl:1599},"Greek · most beautiful"),
  C0("girl","nadine","Nadine",["Nada"],"fr",["lyr"],"e",2,{girl:1625},"French · hope"),
  C0("girl","avalon","Avalon",[],"we",["lit"],"n",3,{girl:1465},"Welsh · island of apples"),
  C0("girl","louella","Louella",["Lou","Ella"],"ge",["lyr"],"a",3,{girl:1469},"Germanic · famous warrior"),
  C0("girl","larissa","Larissa",["Lara"],"gr",["lyr"],"a",3,{girl:1648},"Greek · citadel"),
  C0("girl","marcela","Marcela",["Marcy"],"la",["lyr"],"a",3,{girl:1554},"Latin · warlike"),
  C0("girl","audra","Audra",[],"en",["lyr"],"a",2,{girl:2015},"English · noble strength"),
  C0("girl","anora","Anora",["Nora"],"en",["lyr"],"a",3,{girl:1491},"English · honor"),
  C0("girl","carlie","Carlie",[],"ge",["vin"],"e",2,{girl:2678},"Germanic · free woman"),
  C0("girl","roma","Roma",[],"la",["lit"],"a",2,{girl:1496},"Latin · from Rome"),
  C0("girl","nicolette","Nicolette",["Nicki"],"gr",["lyr"],"e",3,{girl:1724},"Greek · victory of the people"),
  C0("girl","vivianne","Vivianne",["Viv"],"la",["lyr"],"e",3,{girl:1769},"Latin · alive"),
  C0("girl","lula","Lula",[],"ge",["vin"],"a",2,{girl:1931},"Germanic · famous warrior"),
  C0("girl","emme","Emme",["Em"],"ge",["vin"],"e",1,{girl:2291},"Germanic · whole"),
  C0("girl","evalina","Evalina",["Eva","Lina"],"ge",["lyr"],"a",4,{girl:1517},"Germanic · life"),
  C0("girl","hellen","Hellen",[],"gr",["vin"],"n",2,{girl:1803},"Greek · light"),
  C0("girl","lotus","Lotus",[],"gr",["nat"],"s",2,{girl:1824},"Greek · flower name"),
  C0("girl","elly","Elly",[],"gr",["vin"],"y",2,{girl:1619},"Greek · light"),
  C0("girl","liza","Liza",["Liz"],"he",["vin"],"a",2,{girl:1646},"Hebrew · God is my oath"),
  C0("girl","eloisa","Eloisa",["Elo"],"fr",["lyr"],"a",3,{girl:1529},"French · healthy"),
  C0("girl","cindy","Cindy",[],"gr",["vin"],"y",2,{girl:1939},"Greek · from Mount Kynthos"),
  C0("girl","agatha","Agatha",["Aggie"],"gr",["vin","lit"],"a",3,{girl:1709},"Greek · good, honorable"),
  C0("girl","annabeth","Annabeth",["Anna","Beth"],"en",["lyr"],"h",3,{girl:2096},"English · combination of Anna and Beth"),
  C0("girl","camellia","Camellia",["Cami"],"la",["nat","lyr"],"a",3,{girl:1680},"Latin · the camellia flower"),
  C0("girl","millicent","Millicent",["Millie"],"ge",["vin"],"t",3,{girl:1897},"Germanic · strong in work"),
  C0("girl","arlene","Arlene",["Arlie"],"ir",["vin"],"e",2,{girl:1641},"Irish · pledge"),
  C0("girl","judy","Judy",[],"he",["vin"],"y",2,{girl:1877},"Hebrew · woman of Judea"),
  C0("girl","lois","Lois",[],"gr",["vin","lit"],"s",2,{girl:1668},"Greek · most desirable"),
  C0("girl","geraldine","Geraldine",["Geri"],"ge",["vin"],"e",3,{girl:2448},"Germanic · rule of the spear"),
  C0("girl","sheila","Sheila",[],"ir",["vin"],"a",2,{girl:2649},"Irish · blind, heavenly"),
  C0("girl","maura","Maura",[],"ir",["vin"],"a",2,{girl:1633},"Irish · dark, of the sea"),
  C0("girl","yvette","Yvette",["Evie"],"fr",["vin"],"e",2,{girl:1622},"French · yew wood"),
  C0("girl","coral","Coral",[],"la",["nat"],"l",2,{girl:1937},"Latin · the sea coral"),
  C0("girl","edie","Edie",[],"en",["vin"],"e",2,{girl:2070},"English · prosperous in war"),
  C0("girl","marin","Marin",[],"la",["nat","sur"],"n",2,{girl:2043},"Latin · of the sea"),
  C0("girl","moira","Moira",[],"ir",["vin","lit"],"a",2,{girl:2039},"Irish · destiny, fate"),
  C0("girl","taryn","Taryn",[],"ir",["vin"],"n",2,{girl:3398},"Irish · from the rocky hills"),
  C0("girl","pamela","Pamela",["Pam"],"gr",["lit","vin"],"a",3,{girl:2243},"Greek · all sweetness"),
  C0("girl","kinsey","Kinsey",[],"en",["sur"],"y",2,{girl:3080},"English · kings victory"),
  C0("girl","delta","Delta",[],"gr",["nat"],"a",2,{girl:2342},"Greek · fourth letter, river mouth"),
  C0("girl","charlene","Charlene",["Char"],"fr",["vin"],"e",2,{girl:1955},"French · free woman"),
  C0("girl","elvira","Elvira",[],"sc",["lit","vin"],"a",3,{girl:1715},"Spanish · truth, white"),
  C0("girl","regan","Regan",[],"ir",["lit","sur"],"n",2,{girl:2278},"Irish · little ruler"),
  C0("girl","honor","Honor",[],"la",["vin"],"r",2,{girl:2406},"Latin · dignity, esteem"),
  C0("girl","arabelle","Arabelle",["Bella","Ara"],"la",["lyr"],"e",3,{girl:2049},"Latin · yielding to prayer, beautiful"),
  C0("girl","senna","Senna",[],"la",["nat"],"a",2,{girl:1747},"Latin · a flowering plant"),
  C0("girl","pippa","Pippa",[],"gr",["vin"],"a",2,{girl:1857},"Greek · lover of horses"),
  C0("girl","deanna","Deanna",["Dee"],"la",["vin"],"a",3,{girl:2191},"Latin · divine"),
  C0("girl","yvonne","Yvonne",["Evie"],"fr",["vin"],"e",2,{girl:2051},"French · yew wood"),
  C0("girl","milly","Milly",[],"ge",["vin"],"y",2,{girl:1782},"Germanic · strong in work"),
  C0("girl","tamara","Tamara",["Tammy"],"he",["vin"],"a",3,{girl:1809},"Hebrew · date palm tree"),
  C0("girl","danika","Danika",[],"sc",["lyr"],"a",3,{girl:2555},"Slavic · morning star"),
  C0("girl","abbie","Abbie",[],"he",["vin"],"e",2,{girl:1665},"Hebrew · my father is joy"),
  C0("girl","toni","Toni",[],"la",["vin"],"i",2,{girl:2257},"Latin · priceless, praiseworthy"),
  C0("girl","lindy","Lindy",[],"ge",["vin"],"y",2,{girl:1592},"Germanic · soft, linden tree"),
  C0("girl","marielle","Marielle",[],"fr",["lyr"],"e",3,{girl:1695},"French · star of the sea"),
  C0("girl","annaliese","Annaliese",["Anna","Liese"],"ge",["lyr"],"e",4,{girl:2073},"German · combination of Anna and Liese"),
  C0("girl","bree","Bree",[],"ir",["vin"],"e",1,{girl:2854},"Irish · noble, exalted"),
  C0("girl","karoline","Karoline",["Karo"],"ge",["vin"],"e",3,{girl:1712},"German · free woman"),
  C0("girl","jacquelyn","Jacquelyn",["Jackie"],"fr",["vin"],"n",3,{girl:2287},"French · supplanter"),
  C0("girl","jaclyn","Jaclyn",["Jackie"],"fr",["vin"],"n",2,{girl:2809},"French · supplanter"),
  C0("girl","shannon","Shannon",[],"ir",["nat","sur"],"n",2,{girl:2391},"Irish · old, wise river"),
  C0("girl","caitlin","Caitlin",["Cait"],"ir",["vin"],"n",2,{girl:2346},"Irish · pure"),
  C0("girl","oriana","Oriana",[],"la",["lyr","lit"],"a",4,{girl:1781},"Latin · dawn, gold"),
  C0("girl","klara","Klara",[],"la",["vin"],"a",2,{girl:1799},"Latin · bright, clear"),
  C0("girl","irina","Irina",[],"gr",["vin"],"a",3,{girl:1637},"Greek · peace"),
  C0("girl","sedona","Sedona",[],"en",["nat","sur"],"a",3,{girl:1587},"American · place name in Arizona"),
  C0("girl","aviva","Aviva",[],"he",["lyr"],"a",3,{girl:1601},"Hebrew · springtime, freshness"),
  C0("girl","lenna","Lenna",[],"ge",["vin"],"a",2,{girl:1765},"Germanic · lion strength"),
  C0("girl","catarina","Catarina",["Cat"],"gr",["vin"],"a",4,{girl:1900},"Greek · pure"),
  C0("girl","kelsie","Kelsie",[],"en",["sur"],"e",2,{girl:2246},"English · ships victory"),
  C0("girl","carley","Carley",[],"en",["vin"],"y",2,{girl:2744},"English · free man"),
  C0("girl","eris","Eris",[],"gr",["lit"],"s",2,{girl:1629},"Greek · goddess of strife"),
  C0("girl","iva","Iva",[],"sc",["nat","vin"],"a",2,{girl:1739},"Slavic · willow tree"),
  C0("girl","elana","Elana",[],"he",["nat","vin"],"a",3,{girl:1988},"Hebrew · tree, oak"),
  C0("girl","elin","Elin",[],"sc",["vin"],"n",2,{girl:3089},"Scandinavian · bright, shining light"),
  C0("girl","cori","Cori",[],"gr",["vin"],"i",2,{girl:1936},"Greek · maiden"),
  C0("girl","gina","Gina",[],"la",["vin"],"a",2,{girl:2089},"Latin · queen"),
  C0("girl","dolly","Dolly",[],"gr",["vin"],"y",2,{girl:1791},"Greek · gift of God"),
  C0("girl","rosemarie","Rosemarie",["Rosie"],"la",["nat","vin"],"e",3,{girl:1759},"Latin · dew of the sea"),
  C0("girl","donna","Donna",[],"la",["vin"],"a",2,{girl:1977},"Latin · lady, woman"),
  C0("girl","cosette","Cosette",["Cosie"],"fr",["lit","lyr"],"e",2,{girl:1792},"French · little thing"),
  C0("girl","mindy","Mindy",[],"en",["vin"],"y",2,{girl:2395},"English · diminutive of Melinda"),
  C0("girl","darlene","Darlene",["Dar"],"en",["vin"],"e",2,{girl:1851},"English · darling"),
  C0("girl","sonya","Sonya",["Sonnie"],"gr",["nat"],"a",2,{girl:1929},"Greek · wisdom"),
  C0("girl","daria","Daria",[],"gr",["nat"],"a",3,{girl:1863},"Greek · possessing goodness"),
  C0("girl","anabelle","Anabelle",["Ana","Belle"],"fr",["lyr"],"e",3,{girl:2994},"French · loving and beautiful"),
  C0("girl","lela","Lela",[],"en",["lyr"],"a",2,{girl:2380},"English · variant of Leila"),
  C0("girl","philomena","Philomena",["Mena","Phil"],"gr",["lit"],"a",4,{girl:1917},"Greek · friend of strength"),
  C0("girl","melodie","Melodie",["Mel"],"fr",["lyr"],"e",3,{girl:2020},"French · melody"),
  C0("girl","kiley","Kiley",[],"ir",["sur"],"y",2,{girl:2801},"Irish · graceful"),
  C0("girl","karissa","Karissa",["Rissa"],"gr",["lyr"],"a",3,{girl:2912},"Greek · grace"),
  C0("girl","marianne","Marianne",["Mary","Anne"],"fr",["nat"],"e",3,{girl:1822},"French · blend of Marie and Anne"),
  C0("girl","avril","Avril",[],"fr",["nat"],"l",2,{girl:1853},"French · April"),
  C0("girl","lanie","Lanie",[],"en",["vin"],"e",2,{girl:2225},"English · diminutive of Elaine"),
  C0("girl","roxana","Roxana",["Roxy"],"gr",["lit"],"a",3,{girl:2355},"Persian Greek · bright dawn"),
  C0("girl","josette","Josette",["Jo"],"fr",["vin"],"e",2,{girl:1840},"French · diminutive of Josephine"),
  C0("girl","francine","Francine",["Fran"],"fr",["vin"],"e",2,{girl:1848},"French · free one"),
  C0("girl","melinda","Melinda",["Mindy","Mel"],"en",["lyr"],"a",3,{girl:1985},"English · gentle"),
  C0("girl","sabine","Sabine",[],"la",["lit"],"e",2,{girl:2140},"Latin · Sabine woman"),
  C0("girl","ilana","Ilana",[],"he",["lyr"],"a",3,{girl:2502},"Hebrew · tree"),
  C0("girl","malina","Malina",["Lina"],"gr",["lyr"],"a",3,{girl:2158},"Greek · soothing"),
  C0("girl","blanca","Blanca",[],"la",["nat"],"a",2,{girl:1864},"Spanish · white"),
  C0("girl","dawn","Dawn",[],"en",["nat"],"n",1,{girl:2192},"English · daybreak"),
  C0("girl","diane","Diane",["Di"],"la",["nat"],"e",2,{girl:2631},"Latin · divine"),
  C0("girl","vallie","Vallie",["Val"],"en",["vin"],"e",2,{girl:1872},"English · diminutive of Valentina"),
  C0("girl","theadora","Theadora",["Thea","Dora"],"gr",["lit"],"a",4,{girl:2155},"Greek · gift of God"),
  C0("girl","ofelia","Ofelia",[],"gr",["lit"],"a",4,{girl:2143},"Greek · help"),
  C0("girl","rena","Rena",[],"he",["lyr"],"a",2,{girl:2394},"Hebrew · joyful song"),
  C0("girl","susie","Susie",[],"he",["vin"],"e",2,{girl:1915},"English · diminutive of Susan"),
  C0("girl","carol","Carol",[],"en",["nat"],"l",2,{girl:2252},"English · free woman"),
  C0("girl","ellory","Ellory",[],"en",["sur"],"y",3,{girl:2339},"English · cheerful"),
  C0("girl","berkeley","Berkeley",[],"en",["sur"],"y",2,{girl:2508},"English · birch wood"),
  C0("girl","janet","Janet",["Jan"],"en",["vin"],"t",2,{girl:2808},"English · diminutive of Jane"),
  C0("girl","mona","Mona",[],"ir",["nat"],"a",2,{girl:2793},"Irish · noble"),
  C0("girl","siobhan","Siobhan",[],"ir",["nat"],"n",2,{girl:2078},"Irish · form of Joan"),
  C0("girl","edna","Edna",[],"he",["vin"],"a",2,{girl:2479},"Hebrew · pleasure"),
  C0("girl","analise","Analise",["Ana","Lise"],"ge",["lyr"],"e",3,{girl:2296},"German · grace combined with Anna"),
  C0("girl","tina","Tina",[],"en",["vin"],"a",2,{girl:2784},"English · diminutive of Christina"),
  C0("girl","lenore","Lenore",["Nora"],"gr",["lit"],"e",2,{girl:1971},"Greek · light"),
  C0("girl","norma","Norma",[],"la",["nat"],"a",2,{girl:2006},"Latin · pattern"),
  C0("girl","sabina","Sabina",[],"la",["lit"],"a",3,{girl:2567},"Latin · Sabine woman"),
  C0("girl","janice","Janice",["Jan"],"en",["vin"],"e",2,{girl:2533},"English · gracious"),
  C0("girl","susana","Susana",["Sue"],"he",["nat"],"a",3,{girl:2240},"Hebrew · lily"),
  C0("girl","eleonora","Eleonora",["Nora","Ella"],"gr",["lit"],"a",4,{girl:2013},"Greek · light"),
  C0("girl","manuela","Manuela",["Manu"],"he",["nat"],"a",4,{girl:2573},"Hebrew · God is with us"),
  C0("girl","laina","Laina",[],"en",["lyr"],"a",2,{girl:2425},"English · variant of Lana"),
  C0("girl","astoria","Astoria",["Tori"],"gr",["lit"],"a",4,{girl:2236},"Greek · like a hawk"),
  C0("girl","ileana","Ileana",[],"gr",["lit"],"a",4,{girl:3197},"Greek · variant of Helen"),
  C0("girl","merida","Merida",[],"la",["lit"],"a",3,{girl:2658},"Latin · one who has achieved high honor"),
  C0("girl","anissa","Anissa",[],"gr",["lyr"],"a",3,{girl:3095},"Greek · variant of Anna"),
  C0("girl","gigi","Gigi",[],"fr",["vin"],"i",2,{girl:2849},"French · pet form of Georgine or Virginia"),
  C0("girl","keely","Keely",[],"ir",["sur"],"y",2,{girl:2732},"Irish · graceful or beautiful"),
  C0("girl","marta","Marta",[],"la",["vin"],"a",2,{girl:2058},"Latin · lady or mistress"),
  C0("girl","marla","Marla",[],"en",["vin"],"a",2,{girl:2059},"English · blend of Mary and Lou"),
  C0("girl","carissa","Carissa",["Cari"],"gr",["vin"],"a",3,{girl:3381},"Greek · grace or beloved"),
  C0("girl","denali","Denali",[],"no",["nat"],"i",3,{girl:2341},"Athabaskan · the high one"),
  C0("girl","bobbie","Bobbie",[],"en",["vin"],"e",2,{girl:2072},"English · diminutive of Roberta"),
  C0("girl","betsy","Betsy",[],"he",["vin"],"y",2,{girl:2745},"Hebrew · pet form of Elizabeth, God is my oath"),
  C0("girl","leanne","Leanne",["Lea"],"en",["vin"],"e",2,{girl:2495},"English · blend of Lee and Anne"),
  C0("girl","adelia","Adelia",["Adel"],"ge",["vin"],"a",3,{girl:2138},"Germanic · noble"),
  C0("girl","dianna","Dianna",["Di"],"la",["vin"],"a",3,{girl:2580},"Latin · divine"),
  C0("girl","effie","Effie",[],"gr",["vin"],"e",2,{girl:2249},"Greek · well spoken or fair"),
  C0("girl","leana","Leana",["Lea"],"en",["vin"],"a",2,{girl:2423},"English · variant of Liana"),
  C0("girl","janna","Janna",[],"he",["vin"],"a",2,{girl:2204},"Hebrew · variant of Jana, God is gracious"),
  C0("girl","zena","Zena",[],"gr",["vin"],"a",2,{girl:2438},"Greek · guest or stranger"),
  C0("girl","terra","Terra",[],"la",["nat"],"a",2,{girl:2413},"Latin · earth"),
  C0("girl","jean","Jean",[],"fr",["vin"],"n",1,{girl:2125},"French · God is gracious"),
  C0("girl","linley","Linley",[],"en",["sur","nat"],"y",2,{girl:3185},"English · flax meadow"),
  C0("girl","afton","Afton",[],"en",["sur","nat"],"n",2,{girl:3574},"English · river in Scotland"),
  C0("girl","henrietta","Henrietta",["Hattie","Etta"],"ge",["vin"],"a",4,{girl:2669},"Germanic · ruler of the home"),
  C0("girl","bea","Bea",[],"la",["vin"],"a",1,{girl:2234},"Latin · pet form of Beatrice, bringer of joy"),
  C0("girl","katy","Katy",[],"gr",["vin"],"y",2,{girl:2700},"Greek · pet form of Katherine, pure"),
  C0("girl","karly","Karly",[],"ge",["vin"],"y",2,{girl:2620},"Germanic · free woman"),
  C0("girl","annalisa","Annalisa",["Anna","Lisa"],"he",["vin"],"a",4,{girl:2539},"Hebrew · grace and God is my oath"),
  C0("girl","jackie","Jackie",[],"he",["vin"],"e",2,{girl:2162},"Hebrew · pet form of Jacqueline, supplanter"),
  C0("girl","marnie","Marnie",[],"he",["vin"],"e",2,{girl:2180},"Hebrew · pet form of Marina, of the sea"),
  C0("girl","kathy","Kathy",[],"gr",["vin"],"y",2,{girl:3270},"Greek · pet form of Katherine, pure"),
  C0("girl","polly","Polly",[],"en",["vin"],"y",2,{girl:2305},"English · pet form of Mary"),
  C0("girl","carrie","Carrie",[],"ge",["vin"],"e",2,{girl:2743},"Germanic · pet form of Caroline, free woman"),
  C0("girl","posie","Posie",[],"en",["nat","vin"],"e",2,{girl:2656},"English · a bunch of flowers"),
  C0("girl","olympia","Olympia",["Ollie"],"gr",["lit","vin"],"a",4,{girl:2197},"Greek · from Mount Olympus"),
  C0("girl","oona","Oona",[],"ir",["vin"],"a",2,{girl:2760},"Irish · lamb or unity"),
  C0("girl","rosanna","Rosanna",["Rosie"],"la",["vin"],"a",3,{girl:2903},"Latin · rose and grace"),
  C0("girl","acacia","Acacia",[],"gr",["nat"],"a",3,{girl:2513},"Greek · thorny tree"),
  C0("girl","chesney","Chesney",[],"en",["sur"],"y",2,{girl:2814},"English · oak grove"),
  C0("girl","kayley","Kayley",[],"ir",["vin"],"y",2,{girl:3418},"Irish · slender"),
  C0("girl","collette","Collette",[],"fr",["vin"],"e",2,{girl:2251},"French · pet form of Nicole, victory of the people"),
  C0("girl","colleen","Colleen",[],"ir",["vin"],"n",2,{girl:2851},"Irish · girl"),
  C0("girl","lynn","Lynn",[],"en",["nat","vin"],"n",1,{girl:2547},"English · lake or pool"),
  C0("girl","dora","Dora",[],"gr",["vin"],"a",2,{girl:2408},"Greek · gift"),
  C0("girl","jensen","Jensen",[],"sc",["sur"],"n",2,{girl:2265},"Scandinavian · son of Jens"),
  C0("girl","kourtney","Kourtney",[],"en",["sur"],"y",2,{girl:4503},"English · variant of Courtney, courtier"),
  C0("girl","charlette","Charlette",[],"fr",["vin"],"e",2,{girl:2480},"French · variant of Charlotte, free woman"),
  C0("girl","rosella","Rosella",["Rosie"],"la",["nat","vin"],"a",3,{girl:2332},"Latin · little rose"),
  C0("girl","lynette","Lynette",[],"we",["vin"],"e",2,{girl:2618},"Welsh · idol or little Lynn"),
  C0("girl","leonie","Leonie",[],"la",["vin"],"e",3,{girl:2282},"Latin · lioness"),
  C0("girl","alethea","Alethea",["Thea"],"gr",["vin"],"a",4,{girl:3064},"Greek · truth"),
  C0("girl","haylie","Haylie",[],"en",["sur"],"e",2,{girl:3942},"English · hay meadow"),
  C0("girl","gladys","Gladys",[],"we",["vin"],"s",2,{girl:3235},"Welsh · variant of Claudia"),
  C0("girl","gisele","Gisele",[],"ge",["vin"],"e",2,{girl:3085},"Germanic · pledge"),
  C0("girl","timber","Timber",[],"en",["nat"],"r",2,{girl:3722},"English · wood or trees"),
  C0("girl","avonlea","Avonlea",[],"en",["lit","nat"],"a",3,{girl:3022},"English · river meadow"),
  C0("girl","mirabelle","Mirabelle",["Mira"],"la",["vin"],"e",3,{girl:2245},"Latin · wondrous"),
  C0("girl","minerva","Minerva",["Minnie"],"la",["lit","vin"],"a",3,{girl:2103},"Latin · goddess of wisdom"),
  C0("girl","lizzie","Lizzie",[],"he",["vin"],"e",2,{girl:2146},"Hebrew · pet form of Elizabeth, God is my oath"),
  C0("girl","doris","Doris",[],"gr",["vin"],"s",2,{girl:2918},"Greek · gift of the ocean"),
  C0("girl","bridgette","Bridgette",["Bridge"],"ir",["vin"],"e",2,{girl:2130},"Irish · strength or exalted"),
  C0("girl","nella","Nella",[],"en",["vin"],"a",2,{girl:2828},"Italian · diminutive of names ending in -nella"),
  C0("girl","joanne","Joanne",["Jo"],"fr",["nat"],"e",2,{girl:2621},"French · God is gracious"),
  C0("girl","ottilie","Ottilie",["Tillie"],"ge",["vin"],"e",3,{girl:2938},"German · prosperous in battle"),
  C0("girl","sonja","Sonja",["Sonny"],"sc",["nat"],"a",2,{girl:3911},"Scandinavian · wisdom"),
  C0("girl","hollie","Hollie",["Holly"],"en",["nat"],"e",2,{girl:2846},"English · holly tree"),
  C0("girl","hillary","Hillary",["Hill"],"la",["sur"],"y",3,{girl:2597},"Latin · cheerful"),
  C0("girl","kendal","Kendal",["Ken"],"en",["sur","nat"],"l",2,{girl:3268},"English · valley of the river Kent"),
  C0("girl","joana","Joana",["Jo"],"he",["nat"],"a",3,{girl:2593},"Hebrew · God is gracious"),
  C0("girl","elody","Elody",[],"fr",["lyr"],"y",3,{girl:2360},"French · foreign riches"),
  C0("girl","brie","Brie",[],"fr",["nat"],"e",1,{girl:4337},"French · marshland"),
  C0("girl","tamar","Tamar",[],"he",["nat"],"r",2,{girl:2440},"Hebrew · date palm"),
  C0("girl","solenne","Solenne",[],"fr",["lyr"],"e",2,{girl:2372},"French · solemn"),
  C0("girl","abbey","Abbey",["Abby"],"he",["nat"],"y",2,{girl:5914},"Hebrew · my father is joy"),
  C0("girl","emeline","Emeline",["Em","Emmie"],"fr",["vin"],"e",3,{girl:2769},"French · industrious"),
  C0("girl","brigitte","Brigitte",["Brig"],"fr",["nat"],"e",2,{girl:2889},"French · strength"),
  C0("girl","xenia","Xenia",[],"gr",["lit"],"a",3,{girl:2896},"Greek · hospitality"),
  C0("girl","annalie","Annalie",["Anna"],"ge",["lyr"],"e",3,{girl:2682},"German · combination of Anna and Lie"),
  C0("girl","ara","Ara",[],"la",["lyr"],"a",2,{girl:3289},"Latin · altar"),
  C0("girl","suzanne","Suzanne",["Sue","Suzy"],"fr",["nat"],"e",2,{girl:2389},"French · lily"),
  C0("girl","jeanette","Jeanette",["Jean"],"fr",["nat"],"e",2,{girl:2405},"French · God is gracious"),
  C0("girl","mirabella","Mirabella",["Mira","Bella"],"en",["lyr"],"a",4,{girl:2614},"Italian · wondrous beautiful"),
  C0("girl","iona","Iona",[],"sc",["nat"],"a",3,{girl:2668},"Scottish · island name"),
  C0("girl","adella","Adella",["Della"],"ge",["vin"],"a",3,{girl:2643},"German · noble"),
  C0("girl","teddi","Teddi",[],"gr",["nat"],"i",2,{girl:2414},"Greek · gift of God"),
  C0("girl","marlena","Marlena",["Lena"],"ge",["lyr"],"a",3,{girl:2971},"German · combination of Maria and Magdalena"),
  C0("girl","brigid","Brigid",["Bridge"],"ir",["nat"],"d",2,{girl:2815},"Irish · exalted one"),
  C0("girl","ami","Ami",[],"fr",["lyr"],"i",2,{girl:4750},"French · friend"),
  C0("girl","aleksandra","Aleksandra",["Alex","Sasha"],"sc",["nat"],"a",4,{girl:3340},"Slavic · defender of mankind"),
  C0("girl","rorie","Rorie",["Rory"],"ir",["nat"],"e",2,{girl:2443},"Irish · red king"),
  C0("girl","mable","Mable",[],"la",["vin"],"e",2,{girl:2445},"Latin · lovable"),
  C0("girl","minnie","Minnie",[],"ge",["vin"],"e",2,{girl:3034},"German · diminutive of Wilhelmina"),
  C0("girl","avelina","Avelina",["Avie","Lina"],"ge",["vin"],"a",4,{girl:2453},"Germanic · desired"),
  C0("girl","amaryllis","Amaryllis",["Amy"],"gr",["lit","nat"],"s",4,{girl:2456},"Greek · to sparkle"),
  C0("girl","annemarie","Annemarie",["Anne"],"fr",["nat"],"e",4,{girl:2955},"French · combination of Anne and Marie"),
  C0("girl","alyse","Alyse",["Aly"],"ge",["nat"],"e",2,{girl:3063},"Germanic · noble kind"),
  C0("girl","randi","Randi",[],"en",["nat"],"i",2,{girl:4184},"English · diminutive of Miranda"),
  C0("girl","roxy","Roxy",[],"fr",["nat"],"y",2,{girl:2465},"Persian via French · dawn"),
  C0("girl","antoinette","Antoinette",["Toni","Nettie"],"fr",["nat"],"e",3,{girl:3023},"French · priceless"),
  C0("girl","imogene","Imogene",["Immy","Genie"],"la",["vin"],"e",3,{girl:2534},"Latin · maiden"),
  C0("girl","lora","Lora",[],"la",["nat"],"a",2,{girl:2911},"Latin · laurel"),
  C0("girl","kirsten","Kirsten",["Kirsty"],"sc",["nat"],"n",2,{girl:2839},"Scandinavian · follower of Christ"),
  C0("girl","aster","Aster",[],"gr",["nat"],"r",2,{girl:2954},"Greek · star flower"),
  C0("girl","arlie","Arlie",[],"en",["nat"],"e",2,{girl:2818},"English · meadow of the hare"),
  C0("girl","jayne","Jayne",[],"he",["nat"],"e",1,{girl:2843},"English · God is gracious"),
  C0("girl","lili","Lili",[],"la",["nat"],"i",2,{girl:2799},"Latin · lily"),
  C0("girl","adria","Adria",[],"la",["lyr"],"a",3,{girl:3065},"Latin · from Hadria"),
  C0("girl","irma","Irma",[],"ge",["nat"],"a",2,{girl:3196},"German · whole universal"),
  C0("girl","charis","Charis",[],"gr",["lyr"],"s",2,{girl:3159},"Greek · grace"),
  C0("girl","winnifred","Winnifred",["Winnie","Freddie"],"we",["vin"],"d",3,{girl:2515},"Welsh · blessed reconciliation"),
  C0("girl","candace","Candace",["Candy"],"la",["nat"],"e",2,{girl:3204},"Latin · pure white"),
  C0("girl","aveline","Aveline",["Avie","Evie"],"fr",["vin"],"e",3,{girl:2604},"French · desired"),
  C0("girl","lou","Lou",[],"ge",["nat"],"u",1,{girl:2661},"Germanic · famous warrior"),
  C0("girl","neva","Neva",[],"la",["nat"],"a",2,{girl:3304},"Latin · snow"),
  C0("girl","marisa","Marisa",["Mari"],"la",["nat"],"a",3,{girl:5158},"Latin · of the sea"),
  C0("girl","sparrow","Sparrow",[],"en",["nat"],"w",2,{girl:4081},"English · sparrow bird"),
  C0("girl","fannie","Fannie",["Fan"],"la",["vin"],"e",2,{girl:3374},"Latin · free one"),
  C0("girl","novella","Novella",["Nova"],"la",["lyr"],"a",3,{girl:2546},"Latin · new"),
  C0("girl","abella","Abella",["Bella"],"la",["lyr"],"a",3,{girl:8859},"Latin · breath"),
  C0("girl","lennie","Lennie",[],"ge",["nat"],"e",2,{girl:2548},"Germanic · brave lion"),
  C0("girl","tanya","Tanya",[],"la",["nat"],"a",2,{girl:3724},"Russian · diminutive of Tatiana"),
  C0("girl","avie","Avie",[],"la",["nat"],"e",2,{girl:3242},"Latin · bird"),
  C0("girl","eviana","Eviana",["Evie"],"he",["lyr"],"a",4,{girl:2407},"Hebrew · life"),
  C0("girl","kelsea","Kelsea",[],"en",["sur"],"a",2,{girl:3865},"English · island of ships"),
  C0("girl","lacie","Lacie",[],"fr",["nat"],"e",2,{girl:2402},"French · from Lassy"),
  C0("girl","morrigan","Morrigan",["Mori","Rigan"],"ir",["lit","lyr"],"n",3,{girl:2727},"Irish · great queen, phantom queen"),
  C0("girl","evanna","Evanna",["Eva","Evie"],"ir",["lyr"],"a",3,{girl:2740},"Irish · young warrior, God is gracious"),
  C0("girl","astra","Astra",[],"la",["lyr","nat"],"a",2,{girl:2639},"Latin · of the stars"),
  C0("girl","roxanna","Roxanna",["Roxy","Anna"],"gr",["lyr"],"a",3,{girl:2824},"Greek · dawn, bright"),
  C0("girl","wynona","Wynona",["Wyn","Nona"],"en",["lyr"],"a",3,{girl:2779},"English · firstborn daughter"),
  C0("girl","wrenna","Wrenna",["Wren"],"en",["nat","lyr"],"a",2,{girl:3101},"English · little bird, wren"),
  C0("girl","suzanna","Suzanna",["Suzy","Anna"],"he",["lyr"],"a",3,{girl:2786},"Hebrew · lily"),
  C0("girl","joella","Joella",["Jo","Ella"],"he",["lyr"],"a",3,{girl:3548},"Hebrew · the Lord is willing"),
  C0("girl","gretel","Gretel",["Greta"],"ge",["lit"],"l",2,{girl:3275},"German · pearl"),
  C0("girl","evette","Evette",["Evie","Vette"],"fr",["lyr"],"e",2,{girl:3051},"French · yew tree, archer"),
  C0("girl","aletheia","Aletheia",["Thea","Lethe"],"gr",["lit"],"a",4,{girl:2930},"Greek · truth"),
  C0("girl","rachael","Rachael",["Rae"],"he",["lyr"],"l",2,{girl:5019},"Hebrew · ewe"),
  C0("girl","mahalia","Mahalia",["Halia","Maha"],"he",["lyr"],"a",4,{girl:3078},"Hebrew · tenderness"),
  C0("girl","gretchen","Gretchen",["Greta"],"ge",["lit"],"n",2,{girl:4324},"German · pearl"),
  C0("girl","maribelle","Maribelle",["Mari","Belle"],"fr",["lyr"],"e",3,{girl:4918},"French · beautiful Mary, beloved beauty"),
  C0("girl","ericka","Ericka",["Rikki"],"no",["lyr"],"a",3,{girl:2627},"Norse · ever ruler"),
  C0("girl","vianna","Vianna",["Via","Anna"],"la",["lyr"],"a",3,{girl:2999},"Latin · way, path"),
  C0("girl","amity","Amity",[],"la",["lit","vin"],"y",3,{girl:4059},"Latin · friendship"),
  C0("girl","neve","Neve",[],"ir",["lyr","nat"],"e",1,{girl:3140},"Irish · bright, snow"),
  C0("girl","leyna","Leyna",["Ley"],"ge",["lyr"],"a",2,{girl:3186},"German · little angel, tender"),
  C0("girl","ellena","Ellena",["Ella","Lena"],"gr",["lyr"],"a",3,{girl:3819},"Greek · bright, shining light"),
  C0("girl","ciana","Ciana",["Cia"],"ir",["lyr"],"a",3,{girl:3498},"Italian · light, ancient"),
  C0("girl","maris","Maris",[],"la",["nat","lit"],"s",2,{girl:3264},"Latin · of the sea"),
  C0("girl","enid","Enid",[],"we",["lit","vin"],"d",2,{girl:4620},"Welsh · soul, life, purity"),
  C0("girl","carlota","Carlota",["Lota"],"ge",["lyr"],"a",3,{girl:3699},"German · free woman"),
  C0("girl","roberta","Roberta",["Bobbie","Berta"],"ge",["vin"],"a",3,{girl:2790},"German · bright fame"),
  C0("girl","golda","Golda",["Goldie"],"en",["vin","nat"],"a",2,{girl:2670},"English · gold"),
  C0("girl","adalind","Adalind",["Ada","Lindy"],"ge",["lit"],"d",3,{girl:4458},"German · noble serpent, nobility"),
  C0("girl","eleonor","Eleonor",["Nora","Ellie"],"gr",["lyr"],"r",3,{girl:2676},"Greek · bright, shining light"),
  C0("girl","berenice","Berenice",["Bernie","Nice"],"gr",["lit"],"e",3,{girl:4851},"Greek · bringer of victory"),
  C0("girl","una","Una",[],"ir",["lit","lyr"],"a",2,{girl:3214},"Irish · one, unity, lamb"),
  C0("girl","krista","Krista",["Kris"],"gr",["lyr"],"a",2,{girl:3677},"Greek · anointed, follower"),
  C0("girl","roisin","Roisin",["Rosie"],"ir",["nat","lyr"],"n",2,{girl:2693},"Irish · little rose"),
  C0("girl","kiersten","Kiersten",["Kiki","Kiers"],"no",["lyr"],"n",2,{girl:4714},"Norse · anointed"),
  C0("girl","pauline","Pauline",["Polly"],"la",["vin"],"e",2,{girl:2968},"Latin · small, humble"),
  C0("girl","hera","Hera",[],"gr",["lit"],"a",2,{girl:2739},"Greek · protectress, queen of the gods"),
  C0("girl","anabel","Anabel",["Ana","Belle"],"la",["lyr"],"l",3,{girl:4346},"Latin · loving, graceful beauty"),
  C0("girl","cierra","Cierra",["Cie"],"sc",["lyr","nat"],"a",3,{girl:2742},"Spanish · mountain range"),
  C0("girl","allegra","Allegra",["Allie"],"la",["lyr","lit"],"a",3,{girl:4062},"Italian · joyful, lively"),
  C0("girl","marcelina","Marcelina",["Lina","Marci"],"la",["lyr"],"a",4,{girl:2871},"Latin · young warrior, dedicated to Mars"),
  C0("girl","sonora","Sonora",["Nora"],"sc",["nat","lyr"],"a",3,{girl:3002},"Spanish · pleasant sounding, sonorous"),
  C0("girl","kezia","Kezia",["Kizzy"],"he",["lyr"],"a",3,{girl:2840},"Hebrew · cassia tree, sweet spice"),
  C0("girl","coralee","Coralee",["Cora"],"la",["lyr","nat"],"e",3,{girl:4736},"Latin · heart, coral of the sea"),
  C0("girl","joanie","Joanie",["Jo"],"he",["vin"],"e",2,{girl:2738},"Hebrew · God is gracious"),
  C0("girl","halley","Halley",["Hallie"],"en",["sur","nat"],"y",2,{girl:3556},"English · hay meadow"),
  C0("girl","essie","Essie",[],"he",["vin","lyr"],"e",2,{girl:3331},"Hebrew · star"),
  C0("girl","stacey","Stacey",["Stace"],"gr",["vin"],"y",2,{girl:3070},"Greek · resurrection"),
  C0("girl","ginny","Ginny",[],"la",["vin","lit"],"y",2,{girl:3276},"Latin · maiden, pure"),
  C0("girl","clarice","Clarice",["Clara","Rice"],"fr",["lit","vin"],"e",2,{girl:3118},"French · bright, clear"),
  C0("girl","lexa","Lexa",["Lex"],"gr",["nat"],"a",2,{girl:4808},"Greek · defender of mankind"),
  C0("girl","maelle","Maelle",["Mae"],"fr",["lyr"],"e",2,{girl:2798},"Breton · chief, prince"),
  C0("girl","mirella","Mirella",["Mira"],"la",["lyr"],"a",3,{girl:3361},"Latin · to admire, wonderful"),
  C0("girl","malorie","Malorie",["Mal","Lorie"],"fr",["sur","lit"],"e",3,{girl:3037},"French · unlucky, ill-omened"),
  C0("girl","marcie","Marcie",["Marce"],"la",["vin"],"e",2,{girl:3596},"Latin · dedicated to Mars"),
  C0("girl","esmee","Esmee",["Es"],"fr",["lyr","lit"],"e",2,{girl:3332},"French · esteemed, beloved"),
  C0("girl","eugenia","Eugenia",["Genie","Gen"],"gr",["vin"],"a",4,{girl:2812},"Greek · wellborn, noble"),
  C0("girl","becca","Becca",["Bec"],"he",["nat"],"a",2,{girl:4158},"Hebrew · to bind, captivating"),
  C0("girl","avelyn","Avelyn",["Ava","Evie"],"en",["sur","lyr"],"n",3,{girl:3705},"English · desired, longed for"),
  C0("girl","twyla","Twyla",[],"en",["vin","lyr"],"a",2,{girl:2959},"American · twilight, woven of double thread"),
  C0("girl","trisha","Trisha",["Trish"],"la",["nat"],"a",2,{girl:3464},"Latin · noble, patrician"),
  C0("girl","rhoda","Rhoda",[],"gr",["vin","lit"],"a",2,{girl:3299},"Greek · rose"),
  C0("girl","milla","Milla",[],"la",["lyr"],"a",2,{girl:3794},"Latin · industrious, gracious"),
  C0("girl","maybelle","Maybelle",["Mae","Belle"],"fr",["vin","lyr"],"e",2,{girl:2831},"French · my beautiful one"),
  C0("girl","coralie","Coralie",["Cora"],"fr",["lyr"],"e",3,{girl:2990},"French · coral, maiden"),
  C0("girl","hilda","Hilda",[],"ge",["vin"],"a",2,{girl:3018},"German · battle, fighter"),
  C0("girl","laurie","Laurie",[],"la",["vin","lit"],"e",2,{girl:2838},"Latin · laurel, victory"),
  C0("girl","hilary","Hilary",["Hil"],"la",["sur","vin"],"y",3,{girl:5346},"Latin · cheerful, happy"),
  C0("girl","simona","Simona",["Sim","Mona"],"he",["nat"],"a",3,{girl:3466},"Hebrew · one who hears"),
  C0("girl","rubie","Rubie",[],"la",["nat"],"e",2,{girl:3990},"Latin · red gemstone"),
  C0("girl","tallulah","Tallulah",["Lula","Tally"],"no",["lyr","lit"],"h",3,{girl:939},"Native American · leaping water"),
  C0("girl","justina","Justina",["Tina"],"la",["vin"],"a",3,{girl:4011},"Latin · just, fair"),
  C0("girl","jessi","Jessi",[],"he",["nat"],"i",2,{girl:3111},"Hebrew · God beholds, wealthy"),
  C0("girl","gizelle","Gizelle",["Gigi"],"ge",["lyr"],"e",2,{girl:4421},"German · pledge, hostage"),
  C0("girl","calypso","Calypso",["Caly"],"gr",["lit","lyr"],"o",3,{girl:2888},"Greek · she who conceals"),
  C0("girl","vanna","Vanna",[],"en",["lyr"],"a",2,{girl:2897},"English · variant of Vanessa, butterfly"),
  C0("girl","odelia","Odelia",["Odette","Della"],"ge",["lyr","vin"],"a",4,{girl:2969},"German · wealth, fortune"),
  C0("girl","polina","Polina",["Lina"],"gr",["nat"],"a",3,{girl:3260},"Greek · small, of Apollo"),
  C0("girl","jenelle","Jenelle",["Jen","Nell"],"fr",["lyr"],"e",2,{girl:6229},"French · God is gracious"),
  C0("girl","jaime","Jaime",["Jay"],"sc",["sur","vin"],"e",2,{girl:4131},"Spanish form of James, supplanter"),
  C0("girl","cami","Cami",[],"la",["nat"],"i",2,{girl:4247},"Latin · attendant at a ceremony"),
  C0("girl","aly","Aly",[],"ge",["nat"],"y",2,{girl:3775},"German · noble"),
  C0("girl","monique","Monique",["Mona","Nikki"],"fr",["vin"],"e",2,{girl:3360},"French · advisor, solitary"),
  C0("girl","melisa","Melisa",["Mel","Lisa"],"gr",["nat"],"a",3,{girl:2939},"Greek · honeybee"),
  C0("girl","livy","Livy",[],"la",["vin","lit"],"y",2,{girl:2975},"Latin · olive"),
  C0("girl","riva","Riva",[],"fr",["lyr"],"a",2,{girl:3659},"French · from the riverbank"),
  C0("girl","leann","Leann",["Lee"],"en",["vin"],"n",2,{girl:4204},"English · meadow, gracious"),
  C0("girl","lillia","Lillia",["Lily"],"la",["lyr"],"a",3,{girl:3011},"Latin · lily flower"),
  C0("girl","brandy","Brandy",[],"en",["vin","pun"],"y",2,{girl:3094},"Dutch · distilled wine, sword"),
  C0("girl","leigh","Leigh",[],"en",["sur","nat"],"h",1,{girl:4501},"English · meadow, clearing"),
  C0("girl","lorna","Lorna",[],"sc",["lit","vin"],"a",2,{girl:2974},"Scottish · place name, forsaken"),
  C0("girl","ilse","Ilse",[],"ge",["lyr"],"e",2,{girl:3940},"German · God is my oath"),
  C0("girl","lavina","Lavina",["Vina"],"la",["lyr","vin"],"a",3,{girl:2976},"Latin · woman of Rome, purity"),
  C0("girl","stefania","Stefania",["Stef","Steffi"],"gr",["lyr"],"a",4,{girl:5118},"Greek · crown, garland"),
  C0("girl","kierra","Kierra",["Kiki"],"ir",["lyr"],"a",2,{girl:3366},"Irish · dark, black"),
  C0("girl","connie","Connie",[],"la",["vin"],"e",2,{girl:3091},"Latin · constant, steadfast"),

];
// Spoken-pronunciation hints for the less-obvious candidate names (shown in For you).
const SAY = {
  eira:"AY-rah", saoirse:"SEER-shə", elowen:"el-OH-wen", linnea:"lin-AY-ah", sigrid:"SIG-rid",
  bodhi:"BOH-dee", cassian:"CASS-ee-an", cassius:"CASS-ee-əs", lochlan:"LOCK-lin", tiernan:"TEER-nin",
  thea:"THEE-ah", esme:"EZ-may", romy:"ROH-mee", maisie:"MAY-zee", soren:"SOR-en", magnus:"MAG-nəs",
  juniper:"JOO-nih-per", ronan:"ROH-nin", desmond:"DEZ-mənd", silas:"SY-ləs", cormac:"COR-mack",
  brennan:"BREN-in", bowen:"BOH-en", arden:"AR-den", ellis:"EL-iss", tegan:"TEG-ən", maren:"MAH-ren",
  della:"DEL-ah", iris:"EYE-riss", nora:"NOR-ah", linus:"LY-nəs", arlo:"AR-loh", emmett:"EM-it",
  everett:"EV-rit", emerson:"EM-er-sən", ellison:"EL-ih-sən", indigo:"IN-dih-goh", marigold:"MARE-ih-gold",
  // roster names whose spelling hides the sound
  niamh:"NEEV", seamus:"SHAY-məs", saoirse:"SEER-shə", cloda:"KLOH-də", maira:"MY-rah", keelan:"KEE-lin", lowen:"LOH-ən", conall:"KON-əl", sloane:"SLOHN", maeve:"MAYV",
};
// Pronunciation hint for any name (subtle, shown the same way on every card).
const sayOf = (id) => SAY[id] || null;
// Real SSA national rank trajectories (2020–2025) for the candidate pool, parsed
// from the official "Popular Baby Names" tables. null = outside the top 1000 that
// year. Folded in non-destructively, so roster names keep their own verified data.
const CSERIES = {
  // Popularity from SSA top-10000 (2020-2025).
  greer: { girl:{ 2020:2104,2021:2000,2022:2150,2023:2389,2024:1992,2025:1847 } },
  maren: { girl:{ 2020:438,2021:441,2022:501,2023:546,2024:567,2025:470 } },
  della: { girl:{ 2020:916,2021:712,2022:660,2023:648,2024:579,2025:563 } },
  iris: { girl:{ 2020:127,2021:107,2022:84,2023:78,2024:71,2025:61 } },
  romy: { girl:{ 2020:1505,2021:1441,2022:1356,2023:1277,2024:926,2025:695 } },
  juniper: { girl:{ 2020:171,2021:137,2022:113,2023:113,2024:111,2025:100 } },
  linnea: { girl:{ 2020:1651,2021:1556,2022:1566,2023:1468,2024:1600,2025:1445 } },
  sigrid: { girl:{ 2020:3927,2021:4855,2022:2959,2023:3533,2024:3769,2025:4366 } },
  esme: { girl:{ 2020:396,2021:378,2022:305,2023:325,2024:343,2025:298 } },
  marigold: { girl:{ 2020:1094,2021:1014,2022:822,2023:712,2024:690,2025:591 } },
  bryn: { girl:{ 2020:1768,2021:1527,2022:1867,2023:2086,2024:2112,2025:2031 } },
  tegan: { girl:{ 2020:1231,2021:1338,2022:1678,2023:1828,2024:2040,2025:2276 } },
  eira: { girl:{ 2020:2431,2021:2776,2022:2341,2023:2605,2024:2406,2025:1755 } },
  elowen: { girl:{ 2020:1345,2021:1268,2022:1155,2023:1061,2024:899,2025:797 } },
  maisie: { girl:{ 2020:410,2021:406,2022:347,2023:293,2024:256,2025:233 } },
  nora: { girl:{ 2020:30,2021:27,2022:28,2023:24,2024:22,2025:20 } },
  saoirse: { girl:{ 2020:732,2021:811,2022:892,2023:957,2024:1029,2025:1087 } },
  maple: { girl:{ 2020:1601,2021:1524,2022:1315,2023:1238,2024:1180,2025:1094 } },
  thea: { girl:{ 2020:302,2021:314,2022:300,2023:320,2024:348,2025:353 } },
  wilder: { girl:{ 2020:2418,2021:2132,2022:2142,2023:3184,2024:3226,2025:3521 } },
  soren: { boy:{ 2020:509,2021:535,2022:531,2023:541,2024:570,2025:464 } },
  ames: { boy:{ 2020:1705,2021:1787,2022:2112,2023:1763,2024:2026,2025:1769 } },
  cassius: { boy:{ 2020:489,2021:488,2022:550,2023:575,2024:569,2025:583 } },
  linus: { boy:{ 2020:1400,2021:1549,2022:1444,2023:1543,2024:1423,2025:1911 } },
  thorne: { boy:{ 2020:9667,2021:9822,2022:7316,2023:9027,2024:8379,2025:9009 } },
  cormac: { boy:{ 2020:1230,2021:1223,2022:1275,2023:1241,2024:1261,2025:1303 } },
  bowen: { boy:{ 2020:395,2021:368,2022:389,2023:348,2024:321,2025:266 } },
  brennan: { boy:{ 2020:766,2021:875,2022:996,2023:1029,2024:1059,2025:1003 } },
  tiernan: { boy:{ 2020:4709,2021:3505,2022:3159,2023:3354,2024:4086,2025:3764 } },
  sutton: { boy:{ 2020:578,2021:542,2022:523,2023:446,2024:442,2025:332 } },
  auden: { boy:{ 2020:1373,2021:1634,2022:1812,2023:1952,2024:1887,2025:1806 } },
  thatcher: { boy:{ 2020:841,2021:815,2022:963,2023:1000,2024:1038,2025:1108 } },
  emmett: { boy:{ 2020:107,2021:103,2022:116,2023:118,2024:119,2025:121 } },
  ronan: { boy:{ 2020:270,2021:274,2022:266,2023:290,2024:257,2025:247 } },
  desmond: { boy:{ 2020:362,2021:354,2022:363,2023:400,2024:368,2025:376 } },
  silas: { boy:{ 2020:100,2021:91,2022:86,2023:80,2024:81,2025:71 } },
  everett: { boy:{ 2020:90,2021:83,2022:81,2023:89,2024:85,2025:77 } },
  cassian: { boy:{ 2020:1037,2021:971,2022:939,2023:531,2024:618,2025:479 } },
  arlo: { boy:{ 2020:220,2021:190,2022:170,2023:158,2024:146,2025:148 } },
  magnus: { boy:{ 2020:800,2021:729,2022:774,2023:764,2024:748,2025:764 } },
  ellis: { girl:{ 2020:620,2021:597,2022:699,2023:752,2024:696,2025:682 }, boy:{ 2020:326,2021:320,2022:307,2023:275,2024:273,2025:243 } },
  arden: { girl:{ 2020:1057,2021:1094,2022:1057,2023:1046,2024:1043,2025:977 }, boy:{ 2020:1157,2021:1206,2022:1261,2023:1022,2024:945,2025:1007 } },
  reese: { girl:{ 2020:145,2021:148,2022:168,2023:174,2024:190,2025:192 }, boy:{ 2020:730,2021:703,2022:645,2023:632,2024:620,2025:602 } },
  quinn: { girl:{ 2020:84,2021:81,2022:73,2023:86,2024:96,2025:97 }, boy:{ 2020:438,2021:406,2022:444,2023:452,2024:497,2025:466 } },
  walker: { girl:{ 2020:3283,2021:1681,2022:1422,2023:1699,2024:1754,2025:1942 }, boy:{ 2020:206,2021:130,2022:78,2023:85,2024:82,2025:78 } },
  emerson: { girl:{ 2020:155,2021:168,2022:169,2023:161,2024:151,2025:122 }, boy:{ 2020:268,2021:277,2022:274,2023:268,2024:270,2025:254 } },
  sage: { girl:{ 2020:222,2021:177,2022:143,2023:142,2024:146,2025:160 }, boy:{ 2020:436,2021:422,2022:387,2023:417,2024:413,2025:455 } },
  lark: { girl:{ 2020:2796,2021:2977,2022:2805,2023:3496,2024:3544,2025:4395 }, boy:{ 2020:null,2021:null,2022:9318,2023:null,2024:null,2025:null } },
  ellison: { girl:{ 2020:906,2021:838,2022:1064,2023:1079,2024:1068,2025:1066 }, boy:{ 2020:1786,2021:1717,2022:1833,2023:1936,2024:2074,2025:1685 } },
  indigo: { girl:{ 2020:1029,2021:903,2022:978,2023:962,2024:920,2025:854 }, boy:{ 2020:1987,2021:1818,2022:1526,2023:1724,2024:1614,2025:1536 } },
  sailor: { girl:{ 2020:1086,2021:1148,2022:1295,2023:1076,2024:1342,2025:1132 }, boy:{ 2020:3087,2021:3083,2022:2650,2023:3725,2024:2724,2025:3044 } },
  ocean: { girl:{ 2020:1130,2021:873,2022:755,2023:824,2024:832,2025:785 }, boy:{ 2020:794,2021:712,2022:596,2023:609,2024:590,2025:717 } },
  hazel: { girl:{ 2020:31,2021:28,2022:27,2023:18,2024:19,2025:21 } },
  violet: { girl:{ 2020:37,2021:36,2022:20,2023:16,2024:15,2025:13 } },
  eleanor: { girl:{ 2020:22,2021:15,2022:16,2023:14,2024:14,2025:12 } },
  josephine: { girl:{ 2020:87,2021:72,2022:70,2023:64,2024:56,2025:53 } },
  genevieve: { girl:{ 2020:169,2021:154,2022:165,2023:165,2024:165,2025:149 } },
  eloise: { girl:{ 2020:137,2021:109,2022:86,2023:81,2024:64,2025:49 } },
  clara: { girl:{ 2020:103,2021:102,2022:110,2023:98,2024:78,2025:63 } },
  cora: { girl:{ 2020:88,2021:87,2022:75,2023:93,2024:103,2025:113 } },
  stella: { girl:{ 2020:42,2021:41,2022:40,2023:46,2024:49,2025:52 } },
  aurora: { girl:{ 2020:36,2021:35,2022:31,2023:22,2024:16,2025:15 } },
  adeline: { girl:{ 2020:99,2021:94,2022:92,2023:71,2024:58,2025:59 } },
  vivian: { girl:{ 2020:101,2021:100,2022:104,2023:87,2024:77,2025:70 } },
  beatrice: { girl:{ 2020:552,2021:564,2022:557,2023:588,2024:580,2025:508 } },
  margot: { girl:{ 2020:234,2021:194,2022:193,2023:148,2024:127,2025:102 } },
  sylvie: { girl:{ 2020:772,2021:585,2022:433,2023:425,2024:356,2025:282 } },
  daphne: { girl:{ 2020:414,2021:288,2022:281,2023:241,2024:193,2025:178 } },
  rosalie: { girl:{ 2020:198,2021:185,2022:176,2023:182,2024:177,2025:171 } },
  florence: { girl:{ 2020:764,2021:715,2022:623,2023:522,2024:430,2025:391 } },
  edith: { girl:{ 2020:473,2021:494,2022:513,2023:503,2024:528,2025:499 } },
  tessa: { girl:{ 2020:280,2021:287,2022:331,2023:323,2024:303,2025:311 } },
  lucy: { girl:{ 2020:50,2021:48,2022:48,2023:40,2024:34,2025:24 } },
  alice: { girl:{ 2020:76,2021:65,2022:64,2023:66,2024:63,2025:65 } },
  naomi: { girl:{ 2020:52,2021:54,2022:46,2023:44,2024:44,2025:47 } },
  lydia: { girl:{ 2020:95,2021:89,2022:93,2023:94,2024:97,2025:92 } },
  ruby: { girl:{ 2020:74,2021:62,2022:62,2023:65,2024:62,2025:64 } },
  pearl: { girl:{ 2020:776,2021:740,2022:754,2023:801,2024:801,2025:776 } },
  maggie: { girl:{ 2020:293,2021:283,2022:293,2023:318,2024:299,2025:294 } },
  frances: { girl:{ 2020:418,2021:392,2022:419,2023:403,2024:376,2025:318 } },
  matilda: { girl:{ 2020:478,2021:466,2022:417,2023:438,2024:410,2025:364 } },
  cecilia: { girl:{ 2020:147,2021:133,2022:145,2023:137,2024:123,2025:108 } },
  harriet: { girl:{ 2020:1075,2021:1057,2022:1129,2023:1132,2024:1149,2025:1073 } },
  poppy: { girl:{ 2020:457,2021:401,2022:338,2023:289,2024:336,2025:292 } },
  ivy: { girl:{ 2020:57,2021:49,2022:41,2023:38,2024:36,2025:39 } },
  june: { girl:{ 2020:183,2021:176,2022:172,2023:171,2024:152,2025:150 } },
  eliza: { girl:{ 2020:115,2021:111,2022:121,2023:116,2024:118,2025:115 } },
  phoebe: { girl:{ 2020:253,2021:247,2022:212,2023:191,2024:183,2025:157 } },
  adelaide: { girl:{ 2020:273,2021:261,2022:283,2023:286,2024:272,2025:289 } },
  mabel: { girl:{ 2020:428,2021:375,2022:310,2023:278,2024:222,2025:201 } },
  helena: { girl:{ 2020:512,2021:512,2022:472,2023:456,2024:414,2025:363 } },
  flora: { girl:{ 2020:927,2021:651,2022:728,2023:682,2024:646,2025:607 } },
  celia: { girl:{ 2020:789,2021:791,2022:862,2023:828,2024:736,2025:775 } },
  agnes: { girl:{ 2020:1254,2021:1142,2022:1097,2023:1084,2024:1063,2025:1021 } },
  vera: { girl:{ 2020:246,2021:229,2022:224,2023:224,2024:226,2025:205 } },
  theodore: { boy:{ 2020:23,2021:10,2022:10,2023:7,2024:4,2025:4 } },
  felix: { boy:{ 2020:225,2021:194,2022:193,2023:193,2024:179,2025:175 } },
  hugo: { boy:{ 2020:421,2021:437,2022:400,2023:415,2024:405,2025:377 } },
  august: { boy:{ 2020:155,2021:120,2022:109,2023:104,2024:88,2025:81 } },
  miles: { boy:{ 2020:59,2021:55,2022:56,2023:43,2024:37,2025:44 } },
  oscar: { boy:{ 2020:214,2021:226,2022:201,2023:216,2024:216,2025:223 } },
  leo: { boy:{ 2020:36,2021:31,2022:22,2023:18,2024:24,2025:19 } },
  julian: { boy:{ 2020:34,2021:33,2022:35,2023:33,2024:30,2025:25 } },
  sebastian: { boy:{ 2020:19,2021:19,2022:13,2023:13,2024:14,2025:16 } },
  atticus: { boy:{ 2020:300,2021:264,2022:272,2023:284,2024:277,2025:281 } },
  ezra: { boy:{ 2020:44,2021:37,2022:25,2023:15,2024:13,2025:20 } },
  jude: { boy:{ 2020:154,2021:151,2022:160,2023:161,2024:156,2025:155 } },
  wesley: { boy:{ 2020:98,2021:85,2022:70,2023:69,2024:58,2025:52 } },
  graham: { boy:{ 2020:186,2021:161,2022:155,2023:141,2024:129,2025:120 } },
  beckett: { boy:{ 2020:210,2021:199,2022:195,2023:196,2024:166,2025:141 } },
  nathaniel: { boy:{ 2020:125,2021:133,2022:138,2023:143,2024:144,2025:140 } },
  simon: { boy:{ 2020:249,2021:248,2022:241,2023:248,2024:251,2025:230 } },
  vincent: { boy:{ 2020:121,2021:117,2022:123,2023:120,2024:111,2025:107 } },
  frederick: { boy:{ 2020:484,2021:476,2022:478,2023:506,2024:423,2025:436 } },
  edward: { boy:{ 2020:195,2021:218,2022:216,2023:213,2024:228,2025:224 } },
  george: { boy:{ 2020:132,2021:134,2022:142,2023:136,2024:123,2025:126 } },
  walter: { boy:{ 2020:272,2021:271,2022:268,2023:267,2024:271,2025:252 } },
  bennett: { boy:{ 2020:102,2021:90,2022:83,2023:74,2024:60,2025:40 } },
  arthur: { boy:{ 2020:163,2021:154,2022:140,2023:130,2024:105,2025:87 } },
  louis: { boy:{ 2020:260,2021:251,2022:245,2023:238,2024:236,2025:249 } },
  otis: { boy:{ 2020:649,2021:646,2022:613,2023:651,2024:732,2025:655 } },
  caleb: { boy:{ 2020:56,2021:51,2022:52,2023:51,2024:49,2025:58 } },
  eli: { boy:{ 2020:60,2021:64,2022:69,2023:79,2024:92,2025:104 } },
  asher: { boy:{ 2020:32,2021:25,2022:20,2023:23,2024:20,2025:28 } },
  levi: { boy:{ 2020:18,2021:12,2022:12,2023:12,2024:12,2025:12 } },
  jonah: { boy:{ 2020:128,2021:138,2022:135,2023:124,2024:126,2025:128 } },
  milo: { boy:{ 2020:134,2021:127,2022:120,2023:121,2024:120,2025:119 } },
  dean: { boy:{ 2020:176,2021:166,2022:164,2023:159,2024:142,2025:125 } },
  reid: { boy:{ 2020:316,2021:299,2022:325,2023:315,2024:300,2025:293 } },
  cole: { boy:{ 2020:133,2021:132,2022:144,2023:155,2024:163,2025:183 } },
  jasper: { boy:{ 2020:138,2021:128,2022:129,2023:122,2024:133,2025:129 } },
  hugh: { boy:{ 2020:750,2021:744,2022:806,2023:782,2024:762,2025:732 } },
  wells: { boy:{ 2020:545,2021:482,2022:467,2023:447,2024:377,2025:345 } },
  ford: { boy:{ 2020:459,2021:439,2022:476,2023:523,2024:571,2025:474 } },
  roman: { boy:{ 2020:77,2021:74,2022:68,2023:66,2024:52,2025:42 } },
  victor: { boy:{ 2020:200,2021:209,2022:214,2023:217,2024:213,2025:209 } },
  philip: { boy:{ 2020:453,2021:451,2022:492,2023:500,2024:520,2025:527 } },
  sawyer: { girl:{ 2020:239,2021:216,2022:242,2023:280,2024:297,2025:290 }, boy:{ 2020:116,2021:114,2022:131,2023:127,2024:131,2025:122 } },
  riley: { girl:{ 2020:33,2021:37,2022:39,2023:43,2024:42,2025:48 }, boy:{ 2020:257,2021:245,2022:226,2023:223,2024:229,2025:207 } },
  parker: { girl:{ 2020:128,2021:115,2022:115,2023:122,2024:104,2025:106 }, boy:{ 2020:95,2021:93,2022:94,2023:91,2024:97,2025:102 } },
  blake: { girl:{ 2020:223,2021:199,2022:200,2023:221,2024:210,2025:296 }, boy:{ 2020:209,2021:205,2022:228,2023:255,2024:265,2025:316 } },
  hayden: { girl:{ 2020:298,2021:291,2022:344,2023:368,2024:403,2025:437 }, boy:{ 2020:177,2021:175,2022:162,2023:162,2024:154,2025:161 } },
  finley: { girl:{ 2020:201,2021:211,2022:218,2023:282,2024:363,2025:415 }, boy:{ 2020:304,2021:265,2022:281,2023:285,2024:290,2025:333 } },
  tatum: { girl:{ 2020:343,2021:279,2022:274,2023:227,2024:205,2025:189 }, boy:{ 2020:490,2021:385,2022:318,2023:233,2024:195,2025:202 } },
  spencer: { girl:{ 2020:1050,2021:1045,2022:1086,2023:1036,2024:1118,2025:1023 }, boy:{ 2020:317,2021:315,2022:338,2023:361,2024:384,2025:360 } },
  hollis: { girl:{ 2020:1471,2021:1335,2022:1629,2023:1388,2024:1239,2025:1134 }, boy:{ 2020:1019,2021:1064,2022:1043,2023:1002,2024:1056,2025:895 } },
  brooks: { girl:{ 2020:2462,2021:2922,2022:2569,2023:2312,2024:2793,2025:2129 }, boy:{ 2020:92,2021:78,2022:77,2023:73,2024:67,2025:64 } },
  eden: { girl:{ 2020:129,2021:121,2022:116,2023:77,2024:72,2025:72 }, boy:{ 2020:492,2021:497,2022:408,2023:439,2024:466,2025:544 } },
  emery: { girl:{ 2020:89,2021:90,2022:82,2023:70,2024:70,2025:74 }, boy:{ 2020:740,2021:770,2022:728,2023:747,2024:820,2025:815 } },
  aubrey: { girl:{ 2020:56,2021:64,2022:81,2023:101,2024:132,2025:146 }, boy:{ 2020:1279,2021:1228,2022:1387,2023:1389,2024:1766,2025:2105 } },
  abigail: { girl:{ 2020:12,2021:17,2022:24,2023:31,2024:32,2025:41 } },
  amelia: { girl:{ 2020:6,2021:4,2022:4,2023:4,2024:3,2025:4 } },
  anna: { girl:{ 2020:68,2021:85,2022:83,2023:79,2024:94,2025:107 } },
  arabella: { girl:{ 2020:203,2021:195,2022:232,2023:225,2024:207,2025:213 } },
  audrey: { girl:{ 2020:60,2021:60,2022:67,2023:74,2024:82,2025:86 } },
  ava: { girl:{ 2020:3,2021:5,2022:7,2023:8,2024:9,2025:11 } },
  betty: { girl:{ 2020:1174,2021:1188,2022:1158,2023:1193,2024:1012,2025:1116 } },
  blythe: { girl:{ 2020:2111,2021:2003,2022:2043,2023:1859,2024:1880,2025:2062 } },
  briar: { girl:{ 2020:567,2021:517,2022:534,2023:550,2024:523,2025:400 } },
  camille: { girl:{ 2020:265,2021:280,2022:236,2023:268,2024:240,2025:240 } },
  caroline: { girl:{ 2020:71,2021:80,2022:77,2023:83,2024:92,2025:96 } },
  charlotte: { girl:{ 2020:5,2021:3,2022:3,2023:3,2024:4,2025:2 } },
  clementine: { girl:{ 2020:602,2021:551,2022:559,2023:542,2024:476,2025:457 } },
  colette: { girl:{ 2020:533,2021:457,2022:452,2023:442,2024:401,2025:316 } },
  cordelia: { girl:{ 2020:1008,2021:1011,2022:1054,2023:1119,2024:1069,2025:981 } },
  dahlia: { girl:{ 2020:354,2021:311,2022:280,2023:253,2024:241,2025:215 } },
  delphine: { girl:{ 2020:3590,2021:3717,2022:3208,2023:3617,2024:3676,2025:3629 } },
  diana: { girl:{ 2020:245,2021:226,2022:229,2023:228,2024:243,2025:244 } },
  elise: { girl:{ 2020:212,2021:242,2022:260,2023:274,2024:252,2025:223 } },
  elizabeth: { girl:{ 2020:16,2021:14,2022:15,2023:15,2024:17,2025:17 } },
  ella: { girl:{ 2020:15,2021:16,2022:25,2023:32,2024:30,2025:29 } },
  emily: { girl:{ 2020:18,2021:21,2022:17,2023:19,2024:25,2025:34 } },
  emma: { girl:{ 2020:2,2021:2,2022:2,2023:2,2024:2,2025:3 } },
  estelle: { girl:{ 2020:800,2021:750,2022:724,2023:711,2024:642,2025:573 } },
  evelyn: { girl:{ 2020:9,2021:9,2022:9,2023:9,2024:8,2025:8 } },
  fern: { girl:{ 2020:1564,2021:1503,2022:1482,2023:1428,2024:1256,2025:1220 } },
  freya: { girl:{ 2020:178,2021:152,2022:129,2023:136,2024:160,2025:177 } },
  georgia: { girl:{ 2020:177,2021:167,2022:164,2023:128,2024:110,2025:99 } },
  gwendolyn: { girl:{ 2020:378,2021:397,2022:389,2023:379,2024:393,2025:360 } },
  hannah: { girl:{ 2020:39,2021:44,2022:47,2023:48,2024:52,2025:56 } },
  heidi: { girl:{ 2020:381,2021:396,2022:370,2023:352,2024:345,2025:341 } },
  imogen: { girl:{ 2020:1238,2021:1334,2022:1291,2023:1215,2024:1123,2025:1118 } },
  ingrid: { girl:{ 2020:1006,2021:1000,2022:1108,2023:1144,2024:1094,2025:1123 } },
  isabel: { girl:{ 2020:157,2021:146,2022:156,2023:164,2024:167,2025:176 } },
  isla: { girl:{ 2020:44,2021:33,2022:36,2023:33,2024:35,2025:28 } },
  josie: { girl:{ 2020:134,2021:130,2022:120,2023:108,2024:88,2025:82 } },
  julia: { girl:{ 2020:108,2021:114,2022:111,2023:121,2024:116,2025:131 } },
  juliet: { girl:{ 2020:306,2021:296,2022:294,2023:294,2024:282,2025:274 } },
  laurel: { girl:{ 2020:685,2021:637,2022:709,2023:715,2024:729,2025:735 } },
  lillian: { girl:{ 2020:46,2021:51,2022:50,2023:55,2024:54,2025:57 } },
  lily: { girl:{ 2020:35,2021:31,2022:30,2023:20,2024:24,2025:18 } },
  louisa: { girl:{ 2020:728,2021:685,2022:823,2023:809,2024:732,2025:696 } },
  meadow: { girl:{ 2020:476,2021:499,2022:405,2023:350,2024:325,2025:286 } },
  nadia: { girl:{ 2020:468,2021:459,2022:438,2023:489,2024:513,2025:565 } },
  natalie: { girl:{ 2020:51,2021:56,2022:55,2023:63,2024:73,2025:89 } },
  nell: { girl:{ 2020:2260,2021:2010,2022:1746,2023:1670,2024:1459,2025:1624 } },
  olive: { girl:{ 2020:195,2021:182,2022:158,2023:180,2024:170,2025:197 } },
  olivia: { girl:{ 2020:1,2021:1,2022:1,2023:1,2024:1,2025:1 } },
  ophelia: { girl:{ 2020:392,2021:321,2022:272,2023:265,2024:259,2025:264 } },
  penelope: { girl:{ 2020:26,2021:23,2022:21,2023:23,2024:28,2025:22 } },
  lucille: { girl:{ 2020:274,2021:276,2022:278,2023:285,2024:274,2025:237 } },
  primrose: { girl:{ 2020:2143,2021:2059,2022:2159,2023:2110,2024:2101,2025:2544 } },
  rose: { girl:{ 2020:112,2021:116,2022:119,2023:124,2024:114,2025:114 } },
  rosemary: { girl:{ 2020:442,2021:363,2022:364,2023:310,2024:301,2025:251 } },
  ruth: { girl:{ 2020:219,2021:187,2022:179,2023:187,2024:171,2025:173 } },
  sadie: { girl:{ 2020:78,2021:78,2022:68,2023:59,2024:57,2025:50 } },
  scarlett: { girl:{ 2020:21,2021:20,2022:14,2023:17,2024:27,2025:32 } },
  sophie: { girl:{ 2020:75,2021:76,2022:63,2023:60,2024:60,2025:55 } },
  susannah: { girl:{ 2020:2257,2021:2785,2022:3075,2023:3481,2024:2726,2025:2519 } },
  talia: { girl:{ 2020:336,2021:302,2022:303,2023:264,2024:270,2025:265 } },
  tabitha: { girl:{ 2020:1334,2021:1343,2022:1468,2023:1493,2024:1506,2025:1299 } },
  verena: { girl:{ 2020:4555,2021:4725,2022:4387,2023:5132,2024:4116,2025:3720 } },
  willa: { girl:{ 2020:349,2021:351,2022:395,2023:429,2024:423,2025:422 } },
  winifred: { girl:{ 2020:1099,2021:1069,2022:1089,2023:963,2024:1027,2025:922 } },
  wynne: { girl:{ 2020:4176,2021:4331,2022:3705,2023:4881,2024:4779,2025:4355 } },
  aaron: { boy:{ 2020:63,2021:65,2022:71,2023:68,2024:79,2025:80 } },
  adam: { boy:{ 2020:97,2021:104,2022:99,2023:103,2024:100,2025:101 } },
  alexander: { boy:{ 2020:10,2021:13,2022:17,2023:22,2024:27,2025:30 } },
  alistair: { boy:{ 2020:964,2021:903,2022:932,2023:925,2024:913,2025:900 } },
  anson: { boy:{ 2020:1063,2021:1260,2022:1248,2023:1299,2024:1396,2025:1742 } },
  barrett: { boy:{ 2020:193,2021:193,2022:208,2023:207,2024:187,2025:171 } },
  benjamin: { boy:{ 2020:7,2021:7,2022:9,2023:11,2024:11,2025:11 } },
  brody: { boy:{ 2020:178,2021:186,2022:207,2023:204,2024:224,2025:236 } },
  bruce: { boy:{ 2020:498,2021:536,2022:564,2023:542,2024:537,2025:538 } },
  byron: { boy:{ 2020:791,2021:751,2022:893,2023:839,2024:878,2025:982 } },
  callum: { boy:{ 2020:336,2021:273,2022:249,2023:222,2024:158,2025:118 } },
  carter: { boy:{ 2020:33,2021:39,2022:47,2023:48,2024:46,2025:45 } },
  charles: { boy:{ 2020:46,2021:50,2022:50,2023:54,2024:51,2025:48 } },
  clark: { boy:{ 2020:388,2021:396,2022:427,2023:440,2024:437,2025:378 } },
  colin: { boy:{ 2020:287,2021:269,2022:292,2023:334,2024:335,2025:343 } },
  crawford: { boy:{ 2020:2316,2021:2491,2022:2293,2023:2566,2024:2585,2025:2101 } },
  curtis: { boy:{ 2020:703,2021:781,2022:822,2023:908,2024:930,2025:986 } },
  daniel: { boy:{ 2020:14,2021:16,2022:14,2023:17,2024:16,2025:22 } },
  david: { boy:{ 2020:28,2021:30,2022:31,2023:27,2024:31,2025:35 } },
  declan: { boy:{ 2020:101,2021:106,2022:114,2023:132,2024:132,2025:139 } },
  dominic: { boy:{ 2020:89,2021:99,2022:102,2023:106,2024:107,2025:106 } },
  duncan: { boy:{ 2020:985,2021:1020,2022:917,2023:931,2024:1104,2025:1126 } },
  garrett: { boy:{ 2020:364,2021:401,2022:461,2023:480,2024:561,2025:564 } },
  forrest: { boy:{ 2020:462,2021:414,2022:403,2023:424,2024:407,2025:374 } },
  francis: { boy:{ 2020:482,2021:467,2022:464,2023:456,2024:451,2025:420 } },
  gabriel: { boy:{ 2020:38,2021:38,2022:36,2023:38,2024:43,2025:37 } },
  grant: { boy:{ 2020:213,2021:213,2022:220,2023:228,2024:241,2025:228 } },
  gregory: { boy:{ 2020:434,2021:486,2022:495,2023:530,2024:539,2025:593 } },
  harrison: { boy:{ 2020:114,2021:121,2022:128,2023:119,2024:121,2025:116 } },
  henry: { boy:{ 2020:9,2021:9,2022:7,2023:8,2024:6,2025:5 } },
  isaac: { boy:{ 2020:39,2021:40,2022:41,2023:42,2024:41,2025:47 } },
  jack: { boy:{ 2020:21,2021:11,2022:15,2023:14,2024:15,2025:15 } },
  jacob: { boy:{ 2020:15,2021:24,2022:32,2023:35,2024:40,2025:43 } },
  james: { boy:{ 2020:6,2021:5,2022:4,2023:4,2024:5,2025:6 } },
  joseph: { boy:{ 2020:26,2021:28,2022:30,2023:29,2024:32,2025:29 } },
  joshua: { boy:{ 2020:53,2021:58,2022:60,2023:60,2024:57,2025:66 } },
  leland: { boy:{ 2020:468,2021:432,2022:500,2023:520,2024:543,2025:494 } },
  lincoln: { boy:{ 2020:40,2021:45,2022:54,2023:64,2024:73,2025:69 } },
  luke: { boy:{ 2020:31,2021:32,2022:34,2023:31,2024:34,2025:33 } },
  malcolm: { boy:{ 2020:290,2021:281,2022:283,2023:293,2024:314,2025:272 } },
  marcus: { boy:{ 2020:226,2021:228,2022:235,2023:250,2024:256,2025:258 } },
  martin: { boy:{ 2020:293,2021:300,2022:303,2023:288,2024:307,2025:335 } },
  maxwell: { boy:{ 2020:146,2021:162,2022:173,2023:182,2024:183,2025:189 } },
  micah: { boy:{ 2020:106,2021:107,2022:89,2023:87,2024:86,2025:90 } },
  nathan: { boy:{ 2020:55,2021:59,2022:57,2023:59,2024:62,2025:63 } },
  nicholas: { boy:{ 2020:87,2021:92,2022:97,2023:109,2024:117,2025:112 } },
  noah: { boy:{ 2020:2,2021:2,2022:2,2023:2,2024:2,2025:2 } },
  owen: { boy:{ 2020:22,2021:22,2022:18,2023:20,2024:26,2025:31 } },
  patrick: { boy:{ 2020:205,2021:212,2022:218,2023:224,2024:221,2025:235 } },
  paul: { boy:{ 2020:252,2021:257,2022:262,2023:256,2024:262,2025:262 } },
  peter: { boy:{ 2020:215,2021:215,2022:213,2023:210,2024:192,2025:187 } },
  porter: { boy:{ 2020:424,2021:443,2022:506,2023:499,2024:617,2025:560 } },
  preston: { boy:{ 2020:228,2021:241,2022:255,2023:274,2024:330,2025:299 } },
  raymond: { boy:{ 2020:311,2021:331,2022:343,2023:360,2024:379,2025:394 } },
  rhys: { boy:{ 2020:418,2021:413,2022:426,2023:353,2024:352,2025:410 } },
  robert: { boy:{ 2020:80,2021:79,2022:84,2023:88,2024:90,2025:92 } },
  russell: { boy:{ 2020:370,2021:355,2022:373,2023:391,2024:367,2025:347 } },
  samuel: { boy:{ 2020:25,2021:23,2022:19,2023:19,2024:17,2025:18 } },
  stuart: { boy:{ 2020:2296,2021:2554,2022:2359,2023:2622,2024:3222,2025:2520 } },
  theo: { boy:{ 2020:172,2021:142,2022:98,2023:78,2024:80,2025:82 } },
  thomas: { boy:{ 2020:45,2021:46,2022:45,2023:41,2024:39,2025:34 } },
  timothy: { boy:{ 2020:192,2021:198,2022:202,2023:211,2024:206,2025:203 } },
  tobias: { boy:{ 2020:263,2021:276,2022:276,2023:279,2024:280,2025:283 } },
  warren: { boy:{ 2020:343,2021:346,2022:333,2023:305,2024:263,2025:240 } },
  william: { boy:{ 2020:5,2021:6,2022:6,2023:10,2024:10,2025:9 } },
  winston: { boy:{ 2020:408,2021:408,2022:420,2023:397,2024:404,2025:381 } },
  alex: { girl:{ 2020:1298,2021:1620,2022:1485,2023:1982,2024:2176,2025:2511 }, boy:{ 2020:183,2021:192,2022:189,2023:203,2024:205,2025:232 } },
  avery: { girl:{ 2020:19,2021:19,2022:26,2023:29,2024:31,2025:37 }, boy:{ 2020:211,2021:210,2022:221,2023:241,2024:259,2025:291 } },
  bellamy: { girl:{ 2020:797,2021:765,2022:719,2023:832,2024:863,2025:798 }, boy:{ 2020:736,2021:621,2022:631,2023:751,2024:688,2025:722 } },
  campbell: { girl:{ 2020:1192,2021:1168,2022:1223,2023:1126,2024:959,2025:618 }, boy:{ 2020:1171,2021:1049,2022:1034,2023:1033,2024:925,2025:765 } },
  carey: { boy:{ 2020:6954,2021:null,2022:7684,2023:7220,2024:5408,2025:6729 } },
  darcy: { girl:{ 2020:1191,2021:1128,2022:1068,2023:1020,2024:983,2025:858 }, boy:{ 2020:8584,2021:5512,2022:6407,2023:5628,2024:3868,2025:4228 } },
  ellery: { girl:{ 2020:1147,2021:1150,2022:1201,2023:1216,2024:1332,2025:1209 }, boy:{ 2020:8547,2021:null,2022:7625,2023:8736,2024:5384,2025:9474 } },
  finch: { boy:{ 2020:5618,2021:5061,2022:4963,2023:6760,2024:5183,2025:6058 } },
  flynn: { girl:{ 2020:8784,2021:8783,2022:5127,2023:5204,2024:6831,2025:7378 }, boy:{ 2020:662,2021:654,2022:716,2023:784,2024:736,2025:827 } },
  harlow: { girl:{ 2020:324,2021:238,2022:263,2023:238,2024:293,2025:309 }, boy:{ 2020:2252,2021:1819,2022:1202,2023:1150,2024:1246,2025:1214 } },
  larkin: { girl:{ 2020:2122,2021:2648,2022:2734,2023:3298,2024:3543,2025:3674 }, boy:{ 2020:2706,2021:2838,2022:3115,2023:2790,2024:2934,2025:3413 } },
  keaton: { girl:{ 2020:6205,2021:5490,2022:5103,2023:4507,2024:4834,2025:2161 }, boy:{ 2020:691,2021:736,2022:801,2023:875,2024:845,2025:770 } },
  lane: { girl:{ 2020:1864,2021:1823,2022:1734,2023:1972,2024:2191,2025:1798 }, boy:{ 2020:256,2021:261,2022:261,2023:254,2024:261,2025:250 } },
  marsh: { boy:{ 2020:null,2021:null,2022:null,2023:8499,2024:7958,2025:null } },
  monroe: { girl:{ 2020:541,2021:525,2022:544,2023:529,2024:570,2025:467 }, boy:{ 2020:1482,2021:1103,2022:1542,2023:1342,2024:1280,2025:1260 } },
  murphy: { girl:{ 2020:977,2021:719,2022:667,2023:516,2024:474,2025:397 }, boy:{ 2020:965,2021:1026,2022:885,2023:901,2024:813,2025:756 } },
  nico: { girl:{ 2020:3935,2021:4105,2022:4408,2023:4208,2024:4132,2025:4573 }, boy:{ 2020:318,2021:259,2022:237,2023:240,2024:211,2025:174 } },
  remy: { girl:{ 2020:496,2021:553,2022:601,2023:641,2024:681,2025:718 }, boy:{ 2020:356,2021:360,2022:356,2023:390,2024:399,2025:408 } },
  teddy: { girl:{ 2020:4770,2021:3886,2022:3542,2023:2760,2024:3467,2025:2960 }, boy:{ 2020:1325,2021:1168,2022:1042,2023:992,2024:891,2025:819 } },
  adela: { girl:{ 2020:1169,2021:1190,2022:1116,2023:1134,2024:1098,2025:1158 } },
  alma: { girl:{ 2020:560,2021:507,2022:483,2023:462,2024:471,2025:450 } },
  astrid: { girl:{ 2020:449,2021:442,2022:404,2023:399,2024:382,2025:376 } },
  beatrix: { girl:{ 2020:1168,2021:1126,2022:1228,2023:1405,2024:1372,2025:1365 } },
  birdie: { girl:{ 2020:1001,2021:887,2022:802,2023:700,2024:746,2025:672 } },
  bronwen: { girl:{ 2020:null,2021:null,2022:null,2023:null,2024:null,2025:9994 } },
  calla: { girl:{ 2020:1569,2021:1569,2022:1577,2023:1611,2024:1517,2025:1404 } },
  cassia: { girl:{ 2020:2675,2021:2599,2022:2748,2023:2373,2024:2241,2025:2030 } },
  catherine: { girl:{ 2020:267,2021:324,2022:329,2023:332,2024:322,2025:313 } },
  cecily: { girl:{ 2020:1605,2021:1648,2022:1617,2023:1822,2024:1605,2025:1546 } },
  clarissa: { girl:{ 2020:912,2021:948,2022:1042,2023:1161,2024:1163,2025:1115 } },
  constance: { girl:{ 2020:1567,2021:1838,2022:1738,2023:1667,2024:1635,2025:1510 } },
  cressida: { girl:{ 2020:null,2021:null,2022:null,2023:null,2024:null,2025:9329 } },
  delia: { girl:{ 2020:1347,2021:1465,2022:1634,2023:1453,2024:1516,2025:1569 } },
  dorothea: { girl:{ 2020:2811,2021:2431,2022:2746,2023:2781,2024:2073,2025:1790 } },
  elspeth: { girl:{ 2020:5274,2021:6878,2022:6885,2023:8357,2024:6321,2025:7775 } },
  emmeline: { girl:{ 2020:867,2021:885,2022:983,2023:951,2024:942,2025:923 } },
  etta: { girl:{ 2020:928,2021:931,2022:1016,2023:938,2024:971,2025:929 } },
  euphemia: { girl:{ 2020:7846,2021:9372,2022:7185,2023:6852,2024:8777,2025:6254 } },
  evangeline: { girl:{ 2020:258,2021:236,2022:266,2023:212,2024:173,2025:147 } },
  faye: { girl:{ 2020:688,2021:604,2022:564,2023:500,2024:539,2025:515 } },
  flannery: { girl:{ 2020:9350,2021:null,2022:null,2023:null,2024:null,2025:null } },
  gemma: { girl:{ 2020:208,2021:190,2022:197,2023:176,2024:203,2025:170 } },
  gillian: { girl:{ 2020:3082,2021:3197,2022:3158,2023:3206,2024:3106,2025:3330 } },
  giselle: { girl:{ 2020:332,2021:361,2022:350,2023:347,2024:359,2025:383 } },
  gloria: { girl:{ 2020:577,2021:571,2022:629,2023:672,2024:652,2025:655 } },
  greta: { girl:{ 2020:741,2021:826,2022:860,2023:937,2024:862,2025:911 } },
  honora: { girl:{ 2020:6811,2021:5182,2022:null,2023:7489,2024:4851,2025:7360 } },
  isadora: { girl:{ 2020:1314,2021:1538,2022:1492,2023:1442,2024:1227,2025:1267 } },
  jessamine: { girl:{ 2020:null,2021:9972,2022:null,2023:9331,2024:7447,2025:9815 } },
  johanna: { girl:{ 2020:645,2021:706,2022:792,2023:749,2024:851,2025:869 } },
  lavinia: { girl:{ 2020:2761,2021:2544,2022:2146,2023:2338,2024:2136,2025:2283 } },
  leonora: { girl:{ 2020:2642,2021:2423,2022:2470,2023:1893,2024:2088,2025:1773 } },
  lottie: { girl:{ 2020:1553,2021:1092,2022:950,2023:778,2024:676,2025:527 } },
  lucinda: { girl:{ 2020:1591,2021:1657,2022:1874,2023:1870,2024:1687,2025:1754 } },
  magnolia: { girl:{ 2020:176,2021:140,2022:151,2023:145,2024:138,2025:124 } },
  marguerite: { girl:{ 2020:2447,2021:2292,2022:2428,2023:2298,2024:2419,2025:2493 } },
  marina: { girl:{ 2020:704,2021:718,2022:642,2023:572,2024:639,2025:601 } },
  meredith: { girl:{ 2020:585,2021:570,2022:549,2023:509,2024:491,2025:469 } },
  mirabel: { girl:{ 2020:3866,2021:4197,2022:1452,2023:2093,2024:2371,2025:2571 } },
  nessa: { girl:{ 2020:3021,2021:2858,2022:3085,2023:3059,2024:2863,2025:2725 } },
  odette: { girl:{ 2020:1477,2021:1437,2022:1312,2023:1257,2024:1214,2025:881 } },
  orla: { girl:{ 2020:4282,2021:2970,2022:2826,2023:2592,2024:2515,2025:2523 } },
  petra: { girl:{ 2020:1279,2021:1427,2022:1533,2023:1471,2024:1485,2025:1367 } },
  philippa: { girl:{ 2020:2787,2021:2612,2022:2427,2023:2621,2024:2615,2025:2791 } },
  prudence: { girl:{ 2020:2158,2021:2489,2022:1979,2023:2318,2024:2589,2025:2102 } },
  romilly: { girl:{ 2020:8505,2021:null,2022:8648,2023:7315,2024:6011,2025:7550 } },
  rosamund: { girl:{ 2020:8045,2021:5611,2022:6505,2023:6214,2024:7674,2025:7195 } },
  selma: { girl:{ 2020:2174,2021:2717,2022:2726,2023:2417,2024:2778,2025:2789 } },
  seraphina: { girl:{ 2020:1271,2021:1081,2022:1034,2023:967,2024:775,2025:599 } },
  sybil: { girl:{ 2020:1893,2021:1683,2022:1499,2023:1448,2024:1559,2025:1423 } },
  theodora: { girl:{ 2020:836,2021:737,2022:688,2023:776,2024:811,2025:725 } },
  ursula: { girl:{ 2020:4657,2021:4176,2022:5186,2023:3837,2024:5165,2025:4671 } },
  wilhelmina: { girl:{ 2020:1818,2021:1642,2022:1562,2023:1536,2024:1796,2025:1512 } },
  abner: { boy:{ 2020:978,2021:1024,2022:1118,2023:999,2024:839,2025:877 } },
  alaric: { boy:{ 2020:825,2021:857,2022:919,2023:1078,2024:1113,2025:1063 } },
  alden: { boy:{ 2020:672,2021:677,2022:628,2023:641,2024:577,2025:598 } },
  ambrose: { boy:{ 2020:820,2021:672,2022:721,2023:789,2024:739,2025:735 } },
  anselm: { boy:{ 2020:8027,2021:null,2022:8269,2023:9703,2024:null,2025:8845 } },
  archer: { boy:{ 2020:160,2021:139,2022:127,2023:129,2024:115,2025:98 } },
  augustus: { boy:{ 2020:500,2021:457,2022:466,2023:488,2024:409,2025:407 } },
  basil: { boy:{ 2020:2343,2021:2023,2022:1836,2023:2045,2024:2024,2025:2032 } },
  bertram: { boy:{ 2020:8641,2021:null,2022:8882,2023:null,2024:8230,2025:8799 } },
  booker: { boy:{ 2020:1668,2021:1214,2022:1187,2023:1162,2024:1294,2025:1163 } },
  boyd: { boy:{ 2020:1533,2021:1613,2022:1631,2023:2168,2024:2233,2025:1975 } },
  bram: { boy:{ 2020:3265,2021:2966,2022:3603,2023:3105,2024:2992,2025:2449 } },
  caspar: { boy:{ 2020:5402,2021:6285,2022:5180,2023:6808,2024:6147,2025:5012 } },
  cedric: { boy:{ 2020:971,2021:1038,2022:960,2023:1045,2024:941,2025:1053 } },
  clement: { boy:{ 2020:2611,2021:2315,2022:2513,2023:2407,2024:2232,2025:2279 } },
  conrad: { boy:{ 2020:551,2021:538,2022:575,2023:538,2024:469,2025:419 } },
  cyrus: { boy:{ 2020:369,2021:349,2022:324,2023:296,2024:253,2025:268 } },
  edmund: { boy:{ 2020:1420,2021:1155,2022:1197,2023:1101,2024:1171,2025:1082 } },
  edwin: { boy:{ 2020:344,2021:353,2022:360,2023:385,2024:382,2025:399 } },
  elias: { boy:{ 2020:54,2021:48,2022:43,2023:36,2024:25,2025:13 } },
  ellington: { boy:{ 2020:3624,2021:3219,2022:3259,2023:3547,2024:5189,2025:4220 } },
  ferdinand: { boy:{ 2020:6205,2021:5717,2022:3854,2023:3860,2024:3967,2025:4350 } },
  florian: { boy:{ 2020:4798,2021:3630,2022:4400,2023:3276,2024:3250,2025:2500 } },
  foster: { boy:{ 2020:963,2021:1010,2022:1040,2023:968,2024:1079,2025:902 } },
  franklin: { boy:{ 2020:415,2021:395,2022:407,2023:409,2024:389,2025:359 } },
  gerald: { boy:{ 2020:954,2021:1009,2022:1068,2023:1025,2024:1170,2025:1209 } },
  giles: { boy:{ 2020:5172,2021:5714,2022:6710,2023:7588,2024:5180,2025:7064 } },
  godfrey: { boy:{ 2020:6897,2021:6583,2022:8108,2023:8699,2024:null,2025:8071 } },
  hamish: { boy:{ 2020:5607,2021:4212,2022:4661,2023:6747,2024:6096,2025:6348 } },
  harlan: { boy:{ 2020:693,2021:638,2022:727,2023:654,2024:666,2025:618 } },
  hartley: { boy:{ 2020:4792,2021:4881,2022:4395,2023:3852,2024:3962,2025:4112 } },
  horace: { boy:{ 2020:5164,2021:5480,2022:4659,2023:5400,2024:5376,2025:6343 } },
  ignatius: { boy:{ 2020:1865,2021:1849,2022:1871,2023:1812,2024:1744,2025:1666 } },
  ivan: { boy:{ 2020:153,2021:168,2022:159,2023:153,2024:153,2025:162 } },
  lionel: { boy:{ 2020:659,2021:661,2022:620,2023:495,2024:562,2025:659 } },
  lucius: { boy:{ 2020:1222,2021:1374,2022:1223,2023:1255,2024:1390,2025:1129 } },
  mortimer: { boy:{ 2020:9011,2021:null,2022:null,2023:null,2024:null,2025:null } },
  nigel: { boy:{ 2020:1855,2021:1725,2022:2099,2023:2053,2024:2194,2025:2079 } },
  oswald: { boy:{ 2020:2989,2021:2477,2022:2502,2023:2196,2024:2124,2025:2150 } },
  percival: { boy:{ 2020:2696,2021:2741,2022:2623,2023:2253,2024:1770,2025:1531 } },
  phineas: { boy:{ 2020:1425,2021:1399,2022:1617,2023:1704,2024:1544,2025:1613 } },
  quentin: { boy:{ 2020:533,2021:540,2022:656,2023:767,2024:783,2025:965 } },
  reuben: { boy:{ 2020:907,2021:879,2022:852,2023:809,2024:858,2025:884 } },
  roderick: { boy:{ 2020:1609,2021:1702,2022:1667,2023:1912,2024:1906,2025:1743 } },
  roland: { boy:{ 2020:570,2021:668,2022:608,2023:662,2024:663,2025:608 } },
  rufus: { boy:{ 2020:3932,2021:4153,2022:3902,2023:5120,2024:4101,2025:3979 } },
  rupert: { boy:{ 2020:4166,2021:4024,2022:5267,2023:4137,2024:3810,2025:3773 } },
  sterling: { boy:{ 2020:399,2021:382,2022:397,2023:403,2024:370,2025:346 } },
  tennyson: { boy:{ 2020:3213,2021:4260,2022:3624,2023:4756,2024:3801,2025:4413 } },
  thaddeus: { boy:{ 2020:783,2021:817,2022:808,2023:893,2024:852,2025:797 } },
  ulysses: { boy:{ 2020:1064,2021:1131,2022:1113,2023:1189,2024:1290,2025:1198 } },
  vaughn: { boy:{ 2020:1102,2021:1116,2022:1167,2023:1205,2024:1186,2025:1152 } },
  wallace: { boy:{ 2020:916,2021:892,2022:967,2023:1016,2024:984,2025:960 } },
  whitaker: { boy:{ 2020:2587,2021:2195,2022:2677,2023:2618,2024:2212,2025:2168 } },
  wilfred: { boy:{ 2020:3814,2021:3076,2022:4310,2023:3811,2024:4713,2025:3760 } },
  winslow: { boy:{ 2020:3206,2021:3919,2022:2618,2023:3298,2024:2720,2025:2838 } },
  ainsley: { girl:{ 2020:355,2021:365,2022:507,2023:598,2024:705,2025:483 }, boy:{ 2020:8053,2021:8802,2022:7748,2023:8890,2024:null,2025:9688 } },
  baxter: { boy:{ 2020:2722,2021:3569,2022:3456,2023:3988,2024:3097,2025:3170 } },
  blair: { girl:{ 2020:335,2021:317,2022:282,2023:242,2024:218,2025:169 }, boy:{ 2020:2613,2021:2317,2022:1936,2023:1867,2024:2187,2025:2104 } },
  cassidy: { girl:{ 2020:412,2021:478,2022:478,2023:495,2024:478,2025:541 }, boy:{ 2020:2751,2021:2908,2022:2709,2023:2475,2024:2340,2025:2600 } },
  darby: { girl:{ 2020:2211,2021:2040,2022:2598,2023:2431,2024:3163,2025:2582 }, boy:{ 2020:5198,2021:4600,2022:6735,2023:5044,2024:8184,2025:6708 } },
  easton: { girl:{ 2020:3647,2021:3100,2022:3578,2023:4627,2024:4862,2025:6063 }, boy:{ 2020:73,2021:72,2022:80,2023:98,2024:103,2025:110 } },
  emlyn: { girl:{ 2020:5107,2021:6111,2022:8393,2023:6098,2024:null,2025:9914 } },
  hadley: { girl:{ 2020:111,2021:112,2022:112,2023:119,2024:115,2025:121 }, boy:{ 2020:3546,2021:4213,2022:4398,2023:3685,2024:4831,2025:7058 } },
  haven: { girl:{ 2020:312,2021:286,2022:285,2023:218,2024:201,2025:190 }, boy:{ 2020:1469,2021:1363,2022:1436,2023:1453,2024:1483,2025:1355 } },
  holland: { girl:{ 2020:709,2021:643,2022:591,2023:573,2024:602,2025:549 }, boy:{ 2020:1550,2021:1794,2022:1582,2023:1572,2024:1569,2025:1368 } },
  kemp: { boy:{ 2020:8391,2021:null,2022:null,2023:6686,2024:6059,2025:4947 } },
  linden: { girl:{ 2020:2400,2021:2396,2022:2131,2023:2529,2024:2544,2025:2262 }, boy:{ 2020:1545,2021:1556,2022:1751,2023:1738,2024:1547,2025:1411 } },
  oakley: { girl:{ 2020:284,2021:193,2022:157,2023:153,2024:157,2025:156 }, boy:{ 2020:420,2021:403,2022:393,2023:396,2024:408,2025:454 } },
  stellan: { boy:{ 2020:1656,2021:1528,2022:1760,2023:1477,2024:1439,2025:1138 } },
  vesper: { girl:{ 2020:3548,2021:3161,2022:2664,2023:2259,2024:2751,2025:2460 }, boy:{ 2020:null,2021:null,2022:null,2023:9847,2024:6859,2025:8979 } },
  waverly: { girl:{ 2020:736,2021:746,2022:753,2023:881,2024:905,2025:1027 } },
  winter: { girl:{ 2020:315,2021:322,2022:304,2023:369,2024:385,2025:426 }, boy:{ 2020:2505,2021:2042,2022:2219,2023:2419,2024:2314,2025:1977 } },
  liam: { boy:{ 2020:1,2021:1,2022:1,2023:1,2024:1,2025:1 } },
  oliver: { boy:{ 2020:3,2021:3,2022:3,2023:3,2024:3,2025:3 } },
  lucas: { boy:{ 2020:8,2021:8,2022:8,2023:9,2024:9,2025:10 } },
  mason: { boy:{ 2020:11,2021:18,2022:24,2023:30,2024:42,2025:39 } },
  michael: { boy:{ 2020:12,2021:17,2022:16,2023:16,2024:18,2025:21 } },
  ethan: { boy:{ 2020:13,2021:20,2022:21,2023:25,2024:19,2025:24 } },
  jackson: { boy:{ 2020:17,2021:14,2022:23,2023:28,2024:35,2025:36 } },
  logan: { boy:{ 2020:16,2021:21,2022:33,2023:39,2024:45,2025:53 } },
  hudson: { boy:{ 2020:43,2021:34,2022:27,2023:21,2024:22,2025:17 } },
  john: { boy:{ 2020:27,2021:27,2022:26,2023:26,2024:21,2025:23 } },
  cooper: { boy:{ 2020:75,2021:68,2022:53,2023:53,2024:50,2025:27 } },
  dylan: { boy:{ 2020:42,2021:44,2022:42,2023:34,2024:28,2025:41 } },
  wyatt: { boy:{ 2020:29,2021:29,2022:38,2023:47,2024:38,2025:38 } },
  matthew: { boy:{ 2020:30,2021:36,2022:39,2023:32,2024:33,2025:32 } },
  grayson: { boy:{ 2020:35,2021:35,2022:37,2023:44,2024:48,2025:51 } },
  anthony: { boy:{ 2020:41,2021:43,2022:44,2023:46,2024:44,2025:46 } },
  christopher: { boy:{ 2020:47,2021:52,2022:55,2023:55,2024:61,2025:68 } },
  andrew: { boy:{ 2020:52,2021:57,2022:61,2023:65,2024:68,2025:73 } },
  weston: { boy:{ 2020:104,2021:95,2022:82,2023:75,2024:70,2025:55 } },
  waylon: { boy:{ 2020:103,2021:69,2022:66,2023:63,2024:65,2025:56 } },
  nolan: { boy:{ 2020:61,2021:60,2022:65,2023:57,2024:64,2025:65 } },
  ryan: { boy:{ 2020:57,2021:66,2022:74,2023:83,2024:87,2025:99 } },
  adrian: { boy:{ 2020:58,2021:61,2022:63,2023:67,2024:72,2025:74 } },
  cameron: { girl:{ 2020:490,2021:468,2022:516,2023:481,2024:486,2025:487 }, boy:{ 2020:65,2021:62,2022:64,2023:58,2024:66,2025:76 } },
  beau: { boy:{ 2020:109,2021:94,2022:90,2023:81,2024:69,2025:60 } },
  colton: { boy:{ 2020:66,2021:75,2022:91,2023:94,2024:98,2025:103 } },
  hunter: { boy:{ 2020:68,2021:86,2022:101,2023:115,2024:128,2025:130 } },
  ian: { boy:{ 2020:83,2021:81,2022:72,2023:70,2024:74,2025:83 } },
  landon: { boy:{ 2020:69,2021:73,2022:87,2023:96,2024:106,2025:127 } },
  jonathan: { boy:{ 2020:70,2021:77,2022:79,2023:82,2024:83,2025:89 } },
  connor: { boy:{ 2020:78,2021:98,2022:118,2023:126,2024:136,2025:166 } },
  jameson: { boy:{ 2020:79,2021:80,2022:85,2023:102,2024:118,2025:137 } },
  jordan: { girl:{ 2020:439,2021:425,2022:500,2023:497,2024:536,2025:585 }, boy:{ 2020:82,2021:88,2022:92,2023:97,2024:104,2025:131 } },
  carson: { boy:{ 2020:84,2021:97,2022:110,2023:112,2024:124,2025:124 } },
  austin: { boy:{ 2020:88,2021:96,2022:111,2023:101,2024:108,2025:113 } },
  xavier: { boy:{ 2020:91,2021:100,2022:100,2023:105,2024:102,2025:108 } },
  evan: { boy:{ 2020:105,2021:116,2022:133,2023:137,2024:143,2025:153 } },
  damian: { boy:{ 2020:110,2021:113,2022:108,2023:108,2024:110,2025:109 } },
  jason: { boy:{ 2020:119,2021:129,2022:146,2023:147,2024:148,2025:165 } },
  chase: { boy:{ 2020:123,2021:125,2022:137,2023:154,2024:173,2025:192 } },
  tyler: { boy:{ 2020:130,2021:157,2022:163,2023:177,2024:191,2025:219 } },
  zachary: { boy:{ 2020:135,2021:144,2022:165,2023:171,2024:194,2025:216 } },
  ashton: { boy:{ 2020:136,2021:148,2022:145,2023:156,2024:188,2025:197 } },
  leon: { boy:{ 2020:196,2021:177,2022:158,2023:148,2024:141,2025:138 } },
  dawson: { boy:{ 2020:197,2021:207,2022:184,2023:149,2024:139,2025:143 } },
  gavin: { boy:{ 2020:142,2021:174,2022:206,2023:232,2024:255,2025:303 } },
  charlie: { girl:{ 2020:122,2021:127,2022:123,2023:125,2024:140,2025:133 }, boy:{ 2020:204,2021:189,2022:178,2023:174,2024:177,2025:145 } },
  max: { boy:{ 2020:147,2021:160,2022:157,2023:163,2024:175,2025:180 } },
  rhett: { boy:{ 2020:159,2021:149,2022:151,2023:165,2024:174,2025:188 } },
  kevin: { boy:{ 2020:157,2021:183,2022:182,2023:188,2024:196,2025:221 } },
  elliott: { girl:{ 2020:486,2021:558,2022:627,2023:660,2024:612,2025:600 }, boy:{ 2020:158,2021:169,2022:168,2023:167,2024:162,2025:160 } },
  hayes: { boy:{ 2020:245,2021:229,2022:212,2023:209,2024:160,2025:163 } },
  brandon: { boy:{ 2020:166,2021:181,2022:210,2023:219,2024:230,2025:261 } },
  justin: { boy:{ 2020:165,2021:179,2022:181,2023:185,2024:199,2025:233 } },
  alan: { boy:{ 2020:194,2021:197,2022:190,2023:168,2024:167,2025:191 } },
  camden: { boy:{ 2020:167,2021:176,2022:188,2023:180,2024:193,2025:205 } },
  king: { boy:{ 2020:171,2021:185,2022:222,2023:266,2024:342,2025:405 } },
  finn: { boy:{ 2020:179,2021:184,2022:177,2023:187,2024:198,2025:206 } },
  tucker: { boy:{ 2020:191,2021:180,2022:197,2023:205,2024:200,2025:181 } },
  tristan: { boy:{ 2020:182,2021:208,2022:225,2023:253,2024:267,2025:309 } },
  jesse: { boy:{ 2020:203,2021:203,2022:192,2023:202,2024:185,2025:184 } },
  xander: { boy:{ 2020:187,2021:187,2022:200,2023:215,2024:215,2025:259 } },
  tate: { boy:{ 2020:353,2021:304,2022:234,2023:197,2024:210,2025:193 } },
  knox: { boy:{ 2020:238,2021:220,2022:199,2023:208,2024:209,2025:196 } },
  eric: { boy:{ 2020:198,2021:214,2022:229,2023:227,2024:252,2025:273 } },
  rory: { girl:{ 2020:458,2021:399,2022:335,2023:305,2024:287,2025:230 }, boy:{ 2020:330,2021:295,2022:280,2023:242,2024:227,2025:199 } },
  joel: { boy:{ 2020:207,2021:211,2022:209,2023:212,2024:219,2025:220 } },
  richard: { boy:{ 2020:208,2021:216,2022:219,2023:221,2024:233,2025:234 } },
  griffin: { boy:{ 2020:241,2021:232,2022:230,2023:214,2024:223,2025:222 } },
  baker: { boy:{ 2020:524,2021:450,2022:435,2023:398,2024:315,2025:217 } },
  colt: { boy:{ 2020:221,2021:221,2022:240,2023:264,2024:276,2025:285 } },
  callahan: { boy:{ 2020:808,2021:663,2022:520,2023:463,2024:364,2025:227 } },
  holden: { boy:{ 2020:227,2021:236,2022:285,2023:286,2024:281,2025:297 } },
  remington: { boy:{ 2020:230,2021:231,2022:242,2023:282,2024:287,2025:307 } },
  jeremy: { boy:{ 2020:232,2021:239,2022:246,2023:245,2024:266,2025:292 } },
  nash: { boy:{ 2020:240,2021:233,2022:251,2023:259,2024:240,2025:255 } },
  bryce: { boy:{ 2020:234,2021:250,2022:265,2023:258,2024:296,2025:357 } },
  mark: { boy:{ 2020:235,2021:252,2022:247,2023:249,2024:244,2025:244 } },
  dallas: { girl:{ 2020:632,2021:635,2022:645,2023:617,2024:658,2025:686 }, boy:{ 2020:269,2021:270,2022:253,2023:252,2024:243,2025:238 } },
  zane: { boy:{ 2020:258,2021:238,2022:258,2023:276,2024:305,2025:324 } },
  harvey: { boy:{ 2020:417,2021:421,2022:402,2023:326,2024:245,2025:253 } },
  shepherd: { boy:{ 2020:594,2021:526,2022:491,2023:405,2024:310,2025:246 } },
  cade: { boy:{ 2020:376,2021:338,2022:293,2023:280,2024:272,2025:248 } },
  maximus: { boy:{ 2020:250,2021:262,2022:270,2023:319,2024:331,2025:275 } },
  paxton: { boy:{ 2020:262,2021:255,2022:257,2023:257,2024:288,2025:338 } },
  derek: { boy:{ 2020:310,2021:303,2022:297,2023:273,2024:258,2025:284 } },
  aidan: { boy:{ 2020:261,2021:286,2022:296,2023:301,2024:312,2025:327 } },
  brian: { boy:{ 2020:271,2021:288,2022:289,2023:317,2024:302,2025:339 } },
  brady: { boy:{ 2020:305,2021:272,2022:282,2023:324,2024:309,2025:321 } },
  bradley: { boy:{ 2020:273,2021:313,2022:345,2023:359,2024:363,2025:403 } },
  otto: { boy:{ 2020:389,2021:334,2022:311,2023:283,2024:274,2025:277 } },
  benson: { boy:{ 2020:552,2021:582,2022:647,2023:618,2024:436,2025:279 } },
  chance: { boy:{ 2020:279,2021:322,2022:340,2023:377,2024:418,2025:443 } },
  clayton: { boy:{ 2020:289,2021:279,2022:286,2023:310,2024:318,2025:300 } },
  cody: { boy:{ 2020:297,2021:312,2022:302,2023:304,2024:289,2025:318 } },
  anderson: { boy:{ 2020:307,2021:328,2022:337,2023:333,2024:357,2025:363 } },
  sullivan: { boy:{ 2020:398,2021:372,2022:366,2023:358,2024:339,2025:314 } },
  kyle: { boy:{ 2020:313,2021:363,2022:395,2023:419,2024:439,2025:508 } },
  orion: { boy:{ 2020:325,2021:314,2022:332,2023:374,2024:325,2025:334 } },
  banks: { boy:{ 2020:753,2021:505,2022:409,2023:349,2024:366,2025:311 } },
  casey: { girl:{ 2020:1065,2021:1019,2022:949,2023:1050,2024:1055,2025:1068 }, boy:{ 2020:518,2021:447,2022:336,2023:316,2024:311,2025:320 } },
  colson: { boy:{ 2020:351,2021:323,2022:317,2023:346,2024:354,2025:310 } },
  archie: { boy:{ 2020:470,2021:400,2022:375,2023:347,2024:333,2025:302 } },
  prince: { boy:{ 2020:315,2021:332,2022:348,2023:364,2024:401,2025:447 } },
  julius: { boy:{ 2020:335,2021:319,2022:349,2023:399,2024:387,2025:424 } },
  jake: { boy:{ 2020:320,2021:337,2022:406,2023:410,2024:421,2025:458 } },
  stephen: { boy:{ 2020:322,2021:339,2022:358,2023:363,2024:375,2025:383 } },
  wade: { boy:{ 2020:340,2021:326,2022:344,2023:341,2024:341,2025:344 } },
  odin: { boy:{ 2020:331,2021:327,2022:331,2023:362,2024:476,2025:501 } },
  kane: { boy:{ 2020:338,2021:329,2022:361,2023:402,2024:432,2025:451 } },
  marshall: { boy:{ 2020:366,2021:378,2022:384,2023:388,2024:391,2025:340 } },
  titus: { boy:{ 2020:341,2021:356,2022:362,2023:373,2024:383,2025:358 } },
  jared: { boy:{ 2020:368,2021:394,2022:379,2023:343,2024:393,2025:397 } },
  corbin: { boy:{ 2020:347,2021:365,2022:429,2023:455,2024:473,2025:512 } },
  killian: { boy:{ 2020:352,2021:347,2022:364,2023:367,2024:371,2025:418 } },
  tyson: { boy:{ 2020:371,2021:352,2022:392,2023:394,2024:457,2025:531 } },
  lawson: { boy:{ 2020:357,2021:364,2022:410,2023:412,2024:415,2025:382 } },
  grady: { boy:{ 2020:400,2021:425,2022:405,2023:395,2024:372,2025:373 } },
  donovan: { boy:{ 2020:374,2021:426,2022:448,2023:468,2024:506,2025:495 } },
  jeffrey: { boy:{ 2020:386,2021:424,2022:452,2023:485,2024:521,2025:552 } },
  johnny: { boy:{ 2020:387,2021:433,2022:399,2023:434,2024:456,2025:457 } },
  apollo: { boy:{ 2020:448,2021:398,2022:390,2023:435,2024:414,2025:446 } },
  kieran: { boy:{ 2020:514,2021:494,2022:490,2023:477,2024:440,2025:389 } },
  royce: { boy:{ 2020:407,2021:392,2022:414,2023:445,2024:462,2025:499 } },
  raphael: { boy:{ 2020:512,2021:537,2022:483,2023:451,2024:420,2025:395 } },
  noel: { boy:{ 2020:416,2021:397,2022:425,2023:453,2024:434,2025:478 } },
  andy: { boy:{ 2020:401,2021:468,2022:449,2023:502,2024:491,2025:565 } },
  trevor: { boy:{ 2020:406,2021:458,2022:536,2023:552,2024:624,2025:679 } },
  hank: { boy:{ 2020:481,2021:434,2022:445,2023:444,2024:425,2025:413 } },
  reed: { boy:{ 2020:450,2021:415,2022:415,2023:430,2024:422,2025:417 } },
  troy: { boy:{ 2020:414,2021:417,2022:474,2023:461,2024:530,2025:532 } },
  leonidas: { boy:{ 2020:457,2021:446,2022:421,2023:476,2024:511,2025:510 } },
  boone: { boy:{ 2020:581,2021:574,2022:603,2023:597,2024:535,2025:423 } },
  damon: { boy:{ 2020:430,2021:427,2022:424,2023:425,2024:454,2025:502 } },
  frank: { boy:{ 2020:429,2021:445,2022:440,2023:469,2024:468,2025:513 } },
  lewis: { boy:{ 2020:497,2021:485,2022:489,2023:470,2024:431,2025:433 } },
  seth: { boy:{ 2020:432,2021:487,2022:471,2023:526,2024:555,2025:581 } },
  dalton: { boy:{ 2020:463,2021:520,2022:516,2023:513,2024:433,2025:448 } },
  peyton: { girl:{ 2020:98,2021:101,2022:125,2023:143,2024:168,2025:199 }, boy:{ 2020:433,2021:469,2022:535,2023:607,2024:658,2025:684 } },
  tripp: { boy:{ 2020:485,2021:444,2022:436,2023:457,2024:510,2025:522 } },
  dax: { boy:{ 2020:469,2021:462,2022:443,2023:559,2024:641,2025:693 } },
  asa: { boy:{ 2020:506,2021:495,2022:450,2023:509,2024:474,2025:484 } },
  rocco: { boy:{ 2020:491,2021:502,2022:513,2023:508,2024:501,2025:459 } },
  lucian: { boy:{ 2020:636,2021:594,2022:545,2023:489,2024:487,2025:462 } },
  mack: { boy:{ 2020:505,2021:473,2022:504,2023:545,2024:498,2025:463 } },
  deacon: { boy:{ 2020:516,2021:475,2022:517,2023:533,2024:553,2025:562 } },
  gage: { boy:{ 2020:475,2021:566,2022:641,2023:732,2024:825,2025:976 } },
  denver: { boy:{ 2020:528,2021:510,2022:480,2023:510,2024:488,2025:521 } },
  nikolai: { boy:{ 2020:546,2021:480,2022:583,2023:602,2024:593,2025:605 } },
  jonas: { boy:{ 2020:486,2021:523,2022:552,2023:532,2024:556,2025:601 } },
  caspian: { boy:{ 2020:763,2021:706,2022:723,2023:665,2024:576,2025:492 } },
  maximilian: { boy:{ 2020:494,2021:548,2022:567,2023:562,2024:587,2025:590 } },
  shane: { boy:{ 2020:507,2021:493,2022:511,2023:555,2024:601,2025:635 } },
  pierce: { boy:{ 2020:502,2021:503,2022:571,2023:546,2024:538,2025:505 } },
  ridge: { boy:{ 2020:625,2021:561,2022:533,2023:505,2024:527,2025:529 } },
  cannon: { boy:{ 2020:544,2021:507,2022:601,2023:640,2024:765,2025:721 } },
  lawrence: { boy:{ 2020:563,2021:580,2022:549,2023:558,2024:508,2025:519 } },
  ariel: { girl:{ 2020:199,2021:221,2022:237,2023:287,2024:300,2025:357 }, boy:{ 2020:565,2021:559,2022:570,2023:522,2024:509,2025:558 } },
  drew: { girl:{ 2020:945,2021:821,2022:844,2023:761,2024:697,2025:705 }, boy:{ 2020:531,2021:509,2022:522,2023:540,2024:542,2025:554 } },
  dorian: { boy:{ 2020:513,2021:567,2022:563,2023:606,2024:540,2025:540 } },
  roy: { boy:{ 2020:573,2021:551,2022:576,2023:556,2024:541,2025:525 } },
  gunnar: { boy:{ 2020:527,2021:541,2022:590,2023:593,2024:599,2025:613 } },
  corey: { boy:{ 2020:530,2021:553,2022:635,2023:642,2024:678,2025:780 } },
  dexter: { boy:{ 2020:559,2021:531,2022:693,2023:700,2024:723,2025:692 } },
  morgan: { boy:{ 2020:694,2021:611,2022:540,2023:551,2024:531,2025:559 } },
  scott: { boy:{ 2020:562,2021:609,2022:588,2023:598,2024:565,2025:534 } },
  drake: { boy:{ 2020:535,2021:569,2022:630,2023:681,2024:661,2025:828 } },
  huxley: { boy:{ 2020:538,2021:587,2022:612,2023:619,2024:744,2025:737 } },
  cal: { boy:{ 2020:939,2021:883,2022:748,2023:713,2024:672,2025:542 } },
  clay: { boy:{ 2020:644,2021:617,2022:619,2023:581,2024:544,2025:573 } },
  fletcher: { boy:{ 2020:653,2021:657,2022:674,2023:631,2024:564,2025:545 } },
  derrick: { boy:{ 2020:550,2021:608,2022:714,2023:759,2024:816,2025:852 } },
  ozzy: { boy:{ 2020:1047,2021:713,2022:618,2023:553,2024:598,2025:548 } },
  danny: { boy:{ 2020:567,2021:552,2022:614,2023:601,2024:638,2025:631 } },
  davis: { boy:{ 2020:553,2021:558,2022:632,2023:615,2024:645,2025:668 } },
  ronald: { boy:{ 2020:558,2021:562,2022:559,2023:611,2024:575,2025:637 } },
  rocky: { boy:{ 2020:860,2021:869,2022:884,2023:884,2024:657,2025:568 } },
  skyler: { boy:{ 2020:568,2021:686,2022:670,2023:727,2024:760,2025:784 } },
  chandler: { boy:{ 2020:569,2021:604,2022:640,2023:687,2024:737,2025:753 } },
  rhodes: { boy:{ 2020:1392,2021:1044,2022:923,2023:706,2024:614,2025:575 } },
  case: { boy:{ 2020:577,2021:631,2022:650,2023:715,2024:724,2025:734 } },
  jamie: { girl:{ 2020:708,2021:697,2022:733,2023:785,2024:718,2025:857 }, boy:{ 2020:714,2021:624,2022:623,2023:600,2024:623,2025:577 } },
  colby: { boy:{ 2020:618,2021:651,2022:600,2023:608,2024:583,2025:616 } },
  alec: { boy:{ 2020:591,2021:683,2022:745,2023:842,2024:881,2025:979 } },
  taylor: { girl:{ 2020:162,2021:192,2022:216,2023:260,2024:353,2025:403 }, boy:{ 2020:593,2021:639,2022:616,2023:589,2024:665,2025:683 } },
  keith: { boy:{ 2020:598,2021:591,2022:694,2023:712,2024:756,2025:802 } },
  donald: { boy:{ 2020:608,2021:596,2022:677,2023:661,2024:673,2025:690 } },
  watson: { boy:{ 2020:603,2021:597,2022:730,2023:804,2024:866,2025:1008 } },
  edison: { boy:{ 2020:600,2021:616,2022:743,2023:826,2024:827,2025:867 } },
  jerry: { boy:{ 2020:601,2021:730,2022:751,2023:845,2024:868,2025:908 } },
  mac: { boy:{ 2020:934,2021:673,2022:605,2023:656,2024:695,2025:696 } },
  quincy: { girl:{ 2020:1194,2021:1112,2022:1148,2023:978,2024:957,2025:814 }, boy:{ 2020:605,2021:632,2022:664,2023:674,2024:691,2025:653 } },
  lachlan: { boy:{ 2020:705,2021:725,2022:747,2023:771,2024:697,2025:606 } },
  marvin: { boy:{ 2020:606,2021:619,2022:611,2023:636,2024:670,2025:699 } },
  zeke: { boy:{ 2020:675,2021:618,2022:610,2023:643,2024:726,2025:800 } },
  trenton: { boy:{ 2020:620,2021:656,2022:773,2023:856,2024:886,2025:1039 } },
  dustin: { boy:{ 2020:654,2021:623,2022:629,2023:696,2024:687,2025:728 } },
  houston: { boy:{ 2020:732,2021:627,2022:697,2023:690,2024:704,2025:677 } },
  kingsley: { boy:{ 2020:626,2021:702,2022:738,2023:849,2024:985,2025:1095 } },
  tony: { boy:{ 2020:630,2021:680,2022:698,2023:841,2024:806,2025:783 } },
  duke: { boy:{ 2020:633,2021:653,2022:676,2023:683,2024:705,2025:697 } },
  leonard: { boy:{ 2020:637,2021:650,2022:708,2023:692,2024:671,2025:638 } },
  dennis: { boy:{ 2020:647,2021:690,2022:652,2023:644,2024:708,2025:708 } },
  wilson: { boy:{ 2020:655,2021:709,2022:689,2023:672,2024:644,2025:672 } },
  chris: { boy:{ 2020:676,2021:659,2022:669,2023:773,2024:652,2025:646 } },
  sam: { boy:{ 2020:656,2021:658,2022:658,2023:678,2024:650,2025:647 } },
  trey: { boy:{ 2020:692,2021:649,2022:649,2023:719,2024:791,2025:883 } },
  nixon: { boy:{ 2020:651,2021:692,2022:734,2023:882,2024:867,2025:1061 } },
  ty: { boy:{ 2020:650,2021:682,2022:715,2023:772,2024:857,2025:810 } },
  wayne: { boy:{ 2020:775,2021:778,2022:768,2023:733,2024:686,2025:652 } },
  bryant: { boy:{ 2020:658,2021:795,2022:912,2023:1095,2024:1179,2025:1327 } },
  tommy: { boy:{ 2020:744,2021:732,2022:726,2023:689,2024:731,2025:657 } },
  marcel: { boy:{ 2020:686,2021:687,2022:659,2023:761,2024:754,2025:730 } },
  lennon: { girl:{ 2020:299,2021:237,2022:228,2023:243,2024:235,2025:214 }, boy:{ 2020:690,2021:674,2022:663,2023:756,2024:788,2025:807 } },
  nelson: { boy:{ 2020:671,2021:722,2022:799,2023:797,2024:778,2025:825 } },
  devon: { boy:{ 2020:674,2021:774,2022:839,2023:903,2024:963,2025:1029 } },
  trace: { boy:{ 2020:760,2021:735,2022:707,2023:673,2024:702,2025:758 } },
  alvin: { boy:{ 2020:682,2021:771,2022:737,2023:766,2024:792,2025:839 } },
  junior: { boy:{ 2020:749,2021:737,2022:775,2023:735,2024:683,2025:752 } },
  rex: { boy:{ 2020:681,2021:698,2022:696,2023:721,2024:787,2025:859 } },
  clyde: { boy:{ 2020:715,2021:731,2022:685,2023:722,2024:730,2025:742 } },
  roger: { boy:{ 2020:685,2021:685,2022:749,2023:757,2024:750,2025:832 } },
  brock: { boy:{ 2020:687,2021:769,2022:783,2023:755,2024:703,2025:813 } },
  cullen: { boy:{ 2020:689,2021:746,2022:901,2023:1006,2024:1127,2025:1111 } },
  harry: { boy:{ 2020:720,2021:721,2022:695,2023:783,2024:775,2025:776 } },
  ricky: { boy:{ 2020:696,2021:773,2022:835,2023:872,2024:826,2025:948 } },
  evander: { boy:{ 2020:1049,2021:760,2022:817,2023:781,2024:768,2025:698 } },
  lee: { boy:{ 2020:769,2021:700,2022:699,2023:705,2024:717,2025:725 } },
  bridger: { boy:{ 2020:931,2021:724,2022:740,2023:750,2024:790,2025:702 } },
  robin: { girl:{ 2020:900,2021:918,2022:859,2023:788,2024:798,2025:704 }, boy:{ 2020:869,2021:897,2022:793,2023:787,2024:798,2025:704 } },
  jefferson: { boy:{ 2020:706,2021:723,2022:763,2023:762,2024:710,2025:829 } },
  wes: { boy:{ 2020:986,2021:866,2022:797,2023:800,2024:743,2025:715 } },
  grey: { boy:{ 2020:777,2021:717,2022:759,2023:864,2024:873,2025:1014 } },
  darren: { boy:{ 2020:721,2021:804,2022:854,2023:985,2024:954,2025:1134 } },
  neil: { boy:{ 2020:748,2021:720,2022:766,2023:806,2024:862,2025:851 } },
  jagger: { boy:{ 2020:719,2021:772,2022:781,2023:859,2024:850,2025:888 } },
  brendan: { boy:{ 2020:723,2021:765,2022:883,2023:888,2024:1010,2025:1106 } },
  ray: { boy:{ 2020:724,2021:840,2022:760,2023:763,2024:777,2025:791 } },
  mitchell: { boy:{ 2020:726,2021:802,2022:816,2023:836,2024:904,2025:952 } },
  jimmy: { boy:{ 2020:727,2021:756,2022:779,2023:821,2024:849,2025:846 } },
  joe: { boy:{ 2020:729,2021:794,2022:895,2023:909,2024:882,2025:992 } },
  eddie: { boy:{ 2020:733,2021:763,2022:828,2023:861,2024:944,2025:860 } },
  stanley: { boy:{ 2020:735,2021:788,2022:777,2023:807,2024:869,2025:863 } },
  douglas: { boy:{ 2020:737,2021:738,2022:829,2023:743,2024:851,2025:808 } },
  rudy: { boy:{ 2020:851,2021:821,2022:844,2023:827,2024:817,2025:739 } },
  leighton: { girl:{ 2020:401,2021:379,2022:376,2023:357,2024:396,2025:342 }, boy:{ 2020:743,2021:845,2022:820,2023:966,2024:1042,2025:1058 } },
  bode: { boy:{ 2020:821,2021:824,2022:962,2023:1012,2024:809,2025:748 } },
  melvin: { boy:{ 2020:752,2021:798,2022:827,2023:820,2024:871,2025:958 } },
  orlando: { boy:{ 2020:772,2021:754,2022:811,2023:776,2024:843,2025:871 } },
  bear: { boy:{ 2020:900,2021:828,2022:764,2023:822,2024:828,2025:854 } },
  ben: { boy:{ 2020:770,2021:767,2022:767,2023:798,2024:805,2025:845 } },
  lance: { boy:{ 2020:765,2021:803,2022:790,2023:813,2024:841,2025:862 } },
  bjorn: { boy:{ 2020:778,2021:766,2022:785,2023:796,2024:767,2025:831 } },
  harley: { boy:{ 2020:782,2021:921,2022:916,2023:998,2024:1021,2025:1081 } },
  barron: { boy:{ 2020:1319,2021:1347,2022:1503,2023:1430,2024:1022,2025:790 } },
  dash: { boy:{ 2020:798,2021:793,2022:824,2023:896,2024:956,2025:1059 } },
  fisher: { boy:{ 2020:908,2021:873,2022:887,2023:877,2024:894,2025:792 } },
  everest: { boy:{ 2020:991,2021:899,2022:831,2023:837,2024:844,2025:796 } },
  kellen: { boy:{ 2020:796,2021:863,2022:830,2023:919,2024:1031,2025:1072 } },
  crosby: { boy:{ 2020:805,2021:946,2022:1021,2023:1059,2024:1200,2025:1240 } },
  ira: { boy:{ 2020:804,2021:809,2022:847,2023:880,2024:972,2025:820 } },
  brewer: { boy:{ 2020:1917,2021:1926,2022:1676,2023:1631,2024:1112,2025:804 } },
  mccoy: { boy:{ 2020:928,2021:819,2022:859,2023:973,2024:911,2025:805 } },
  gary: { boy:{ 2020:807,2021:908,2022:958,2023:1070,2024:1134,2025:1074 } },
  braden: { boy:{ 2020:811,2021:902,2022:937,2023:1132,2024:1248,2025:1153 } },
  jones: { boy:{ 2020:948,2021:914,2022:948,2023:964,2024:855,2025:812 } },
  carl: { boy:{ 2020:813,2021:923,2022:1013,2023:965,2024:1033,2025:1135 } },
  emory: { girl:{ 2020:447,2021:479,2022:468,2023:365,2024:333,2025:339 }, boy:{ 2020:818,2021:820,2022:849,2023:832,2024:883,2025:890 } },
  dane: { boy:{ 2020:837,2021:835,2022:870,2023:904,2024:876,2025:821 } },
  anders: { boy:{ 2020:826,2021:884,2022:856,2023:847,2024:833,2025:987 } },
  maurice: { boy:{ 2020:842,2021:829,2022:995,2023:974,2024:931,2025:1018 } },
  alfred: { boy:{ 2020:901,2021:904,2022:840,2023:929,2024:837,2025:842 } },
  larry: { boy:{ 2020:833,2021:864,2022:891,2023:1008,2024:1068,2025:1089 } },
  darwin: { boy:{ 2020:906,2021:1082,2022:987,2023:970,2024:838,2025:963 } },
  eugene: { boy:{ 2020:839,2021:850,2022:931,2023:920,2024:874,2025:947 } },
  benny: { boy:{ 2020:1148,2021:1013,2022:1047,2023:1046,2024:890,2025:841 } },
  leif: { boy:{ 2020:911,2021:991,2022:841,2023:860,2024:928,2025:919 } },
  bobby: { boy:{ 2020:852,2021:1022,2022:1035,2023:1196,2024:1118,2025:1107 } },
  heath: { boy:{ 2020:995,2021:959,2022:862,2023:1057,2024:853,2025:930 } },
  bronson: { boy:{ 2020:854,2021:865,2022:949,2023:1091,2024:1037,2025:1050 } },
  judson: { boy:{ 2020:870,2021:877,2022:863,2023:858,2024:960,2025:934 } },
  randy: { boy:{ 2020:858,2021:917,2022:908,2023:958,2024:1014,2025:1085 } },
  rodney: { boy:{ 2020:864,2021:957,2022:990,2023:1144,2024:1077,2025:1092 } },
  van: { boy:{ 2020:868,2021:871,2022:945,2023:910,2024:909,2025:970 } },
  adler: { boy:{ 2020:927,2021:909,2022:978,2023:948,2024:975,2025:873 } },
  branson: { boy:{ 2020:878,2021:928,2022:1006,2023:1092,2024:1102,2025:1226 } },
  joey: { boy:{ 2020:895,2021:911,2022:892,2023:902,2024:888,2025:874 } },
  stefan: { boy:{ 2020:879,2021:894,2022:951,2023:962,2024:994,2025:1021 } },
  blaine: { boy:{ 2020:885,2021:985,2022:1036,2023:1051,2024:1121,2025:994 } },
  jacoby: { boy:{ 2020:914,2021:886,2022:1211,2023:1193,2024:1322,2025:1430 } },
  henrik: { boy:{ 2020:897,2021:888,2022:930,2023:983,2024:920,2025:1062 } },
  shepard: { boy:{ 2020:920,2021:963,2022:914,2023:950,2024:942,2025:891 } },
  dion: { boy:{ 2020:951,2021:1070,2022:904,2023:1075,2024:1120,2025:1274 } },
  kelvin: { boy:{ 2020:923,2021:906,2022:909,2023:967,2024:1085,2025:1035 } },
  scottie: { girl:{ 2020:1329,2021:1131,2022:923,2023:616,2024:202,2025:126 }, boy:{ 2020:4561,2021:3750,2022:2838,2023:2192,2024:1189,2025:906 } },
  beck: { boy:{ 2020:1038,2021:1074,2022:1020,2023:1038,2024:1007,2025:914 } },
  harold: { boy:{ 2020:933,2021:954,2022:925,2023:915,2024:991,2025:993 } },
  stone: { boy:{ 2020:1058,2021:1003,2022:984,2023:993,2024:1046,2025:915 } },
  fox: { boy:{ 2020:921,2021:936,2022:1010,2023:1114,2024:1115,2025:1415 } },
  frankie: { girl:{ 2020:587,2021:592,2022:545,2023:539,2024:591,2025:551 }, boy:{ 2020:973,2021:1061,2022:1051,2023:1015,2024:1111,2025:921 } },
  brett: { boy:{ 2020:926,2021:1066,2022:1027,2023:1131,2024:1058,2025:1387 } },
  caius: { boy:{ 2020:1214,2021:1346,2022:1283,2023:1356,2024:1061,2025:928 } },
  gordon: { boy:{ 2020:967,2021:932,2022:973,2023:991,2024:1089,2025:1052 } },
  terry: { boy:{ 2020:932,2021:1025,2022:975,2023:1064,2024:1187,2025:1116 } },
  vance: { boy:{ 2020:972,2021:934,2022:983,2023:952,2024:993,2025:1075 } },
  howard: { boy:{ 2020:1045,2021:940,2022:1063,2023:1004,2024:1057,2025:1002 } },
  trent: { boy:{ 2020:936,2021:1034,2022:1125,2023:1234,2024:1295,2025:1341 } },
  turner: { boy:{ 2020:1002,2021:938,2022:1180,2023:1066,2024:1005,2025:1097 } },
  will: { boy:{ 2020:935,2021:1067,2022:1156,2023:1137,2024:1286,2025:1193 } },
  marley: { girl:{ 2020:211,2021:215,2022:277,2023:284,2024:285,2025:322 }, boy:{ 2020:942,2021:1132,2022:1140,2023:1203,2024:1226,2025:1396 } },
  marlon: { boy:{ 2020:983,2021:1030,2022:992,2023:942,2024:1082,2025:1099 } },
  palmer: { girl:{ 2020:348,2021:330,2022:296,2023:277,2024:258,2025:232 }, boy:{ 2020:1177,2021:988,2022:1090,2023:940,2024:1078,2025:991 } },
  bowie: { boy:{ 2020:1123,2021:952,2022:1095,2023:1102,2024:1218,2025:1229 } },
  landry: { boy:{ 2020:950,2021:998,2022:1127,2023:1259,2024:1384,2025:997 } },
  elon: { boy:{ 2020:1061,2021:962,2022:1098,2023:1463,2024:1260,2025:1790 } },
  granger: { boy:{ 2020:1071,2021:960,2022:1072,2023:1146,2024:1259,2025:1641 } },
  toby: { boy:{ 2020:1136,2021:1090,2022:1163,2023:1238,2024:1099,2025:977 } },
  keenan: { boy:{ 2020:989,2021:1051,2022:1147,2023:1126,2024:1214,2025:1307 } },
  reginald: { boy:{ 2020:987,2021:1033,2022:1064,2023:1106,2024:1176,2025:1283 } },
  ronnie: { boy:{ 2020:1065,2021:987,2022:1044,2023:1098,2024:995,2025:1064 } },
  aurelius: { boy:{ 2020:1994,2021:1812,2022:1400,2023:1216,2024:1125,2025:995 } },
  dimitri: { boy:{ 2020:1015,2021:994,2022:1091,2023:1076,2024:996,2025:1103 } },
  willie: { boy:{ 2020:992,2021:1200,2022:1166,2023:1323,2024:1364,2025:1315 } },
  harris: { boy:{ 2020:997,2021:1002,2022:1178,2023:1164,2024:1319,2025:1301 } },
  billy: { boy:{ 2020:1001,2021:1039,2022:1011,2023:1097,2024:1051,2025:1068 } },
  sophia: { girl:{ 2020:4,2021:6,2022:5,2023:5,2024:6,2025:5 } },
  mia: { girl:{ 2020:8,2021:8,2022:8,2023:6,2024:5,2025:6 } },
  isabella: { girl:{ 2020:7,2021:7,2022:6,2023:7,2024:7,2025:7 } },
  harper: { girl:{ 2020:10,2021:10,2022:11,2023:11,2024:12,2025:16 } },
  luna: { girl:{ 2020:14,2021:11,2022:10,2023:10,2024:13,2025:27 } },
  mila: { girl:{ 2020:20,2021:26,2022:18,2023:28,2024:33,2025:43 } },
  chloe: { girl:{ 2020:25,2021:25,2022:19,2023:26,2024:20,2025:23 } },
  ellie: { girl:{ 2020:29,2021:30,2022:33,2023:27,2024:21,2025:25 } },
  aria: { girl:{ 2020:27,2021:22,2022:23,2023:25,2024:26,2025:26 } },
  madison: { girl:{ 2020:23,2021:29,2022:34,2023:37,2024:45,2025:40 } },
  layla: { girl:{ 2020:24,2021:24,2022:29,2023:30,2024:37,2025:36 } },
  grace: { girl:{ 2020:28,2021:34,2022:35,2023:39,2024:40,2025:38 } },
  zoe: { girl:{ 2020:40,2021:42,2022:38,2023:36,2024:29,2025:31 } },
  victoria: { girl:{ 2020:34,2021:43,2022:43,2023:45,2024:48,2025:54 } },
  willow: { girl:{ 2020:48,2021:39,2022:37,2023:41,2024:41,2025:44 } },
  emilia: { girl:{ 2020:41,2021:40,2022:44,2023:42,2024:43,2025:45 } },
  elena: { girl:{ 2020:55,2021:53,2022:49,2023:47,2024:46,2025:42 } },
  everly: { girl:{ 2020:43,2021:50,2022:56,2023:69,2024:81,2025:91 } },
  addison: { girl:{ 2020:47,2021:45,2022:54,2023:62,2024:68,2025:84 } },
  leah: { girl:{ 2020:45,2021:46,2022:52,2023:53,2024:53,2025:58 } },
  maya: { girl:{ 2020:61,2021:55,2022:51,2023:49,2024:51,2025:62 } },
  delilah: { girl:{ 2020:70,2021:58,2022:58,2023:52,2024:50,2025:51 } },
  brooklyn: { girl:{ 2020:54,2021:63,2022:72,2023:84,2024:107,2025:118 } },
  claire: { girl:{ 2020:58,2021:59,2022:66,2023:68,2024:67,2025:68 } },
  bella: { girl:{ 2020:63,2021:73,2022:85,2023:104,2024:109,2025:136 } },
  skylar: { girl:{ 2020:64,2021:74,2022:87,2023:107,2024:134,2025:167 } },
  autumn: { girl:{ 2020:82,2021:66,2022:71,2023:75,2024:79,2025:88 } },
  kennedy: { girl:{ 2020:72,2021:70,2022:74,2023:72,2024:89,2025:85 } },
  millie: { girl:{ 2020:190,2021:173,2022:128,2023:105,2024:87,2025:73 } },
  maria: { girl:{ 2020:109,2021:105,2022:91,2023:82,2024:74,2025:87 } },
  daisy: { girl:{ 2020:143,2021:134,2022:124,2023:110,2024:76,2025:75 } },
  athena: { girl:{ 2020:107,2021:98,2022:78,2023:76,2024:90,2025:109 } },
  gabriella: { girl:{ 2020:77,2021:83,2022:89,2023:89,2024:106,2025:105 } },
  hailey: { girl:{ 2020:81,2021:77,2022:79,2023:90,2024:100,2025:104 } },
  melody: { girl:{ 2020:106,2021:113,2022:109,2023:103,2024:91,2025:79 } },
  allison: { girl:{ 2020:80,2021:82,2022:101,2023:100,2024:99,2025:103 } },
  jade: { girl:{ 2020:97,2021:92,2022:88,2023:80,2024:84,2025:95 } },
  madeline: { girl:{ 2020:96,2021:95,2022:102,2023:95,2024:86,2025:81 } },
  sarah: { girl:{ 2020:86,2021:91,2022:95,2023:91,2024:93,2025:90 } },
  samantha: { girl:{ 2020:90,2021:106,2022:106,2023:114,2024:126,2025:152 } },
  piper: { girl:{ 2020:91,2021:96,2022:114,2023:135,2024:159,2025:155 } },
  eva: { girl:{ 2020:93,2021:93,2022:108,2023:111,2024:120,2025:134 } },
  sienna: { girl:{ 2020:166,2021:150,2022:136,2023:140,2024:139,2025:94 } },
  brielle: { girl:{ 2020:100,2021:118,2022:117,2023:134,2024:144,2025:143 } },
  melanie: { girl:{ 2020:105,2021:129,2022:130,2023:130,2024:122,2025:142 } },
  reagan: { girl:{ 2020:114,2021:126,2022:147,2023:168,2024:244,2025:248 } },
  mackenzie: { girl:{ 2020:119,2021:123,2022:142,2023:167,2024:200,2025:228 } },
  hallie: { girl:{ 2020:374,2021:320,2022:226,2023:194,2024:149,2025:120 } },
  elsie: { girl:{ 2020:233,2021:222,2022:189,2023:163,2024:155,2025:123 } },
  ashley: { girl:{ 2020:153,2021:172,2022:154,2023:126,2024:124,2025:164 } },
  valerie: { girl:{ 2020:144,2021:155,2022:148,2023:144,2024:147,2025:127 } },
  kylie: { girl:{ 2020:132,2021:159,2022:198,2023:207,2024:189,2025:204 } },
  ember: { girl:{ 2020:187,2021:162,2022:159,2023:169,2024:135,2025:154 } },
  alexandra: { girl:{ 2020:138,2021:169,2022:190,2023:204,2024:221,2025:239 } },
  alana: { girl:{ 2020:206,2021:224,2022:204,2023:185,2024:143,2025:140 } },
  jasmine: { girl:{ 2020:140,2021:170,2022:177,2023:189,2024:199,2025:206 } },
  summer: { girl:{ 2020:151,2021:141,2022:152,2023:141,2024:142,2025:151 } },
  brianna: { girl:{ 2020:146,2021:184,2022:171,2023:152,2024:181,2025:222 } },
  andrea: { girl:{ 2020:149,2021:174,2022:155,2023:173,2024:185,2025:235 } },
  river: { girl:{ 2020:184,2021:149,2022:150,2023:192,2024:215,2025:219 } },
  ariella: { girl:{ 2020:154,2021:171,2022:183,2023:184,2024:195,2025:174 } },
  anastasia: { girl:{ 2020:158,2021:181,2022:162,2023:166,2024:166,2025:163 } },
  bailey: { girl:{ 2020:172,2021:163,2022:182,2023:172,2024:182,2025:208 } },
  callie: { girl:{ 2020:165,2021:178,2022:187,2023:177,2024:176,2025:175 } },
  molly: { girl:{ 2020:173,2021:186,2022:199,2023:209,2024:208,2025:196 } },
  harmony: { girl:{ 2020:175,2021:198,2022:215,2023:231,2024:264,2025:276 } },
  ada: { girl:{ 2020:186,2021:180,2022:181,2023:179,2024:191,2025:220 } },
  annie: { girl:{ 2020:289,2021:230,2022:205,2023:202,2024:192,2025:182 } },
  kimberly: { girl:{ 2020:185,2021:220,2022:211,2023:222,2024:247,2025:302 } },
  lila: { girl:{ 2020:228,2021:223,2022:221,2023:213,2024:206,2025:186 } },
  celeste: { girl:{ 2020:352,2021:327,2022:292,2023:276,2024:197,2025:188 } },
  amy: { girl:{ 2020:216,2021:189,2022:206,2023:199,2024:227,2025:257 } },
  juliana: { girl:{ 2020:189,2021:209,2022:220,2023:251,2024:251,2025:256 } },
  london: { girl:{ 2020:193,2021:217,2022:297,2023:312,2024:355,2025:431 } },
  aspen: { girl:{ 2020:224,2021:200,2022:196,2023:215,2024:265,2025:266 } },
  presley: { girl:{ 2020:213,2021:213,2022:231,2023:197,2024:225,2025:225 } },
  alyssa: { girl:{ 2020:200,2021:233,2022:289,2023:334,2024:399,2025:453 } },
  noelle: { girl:{ 2020:210,2021:202,2022:210,2023:206,2024:214,2025:202 } },
  gracie: { girl:{ 2020:207,2021:240,2022:253,2023:248,2024:250,2025:227 } },
  vanessa: { girl:{ 2020:209,2021:253,2022:311,2023:304,2024:334,2025:377 } },
  leia: { girl:{ 2020:296,2021:295,2022:256,2023:211,2024:289,2025:297 } },
  delaney: { girl:{ 2020:313,2021:269,2022:244,2023:235,2024:216,2025:242 } },
  annabelle: { girl:{ 2020:220,2021:274,2022:322,2023:340,2024:349,2025:344 } },
  jane: { girl:{ 2020:263,2021:266,2022:290,2023:281,2024:269,2025:221 } },
  angela: { girl:{ 2020:251,2021:234,2022:227,2023:256,2024:281,2025:408 } },
  rachel: { girl:{ 2020:226,2021:239,2022:240,2023:254,2024:246,2025:250 } },
  alexa: { girl:{ 2020:230,2021:440,2022:536,2023:607,2024:806,2025:1032 } },
  lauren: { girl:{ 2020:232,2021:336,2022:327,2023:343,2024:351,2025:401 } },
  brooke: { girl:{ 2020:237,2021:262,2022:270,2023:299,2024:308,2025:314 } },
  lola: { girl:{ 2020:236,2021:260,2022:262,2023:261,2024:271,2025:275 } },
  sydney: { girl:{ 2020:241,2021:249,2022:271,2023:307,2024:288,2025:348 } },
  octavia: { girl:{ 2020:333,2021:248,2022:247,2023:279,2024:294,2025:308 } },
  rebecca: { girl:{ 2020:248,2021:304,2022:295,2023:315,2024:340,2025:349 } },
  lena: { girl:{ 2020:271,2021:294,2022:254,2023:270,2024:262,2025:279 } },
  joanna: { girl:{ 2020:256,2021:290,2022:321,2023:339,2024:329,2025:306 } },
  dakota: { girl:{ 2020:257,2021:270,2022:259,2023:262,2024:273,2025:295 } },
  camilla: { girl:{ 2020:264,2021:307,2022:314,2023:336,2024:323,2025:361 } },
  evie: { girl:{ 2020:319,2021:293,2022:275,2023:267,2024:284,2025:271 } },
  nicole: { girl:{ 2020:266,2021:341,2022:323,2023:326,2024:318,2025:382 } },
  jocelyn: { girl:{ 2020:269,2021:292,2022:315,2023:346,2024:389,2025:393 } },
  paige: { girl:{ 2020:276,2021:300,2022:317,2023:354,2024:378,2025:346 } },
  rosie: { girl:{ 2020:469,2021:456,2022:423,2023:392,2024:310,2025:283 } },
  phoenix: { girl:{ 2020:285,2021:310,2022:316,2023:349,2024:419,2025:533 } },
  angelina: { girl:{ 2020:290,2021:297,2022:307,2023:314,2024:313,2025:347 } },
  aurelia: { girl:{ 2020:534,2021:518,2022:489,2023:371,2024:335,2025:291 } },
  sylvia: { girl:{ 2020:501,2021:465,2022:437,2023:427,2024:361,2025:300 } },
  kendall: { girl:{ 2020:314,2021:305,2022:302,2023:316,2024:311,2025:329 } },
  elaine: { girl:{ 2020:519,2021:486,2022:463,2023:382,2024:368,2025:304 } },
  francesca: { girl:{ 2020:455,2021:424,2022:387,2023:374,2024:315,2025:307 } },
  elodie: { girl:{ 2020:703,2021:742,2022:683,2023:738,2024:372,2025:310 } },
  sabrina: { girl:{ 2020:388,2021:400,2022:413,2023:396,2024:357,2025:321 } },
  serena: { girl:{ 2020:421,2021:386,2022:386,2023:375,2024:332,2025:325 } },
  regina: { girl:{ 2020:432,2021:427,2022:349,2023:329,2024:342,2025:395 } },
  hattie: { girl:{ 2020:423,2021:461,2022:412,2023:384,2024:383,2025:334 } },
  mira: { girl:{ 2020:483,2021:480,2022:481,2023:409,2024:379,2025:335 } },
  michelle: { girl:{ 2020:337,2021:394,2022:377,2023:401,2024:409,2025:465 } },
  demi: { girl:{ 2020:339,2021:367,2022:402,2023:394,2024:452,2025:380 } },
  melissa: { girl:{ 2020:350,2021:372,2022:379,2023:412,2024:380,2025:419 } },
  laura: { girl:{ 2020:357,2021:389,2022:363,2023:363,2024:358,2025:379 } },
  elle: { girl:{ 2020:370,2021:357,2022:393,2023:441,2024:480,2025:462 } },
  gabrielle: { girl:{ 2020:358,2021:445,2022:494,2023:551,2024:577,2025:633 } },
  lana: { girl:{ 2020:393,2021:377,2022:421,2023:416,2024:374,2025:406 } },
  felicity: { girl:{ 2020:383,2021:438,2022:454,2023:455,2024:485,2025:473 } },
  annalise: { girl:{ 2020:440,2021:385,2022:418,2023:428,2024:462,2025:409 } },
  veronica: { girl:{ 2020:385,2021:430,2022:407,2023:411,2024:392,2025:427 } },
  carmen: { girl:{ 2020:433,2021:437,2022:455,2023:436,2024:417,2025:390 } },
  helen: { girl:{ 2020:426,2021:444,2022:422,2023:395,2024:425,2025:461 } },
  bonnie: { girl:{ 2020:607,2021:513,2022:528,2023:502,2024:443,2025:396 } },
  joy: { girl:{ 2020:395,2021:408,2022:461,2023:451,2024:441,2025:420 } },
  jessica: { girl:{ 2020:399,2021:477,2022:508,2023:549,2024:575,2025:665 } },
  allie: { girl:{ 2020:429,2021:411,2022:470,2023:504,2024:554,2025:570 } },
  kate: { girl:{ 2020:411,2021:415,2022:456,2023:479,2024:533,2025:520 } },
  holly: { girl:{ 2020:479,2021:467,2022:457,2023:454,2024:420,2025:416 } },
  paris: { girl:{ 2020:416,2021:443,2022:491,2023:490,2024:484,2025:592 } },
  bianca: { girl:{ 2020:420,2021:448,2022:424,2023:468,2024:461,2025:501 } },
  dorothy: { girl:{ 2020:535,2021:484,2022:487,2023:464,2024:431,2025:421 } },
  opal: { girl:{ 2020:648,2021:545,2022:524,2023:485,2024:449,2025:423 } },
  marceline: { girl:{ 2020:969,2021:783,2022:677,2023:590,2024:507,2025:425 } },
  jennifer: { girl:{ 2020:431,2021:493,2022:502,2023:521,2024:546,2025:586 } },
  vienna: { girl:{ 2020:803,2021:845,2022:675,2023:689,2024:532,2025:434 } },
  lyra: { girl:{ 2020:549,2021:489,2022:496,2023:482,2024:482,2025:436 } },
  danielle: { girl:{ 2020:448,2021:439,2022:474,2023:494,2024:524,2025:550 } },
  stephanie: { girl:{ 2020:437,2021:452,2022:480,2023:467,2024:534,2025:557 } },
  lorelei: { girl:{ 2020:505,2021:446,2022:441,2023:486,2024:454,2025:441 } },
  jacqueline: { girl:{ 2020:443,2021:473,2022:503,2023:538,2024:586,2025:558 } },
  amanda: { girl:{ 2020:444,2021:474,2022:459,2023:483,2024:496,2025:493 } },
  emmy: { girl:{ 2020:517,2021:538,2022:506,2023:505,2024:453,2025:446 } },
  calliope: { girl:{ 2020:692,2021:601,2022:588,2023:492,2024:498,2025:452 } },
  jolene: { girl:{ 2020:475,2021:455,2022:486,2023:547,2024:604,2025:669 } },
  keira: { girl:{ 2020:467,2021:472,2022:535,2023:568,2024:606,2025:622 } },
  eve: { girl:{ 2020:470,2021:485,2022:556,2023:600,2024:569,2025:519 } },
  winnie: { girl:{ 2020:769,2021:691,2022:592,2023:610,2024:547,2025:475 } },
  katie: { girl:{ 2020:480,2021:526,2022:555,2023:526,2024:576,2025:646 } },
  maxine: { girl:{ 2020:739,2021:703,2022:616,2023:514,2024:518,2025:496 } },
  mae: { girl:{ 2020:572,2021:501,2022:511,2023:506,2024:529,2025:500 } },
  shelby: { girl:{ 2020:502,2021:549,2022:595,2023:656,2024:657,2025:649 } },
  april: { girl:{ 2020:518,2021:519,2022:530,2023:517,2024:503,2025:542 } },
  virginia: { girl:{ 2020:581,2021:543,2022:540,2023:559,2024:506,2025:525 } },
  sierra: { girl:{ 2020:531,2021:508,2022:551,2023:566,2024:593,2025:614 } },
  abby: { girl:{ 2020:509,2021:577,2022:589,2023:624,2024:625,2025:731 } },
  amber: { girl:{ 2020:510,2021:534,2022:542,2023:576,2024:542,2025:522 } },
  louise: { girl:{ 2020:679,2021:648,2022:638,2023:584,2024:541,2025:514 } },
  clover: { girl:{ 2020:1069,2021:863,2022:757,2023:673,2024:618,2025:518 } },
  erin: { girl:{ 2020:521,2021:575,2022:686,2023:653,2024:799,2025:835 } },
  jovie: { girl:{ 2020:920,2021:763,2022:731,2023:587,2024:626,2025:521 } },
  nellie: { girl:{ 2020:842,2021:743,2022:663,2023:615,2024:521,2025:534 } },
  kelsey: { girl:{ 2020:526,2021:624,2022:632,2023:664,2024:673,2025:815 } },
  rhea: { girl:{ 2020:625,2021:614,2022:600,2023:527,2024:613,2025:639 } },
  amalia: { girl:{ 2020:570,2021:546,2022:583,2023:528,2024:552,2025:568 } },
  lenora: { girl:{ 2020:1114,2021:1067,2022:935,2023:767,2024:715,2025:539 } },
  mara: { girl:{ 2020:626,2021:540,2022:620,2023:581,2024:588,2025:587 } },
  miranda: { girl:{ 2020:542,2021:587,2022:546,2023:571,2024:623,2025:654 } },
  priscilla: { girl:{ 2020:561,2021:620,2022:714,2023:649,2024:614,2025:544 } },
  jenna: { girl:{ 2020:548,2021:586,2022:637,2023:630,2024:683,2025:679 } },
  kendra: { girl:{ 2020:551,2021:650,2022:703,2023:740,2024:686,2025:850 } },
  indie: { girl:{ 2020:740,2021:675,2022:553,2023:578,2024:655,2025:632 } },
  nola: { girl:{ 2020:553,2021:595,2022:625,2023:739,2024:763,2025:821 } },
  myra: { girl:{ 2020:556,2021:590,2022:563,2023:592,2024:645,2025:662 } },
  zelda: { girl:{ 2020:558,2021:608,2022:670,2023:704,2024:747,2025:832 } },
  mavis: { girl:{ 2020:843,2021:753,2022:682,2023:595,2024:566,2025:560 } },
  davina: { girl:{ 2020:631,2021:576,2022:562,2023:650,2024:649,2025:750 } },
  lina: { girl:{ 2020:690,2021:670,2022:582,2023:585,2024:565,2025:572 } },
  angelica: { girl:{ 2020:576,2021:602,2022:659,2023:634,2024:622,2025:708 } },
  halle: { girl:{ 2020:862,2021:728,2022:711,2023:685,2024:571,2025:597 } },
  anne: { girl:{ 2020:628,2021:588,2022:574,2023:582,2024:650,2025:619 } },
  cleo: { girl:{ 2020:882,2021:795,2022:664,2023:609,2024:608,2025:577 } },
  michaela: { girl:{ 2020:644,2021:579,2022:579,2023:638,2024:743,2025:841 } },
  cheyenne: { girl:{ 2020:579,2021:662,2022:687,2023:789,2024:870,2025:921 } },
  henley: { girl:{ 2020:584,2021:625,2022:738,2023:796,2024:960,2025:1001 } },
  mina: { girl:{ 2020:661,2021:591,2022:611,2023:586,2024:609,2025:596 } },
  eileen: { girl:{ 2020:702,2021:672,2022:622,2023:665,2024:592,2025:656 } },
  angie: { girl:{ 2020:653,2021:729,2022:722,2023:741,2024:595,2025:706 } },
  leslie: { girl:{ 2020:595,2021:623,2022:652,2023:670,2024:605,2025:715 } },
  marie: { girl:{ 2020:617,2021:598,2022:598,2023:642,2024:633,2025:617 } },
  cassandra: { girl:{ 2020:655,2021:600,2022:653,2023:644,2024:616,2025:630 } },
  bethany: { girl:{ 2020:603,2021:638,2022:666,2023:721,2024:726,2025:752 } },
  rosa: { girl:{ 2020:630,2021:660,2022:605,2023:668,2024:662,2025:652 } },
  loretta: { girl:{ 2020:944,2021:902,2022:811,2023:758,2024:677,2025:606 } },
  christina: { girl:{ 2020:606,2021:627,2022:735,2023:703,2024:704,2025:773 } },
  megan: { girl:{ 2020:640,2021:609,2022:730,2023:694,2024:764,2025:887 } },
  julie: { girl:{ 2020:614,2021:656,2022:715,2023:705,2024:765,2025:873 } },
  liberty: { girl:{ 2020:651,2021:619,2022:761,2023:884,2024:976,2025:1187 } },
  irene: { girl:{ 2020:618,2021:674,2022:662,2023:675,2024:635,2025:651 } },
  carly: { girl:{ 2020:622,2021:667,2022:778,2023:781,2024:877,2025:1011 } },
  goldie: { girl:{ 2020:1024,2021:876,2022:812,2023:687,2024:648,2025:623 } },
  ila: { girl:{ 2020:865,2021:757,2022:685,2023:622,2024:679,2025:721 } },
  macy: { girl:{ 2020:621,2021:633,2022:718,2023:691,2024:663,2025:719 } },
  selene: { girl:{ 2020:805,2021:720,2022:689,2023:708,2024:674,2025:621 } },
  winona: { girl:{ 2020:1418,2021:1293,2022:975,2023:878,2024:734,2025:627 } },
  melina: { girl:{ 2020:649,2021:632,2022:641,2023:657,2024:630,2025:660 } },
  marilyn: { girl:{ 2020:635,2021:705,2022:697,2023:743,2024:665,2025:762 } },
  chelsea: { girl:{ 2020:646,2021:636,2022:696,2023:713,2024:789,2025:852 } },
  coraline: { girl:{ 2020:647,2021:722,2022:680,2023:719,2024:719,2025:685 } },
  andie: { girl:{ 2020:1129,2021:1196,2022:1128,2023:886,2024:847,2025:650 } },
  laney: { girl:{ 2020:650,2021:653,2022:704,2023:658,2024:691,2025:673 } },
  georgina: { girl:{ 2020:1305,2021:1310,2022:882,2023:769,2024:656,2025:690 } },
  kyra: { girl:{ 2020:678,2021:666,2022:657,2023:698,2024:720,2025:828 } },
  janelle: { girl:{ 2020:670,2021:663,2022:671,2023:692,2024:777,2025:802 } },
  liv: { girl:{ 2020:666,2021:686,2022:729,2023:702,2024:873,2025:896 } },
  martha: { girl:{ 2020:768,2021:726,2022:723,2023:671,2024:666,2025:714 } },
  kara: { girl:{ 2020:669,2021:764,2022:870,2023:936,2024:992,2025:1071 } },
  dani: { girl:{ 2020:807,2021:736,2022:676,2023:775,2024:680,2025:747 } },
  penny: { girl:{ 2020:726,2021:704,2022:726,2023:676,2024:748,2025:740 } },
  alena: { girl:{ 2020:681,2021:767,2022:747,2023:820,2024:754,2025:709 } },
  kenna: { girl:{ 2020:682,2021:709,2022:679,2023:746,2024:725,2025:759 } },
  lara: { girl:{ 2020:707,2021:681,2022:694,2023:734,2024:741,2025:691 } },
  persephone: { girl:{ 2020:818,2021:775,2022:681,2023:745,2024:735,2025:734 } },
  fallon: { girl:{ 2020:866,2021:727,2022:716,2023:688,2024:738,2025:780 } },
  billie: { girl:{ 2020:1009,2021:944,2022:951,2023:869,2024:695,2025:693 } },
  scout: { girl:{ 2020:871,2021:829,2022:690,2023:822,2024:924,2025:996 } },
  monica: { girl:{ 2020:697,2021:695,2022:744,2023:729,2024:723,2025:736 } },
  gwen: { girl:{ 2020:823,2021:847,2022:852,2023:817,2024:699,2025:726 } },
  milena: { girl:{ 2020:825,2021:810,2022:774,2023:701,2024:785,2025:953 } },
  paula: { girl:{ 2020:822,2021:823,2022:806,2023:706,2024:752,2025:853 } },
  emerald: { girl:{ 2020:955,2021:905,2022:767,2023:748,2024:708,2025:742 } },
  amelie: { girl:{ 2020:809,2021:833,2022:884,2023:893,2024:711,2025:830 } },
  lacey: { girl:{ 2020:712,2021:806,2022:877,2023:759,2024:744,2025:739 } },
  sky: { girl:{ 2020:804,2021:710,2022:736,2023:782,2024:826,2025:948 } },
  jolie: { girl:{ 2020:717,2021:733,2022:791,2023:907,2024:902,2025:1031 } },
  jessie: { girl:{ 2020:720,2021:794,2022:794,2023:795,2024:807,2025:825 } },
  ramona: { girl:{ 2020:806,2021:793,2022:787,2023:790,2024:770,2025:733 } },
  joelle: { girl:{ 2020:761,2021:734,2022:785,2023:935,2024:919,2025:1010 } },
  kelly: { girl:{ 2020:746,2021:851,2022:808,2023:779,2024:869,2025:851 } },
  teresa: { girl:{ 2020:745,2021:815,2022:867,2023:843,2024:860,2025:908 } },
  adele: { girl:{ 2020:794,2021:818,2022:819,2023:826,2024:797,2025:753 } },
  lettie: { girl:{ 2020:1461,2021:1302,2022:1168,2023:1129,2024:936,2025:757 } },
  livia: { girl:{ 2020:815,2021:776,2022:893,2023:825,2024:840,2025:819 } },
  luella: { girl:{ 2020:973,2021:924,2022:998,2023:929,2024:824,2025:779 } },
  ruthie: { girl:{ 2020:1247,2021:1072,2022:1007,2023:912,2024:878,2025:778 } },
  judith: { girl:{ 2020:907,2021:953,2022:881,2023:899,2024:830,2025:789 } },
  brittany: { girl:{ 2020:962,2021:935,2022:841,2023:860,2024:792,2025:931 } },
  tiffany: { girl:{ 2020:791,2021:865,2022:930,2023:897,2024:842,2025:878 } },
  aura: { girl:{ 2020:1209,2021:1034,2022:1038,2023:956,2024:872,2025:818 } },
  marianna: { girl:{ 2020:826,2021:860,2022:817,2023:883,2024:858,2025:872 } },
  karen: { girl:{ 2020:821,2021:1088,2022:1217,2023:1090,2024:1253,2025:1282 } },
  marjorie: { girl:{ 2020:1134,2021:1224,2022:1280,2023:1249,2024:822,2025:1018 } },
  celina: { girl:{ 2020:1161,2021:1187,2022:1066,2023:1016,2024:973,2025:829 } },
  annika: { girl:{ 2020:834,2021:853,2022:836,2023:959,2024:963,2025:998 } },
  rosalyn: { girl:{ 2020:847,2021:832,2022:931,2023:1006,2024:887,2025:1047 } },
  natasha: { girl:{ 2020:942,2021:907,2022:831,2023:983,2024:929,2025:1145 } },
  maddie: { girl:{ 2020:1159,2021:1044,2022:938,2023:836,2024:843,2025:925 } },
  magdalena: { girl:{ 2020:995,2021:951,2022:912,2023:900,2024:838,2025:849 } },
  tara: { girl:{ 2020:1163,2021:1154,2022:1059,2023:1162,2024:1018,2025:844 } },
  lisa: { girl:{ 2020:1033,2021:1025,2022:934,2023:847,2024:985,2025:987 } },
  barbara: { girl:{ 2020:887,2021:906,2022:966,2023:875,2024:854,2025:969 } },
  artemis: { girl:{ 2020:959,2021:870,2022:903,2023:856,2024:1024,2025:1020 } },
  deborah: { girl:{ 2020:905,2021:913,2022:913,2023:969,2024:853,2025:866 } },
  crystal: { girl:{ 2020:856,2021:960,2022:1029,2023:1191,2024:1171,2025:1148 } },
  lilia: { girl:{ 2020:1153,2021:1022,2022:1008,2023:960,2024:917,2025:860 } },
  simone: { girl:{ 2020:860,2021:874,2022:959,2023:923,2024:1036,2025:995 } },
  denise: { girl:{ 2020:876,2021:1226,2022:1392,2023:1464,2024:1907,2025:1679 } },
  leanna: { girl:{ 2020:884,2021:911,2022:947,2023:985,2024:906,2025:891 } },
  tilly: { girl:{ 2020:1328,2021:1130,2022:1027,2023:1043,2024:952,2025:885 } },
  mariel: { girl:{ 2020:1970,2021:2291,2022:2051,2023:1259,2024:1039,2025:894 } },
  nancy: { girl:{ 2020:896,2021:946,2022:991,2023:941,2024:916,2025:965 } },
  guinevere: { girl:{ 2020:1014,2021:970,2022:917,2023:1010,2024:945,2025:900 } },
  lexie: { girl:{ 2020:914,2021:904,2022:957,2023:1125,2024:1129,2025:1353 } },
  cara: { girl:{ 2020:909,2021:1026,2022:1165,2023:1268,2024:1300,2025:1333 } },
  sapphire: { girl:{ 2020:1085,2021:1096,2022:911,2023:976,2024:1028,2025:1057 } },
  elsa: { girl:{ 2020:915,2021:952,2022:995,2023:1031,2024:943,2025:1106 } },
  carla: { girl:{ 2020:1025,2021:1120,2022:929,2023:970,2024:1011,2025:1083 } },
  darla: { girl:{ 2020:1415,2021:1238,2022:1197,2023:1204,2024:1026,2025:942 } },
  whitney: { girl:{ 2020:941,2021:1029,2022:1043,2023:981,2024:1050,2025:1043 } },
  elara: { girl:{ 2020:1556,2021:1447,2022:1334,2023:1381,2024:1154,2025:941 } },
  mariella: { girl:{ 2020:1258,2021:1237,2022:1226,2023:1101,2024:988,2025:945 } },
  carolyn: { girl:{ 2020:950,2021:1134,2022:1244,2023:1087,2024:1164,2025:1224 } },
  marcella: { girl:{ 2020:1032,2021:1038,2022:1133,2023:1078,2024:1053,2025:949 } },
  ansley: { girl:{ 2020:956,2021:999,2022:1093,2023:1153,2024:1324,2025:1317 } },
  joyce: { girl:{ 2020:979,2021:954,2022:986,2023:1058,2024:1042,2025:1072 } },
  jillian: { girl:{ 2020:957,2021:1010,2022:1082,2023:1136,2024:1131,2025:1266 } },
  corinne: { girl:{ 2020:958,2021:1032,2022:1075,2023:1040,2024:1088,2025:999 } },
  vida: { girl:{ 2020:1264,2021:991,2022:964,2023:1075,2024:1022,2025:1211 } },
  belle: { girl:{ 2020:1002,2021:1049,2022:974,2023:1015,2024:1007,2025:1015 } },
  susan: { girl:{ 2020:972,2021:1095,2022:1146,2023:1099,2024:1121,2025:1085 } },
  dana: { girl:{ 2020:1061,2021:1085,2022:1023,2023:977,2024:1080,2025:1028 } },
  kathleen: { girl:{ 2020:1004,2021:990,2022:1095,2023:1018,2024:1101,2025:1153 } },
  tatiana: { girl:{ 2020:1093,2021:992,2022:1275,2023:1175,2024:1077,2025:1104 } },
  lavender: { girl:{ 2020:1423,2021:1395,2022:1264,2023:1176,2024:991,2025:1095 } },
  sandra: { girl:{ 2020:1100,2021:994,2022:1077,2023:1063,2024:1044,2025:1207 } },
  bastian: { boy:{ 2020:1165,2021:1405,2022:1162,2023:1071,2024:1003,2025:1023 } },
  merrick: { boy:{ 2020:1013,2021:1004,2022:1059,2023:1042,2024:1212,2025:1185 } },
  marc: { boy:{ 2020:1088,2021:1007,2022:1101,2023:1100,2024:1194,2025:1238 } },
  lyle: { boy:{ 2020:1010,2021:1008,2022:1052,2023:1107,2024:1019,2025:1049 } },
  ernest: { boy:{ 2020:1009,2021:1110,2022:1134,2023:1026,2024:1080,2025:1041 } },
  decker: { boy:{ 2020:1016,2021:1062,2022:1018,2023:1159,2024:1188,2025:1506 } },
  coleman: { boy:{ 2020:1022,2021:1150,2022:1160,2023:1170,2024:1283,2025:1313 } },
  ollie: { boy:{ 2020:1153,2021:1087,2022:1022,2023:1081,2024:1049,2025:1057 } },
  torin: { boy:{ 2020:1024,2021:1161,2022:1188,2023:1341,2024:1161,2025:1348 } },
  gannon: { boy:{ 2020:1027,2021:1069,2022:1310,2023:1725,2024:1873,2025:2220 } },
  carmine: { boy:{ 2020:1351,2021:1297,2022:1281,2023:1287,2024:1101,2025:1036 } },
  nickolas: { boy:{ 2020:1039,2021:1170,2022:1393,2023:1409,2024:1545,2025:1492 } },
  ren: { boy:{ 2020:1321,2021:1120,2022:1126,2023:1080,2024:1146,2025:1040 } },
  sunny: { boy:{ 2020:1466,2021:1351,2022:1229,2023:1111,2024:1047,2025:1077 } },
  ralph: { boy:{ 2020:1104,2021:1111,2022:1139,2023:1192,2024:1147,2025:1048 } },
  slade: { boy:{ 2020:1069,2021:1071,2022:1114,2023:1141,2024:1048,2025:1054 } },
  randall: { boy:{ 2020:1054,2021:1195,2022:1265,2023:1268,2024:1608,2025:1501 } },
  ever: { boy:{ 2020:1219,2021:1185,2022:1179,2023:1061,2024:1075,2025:1203 } },
  ash: { boy:{ 2020:1085,2021:1080,2022:1083,2023:1065,2024:1154,2025:1181 } },
  link: { boy:{ 2020:1142,2021:1232,2022:1073,2023:1303,2024:1420,2025:1576 } },
  wiley: { boy:{ 2020:1160,2021:1076,2022:1155,2023:1134,2024:1155,2025:1222 } },
  maxim: { boy:{ 2020:1115,2021:1078,2022:1174,2023:1339,2024:1453,2025:1524 } },
  pierre: { boy:{ 2020:1114,2021:1081,2022:1157,2023:1167,2024:1245,2025:1254 } },
  kit: { girl:{ 2020:2202,2021:1889,2022:1383,2023:1573,2024:1237,2025:1126 }, boy:{ 2020:1494,2021:1409,2022:1368,2023:1149,2024:1141,2025:1101 } },
  andreas: { boy:{ 2020:1187,2021:1217,2022:1262,2023:1183,2024:1105,2025:1280 } },
  mattias: { boy:{ 2020:1289,2021:1114,2022:1267,2023:1168,2024:1140,2025:1232 } },
  maddux: { boy:{ 2020:1116,2021:1254,2022:1242,2023:1276,2024:1399,2025:1534 } },
  benton: { boy:{ 2020:1125,2021:1227,2022:1260,2023:1322,2024:1306,2025:1631 } },
  markus: { boy:{ 2020:1211,2021:1126,2022:1270,2023:1348,2024:1221,2025:1335 } },
  emil: { boy:{ 2020:1234,2021:1256,2022:1128,2023:1130,2024:1247,2025:1273 } },
  kaine: { boy:{ 2020:1155,2021:1128,2022:1175,2023:1250,2024:1475,2025:1428 } },
  norman: { boy:{ 2020:1128,2021:1165,2022:1193,2023:1360,2024:1310,2025:1199 } },
  cedar: { girl:{ 2020:2369,2021:2527,2022:2270,2023:2282,2024:2408,2025:2853 }, boy:{ 2020:1202,2021:1251,2022:1129,2023:1252,2024:1191,2025:1251 } },
  sol: { boy:{ 2020:1851,2021:1335,2022:1168,2023:1284,2024:1136,2025:1145 } },
  shaun: { boy:{ 2020:1137,2021:1273,2022:1485,2023:1491,2024:1564,2025:1944 } },
  pierson: { boy:{ 2020:1138,2021:1247,2022:1472,2023:1499,2024:1463,2025:1453 } },
  ansel: { boy:{ 2020:1186,2021:1229,2022:1305,2023:1204,2024:1289,2025:1140 } },
  gray: { boy:{ 2020:1239,2021:1180,2022:1212,2023:1172,2024:1349,2025:1420 } },
  gilbert: { boy:{ 2020:1173,2021:1216,2022:1218,2023:1173,2024:1394,2025:1330 } },
  rylen: { boy:{ 2020:1374,2021:1320,2022:1173,2023:1399,2024:1462,2025:1557 } },
  gibson: { boy:{ 2020:1174,2021:1311,2022:1734,2023:1617,2024:1627,2025:1684 } },
  wylie: { boy:{ 2020:1817,2021:1281,2022:1440,2023:1547,2024:1224,2025:1176 } },
  lenox: { boy:{ 2020:1216,2021:1210,2022:1186,2023:1178,2024:1560,2025:1353 } },
  canyon: { boy:{ 2020:1477,2021:1181,2022:1277,2023:1396,2024:1430,2025:1606 } },
  steele: { boy:{ 2020:1557,2021:1555,2022:1504,2023:1328,2024:1372,2025:1183 } },
  gentry: { boy:{ 2020:1344,2021:1184,2022:1363,2023:1417,2024:1603,2025:1820 } },
  oren: { boy:{ 2020:1381,2021:1262,2022:1344,2023:1294,2024:1383,2025:1184 } },
  cove: { girl:{ 2020:4848,2021:3782,2022:2342,2023:2073,2024:2296,2025:1935 }, boy:{ 2020:1991,2021:2057,2022:1376,2023:1321,2024:1209,2025:1191 } },
  anton: { boy:{ 2020:1244,2021:1199,2022:1401,2023:1471,2024:1486,2025:1391 } },
  thorin: { boy:{ 2020:1337,2021:1397,2022:1254,2023:1199,2024:1359,2025:1378 } },
  rogan: { boy:{ 2020:1215,2021:1246,2022:1441,2023:1930,2024:2174,2025:2006 } },
  jet: { boy:{ 2020:1318,2021:1226,2022:1217,2023:1319,2024:1347,2025:1249 } },
  viktor: { boy:{ 2020:1480,2021:1327,2022:1213,2023:1283,2024:1276,2025:1237 } },
  eliot: { boy:{ 2020:1235,2021:1257,2022:1328,2023:1364,2024:1363,2025:1406 } },
  westen: { boy:{ 2020:1833,2021:1442,2022:1468,2023:1508,2024:1398,2025:1236 } },
  perry: { girl:{ 2020:2084,2021:1853,2022:1942,2023:1686,2024:1916,2025:2219 }, boy:{ 2020:1259,2021:1303,2022:1366,2023:1371,2024:1238,2025:1372 } },
  monte: { boy:{ 2020:1493,2021:1269,2022:1241,2023:1481,2024:1435,2025:1469 } },
  freddy: { boy:{ 2020:1265,2021:1393,2022:1327,2023:1243,2024:1340,2025:1423 } },
  brent: { boy:{ 2020:1267,2021:1244,2022:1364,2023:1456,2024:1659,2025:1513 } },
  riot: { boy:{ 2020:1854,2021:1829,2022:1609,2023:1608,2024:1244,2025:1264 } },
  craig: { boy:{ 2020:1249,2021:1451,2022:1500,2023:1537,2024:1852,2025:1653 } },
  truman: { boy:{ 2020:1250,2021:1408,2022:1449,2023:1539,2024:1810,2025:1547 } },
  steve: { boy:{ 2020:1251,2021:1366,2022:1484,2023:1540,2024:1688,2025:1612 } },
  west: { boy:{ 2020:1834,2021:1770,2022:1414,2023:1832,2024:1324,2025:1252 } },
  carsen: { boy:{ 2020:1253,2021:1418,2022:1692,2023:1726,2024:1980,2025:2204 } },
  valor: { boy:{ 2020:1335,2021:1554,2022:1738,2023:1467,2024:1460,2025:1253 } },
  bernard: { boy:{ 2020:1254,2021:1315,2022:1294,2023:1484,2024:1320,2025:1365 } },
  mars: { boy:{ 2020:1637,2021:1306,2022:1567,2023:1254,2024:1454,2025:1614 } },
  jonathon: { boy:{ 2020:1256,2021:1499,2022:1475,2023:1388,2024:1550,2025:1489 } },
  percy: { boy:{ 2020:2053,2021:1800,2022:1576,2023:1560,2024:1257,2025:1277 } },
  darrell: { boy:{ 2020:1258,2021:1415,2022:1439,2023:1586,2024:1469,2025:1695 } },
  ripley: { girl:{ 2020:1295,2021:1319,2022:1166,2023:1180,2024:1242,2025:1029 }, boy:{ 2020:2118,2021:1965,2022:1615,2023:1502,2024:1389,2025:1263 } },
  kallen: { boy:{ 2020:1264,2021:1275,2022:1336,2023:1361,2024:1474,2025:1299 } },
  derick: { boy:{ 2020:1295,2021:1560,2022:1329,2023:1265,2024:1447,2025:1484 } },
  milton: { boy:{ 2020:1272,2021:1361,2022:1266,2023:1425,2024:1426,2025:1438 } },
  slater: { boy:{ 2020:1820,2021:1598,2022:1425,2023:1568,2024:1542,2025:1267 } },
  zack: { boy:{ 2020:1297,2021:1267,2022:1322,2023:1288,2024:1388,2025:1425 } },
  ender: { boy:{ 2020:1590,2021:1441,2022:1268,2023:1583,2024:1571,2025:1750 } },
  clifford: { boy:{ 2020:1345,2021:1270,2022:1276,2023:1455,2024:1342,2025:1357 } },
  ross: { boy:{ 2020:1320,2021:1284,2022:1279,2023:1520,2024:1361,2025:1459 } },
  garrison: { boy:{ 2020:1305,2021:1278,2022:1383,2023:1629,2024:1788,2025:1766 } },
  wolfgang: { boy:{ 2020:1347,2021:1282,2022:1411,2023:1315,2024:1530,2025:1514 } },
  conway: { boy:{ 2020:2016,2021:2128,2022:1934,2023:1690,2024:1538,2025:1289 } },
  emmet: { boy:{ 2020:1293,2021:1535,2022:1492,2023:1378,2024:1595,2025:1562 } },
  roan: { boy:{ 2020:1354,2021:1437,2022:1541,2023:1510,2024:1352,2025:1305 } },
  ewan: { boy:{ 2020:1515,2021:1485,2022:1417,2023:1307,2024:1512,2025:1483 } },
  dale: { boy:{ 2020:1357,2021:1416,2022:1558,2023:1415,2024:1313,2025:1416 } },
  townes: { boy:{ 2020:1819,2021:1496,2022:1481,2023:1519,2024:1541,2025:1316 } },
  clarence: { boy:{ 2020:1332,2021:1423,2022:1373,2023:1565,2024:1554,2025:1507 } },
  barry: { boy:{ 2020:1334,2021:1488,2022:1465,2023:1661,2024:1417,2025:1528 } },
  warner: { boy:{ 2020:1491,2021:1334,2022:1433,2023:1420,2024:1495,2025:1362 } },
  alister: { boy:{ 2020:1562,2021:1768,2022:1340,2023:1710,2024:1660,2025:1697 } },
  benji: { boy:{ 2020:1591,2021:1882,2022:1420,2023:1620,2024:1628,2025:1344 } },
  aston: { boy:{ 2020:1436,2021:1377,2022:1477,2023:1345,2024:1588,2025:1866 } },
  clint: { boy:{ 2020:1350,2021:1696,2022:1729,2023:1966,2024:2435,2025:2388 } },
  vince: { boy:{ 2020:1520,2021:1565,2022:1354,2023:1391,2024:1438,2025:1363 } },
  channing: { girl:{ 2020:1889,2021:2381,2022:2153,2023:2634,2024:2884,2025:3160 }, boy:{ 2020:1358,2021:1552,2022:1572,2023:1733,2024:1707,2025:1776 } },
  alton: { boy:{ 2020:1706,2021:1359,2022:1859,2023:1693,2024:1581,2025:1608 } },
  glenn: { boy:{ 2020:1404,2021:1450,2022:1438,2023:1582,2024:1362,2025:1450 } },
  guy: { boy:{ 2020:1366,2021:1512,2022:1437,2023:1573,2024:1561,2025:1640 } },
  clinton: { boy:{ 2020:1371,2021:1477,2022:1397,2023:1660,2024:1934,2025:1738 } },
  ramsey: { girl:{ 2020:1995,2021:1722,2022:2612,2023:2092,2024:2540,2025:2377 }, boy:{ 2020:1411,2021:1373,2022:1497,2023:1720,2024:1755,2025:1964 } },
  baron: { boy:{ 2020:1509,2021:1459,2022:1718,2023:1749,2024:1514,2025:1375 } },
  lenny: { boy:{ 2020:1659,2021:1550,2022:1486,2023:1393,2024:1376,2025:1419 } },
  vernon: { boy:{ 2020:1850,2021:1443,2022:1523,2023:1623,2024:1556,2025:1382 } },
  kip: { boy:{ 2020:1791,2021:1650,2022:1451,2023:1382,2024:1467,2025:1628 } },
  coy: { boy:{ 2020:1384,2021:1630,2022:1501,2023:1658,2024:1508,2025:1458 } },
  huck: { boy:{ 2020:1403,2021:1483,2022:1391,2023:1637,2024:1745,2025:1915 } },
  scotty: { boy:{ 2020:3143,2021:2925,2022:2723,2023:2081,2024:1768,2025:1394 } },
  fredrick: { boy:{ 2020:1431,2021:1413,2022:1396,2023:1604,2024:1636,2025:1734 } },
  jules: { girl:{ 2020:1900,2021:2143,2022:2040,2023:2360,2024:2291,2025:2124 }, boy:{ 2020:1445,2021:1532,2022:1602,2023:1614,2024:1845,2025:1397 } },
  orson: { boy:{ 2020:1573,2021:1681,2022:1435,2023:1400,2024:1488,2025:1427 } },
  alder: { boy:{ 2020:1757,2021:1537,2022:1456,2023:1472,2024:1425,2025:1407 } },
  todd: { boy:{ 2020:1409,2021:1529,2022:1469,2023:1559,2024:1590,2025:1611 } },
  judd: { boy:{ 2020:1587,2021:1747,2022:1570,2023:1513,2024:1410,2025:1702 } },
  kent: { boy:{ 2020:1427,2021:1410,2022:1545,2023:1672,2024:1635,2025:1657 } },
  cypress: { girl:{ 2020:2844,2021:2454,2022:2848,2023:2510,2024:2428,2025:2431 }, boy:{ 2020:2088,2021:1654,2022:1747,2023:1554,2024:1411,2025:1563 } },
  quinten: { boy:{ 2020:1413,2021:1530,2022:1707,2023:1803,2024:2046,2025:2184 } },
  carver: { boy:{ 2020:1449,2021:1417,2022:1502,2023:1438,2024:1470,2025:1508 } },
  finnian: { boy:{ 2020:1419,2021:1432,2022:1491,2023:1605,2024:1519,2025:1490 } },
  nile: { boy:{ 2020:1770,2021:1421,2022:1598,2023:1768,2024:1946,2025:1840 } },
  riggins: { boy:{ 2020:2143,2021:1773,2022:1852,2023:1424,2024:1676,2025:1772 } },
  karl: { boy:{ 2020:1576,2021:1531,2022:1427,2023:1686,2024:1692,2025:1593 } },
  eamon: { boy:{ 2020:1432,2021:1429,2022:1690,2023:1676,2024:1507,2025:1651 } },
  finneas: { boy:{ 2020:1722,2021:1559,2022:1510,2023:1674,2024:1529,2025:1432 } },
  ranger: { boy:{ 2020:1649,2021:1504,2022:1442,2023:1503,2024:1525,2025:1573 } },
  leopold: { boy:{ 2020:1443,2021:1648,2022:1671,2023:1841,2024:2063,2025:1996 } },
  hampton: { boy:{ 2020:1702,2021:1602,2022:1629,2023:1758,2024:1528,2025:1449 } },
  brighton: { girl:{ 2020:1614,2021:1849,2022:1971,2023:2223,2024:2170,2025:2538 }, boy:{ 2020:1677,2021:1453,2022:1662,2023:1893,2024:1995,2025:1880 } },
  brenden: { boy:{ 2020:1458,2021:1631,2022:1977,2023:2312,2024:2520,2025:2933 } },
  leander: { boy:{ 2020:1718,2021:1784,2022:1569,2023:1512,2024:1760,2025:1461 } },
  woods: { boy:{ 2020:2889,2021:2194,2022:1826,2023:1955,2024:1753,2025:1466 } },
  calloway: { boy:{ 2020:3067,2021:2727,2022:2348,2023:2108,2024:1828,2025:1475 } },
  corbyn: { boy:{ 2020:1475,2021:1611,2022:1728,2023:1890,2024:2131,2025:2278 } },
  kenton: { boy:{ 2020:1483,2021:1705,2022:1745,2023:2024,2024:2128,2025:1765 } },
  storm: { girl:{ 2020:1649,2021:1507,2022:1622,2023:1509,2024:1616,2025:1436 }, boy:{ 2020:1569,2021:1607,2022:1483,2023:1671,2024:1865,2025:2108 } },
  keller: { boy:{ 2020:1484,2021:1846,2022:1819,2023:1646,2024:1593,2025:1997 } },
  arnold: { boy:{ 2020:1756,2021:1562,2022:1530,2023:1649,2024:1698,2025:1485 } },
  cecil: { boy:{ 2020:1654,2021:1544,2022:1563,2023:1516,2024:1485,2025:1491 } },
  fynn: { boy:{ 2020:1485,2021:1603,2022:1527,2023:1919,2024:1930,2025:2197 } },
  canon: { boy:{ 2020:1496,2021:1687,2022:1585,2023:1865,2024:1935,2025:2225 } },
  vito: { boy:{ 2020:1695,2021:1771,2022:1840,2023:1633,2024:1632,2025:1500 } },
  clifton: { boy:{ 2020:1508,2021:1767,2022:1976,2023:1648,2024:1748,2025:1917 } },
  freddie: { boy:{ 2020:1748,2021:2185,2022:1993,2023:2006,2024:1961,2025:1512 } },
  lester: { boy:{ 2020:1528,2021:1585,2022:1742,2023:1915,2024:1567,2025:1636 } },
  nestor: { boy:{ 2020:1733,2021:1726,2022:2003,2023:1778,2024:1714,2025:1532 } },
  eddy: { boy:{ 2020:1618,2021:1573,2022:1583,2023:1574,2024:1536,2025:1605 } },
  daryl: { boy:{ 2020:1653,2021:1758,2022:1975,2023:2029,2024:2008,2025:1538 } },
  monty: { boy:{ 2020:2400,2021:2003,2022:2100,2023:1869,2024:1813,2025:1542 } },
  hagen: { boy:{ 2020:1784,2021:1543,2022:1779,2023:1813,2024:2146,2025:2046 } },
  mickey: { boy:{ 2020:1543,2021:1774,2022:1636,2023:1840,2024:1643,2025:2042 } },
  lloyd: { boy:{ 2020:1717,2021:1548,2022:1711,2023:1794,2024:1771,2025:1551 } },
  vander: { boy:{ 2020:2292,2021:1853,2022:1875,2023:2115,2024:1798,2025:1352 } },
  ozzie: { boy:{ 2020:1769,2021:1539,2022:1434,2023:1372,2024:1415,2025:1454 } },
  oskar: { boy:{ 2020:1271,2021:1471,2022:1374,2023:1452,2024:1728,2025:1745 } },
  hansel: { boy:{ 2020:1783,2021:1376,2022:1508,2023:1715,2024:1669,2025:1639 } },
  everette: { boy:{ 2020:1905,2021:1809,2022:1431,2023:1454,2024:1587,2025:1580 } },
  calder: { boy:{ 2020:1775,2021:1913,2022:1835,2023:1555,2024:1994,2025:1739 } },
  nate: { boy:{ 2020:1881,2021:1662,2022:1618,2023:1577,2024:1565,2025:1747 } },
  elton: { boy:{ 2020:1723,2021:1572,2022:1947,2023:2127,2024:2093,2025:2322 } },
  neal: { boy:{ 2020:1574,2021:1577,2022:1599,2023:1737,2024:2002,2025:1910 } },
  radley: { boy:{ 2020:2072,2021:2448,2022:1942,2023:1777,2024:1576,2025:1828 } },
  niall: { boy:{ 2020:2122,2021:1843,2022:1988,2023:1790,2024:1577,2025:1700 } },
  rockwell: { boy:{ 2020:1581,2021:1711,2022:1939,2023:2148,2024:2044,2025:1933 } },
  constantine: { boy:{ 2020:1764,2021:1785,2022:1912,2023:1659,2024:1605,2025:1582 } },
  lyndon: { boy:{ 2020:1674,2021:1592,2022:1763,2023:1859,2024:1756,2025:2190 } },
  wolf: { boy:{ 2020:1818,2021:1597,2022:1702,2023:1775,2024:1809,2025:1889 } },
  chester: { boy:{ 2020:1632,2021:2129,2022:1769,2023:1731,2024:1658,2025:1598 } },
  arlen: { boy:{ 2020:2137,2021:1797,2022:1949,2023:1691,2024:1699,2025:1599 } },
  dashiell: { boy:{ 2020:1645,2021:1604,2022:1789,2023:2405,2024:2075,2025:2296 } },
  valen: { boy:{ 2020:2095,2021:1946,2022:1892,2023:1668,2024:1673,2025:1610 } },
  laine: { girl:{ 2020:1773,2021:1616,2022:1455,2023:1756,2024:1652,2025:1460 }, boy:{ 2020:1612,2021:2007,2022:2315,2023:2198,2024:2427,2025:3480 } },
  olin: { boy:{ 2020:1732,2021:1614,2022:1627,2023:1914,2024:2136,2025:1839 } },
  jarvis: { boy:{ 2020:1615,2021:1671,2022:1820,2023:1781,2024:2019,2025:2858 } },
  broderick: { boy:{ 2020:1620,2021:1998,2022:2147,2023:2216,2024:2386,2025:2602 } },
  lake: { girl:{ 2020:2797,2021:2941,2022:3013,2023:3299,2024:4069,2025:3602 }, boy:{ 2020:1883,2021:1789,2022:1712,2023:1804,2024:1623,2025:2064 } },
  rivers: { boy:{ 2020:1623,2021:1680,2022:1940,2023:2625,2024:2509,2025:2802 } },
  morris: { boy:{ 2020:1624,2021:1802,2022:1796,2023:1644,2024:1867,2025:1761 } },
  irving: { boy:{ 2020:1701,2021:1729,2022:1657,2023:1723,2024:1626,2025:1787 } },
  marlo: { girl:{ 2020:2159,2021:1930,2022:1711,2023:1968,2024:1713,2025:1837 }, boy:{ 2020:1859,2021:1858,2022:2007,2023:1634,2024:1677,2025:1715 } },
  levy: { boy:{ 2020:1711,2021:1638,2022:1798,2023:2088,2024:1841,2025:1701 } },
  lonnie: { boy:{ 2020:1638,2021:1669,2022:1866,2023:1729,2024:1814,2025:1845 } },
  woodrow: { boy:{ 2020:1707,2021:1750,2022:1827,2023:1876,2024:1685,2025:1644 } },
  myron: { boy:{ 2020:1679,2021:1744,2022:1682,2023:1946,2024:1691,2025:1647 } },
  brice: { boy:{ 2020:1753,2021:1655,2022:2148,2023:2728,2024:2473,2025:2985 } },
  jed: { boy:{ 2020:1661,2021:1875,2022:2087,2023:1770,2024:1992,2025:1998 } },
  bennet: { boy:{ 2020:2500,2021:2156,2022:2082,2023:1923,2024:1953,2025:1662 } },
  gene: { boy:{ 2020:1667,2021:1894,2022:2052,2023:2005,2024:1914,2025:2249 } },
  sylvan: { boy:{ 2020:2735,2021:2198,2022:1938,2023:2016,2024:1891,2025:1670 } },
  hardin: { boy:{ 2020:2186,2021:1673,2022:1823,2023:1740,2024:1718,2025:2115 } },
  brenton: { boy:{ 2020:1678,2021:1899,2022:1905,2023:1677,2024:1967,2025:2102 } },
  earl: { boy:{ 2020:2087,2021:1677,2022:1974,2023:2269,2024:2166,2025:2251 } },
  kurt: { boy:{ 2020:1680,2021:2048,2022:1925,2023:2397,2024:2107,2025:2270 } },
  oden: { boy:{ 2020:1837,2021:1764,2022:1681,2023:1789,2024:2218,2025:2021 } },
  wendell: { boy:{ 2020:2094,2021:1841,2022:1737,2023:1682,2024:2042,2025:2146 } },
  meyer: { boy:{ 2020:1857,2021:1691,2022:1806,2023:1684,2024:1800,2025:1693 } },
  conan: { boy:{ 2020:2208,2021:1994,2022:2487,2023:1891,2024:2023,2025:1686 } },
  fred: { boy:{ 2020:1810,2021:1686,2022:1903,2023:1716,2024:1695,2025:1937 } },
  viggo: { boy:{ 2020:2891,2021:2136,2022:2062,2023:1818,2024:1940,2025:1689 } },
  cosmo: { boy:{ 2020:2284,2021:1940,2022:1717,2023:1748,2024:1697,2025:1939 } },
  dan: { boy:{ 2020:1774,2021:1939,2022:1834,2023:1696,2024:1933,2025:1972 } },
  lathan: { boy:{ 2020:1699,2021:1889,2022:1899,2023:2299,2024:2197,2025:2693 } },
  huntley: { girl:{ 2020:2490,2021:2658,2022:2286,2023:2572,2024:1947,2025:2206 }, boy:{ 2020:2084,2021:1992,2022:2076,2023:1903,2024:1706,2025:2067 } },
  wynn: { girl:{ 2020:2417,2021:2174,2022:2278,2023:2289,2024:1980,2025:1703 }, boy:{ 2020:2194,2021:2000,2022:2137,2023:1851,2024:1903,2025:1709 } },
  orin: { boy:{ 2020:1801,2021:1712,2022:1741,2023:2428,2024:2245,2025:1859 } },
  stiles: { boy:{ 2020:2622,2021:2097,2022:2304,2023:2051,2024:1712,2025:2093 } },
  lysander: { boy:{ 2020:4336,2021:5002,2022:4484,2023:3745,2024:2196,2025:1716 } },
  elan: { boy:{ 2020:1931,2021:1718,2022:1931,2023:2268,2024:2666,2025:2505 } },
  korben: { boy:{ 2020:1720,2021:1970,2022:2140,2023:2398,2024:2765,2025:3141 } },
  ragnar: { boy:{ 2020:2026,2021:1815,2022:1830,2023:1721,2024:2267,2025:2549 } },
  sloan: { boy:{ 2020:2024,2021:1721,2022:1876,2023:1959,2024:2081,2025:2259 } },
  reggie: { boy:{ 2020:1878,2021:1722,2022:1841,2023:1945,2024:1972,2025:1858 } },
  donnie: { boy:{ 2020:1831,2021:1730,2022:1788,2023:1937,2024:1774,2025:1804 } },
  charley: { boy:{ 2020:1811,2021:1851,2022:1857,2023:1732,2024:1853,2025:1835 } },
  kasper: { boy:{ 2020:2127,2021:1972,2022:1869,2023:1796,2024:1738,2025:1872 } },
  lamont: { boy:{ 2020:1744,2021:2086,2022:1908,2023:2355,2024:2614,2025:2743 } },
  hazen: { boy:{ 2020:2311,2021:2391,2022:2161,2023:2028,2024:1746,2025:1788 } },
  lex: { boy:{ 2020:1805,2021:1746,2022:1898,2023:1795,2024:2223,2025:2313 } },
  gauge: { boy:{ 2020:1747,2021:2017,2022:2781,2023:2379,2024:3760,2025:4115 } },
  laurence: { boy:{ 2020:1982,2021:2264,2022:2536,2023:2135,2024:2176,2025:1748 } },
  lars: { boy:{ 2020:1806,2021:2326,2022:1752,2023:2155,2024:2177,2025:1894 } },
  ridley: { girl:{ 2020:1897,2021:1981,2022:1919,2023:1866,2024:1928,2025:2005 }, boy:{ 2020:1876,2021:1752,2022:1986,2023:2067,2024:2241,2025:2078 } },
  truitt: { boy:{ 2020:2367,2021:2112,2022:2270,2023:1834,2024:1864,2025:1756 } },
  tobin: { boy:{ 2020:1758,2021:1916,2022:2331,2023:2583,2024:2796,2025:3189 } },
  domenic: { boy:{ 2020:1941,2021:1897,2022:2091,2023:1760,2024:2381,2025:2325 } },
  thor: { boy:{ 2020:1767,2021:1799,2022:1918,2023:2080,2024:2798,2025:2841 } },
  rune: { boy:{ 2020:3286,2021:3308,2022:2224,2023:2278,2024:1925,2025:1781 } },
  marlin: { boy:{ 2020:2076,2021:2032,2022:1969,2023:1870,2024:1909,2025:1782 } },
  emmit: { boy:{ 2020:1785,2021:2020,2022:2400,2023:2887,2024:3438,2025:3358 } },
  braeden: { boy:{ 2020:1814,2021:1786,2022:2093,2023:2764,2024:2416,2025:3373 } },
  valentine: { boy:{ 2020:2506,2021:2501,2022:2083,2023:1898,2024:2445,2025:1793 } },
  richie: { boy:{ 2020:1963,2021:2177,2022:1878,2023:2175,2024:1799,2025:1857 } },
  maxon: { boy:{ 2020:1803,2021:2285,2022:2044,2023:3135,2024:3070,2025:2965 } },
  jennings: { boy:{ 2020:2009,2021:1777,2022:1927,2023:1978,2024:1960,2025:1847 } },
  britton: { boy:{ 2020:1812,2021:2190,2022:2488,2023:2437,2024:2991,2025:2791 } },
  breck: { boy:{ 2020:1813,2021:1900,2022:2188,2023:1939,2024:2711,2025:3026 } },
  glen: { boy:{ 2020:2431,2021:1820,2022:2088,2023:2402,2024:2307,2025:2028 } },
  callaway: { boy:{ 2020:3262,2021:3010,2022:2710,2023:2215,2024:2186,2025:1822 } },
  raleigh: { boy:{ 2020:1822,2021:2225,2022:2226,2023:2099,2024:2266,2025:2214 } },
  korey: { boy:{ 2020:1825,2021:1890,2022:2449,2023:2199,2024:2659,2025:2746 } },
  theodor: { boy:{ 2020:1874,2021:2080,2022:1828,2023:1854,2024:2102,2025:1993 } },
  dwight: { boy:{ 2020:1830,2021:2091,2022:2458,2023:2308,2024:2518,2025:2788 } },
  maksim: { boy:{ 2020:1861,2021:1832,2022:1897,2023:2000,2024:1928,2025:2464 } },
  caine: { boy:{ 2020:1942,2021:2219,2022:2017,2023:1848,2024:2282,2025:2508 } },
  roscoe: { boy:{ 2020:1853,2021:1918,2022:1919,2023:2251,2024:2173,2025:2239 } },
  hoyt: { boy:{ 2020:1968,2021:1878,2022:1854,2023:2231,2024:2490,2025:2862 } },
  triston: { boy:{ 2020:2070,2021:1854,2022:2469,2023:2698,2024:2446,2025:2424 } },
  angus: { boy:{ 2020:2043,2021:2250,2022:1858,2023:1997,2024:2152,2025:2389 } },
  kelton: { boy:{ 2020:1900,2021:1860,2022:2731,2023:2675,2024:2428,2025:3342 } },
  marko: { boy:{ 2020:1860,2021:1919,2022:2312,2023:2153,2024:1868,2025:2063 } },
  emile: { boy:{ 2020:2011,2021:1865,2022:2090,2023:2182,2024:1915,2025:2100 } },
  brendon: { boy:{ 2020:2090,2021:1867,2022:2613,2023:2184,2024:2586,2025:2710 } },
  fitz: { boy:{ 2020:1867,2021:1978,2022:2549,2023:3211,2024:2492,2025:3495 } },
  fischer: { boy:{ 2020:1868,2021:2018,2022:2089,2023:1935,2024:1993,2025:2221 } },
  kolbe: { boy:{ 2020:2304,2021:2235,2022:2177,2023:1871,2024:1929,2025:1934 } },
  sheldon: { boy:{ 2020:1875,2021:2045,2022:2153,2023:2321,2024:1941,2025:2774 } },
  von: { boy:{ 2020:2213,2021:2001,2022:2170,2023:1877,2024:2000,2025:2127 } },
  konrad: { boy:{ 2020:1926,2021:2050,2022:2232,2023:2102,2024:1878,2025:2010 } },
  holt: { boy:{ 2020:1988,2021:1976,2022:1902,2023:1885,2024:1913,2025:1926 } },
  duane: { boy:{ 2020:1886,2021:1896,2022:2109,2023:2107,2024:2094,2025:2597 } },
  klaus: { boy:{ 2020:2305,2021:1958,2022:1886,2023:2201,2024:2403,2025:2242 } },
  diesel: { boy:{ 2020:1887,2021:1911,2022:2552,2023:2309,2024:3200,2025:2359 } },
  reef: { boy:{ 2020:2326,2021:1888,2022:2309,2023:2131,2024:2537,2025:2486 } },
  branden: { boy:{ 2020:1890,2021:2371,2022:2825,2023:2506,2024:2627,2025:3372 } },
  armin: { boy:{ 2020:2501,2021:2108,2022:1979,2023:1894,2024:1983,2025:2052 } },
  lyon: { boy:{ 2020:2479,2021:2602,2022:2126,2023:2523,2024:1894,2025:2493 } },
  riker: { boy:{ 2020:2052,2021:1908,2022:1894,2023:1961,2024:2121,2025:2684 } },
  zaine: { boy:{ 2020:2264,2021:2040,2022:1965,2023:1896,2024:2210,2025:2573 } },
  aren: { boy:{ 2020:2210,2021:2319,2022:2135,2023:2241,2024:1900,2025:2087 } },
  stephon: { boy:{ 2020:1937,2021:1905,2022:2152,2023:2292,2024:2533,2025:2772 } },
  austen: { girl:{ 2020:3214,2021:2505,2022:2953,2023:3129,2024:3012,2025:3506 }, boy:{ 2020:1993,2021:1961,2022:2133,2023:2341,2024:1968,2025:2536 } },
  rook: { boy:{ 2020:3146,2021:2783,2022:2566,2023:2083,2024:2352,2025:1962 } },
  floyd: { boy:{ 2020:2038,2021:1960,2022:2259,2023:2530,2024:2147,2025:2250 } },
  demetri: { boy:{ 2020:2109,2021:2093,2022:2485,2023:1965,2024:2551,2025:2705 } },
  penn: { boy:{ 2020:1965,2021:2202,2022:2528,2023:2120,2024:2968,2025:2687 } },
  edmond: { boy:{ 2020:2229,2021:2127,2022:1973,2023:2380,2024:2278,2025:2014 } },
  cross: { boy:{ 2020:2231,2021:1979,2022:2320,2023:2236,2024:2471,2025:1974 } },
  bruin: { boy:{ 2020:2536,2021:1980,2022:2642,2023:2891,2024:3262,2025:2298 } },
  parks: { boy:{ 2020:2988,2021:2659,2022:2760,2023:2254,2024:2373,2025:1980 } },
  zach: { boy:{ 2020:2366,2021:1982,2022:2380,2023:2244,2024:2418,2025:2480 } },
  willem: { boy:{ 2020:2266,2021:1984,2022:2518,2023:2580,2024:2639,2025:2574 } },
  dave: { boy:{ 2020:1990,2021:2217,2022:2376,2023:2214,2024:2022,2025:2474 } },
  paolo: { boy:{ 2020:2516,2021:2204,2022:2125,2023:2020,2024:2455,2025:1994 } },
  robbie: { boy:{ 2020:2002,2021:2063,2022:2248,2023:2066,2024:2452,2025:2110 } },
  buck: { boy:{ 2020:2753,2021:2402,2022:2712,2023:2145,2024:2499,2025:2004 } },
  rayne: { boy:{ 2020:2554,2021:2141,2022:2250,2023:2019,2024:2242,2025:2007 } },
  dru: { boy:{ 2020:2496,2021:2021,2022:2056,2023:2008,2024:2380,2025:2386 } },
  ike: { boy:{ 2020:2010,2021:2390,2022:2547,2023:2645,2024:2984,2025:2470 } },
  niles: { boy:{ 2020:2029,2021:2205,2022:2388,2023:2519,2024:3118,2025:2489 } },
  cy: { boy:{ 2020:2161,2021:2808,2022:2429,2023:2030,2024:2363,2025:2570 } },
  gracen: { boy:{ 2020:2205,2021:2845,2022:2032,2023:3094,2024:2622,2025:2977 } },
  hamilton: { boy:{ 2020:2384,2021:2034,2022:2162,2023:2720,2024:2663,2025:3156 } },
  buckley: { boy:{ 2020:3192,2021:2689,2022:2146,2023:2144,2024:2037,2025:2205 } },
  alfie: { boy:{ 2020:2653,2021:2858,2022:2436,2023:2095,2024:2040,2025:2076 } },
  harland: { boy:{ 2020:3320,2021:2613,2022:2454,2023:2833,2024:2620,2025:2045 } },
  theron: { boy:{ 2020:2049,2021:2413,2022:2720,2023:2957,2024:2841,2025:2456 } },
  clive: { boy:{ 2020:2412,2021:2107,2022:2512,2023:2505,2024:2053,2025:2412 } },
  nolen: { boy:{ 2020:2054,2021:2101,2022:2085,2023:2545,2024:2323,2025:2371 } },
  fulton: { boy:{ 2020:2060,2021:2090,2022:2373,2023:2529,2024:2070,2025:2158 } },
  merlin: { boy:{ 2020:2478,2021:2082,2022:2688,2023:2281,2024:2062,2025:2351 } },
  burke: { boy:{ 2020:2135,2021:2074,2022:2612,2023:2535,2024:3261,2025:2667 } },
  dempsey: { boy:{ 2020:2530,2021:2092,2022:2608,2023:2359,2024:2866,2025:3022 } },
  teller: { boy:{ 2020:5479,2021:6738,2022:5043,2023:3237,2024:3464,2025:2092 } },
  sylvester: { boy:{ 2020:2474,2021:2114,2022:2096,2023:2147,2024:2103,2025:2212 } },
  kirk: { boy:{ 2020:2102,2021:2143,2022:2503,2023:2549,2024:2569,2025:2559 } },
  chet: { boy:{ 2020:2718,2021:2582,2022:2213,2023:2237,2024:2116,2025:2203 } },
  stefano: { boy:{ 2020:2934,2021:2658,2022:2123,2023:2118,2024:2289,2025:2545 } },
  locke: { boy:{ 2020:2124,2021:2747,2022:2367,2023:2197,2024:2485,2025:2191 } },
  conley: { boy:{ 2020:2574,2021:2458,2022:2322,2023:2128,2024:2339,2025:2533 } },
  jimmie: { boy:{ 2020:2129,2021:2487,2022:3120,2023:2752,2024:3425,2025:3714 } },
  dixon: { boy:{ 2020:2131,2021:3720,2022:3085,2023:2936,2024:2710,2025:3163 } },
  caelan: { boy:{ 2020:2682,2021:2432,2022:2132,2023:2311,2024:3386,2025:2932 } },
  banner: { boy:{ 2020:2136,2021:2191,2022:2789,2023:2169,2024:2311,2025:2160 } },
  nicolai: { boy:{ 2020:2556,2021:2598,2022:2138,2023:2487,2024:2567,2025:2585 } },
  herbert: { boy:{ 2020:2310,2021:2512,2022:2235,2023:2139,2024:2463,2025:2660 } },
  kipp: { boy:{ 2020:5561,2021:3689,2022:3572,2023:2591,2024:2141,2025:2176 } },
  filip: { boy:{ 2020:2206,2021:2241,2022:2144,2023:2597,2024:2582,2025:2979 } },
  marius: { boy:{ 2020:2145,2021:2357,2022:2658,2023:3513,2024:2426,2025:2555 } },
  kris: { boy:{ 2020:2147,2021:2328,2022:3433,2023:3934,2024:3559,2025:3202 } },
  heston: { boy:{ 2020:2488,2021:2151,2022:2397,2023:2377,2024:2898,2025:2320 } },
  grayden: { boy:{ 2020:2155,2021:2169,2022:2455,2023:2885,2024:2706,2025:2703 } },
  graeme: { boy:{ 2020:2156,2021:2954,2022:3188,2023:4556,2024:3758,2025:4018 } },
  reeves: { boy:{ 2020:5088,2021:4159,2022:3550,2023:3497,2024:2158,2025:2429 } },
  octavian: { boy:{ 2020:2555,2021:2163,2022:2336,2023:2367,2024:2247,2025:2583 } },
  alastair: { boy:{ 2020:3024,2021:2299,2022:2673,2023:2345,2024:2390,2025:2164 } },
  avett: { boy:{ 2020:2164,2021:2548,2022:2215,2023:4103,2024:3883,2025:3837 } },
  adair: { boy:{ 2020:4696,2021:3426,2022:2829,2023:2243,2024:2391,2025:2166 } },
  olsen: { boy:{ 2020:3365,2021:3603,2022:3427,2023:2864,2024:2246,2025:2173 } },
  brandt: { boy:{ 2020:2209,2021:2404,2022:2239,2023:2689,2024:3328,2025:3740 } },
  eldon: { boy:{ 2020:2280,2021:2395,2022:2209,2023:2267,2024:2253,2025:2324 } },
  willis: { boy:{ 2020:2212,2021:2255,2022:2873,2023:2317,2024:2638,2025:2543 } },
  halen: { boy:{ 2020:3321,2021:2213,2022:2779,2023:2646,2024:2465,2025:3115 } },
  stockton: { boy:{ 2020:2215,2021:2502,2022:2836,2023:2960,2024:3052,2025:3322 } },
  abe: { boy:{ 2020:2466,2021:2222,2022:2406,2023:2361,2024:2442,2025:2229 } },
  treyton: { boy:{ 2020:2470,2021:2468,2022:2222,2023:2582,2024:4209,2025:5067 } },
  wayland: { boy:{ 2020:3738,2021:2592,2022:2755,2023:2222,2024:3108,2025:2286 } },
  marty: { boy:{ 2020:2745,2021:2228,2022:2982,2023:2871,2024:2613,2025:2910 } },
  vinny: { boy:{ 2020:3208,2021:2778,2022:2965,2023:2514,2024:2793,2025:2231 } },
  courtney: { girl:{ 2020:1394,2021:1693,2022:1729,2023:1901,2024:1993,2025:2344 }, boy:{ 2020:2232,2021:2492,2022:2461,2023:3217,2024:3202,2025:3167 } },
  harlen: { boy:{ 2020:2567,2021:2337,2022:2398,2023:2232,2024:2306,2025:2356 } },
  tyrus: { boy:{ 2020:2240,2021:2277,2022:3006,2023:3181,2024:2598,2025:3246 } },
  quade: { boy:{ 2020:2770,2021:2881,2022:3013,2023:2517,2024:2244,2025:2288 } },
  brogan: { boy:{ 2020:2387,2021:2247,2022:2713,2023:2409,2024:3779,2025:3440 } },
  kenyon: { boy:{ 2020:2247,2021:2750,2022:2695,2023:3525,2024:3740,2025:3707 } },
  mace: { boy:{ 2020:2403,2021:2305,2022:2251,2023:2631,2024:2848,2025:2492 } },
  carlton: { boy:{ 2020:2257,2021:2459,2022:3271,2023:2727,2024:2826,2025:2931 } },
  tye: { boy:{ 2020:2588,2021:2257,2022:3890,2023:2346,2024:2840,2025:3247 } },
  steel: { boy:{ 2020:2693,2021:2258,2022:2721,2023:3489,2024:2644,2025:3134 } },
  rustin: { boy:{ 2020:2510,2021:2828,2022:2651,2023:2858,2024:2422,2025:2261 } },
  orrin: { boy:{ 2020:2272,2021:2378,2022:2360,2023:2390,2024:2653,2025:2263 } },
  nevin: { boy:{ 2020:2274,2021:2742,2022:3015,2023:2969,2024:3288,2025:3985 } },
  murray: { boy:{ 2020:2663,2021:2985,2022:2764,2023:2280,2024:2729,2025:2611 } },
  kory: { boy:{ 2020:2481,2021:2748,2022:2282,2023:2710,2024:2973,2025:3340 } },
  hardy: { boy:{ 2020:3059,2021:2540,2022:2289,2023:3154,2024:2547,2025:2499 } },
  lynx: { boy:{ 2020:3953,2021:3528,2022:2572,2023:2456,2024:2270,2025:2807 } },
  tiger: { boy:{ 2020:3664,2021:4141,2022:2245,2023:3302,2024:4335,2025:3671 } },
  remmy: { boy:{ 2020:2217,2021:2526,2022:2842,2023:2913,2024:3224,2025:2900 } },
  manny: { boy:{ 2020:2664,2021:2083,2022:2279,2023:2522,2024:2692,2025:3199 } },
  marek: { boy:{ 2020:2123,2021:2229,2022:2069,2023:2489,2024:2484,2025:2615 } },
  terence: { boy:{ 2020:2293,2021:2414,2022:2332,2023:3236,2024:2923,2025:2729 } },
  patton: { boy:{ 2020:2370,2021:2527,2022:2529,2023:2782,2024:2294,2025:3262 } },
  marion: { girl:{ 2020:1842,2021:1645,2022:1721,2023:1660,2024:1876,2025:2042 }, boy:{ 2020:2352,2021:3037,2022:2338,2023:2353,2024:2298,2025:2491 } },
  marlow: { girl:{ 2020:2028,2021:1443,2022:1673,2023:1363,2024:1319,2025:1165 }, boy:{ 2020:3951,2021:2356,2022:2692,2023:2370,2024:2482,2025:2312 } },
  hawkins: { boy:{ 2020:2312,2021:2610,2022:2483,2023:3093,2024:3373,2025:3551 } },
  bauer: { boy:{ 2020:2318,2021:2497,2022:2788,2023:2804,2024:3206,2025:2509 } },
  fritz: { boy:{ 2020:2641,2021:2579,2022:2637,2023:2332,2024:2516,2025:2755 } },
  larson: { boy:{ 2020:2373,2021:2667,2022:2477,2023:2354,2024:2458,2025:2616 } },
  loren: { girl:{ 2020:2067,2021:2221,2022:2429,2023:2527,2024:2475,2025:3010 }, boy:{ 2020:2354,2021:2358,2022:2366,2023:2396,2024:2658,2025:3062 } },
  pete: { boy:{ 2020:2514,2021:2354,2022:2501,2023:2486,2024:3064,2025:2370 } },
  price: { boy:{ 2020:2513,2021:2420,2022:2411,2023:2917,2024:2726,2025:2347 } },
  bennie: { girl:{ 2020:7491,2021:5216,2022:4455,2023:4639,2024:4994,2025:2817 }, boy:{ 2020:2434,2021:2644,2022:2350,2023:2569,2024:2522,2025:2535 } },
  ken: { boy:{ 2020:2374,2021:2532,2022:2663,2023:3260,2024:3298,2025:3276 } },
  zeno: { boy:{ 2020:3419,2021:3122,2022:3281,2023:2575,2024:2394,2025:2517 } },
  sorin: { boy:{ 2020:3084,2021:2472,2022:2722,2023:3243,2024:2682,2025:2394 } },
  walton: { boy:{ 2020:2848,2021:3366,2022:3697,2023:3179,2024:3278,2025:2422 } },
  ferris: { boy:{ 2020:3250,2021:2957,2022:2668,2023:3037,2024:2431,2025:3159 } },
  oakes: { boy:{ 2020:7656,2021:4528,2022:4471,2023:3916,2024:2969,2025:2433 } },
  walden: { boy:{ 2020:2761,2021:3584,2022:3289,2023:2444,2024:3166,2025:3187 } },
  rick: { boy:{ 2020:2445,2021:2829,2022:2799,2023:2911,2024:2925,2025:3047 } },
  kirby: { girl:{ 2020:3761,2021:2763,2022:2777,2023:3024,2024:2546,2025:2664 }, boy:{ 2020:2482,2021:3096,2022:2895,2023:2747,2024:2570,2025:3275 } },
  brant: { boy:{ 2020:2499,2021:2771,2022:3141,2023:3046,2024:3979,2025:3371 } },
  gareth: { boy:{ 2020:2676,2021:2846,2022:2508,2023:2759,2024:2665,2025:2786 } },
  tim: { boy:{ 2020:3432,2021:2921,2022:3542,2023:3235,2024:2508,2025:3190 } },
  saxon: { boy:{ 2020:2818,2021:2524,2022:2622,2023:3358,2024:3056,2025:3097 } },
  geoffrey: { boy:{ 2020:2714,2021:3055,2022:2737,2023:2528,2024:3082,2025:3641 } },
  ward: { boy:{ 2020:2659,2021:2821,2022:2520,2023:2901,2024:3277,2025:2839 } },
  collier: { boy:{ 2020:3017,2021:3007,2022:3331,2023:2472,2024:2744,2025:3079 } },
  dutch: { boy:{ 2020:3184,2021:3719,2022:2551,2023:2935,2024:2583,2025:2472 } },
  rainer: { boy:{ 2020:2822,2021:2503,2022:2885,2023:2814,2024:2607,2025:3399 } },
  erwin: { boy:{ 2020:2458,2021:2682,2022:2639,2023:2500,2024:2432,2025:2408 } },
  herman: { boy:{ 2020:2382,2021:2758,2022:2633,2023:2330,2024:2662,2025:2384 } },
  welles: { boy:{ 2020:3350,2021:2411,2022:2922,2023:3638,2024:3529,2025:2946 } },
  bowman: { boy:{ 2020:2684,2021:2729,2022:2745,2023:3047,2024:2521,2025:2414 } },
  woodson: { boy:{ 2020:3737,2021:4128,2022:3287,2023:3421,2024:2718,2025:2421 } },
  sven: { boy:{ 2020:2441,2021:2826,2022:2621,2023:2515,2024:2601,2025:3595 } },
  audie: { boy:{ 2020:2415,2021:2406,2022:2614,2023:2945,2024:2909,2025:3654 } },
  erling: { boy:{ 2020:null,2021:5493,2022:4403,2023:2501,2024:2946,2025:4353 } },
  carsten: { boy:{ 2020:2464,2021:3113,2022:2991,2023:3556,2024:4860,2025:4372 } },
  zac: { boy:{ 2020:2548,2021:2466,2022:2753,2023:2693,2024:3337,2025:3183 } },
  kerry: { boy:{ 2020:3000,2021:2943,2022:2505,2023:3379,2024:2697,2025:2466 } },
  tracy: { girl:{ 2020:2302,2021:2559,2022:2390,2023:2397,2024:2436,2025:2154 }, boy:{ 2020:2471,2021:2824,2022:3222,2023:3184,2024:3280,2025:3859 } },
  jeff: { boy:{ 2020:2835,2021:2425,2022:2812,2023:3387,2024:2941,2025:3350 } },
  ronny: { boy:{ 2020:2592,2021:2928,2022:2841,2023:2426,2024:2535,2025:3394 } },
  rusty: { boy:{ 2020:3828,2021:2872,2022:3424,2023:3189,2024:3346,2025:2368 } },
  olivier: { boy:{ 2020:2662,2021:2479,2022:2414,2023:2366,2024:2688,2025:2551 } },
  hart: { boy:{ 2020:3058,2021:2612,2022:2635,2023:3446,2024:2944,2025:2407 } },
  chancellor: { boy:{ 2020:2463,2021:2810,2022:3200,2023:3616,2024:4176,2025:4513 } },
  judge: { boy:{ 2020:3235,2021:2507,2022:2733,2023:2980,2024:2812,2025:2656 } },
  llewyn: { boy:{ 2020:2599,2021:2451,2022:2418,2023:2824,2024:2931,2025:4182 } },
  marshal: { boy:{ 2020:3687,2021:2530,2022:3237,2023:3432,2024:3289,2025:3407 } },
  mercer: { boy:{ 2020:3449,2021:3036,2022:3430,2023:3430,2024:3069,2025:2552 } },
  wolfe: { boy:{ 2020:2586,2021:3024,2022:2563,2023:2899,2024:2719,2025:2837 } },
  pace: { boy:{ 2020:3222,2021:3031,2022:3297,2023:3130,2024:2564,2025:3263 } },
  kurtis: { boy:{ 2020:2667,2021:2568,2022:2767,2023:3022,2024:3832,2025:2744 } },
  holton: { boy:{ 2020:2712,2021:2577,2022:3657,2023:2758,2024:3081,2025:3068 } },
  bradford: { boy:{ 2020:2578,2021:2643,2022:2992,2023:2690,2024:2993,2025:3573 } },
  boris: { boy:{ 2020:2579,2021:2967,2022:3454,2023:3617,2024:3387,2025:3231 } },
  berkley: { boy:{ 2020:2580,2021:3350,2022:3679,2023:3336,2024:3389,2025:3509 } },
  brix: { boy:{ 2020:2843,2021:2584,2022:2954,2023:3557,2024:2953,2025:3025 } },
  alexei: { boy:{ 2020:2923,2021:2587,2022:2870,2023:3470,2024:2786,2025:3308 } },
  trystan: { boy:{ 2020:2660,2021:2593,2022:2796,2023:3718,2024:4583,2025:6171 } },
  cutter: { boy:{ 2020:3332,2021:2961,2022:3966,2023:2601,2024:3258,2025:2708 } },
  gabe: { boy:{ 2020:2605,2021:2847,2022:3393,2023:2987,2024:4662,2025:4654 } },
  rennick: { boy:{ 2020:6705,2021:7717,2022:8450,2023:5313,2024:2606,2025:5445 } },
  dmitri: { boy:{ 2020:2914,2021:3165,2022:2607,2023:2889,2024:3667,2025:3497 } },
  dino: { boy:{ 2020:2608,2021:2850,2022:3670,2023:2685,2024:2741,2025:2822 } },
  rowe: { boy:{ 2020:3670,2021:4156,2022:3224,2023:3244,2024:3537,2025:2608 } },
  mikey: { boy:{ 2020:3299,2021:3392,2022:2981,2023:3742,2024:2972,2025:2613 } },
  aramis: { boy:{ 2020:2614,2021:2692,2022:2790,2023:2733,2024:2910,2025:3751 } },
  cyril: { boy:{ 2020:2918,2021:2616,2022:2909,2023:3333,2024:3040,2025:3165 } },
  hadrian: { boy:{ 2020:4223,2021:3478,2022:3444,2023:3956,2024:2864,2025:2627 } },
  beaumont: { boy:{ 2020:4127,2021:4611,2022:4170,2023:4099,2024:3678,2025:2635 } },
  galen: { boy:{ 2020:2748,2021:2804,2022:2636,2023:3210,2024:2774,2025:4492 } },
  chadwick: { boy:{ 2020:3633,2021:3009,2022:2641,2023:3459,2024:4300,2025:4234 } },
  stevie: { boy:{ 2020:3510,2021:4020,2022:3791,2023:3122,2024:2966,2025:2642 } },
  creighton: { boy:{ 2020:2647,2021:3415,2022:3597,2023:3041,2024:3872,2025:3830 } },
  alexandros: { boy:{ 2020:3731,2021:2648,2022:3877,2023:3563,2024:3267,2025:2672 } },
  giacomo: { boy:{ 2020:3710,2021:3979,2022:3080,2023:3273,2024:3311,2025:2662 } },
  weldon: { boy:{ 2020:2927,2021:3582,2022:2874,2023:2662,2024:2961,2025:2769 } },
  gaspar: { boy:{ 2020:2747,2021:2955,2022:3325,2023:2834,2024:2664,2025:3071 } },
  lawton: { boy:{ 2020:2826,2021:2666,2022:3925,2023:3138,2024:3181,2025:3273 } },
  sander: { boy:{ 2020:2694,2021:3513,2022:3009,2023:2857,2024:4098,2025:2996 } },
  mathis: { boy:{ 2020:2703,2021:2746,2022:3724,2023:3074,2024:3553,2025:3336 } },
  maven: { girl:{ 2020:2040,2021:1912,2022:1778,2023:1432,2024:1542,2025:1583 }, boy:{ 2020:5112,2021:3458,2022:3817,2023:2709,2024:3232,2025:3531 } },
  caeden: { boy:{ 2020:2920,2021:2965,2022:2711,2023:3284,2024:3509,2025:3739 } },
  augusto: { boy:{ 2020:4529,2021:3806,2022:3871,2023:3408,2024:3330,2025:2714 } },
  willard: { boy:{ 2020:2760,2021:3744,2022:3004,2023:2900,2024:2959,2025:2722 } },
  darin: { boy:{ 2020:2749,2021:2907,2022:3756,2023:3278,2024:3591,2025:3645 } },
  clarke: { girl:{ 2020:1508,2021:1424,2022:1545,2023:1583,2024:1866,2025:1523 }, boy:{ 2020:2750,2021:3064,2022:3199,2023:4317,2024:3384,2025:3227 } },
  pearson: { boy:{ 2020:2855,2021:2788,2022:2887,2023:3014,2024:2753,2025:3601 } },
  pascal: { boy:{ 2020:3442,2021:3136,2022:3553,2023:2861,2024:2754,2025:3604 } },
  einar: { boy:{ 2020:4988,2021:3631,2022:3511,2023:3963,2024:3254,2025:2758 } },
  cale: { boy:{ 2020:2919,2021:3491,2022:2912,2023:3700,2024:3260,2025:2760 } },
  eugenio: { boy:{ 2020:3061,2021:2762,2022:3133,2023:3097,2024:2778,2025:3285 } },
  kazimir: { boy:{ 2020:7272,2021:5443,2022:3180,2023:2828,2024:2766,2025:3793 } },
  iain: { boy:{ 2020:2746,2021:4435,2022:4054,2023:4411,2024:4276,2025:7515 } },
  tadhg: { boy:{ 2020:3216,2021:3026,2022:2969,2023:2774,2024:3051,2025:3672 } },
  donatello: { boy:{ 2020:4241,2021:2905,2022:2783,2023:2798,2024:3036,2025:4665 } },
  robinson: { boy:{ 2020:3360,2021:2784,2022:3631,2023:2964,2024:3539,2025:3599 } },
  matt: { boy:{ 2020:3098,2021:3200,2022:3431,2023:2786,2024:2805,2025:3786 } },
  blayne: { boy:{ 2020:2969,2021:2912,2022:2787,2023:3107,2024:2994,2025:2986 } },
  niccolo: { boy:{ 2020:3680,2021:2564,2022:2762,2023:2968,2024:2847,2025:3054 } },
  wayde: { boy:{ 2020:2928,2021:2920,2022:2834,2023:3889,2024:3530,2025:2679 } },
  cliff: { boy:{ 2020:2679,2021:3798,2022:3519,2023:3163,2024:3042,2025:2929 } },
  slate: { boy:{ 2020:2892,2021:2780,2022:2925,2023:2703,2024:3341,2025:2681 } },
  roper: { boy:{ 2020:3586,2021:3309,2022:3059,2023:2907,2024:2685,2025:3045 } },
  dallin: { boy:{ 2020:3015,2021:3413,2022:3197,2023:2687,2024:3870,2025:3362 } },
  talan: { boy:{ 2020:2692,2021:3025,2022:3291,2023:2959,2024:3110,2025:3389 } },
  levin: { boy:{ 2020:3161,2021:2665,2022:2941,2023:2825,2024:3020,2025:3003 } },
  quill: { boy:{ 2020:2854,2021:2596,2022:2759,2023:3501,2024:3062,2025:3331 } },
  cobe: { boy:{ 2020:2649,2021:3008,2022:4815,2023:3282,2024:3772,2025:4827 } },
  vidal: { boy:{ 2020:3926,2021:3248,2022:2678,2023:3570,2024:3168,2025:3095 } },
  timur: { boy:{ 2020:3030,2021:2655,2022:2680,2023:2663,2024:2600,2025:2605 } },
  hershel: { boy:{ 2020:3056,2021:3547,2022:2777,2023:2559,2024:2703,2025:2701 } },
  cedrick: { boy:{ 2020:3486,2021:3229,2022:2953,2023:3402,2024:2745,2025:3368 } },
  kordell: { boy:{ 2020:4069,2021:2749,2022:3241,2023:3377,2024:4494,2025:3701 } },
  arch: { boy:{ 2020:9490,2021:9649,2022:4562,2023:4734,2024:3266,2025:2795 } },
  walt: { boy:{ 2020:2849,2021:2863,2022:2923,2023:2808,2024:3396,2025:3316 } },
  darrin: { boy:{ 2020:2966,2021:2806,2022:3265,2023:4192,2024:3441,2025:3435 } },
  wellington: { boy:{ 2020:2812,2021:3077,2022:3622,2023:3637,2024:3217,2025:4262 } },
  wheeler: { boy:{ 2020:5245,2021:3432,2022:3416,2023:3178,2024:2838,2025:3455 } },
  huey: { boy:{ 2020:3543,2021:2844,2022:3254,2023:3391,2024:2943,2025:2976 } },
  thane: { boy:{ 2020:2852,2021:2867,2022:2967,2023:3355,2024:2965,2025:3388 } },
  hanson: { boy:{ 2020:3245,2021:3548,2022:3079,2023:2882,2024:2863,2025:3013 } },
  dusty: { boy:{ 2020:3064,2021:3632,2022:2864,2023:3452,2024:4167,2025:3563 } },
  davy: { boy:{ 2020:3405,2021:4336,2022:4412,2023:4427,2024:2867,2025:5174 } },
  daren: { boy:{ 2020:3559,2021:3345,2022:4280,2023:3279,2024:2868,2025:3223 } },
  mick: { boy:{ 2020:3301,2021:3144,2022:2937,2023:2868,2024:3634,2025:4602 } },
  ted: { boy:{ 2020:3214,2021:3128,2022:3007,2023:2903,2024:2881,2025:3191 } },
  rider: { boy:{ 2020:3754,2021:3828,2022:2884,2023:4640,2024:4106,2025:3679 } },
  lowell: { boy:{ 2020:3041,2021:2885,2022:3112,2023:3660,2024:3732,2025:3272 } },
  olen: { boy:{ 2020:3092,2021:2934,2022:3637,2023:3132,2024:2886,2025:3473 } },
  cutler: { boy:{ 2020:3126,2021:3110,2022:3040,2023:3399,2024:2905,2025:3119 } },
  dansby: { boy:{ 2020:5389,2021:3563,2022:2908,2023:3613,2024:5618,2025:4823 } },
  brad: { boy:{ 2020:2921,2021:3287,2022:3604,2023:3983,2024:4180,2025:4377 } },
  sagan: { boy:{ 2020:3584,2021:2926,2022:3356,2023:9090,2024:4461,2025:5434 } },
  pearce: { boy:{ 2020:3293,2021:3450,2022:2930,2023:4944,2024:5106,2025:4579 } },
  reeve: { boy:{ 2020:3517,2021:2931,2022:3360,2023:3067,2024:3407,2025:3468 } },
  karsten: { boy:{ 2020:3861,2021:2944,2022:4374,2023:4048,2024:3948,2025:4193 } },
  chauncey: { boy:{ 2020:3128,2021:3227,2022:3599,2023:3785,2024:2952,2025:4512 } },
  jim: { boy:{ 2020:2952,2021:3209,2022:3438,2023:4053,2024:4509,2025:3149 } },
  hubert: { boy:{ 2020:2957,2021:3785,2022:3742,2023:4550,2024:3576,2025:3428 } },
  graydon: { boy:{ 2020:2959,2021:3879,2022:3390,2023:3540,2024:6709,2025:5542 } },
  prescott: { boy:{ 2020:3518,2021:3672,2022:3479,2023:4490,2024:4109,2025:2959 } },
  wilbur: { boy:{ 2020:4549,2021:4131,2022:3696,2023:3479,2024:2960,2025:3958 } },
  carlisle: { boy:{ 2020:2968,2021:2964,2022:3202,2023:3460,2024:3325,2025:3297 } },
  kiernan: { boy:{ 2020:3380,2021:2989,2022:3646,2023:3836,2024:3127,2025:3419 } },
  tilden: { boy:{ 2020:3080,2021:3504,2022:3104,2023:3572,2024:3109,2025:2993 } },
  arlow: { boy:{ 2020:5677,2021:5100,2022:2997,2023:3709,2024:3331,2025:3175 } },
  lochlann: { boy:{ 2020:2943,2021:4543,2022:4122,2023:3371,2024:3483,2025:3337 } },
  frederic: { boy:{ 2020:3323,2021:2956,2022:3394,2023:3095,2024:2902,2025:2978 } },
  shaw: { boy:{ 2020:2982,2021:3511,2022:3422,2023:4133,2024:4216,2025:4727 } },
  stoney: { boy:{ 2020:3281,2021:4645,2022:3704,2023:3722,2024:2882,2025:3251 } },
  whitten: { boy:{ 2020:3658,2021:3500,2022:2921,2023:3232,2024:4078,2025:2886 } },
  witt: { boy:{ 2020:5713,2021:4129,2022:4712,2023:3636,2024:3527,2025:2945 } },
  maclin: { boy:{ 2020:2996,2021:4999,2022:3563,2023:4155,2024:5120,2025:4089 } },
  viola: { girl:{ 2020:1118,2021:1162,2022:1030,2023:1066,2024:1185,2025:1013 } },
  erika: { girl:{ 2020:1016,2021:1107,2022:1266,2023:1052,2024:1143,2025:1112 } },
  christine: { girl:{ 2020:1018,2021:1141,2022:1126,2023:1170,2024:1200,2025:1276 } },
  beverly: { girl:{ 2020:1267,2021:1253,2022:1110,2023:1178,2024:1047,2025:1019 } },
  claudia: { girl:{ 2020:1022,2021:1033,2022:1096,2023:1082,2024:1089,2025:1097 } },
  libby: { girl:{ 2020:1154,2021:1181,2022:1022,2023:1094,2024:1122,2025:1147 } },
  shea: { girl:{ 2020:1145,2021:1042,2022:1044,2023:1025,2024:1188,2025:1150 } },
  lindsey: { girl:{ 2020:1027,2021:1216,2022:1305,2023:1279,2024:1286,2025:1370 } },
  moriah: { girl:{ 2020:1196,2021:1276,2022:1313,2023:1032,2024:1208,2025:1093 } },
  montana: { girl:{ 2020:1732,2021:1438,2022:1290,2023:1304,2024:1057,2025:1033 } },
  bernadette: { girl:{ 2020:1447,2021:1179,2022:1302,2023:1237,2024:1247,2025:1037 } },
  renee: { girl:{ 2020:1040,2021:1117,2022:1061,2023:1077,2024:1045,2025:1100 } },
  rae: { girl:{ 2020:1064,2021:1047,2022:1167,2023:1202,2024:1266,2025:1301 } },
  antonia: { girl:{ 2020:1175,2021:1159,2022:1250,2023:1123,2024:1060,2025:1284 } },
  desiree: { girl:{ 2020:1060,2021:1080,2022:1100,2023:1211,2024:1137,2025:1433 } },
  adrienne: { girl:{ 2020:1062,2021:1189,2022:1189,2023:1299,2024:1465,2025:1683 } },
  dixie: { girl:{ 2020:1079,2021:1064,2022:1170,2023:1210,2024:1574,2025:1610 } },
  ann: { girl:{ 2020:1110,2021:1108,2022:1101,2023:1074,2024:1139,2025:1079 } },
  annelise: { girl:{ 2020:1431,2021:1448,2022:1539,2023:1473,2024:1311,2025:1074 } },
  evalyn: { girl:{ 2020:1076,2021:1201,2022:1210,2023:1190,2024:1361,2025:1432 } },
  danica: { girl:{ 2020:1158,2021:1079,2022:1318,2023:1543,2024:1557,2025:1639 } },
  marissa: { girl:{ 2020:1081,2021:1236,2022:1314,2023:1544,2024:1493,2025:1677 } },
  alannah: { girl:{ 2020:1083,2021:1185,2022:1370,2023:1492,2024:1519,2025:1682 } },
  ivana: { girl:{ 2020:1096,2021:1182,2022:1085,2023:1105,2024:1093,2025:1103 } },
  joan: { girl:{ 2020:1549,2021:1388,2022:1413,2023:1368,2024:1241,2025:1089 } },
  mollie: { girl:{ 2020:1090,2021:1180,2022:1225,2023:1138,2024:1204,2025:1113 } },
  wendy: { girl:{ 2020:1183,2021:1211,2022:1251,2023:1300,2024:1095,2025:1341 } },
  sally: { girl:{ 2020:1165,2021:1223,2022:1338,2023:1324,2024:1096,2025:1151 } },
  marian: { girl:{ 2020:1344,2021:1305,2022:1139,2023:1155,2024:1153,2025:1102 } },
  rhiannon: { girl:{ 2020:1156,2021:1103,2022:1120,2023:1154,2024:1297,2025:1119 } },
  ida: { girl:{ 2020:1180,2021:1114,2022:1106,2023:1184,2024:1136,2025:1124 } },
  sonia: { girl:{ 2020:1128,2021:1230,2022:1152,2023:1256,2024:1351,2025:1300 } },
  lucie: { girl:{ 2020:1354,2021:1405,2022:1378,2023:1416,2024:1293,2025:1130 } },
  annalee: { girl:{ 2020:1136,2021:1152,2022:1229,2023:1194,2024:1282,2025:1206 } },
  sharon: { girl:{ 2020:1140,2021:1242,2022:1199,2023:1310,2024:1224,2025:1251 } },
  brenda: { girl:{ 2020:1261,2021:1208,2022:1271,2023:1297,2024:1144,2025:1531 } },
  farrah: { girl:{ 2020:1212,2021:1210,2022:1219,2023:1346,2024:1148,2025:1331 } },
  angeline: { girl:{ 2020:1361,2021:1404,2022:1238,2023:1406,2024:1155,2025:1580 } },
  silvia: { girl:{ 2020:1389,2021:1348,2022:1402,2023:1378,2024:1162,2025:1235 } },
  robyn: { girl:{ 2020:1201,2021:1163,2022:1234,2023:1289,2024:1296,2025:1437 } },
  martina: { girl:{ 2020:1456,2021:1500,2022:1404,2023:1332,2024:1165,2025:1368 } },
  liz: { girl:{ 2020:1359,2021:1863,2022:1240,2023:1168,2024:1352,2025:1259 } },
  melania: { girl:{ 2020:1200,2021:1411,2022:1501,2023:1794,2024:1585,2025:1170 } },
  leni: { girl:{ 2020:1931,2021:1754,2022:1521,2023:1196,2024:1245,2025:1176 } },
  emilie: { girl:{ 2020:1234,2021:1178,2022:1346,2023:1261,2024:1393,2025:1314 } },
  yasmine: { girl:{ 2020:1475,2021:1317,2022:1478,2023:1407,2024:1207,2025:1183 } },
  odessa: { girl:{ 2020:1597,2021:1655,2022:1783,2023:1839,2024:1582,2025:1192 } },
  margaux: { girl:{ 2020:1401,2021:1193,2022:1247,2023:1220,2024:1215,2025:1198 } },
  annabel: { girl:{ 2020:1222,2021:1330,2022:1581,2023:1809,2024:1607,2025:2074 } },
  tillie: { girl:{ 2020:1769,2021:1602,2022:1439,2023:1294,2024:1231,2025:1263 } },
  rita: { girl:{ 2020:1232,2021:1435,2022:1323,2023:1373,2024:1395,2025:1288 } },
  rue: { girl:{ 2020:2474,2021:1741,2022:1292,2023:1253,2024:1240,2025:1319 } },
  cassie: { girl:{ 2020:1252,2021:1252,2022:1249,2023:1246,2024:1274,2025:1283 } },
  juno: { girl:{ 2020:1813,2021:1660,2022:1575,2023:1334,2024:1385,2025:1255 } },
  marlene: { girl:{ 2020:1561,2021:1501,2022:1257,2023:1349,2024:1553,2025:1264 } },
  roslyn: { girl:{ 2020:1369,2021:1379,2022:1259,2023:1449,2024:1365,2025:1429 } },
  cambria: { girl:{ 2020:1262,2021:1260,2022:1410,2023:1601,2024:1693,2025:1998 } },
  heather: { girl:{ 2020:1443,2021:1308,2022:1308,2023:1327,2024:1345,2025:1268 } },
  annette: { girl:{ 2020:1269,2021:1322,2022:1365,2023:1376,2024:1310,2025:1451 } },
  emeri: { girl:{ 2020:1285,2021:1430,2022:1376,2023:1270,2024:1503,2025:1463 } },
  zella: { girl:{ 2020:1654,2021:1270,2022:1437,2023:1596,2024:1840,2025:1733 } },
  mattie: { girl:{ 2020:1042,2021:1071,2022:1049,2023:1042,2024:1052,2025:1006 } },
  jewel: { girl:{ 2020:1013,2021:1218,2022:1105,2023:1242,2024:1398,2025:1515 } },
  lorraine: { girl:{ 2020:1392,2021:1370,2022:1296,2023:1357,2024:1421,2025:1045 } },
  roxanne: { girl:{ 2020:1120,2021:1175,2022:1371,2023:1311,2024:1275,2025:1311 } },
  rowen: { girl:{ 2020:1497,2021:1275,2022:1406,2023:1330,2024:1271,2025:1407 } },
  selina: { girl:{ 2020:1376,2021:1291,2022:1403,2023:1344,2024:1305,2025:1272 } },
  tess: { girl:{ 2020:1276,2021:1492,2022:1885,2023:1750,2024:1755,2025:1778 } },
  lorena: { girl:{ 2020:1281,2021:1371,2022:1277,2023:1278,2024:1277,2025:1292 } },
  kristen: { girl:{ 2020:1548,2021:1565,2022:1748,2023:1511,2024:1279,2025:1992 } },
  giada: { girl:{ 2020:1393,2021:1282,2022:1321,2023:1497,2024:1400,2025:1440 } },
  arwen: { girl:{ 2020:1741,2021:1458,2022:1335,2023:1285,2024:1339,2025:1385 } },
  jessa: { girl:{ 2020:1319,2021:1285,2022:1716,2023:1994,2024:2037,2025:2227 } },
  zinnia: { girl:{ 2020:1587,2021:1384,2022:1362,2023:1292,2024:1334,2025:1285 } },
  carmella: { girl:{ 2020:1386,2021:1466,2022:1340,2023:1420,2024:1347,2025:1290 } },
  rosalynn: { girl:{ 2020:1294,2021:1451,2022:1642,2023:1792,2024:1498,2025:1611 } },
  cristina: { girl:{ 2020:1297,2021:1407,2022:1484,2023:1383,2024:1386,2025:1630 } },
  kristina: { girl:{ 2020:1301,2021:1321,2022:1458,2023:1572,2024:1733,2025:1729 } },
  althea: { girl:{ 2020:1410,2021:1483,2022:1347,2023:1355,2024:1405,2025:1308 } },
  rosalind: { girl:{ 2020:1422,2021:1312,2022:1432,2023:1440,2024:1466,2025:1521 } },
  elinor: { girl:{ 2020:1491,2021:1315,2022:1339,2023:1375,2024:1496,2025:1509 } },
  carina: { girl:{ 2020:1348,2021:1329,2022:1386,2023:1438,2024:1491,2025:1578 } },
  janie: { girl:{ 2020:1787,2021:1637,2022:1459,2023:1546,2024:1544,2025:1330 } },
  vivien: { girl:{ 2020:1327,2021:1398,2022:1755,2023:1737,2024:1708,2025:1844 } },
  magdalene: { girl:{ 2020:1770,2021:2110,2022:1722,2023:1527,2024:1415,2025:1343 } },
  anita: { girl:{ 2020:1543,2021:1415,2022:1377,2023:1445,2024:1470,2025:1346 } },
  elissa: { girl:{ 2020:1346,2021:1352,2022:1417,2023:1470,2024:1534,2025:1850 } },
  sidney: { girl:{ 2020:1512,2021:1349,2022:1387,2023:1628,2024:1732,2025:1873 } },
  leora: { girl:{ 2020:1810,2021:1743,2022:1836,2023:1579,2024:1521,2025:1354 } },
  georgie: { girl:{ 2020:2230,2021:2079,2022:1878,2023:1532,2024:1596,2025:1364 } },
  kasey: { girl:{ 2020:1445,2021:1372,2022:1509,2023:1704,2024:1595,2025:1875 } },
  letty: { girl:{ 2020:1709,2021:1702,2022:1585,2023:1469,2024:1609,2025:1383 } },
  dottie: { girl:{ 2020:2311,2021:2039,2022:1633,2023:1484,2024:1403,2025:1384 } },
  ally: { girl:{ 2020:1388,2021:1459,2022:1619,2023:1761,2024:1881,2025:2137 } },
  lori: { girl:{ 2020:1673,2021:1636,2022:1390,2023:1426,2024:1525,2025:1727 } },
  pepper: { girl:{ 2020:1590,2021:1399,2022:1441,2023:1617,2024:1631,2025:1905 } },
  theresa: { girl:{ 2020:1399,2021:1433,2022:1479,2023:1681,2024:1492,2025:1549 } },
  inez: { girl:{ 2020:2058,2021:1592,2022:1984,2023:1640,2024:1417,2025:1401 } },
  katrina: { girl:{ 2020:1580,2021:1401,2022:1965,2023:1852,2024:1623,2025:2226 } },
  eleanore: { girl:{ 2020:1836,2021:1988,2022:1879,2023:1652,2024:1515,2025:1403 } },
  macey: { girl:{ 2020:1403,2021:1833,2022:1698,2023:1649,2024:1416,2025:1613 } },
  paulette: { girl:{ 2020:1657,2021:1643,2022:1612,2023:1570,2024:1407,2025:1537 } },
  belinda: { girl:{ 2020:1606,2021:1408,2022:1752,2023:1698,2024:1729,2025:1831 } },
  ester: { girl:{ 2020:1663,2021:1484,2022:1554,2023:1412,2024:1514,2025:1576 } },
  brenna: { girl:{ 2020:1453,2021:1414,2022:1759,2023:2102,2024:2075,2025:1852 } },
  pia: { girl:{ 2020:1850,2021:1819,2022:1448,2023:1460,2024:1414,2025:1453 } },
  natalee: { girl:{ 2020:1419,2021:1614,2022:1679,2023:2130,2024:2253,2025:2726 } },
  alissa: { girl:{ 2020:1421,2021:1449,2022:1656,2023:1691,2024:1558,2025:1961 } },
  georgiana: { girl:{ 2020:1902,2021:2017,2022:1666,2023:1730,2024:1626,2025:1421 } },
  echo: { girl:{ 2020:1677,2021:1423,2022:1653,2023:1567,2024:1691,2025:2340 } },
  bryanna: { girl:{ 2020:1429,2021:1607,2022:1805,2023:1998,2024:1728,2025:2321 } },
  julianne: { girl:{ 2020:1436,2021:1550,2022:1714,2023:2055,2024:1819,2025:1994 } },
  geneva: { girl:{ 2020:1439,2021:1594,2022:1494,2023:1540,2024:1604,2025:1660 } },
  gwyneth: { girl:{ 2020:1444,2021:1444,2022:1472,2023:1897,2024:1791,2025:1774 } },
  lindsay: { girl:{ 2020:1658,2021:1453,2022:1767,2023:2081,2024:1991,2025:2199 } },
  shirley: { girl:{ 2020:1546,2021:1887,2022:1584,2023:1538,2024:1453,2025:1581 } },
  calista: { girl:{ 2020:1944,2021:1522,2022:1804,2023:1720,2024:1455,2025:1599 } },
  nadine: { girl:{ 2020:1455,2021:1634,2022:1480,2023:1500,2024:1583,2025:1625 } },
  avalon: { girl:{ 2020:1666,2021:1665,2022:1611,2023:1789,2024:1612,2025:1465 } },
  louella: { girl:{ 2020:2558,2021:2197,2022:1733,2023:1528,2024:1468,2025:1469 } },
  larissa: { girl:{ 2020:1734,2021:1509,2022:1567,2023:1476,2024:1610,2025:1648 } },
  marcela: { girl:{ 2020:1854,2021:1625,2022:1786,2023:1495,2024:1477,2025:1554 } },
  audra: { girl:{ 2020:1607,2021:1490,2022:1939,2023:1861,2024:1938,2025:2015 } },
  anora: { girl:{ 2020:2253,2021:2101,2022:2923,2023:2268,2024:2383,2025:1491 } },
  carlie: { girl:{ 2020:1492,2021:1939,2022:2417,2023:2548,2024:2527,2025:2678 } },
  roma: { girl:{ 2020:2526,2021:2252,2022:2143,2023:1693,2024:1683,2025:1496 } },
  yelena: { girl:{ 2020:4552,2021:2751,2022:1498,2023:2495,2024:2492,2025:1796 } },
  nicolette: { girl:{ 2020:1679,2021:1499,2022:1594,2023:1851,2024:2016,2025:1724 } },
  vivianne: { girl:{ 2020:1623,2021:1506,2022:1793,2023:2107,2024:1530,2025:1769 } },
  lula: { girl:{ 2020:1724,2021:1508,2022:1963,2023:1831,2024:1944,2025:1931 } },
  emme: { girl:{ 2020:1612,2021:1513,2022:1788,2023:2281,2024:2340,2025:2291 } },
  evalina: { girl:{ 2020:2000,2021:2080,2022:1822,2023:1706,2024:1716,2025:1517 } },
  hellen: { girl:{ 2020:2207,2021:2403,2022:2167,2023:1518,2024:1642,2025:1803 } },
  lotus: { girl:{ 2020:2121,2021:1518,2022:1766,2023:1529,2024:1651,2025:1824 } },
  elly: { girl:{ 2020:1520,2021:1758,2022:1572,2023:1798,2024:1738,2025:1619 } },
  liza: { girl:{ 2020:1733,2021:1525,2022:1747,2023:1650,2024:1804,2025:1646 } },
  eloisa: { girl:{ 2020:2332,2021:1937,2022:2015,2023:1856,2024:1627,2025:1529 } },
  cindy: { girl:{ 2020:1530,2021:1787,2022:1948,2023:1624,2024:1662,2025:1939 } },
  agatha: { girl:{ 2020:2133,2021:1543,2022:1781,2023:1678,2024:1621,2025:1709 } },
  annabeth: { girl:{ 2020:1551,2021:1735,2022:2122,2023:2206,2024:1869,2025:2096 } },
  camellia: { girl:{ 2020:1685,2021:1747,2022:1989,2023:1732,2024:1551,2025:1680 } },
  millicent: { girl:{ 2020:1929,2021:1555,2022:1921,2023:1782,2024:1617,2025:1897 } },
  arlene: { girl:{ 2020:1577,2021:1778,2022:1753,2023:1808,2024:1809,2025:1641 } },
  judy: { girl:{ 2020:1581,2021:1690,2022:1715,2023:1621,2024:1653,2025:1877 } },
  lois: { girl:{ 2020:1843,2021:1724,2022:1685,2023:1589,2024:1688,2025:1668 } },
  geraldine: { girl:{ 2020:1954,2021:1593,2022:1615,2023:1598,2024:2003,2025:2448 } },
  sheila: { girl:{ 2020:1595,2021:1768,2022:1661,2023:1937,2024:2012,2025:2649 } },
  maura: { girl:{ 2020:1600,2021:2109,2022:1765,2023:1991,2024:1815,2025:1633 } },
  yvette: { girl:{ 2020:1729,2021:1631,2022:1670,2023:1813,2024:1613,2025:1622 } },
  coral: { girl:{ 2020:1621,2021:1618,2022:1780,2023:1902,2024:1909,2025:1937 } },
  edie: { girl:{ 2020:1629,2021:1678,2022:1750,2023:1665,2024:1750,2025:2070 } },
  marin: { girl:{ 2020:1785,2021:1635,2022:1860,2023:1883,2024:1900,2025:2043 } },
  moira: { girl:{ 2020:1797,2021:1668,2022:2050,2023:1781,2024:1899,2025:2039 } },
  taryn: { girl:{ 2020:1668,2021:2156,2022:2209,2023:2316,2024:2510,2025:3398 } },
  pamela: { girl:{ 2020:1671,2021:1804,2022:2036,2023:1938,2024:2158,2025:2243 } },
  kinsey: { girl:{ 2020:1819,2021:2014,2022:1680,2023:1925,2024:2399,2025:3080 } },
  delta: { girl:{ 2020:1714,2021:1895,2022:2682,2023:1899,2024:2277,2025:2342 } },
  charlene: { girl:{ 2020:1715,2021:1790,2022:1842,2023:1944,2024:1770,2025:1955 } },
  elvira: { girl:{ 2020:2571,2021:2835,2022:2597,2023:2345,2024:2261,2025:1715 } },
  regan: { girl:{ 2020:1723,2021:1742,2022:1720,2023:2355,2024:2348,2025:2278 } },
  honor: { girl:{ 2020:1984,2021:1757,2022:1735,2023:1978,2024:2107,2025:2406 } },
  arabelle: { girl:{ 2020:1957,2021:2383,2022:2119,2023:1746,2024:2148,2025:2049 } },
  senna: { girl:{ 2020:4016,2021:2787,2022:2071,2023:1878,2024:1983,2025:1747 } },
  pippa: { girl:{ 2020:2007,2021:1769,2022:1932,2023:2500,2024:2467,2025:1857 } },
  deanna: { girl:{ 2020:1778,2021:1918,2022:2017,2023:2060,2024:2315,2025:2191 } },
  yvonne: { girl:{ 2020:1728,2021:2345,2022:2193,2023:2177,2024:2303,2025:2051 } },
  milly: { girl:{ 2020:1877,2021:1730,2022:1777,2023:1830,2024:1802,2025:1782 } },
  tamara: { girl:{ 2020:1831,2021:1871,2022:1731,2023:1837,2024:1756,2025:1809 } },
  danika: { girl:{ 2020:1737,2021:1775,2022:1789,2023:2188,2024:2356,2025:2555 } },
  abbie: { girl:{ 2020:2099,2021:1970,2022:2318,2023:2141,2024:1629,2025:1665 } },
  toni: { girl:{ 2020:1632,2021:1667,2022:1961,2023:1947,2024:2152,2025:2257 } },
  lindy: { girl:{ 2020:2424,2021:2111,2022:2163,2023:1970,2024:1930,2025:1592 } },
  marielle: { girl:{ 2020:1765,2021:2158,2022:2394,2023:2052,2024:1746,2025:1695 } },
  annaliese: { girl:{ 2020:1702,2021:1779,2022:2273,2023:2822,2024:1940,2025:2073 } },
  bree: { girl:{ 2020:1789,2021:1709,2022:2030,2023:2266,2024:2503,2025:2854 } },
  karoline: { girl:{ 2020:2427,2021:2140,2022:2244,2023:2250,2024:1945,2025:1712 } },
  jacquelyn: { girl:{ 2020:1711,2021:1824,2022:1892,2023:2099,2024:2270,2025:2287 } },
  jaclyn: { girl:{ 2020:1718,2021:1891,2022:2202,2023:2364,2024:2737,2025:2809 } },
  shannon: { girl:{ 2020:1950,2021:1699,2022:1858,2023:2035,2024:1870,2025:2391 } },
  caitlin: { girl:{ 2020:1805,2021:2207,2022:2206,2023:2311,2024:1694,2025:2346 } },
  oriana: { girl:{ 2020:2199,2021:1585,2022:1832,2023:1586,2024:1843,2025:1781 } },
  klara: { girl:{ 2020:1754,2021:1875,2022:1568,2023:1832,2024:1845,2025:1799 } },
  irina: { girl:{ 2020:1940,2021:1999,2022:1749,2023:1597,2024:1564,2025:1637 } },
  sedona: { girl:{ 2020:2035,2021:2026,2022:1641,2023:1738,2024:1712,2025:1587 } },
  aviva: { girl:{ 2020:1826,2021:1651,2022:1706,2023:1916,2024:1808,2025:1601 } },
  lenna: { girl:{ 2020:1772,2021:1960,2022:1955,2023:1955,2024:1601,2025:1765 } },
  catarina: { girl:{ 2020:2110,2021:2128,2022:2096,2023:1745,2024:1910,2025:1900 } },
  kelsie: { girl:{ 2020:1865,2021:1915,2022:1665,2023:1804,2024:2308,2025:2246 } },
  carley: { girl:{ 2020:1825,2021:1695,2022:2204,2023:2785,2024:3070,2025:2744 } },
  eris: { girl:{ 2020:1814,2021:1691,2022:1632,2023:1594,2024:1644,2025:1629 } },
  iva: { girl:{ 2020:1866,2021:1670,2022:1797,2023:2012,2024:2195,2025:1739 } },
  elana: { girl:{ 2020:1824,2021:1692,2022:1802,2023:2047,2024:1879,2025:1988 } },
  elin: { girl:{ 2020:1583,2021:1582,2022:2138,2023:2429,2024:2553,2025:3089 } },
  cori: { girl:{ 2020:1837,2021:1567,2022:1823,2023:1821,2024:1777,2025:1936 } },
  gina: { girl:{ 2020:1611,2021:1877,2022:1986,2023:1770,2024:2023,2025:2089 } },
  dolly: { girl:{ 2020:2732,2021:2169,2022:1817,2023:1623,2024:1634,2025:1791 } },
  rosemarie: { girl:{ 2020:1895,2021:1623,2022:1782,2023:1838,2024:1841,2025:1759 } },
  donna: { girl:{ 2020:1550,2021:1893,2022:1958,2023:1997,2024:1935,2025:1977 } },
  cosette: { girl:{ 2020:1871,2021:1967,2022:2003,2023:1887,2024:1908,2025:1792 } },
  mindy: { girl:{ 2020:2119,2021:2389,2022:2329,2023:1793,2024:1988,2025:2395 } },
  darlene: { girl:{ 2020:1803,2021:1920,2022:1881,2023:1857,2024:1794,2025:1851 } },
  sonya: { girl:{ 2020:1794,2021:1972,2022:1794,2023:1865,2024:1913,2025:1929 } },
  daria: { girl:{ 2020:1904,2021:2020,2022:1803,2023:1915,2024:1962,2025:1863 } },
  anabelle: { girl:{ 2020:1806,2021:1942,2022:2460,2023:2585,2024:2795,2025:2994 } },
  lela: { girl:{ 2020:1811,2021:1822,2022:1964,2023:2146,2024:2211,2025:2380 } },
  philomena: { girl:{ 2020:2118,2021:2349,2022:2257,2023:2295,2024:1813,2025:1917 } },
  melodie: { girl:{ 2020:2039,2021:2647,2022:2448,2023:2218,2024:1814,2025:2020 } },
  kiley: { girl:{ 2020:1820,2021:2313,2022:2588,2023:2808,2024:2909,2025:2801 } },
  karissa: { girl:{ 2020:1821,2021:2400,2022:2497,2023:2743,2024:2620,2025:2912 } },
  marianne: { girl:{ 2020:2057,2021:2590,2022:2075,2023:1908,2024:2121,2025:1822 } },
  avril: { girl:{ 2020:1839,2021:1881,2022:1843,2023:1824,2024:1867,2025:1853 } },
  lanie: { girl:{ 2020:1886,2021:1962,2022:2077,2023:2182,2024:1830,2025:2225 } },
  roxana: { girl:{ 2020:1833,2021:1993,2022:2049,2023:2157,2024:2082,2025:2355 } },
  josette: { girl:{ 2020:2382,2021:2032,2022:2078,2023:2304,2024:2225,2025:1840 } },
  francine: { girl:{ 2020:2673,2021:2379,2022:2382,2023:2280,2024:2062,2025:1848 } },
  melinda: { girl:{ 2020:1852,2021:2063,2022:2260,2023:2113,2024:2103,2025:1985 } },
  sabine: { girl:{ 2020:2525,2021:2368,2022:2105,2023:2198,2024:1856,2025:2140 } },
  ilana: { girl:{ 2020:2229,2021:1859,2022:2219,2023:2279,2024:2449,2025:2502 } },
  malina: { girl:{ 2020:1952,2021:1862,2022:2109,2023:2163,2024:2209,2025:2158 } },
  blanca: { girl:{ 2020:1890,2021:2042,2022:1897,2023:1931,2024:1894,2025:1864 } },
  dawn: { girl:{ 2020:2189,2021:2019,2022:1970,2023:2347,2024:1864,2025:2192 } },
  diane: { girl:{ 2020:2368,2021:1866,2022:2250,2023:2845,2024:2262,2025:2631 } },
  vallie: { girl:{ 2020:8000,2021:6978,2022:6241,2023:2616,2024:2508,2025:1872 } },
  theadora: { girl:{ 2020:2469,2021:2103,2022:2208,2023:2382,2024:1886,2025:2155 } },
  ofelia: { girl:{ 2020:2144,2021:2060,2022:2258,2023:2594,2024:1897,2025:2143 } },
  rena: { girl:{ 2020:1910,2021:2348,2022:2446,2023:2037,2024:2666,2025:2394 } },
  susie: { girl:{ 2020:2081,2021:2215,2022:2231,2023:2178,2024:2329,2025:1915 } },
  carol: { girl:{ 2020:1920,2021:2170,2022:2293,2023:2432,2024:2655,2025:2252 } },
  ellory: { girl:{ 2020:3436,2021:3139,2022:2914,2023:2308,2024:1920,2025:2339 } },
  berkeley: { girl:{ 2020:1922,2021:2129,2022:2343,2023:2283,2024:2409,2025:2508 } },
  janet: { girl:{ 2020:2016,2021:2077,2022:1924,2023:2025,2024:2447,2025:2808 } },
  mona: { girl:{ 2020:1927,2021:1994,2022:2162,2023:2112,2024:2206,2025:2793 } },
  siobhan: { girl:{ 2020:2633,2021:1958,2022:2232,2023:1936,2024:1927,2025:2078 } },
  edna: { girl:{ 2020:2092,2021:2096,2022:2139,2023:1929,2024:2048,2025:2479 } },
  analise: { girl:{ 2020:1946,2021:1941,2022:2067,2023:2207,2024:2133,2025:2296 } },
  tina: { girl:{ 2020:2156,2021:2233,2022:2859,2023:1948,2024:2639,2025:2784 } },
  lenore: { girl:{ 2020:3622,2021:2444,2022:2410,2023:2502,2024:2019,2025:1971 } },
  norma: { girl:{ 2020:2344,2021:1973,2022:2144,2023:2179,2024:2563,2025:2006 } },
  sabina: { girl:{ 2020:2321,2021:2462,2022:2323,2023:1987,2024:2514,2025:2567 } },
  janice: { girl:{ 2020:1961,2021:2165,2022:2135,2023:2011,2024:2258,2025:2533 } },
  susana: { girl:{ 2020:2172,2021:2311,2022:1962,2023:2245,2024:2330,2025:2240 } },
  eleonora: { girl:{ 2020:3125,2021:3026,2022:3745,2023:3169,2024:2578,2025:2013 } },
  manuela: { girl:{ 2020:2009,2021:2371,2022:2237,2023:2475,2024:2086,2025:2573 } },
  laina: { girl:{ 2020:2379,2021:2492,2022:2132,2023:2009,2024:2268,2025:2425 } },
  astoria: { girl:{ 2020:3834,2021:3727,2022:3641,2023:2581,2024:2009,2025:2236 } },
  ileana: { girl:{ 2020:2185,2021:2244,2022:2014,2023:2169,2024:2404,2025:3197 } },
  merida: { girl:{ 2020:2038,2021:2107,2022:2330,2023:2655,2024:2444,2025:2658 } },
  anissa: { girl:{ 2020:2033,2021:2325,2022:2573,2023:2551,2024:2688,2025:3095 } },
  gigi: { girl:{ 2020:2491,2021:2259,2022:2058,2023:2844,2024:2574,2025:2849 } },
  keely: { girl:{ 2020:2563,2021:2448,2022:2183,2023:2661,2024:2058,2025:2732 } },
  marta: { girl:{ 2020:2557,2021:2618,2022:2351,2023:2802,2024:2120,2025:2058 } },
  marla: { girl:{ 2020:2531,2021:2391,2022:2331,2023:2161,2024:2333,2025:2059 } },
  carissa: { girl:{ 2020:2061,2021:2503,2022:3269,2023:2967,2024:3506,2025:3381 } },
  denali: { girl:{ 2020:2461,2021:2149,2022:2062,2023:2372,2024:2110,2025:2341 } },
  bobbie: { girl:{ 2020:3598,2021:2780,2022:2987,2023:2578,2024:2683,2025:2072 } },
  betsy: { girl:{ 2020:2073,2021:2600,2022:2223,2023:2374,2024:2429,2025:2745 } },
  leanne: { girl:{ 2020:2087,2021:2516,2022:2334,2023:2503,2024:2705,2025:2495 } },
  adelia: { girl:{ 2020:2195,2021:2459,2022:2423,2023:2208,2024:2098,2025:2138 } },
  dianna: { girl:{ 2020:2210,2021:2098,2022:2249,2023:2309,2024:2485,2025:2580 } },
  effie: { girl:{ 2020:2700,2021:2248,2022:2482,2023:2117,2024:2484,2025:2249 } },
  leana: { girl:{ 2020:2306,2021:2865,2022:2471,2023:2449,2024:2122,2025:2423 } },
  janna: { girl:{ 2020:2307,2021:2547,2022:2396,2023:2540,2024:2123,2025:2204 } },
  zena: { girl:{ 2020:2170,2021:2214,2022:2123,2023:2176,2024:2265,2025:2438 } },
  terra: { girl:{ 2020:2217,2021:2310,2022:2175,2023:2124,2024:2509,2025:2413 } },
  jean: { girl:{ 2020:2358,2021:2242,2022:2476,2023:2628,2024:2421,2025:2125 } },
  linley: { girl:{ 2020:2612,2021:2125,2022:2352,2023:2300,2024:2868,2025:3185 } },
  afton: { girl:{ 2020:2134,2021:2714,2022:3072,2023:3327,2024:3693,2025:3574 } },
  henrietta: { girl:{ 2020:2429,2021:2201,2022:2288,2023:2998,2024:2140,2025:2669 } },
  bea: { girl:{ 2020:3169,2021:3065,2022:2751,2023:2513,2024:2146,2025:2234 } },
  katy: { girl:{ 2020:2203,2021:2162,2022:2215,2023:2147,2024:2476,2025:2700 } },
  karly: { girl:{ 2020:2149,2021:2568,2022:2336,2023:2571,2024:2571,2025:2620 } },
  annalisa: { girl:{ 2020:2154,2021:2209,2022:2442,2023:2640,2024:2431,2025:2539 } },
  jackie: { girl:{ 2020:2308,2021:2375,2022:2434,2023:2306,2024:2292,2025:2162 } },
  marnie: { girl:{ 2020:4115,2021:3048,2022:2449,2023:2690,2024:2498,2025:2180 } },
  kathy: { girl:{ 2020:2182,2021:2474,2022:2432,2023:2840,2024:2707,2025:3270 } },
  polly: { girl:{ 2020:2979,2021:2720,2022:2585,2023:2651,2024:2187,2025:2305 } },
  carrie: { girl:{ 2020:2190,2021:2362,2022:2600,2023:2608,2024:3035,2025:2743 } },
  posie: { girl:{ 2020:2527,2021:2190,2022:2584,2023:2216,2024:3088,2025:2656 } },
  olympia: { girl:{ 2020:2476,2021:2333,2022:2518,2023:2593,2024:2469,2025:2197 } },
  oona: { girl:{ 2020:2324,2021:2255,2022:2235,2023:2217,2024:2468,2025:2760 } },
  rosanna: { girl:{ 2020:2752,2021:2718,2022:2325,2023:2732,2024:2231,2025:2903 } },
  acacia: { girl:{ 2020:2240,2021:2673,2022:2577,2023:2851,2024:2748,2025:2513 } },
  chesney: { girl:{ 2020:2702,2021:2249,2022:2358,2023:2668,2024:3007,2025:2814 } },
  kayley: { girl:{ 2020:2249,2021:2727,2022:2522,2023:2990,2024:3245,2025:3418 } },
  collette: { girl:{ 2020:2735,2021:2501,2022:2440,2023:2547,2024:2717,2025:2251 } },
  colleen: { girl:{ 2020:2624,2021:2663,2022:2849,2023:2255,2024:2813,2025:2851 } },
  lynn: { girl:{ 2020:2261,2021:2566,2022:3046,2023:3155,2024:2805,2025:2547 } },
  dora: { girl:{ 2020:2410,2021:2262,2022:2528,2023:2606,2024:2602,2025:2408 } },
  jensen: { girl:{ 2020:2670,2021:2374,2022:2475,2023:2538,2024:3156,2025:2265 } },
  kourtney: { girl:{ 2020:2265,2021:2868,2022:3095,2023:3161,2024:3491,2025:4503 } },
  charlette: { girl:{ 2020:2273,2021:2735,2022:2457,2023:2883,2024:3008,2025:2480 } },
  rosella: { girl:{ 2020:2636,2021:2685,2022:3003,2023:2273,2024:2305,2025:2332 } },
  lynette: { girl:{ 2020:2281,2021:2514,2022:2694,2023:2566,2024:2732,2025:2618 } },
  leonie: { girl:{ 2020:2643,2021:3014,2022:3012,2023:3106,2024:2446,2025:2282 } },
  alethea: { girl:{ 2020:2710,2021:2283,2022:2344,2023:2441,2024:2693,2025:3064 } },
  haylie: { girl:{ 2020:2283,2021:2523,2022:2839,2023:4417,2024:3862,2025:3942 } },
  gladys: { girl:{ 2020:2285,2021:2774,2022:2699,2023:2815,2024:3501,2025:3235 } },
  gisele: { girl:{ 2020:2286,2021:2405,2022:2700,2023:2843,2024:2840,2025:3085 } },
  timber: { girl:{ 2020:3096,2021:2288,2022:2792,2023:2826,2024:3466,2025:3722 } },
  avonlea: { girl:{ 2020:2295,2021:2742,2022:2685,2023:3378,2024:3450,2025:3022 } },
  mirabelle: { girl:{ 2020:2345,2021:2491,2022:2145,2023:2199,2024:2350,2025:2245 } },
  minerva: { girl:{ 2020:2503,2021:2218,2022:2259,2023:2079,2024:2443,2025:2103 } },
  lizzie: { girl:{ 2020:2587,2021:2240,2022:2450,2023:2053,2024:2334,2025:2146 } },
  doris: { girl:{ 2020:2389,2021:2432,2022:2203,2023:2371,2024:2215,2025:2918 } },
  bridgette: { girl:{ 2020:2312,2021:2632,2022:2222,2023:2348,2024:2242,2025:2130 } },
  nella: { girl:{ 2020:2586,2021:2466,2022:2302,2023:2798,2024:2781,2025:2828 } },
  joanne: { girl:{ 2020:2428,2021:2521,2022:2305,2023:2537,2024:2594,2025:2621 } },
  ottilie: { girl:{ 2020:6139,2021:5123,2022:4226,2023:2591,2024:2306,2025:2938 } },
  sonja: { girl:{ 2020:2320,2021:2561,2022:3769,2023:2679,2024:2930,2025:3911 } },
  hollie: { girl:{ 2020:2329,2021:2496,2022:2505,2023:2454,2024:3029,2025:2846 } },
  hillary: { girl:{ 2020:3080,2021:2832,2022:2478,2023:2486,2024:2338,2025:2597 } },
  kendal: { girl:{ 2020:2353,2021:2567,2022:2648,2023:3025,2024:3603,2025:3268 } },
  joana: { girl:{ 2020:2357,2021:2699,2022:2542,2023:2770,2024:2595,2025:2593 } },
  elody: { girl:{ 2020:5802,2021:4671,2022:5741,2023:5900,2024:2526,2025:2360 } },
  brie: { girl:{ 2020:2517,2021:2364,2022:3522,2023:3266,2024:4754,2025:4337 } },
  tamar: { girl:{ 2020:2781,2021:2609,2022:2514,2023:2517,2024:2366,2025:2440 } },
  solenne: { girl:{ 2020:null,2021:null,2022:8613,2023:6707,2024:4217,2025:2372 } },
  abbey: { girl:{ 2020:2375,2021:3489,2022:4107,2023:6407,2024:5797,2025:5914 } },
  emeline: { girl:{ 2020:2570,2021:2451,2022:2657,2023:2916,2024:2378,2025:2769 } },
  brigitte: { girl:{ 2020:3002,2021:2738,2022:3307,2023:2928,2024:2380,2025:2889 } },
  xenia: { girl:{ 2020:2967,2021:3071,2022:2425,2023:2381,2024:3338,2025:2896 } },
  annalie: { girl:{ 2020:3775,2021:3246,2022:3760,2023:2672,2024:2384,2025:2682 } },
  ara: { girl:{ 2020:2963,2021:2412,2022:2386,2023:3176,2024:3169,2025:3289 } },
  suzanne: { girl:{ 2020:3503,2021:3042,2022:2998,2023:2678,2024:2538,2025:2389 } },
  jeanette: { girl:{ 2020:2564,2021:2572,2022:2543,2023:2772,2024:2785,2025:2405 } },
  mirabella: { girl:{ 2020:3068,2021:3453,2022:2408,2023:2473,2024:2496,2025:2614 } },
  iona: { girl:{ 2020:3077,2021:2627,2022:2412,2023:2994,2024:2786,2025:2668 } },
  adella: { girl:{ 2020:2522,2021:2483,2022:2688,2023:2414,2024:2796,2025:2643 } },
  teddi: { girl:{ 2020:3225,2021:3163,2022:2554,2023:3143,2024:2537,2025:2414 } },
  marlena: { girl:{ 2020:2422,2021:2975,2022:2617,2023:3067,2024:3534,2025:2971 } },
  brigid: { girl:{ 2020:2436,2021:3425,2022:2985,2023:2636,2024:2682,2025:2815 } },
  ami: { girl:{ 2020:3331,2021:2815,2022:2926,2023:2438,2024:2970,2025:4750 } },
  aleksandra: { girl:{ 2020:2440,2021:2458,2022:3467,2023:3582,2024:3392,2025:3340 } },
  rorie: { girl:{ 2020:3353,2021:2901,2022:3183,2023:2564,2024:2899,2025:2443 } },
  mable: { girl:{ 2020:3365,2021:3266,2022:3433,2023:2805,2024:2474,2025:2445 } },
  minnie: { girl:{ 2020:2445,2021:2722,2022:3008,2023:3241,2024:2703,2025:3034 } },
  avelina: { girl:{ 2020:3910,2021:3241,2022:3117,2023:2971,2024:3267,2025:2453 } },
  amaryllis: { girl:{ 2020:2656,2021:2557,2022:2575,2023:2461,2024:2720,2025:2456 } },
  annemarie: { girl:{ 2020:2885,2021:2529,2022:3310,2023:2726,2024:2457,2025:2955 } },
  alyse: { girl:{ 2020:2521,2021:2781,2022:2891,2023:2462,2024:2926,2025:3063 } },
  randi: { girl:{ 2020:3064,2021:2464,2022:2900,2023:3285,2024:3053,2025:4184 } },
  roxy: { girl:{ 2020:3351,2021:2643,2022:3002,2023:2979,2024:3130,2025:2465 } },
  antoinette: { girl:{ 2020:2467,2021:2603,2022:2817,2023:3217,2024:2923,2025:3023 } },
  imogene: { girl:{ 2020:2647,2021:2731,2022:2502,2023:2911,2024:2478,2025:2534 } },
  lora: { girl:{ 2020:2480,2021:3267,2022:3093,2023:3294,2024:3538,2025:2911 } },
  kirsten: { girl:{ 2020:2483,2021:2943,2022:2737,2023:4072,2024:3149,2025:2839 } },
  aster: { girl:{ 2020:3172,2021:2602,2022:2485,2023:3321,2024:2745,2025:2954 } },
  arlie: { girl:{ 2020:3993,2021:4074,2022:2888,2023:2489,2024:2794,2025:2818 } },
  jayne: { girl:{ 2020:2565,2021:3190,2022:2500,2023:2715,2024:2675,2025:2843 } },
  lili: { girl:{ 2020:3028,2021:3013,2022:2620,2023:2501,2024:2991,2025:2799 } },
  adria: { girl:{ 2020:2578,2021:2782,2022:2509,2023:2673,2024:3080,2025:3065 } },
  irma: { girl:{ 2020:2512,2021:2830,2022:2544,2023:2601,2024:2599,2025:3196 } },
  charis: { girl:{ 2020:2515,2021:2882,2022:2880,2023:3173,2024:2850,2025:3159 } },
  winnifred: { girl:{ 2020:3061,2021:3216,2022:2605,2023:2757,2024:2750,2025:2515 } },
  candace: { girl:{ 2020:2516,2021:2704,2022:2659,2023:3086,2024:3678,2025:3204 } },
  aveline: { girl:{ 2020:2520,2021:2552,2022:3163,2023:3421,2024:3508,2025:2604 } },
  lou: { girl:{ 2020:3516,2021:3052,2022:2775,2023:2567,2024:2519,2025:2661 } },
  neva: { girl:{ 2020:2529,2021:2756,2022:2729,2023:2684,2024:3716,2025:3304 } },
  marisa: { girl:{ 2020:2532,2021:3755,2022:3987,2023:3490,2024:3915,2025:5158 } },
  sparrow: { girl:{ 2020:2939,2021:2535,2022:2795,2023:2831,2024:3401,2025:4081 } },
  fannie: { girl:{ 2020:2537,2021:2879,2022:2701,2023:3115,2024:3614,2025:3374 } },
  novella: { girl:{ 2020:3294,2021:3171,2022:2904,2023:2707,2024:3530,2025:2546 } },
  abella: { girl:{ 2020:2548,2021:3433,2022:3218,2023:5547,2024:5796,2025:8859 } },
  lennie: { girl:{ 2020:5750,2021:5643,2022:4515,2023:2658,2024:3146,2025:2548 } },
  tanya: { girl:{ 2020:2549,2021:3558,2022:2794,2023:3280,2024:3398,2025:3724 } },
  avie: { girl:{ 2020:2706,2021:2839,2022:3066,2023:2550,2024:3011,2025:3242 } },
  eviana: { girl:{ 2020:2916,2021:3418,2022:3206,2023:3001,2024:2841,2025:2407 } },
  kelsea: { girl:{ 2020:2402,2021:3019,2022:2936,2023:3671,2024:3926,2025:3865 } },
  lacie: { girl:{ 2020:2508,2021:2424,2022:2868,2023:3360,2024:2993,2025:2402 } },
  morrigan: { girl:{ 2020:3467,2021:3829,2022:3087,2023:2565,2024:3718,2025:2727 } },
  evanna: { girl:{ 2020:2569,2021:3599,2022:3022,2023:2665,2024:2916,2025:2740 } },
  astra: { girl:{ 2020:2962,2021:3107,2022:2572,2023:2972,2024:3222,2025:2639 } },
  roxanna: { girl:{ 2020:2585,2021:2900,2022:2668,2023:2896,2024:3232,2025:2824 } },
  wynona: { girl:{ 2020:4653,2021:3158,2022:3127,2023:3711,2024:2586,2025:2779 } },
  wrenna: { girl:{ 2020:5323,2021:4332,2022:5320,2023:4280,2024:2587,2025:3101 } },
  suzanna: { girl:{ 2020:3182,2021:3497,2022:3225,2023:2588,2024:2800,2025:2786 } },
  joella: { girl:{ 2020:2644,2021:2626,2022:2590,2023:3678,2024:3302,2025:3548 } },
  gretel: { girl:{ 2020:3524,2021:3281,2022:2593,2023:3256,2024:3253,2025:3275 } },
  evette: { girl:{ 2020:3317,2021:3097,2022:2595,2023:3514,2024:3107,2025:3051 } },
  aletheia: { girl:{ 2020:2596,2021:2817,2022:3412,2023:3830,2024:2972,2025:2930 } },
  rachael: { girl:{ 2020:2604,2021:3119,2022:3320,2023:2943,2024:3907,2025:5019 } },
  mahalia: { girl:{ 2020:2610,2021:2937,2022:2966,2023:3244,2024:3141,2025:3078 } },
  gretchen: { girl:{ 2020:2620,2021:2804,2022:3157,2023:2696,2024:3500,2025:4324 } },
  maribelle: { girl:{ 2020:3751,2021:4449,2022:3919,2023:2623,2024:3782,2025:4918 } },
  ericka: { girl:{ 2020:2878,2021:3712,2022:3575,2023:3962,2024:3941,2025:2627 } },
  vianna: { girl:{ 2020:2853,2021:2639,2022:2640,2023:2677,2024:2978,2025:2999 } },
  amity: { girl:{ 2020:4348,2021:3929,2022:2818,2023:2641,2024:3075,2025:4059 } },
  neve: { girl:{ 2020:2755,2021:2827,2022:3486,2023:2652,2024:3356,2025:3140 } },
  leyna: { girl:{ 2020:3193,2021:3358,2022:2804,2023:2657,2024:4066,2025:3186 } },
  ellena: { girl:{ 2020:2730,2021:2661,2022:3345,2023:2779,2024:2847,2025:3819 } },
  ciana: { girl:{ 2020:2921,2021:2665,2022:2814,2023:2702,2024:3441,2025:3498 } },
  maris: { girl:{ 2020:2665,2021:3694,2022:3289,2023:3491,2024:3484,2025:3264 } },
  enid: { girl:{ 2020:4613,2021:4224,2022:4866,2023:2666,2024:4633,2025:4620 } },
  carlota: { girl:{ 2020:3444,2021:2837,2022:3268,2023:2669,2024:2814,2025:3699 } },
  roberta: { girl:{ 2020:3614,2021:3304,2022:2669,2023:2704,2024:2756,2025:2790 } },
  golda: { girl:{ 2020:3315,2021:2773,2022:2912,2023:2721,2024:2678,2025:2670 } },
  adalind: { girl:{ 2020:3733,2021:2672,2022:4199,2023:4451,2024:4113,2025:4458 } },
  eleonor: { girl:{ 2020:7118,2021:4797,2022:4449,2023:3612,2024:3213,2025:2676 } },
  berenice: { girl:{ 2020:2678,2021:3378,2022:3754,2023:3625,2024:3810,2025:4851 } },
  una: { girl:{ 2020:2683,2021:3299,2022:2722,2023:3332,2024:2979,2025:3214 } },
  krista: { girl:{ 2020:2693,2021:3271,2022:3094,2023:3301,2024:4610,2025:3677 } },
  roisin: { girl:{ 2020:4385,2021:3117,2022:3907,2023:3053,2024:3578,2025:2693 } },
  kiersten: { girl:{ 2020:2694,2021:2914,2022:4071,2023:3670,2024:3925,2025:4714 } },
  pauline: { girl:{ 2020:3020,2021:3259,2022:2902,2023:2734,2024:3480,2025:2968 } },
  hera: { girl:{ 2020:3119,2021:2876,2022:2946,2023:2961,2024:2767,2025:2739 } },
  anabel: { girl:{ 2020:2742,2021:2889,2022:3361,2023:4993,2024:3634,2025:4346 } },
  cierra: { girl:{ 2020:2920,2021:3865,2022:3581,2023:3692,2024:2920,2025:2742 } },
  allegra: { girl:{ 2020:2745,2021:3549,2022:3411,2023:3090,2024:3819,2025:4062 } },
  marcelina: { girl:{ 2020:4694,2021:3403,2022:3552,2023:2985,2024:2758,2025:2871 } },
  sonora: { girl:{ 2020:3227,2021:3344,2022:2823,2023:2761,2024:2893,2025:3002 } },
  kezia: { girl:{ 2020:2762,2021:3408,2022:2833,2023:2906,2024:3062,2025:2840 } },
  coralee: { girl:{ 2020:2734,2021:3238,2022:4091,2023:3968,2024:4536,2025:4736 } },
  joanie: { girl:{ 2020:4939,2021:3977,2022:3797,2023:3251,2024:3248,2025:2738 } },
  halley: { girl:{ 2020:4038,2021:3987,2022:3398,2023:3310,2024:2739,2025:3556 } },
  essie: { girl:{ 2020:4231,2021:3655,2022:3260,2023:3118,2024:2741,2025:3331 } },
  stacey: { girl:{ 2020:2750,2021:2786,2022:2724,2023:3333,2024:2727,2025:3070 } },
  ginny: { girl:{ 2020:4041,2021:3916,2022:2876,2023:2722,2024:3031,2025:3276 } },
  clarice: { girl:{ 2020:4057,2021:3476,2022:4451,2023:5360,2024:2791,2025:3118 } },
  lexa: { girl:{ 2020:2903,2021:2796,2022:3558,2023:4221,2024:6261,2025:4808 } },
  maelle: { girl:{ 2020:6176,2021:4884,2022:4065,2023:4927,2024:8638,2025:2798 } },
  mirella: { girl:{ 2020:4790,2021:4268,2022:4708,2023:4304,2024:2802,2025:3361 } },
  malorie: { girl:{ 2020:3150,2021:3901,2022:3851,2023:3152,2024:2804,2025:3037 } },
  marcie: { girl:{ 2020:3800,2021:4542,2022:4509,2023:2804,2024:3138,2025:3596 } },
  esmee: { girl:{ 2020:3529,2021:2805,2022:3159,2023:3259,2024:3671,2025:3332 } },
  eugenia: { girl:{ 2020:3123,2021:3369,2022:2977,2023:2881,2024:3803,2025:2812 } },
  becca: { girl:{ 2020:2815,2021:3332,2022:3357,2023:3212,2024:3683,2025:4158 } },
  avelyn: { girl:{ 2020:2816,2021:3291,2022:4561,2023:4037,2024:4030,2025:3705 } },
  twyla: { girl:{ 2020:4464,2021:2894,2022:2821,2023:2892,2024:3766,2025:2959 } },
  trisha: { girl:{ 2020:3179,2021:3493,2022:3479,2023:3530,2024:2822,2025:3464 } },
  rhoda: { girl:{ 2020:3354,2021:2931,2022:3184,2023:3339,2024:2825,2025:3299 } },
  milla: { girl:{ 2020:2827,2021:2908,2022:4136,2023:4059,2024:4234,2025:3794 } },
  maybelle: { girl:{ 2020:3799,2021:3454,2022:2863,2023:3194,2024:4415,2025:2831 } },
  coralie: { girl:{ 2020:2998,2021:2836,2022:3349,2023:4029,2024:3439,2025:2990 } },
  hilda: { girl:{ 2020:3428,2021:3413,2022:2837,2023:2997,2024:3030,2025:3018 } },
  laurie: { girl:{ 2020:3473,2021:3182,2022:3195,2023:3942,2024:3061,2025:2838 } },
  hilary: { girl:{ 2020:5606,2021:6093,2022:3504,2023:2841,2024:4006,2025:5346 } },
  simona: { girl:{ 2020:2855,2021:3625,2022:3970,2023:2977,2024:2895,2025:3466 } },
  rubie: { girl:{ 2020:2858,2021:3563,2022:3777,2023:3485,2024:3351,2025:3990 } },
  tallulah: { girl:{ 2020:1127,2021:1020,2022:997,2023:810,2024:813,2025:939 } },
  justina: { girl:{ 2020:2870,2021:3702,2022:3564,2023:4317,2024:3660,2025:4011 } },
  jessi: { girl:{ 2020:2872,2021:3132,2022:3390,2023:3253,2024:3249,2025:3111 } },
  gizelle: { girl:{ 2020:2876,2021:2878,2022:3258,2023:4327,2024:3801,2025:4421 } },
  calypso: { girl:{ 2020:3653,2021:6649,2022:4882,2023:4096,2024:4023,2025:2888 } },
  vanna: { girl:{ 2020:3284,2021:3556,2022:3368,2023:3586,2024:3765,2025:2897 } },
  odelia: { girl:{ 2020:3861,2021:3823,2022:3912,2023:3595,2024:2902,2025:2969 } },
  polina: { girl:{ 2020:3685,2021:2905,2022:3082,2023:3190,2024:3289,2025:3260 } },
  jenelle: { girl:{ 2020:2909,2021:4122,2022:3936,2023:4709,2024:6793,2025:6229 } },
  jaime: { girl:{ 2020:3035,2021:2917,2022:3568,2023:3414,2024:4620,2025:4131 } },
  cami: { girl:{ 2020:3828,2021:3145,2022:2918,2023:3211,2024:3264,2025:4247 } },
  aly: { girl:{ 2020:3218,2021:3213,2022:2927,2023:3903,2024:3958,2025:3775 } },
  monique: { girl:{ 2020:3184,2021:3507,2022:3237,2023:4212,2024:2938,2025:3360 } },
  melisa: { girl:{ 2020:3468,2021:3082,2022:3189,2023:3064,2024:3056,2025:2939 } },
  livy: { girl:{ 2020:4800,2021:4453,2022:3293,2023:3554,2024:2942,2025:2975 } },
  riva: { girl:{ 2020:4564,2021:4431,2022:4124,2023:2942,2024:3131,2025:3659 } },
  leann: { girl:{ 2020:2945,2021:3517,2022:3724,2023:4697,2024:3788,2025:4204 } },
  lillia: { girl:{ 2020:3753,2021:3315,2022:2969,2023:2953,2024:3145,2025:3011 } },
  brandy: { girl:{ 2020:3325,2021:3609,2022:3583,2023:2969,2024:3265,2025:3094 } },
  leigh: { girl:{ 2020:3804,2021:3516,2022:2971,2023:3941,2024:3417,2025:4501 } },
  olga: { girl:{ 2020:2980,2021:2971,2022:3041,2023:3055,2024:3236,2025:3176 } },
  lorna: { girl:{ 2020:3027,2021:4045,2022:3789,2023:3661,2024:3195,2025:2974 } },
  ilse: { girl:{ 2020:4321,2021:4126,2022:2976,2023:4822,2024:4964,2025:3940 } },
  lavina: { girl:{ 2020:4808,2021:4208,2022:4069,2023:3495,2024:4342,2025:2976 } },
  stefania: { girl:{ 2020:3784,2021:3301,2022:4048,2023:2976,2024:3400,2025:5118 } },
  kierra: { girl:{ 2020:3249,2021:3645,2022:3440,2023:3498,2024:2995,2025:3366 } },
  connie: { girl:{ 2020:2999,2021:3062,2022:3350,2023:3890,2024:3164,2025:3091 } },

};
// Derive the candidate roster + fold candidate features/meanings/popularity into
// the shared maps so an added candidate behaves like any other name.
const CAND = { boy:[], girl:[], unisex:[] };
CANDS.forEach((c) => {
  CAND[c.gender === "u" ? "unisex" : c.gender].push({ id:c.id, name:c.name, nicks:c.nicks });
  FEAT[c.id] = { o:c.o, s:c.s, end:c.end, syl:c.syl, lean:(c.gender === "u" ? "u" : c.gender === "boy" ? "b" : "g") };
  // Fold meaning/popularity in WITHOUT overwriting any curated entry that already
  // exists (e.g. a name that's also in the roster keeps its real history).
  if (MEANING[c.id] == null) MEANING[c.id] = c.m;
  const pop = POP[c.id] || (POP[c.id] = {});
  const ser = CSERIES[c.id] || {};
  if (c.rank.girl !== undefined && !pop.girl) pop.girl = ser.girl || { 2025: c.rank.girl };
  if (c.rank.boy  !== undefined && !pop.boy)  pop.boy  = ser.boy  || { 2025: c.rank.boy };
});
// Stamp nickname-potential (nk) onto every tagged name so the model can use it.
const NICKS_N = {};
[...NAMES.boy, ...NAMES.girl].forEach((n) => { NICKS_N[n.id] = (n.nicks || []).length; });
CANDS.forEach((c) => { NICKS_N[c.id] = (c.nicks || []).length; });
Object.keys(FEAT).forEach((id) => { FEAT[id].nk = NICKS_N[id] ? 1 : 0; });
// id -> display name for candidates (used by the "Passed" list).
const CAND_NAME = {};
[...CAND.boy, ...CAND.girl, ...CAND.unisex].forEach((c) => { CAND_NAME[c.id] = c.name; });

// Most recent known rank for a name/gender (null = not ranked).
function latestRank(id, g) {
  const m = POP[id] && POP[id][g];
  if (!m) return null;
  const ys = Object.keys(m).map(Number).sort((a, b) => b - a);
  for (const y of ys) if (m[y] != null) return m[y];
  return null;
}
// Coarse popularity bucket used as a model feature.
function tierKeyFor(id, g) {
  const r = latestRank(id, g);
  if (r == null) return "rare";
  if (r > 700) return "uncommon";
  if (r > 300) return "rising";
  return "popular";
}
// How much each feature TYPE counts. Origin is deliberately low (Andrew wants to
// branch out from Irish); style + sound high (that's the real "vibe").
const TW = { o:0.3, s:1.4, end:1.0, syl:0.3, lean:0.6, tier:0.7, nick:0.5 };
// Cold-start prior: before there are many votes, lean toward the seed taste
// (surname-names, soft sounds, uncommon, unisex, good nicknames). Fades out by
// ~15 votes as the learned signal takes over.
const PRIOR = { "s:sur":1.2, "s:lyr":1.0, "s:nat":0.4, "s:vin":0.3, "tier:uncommon":1.0, "tier:rare":0.6, "lean:u":0.5, "nick:1":0.5 };

// Score the candidate pool for one voter + gender. Returns [{c, sc, f}] desc.
function suggestNames(data, profile, gender) {
  const pg = data[gender][profile];
  const roster = namesFor(gender, data.custom, data.removed);
  const present = new Set(roster.map((x) => x.id));
  const removed = new Set(data.removed || []);
  const explore = pg.explore || {};
  // Names the voter said "Not for me" — hidden, but NOT trained on (the dislike
  // is usually about the specific name, not its style; see Quinn).
  const dismissed = pg.dismissed || {};
  // Signed, confidence-scaled signal from the mash-up "explore" tallies.
  const exWeight = (id) => {
    const e = explore[id]; if (!e) return 0;
    return Math.max(-5, Math.min(5, e.s || 0)) * Math.min(1, (e.n || 0) / 2);
  };
  // 1. Per-name training weight: roster from Elo/stars/vetoes; explored
  //    candidates from their mash-up signal (this is what widens the model
  //    beyond the narrow roster — reacting to a Norse name teaches all Norse).
  const w = {};
  roster.forEach((nm) => {
    if (!FEAT[nm.id]) return;
    const m = pg.matches[nm.id] || 0;
    const r = pg.ratings[nm.id] ?? START;
    let wt = ((r - START) / 80) * Math.min(1, m / 4);
    if ((pg.vetoed  || []).includes(nm.id)) wt = -4;
    w[nm.id] = wt;
  });
  Object.keys(explore).forEach((id) => { if (FEAT[id] && w[id] == null) w[id] = exWeight(id); });
  // 2. Learn a preference per feature value (shrunk toward 0 when sparse).
  const acc = {};
  const bump = (k, v) => { const a = acc[k] || (acc[k] = { s:0, n:0 }); a.s += v; a.n++; };
  const train = (id) => {
    const f = FEAT[id]; if (!f) return;
    const wt = w[id] || 0;
    bump("o:" + f.o, wt);
    f.s.forEach((t) => bump("s:" + t, wt));
    bump("end:" + f.end, wt);
    bump("syl:" + f.syl, wt);
    bump("lean:" + f.lean, wt);
    bump("tier:" + tierKeyFor(id, gender), wt);
    bump("nick:" + (f.nk ? 1 : 0), wt);
  };
  roster.forEach((nm) => train(nm.id));
  Object.keys(explore).forEach((id) => { if (FEAT[id] && !present.has(id) && !dismissed[id]) train(id); });
  const learned = {};
  Object.keys(acc).forEach((k) => { learned[k] = acc[k].s / (2 + acc[k].n); });
  const alpha = Math.max(0, Math.min(1, 1 - (pg.votes || 0) / 15)); // prior weight
  const P = (k) => (learned[k] || 0) + alpha * (PRIOR[k] || 0);
  const DIRECT = 0.6; // weight on a candidate's OWN mash-up signal
  // 3. Score unseen candidates (skip roster/removed/dismissed, hide "pass both").
  const pool = [...(CAND[gender] || []), ...CAND.unisex];
  return pool
    .filter((c) => FEAT[c.id] && !present.has(c.id) && !removed.has(c.id) && !dismissed[c.id])
    .filter((c) => { const e = explore[c.id]; return !(e && e.s <= -3); })
    .map((c) => {
      const f = FEAT[c.id];
      let sc = TW.o * P("o:" + f.o) + TW.end * P("end:" + f.end) + TW.syl * P("syl:" + f.syl)
             + TW.lean * P("lean:" + f.lean) + TW.tier * P("tier:" + tierKeyFor(c.id, gender))
             + TW.nick * P("nick:" + (f.nk ? 1 : 0));
      f.s.forEach((t) => { sc += TW.s * P("s:" + t); });
      sc += DIRECT * exWeight(c.id);
      return { c, sc, f };
    })
    .sort((a, b) => b.sc - a.sc);
}

// Pick two candidates to compare next in a mash-up: favor names not yet reacted
// to, and pick a second that DIFFERS on a feature axis so the answer is informative.
function pickExplorePair(data, profile, gender, scored) {
  const explore = (data[gender][profile] || {}).explore || {};
  const seen = (id) => (explore[id] ? (explore[id].n || 0) : 0);
  const list = scored.map((x) => x.c).filter((c) => !(explore[c.id] && explore[c.id].s <= -3));
  if (list.length < 2) return null;
  const ranked = [...list].sort((a, b) => (seen(a.id) - seen(b.id)) || (Math.random() - 0.5));
  const a = ranked[0], fa = FEAT[a.id];
  const differs = (c) => { const f = FEAT[c.id]; return f.o !== fa.o || f.end !== fa.end || f.s[0] !== fa.s[0]; };
  const b = ranked.slice(1).find(differs) || ranked[1];
  return [a, b];
}
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
  const slope = (dy, dx) => (dx === 0 ? 0 : dy / dx); // guard equal-% points (would divide by zero)
  if (pct <= pts[0].p) {
    const s = slope(pts[1].r - pts[0].r, pts[1].p - pts[0].p);
    return clamp(pts[0].r + (pct - pts[0].p) * s);
  }
  // Above the range (e.g. a popular merged name): extrapolate down the last segment's slope.
  if (pct >= pts[pts.length - 1].p) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const s = slope(b.r - a.r, b.p - a.p);
    return clamp(b.r + (pct - b.p) * s);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (pct >= pts[i].p && pct <= pts[i + 1].p) {
      const dp = pts[i + 1].p - pts[i].p;
      const t = dp === 0 ? 0 : (pct - pts[i].p) / dp;
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
// Baked-in shared config: anyone opening the app auto-connects, no pasting needed.
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

// User-added nicknames (id -> [nick]). A shared overlay merged onto every name's
// base nicks, so anyone can nickname any name regardless of who added it. Held at
// module scope (like POP/MEANING) and refreshed from data in assemble().
let ADDED_NICKS = {};
// Added nicknames are keyed per gender ("girl:campbell") so a unisex name can carry
// different nicks for each gender. A plain-id key is legacy (gender-agnostic) and is
// merged into both genders for back-compat.
const addedNicksFor = (addnicks, gender, id) => [...((addnicks || {})[gender + ":" + id] || []), ...((addnicks || {})[id] || [])];
const mergeNicks = (n, gender) => {
  const add = addedNicksFor(ADDED_NICKS, gender, n.id);
  if (!add.length) return n;
  const seen = new Set((n.nicks || []).map((x) => x.toLowerCase()));
  const nicks = [...(n.nicks || [])];
  add.forEach((nk) => { const k = nk.toLowerCase(); if (!seen.has(k)) { seen.add(k); nicks.push(nk); } });
  return { ...n, nicks };
};
function namesFor(gender, custom, removed) {
  const baseNames = new Set(NAMES[gender].map((n) => n.name.toLowerCase()));
  const extra = (custom || [])
    .filter((c) => (c.gender === gender || c.gender === "both") && !baseNames.has(c.name.toLowerCase()))
    .map((c) => ({ id: c.id, name: c.name, nicks: c.nicks || [], unisex: c.gender === "both", custom: true, by: c.by, byName: c.byName }));
  const rm = new Set(removed || []);
  return [...NAMES[gender], ...extra].filter((n) => !rm.has(n.id)).map((n) => mergeNicks(n, gender));
}
const findName = (names, id) => names.find((n) => n.id === id) || { id, name: id, nicks: [] };
const coreOf = (pg) => ({ ratings: pg.ratings, matches: pg.matches, votes: pg.votes, vetoed: pg.vetoed, starred: pg.starred, explore: pg.explore || {}, dismissed: pg.dismissed || {} });
const trimHistory = (h) => {
  let a = h.slice(-HISTORY_CAP);
  while (JSON.stringify(a).length > 45000 && a.length > 10) a = a.slice(Math.ceil(a.length * 0.1));
  return a;
};

// Each history entry is a snapshot of (rounded) ratings after a vote. A single vote
// nudges exactly two names by an equal amount: the winner up, the loser down. So we
// can recover the matchup behind every vote by diffing consecutive snapshots (the
// first one is diffed against the START baseline when history is complete). If the
// log was trimmed (oldest snapshots dropped), the first kept row is a fixed baseline
// with no recoverable matchup. Returns one event per history row, oldest-first.
function reconstructPG(pg) {
  const H = (pg && pg.history) || [];
  const trimmed = !(H.length && H[0].m === 1);
  const events = [];
  for (let i = 0; i < H.length; i++) {
    const cur = H[i].r || {};
    let win = null, lose = null;
    const prev = i === 0 ? (H[0].m === 1 ? "START" : null) : (H[i - 1].r || {});
    if (prev) {
      let wd = 0.5, ld = -0.5;
      for (const id in cur) {
        const base = prev === "START" ? START : (id in prev ? prev[id] : null);
        if (base == null) continue;
        const d = cur[id] - base;
        if (d > wd) { wd = d; win = id; }
        if (d < ld) { ld = d; lose = id; }
      }
    }
    events.push({ m: H[i].m, t: H[i].t, win, lose, baseline: i === 0 && trimmed });
  }
  return { events, trimmed };
}

// Friendly "2 min ago" + an absolute stamp, relative to a passed-in now (ms).
function fmtWhen(t, now) {
  if (!t) return { rel: "unknown time", abs: "" };
  const s = Math.max(0, (now - t) / 1000);
  let rel;
  if (s < 60) rel = "just now";
  else if (s < 3600) rel = `${Math.floor(s / 60)} min ago`;
  else if (s < 86400) rel = `${Math.floor(s / 3600)} hr ago`;
  else if (s < 604800) { const n = Math.floor(s / 86400); rel = `${n} day${n > 1 ? "s" : ""} ago`; }
  else { const n = Math.floor(s / 604800); rel = `${n} wk${n > 1 ? "s" : ""} ago`; }
  let abs = "";
  try { abs = new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch {}
  return { rel, abs };
}

function emptyPG(gender, custom) {
  const ratings = {}, matches = {};
  namesFor(gender, custom).forEach((n) => { ratings[n.id] = START; matches[n.id] = 0; });
  return { ratings, matches, votes: 0, vetoed: [], starred: [], history: [], explore: {}, dismissed: {} };
}
function assemble(map) {
  const custom = Array.isArray(map.custom) ? map.custom : [];
  const removed = Array.isArray(map.removed) ? map.removed : [];
  const notes = (map.notes && typeof map.notes === "object") ? map.notes : {};
  const addnicks = (map.addnicks && typeof map.addnicks === "object") ? map.addnicks : {};
  ADDED_NICKS = addnicks; // refresh the module-scope overlay used by namesFor()
  // Roster of voters: the two owners are always present; guests come from the
  // saved "profiles" list (everyone is identified by their first name).
  const saved = Array.isArray(map.profiles) ? map.profiles : [];
  const roster = [], seen = new Set();
  OWNERS.forEach((k) => { roster.push({ key: k, name: OWNER_NAMES[k] }); seen.add(k); });
  saved.forEach((p) => { if (p && p.key && p.name && !seen.has(p.key)) { roster.push({ key: p.key, name: p.name }); seen.add(p.key); } });
  const profiles = {}; roster.forEach((p) => { profiles[p.key] = p.name; });
  const data = { custom, removed, notes, addnicks, roster, profiles, boy: {}, girl: {} };
  ["boy", "girl"].forEach((g) => roster.forEach(({ key: p }) => {
    const core = map[kCore(g, p)] || {};
    const hist = map[kHist(g, p)];
    const pg = {
      ratings: core.ratings || {}, matches: core.matches || {},
      votes: core.votes || 0, vetoed: core.vetoed || [], starred: core.starred || [],
      explore: core.explore || {}, dismissed: core.dismissed || {},
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
// Pick one fresh opponent for a name we're keeping (used when one card is hard-passed):
// favor fewer prior matchups, then a rating near the kept name's.
function pickPartner(names, pg, keepId) {
  const pool = names.filter((n) => n.id !== keepId);
  if (!pool.length) return null;
  const m = (id) => pg.matches[id] || 0;
  const rK = pg.ratings[keepId] ?? START;
  pool.sort((x, y) => (m(x.id) - m(y.id)) || (Math.abs((pg.ratings[x.id] ?? START) - rK) - Math.abs((pg.ratings[y.id] ?? START) - rK)));
  const top = pool.slice(0, Math.min(4, pool.length));
  return top[Math.floor(Math.random() * top.length)].id;
}
const ranksOf = (ratings, names) =>
  [...names].sort((a, b) => (ratings[b.id] ?? START) - (ratings[a.id] ?? START))
    .reduce((o, n, i) => { o[n.id] = i + 1; return o; }, {});

const store = makeStore();

// A quick burst of falling confetti. Pure DOM so it works from any handler;
// respects reduced-motion and cleans itself up.
function fireConfetti(n = 44) {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = document.createElement("div");
    wrap.className = "no-confetti";
    const colors = ["#C9821A", "#566B36", "#B5677B", "#3F6CA3", "#A4663A", "#2E4756", "#E0B23C"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.style.left = (Math.random() * 100) + "vw";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--d", (1.5 + Math.random() * 1.3) + "s");
      p.style.setProperty("--r", (Math.random() * 900 - 200) + "deg");
      p.style.animationDelay = (Math.random() * 0.35) + "s";
      if (i % 3 === 0) p.style.borderRadius = "50%";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3200);
  } catch {}
}
// Transient celebration overlay (couple match, vote milestones). Auto-dismisses.
function Celebrate({ data, onClose }) {
  React.useEffect(() => {
    if (!data) return;
    const t = setTimeout(onClose, data.match ? 2700 : 2200);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line
  if (!data) return null;
  return (
    <div className="no-cele" onClick={onClose}>
      <div>
        <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{data.emoji || "🎉"}</div>
        <div className="disp" style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>{data.title}</div>
        {data.sub && <div style={{ fontFamily: DISPLAY, fontSize: data.match ? 30 : 16, fontWeight: 800, color: C.ochre, marginTop: 6 }}>{data.sub}</div>}
        {data.note && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>{data.note}</div>}
      </div>
    </div>
  );
}

// Bottom toast with an optional Undo action. Auto-dismisses.
function Toast({ data, onClose }) {
  React.useEffect(() => {
    if (!data) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line
  if (!data) return null;
  return (
    <div style={{ position:"fixed", left:0, right:0, bottom:18, display:"flex", justifyContent:"center", zIndex:55, pointerEvents:"none", padding:"0 12px" }}>
      <div style={{ pointerEvents:"auto", display:"flex", alignItems:"center", gap:16, maxWidth:420, background:C.ink, color:C.paper, padding:"10px 16px", borderRadius:999, boxShadow:"0 8px 28px rgba(0,0,0,.28)", fontSize:13 }}>
        <span>{data.msg}</span>
        {data.onUndo && <button onClick={() => { data.onUndo(); onClose(); }} className="lift" style={{ fontWeight:800, color:C.ochre, fontSize:13, textTransform:"uppercase", letterSpacing:"0.04em" }}>Undo</button>}
      </div>
    </div>
  );
}

/* ============================== component ================================ */
function App() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(() => { try { return localStorage.getItem("nameoff_me") || ""; } catch { return ""; } });
  const [voteGender, setVoteGender] = useState("girl"); // gender of the current Vote matchup
  const [blockCount, setBlockCount] = useState(0);       // matchups done in the current gender block
  const [view, setView] = useState("vote");
  const [pair, setPair] = useState(null);
  const [picked, setPicked] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [celebrate, setCelebrate] = useState(null); // transient match/milestone overlay
  const celebrateNow = (payload) => { setCelebrate(payload); fireConfetti(payload.match ? 60 : 44); };
  const [toast, setToast] = useState(null); // bottom toast with optional Undo
  const showToast = (msg, onUndo) => setToast({ msg, onUndo });
  const [undo, setUndo] = useState([]); // in-session stack of reversible matchups (per profile)
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false); // Vote log modal (review & delete past votes)
  const [showSync, setShowSync] = useState(false);
  const [popMode, setPopMode] = useState(() => localStorage.getItem("nameoff_popmode") || "rank");
  const changePopMode = (m) => { setPopMode(m); try { localStorage.setItem("nameoff_popmode", m); } catch {} };
  const [sync, setSync] = useState({ on: store.configured, status: store.configured ? "syncing" : "local", at: null, err: "" });
  const dataRef = useRef(null);
  const savingRef = useRef(false);
  const genRef = useRef(0); // bumps on every local change; lets a background pull skip stale results
  const votingRef = useRef(false); // synchronous re-entry guard so a fast double-input can't double-vote
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
      const gen = genRef.current;
      try {
        const map = await store.getAll();
        // A local change happened while we were fetching, don't clobber it with stale data.
        if (savingRef.current || genRef.current !== gen) return;
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
    savingRef.current = true; genRef.current++;
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
    // A veto is a shared dealbreaker: if either Claire or Andrew vetoed a name in
    // this gender, it's out of voting for everyone (plus the current voter's own).
    const out = new Set([...d[g].claire.vetoed, ...d[g].andrew.vetoed, ...d[g][profile].vetoed]);
    return namesFor(g, d.custom, d.removed).filter((n) => !out.has(n.id));
  };
  const votable = (d, g) => poolFor(d, g).length >= 2;
  // Decide the gender for the NEXT matchup given how many were just completed.
  const advance = (d, curG, completed) => {
    let g = curG, c = completed;
    if (c >= BLOCK) { g = otherG(curG); c = 0; }
    if (!votable(d, g) && votable(d, otherG(g))) { g = otherG(g); c = 0; }
    return { g, c };
  };

  const known = !!(data && data.profiles && data.profiles[profile]); // identity chosen & registered

  useEffect(() => {
    if (!data || !known) return;
    if (pendingPairRef.current) { setPair(pendingPairRef.current); pendingPairRef.current = null; setPicked(null); return; }
    setPair(pickPair(poolFor(data, voteGender), data[voteGender][profile], null));
    setPicked(null);
  }, [data && 1, voteGender, profile, known]); // eslint-disable-line

  // If the starting gender can't field a pair, flip once on load.
  useEffect(() => {
    if (!data || !known) return;
    if (!votable(data, voteGender) && votable(data, otherG(voteGender))) { setVoteGender(otherG(voteGender)); setBlockCount(0); }
  }, [data && 1, known]); // eslint-disable-line

  const pg = known ? data[voteGender][profile] : null;
  const names = data ? namesFor(voteGender, data.custom, data.removed) : [];
  const myVotes = known ? (data.boy[profile].votes + data.girl[profile].votes) : 0;
  const unlocked = myVotes >= UNLOCK_VOTES; // Rankings + Trends gated until you've voted

  const vote = (winId, loseId) => {
    if (picked || votingRef.current) return;
    votingRef.current = true;
    savingRef.current = true; genRef.current++; // arm synchronously so a background sync can't drop this vote
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
      votingRef.current = false;
      // Little milestone celebrations: the 10-vote unlock, then every 25.
      const total = (next.boy[profile].votes || 0) + (next.girl[profile].votes || 0);
      if (total === UNLOCK_VOTES) celebrateNow({ title: "Rankings unlocked!", emoji: "🔓", note: `${total} votes in — Rankings & Trends are open.` });
      else if (total > 0 && total % 25 === 0) celebrateNow({ title: `${total} votes!`, emoji: "🎉", note: "You two are really dialing it in." });
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

  // Remove one specific past vote (any person, any gender) from the Vote log: drop
  // that matchup and replay the rest so ratings, matches, votes & history stay exact.
  const deleteVote = (p, g, m) => {
    const next = clone(dataRef.current);
    const pg = next[g] && next[g][p];
    if (!pg || !pg.history) return;
    const rec = reconstructPG(pg);
    const target = rec.events.find((e) => e.m === m);
    if (!target || target.baseline) return;
    const names = namesFor(g, next.custom);
    const base = {}; names.forEach((n) => { base[n.id] = START; });
    let r, cnt, arr = [], replay;
    if (rec.trimmed) {
      const b = pg.history[0];
      r = { ...base, ...(b.r || {}) }; cnt = b.m; arr = [{ m: b.m, t: b.t, r: b.r }];
      replay = rec.events.filter((e) => !e.baseline && e.m !== m);
    } else {
      r = { ...base }; cnt = 0;
      replay = rec.events.filter((e) => e.m !== m);
    }
    for (const e of replay) {
      if (e.win && e.lose) r = updateElo(r, e.win, e.lose);
      cnt += 1;
      const snap = {}; names.forEach((n) => { snap[n.id] = Math.round(r[n.id] ?? START); });
      arr.push({ m: cnt, t: e.t, r: snap });
    }
    let matches;
    if (!rec.trimmed) {
      matches = {}; names.forEach((n) => { matches[n.id] = 0; });
      for (const e of replay) { if (e.win) matches[e.win] = (matches[e.win] || 0) + 1; if (e.lose) matches[e.lose] = (matches[e.lose] || 0) + 1; }
    } else {
      matches = { ...pg.matches };
      if (target.win) matches[target.win] = Math.max(0, (matches[target.win] || 0) - 1);
      if (target.lose) matches[target.lose] = Math.max(0, (matches[target.lose] || 0) - 1);
    }
    pg.ratings = r; pg.matches = matches; pg.votes = cnt; pg.history = arr;
    dataRef.current = next; setData(next);
    save({ [kCore(g, p)]: coreOf(pg), [kHist(g, p)]: pg.history });
  };

  const vetoCurrent = (id) => {
    const g = voteGender;
    const nm = findName(namesFor(g, dataRef.current.custom, dataRef.current.removed), id).name;
    const next = clone(dataRef.current);
    if (!next[g][profile].vetoed.includes(id)) next[g][profile].vetoed.push(id); // veto is per-gender
    dataRef.current = next; setData(next); setPicked(null);
    save({ [kCore(g, profile)]: coreOf(next[g][profile]) });
    const pool = poolFor(next, g);
    const survivor = pair && pair.find((x) => x !== id);  // keep the other card; swap only the hard-passed one
    if (survivor && pool.some((nn) => nn.id === survivor)) {
      const opp = pickPartner(pool, next[g][profile], survivor);
      if (opp) { const sIdx = pair.indexOf(survivor); const np = [...pair]; np[1 - sIdx] = opp; setPair(np); }
      else setPair(pickPair(pool, next[g][profile], null));
    }
    else if (votable(next, g)) { setPair(pickPair(pool, next[g][profile], null)); }
    else if (votable(next, otherG(g))) { setVoteGender(otherG(g)); setBlockCount(0); }
    else { setPair(null); }
    showToast(`${isOwner(profile) ? "Vetoed" : "Hard-passed"} ${nm}`, () => unveto(g, profile, id));
  };
  const unveto = (g, profileKey, id) => {
    const next = clone(dataRef.current);
    next[g][profileKey].vetoed = next[g][profileKey].vetoed.filter((x) => x !== id);
    dataRef.current = next; setData(next);
    save({ [kCore(g, profileKey)]: coreOf(next[g][profileKey]) });
  };
  // Veto a specific name by id (used from the Rankings list, not the vote pair).
  const vetoName = (g, profileKey, id) => {
    const nm = findName(namesFor(g, dataRef.current.custom, dataRef.current.removed), id).name;
    const next = clone(dataRef.current);
    if (!next[g][profileKey].vetoed.includes(id)) next[g][profileKey].vetoed.push(id);
    dataRef.current = next; setData(next);
    save({ [kCore(g, profileKey)]: coreOf(next[g][profileKey]) });
    showToast(`Vetoed ${nm}`, () => unveto(g, profileKey, id));
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
    const byName = (next.profiles && next.profiles[profile]) || PROFILES[profile] || profile || "";
    next.custom = [...(next.custom || []), { id, name: name.trim(), nicks, gender: g, by: profile, byName }];
    dataRef.current = next; setData(next);
    save({ custom: next.custom });
  };
  // Record the current viewer as the person who added a name (used by the
  // "claim this contribution" button on names whose author wasn't tracked).
  const claimName = (id) => {
    const next = clone(dataRef.current);
    const byName = (next.profiles && next.profiles[profile]) || PROFILES[profile] || profile || "";
    next.custom = (next.custom || []).map((c) => c.id === id ? { ...c, by: profile, byName } : c);
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
  // Anyone can nickname any name (built-in or added), regardless of who added it.
  const addNick = (gender, id, raw) => {
    const nick = (raw || "").trim();
    if (!nick) return;
    const key = gender + ":" + id;
    const next = clone(dataRef.current);
    const an = { ...(next.addnicks || {}) };
    const cur = an[key] ? [...an[key]] : [];
    // Reject a nick already shown for this name+gender (added OR built-in) so it can't make a dead remove-✕ chip.
    const tgt = namesFor(gender, next.custom, next.removed).find((n) => n.id === id);
    const existing = new Set([...cur, ...((tgt && tgt.nicks) || [])].map((x) => x.toLowerCase()));
    if (existing.has(nick.toLowerCase())) return;
    an[key] = [...cur, nick];
    next.addnicks = an; ADDED_NICKS = an;
    dataRef.current = next; setData(next);
    save({ addnicks: an });
  };
  const removeNick = (gender, id, nick) => {
    const next = clone(dataRef.current);
    const an = { ...(next.addnicks || {}) };
    // remove from the gender-specific bucket and the legacy gender-agnostic one
    [gender + ":" + id, id].forEach((k) => {
      if (an[k]) { an[k] = an[k].filter((x) => x.toLowerCase() !== nick.toLowerCase()); if (!an[k].length) delete an[k]; }
    });
    next.addnicks = an; ADDED_NICKS = an;
    dataRef.current = next; setData(next);
    save({ addnicks: an });
  };

  // Record a "For you" mash-up reaction. kind: "a"|"b" (pick winner), "love"
  // (both up), "pass" (both down). Feeds the recommender; not the voting list.
  const reactExplore = (g, ids, kind) => {
    const next = clone(dataRef.current);
    const cur = next[g][profile];
    cur.explore = { ...(cur.explore || {}) };
    const adj = (id, ds) => { const e = cur.explore[id] || { s:0, n:0 }; cur.explore[id] = { s: e.s + ds, n: e.n + 1 }; };
    const [a, b] = ids;
    if (kind === "a") { adj(a, 1.0); adj(b, -0.6); }
    else if (kind === "b") { adj(b, 1.0); adj(a, -0.6); }
    else if (kind === "love") { adj(a, 1.5); adj(b, 1.5); }
    else if (kind === "pass") { adj(a, -1.5); adj(b, -1.5); }
    dataRef.current = next; setData(next);
    save({ [kCore(g, profile)]: coreOf(cur) });
  };
  // "Not for me" on a For-you suggestion: hide the name (does NOT train the
  // style model). reason is optional free text the voter can add later.
  const dismissSuggestion = (g, id, reason) => {
    const next = clone(dataRef.current);
    // Unisex candidates show on both gender tabs, so dismiss them on both.
    const gens = (FEAT[id] && FEAT[id].lean === "u") ? ["boy", "girl"] : [g];
    const updates = {};
    gens.forEach((gg) => {
      const cur = next[gg][profile];
      cur.dismissed = { ...(cur.dismissed || {}) };
      const prev = cur.dismissed[id] || {};
      cur.dismissed[id] = { r: reason != null ? reason : (prev.r || ""), t: prev.t || Date.now() };
      updates[kCore(gg, profile)] = coreOf(cur);
    });
    dataRef.current = next; setData(next);
    save(updates);
  };
  const restoreSuggestion = (g, id) => {
    const next = clone(dataRef.current);
    const gens = (FEAT[id] && FEAT[id].lean === "u") ? ["boy", "girl"] : [g];
    const updates = {};
    gens.forEach((gg) => {
      const cur = next[gg][profile];
      cur.dismissed = { ...(cur.dismissed || {}) };
      delete cur.dismissed[id];
      updates[kCore(gg, profile)] = coreOf(cur);
    });
    dataRef.current = next; setData(next);
    save(updates);
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

  // Drag-reorder your own ranking: set the moved name's rating to sit between its
  // new neighbours (a "nudge" — future votes can still move it). aboveId/belowId
  // are the names it should land between (null = dropped at the very top/bottom).
  const reorderRank = (g, id, aboveId, belowId) => {
    const next = clone(dataRef.current);
    const cur = next[g][profile];
    const rA = aboveId != null ? (cur.ratings[aboveId] ?? START) : null;
    const rB = belowId != null ? (cur.ratings[belowId] ?? START) : null;
    let nr;
    if (rA == null && rB == null) nr = START;
    else if (rA == null) nr = rB + 30;          // dropped at the top
    else if (rB == null) nr = rA - 30;          // dropped at the bottom
    else if (Math.abs(rA - rB) < 2) nr = rB + 1; // neighbours tied (e.g. the unvoted cluster at START): sit just above the lower one so the drop isn't a no-op
    else nr = (rA + rB) / 2;                     // between two names
    cur.ratings[id] = nr;
    if (!cur.matches[id]) cur.matches[id] = 1;   // a manual drop is an opinion, so it counts as "voted" and shows in the combined ranking too
    dataRef.current = next; setData(next);
    save({ [kCore(g, profile)]: coreOf(cur) });
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

  // Identify yourself by first name (remembered on this device). Owners reuse
  // their existing data; anyone new becomes a guest added to the roster.
  const chooseMe = (rawName) => {
    const name = (rawName || "").trim();
    if (!name) return;
    const key = slug(name);
    const next = clone(dataRef.current);
    if (!next.profiles[key]) {
      next.roster = [...next.roster, { key, name }];
      next.profiles = { ...next.profiles, [key]: name };
      ["boy", "girl"].forEach((g) => { if (!next[g][key]) next[g][key] = emptyPG(g, next.custom); });
      dataRef.current = next; setData(next);
      save({ profiles: next.roster });
    }
    try { localStorage.setItem("nameoff_me", key); } catch {}
    setProfile(key);
  };
  const switchMe = () => { try { localStorage.removeItem("nameoff_me"); } catch {} setProfile(""); };
  // Remove a guest profile (owners can't be removed); clears their data everywhere.
  const deleteProfile = (key) => {
    if (isOwner(key)) return;
    const next = clone(dataRef.current);
    next.roster = next.roster.filter((p) => p.key !== key);
    next.profiles = { ...next.profiles }; delete next.profiles[key];
    ["boy", "girl"].forEach((g) => { delete next[g][key]; });
    dataRef.current = next; setData(next);
    save({ profiles: next.roster, [kCore("boy", key)]: null, [kHist("boy", key)]: null, [kCore("girl", key)]: null, [kHist("girl", key)]: null });
    if (profile === key) switchMe();
  };

  if (!data) return <div className="boot" style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:14 }}>Loading your names…</div>;
  if (!known) return <WhoPanel roster={data.roster} onChoose={chooseMe} onDelete={deleteProfile} />;

  return (
    <PopModeCtx.Provider value={popMode}>
    <Celebrate data={celebrate} onClose={() => setCelebrate(null)} />
    <Toast data={toast} onClose={() => setToast(null)} />
    {showLog && <VoteLog data={data} onDelete={deleteVote} onClose={() => setShowLog(false)} />}
    <div className="wrap">
      <Header me={data.profiles[profile]} myColor={pColor(profile)} onSwitch={switchMe}
        showAdd={showAdd} setShowAdd={setShowAdd} onOpenLog={() => setShowLog(true)}
        popMode={popMode} setPopMode={changePopMode} />
      {showAdd && <AddPanel custom={data.custom} onAdd={addName} onRemove={removeCustom} />}
      <Tabs view={view} setView={setView} />

      {view === "vote" && <Vote names={names} gender={voteGender} pair={pair} picked={picked} onVote={vote} onSkip={skip} onVeto={vetoCurrent}
        onBack={goBack} canGoBack={canGoBack} profile={profile}
        addnicks={data.addnicks} onAddNick={addNick} onRemoveNick={removeNick} />}
      {view === "rankings" && (unlocked
        ? <Rankings data={data} profile={profile} onUnveto={unveto} onVeto={vetoName} onClaim={claimName} onAddNick={addNick} onRemoveNick={removeNick} onReorder={reorderRank} notes={data.notes} onSetNote={setNote} />
        : <LockMsg myVotes={myVotes} />)}
      {view === "foryou" && <ForYou data={data} profile={profile} initialGender={voteGender} onAdd={addName} onReact={reactExplore} onDismiss={dismissSuggestion} onRestore={restoreSuggestion} onAddNick={addNick} onRemoveNick={removeNick} />}
      {view === "trends" && (unlocked
        ? <Trends data={data} profile={profile} />
        : <LockMsg myVotes={myVotes} />)}

      {view === "vote" && (
        <div style={{ marginTop: 32, display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:C.muted }}>
          <span>Voting as <b style={{ color:pColor(profile) }}>{PROFILES[profile]}</b> · {voteGender === "boy" ? "boys" : "girls"}</span>
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

/* ----------------------------- vote log ---------------------------------- */
// Every vote each person has cast, newest first, with the recovered matchup and a
// timestamp — so a vote cast by mistake (e.g. while peeking at someone else's tab)
// can be spotted and removed. Deleting recomputes that person's ratings cleanly.
function VoteLog({ data, onDelete, onClose }) {
  const now = Date.now();
  const roster = data.roster || [];
  const nameOf = (g, id) => findName(namesFor(g, data.custom), id).name;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto", zIndex:60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:560, background:C.bg, border:`1px solid ${C.line}`, borderRadius:18, padding:"20px 18px", margin:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <span className="disp" style={{ fontSize:20, fontWeight:800 }}>Vote log</span>
          <button onClick={onClose} className="lift" aria-label="Close" style={{ display:"flex", padding:4, color:C.muted }}><Ic n="x" s={18} /></button>
        </div>
        <p style={{ fontSize:12.5, color:C.muted, margin:"0 0 16px", lineHeight:1.5 }}>
          Every vote each person has cast, newest first. Spot one that was really you by mistake and tap <Ic n="x" s={11} c={C.clay} /> to remove just that vote — the rankings recompute automatically.
        </p>
        {roster.map((p) => {
          const rows = [
            ...reconstructPG(data.girl[p.key] || {}).events.map((e) => ({ ...e, g:"girl" })),
            ...reconstructPG(data.boy[p.key] || {}).events.map((e) => ({ ...e, g:"boy" })),
          ].filter((e) => e.t).sort((x, y) => y.t - x.t);
          return (
            <div key={p.key} style={{ marginBottom:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ width:10, height:10, borderRadius:999, background:pColor(p.key) }} />
                <span style={{ fontSize:15, fontWeight:700, color:C.ink }}>{data.profiles[p.key] || p.name}</span>
                <span style={{ fontSize:12, color:C.muted }}>{rows.length} vote{rows.length === 1 ? "" : "s"}</span>
              </div>
              {rows.length === 0 ? (
                <div style={{ fontSize:12.5, color:C.muted, fontStyle:"italic", padding:"2px 2px 4px" }}>No votes yet.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {rows.map((e) => {
                    const when = fmtWhen(e.t, now);
                    const known = e.win && e.lose;
                    return (
                      <div key={e.g + e.m} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
                        <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:"0.04em", textTransform:"uppercase", color:gColor(e.g), background:gTint(e.g), borderRadius:999, padding:"2px 7px", flexShrink:0 }}>{e.g === "boy" ? "Boy" : "Girl"}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, color:C.ink }}>
                            {known
                              ? <><b className="disp">{nameOf(e.g, e.win)}</b> <span style={{ color:C.muted }}>over</span> {nameOf(e.g, e.lose)}</>
                              : <span style={{ color:C.muted, fontStyle:"italic" }}>matchup unavailable</span>}
                          </div>
                          <div style={{ fontSize:11, color:C.muted }}>{when.rel}{when.abs ? ` · ${when.abs}` : ""}</div>
                        </div>
                        {e.baseline ? (
                          <span style={{ fontSize:10, color:C.line, flexShrink:0 }} title="Oldest kept vote — can’t be removed on its own">—</span>
                        ) : (
                          <button
                            onClick={() => { if (window.confirm(`Remove ${data.profiles[p.key] || p.name}’s vote${known ? ` (${nameOf(e.g, e.win)} over ${nameOf(e.g, e.lose)})` : ""}? Their rankings will recompute. This can’t be undone.`)) onDelete(p.key, e.g, e.m); }}
                            className="lift" aria-label="Remove this vote" title="Remove this vote"
                            style={{ flexShrink:0, display:"flex", padding:6, borderRadius:8, color:C.clay, border:`1px solid ${C.line}`, background:C.bg }}>
                            <Ic n="x" s={13} c={C.clay} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- who's voting -------------------------------- */
function WhoPanel({ roster, onChoose, onDelete }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:480, background:C.paper, border:`1px solid ${C.line}`, borderRadius:20, padding:"36px 30px" }}>
        <h1 className="disp" style={{ margin:"0 0 6px", letterSpacing:"0.06em", fontSize:38, fontWeight:800, textTransform:"uppercase", textAlign:"center" }}>
          Name<span style={{ color:C.sage }}>·</span>Off
        </h1>
        <p style={{ fontSize:15, textAlign:"center", color:C.muted, margin:"0 0 22px", lineHeight:1.45 }}>
          {roster.length > 0 ? "Tap your name below, or type it if you’re new." : "What’s your first name? We’ll remember you on this device."}
        </p>
        {roster.length > 0 && (
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:C.muted, marginBottom:10 }}>Select your name</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {roster.map((p) => (
                <span key={p.key} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px 8px 16px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}` }}>
                  <button onClick={() => onChoose(p.name)} className="lift" style={{ display:"flex", alignItems:"center", gap:8, fontSize:16, fontWeight:700, color:C.ink }}>
                    <span style={{ width:10, height:10, borderRadius:999, background:pColor(p.key) }} /> {p.name}
                  </button>
                  {onDelete && !OWNERS.includes(p.key) && (
                    <button onClick={() => { if (window.confirm(`Remove ${p.name} and their votes? This can’t be undone.`)) onDelete(p.key); }}
                      className="lift" aria-label={`Remove ${p.name}`} title="Remove this person" style={{ display:"flex", padding:2, color:C.muted }}>
                      <Ic n="x" s={14} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:C.muted, marginBottom:10 }}>{roster.length > 0 ? "New here? Add yourself" : "Your first name"}</div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onChoose(name)}
            placeholder="First name" style={{ flex:1, padding:"12px 14px", borderRadius:12, background:C.bg, border:`1px solid ${C.line}`, color:C.ink, fontSize:16 }} />
          <button onClick={() => onChoose(name)} className="lift" style={{ padding:"12px 22px", borderRadius:12, fontSize:16, fontWeight:700, background:C.sage, color:"#fff" }}>Start</button>
        </div>
        <p style={{ fontSize:12.5, color:C.muted, marginTop:22, lineHeight:1.5 }}>
          You’ll vote on your own first. Once you’ve cast 10 votes, the Rankings and Trends tabs unlock.
        </p>
      </div>
    </div>
  );
}
function LockMsg({ myVotes }) {
  const left = Math.max(0, UNLOCK_VOTES - myVotes);
  return (
    <div style={{ borderRadius:12, padding:"40px 20px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><Ic n="heart" s={26} c={C.line} /></div>
      <p style={{ fontSize:15, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>Vote first to unlock this</p>
      <p style={{ fontSize:13, margin:"0 0 12px" }}>Just {left} more {left === 1 ? "matchup" : "matchups"} to go — then Rankings &amp; Trends open up. 🌱</p>
      <div style={{ maxWidth:220, margin:"0 auto", height:8, borderRadius:999, background:C.line, overflow:"hidden" }}>
        <div style={{ height:8, borderRadius:999, width:`${Math.min(100, (myVotes / UNLOCK_VOTES) * 100)}%`, background:C.sage, transition:"width .3s ease" }} />
      </div>
      <p style={{ fontSize:11, margin:"6px 0 0", color:C.muted }}>{myVotes}/{UNLOCK_VOTES}</p>
    </div>
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
function Header({ me, myColor, onSwitch, showAdd, setShowAdd, popMode, setPopMode, onOpenLog }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <h1 className="disp" style={{ margin:0, letterSpacing:"0.06em", fontSize:32, fontWeight:800, textTransform:"uppercase" }}>
          Name<span style={{ color:C.sage }}>·</span>Off
        </h1>
        <button onClick={onSwitch} className="lift" title="Not you? Switch voter"
          style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 12px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}` }}>
          <span style={{ width:9, height:9, borderRadius:999, background:myColor }} />
          <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>{me}</span>
          <span style={{ fontSize:11, fontWeight:600, color:C.muted }}>switch</span>
        </button>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ marginRight:"auto" }}>
          <Seg items={[["rank","#"],["pct","%"]]} value={popMode} onChange={setPopMode} active={C.teal} />
        </div>
        {onOpenLog && (
          <button onClick={onOpenLog} className="lift" title="Vote log — review & undo past votes"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:999, fontSize:13.5, fontWeight:700, background:C.paper, color:C.muted, border:`1px solid ${C.line}` }}>
            <Ic n="list" s={15} /> Vote log
          </button>
        )}
        <button onClick={() => setShowAdd((s) => !s)} className="lift"
          style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:999, fontSize:15, fontWeight:700,
            ...(showAdd ? { background:C.sage, color:"#fff" } : { background:C.paper, color:C.sage, border:`1px solid ${C.line}` }) }}>
          <Ic n={showAdd ? "x" : "plus"} s={16} /> {showAdd ? "Close" : "Add name"}
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
        <button onClick={submit} className="lift" style={{ padding:"6px 16px", borderRadius:8, fontWeight:700, background:C.sage, color:"#fff" }}>Add</button>
      </div>
      <p style={{ fontSize:11, marginTop:8, color:C.muted }}>New names join voting right away and show “popularity &amp; meaning pending” until their SSA ranks and origin are filled in.</p>
    </div>
  );
}

/* -------------------------------- tabs ----------------------------------- */
function Tabs({ view, setView }) {
  const items = [["vote","Vote","heart"],["foryou","Name ideas","spark"],["rankings","Rankings","trophy"],["trends","Trends","trend"]];
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
// Gender-neutral names: fold girls' + boys' popularity into ONE figure — the total
// share of all babies given the name, regardless of sex. Cross-sex analogue of the
// spelling-variant merge. Rank is estimated with the more-used sex's calibration.
function unisexCombined(id) {
  const g = funcPop(id, "girl"), b = funcPop(id, "boy");
  const gp = g ? g.funcPct : null, bp = b ? b.funcPct : null;
  if (gp == null && bp == null) return { pct: null, rank: null, dom: "girl" };
  const pct = (gp || 0) + (bp || 0);
  const dom = (bp || 0) >= (gp || 0) ? "boy" : "girl";
  return { pct, rank: pct > 0 ? approxRank(pct, dom) : null, dom };
}
// Combined boy+girl popularity per year, as an estimated rank, for the trend sparkline.
function unisexSeries(id) {
  const gs = displaySeries(id, "girl") || [], bs = displaySeries(id, "boy") || [];
  if (!gs.length && !bs.length) return null;
  const byG = {}; gs.forEach((p) => { byG[p.year] = p.rank; });
  const byB = {}; bs.forEach((p) => { byB[p.year] = p.rank; });
  const years = [...new Set([...gs, ...bs].map((p) => p.year))].sort((a, b) => a - b);
  return years.map((y) => {
    const gp = rankToPct(byG[y], "girl") || 0, bp = rankToPct(byB[y], "boy") || 0;
    const sum = gp + bp, dom = bp >= gp ? "boy" : "girl";
    return { year: y, rank: sum > 0 ? approxRank(sum, dom) : null };
  });
}
function fmtRank(rank, approx, compact) {
  if (rank == null) return compact ? "1000+" : "Outside top 1000";
  return (approx ? "≈#" : "#") + rank;
}
function PopLine({ id, gender, compact = false, noChart = false, meaningShown = false }) {
  const popMode = React.useContext(PopModeCtx);
  const [open, setOpen] = React.useState(false);
  const uni = UNISEX_IDS.has(id);
  const fp = funcPop(id, gender);
  if (!fp) return null;
  let tier = tierOf(fp.funcRank);
  let sparkSeries = fp.series, sparkGender = gender, sparkApprox = fp.hasVar;
  let main = popMode === "pct"
    ? (fmtPct(fp.funcPct) || (fp.funcRank == null ? "<0.01%" : "n/a"))
    : (fp.funcRank == null ? (compact ? "1000+" : "Outside top 1000")
        : (fp.hasVar ? "≈#" : "US #") + fp.funcRank);
  if (uni) {
    // Gender-neutral: combine both sexes into ONE figure — the total share of all
    // babies with the name — instead of separate ♀/♂ ranks. We care how many kids
    // overall share it, not how many of one sex. Mirrors the spelling-variant merge.
    const uc = unisexCombined(id);
    tier = tierOf(uc.rank);
    main = popMode === "pct"
      ? (fmtPct(uc.pct) || "<0.01%")
      : (uc.rank == null ? (compact ? "1000+" : "Outside top 1000") : "≈#" + uc.rank);
    sparkSeries = unisexSeries(id);
    sparkGender = uc.dom;
    sparkApprox = true;
  }
  const hasBreakdown = fp.hasVar || (compact && (fp.nicks.length > 0 || (!!MEANING[id] && !meaningShown)));
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
      {!noChart && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: compact ? "flex-start" : "center", marginTop: 3 }}>
          <Sparkline series={sparkSeries} w={compact ? 130 : 190} h={compact ? 34 : 44} color={C.sage} compact={compact} mode={popMode} gender={sparkGender} approx={sparkApprox} />
        </div>
      )}
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
// Inline nickname adder/remover. Reused on the vote cards, the rankings rows, and
// the Manage-names panel. Anyone can add a nickname to any name; only nicknames a
// user added (in `added`) can be removed. Stops click/key bubbling so it can live
// inside a clickable vote card without triggering a vote.
function NickEditor({ id, nicks, added, onAddNick, onRemoveNick, center, big, canRemove, gender }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const addedSet = new Set((added || []).map((x) => x.toLowerCase()));
  const submit = () => { const v = val.trim(); if (v) onAddNick(gender, id, v); setVal(""); setEditing(false); };
  const fs = big ? 13 : 11;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", justifyContent: center ? "center" : "flex-start" }}>
      {(nicks || []).map((nk) => (
        <span key={nk} style={{ display:"flex", alignItems:"center", gap:3, fontSize:fs, fontWeight:600, padding: big ? "2px 10px" : "1px 8px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}`, color:C.ink }}>
          {nk}
          {canRemove && addedSet.has(nk.toLowerCase()) && (
            <button onClick={(e) => { e.stopPropagation(); onRemoveNick(gender, id, nk); }} className="lift" aria-label={`Remove nickname ${nk}`} title="Remove this nickname"
              style={{ display:"flex", color:C.clay, padding:0, background:"none" }}><Ic n="x" s={big ? 11 : 9} c={C.clay} /></button>
          )}
        </span>
      ))}
      {editing
        ? <input autoFocus value={val} onClick={(e) => e.stopPropagation()} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") submit(); else if (e.key === "Escape") { setEditing(false); setVal(""); } }}
            onBlur={submit} placeholder="nickname"
            style={{ fontSize:fs, padding: big ? "2px 8px" : "2px 7px", borderRadius:999, border:`1px solid ${C.sage}`, width: big ? 96 : 84, background:C.paper, color:C.ink }} />
        : <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="lift" title="Add a nickname (anyone can)"
            style={{ fontSize:fs, fontWeight:700, padding: big ? "2px 10px" : "1px 8px", borderRadius:999, border:`1px dashed ${C.line}`, color:C.sage, background:"transparent" }}>add nickname</button>}
    </div>
  );
}
function NameCard({ n, gender, onPick, onVeto, picked, dim, added, onAddNick, onRemoveNick, canRemoveNick, vetoWord = "Veto" }) {
  const chosen = picked === n.id;
  const accent = gColor(gender);     // pink for girls, blue for boys (follows the matchup)
  const popMode = React.useContext(PopModeCtx);
  const fp = funcPop(n.id, gender);
  const popNicks = (fp ? fp.nicks : []).filter((nk) => nk.rank != null || nk.pct != null);
  // Swipe-to-pick on touch devices: drag a card sideways past a threshold to choose it.
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const swiped = useRef(false); // suppress the trailing click after a real drag
  const THRESH = 70;
  const onTouchStart = (e) => {
    swiped.current = false;
    if (picked) return;
    const t = e.target;
    if (t.closest && t.closest("button, input")) { start.current = null; return; } // let controls work
    const p = e.touches[0]; start.current = { x: p.clientX, y: p.clientY }; setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!start.current || picked) return;
    const p = e.touches[0], ddx = p.clientX - start.current.x, ddy = p.clientY - start.current.y;
    if (Math.abs(ddx) > Math.abs(ddy)) { if (Math.abs(ddx) > 8) swiped.current = true; setDx(ddx); }
  };
  const onTouchEnd = () => {
    if (!start.current) { setDragging(false); return; }
    const hit = Math.abs(dx) > THRESH && !picked;
    start.current = null; setDragging(false); setDx(0);
    if (hit) onPick();
  };
  const baseTransform = chosen ? "translateY(-3px)" : "none";
  const transform = dx ? `translateX(${dx}px) rotate(${(dx / 30).toFixed(2)}deg)` : baseTransform;
  return (
    <div role="button" tabIndex={picked ? -1 : 0} aria-label={`Pick ${n.name}`}
      onClick={() => { if (swiped.current) { swiped.current = false; return; } if (!picked) onPick(); }}
      onKeyDown={(e) => { if (!picked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(); } }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      className="lift" style={{
        flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-start", borderRadius:16, padding:"44px 16px 22px", textAlign:"center", position:"relative", background:gCard(gender),
        border:`2px solid ${(chosen || Math.abs(dx) > THRESH) ? accent : "transparent"}`, minHeight:180,
        boxShadow: chosen ? `0 0 0 4px ${accent}22` : "0 2px 0 rgba(0,0,0,0.05)",
        opacity: dim ? 0.4 : 1, transform, transition: dragging ? "none" : "transform .22s ease, border-color .15s ease", touchAction:"pan-y",
        cursor: picked ? "default" : "pointer",
      }}>
      <button onClick={(e) => { e.stopPropagation(); onVeto(); }} disabled={!!picked} aria-label={`${vetoWord} ${n.name}`}
        className="lift" style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:999, color:C.clay, background:C.bg, border:`1px solid ${C.line}` }}>
        <Ic n="ban" s={13} /> {vetoWord}
      </button>
      {/* Fixed-height slots so every parallel row lines up across both cards. */}
      <div style={{ minHeight:46, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span className="disp" style={{ fontSize:36, fontWeight:800, lineHeight:1.04, color:C.ink }}>{n.name}</span>
      </div>
      <div style={{ minHeight:14, fontSize:11.5, color:C.clay, fontStyle:"italic" }}>{sayOf(n.id) ? `“${sayOf(n.id)}”` : ""}</div>
      <div style={{ minHeight:28, marginTop:8, display:"flex", justifyContent:"center", alignItems:"center" }}>
        {onAddNick
          ? <NickEditor id={n.id} nicks={n.nicks} added={added} onAddNick={onAddNick} onRemoveNick={onRemoveNick} canRemove={canRemoveNick} gender={gender} center big />
          : <span style={{ fontSize:17, fontWeight:600, color:C.ink }}>{n.nicks.length > 0 ? n.nicks.join(" · ") : ""}</span>}
      </div>
      <div style={{ minHeight:36, marginTop:6, fontSize:12.5, color:C.muted, fontStyle:"italic", lineHeight:1.4 }}>{MEANING[n.id] ? cleanMeaning(MEANING[n.id]) : ""}</div>
      <div style={{ minHeight:15, fontSize:11, fontWeight:600, color:C.sage }}>{(n.byName && !isOwner(n.by)) ? `✨ suggested by ${n.byName}` : ""}</div>
      <div style={{ minHeight:88, marginTop:6, display:"flex", justifyContent:"center", alignItems:"center" }}>
        {fp ? <PopLine id={n.id} gender={gender} />
            : <span style={{ fontSize:11, fontStyle:"italic", color:C.muted }}>Popularity &amp; meaning pending</span>}
      </div>
      <div style={{ minHeight:50, marginTop:8 }}>
        {popNicks.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:C.muted, marginBottom:5 }}>Nickname popularity</div>
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
function Vote({ names, gender, pair, picked, onVote, onSkip, onVeto, onBack, canGoBack, profile, addnicks, onAddNick, onRemoveNick }) {
  // Keyboard voting for fast sessions: ←/→ pick left/right, Space skips.
  useEffect(() => {
    const onKey = (e) => {
      if (!pair || picked) return;
      const ae = document.activeElement, tag = (ae && ae.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (ae && ae.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); onVote(pair[0], pair[1]); }
      else if (e.key === "ArrowRight") { e.preventDefault(); onVote(pair[1], pair[0]); }
      else if (e.key === " ") { if (tag === "button") return; e.preventDefault(); onSkip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, picked, onVote, onSkip]);
  const banner = (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
      <span className="disp" style={{ fontSize:14, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color: gColor(gender),
        padding:"6px 22px", borderRadius:999, background: gTint(gender), border:`1px solid ${C.line}` }}>{gLabel(gender)}</span>
    </div>
  );
  if (!pair) return (
    <div className="voteWrap">
      {banner}
      <p style={{ fontSize:14, borderRadius:12, padding:"32px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
        Not enough names left to compare. Un-veto a few in Rankings, or add more names.
      </p>
    </div>
  );
  const [a, b] = pair;
  const na = findName(names, a), nb = findName(names, b);
  return (
    <div className="voteWrap">
      {banner}
      <div className="cards">
        <NameCard n={na} gender={gender} picked={picked} dim={picked && picked !== a} onPick={() => onVote(a, b)} onVeto={() => onVeto(a)} added={addedNicksFor(addnicks, gender, a)} onAddNick={onAddNick} onRemoveNick={onRemoveNick} canRemoveNick={isOwner(profile)} vetoWord={isOwner(profile) ? "Veto" : "Hard pass"} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span className="disp" style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:C.muted }}>vs</span>
        </div>
        <NameCard n={nb} gender={gender} picked={picked} dim={picked && picked !== b} onPick={() => onVote(b, a)} onVeto={() => onVeto(b)} added={addedNicksFor(addnicks, gender, b)} onAddNick={onAddNick} onRemoveNick={onRemoveNick} canRemoveNick={isOwner(profile)} vetoWord={isOwner(profile) ? "Veto" : "Hard pass"} />
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:16, flexWrap:"wrap" }}>
        <button onClick={onBack} disabled={!canGoBack} className="lift" title="Revisit your last vote and change it"
          style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}`, color: canGoBack ? C.teal : C.line, cursor: canGoBack ? "pointer" : "default" }}>
          <Ic n="back" s={14} c={canGoBack ? C.teal : C.line} /> Go back
        </button>
        <button onClick={onSkip} disabled={!!picked} className="lift" style={{ fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:999, color:C.muted, border:`1px solid ${C.line}`, background:C.paper }}>Can’t decide, skip</button>
      </div>
      <p style={{ textAlign:"center", fontSize:11, color:C.muted, margin:"10px 0 0" }}>Tap or swipe a card to pick · ←/→ keys, space to skip</p>
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
// Attribution tag for a custom name in the rankings. Owners (Claire/Andrew) and
// built-in names show nothing; a guest who added it shows "added by X"; a name with
// no recorded author offers a claim button so the real adder can take credit.
function nameAttrib(n) {
  if (!n.custom || (n.by && isOwner(n.by))) return { kind: "none" };
  if (n.by) return { kind: "guest", name: n.byName || n.by };
  return { kind: "unknown" };
}
// Join a few names conversationally: "A", "A & B", "A, B & 2 more".
const fmtNames = (arr) => (arr.length <= 1 ? (arr[0] || "") : arr.length === 2 ? `${arr[0]} & ${arr[1]}` : `${arr.slice(0, 2).join(", ")} & ${arr.length - 2} more`);
function RankRow({ r, rank, n, showCombo, gender, max, min, profile, readOnly, onVeto, onClaim, notes, onSetNote, added, onAddNick, onRemoveNick, haters, reserveHaters, iHardPassed, onUnpass }) {
  const [showNote, setShowNote] = useState(false);
  const pctW = max === min ? 50 : ((r.score - min) / (max - min)) * 100;
  const accent = rankColor(n > 1 ? (rank - 1) / (n - 1) : 0);
  const noteCount = notes[r.n.id] ? Object.keys(notes[r.n.id]).length : 0;
  const attr = nameAttrib(r.n);
  return (
    <li style={{ borderRadius:12, padding:"10px 12px", background:C.paper, border:`1px solid ${C.line}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span className="disp" style={{ width:24, textAlign:"center", fontSize:18, fontWeight:700, color: accent }}>{rank}</span>
        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span className="disp" style={{ fontSize:18, fontWeight:700, color:C.ink }}>{r.n.name}</span>
            {attr.kind === "guest" && <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", color:C.sage }}>added by {attr.name}</span>}
            {attr.kind === "unknown" && <button onClick={() => onClaim(r.n.id)} className="lift" style={{ fontSize:10, fontWeight:700, padding:"1px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.teal }}>claim this contribution</button>}
            {showCombo && r.c != null && (
              <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:999, background: r.split ? `${C.clay}1A` : C.line }}>
                <span style={{ color:C.claire, fontWeight:700 }}>C#{r.c}</span>
                <span style={{ color:C.muted }}> · </span>
                <span style={{ color:C.andrew, fontWeight:700 }}>A#{r.a}</span>
              </span>
            )}
            <PopLine id={r.n.id} gender={gender} compact noChart />
          </div>
          <div style={{ minHeight:16, marginTop:2 }}>
            {/* Nicknames are editable by anyone in any view (not tied to the star/note readOnly gate). */}
            <NickEditor id={r.n.id} nicks={r.n.nicks} added={added} onAddNick={onAddNick} onRemoveNick={onRemoveNick} canRemove={isOwner(profile)} gender={gender} />
          </div>
          <div style={{ height:6, borderRadius:999, marginTop:6, background:C.line }}>
            <div style={{ height:6, borderRadius:999, width:`${pctW}%`, background:accent }} />
          </div>
          {/* Reserve this line for every card in a column that has any haters, so the
              presence/absence of the dislike note never changes a card's height. */}
          {(reserveHaters || (haters && haters.length > 0)) && (
            <div style={{ fontSize:11, marginTop:5, minHeight:16, color:C.clay, fontWeight:600, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span>{haters && haters.length > 0 ? `💀 ${fmtNames(haters)} can’t stand this one` : ""}</span>
              {iHardPassed && <button onClick={onUnpass} className="lift" style={{ fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:999, border:`1px solid ${C.line}`, color:C.sage, background:"transparent" }}>take mine back</button>}
            </div>
          )}
        </div>
        {!readOnly && (
          <button onClick={() => onVeto(r.n.id)} className="lift" aria-label={`Veto ${r.n.name}`} title="Veto" style={{ display:"flex", padding:2, color:C.clay, opacity:0.5 }}>
            <Ic n="ban" s={18} c={C.clay} />
          </button>
        )}
      </div>
      {!readOnly && (
        <button onClick={() => setShowNote((s) => !s)} className="lift" style={{ marginTop:6, fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:999, border:`1px solid ${C.line}`, background:"transparent", color: noteCount ? C.sage : C.muted }}>
          ✎ {showNote ? "hide note" : (noteCount ? `notes · ${noteCount}` : "add note")}
        </button>
      )}
      {!readOnly && showNote && <NoteBlock id={r.n.id} notes={notes} profile={profile} onSetNote={onSetNote} />}
    </li>
  );
}
function Rankings({ data, profile, onUnveto, onVeto, onClaim, onAddNick, onRemoveNick, onReorder, notes, onSetNote }) {
  const [mode, setMode] = useState("combined");
  // The couple's combined ranking, the family aggregate, and a head-to-head of the
  // couple vs one individual voter.
  const options = [{ key: "combined", name: "Neely-Stevenson" }, { key: "everyone", name: "Crowd Favorites" }, { key: "compare", name: "Voter vs. Voter" }, ...(isOwner(profile) ? [{ key: "mine", name: "My list" }] : [])];
  // Two-up head-to-head: pick any two rankings — the couple combined, or any
  // individual who has voted — and see them side by side. Defaults to Claire vs Andrew.
  const voters = data.roster.filter((p) => (data.boy[p.key] && data.boy[p.key].votes > 0) || (data.girl[p.key] && data.girl[p.key].votes > 0));
  const sides = [{ key: "combined", name: "Neely-Stevenson" }, ...voters.map((p) => ({ key: p.key, name: p.name }))];
  const [leftKey, setLeftKey] = useState("claire");
  const [rightKey, setRightKey] = useState("andrew");
  const sideValid = (k) => sides.some((s) => s.key === k);
  const lk = sideValid(leftKey) ? leftKey : (sides[0] ? sides[0].key : null);
  const rk = sideValid(rightKey) ? rightKey : (sides.find((s) => s.key !== lk) || sides[0] || {}).key;
  const readOnly = !(isOwner(profile) && mode === "combined"); // owners manage notes/vetoes on the couple's ranking only
  const tabColor = (k) => (k === "combined" ? C.teal : k === "everyone" ? C.sage : k === "mine" ? pColor(profile) : C.clay);
  const sideColor = (k) => (k === "combined" ? C.teal : isOwner(k) ? pColor(k) : C.clay);
  const PickRow = ({ label, sel, onPick }) => (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
      <span style={{ fontSize:12, fontWeight:700, color:C.muted, width:40 }}>{label}</span>
      {sides.map((s) => (
        <button key={s.key} onClick={() => onPick(s.key)} className="lift" style={{ padding:"4px 11px", borderRadius:999, fontSize:13, fontWeight:700, border:`1px solid ${sel === s.key ? "transparent" : C.line}`,
          ...(sel === s.key ? { background: sideColor(s.key), color:"#fff" } : { background:C.paper, color:C.muted }) }}>{s.name}</button>
      ))}
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14, padding:4, borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
        {options.map((o) => (
          <button key={o.key} onClick={() => setMode(o.key)} className="lift" style={{ flex:"1 1 auto", padding:"7px 12px", borderRadius:8, fontSize:14, fontWeight:700,
            ...(mode === o.key ? { background: tabColor(o.key), color:"#fff" } : { color:C.muted }) }}>{o.key === profile ? `${o.name} (you)` : o.name}</button>
        ))}
      </div>
      {mode === "compare" ? (
        voters.length === 0 ? (
          <div style={{ borderRadius:12, padding:"40px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
            <p style={{ fontSize:14, margin:0 }}>No one has voted yet. Once someone casts a vote you can compare two rankings side by side.</p>
          </div>
        ) : (<>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
            <PickRow label="Left" sel={lk} onPick={setLeftKey} />
            <PickRow label="Right" sel={rk} onPick={setRightKey} />
          </div>
          <p style={{ fontSize:11.5, color:C.muted, margin:"0 0 12px" }}>Each ranking top-to-bottom, side by side. Names the two rank very differently are outlined.</p>
          <CompareGender gender="girl" title="Girls" data={data} leftKey={lk} rightKey={rk} />
          <CompareGender gender="boy" title="Boys" data={data} leftKey={lk} rightKey={rk} />
        </>)
      ) : mode === "mine" ? (
        <>
          <p style={{ fontSize:11.5, color:C.muted, margin:"0 0 12px" }}>Your own ranking. Drag the <b>≡</b> handle to reorder — voting can still nudge things afterward.</p>
          <div className="twocol">
            <MyRankColumn gender="girl" title="Girls" data={data} profile={profile} onReorder={onReorder} />
            <MyRankColumn gender="boy" title="Boys" data={data} profile={profile} onReorder={onReorder} />
          </div>
        </>
      ) : (
        <div className="twocol">
          <GenderRankColumn gender="girl" title="Girls" mode={mode} data={data} profile={profile} readOnly={readOnly} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onVeto={onVeto} onClaim={onClaim} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
          <GenderRankColumn gender="boy" title="Boys" mode={mode} data={data} profile={profile} readOnly={readOnly} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onVeto={onVeto} onClaim={onClaim} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
        </div>
      )}
      {isOwner(profile) && <ManageNames data={data} profile={profile} onVeto={onVeto} onUnveto={onUnveto} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />}
    </div>
  );
}
// Head-to-head: one gender block with TWO ordered columns side by side — the
// couple's combined ranking and the selected individual's ranking, each 1->N.
// Names ranked very differently between the two outline in clay so clashes pop.
function CompareGender({ gender, title, data, leftKey, rightKey }) {
  const names = namesFor(gender, data.custom, data.removed);
  const c = data[gender].claire, a = data[gender].andrew;
  const cVoted = c.votes > 0, aVoted = a.votes > 0;
  // A "side" can be the couple combined, or any individual voter.
  const sideOf = (key) => {
    if (key === "combined") {
      const r = {};
      names.forEach((n) => { const cr = c.ratings[n.id] ?? START, ar = a.ratings[n.id] ?? START; r[n.id] = (cVoted && aVoted) ? (cr + ar) / 2 : (cVoted ? cr : ar); });
      return { label: "Neely-Stevenson", ratings: r, vetoed: [...(c.vetoed || []), ...(a.vetoed || [])], voted: cVoted || aVoted, color: C.teal };
    }
    const pg = data[gender][key];
    return { label: data.profiles[key] || key, ratings: pg ? pg.ratings : {}, vetoed: pg ? (pg.vetoed || []) : [], voted: !!(pg && pg.votes > 0), color: isOwner(key) ? pColor(key) : C.clay };
  };
  const L = sideOf(leftKey), R = sideOf(rightKey);
  const benched = new Set([...(c.vetoed || []), ...(a.vetoed || []), ...L.vetoed, ...R.vetoed]);
  const live = names.filter((n) => !benched.has(n.id));
  const order = (rt) => [...live].sort((x, y) => ((rt[y.id] ?? START) - (rt[x.id] ?? START)) || x.name.localeCompare(y.name));
  const lList = order(L.ratings), rList = order(R.ratings);
  const lPos = {}; lList.forEach((n, i) => { lPos[n.id] = i; });
  const rPos = {}; rList.forEach((n, i) => { rPos[n.id] = i; });
  const big = Math.max(3, Math.ceil(live.length / 3));
  const Column = ({ side, list }) => (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.05em", color: side.color, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{side.label}</div>
      <ol style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {list.map((n, i) => {
          const moved = Math.abs(lPos[n.id] - rPos[n.id]) >= big;
          return (
            <li key={n.id} style={{ display:"flex", alignItems:"baseline", gap:7, borderRadius:9, padding:"6px 9px", background:C.paper, border:`1px solid ${moved ? C.clay : C.line}` }}>
              <span className="disp" style={{ fontSize:13, fontWeight:700, color:C.muted, minWidth:16 }}>{i + 1}</span>
              <span className="disp" style={{ fontSize:15, fontWeight:700, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.name}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
  const notReady = !L.voted ? L.label : !R.voted ? R.label : null;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${gColor(gender)}` }}>
        <h3 className="disp" style={{ margin:0, fontSize:20, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:gColor(gender) }}>{title}</h3>
      </div>
      {notReady ? (
        <div style={{ borderRadius:12, padding:"36px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
          <p style={{ fontSize:14, margin:0 }}>{notReady} hasn’t voted on the {gender === "boy" ? "boys" : "girls"} yet.</p>
        </div>
      ) : (
        <div style={{ display:"flex", gap:10 }}>
          <Column side={L} list={lList} />
          <Column side={R} list={rList} />
        </div>
      )}
    </div>
  );
}
// The current owner's own ranking, drag-to-reorder. Grab the ≡ handle and drag;
// on drop we set the moved name's rating between its new neighbours (a nudge).
// Pointer-based so it works on phone and desktop.
function MyRankColumn({ gender, title, data, profile, onReorder }) {
  const names = namesFor(gender, data.custom, data.removed);
  const cur = data[gender][profile] || { ratings:{}, votes:0 };
  const benched = new Set([...(data[gender].claire.vetoed || []), ...(data[gender].andrew.vetoed || [])]);
  const ordered = names.filter((n) => !benched.has(n.id))
    .sort((x, y) => ((cur.ratings[y.id] ?? START) - (cur.ratings[x.id] ?? START)) || x.name.localeCompare(y.name));
  const [drag, setDrag] = useState(null); // dragged id
  const [tgt, setTgt] = useState(null);   // { idx, after }
  const down = (e, id) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDrag(id); setTgt(null);
  };
  const move = (e) => {
    if (drag == null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el && el.closest && el.closest("[data-ri]");
    if (row) {
      const idx = +row.getAttribute("data-ri");
      const r = row.getBoundingClientRect();
      setTgt({ idx, after: e.clientY > r.top + r.height / 2 });
    }
  };
  const up = () => {
    if (drag != null && tgt) {
      const hovered = ordered[tgt.idx];
      if (hovered && hovered.id !== drag) {
        const ex = ordered.filter((n) => n.id !== drag);
        let exIdx = ex.findIndex((n) => n.id === hovered.id);
        if (tgt.after) exIdx += 1;
        const above = ex[exIdx - 1] || null, below = ex[exIdx] || null;
        onReorder(gender, drag, above ? above.id : null, below ? below.id : null);
      }
    }
    setDrag(null); setTgt(null);
  };
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${gColor(gender)}` }}>
        <h3 className="disp" style={{ margin:0, fontSize:20, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:gColor(gender) }}>{title}</h3>
      </div>
      {!cur.votes ? (
        <div style={{ borderRadius:12, padding:"36px 16px", textAlign:"center", background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
          <p style={{ fontSize:14, margin:0 }}>Vote on a few {gender === "boy" ? "boys" : "girls"} first, then drag to fine-tune your order.</p>
        </div>
      ) : (
        <ol style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {ordered.map((n, i) => {
            const isDrag = drag === n.id;
            const isTgt = drag != null && tgt && tgt.idx === i && !isDrag;
            return (
              <li key={n.id} data-ri={i}
                style={{ display:"flex", alignItems:"center", gap:8, borderRadius:10, padding:"8px 10px", background:C.paper,
                  border:`1px solid ${C.line}`, opacity:isDrag ? 0.45 : 1,
                  boxShadow: isTgt ? `inset 0 ${tgt.after ? -3 : 3}px 0 ${pColor(profile)}` : "none" }}>
                <button onPointerDown={(e) => down(e, n.id)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                  aria-label={`Drag ${n.name} to reorder`} title="Drag to reorder"
                  style={{ display:"flex", touchAction:"none", cursor:"grab", color:C.muted, padding:2 }}><Ic n="list" s={16} /></button>
                <span className="disp" style={{ fontSize:14, fontWeight:700, color:C.muted, minWidth:18 }}>{i + 1}</span>
                <span className="disp" style={{ flex:1, minWidth:0, fontSize:16, fontWeight:700, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.name}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
function GenderRankColumn({ gender, title, mode, data, profile, readOnly, notes, onSetNote, onUnveto, onVeto, onClaim, onAddNick, onRemoveNick }) {
  notes = notes || {};
  const addnicks = data.addnicks || {};
  const names = namesFor(gender, data.custom, data.removed);
  const cR = data[gender].claire.ratings, aR = data[gender].andrew.ratings;
  const cVeto = data[gender].claire.vetoed, aVeto = data[gender].andrew.vetoed;
  const cRank = ranksOf(cR, names), aRank = ranksOf(aR, names);
  const splitGap = Math.ceil(names.length / 3);
  const isCombined = mode === "combined";
  const isEveryone = mode === "everyone";          // family aggregate (guests only, no owners)
  const isPerson = !isCombined && !isEveryone;
  const sel = isPerson ? data[gender][mode] : null; // the single voter being viewed
  // the current viewer's own vetoes (for editing on the couple's ranking)
  const myVeto = isOwner(profile) ? (data[gender][profile].vetoed || []) : [];
  const guestKeys = data.roster.filter((p) => !isOwner(p.key)).map((p) => p.key);
  const votedGuests = guestKeys.filter((k) => data[gender][k].votes > 0);
  // Family/friends who hard-passed a name (their veto shows as "can't stand it", not a removal).
  const hatersOf = (id) => guestKeys.filter((k) => (data[gender][k].vetoed || []).includes(id)).map((k) => data.profiles[k] || k);
  // Average only family members who actually rated this name (don't pad non-raters
  // with the START default, which would drag every score toward 1500).
  const everyoneScore = (id) => { const rs = votedGuests.filter((k) => data[gender][k].ratings[id] != null); return rs.length ? rs.reduce((s, k) => s + data[gender][k].ratings[id], 0) / rs.length : START; };
  // An owner's veto is a shared dealbreaker, so it benches the name in the couple's
  // AND the Fam-and-friends ranking; a person view uses that person's own vetoes.
  const isVetoed = (id) => isPerson ? sel.vetoed.includes(id) : (cVeto.includes(id) || aVeto.includes(id));
  const cMatch = data[gender].claire.matches || {}, aMatch = data[gender].andrew.matches || {};
  // "Not yet voted on" (combined view only): neither owner has seen it in a matchup yet.
  const notVotedYet = (id) => isCombined ? ((cMatch[id] || 0) === 0 && (aMatch[id] || 0) === 0)
    : isEveryone ? votedGuests.every((k) => ((data[gender][k].matches || {})[id] || 0) === 0) : false;

  const cVotes = data[gender].claire.votes, aVotes = data[gender].andrew.votes;
  const cVoted = cVotes > 0, aVoted = aVotes > 0;
  // A profile that hasn't voted sits at START for every name, which isn't a real
  // opinion, so don't blend it in. Only combine the two once BOTH have voted.
  const combineBoth = cVoted && aVoted;

  let rows;
  if (isCombined) {
    if (combineBoth) {
      rows = names.map((n) => {
        const avg = ((cR[n.id] ?? START) + (aR[n.id] ?? START)) / 2;
        const split = Math.abs((cR[n.id] ?? START) - (aR[n.id] ?? START)) >= 150; // big Elo gap = real disagreement
        return { n, score: avg, c: cRank[n.id], a: aRank[n.id], split };
      });
    } else {
      // Only one has voted, so show their ratings alone, no C#/A# split badge
      // (the other has no real ranking yet).
      const soloR = cVoted ? cR : aR;
      rows = names.map((n) => ({ n, score: soloR[n.id] ?? START }));
    }
  } else if (isEveryone) {
    rows = names.map((n) => ({ n, score: everyoneScore(n.id) }));
  } else {
    rows = names.map((n) => ({ n, score: sel.ratings[n.id] ?? START }));
  }
  // Sort by score; names that tie (same rounded score) fall back to alphabetical.
  const live = rows.filter((r) => !isVetoed(r.n.id) && !notVotedYet(r.n.id)).sort((x, y) => (Math.round(y.score) - Math.round(x.score)) || x.n.name.localeCompare(y.n.name));
  // Competition ranking: equal scores share a rank, the next distinct score resumes
  // at its position (e.g. 5, 5, 7) so a tie never makes one name look better.
  const liveRanks = [];
  live.forEach((r, i) => { liveRanks[i] = (i > 0 && Math.round(r.score) === Math.round(live[i - 1].score)) ? liveRanks[i - 1] : i + 1; });
  const dead = rows.filter((r) => isVetoed(r.n.id));
  const unvoted = rows.filter((r) => !isVetoed(r.n.id) && notVotedYet(r.n.id)).sort((x, y) => x.n.name.localeCompare(y.n.name));
  const max = Math.max(...live.map((r) => r.score), START + 1);
  const min = Math.min(...live.map((r) => r.score), START - 1);
  // If any name in this column has a hater, reserve the dislike line on every card so
  // all cards in the column stay the same height (and format) regardless.
  const anyHaters = live.some((r) => hatersOf(r.n.id).length > 0);
  // No real ranking to show until the relevant person/people have voted.
  const noData = isCombined ? (!cVoted && !aVoted) : isEveryone ? (votedGuests.length === 0) : (sel.votes === 0);
  const emptyMsg = isCombined
    ? "Neither of you has voted yet. Head to the Vote tab to start ranking."
    : isEveryone
      ? "No family votes yet (Claire and Andrew aren’t counted here)."
      : `${data.profiles[mode]} hasn’t voted on the ${gender === "boy" ? "boys" : "girls"} yet.`;
  const vetoLabel = (id) => { if (isPerson) return data.profiles[mode]; const w = []; if (cVeto.includes(id)) w.push("Claire"); if (aVeto.includes(id)) w.push("Andrew"); return w.join(" & "); };

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
      <p style={{ fontSize:12, marginBottom:12, color:C.muted }}>
        {isCombined
          ? (combineBoth
              ? `Your combined ranking.`
              : `Only ${cVoted ? "Claire" : "Andrew"} has voted so far. Showing their ratings alone; the combined ranking appears once you’ve both voted.`)
          : isEveryone
            ? `Average of ${votedGuests.length} family member${votedGuests.length === 1 ? "" : "s"}’ ratings (Claire and Andrew not included).`
            : `${data.profiles[mode]}’s ratings.`}
      </p>
      <ol style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {live.map((r, i) => (
          <RankRow key={r.n.id} r={r} rank={liveRanks[i]} n={live.length} showCombo={isCombined} gender={gender} max={max} min={min}
            profile={profile} readOnly={readOnly} onVeto={(id) => onVeto(gender, profile, id)} onClaim={onClaim} notes={notes} onSetNote={onSetNote}
            added={addedNicksFor(addnicks, gender, r.n.id)} onAddNick={onAddNick} onRemoveNick={onRemoveNick} haters={hatersOf(r.n.id)} reserveHaters={anyHaters}
            iHardPassed={!isOwner(profile) && (data[gender][profile].vetoed || []).includes(r.n.id)} onUnpass={() => onUnveto(gender, profile, r.n.id)} />
        ))}
      </ol>
      {unvoted.length > 0 && (
        <div style={{ marginTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, color:C.muted }}>
            <Ic n="list" s={12} /> Not yet voted on
          </div>
          <ul style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {unvoted.map((r) => {
              const attr = nameAttrib(r.n);
              return (
                <li key={r.n.id} style={{ borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:12, background:C.paper, border:`1px dashed ${C.line}`, opacity:0.85 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span className="disp" style={{ fontSize:16, fontWeight:700, color:C.ink }}>{r.n.name}</span>
                    {attr.kind === "guest" && <span style={{ fontSize:10, marginLeft:8, color:C.sage }}>added by {attr.name}</span>}
                  </div>
                  {attr.kind === "unknown" && (
                    <button onClick={() => onClaim(r.n.id)} className="lift" style={{ fontSize:11, fontWeight:700, padding:"4px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.teal, whiteSpace:"nowrap" }}>claim this contribution</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
                {!readOnly && myVeto.includes(r.n.id) && (
                  <button onClick={() => onUnveto(gender, profile, r.n.id)} className="lift" style={{ fontSize:12, padding:"4px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.sage }}>unveto</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      </>)}
    </div>
  );
}

/* --------------------------- manage names -------------------------------- */
// One name in the Manage panel: name + veto/remove, plus an inline nickname
// editor. `added` is the list of user-added nicks for this name (the only ones
// with a remove ✕); base nicks show without one. Anyone can add a nickname.
function NameChip({ n, added, gender, profile, onVeto, onAddNick, onRemoveNick }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const addedSet = new Set((added || []).map((x) => x.toLowerCase()));
  const submit = () => { const v = val.trim(); if (v) onAddNick(gender, n.id, v); setVal(""); setEditing(false); };
  return (
    <li style={{ display:"flex", flexDirection:"column", gap:5, borderRadius:12, padding:"6px 8px 7px 12px", background:C.paper, border:`1px solid ${C.line}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{n.name}</span>
        {n.custom && <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.06em", color:C.sage }}>{(n.byName && !isOwner(n.by)) ? `added by ${n.byName}` : "added"}</span>}
        <span style={{ flex:1 }} />
        <button onClick={() => onVeto(gender, profile, n.id)} className="lift" aria-label={`Veto ${n.name}`} title="Veto — takes it out for both of you"
          style={{ display:"flex", alignItems:"center", padding:2, borderRadius:999, color:C.clay }}><Ic n="ban" s={13} /></button>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
        {(n.nicks || []).map((nk) => (
          <span key={nk} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, padding:"1px 8px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}`, color:C.muted }}>
            {nk}
            {addedSet.has(nk.toLowerCase()) && (
              <button onClick={() => onRemoveNick(gender, n.id, nk)} className="lift" aria-label={`Remove nickname ${nk}`} title="Remove this nickname"
                style={{ display:"flex", color:C.clay, padding:0 }}><Ic n="x" s={9} /></button>
            )}
          </span>
        ))}
        {editing
          ? <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); else if (e.key === "Escape") { setEditing(false); setVal(""); } }}
              onBlur={submit} placeholder="nickname"
              style={{ fontSize:11, padding:"2px 7px", borderRadius:999, border:`1px solid ${C.sage}`, width:84, background:C.paper, color:C.ink }} />
          : <button onClick={() => setEditing(true)} className="lift" title="Add a nickname (anyone can)"
              style={{ fontSize:11, fontWeight:700, padding:"1px 8px", borderRadius:999, border:`1px dashed ${C.line}`, color:C.sage }}>add nickname</button>}
      </div>
    </li>
  );
}
function ManageNames({ data, profile, onVeto, onUnveto, onAddNick, onRemoveNick }) {
  const [open, setOpen] = useState(false);
  const { custom, removed } = data;
  const sortByName = (a, b) => a.name.localeCompare(b.name);
  const Col = ({ title, gender }) => {
    const cVeto = data[gender].claire.vetoed || [], aVeto = data[gender].andrew.vetoed || [];
    const vetoedBy = (id) => { const w = []; if (cVeto.includes(id)) w.push("Claire"); if (aVeto.includes(id)) w.push("Andrew"); return w; };
    const myVeto = data[gender][profile].vetoed || [];
    const list = [...namesFor(gender, custom, removed)].sort(sortByName);
    const active = list.filter((n) => vetoedBy(n.id).length === 0);
    const vetoed = list.filter((n) => vetoedBy(n.id).length > 0);
    return (
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8 }}>
          <h4 className="disp" style={{ margin:0, fontSize:15, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.04em", color:gColor(gender) }}>{title}</h4>
          <span style={{ fontSize:12, color:C.muted }}>{active.length}{vetoed.length ? ` · ${vetoed.length} vetoed` : ""}</span>
        </div>
        <ul style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {active.map((n) => (
            <NameChip key={n.id} n={n} added={addedNicksFor(data.addnicks, gender, n.id)} gender={gender} profile={profile}
              onVeto={onVeto} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
          ))}
        </ul>
        {vetoed.length > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, color:C.clay }}>
              <Ic n="ban" s={11} /> Vetoed
            </div>
            <ul style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {vetoed.map((n) => (
                <li key={n.id} style={{ display:"flex", alignItems:"center", gap:6, borderRadius:999, padding:"4px 6px 4px 12px", background:C.paper, border:`1px dashed ${C.line}` }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.muted, textDecoration:"line-through" }}>{n.name}</span>
                  <span style={{ fontSize:10, color:C.clay }}>{vetoedBy(n.id).join(" & ")}</span>
                  {myVeto.includes(n.id) && (
                    <button onClick={() => onUnveto(gender, profile, n.id)} className="lift" title="Remove your veto"
                      style={{ fontSize:11, padding:"2px 8px", borderRadius:999, border:`1px solid ${C.line}`, color:C.sage }}>unveto</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
          <p style={{ fontSize:12, marginBottom:12, color:C.muted, lineHeight:1.55 }}>
            <b style={{ color:C.clay }}>Veto</b> (⊘) takes a name out of the running for both of you and shows who said no; the other person can still see it under Vetoed. Unveto it there anytime. <b style={{ color:C.sage }}>Add nickname</b> adds a nickname to any name — anyone can, no matter who added it. Add names with the “+ Add name” button up top.
          </p>
          <div className="twocol"><Col title="Girls" gender="girl" /><Col title="Boys" gender="boy" /></div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- trends ---------------------------------- */
const LINE_COLORS = ["#2E4756","#C9821A","#566B36","#B5677B","#5B7493","#A4663A","#7A5BA6","#3A6EA5"];
// Once the 8 theme colors are used, vary the stroke pattern to keep lines distinct.
const DASHES = [null, "7 5", "1.5 4", "10 4 1.5 4"]; // solid, dashed, dotted, dash-dot
function TrendChart({ lines, xUnit = "votes", emph = null, endLabels = false }) {
  const W = 600, H = 240, padL = 14, padR = endLabels ? 84 : 12, padT = 12, padB = 26;
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
        {(emph ? [...lines.filter((l) => l.id !== emph), ...lines.filter((l) => l.id === emph)] : lines).map((l) => {
          const isEmph = l.id === emph;
          return (
            <polyline key={l.id} fill="none" stroke={l.color} strokeWidth={isEmph ? 3.6 : 2}
              opacity={emph && !isEmph ? 0.28 : 1} strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={l.dash === true ? "6 4" : (l.dash || undefined)}
              points={l.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} />
          );
        })}
        {hx != null && lines.map((l) => {
          const v = valAt(l, hx); return v == null ? null : <circle key={l.id} cx={X(hx)} cy={Y(v)} r="3" fill={l.color} />;
        })}
        {endLabels && (() => {
          // Label each line at its OWN last point, not the right edge — so a short line
          // (e.g. a voter with few votes) isn't labelled as if it ran flat across the axis.
          const labs = lines.map((l) => { const last = l.points[l.points.length - 1]; return { id: l.id, name: l.name, color: l.color, x: X(last.x), y: Y(last.y) }; }).sort((a, b) => a.y - b.y);
          for (let i = 1; i < labs.length; i++) if (labs[i].y < labs[i - 1].y + 11) labs[i].y = labs[i - 1].y + 11;
          return labs.map((lb) => (
            <text key={lb.id} x={Math.min(lb.x + 4, W - padR + 5)} y={lb.y + 3} fontSize="9.5" fontWeight={emph === lb.id ? 800 : 600}
              fill={lb.color} opacity={emph && emph !== lb.id ? 0.3 : 1}>{lb.name}</text>
          ));
        })()}
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
function ByNameTrends({ pg, names, profileName, gender }) {
  const ranked = [...names].sort((a, b) => (pg.ratings[b.id] ?? START) - (pg.ratings[a.id] ?? START));
  // Stable color + pattern per name (by its rank position): first 8 are solid theme
  // colors, then the same colors with dashed / dotted / dash-dot strokes.
  const styleFor = (i) => ({ color: LINE_COLORS[i % LINE_COLORS.length], dash: DASHES[Math.floor(i / LINE_COLORS.length) % DASHES.length] });
  const styleOf = (id) => styleFor(Math.max(0, ranked.findIndex((n) => n.id === id)));
  const [sel, setSel] = useState(() => ranked.slice(0, 5).map((n) => n.id)); // top 5 by default
  const [emph, setEmph] = useState(null);
  // Reset to the top 5 whenever the gender (name set) changes, so a toggle never carries old names over.
  useEffect(() => { setSel(ranked.slice(0, 5).map((n) => n.id)); setEmph(null); }, [gender]); // eslint-disable-line
  if (!pg.history || pg.history.length < 2) return trendEmpty("Vote on a few names to start the trend lines.");
  const lines = sel.filter((id) => ranked.some((n) => n.id === id)).map((id) => {
    const st = styleOf(id);
    return { id, name: findName(names, id).name, color: st.color, dash: st.dash,
      points: [{ x: 0, y: START }, ...pg.history.map((h) => ({ x: h.m, y: h.r[id] ?? START }))] };
  });
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const dashStyle = (d) => (d == null ? "solid" : d === "1.5 4" ? "dotted" : "dashed");
  return (
    <div>
      <p style={{ fontSize:12, marginBottom:8, color:C.muted }}>
        {profileName}’s combined ranking over {pg.votes} votes.
      </p>
      <TrendChart lines={lines} emph={emph} endLabels />
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
        <button onClick={() => setSel(ranked.slice(0, 5).map((n) => n.id))} className="lift"
          style={{ fontSize:12, padding:"4px 12px", borderRadius:999, fontWeight:700, background:C.bg, border:`1px solid ${C.line}`, color:C.ink }}>Top 5</button>
        {ranked.map((n, i) => {
          const on = sel.includes(n.id); const st = styleOf(n.id);
          return (
            <button key={n.id} onClick={() => toggle(n.id)} onDoubleClick={() => setSel([n.id])}
              onMouseEnter={() => on && setEmph(n.id)} onMouseLeave={() => setEmph((e) => (e === n.id ? null : e))}
              className="lift" style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"4px 10px", borderRadius:999, fontWeight:600, border:"1px solid transparent",
              ...(on ? { background: st.color, color:"#fff" } : { background:C.paper, color:C.muted, borderColor:C.line }) }}>
              <span style={{ opacity:0.6, fontWeight:700 }}>{i + 1}</span>
              {n.name}
              {on && st.dash && <span style={{ width:14, height:0, borderTop:`2px ${dashStyle(st.dash)} #fff` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function CompareTrends({ data, gender, names }) {
  const roster = data.roster;
  const pgOf = (key) => data[gender][key];
  const totalFor = (id) => roster.reduce((s, p) => s + (pgOf(p.key).ratings[id] ?? START), 0);
  const ranked = [...names].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const [pick, setPick] = useState(() => (ranked[0] ? ranked[0].id : null));
  if (!roster.some((p) => pgOf(p.key).votes > 0)) return trendEmpty("Vote on some names to compare everyone’s trends here.");
  const id = pick && names.some((n) => n.id === pick) ? pick : ranked[0].id;
  const lineFor = (pg) => [{ x: 0, y: START }, ...pg.history.map((h) => ({ x: h.m, y: h.r[id] ?? START }))];
  // Owners get a solid line in their color; guests get a dashed line from the palette.
  let gi = 0;
  const lines = roster.filter((p) => pgOf(p.key).history.length).map((p) => {
    const owner = isOwner(p.key);
    return { id: p.key, name: p.name, color: owner ? pColor(p.key) : LINE_COLORS[gi++ % LINE_COLORS.length], dash: !owner, points: lineFor(pgOf(p.key)) };
  });
  return (
    <div>
      <p style={{ fontSize:12, marginBottom:8, color:C.muted }}>
How everyone rates <b style={{ color:C.ink }}>{findName(names, id).name}</b> over time. You, Andrew, and family each get a line. Pick a name below.
      </p>
      <TrendChart lines={lines} endLabels />
      <div style={{ display:"flex", gap:14, marginTop:8, fontSize:11, color:C.muted, flexWrap:"wrap" }}>
        {lines.map((l) => (
          <span key={l.id} style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:18, height:0, borderTop:`2px ${l.dash ? "dashed" : "solid"} ${l.color}` }} /> {l.name}</span>
        ))}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
        {ranked.map((n) => (
          <button key={n.id} onClick={() => setPick(n.id)} className="lift" style={{ fontSize:12, padding:"4px 10px", borderRadius:999, fontWeight:600, border:"1px solid transparent",
            ...(n.id === id ? { background: C.sage, color:"#fff" } : { background:C.paper, color:C.muted, borderColor:C.line }) }}>{n.name}</button>
        ))}
      </div>
    </div>
  );
}
// Scatter that plots each name by two rank maps, with named directional axes:
// further right = more loved on the x axis, higher = more loved on the y axis.
function ScatterCompare({ names, xr, yr, xName, yName, xColor = C.ink, yColor = C.ink, midColor = C.sage, xLabel = `${xName} loves`, yLabel = `${yName} loves` }) {
  const pts = names.map((n) => ({ n, x: xr[n.id], y: yr[n.id] })).filter((p) => p.x != null && p.y != null);
  if (pts.length < 2) return trendEmpty("Not enough names ranked yet.");
  const N = Math.max(names.length, 2);
  const S = 360, padL = 26, padR = 74, padT = 22, padB = 34;
  // Inset the points from the axes so the worst-ranked name doesn't land on a line.
  const gap = 14;
  const xMin = padL + gap, xMax = S - padR, yMin = padT, yMax = S - padB - gap;
  const xMid = (padL + S - padR) / 2, yMid = (padT + S - padB) / 2;
  const px = (r) => xMin + (1 - (r - 1) / (N - 1)) * (xMax - xMin); // rank 1 -> right
  const py = (r) => yMin + ((r - 1) / (N - 1)) * (yMax - yMin);     // rank 1 -> top
  // Color each dot on a 3-stop gradient by lean: xColor when x ranks it higher,
  // yColor when y does, and a green midpoint when they agree (avoids a muddy blend).
  const ramp = (t) => (t <= 0.5 ? hexLerp(xColor, midColor, t / 0.5) : hexLerp(midColor, yColor, (t - 0.5) / 0.5));
  const dotColor = (x, y) => ramp(Math.max(0, Math.min(1, 0.5 + (x - y) / (2 * (N - 1)))));
  return (
    <div style={{ borderRadius:12, padding:10, background:C.paper, border:`1px solid ${C.line}` }}>
      <svg viewBox={`0 0 ${S} ${S}`} style={{ width:"100%", height:"auto", display:"block", overflow:"visible" }}>
        {/* L-shaped axes */}
        <line x1={padL} y1={padT} x2={padL} y2={S - padB} stroke={C.line} strokeWidth="1.5" />
        <line x1={padL} y1={S - padB} x2={S - padR} y2={S - padB} stroke={C.line} strokeWidth="1.5" />
        {/* axis labels: centered along each axis */}
        <text x={18} y={yMid} textAnchor="middle" transform={`rotate(-90 18 ${yMid})`} fontSize="11.5" fontWeight="800" fill={yColor}>{yLabel}</text>
        <text x={xMid} y={S - padB + 15} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={xColor}>{xLabel}</text>
        {pts.map((p) => {
          const col = dotColor(p.x, p.y);
          return (
            <g key={p.n.id}>
              <circle cx={px(p.x)} cy={py(p.y)} r="4.5" fill={col} />
              <text x={px(p.x) + 6} y={py(p.y) + 3} fontSize="9" fontWeight="600" fill={C.ink}>{p.n.name}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, fontSize:11, fontWeight:700 }}>
        <span style={{ color:xColor }}>{xName}</span>
        <span style={{ flex:1, height:8, borderRadius:999, background:`linear-gradient(to right, ${xColor}, ${midColor}, ${yColor})` }} />
        <span style={{ color:yColor }}>{yName}</span>
      </div>
    </div>
  );
}
function AgreementView({ data, gender, names }) {
  const c = data[gender].claire, a = data[gender].andrew;
  if (!c.votes || !a.votes) return trendEmpty("Once you and Andrew have both voted, this maps where you agree and where you clash.");
  const xr = ranksOf(c.ratings, names), yr = ranksOf(a.ratings, names);
  return (
    <div>
      <ScatterCompare names={names} xr={xr} yr={yr} xName="Neely" yName="Stevenson" xColor={C.claire} yColor={C.andrew} />
    </div>
  );
}
function FamVsUsView({ data, gender, names }) {
  const c = data[gender].claire, a = data[gender].andrew;
  const voted = data.roster.filter((p) => !isOwner(p.key)).map((p) => p.key).filter((k) => data[gender][k].votes > 0);
  if ((!c.votes && !a.votes) || !voted.length) return trendEmpty("Once you two and at least one family member have voted, this shows where the family differs from you.");
  const couple = {}, fam = {};
  names.forEach((n) => {
    const cr = c.ratings[n.id] ?? START, ar = a.ratings[n.id] ?? START;
    couple[n.id] = (c.votes && a.votes) ? (cr + ar) / 2 : (c.votes ? cr : ar);
    fam[n.id] = voted.reduce((s, k) => s + (data[gender][k].ratings[n.id] ?? START), 0) / voted.length;
  });
  const xr = ranksOf(couple, names), yr = ranksOf(fam, names);
  const coupleColor = "#E3B23C", famColor = "#3F6CA3"; // yellow = Andrew & Claire, blue = fam & friends, green = overlap
  return (
    <div>
      <p style={{ fontSize:12, marginBottom:8, color:C.muted }}>Each name by <b style={{ color:coupleColor }}>Andrew &amp; Claire</b>’s combined rank (further right = they love it) and the <b style={{ color:famColor }}>fam &amp; friends</b>’ rank (higher = they love it).</p>
      <ScatterCompare names={names} xr={xr} yr={yr} xName="Andrew &amp; Claire" yName="Fam &amp; friends" xLabel="Andrew and Claire love" yLabel="Fam &amp; friends love" xColor={coupleColor} yColor={famColor} midColor={C.sage} />
    </div>
  );
}
// Merge Claire's and Andrew's vote histories by time into one combined-rating
// timeline, so "Compare names" shows the couple's trajectory, not one person's.
function combinePg(data, gender, names) {
  const c = data[gender].claire, a = data[gender].andrew;
  const evs = [];
  (c.history || []).forEach((h) => evs.push({ t: h.t || 0, who: "c", r: h.r }));
  (a.history || []).forEach((h) => evs.push({ t: h.t || 0, who: "a", r: h.r }));
  evs.sort((x, y) => x.t - y.t);
  let lc = {}, la = {};
  const history = evs.map((e, i) => {
    if (e.who === "c") lc = e.r; else la = e.r;
    const r = {};
    names.forEach((n) => { r[n.id] = Math.round(((lc[n.id] ?? START) + (la[n.id] ?? START)) / 2); });
    return { m: i + 1, t: e.t, r };
  });
  const ratings = {};
  names.forEach((n) => { ratings[n.id] = ((c.ratings[n.id] ?? START) + (a.ratings[n.id] ?? START)) / 2; });
  return { ratings, history, votes: (c.votes || 0) + (a.votes || 0), vetoed: [], starred: [] };
}
function Trends({ data, profile }) {
  const [mode, setMode] = useState("byName");
  const [g, setG] = useState("girl");
  // Drop names vetoed by either owner; vetoed names shouldn't appear anywhere in Trends.
  const vetoed = new Set([...data[g].claire.vetoed, ...data[g].andrew.vetoed]);
  const names = namesFor(g, data.custom, data.removed).filter((n) => !vetoed.has(n.id));
  const modes = [["byName","Compare names"],["compare","Compare voters"],["agree","Neely vs Stevenson"],["fam","Fam and co. vs. Neely-Stevenson"]];
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <Seg items={[["girl","Girls"],["boy","Boys"]]} value={g} onChange={setG} active={gColor} />
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {modes.map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} className="lift" style={{ padding:"6px 12px", borderRadius:999, fontSize:13, fontWeight:700, border:"1px solid transparent",
              ...(mode === k ? { background:C.sage, color:"#fff" } : { background:C.paper, color:C.muted, borderColor:C.line }) }}>{label}</button>
          ))}
        </div>
      </div>
      {mode === "byName" && <ByNameTrends key={g} gender={g} pg={combinePg(data, g, names)} names={names} profileName={"Claire & Andrew"} />}
      {mode === "compare" && <CompareTrends data={data} gender={g} names={names} />}
      {mode === "agree" && <AgreementView data={data} gender={g} names={names} />}
      {mode === "fam" && <FamVsUsView data={data} gender={g} names={names} />}
    </div>
  );
}

/* ---------------------- "For you" suggestions ---------------------------- */
function ForYou({ data, profile, initialGender, onAdd, onReact, onDismiss, onRestore, onAddNick, onRemoveNick }) {
  const [g, setG] = useState(initialGender || "girl");
  const [lastAdded, setLastAdded] = useState(null);
  const [lastDismissed, setLastDismissed] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [showPassed, setShowPassed] = useState(false);
  const [round, setRound] = useState(0);
  const [pair, setPair] = useState(null);
  const votes = data[g][profile] ? (data[g][profile].votes || 0) : 0;
  const explore = (data[g][profile] || {}).explore || {};
  const dismissed = (data[g][profile] || {}).dismissed || {};
  const passedIds = Object.keys(dismissed);
  const tuned = Object.keys(explore).length;
  const sugg = suggestNames(data, profile, g).slice(0, 12);

  // (Re)pick a mash-up whenever the gender changes or a reaction advances the round.
  useEffect(() => {
    setPair(pickExplorePair(data, profile, g, suggestNames(data, profile, g)));
  }, [g, round, profile]); // eslint-disable-line

  const react = (kind) => {
    if (pair && kind !== "skip") onReact(g, [pair[0].id, pair[1].id], kind);
    setRound((r) => r + 1);
  };
  const add = (item) => {
    const c = item.c;
    const gender = item.f.lean === "u" ? "both" : g;
    onAdd(c.name, (c.nicks || []).join(", "), gender);
    setLastAdded({ name: c.name, gender }); setLastDismissed(null);
    setRound((r) => r + 1);
  };
  const dismiss = (item) => {
    onDismiss(g, item.c.id);
    setLastDismissed({ id: item.c.id, name: item.c.name }); setReasonText(""); setLastAdded(null);
    setRound((r) => r + 1);
  };
  // Replace just one card of the Tune pair (keep the other one in place).
  const replaceOne = (c) => setPair((cur) => {
    if (!cur) return cur;
    const idx = cur.findIndex((x) => x.id === c.id);
    if (idx === -1) return cur;
    const keep = cur[1 - idx];
    const pool = suggestNames(data, profile, g).map((x) => x.c).filter((x) => x.id !== keep.id && x.id !== c.id);
    if (!pool.length) return cur;
    const np = [...cur]; np[idx] = pool[Math.floor(Math.random() * Math.min(5, pool.length))]; return np;
  });
  // Hard pass on one name in the Tune pair: hide it for good, keep the other card.
  const passOne = (c) => {
    onDismiss(g, c.id);
    setLastDismissed({ id: c.id, name: c.name }); setReasonText(""); setLastAdded(null);
    replaceOne(c);
  };
  // Add one name from the Tune pair to voting, keep the other card.
  const addOne = (c) => {
    const f = FEAT[c.id];
    const gender = f && f.lean === "u" ? "both" : g;
    onAdd(c.name, (c.nicks || []).join(", "), gender);
    setLastAdded({ name: c.name, gender }); setLastDismissed(null);
    replaceOne(c);
  };
  const saveReason = () => {
    if (lastDismissed) onDismiss(g, lastDismissed.id, reasonText.trim());
    setLastDismissed(null); setReasonText("");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center", flexWrap:"wrap" }}>
        <Seg items={[["girl","Girls"],["boy","Boys"]]} value={g} onChange={(v) => { setG(v); setLastAdded(null); }} active={gColor} />
      </div>

      {pair && (
        <div style={{ marginBottom:18, padding:"14px 14px 12px", borderRadius:14, background:gTint(g), border:`1px solid ${C.line}` }}>
          <div style={{ marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Tune your taste</span>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"stretch" }}>
            {pair.map((c, i) => {
              const f = FEAT[c.id];
              return (
                <div key={c.id} role="button" tabIndex={0} onClick={() => react(i === 0 ? "a" : "b")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(i === 0 ? "a" : "b"); } }}
                  className="lift"
                  style={{ flex:1, minWidth:0, textAlign:"left", padding:"11px 12px", borderRadius:12, background:C.paper, border:`1px solid ${C.line}`, cursor:"pointer" }}>
                  <div style={{ fontFamily:DISPLAY, fontSize:21, color:C.ink, lineHeight:1.1 }}>{c.name}</div>
                  {SAY[c.id] && <div style={{ fontSize:11, color:C.clay, marginTop:2, fontStyle:"italic" }}>“{SAY[c.id]}”</div>}
                  <div style={{ fontSize:11.5, color:C.muted, margin:"3px 0 0" }}>{cleanMeaning(MEANING[c.id]) || ""}</div>
                  <div style={{ fontSize:10.5, color:C.teal, marginTop:5, fontWeight:600 }}>{ORIGIN_LABEL[f.o] || ""}{f.lean === "u" ? " · unisex" : ""}</div>
                  <PopLine id={c.id} gender={g} compact noChart />
                  <div style={{ display:"flex", gap:6, marginTop:8 }}>
                    <button onClick={(e) => { e.stopPropagation(); addOne(c); }} aria-label={`Add ${c.name} to voting`}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontSize:10.5, fontWeight:700, padding:"5px 6px", borderRadius:8, background:gColor(g), color:"#fff", border:"none" }}>
                      <Ic n="plus" s={11} c="#fff" /> Add
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); passOne(c); }} aria-label={`Hard pass on ${c.name} — never show it again`}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontSize:10.5, fontWeight:600, padding:"5px 6px", borderRadius:8, background:C.bg, border:`1px solid ${C.line}`, color:C.clay }}>
                      <Ic n="ban" s={11} c={C.clay} /> Hard pass
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => react("love")} className="lift" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, padding:"7px 14px", borderRadius:999, background:C.sage, color:"#fff" }}>
              <Ic n="heart" s={13} c="#fff" fill="#fff" /> Love both
            </button>
            <button onClick={() => react("pass")} className="lift" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, padding:"7px 14px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}`, color:C.clay }}>
              <Ic n="ban" s={13} c={C.clay} /> Hate both
            </button>
            <button onClick={() => react("skip")} className="lift" style={{ fontSize:12.5, fontWeight:600, padding:"7px 14px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>
              Skip
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize:13, color:C.muted, margin:"0 0 16px", lineHeight:1.5 }}>
        {votes < 4 && tuned < 3
          ? <>New names that match the <b>style</b> of your starting list. Vote or use <b>Tune</b> above and these retune to <b>your</b> taste.</>
          : <>Tuned to your votes, stars, vetoes{tuned ? <> &amp; <b>{tuned}</b> tune{tuned === 1 ? "" : "s"}</> : null}. Tap <b>+ Add</b> to drop one into voting.</>}
      </p>

      {lastAdded && (
        <div style={{ marginBottom:14, padding:"10px 12px", borderRadius:10, background:gTint(g), border:`1px solid ${C.line}`, fontSize:13, color:C.ink }}>
          Added <b style={{ fontFamily:DISPLAY }}>{lastAdded.name}</b> to {lastAdded.gender === "both" ? "both lists" : lastAdded.gender === "boy" ? "boys" : "girls"}. It’s in your Vote deck now.
        </div>
      )}

      {lastDismissed && (
        <div style={{ marginBottom:14, padding:"11px 13px", borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
          <div style={{ fontSize:13, color:C.ink, marginBottom:7 }}>
            Hid <b style={{ fontFamily:DISPLAY }}>{lastDismissed.name}</b> — you won’t see it again. <span style={{ color:C.muted }}>Mind sharing why? Totally optional, and it helps us suggest better.</span>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <input value={reasonText} onChange={(e) => setReasonText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveReason(); }}
              placeholder="e.g. reminds me of someone, too popular, hard to spell…"
              style={{ flex:1, minWidth:180, fontSize:13, padding:"7px 10px", borderRadius:8, border:`1px solid ${C.line}`, background:C.bg, color:C.ink }} />
            <button onClick={saveReason} className="lift" style={{ fontSize:12.5, fontWeight:700, padding:"7px 14px", borderRadius:8, background:C.teal, color:"#fff" }}>Save</button>
            <button onClick={() => setLastDismissed(null)} className="lift" style={{ fontSize:12.5, fontWeight:600, padding:"7px 12px", borderRadius:8, background:C.paper, border:`1px solid ${C.line}`, color:C.muted }}>No thanks</button>
          </div>
        </div>
      )}

      {sugg.length === 0 ? (
        <p style={{ fontSize:13, color:C.muted }}>You’ve added all the close matches — keep voting and check back.</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {sugg.map((item) => {
            const c = item.c, f = item.f;
            const styles = f.s.slice(0, 2).map((t) => STYLE_LABEL[t]).filter(Boolean);
            const nick = (c.nicks && c.nicks.length) ? c.nicks[0] : null;
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, background:C.paper, border:`1px solid ${C.line}` }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:DISPLAY, fontSize:22, color:C.ink }}>{c.name}</span>
                    {SAY[c.id] && <span style={{ fontSize:11, color:C.clay, fontStyle:"italic" }}>“{SAY[c.id]}”</span>}
                    {f.lean === "u" && <span style={{ fontSize:10, fontWeight:700, color:C.teal, letterSpacing:0.4 }}>UNISEX</span>}
                  </div>
                  <div style={{ fontSize:12.5, color:C.muted, margin:"2px 0 6px" }}>{cleanMeaning(MEANING[c.id]) || ""}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                    <span style={{ fontSize:10.5, color:C.muted, background:C.bg, borderRadius:999, padding:"1px 7px" }}>{ORIGIN_LABEL[f.o] || ""}</span>
                    {styles.map((s) => (
                      <span key={s} style={{ fontSize:10.5, color:C.muted, background:C.bg, borderRadius:999, padding:"1px 7px" }}>{s}</span>
                    ))}
                  </div>
                  <PopLine id={c.id} gender={g} compact meaningShown />
                  <div style={{ marginTop:6 }}>
                    <NickEditor id={c.id} nicks={mergeNicks({ id: c.id, nicks: c.nicks || [] }, g).nicks} added={addedNicksFor(data.addnicks, g, c.id)} onAddNick={onAddNick} onRemoveNick={onRemoveNick} canRemove={isOwner(profile)} gender={g} />
                  </div>
                </div>
                <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"stretch", gap:6 }}>
                  <button onClick={() => add(item)} className="lift"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 14px", borderRadius:999, fontWeight:700, fontSize:13, background:gColor(g), color:"#fff" }}>
                    <Ic n="plus" s={14} c="#fff" /> Add
                  </button>
                  <button onClick={() => dismiss(item)} className="lift"
                    style={{ fontSize:11.5, fontWeight:600, padding:"4px 10px", borderRadius:999, background:"transparent", color:C.muted }}>
                    Not for me
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {passedIds.length > 0 && (
        <div style={{ marginTop:18 }}>
          <button onClick={() => setShowPassed((s) => !s)} className="lift"
            style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, fontWeight:600, color:C.muted }}>
            <Ic n={showPassed ? "x" : "list"} s={13} /> Passed names ({passedIds.length})
          </button>
          {showPassed && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
              {passedIds.map((id) => (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontFamily:DISPLAY, fontSize:16, color:C.ink }}>{CAND_NAME[id] || id}</span>
                    {dismissed[id] && dismissed[id].r
                      ? <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>“{dismissed[id].r}”</span>
                      : <span style={{ fontSize:11.5, color:C.line, marginLeft:8, fontStyle:"italic" }}>no reason given</span>}
                  </div>
                  <button onClick={() => onRestore(g, id)} className="lift"
                    style={{ flexShrink:0, fontSize:12, fontWeight:600, padding:"5px 11px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}`, color:C.ink }}>
                    Bring back
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
