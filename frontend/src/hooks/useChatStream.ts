import { useState, useRef } from 'react'

/** A single chat message with a role and text content. */
export type Message = { role: 'user' | 'assistant'; content: string }

/** Manages chat history, input state, and streaming responses from the /api/chat endpoint. */
export function useChatStream(botId: string | undefined, selectedModel: string, moduleId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  function stopStream() {
    abortRef.current?.abort()
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

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
        signal: controller.signal,
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
    } catch (err) {
      // AbortError means the user stopped the stream intentionally — keep partial content as-is.
      if (err instanceof Error && err.name === 'AbortError') {
        if (botId) {
          fetch('/api/chat/abort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ bot_id: botId, ...(moduleId ? { module_id: moduleId } : {}) }),
          }).catch(() => {}) // Fire-and-forget: stream is already dead; awaiting would block setLoading(false) and freeze the UI
        }
        return
      }
      setMessages(prev => {
        const c = [...prev]
        c[c.length - 1] = { role: 'assistant', content: 'Could not reach the chat service.' }
        return c
      })
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  return { messages, setMessages, input, setInput, loading, sendMessage, stopStream }
}
