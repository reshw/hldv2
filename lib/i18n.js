// UI-chrome i18n only (infrastructure, not full localization): dynamic per-entity text (enemy
// tips, the results-summary sentence) stays Korean-only by design - see the nameKo note in
// data/README.md for why entity proper nouns are never auto-translated.
export const STRINGS = {
  ko: {
    app_sub: "전장 병기 데이터 · 몹 대응 전략 단말", app_tag: "Managed Democracy Field Manual", lang_toggle: "EN",
    sidebar_head: "적 세력 색인", sidebar_search_ph: "몹 검색...", enemy_empty: "일치하는 몹 없음",
    faction_terminid: "테르미니드", faction_automaton: "오토마톤", faction_illuminate: "일루미닛",
    cat_primary: "주무기", cat_secondary: "보조무기", cat_support: "지원화기", cat_all: "전체",
    subcat_assault_rifle: "돌격소총", subcat_marksman_rifle: "지정사수소총", subcat_shotgun: "샷건", subcat_smg: "기관단총",
    subcat_energy: "에너지", subcat_explosive: "폭발형", subcat_special: "특수", subcat_melee: "근접",
    subcat_pistol: "권총", subcat_heavy: "중화기", subcat_launcher: "런처", subcat_precision: "정밀", subcat_all: "전체",
    tab_compare: "비교표", tab_breakpoint: "브레이크포인트",
    reset_btn: "전체 데이터 초기화", reset_confirm: "모든 적/무기 데이터를 기본값으로 되돌립니다. 계속할까요?",
    part_select_label: "대상 부위 선택 —", img_credit: "부위 다이어그램 출처: DiversDex (제작: Roy)", fig_front: "정면", fig_side: "측면",
    main_hp_label: "메인 체력 (전체 처치 기준)", main_hp_hint: '치명(★) 표시가 없는 부위를 맞히면 이 체력을 "메인 기여율%"만큼만 깎습니다.',
    parts_table_label: "부위별 장갑 · 체력 · 내구% · 메인 기여율 (직접 수정 가능)",
    col_part: "부위", col_armor: "장갑(AV)", col_hp: "체력(HP)", col_durability: "내구%", col_tomain: "메인 기여율%", col_lethal: "치명(★)",
    intel_label: "교전 지침",
    compare_hint: "무기별 BTK / TTK 비교 — 표 헤더 클릭 시 정렬, 회색 칸은 직접 수정 (1번째 피해 성분만 수정됨)",
    col_weapon: "무기", col_category: "종류", col_pen: "관통(AV)", col_dmg: "피해", col_durabledmg: "내구댐",
    col_rpm: "발사속도(RPM)", col_mag: "탄창", col_reload: "재장전(초)", col_status: "상태",
    col_btk: "BTK(처치)", col_ttk: "TTK(초)", col_killspermag: "탄창당 처치", col_sever: "이 부위 파괴", col_detail: "상세",
    status_full: "완전관통(100%)", status_half: "동일관통(65%)", status_partial: "도탄+내구%", status_blocked: "도탄(0%)",
    regen_badge: "재생우세", regen_title: "지속 DPS가 이 몹의 재생 속도를 못 넘김", best_btk: "BEST BTK", best_ttk: "BEST TTK",
    bp_title: "브레이크포인트 계산기 — 무기 하나 vs 부위 하나 상세 분석",
    bp_weapon_select: "무기 선택:", bp_search_ph: "무기 이름 검색...", bp_empty: "일치하는 무기 없음",
    bp_col_weapon: "무기", bp_col_target: "타겟 —", bp_col_detail: "상세 계산",
    stat_cat: "분류", stat_mag: "탄창", stat_rpm: "발사속도(RPM)", stat_reload: "재장전(초)", stat_tacreload: "전술 재장전(초)", stat_ergo: "인체공학",
    hit_components: "피해 성분", stat_dmg: "피해량", stat_durabledmg: "내구댐(Durable)",
    stat_ignite_mode: "발화 방식", ignite_gated: "직격 필요", ignite_independent: "표면 발화(독립)",
    stat_pen4: "관통 (직격/경사/대경사/극단)", stat_blastradius: "폭발 반경(내/외)", stat_falloff50: "50m 낙하 감쇠",
    target_parthp: "부위 체력", target_parthp_na: "해당없음(메인만)", target_mainhp: "메인 체력", target_armor: "장갑(AV)",
    target_durability: "부위 내구%", target_tomain: "메인 기여율", target_lethal: "치명(파괴시 즉사)",
    target_exdr: "ExDR", target_badr: "BaDR", target_firemult: "화염 배율", target_regen: "재생", target_regen_none: "없음 (이 부위는 재생 제외)", regen_resume_suffix: "뒤 재개",
    target_stagger_label: "스태거 임계값 (경/중/중重/massive)", target_extra_label: "추가 특성",
    tile_btk: "BTK", tile_ttk: "TTK(초)", tile_bts: "BTS(부위파괴)", tile_overkill: "오버킬", tile_reloads: "재장전 횟수", tile_magpct: "탄창 소모", tile_killspermag: "탄창당 처치",
    note_no_kill_use_bts: "이 부위는 파괴해도 단독으로 처치되지 않는 부위입니다(치명 아님·메인 기여율 0%). 대신 이 부위 자체(껍데기)를 파괴하는 데 필요한 탄수는 BTS(Bullets To Sever)입니다.",
    detail_col_component: "피해 성분", detail_col_pen: "관통(직격)", detail_col_armor: "장갑(AV)", detail_col_judge: "판정",
    detail_col_dmg: "피해", detail_col_applied: "BTK 반영", detail_applied: "적용(최댓값)", detail_notapplied: "미적용",
    detail_total_row: "BTK/TTK에 실제 적용된 피해 (장갑 대비 가장 센 성분 하나)", detail_mainshare_row: "메인 체력 반영분 (× 메인 기여율",
    results_summary_label: "결과 요약", invuln_prefix: "⚠ 이 부위는 관통·데미지 무관하게 무적입니다.", ref_prefix: "참고:", subfaction_suffix: "서브팩션 전용", invuln_tag: "[무적]",
    multi_hit_note: '이 부위 장갑 기준으로 가장 효과적인 피해 성분 하나만 골라 씁니다(예: 스코처는 저장갑엔 직격탄, 중장갑엔 폭발탄). 같은 발사에 여러 성분이 동시에 같은 부위에 들어가는지는 원본 시트도 "실험적"이라 명시한 부분이라 합산하지 않습니다.',
    weapon_col_head: "무기", mob_col_head: "몹", compare_toggle_show: "전체 무기 비교표 보기", compare_toggle_hide: "비교표 닫기",
    disclaimer_summary: "데이터 출처 및 안내",
    disclaimer_html: '<b>데이터 출처:</b> 무기 92종·몹 50종 전체가 <b>DiversDex</b>(커뮤니티 제작, 인게임 테스트로 교차검증된 스프레드시트)와 ' +
      '<a href="https://github.com/helldivers-2/json" target="_blank" rel="noopener">helldivers-2/json</a>(MIT, GitHub)로 채워져 있습니다 — 더 이상 순수 추정값이 아닙니다. ' +
      '다만 두 소스 다 Arrowhead 공식은 아니라 패치 후 오차가 생길 수 있어요. ' +
      '<b>메인 체력</b>은 몹의 전체 처치 기준 체력, <b>메인 기여율%</b>은 치명(★) 아닌 부위를 맞혔을 때 이 체력이 깎이는 비율입니다. ' +
      '표의 회색 입력칸은 모두 <b>직접 수정 가능</b>하고 브라우저에 자동 저장됩니다. ' +
      '총알 수 계산은 <b>BTK(Bullets To Kill)</b>, 시간 계산은 <b>TTK(Time To Kill)</b> 기준입니다.',
    footer_html: '데이터 출처: 커뮤니티 관찰치 기반 근사값 (검증 필요) · 로컬 브라우저에만 저장되며 서버로 전송되지 않습니다.<br>For Super Earth. For Managed Democracy.',
  },
  en: {
    app_sub: "Battlefield weapons data · hostile response terminal", app_tag: "Managed Democracy Field Manual", lang_toggle: "KO",
    sidebar_head: "Hostile Faction Index", sidebar_search_ph: "Search enemies...", enemy_empty: "No matching enemy",
    faction_terminid: "Terminids", faction_automaton: "Automatons", faction_illuminate: "Illuminate",
    cat_primary: "Primary", cat_secondary: "Secondary", cat_support: "Support", cat_all: "All",
    subcat_assault_rifle: "Assault Rifle", subcat_marksman_rifle: "Marksman Rifle", subcat_shotgun: "Shotgun", subcat_smg: "SMG",
    subcat_energy: "Energy", subcat_explosive: "Explosive", subcat_special: "Special", subcat_melee: "Melee",
    subcat_pistol: "Pistol", subcat_heavy: "Heavy", subcat_launcher: "Launcher", subcat_precision: "Precision", subcat_all: "All",
    tab_compare: "Compare", tab_breakpoint: "Breakpoint",
    reset_btn: "Reset all data", reset_confirm: "This resets all enemy/weapon data to defaults. Continue?",
    part_select_label: "Target part —", img_credit: "Part diagram source: DiversDex (by Roy)", fig_front: "Front", fig_side: "Side",
    main_hp_label: "Main HP (overall kill threshold)", main_hp_hint: 'Hitting a part with no lethal(★) mark only drains this by its "main share %".',
    parts_table_label: "Per-part armor · HP · durability% · main share (editable)",
    col_part: "Part", col_armor: "Armor(AV)", col_hp: "HP", col_durability: "Durability%", col_tomain: "Main share%", col_lethal: "Lethal(★)",
    intel_label: "Field notes",
    compare_hint: "BTK/TTK per weapon — click a header to sort, gray cells are editable (only the 1st damage component)",
    col_weapon: "Weapon", col_category: "Category", col_pen: "Pen(AV)", col_dmg: "Damage", col_durabledmg: "Durable dmg",
    col_rpm: "RPM", col_mag: "Mag", col_reload: "Reload(s)", col_status: "Status",
    col_btk: "BTK", col_ttk: "TTK(s)", col_killspermag: "Kills/mag", col_sever: "Sever part", col_detail: "Detail",
    status_full: "Full pen (100%)", status_half: "Equal AV (65%)", status_partial: "Ricochet+durable%", status_blocked: "Ricochet (0%)",
    regen_badge: "Regen wins", regen_title: "Sustained DPS can't outpace this target's regen", best_btk: "BEST BTK", best_ttk: "BEST TTK",
    bp_title: "Breakpoint Calculator — one weapon vs one part, in detail",
    bp_weapon_select: "Weapon:", bp_search_ph: "Search weapon name...", bp_empty: "No matching weapon",
    bp_col_weapon: "Weapon", bp_col_target: "Target —", bp_col_detail: "Detailed calculation",
    stat_cat: "Category", stat_mag: "Magazine", stat_rpm: "RPM", stat_reload: "Reload(s)", stat_tacreload: "Tactical reload(s)", stat_ergo: "Ergonomics",
    hit_components: "Damage components", stat_dmg: "Damage", stat_durabledmg: "Durable damage",
    stat_ignite_mode: "Ignition mode", ignite_gated: "Requires direct hit", ignite_independent: "Surface (independent)",
    stat_pen4: "Pen (direct/slight/large/extreme)", stat_blastradius: "Blast radius (in/out)", stat_falloff50: "50m falloff",
    target_parthp: "Part HP", target_parthp_na: "N/A (main only)", target_mainhp: "Main HP", target_armor: "Armor(AV)",
    target_durability: "Part durability%", target_tomain: "Main share", target_lethal: "Lethal (kills on destroy)",
    target_exdr: "ExDR", target_badr: "BaDR", target_firemult: "Fire multiplier", target_regen: "Regen", target_regen_none: "None (exempt part)", regen_resume_suffix: "delay",
    target_stagger_label: "Stagger thresholds (light/medium/heavy/massive)", target_extra_label: "Additional traits",
    tile_btk: "BTK", tile_ttk: "TTK(s)", tile_bts: "BTS (Sever)", tile_overkill: "Overkill", tile_reloads: "Reloads", tile_magpct: "Mag used", tile_killspermag: "Kills/mag",
    note_no_kill_use_bts: "This part can't be killed on its own even when destroyed (not lethal, 0% main share). BTS (Bullets To Sever) is the shot count needed to destroy the part itself instead.",
    detail_col_component: "Component", detail_col_pen: "Pen(direct)", detail_col_armor: "Armor(AV)", detail_col_judge: "Result",
    detail_col_dmg: "Damage", detail_col_applied: "Used for BTK", detail_applied: "Used (max)", detail_notapplied: "Not used",
    detail_total_row: "Damage actually applied to BTK/TTK (best component vs this armor)", detail_mainshare_row: "Main HP share (× main share",
    results_summary_label: "Summary", invuln_prefix: "⚠ This part is invulnerable regardless of penetration/damage.", ref_prefix: "Note:", subfaction_suffix: "subfaction-only", invuln_tag: "[INVULN]",
    multi_hit_note: 'Only the single most effective damage component for this part\'s armor is used (e.g. the Scorcher uses its direct shot on light armor, its explosion on medium armor). Whether multiple components from one shot both land on the same part is something even the source sheet calls "experimental", so they are not summed.',
    weapon_col_head: "Weapon", mob_col_head: "Mob", compare_toggle_show: "Show full weapon comparison", compare_toggle_hide: "Hide comparison",
    disclaimer_summary: "Data sources & notes",
    disclaimer_html: '<b>Data sources:</b> all 92 weapons and 50 enemies come from <b>DiversDex</b> (a community spreadsheet, cross-checked and in-game tested) and ' +
      '<a href="https://github.com/helldivers-2/json" target="_blank" rel="noopener">helldivers-2/json</a> (MIT, GitHub) — no longer pure guesswork. ' +
      "Neither source is official Arrowhead data though, so patches can drift out of sync. " +
      "<b>Main HP</b> is the creature's overall kill threshold; <b>main share%</b> is how much of that drains when a non-lethal(★) part is hit. " +
      "Every gray input cell is <b>directly editable</b> and auto-saves to this browser. " +
      "Shot counts use <b>BTK (Bullets To Kill)</b>, time uses <b>TTK (Time To Kill)</b>.",
    footer_html: 'Data: community-observed approximations (unverified) · stored only in your local browser, never sent to a server.<br>For Super Earth. For Managed Democracy.',
  },
};

export function t(lang, key) {
  const v = STRINGS[lang] && STRINGS[lang][key];
  if (v === undefined) return STRINGS.ko[key] === undefined ? key : STRINGS.ko[key];
  return v;
}
