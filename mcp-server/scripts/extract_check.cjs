const fs = require("fs");
const HTML_PATH = "C:\\Users\\seoka\\AppData\\Local\\Temp\\claude\\D--dev-helldivers2dex\\7f7bd04d-4ec9-4b95-8288-708b073bd7a9\\scratchpad\\ballistics.html";
const html = fs.readFileSync(HTML_PATH, "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log("NO SCRIPT FOUND"); process.exit(1); }
fs.writeFileSync(__dirname + "/_extracted.js", m[1]);
console.log("extracted length", m[1].length);
