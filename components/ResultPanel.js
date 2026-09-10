"use client";
import DispName from "./DispName";
import { dispText } from "@/lib/calc";
import {
  armorMultiplier, bestHit, computeRow, fireMultFor, hitEffDamage, weaponHits,
  fmtNum, fmtPct,
} from "@/lib/calc";

export default function ResultPanel({ weapon, enemy, part, t, compareVisible, onToggleCompare, onReset }) {
  const fireMult = fireMultFor(part, enemy);
  const c = computeRow(weapon, part, enemy.mainHp, enemy.regen, fireMult);
  const hits = weaponHits(weapon);
  const chosen = bestHit(weapon, part.armor, part.durability, fireMult).hit;
  // btk is always Infinity for continuous weapons by design (no discrete "shots" concept) even
  // when the kill is very much possible - ttk is the one that actually reflects unreachability.
  const cantKill = weapon.continuous ? !isFinite(c.ttk) : !isFinite(c.btk);

  return (
    <div id="result-panel">
      <div className="weapon-head">
        <div className="tabs">
          <button className="tab-btn active" disabled>
            {t("bp_title")}
          </button>
        </div>
        <button className="reset-btn" type="button" onClick={onToggleCompare}>
          {compareVisible ? t("compare_toggle_hide") : t("compare_toggle_show")}
        </button>
        <button
          className="reset-btn"
          type="button"
          onClick={() => {
            if (window.confirm(t("reset_confirm"))) onReset();
          }}
        >
          {t("reset_btn")}
        </button>
      </div>

      <div className="section-label">
        <DispName x={weapon} /> {"→"} <DispName x={enemy} /> / {part.name}
      </div>

      <div className="bp-tiles">
        <div className="bp-tile"><span>{t("tile_btk")}</span><b>{fmtNum(c.btk)}</b></div>
        <div className="bp-tile"><span>{t("tile_ttk")}</span><b>{fmtNum(c.ttk, 2)}</b></div>
        {c.sever !== null && (
          <div className="bp-tile" style={cantKill ? { borderColor: "var(--accent)" } : undefined}>
            <span>{t("tile_bts")}</span>
            <b>{fmtNum(c.sever, weapon.continuous ? 1 : 0)}</b>
          </div>
        )}
        <div className="bp-tile"><span>{t("tile_overkill")}</span><b>{fmtNum(c.overkill)}</b></div>
        <div className="bp-tile"><span>{t("tile_reloads")}</span><b>{fmtNum(c.reloads)}</b></div>
        <div className="bp-tile"><span>{t("tile_magpct")}</span><b>{fmtPct(c.magPct)}</b></div>
        <div className="bp-tile"><span>{t("tile_killspermag")}</span><b>{c.killsPerMag}</b></div>
      </div>
      {cantKill && c.sever !== null && (
        <div className="disclaimer" style={{ marginTop: 10 }}>
          <b>{t("ref_prefix")}</b> {t("note_no_kill_use_bts")}
        </div>
      )}

      <div className="section-label" style={{ marginTop: 16 }}>{t("bp_col_detail")}</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("detail_col_component")}</th>
              <th className="mono">{t("detail_col_pen")}</th>
              <th className="mono">{t("detail_col_armor")}</th>
              <th>{t("detail_col_judge")}</th>
              <th className="mono">{t("detail_col_dmg")}</th>
              <th>{t("detail_col_applied")}</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((h, i) => {
              const mult = armorMultiplier(h.apDirect, part.armor);
              const isChosen = h === chosen;
              return (
                <tr key={i} style={isChosen ? undefined : { opacity: 0.55 }}>
                  <td>{h.type}</td>
                  <td className="mono">{h.apDirect}</td>
                  <td className="mono">{part.armor}</td>
                  <td>
                    {mult === 1 ? (
                      <span className="status-pill status-full">{t("status_full")}</span>
                    ) : mult === 0.65 ? (
                      <span className="status-pill status-partial">{t("status_half")}</span>
                    ) : (
                      <span className="status-pill status-blocked">{t("status_blocked")}</span>
                    )}
                  </td>
                  <td className="mono">{fmtNum(hitEffDamage(h, part.armor, part.durability, fireMult))}</td>
                  <td>
                    {isChosen ? (
                      <span className="status-pill status-full">{t("detail_applied")}</span>
                    ) : (
                      <span className="status-pill status-blocked">{t("detail_notapplied")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 600 }}>
              <td colSpan={4}>{t("detail_total_row")}</td>
              <td className="mono">{fmtNum(c.eff)}</td>
              <td></td>
            </tr>
            {!part.lethal && (
              <tr>
                <td colSpan={4}>{t("detail_mainshare_row")} {fmtPct(part.toMain)})</td>
                <td className="mono">{fmtNum(c.eff * part.toMain)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hits.length > 1 && <div className="img-credit" style={{ marginTop: 6 }}>{t("multi_hit_note")}</div>}

      <div className="section-label" style={{ marginTop: 14 }}>{t("results_summary_label")}</div>
      <div className="intel">
        <ul>
          {weapon.continuous ? (
            <li>
              {dispText(weapon)}(으)로 {part.name} 부위에 약 {fmtNum(c.ttk, 1)}초간 연사를 유지하면{" "}
              {part.lethal ? "그 부위 파괴로 즉사" : "메인 체력 소모로 처치"}됩니다
              {" "}(캐니스터 소모 {fmtPct(c.magPct)}, 교체 {fmtNum(c.reloads)}회 포함).
            </li>
          ) : (
            <li>
              {dispText(weapon)}(으)로 {part.name} 부위를 {fmtNum(c.btk)}발 맞히면 {part.lethal ? "그 부위 파괴로 즉사" : "메인 체력 소모로 처치"}됩니다
              {" "}(약 {fmtNum(c.ttk, 2)}초, 재장전 {fmtNum(c.reloads)}회 포함).
            </li>
          )}
          {!weapon.continuous && (
            <li>마지막 한 발의 초과 피해(오버킬)는 약 {fmtNum(c.overkill)}이며, 탄창의 {fmtPct(c.magPct)}을 소모합니다.</li>
          )}
          {c.sever !== null && c.sever !== c.btk && (
            <li>
              이 부위 자체(껍데기)만 파괴하는 데는 {weapon.continuous ? `약 ${fmtNum(c.sever, 1)}초` : `${c.sever}발`}이면 충분합니다 (전체 처치와는 별개).
            </li>
          )}
          {c.regenWarning && (
            <li style={{ color: "var(--danger)" }}>
              ⚠ 이 무기의 지속 DPS가 이 부위의 재생 속도를 못 넘습니다 — 계속 쏴도 체력이 안 줄어들 수 있습니다. 재생 없는 부위(위 "재생" 항목 참고)나 순간 폭딜 수단으로 바꾸세요.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
