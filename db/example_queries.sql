-- A few ready-to-run examples against the seeded DB. Run with:
--   psql "$DATABASE_URL" -f db/example_queries.sql
-- or paste individual queries into psql / pgAdmin.

-- 1) Best (lowest BTK) weapon for every part of the Charger.
SELECT weapon_name, part_name, lethal, full_penetration, eff_dmg, btk, sever_shots
FROM btk_matrix
WHERE enemy_id = 'charger'
ORDER BY part_name, btk;

-- 2) Fastest way to kill a Bile Titan overall - best btk across ALL its parts.
SELECT part_name, weapon_name, btk
FROM (
  SELECT *, RANK() OVER (PARTITION BY part_name ORDER BY btk) AS rnk
  FROM btk_matrix WHERE enemy_id = 'bile_titan'
) ranked
WHERE rnk = 1
ORDER BY btk;

-- 3) Which support weapons one-shot which enemies' lethal weak points?
SELECT weapon_name, enemy_name, part_name, btk
FROM btk_matrix
WHERE weapon_cat = 'support' AND lethal AND btk = 1
ORDER BY enemy_name, weapon_name;

-- 4) For a given weapon, rank every enemy's toughest lethal part by BTK
--    (i.e. "if I only have this weapon, what's my hardest matchup?").
SELECT enemy_name, part_name, btk
FROM btk_matrix
WHERE weapon_id = 'liberator' AND lethal
ORDER BY btk DESC
LIMIT 10;

-- 5) Enemies with no verified hitbox diagram yet (currently: crusher, wretch).
SELECT DISTINCT e.name
FROM enemies e
JOIN enemy_parts p ON p.enemy_id = e.id
WHERE p.img IS NULL
GROUP BY e.name
HAVING COUNT(*) = COUNT(*) FILTER (WHERE p.img IS NULL);
