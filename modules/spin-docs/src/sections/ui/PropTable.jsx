// Renders a table listing all props for a UI component doc entry.
export function PropTable({ props }) {
  if (!props || props.length === 0) {
    return <p style={s.none}>No props.</p>;
  }
  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr style={s.headRow}>
            {['Prop', 'Type', 'Default', 'Description'].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.map(p => (
            <tr key={p.name} style={s.bodyRow}>
              <td style={{ ...s.td, ...s.tdMono, color: '#60a5fa' }}> {/* blue for prop name */}
                {p.name}{p.required && <span style={{ color: '#f87171', marginLeft: '4px' }}>*</span>}
              </td>
              <td style={{ ...s.td, ...s.tdMono, color: '#cbd5e1', maxWidth: '200px' }}>{p.type}</td>
              <td style={{ ...s.td, ...s.tdMono, color: '#94a3b8', whiteSpace: 'nowrap' }}>{p.default ?? '—'}</td>
              <td style={{ ...s.td, color: '#cbd5e1', lineHeight: 1.5 }}>{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  none: {
    color: '#64748b',        // slate-500
    fontSize: '11px',
    margin: 0,
  },
  wrap: {
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: '11px',
    width: '100%',
  },
  headRow: {
    borderBottom: '1px solid #334155', // slate-700
  },
  th: {
    color: '#64748b',        // slate-500
    fontWeight: 700,
    letterSpacing: '0.06em',
    paddingBottom: '8px',
    paddingRight: '16px',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  bodyRow: {
    borderTop: '1px solid #1e293b', // slate-800 row divider
  },
  td: {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '11px',
    paddingBottom: '8px',
    paddingRight: '16px',
    paddingTop: '8px',
    verticalAlign: 'top',
  },
  tdMono: {
    fontFamily: 'monospace',
  },
};
