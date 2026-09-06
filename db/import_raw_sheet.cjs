// Dumps the DiversDex sheet's data tabs into Postgres VERBATIM - every column, every row,
// as plain text, no interpretation. This is the "just put the whole 2.3 sheet in the DB"
// version: raw_* tables are the ground truth exactly as the spreadsheet author wrote it;
// the normalized weapons/enemies/enemy_parts tables (schema.sql) stay as the
// cleaned-up/computed view derived FROM this for the calculator's own use.
require("dotenv").config({ path: __dirname + "/.env" });
const { Client } = require("pg");

const SHEET_ID = "1CeEKZ8DvTWk9fe_PqpWoJssTbIt7g6oPV3G1Faleg9M";
const TABS = ["Weapon stats", "Enemy stats", "data_armor", "data_blast", "data_filters", "Changelog"];
const USER_AGENT = "hd2-wiki-mcp/0.4 (personal fan tool; raw sheet import explicitly requested by the sheet's own user)";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function sanitizeCol(name, index, seen) {
  let s = (name || "").toLowerCase().replace(/\n/g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!s) s = "col_" + index;
  let out = s, i = 2;
  while (seen.has(out)) out = s + "_" + i++;
  seen.add(out);
  return out;
}

async function fetchTabRows(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for tab "${tabName}"`);
  return parseCsv(await res.text());
}

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set - see db/.env.example"); process.exit(1); }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("SET search_path TO helldivers");

  for (const tab of TABS) {
    const rows = await fetchTabRows(tab);
    if (rows.length < 1) continue;
    const header = rows[0];
    const seen = new Set();
    const cols = header.map((h, i) => sanitizeCol(h, i, seen));
    const tableName = "raw_" + tab.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await client.query(
      `CREATE TABLE "${tableName}" (row_num INTEGER PRIMARY KEY, ${cols.map((c) => `"${c}" TEXT`).join(", ")})`
    );

    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const placeholders = cols.map((_, j) => `$${j + 2}`).join(", ");
      await client.query(
        `INSERT INTO "${tableName}" (row_num, ${cols.map((c) => `"${c}"`).join(", ")}) VALUES ($1, ${placeholders})`,
        [i, ...cols.map((_, j) => r[j] ?? null)]
      );
    }
    console.log(`${tableName}: ${dataRows.length} rows, ${cols.length} columns`);
  }

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
