"use client";
import { computeKillPaths, fmtNum } from "@/lib/calc";

export default function KillPathPanel({ weapon, enemy, t }) {
  const paths = computeKillPaths(weapon, enemy);

  return (
    <div id="killpath-panel" style={{ marginTop: 18 }}>
      <div className="section-label">{t("killpath_title")}</div>
      {paths.length === 0 ? (
        <div className="disclaimer">{t("killpath_none")}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("killpath_col_rank")}</th>
                <th>{t("killpath_col_route")}</th>
                <th className="mono">{t("tile_ttk")}</th>
                <th>{t("killpath_col_note")}</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((p, i) => (
                <tr key={i}>
                  <td className="mono">{i + 1}</td>
                  <td>
                    {p.isGeneralPath && p.partsTable ? (
                      <span>
                        {t("killpath_general_label")} ({p.recommendedN}/{p.totalCandidates}{t("killpath_parts_suffix")})
                      </span>
                    ) : (
                      <span>
                        {p.steps.map((s, si) => (
                          <span key={si}>
                            {si > 0 ? " → " : ""}
                            {s.part.name}
                          </span>
                        ))}
                        {p.isGeneralPath ? ` (${t("killpath_general_label")})` : null}
                      </span>
                    )}
                  </td>
                  <td className="mono">
                    {fmtNum(p.totalSeconds, 1)}
                    {t("killpath_seconds_suffix")}
                  </td>
                  <td>
                    {p.precisionRequired && <span className="status-pill status-partial">{t("killpath_precision_badge")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paths
        .filter((p) => p.isGeneralPath)
        .map((p, i) => (
          <div key={i}>
            <div className="disclaimer" style={{ marginTop: 8 }}>
              {t("killpath_general_caption")}
            </div>
            {p.partsTable && (
              <details style={{ marginTop: 6 }}>
                <summary>{t("killpath_partstable_summary")}</summary>
                <table>
                  <tbody>
                    {p.partsTable.map((row) => (
                      <tr key={row.partsHit}>
                        <td>
                          {row.partsHit}
                          {t("killpath_parts_suffix")}
                        </td>
                        <td className="mono">
                          {fmtNum(row.totalSeconds, 1)}
                          {t("killpath_seconds_suffix")}
                        </td>
                        <td>{row.partsHit === p.recommendedN ? t("killpath_recommended_tag") : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        ))}
    </div>
  );
}
