// Model routing — Sonnet for simple queries, Opus for complex reasoning
export const MODEL_OPUS = 'claude-opus-4-20250514'
export const MODEL_SONNET = 'claude-sonnet-4-20250514'

const COMPLEX_SIGNALS = /\b(analy[sz]e\b|compare\b|evaluat\w*\b|assess\w*\s+.*?rating|strategic\s+(plan|review|analysis)|deep dive|improvement plan|exceeding\s+(standards|indicators|rating|expectations)|root cause|gap analysis|critical reflection|long[- ]term\s+(plan|strategy)|comprehensive review|board report|regulatory submission)\b/i

export interface ModelConfig {
  model: string
  thinking?: { type: 'enabled'; budget_tokens: number }
}

export function selectModelConfig(message: string): ModelConfig {
  if (COMPLEX_SIGNALS.test(message)) {
    // NOTE: Extended thinking is NOT compatible with tool use in the Anthropic API.
    // Since our chat always sends tools, we route to Opus for complex queries
    // but WITHOUT thinking enabled. This prevents the API from crashing.
    return { model: MODEL_OPUS }
  }
  return { model: MODEL_SONNET }
}

// Backward-compatible export
export function selectModel(message: string): string {
  return selectModelConfig(message).model
}
