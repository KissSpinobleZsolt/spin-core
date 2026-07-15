import { useState } from 'react'

export type Message = { role: 'user' | 'assistant'; content: string }

export function useChatStream(botId: string | undefined, selectedModel: string, moduleId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    const token = localStorage.getItem('token') ?? ''
    const body: Record<string, unknown> = { messages: history }
    if (botId) {
      body.bot_id = botId
      if (moduleId) body.module_id = moduleId
    } else if (selectedModel) {
      body.model = selectedModel
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)
            if (chunk.error) {
              setMessages(prev => {
                const c = [...prev]
                c[c.length - 1] = { role: 'assistant', content: `Error: ${chunk.error}` }
                return c
              })
              return
            }
            if (chunk.message?.content) {
              setMessages(prev => {
                const c = [...prev]
                c[c.length - 1] = { role: 'assistant', content: c[c.length - 1].content + chunk.message.content }
                return c
              })
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const c = [...prev]
        c[c.length - 1] = { role: 'assistant', content: 'Could not reach the chat service.' }
        return c
      })
    } finally {
      setLoading(false)
    }
  }

  return { messages, setMessages, input, setInput, loading, sendMessage }
}
