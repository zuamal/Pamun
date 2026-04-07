import type { Step, ButtonType } from 'react-joyride'

export const UPLOAD_STEPS: Step[] = [
  {
    target: '[data-tour="demo-btn"]',
    content: '샘플 번들을 선택하면 파싱·추론이 완료된 세션을 즉시 불러옵니다',
    placement: 'bottom',
  },
  {
    target: '[data-tour="parse-btn"]',
    content: '클릭하면 요구사항 추출 결과를 확인할 수 있습니다',
    placement: 'top',
  },
]

export const REVIEW_STEPS: Step[] = [
  {
    // req-list is a tall container — vertical placements flip to top of viewport.
    // Use right-start to keep tooltip within the viewport.
    target: '[data-tour="req-list"]',
    content: 'LLM이 추출한 요구사항 목록입니다. 항목을 클릭하면 수정·삭제·병합할 수 있습니다',
    placement: 'right-start',
  },
  {
    target: '[data-tour="infer-btn"]',
    content: '클릭하면 요구사항 간 의존관계를 추론합니다',
    placement: 'left',
  },
]

export const GRAPH_STEPS: Step[] = [
  {
    // Target is a small anchor div at the top-left corner of the graph area.
    // This avoids tooltip clipping caused by targeting the full-height flex-1 div.
    target: '[data-tour="graph-anchor"]',
    content: '승인된 연결로 구성된 의존관계 그래프입니다. 노드 핸들을 드래그하면 새 연결을 추가할 수 있습니다',
    placement: 'right',
  },
  {
    // edge-panel is the right-side panel — place tooltip to the left
    target: '[data-tour="edge-panel"]',
    content: 'PENDING 연결을 승인 또는 거부하세요',
    placement: 'left-start',
  },
]

export const IMPACT_STEPS: Step[] = [
  {
    target: '[data-tour="changed-toggle"]',
    content: '변경 예정 요구사항에 토글을 켜면 영향 분석이 자동 실행됩니다',
    placement: 'right',
  },
  {
    target: '[data-tour="impact-result"]',
    content: '항목을 클릭하면 원문에서 해당 위치를 확인합니다',
    placement: 'right',
  },
]

export const JOYRIDE_OPTIONS = {
  skipBeacon: true,
  showProgress: true,
  primaryColor: '#3b82f6',
  overlayClickAction: 'next' as const,
  buttons: ['back', 'close', 'primary', 'skip'] as ButtonType[],
}

export const JOYRIDE_LOCALE = {
  back: '이전',
  close: '닫기',
  last: '완료',
  next: '다음',
  skip: '건너뛰기',
}
