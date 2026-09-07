# helldivers2dex

Helldivers 2 몹 대응 전략 + 무기별 BTK(Bullets To Kill)/TTK(Time To Kill) 계산기.

- **본 앱 (Next.js, 2026-09-08 마이그레이션)**: 저장소 루트가 Next.js 프로젝트 — `npm run dev`로 로컬 실행,
  `git push` 시 Vercel이 자동 빌드/배포함. `app/` (라우트), `components/` (UI), `lib/` (계산 로직·i18n·데이터 로더).
- **[data/](data/README.md)** — 실제 스탯 DB (`enemies.json`, `weapons.json`). Next.js 앱이 직접 읽어들이는 원본.
  전략/분석/BTK 질문에 답할 땐 여기부터 읽을 것.
- **[mcp-server/](mcp-server/README.md)** — 데이터를 어디서·어떻게 가져오는지(자동/수동), 다시 채우는 파이프라인.
- **`web/index.html`** — 마이그레이션 이전의 단일 정적 파일 버전. 지금은 데이터 입력용 캔버스 + Claude Artifact
  게시용으로만 유지 중: https://claude.ai/code/artifact/1c8bb0c8-6a0f-4567-bc12-67e4ebc8e72e
  — `mcp-server/scripts/export_db.cjs`가 이 파일의 `DEFAULT_ENEMIES()`/`DEFAULT_WEAPONS()`를 읽어
  `data/*.json`을 재생성한다 (Next.js 앱은 그 결과물만 봄).

패치로 수치가 바뀌었거나 새 유닛이 추가됐을 때 갱신하는 법은 `mcp-server/README.md`의
"Typical workflow after a patch" 참고.
