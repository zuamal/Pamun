# Pamun — Architecture Decision Record

**Requirements Dependency Tracker & Change Impact Analyzer**

| Field   | Value         |
|---------|---------------|
| Version | 1.0           |
| Date    | 2026-03-30    |
| Status  | Accepted      |

---

## Decisions Summary

| ID | Decision | Choice |
|----|----------|--------|
| ADR-1 | 모노레포 구조 | 단순 폴더 분리 (backend/ + frontend/) |
| ADR-2 | 의존성 방향 및 타입 계약 | Backend-first. Pydantic = SSoT → OpenAPI → openapi-typescript |
| ADR-3 | 백엔드 저장소 | 인메모리 (dict + networkx) + JSON 파일 영속화 |
| ADR-4 | 프론트엔드 상태 관리 | Zustand |
| ADR-5 | 요구사항 위치 표현 | char offset (SSoT) + display_label (UI 보조) |
| ADR-6 | Edge 방향성 모델링 | relation_type에서 암묵적 결정 |
| ADR-7 | Scenario 모델 | 불필요. changed 플래그로 대체 |
| ADR-8 | API 설계 (파싱/추론) | 분리: /parse → 검토 → /edges/infer |
| ADR-9 | API 설계 (영향 분석) | 플래그 설정과 분석 분리 |
| ADR-10 | LLM Structured Output | Instructor 라이브러리 (Pydantic 스키마 직접 사용) |
| ADR-11 | LLM 공급자 | Anthropic Claude (claude-sonnet-4-5) |
| ADR-12 | 문서 텍스트 추출 | python-docx + pdfplumber + markdown 파싱. Scanned PDF 미지원. |
| ADR-13 | LLM 장시간 작업 처리 | SSE(Server-Sent Events). 파이프라인 단계별 진행상황 스트리밍. |
| ADR-14 | 그래프 시각화 라이브러리 | React Flow |
| ADR-15 | 원문 뷰어 | plain text 렌더링 + char offset 기반 하이라이트 |
| ADR-16 | 프론트엔드 스타일링 | Tailwind CSS. 인라인 style 전면 제거. |
| ADR-17 | App Shell 레이아웃 | 좌측 고정 Sidebar + 4단계 Stepper (GraphPage/ImpactPage 분리) |
| ADR-18 | Toast 라이브러리 | sonner |
| ADR-19 | 데모 배포 아키텍처 | GitHub Pages (정적 SPA) + GitHub Actions 직접 배포 (gh-pages 브랜치 없음) |
| ADR-20 | 데모 모드 API 처리 | 프론트엔드 mock 레이어. LLM 기능은 비활성화 안내. |
| ADR-21 | 온보딩 튜토리얼 라이브러리 | react-joyride (spotlight + 툴팁 코치마크) |

---

## ADR-1. 모노레포 구조

**Context:** Pamun은 FastAPI 백엔드와 React 프론트엔드로 구성된다. 코드를 하나의 레포에서 관리하되 패키지 구조를 결정해야 한다.

**Decision:** 단순 폴더 분리. backend/와 frontend/를 독립된 환경으로 운영하고, shared 레이어 없이 OpenAPI 스펙으로 타입을 동기화한다.

**Rationale:** OpenAPI → TS 코드 생성 파이프라인을 사용하면 shared 폴더가 불필요해진다. npm workspaces나 Turborepo는 Python 백엔드와 통합되지 않아 반쪽 모노레포가 되며, 문서 3–5개 규모에서 빌드 캐싱은 의미 없다.

**Alternatives:**
- npm workspaces + pip 독립: TS 타입 패키지 공유 가능하지만 Python 측과 불일치. 설정 복잡도 증가.
- Turborepo/Nx: 빌드 오케스트레이션 제공하지만 포트폴리오 규모에 과도한 인프라.

**Project structure:**

```
pamun/
├── docs/
│   ├── Pamun_ADR_v1.md
│   └── Pamun_PRD_v1.md
├── backend/          # FastAPI + Python
│   ├── app/
│   │   ├── models/     # Pydantic models (SSoT)
│   │   ├── api/        # Route handlers
│   │   ├── services/   # Business logic
│   │   ├── llm/        # LLM pipeline (Instructor)
│   │   └── storage/    # In-memory + JSON persistence
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/        # Generated types + manual fetch calls
│   │   ├── stores/     # Zustand stores
│   │   ├── components/ # React components
│   │   └── pages/      # Page-level views
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   └── generate-types.sh  # openapi-typescript pipeline
└── README.md
```

---

## ADR-2. 의존성 방향 및 프론트-백 타입 계약

**Context:** Backend의 Pydantic 모델과 Frontend의 TypeScript 타입을 동기화하는 전략이 필요하다.

**Decision:** Backend-first. Pydantic 모델이 Single Source of Truth. FastAPI가 OpenAPI spec을 자동 생성하고, openapi-typescript로 TS 타입만 추출한다. API 호출은 직접 작성한다.

**Rationale:** LLM 파이프라인과 Instructor 라이브러리가 백엔드에 있으므로 스키마 주도권이 백엔드에 있는 것이 자연스럽다. openapi-typescript는 타입만 생성하여 블랙박스 코드 없이 투명하게 유지된다.

**Alternatives:**
- openapi-fetch: 타입 안전 fetch wrapper 제공하지만 추가 의존성. 포트폴리오에서는 직접 작성이 코드 이해도를 보여준다.
- orval / openapi-generator: React Query 훅까지 자동 생성하지만 블랙박스 코드로 디버깅 까다로움.

**Type generation pipeline:**

```bash
# scripts/generate-types.sh
#!/bin/bash
set -e

# 1. Extract OpenAPI spec from FastAPI
cd backend && python -c "
  from app.main import app
  import json
  spec = app.openapi()
  with open('../frontend/src/api/openapi.json', 'w') as f:
    json.dump(spec, f, indent=2)
"

# 2. Generate TS types
cd ../frontend
npx openapi-typescript src/api/openapi.json -o src/api/types.generated.ts

echo "Types generated successfully"
```

---

## ADR-3. 백엔드 저장소

**Context:** PM이 작업한 문서, 요구사항, 그래프, 승인 상태를 저장해야 한다.

**Decision:** 인메모리(Python dict + networkx)로 상태를 관리하고, 세션 단위로 JSON 파일에 영속화한다.

**Rationale:** 포트폴리오 프로젝트로서 DB 설정 없이 바로 실행 가능해야 한다. networkx는 그래프 탐색(1-hop 영향 분석)에 최적화된 라이브러리다. 1인 사용 시나리오에서 동시성 문제는 발생하지 않는다.

**Alternatives:**
- SQLite: 파일 하나로 영속성 확보하지만 그래프 데이터를 관계형 DB에 넣으면 쿼리가 어색해진다. ORM 설정 비용.
- SQLite + networkx 혼합: 각 데이터에 적합한 저장소이지만 두 저장소 간 동기화가 필요해 복잡도 증가.

---

## ADR-4. 프론트엔드 상태 관리

**Context:** 그래프 시각화, 요구사항 목록, 변경 플래그, 영향 분석 결과 등 복잡한 상태를 관리해야 한다.

**Decision:** Zustand을 사용한다.

**Rationale:** 그래프 시각화 라이브러리(D3, React Flow 등)와 상태를 공유해야 하는데, Zustand는 React 컴포넌트 밖에서도 store에 접근 가능하여 이 케이스에 적합하다. 1KB로 가벼우며 보일러플레이트가 최소화된다.

**Alternatives:**
- useState/useReducer: 의존성 없지만 prop drilling 발생. 그래프 라이브러리와의 상태 공유 어려움.
- React Context + useReducer: 내장 기능만 사용하지만 리렌더링 최적화가 어려워 그래프 인터랙션에서 성능 문제 가능성.

**State ownership:**

| State | Backend | Frontend | Note |
|-------|---------|----------|------|
| 업로드된 문서 원문 | SSoT | — | 메모리 + 파일 |
| 파싱된 요구사항 | SSoT | Cache | API로 동기화 |
| 의존관계 (Edges) | SSoT | Cache | networkx 그래프 |
| 변경 플래그 | SSoT | UI 반영 | PATCH로 설정 |
| 영향 분석 결과 | 요청 시 계산 | 응답 표시 | 저장 안 함 |
| 그래프 레이아웃/줌 | — | Zustand | 프론트 전용 |
| UI 필터/선택 상태 | — | Zustand | 프론트 전용 |

---

## ADR-5. 요구사항 원문 위치 표현

**Context:** 요구사항이 원본 문서의 어디에서 왔는지 추적해야 한다. jump-to-section 기능에 필요.

**Decision:** 문자 오프셋(char_start, char_end)을 SSoT로 저장하고, UI 표시용으로 display_label(예: "2.1 로그인 기능", "3번째 문단")을 LLM 파싱 시 보조 필드로 함께 추출한다.

**Rationale:** 문서를 plain text로 변환한 후 기계적으로 매핑 가능하여 신뢰성이 높다. 다만 char offset만으로는 사용자가 "왜 여기로 점프했지?"를 이해하기 어려울 수 있다. 특히 PDF/DOCX는 원본 렌더링과 plain text 추출 결과가 1:1로 맞지 않을 수 있다. display_label을 보조값으로 두어 SSoT(기술)와 UX(표시) 계층을 분리한다.

**Alternatives:**
- 구조적 경로만 (heading_path + paragraph_index): 사람이 읽기 쉬우나 헤더 없는 문서에서 의미 없음.
- 둘 다 저장 (동등 지위): 용도별 선택 가능하지만 모델 복잡도 증가 및 불일치 위험.

---

## ADR-6. Edge 방향성 모델링

**Context:** depends_on은 방향성이 있고 related_to는 양방향이다. 이를 모델에 어떻게 반영할지 결정해야 한다.

**Decision:** relation_type에서 방향성을 암묵적으로 결정한다. depends_on이면 source→target 방향, related_to이면 양방향으로 처리.

**Impact analysis policy (PRD FR-4.2와 동기화):**
- `related_to`: 양방향 영향 — 한쪽이 변경되면 다른 쪽도 **영향받음**.
- `depends_on` (target 변경 → source): source는 **영향받음**으로 하이라이트. (자연스러운 역방향)
- `depends_on` (source 변경 → target): target은 **검토 권장**으로 하이라이트. (정방향은 약한 신호)

**Rationale:** MVP에서 관계 유형이 2개뿐이고, 방향성은 유형에 내재된 속성이다. directed 필드를 별도로 두면 불일치 상태(depends_on인데 directed=false)가 가능해져 모델 무결성이 깨진다.

**Alternatives:**
- direction 필드 추가: 명시적이지만 중복 정보로 불일치 위험 발생.

---

## ADR-7. Scenario 모델 불필요

**Context:** PM이 변경을 마킹할 때, 변경 묶음을 Scenario라는 별도 엔티티로 관리할지 결정해야 한다.

**Decision:** Scenario 모델을 도입하지 않는다. Requirement 모델에 changed: bool 플래그만 두고, 영향 분석은 현재 플래그 상태를 기반으로 실시간 계산한다.

**Rationale:** MVP에서 변경 시나리오 비교("이걸 바꾸면?" vs "저걸 바꾸면?") 기능이 없으므로 별도 모델이 불필요하다.

**Alternatives:**
- 변경 묶음 추적(Scenario): 여러 변경을 독립적으로 추적하고 비교 가능하지만 MVP 범위 초과.

---

## ADR-8. API 설계: 파싱과 추론 분리

**Context:** LLM이 수행하는 파싱(요구사항 추출)과 추론(의존관계 발견)을 하나의 API로 합칠지, 분리할지 결정해야 한다.

**Decision:** 분리한다. POST /api/parse → PM 검토 → POST /api/edges/infer 순서로 실행한다.

**Rationale:** PRD User Flow Step 3(파싱 결과 검토)에서 PM이 요구사항을 분리/병합/삭제한 후에 추론을 실행해야 한다. 파싱이 틀린 상태에서 추론을 쌓으면 결과가 무의미하다.

**Alternatives:**
- 합체 (/api/analyze): 한 번에 끝나지만 PM 검토 기회가 없어 PRD 흐름과 불일치.

---

## ADR-9. API 설계: 영향 분석 플래그와 분석 분리

**Context:** 변경 플래그 설정과 영향 분석 실행을 하나의 API로 합칠지 분리할지 결정해야 한다.

**Decision:** 분리한다. PATCH /api/requirements/{id}로 changed 플래그를 설정하고, GET /api/impact로 현재 플래그 기반 영향 분석을 실행한다.

**Rationale:** PM이 여러 노드에 플래그를 하나씩 설정한 뒤 한 번에 영향 분석을 실행하는 플로우를 지원한다. RESTful 원칙에 부합하며 각 API의 책임이 명확하다.

**Alternatives:**
- 플래그+분석 한 번에 (POST /api/impact): 프론트 호출이 간단하지만 단일 API에 역할이 과다.

---

## ADR-10. LLM Structured Output: Instructor 라이브러리

**Context:** LLM으로부터 구조화된 출력(요구사항 목록, 의존관계 목록)을 안정적으로 받아야 한다.

**Decision:** Instructor 라이브러리를 사용하여 Pydantic 모델을 LLM 출력 스키마로 직접 사용한다.

**Rationale:** 프로젝트 전체가 "Pydantic = SSoT" 구조인데, LLM 출력도 같은 Pydantic 모델로 검증하면 스키마 일관성이 극대화된다. Instructor는 자동 retry + validation을 내장하여 파싱 에러를 최소화한다.

**Alternatives:**
- JSON mode: 대부분 LLM API 지원하지만 스키마 위반 가능성 있어 별도 validation 필요.
- Function calling / Tool use: 스키마 준수율 높으나 API마다 인터페이스 달라 특정 LLM에 종속적.

---

## ADR-11. LLM 공급자

**Context:** Instructor를 통해 structured output을 받을 LLM 공급자와 모델을 선택해야 한다.

**Decision:** Anthropic Claude (`claude-sonnet-4-5`)를 사용한다. API 키는 `backend/.env`의 `ANTHROPIC_API_KEY`로 관리한다. **`ANTHROPIC_API_KEY`는 선택적(optional)이다.** 미설정 시 서버는 정상 기동되며, LLM을 실제 호출하는 시점(`/api/parse`, `/api/edges/infer`)에만 503을 반환하고 나머지 API는 동작한다.

**Rationale:** 포트폴리오 프로젝트로서 이 툴 자체가 Claude Code로 개발되고 있으므로 Anthropic 생태계와의 일관성이 높다. claude-sonnet-4-5는 structured output 품질과 속도의 균형이 적합하며, Instructor의 Anthropic 지원이 안정적이다. API 키를 선택적으로 만드는 것은 키-프리 데모 모드(FR-9.1) 지원을 위해 필요하다.

**Alternatives:**
- OpenAI GPT-4o: Instructor 지원이 가장 성숙하지만 공급자 다변화 이점이 없음.
- Anthropic claude-haiku: 빠르고 저렴하지만 복잡한 문서 파싱 품질이 낮을 수 있음.

**Configuration:**

```
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-5
```

---

## ADR-12. 문서 텍스트 추출

**Context:** Markdown, DOCX, PDF 세 포맷에서 plain text를 추출해야 한다. Scanned PDF 지원 여부도 결정해야 한다.

**Decision:** 포맷별 전용 라이브러리를 사용한다: Markdown → `mistune`(HTML 태그 제거 후 plain text), DOCX → `python-docx`, PDF → `pdfplumber`. Scanned PDF(이미지 기반)는 MVP에서 지원하지 않는다.

**Rationale:** 각 라이브러리는 해당 포맷에 특화되어 추출 품질이 높다. pdfplumber는 텍스트 기반 PDF에서 레이아웃을 고려한 추출이 가능하다. Scanned PDF OCR(Tesseract 등)은 의존성과 처리 시간이 크게 증가하여 MVP 범위를 초과한다.

**Alternatives:**
- `pypdf` (PDF): 경량이지만 복잡한 레이아웃에서 추출 품질 저하.
- `mammoth` (DOCX): HTML 변환에 특화되어 plain text 추출 목적과 맞지 않음.
- `unstructured`: 단일 라이브러리로 모든 포맷 처리 가능하지만 의존성이 매우 무거움.

---

## ADR-13. LLM 장시간 작업 처리

**Context:** `/api/parse`와 `/api/edges/infer`는 LLM 호출로 수십 초가 걸릴 수 있다. 사용자가 진행 중임을 인지할 수 있도록 진행상황을 실시간으로 전달해야 한다 (PRD FR-5.1).

**Decision:** SSE(Server-Sent Events)를 사용한다. 두 엔드포인트는 `Content-Type: text/event-stream`으로 파이프라인 단계별 `ProgressEvent`를 스트리밍한다. 프론트엔드는 `fetch` + `ReadableStream`으로 수신한다 (`EventSource`는 POST를 지원하지 않으므로 사용하지 않는다).

**Rationale:** LLM 호출이 10–30초 걸리는 구간에서 스피너만 보여주면 사용자가 작업이 진행 중인지 알 수 없다. 단계명과 진행률을 실시간으로 보여주면 UX가 크게 개선된다. SSE는 단방향 서버→클라이언트 스트리밍에 최적이며, WebSocket 대비 구현이 단순하다. Polling은 백그라운드 작업 큐가 필요해 복잡도가 더 높다.

**SSE 이벤트 스키마:**

```python
# backend/app/models/api.py 추가

class ProgressStep(str, Enum):
    PREPARING = "preparing"
    PARSING   = "parsing"    # parse 전용
    INFERRING = "inferring"  # infer 전용
    SAVING    = "saving"
    DONE      = "done"
    ERROR     = "error"

class ProgressEvent(BaseModel):
    step: ProgressStep
    message: str             # 사용자에게 표시할 한국어 메시지
    progress: int            # 0–100
```

**이벤트 흐름 (parse):**

```
data: {"step":"preparing","message":"파싱 준비 중...","progress":0}
data: {"step":"parsing","message":"문서 파싱 중 (1/3): sample.md","progress":30}
data: {"step":"parsing","message":"문서 파싱 중 (2/3): spec.docx","progress":60}
data: {"step":"saving","message":"요구사항 저장 중...","progress":90}
data: {"step":"done","message":"파싱 완료 — 요구사항 12개 추출","progress":100}
```

**이벤트 흐름 (infer):**

```
data: {"step":"preparing","message":"추론 준비 중...","progress":0}
data: {"step":"inferring","message":"의존관계 추론 중... (요구사항 12개)","progress":50}
data: {"step":"saving","message":"Edge 생성 중...","progress":90}
data: {"step":"done","message":"추론 완료 — Edge 8개 생성","progress":100}
```

**`done` 수신 후:** 프론트엔드가 기존 REST 엔드포인트(`GET /api/requirements`, `GET /api/edges`)를 호출해 결과를 가져온다. SSE 스트림에 결과를 포함하지 않는다 (페이로드 분리 원칙).

**Alternatives:**
- 동기 HTTP: 구현이 단순하지만 사용자가 진행 중임을 알 수 없고 브라우저 타임아웃 위험.
- Polling (`/api/jobs/{id}`): 백그라운드 작업 큐 필요. 구현 복잡도 더 높음.
- WebSocket: 양방향 통신이 필요 없는 이 케이스에 과도한 복잡성.

---

## ADR-14. 그래프 시각화 라이브러리

**Context:** 요구사항 의존관계 그래프를 인터랙티브하게 시각화할 라이브러리를 선택해야 한다.

**Decision:** `@xyflow/react` (React Flow)를 사용한다.

**Rationale:** React + TypeScript 프로젝트에 가장 네이티브하게 통합된다. 노드/엣지 커스텀 컴포넌트를 React 컴포넌트로 작성할 수 있어 학습 곡선이 낮다. 노드 50개 규모에서 성능 문제가 없으며, 드래그·줌·패닝 인터랙션이 내장되어 있다. Zustand와 상태 공유도 자연스럽다.

**Alternatives:**
- D3.js: 표현력이 가장 높지만 React와의 통합이 어색하고 보일러플레이트가 많음.
- Cytoscape.js: 그래프 알고리즘이 풍부하지만 React 바인딩이 비공식적이고 스타일링이 번거로움.
- Vis.js: React 지원 미흡.

---

## ADR-15. 원문 뷰어

**Context:** jump-to-section 기능에서 원문 문서를 어떻게 렌더링할지 결정해야 한다.

**Decision:** plain text로 렌더링하고, char offset 기반으로 해당 요구사항 범위를 하이라이트한다. 별도의 원문 포맷 재현은 하지 않는다.

**Rationale:** 모든 문서는 이미 backend에서 plain text로 변환되어 저장된다(ADR-3). 이를 그대로 표시하면 추가 처리 없이 char offset이 정확히 대응된다. 원본 포맷(Markdown 렌더링, DOCX 스타일)을 재현하려면 원본 파일을 frontend로 전달하거나 별도 렌더링 파이프라인이 필요해 MVP 범위를 초과한다.

**Implementation:** `<pre>` 태그로 plain text를 표시하고, `char_start`–`char_end` 범위를 `<mark>` 또는 배경색으로 하이라이트한다. 해당 위치로 자동 스크롤.

**Alternatives:**
- Markdown 렌더링 (`react-markdown`): Markdown 문서에서는 가독성이 높지만 DOCX/PDF와 처리 방식이 달라져 일관성이 깨짐.
- 원본 파일 직접 렌더링: 포맷별 뷰어 라이브러리 필요. MVP 범위 초과.

---

## ADR-16. 프론트엔드 스타일링: Tailwind CSS

**Context:** 기존 인라인 `style={{...}}`은 hover/focus/active 상태 스타일을 표현할 수 없고, 유지보수 시 스타일 탐색이 어렵다.

**Decision:** Tailwind CSS를 유일한 스타일링 시스템으로 사용한다. 인라인 `style` prop은 전면 제거하고 Tailwind 유틸리티 클래스로 대체한다. CSS 파일은 `@layer` 지시어 외에는 작성하지 않는다.

**Rationale:** Tailwind는 빌드 시 사용된 클래스만 번들에 포함하므로 파일 크기가 최소화된다. hover/focus/active 상태를 추가 JS 없이 클래스로 표현할 수 있다. Vite 프로젝트에 설정이 간단하다.

**공통 컴포넌트 추상화 원칙:** 버튼, 모달 등 공통 UI를 섣불리 추출하지 않는다. 2–3개 페이지에서 동일 패턴이 확인된 시점에 점진적으로 컴포넌트로 분리한다.

**Alternatives:**
- CSS Modules: 스코프 보장되지만 hover 상태 JS 처리 필요. 파일 수 증가.
- styled-components: CSS-in-JS로 강력하지만 런타임 오버헤드와 설정 복잡도.

---

## ADR-17. App Shell 레이아웃: 좌측 고정 Sidebar + Stepper

**Context:** 4단계 선형 워크플로우에서 사용자가 현재 어느 단계에 있는지 항상 인지해야 하고, 단계 간 자유로운 이동을 지원해야 한다.

**Decision:** 좌측 고정 Sidebar에 4단계 Stepper를 배치한다. 콘텐츠 영역은 Sidebar 우측에 렌더링된다. Step 3(GraphPage)은 Edge 검토·관리에 집중하고, Step 4(ImpactPage)는 영향 분석 전용 레이아웃으로 분리한다.

**Stepper 활성화 조건:**

| 단계 | 조건 |
|------|------|
| 1. 문서 업로드 | 항상 활성 |
| 2. 요구사항 검토 | `requirements.length > 0` (파싱 완료) |
| 3. 그래프 & Edge 검토 | `edges.filter(APPROVED).length > 0` |
| 4. 영향 분석 | Step 3과 동일 (`edges.filter(APPROVED).length > 0`) |

조건 미충족 단계 클릭 시 다음 행동을 안내하는 툴팁을 표시한다. 비활성 단계로 라우터 직접 접근 시, 아래의 hydration 이후 조건을 재평가하여 여전히 미충족이면 Step 1로 리디렉션한다.

**페이지 새로고침 시 Store Hydration:**

새로고침 시 Zustand store는 초기화된다. 이 상태에서 조건을 평가하면 항상 Step 1로 리디렉션되는 문제가 발생한다. 따라서 앱 최초 마운트 시 백엔드에서 현재 상태를 읽어 store를 복원한 뒤 Stepper 조건을 재평가한다.

**Hydration 동작:**
1. 앱 마운트 시 `useHydrate` 훅이 `GET /api/documents`, `GET /api/requirements`, `GET /api/edges` 를 병렬 호출
2. Hydration 완료 전까지 전체 화면에 로딩 스피너 표시 (라우트 렌더링 차단)
3. Hydration 완료 후 store가 채워진 상태에서 ProtectedRoute가 조건을 평가
4. 결과에 따라 요청한 경로 유지 또는 Step 1 리디렉션

이 방식은 인메모리 저장소(ADR-3)의 특성상 서버가 재시작되지 않는 한 백엔드 상태가 유지된다는 전제에서 동작한다. 서버 재시작 후에는 세션 로드(F7)로 복원한다.

**GraphPage/ImpactPage 분리 근거:** 두 페이지가 요구하는 레이아웃이 다르다. GraphPage는 그래프 캔버스가 전체 높이를 사용해야 하고(하단 패널 없음), ImpactPage는 좌측 패널(요구사항 + 결과)과 우측 탭 영역(그래프/DocumentViewer)이 필요하다. 한 페이지에서 토글로 전환하면 레이아웃이 서로를 제약한다.

**Rationale:** 좌측 Sidebar는 그래프처럼 화면을 넓게 사용하는 페이지에서 상단 헤더보다 콘텐츠 수직 공간 손실이 없다. 선형 4단계 플로우는 Sidebar Stepper가 진행 상태를 항상 시야에 두기에 적합하다.

**Alternatives:**
- 상단 Header Stepper: 일반적이지만 그래프 등 시각화 페이지에서 수직 공간을 잡아먹음.
- 페이지별 독립 내비게이션: 현재 단계 인지가 어려워 사용성 저하.

---

## ADR-18. Toast 라이브러리: sonner

**Context:** API 성공/실패, 저장 완료 등의 피드백을 전역 Toast로 표시해야 한다.

**Decision:** `sonner` 라이브러리를 사용한다.

**Rationale:** Tailwind CSS와 자연스럽게 통합된다. `<Toaster />` 컴포넌트 한 줄과 `toast()` 함수 호출만으로 동작한다. 번들 크기가 작고(~3KB) 애니메이션이 내장되어 있다. React 19 호환.

**Alternatives:**
- react-hot-toast: 유사한 API이나 Tailwind 스타일 커스터마이징이 sonner보다 번거롭다.
- 자체 구현: Tailwind만으로 가능하지만 접근성(aria) 처리와 애니메이션 직접 구현 비용이 높다.

---

## ADR-19. 데모 배포 아키텍처: GitHub Pages + GitHub Actions

**Context:** 포트폴리오 목적의 라이브 데모를 비용 없이 안정적으로 제공해야 한다. 데모는 백엔드 없이 동작하는 프론트엔드 전용 모드다.

**Decision:** GitHub Pages(`{user}.github.io/pamun`)로 정적 SPA를 호스팅하고, GitHub Actions로 main 브랜치 push 시 자동 빌드·배포한다. 배포 방식은 **GitHub Actions 직접 배포**(`actions/upload-pages-artifact` + `actions/deploy-pages`)를 사용한다. `gh-pages` 브랜치를 생성하지 않는다.

**사용자 구분:**

| 사용자 유형 | 경로 | 필요한 것 |
|-------------|------|-----------|
| 구경 (데모) | GitHub Pages URL 접속 | 없음 |
| 실사용 | 리포 포크 → 셀프호스팅 | LLM API 키 + 로컬/서버 환경 |

**Rationale:** 비용 0, 인프라 관리 0. 데모 세션 JSON을 정적 자산으로 빌드에 포함하므로 서버 없이 충분하다. GitHub Actions는 이미 레포에 통합되어 있어 별도 CI 설정 불필요. 커스텀 도메인은 DNS 관리 비용이 발생하므로 기본 서브도메인으로 충분하다.

**GitHub Actions 직접 배포를 선택한 이유 (vs gh-pages 브랜치):**
- 레포에 `gh-pages` 브랜치와 빌드 결과물 커밋이 누적되지 않아 레포가 오염되지 않는다.
- 서드파티 액션(`peaceiris/actions-gh-pages`) 의존성이 제거된다. GitHub 공식 액션만 사용한다.
- 배포 단계가 하나로 줄어든다 (브랜치 푸시 → Pages 빌드 두 단계 없음).

**레포 설정 요구사항:** Settings → Pages → Source를 **"GitHub Actions"** 로 지정해야 한다.

**Vite 설정:** `base: '/Pamun/'`으로 설정하여 서브패스에서 정적 자산 경로가 올바르게 resolve되도록 한다. 로컬 개발 시에는 `base: '/'`를 유지하므로 환경 변수 분기가 필요하다.

**Alternatives:**
- Vercel/Netlify: 설정이 더 간단하지만 GitHub 생태계 외부. GitHub Pages로 충분한 규모.
- 커스텀 도메인: 브랜딩에 유리하나 DNS 구매·관리 비용 발생.
- 수동 배포: push 시 자동이 더 일관성 있고 실수 방지.
- `peaceiris/actions-gh-pages` (이전 방식): gh-pages 브랜치 생성, 서드파티 의존, 레포 오염 — 채택하지 않음.

---

## ADR-20. 데모 모드 API 처리: 프론트엔드 mock 레이어

**Context:** GitHub Pages 데모는 백엔드 없이 동작해야 한다. 동시에 Edge 승인·거부, changed 토글, 영향 분석 등 핵심 인터랙션은 완전히 작동해야 한다.

**Decision:** 프론트엔드에 `src/lib/demoApi.ts` mock 레이어를 두어, 데모 모드(`isDemoMode === true`)에서 모든 write 작업이 백엔드 대신 Zustand store를 직접 조작한다. 영향 분석(`GET /api/impact`)은 `src/lib/impactCompute.ts`에서 1-hop 로직을 클라이언트 사이드로 재구현한다. LLM 기능(파싱·추론)은 비활성화하고 셀프호스팅 안내 메시지를 표시한다.

**isDemoMode 감지:** 데모 번들 로드 시 `demoStore.isDemoMode = true`로 설정. `VITE_DEMO_MODE=true` 빌드 시에는 앱 초기화 시점에 자동으로 true로 설정하여 업로드 UI를 숨긴다.

**mock 대상 API:**

| 실제 API | mock 동작 |
|----------|-----------|
| `GET /api/edges` | `graphStore.edges`를 `{ edges: [...] }` 형태로 반환 |
| `GET /api/documents` | `documentStore.documents`를 `{ documents: [...] }` 형태로 반환 |
| `GET /api/documents/{id}` | `documentStore`에서 해당 document 반환 |
| `PATCH /api/requirements/{id}` | `graphStore`의 해당 requirement 직접 업데이트 |
| `PATCH /api/edges/{id}` | `graphStore`의 해당 edge 직접 업데이트 |
| `DELETE /api/edges/{id}` | `graphStore`에서 해당 edge 제거 |
| `POST /api/edges` | 새 Edge 객체 생성(`crypto.randomUUID()`, `status: approved`) 후 `graphStore`에 추가 |
| `GET /api/impact` | `impactCompute.ts`로 store에서 1-hop 계산 |
| `POST /api/parse`, `POST /api/edges/infer` | 비활성화. 버튼 `disabled` + 셀프호스팅 안내 표시. |
| `POST /api/session/save` | 비활성화. 세션 저장 버튼 `disabled` + 툴팁 표시. |

**Rationale:** 진짜 API 호출 구조를 유지하면서 mock만 교체하므로 셀프호스팅 모드와 코드 공유가 최대화된다. 영향 분석 로직은 1-hop traversal로 단순하여 프론트에서 재구현 비용이 낮다.

**Alternatives:**
- MSW(Mock Service Worker): fetch 인터셉트 레이어로 더 투명하지만, 번들 크기 증가 및 Service Worker 설정 복잡도.
- 읽기 전용 데모: 구현은 단순하지만 인터랙티브 체험을 포기하게 되어 포트폴리오 가치 저하.

---

## ADR-21. 온보딩 튜토리얼 라이브러리: react-joyride

**Context:** 4단계 선형 워크플로우를 처음 접하는 방문자에게 각 단계의 핵심 UI 요소를 spotlight + 툴팁으로 안내하는 코치마크 투어가 필요하다.

**Decision:** `react-joyride`를 사용한다.

**투어 구성:**
- 페이지당 1–2스텝, 4개 페이지 총 8스텝
- 각 스텝은 DOM 요소를 `target`(CSS selector 또는 ref)으로 지정하고 spotlight + 툴팁을 오버레이

**트리거 방식:**

| 환경 | 트리거 | 비고 |
|------|--------|------|
| 데모 모드 | 각 페이지 최초 진입 시 자동 시작 (세션당 1회, `sessionStorage` 플래그) | 첫 방문자 대상 |
| 셀프호스팅 | Sidebar 하단 "가이드 보기" 버튼 클릭 시 시작 | 작업 중 방해 방지 |

- 진행 중 "건너뛰기"로 즉시 종료 가능
- "가이드 보기" 버튼은 데모/셀프호스팅 모두 Sidebar 하단에 항상 노출 (재실행용)

**Rationale:** react-joyride는 React 생태계에서 가장 널리 사용되는 투어 라이브러리다. spotlight overlay, 커스텀 스타일, step-by-step 콜백을 기본 제공하며 Tailwind CSS와 충돌 없이 통합된다.

**Alternatives:**
- driver.js: 더 가벼운 API이지만 React 비의존 라이브러리라 ref 관리가 번거롭다.
- intro.js: 오래된 API, React 통합 wrapper가 별도 패키지로 분리되어 있어 유지보수 부담.
- 자체 구현: Tailwind로 가능하지만 spotlight 마스크 + 포지셔닝 계산 비용이 높다.

---

## Appendix A: Pydantic Schema Code

All models below serve as the Single Source of Truth for the entire system. FastAPI uses these for request/response validation, OpenAPI spec generation, and Instructor uses them for LLM output validation.

### A.1 Core Domain Models

```python
# backend/app/models/document.py

from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class DocumentFormat(str, Enum):
    MARKDOWN = "markdown"
    DOCX = "docx"
    PDF = "pdf"


class Document(BaseModel):
    id: str = Field(description="Unique document ID (auto-generated)")
    filename: str = Field(description="Original filename")
    format: DocumentFormat
    raw_text: str = Field(description="Plain text extracted from document")
    uploaded_at: datetime = Field(default_factory=datetime.now)
```

```python
# backend/app/models/requirement.py

from pydantic import BaseModel, Field


class RequirementLocation(BaseModel):
    """Where this requirement exists in the source document."""
    document_id: str
    char_start: int = Field(ge=0, description="Start offset in plain text")
    char_end: int = Field(ge=0, description="End offset in plain text")


class Requirement(BaseModel):
    id: str = Field(description="Unique requirement ID (auto-generated)")
    title: str = Field(description="Summary title (LLM-generated, PM-editable)")
    original_text: str = Field(description="Verbatim text from source document")
    location: RequirementLocation
    display_label: str = Field(
        description="Human-readable location label for UI display "
        "(e.g., '2.1 로그인 기능', '3번째 문단')"
    )
    changed: bool = Field(default=False, description="PM change flag")
```

```python
# backend/app/models/edge.py

from pydantic import BaseModel, Field
from enum import Enum


class RelationType(str, Enum):
    DEPENDS_ON = "depends_on"    # Directed: source depends on target
    RELATED_TO = "related_to"    # Undirected: mutual relation


class EdgeStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Edge(BaseModel):
    id: str = Field(description="Unique edge ID (auto-generated)")
    source_id: str = Field(description="Source requirement ID")
    target_id: str = Field(description="Target requirement ID")
    relation_type: RelationType
    evidence: str = Field(description="Evidence sentence from source docs")
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="LLM confidence score (for review prioritization)"
    )
    status: EdgeStatus = Field(default=EdgeStatus.PENDING)
```

```python
# backend/app/models/impact.py

from pydantic import BaseModel, Field
from enum import Enum
from .edge import RelationType


class ImpactLevel(str, Enum):
    AFFECTED = "affected"              # 확정 영향 (역방향 depends_on, 양방향 related_to)
    REVIEW_RECOMMENDED = "review_recommended"  # 검토 권장 (정방향 depends_on)


class ImpactItem(BaseModel):
    """A single affected requirement in impact analysis."""
    requirement_id: str
    requirement_title: str
    document_id: str
    document_filename: str
    char_start: int
    char_end: int
    display_label: str
    edge_id: str = Field(description="The edge that connects to changed node")
    relation_type: RelationType
    evidence: str
    impact_level: ImpactLevel = Field(
        description="'affected' for confirmed impact, "
        "'review_recommended' for forward depends_on"
    )


class ImpactResult(BaseModel):
    """Result of change impact analysis (1-hop)."""
    changed_requirement_ids: list[str]
    affected_items: list[ImpactItem] = Field(
        description="Items with impact_level='affected'"
    )
    review_items: list[ImpactItem] = Field(
        description="Items with impact_level='review_recommended'"
    )
    total_affected: int
    total_review: int
```

### A.2 LLM Pipeline Schemas (Instructor)

These models are used with Instructor to validate LLM structured output. They are separate from API response models to keep LLM concerns isolated.

```python
# backend/app/llm/schemas.py

from pydantic import BaseModel, Field


# ===== Task 1: Requirement Parsing =====

class ParsedRequirement(BaseModel):
    """Single requirement extracted by LLM."""
    title: str = Field(description="Short summary title for this requirement")
    original_text: str = Field(
        description="Exact verbatim text from the document"
    )
    char_start: int = Field(
        ge=0,
        description="Character offset where this requirement starts"
    )
    char_end: int = Field(
        ge=0,
        description="Character offset where this requirement ends"
    )
    display_label: str = Field(
        description="Human-readable location label "
        "(e.g., heading text, 'paragraph N', section title)"
    )


class ParseResult(BaseModel):
    """LLM output for document parsing."""
    requirements: list[ParsedRequirement] = Field(
        description="List of requirements extracted from the document"
    )


# ===== Task 2: Dependency Inference =====

class InferredEdge(BaseModel):
    """Single dependency inferred by LLM."""
    source_index: int = Field(
        description="Index of source requirement in the input list"
    )
    target_index: int = Field(
        description="Index of target requirement in the input list"
    )
    relation_type: str = Field(
        description="'depends_on' or 'related_to'"
    )
    evidence: str = Field(
        description="Verbatim sentence from source docs supporting this edge"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="How confident the model is in this connection"
    )


class InferenceResult(BaseModel):
    """LLM output for dependency inference."""
    edges: list[InferredEdge] = Field(
        description="List of inferred dependencies between requirements"
    )
```

### A.3 API Request/Response Models

```python
# backend/app/models/api.py

from pydantic import BaseModel, Field
from .requirement import Requirement
from .edge import Edge, EdgeStatus, RelationType
from .impact import ImpactResult
from .document import Document


# --- Document ---
class DocumentListResponse(BaseModel):
    documents: list[Document]


# --- Parse ---
class ParseRequest(BaseModel):
    document_ids: list[str] = Field(
        description="IDs of documents to parse"
    )

class ParseResponse(BaseModel):
    requirements: list[Requirement]


# --- Requirements ---
class RequirementUpdateRequest(BaseModel):
    title: str | None = None
    changed: bool | None = None

class RequirementMergeRequest(BaseModel):
    requirement_ids: list[str] = Field(
        min_length=2,
        description="IDs of requirements to merge (same document, adjacent spans only)"
    )

class RequirementSplitRequest(BaseModel):
    requirement_id: str = Field(description="ID of requirement to split")
    split_offset: int = Field(
        description="Character offset within the requirement text where the split occurs"
    )


# --- Edges ---
class EdgeInferRequest(BaseModel):
    requirement_ids: list[str] | None = Field(
        default=None,
        description="Specific requirements to infer edges for. None = all."
    )

class EdgeCreateRequest(BaseModel):
    """Manual edge creation by PM. Status is auto-set to APPROVED."""
    source_id: str
    target_id: str
    relation_type: RelationType
    evidence: str = Field(default="Manually added by PM")

class EdgeUpdateRequest(BaseModel):
    status: EdgeStatus | None = None
    relation_type: RelationType | None = None
    evidence: str | None = None

class EdgeListResponse(BaseModel):
    edges: list[Edge]


# --- Impact ---
class ImpactResponse(BaseModel):
    result: ImpactResult


# --- Session ---
class SessionSaveResponse(BaseModel):
    filepath: str
    saved_at: str
```

---

## Appendix B: API Endpoint Reference

### B.1 Documents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | 다중 파일 업로드. multipart/form-data. 최대 5개. |
| GET | `/api/documents` | 업로드된 문서 목록 반환. |
| GET | `/api/documents/{id}` | 문서 상세 (원문 포함) 반환. |
| DELETE | `/api/documents/{id}` | 문서 삭제. |

### B.2 Parsing & Requirements

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/parse` | LLM 파싱 실행. document_ids 지정. |
| GET | `/api/requirements` | 파싱된 요구사항 전체 목록. |
| PATCH | `/api/requirements/{id}` | 제목/changed 플래그 수정. |
| POST | `/api/requirements/merge` | 여러 요구사항 병합 (같은 문서, 인접 span만). |
| POST | `/api/requirements/split` | 하나의 요구사항을 두 개로 분리. |
| DELETE | `/api/requirements/{id}` | 요구사항 삭제 (연결된 edge도 삭제). |

### B.3 Edges (Dependencies)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/edges/infer` | LLM 의존관계 추론 실행. |
| GET | `/api/edges` | 전체 Edge 목록. ?status=approved 필터 가능. |
| POST | `/api/edges` | PM이 수동 Edge 추가. 자동으로 approved 상태. |
| PATCH | `/api/edges/{id}` | 상태 변경 (approve/reject) 및 수정. |
| DELETE | `/api/edges/{id}` | Edge 삭제. |

### B.4 Impact Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/impact` | 현재 changed 플래그 기반 1-hop 영향 분석 실행. affected와 review_recommended를 구분하여 반환. |

### B.5 Session

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/session/save` | 현재 상태를 JSON 파일로 저장. |
| POST | `/api/session/load` | JSON 파일에서 상태 복원. |
| POST | `/api/session/reset` | 전체 초기화. |

---

## Appendix C: Open Questions

MVP 구현 시 결정이 필요했던 항목들. 모두 ADR로 확정됨.

| # | Question | Status | ADR |
|---|----------|--------|-----|
| 1 | DOCX/PDF/Markdown 텍스트 추출 방식 | ✅ 확정 | ADR-12 |
| 2 | Scanned PDF 지원 여부 | ✅ 확정 (미지원) | ADR-12 |
| 3 | parse/infer 장시간 작업 처리 | ✅ 확정 | ADR-13 |
| 4 | LLM 호출 실패/재시도 UX | ✅ 확정 (Instructor retry 위임, 프론트 에러 토스트) | ADR-13 |
| 5 | 그래프 시각화 라이브러리 선택 | ✅ 확정 | ADR-14 |
| 6 | 문서 미리보기 / 원문 뷰어 | ✅ 확정 | ADR-15 |
