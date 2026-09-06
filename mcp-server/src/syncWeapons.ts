import { readCache, writeCache, type CacheRecord, type GithubWeaponFields } from "./cache.js";
import { listTracked } from "./pages.js";
import { fetchGithubWeapons, matchByName } from "./githubSource.js";

export interface SyncResult {
  matchedCount: number;
  unmatchedCount: number;
  unmatched: string[]; // GitHub weapon names with no tracked id - candidates for hd2_add_tracked_page
  changes: { id: string; changes: string[] }[];
}

function diffGithubFields(oldF: GithubWeaponFields | undefined, newF: GithubWeaponFields): string[] {
  if (!oldF) return ["(first github sync)"];
  const changes: string[] = [];
  for (const key of Object.keys(newF) as (keyof GithubWeaponFields)[]) {
    const a = JSON.stringify(oldF[key]);
    const b = JSON.stringify(newF[key]);
    if (a !== b) changes.push(`github.${key}: ${a} -> ${b}`);
  }
  return changes;
}

export async function syncWeaponsFromGithub(): Promise<SyncResult> {
  const tracked = listTracked("weapon").map((t) => ({ id: t.id, page: t.page }));
  const entries = await fetchGithubWeapons();
  const { matched, unmatched } = matchByName(entries, tracked);

  const changes: { id: string; changes: string[] }[] = [];
  for (const { entry, id } of matched) {
    const previous = readCache("weapon", id);
    const record: CacheRecord = previous ?? {
      id,
      page: tracked.find((t) => t.id === id)!.page,
      title: entry.name,
      fetchedAt: "",
      infobox: {},
    };
    const diff = diffGithubFields(record.github, entry);
    record.github = entry;
    record.githubFetchedAt = new Date().toISOString();
    writeCache("weapon", record);
    if (diff.length) changes.push({ id, changes: diff });
  }

  return {
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    unmatched: unmatched.map((e) => e.name),
    changes,
  };
}
