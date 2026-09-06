/**
 * Automated data source: a community "DiversDex"-style Google Sheet, shared
 * directly by the user. Google Sheets' CSV export endpoint has no robots.txt
 * objection, and export-by-sheet-name (gviz) needs no auth for a publicly
 * viewable/shared sheet - unlike the wiki, this is fine to auto-fetch.
 *
 * This captures EVERY column from both tabs (not just the subset needed for
 * a basic BTK number) so the "Breakpoint Calculator" UI can show the same
 * level of detail as the source spreadsheet's own calculator tab.
 */

import { csvToObjects } from "./csv.js";

const USER_AGENT = "hd2-wiki-mcp/0.4 (personal fan tool; fetching a Google Sheet explicitly shared by the user)";

async function fetchSheetCsv(sheetId: string, sheetName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`sheet export failed (HTTP ${res.status}) for tab "${sheetName}"`);
  return res.text();
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/,/g, "").replace("%", "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
function pct(v: string | undefined): number {
  return num(v) / 100;
}
function str(v: string | undefined): string {
  const s = (v || "").trim();
  return s === "--" || s === "-" ? "" : s;
}

export interface WeaponHit {
  type: string; // "Projectile" | "Explosion" | "Shrapnel" | "Fire" | ...
  buildUp: number;
  projectiles: number;
  dmg: number;
  durable: number; // fraction 0-1 (Durable / Damage)
  apDirect: number;
  apSlight: number;
  apLarge: number;
  apExtreme: number;
  innerRadius: number;
  outerRadius: number;
  staggerRadius: number;
  demolition: number;
  stagger: number;
  pushForce: number;
  falloff1m: number;
  falloff25m: number;
  falloff50m: number;
  falloff100m: number;
}

export interface SheetWeapon {
  name: string;
  category: string;
  mag: number;
  rpm: number;
  reload: number;
  tacReload: number;
  ergonomics: number;
  spreadX: number;
  spreadY: number;
  caliber: number;
  speed: number;
  mass: number;
  notes: string;
  img?: string; // weapon photo, credited to "Arrowhead Studios" in the sheet
  hits: WeaponHit[];
  // convenience top-level fields mirroring the primary (first) hit, for simple BTK use:
  dmg: number;
  durable: number;
  pen: number; // = primary hit's apDirect
}

const WANTED_WEAPON_CATS = /^(Primary|Secondary|Support)\s*\//;
const EXCLUDE_WEAPON_NAME = /^(A-|EXO-)/;
const EXCLUDE_WEAPON_CAT = /Melee/;

function baseWeaponName(name: string): string {
  return name.replace(/\s*\((?:drum|extended|short|avg|min|peak|\d+\s*RPM)\)\s*$/i, "").trim();
}

export async function fetchSheetWeapons(sheetId: string): Promise<SheetWeapon[]> {
  const csv = await fetchSheetCsv(sheetId, "Weapon stats");
  const rows = csvToObjects(csv);

  const groups = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    if (!WANTED_WEAPON_CATS.test(r.Category) || EXCLUDE_WEAPON_CAT.test(r.Category)) continue;
    if (!r.Weapon || EXCLUDE_WEAPON_NAME.test(r.Weapon)) continue;
    if (!num(r.Damage)) continue;
    const key = baseWeaponName(r.Weapon);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const result: SheetWeapon[] = [];
  for (const [name, group] of groups.entries()) {
    // the "main" row is whichever one carries the weapon-level stats (capacity/rpm/reload)
    const main = group.find((r) => num(r.Capacity) > 0) || group[0];
    const hits: WeaponHit[] = group
      .filter((r) => ["Projectile", "Explosion", "Shrapnel", "Fire"].includes(r.Type))
      .sort((a, b) => (a.Type === "Projectile" ? -1 : b.Type === "Projectile" ? 1 : 0))
      .map((r) => ({
        type: r.Type,
        buildUp: num(r["Build-up"]),
        projectiles: num(r.Projectiles) || 1,
        dmg: num(r.Damage),
        durable: num(r.Damage) > 0 ? num(r.Durable) / num(r.Damage) : 0,
        apDirect: num(r["AP direct"]),
        apSlight: num(r["AP slight"]),
        apLarge: num(r["AP large"]),
        apExtreme: num(r["AP extreme"]),
        innerRadius: num(r["Inner radius"]),
        outerRadius: num(r["Outer radius"]),
        staggerRadius: num(r["Stagger radius"]),
        demolition: num(r.Demolition),
        stagger: num(r.Stagger),
        pushForce: num(r["Push Force"]),
        falloff1m: pct(r["1m Falloff"]),
        falloff25m: pct(r["25m Falloff"]),
        falloff50m: pct(r["50m Falloff"]),
        falloff100m: pct(r["100m Falloff"]),
      }));
    if (!hits.length) continue;

    result.push({
      name,
      category: main.Category,
      mag: Math.max(1, Math.round(num(main.Capacity)) || 1),
      rpm: num(main.RPM) || Math.round(60 / (num(main["Reload speed"]) || 1)),
      reload: num(main["Reload speed"]),
      tacReload: num(main["Tactical reload"]),
      ergonomics: num(main.Ergonomics),
      spreadX: num(main["Spread X"]),
      spreadY: num(main["Spread Y"]),
      caliber: num(main.Caliber),
      speed: num(main.Speed),
      mass: num(main.Mass),
      notes: str(main.Notes),
      ...(str(main.Link) ? { img: str(main.Link) } : {}),
      hits,
      dmg: hits[0].dmg,
      durable: hits[0].durable,
      pen: hits[0].apDirect,
    });
  }
  return result;
}

export interface SheetEnemyPart {
  name: string;
  hp: number;
  armor: number;
  durability: number;
  toMain: number;
  lethal: boolean;
  exdr: number; // "extra damage resistance" or similar - captured as-is, semantics unconfirmed
  badr: number;
  fireMult: number;
  constitution: number;
  mainCap: boolean;
  lightStagger: string;
  mediumStagger: string;
  heavyStagger: string;
  massiveStagger: string;
  demo: string;
  notes: string;
  mainImg?: string;
  altImg?: string;
}

export interface SheetEnemy {
  faction: "automaton" | "terminid" | "illuminate";
  name: string;
  class: string;
  mainHp: number;
  parts: SheetEnemyPart[];
}

const FACTION_MAP: Record<string, SheetEnemy["faction"]> = {
  Automatons: "automaton",
  Terminids: "terminid",
  Illuminates: "illuminate",
};
const EXCLUDE_ENEMY_NAME = /\((OUTDATED|WIP)\)/i;

export async function fetchSheetEnemies(sheetId: string): Promise<SheetEnemy[]> {
  const csv = await fetchSheetCsv(sheetId, "Enemy stats");
  const rows = csvToObjects(csv);
  const groups = new Map<string, SheetEnemy>();

  for (const r of rows) {
    const faction = FACTION_MAP[r.Faction];
    if (!faction) continue;
    const [cls, rawName] = (r.Enemy || "").split(" / ").map((s) => s && s.trim());
    if (!cls || !rawName || cls === "Other" || EXCLUDE_ENEMY_NAME.test(rawName)) continue;

    const key = faction + "|" + rawName;
    if (!groups.has(key)) groups.set(key, { faction, name: rawName, class: cls, mainHp: 0, parts: [] });
    const group = groups.get(key)!;

    const hp = num(r.HP);
    if (r.Part === "[MAIN]") { group.mainHp = hp; continue; }

    const mainImg = str(r["Main view"]);
    const altImg = str(r["Alt view"]);
    group.parts.push({
      name: r.Part,
      hp,
      armor: num(r.Armor),
      durability: pct(r.Durability),
      toMain: pct(r["To main"]),
      lethal: (r.Tag || "").trim() === "Lethal",
      exdr: pct(r.ExDR),
      badr: pct(r.BaDR),
      fireMult: pct(r["Fire Mult"]),
      constitution: num(r.Constitution),
      mainCap: (r["Main cap"] || "").trim().toLowerCase() === "yes",
      lightStagger: str(r["Light stagger"]),
      mediumStagger: str(r["Medium stagger"]),
      heavyStagger: str(r["Heavy stagger"]),
      massiveStagger: str(r["Massive stagger"]),
      demo: str(r.Demo),
      notes: str(r.Notes),
      ...(mainImg ? { mainImg } : {}),
      ...(altImg ? { altImg } : {}),
    });
  }

  return [...groups.values()].filter((e) => e.mainHp > 0 && e.parts.length > 0);
}
