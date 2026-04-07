/**
 * SSE event type — mirrors backend app.models.api.ProgressEvent / ProgressStep.
 * Defined manually because SSE endpoints return StreamingResponse (not OpenAPI-schema'd JSON).
 */
export type ProgressStep =
  | 'preparing'
  | 'parsing'
  | 'inferring'
  | 'saving'
  | 'done'
  | 'error'

export interface ProgressEvent {
  step: ProgressStep
  message: string
  progress: number
}

export async function consumeSSE(
  res: Response,
  onEvent: (event: ProgressEvent) => void,
): Promise<void> {
  if (!res.body) throw new Error('응답 본문이 없습니다.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const event: ProgressEvent = JSON.parse(line.slice(6)) as ProgressEvent
      onEvent(event)
      if (event.step === 'done' || event.step === 'error') return
    }
  }
}
