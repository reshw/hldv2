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

export function hitEffDamage(h, armor, partDurability) {
  const pd = partDurability || 0;
  const blended = h.dmg * (1 - pd) + h.dmg * h.durable * pd;
  return blended * armorMultiplier(h.apDirect, armor);
}

/** A weapon can list several hit components with different penetration ratings on purpose
 * (e.g. the Scorcher's projectile vs its explosion) - use whichever gets through best.
 *
 * "Fire" is different from a true alternate hit path like Scorcher's explosion: it's an
 * ignition DOT that the bullet's own impact causes (every Fire-type weapon's sheet notes say
 * so - "Sets enemies on fire"), not an independent physical damage source. A ricocheted bullet
 * never lands, so it can't ignite anything either - Fire can't win bestHit purely on its own
 * (often higher) AP rating unless some non-Fire component actually penetrates first. */
export function bestHit(w, armor, partDurability) {
  const hits = weaponHits(w);
  const isFire = (h) => h.type && h.type.toLowerCase() === "fire";
  const anyLands = hits.some((h) => !isFire(h) && armorMultiplier(h.apDirect, armor) > 0);

  let best = null;
  let bestDmg = -Infinity;
  hits.forEach((h) => {
    if (isFire(h) && !anyLands) return; // nothing penetrated - no ignition possible
    const d = hitEffDamage(h, armor, partDurability);
    if (d > bestDmg) {
      bestDmg = d;
      best = h;
    }
  });
  if (!best) {
    best = hits[0];
    bestDmg = hitEffDamage(best, armor, partDurability);
  }
  return { hit: best, dmg: bestDmg };
}

export function totalEffDamage(w, armor, partDurability) {
  return bestHit(w, armor, partDurability).dmg;
}

export function penStatus(w, armor, partDurability) {
  const h = bestHit(w, armor, partDurability).hit;
  const mult = armorMultiplier(h.apDirect, armor);
  if (mult === 1) return "full";
  if (mult === 0.65) return "half";
  const pd = partDurability || 0;
  return pd > 0 && h.durable > 0 ? "partial" : "blocked";
}

export function computeRow(w, part, mainHp, regen) {
  const effDmg = totalEffDamage(w, part.armor, part.durability);
  let btk;
  if (effDmg <= 0) {
    btk = Infinity; // ricocheting off the armor entirely - no amount of shots gets through
  } else if (part.lethal) {
    const lethalHp = part.hp > 0 ? part.hp : mainHp;
    btk = Math.ceil(lethalHp / effDmg);
  } else if (part.toMain > 0) {
    btk = Math.ceil(mainHp / (effDmg * part.toMain));
  } else {
    btk = Infinity;
  }
  btk = isFinite(btk) ? Math.max(1, btk) : btk;
  const sever = part.hp > 0 && effDmg > 0 ? Math.max(1, Math.ceil(part.hp / effDmg)) : null;
  const shotInterval = w.mag > 1 ? (w.rpm > 0 ? 60 / w.rpm : 0) : 0;
  const reloadsNeeded = isFinite(btk) ? (w.mag > 1 ? Math.floor((btk - 1) / w.mag) : btk - 1) : Infinity;
  const ttk = isFinite(btk) ? (btk - 1) * shotInterval + reloadsNeeded * w.reload : Infinity;
  const killsPerMag = isFinite(btk) ? Math.max(1, Math.floor(w.mag / btk)) || 0 : 0;
  const poolUsed = part.lethal ? (part.hp > 0 ? part.hp : mainHp) : mainHp;
  const dealt = isFinite(btk) ? btk * effDmg * (part.lethal ? 1 : part.toMain) : Infinity;
  const overkill = isFinite(dealt) ? Math.max(0, dealt - poolUsed) : Infinity;

  // Regenerating enemies (e.g. Crusher): sustained fire has to out-pace the regen rate on any
  // part not in the exempt list, or the part effectively never runs out - this only ever flags
  // slow/weak weapons since most primaries already clear a typical ~30 hp/s regen easily; a real
  // fight's dodge/reload downtime (which regen keeps ticking through) isn't modeled here at all.
  let regenWarning = false;
  if (regen && regen.exempt.indexOf(part.name) === -1) {
    const interval = w.mag > 1 ? shotInterval : Math.max(w.reload, 0.1);
    const sustainedDps = effDmg / Math.max(interval, 0.01);
    if (sustainedDps <= regen.rate) regenWarning = true;
  }

  return {
    eff: effDmg, btk, sever, ttk,
    killsPerMag, status: penStatus(w, part.armor, part.durability),
    reloads: reloadsNeeded, overkill, regenWarning,
    magPct: isFinite(btk) ? btk / w.mag : Infinity,
  };
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
