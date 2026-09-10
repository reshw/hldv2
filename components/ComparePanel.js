"use client";
import DispName from "./DispName";
import { computeRow, fireMultFor, weaponHits, fmtNum, fmtPct, CAT_LABEL_KEY } from "@/lib/calc";

const CATS = ["all", "primary", "secondary", "support"];

export default function ComparePanel({
  weapons, enemy, part, t,
  catFilter, onCatFilterChange,
  sortKey, sortDir, onSort,
  selectedWeaponId, onJumpToWeapon,
  onUpdateWeapon,
}) {
  function catLabel(cat) {
    return cat === "all" ? t("cat_all") : t(CAT_LABEL_KEY[cat] || cat);
  }

  const fireMult = fireMultFor(part, enemy);
  const rows = weapons.filter((w) => catFilter === "all" || w.cat === catFilter);
  const computed = rows.map((w) => ({ w, c: computeRow(w, part, enemy.mainHp, enemy.regen, fireMult) }));
  const minBtk = Math.min(...computed.map((r) => r.c.btk));
  const minTtk = Math.min(...computed.map((r) => r.c.ttk));
  computed.sort((a, b) => {
    const va = sortKey === "ttk" ? a.c.ttk : a.c.btk;
    const vb = sortKey === "ttk" ? b.c.ttk : b.c.btk;
    return (va - vb) * sortDir;
  });

  return (
    <div id="compare-panel">
      <div className="weapon-head">
        <div className="tabs">
          <button className="tab-btn active" disabled>{t("tab_compare")}</button>
        </div>
      </div>
      <div className="section-label" style={{ marginTop: 16 }}>{t("compare_hint")}</div>

      <div className="chips-row" style={{ marginBottom: 10 }}>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={"tab-btn" + (catFilter === c ? " active" : "")}
            style={{ borderRadius: 20 }}
            onClick={() => onCatFilterChange(c)}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("col_weapon")}</th>
              <th>{t("col_category")}</th>
              <th className="mono">{t("col_pen")}</th>
              <th className="mono">{t("col_dmg")}</th>
              <th className="mono">{t("col_durabledmg")}</th>
              <th className="mono">{t("col_rpm")}</th>
              <th className="mono">{t("col_mag")}</th>
              <th className="mono">{t("col_reload")}</th>
              <th>{t("col_status")}</th>
              <th className="mono sortable" onClick={() => onSort("btk")}>
                {t("col_btk")}<span className="arrow">{sortKey === "btk" ? (sortDir > 0 ? "▲" : "▼") : ""}</span>
              </th>
              <th className="mono sortable" onClick={() => onSort("ttk")}>
                {t("col_ttk")}<span className="arrow">{sortKey === "ttk" ? (sortDir > 0 ? "▲" : "▼") : ""}</span>
              </th>
              <th className="mono">{t("col_killspermag")}</th>
              <th className="mono">{t("col_sever")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {computed.map(({ w, c }) => {
              const h0 = weaponHits(w)[0];
              const statusHtml =
                c.status === "full" ? <span className="status-pill status-full">{t("status_full")}</span>
                : c.status === "half" ? <span className="status-pill status-partial">{t("status_half")}</span>
                : c.status === "partial" ? <span className="status-pill status-partial">{t("status_partial")}</span>
                : <span className="status-pill status-blocked">{t("status_blocked")}</span>;
              return (
                <tr key={w.id}>
                  <td>
                    <div className="weapon-name-cell">
                      {w.img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="weapon-thumb" src={w.img} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                      <span>
                        <DispName x={w} />
                        {c.btk === minBtk && isFinite(minBtk) && <span className="best-badge">{t("best_btk")}</span>}
                        {c.ttk === minTtk && isFinite(minTtk) && <span className="best-badge">{t("best_ttk")}</span>}
                      </span>
                    </div>
                  </td>
                  <td>{catLabel(w.cat)}</td>
                  <td><input className="num-in mono" type="number" min="0" max="10" defaultValue={h0.apDirect} onChange={(e) => onUpdateWeapon(w.id, "pen", +e.target.value)} /></td>
                  <td><input className="num-in mono" type="number" defaultValue={h0.dmg} onChange={(e) => onUpdateWeapon(w.id, "dmg", +e.target.value)} /></td>
                  <td><input className="num-in mono" type="number" step="5" min="0" defaultValue={Math.round(h0.dmg * h0.durable)} onChange={(e) => onUpdateWeapon(w.id, "durableDmg", +e.target.value)} /></td>
                  <td><input className="num-in mono" type="number" defaultValue={w.rpm} onChange={(e) => onUpdateWeapon(w.id, "rpm", +e.target.value)} /></td>
                  <td><input className="num-in mono" type="number" defaultValue={w.mag} onChange={(e) => onUpdateWeapon(w.id, "mag", +e.target.value)} /></td>
                  <td><input className="num-in mono" type="number" step="0.1" defaultValue={w.reload} onChange={(e) => onUpdateWeapon(w.id, "reload", +e.target.value)} /></td>
                  <td>{statusHtml}</td>
                  <td className="mono">
                    {fmtNum(c.btk)}
                    {c.regenWarning && <span className="status-pill status-partial" title={t("regen_title")}> {t("regen_badge")}</span>}
                  </td>
                  <td className="mono">{fmtNum(c.ttk, 2)}</td>
                  <td className="mono">{c.killsPerMag}</td>
                  <td className="mono">{c.sever === null ? "-" : c.sever}</td>
                  <td>
                    <button className="reset-btn" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => onJumpToWeapon(w.id)}>
                      {t("col_detail")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
