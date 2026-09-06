import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_ROOT = path.join(__dirname, "..", "cache");

export type Kind = "enemy" | "weapon";

export interface GithubWeaponFields {
  ghId: string;
  name: string;
  damage: number;
  capacity: number;
  recoil: number;
  fireRate: number;
  penTier: number; // 0-3, decoded from traits.json (Light/Medium/Heavy Armor Penetrating)
  category: string; // decoded from types.json
  flags: string[]; // other decoded traits (Explosive, Incendiary, Beam, ...)
}

export interface CacheRecord {
  id: string;
  page: string;
  title: string;
  fetchedAt: string; // ISO timestamp - when the user pasted this in (wiki source)
  infobox: Record<string, string>;
  rows?: Record<string, string>[]; // e.g. Anatomy Row entries for enemies

  // Populated by hd2_sync_weapons_from_github (helldivers-2/json, MIT licensed,
  // fetched automatically - no robots.txt concerns, unlike the wiki fields above).
  // Covers primary/secondary weapons only: damage, capacity, fire rate, penetration.
  // Does NOT cover reload time, durable-damage %, or support weapons - those still
  // come from the manual wiki-paste flow.
  github?: GithubWeaponFields;
  githubFetchedAt?: string;
}

function dirFor(kind: Kind): string {
  const dir = path.join(CACHE_ROOT, kind);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function fileFor(kind: Kind, id: string): string {
  return path.join(dirFor(kind), `${id}.json`);
}

export function readCache(kind: Kind, id: string): CacheRecord | null {
  const f = fileFor(kind, id);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8")) as CacheRecord;
  } catch {
    return null;
  }
}

export function writeCache(kind: Kind, record: CacheRecord): void {
  writeFileSync(fileFor(kind, record.id), JSON.stringify(record, null, 2), "utf8");
}

export function listCache(kind: Kind): CacheRecord[] {
  const dir = dirFor(kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as CacheRecord);
}

/** Shallow diff of the fields that matter for the ballistics calculator. */
export function diffRecords(oldRec: CacheRecord | null, newRec: CacheRecord): string[] {
  if (!oldRec) return ["(no previous cache - first fetch)"];
  const changes: string[] = [];

  for (const key of new Set([...Object.keys(oldRec.infobox), ...Object.keys(newRec.infobox)])) {
    const a = oldRec.infobox[key];
    const b = newRec.infobox[key];
    if (a !== b) changes.push(`infobox.${key}: "${a ?? "(none)"}" -> "${b ?? "(none)"}"`);
  }

  const oldRows = oldRec.rows ?? [];
  const newRows = newRec.rows ?? [];
  const byName = (rows: Record<string, string>[]) =>
    new Map(rows.map((r) => [r.part_name ?? JSON.stringify(r), r]));
  const oldMap = byName(oldRows);
  const newMap = byName(newRows);

  for (const name of new Set([...oldMap.keys(), ...newMap.keys()])) {
    const a = oldMap.get(name);
    const b = newMap.get(name);
    if (!a) { changes.push(`row "${name}": added`); continue; }
    if (!b) { changes.push(`row "${name}": removed`); continue; }
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[key] !== b[key]) changes.push(`row "${name}".${key}: "${a[key] ?? "(none)"}" -> "${b[key] ?? "(none)"}"`);
    }
  }

  return changes.length ? changes : ["(no field changes)"];
}
