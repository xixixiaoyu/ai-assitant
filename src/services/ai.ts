const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface AIStreamResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    delta: {
      content?: string
    }
    index: number
    finish_reason: string | null
  }[]
}

let abortController: AbortController | null = null

export function abortCurrentRequest() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function getAIStreamResponse(
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  let buffer = ''

  try {
    abortController = new AbortController()
    const signal = abortController.signal

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一位对话助手，回答问题时请保持自然流畅、通俗易懂，像朋友一样交流。注意中文和数字，中文和英文之间需要空格。回答时逻辑清晰，信息准确，避免过于复杂或生硬的表达，避免过度解释。可以通过类比、故事等方式帮助理解。`,
          },
          ...messages, // 包含历史消息
        ],
        temperature: 0.5,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onChunk('[DONE]')
        break
      }

      buffer += new TextDecoder().decode(value)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonData = line.slice(6)
          if (jsonData === '[DONE]') {
            onChunk('[DONE]')
            return
          }
          try {
            const parsedData: AIStreamResponse = JSON.parse(jsonData)
            const content = parsedData.choices[0]?.delta?.content
            if (content) {
              onChunk(content)
            }
          } catch (error) {
            console.error('解析 JSON 时出错:', error)
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('请求被中断')
      onChunk('[ABORTED]')
    } else {
      console.error('获取 AI 响应时出错:', error)
      throw error
    }
  } finally {
    abortController = null
  }
}
