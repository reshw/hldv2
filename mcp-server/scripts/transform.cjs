const fs = require("fs");
const path = require("path");
const { csvToObjects } = require("../dist/csv.js");

const weaponsRaw = csvToObjects(fs.readFileSync(path.join(__dirname, "../data/sheet-raw/weapon_stats.csv"), "utf8"));
const enemiesRaw = csvToObjects(fs.readFileSync(path.join(__dirname, "../data/sheet-raw/enemy_stats.csv"), "utf8"));

// ---------- weapons ----------
const WANTED_CATS = /^(Primary|Secondary|Support)\s*\//;
const EXCLUDE_NAME = /^(A-|EXO-)/; // sentries / exosuit-mounted, not handheld
const EXCLUDE_CAT = /Melee/;

function baseName(name) {
  return name
    .replace(/\s*\((?:drum|extended|short|avg|min|peak|\d+\s*RPM)\)\s*$/i, "")
    .trim();
}

const weaponGroups = new Map(); // baseName -> row
for (const r of weaponsRaw) {
  if (!WANTED_CATS.test(r.Category)) continue;
  if (EXCLUDE_CAT.test(r.Category)) continue;
  if (!r.Weapon || EXCLUDE_NAME.test(r.Weapon)) continue;
  if (!(r.Type === "Projectile" || r.Type === "Explosion" || r.Type === "Shrapnel")) continue;
  const dmg = parseFloat(r.Damage);
  if (!dmg) continue;
  const key = baseName(r.Weapon);
  const existing = weaponGroups.get(key);
  const rank = (row) => (row.Type === "Projectile" ? 0 : row.Type === "Explosion" ? 1 : 2);
  if (!existing || rank(r) < rank(existing)) {
    weaponGroups.set(key, r);
  }
}

const weapons = [...weaponGroups.entries()].map(([name, r]) => {
  const dmg = parseFloat(r.Damage) || 0;
  const durableAbs = parseFloat(r.Durable) || 0;
  const cap = parseFloat(r.Capacity) || 1;
  const rpm = parseFloat(r.RPM) || 0;
  const reload = parseFloat(r["Reload speed"]) || 0;
  const pen = parseFloat(r["AP direct"]) || 0;
  return {
    name,
    category: r.Category,
    dmg,
    durable: dmg > 0 ? Math.round((durableAbs / dmg) * 100) / 100 : 1,
    mag: Math.max(1, Math.round(cap)),
    rpm: rpm || Math.round(60 / (reload || 1)), // fallback for single-shot weapons with no listed RPM
    pen,
    reload,
  };
});

// ---------- enemies ----------
const EXCLUDE_ENEMY_NAME = /\((OUTDATED|WIP)\)/i;
const FACTION_MAP = { Automatons: "automaton", Terminids: "terminid", Illuminates: "illuminate" };

const enemyGroups = new Map(); // "faction|name" -> {faction, name, class, mainHp, parts:[]}
for (const r of enemiesRaw) {
  const faction = FACTION_MAP[r.Faction];
  if (!faction) continue; // skip "Super Earth" rows
  if (/^Other\s*\//.test(r.Full_name || "") ) {}
  const [cls, rawName] = (r.Enemy || "").split(" / ").map((s) => s && s.trim());
  if (!cls || !rawName) continue;
  if (cls === "Other") continue; // structures/objectives, not creatures
  if (EXCLUDE_ENEMY_NAME.test(rawName)) continue;

  const key = faction + "|" + rawName;
  if (!enemyGroups.has(key)) {
    enemyGroups.set(key, { faction, name: rawName, class: cls, mainHp: 0, parts: [] });
  }
  const group = enemyGroups.get(key);
  const hp = parseFloat(r.HP) || 0;
  if (r.Part === "[MAIN]") {
    group.mainHp = hp;
    continue;
  }
  const armor = parseFloat(r.Armor) || 0;
  const durability = parseFloat((r.Durability || "0").replace("%", "")) / 100;
  const toMain = parseFloat((r["To main"] || "0").replace("%", "")) / 100;
  const lethal = (r.Tag || "").trim() === "Lethal";
  group.parts.push({ name: r.Part, hp, armor, durability, toMain, lethal });
}

const enemies = [...enemyGroups.values()].filter((e) => e.mainHp > 0 && e.parts.length > 0);

fs.writeFileSync(path.join(__dirname, "../data/transformed-weapons.json"), JSON.stringify(weapons, null, 2));
fs.writeFileSync(path.join(__dirname, "../data/transformed-enemies.json"), JSON.stringify(enemies, null, 2));

console.log("weapons:", weapons.length, "enemies:", enemies.length);
console.log("--- sample weapons ---");
console.log(weapons.filter(w => /Liberator\b|Recoilless|Quasar|MG-43/.test(w.name)));
console.log("--- sample enemy (Hulk) ---");
console.log(JSON.stringify(enemies.find(e => e.name === "Hulk"), null, 2));
