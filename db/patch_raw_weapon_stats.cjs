// One-off patch: fills genuine gaps in `raw_weapon_stats` found by comparing it against a
// manually-exported xlsx of the DiversDex 2.3 "Weapon stats" tab (mcp-server/scripts/_verify_weapon_stats.py).
// The live gviz CSV fetch (import_raw_sheet.cjs) silently dropped ~80 cells across the sheet -
// mostly the `projectiles` column's text labels ("Beam"/"Melee"/"Throwable"/"Arc" for
// non-bullet weapons), `speed` for those same weapon types, and a handful of `tactical_reload`
// range strings (e.g. "1.3 - 3.3"). Every other cell already matched exactly (verified
// numerically, including percent-formatted columns), so this is a pure fill-in, not a rewrite.
require("dotenv").config({ path: __dirname + "/.env" });
const { Client } = require("pg");
const fs = require("fs");

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set - see db/.env.example"); process.exit(1); }
  const patch = JSON.parse(fs.readFileSync(__dirname + "/../mcp-server/cache/weapon_stats_xlsx_patch.json", "utf8"));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("SET search_path TO helldivers");

  for (const { row_num, col, value } of patch) {
    await client.query(`UPDATE raw_weapon_stats SET "${col}" = $1 WHERE row_num = $2`, [value, row_num]);
  }
  console.log(`Patched ${patch.length} cells in raw_weapon_stats.`);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
