import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialised once — subsequent renders reuse the same mermaid instance.
mermaid.initialize({
  startOnLoad: false, // we call render() manually so we control timing
  theme: 'dark',
  securityLevel: 'loose', // required for clickable nodes in flowcharts
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

let uid = 0; // monotonically increasing id to guarantee unique diagram element ids

export function DiagramViewer({ code }) {
  const ref = useRef(null); // mounts into this div
  const [error, setError] = useState(null); // parse/render error from mermaid

  useEffect(() => {
    if (!ref.current || !code) return;

    const id = `mermaid-${++uid}`; // unique id required by mermaid.render()
    setError(null);

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg; // inject rendered SVG into the DOM
        }
      })
      .catch(err => {
        setError(err?.message ?? 'Diagram render error');
        if (ref.current) ref.current.innerHTML = ''; // clear stale SVG on failure
      });
  }, [code]); // re-render whenever the diagram definition changes

  if (error) {
    return (
      <div style={styles.error}>
        <strong>Diagram error:</strong> {error}
      </div>
    );
  }

  return <div ref={ref} style={styles.wrapper} />; // mermaid injects SVG here
}

const styles = {
  wrapper: {
    overflowX: 'auto', // wide diagrams scroll horizontally rather than clipping
    padding: '24px 0',
    display: 'flex',
    justifyContent: 'center',
  },
  error: {
    background: '#2d1a1a',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    color: '#fca5a5',
    padding: '12px 16px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
};
