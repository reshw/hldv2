"use client";
import { useEffect, useRef, useState } from "react";
import DispName from "./DispName";
import FactionMark from "./FactionMark";
import { dispText, fmtPct } from "@/lib/calc";
import { FACTIONS } from "@/lib/data";

export default function MobPanel({
  enemies, lang, t,
  selectedEnemy, onSelectEnemy,
  selectedPart, onSelectPart,
  onUpdateMainHp, onUpdatePart, onToggleLethal,
  children, // ResultPanel, rendered inside the same merged section
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const q = query.trim().toLowerCase();
  const matches = enemies
    .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.nameKo && e.nameKo.includes(q)))
    .slice(0, 40);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(".weapon-combo-item.kb-active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function handleKeyDown(ev) {
    if (!open) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const m = matches[activeIndex];
      if (m) {
        onSelectEnemy(m.id);
        setOpen(false);
        inputRef.current && inputRef.current.blur();
      }
    } else if (ev.key === "Escape") {
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  }

  const e = selectedEnemy;
  const part = e.parts[Math.min(selectedPart, e.parts.length - 1)];
  const f = FACTIONS[e.faction];
  const isInvulnPart = part.notes && /invulnerable/i.test(part.notes);

  const extraStats = [];
  if (part.exdr) extraStats.push({ label: t("target_exdr"), value: fmtPct(part.exdr) });
  if (part.badr) extraStats.push({ label: t("target_badr"), value: fmtPct(part.badr) });
  if (part.fireMult || e.fireMult) extraStats.push({ label: t("target_firemult"), value: fmtPct(part.fireMult || e.fireMult) });
  if (e.regen) {
    const exempt = e.regen.exempt.indexOf(part.name) !== -1;
    extraStats.push({
      label: t("target_regen"),
      value: exempt ? t("target_regen_none") : `${e.regen.rate}/s (${e.regen.delay}s ${t("regen_resume_suffix")})`,
    });
  }
  const stagger = [part.lightStagger, part.mediumStagger, part.heavyStagger, part.massiveStagger];
  const hasStagger = stagger.some(Boolean);

  return (
    <div className="panel">
      <div className="panel-head">{t("mob_col_head")}</div>
      <div className="weapon-combo" style={{ padding: "10px 14px 0" }}>
        <input
          ref={inputRef}
          type="text"
          className="combo-input"
          autoComplete="off"
          value={open ? query : dispText(e)}
          onFocus={(ev) => {
            setQuery(dispText(e));
            setOpen(true);
            requestAnimationFrame(() => ev.target.select());
          }}
          onChange={(ev) => setQuery(ev.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {open && (
          <div className="weapon-combo-list" ref={listRef}>
            {matches.length === 0 ? (
              <div className="weapon-combo-empty">{t("enemy_empty")}</div>
            ) : (
              matches.map((x, i) => {
                const xf = FACTIONS[x.faction];
                return (
                  <div
                    key={x.id}
                    className={"weapon-combo-item" + (i === activeIndex ? " hl kb-active" : "")}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      onSelectEnemy(x.id);
                      setOpen(false);
                    }}
                  >
                    <span>
                      <span className="dot" style={{ display: "inline-block", background: xf.color, marginRight: 6 }} />
                      <DispName x={x} />
                    </span>
                    <span className="cat">{x.mainHp.toLocaleString("ko-KR")}HP</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div id="mob-info">
        <div className="dossier-top">
          <div>
            <div className="dossier-meta" style={{ marginBottom: 6 }}>
              <span className="chip" style={{ color: f.color, borderColor: f.color }}>
                {t(f.key)}
              </span>
              {e.subfaction ? (
                <span className="chip" style={{ color: f.color, borderColor: f.color, borderStyle: "dashed" }}>
                  {e.subfaction} {t("subfaction_suffix")}
                </span>
              ) : null}
            </div>
            <h2 className="dossier-name" style={{ fontSize: 20 }}>
              <DispName x={e} />
            </h2>
          </div>
          <FactionMark kind={f.mark} color={f.color} />
        </div>

        <div className="bp-stat">
          <span>{t("main_hp_label")}</span>
          <input
            className="num-in mono"
            type="number"
            min="1"
            value={e.mainHp}
            onChange={(ev) => onUpdateMainHp(+ev.target.value)}
          />
        </div>

        <div className="section-label">{t("part_select_label")}</div>
        <div className="chips-row">
          {e.parts.map((p, i) => {
            const invuln = p.notes && /invulnerable/i.test(p.notes);
            return (
              <button
                key={p.name + i}
                type="button"
                className={"part-chip" + (i === selectedPart ? " active" : "")}
                title={p.notes || undefined}
                onClick={() => onSelectPart(i)}
              >
                {p.lethal ? <span className="w">★ </span> : null}
                {invuln ? (
                  <span className="w" style={{ color: "var(--danger)" }}>
                    {t("invuln_tag")}{" "}
                  </span>
                ) : null}
                {p.name}
              </button>
            );
          })}
        </div>

        {part.img && (
          <div className="part-images">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={part.img} alt={`${part.name} ${t("fig_front")}`} onError={(ev) => (ev.currentTarget.closest("figure").style.display = "none")} />
              <figcaption>{t("fig_front")}</figcaption>
            </figure>
            {part.altImg && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={part.altImg} alt={`${part.name} ${t("fig_side")}`} onError={(ev) => (ev.currentTarget.closest("figure").style.display = "none")} />
                <figcaption>{t("fig_side")}</figcaption>
              </figure>
            )}
            <div className="img-credit">{t("img_credit")}</div>
          </div>
        )}

        {part.notes && (
          <div className="disclaimer" style={{ borderLeftColor: isInvulnPart ? "var(--danger)" : "var(--accent)", marginBottom: 12 }}>
            <b>{isInvulnPart ? t("invuln_prefix") : t("ref_prefix")}</b> {part.notes}
          </div>
        )}

        <div className="bp-subhead">
          {part.name} — {t("parts_table_label")}
        </div>
        <div className="stat-cards">
          <div className="stat-card">
            <span>{t("col_hp")}</span>
            <input className="num-in" type="number" min="1" value={part.hp} onChange={(ev) => onUpdatePart(selectedPart, "hp", Math.max(1, Math.round(+ev.target.value)))} />
          </div>
          <div className="stat-card">
            <span>{t("col_armor")}</span>
            <input className="num-in" type="number" min="0" max="10" value={part.armor} onChange={(ev) => onUpdatePart(selectedPart, "armor", Math.max(0, Math.round(+ev.target.value)))} />
          </div>
          <div className="stat-card">
            <span>{t("col_durability")}</span>
            <div className="stat-val-row">
              <input
                className="num-in"
                type="number"
                min="0"
                max="100"
                step="5"
                value={Math.round((part.durability || 0) * 100)}
                onChange={(ev) => onUpdatePart(selectedPart, "durability", Math.max(0, Math.min(100, +ev.target.value)) / 100)}
              />
              <span className="unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <span>{t("col_tomain")}</span>
            <div className="stat-val-row">
              <input
                className="num-in"
                type="number"
                min="0"
                max="500"
                step="5"
                value={Math.round(part.toMain * 100)}
                onChange={(ev) => onUpdatePart(selectedPart, "toMain", Math.max(0, Math.min(500, +ev.target.value)) / 100)}
              />
              <span className="unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <span>{t("col_lethal")}</span>
            <button type="button" className={"starbtn" + (part.lethal ? " on" : "")} onClick={() => onToggleLethal(selectedPart)}>
              {part.lethal ? "★" : "☆"}
            </button>
          </div>
          {extraStats.map((s, i) => (
            <div className="stat-card" key={i}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
          {hasStagger && (
            <div className="stat-card stat-card-wide">
              <span>{t("target_stagger_label")}</span>
              <b className="mono" style={{ fontSize: 13 }}>
                {stagger.map((s) => s || "-").join(" · ")}
              </b>
            </div>
          )}
        </div>

        <div className="section-label">{t("intel_label")}</div>
        <div className="intel">
          <ul>
            {e.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {children}
    </div>
  );
}
