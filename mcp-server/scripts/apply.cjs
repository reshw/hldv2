const fs = require("fs");

const HTML_PATH = "C:\\Users\\seoka\\AppData\\Local\\Temp\\claude\\D--dev-helldivers2dex\\7f7bd04d-4ec9-4b95-8288-708b073bd7a9\\scratchpad\\ballistics.html";

let html = fs.readFileSync(HTML_PATH, "utf8");

const startMarker = "/* ============ constants ============ */";
const endMarker = "function renderAll(){ renderSidebar(); renderDossier(); renderWeaponPanel(); }";

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) throw new Error("markers not found: " + startIdx + " " + endIdx);

let newScript = fs.readFileSync(__dirname + "/newscript.js", "utf8");
const generatedData = fs.readFileSync(__dirname + "/../data/generated-data.js", "utf8");
newScript = newScript.replace("__GENERATED_DATA__", generatedData.trim());

html = html.slice(0, startIdx) + newScript + "\n" + html.slice(endIdx);

// Update disclaimer to reflect the new, much more solid data source
const oldDisclaimer = `  <div class="disclaimer">
    <b>데이터 상태:</b> 주무기·보조무기의 피해량/탄창/발사속도/관통등급은 <a href="https://github.com/helldivers-2/json" target="_blank" rel="noopener">helldivers-2/json</a>(MIT, GitHub 공개 데이터)로 검증됨.
    <b>내구피해%·재장전시간·지원화기 전체·적 부위별 장갑/체력</b>은 아직 위키 수동 확인 전 <b>추정값</b>입니다.
    표의 회색 입력칸은 모두 <b>직접 수정 가능</b>하고 브라우저에 자동 저장되니, 최신 수치로 보정해서 쓰세요.
    총알 수 계산은 <b>BTK(Bullets To Kill)</b>, 시간 계산은 <b>TTK(Time To Kill)</b> 기준입니다.
  </div>`;

const newDisclaimer = `  <div class="disclaimer">
    <b>데이터 출처:</b> 무기 92종·몹 48종 전체가 <b>DiversDex</b>(커뮤니티 제작, 인게임 테스트로 교차검증된 스프레드시트)와
    <a href="https://github.com/helldivers-2/json" target="_blank" rel="noopener">helldivers-2/json</a>(MIT, GitHub)로 채워져 있습니다 — 더 이상 순수 추정값이 아닙니다.
    다만 두 소스 다 Arrowhead 공식은 아니라 패치 후 오차가 생길 수 있어요.
    <b>메인 체력</b>은 몹의 전체 처치 기준 체력, <b>메인 기여율%</b>은 치명(★) 아닌 부위를 맞혔을 때 이 체력이 깎이는 비율입니다.
    표의 회색 입력칸은 모두 <b>직접 수정 가능</b>하고 브라우저에 자동 저장됩니다.
    총알 수 계산은 <b>BTK(Bullets To Kill)</b>, 시간 계산은 <b>TTK(Time To Kill)</b> 기준입니다.
  </div>`;

if (html.includes(oldDisclaimer)) {
  html = html.replace(oldDisclaimer, newDisclaimer);
} else if (!html.includes(newDisclaimer)) {
  throw new Error("disclaimer marker not found (neither old nor new form present)");
}

fs.writeFileSync(HTML_PATH, html, "utf8");
console.log("done, new size:", html.length);
