// One-off patch: fills genuine gaps in `raw_enemy_stats` found by comparing it against a
// manually-exported xlsx of the DiversDex 2.3 "Enemy stats" tab (mcp-server/scripts/verify_enemy_stats_xlsx.py).
// Only 5 cells were affected (hp/armor on 3 rows - Heavy Devastator's shield and two "Floor (Eagle
// 500 kg)" rows - where the sheet's own value is the literal text "X", not a number), all silently
// dropped by the live gviz CSV fetch. Every other cell already matched exactly.
require("dotenv").config({ path: __dirname + "/.env" });
const { Client } = require("pg");
const fs = require("fs");

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set - see db/.env.example"); process.exit(1); }
  const patch = JSON.parse(fs.readFileSync(__dirname + "/../mcp-server/cache/enemy_stats_xlsx_patch.json", "utf8"));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("SET search_path TO helldivers");

  for (const { row_num, col, value } of patch) {
    await client.query(`UPDATE raw_enemy_stats SET "${col}" = $1 WHERE row_num = $2`, [value, row_num]);
  }
  console.log(`Patched ${patch.length} cells in raw_enemy_stats.`);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
