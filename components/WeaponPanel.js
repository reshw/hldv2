"use client";
import { useEffect, useRef, useState } from "react";
import DispName from "./DispName";
import StatRow from "./StatRow";
import { dispText, fmt, fmtPct, weaponHits, CAT_LABEL_KEY, SUBCAT_LABEL_KEY } from "@/lib/calc";

const CATS = ["all", "primary", "secondary", "support"];

export default function WeaponPanel({ weapons, lang, t, selectedWeapon, onSelectWeapon, catFilter, onCatFilterChange, onToggleIgnite }) {
  const [subcatFilter, setSubcatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  function catLabel(cat) {
    return cat === "all" ? t("cat_all") : t(CAT_LABEL_KEY[cat] || cat);
  }
  function subcatLabel(sc) {
    return sc === "all" ? t("subcat_all") : t(SUBCAT_LABEL_KEY[sc] || sc);
  }

  const subcats = [];
  weapons.forEach((w) => {
    if (catFilter !== "all" && w.cat !== catFilter) return;
    if (w.subcat && !subcats.includes(w.subcat)) subcats.push(w.subcat);
  });

  const q = query.trim().toLowerCase();
  const matches = weapons
    .filter((w) => {
      if (catFilter !== "all" && w.cat !== catFilter) return false;
      if (subcatFilter !== "all" && w.subcat !== subcatFilter) return false;
      return !q || w.name.toLowerCase().includes(q) || (w.nameKo && w.nameKo.includes(q));
    })
    .slice(0, 40);

  function openFresh() {
    setQuery("");
    setOpen(true);
    inputRef.current && inputRef.current.focus();
  }

  useEffect(() => {
    setActiveIndex(0);
  }, [query, catFilter, subcatFilter, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(".weapon-combo-item.kb-active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = matches[activeIndex];
      if (m) {
        onSelectWeapon(m.id);
        setOpen(false);
        inputRef.current && inputRef.current.blur();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  }

  const hits = weaponHits(selectedWeapon);

  return (
    <div className="panel">
      <div className="panel-head">{t("weapon_col_head")}</div>
      <div className="weapon-combo" style={{ padding: "10px 14px 0" }}>
        <input
          ref={inputRef}
          type="text"
          className="combo-input"
          autoComplete="off"
          value={open ? query : dispText(selectedWeapon)}
          onFocus={(e) => {
            setQuery(dispText(selectedWeapon));
            setOpen(true);
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {open && (
          <div className="weapon-combo-list" ref={listRef}>
            {matches.length === 0 ? (
              <div className="weapon-combo-empty">{t("bp_empty")}</div>
            ) : (
              matches.map((w, i) => (
                <div
                  key={w.id}
                  className={"weapon-combo-item" + (i === activeIndex ? " hl kb-active" : "")}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectWeapon(w.id);
                    setOpen(false);
                  }}
                >
                  <span>
                    <DispName x={w} />
                  </span>
                  <span className="cat">{w.subcat ? subcatLabel(w.subcat) : catLabel(w.cat)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="chips-row" style={{ padding: "8px 14px 0" }}>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={"tab-btn" + (catFilter === c ? " active" : "")}
            style={{ borderRadius: 20 }}
            onClick={() => {
              onCatFilterChange(c);
              setSubcatFilter("all");
              openFresh();
            }}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>
      {subcats.length > 0 && (
        <div className="chips-row" style={{ padding: "6px 14px 0" }}>
          {["all", ...subcats].map((sc) => (
            <button
              key={sc}
              type="button"
              className={"part-chip" + (subcatFilter === sc ? " active" : "")}
              style={{ fontSize: 11.5, padding: "4px 10px" }}
              onClick={() => {
                setSubcatFilter(sc);
                openFresh();
              }}
            >
              {subcatLabel(sc)}
            </button>
          ))}
        </div>
      )}

      <div id="weapon-info">
        <h2 className="dossier-name" style={{ fontSize: 20 }}>
          <DispName x={selectedWeapon} />
        </h2>
        {selectedWeapon.img && (
          <div className="bp-weapon-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedWeapon.img} alt={selectedWeapon.name} onError={(e) => (e.currentTarget.parentElement.style.display = "none")} />
          </div>
        )}
        <div className="stat-sections">
          <div className="stat-section">
            <div className="stat-section-title">{t("bp_col_weapon")}</div>
            <StatRow label={t("stat_cat")} value={catLabel(selectedWeapon.cat)} />
            <StatRow label={t("stat_mag")} value={fmt(selectedWeapon.mag)} />
            {!selectedWeapon.continuous && <StatRow label={t("stat_rpm")} value={fmt(selectedWeapon.rpm)} />}
            <StatRow label={t("stat_reload")} value={fmt(selectedWeapon.reload, 2)} />
            {selectedWeapon.continuous && <StatRow label={t("stat_fireduration")} value={fmt(selectedWeapon.fireDuration, 1)} />}
            {selectedWeapon.tacReload ? <StatRow label={t("stat_tacreload")} value={fmt(selectedWeapon.tacReload, 2)} /> : null}
            {selectedWeapon.ergonomics ? <StatRow label={t("stat_ergo")} value={fmt(selectedWeapon.ergonomics)} /> : null}
          </div>
          {hits.map((h, i) => (
            <div className="stat-section" key={i}>
              <div className="stat-section-title">{h.type}</div>
              <StatRow label={selectedWeapon.continuous ? t("stat_dps") : t("stat_dmg")} value={fmt(h.dmg)} />
              {!selectedWeapon.continuous && <StatRow label={t("stat_durabledmg")} value={fmt(h.dmg * h.durable)} />}
              <StatRow label={t("stat_pen4")} value={`${h.apDirect} / ${h.apSlight} / ${h.apLarge} / ${h.apExtreme}`} />
              {h.outerRadius ? <StatRow label={t("stat_blastradius")} value={`${fmt(h.innerRadius, 1)}m / ${fmt(h.outerRadius, 1)}m`} /> : null}
              {h.falloff50m ? <StatRow label={t("stat_falloff50")} value={fmtPct(h.falloff50m)} /> : null}
              {i > 0 && h.type && h.type.toLowerCase() === "fire" && (
                <div className="bp-stat">
                  <span>{t("stat_ignite_mode")}</span>
                  <button
                    type="button"
                    className="reset-btn"
                    style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => onToggleIgnite(i)}
                    title={t("stat_ignite_mode")}
                  >
                    {h.igniteIndependent ? t("ignite_independent") : t("ignite_gated")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
