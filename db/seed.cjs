// Loads ../data/enemies.json + weapons.json into Postgres, per schema.sql.
// Idempotent: drops and recreates the tables every run, so it's safe to re-run
// after data/*.json is refreshed (see data/README.md for how that happens).
require("dotenv").config({ path: __dirname + "/.env" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set - copy db/.env.example to db/.env and fill it in first.");
    process.exit(1);
  }

  const enemies = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "enemies.json"), "utf8"));
  const weapons = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "weapons.json"), "utf8"));

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("SET search_path TO helldivers");
    await client.query("BEGIN");

    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await client.query(schema);

    for (const w of weapons) {
      await client.query(
        `INSERT INTO weapons (id, name, cat, pen, dmg, durable, rpm, mag, reload, tac_reload, ergonomics, spread_x, spread_y, caliber, speed, mass, notes, img)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [w.id, w.name, w.cat, w.pen, w.dmg, w.durable, w.rpm, w.mag, w.reload,
         w.tacReload ?? null, w.ergonomics ?? null, w.spreadX ?? null, w.spreadY ?? null,
         w.caliber ?? null, w.speed ?? null, w.mass ?? null, w.notes ?? null, w.img ?? null]
      );

      const hits = w.hits && w.hits.length ? w.hits : [{ type: "Projectile", dmg: w.dmg, durable: w.durable, apDirect: w.pen }];
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        await client.query(
          `INSERT INTO weapon_hits (weapon_id, ordinal, type, dmg, durable, ap_direct, ap_slight, ap_large, ap_extreme,
                                     inner_radius, outer_radius, stagger_radius, demolition, stagger, push_force,
                                     falloff_25m, falloff_50m, falloff_100m)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [w.id, i, h.type, h.dmg, h.durable, h.apDirect, h.apSlight ?? null, h.apLarge ?? null, h.apExtreme ?? null,
           h.innerRadius ?? null, h.outerRadius ?? null, h.staggerRadius ?? null, h.demolition ?? null,
           h.stagger ?? null, h.pushForce ?? null, h.falloff25m ?? null, h.falloff50m ?? null, h.falloff100m ?? null]
        );
      }
    }

    for (const e of enemies) {
      await client.query(
        `INSERT INTO enemies (id, faction, name, main_hp, fire_mult, subfaction, regen_rate, regen_delay, regen_exempt)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [e.id, e.faction, e.name, e.mainHp, e.fireMult ?? null, e.subfaction ?? null,
         e.regen?.rate ?? null, e.regen?.delay ?? null, e.regen?.exempt ?? null]
      );

      for (let i = 0; i < e.parts.length; i++) {
        const p = e.parts[i];
        await client.query(
          `INSERT INTO enemy_parts (enemy_id, ordinal, name, hp, armor, durability, to_main, lethal, img, alt_img,
                                     exdr, badr, fire_mult, constitution, main_cap,
                                     light_stagger, medium_stagger, heavy_stagger, massive_stagger, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          [e.id, i, p.name, p.hp, p.armor, p.durability, p.toMain, p.lethal, p.img ?? null, p.altImg ?? null,
           p.exdr ?? null, p.badr ?? null, p.fireMult ?? null, p.constitution ?? null, p.mainCap ?? null,
           p.lightStagger ?? null, p.mediumStagger ?? null, p.heavyStagger ?? null, p.massiveStagger ?? null, p.notes ?? null]
        );
      }

      const tips = e.tips || [];
      for (let i = 0; i < tips.length; i++) {
        await client.query(`INSERT INTO enemy_tips (enemy_id, ordinal, tip) VALUES ($1,$2,$3)`, [e.id, i, tips[i]]);
      }
    }

    await client.query("COMMIT");
    console.log(`seeded ${weapons.length} weapons, ${enemies.length} enemies (${enemies.reduce((n, e) => n + e.parts.length, 0)} parts).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
