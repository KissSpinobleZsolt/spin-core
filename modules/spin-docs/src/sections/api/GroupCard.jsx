import { MethodBadge } from './MethodBadge'; // coloured method pill

// Auth level → text colour
const AUTH_COLOR = {
  Public: '#94a3b8', // slate-400 — no token required
  Bearer: '#60a5fa', // blue-400  — any authenticated user
  Admin:  '#f87171', // red-400   — admin role required
};

// Renders one card showing all endpoints in an API group.
export function GroupCard({ group }) {
  return (
    <div id={group.id} style={s.card}>
      <div style={s.cardHeader}>
        <h2 style={s.cardTitle}>{group.title}</h2>
        {group.note && <p style={s.cardNote}>{group.note}</p>}
      </div>
      <div>
        {group.endpoints.map((ep, i) => (
          <div key={i} style={{ ...s.row, borderTop: i === 0 ? 'none' : '1px solid #334155' }}>
            <MethodBadge method={ep.method} /> {/* coloured HTTP verb pill */}
            <code style={s.path}>{ep.path}</code>
            <p style={s.desc}>{ep.description}</p>
            <span style={{ ...s.auth, color: AUTH_COLOR[ep.auth] ?? '#94a3b8' }}>{ep.auth}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  card: {
    background: '#1e293b',   // slate-800
    border: '1px solid #334155', // slate-700
    borderRadius: '12px',
    overflow: 'hidden',
  },
  cardHeader: {
    borderBottom: '1px solid #334155',
    padding: '12px 20px',
  },
  cardTitle: {
    color: '#f1f5f9',        // slate-100
    fontSize: '14px',
    fontWeight: 700,
    margin: 0,
  },
  cardNote: {
    color: '#94a3b8',        // slate-400
    fontSize: '11px',
    lineHeight: 1.5,
    margin: '4px 0 0',
  },
  row: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: '12px',
    padding: '10px 20px',
  },
  path: {
    color: '#cbd5e1',        // slate-300
    fontFamily: 'monospace',
    fontSize: '11px',
    flexShrink: 0,
    paddingTop: '2px',
    wordBreak: 'break-all',
  },
  desc: {
    color: '#94a3b8',        // slate-400
    flex: 1,
    fontSize: '11px',
    lineHeight: 1.5,
    margin: 0,
  },
  auth: {
    flexShrink: 0,
    fontSize: '10px',
    fontWeight: 600,
    paddingTop: '2px',
  },
};
