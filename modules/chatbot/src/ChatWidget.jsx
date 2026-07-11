import React, { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI assistant powered by Ollama. How can I help?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');
    setLoading(true);

    // Placeholder for the streaming assistant reply
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const token = localStorage.getItem('token') || '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.error) {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: `Error: ${chunk.error}` };
                return copy;
              });
              return;
            }
            if (chunk.message?.content) {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: 'assistant',
                  content: copy[copy.length - 1].content + chunk.message.content,
                };
                return copy;
              });
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: 'Could not reach the chat service.' };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.root}>
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>AI Assistant</span>
            <span style={styles.headerBadge}>Ollama</span>
            <button style={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
                {msg.content
                  ? msg.content
                  : (loading && i === messages.length - 1)
                    ? <span style={styles.cursor}>▌</span>
                    : null}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputRow}>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something… (Enter to send)"
              rows={1}
              disabled={loading}
            />
            <button
              style={{ ...styles.sendBtn, opacity: (loading || !input.trim()) ? 0.4 : 1 }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button style={styles.bubble} onClick={() => setOpen(o => !o)} title="AI chat">
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
    fontFamily: 'system-ui, sans-serif',
  },
  panel: {
    width: '360px',
    height: '480px',
    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
    border: '1px solid #3b3b5c',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 16px',
    borderBottom: '1px solid #3b3b5c',
    background: 'rgba(255,255,255,0.03)',
  },
  headerTitle: {
    color: '#f0f0ff',
    fontWeight: 700,
    fontSize: '14px',
    flex: 1,
  },
  headerBadge: {
    background: '#6366f1',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '2px 8px',
    borderRadius: '99px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9090b0',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 4px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: '#2e2e45',
    color: '#e0e0f0',
    padding: '10px 14px',
    borderRadius: '12px 12px 12px 2px',
    fontSize: '13px',
    lineHeight: 1.5,
    maxWidth: '85%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: '#6366f1',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '12px 12px 2px 12px',
    fontSize: '13px',
    lineHeight: 1.5,
    maxWidth: '85%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    color: '#6366f1',
    animation: 'none',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #3b3b5c',
    background: 'rgba(255,255,255,0.02)',
  },
  textarea: {
    flex: 1,
    background: '#2a2a3e',
    border: '1px solid #3b3b5c',
    borderRadius: '8px',
    color: '#f0f0ff',
    fontSize: '13px',
    padding: '8px 12px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.5,
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    transition: 'opacity 0.15s',
  },
  bubble: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s',
  },
};
