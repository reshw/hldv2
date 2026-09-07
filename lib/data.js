import enemiesJson from "@/data/enemies.json";
import weaponsJson from "@/data/weapons.json";

export const DEFAULT_ENEMIES = enemiesJson;
export const DEFAULT_WEAPONS = weaponsJson;

export const FACTIONS = {
  terminid: { key: "faction_terminid", color: "var(--terminid)", mark: "bug" },
  automaton: { key: "faction_automaton", color: "var(--automaton)", mark: "bot" },
  illuminate: { key: "faction_illuminate", color: "var(--illuminate)", mark: "eye" },
};

export function findEnemy(enemies, id) {
  return enemies.find((e) => e.id === id) || enemies[0];
}
export function findWeapon(weapons, id) {
  return weapons.find((w) => w.id === id) || weapons[0];
}
