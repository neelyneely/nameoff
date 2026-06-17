
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
const UNISEX = [ U("lennon","Lennon",["Len","Lenny"]), U("sullivan","Sullivan",["Sully","Sunny"]), U("rory","Rory",["Ro","Rors"]), U("shae","Shae") ];
const UNISEX_IDS = new Set(UNISEX.map((u) => u.id)); // popularity shown combined across boys + girls
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
    { id:"fiona", name:"Fiona", nicks:["Fio","Oona","Finn"] },
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
  niamh:    "Irish · 'bright, radiant' (say 'Neev')",
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
  C0("girl","linnea","Linnea",["Lin","Nea"],"no",["nat","lyr"],"a",3,{girl:null},"Scandinavian · the twinflower"),
  C0("girl","sigrid","Sigrid",["Siri","Sig"],"no",["vin","pun"],"d",2,{girl:null},"Norse · victory and beauty"),
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
  C0("boy","soren","Soren",["Sory"],"no",["lyr","sur"],"n",2,{boy:500},"Danish · stern; form of Severus"),
  C0("boy","ames","Ames",[],"en",["sur","pun"],"s",1,{boy:null},"English · friend"),
  C0("boy","cassius","Cassius",["Cass","Cash"],"la",["vin","lit"],"s",3,{boy:350},"Latin · hollow"),
  C0("boy","bodhi","Bodhi",[],"sk",["nat","lyr"],"y",2,{boy:280},"Sanskrit · awakening, enlightenment"),
  C0("boy","linus","Linus",["Lin"],"gr",["vin","lit"],"s",2,{boy:null},"Greek · flax; the mythic musician"),
  C0("boy","thorne","Thorne",[],"en",["sur","nat","pun"],"n",1,{boy:null},"English · thorn bush"),
  C0("boy","cormac","Cormac",["Mac","Cory"],"ir",["pun","vin"],"k",2,{boy:null},"Irish · charioteer; raven's son"),
  C0("boy","bowen","Bowen",["Bo"],"we",["sur","lyr"],"n",2,{boy:350},"Welsh · son of Owen"),
  C0("boy","brennan","Brennan",[],"ir",["sur"],"n",2,{boy:690},"Irish · descendant of the brave one"),
  C0("boy","tiernan","Tiernan",["Tiern"],"ir",["sur","lyr"],"n",3,{boy:null},"Irish · little lord"),
  C0("boy","sutton","Sutton",[],"en",["sur"],"n",2,{boy:700},"English · from the south town"),
  C0("boy","auden","Auden",[],"en",["sur","lit","vin"],"n",2,{boy:null},"English · old friend"),
  C0("boy","thatcher","Thatcher",[],"en",["sur"],"r",2,{boy:830},"English · roof-thatcher"),
  C0("boy","lochlan","Lochlan",["Lochie","Loch"],"ir",["lyr","sur"],"n",2,{boy:700},"Irish · land of the lakes"),
  C0("boy","emmett","Emmett",[],"en",["vin","sur"],"t",2,{boy:135},"English · universal; whole"),
  C0("boy","ronan","Ronan",[],"ir",["lyr"],"n",2,{boy:340},"Irish · little seal"),
  C0("boy","desmond","Desmond",["Des","Dez"],"ir",["vin","sur"],"d",2,{boy:600},"Irish · from South Munster"),
  C0("boy","silas","Silas",[],"la",["vin","lit"],"s",2,{boy:100},"Latin · of the forest"),
  C0("boy","everett","Everett",["Ev","Rhett"],"en",["sur","vin"],"t",3,{boy:80},"English · brave as a wild boar"),
  C0("boy","cassian","Cassian",["Cass"],"la",["lyr","lit"],"n",3,{boy:710},"Latin · from the Cassia family"),
  C0("boy","arlo","Arlo",[],"en",["lyr","vin"],"o",2,{boy:180},"English · between two hills"),
  C0("boy","magnus","Magnus",["Mags"],"no",["pun","vin"],"s",2,{boy:480},"Norse · great"),
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
  C0("u","brevin","Brevin",[],"en",["sur","lyr"],"n",2,{girl:null,boy:null},"American · modern surname-name"),
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
  C0("girl","annabel","Annabel",["Anna","Bella"],"en",["lyr"],"l",3,{girl:null},"English · loving, lovable"),
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
  C0("boy","elliot","Elliot",[],"en",["sur","lit"],"t",3,{boy:151},"English · the Lord is my God"),
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
  C0("boy","abel","Abel",[],"he",["vin"],"l",2,{boy:231},"Hebrew · breath"),
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
  C0("u","shiloh","Shiloh",[],"he",["vin"],"h",2,{girl:281,boy:278},"Hebrew · tranquil; gift"),
  C0("u","eden","Eden",[],"he",["nat"],"n",2,{girl:70,boy:544},"Hebrew · paradise, delight"),
  C0("u","emery","Emery",[],"ge",["sur"],"y",3,{girl:74,boy:815},"German · brave, powerful"),
  C0("u","aubrey","Aubrey",[],"fr",["vin","lyr"],"y",2,{girl:146,boy:null},"French · elf ruler"),

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
};
// Real SSA national rank trajectories (2020–2025) for the candidate pool, parsed
// from the official "Popular Baby Names" tables. null = outside the top 1000 that
// year. Folded in non-destructively, so roster names keep their own verified data.
const CSERIES = {
  // girls
  maren:    { girl:{ 2020:438,2021:441,2022:502,2023:545,2024:569,2025:472 } },
  della:    { girl:{ 2020:916,2021:710,2022:660,2023:645,2024:580,2025:563 } },
  iris:     { girl:{ 2020:127,2021:107,2022:84, 2023:78, 2024:72, 2025:61 } },
  romy:     { girl:{ 2020:null,2021:null,2022:null,2023:null,2024:928,2025:698 } },
  juniper:  { girl:{ 2020:171,2021:137,2022:113,2023:113,2024:111,2025:100 } },
  esme:     { girl:{ 2020:395,2021:376,2022:304,2023:325,2024:343,2025:298 } },
  marigold: { girl:{ 2020:null,2021:null,2022:826,2023:713,2024:690,2025:590 } },
  elowen:   { girl:{ 2020:null,2021:null,2022:null,2023:null,2024:898,2025:798 } },
  maisie:   { girl:{ 2020:410,2021:406,2022:347,2023:294,2024:256,2025:233 } },
  nora:     { girl:{ 2020:30, 2021:27, 2022:28, 2023:24, 2024:22, 2025:20 } },
  saoirse:  { girl:{ 2020:735,2021:812,2022:894,2023:959,2024:null,2025:null } },
  thea:     { girl:{ 2020:303,2021:314,2022:300,2023:321,2024:349,2025:353 } },
  // boys
  soren:    { boy:{ 2020:509,2021:536,2022:533,2023:541,2024:571,2025:464 } },
  cassius:  { boy:{ 2020:488,2021:487,2022:549,2023:576,2024:569,2025:583 } },
  bodhi:    { boy:{ 2020:295,2021:284,2022:300,2023:294,2024:301,2025:265 } },
  bowen:    { boy:{ 2020:395,2021:368,2022:390,2023:349,2024:321,2025:266 } },
  brennan:  { boy:{ 2020:764,2021:872,2022:995,2023:null,2024:null,2025:null } },
  sutton:   { boy:{ 2020:580,2021:542,2022:527,2023:446,2024:442,2025:332 } },
  thatcher: { boy:{ 2020:845,2021:815,2022:966,2023:null,2024:null,2025:null } },
  lochlan:  { boy:{ 2020:729,2021:792,2022:806,2023:824,2024:777,2025:644 } },
  emmett:   { boy:{ 2020:107,2021:103,2022:116,2023:117,2024:119,2025:121 } },
  ronan:    { boy:{ 2020:270,2021:274,2022:266,2023:290,2024:257,2025:247 } },
  desmond:  { boy:{ 2020:361,2021:354,2022:363,2023:399,2024:368,2025:376 } },
  silas:    { boy:{ 2020:100,2021:91, 2022:87, 2023:80, 2024:81, 2025:71 } },
  everett:  { boy:{ 2020:90, 2021:83, 2022:81, 2023:89, 2024:85, 2025:77 } },
  cassian:  { boy:{ 2020:null,2021:969,2022:938,2023:529,2024:617,2025:479 } },
  arlo:     { boy:{ 2020:220,2021:190,2022:169,2023:158,2024:146,2025:148 } },
  magnus:   { boy:{ 2020:801,2021:730,2022:774,2023:763,2024:747,2025:765 } },
  // unisex
  ellis:    { girl:{ 2020:618,2021:597,2022:699,2023:752,2024:697,2025:682 }, boy:{ 2020:326,2021:320,2022:307,2023:275,2024:273,2025:243 } },
  arden:    { girl:{ 2020:null,2021:null,2022:null,2023:null,2024:null,2025:975 }, boy:{ 2020:null,2021:null,2022:null,2023:null,2024:942,2025:null } },
  reese:    { girl:{ 2020:146,2021:148,2022:168,2023:174,2024:190,2025:192 }, boy:{ 2020:733,2021:703,2022:647,2023:632,2024:621,2025:603 } },
  quinn:    { girl:{ 2020:84, 2021:81, 2022:73, 2023:86, 2024:96, 2025:97 }, boy:{ 2020:439,2021:407,2022:444,2023:452,2024:497,2025:467 } },
  emerson:  { girl:{ 2020:155,2021:168,2022:170,2023:161,2024:151,2025:122 }, boy:{ 2020:268,2021:277,2022:274,2023:268,2024:270,2025:254 } },
  sage:     { girl:{ 2020:223,2021:177,2022:143,2023:142,2024:146,2025:160 }, boy:{ 2020:436,2021:422,2022:387,2023:419,2024:414,2025:456 } },
  ellison:  { girl:{ 2020:906,2021:839,2022:null,2023:null,2024:null,2025:null } },
  indigo:   { girl:{ 2020:null,2021:901,2022:979,2023:961,2024:921,2025:854 } },
  ocean:    { girl:{ 2020:null,2021:871,2022:755,2023:823,2024:832,2025:787 }, boy:{ 2020:795,2021:712,2022:596,2023:609,2024:592,2025:720 } },
  // --- expanded mainstream pool ---
  hazel: { girl:{ 2020:31,2021:28,2022:27,2023:18,2024:19,2025:21 } },
  violet: { girl:{ 2020:37,2021:36,2022:20,2023:16,2024:15,2025:13 } },
  eleanor: { girl:{ 2020:22,2021:15,2022:16,2023:14,2024:14,2025:12 } },
  josephine: { girl:{ 2020:87,2021:72,2022:70,2023:64,2024:56,2025:53 } },
  genevieve: { girl:{ 2020:null,2021:null,2022:null,2023:165,2024:165,2025:null } },
  eloise: { girl:{ 2020:137,2021:109,2022:86,2023:81,2024:64,2025:49 } },
  clara: { girl:{ 2020:103,2021:102,2022:110,2023:98,2024:78,2025:63 } },
  cora: { girl:{ 2020:88,2021:87,2022:75,2023:93,2024:103,2025:113 } },
  stella: { girl:{ 2020:42,2021:41,2022:40,2023:46,2024:49,2025:52 } },
  aurora: { girl:{ 2020:36,2021:35,2022:31,2023:22,2024:16,2025:15 } },
  adeline: { girl:{ 2020:99,2021:94,2022:92,2023:71,2024:58,2025:59 } },
  vivian: { girl:{ 2020:101,2021:101,2022:104,2023:87,2024:77,2025:72 } },
  beatrice: { girl:{ 2020:552,2021:564,2022:554,2023:587,2024:579,2025:508 } },
  margot: { girl:{ 2020:234,2021:194,2022:193,2023:148,2024:127,2025:102 } },
  sylvie: { girl:{ 2020:775,2021:585,2022:433,2023:425,2024:356,2025:282 } },
  daphne: { girl:{ 2020:415,2021:289,2022:281,2023:241,2024:193,2025:178 } },
  rosalie: { girl:{ 2020:198,2021:185,2022:176,2023:182,2024:177,2025:171 } },
  florence: { girl:{ 2020:763,2021:715,2022:623,2023:522,2024:431,2025:391 } },
  edith: { girl:{ 2020:472,2021:493,2022:514,2023:503,2024:528,2025:499 } },
  tessa: { girl:{ 2020:281,2021:287,2022:332,2023:323,2024:303,2025:311 } },
  lucy: { girl:{ 2020:50,2021:48,2022:48,2023:40,2024:34,2025:25 } },
  alice: { girl:{ 2020:76,2021:65,2022:64,2023:66,2024:63,2025:65 } },
  naomi: { girl:{ 2020:52,2021:54,2022:46,2023:44,2024:44,2025:47 } },
  lydia: { girl:{ 2020:95,2021:89,2022:93,2023:94,2024:97,2025:92 } },
  ruby: { girl:{ 2020:74,2021:62,2022:62,2023:65,2024:62,2025:64 } },
  pearl: { girl:{ 2020:777,2021:742,2022:756,2023:800,2024:804,2025:777 } },
  maggie: { girl:{ 2020:293,2021:283,2022:294,2023:318,2024:null,2025:294 } },
  frances: { girl:{ 2020:418,2021:393,2022:419,2023:405,2024:375,2025:318 } },
  matilda: { girl:{ 2020:478,2021:466,2022:417,2023:439,2024:411,2025:365 } },
  cecilia: { girl:{ 2020:147,2021:133,2022:145,2023:137,2024:123,2025:108 } },
  poppy: { girl:{ 2020:457,2021:401,2022:338,2023:289,2024:337,2025:292 } },
  ivy: { girl:{ 2020:57,2021:49,2022:42,2023:38,2024:36,2025:39 } },
  june: { girl:{ 2020:182,2021:176,2022:172,2023:171,2024:152,2025:150 } },
  eliza: { girl:{ 2020:115,2021:111,2022:121,2023:116,2024:118,2025:115 } },
  phoebe: { girl:{ 2020:254,2021:247,2022:212,2023:191,2024:183,2025:157 } },
  adelaide: { girl:{ 2020:272,2021:261,2022:282,2023:286,2024:271,2025:289 } },
  mabel: { girl:{ 2020:428,2021:375,2022:310,2023:278,2024:222,2025:201 } },
  helena: { girl:{ 2020:512,2021:513,2022:471,2023:456,2024:414,2025:363 } },
  flora: { girl:{ 2020:925,2021:648,2022:726,2023:682,2024:645,2025:607 } },
  celia: { girl:{ 2020:790,2021:791,2022:861,2023:828,2024:735,2025:774 } },
  vera: { girl:{ 2020:246,2021:229,2022:224,2023:224,2024:226,2025:205 } },
  theodore: { boy:{ 2020:23,2021:10,2022:10,2023:7,2024:4,2025:4 } },
  felix: { boy:{ 2020:225,2021:194,2022:193,2023:193,2024:179,2025:175 } },
  hugo: { boy:{ 2020:421,2021:437,2022:400,2023:415,2024:404,2025:378 } },
  august: { boy:{ 2020:155,2021:120,2022:109,2023:104,2024:88,2025:81 } },
  miles: { boy:{ 2020:59,2021:55,2022:56,2023:43,2024:37,2025:44 } },
  oscar: { boy:{ 2020:214,2021:226,2022:201,2023:216,2024:216,2025:223 } },
  leo: { boy:{ 2020:36,2021:31,2022:22,2023:18,2024:24,2025:19 } },
  julian: { boy:{ 2020:34,2021:33,2022:35,2023:33,2024:30,2025:25 } },
  sebastian: { boy:{ 2020:19,2021:19,2022:13,2023:13,2024:14,2025:16 } },
  atticus: { boy:{ 2020:299,2021:264,2022:272,2023:284,2024:276,2025:281 } },
  ezra: { boy:{ 2020:44,2021:37,2022:25,2023:15,2024:13,2025:20 } },
  jude: { boy:{ 2020:154,2021:152,2022:160,2023:161,2024:156,2025:155 } },
  wesley: { boy:{ 2020:98,2021:85,2022:70,2023:70,2024:58,2025:52 } },
  graham: { boy:{ 2020:186,2021:161,2022:155,2023:141,2024:129,2025:120 } },
  elliot: { boy:{ 2020:164,2021:159,2022:150,2023:178,2024:150,2025:151 } },
  beckett: { boy:{ 2020:210,2021:198,2022:195,2023:196,2024:166,2025:141 } },
  nathaniel: { boy:{ 2020:125,2021:133,2022:138,2023:143,2024:144,2025:140 } },
  simon: { boy:{ 2020:249,2021:248,2022:241,2023:248,2024:251,2025:230 } },
  vincent: { boy:{ 2020:121,2021:117,2022:123,2023:120,2024:111,2025:107 } },
  frederick: { boy:{ 2020:484,2021:476,2022:478,2023:507,2024:422,2025:435 } },
  edward: { boy:{ 2020:195,2021:218,2022:216,2023:213,2024:228,2025:224 } },
  george: { boy:{ 2020:132,2021:134,2022:null,2023:136,2024:123,2025:126 } },
  walter: { boy:{ 2020:272,2021:271,2022:269,2023:267,2024:271,2025:252 } },
  bennett: { boy:{ 2020:101,2021:90,2022:83,2023:74,2024:60,2025:40 } },
  arthur: { boy:{ 2020:163,2021:155,2022:140,2023:130,2024:105,2025:87 } },
  louis: { boy:{ 2020:260,2021:251,2022:245,2023:238,2024:236,2025:249 } },
  otis: { boy:{ 2020:648,2021:647,2022:615,2023:651,2024:733,2025:652 } },
  abel: { boy:{ 2020:181,2021:195,2022:215,2023:220,2024:220,2025:231 } },
  caleb: { boy:{ 2020:56,2021:51,2022:52,2023:51,2024:49,2025:58 } },
  eli: { boy:{ 2020:60,2021:64,2022:69,2023:79,2024:92,2025:104 } },
  asher: { boy:{ 2020:32,2021:25,2022:20,2023:23,2024:20,2025:28 } },
  levi: { boy:{ 2020:18,2021:12,2022:12,2023:12,2024:12,2025:12 } },
  jonah: { boy:{ 2020:128,2021:138,2022:135,2023:124,2024:126,2025:128 } },
  milo: { boy:{ 2020:134,2021:127,2022:120,2023:121,2024:120,2025:119 } },
  dean: { boy:{ 2020:176,2021:166,2022:164,2023:159,2024:142,2025:125 } },
  reid: { boy:{ 2020:316,2021:299,2022:325,2023:315,2024:300,2025:293 } },
  cole: { boy:{ 2020:133,2021:132,2022:144,2023:155,2024:162,2025:182 } },
  jasper: { boy:{ 2020:null,2021:128,2022:129,2023:122,2024:133,2025:129 } },
  hugh: { boy:{ 2020:749,2021:742,2022:804,2023:785,2024:762,2025:732 } },
  wells: { boy:{ 2020:546,2021:482,2022:469,2023:447,2024:378,2025:347 } },
  ford: { boy:{ 2020:459,2021:439,2022:477,2023:523,2024:570,2025:null } },
  roman: { boy:{ 2020:77,2021:74,2022:68,2023:66,2024:52,2025:42 } },
  victor: { boy:{ 2020:200,2021:209,2022:214,2023:217,2024:214,2025:211 } },
  philip: { boy:{ 2020:453,2021:452,2022:493,2023:499,2024:521,2025:528 } },
  sawyer: { girl:{ 2020:239,2021:216,2022:242,2023:280,2024:297,2025:291 }, boy:{ 2020:116,2021:114,2022:131,2023:127,2024:131,2025:122 } },
  riley: { girl:{ 2020:33,2021:37,2022:39,2023:43,2024:42,2025:48 }, boy:{ 2020:257,2021:245,2022:225,2023:223,2024:229,2025:208 } },
  parker: { girl:{ 2020:128,2021:115,2022:115,2023:122,2024:104,2025:106 }, boy:{ 2020:95,2021:93,2022:94,2023:91,2024:97,2025:102 } },
  blake: { girl:{ 2020:222,2021:199,2022:200,2023:221,2024:210,2025:295 }, boy:{ 2020:209,2021:205,2022:228,2023:254,2024:265,2025:316 } },
  hayden: { girl:{ 2020:298,2021:290,2022:344,2023:368,2024:402,2025:437 }, boy:{ 2020:177,2021:175,2022:162,2023:162,2024:154,2025:161 } },
  finley: { girl:{ 2020:201,2021:211,2022:218,2023:282,2024:363,2025:415 }, boy:{ 2020:305,2021:265,2022:281,2023:285,2024:290,2025:333 } },
  tatum: { girl:{ 2020:344,2021:279,2022:274,2023:227,2024:205,2025:189 }, boy:{ 2020:490,2021:386,2022:318,2023:233,2024:195,2025:202 } },
  spencer: { boy:{ 2020:317,2021:315,2022:338,2023:362,2024:384,2025:null } },
  hollis: { boy:{ 2020:null,2021:null,2022:null,2023:1000,2024:null,2025:894 } },
  brooks: { boy:{ 2020:92,2021:78,2022:77,2023:73,2024:67,2025:64 } },
  shiloh: { girl:{ 2020:453,2021:411,2022:343,2023:283,2024:260,2025:281 }, boy:{ 2020:615,2021:579,2022:485,2023:389,2024:334,2025:278 } },
  eden: { girl:{ 2020:129,2021:121,2022:116,2023:77,2024:71,2025:70 }, boy:{ 2020:491,2021:497,2022:409,2023:440,2024:466,2025:544 } },
  emery: { girl:{ 2020:89,2021:90,2022:82,2023:70,2024:70,2025:74 }, boy:{ 2020:739,2021:771,2022:727,2023:749,2024:820,2025:815 } },
  aubrey: { girl:{ 2020:56,2021:64,2022:81,2023:101,2024:132,2025:146 } },

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
const mergeNicks = (n) => {
  const add = ADDED_NICKS[n.id];
  if (!add || !add.length) return n;
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
  return [...NAMES[gender], ...extra].filter((n) => !rm.has(n.id)).map(mergeNicks);
}
const findName = (names, id) => names.find((n) => n.id === id) || { id, name: id, nicks: [] };
const coreOf = (pg) => ({ ratings: pg.ratings, matches: pg.matches, votes: pg.votes, vetoed: pg.vetoed, starred: pg.starred, explore: pg.explore || {}, dismissed: pg.dismissed || {} });
const trimHistory = (h) => {
  let a = h.slice(-HISTORY_CAP);
  while (JSON.stringify(a).length > 45000 && a.length > 10) a = a.slice(Math.ceil(a.length * 0.1));
  return a;
};

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
  const [showSync, setShowSync] = useState(false);
  const [popMode, setPopMode] = useState(() => localStorage.getItem("nameoff_popmode") || "rank");
  const changePopMode = (m) => { setPopMode(m); try { localStorage.setItem("nameoff_popmode", m); } catch {} };
  const [sync, setSync] = useState({ on: store.configured, status: store.configured ? "syncing" : "local", at: null, err: "" });
  const dataRef = useRef(null);
  const savingRef = useRef(false);
  const genRef = useRef(0); // bumps on every local change; lets a background pull skip stale results
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

  const vetoCurrent = (id) => {
    const g = voteGender;
    const nm = findName(namesFor(g, dataRef.current.custom, dataRef.current.removed), id).name;
    const next = clone(dataRef.current);
    if (!next[g][profile].vetoed.includes(id)) next[g][profile].vetoed.push(id); // veto is per-gender
    dataRef.current = next; setData(next); setPicked(null);
    save({ [kCore(g, profile)]: coreOf(next[g][profile]) });
    if (votable(next, g)) { setPair(pickPair(poolFor(next, g), next[g][profile], null)); }
    else if (votable(next, otherG(g))) { setVoteGender(otherG(g)); setBlockCount(0); }
    else { setPair(null); }
    showToast(`Vetoed ${nm}`, () => unveto(g, profile, id));
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
  const addNick = (id, raw) => {
    const nick = (raw || "").trim();
    if (!nick) return;
    const next = clone(dataRef.current);
    const an = { ...(next.addnicks || {}) };
    const cur = an[id] ? [...an[id]] : [];
    if (cur.some((x) => x.toLowerCase() === nick.toLowerCase())) return;
    an[id] = [...cur, nick];
    next.addnicks = an; ADDED_NICKS = an;
    dataRef.current = next; setData(next);
    save({ addnicks: an });
  };
  const removeNick = (id, nick) => {
    const next = clone(dataRef.current);
    const an = { ...(next.addnicks || {}) };
    if (!an[id]) return;
    an[id] = an[id].filter((x) => x.toLowerCase() !== nick.toLowerCase());
    if (!an[id].length) delete an[id];
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
    const cur = next[g][profile];
    cur.dismissed = { ...(cur.dismissed || {}) };
    const prev = cur.dismissed[id] || {};
    cur.dismissed[id] = { r: reason != null ? reason : (prev.r || ""), t: prev.t || Date.now() };
    dataRef.current = next; setData(next);
    save({ [kCore(g, profile)]: coreOf(cur) });
  };
  const restoreSuggestion = (g, id) => {
    const next = clone(dataRef.current);
    const cur = next[g][profile];
    cur.dismissed = { ...(cur.dismissed || {}) };
    delete cur.dismissed[id];
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
    <div className="wrap">
      <Header me={data.profiles[profile]} myColor={pColor(profile)} onSwitch={switchMe}
        showAdd={showAdd} setShowAdd={setShowAdd}
        popMode={popMode} setPopMode={changePopMode} />
      {showAdd && <AddPanel custom={data.custom} onAdd={addName} onRemove={removeCustom} />}
      <Tabs view={view} setView={setView} />

      {view === "vote" && <Vote names={names} gender={voteGender} pair={pair} picked={picked} onVote={vote} onSkip={skip} onVeto={vetoCurrent}
        onBack={goBack} canGoBack={canGoBack} profile={profile}
        addnicks={data.addnicks} onAddNick={addNick} onRemoveNick={removeNick} />}
      {view === "rankings" && (unlocked
        ? <Rankings data={data} profile={profile} onUnveto={unveto} onVeto={vetoName} onClaim={claimName} onAddNick={addNick} onRemoveNick={removeNick} notes={data.notes} onSetNote={setNote} />
        : <LockMsg myVotes={myVotes} />)}
      {view === "foryou" && <ForYou data={data} profile={profile} initialGender={voteGender} onAdd={addName} onReact={reactExplore} onDismiss={dismissSuggestion} onRestore={restoreSuggestion} />}
      {view === "trends" && (unlocked
        ? <Trends data={data} profile={profile} />
        : <LockMsg myVotes={myVotes} />)}

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
function Header({ me, myColor, onSwitch, showAdd, setShowAdd, popMode, setPopMode }) {
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
function NickEditor({ id, nicks, added, onAddNick, onRemoveNick, center, big }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const addedSet = new Set((added || []).map((x) => x.toLowerCase()));
  const submit = () => { const v = val.trim(); if (v) onAddNick(id, v); setVal(""); setEditing(false); };
  const fs = big ? 13 : 11;
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", justifyContent: center ? "center" : "flex-start" }}>
      {(nicks || []).map((nk) => (
        <span key={nk} style={{ display:"flex", alignItems:"center", gap:3, fontSize:fs, fontWeight:600, padding: big ? "2px 10px" : "1px 8px", borderRadius:999, background:C.bg, border:`1px solid ${C.line}`, color:C.ink }}>
          {nk}
          {addedSet.has(nk.toLowerCase()) && (
            <button onClick={(e) => { e.stopPropagation(); onRemoveNick(id, nk); }} className="lift" aria-label={`Remove nickname ${nk}`} title="Remove this nickname"
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
function NameCard({ n, gender, onPick, onVeto, picked, dim, added, onAddNick, onRemoveNick }) {
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
      <button onClick={(e) => { e.stopPropagation(); onVeto(); }} disabled={!!picked} aria-label={`Veto ${n.name}`}
        className="lift" style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:999, color:C.clay, background:C.bg, border:`1px solid ${C.line}` }}>
        <Ic n="ban" s={13} /> Veto
      </button>
      {/* Fixed-height slots so every parallel row lines up across both cards. */}
      <div style={{ minHeight:46, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span className="disp" style={{ fontSize:36, fontWeight:800, lineHeight:1.04, color:C.ink }}>{n.name}</span>
      </div>
      <div style={{ minHeight:28, marginTop:8, display:"flex", justifyContent:"center", alignItems:"center" }}>
        {onAddNick
          ? <NickEditor id={n.id} nicks={n.nicks} added={added} onAddNick={onAddNick} onRemoveNick={onRemoveNick} center big />
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
        <NameCard n={na} gender={gender} picked={picked} dim={picked && picked !== a} onPick={() => onVote(a, b)} onVeto={() => onVeto(a)} added={(addnicks || {})[a]} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span className="disp" style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:C.muted }}>vs</span>
        </div>
        <NameCard n={nb} gender={gender} picked={picked} dim={picked && picked !== b} onPick={() => onVote(b, a)} onVeto={() => onVeto(b)} added={(addnicks || {})[b]} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
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
function RankRow({ r, rank, n, showCombo, gender, max, min, profile, readOnly, onVeto, onClaim, notes, onSetNote, added, onAddNick, onRemoveNick }) {
  const [showNote, setShowNote] = useState(false);
  const pctW = max === min ? 50 : ((r.score - min) / (max - min)) * 100;
  const accent = rankColor(n > 1 ? (rank - 1) / (n - 1) : 0);
  const noteCount = notes[r.n.id] ? Object.keys(notes[r.n.id]).length : 0;
  const attr = nameAttrib(r.n);
  return (
    <li style={{ borderRadius:12, padding:"10px 12px", background:C.paper, border:`1px solid ${C.line}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span className="disp" style={{ width:24, textAlign:"center", fontSize:18, fontWeight:700, color: accent }}>{rank}</span>
        <div style={{ flex:1, minWidth:0 }}>
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
            <NickEditor id={r.n.id} nicks={r.n.nicks} added={added} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
          </div>
          <div style={{ height:6, borderRadius:999, marginTop:6, background:C.line }}>
            <div style={{ height:6, borderRadius:999, width:`${pctW}%`, background:accent }} />
          </div>
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
function Rankings({ data, profile, onUnveto, onVeto, onClaim, onAddNick, onRemoveNick, notes, onSetNote }) {
  const [mode, setMode] = useState("combined");
  // Two rankings: the couple's combined (with agreement/disparity), and the family
  // pool (everyone who isn't Claire or Andrew). No individual tabs.
  const options = [{ key: "combined", name: "Neely Stevenson" }, { key: "everyone", name: "Fam and Friends" }];
  const readOnly = !(isOwner(profile) && mode === "combined"); // owners manage notes/vetoes on the couple's ranking only
  const tabColor = (k) => (k === "combined" ? C.teal : C.sage);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14, padding:4, borderRadius:10, background:C.paper, border:`1px solid ${C.line}` }}>
        {options.map((o) => (
          <button key={o.key} onClick={() => setMode(o.key)} className="lift" style={{ flex:"1 1 auto", padding:"7px 12px", borderRadius:8, fontSize:14, fontWeight:700,
            ...(mode === o.key ? { background: tabColor(o.key), color:"#fff" } : { color:C.muted }) }}>{o.key === profile ? `${o.name} (you)` : o.name}</button>
        ))}
      </div>
      <div className="twocol">
        <GenderRankColumn gender="girl" title="Girls" mode={mode} data={data} profile={profile} readOnly={readOnly} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onVeto={onVeto} onClaim={onClaim} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
        <GenderRankColumn gender="boy" title="Boys" mode={mode} data={data} profile={profile} readOnly={readOnly} notes={notes} onSetNote={onSetNote} onUnveto={onUnveto} onVeto={onVeto} onClaim={onClaim} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
      </div>
      {isOwner(profile) && <ManageNames data={data} profile={profile} onVeto={onVeto} onUnveto={onUnveto} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />}
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
  const everyoneScore = (id) => votedGuests.length ? votedGuests.reduce((s, k) => s + (data[gender][k].ratings[id] ?? START), 0) / votedGuests.length : START;
  // An owner's veto is a shared dealbreaker, so it benches the name in the couple's
  // AND the Fam-and-friends ranking; a person view uses that person's own vetoes.
  const isVetoed = (id) => isPerson ? sel.vetoed.includes(id) : (cVeto.includes(id) || aVeto.includes(id));
  const cMatch = data[gender].claire.matches || {}, aMatch = data[gender].andrew.matches || {};
  // "Not yet voted on" (combined view only): neither owner has seen it in a matchup yet.
  const notVotedYet = (id) => isCombined && (cMatch[id] || 0) === 0 && (aMatch[id] || 0) === 0;

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
        const split = Math.abs(cRank[n.id] - aRank[n.id]) >= splitGap;
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
              ? `Claire: ${cVotes} votes · Andrew: ${aVotes} votes.`
              : `Only ${cVoted ? "Claire" : "Andrew"} has voted so far. Showing their ratings alone; the combined ranking appears once you’ve both voted.`)
          : isEveryone
            ? `Average of ${votedGuests.length} family member${votedGuests.length === 1 ? "" : "s"}’ ratings (Claire and Andrew not included).`
            : `${data.profiles[mode]}’s ratings · ${sel.votes} votes cast.`}
      </p>
      <ol style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {live.map((r, i) => (
          <RankRow key={r.n.id} r={r} rank={liveRanks[i]} n={live.length} showCombo={isCombined} gender={gender} max={max} min={min}
            profile={profile} readOnly={readOnly} onVeto={(id) => onVeto(gender, profile, id)} onClaim={onClaim} notes={notes} onSetNote={onSetNote}
            added={addnicks[r.n.id]} onAddNick={onAddNick} onRemoveNick={onRemoveNick} />
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
  const submit = () => { const v = val.trim(); if (v) onAddNick(n.id, v); setVal(""); setEditing(false); };
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
              <button onClick={() => onRemoveNick(n.id, nk)} className="lift" aria-label={`Remove nickname ${nk}`} title="Remove this nickname"
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
            <NameChip key={n.id} n={n} added={(data.addnicks || {})[n.id]} gender={gender} profile={profile}
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
          const labs = lines.map((l) => ({ id: l.id, name: l.name, color: l.color, y: Y(valAt(l, maxX) ?? START) })).sort((a, b) => a.y - b.y);
          for (let i = 1; i < labs.length; i++) if (labs[i].y < labs[i - 1].y + 11) labs[i].y = labs[i - 1].y + 11;
          return labs.map((lb) => (
            <text key={lb.id} x={W - padR + 5} y={lb.y + 3} fontSize="9.5" fontWeight={emph === lb.id ? 800 : 600}
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
        <text x={11} y={yMid} textAnchor="middle" transform={`rotate(-90 11 ${yMid})`} fontSize="11.5" fontWeight="800" fill={yColor}>{yLabel}</text>
        <text x={xMid} y={S - padB + 22} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={xColor}>{xLabel}</text>
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
      <ScatterCompare names={names} xr={xr} yr={yr} xName="Claire" yName="Andrew" xColor={C.claire} yColor={C.andrew} />
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
  const modes = [["byName","Compare names"],["compare","Compare voters"],["agree","Agreement"],["fam","Fam and Friends vs Neely Stevenson"]];
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
function ForYou({ data, profile, initialGender, onAdd, onReact, onDismiss, onRestore }) {
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
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => react("love")} className="lift" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, padding:"7px 14px", borderRadius:999, background:C.sage, color:"#fff" }}>
              <Ic n="heart" s={13} c="#fff" fill="#fff" /> Love both
            </button>
            <button onClick={() => react("pass")} className="lift" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12.5, fontWeight:700, padding:"7px 14px", borderRadius:999, background:C.paper, border:`1px solid ${C.line}`, color:C.clay }}>
              <Ic n="ban" s={13} c={C.clay} /> Pass both
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
                    {nick && <span style={{ fontSize:12, color:C.muted }}>“{nick}”</span>}
                  </div>
                  <div style={{ fontSize:12.5, color:C.muted, margin:"2px 0 6px" }}>{cleanMeaning(MEANING[c.id]) || ""}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                    <span style={{ fontSize:10.5, color:C.muted, background:C.bg, borderRadius:999, padding:"1px 7px" }}>{ORIGIN_LABEL[f.o] || ""}</span>
                    {styles.map((s) => (
                      <span key={s} style={{ fontSize:10.5, color:C.muted, background:C.bg, borderRadius:999, padding:"1px 7px" }}>{s}</span>
                    ))}
                  </div>
                  <PopLine id={c.id} gender={g} compact meaningShown />
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
