/**
 * Automated data source: helldivers-2/json on GitHub (MIT licensed).
 *
 * Unlike helldivers.wiki.gg, this repo's whole purpose is to be pulled by
 * other apps - its README says so explicitly - and raw.githubusercontent.com
 * has no robots.txt objection to that. So this is the one source in this
 * project that's fine to auto-fetch, rather than paste-in.
 *
 * Coverage: primary + secondary weapons only (damage, capacity, fire_rate,
 * recoil, and penetration tier decoded from the traits list). No support
 * weapons, no reload time, no durable-damage % - those still need the
 * wiki-paste flow in ingest.ts.
 */

const RAW_BASE = "https://raw.githubusercontent.com/helldivers-2/json/master/items/weapons";
const USER_AGENT = "hd2-wiki-mcp/0.2 (+https://github.com/helldivers-2/json consumer; personal fan tool)";
const MIN_DELAY_MS = 300; // generous even for a static CDN-backed file

let lastFetchAt = 0;
async function throttle(): Promise<void> {
  const wait = MIN_DELAY_MS - (Date.now() - lastFetchAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchAt = Date.now();
}

async function getJson(file: string): Promise<any> {
  await throttle();
  const res = await fetch(`${RAW_BASE}/${file}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`GitHub raw fetch failed (HTTP ${res.status}) for ${file}`);
  return res.json();
}

export interface GithubWeaponEntry {
  ghId: string;
  name: string;
  damage: number;
  capacity: number;
  recoil: number;
  fireRate: number;
  penTier: number;
  category: string;
  flags: string[];
}

const PEN_TRAIT_IDS = new Set([1, 2, 3]);

export async function fetchGithubWeapons(): Promise<GithubWeaponEntry[]> {
  const [primary, secondary, traits, types] = [
    await getJson("primary.json"),
    await getJson("secondary.json"),
    await getJson("traits.json"),
    await getJson("types.json"),
  ];

  const traitMap = traits as Record<string, string>;
  const typeMap = types as Record<string, string>;
  const merged: Record<string, any> = { ...primary, ...secondary };

  const out: GithubWeaponEntry[] = [];
  for (const [ghId, raw] of Object.entries(merged)) {
    const entry = raw as any;
    const traitIds: number[] = Array.isArray(entry.traits) ? entry.traits : [];
    let penTier = 0;
    const flags: string[] = [];
    for (const t of traitIds) {
      if (PEN_TRAIT_IDS.has(t)) penTier = Math.max(penTier, t);
      else if (traitMap[String(t)]) flags.push(traitMap[String(t)]);
    }
    out.push({
      ghId,
      name: entry.name,
      damage: entry.damage,
      capacity: entry.capacity,
      recoil: entry.recoil,
      fireRate: entry.fire_rate,
      penTier,
      category: typeMap[String(entry.type)] ?? "Unknown",
      flags,
    });
  }
  return out;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Matches GitHub entries to tracked ids by (normalized) weapon name. */
export function matchByName<T extends { page: string; id: string }>(
  entries: GithubWeaponEntry[],
  tracked: T[]
): { matched: { entry: GithubWeaponEntry; id: string }[]; unmatched: GithubWeaponEntry[] } {
  const byName = new Map(tracked.map((t) => [normalizeName(t.page), t.id]));
  const matched: { entry: GithubWeaponEntry; id: string }[] = [];
  const unmatched: GithubWeaponEntry[] = [];
  for (const entry of entries) {
    const id = byName.get(normalizeName(entry.name));
    if (id) matched.push({ entry, id });
    else unmatched.push(entry);
  }
  return { matched, unmatched };
}
