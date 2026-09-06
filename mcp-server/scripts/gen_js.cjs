const fs = require("fs");
const path = require("path");

const weapons = require("../data/transformed-weapons.json");
const enemiesRaw = require("../data/transformed-enemies.json");

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ---- curated hand-written tips, kept for the enemies we already know well (exact case-insensitive name match) ----
const CURATED_TIPS = {
  "scavenger": ["무장갑 소형 개체. 어떤 화기로도 1~2발이면 처치.", "다수가 무리지어 접근 — 산탄총·범위 화기로 몰아 처리.", "개별 위협도는 낮지만 신호탄 역할(증원 유발)에 주의."],
  "hunter": ["장갑 없음, 이동 속도와 점프 돌진이 유일한 위협.", "점프 공격은 슬로우 효과 — 근접 시 우선 처치 권장.", "경장갑 관통 이상이면 무엇이든 효율적으로 처리 가능."],
  "warrior": ["머리가 무장갑 약점 — 헤드샷 원킬 노리기 가장 효율적.", "정면 돌진 판정이 있어 측면·후방에서 사격 권장.", "다리를 노리면 기동력을 죽여 후속 대응이 쉬워짐."],
  "bile spitter": ["등에 노출된 산낭이 약점 — 터뜨리면 즉시 무력화.", "원거리 산 투사체 공격이 광역 피해 — 근접보다 사격 우선.", "산낭 파괴 후에도 남은 체력은 낮은 편이라 마무리 쉬움."],
  "brood commander": ["머리는 무장갑이지만 체력이 높아 고화력 필요.", "증원 신호(포효) 전에 헤드샷으로 빠르게 제거하는 게 이상적.", "중장갑 관통 화기가 없다면 몸통 대신 계속 머리를 노릴 것."],
  "charger": ["정면 다리는 대전차급 관통이 아니면 사실상 무적.", "돌진을 유도해 지나간 뒤 노출되는 뒷부분을 집중 사격.", "대전차 화기(무반동포/EAT/쿼사) 한 방으로 다리 파괴 후 마무리 추천."],
  "bile titan": ["배 밑 산낭이 최우선 약점 — 정면 포복 후 사격 가능.", "산을 토할 때 벌어지는 입도 관통 없이 큰 피해 가능.", "오브 스트라이크/헬밤 등 대형 스트라이크로 원콤 처리가 가장 효율적."],
  "impaler": ["고정형 개체 — 촉수 뿌리를 원거리에서 집중 공략.", "촉수 자체를 끊으면 일시 무력화되므로 관통력 있는 화기 우선.", "이동하지 않으므로 대전차 화기 조준 사격에 유리."],
  "trooper": ["전신 무장갑 — 아무 화기로나 원킬급.", "원거리 소총 사격을 하므로 엄폐 없이 다수와 교전 시 위험.", "헤드샷 필요 없이 몸통 사격만으로도 충분히 빠르게 처리."],
  "marauder": ["머리는 무장갑 약점, 경장갑 관통이면 몸통도 효율적.", "트루퍼보다 방어가 두꺼워 물량전에서 탄약 소모 유의.", "측면 우회로 다수를 한번에 노출시켜 처리하면 효율적."],
  "devastator": ["정면 가슴 장갑판이 두꺼움 — 관통력 없으면 머리나 등을 노릴 것.", "붉은 눈(머리)이 약점 — 원거리 조준사격 최우선.", "후방 기동이 가능하면 등짝을 노려 손쉽게 처리."],
  "heavy devastator": ["정면 방패 장갑이 매우 두꺼움 — 정면 화력전은 비효율적.", "기동으로 측면·후방을 잡아 무장갑 부위를 노릴 것.", "머리 약점 노출 각이 나오면 마크스맨 소총으로 원킬 가능."],
  "berserker": ["원거리 무기가 없어 근접 전 최대한 원거리에서 처리.", "가슴 장갑이 매우 두꺼우니 다리를 먼저 끊어 기동력 무력화.", "돌진 속도가 빨라 조기 발견 시 후퇴 경로 확보 필수."],
  "hulk": ["정면 안구, 후방 환기구 둘 다 치명 약점 — 둘 중 노출된 쪽을 노릴 것.", "화염방사형 헐크는 근접 화염 범위가 넓으니 거리 유지 필수.", "팔·다리는 장갑이 두꺼워 비효율적, 약점 위주로 공략."],
  "tank": ["정면 장갑은 사실상 뚫리지 않음 — 반드시 측후방으로 기동.", "후방 환기구는 무장갑 — 대전차 화기 한 방이면 폭발 유도.", "포신 조준선을 피해 엄폐하며 측면으로 접근."],
  "factory strider": ["하단을 통과하며 노출되는 복부 약점이 최우선 목표.", "안면 기관포를 먼저 침묵시키면 압박이 크게 줄어듦.", "대형 스트라이크(오브/헬밤)로 복부를 직격하면 원콤 가능."],
  "watcher": ["정찰용 소형 비행체 — 발각 시 증원 호출 전에 신속 격추.", "경장갑 관통이면 대부분의 주무기로 1~2발에 처리.", "조용히 처리해야 대규모 어그로를 피할 수 있음."],
  "overseer": ["부유 이동 + 원거리 무기 보유 — 엄폐 없이 교전 시 위험.", "머리를 노리면 약한 관통력으로도 빠르게 처리 가능.", "고도가 높아지면 대공 사격각이 나오는 위치 선점이 중요."],
};

const CLASS_HINT = {
  Light: "경량 개체 — 대부분의 화기로 손쉽게 처리 가능.",
  Medium: "중간 위협 — 관통력 있는 화기를 권장.",
  Heavy: "고위협 개체 — 대전차급 화기 또는 정확한 약점 사격이 필요.",
  Special: "특수 개체 — 패턴을 파악하고 상황에 맞게 대응할 것.",
};

function autoTips(e) {
  const lethalNames = e.parts.filter((p) => p.lethal).map((p) => p.name);
  const maxArmor = Math.max(0, ...e.parts.map((p) => p.armor));
  const tips = [];
  tips.push(`메인 체력 ${e.mainHp} · 치명 부위: ${lethalNames.length ? lethalNames.join(", ") : "없음 (전체 체력 소모로만 처치)"}.`);
  tips.push(`최대 장갑 등급 AV${maxArmor}${maxArmor >= 4 ? " — 이 이상 관통하는 화기가 아니면 내구피해%만 들어감." : "."}`);
  tips.push(CLASS_HINT[e.class] || "");
  return tips.filter(Boolean);
}

function enemyTips(e) {
  const key = e.name.toLowerCase();
  return CURATED_TIPS[key] || autoTips(e);
}

// dedupe enemy ids
const usedEnemyIds = new Set();
function enemyId(name) {
  let s = slug(name);
  let i = 2;
  while (usedEnemyIds.has(s)) { s = slug(name) + "_" + i++; }
  usedEnemyIds.add(s);
  return s;
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function strOrOmit(key, v) { return v ? `,${key}:${JSON.stringify(v)}` : ""; }
function numOrOmit(key, v) { return v ? `,${key}:${round2(v)}` : ""; }

const enemyLines = enemiesRaw
  .sort((a, b) => (a.faction === b.faction ? a.mainHp - b.mainHp : a.faction.localeCompare(b.faction)))
  .map((e) => {
    const id = enemyId(e.name);
    const parts = e.parts
      .map((p) => {
        const img = p.mainImg ? `,img:${JSON.stringify(p.mainImg)}` : "";
        const altImg = p.altImg && p.altImg !== p.mainImg ? `,altImg:${JSON.stringify(p.altImg)}` : "";
        const extra =
          numOrOmit("exdr", p.exdr) +
          numOrOmit("badr", p.badr) +
          numOrOmit("fireMult", p.fireMult) +
          numOrOmit("constitution", p.constitution) +
          (p.mainCap ? ",mainCap:true" : "") +
          strOrOmit("lightStagger", p.lightStagger) +
          strOrOmit("mediumStagger", p.mediumStagger) +
          strOrOmit("heavyStagger", p.heavyStagger) +
          strOrOmit("massiveStagger", p.massiveStagger) +
          strOrOmit("notes", p.notes && p.notes !== "No notes." ? p.notes : "");
        return `{name:${JSON.stringify(p.name)},hp:${p.hp},armor:${p.armor},durability:${round2(p.durability)},toMain:${round2(p.toMain)},lethal:${p.lethal}${img}${altImg}${extra}}`;
      })
      .join(",");
    const tips = JSON.stringify(enemyTips(e));
    return `  {id:${JSON.stringify(id)}, faction:${JSON.stringify(e.faction)}, name:${JSON.stringify(e.name)}, mainHp:${e.mainHp},\n    parts:[${parts}],\n    tips:${tips}}`;
  });

const usedWeaponIds = new Set();
function weaponId(name) {
  let s = slug(name);
  let i = 2;
  while (usedWeaponIds.has(s)) { s = slug(name) + "_" + i++; }
  usedWeaponIds.add(s);
  return s;
}

function catOf(sheetCat) {
  if (/^Primary/.test(sheetCat)) return "primary";
  if (/^Secondary/.test(sheetCat)) return "secondary";
  return "support";
}

function hitLiteral(h) {
  return `{type:${JSON.stringify(h.type)},dmg:${h.dmg},durable:${round2(h.durable)}` +
    `,apDirect:${h.apDirect},apSlight:${h.apSlight},apLarge:${h.apLarge},apExtreme:${h.apExtreme}` +
    numOrOmit("innerRadius", h.innerRadius) + numOrOmit("outerRadius", h.outerRadius) +
    numOrOmit("staggerRadius", h.staggerRadius) + numOrOmit("demolition", h.demolition) +
    numOrOmit("stagger", h.stagger) + numOrOmit("pushForce", h.pushForce) +
    numOrOmit("falloff25m", h.falloff25m) + numOrOmit("falloff50m", h.falloff50m) + numOrOmit("falloff100m", h.falloff100m) +
    `}`;
}

const weaponLines = weapons
  .sort((a, b) => catOf(a.category).localeCompare(catOf(b.category)) || a.name.localeCompare(b.name))
  .map((w) => {
    const id = weaponId(w.name);
    const hits = w.hits.map(hitLiteral).join(",");
    const extra =
      numOrOmit("tacReload", w.tacReload) +
      numOrOmit("ergonomics", w.ergonomics) +
      numOrOmit("spreadX", w.spreadX) + numOrOmit("spreadY", w.spreadY) +
      numOrOmit("caliber", w.caliber) + numOrOmit("speed", w.speed) + numOrOmit("mass", w.mass) +
      strOrOmit("notes", w.notes && w.notes !== "No notes." ? w.notes : "") +
      strOrOmit("img", w.img);
    return `  {id:${JSON.stringify(id)}, name:${JSON.stringify(w.name)}, cat:${JSON.stringify(catOf(w.category))}, pen:${w.pen}, dmg:${w.dmg}, durable:${round2(w.durable)}, rpm:${w.rpm}, mag:${w.mag}, reload:${round2(w.reload)}${extra},\n    hits:[${hits}]}`;
  });

const out = `function DEFAULT_ENEMIES(){ return [\n${enemyLines.join(",\n")}\n];}\n\nfunction DEFAULT_WEAPONS(){ return [\n${weaponLines.join(",\n")}\n];}\n`;

fs.writeFileSync(path.join(__dirname, "../data/generated-data.js"), out);
console.log("wrote", enemyLines.length, "enemies and", weaponLines.length, "weapons");
