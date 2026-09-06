-- helldivers2dex canonical schema
-- Lives in its own schema (not `public`) since this DB is shared with an unrelated
-- project (carfull) - keeps the two fully separate and trivially reversible
-- (DROP SCHEMA helldivers CASCADE; removes everything below, untouched otherwise).
-- Run via seed.cjs, or manually: psql "$DATABASE_URL" -f schema.sql

CREATE SCHEMA IF NOT EXISTS helldivers;
SET search_path TO helldivers;

DROP VIEW IF EXISTS btk_matrix;
DROP TABLE IF EXISTS enemy_tips;
DROP TABLE IF EXISTS enemy_parts;
DROP TABLE IF EXISTS enemies;
DROP TABLE IF EXISTS weapon_hits;
DROP TABLE IF EXISTS weapons;

-- pen/dmg/durable mirror hits[0] (the direct-hit component) - see the comment on
-- weapon_hits below for why only the first component feeds the BTK formula.
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
-- kinetic hit AND its explosion). ordinal 0 is always the "direct-hit" component and is
-- the ONLY one the btk_matrix view below uses - verified against the source spreadsheet's
-- own worked example (a splash component summed in would give the wrong BTK). Components
-- past ordinal 0 are kept here for reference/future use, not for the headline BTK number.
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
  id       TEXT PRIMARY KEY,
  faction  TEXT NOT NULL CHECK (faction IN ('terminid','automaton','illuminate')),
  name     TEXT NOT NULL,
  main_hp  DOUBLE PRECISION NOT NULL    -- the creature's overall/shared health pool
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
-- 'Infinity'::double precision shows up as a literal "Infinity" when queried - that's
-- correct, it means this part cannot kill the creature on its own (e.g. a pure shield).
CREATE VIEW btk_matrix AS
SELECT
  w.id            AS weapon_id,
  w.name          AS weapon_name,
  w.cat           AS weapon_cat,
  e.id            AS enemy_id,
  e.name          AS enemy_name,
  e.faction,
  p.name          AS part_name,
  p.lethal,
  (w.pen >= p.armor)                                                      AS full_penetration,
  CASE WHEN w.pen >= p.armor THEN w.dmg ELSE w.dmg * w.durable END        AS eff_dmg,
  CEIL(
    CASE
      WHEN p.lethal THEN
        (CASE WHEN p.hp > 0 THEN p.hp ELSE e.main_hp END)
        / (CASE WHEN w.pen >= p.armor THEN w.dmg ELSE w.dmg * w.durable END)
      WHEN p.to_main > 0 THEN
        e.main_hp / ((CASE WHEN w.pen >= p.armor THEN w.dmg ELSE w.dmg * w.durable END) * p.to_main)
      ELSE 'Infinity'::double precision
    END
  )               AS btk,
  CASE WHEN p.hp > 0 THEN
    CEIL(p.hp / (CASE WHEN w.pen >= p.armor THEN w.dmg ELSE w.dmg * w.durable END))
  END             AS sever_shots   -- shots to destroy just this part's own hp; null if it has none
FROM weapons w
CROSS JOIN enemies e
JOIN enemy_parts p ON p.enemy_id = e.id;

COMMENT ON VIEW btk_matrix IS
  'One row per (weapon, enemy body part). btk = shots needed via that part to kill the whole '
  'creature; sever_shots = shots to destroy just that part''s own hp pool. See data/README.md '
  'for the model this implements.';
