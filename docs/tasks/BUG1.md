# BUG-01 — 데모 모드 버그 수정 3건

## 개요

GitHub Pages 데모(`VITE_DEMO_MODE=true`)에서 발견된 버그 3건. 모두 demo mode에서의 API 분기 누락 또는 타이밍 문제가 원인이다.

---

## Bug 1 — 데모 모드에서 요청 실패 토스트 노출

**현상:** GraphPage 진입 시, 그리고 Edge 삭제/추가/세션 저장 클릭 시 "요청 실패" 토스트가 표시된다.

**원인:** 아래 API 함수들이 `isDemoMode()` 분기 없이 백엔드를 직접 호출한다.

| 파일 | 함수 | 문제 |
|------|------|------|
| `src/api/edges.ts` | `listEdges()` | demo 분기 없음 |
| `src/api/edges.ts` | `deleteEdge()` | demo 분기 없음 |
| `src/api/edges.ts` | `createEdge()` | demo 분기 없음 |
| `src/api/documents.ts` | `listDocuments()` | demo 분기 없음 |
| `src/api/impact.ts` | `saveSession()` | demo 분기 없음 |

GraphPage의 `useEffect`가 마운트 즉시 `listEdges()` + `listDocuments()`를 호출하므로 진입만 해도 토스트가 뜬다.

**수정 내용:**

- `listEdges()`: demo mode 시 `useGraphStore.getState().edges`를 `{ edges: [...] }` 형태로 반환
- `listDocuments()`: demo mode 시 `useDocumentStore.getState().documents`를 `{ documents: [...] }` 형태로 반환
- `deleteEdge(id)`: demo mode 시 `useGraphStore.getState().setEdges(edges.filter(e => e.id !== id))` 실행 후 resolve
- `createEdge(body)`: demo mode 시 새 Edge 객체를 생성하여 `graphStore`에 추가 후 반환. `id: crypto.randomUUID()`, `status: 'approved'`. 수동 추가 Edge는 즉시 그래프에 반영된다.
- `saveSession()`: demo mode 시 호출되지 않도록 GraphPage의 세션 저장 버튼을 `disabled` + 툴팁("데모 모드에서는 세션 저장이 지원되지 않습니다") 처리한다. `saveSession()` 함수 자체에는 분기를 추가하지 않아도 된다.

참고: `updateEdge()`, `getDocument()`는 이미 분기 구현됨.

---

## Bug 2 — 번들 선택 후 그래프 페이지로 이동 시 리디렉션 또는 빈 화면

**현상:** DemoBundleModal에서 번들을 선택하면 로딩 스피너 이후 `/graph`로 이동하는데, UploadPage(`/`)로 다시 튕기거나 빈 화면이 표시되는 경우가 있다.

**원인:** `UploadPage.tsx`의 `handleLoadDemo` 함수에서 store 업데이트와 `navigate('/graph')`가 같은 렌더링 사이클 내에서 실행된다. React 18 batching 환경에서 store 업데이트가 반영되기 전에 `ProtectedRoute`가 `hasRequirements`를 평가하면 `/`로 리디렉션된다.

또한 `setIsDemoMode(true)`가 `navigate()` 직전에 호출되어, GraphPage의 `useEffect`가 실행될 때 `isDemoMode()`가 아직 `false`를 반환할 수 있다.

**수정 내용 (`src/pages/UploadPage.tsx`):**

`handleLoadDemo` 함수에서 `navigate`를 `setTimeout(() => navigate('/graph'), 0)` 또는 `flushSync`를 사용하여 store 업데이트가 DOM에 반영된 후 이동하도록 수정.

권장 방식:
```ts
import { flushSync } from 'react-dom'

// store 업데이트를 즉시 flush
flushSync(() => {
  setDocuments(Object.values(session.documents))
  setRequirements(Object.values(session.requirements))
  setEdges(Object.values(session.edges))
  setIsDemoMode(true)
})
setShowDemoModal(false)
toastSuccess(`${bundle.name} 데모를 불러왔습니다`)
navigate('/graph')
```

---

## Bug 3 — 그래프 문서 필터에 문서 이름 대신 UUID 표시

**현상:** GraphPage 우측 패널 하단 "문서 필터"에 파일명(`PRD.md` 등) 대신 UUID가 표시된다.

**원인:** `GraphPage.tsx`의 `useEffect`에서 `listDocuments()`로 `documents` 맵을 채우는데, demo mode에서 `listDocuments()`가 실패(Bug 1)하여 `documents` state가 빈 객체로 남는다. `GraphFilter`는 `documents[docId] ?? docId`를 표시하므로 UUID가 그대로 노출된다.

**수정 내용 (`src/pages/GraphPage.tsx`):**

Bug 1 수정으로 `listDocuments()`가 demo mode에서 store를 반환하면 자동 해결된다. 단, GraphPage의 `useEffect` 내 documents 맵 구성 로직이 `DocumentListResponse.documents` 배열을 정상적으로 순회하는지 확인 필요.

추가로, demo mode에서 `useEffect`의 `listEdges()` 호출도 store를 읽도록 수정되면 GraphPage 진입 시 이미 store에 있는 edges가 중복 fetch 없이 사용된다.

---

## 수정 범위

```
frontend/src/
├── api/
│   ├── edges.ts        # listEdges, deleteEdge, createEdge demo 분기 추가
│   ├── documents.ts    # listDocuments demo 분기 추가
│   └── impact.ts       # saveSession demo 분기 추가
└── pages/
    └── UploadPage.tsx  # handleLoadDemo에 flushSync 적용
```

## 완료 기준

- [ ] GraphPage 진입 시 demo mode에서 요청 실패 토스트 없음
- [ ] Edge 승인/거부/삭제 동작 시 demo mode에서 토스트 없음
- [ ] 세션 저장 버튼이 demo mode에서 `disabled` + 툴팁 표시
- [ ] 번들 선택 후 `/graph`로 정상 이동 (리디렉션 없음)
- [ ] 문서 필터에 파일명 정상 표시
- [ ] `npx tsc --noEmit` 오류 없음

## 참고

- PRD FR-9.4a, FR-9.4b (이번 버그 수정으로 추가된 명세)
- ADR-20 (mock API 레이어 대상 목록)
