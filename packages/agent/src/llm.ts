export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'workers-ai' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

/**
 * LLM client abstraction — supports multiple providers via OpenAI-compatible API.
 */
export async function chatCompletion(
  config: LLMConfig,
  options: ChatCompletionOptions,
): Promise<ChatCompletionResponse> {
  const baseUrl = config.baseUrl || getDefaultBaseUrl(config.provider)
  const model = config.model || getDefaultModel(config.provider)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`LLM API error (${response.status}): ${err}`)
  }

  const data = await response.json() as {
    choices: [{ message: { content: string } }]
    model: string
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
    } : undefined,
  }
}

function getDefaultBaseUrl(provider: LLMProvider): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'anthropic': return 'https://api.anthropic.com/v1'
    case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta'
    case 'deepseek': return 'https://api.deepseek.com/v1'
    case 'workers-ai': return 'https://api.cloudflare.com/client/v4/accounts'
    default: return ''
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-mini'
    case 'anthropic': return 'claude-3-haiku-20240307'
    case 'gemini': return 'gemini-2.0-flash'
    case 'deepseek': return 'deepseek-chat'
    case 'workers-ai': return '@cf/meta/llama-3-8b-instruct'
    default: return ''
  }
}
