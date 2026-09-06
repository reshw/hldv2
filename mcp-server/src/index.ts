import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listTracked, findTracked, addTracked } from "./pages.js";
import { readCache, listCache, type Kind } from "./cache.js";
import { ingestWikitext } from "./ingest.js";
import { syncWeaponsFromGithub } from "./syncWeapons.js";
import { fetchSheetWeapons, fetchSheetEnemies } from "./sheetSource.js";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new McpServer({ name: "hd2-wiki-mcp", version: "0.2.0" });

function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }] };
}

/**
 * IMPORTANT: this server does NOT fetch helldivers.wiki.gg over the network.
 * Its robots.txt disallows /api.php and /index.php for all bots, and
 * separately lists ClaudeBot (and every other AI crawler) under an explicit
 * blanket Disallow. So instead of routing around that, every tool here works
 * on wikitext the user pastes in themselves after viewing the page in their
 * own browser - the same thing they described wanting: a manual, occasional,
 * human-initiated refresh after a patch, never an automated scrape.
 */

server.registerTool(
  "hd2_list_tracked",
  {
    title: "List tracked Helldivers 2 pages",
    description:
      "Lists every enemy/weapon this server knows about, the wiki page title to look up, and local cache status " +
      "(whether it's been ingested yet, when). Purely local - no network access.",
    inputSchema: { kind: z.enum(["enemy", "weapon"]).optional() },
  },
  async ({ kind }) => {
    const kinds: Kind[] = kind ? [kind] : ["enemy", "weapon"];
    const out: Record<string, any[]> = {};
    for (const k of kinds) {
      out[k] = listTracked(k).map((t) => {
        const cached = readCache(k, t.id);
        return { id: t.id, page: t.page, cached: !!cached, fetchedAt: cached?.fetchedAt ?? null };
      });
    }
    return text(out);
  }
);

server.registerTool(
  "hd2_source_instructions",
  {
    title: "How to get the raw wikitext for one tracked page",
    description:
      "Returns the exact wiki URL and steps for a human to open helldivers.wiki.gg in their own browser and copy the " +
      "raw wikitext for a page. Use this to tell the user what to go copy before calling hd2_ingest_wikitext.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const found = findTracked(id);
    if (!found) return text({ error: `unknown id "${id}" - see hd2_list_tracked` });
    const page = found.entry.page;
    const editUrl = `https://helldivers.wiki.gg/index.php?title=${encodeURIComponent(page)}&action=edit`;
    return text({
      id,
      page,
      editUrl,
      steps: [
        `Open ${editUrl} in your own browser (logged in or not, either is fine).`,
        `Select and copy the {{Infobox ${found.kind === "enemy" ? "Enemy" : "Weapon"}}} block near the top.`,
        found.kind === "enemy" ? "Also copy every {{Anatomy Row | ... }} block further down the page." : null,
        `Paste all of it into hd2_ingest_wikitext with id="${id}".`,
      ].filter(Boolean),
    });
  }
);

server.registerTool(
  "hd2_ingest_wikitext",
  {
    title: "Parse wikitext you pasted in",
    description:
      "Parses raw MediaWiki wikitext (that YOU copied from helldivers.wiki.gg's 'Edit source' view) into structured " +
      "stats and caches it locally. This never contacts the wiki itself - it only works on text you supply. Run this " +
      "once per page after you've copied it, typically right after a game patch.",
    inputSchema: { id: z.string(), wikitext: z.string() },
  },
  async ({ id, wikitext }) => {
    const found = findTracked(id);
    if (!found) return text({ error: `unknown id "${id}" - see hd2_list_tracked, or add it with hd2_add_tracked_page` });
    return text(ingestWikitext(found.kind, id, found.entry.page, wikitext));
  }
);

server.registerTool(
  "hd2_sync_weapons_from_github",
  {
    title: "Auto-sync primary/secondary weapon stats from GitHub",
    description:
      "Fetches damage/capacity/fire_rate/recoil/penetration-tier for primary & secondary weapons from " +
      "github.com/helldivers-2/json (MIT licensed, explicitly published for third-party apps to consume - " +
      "unlike the wiki, this IS safe to auto-fetch, no robots.txt objection). Matches entries to tracked ids by " +
      "weapon name and merges into the cache without touching any wiki-sourced fields already there. Does NOT " +
      "cover support weapons, reload time, or durable-damage % - use hd2_ingest_wikitext for those. Safe to call " +
      "as often as you like (it's a small static JSON fetch), but there's little point running it more than once " +
      "per patch since the repo only updates when someone submits new datamined values.",
    inputSchema: {},
  },
  async () => text(await syncWeaponsFromGithub())
);

server.registerTool(
  "hd2_sync_from_sheet",
  {
    title: "Auto-sync weapons + enemies from a shared DiversDex-style Google Sheet",
    description:
      "Fetches the 'Weapon stats' and 'Enemy stats' tabs from a community BTK/TTK spreadsheet (Google Sheets CSV " +
      "export - no robots.txt objection, safe to auto-fetch) and writes them to data/transformed-weapons.json and " +
      "data/transformed-enemies.json. This is the richest source in the project: weapon damage/durable/capacity/RPM/" +
      "reload/penetration AND enemy per-part HP/armor/durability/main-pool-contribution/lethal-flag in one shot. " +
      "Only re-run this when the user gives you a (possibly updated) sheet link or says the spreadsheet changed - " +
      "it's a fan-maintained doc, not something to poll.",
    inputSchema: { sheetId: z.string().describe("The Google Sheets document ID from its URL (…/spreadsheets/d/<ID>/edit)") },
  },
  async ({ sheetId }) => {
    const [weapons, enemies] = await Promise.all([fetchSheetWeapons(sheetId), fetchSheetEnemies(sheetId)]);
    writeFileSync(path.join(__dirname, "..", "data", "transformed-weapons.json"), JSON.stringify(weapons, null, 2));
    writeFileSync(path.join(__dirname, "..", "data", "transformed-enemies.json"), JSON.stringify(enemies, null, 2));
    return text({ weaponCount: weapons.length, enemyCount: enemies.length, wrote: ["data/transformed-weapons.json", "data/transformed-enemies.json"] });
  }
);

server.registerTool(
  "hd2_get_cached",
  {
    title: "Read cached stats for one page",
    description: "Returns whatever is already cached (ingested) for a tracked id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const found = findTracked(id);
    if (!found) return text({ error: `unknown id "${id}" - see hd2_list_tracked` });
    const record = readCache(found.kind, id);
    if (!record) return text({ error: `no cache yet for "${id}" - see hd2_source_instructions then hd2_ingest_wikitext` });
    return text(record);
  }
);

server.registerTool(
  "hd2_add_tracked_page",
  {
    title: "Track a new enemy/weapon page",
    description:
      "Adds a new page to the tracked list (e.g. a unit added in a patch) so it shows up in hd2_list_tracked. " +
      "Does not fetch or parse anything by itself.",
    inputSchema: { kind: z.enum(["enemy", "weapon"]), id: z.string(), page: z.string() },
  },
  async ({ kind, id, page }) => text(addTracked(kind, id, page))
);

server.registerTool(
  "hd2_status",
  {
    title: "Server status",
    description: "Cache counts and a reminder of why this server never fetches the wiki itself.",
    inputSchema: {},
  },
  async () =>
    text({
      networkFetching: "disabled - helldivers.wiki.gg/robots.txt disallows /api.php and /index.php for all bots, " +
        "and separately blocks ClaudeBot and other AI crawlers outright",
      mode: "paste-to-ingest only (see hd2_source_instructions / hd2_ingest_wikitext)",
      cachedEnemies: listCache("enemy").length,
      cachedWeapons: listCache("weapon").length,
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);
