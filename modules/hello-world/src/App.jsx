import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.badge}>Module Federation</div>
        <h1 style={styles.heading}>Hello World</h1>
        <p style={styles.sub}>
          This component is loaded at runtime from a separate webpack bundle
          via the Module Federation container protocol.
        </p>
        <div style={styles.counter}>
          <button style={styles.btn} onClick={() => setCount((c) => c - 1)}>−</button>
          <span style={styles.count}>{count}</span>
          <button style={styles.btn} onClick={() => setCount((c) => c + 1)}>+</button>
        </div>
        <p style={styles.hint}>Counter state lives inside the remote — isolated from the host.</p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
    border: '1px solid #3b3b5c',
    borderRadius: '16px',
    padding: '48px 56px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  badge: {
    display: 'inline-block',
    background: '#6366f1',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: '99px',
    marginBottom: '20px',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: '36px',
    fontWeight: 800,
    color: '#f0f0ff',
    letterSpacing: '-0.02em',
  },
  sub: {
    margin: '0 0 32px',
    fontSize: '14px',
    color: '#9090b0',
    lineHeight: 1.6,
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '16px',
  },
  btn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '2px solid #6366f1',
    background: 'transparent',
    color: '#6366f1',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  count: {
    fontSize: '40px',
    fontWeight: 700,
    color: '#f0f0ff',
    minWidth: '60px',
  },
  hint: {
    margin: 0,
    fontSize: '12px',
    color: '#606080',
  },
};
