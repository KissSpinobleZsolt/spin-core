import { PropTable } from './PropTable'; // tabular props listing

// Docs card for a single UI component with props table.
// Live previews are omitted — they depend on core UI components not available in the module.
export function ComponentCard({ doc }) {
  return (
    <div id={doc.name.toLowerCase()} style={s.card}>
      {/* Card header: name, export alias, description, file path */}
      <div style={s.cardHeader}>
        <div style={s.nameRow}>
          <div>
            <div style={s.nameAndExport}>
              <h2 style={s.name}>{doc.name}</h2>
              {doc.export !== doc.name && ( // show export alias when it differs from the display name
                <code style={s.exportBadge}>{'{ '}{doc.export}{' }'}</code>
              )}
            </div>
            <p style={s.desc}>{doc.description}</p>
          </div>
          <code style={s.fileBadge}>{doc.file}</code>
        </div>
      </div>

      {/* Import snippet */}
      <div style={s.importRow}>
        <code style={s.importSnippet}>
          {'import { '}
          <span style={{ color: '#60a5fa' }}>{doc.export}</span>
          {" } from '../../"}
          <span style={{ color: '#4ade80' }}>{doc.file.replace('.tsx', '')}</span>
          {"'"}
        </code>
      </div>

      {/* Props table */}
      <div style={s.body}>
        <PropTable props={doc.props} />
        {doc.notes && (
          <p style={s.notes}>ℹ️ {doc.notes}</p>
        )}
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
    padding: '16px 20px',
  },
  nameRow: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-between',
  },
  nameAndExport: {
    alignItems: 'center',
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
  },
  name: {
    color: '#f1f5f9',        // slate-100
    fontSize: '14px',
    fontWeight: 700,
    margin: 0,
  },
  exportBadge: {
    background: '#334155',   // slate-700
    borderRadius: '4px',
    color: '#94a3b8',        // slate-400
    fontFamily: 'monospace',
    fontSize: '10px',
    padding: '2px 6px',
  },
  desc: {
    color: '#94a3b8',        // slate-400
    fontSize: '12px',
    lineHeight: 1.5,
    margin: 0,
  },
  fileBadge: {
    background: '#0f172a',   // slate-900
    borderRadius: '4px',
    color: '#64748b',        // slate-500
    flexShrink: 0,
    fontFamily: 'monospace',
    fontSize: '10px',
    padding: '3px 8px',
    whiteSpace: 'nowrap',
  },
  importRow: {
    background: 'rgba(15, 23, 42, 0.5)', // slate-900 semi-transparent
    borderBottom: '1px solid #334155',
    padding: '10px 20px',
  },
  importSnippet: {
    color: '#94a3b8',        // slate-400
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  body: {
    padding: '16px 20px',
  },
  notes: {
    background: 'rgba(180, 83, 9, 0.15)', // amber tint
    borderRadius: '8px',
    color: '#fbbf24',        // amber-400
    fontSize: '11px',
    marginTop: '12px',
    padding: '8px 12px',
  },
};
