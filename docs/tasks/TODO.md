# Pamun — TODO

> 상태: `[ ]` 미시작 · `[~]` 진행 중 · `[x]` 완료 · `[-]` 블로킹

---

## Backend

| Feature | 파일 | 상태 | 의존 |
|---------|------|------|------|
| F1 · Backend Foundation | [F1.md](F1.md) | [ ] | — |
| F2 · Document Upload & Text Extraction | [F2.md](F2.md) | [ ] | F1 |
| F3 · LLM Requirement Parsing | [F3.md](F3.md) | [ ] | F1, F2 |
| F4 · Requirement Management | [F4.md](F4.md) | [ ] | F1, F3 |
| F5 · Edge Inference & Management | [F5.md](F5.md) | [ ] | F1, F3 |
| F6 · Impact Analysis | [F6.md](F6.md) | [ ] | F1, F4, F5 |
| F7 · Session Persistence | [F7.md](F7.md) | [ ] | F1 |

## Frontend

| Feature | 파일 | 상태 | 의존 |
|---------|------|------|------|
| F8 · Frontend Foundation | [F8.md](F8.md) | [ ] | F1 |
| F9 · Document Upload & Requirement Review UI | [F9.md](F9.md) | [ ] | F8, F2, F3, F4, F5 |
| F10 · Graph Visualization & Edge Review UI | [F10.md](F10.md) | [ ] | F8, F5 |
| F11 · Impact Analysis UI | [F11.md](F11.md) | [ ] | F8, F4, F6, F7 |

---

## 의존관계 다이어그램

```
F1
├── F2 ──── F3 ──── F4 ──┐
│               └── F5 ──┼── F6
│                         │
└── F7                    │
                          │
F1 ── F8 ─┬── F9 (F2+F3+F4+F5 필요)
           ├── F10 (F5 필요)
           └── F11 (F4+F6+F7 필요)
```

**권장 구현 순서:** F1 → F2 → F3 → F4 + F5 (병렬 가능) → F6 + F7 + F8 (병렬 가능) → F9 + F10 (병렬 가능) → F11

---

## 데모 시나리오 체크

전체 feature 완료 후 아래 시나리오가 막힘없이 동작해야 한다.

- [ ] 샘플 문서 3개 업로드 (`.md` 1개, `.docx` 1개, `.pdf` 1개)
- [ ] LLM 파싱 실행 → 요구사항 목록 확인
- [ ] 요구사항 1개 제목 수정, 1개 삭제
- [ ] LLM Edge 추론 실행 → 그래프 표시
- [ ] PENDING Edge 3개 이상 승인
- [ ] 수동 Edge 1개 추가
- [ ] 요구사항 2개에 `changed=true` 플래그 설정
- [ ] 영향 분석 실행 → affected / review_recommended 항목 표시
- [ ] 영향 항목 클릭 → 원문 하이라이트 확인
- [ ] 세션 저장 → 리셋 → 세션 로드 → 상태 동일 확인
- [ ] 전체 소요 시간 5분 이내 (PRD 성공 지표)
