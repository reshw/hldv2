> **Looking for the actual data to read/analyze?** See [`../data/`](../data/README.md) -
> `enemies.json` and `weapons.json` are the canonical, queryable dataset (exactly what
> `ballistics.html` ships). Everything below is about how that data gets *produced*.

# hd2-wiki-mcp

A small MCP server that gathers Helldivers 2 enemy/weapon stats into
structured JSON for feeding into the `ballistics.html` BTK/TTK calculator.
Three sources, deliberately treated differently based on what each one
actually permits:

| Source | Covers | Fetch method |
|---|---|---|
| **DiversDex Google Sheet** (community, in-game-tested) | **everything**: full weapon list incl. support weapons (damage, durable-damage, capacity, RPM, reload, per-hit-angle penetration) AND full enemy list (per-part HP, numeric armor value, durability%, main-HP-pool contribution %, lethal/non-lethal tag, **hitbox diagram images** credited to "Roy") | **automatic** (`hd2_sync_from_sheet`) - Google Sheets CSV export, no robots.txt objection, and the user shared the link directly |
| [helldivers-2/json](https://github.com/helldivers-2/json) (GitHub, MIT) | primary/secondary weapons: damage, capacity, fire rate, penetration tier - a cross-check against the sheet | **automatic** (`hd2_sync_weapons_from_github`) - explicitly published for apps to pull |
| [helldivers.wiki.gg](https://helldivers.wiki.gg) | fallback for anything the sheet is missing | **manual paste only** (`hd2_ingest_wikitext`) - see below |

`hd2_sync_from_sheet` is what actually produced the current `ballistics.html`
dataset (92 weapons, 48 enemies) - see "Regenerating ballistics.html" below.
It's the primary source now; the other two exist for cross-checking and for
whatever the sheet doesn't cover.

## Why this doesn't fetch the wiki itself

`helldivers.wiki.gg/robots.txt` disallows `/api.php` and `/index.php` for
`User-agent: *`, and separately lists `ClaudeBot` (and every other AI
crawler) under a blanket `Disallow: /`. So this server does **not** make any
HTTP requests to the wiki. Instead:

1. You open a page yourself in your own browser (`hd2_source_instructions`
   gives you the exact `?action=edit` URL).
2. You copy the `{{Infobox Enemy}}` / `{{Infobox Weapon}}` block (and, for
   enemies, the `{{Anatomy Row}}` blocks below it).
3. You paste that into `hd2_ingest_wikitext`, which parses it locally and
   writes it to `cache/<kind>/<id>.json`. No network call happens.

This matches the actual use pattern: refresh once after a patch, not on
every launch.

## Tools

| Tool | Network? | Purpose |
|---|---|---|
| `hd2_sync_from_sheet` | **yes** (Google Sheets CSV, user-shared) | auto-refreshes the full weapon + enemy dataset |
| `hd2_list_tracked` | no | list tracked wiki pages + cache status |
| `hd2_sync_weapons_from_github` | **yes** (GitHub raw, MIT data) | auto-refreshes primary/secondary weapon stats (cross-check) |
| `hd2_source_instructions` | no | gives the wiki URL + copy steps for one page |
| `hd2_ingest_wikitext` | no | parses pasted wikitext, writes cache, reports what changed |
| `hd2_get_cached` | no | reads back a cached wiki record |
| `hd2_add_tracked_page` | no | track a new wiki page (e.g. a patch-added unit or weapon) |
| `hd2_status` | no | cache counts + the network-fetching policy above |

## Regenerating ballistics.html

After `hd2_sync_from_sheet` writes `data/transformed-weapons.json` and
`data/transformed-enemies.json`, turn those into the array literals the
artifact's `DEFAULT_WEAPONS()`/`DEFAULT_ENEMIES()` functions use:

```bash
node scripts/gen_js.cjs      # writes data/generated-data.js
node scripts/apply.cjs       # splices it into the published ballistics.html and bumps STORE_KEY
```

`apply.cjs` has the artifact's file path hard-coded near the top - update
that path if the artifact moves. `gen_js.cjs` keeps a small hand-curated
`CURATED_TIPS` map for the enemies with hand-written Korean tactics; anything
not in that map gets an auto-generated tip from its main HP / lethal parts /
armor tier instead - extend that map as you like.

## The main-HP-pool mechanic

The sheet's enemy data isn't just "each part has its own HP" - it also has a
per-enemy `mainHp` pool, and each part has a `toMain` fraction (can exceed
100% for bonus-multiplier weak spots) that decides how much of any hit to
that part also drains the shared pool, plus a `lethal` flag (destroying that
part's own HP outright kills the creature, independent of the main pool).
`ballistics.html`'s `computeRow()` implements this: lethal parts use
`ceil(partHP / effectiveDamage)`; everything else uses
`ceil(mainHP / (effectiveDamage * toMain))`. A few parts have `hp:-1`
(no local HP pool of their own, e.g. some flying units' legs) - those fall
back to `mainHp` if ever tagged lethal, and show "-" instead of a "부위 파괴"
number.

## Data model

Cached records keep the parsed template fields as-is (strings, exactly as
written on the wiki page) rather than pre-baking a damage formula - the wiki
tracks separate `health` / `av` (armor value) / `durability` per body part,
which is closer to Helldivers 2's actual armor-penetration mechanic than a
single 0-3 tier guess. Turning that into the `ballistics.html` dataset
(deciding how `av` + weapon `penetration` + `durability` combine into
effective damage) is a separate step done after ingesting real data.

## Setup

```bash
npm install
npm run build
```

## Registering with Claude Code

Add to your MCP config (e.g. via `claude mcp add`, or directly in
`.mcp.json`):

```json
{
  "mcpServers": {
    "hd2-wiki": {
      "command": "node",
      "args": ["D:/dev/helldivers2dex/mcp-server/dist/index.js"]
    }
  }
}
```

## Typical workflow after a patch

1. If the DiversDex sheet has been updated for the new patch (check its
   "Intro / READ FIRST" tab's version number), give Claude the sheet link
   and it runs `hd2_sync_from_sheet`, then `scripts/gen_js.cjs` +
   `scripts/apply.cjs` to regenerate `ballistics.html` in one pass.
2. `hd2_sync_weapons_from_github` as a free cross-check for primary/secondary
   weapons if something looks off.
3. For anything neither source has yet (a brand-new patch-added unit the
   sheet hasn't added): "패치 났어, X 갱신해줘" -> Claude calls
   `hd2_source_instructions` for it, you open the link, copy the wikitext,
   paste it back, Claude calls `hd2_ingest_wikitext`.

## Optional: identifying yourself

If you ever add a network-facing tool here in the future and want to follow
API etiquette, set `HD2_MCP_CONTACT` in the environment rather than hard-coding
an email in source - and re-check `robots.txt` first, since as of this
writing it disallows the endpoints this project would need.
