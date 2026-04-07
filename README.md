# Pamun

**Requirements Dependency Tracker & Change Impact Analyzer**

기획 문서 묶음을 업로드하면 LLM이 요구사항을 추출하고 의존관계 그래프를 만들어준다. 특정 요구사항에 "변경 예정" 플래그를 설정하면 영향받는 문서 섹션을 자동으로 찾아준다.

---

## 라이브 데모

**[https://zuamal.github.io/Pamun](https://zuamal.github.io/Pamun)**

API 키 없이 사전 파싱된 샘플 세션(BookFlow / LearnHub / MediBook)을 즉시 불러와 그래프 탐색과 영향 분석을 체험할 수 있다.

---

## 셀프호스팅

실제 LLM 파싱·추론 기능(문서 업로드 → 요구사항 추출 → 의존관계 추론)을 사용하려면 리포를 포크한 뒤 직접 실행해야 한다. Anthropic API 키가 필요하다.

---

## 사용 흐름

```
문서 업로드 → LLM 파싱 → 요구사항 검토 → 의존관계 추론
→ 그래프 확정 → 변경 마킹 → 영향 분석 → 원문 jump-to-section
```

1. **업로드** — Markdown, DOCX, PDF 최대 5개
2. **파싱** — LLM이 요구사항 단위로 추출. PM이 분리/병합/수정으로 검토
3. **추론** — LLM이 요구사항 간 의존관계를 추론하고 근거 문장 제시
4. **그래프** — PM이 연결을 승인/거부하고 수동 연결 추가
5. **영향 분석** — "변경 예정" 노드 선택 → 영향받는 섹션 하이라이트

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | FastAPI · Pydantic v2 · networkx |
| LLM | Anthropic Claude (Instructor) |
| 텍스트 추출 | pdfplumber · python-docx · mistune |
| Frontend | React · TypeScript · Vite |
| 상태 관리 | Zustand |
| 그래프 시각화 | React Flow |
| 타입 생성 | openapi-typescript |

---

## 시작하기

### 사전 요구사항

- Python 3.11+
- Node.js 18+
- Anthropic API 키

### Backend

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env에 ANTHROPIC_API_KEY 입력

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

앱: http://localhost:5173

### 타입 동기화 (스키마 변경 시)

```bash
./scripts/generate-types.sh
```

---

## 개발

### 타입 체크

```bash
# Backend
cd backend && mypy app/ --strict

# Frontend
cd frontend && npx tsc --noEmit
```

### 테스트

```bash
cd backend && pytest tests/ -v
```

### 프로젝트 구조

```
pamun/
├── backend/
│   ├── app/
│   │   ├── models/       # Pydantic 모델 (SSoT)
│   │   ├── api/          # Route handlers
│   │   ├── services/     # 비즈니스 로직
│   │   ├── llm/          # LLM 파이프라인 (Instructor)
│   │   └── storage/      # 인메모리 + JSON 영속화
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/          # 생성된 타입 + fetch 함수
│       ├── stores/       # Zustand store
│       ├── components/
│       └── pages/
├── docs/
│   ├── Pamun_PRD_v1.md
│   ├── Pamun_ADR_v1.md
│   └── tasks/            # Feature 명세
└── scripts/
    └── generate-types.sh
```

---

## 아키텍처 결정

주요 기술 선택의 근거는 [`docs/Pamun_ADR_v1.md`](docs/Pamun_ADR_v1.md)에 기록되어 있다.

- **Pydantic = Single Source of Truth** — 모든 타입은 backend 모델에서 시작해 OpenAPI → TS 순으로 전파
- **인메모리 저장소** — DB 없이 바로 실행 가능. 세션 단위로 JSON 파일에 영속화
- **동기 LLM 호출** — 포트폴리오 데모 규모(문서 3–5개)에서 SSE/polling 없이 충분

---

## 제약 사항 (v1)

- 문서당 요구사항 최대 50개
- 영향 분석은 1-hop (직접 연결)만 지원
- Scanned PDF(이미지 기반) 미지원
- 단일 사용자 전용 (동시 편집 없음)
