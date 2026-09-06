/* ============ constants ============ */
var CAT_LABEL = {primary:"주무기", secondary:"보조무기", support:"지원화기"};

var FACTIONS = {
  terminid:  {name:"터미니드", color:"var(--terminid)", mark:"bug"},
  automaton: {name:"오토마톤", color:"var(--automaton)", mark:"bot"},
  illuminate:{name:"일루미네이트", color:"var(--illuminate)", mark:"eye"}
};

function avLabel(n){ return "AV" + n; }

/* ============ default data ============ */
/* Source: DiversDex community spreadsheet (cross-checked + in-game tested, shared 2026-09-06) for
   enemy HP/armor/durability/main-pool-contribution and weapon damage/durable/capacity/RPM/reload/AP,
   plus every extra column (per-hit-angle AP, falloff, ExDR/BaDR, stagger thresholds, etc.) captured
   for the Breakpoint Calculator tab below. Everything stays editable and saved to localStorage. */
__GENERATED_DATA__

/* ============ state / persistence ============ */
var STORE_KEY = "se-ballistics-v4"; // bump whenever DEFAULT_WEAPONS()/DEFAULT_ENEMIES() gains fields - stale localStorage silently shadows new data otherwise
var state = load();
function load(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {enemies:DEFAULT_ENEMIES(), weapons:DEFAULT_WEAPONS()};
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
function resetAll(){
  state = {enemies:DEFAULT_ENEMIES(), weapons:DEFAULT_WEAPONS()};
  save();
  selectedEnemy = state.enemies[0].id;
  selectedPart = 0;
  renderAll();
}

var selectedEnemy = state.enemies[0].id;
var selectedPart = 0;
var selectedWeapon = state.weapons[0].id;
var catFilter = "all";
var sortKey = "btk";
var sortDir = 1;
var viewMode = "compare"; // "compare" | "breakpoint"

/* ============ helpers ============ */
function findEnemy(id){ for(var i=0;i<state.enemies.length;i++) if(state.enemies[i].id===id) return state.enemies[i]; return state.enemies[0]; }
function findWeapon(id){ for(var i=0;i<state.weapons.length;i++) if(state.weapons[i].id===id) return state.weapons[i]; return state.weapons[0]; }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
function fmt(n, d){ d = d===undefined?0:d; return Number(n).toLocaleString("ko-KR", {minimumFractionDigits:d, maximumFractionDigits:d}); }
function fmtNum(n, d){ return isFinite(n) ? fmt(n, d) : "∞"; }
function fmtPct(n, d){ return isFinite(n) ? fmt(n*100, d===undefined?0:d)+"%" : "∞"; }

function markSVG(kind, color){
  if(kind==="bug"){
    return '<svg viewBox="0 0 64 64" class="mark"><ellipse cx="32" cy="34" rx="14" ry="20" fill="none" stroke="'+color+'" stroke-width="3"/><circle cx="32" cy="14" r="7" fill="none" stroke="'+color+'" stroke-width="3"/><path d="M20 24 L6 16 M20 34 L4 34 M20 44 L6 52 M44 24 L58 16 M44 34 L60 34 M44 44 L58 52" stroke="'+color+'" stroke-width="2.5" fill="none"/></svg>';
  }
  if(kind==="bot"){
    return '<svg viewBox="0 0 64 64" class="mark"><rect x="16" y="14" width="32" height="26" rx="2" fill="none" stroke="'+color+'" stroke-width="3"/><circle cx="26" cy="27" r="3.5" fill="'+color+'"/><circle cx="38" cy="27" r="3.5" fill="'+color+'"/><path d="M32 40 L32 52 M20 52 L44 52 M22 40 L14 50 M42 40 L50 50" stroke="'+color+'" stroke-width="3" fill="none"/></svg>';
  }
  return '<svg viewBox="0 0 64 64" class="mark"><path d="M6 32 C 18 14, 46 14, 58 32 C 46 50, 18 50, 6 32 Z" fill="none" stroke="'+color+'" stroke-width="3"/><circle cx="32" cy="32" r="9" fill="none" stroke="'+color+'" stroke-width="3"/><circle cx="32" cy="32" r="2.5" fill="'+color+'"/></svg>';
}

function weaponHits(w){
  return (w.hits && w.hits.length) ? w.hits : [{type:"Projectile", dmg:w.dmg, durable:w.durable, apDirect:w.pen}];
}
/** Effective damage of ONE hit component against a given armor value. */
function hitEffDamage(h, armor){ return (h.apDirect >= armor) ? h.dmg : h.dmg * h.durable; }
/**
 * BTK/TTK use ONLY the primary (direct-hit) component's damage - verified against the
 * source spreadsheet's own worked example (PLAS-101 Purifier vs Bile Spewer Head: using
 * just the 200-damage Projectile component gives BTK 2, matching the sheet exactly; summing
 * in the 300-damage Explosion component would wrongly give BTK 1). A projectile's splash
 * damage doesn't reliably land on the same collider the direct hit struck - the sheet itself
 * flags that geometry (which parts a given explosion's line-of-sight actually reaches) as
 * "experimental" and unresolved, so it's shown for reference in the Breakpoint tab but not
 * folded into the headline BTK.
 */
function totalEffDamage(w, armor){
  return hitEffDamage(weaponHits(w)[0], armor);
}
function penStatus(w, armor){
  var h = weaponHits(w)[0];
  if(h.apDirect >= armor) return "full";
  return h.durable > 0 ? "partial" : "blocked";
}

/* ============ sidebar ============ */
function renderSidebar(){
  var byFaction = {};
  state.enemies.forEach(function(e){ (byFaction[e.faction]=byFaction[e.faction]||[]).push(e); });
  var html = "";
  Object.keys(FACTIONS).forEach(function(fid){
    var f = FACTIONS[fid];
    var list = byFaction[fid]||[];
    if(!list.length) return;
    html += '<div class="faction-group">';
    html += '<div class="faction-title" style="color:'+f.color+'"><span class="dot" style="background:'+f.color+'"></span>'+f.name+'</div>';
    html += '<ul class="enemy-list">';
    list.forEach(function(e){
      html += '<li><button class="enemy-btn'+(e.id===selectedEnemy?' active':'')+'" data-id="'+e.id+'">'+
        '<span>'+esc(e.name)+'</span><span class="hp">'+fmt(e.mainHp)+'HP</span></button></li>';
    });
    html += '</ul></div>';
  });
  document.getElementById("sidebar-body").innerHTML = html;
  Array.prototype.forEach.call(document.querySelectorAll(".enemy-btn"), function(btn){
    btn.addEventListener("click", function(){
      selectedEnemy = btn.getAttribute("data-id");
      selectedPart = 0;
      renderAll();
    });
  });
}

/* ============ dossier ============ */
function renderDossier(){
  var e = findEnemy(selectedEnemy);
  var f = FACTIONS[e.faction];
  var html = '';
  html += '<div class="dossier-top">';
  html += '<div>';
  html += '<div class="dossier-meta" style="margin-bottom:6px;"><span class="chip" style="color:'+f.color+';border-color:'+f.color+'">'+f.name+'</span></div>';
  html += '<h2 class="dossier-name">'+esc(e.name)+'</h2>';
  html += '</div>';
  html += markSVG(f.mark, f.color);
  html += '</div>';

  html += '<div class="section-label">메인 체력 (전체 처치 기준)</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;">'+
    '<input class="num-in mono" id="main-hp-in" type="number" min="1" value="'+e.mainHp+'">'+
    '<span style="color:var(--text-faint);font-size:12px;">치명(★) 표시가 없는 부위를 맞히면 이 체력을 "메인 기여율%"만큼만 깎습니다.</span></div>';

  html += '<div class="section-label">부위별 장갑 · 체력 · 메인 기여율 (직접 수정 가능)</div>';
  html += '<div class="table-wrap"><table><thead><tr><th>부위</th><th>장갑(AV)</th><th>체력(HP)</th><th>메인 기여율%</th><th>치명(★)</th></tr></thead><tbody>';
  e.parts.forEach(function(p, i){
    html += '<tr class="'+(p.lethal?'weak-row':'')+'">';
    html += '<td>'+esc(p.name)+'</td>';
    html += '<td><input class="num-in mono" type="number" min="0" max="10" value="'+p.armor+'" data-part="'+i+'" data-field="armor"></td>';
    html += '<td><input class="num-in mono" type="number" min="1" value="'+p.hp+'" data-part="'+i+'" data-field="hp"></td>';
    html += '<td><input class="num-in mono" type="number" min="0" max="500" step="5" value="'+Math.round(p.toMain*100)+'" data-part="'+i+'" data-field="toMainPct"></td>';
    html += '<td><button class="starbtn'+(p.lethal?' on':'')+'" data-part="'+i+'" data-field="lethal">'+(p.lethal?'★':'☆')+'</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="section-label">교전 지침</div>';
  html += '<div class="intel"><ul>'+e.tips.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';

  document.getElementById("dossier").innerHTML = html;

  document.getElementById('main-hp-in').addEventListener('change', function(){
    findEnemy(selectedEnemy).mainHp = Math.max(1, Math.round(+this.value || 1));
    save(); renderSidebar(); renderWeaponPanel();
  });
  Array.prototype.forEach.call(document.querySelectorAll('#dossier input.num-in[data-field]'), function(inp){
    inp.addEventListener('change', function(){
      var i = +inp.getAttribute('data-part');
      var field = inp.getAttribute('data-field');
      var part = findEnemy(selectedEnemy).parts[i];
      var v = +inp.value;
      if(field==='toMainPct'){ part.toMain = Math.max(0, Math.min(100, v)) / 100; }
      else if(field==='armor'){ part.armor = Math.max(0, Math.round(v)); }
      else if(field==='hp'){ part.hp = Math.max(1, Math.round(v)); }
      save(); renderWeaponPanel();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('#dossier .starbtn'), function(btn){
    btn.addEventListener('click', function(){
      var i = +btn.getAttribute('data-part');
      var parts = findEnemy(selectedEnemy).parts;
      parts[i].lethal = !parts[i].lethal;
      save(); renderDossier(); renderWeaponPanel();
    });
  });
}

/* ============ shared BTK/TTK math ============ */
function computeRow(w, part, mainHp){
  var effDmg = Math.max(totalEffDamage(w, part.armor), 0.01);
  var btk;
  if(part.lethal){
    var lethalHp = part.hp > 0 ? part.hp : mainHp;
    btk = Math.ceil(lethalHp / effDmg);
  } else if(part.toMain > 0){
    btk = Math.ceil(mainHp / (effDmg * part.toMain));
  } else {
    btk = Infinity;
  }
  btk = isFinite(btk) ? Math.max(1, btk) : btk;
  var sever = part.hp > 0 ? Math.max(1, Math.ceil(part.hp / effDmg)) : null;
  var shotInterval = w.mag > 1 ? (w.rpm > 0 ? 60 / w.rpm : 0) : 0;
  var reloadsNeeded = isFinite(btk) ? (w.mag > 1 ? Math.floor((btk - 1) / w.mag) : (btk - 1)) : Infinity;
  var ttk = isFinite(btk) ? (btk - 1) * shotInterval + reloadsNeeded * w.reload : Infinity;
  var killsPerMag = isFinite(btk) ? (Math.max(1, Math.floor(w.mag / btk)) || 0) : 0;
  var poolUsed = part.lethal ? (part.hp > 0 ? part.hp : mainHp) : mainHp;
  var dealt = isFinite(btk) ? btk * effDmg * (part.lethal ? 1 : part.toMain) : Infinity;
  var overkill = isFinite(dealt) ? Math.max(0, dealt - poolUsed) : Infinity;
  return {
    eff: effDmg, btk: btk, sever: sever, ttk: ttk,
    killsPerMag: killsPerMag, status: penStatus(w, part.armor),
    reloads: reloadsNeeded, overkill: overkill,
    magPct: isFinite(btk) ? btk / w.mag : Infinity
  };
}

/* ============ weapon panel (comparison table + breakpoint calculator) ============ */
function renderWeaponPanel(){
  var e = findEnemy(selectedEnemy);
  if(selectedPart >= e.parts.length) selectedPart = 0;
  var part = e.parts[selectedPart];

  var html = '';
  html += '<div class="weapon-head">';
  html += '<div class="tabs">'+
    [["compare","비교표"],["breakpoint","브레이크포인트"]].map(function(v){
      return '<button class="tab-btn'+(viewMode===v[0]?' active':'')+'" data-view="'+v[0]+'">'+v[1]+'</button>';
    }).join('')+
    '</div>';
  html += '<button class="reset-btn" id="reset-btn">전체 데이터 초기화</button>';
  html += '</div>';

  html += '<div class="section-label">대상 부위 선택 — <span class="mono" style="color:var(--text-dim)">'+esc(e.name)+'</span></div>';
  html += '<div class="chips-row">';
  e.parts.forEach(function(p, i){
    html += '<button class="part-chip'+(i===selectedPart?' active':'')+'" data-idx="'+i+'">'+(p.lethal?'<span class="w">★</span> ':'')+esc(p.name)+' <span class="mono">('+fmt(p.hp)+'HP · '+avLabel(p.armor)+')</span></button>';
  });
  html += '</div>';

  if(part.img){
    html += '<div class="part-images">';
    html += '<figure><img src="'+esc(part.img)+'" alt="'+esc(part.name)+' 정면" onerror="this.closest(\'figure\').style.display=\'none\'"><figcaption>정면</figcaption></figure>';
    if(part.altImg){
      html += '<figure><img src="'+esc(part.altImg)+'" alt="'+esc(part.name)+' 측면" onerror="this.closest(\'figure\').style.display=\'none\'"><figcaption>측면</figcaption></figure>';
    }
    html += '<div class="img-credit">부위 다이어그램 출처: DiversDex (제작: Roy)</div>';
    html += '</div>';
  }

  html += viewMode === "breakpoint" ? renderBreakpointHtml(e, part) : renderCompareHtml(e, part);

  document.getElementById("weapon-panel").innerHTML = html;
  wireWeaponPanelEvents();
}

function renderCompareHtml(e, part){
  var html = '<div class="section-label" style="margin-top:16px;">무기별 BTK / TTK 비교 — 표 헤더 클릭 시 정렬, 회색 칸은 직접 수정 (1번째 피해 성분만 수정됨)</div>';

  var rows = state.weapons.filter(function(w){ return catFilter==="all" || w.cat===catFilter; });
  html += '<div class="chips-row" style="margin-bottom:10px;">'+
    ['all','primary','secondary','support'].map(function(c){
      return '<button class="tab-btn'+(catFilter===c?' active':'')+'" data-cat="'+c+'" style="border-radius:20px;">'+(c==='all'?'전체':CAT_LABEL[c])+'</button>';
    }).join('')+'</div>';

  var computed = rows.map(function(w){ return {w:w, c:computeRow(w, part, findEnemy(selectedEnemy).mainHp)}; });
  var minBtk = Math.min.apply(null, computed.map(function(r){return r.c.btk;}));
  var minTtk = Math.min.apply(null, computed.map(function(r){return r.c.ttk;}));

  computed.sort(function(a,b){
    var va = sortKey==="ttk"? a.c.ttk : a.c.btk;
    var vb = sortKey==="ttk"? b.c.ttk : b.c.btk;
    return (va-vb)*sortDir;
  });

  html += '<div class="table-wrap"><table><thead><tr>';
  html += '<th>무기</th><th>종류</th><th class="mono">관통(AV)</th><th class="mono">피해</th><th class="mono">내구%</th><th class="mono">발사속도(RPM)</th><th class="mono">탄창</th><th class="mono">재장전(초)</th><th>상태</th>';
  html += '<th class="sortable" data-sort="btk">BTK(처치)<span class="arrow">'+(sortKey==="btk"?(sortDir>0?'▲':'▼'):'')+'</span></th>';
  html += '<th class="sortable" data-sort="ttk">TTK(초)<span class="arrow">'+(sortKey==="ttk"?(sortDir>0?'▲':'▼'):'')+'</span></th>';
  html += '<th class="mono">탄창당 처치</th>';
  html += '<th class="mono">이 부위 파괴</th>';
  html += '<th></th>';
  html += '</tr></thead><tbody>';

  computed.forEach(function(r){
    var w = r.w, c = r.c, h0 = weaponHits(w)[0];
    var statusHtml = c.status==="full" ? '<span class="status-pill status-full">완전관통</span>'
      : c.status==="partial" ? '<span class="status-pill status-partial">부분감쇠</span>'
      : '<span class="status-pill status-blocked">관통불가</span>';
    var thumb = w.img ? '<img class="weapon-thumb" src="'+esc(w.img)+'" alt="" onerror="this.style.display=\'none\'">' : '';
    html += '<tr>';
    html += '<td><div class="weapon-name-cell">'+thumb+'<span>'+esc(w.name)+(c.btk===minBtk && isFinite(minBtk)?'<span class="best-badge">BEST BTK</span>':'')+(c.ttk===minTtk && isFinite(minTtk) ?'<span class="best-badge">BEST TTK</span>':'')+'</span></div></td>';
    html += '<td>'+CAT_LABEL[w.cat]+'</td>';
    html += '<td><input class="num-in mono" type="number" min="0" max="10" data-id="'+w.id+'" data-field="pen" value="'+h0.apDirect+'"></td>';
    html += '<td><input class="num-in mono" type="number" data-id="'+w.id+'" data-field="dmg" value="'+h0.dmg+'"></td>';
    html += '<td><input class="num-in mono" type="number" step="5" min="0" max="100" data-id="'+w.id+'" data-field="durablePct" value="'+Math.round(h0.durable*100)+'"></td>';
    html += '<td><input class="num-in mono" type="number" data-id="'+w.id+'" data-field="rpm" value="'+w.rpm+'"></td>';
    html += '<td><input class="num-in mono" type="number" data-id="'+w.id+'" data-field="mag" value="'+w.mag+'"></td>';
    html += '<td><input class="num-in mono" type="number" step="0.1" data-id="'+w.id+'" data-field="reload" value="'+w.reload+'"></td>';
    html += '<td>'+statusHtml+'</td>';
    html += '<td class="mono">'+fmtNum(c.btk)+'</td>';
    html += '<td class="mono">'+fmtNum(c.ttk,2)+'</td>';
    html += '<td class="mono">'+c.killsPerMag+'</td>';
    html += '<td class="mono">'+(c.sever===null?'-':c.sever)+'</td>';
    html += '<td><button class="reset-btn bp-jump" data-id="'+w.id+'" style="padding:3px 8px;font-size:11px;">상세</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function statRow(label, value){
  return '<div class="bp-stat"><span>'+label+'</span><span class="mono">'+value+'</span></div>';
}

function renderBreakpointHtml(e, part){
  var w = findWeapon(selectedWeapon);
  var mainHp = e.mainHp;
  var c = computeRow(w, part, mainHp);
  var hits = weaponHits(w);

  var html = '<div class="section-label" style="margin-top:16px;">브레이크포인트 계산기 — 무기 하나 vs 부위 하나 상세 분석</div>';

  html += '<div class="bp-weapon-select">무기 선택: <select id="bp-weapon-sel">';
  ['primary','secondary','support'].forEach(function(cat){
    html += '<optgroup label="'+CAT_LABEL[cat]+'">';
    state.weapons.filter(function(x){return x.cat===cat;}).forEach(function(x){
      html += '<option value="'+x.id+'"'+(x.id===w.id?' selected':'')+'>'+esc(x.name)+'</option>';
    });
    html += '</optgroup>';
  });
  html += '</select></div>';

  html += '<div class="bp-grid">';

  // ---- column 1: weapon ----
  html += '<div class="bp-col"><div class="bp-col-title">무기</div>';
  if(w.img){
    html += '<div class="bp-weapon-img"><img src="'+esc(w.img)+'" alt="'+esc(w.name)+'" onerror="this.parentElement.style.display=\'none\'"></div>';
  }
  html += statRow('분류', CAT_LABEL[w.cat]);
  html += statRow('탄창', fmt(w.mag));
  html += statRow('발사속도(RPM)', fmt(w.rpm));
  html += statRow('재장전(초)', fmt(w.reload,2));
  if(w.tacReload) html += statRow('전술 재장전(초)', fmt(w.tacReload,2));
  if(w.ergonomics) html += statRow('인체공학', fmt(w.ergonomics));
  html += '<div class="bp-subhead">피해 성분 ('+hits.length+'개)</div>';
  hits.forEach(function(h){
    html += '<div class="bp-hit">';
    html += '<div class="bp-hit-type">'+esc(h.type)+'</div>';
    html += statRow('피해량', fmt(h.dmg));
    html += statRow('내구%', fmtPct(h.durable));
    html += statRow('관통 (직격/경사/대경사/극단)', h.apDirect+' / '+h.apSlight+' / '+h.apLarge+' / '+h.apExtreme);
    if(h.outerRadius) html += statRow('폭발 반경(내/외)', fmt(h.innerRadius,1)+'m / '+fmt(h.outerRadius,1)+'m');
    if(h.falloff50m) html += statRow('50m 낙하 감쇠', fmtPct(h.falloff50m));
    html += '</div>';
  });
  html += '</div>';

  // ---- column 2: target ----
  html += '<div class="bp-col"><div class="bp-col-title">타겟 — '+esc(e.name)+' / '+esc(part.name)+'</div>';
  html += statRow('부위 체력', part.hp > 0 ? fmt(part.hp) : '해당없음(메인만)');
  html += statRow('메인 체력', fmt(mainHp));
  html += statRow('장갑(AV)', avLabel(part.armor));
  html += statRow('메인 기여율', fmtPct(part.toMain));
  html += statRow('치명(파괴시 즉사)', part.lethal ? 'Yes' : 'No');
  if(part.exdr) html += statRow('ExDR', fmtPct(part.exdr));
  if(part.badr) html += statRow('BaDR', fmtPct(part.badr));
  if(part.fireMult) html += statRow('화염 배율', fmtPct(part.fireMult));
  if(part.lightStagger || part.mediumStagger || part.heavyStagger || part.massiveStagger){
    html += '<div class="bp-subhead">스태거 임계값 (경/중/중重/massive)</div>';
    html += '<div class="bp-stat"><span class="mono" style="font-size:11px;">'+
      [part.lightStagger,part.mediumStagger,part.heavyStagger,part.massiveStagger].map(function(s){return s||'-';}).join(' · ')+
      '</span></div>';
  }
  html += '<div class="bp-tiles">';
  html += '<div class="bp-tile"><span>BTK</span><b>'+fmtNum(c.btk)+'</b></div>';
  html += '<div class="bp-tile"><span>TTK(초)</span><b>'+fmtNum(c.ttk,2)+'</b></div>';
  html += '<div class="bp-tile"><span>오버킬</span><b>'+fmtNum(c.overkill)+'</b></div>';
  html += '<div class="bp-tile"><span>재장전 횟수</span><b>'+fmtNum(c.reloads)+'</b></div>';
  html += '<div class="bp-tile"><span>탄창 소모</span><b>'+fmtPct(c.magPct)+'</b></div>';
  html += '<div class="bp-tile"><span>탄창당 처치</span><b>'+c.killsPerMag+'</b></div>';
  html += '</div>';
  html += '</div>';

  // ---- column 3: detailed calculation ----
  html += '<div class="bp-col bp-col-wide"><div class="bp-col-title">상세 계산</div>';
  html += '<div class="table-wrap"><table><thead><tr><th>피해 성분</th><th class="mono">관통(직격)</th><th class="mono">장갑(AV)</th><th>판정</th><th class="mono">피해</th><th>BTK 반영</th></tr></thead><tbody>';
  hits.forEach(function(h, i){
    var pen = h.apDirect >= part.armor;
    html += '<tr'+(i>0?' style="opacity:.55;"':'')+'><td>'+esc(h.type)+'</td><td class="mono">'+h.apDirect+'</td><td class="mono">'+part.armor+'</td>'+
      '<td>'+(pen?'<span class="status-pill status-full">관통</span>':'<span class="status-pill status-partial">내구만</span>')+'</td>'+
      '<td class="mono">'+fmtNum(pen?h.dmg:h.dmg*h.durable)+'</td>'+
      '<td>'+(i===0?'<span class="status-pill status-full">적용</span>':'<span class="status-pill status-blocked">참고용</span>')+'</td></tr>';
  });
  html += '<tr style="font-weight:600;"><td colspan="4">BTK/TTK에 실제 적용된 피해 (직격 성분만)</td><td class="mono">'+fmtNum(c.eff)+'</td><td></td></tr>';
  if(!part.lethal){
    html += '<tr><td colspan="4">메인 체력 반영분 (× 메인 기여율 '+fmtPct(part.toMain)+')</td><td class="mono">'+fmtNum(c.eff*part.toMain)+'</td><td></td></tr>';
  }
  html += '</tbody></table></div>';
  if(hits.length > 1){
    html += '<div class="img-credit" style="margin-top:6px;">2번째 이후 성분(주로 폭발 스플래시)은 참고용으로만 표시됩니다 — 직격 지점과 같은 부위에 얼마나 들어가는지는 원본 시트도 "실험적"이라 명시한 부분이라 BTK 계산엔 포함하지 않았습니다.</div>';
  }

  html += '<div class="section-label" style="margin-top:14px;">결과 요약</div>';
  html += '<div class="intel"><ul>';
  html += '<li>'+esc(w.name)+'(으)로 '+esc(part.name)+' 부위를 '+fmtNum(c.btk)+'발 맞히면 '+(part.lethal?'그 부위 파괴로 즉사':'메인 체력 소모로 처치')+'됩니다 (약 '+fmtNum(c.ttk,2)+'초, 재장전 '+fmtNum(c.reloads)+'회 포함).</li>';
  html += '<li>마지막 한 발의 초과 피해(오버킬)는 약 '+fmtNum(c.overkill)+'이며, 탄창의 '+fmtPct(c.magPct)+'을 소모합니다.</li>';
  if(c.sever!==null && c.sever!==c.btk){ html += '<li>이 부위 자체(껍데기)만 파괴하는 데는 '+c.sever+'발이면 충분합니다 (전체 처치와는 별개).</li>'; }
  html += '</ul></div>';
  html += '</div>';

  html += '</div>'; // .bp-grid
  return html;
}

function wireWeaponPanelEvents(){
  Array.prototype.forEach.call(document.querySelectorAll('.weapon-head .tab-btn'), function(btn){
    btn.addEventListener('click', function(){ viewMode = btn.getAttribute('data-view'); renderWeaponPanel(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.part-chip'), function(chip){
    chip.addEventListener('click', function(){ selectedPart = +chip.getAttribute('data-idx'); renderWeaponPanel(); });
  });
  document.getElementById('reset-btn').addEventListener('click', function(){
    if(confirm('모든 적/무기 데이터를 기본값으로 되돌립니다. 계속할까요?')) resetAll();
  });

  if(viewMode === "compare"){
    Array.prototype.forEach.call(document.querySelectorAll('.chips-row .tab-btn[data-cat]'), function(btn){
      btn.addEventListener('click', function(){ catFilter = btn.getAttribute('data-cat'); renderWeaponPanel(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('th.sortable'), function(th){
      th.addEventListener('click', function(){
        var k = th.getAttribute('data-sort');
        if(sortKey===k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
        renderWeaponPanel();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.bp-jump'), function(btn){
      btn.addEventListener('click', function(){
        selectedWeapon = btn.getAttribute('data-id');
        viewMode = "breakpoint";
        renderWeaponPanel();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#weapon-panel input.num-in'), function(inp){
      inp.addEventListener('change', function(){
        var id = inp.getAttribute('data-id'), field = inp.getAttribute('data-field');
        var w = findWeapon(id);
        var h0 = weaponHits(w)[0];
        var v = +inp.value;
        if(field==="durablePct"){ h0.durable = Math.max(0, Math.min(100, v))/100; }
        else if(field==="mag"){ w.mag = Math.max(1, Math.round(v)); }
        else if(field==="pen"){ h0.apDirect = Math.max(0, Math.round(v)); }
        else if(field==="dmg"){ h0.dmg = Math.max(0, v); }
        else { w[field] = Math.max(0, v); }
        save(); renderWeaponPanel();
      });
    });
  } else {
    var sel = document.getElementById('bp-weapon-sel');
    if(sel) sel.addEventListener('change', function(){ selectedWeapon = this.value; renderWeaponPanel(); });
  }
}

