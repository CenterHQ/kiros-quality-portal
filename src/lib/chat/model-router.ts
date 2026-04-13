// Model routing — Opus by default, Sonnet only for trivial messages
import type { AIConfig } from '@/lib/ai-config'

// Keep existing constants as fallbacks
export const MODEL_OPUS = 'claude-opus-4-20250514'
export const MODEL_SONNET = 'claude-sonnet-4-20250514'

const SIMPLE_SIGNALS = /^(hi|hello|hey|thanks|thank you|ok|yes|no|sure|got it|cheers|bye|good morning|good afternoon)\b/i

export interface ModelConfig {
  model: string
  thinking?: { type: 'enabled'; budget_tokens: number }
}

export function selectModelConfig(message: string, config?: AIConfig): ModelConfig {
  const opusModel = config?.modelOpus || MODEL_OPUS
  const sonnetModel = config?.modelSonnet || MODEL_SONNET
  const regex = config?.simpleSignalsRegex ? new RegExp(config.simpleSignalsRegex, 'i') : SIMPLE_SIGNALS
  const maxLen = config?.simpleMessageMaxLength || 50

  if (regex.test(message) && message.length < maxLen) {
    return { model: sonnetModel }
  }

  const thinkingEnabled = config?.thinkingEnabled !== false
  return {
    model: opusModel,
    ...(thinkingEnabled ? { thinking: { type: 'enabled' as const, budget_tokens: config?.thinkingBudgetTokens || 10000 } } : {}),
  }
}
