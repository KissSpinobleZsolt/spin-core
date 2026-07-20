// Code block: dark background, lime text for terminal feel, scrollable pre.
export function Code({ children }) {
  return (
    <pre style={{
      background: '#0f172a',   // slate-900
      border: '1px solid #334155', // slate-700
      borderRadius: '8px',
      color: '#a3e635',        // lime-400 — terminal feel
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: 1.6,
      margin: 0,
      overflow: 'auto',
      padding: '12px 16px',
      whiteSpace: 'pre',
    }}>
      {children}
    </pre>
  );
}
