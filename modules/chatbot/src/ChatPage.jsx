import React, { useState, useRef, useEffect } from 'react';

export default function ChatPage() {
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
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.headerIcon}>💬</span>
          <div>
            <div style={styles.headerTitle}>AI Assistant</div>
            <div style={styles.headerSub}>Powered by Ollama</div>
          </div>
        </div>
      </div>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={styles.row}>
            <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              {msg.content
                ? msg.content
                : (loading && i === messages.length - 1)
                  ? <span style={styles.cursor}>▌</span>
                  : null}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputBar}>
        <div style={styles.inputInner}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something… (Enter to send, Shift+Enter for newline)"
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
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
    minHeight: '500px',
  },
  header: {
    borderBottom: '1px solid #3b3b5c',
    background: 'rgba(255,255,255,0.03)',
    padding: '16px 24px',
    flexShrink: 0,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerTitle: {
    color: '#f0f0ff',
    fontWeight: 700,
    fontSize: '16px',
  },
  headerSub: {
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '2px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'flex',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: '#2e2e45',
    color: '#e0e0f0',
    padding: '12px 18px',
    borderRadius: '14px 14px 14px 2px',
    fontSize: '14px',
    lineHeight: 1.6,
    maxWidth: '75%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userBubble: {
    marginLeft: 'auto',
    background: '#6366f1',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: '14px 14px 2px 14px',
    fontSize: '14px',
    lineHeight: 1.6,
    maxWidth: '75%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    color: '#6366f1',
  },
  inputBar: {
    borderTop: '1px solid #3b3b5c',
    background: 'rgba(255,255,255,0.02)',
    padding: '16px 24px',
    flexShrink: 0,
  },
  inputInner: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    maxWidth: '900px',
    margin: '0 auto',
  },
  textarea: {
    flex: 1,
    background: '#2a2a3e',
    border: '1px solid #3b3b5c',
    borderRadius: '10px',
    color: '#f0f0ff',
    fontSize: '14px',
    padding: '10px 14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.5,
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
};
