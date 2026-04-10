// Model routing — Sonnet for simple queries, Opus for complex reasoning
export const MODEL_OPUS = 'claude-opus-4-20250514'
export const MODEL_SONNET = 'claude-sonnet-4-20250514'

const COMPLEX_SIGNALS = /\b(analy[sz]e\b|compare\b|evaluat\w*\b|assess\w*\s+.*?rating|strategic\s+(plan|review|analysis)|deep dive|improvement plan|exceeding\s+(standards|indicators|rating|expectations)|root cause|gap analysis|critical reflection|long[- ]term\s+(plan|strategy)|comprehensive review|board report|regulatory submission)\b/i

export function selectModel(message: string): string {
  return COMPLEX_SIGNALS.test(message) ? MODEL_OPUS : MODEL_SONNET
}
