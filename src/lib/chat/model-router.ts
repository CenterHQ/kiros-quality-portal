// Model routing — Opus by default, Sonnet only for trivial messages
export const MODEL_OPUS = 'claude-opus-4-20250514'
export const MODEL_SONNET = 'claude-sonnet-4-20250514'

const SIMPLE_SIGNALS = /^(hi|hello|hey|thanks|thank you|ok|yes|no|sure|got it|cheers|bye|good morning|good afternoon)\b/i

export interface ModelConfig {
  model: string
  thinking?: { type: 'adaptive' }
}

export function selectModelConfig(message: string): ModelConfig {
  if (SIMPLE_SIGNALS.test(message) && message.length < 50) {
    return { model: MODEL_SONNET }
  }
  return { model: MODEL_OPUS, thinking: { type: 'adaptive' } }
}

// Backward-compatible export
export function selectModel(message: string): string {
  return selectModelConfig(message).model
}
