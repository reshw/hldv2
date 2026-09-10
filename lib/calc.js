// Core BTK/TTK math. Ported verbatim from web/index.html - see data/README.md for the
// armor/durability formula's provenance (DiversDex's own cell documentation, not guessed).

export function fmt(n, d = 0) {
  return Number(n).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtNum(n, d) {
  return isFinite(n) ? fmt(n, d) : "-";
}
export function fmtPct(n, d = 0) {
  return isFinite(n) ? fmt(n * 100, d) + "%" : "-";
}
export function avLabel(n) {
  return "AV" + n;
}

export function weaponHits(w) {
  return w.hits && w.hits.length ? w.hits : [{ type: "Projectile", dmg: w.dmg, durable: w.durable, apDirect: w.pen }];
}

/**
 * ARMOR: AP > part's Armor -> 100% damage. AP == Armor -> 65% damage. AP < Armor -> 0% (ricochet).
 * DURABILITY: blends standard vs durable damage into one raw value FIRST (e.g. 60% durability ->
 * 40% standard + 60% durable), and THAT blended value is then multiplied by the armor tier - so a
 * ricochet zeroes the whole hit, durable share included, matching the source doc's flat rule with
 * no durability exception.
 */
export function armorMultiplier(ap, armor) {
  if (ap > armor) return 1;
  if (ap === armor) return 0.65;
  return 0;
}

export function hitEffDamage(h, armor, partDurability, fireMult = 1) {
  const pd = partDurability || 0;
  const blended = h.dmg * (1 - pd) + h.dmg * h.durable * pd;
  const isFire = h.type && h.type.toLowerCase() === "fire";
  return blended * armorMultiplier(h.apDirect, armor) * (isFire ? fireMult : 1);
}

/** A weapon can list several hit components with different penetration ratings on purpose
 * (e.g. the Scorcher's projectile vs its explosion) - use whichever gets through best.
 *
 * "Fire" components are ambiguous by nature: some ignite only where the round itself actually
 * penetrates (a normal bullet's residual burn - AR-2 Coyote's notes literally say "Sets enemies
 * on fire"), others may scorch the surface independently of penetration (a flamethrower spray,
 * a splash of napalm) the way Scorcher's explosion doesn't care whether the direct pellet
 * penetrated. We don't have per-weapon confirmation of which is which, so the default is the
 * conservative one (gated on some non-Fire component actually landing first) - mark a specific
 * hit `igniteIndependent: true` in DEFAULT_WEAPONS() once verified otherwise (e.g. from actual
 * play) to let it win bestHit on its own AP regardless of whether anything else penetrated.
 * Only matters when a weapon's Fire AP differs from its direct-hit AP - same-AP weapons
 * (the flamethrowers, Laser Cannon) get the same answer either way. */
export function bestHit(w, armor, partDurability, fireMult = 1) {
  const hits = weaponHits(w);
  const isFire = (h) => h.type && h.type.toLowerCase() === "fire";
  const needsGating = (h) => isFire(h) && !h.igniteIndependent;
  const anyLands = hits.some((h) => !needsGating(h) && armorMultiplier(h.apDirect, armor) > 0);

  let best = null;
  let bestDmg = -Infinity;
  hits.forEach((h) => {
    if (needsGating(h) && !anyLands) return; // nothing penetrated - no ignition possible
    const d = hitEffDamage(h, armor, partDurability, fireMult);
    if (d > bestDmg) {
      bestDmg = d;
      best = h;
    }
  });
  if (!best) {
    best = hits[0];
    bestDmg = hitEffDamage(best, armor, partDurability, fireMult);
  }
  return { hit: best, dmg: bestDmg };
}

export function totalEffDamage(w, armor, partDurability, fireMult = 1) {
  return bestHit(w, armor, partDurability, fireMult).dmg;
}

/** Per-part fire-damage bonus (Crusher: 1.5x, from the wiki's "Fire Damage Multiplier"),
 * falling back from the part to the enemy to a no-op 1x. Mirrors the fallback MobPanel.js
 * already uses to display this stat - this is the same value, just wired into the math too. */
export function fireMultFor(part, enemy) {
  return (part && part.fireMult) || (enemy && enemy.fireMult) || 1;
}

export function penStatus(w, armor, partDurability) {
  const h = bestHit(w, armor, partDurability).hit;
  const mult = armorMultiplier(h.apDirect, armor);
  if (mult === 1) return "full";
  if (mult === 0.65) return "half";
  const pd = partDurability || 0;
  return pd > 0 && h.durable > 0 ? "partial" : "blocked";
}

/** How long (discrete shots, or continuous seconds) it takes `w` to deal `hp` worth of
 * effective damage against a part, given that part's already-computed effective damage/DPS
 * (`effDmg`). Shared by computeRow (single selected part) and computeKillPaths (Part B) so
 * both agree on the same weapon+part number instead of drifting apart. Returns null if the
 * weapon can't penetrate at all, or `hp` is already unreachable (Infinity). */
export function costToDeplete(w, effDmg, hp) {
  if (!(effDmg > 0) || !isFinite(hp)) return null;
  if (w.continuous) return { seconds: hp / effDmg, shots: null, reloadsNeeded: null };
  const shots = Math.max(1, Math.ceil(hp / effDmg));
  const shotInterval = w.mag > 1 ? (w.rpm > 0 ? 60 / w.rpm : 0) : 0;
  const reloadsNeeded = w.mag > 1 ? Math.floor((shots - 1) / w.mag) : shots - 1;
  const seconds = (shots - 1) * shotInterval + reloadsNeeded * w.reload;
  return { seconds, shots, reloadsNeeded };
}

/** Continuous-fire weapons (mag is a canister capacity, not a shot count - see `continuous`
 * on FLAM-40) need canister swaps folded in on top of raw firing seconds, using the canister's
 * real hold-time (`fireDuration`) rather than the discrete mag/rpm math above. */
function applyContinuousReloads(w, firingSeconds) {
  if (!isFinite(firingSeconds)) return { totalSeconds: Infinity, reloads: Infinity };
  const duration = w.fireDuration > 0 ? w.fireDuration : Infinity;
  const canisters = Math.max(1, Math.ceil(firingSeconds / duration));
  const reloads = canisters - 1;
  return { totalSeconds: firingSeconds + reloads * w.reload, reloads };
}

export function computeRow(w, part, mainHp, regen, fireMult = 1) {
  const effDmg = totalEffDamage(w, part.armor, part.durability, fireMult);
  let requiredHp;
  if (effDmg <= 0) {
    requiredHp = Infinity; // ricocheting off the armor entirely - no amount of fire gets through
  } else if (part.lethal) {
    requiredHp = part.hp > 0 ? part.hp : mainHp;
  } else if (part.toMain > 0) {
    requiredHp = mainHp / part.toMain;
  } else {
    requiredHp = Infinity;
  }
  const cost = costToDeplete(w, effDmg, requiredHp);

  let btk, ttk, reloadsNeeded, killsPerMag, magPct;
  if (w.continuous) {
    // No discrete "shots" concept for a stream weapon - btk stays Infinity so the UI's
    // existing isFinite()->"-" fallback shows correctly instead of a misleading shot count.
    btk = Infinity;
    if (cost) {
      const wrapped = applyContinuousReloads(w, cost.seconds);
      ttk = wrapped.totalSeconds;
      reloadsNeeded = wrapped.reloads;
      const duration = w.fireDuration > 0 ? w.fireDuration : Infinity;
      magPct = cost.seconds / duration;
      killsPerMag = cost.seconds <= duration ? Math.max(1, Math.floor(duration / cost.seconds)) : 0;
    } else {
      ttk = Infinity;
      reloadsNeeded = Infinity;
      magPct = Infinity;
      killsPerMag = 0;
    }
  } else {
    btk = cost ? cost.shots : Infinity;
    ttk = cost ? cost.seconds : Infinity;
    reloadsNeeded = cost ? cost.reloadsNeeded : Infinity;
    killsPerMag = isFinite(btk) ? (btk > w.mag ? 0 : Math.floor(w.mag / btk)) : 0;
    magPct = isFinite(btk) ? btk / w.mag : Infinity;
  }

  const sever = part.hp > 0 && effDmg > 0
    ? (w.continuous ? part.hp / effDmg : Math.max(1, Math.ceil(part.hp / effDmg)))
    : null;
  const poolUsed = part.lethal ? (part.hp > 0 ? part.hp : mainHp) : mainHp;
  // Continuous fire can stop the instant the target dies, so there's no "last shot" overkill.
  const overkill = w.continuous
    ? 0
    : (isFinite(btk) ? Math.max(0, btk * effDmg * (part.lethal ? 1 : part.toMain) - poolUsed) : Infinity);

  // Regenerating enemies (e.g. Crusher): sustained fire has to out-pace the regen rate on any
  // part not in the exempt list, or the part effectively never runs out - this only ever flags
  // slow/weak weapons since most primaries already clear a typical ~30 hp/s regen easily; a real
  // fight's dodge/reload downtime (which regen keeps ticking through) isn't modeled here at all.
  let regenWarning = false;
  if (regen && regen.exempt.indexOf(part.name) === -1) {
    const shotInterval = w.mag > 1 ? (w.rpm > 0 ? 60 / w.rpm : 0) : 0;
    const sustainedDps = w.continuous ? effDmg : effDmg / Math.max(w.mag > 1 ? shotInterval : Math.max(w.reload, 0.1), 0.01);
    if (sustainedDps <= regen.rate) regenWarning = true;
  }

  return {
    eff: effDmg, btk, sever, ttk,
    killsPerMag, status: penStatus(w, part.armor, part.durability),
    reloads: reloadsNeeded, overkill, regenWarning,
    magPct,
  };
}

/** Ranks the viable ways to kill `enemy` with `weapon`: any directly-lethal part, any
 * lethal part gated behind another part being destroyed first (`part.requires`, e.g.
 * Crusher's Helmet->Head), and a representative "general" path via whichever non-lethal
 * toMain-bearing part drains mainHp fastest. For `weapon.splash` weapons (wide-cone/AoE,
 * not just "no magazine" - see `continuous` vs `splash` on FLAM-40), the general path also
 * gets a parametric breakdown of "if N of these parts land at once" since a spray plausibly
 * covers several hitboxes at once and we have no verified real multiplier to bake in as one
 * number - see data/README.md's FLAM-40 section for why this stays a range, not a guess. */
export function computeKillPaths(weapon, enemy) {
  const parts = enemy.parts;
  const paths = [];

  function stepCost(part, hp) {
    const fireMult = fireMultFor(part, enemy);
    const effDmg = totalEffDamage(weapon, part.armor, part.durability, fireMult);
    const cost = costToDeplete(weapon, effDmg, hp);
    return cost ? { part, effDmg, seconds: cost.seconds, shots: cost.shots } : null;
  }

  // Combined time for `totalShots` fired back-to-back at one target after another (discrete
  // weapons only - continuous weapons have no "shots" so their steps are summed directly by
  // the caller). Re-derives the same shotInterval/reload math costToDeplete uses for a single
  // target, but over the combined shot count, so a gate+target pair (Helmet -> Head) doesn't
  // lose the reload/cadence time between the two BY resetting to a fresh "first shot" for each.
  function combinedDiscreteSeconds(totalShots) {
    const shotInterval = weapon.mag > 1 ? (weapon.rpm > 0 ? 60 / weapon.rpm : 0) : 0;
    const reloadsNeeded = weapon.mag > 1 ? Math.floor((totalShots - 1) / weapon.mag) : totalShots - 1;
    return (totalShots - 1) * shotInterval + reloadsNeeded * weapon.reload;
  }

  parts.forEach((part) => {
    if (!part.lethal) return;
    const ownHp = part.hp > 0 ? part.hp : enemy.mainHp;
    if (part.requires) {
      const gate = parts.find((p) => p.name === part.requires);
      if (!gate) return; // data error - requires names a part that doesn't exist
      const gateStep = stepCost(gate, gate.hp > 0 ? gate.hp : enemy.mainHp);
      const targetStep = stepCost(part, ownHp);
      if (!gateStep || !targetStep) return;
      const totalSeconds = weapon.continuous
        ? gateStep.seconds + targetStep.seconds
        : combinedDiscreteSeconds(gateStep.shots + targetStep.shots);
      paths.push({ kind: "sequential", steps: [gateStep, targetStep], totalSeconds, precisionRequired: true });
    } else {
      const step = stepCost(part, ownHp);
      if (!step) return;
      paths.push({ kind: "direct", steps: [step], totalSeconds: step.seconds, precisionRequired: false });
    }
  });

  // "General": whichever non-lethal, toMain-bearing part kills fastest via mainHp drain,
  // computed through the same costToDeplete used everywhere else (shots/reload-aware for
  // discrete weapons, DPS-aware for continuous ones) - NOT a naive damage/toMain division,
  // which would silently treat a discrete weapon's per-shot damage as if it were a DPS rate.
  const generalCandidates = parts.filter((p) => !p.lethal && p.toMain > 0 && !p.requires);
  if (generalCandidates.length) {
    let bestSingle = null;
    generalCandidates.forEach((part) => {
      const fireMult = fireMultFor(part, enemy);
      const effDmg = totalEffDamage(weapon, part.armor, part.durability, fireMult);
      const cost = costToDeplete(weapon, effDmg, enemy.mainHp / part.toMain);
      if (!cost) return;
      if (!bestSingle || cost.seconds < bestSingle.seconds) bestSingle = { part, effDmg, seconds: cost.seconds };
    });

    // The N-parts-hit-at-once parametric breakdown only makes sense for a splash weapon whose
    // `dmg` is already a DPS rate (continuous) - see data/README.md's FLAM-40 section for why
    // this stays a range, not a guess. A discrete+splash weapon (none exist yet - shotgun
    // pellets are a different mechanism, see the plan's "future work") falls back to the plain
    // single-best-part general path above instead of reusing this DPS-sum math incorrectly.
    if (weapon.splash && weapon.continuous) {
      const withRate = generalCandidates
        .map((part) => {
          const fireMult = fireMultFor(part, enemy);
          const effDmg = totalEffDamage(weapon, part.armor, part.durability, fireMult);
          return { part, effDmg, rate: effDmg * part.toMain };
        })
        .filter((c) => c.rate > 0)
        .sort((a, b) => b.rate - a.rate);

      if (withRate.length) {
        const partsTable = withRate.map((_, i) => {
          const n = i + 1;
          const combinedRate = withRate.slice(0, n).reduce((sum, c) => sum + c.rate, 0);
          return { partsHit: n, totalSeconds: enemy.mainHp / combinedRate };
        });
        const recommendedN = Math.max(1, Math.min(partsTable.length, Math.round(0.75 * withRate.length)));
        const recommended = partsTable[recommendedN - 1];
        paths.push({
          kind: "general",
          steps: [{ part: withRate[0].part, effDmg: withRate[0].effDmg, seconds: recommended.totalSeconds }],
          totalSeconds: recommended.totalSeconds,
          precisionRequired: false,
          isGeneralPath: true,
          partsTable,
          recommendedN,
          totalCandidates: withRate.length,
        });
      }
    } else if (bestSingle) {
      paths.push({
        kind: "general",
        steps: [bestSingle],
        totalSeconds: bestSingle.seconds,
        precisionRequired: false,
        isGeneralPath: true,
      });
    }
  }

  paths.sort((a, b) => a.totalSeconds - b.totalSeconds);
  return paths;
}

/** Plain-text "Korean (or English if no nameKo yet)" - for input values, alt text, etc.
 * For on-screen display prefer the <DispName> component (shows English secondary too). */
export function dispText(x) {
  return x.nameKo || x.name;
}

export const CAT_LABEL_KEY = { primary: "cat_primary", secondary: "cat_secondary", support: "cat_support" };
export const SUBCAT_LABEL_KEY = {
  assault_rifle: "subcat_assault_rifle", marksman_rifle: "subcat_marksman_rifle", shotgun: "subcat_shotgun",
  smg: "subcat_smg", energy: "subcat_energy", explosive: "subcat_explosive", special: "subcat_special",
  melee: "subcat_melee", pistol: "subcat_pistol", heavy: "subcat_heavy", launcher: "subcat_launcher", precision: "subcat_precision",
};
