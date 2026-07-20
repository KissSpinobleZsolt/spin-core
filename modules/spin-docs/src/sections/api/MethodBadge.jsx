// Colour-coded HTTP method badge, dark-theme palette.
const METHOD_STYLE = {
  GET:    { background: 'rgba(21, 128, 61, 0.3)',   color: '#4ade80' }, // green
  POST:   { background: 'rgba(29, 78, 216, 0.3)',   color: '#60a5fa' }, // blue
  PUT:    { background: 'rgba(180, 83, 9, 0.3)',    color: '#fbbf24' }, // amber
  PATCH:  { background: 'rgba(126, 34, 206, 0.3)',  color: '#c084fc' }, // purple
  DELETE: { background: 'rgba(185, 28, 28, 0.3)',   color: '#f87171' }, // red
  '*':    { background: '#334155',                  color: '#cbd5e1' }, // slate
};

// Renders a compact colour-coded pill for an HTTP verb.
export function MethodBadge({ method }) {
  const clr = METHOD_STYLE[method] ?? METHOD_STYLE['*']; // fall back to slate for unknown methods
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: '4px',
      width: '52px',
      textAlign: 'center',
      flexShrink: 0,
      ...clr,
    }}>
      {method}
    </span>
  );
}
