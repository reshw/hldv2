"use client";
import { useEffect, useState } from "react";
import { DEFAULT_ENEMIES, DEFAULT_WEAPONS, findEnemy, findWeapon } from "@/lib/data";
import { t as translate } from "@/lib/i18n";
import WeaponPanel from "@/components/WeaponPanel";
import MobPanel from "@/components/MobPanel";
import ResultPanel from "@/components/ResultPanel";
import ComparePanel from "@/components/ComparePanel";

// bump whenever DEFAULT_WEAPONS()/DEFAULT_ENEMIES() gains fields - stale localStorage
// silently shadows new data otherwise (see data/README.md's STORE_KEY history)
const STORE_KEY = "se-ballistics-v7";

export default function Page() {
  const [lang, setLangState] = useState("ko");
  const [weapons, setWeapons] = useState(DEFAULT_WEAPONS);
  const [enemies, setEnemies] = useState(DEFAULT_ENEMIES);
  const [selectedWeaponId, setSelectedWeaponId] = useState(DEFAULT_WEAPONS[0].id);
  const [selectedEnemyId, setSelectedEnemyId] = useState(DEFAULT_ENEMIES[0].id);
  const [selectedPart, setSelectedPart] = useState(0);
  const [catFilter, setCatFilter] = useState("all");
  const [compareVisible, setCompareVisible] = useState(false);
  const [sortKey, setSortKey] = useState("btk");
  const [sortDir, setSortDir] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state once, client-side only (avoids SSR/CSR hydration mismatch).
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("se-lang");
      if (savedLang) setLangState(savedLang);
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.enemies) setEnemies(parsed.enemies);
        if (parsed.weapons) setWeapons(parsed.weapons);
      }
    } catch (e) { /* start from defaults */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ enemies, weapons })); } catch (e) { /* ignore */ }
  }, [enemies, weapons, hydrated]);

  function t(key) {
    return translate(lang, key);
  }
  function setLang(l) {
    setLangState(l);
    try { localStorage.setItem("se-lang", l); } catch (e) { /* ignore */ }
  }

  const selectedWeapon = findWeapon(weapons, selectedWeaponId);
  const selectedEnemy = findEnemy(enemies, selectedEnemyId);
  const partIdx = Math.min(selectedPart, selectedEnemy.parts.length - 1);
  const part = selectedEnemy.parts[partIdx];

  function updateEnemy(id, updater) {
    setEnemies((prev) => prev.map((e) => (e.id === id ? updater(e) : e)));
  }

  function updateWeapon(id, field, value) {
    setWeapons((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (field === "mag") return { ...w, mag: Math.max(1, Math.round(value)) };
        if (field === "rpm") return { ...w, rpm: Math.max(0, value) };
        if (field === "reload") return { ...w, reload: Math.max(0, value) };
        // dmg/pen/durableDmg edit the first (primary) hit component, mirroring the top-level
        // dmg/pen/durable fields the rest of the app reads for single-component weapons.
        const hits = (w.hits ? w.hits.slice() : [{ type: "Projectile", dmg: w.dmg, durable: w.durable, apDirect: w.pen }]);
        const h0 = { ...hits[0] };
        if (field === "durableDmg") h0.durable = Math.max(0, value) / Math.max(h0.dmg, 0.01);
        else if (field === "pen") h0.apDirect = Math.max(0, Math.round(value));
        else if (field === "dmg") h0.dmg = Math.max(0, value);
        else return w;
        hits[0] = h0;
        return { ...w, hits, dmg: h0.dmg, pen: h0.apDirect, durable: h0.durable };
      })
    );
  }

  function toggleIgnite(weaponId, hitIndex) {
    setWeapons((prev) =>
      prev.map((w) => {
        if (w.id !== weaponId) return w;
        const hits = w.hits.map((h, i) => (i === hitIndex ? { ...h, igniteIndependent: !h.igniteIndependent } : h));
        return { ...w, hits };
      })
    );
  }

  function resetAll() {
    setEnemies(DEFAULT_ENEMIES);
    setWeapons(DEFAULT_WEAPONS);
    setSelectedEnemyId(DEFAULT_ENEMIES[0].id);
    setSelectedPart(0);
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">SE</div>
          <div>
            <h1>Super Earth Ballistics</h1>
            <div className="sub">{t("app_sub")}</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="tag">{t("app_tag")}</span>
          <button className="lang-toggle" type="button" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {t("lang_toggle")}
          </button>
        </div>
      </div>

      <div className="split-layout">
        <WeaponPanel
          weapons={weapons}
          lang={lang}
          t={t}
          selectedWeapon={selectedWeapon}
          onSelectWeapon={setSelectedWeaponId}
          catFilter={catFilter}
          onCatFilterChange={setCatFilter}
          onToggleIgnite={(hitIndex) => toggleIgnite(selectedWeapon.id, hitIndex)}
        />
        <MobPanel
          enemies={enemies}
          lang={lang}
          t={t}
          selectedEnemy={selectedEnemy}
          onSelectEnemy={(id) => {
            setSelectedEnemyId(id);
            setSelectedPart(0);
          }}
          selectedPart={partIdx}
          onSelectPart={setSelectedPart}
          onUpdateMainHp={(v) => updateEnemy(selectedEnemy.id, (e) => ({ ...e, mainHp: Math.max(1, Math.round(v || 1)) }))}
          onUpdatePart={(idx, field, value) =>
            updateEnemy(selectedEnemy.id, (e) => {
              const parts = e.parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
              return { ...e, parts };
            })
          }
          onToggleLethal={(idx) =>
            updateEnemy(selectedEnemy.id, (e) => {
              const parts = e.parts.map((p, i) => (i === idx ? { ...p, lethal: !p.lethal } : p));
              return { ...e, parts };
            })
          }
        >
          <ResultPanel
            weapon={selectedWeapon}
            enemy={selectedEnemy}
            part={part}
            t={t}
            compareVisible={compareVisible}
            onToggleCompare={() => setCompareVisible((v) => !v)}
            onReset={resetAll}
          />
        </MobPanel>
      </div>

      {compareVisible && (
        <ComparePanel
          weapons={weapons}
          enemy={selectedEnemy}
          part={part}
          t={t}
          catFilter={catFilter}
          onCatFilterChange={setCatFilter}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          selectedWeaponId={selectedWeaponId}
          onJumpToWeapon={setSelectedWeaponId}
          onUpdateWeapon={updateWeapon}
        />
      )}

      <details className="disclaimer-details">
        <summary>{t("disclaimer_summary")}</summary>
        <div className="disclaimer" dangerouslySetInnerHTML={{ __html: t("disclaimer_html") }} />
      </details>

      <footer dangerouslySetInnerHTML={{ __html: t("footer_html") }} />
    </div>
  );
}
