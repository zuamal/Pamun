# CLAUDE.md — Pamun 개발 컨텍스트

## Project Overview

Pamun은 기획 문서 묶음을 입력받아 요구사항 간 의존관계를 그래프로 시각화하고, 변경 시 영향받는 문서 섹션을 찾아주는 도구다. 포트폴리오용 오픈소스 프로젝트.

- **PRD:** `docs/Pamun_PRD_v1.md`
- **ADR:** `docs/Pamun_ADR_v1.md`

---

## Architecture

```
pamun/
├── backend/            # FastAPI + Python
│   ├── app/
│   │   ├── models/     # Pydantic 모델 (SSoT)
│   │   ├── api/        # Route handler
│   │   ├── services/   # 비즈니스 로직
│   │   ├── llm/        # LLM 파이프라인 (Instructor)
│   │   └── storage/    # 인메모리 + JSON 영속화
│   ├── tests/
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/           # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/        # 생성된 타입 + 직접 작성한 fetch 함수
│   │   ├── stores/     # Zustand store
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   └── generate-types.sh
├── docs/
│   ├── Pamun_PRD_v1.md
│   └── Pamun_ADR_v1.md
└── CLAUDE.md           # 이 파일
```

---

## Key Decisions (ADR 기반)

아키텍처 관련 변경 전 반드시 `docs/Pamun_ADR_v1.md`를 읽는다. 변경 불가 결정 요약:

- **Pydantic = Single Source of Truth.** 모든 데이터 모델은 `backend/app/models/`에 위치한다. Frontend 타입은 OpenAPI spec에서 생성한다. Frontend에서 타입을 수동으로 정의하지 않는다.
- **Backend 우선.** 스키마 변경은 항상 Pydantic 모델 수정 → OpenAPI 재생성 → TS 타입 재생성 순서로 진행한다.
- **인메모리 + JSON 저장소.** DB 없음. Python dict + networkx로 그래프를 관리하고, JSON으로 영속화한다.
- **Zustand for frontend 상태 관리.** Redux, Context API 사용 금지.
- **Instructor for LLM output.** LLM 스키마는 `backend/app/llm/schemas.py`에 위치. API 모델과 별도.
- **openapi-typescript for 타입 생성.** 타입만 생성한다. API 클라이언트 자동 생성 금지. fetch 함수는 직접 작성한다.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI |
| 데이터 모델 | Pydantic v2 |
| LLM structured output | Instructor |
| 그래프 연산 | networkx |
| Frontend framework | React + TypeScript |
| 빌드 도구 | Vite |
| 상태 관리 | Zustand |
| 타입 생성 | openapi-typescript |

---

## Commands

### Backend

```bash
cd backend

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
uvicorn app.main:app --reload --port 8000

# 타입 체크
mypy app/ --strict

# 테스트
pytest tests/ -v

# OpenAPI spec 추출 (타입 생성용)
python -c "
from app.main import app
import json
spec = app.openapi()
with open('../frontend/src/api/openapi.json', 'w') as f:
    json.dump(spec, f, indent=2)
"
```

### Frontend

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 타입 체크
npx tsc --noEmit

# OpenAPI spec으로 타입 생성
npx openapi-typescript src/api/openapi.json -o src/api/types.generated.ts
```

### 전체 파이프라인

```bash
# 타입 생성 end-to-end 실행
./scripts/generate-types.sh
```

---

## Development Workflow

### 코드 작성 전

1. 구현할 Feature의 PRD 해당 섹션을 읽는다.
2. 아키텍처 제약 사항 확인을 위해 ADR을 읽는다.
3. 새 모델을 만들기 전에 `backend/app/models/`의 기존 Pydantic 모델을 먼저 확인한다.

### 데이터 모델 수정 시

1. `backend/app/models/`의 Pydantic 모델을 수정한다.
2. `mypy app/ --strict`로 검증한다.
3. `./scripts/generate-types.sh`로 frontend 타입을 재생성한다.
4. 영향받는 frontend 코드를 업데이트한다.

### API 엔드포인트 구현 시

1. 기존 도메인 모델을 활용해 `backend/app/models/api.py`에 request/response 모델을 정의한다.
2. `backend/app/api/`에 route handler를 구현한다.
3. 비즈니스 로직은 route handler가 아닌 `backend/app/services/`에 작성한다.
4. `backend/tests/`에 테스트를 작성한다.
5. 엔드포인트가 동작하면 frontend 타입을 재생성한다.

### LLM 기능 구현 시

1. LLM 스키마는 `backend/app/llm/schemas.py`에 작성한다. API 모델과 별도의 Instructor 모델이다.
2. LLM 서비스 함수는 `backend/app/llm/`에 작성한다.
3. `client.chat.completions.create(response_model=...)` 패턴을 사용한다.
4. `InferredEdge`는 ID가 아닌 `source_index`/`target_index`를 사용한다. 인덱스 → ID 매핑은 LLM 응답 수신 후 backend에서 처리한다.

### Frontend 기능 구현 시

1. `src/api/types.generated.ts`에서 생성된 타입을 import한다.
2. API fetch 함수는 `src/api/`에 작성한다.
3. 공유 상태는 Zustand store(`src/stores/`)에 관리한다.
4. 그래프 시각화 상태(줌, 레이아웃)는 frontend 전용이다. backend와 동기화하지 않는다.

---

## 수정 후 체크

코드 변경 후 반드시 실행:

```bash
# Backend
cd backend && mypy app/ --strict && pytest tests/ -v

# Frontend
cd frontend && npx tsc --noEmit
```

---

## 도메인 모델 빠른 참조

```
Document        → 업로드된 파일 (id, filename, format, raw_text)
Requirement     → 파싱된 요구사항 단위 (id, title, original_text, location, display_label, changed)
Edge            → 의존관계 링크 (id, source_id, target_id, relation_type, evidence, confidence, status)
ImpactItem      → 영향 분석에서 영향받는 요구사항 단일 항목
ImpactResult    → 영향 분석 전체 결과 (affected_items + review_items)
```

### Edge 방향성 규칙

- `depends_on`: 방향 있음. source가 target에 의존한다.
  - target 변경 → source는 **affected** (영향받음)
  - source 변경 → target은 **review_recommended** (검토 권장)
- `related_to`: 방향 없음. 양쪽 모두 **affected**.

### Edge 상태 규칙

- LLM이 추론한 Edge는 `PENDING`으로 시작한다.
- PM이 직접 추가한 Edge(`POST /api/edges`)는 자동으로 `APPROVED`로 설정된다.
- `APPROVED` Edge만 그래프와 영향 분석에 표시된다.

### Merge/Split 제약

- Merge: 같은 문서, 인접한 span에 한해서만 가능.
- Split: 단일 span을 주어진 offset 기준으로 두 부분으로 분리.

---

## API 엔드포인트 빠른 참조

```
POST   /api/documents/upload       # 문서 업로드 (최대 5개)
GET    /api/documents               # 문서 목록
GET    /api/documents/{id}          # 문서 상세
DELETE /api/documents/{id}          # 문서 삭제

POST   /api/parse                   # LLM 파싱 → 요구사항 추출
GET    /api/requirements            # 요구사항 목록
PATCH  /api/requirements/{id}       # 제목 / changed 플래그 수정
POST   /api/requirements/merge      # 인접 요구사항 병합
POST   /api/requirements/split      # 요구사항 분리 (offset 기준)
DELETE /api/requirements/{id}       # 요구사항 삭제 + 연결된 Edge 삭제

POST   /api/edges/infer             # LLM 의존관계 추론
GET    /api/edges                   # Edge 목록 (?status=approved)
POST   /api/edges                   # 수동 Edge 추가 (자동 APPROVED)
PATCH  /api/edges/{id}              # status / type / evidence 수정
DELETE /api/edges/{id}              # Edge 삭제

GET    /api/impact                  # 1-hop 영향 분석

POST   /api/session/save            # 현재 상태를 JSON으로 저장
POST   /api/session/load            # JSON에서 상태 복원
POST   /api/session/reset           # 전체 초기화
```

---

## 파일 네이밍 규칙

- Backend 모델: `backend/app/models/{domain}.py` (예: `document.py`, `requirement.py`, `edge.py`, `impact.py`, `api.py`)
- Backend 라우트: `backend/app/api/{domain}.py` (예: `documents.py`, `requirements.py`, `edges.py`, `impact.py`, `session.py`)
- Backend 서비스: `backend/app/services/{domain}.py`
- Frontend store: `frontend/src/stores/{domain}Store.ts` (예: `documentStore.ts`, `graphStore.ts`)
- Frontend API: `frontend/src/api/{domain}.ts` (직접 작성한 fetch 함수)
- 생성된 타입: `frontend/src/api/types.generated.ts` (수동 편집 절대 금지)

---

## 절대 하지 말 것

- SQLite, PostgreSQL 등 DB 설치 금지.
- Redux, MobX, React Context로 공유 상태 관리 금지.
- Pydantic 모델을 미러링한 TypeScript 타입 수동 정의 금지. 생성된 타입을 사용한다.
- Route handler에 비즈니스 로직 작성 금지. Service 레이어에 작성한다.
- `types.generated.ts` 수동 편집 금지. 생성 스크립트 실행 시 덮어써진다.
- N-hop 영향 분석, 모순 감지, 문서 버전 관리 구현 금지. 모두 v2 범위다.