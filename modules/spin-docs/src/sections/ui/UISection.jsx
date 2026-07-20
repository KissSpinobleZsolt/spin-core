import { useState, useEffect } from 'react';
import { UI_COMPONENTS } from '../../data/uiComponents'; // static component catalogue — no API call needed
import { ComponentCard } from './ComponentCard'; // docs card per UI component

// Scroll-spy hook: returns the id of the currently visible section.
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? null); // default to first component
  useEffect(() => {
    if (ids.length === 0) return;
    const els = ids.map(id => document.getElementById(id)).filter(Boolean); // resolve anchor divs
    const obs = new IntersectionObserver(
      entries => {
        const hit = entries.find(e => e.isIntersecting); // first visible anchor wins
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect(); // clean up observer on re-render
  }, [ids.join(',')]);
  return active;
}

// Full-page UI component reference driven from a static data file — no API call or loading state.
export function UISection() {
  const components = UI_COMPONENTS; // static import; always available, no fetch latency
  const [query, setQuery] = useState('');           // controlled search input value

  const ids = components.map(d => d.name.toLowerCase()); // anchor ids for scroll-spy
  const active = useActiveSection(ids);

  const searching = query.trim() !== ''; // true when user has typed a non-empty query
  const filtered = searching
    ? components.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) || // match name
        d.description.toLowerCase().includes(query.toLowerCase()), // match description
      )
    : components; // show all when no query

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
                {components.map(d => {
                  const id = d.name.toLowerCase(); // anchor id derived from component name
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        style={{ ...s.navLink, ...(active === id ? s.navLinkActive : {}) }}
                      >
                        <span style={{ ...s.navDot, ...(active === id ? s.navDotActive : {}) }} />
                        {d.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

         <div style={{ ...s.cards , height: 'fit-content'}}>
            {filtered.length === 0
              ? <p style={s.empty}>No components match "{query}"</p>
              : filtered.map(doc => <ComponentCard key={doc.name} doc={doc} />) // one card per component
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
    borderRadius: '6px',
    color: '#94a3b8',        // slate-400
    display: 'flex',
    fontSize: '12px',
    gap: '8px',
    padding: '6px 8px',
    textDecoration: 'none',
    transition: 'all 0.15s',
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
