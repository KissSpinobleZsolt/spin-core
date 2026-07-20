import { useState } from 'react';
import { UI_COMPONENTS } from '../../data/uiComponents'; // static component catalogue — no API call needed
import { ComponentCard } from './ComponentCard'; // docs card per UI component

// Full-page UI component reference driven from a static data file — no API call or loading state.
export function UISection() {
  const components = UI_COMPONENTS; // static import; always available, no fetch latency
  const [query, setQuery] = useState('');                                    // controlled search input
  const [selected, setSelected] = useState(components[0]?.name ?? null);    // active component name

  const searching = query.trim() !== ''; // true when user has typed a non-empty query
  const searchResults = components.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) || // match name
    d.description.toLowerCase().includes(query.toLowerCase()), // match description
  );

  // When searching show all matches; otherwise show only the selected component's card.
  const visible = searching
    ? searchResults
    : components.filter(d => d.name === selected);

  return (
    <div style={s.root}>
      {/* Header with title, count, and search input */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>🧩 UI Components</h1>
          <p style={s.subtitle}>
            {components.length} components · <span style={{ color: '#f87171' }}>*</span> required prop
          </p>
        </div>
        <input
          style={s.input}
          placeholder="Search components…"
          value={query}
          onChange={e => setQuery(e.target.value)} // controlled input
        />
      </div>

      {/* Body */}
      <div style={s.body}>
        <div style={s.layout}>
          {!searching && components.length > 0 && ( // hide sidebar during search
            <nav style={s.sidebar}>
              <p style={s.navLabel}>Components</p>
              <ul style={s.navList}>
                {components.map(d => (
                  <li key={d.name}>
                    <button
                      onClick={() => setSelected(d.name)} // select this component; card updates instantly
                      style={{ ...s.navLink, ...(selected === d.name ? s.navLinkActive : {}) }}
                    >
                      <span style={{ ...s.navDot, ...(selected === d.name ? s.navDotActive : {}) }} />
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div style={{ ...s.cards, height: 'fit-content' }}>
            {visible.length === 0
              ? <p style={s.empty}>No components match "{query}"</p>
              : visible.map(doc => <ComponentCard key={doc.name} doc={doc} />)
            }
          </div>
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
    overflow: 'hidden',
    padding: '20px 32px',
  },
  layout: {
    display: 'flex',
    flex: 1,
    gap: '24px',
    overflow: 'hidden',
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
