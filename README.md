# helldivers2dex

Helldivers 2 몹 대응 전략 + 무기별 BTK(Bullets To Kill)/TTK(Time To Kill) 계산기.

- **[data/](data/README.md)** — 실제 스탯 DB (`enemies.json`, `weapons.json`). 전략/분석/BTK 질문에 답할 땐 여기부터 읽을 것.
- **[mcp-server/](mcp-server/README.md)** — 데이터를 어디서·어떻게 가져오는지(자동/수동), 다시 채우는 파이프라인.
- **계산기 (Artifact)**: https://claude.ai/code/artifact/1c8bb0c8-6a0f-4567-bc12-67e4ebc8e72e
  — 소스 파일은 리포 밖 스크래치패드에 있음 (`mcp-server/scripts/export_db.cjs` / `apply.cjs`에 경로 하드코딩됨).

패치로 수치가 바뀌었거나 새 유닛이 추가됐을 때 갱신하는 법은 `mcp-server/README.md`의
"Typical workflow after a patch" 참고.
