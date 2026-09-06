// Extracts the exact DEFAULT_ENEMIES()/DEFAULT_WEAPONS() arrays currently shipping in
// web/index.html (the canonical, git-tracked copy of the calculator) and writes them out
// as the canonical DB under /data - guarantees the DB always matches what's deployed.
const fs = require("fs");
const path = require("path");

const HTML_PATH = path.join(__dirname, "..", "..", "web", "index.html");
const DB_DIR = path.join(__dirname, "..", "..", "data");

const html = fs.readFileSync(HTML_PATH, "utf8");
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) throw new Error("no <script> block found");

// Evaluate just the two data functions in isolation (no DOM needed for these).
const code = scriptMatch[1];
const startE = code.indexOf("function DEFAULT_ENEMIES()");
const startW = code.indexOf("function DEFAULT_WEAPONS()");
const endW = code.indexOf("/* ============ state");
if (startE === -1 || startW === -1 || endW === -1) throw new Error("markers not found");

const dataCode = code.slice(startE, endW);
const fn = new Function(dataCode + "\nreturn {enemies: DEFAULT_ENEMIES(), weapons: DEFAULT_WEAPONS()};");
const { enemies, weapons } = fn();

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
fs.writeFileSync(path.join(DB_DIR, "enemies.json"), JSON.stringify(enemies, null, 2));
fs.writeFileSync(path.join(DB_DIR, "weapons.json"), JSON.stringify(weapons, null, 2));

console.log("exported", enemies.length, "enemies and", weapons.length, "weapons to", DB_DIR);
