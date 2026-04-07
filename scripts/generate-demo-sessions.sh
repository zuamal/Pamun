#!/usr/bin/env bash
# generate-demo-sessions.sh — 3개 데모 번들의 demo_session.json을 생성한다.
#
# 사전 조건:
#   - backend 서버가 http://localhost:8000 에서 실행 중이어야 한다.
#   - ANTHROPIC_API_KEY가 설정되어 있어야 한다.
#
# 사용법:
#   cd <repo-root>
#   uvicorn app.main:app --reload --port 8000 &   # 별도 터미널에서
#   ./scripts/generate-demo-sessions.sh

set -euo pipefail

BASE_URL="http://localhost:8000"
BUNDLES=("BookFlow" "LearnHub" "MediBook")
DOCS_DUMMY="docs/dummy"
SESSIONS_DIR="sessions"

# ── 의존성 체크 ──────────────────────────────────────────────────────────────
command -v curl  >/dev/null 2>&1 || { echo "❌ curl이 필요합니다." >&2; exit 1; }
command -v jq    >/dev/null 2>&1 || { echo "❌ jq가 필요합니다." >&2; exit 1; }

# ── 서버 기동 확인 ───────────────────────────────────────────────────────────
echo "→ 서버 연결 확인 중..."
if ! curl -sf "${BASE_URL}/health" >/dev/null; then
  echo "❌ 백엔드 서버가 실행 중이지 않습니다: ${BASE_URL}"
  echo "   uvicorn app.main:app --reload --port 8000  을 먼저 실행하세요."
  exit 1
fi
echo "  서버 OK"

# ── API 키 확인 ──────────────────────────────────────────────────────────────
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "❌ ANTHROPIC_API_KEY가 설정되지 않았습니다."
  exit 1
fi

# ── 번들 처리 ────────────────────────────────────────────────────────────────
for BUNDLE in "${BUNDLES[@]}"; do
  echo ""
  echo "━━━ ${BUNDLE} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # 1. 상태 초기화
  echo "  [1/6] 상태 초기화..."
  curl -sf -X POST "${BASE_URL}/api/session/reset" >/dev/null

  # 2. 번들 로드 (dummy)
  echo "  [2/6] 번들 파일 로드 (${BUNDLE})..."
  curl -sf -X POST "${BASE_URL}/api/dummy/load/${BUNDLE}" >/dev/null

  # 3. document_ids 수집
  DOC_IDS=$(curl -sf "${BASE_URL}/api/documents" | jq -r '[.documents[].id] | @json')

  # 4. 파싱 (SSE 스트림 소비 후 완료 대기)
  echo "  [3/6] LLM 파싱 중..."
  curl -sf -X POST "${BASE_URL}/api/parse" \
    -H "Content-Type: application/json" \
    -d "{\"document_ids\": ${DOC_IDS}}" \
    --no-buffer \
    -o /dev/null

  # 5. 엣지 추론
  echo "  [4/6] LLM 엣지 추론 중..."
  curl -sf -X POST "${BASE_URL}/api/edges/infer" \
    -H "Content-Type: application/json" \
    -d '{}' \
    --no-buffer \
    -o /dev/null

  # 6. 추론된 Edge 전체 APPROVED로 변경
  echo "  [5/6] Edge APPROVED 처리..."
  PENDING_EDGES=$(curl -sf "${BASE_URL}/api/edges?status=pending" | jq -r '.edges[].id')
  for EDGE_ID in $PENDING_EDGES; do
    curl -sf -X PATCH "${BASE_URL}/api/edges/${EDGE_ID}" \
      -H "Content-Type: application/json" \
      -d '{"status": "approved"}' >/dev/null
  done

  # 7. 세션 저장
  echo "  [6/6] 세션 저장..."
  SAVED_PATH=$(curl -sf -X POST "${BASE_URL}/api/session/save" | jq -r '.filepath')
  echo "  저장된 파일: ${SAVED_PATH}"

  # 8. demo_session.json으로 복사
  DEST="${DOCS_DUMMY}/${BUNDLE}/demo_session.json"
  cp "${SAVED_PATH}" "${DEST}"
  echo "  ✓ ${DEST} 생성 완료"

  # 요약
  REQ_COUNT=$(curl -sf "${BASE_URL}/api/requirements" | jq '. | length')
  EDGE_COUNT=$(curl -sf "${BASE_URL}/api/edges?status=approved" | jq '.edges | length')
  echo "  요구사항: ${REQ_COUNT}개 / Approved Edge: ${EDGE_COUNT}개"
done

echo ""
echo "✅ 모든 데모 세션 생성 완료!"
echo "   git add docs/dummy/*/demo_session.json"
