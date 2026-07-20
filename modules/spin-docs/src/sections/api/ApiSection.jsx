import { useState } from 'react';
import { GROUPS } from './GROUPS'; // all API endpoint groups
import { GroupCard } from './GroupCard'; // card for one group

// Full API reference with left sidebar nav and search filtering.
export function ApiSection() {
  const [query, setQuery] = useState('');                    // controlled search input
  const [selected, setSelected] = useState(GROUPS[0]?.id);  // active group id

  const searching = query.trim() !== ''; // true when user typed a non-empty query
  const searchResults = GROUPS.filter(g =>
    g.title.toLowerCase().includes(query.toLowerCase()) || // match group title
    g.endpoints.some(ep =>
      ep.path.toLowerCase().includes(query.toLowerCase()) || // match endpoint path
      ep.description.toLowerCase().includes(query.toLowerCase()), // match description
    ),
  );

  // When searching show all matches; otherwise show only the selected group's card.
  const visible = searching
    ? searchResults
    : GROUPS.filter(g => g.id === selected);

  return (
    <div style={s.root}>
      {/* Header row: title + search input */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>⚡ API Reference</h1>
          <p style={s.subtitle}>
            {GROUPS.length} groups · Base URL:{' '}
            <code style={s.code}>http://localhost:8000</code>
            {' '}· Auth:{' '}
            <code style={s.code}>Authorization: Bearer &lt;jwt&gt;</code>
          </p>
        </div>
        <input
          style={s.input}
          placeholder="Search endpoints…"
          value={query}
          onChange={e => setQuery(e.target.value)} // controlled input
        />
      </div>

      {/* Body: left nav + card panel */}
      <div style={s.body}>
        {!searching && ( // hide sidebar when a search query is active
          <nav style={s.sidebar}>
            <p style={s.navLabel}>Groups</p>
            <ul style={s.navList}>
              {GROUPS.map(g => (
                <li key={g.id}>
                  <button
                    onClick={() => setSelected(g.id)} // select this group; card updates instantly
                    style={{ ...s.navLink, ...(selected === g.id ? s.navLinkActive : {}) }}
                  >
                    <span style={{ ...s.navDot, ...(selected === g.id ? s.navDotActive : {}) }} />
                    {g.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div style={{ ...s.cards, height: 'fit-content' }}>
          {visible.length === 0
            ? <p style={s.empty}>No endpoints match "{query}"</p>
            : visible.map(g => <GroupCard key={g.id} group={g} />)
          }
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  headerRow: {
    alignItems: 'flex-start',
    borderBottom: '1px solid #1e293b', // slate-800 divider
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: '16px',
    justifyContent: 'space-between',
    padding: '24px 32px 16px',
  },
  title: {
    color: '#f1f5f9',        // slate-100
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    margin: '0 0 4px',
  },
  subtitle: {
    color: '#64748b',        // slate-500
    fontSize: '12px',
    margin: 0,
  },
  code: {
    background: '#1e293b',   // slate-800
    borderRadius: '4px',
    color: '#7dd3fc',        // sky-300
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '1px 5px',
  },
  input: {
    background: '#1e293b',   // slate-800
    border: '1px solid #334155', // slate-700
    borderRadius: '8px',
    color: '#e2e8f0',        // slate-200
    fontSize: '13px',
    outline: 'none',
    padding: '7px 12px',
    width: '220px',
  },
  body: {
    display: 'flex',
    flex: 1,
    gap: '24px',
    overflow: 'hidden',
    padding: '20px 32px',
  },
  sidebar: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    width: '140px',
  },
  navLabel: {
    color: '#64748b',        // slate-500
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: '0 0 8px',
    textTransform: 'uppercase',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  navLink: {
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',        // slate-400
    cursor: 'pointer',
    display: 'flex',
    fontSize: '12px',
    gap: '8px',
    padding: '6px 8px',
    textAlign: 'left',
    transition: 'all 0.15s',
    width: '100%',
  },
  navLinkActive: {
    background: 'rgba(59, 130, 246, 0.15)', // blue tint
    color: '#60a5fa',        // blue-400
    fontWeight: 600,
  },
  navDot: {
    background: '#334155',   // slate-700
    borderRadius: '50%',
    flexShrink: 0,
    height: '6px',
    width: '6px',
  },
  navDotActive: {
    background: '#3b82f6',   // blue-500
  },
  cards: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    paddingBottom: '32px',
  },
  empty: {
    color: '#64748b',        // slate-500
    fontSize: '13px',
    paddingTop: '48px',
    textAlign: 'center',
  },
};
