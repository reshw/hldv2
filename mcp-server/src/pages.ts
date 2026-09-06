import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Kind } from "./cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACKED_FILE = path.join(__dirname, "..", "data", "tracked.json");

export interface TrackedPage {
  id: string;
  page: string;
}

type TrackedFile = Record<Kind, TrackedPage[]>;

function loadFile(): TrackedFile {
  if (!existsSync(TRACKED_FILE)) return { enemy: [], weapon: [] };
  return JSON.parse(readFileSync(TRACKED_FILE, "utf8")) as TrackedFile;
}

function saveFile(data: TrackedFile): void {
  writeFileSync(TRACKED_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function listTracked(kind?: Kind): TrackedPage[] {
  const data = loadFile();
  return kind ? data[kind] : [...data.enemy, ...data.weapon];
}

export function findTracked(id: string): { kind: Kind; entry: TrackedPage } | null {
  const data = loadFile();
  for (const kind of Object.keys(data) as Kind[]) {
    const entry = data[kind].find((e) => e.id === id);
    if (entry) return { kind, entry };
  }
  return null;
}

export function addTracked(kind: Kind, id: string, page: string): { added: boolean; reason?: string } {
  const data = loadFile();
  if (data[kind].some((e) => e.id === id)) return { added: false, reason: `id "${id}" already tracked` };
  data[kind].push({ id, page });
  saveFile(data);
  return { added: true };
}
