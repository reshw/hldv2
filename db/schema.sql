-- helldivers2dex canonical schema
-- Lives in its own schema (not `public`) since this DB is shared with an unrelated
-- project (carfull) - keeps the two fully separate and trivially reversible
-- (DROP SCHEMA helldivers CASCADE; removes everything below, untouched otherwise).
-- Run via seed.cjs, or manually: psql "$DATABASE_URL" -f schema.sql

CREATE SCHEMA IF NOT EXISTS helldivers;
SET search_path TO helldivers;

DROP VIEW IF EXISTS btk_matrix;
DROP VIEW IF EXISTS hit_eff_damage;
DROP TABLE IF EXISTS enemy_tips;
DROP TABLE IF EXISTS enemy_parts;
DROP TABLE IF EXISTS enemies;
DROP TABLE IF EXISTS weapon_hits;
DROP TABLE IF EXISTS weapons;

-- pen/dmg/durable mirror weapon_hits' first row, kept for quick/simple lookups; the
-- btk_matrix view below uses the full weapon_hits table (best component per target),
-- not just this row - see weapon_hits' comment.
CREATE TABLE weapons (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  cat         TEXT NOT NULL CHECK (cat IN ('primary','secondary','support')),
  pen         INTEGER NOT NULL,           -- armor value (AV) this penetrates on a direct hit
  dmg         DOUBLE PRECISION NOT NULL,  -- damage per hit when pen >= target part's armor
  durable     DOUBLE PRECISION NOT NULL,  -- fraction of dmg that still applies when NOT penetrating
  rpm         DOUBLE PRECISION NOT NULL,  -- rounds per minute
  mag         INTEGER NOT NULL,           -- magazine size
  reload      DOUBLE PRECISION NOT NULL,  -- seconds per reload
  tac_reload  DOUBLE PRECISION,
  ergonomics  DOUBLE PRECISION,
  spread_x    DOUBLE PRECISION,
  spread_y    DOUBLE PRECISION,
  caliber     DOUBLE PRECISION,
  speed       DOUBLE PRECISION,           -- projectile speed (m/s)
  mass        DOUBLE PRECISION,
  notes       TEXT,
  img         TEXT                        -- weapon photo (DiversDex "Link" column, credit: Arrowhead Studios)
);

-- One row per damage component a single trigger-pull can deal (e.g. a grenade's direct
-- kinetic hit AND its explosion). Some weapons are explicitly designed so different
-- components penetrate different armor tiers (PLAS-1 Scorcher's own notes: "the explosion
-- can penetrate medium armor but the plasma projectile has only light armor penetration") -
-- btk_matrix picks whichever component deals the most damage against each target's armor,
-- not just the first-listed one.
CREATE TABLE weapon_hits (
  id             SERIAL PRIMARY KEY,
  weapon_id      TEXT NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  ordinal        INTEGER NOT NULL,
  type           TEXT NOT NULL,           -- "Projectile" | "Explosion" | "Shrapnel" | "Fire" | ...
  dmg            DOUBLE PRECISION NOT NULL,
  durable        DOUBLE PRECISION NOT NULL,
  ap_direct      INTEGER NOT NULL,
  ap_slight      INTEGER,
  ap_large       INTEGER,
  ap_extreme     INTEGER,
  inner_radius   DOUBLE PRECISION,
  outer_radius   DOUBLE PRECISION,
  stagger_radius DOUBLE PRECISION,
  demolition     DOUBLE PRECISION,
  stagger        DOUBLE PRECISION,
  push_force     DOUBLE PRECISION,
  falloff_25m    DOUBLE PRECISION,
  falloff_50m    DOUBLE PRECISION,
  falloff_100m   DOUBLE PRECISION,
  UNIQUE (weapon_id, ordinal)
);

CREATE TABLE enemies (
  id            TEXT PRIMARY KEY,
  faction       TEXT NOT NULL CHECK (faction IN ('terminid','automaton','illuminate')),
  name          TEXT NOT NULL,
  main_hp       DOUBLE PRECISION NOT NULL,  -- the creature's overall/shared health pool
  fire_mult     DOUBLE PRECISION,           -- damage multiplier for fire/incendiary sources
  subfaction    TEXT,                       -- e.g. "Vote Snatchers" - only spawns on missions with that subfaction active
  regen_rate    DOUBLE PRECISION,           -- hp/sec regenerated on non-exempt parts (e.g. Crusher)
  regen_delay   DOUBLE PRECISION,           -- seconds after being hit before regen resumes
  regen_exempt  TEXT[]                      -- part names that do NOT regenerate
);

CREATE TABLE enemy_parts (
  id               SERIAL PRIMARY KEY,
  enemy_id         TEXT NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  ordinal          INTEGER NOT NULL,          -- preserves the original part order
  name             TEXT NOT NULL,
  hp               DOUBLE PRECISION NOT NULL, -- -1 means "no local HP pool of its own"
  armor            INTEGER NOT NULL,          -- armor value (AV), same scale as weapons.pen
  durability       DOUBLE PRECISION NOT NULL, -- captured but not used by the BTK formula yet - see data/README.md
  to_main          DOUBLE PRECISION NOT NULL, -- fraction (can exceed 1) of a hit that also drains main_hp
  lethal           BOOLEAN NOT NULL,          -- destroying this part's own hp kills the creature outright
  img              TEXT,
  alt_img          TEXT,
  exdr             DOUBLE PRECISION,          -- captured as-is from the sheet; semantics unconfirmed
  badr             DOUBLE PRECISION,
  fire_mult        DOUBLE PRECISION,
  constitution     DOUBLE PRECISION,
  main_cap         BOOLEAN,
  light_stagger    TEXT,                      -- raw "force, time, bool"-style strings from the sheet
  medium_stagger   TEXT,
  heavy_stagger    TEXT,
  massive_stagger  TEXT,
  notes            TEXT,
  UNIQUE (enemy_id, name)
);

CREATE TABLE enemy_tips (
  id        SERIAL PRIMARY KEY,
  enemy_id  TEXT NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  ordinal   INTEGER NOT NULL,
  tip       TEXT NOT NULL
);

-- Reproduces ballistics.html's computeRow() exactly, for every (weapon, part) pair.
-- Sourced directly from DiversDex's own cell documentation (not guessed):
--   ARMOR:      AP > part's Armor Value -> 100% damage. AP == Armor -> 65% damage.
--               AP < Armor -> 0% damage (ricochet).
--   DURABILITY: independently of the above, a part's durability% always lets that
--               fraction of a hit through as "durable damage" (weapon_hits.durable,
--               a fraction of .dmg) regardless of the armor tier; the remaining
--               (1 - durability) fraction is gated by the armor tier above.
-- A weapon's BEST hit component (against this specific part's armor) is used, not just
-- the first one - see weapon_hits' comment for why.
-- 'Infinity'::double precision shows up as a literal "Infinity" when queried - that's
-- correct, it means this part cannot kill the creature on its own (e.g. a pure shield).
CREATE VIEW hit_eff_damage AS
SELECT
  h.weapon_id,
  p.enemy_id,
  p.id AS part_id,
  h.ordinal,
  h.type,
  h.ap_direct,
  CASE WHEN h.ap_direct > p.armor THEN 1.0 WHEN h.ap_direct = p.armor THEN 0.65 ELSE 0 END AS armor_mult,
  h.dmg * (
    (1 - COALESCE(p.durability, 0)) * (CASE WHEN h.ap_direct > p.armor THEN 1.0 WHEN h.ap_direct = p.armor THEN 0.65 ELSE 0 END)
    + COALESCE(p.durability, 0) * h.durable
  ) AS eff_dmg
FROM weapon_hits h
JOIN enemy_parts p ON true; -- cross join: every hit component evaluated against every part

CREATE VIEW btk_matrix AS
WITH best AS (
  SELECT DISTINCT ON (weapon_id, part_id) *
  FROM hit_eff_damage
  ORDER BY weapon_id, part_id, eff_dmg DESC
)
SELECT
  w.id            AS weapon_id,
  w.name          AS weapon_name,
  w.cat           AS weapon_cat,
  e.id            AS enemy_id,
  e.name          AS enemy_name,
  e.faction,
  p.name          AS part_name,
  p.lethal,
  best.type       AS best_hit_component,
  best.armor_mult,
  best.eff_dmg,
  -- NULLIF guards eff_dmg=0 (ricochet) - NULL below means "can't be killed via this path",
  -- same meaning as the app's Infinity, just represented the way SQL represents "no answer".
  CASE
    WHEN p.lethal THEN CEIL((CASE WHEN p.hp > 0 THEN p.hp ELSE e.main_hp END) / NULLIF(best.eff_dmg, 0))
    WHEN p.to_main > 0 THEN CEIL(e.main_hp / NULLIF(best.eff_dmg * p.to_main, 0))
    ELSE NULL
  END             AS btk,
  CASE WHEN p.hp > 0 THEN CEIL(p.hp / NULLIF(best.eff_dmg, 0)) END AS sever_shots
FROM best
JOIN weapons w ON w.id = best.weapon_id
JOIN enemy_parts p ON p.id = best.part_id
JOIN enemies e ON e.id = p.enemy_id;

COMMENT ON VIEW btk_matrix IS
  'One row per (weapon, enemy body part), using whichever weapon_hits component deals the '
  'most damage against that part''s armor. btk = shots needed via that part to kill the '
  'whole creature; sever_shots = shots to destroy just that part''s own hp pool. Does NOT '
  'account for regenerating enemies (see enemies.regen_rate) or multi-part splash. See '
  'data/README.md for the full model.';
