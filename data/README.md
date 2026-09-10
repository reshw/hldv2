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

## FLAM-40 continuous-fire fields (2026-09-08)

FLAM-40's `dmg`/`pen`/`mag`/`reload` were previously wrong (looked like a data-entry
accident - values that didn't match anything on the weapon's actual wiki page). Replaced
with helldivers.wiki.gg's own infobox numbers, read directly from the page's raw wikitext:
`dmg:150` (the page's own "150 DPS Fire" headline stat), `pen:4`/AP Heavy, `mag:150`
(canister capacity), `reload:4` (seconds). Two new fields drive the continuous-fire branch
in `lib/calc.js`: `continuous:true` (no discrete "shots" - `dmg` is a DPS value, not
per-hit damage) and `splash:true` (a wide cone that can plausibly hit several body parts
at once, unlike a precision beam like the Laser Cannon). `fireDuration:16.5` (seconds of
continuous fire per canister) is **not** on the wiki page - it's a user-reported figure,
precision unverified. FLAM-66 Torcher has the same "mag:1, reload:0" shape and the same now-fixed `computeRow`
TTK=0 bug, but wasn't re-verified against its own wiki page, so it's left as-is (still
`continuous`-less) until someone does the same wiki check for it. LAS-98 Laser Cannon
**was** re-verified (2026-09-10, see below) and is now fixed the same way.

## LAS-98 Laser Cannon (2026-09-10)

Same `continuous` treatment as FLAM-40, now with a wiki-confirmed `fireDuration` instead of
a user-reported one: the raw infobox gives `capacity = 12.5s` directly, and it's independently
re-derivable from the page's own Heat Data table (`Overheats at 100°C`, `Heat Per Second 8°C`
-> 100/8 = 12.5s), so this one has two independent confirmations. `reload:3.65` uses the
page's base (non-upgraded) `reload_time`, specifically the **full-overheat** reload rather
than the slower manual/tactical one (`tac_reload_time:5.1s`, kept as a separate `tacReload`
field for display) - matches how this calculator already always assumes firing a pool
all the way down before reloading. The weapon's own damage numbers (`dmg:350`,
`durable:0.57`, `pen:4`, the secondary `Fire` hit at `dmg:100`) were already correct in the
data before this fix - only the top-level `rpm`/`mag`/`reload` (the actual source of its
TTK=0 bug) and the `Fire` hit's `apSlight`/`apLarge` (were `0`, wiki says `Heavy`/`4` same
as `apDirect`, only `apExtreme` is `0`/Unarmored) needed correcting. **Not** marked
`splash` - wiki describes it as a precise, easy-to-aim single-point beam ("simply place
the reticle on top of the target"), not a wide-cone weapon like FLAM-40.

A user initially reported seeing the LAS-98's beam ricochet ("도탄") off Crusher's Helmet
(AV4) in actual play, which looked like it might contradict this calculator's
`armorMultiplier` rule (`AP === armor -> 65% damage`, not a full 0% bounce). Follow-up:
the ricochet spark/cue does show up on those hits, but sustained fire still destroys the
Helmet - i.e. it's a partial-penetration deflection effect, not a zero-damage bounce,
consistent with the existing 65% rule (Helmet's own 300 HP dies in ~1.3s of continuous
LAS-98 fire per `computeKillPaths`). No change needed; `armorMultiplier` stands as-is.

## 40-K Meltagun (2026-09-10)

Added from helldivers.wiki.gg's raw infobox: `pen:7` (Anti-Tank III), `dmg:3640`,
`mag:3`, `rpm:50`, `reload:3.75` (base, not the Siege-Ready-upgraded value). Unlike
FLAM-40, this one is modeled as an ordinary **discrete** weapon (no `continuous`/`splash`
flags) even though it fires a beam - the wiki page states outright that it's a real
3-round magazine of independent full-power bursts, not one continuous stream:
"[the beam] fires continuously for roughly 1.4 seconds ... dealing a maximum theoretical
damage of 3,640 per burst" and the infobox's own headline is "2,600 DPS" - `dmg:3640`
here is exactly `2600 × 1.4`, both figures stated directly on the page, not derived from
a guess. Its 15m-range damage falloff (wiki: "40% of damage is lost at its maximum range
... ~1,560 DPS") isn't modeled - there's no generic per-weapon range-falloff field in this
schema (the existing `falloff50m` etc. fields are a different, ballistic-drop mechanic,
not a fit for a beam's flat range cutoff), so this calculator's numbers are the weapon's
close-range max, same simplification as everywhere else.

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
