# Helldivers 2 dex — canonical data

This is the single source of truth for enemy/weapon stats in this project.
Everything downstream (the `ballistics.html` calculator, any future analysis
or strategy write-up) should read from here rather than re-deriving numbers.

- `enemies.json` — every tracked enemy
- `weapons.json` — every tracked weapon

Both are plain JSON arrays, small enough to read whole with the `Read` tool
or grep directly — no query engine needed. They exactly match what's shipped
in the published `ballistics.html` artifact (see "Keeping this in sync"
below) so answering a question from this file and answering it from the live
calculator will never disagree.

## `weapons.json` schema

```jsonc
{
  "id": "liberator",          // stable slug, used to cross-reference
  "name": "AR-23 Liberator",  // in-game display name
  "cat": "primary",           // "primary" | "secondary" | "support"
  "pen": 2,                   // armor value (AV) this penetrates on a direct hit, 0-7ish
  "dmg": 80,                  // damage per hit when pen >= target's armor
  "durable": 0.19,            // fraction of `dmg` that still applies even when NOT penetrating
  "rpm": 640,                 // rounds per minute (cyclic rate while ammo remains)
  "mag": 60,                  // magazine size
  "reload": 3.5               // seconds per reload
}
```

Effective damage against a given body part:
`pen >= part.armor ? dmg : dmg * durable`

## `enemies.json` schema

```jsonc
{
  "id": "hulk",
  "faction": "automaton",     // "terminid" | "automaton" | "illuminate"
  "name": "Hulk",
  "mainHp": 1800,             // the creature's overall/shared health pool
  "parts": [
    {
      "name": "Eye",
      "hp": 250,               // this part's own HP pool; -1 means it has none of its own
      "armor": 4,              // armor value (AV), same scale as a weapon's `pen`
      "durability": 0.25,      // NOT currently used by the BTK formula (kept for reference /
                                // future refinement - see "Known gaps" below)
      "toMain": 1,             // fraction (CAN exceed 1) of a hit's damage that also drains mainHp
      "lethal": true,          // true = destroying this part's own HP kills the whole creature outright
      "img": "https://i.postimg.cc/...jpg",   // optional hitbox diagram (DiversDex, credit: Roy)
      "altImg": "https://i.postimg.cc/...jpg" // optional second angle
    }
  ],
  "tips": ["...", "..."]      // short Korean tactical notes shown in the dossier
}
```

### How a kill is actually computed (BTK)

```
effectiveDamage = pen >= part.armor ? weapon.dmg : weapon.dmg * weapon.durable

if part.lethal:
    btk = ceil((part.hp > 0 ? part.hp : mainHp) / effectiveDamage)
else if part.toMain > 0:
    btk = ceil(mainHp / (effectiveDamage * part.toMain))
else:
    btk = Infinity   // this part cannot kill the creature on its own (e.g. a pure shield)
```

A second, independent number - "shots to sever/destroy this part's own HP"
(`ceil(part.hp / effectiveDamage)`, undefined when `hp <= 0`) - answers a
different question ("does this blow the leg armor off") and is shown as a
separate column in the calculator; it does not feed into `btk` itself.

## Sources, per field

- **Weapons** (`dmg`, `durable`, `mag`, `rpm`, `pen`, `reload`): the
  "DiversDex" community spreadsheet (in-game tested, cross-checked - see
  `mcp-server/README.md` for the exact URL and how to re-sync).
- **Enemies** (`mainHp`, per-part `hp`/`armor`/`durability`/`toMain`/`lethal`/images):
  same DiversDex sheet, **except** `crusher` and `wretch`, which came from
  manually-pasted `helldivers.wiki.gg` wikitext (the sheet doesn't have them
  yet) - see `mcp-server/cache/enemy/crusher.json` and `wretch.json` for the
  raw parsed wiki data behind those two entries.
- `tips`: hand-written for the enemies that had them in the original version
  of this tool; auto-generated (from `mainHp`/lethal parts/max armor) for
  the rest. Not sourced from anywhere external - treat as reasonable but
  unverified tactical color.

## Planned: stage/mission rosters (not built yet)

End goal (per user, 2026-09-07): pick a **stage/mission type** and see the full
expected enemy roster for it, per-weapon coverage across that whole roster, and
eventually score a 4-stratagem loadout against it. `subfaction` (currently just
`"Vote Snatchers"` on `crusher`/`wretch`) was a first pass at this, but it's the
wrong shape - an enemy can belong to MULTIPLE stage types (e.g. `Voteless`
appears in both a "Normal" Illuminate roster and a "Vote Snatchers" one), so a
single string field can't represent that.

Planned shape once this gets built out (fill in gradually, don't guess):
```jsonc
// a new top-level stages.json:
[{ "id": "vote_snatchers", "faction": "illuminate", "name": "Vote Snatchers" }, ...]
// enemies.json gains an array instead of the current single string:
"stages": ["normal_illuminate", "vote_snatchers"]
```
`subfaction` on the two existing entries should migrate to this once the full
stage list exists - don't build UI on top of `subfaction` as-is, it's a stub.

## Known gaps / things to treat carefully

- `durability` on enemy parts is captured but **not used** by the BTK
  formula above - only the weapon's own `durable` fraction matters right
  now. Whether/how the target's own durability% should further modify
  effective damage is unresolved (the source spreadsheet itself needed
  dozens of columns to fully model this) - don't assume the current
  simplification is exactly correct, especially for close BTK comparisons.
- `crusher`/`wretch` have no `img`/`altImg` and are not cross-checked
  against a second source the way the DiversDex-sourced entries are.
- The DiversDex sheet is a fan project (v2.3 as of this writing, not
  Arrowhead-affiliated) and can lag behind the newest patch - the
  Crusher/Wretch situation is a concrete example of that happening.

## Raw sheet mirror (Postgres only)

`db/import_raw_sheet.cjs` dumps the DiversDex sheet's tabs into Postgres verbatim -
`helldivers.raw_weapon_stats`, `raw_enemy_stats`, `raw_data_armor`, `raw_data_blast`,
`raw_data_filters`, `raw_changelog` - every column as text, no interpretation. This is
the ground truth if `weapons.json`/`enemies.json` ever seem to be missing something.
Notably, `raw_data_blast` is the sheet's own precomputed "explosion cleave" lookup
(per target part, how much of a hit's damage reaches its `[MAIN]` pool) - it's where
the "Overkill" discrepancy mentioned below could eventually be resolved from, if
someone wants to chase it further. `raw_changelog`'s last real entry is 2025-06-15
(v2.3), and the author's own to-do list there doesn't even mention Crusher/Wretch -
confirms the sheet is roughly a year-plus stale as of this writing.

**Known correction (2026-09-07):** the live gviz CSV fetch that populates
`raw_weapon_stats` silently dropped ~80 cells across the sheet - mostly the
`projectiles` column's text labels for non-bullet weapons (`Beam`/`Melee`/`Throwable`/`Arc`),
those same weapons' `speed`, and a handful of `tactical_reload` range strings
(e.g. `"1.3 - 3.3"`). Found by diffing the DB against a manually-exported xlsx of the
same tab (`mcp-server/scripts/verify_weapon_stats_xlsx.py`) and patched in place
(`db/patch_raw_weapon_stats.cjs`) - zero actual conflicts, every other cell already
matched exactly. If a fresher export ever gets handed over again, re-run the verify
script first (point `XLSX_PATH` at it) rather than assuming the live fetch is complete.
The same check against a manually-exported `raw_enemy_stats` xlsx found just 5 dropped
cells (`hp`/`armor` on the Heavy Devastator's shield and two "Floor (Eagle 500 kg)" rows,
where the sheet's own value is the literal text `"X"`) - same fix pattern
(`mcp-server/scripts/verify_enemy_stats_xlsx.py` + `db/patch_raw_enemy_stats.cjs`).

## Keeping this in sync

These files are generated FROM `ballistics.html` (not the other way around)
by `mcp-server/scripts/export_db.cjs`, which evaluates the artifact's own
`DEFAULT_ENEMIES()`/`DEFAULT_WEAPONS()` functions and dumps the result here.
Run it again any time the artifact's data changes:

```bash
node mcp-server/scripts/export_db.cjs
```

(It has the artifact's file path hard-coded near the top - update that if
the artifact moves.) The reverse pipeline - pulling fresh data in and
regenerating the artifact - is `mcp-server/scripts/gen_js.cjs` +
`mcp-server/scripts/apply.cjs`, documented in `mcp-server/README.md`.
