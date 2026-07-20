import { useState, useEffect } from 'react';
import { GROUPS } from './GROUPS'; // all API endpoint groups
import { GroupCard } from './GroupCard'; // card for one group

// Watches IntersectionObserver on section IDs and returns the currently visible one.
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? null); // start on first group
  useEffect(() => {
    const els = ids.map(id => document.getElementById(id)).filter(Boolean); // resolve to DOM nodes
    const obs = new IntersectionObserver(
      entries => {
        const hit = entries.find(e => e.isIntersecting); // first visible section wins
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }, // trigger when top 10–20% is in view
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect(); // clean up on unmount or ids change
  }, [ids.join(',')]); // re-attach when the group list changes (e.g. search clears)
  return active;
}

// Full API reference with left sidebar scroll-spy and search filtering.
export function ApiSection() {
  const [query, setQuery] = useState(''); // controlled search input
  const ids = GROUPS.map(g => g.id); // group anchor ids for the scroll-spy
  const active = useActiveSection(ids);

  const searching = query.trim() !== ''; // true when user typed a non-empty query
  const filtered = searching
    ? GROUPS.filter(g =>
        g.title.toLowerCase().includes(query.toLowerCase()) || // match group title
        g.endpoints.some(ep =>
          ep.path.toLowerCase().includes(query.toLowerCase()) || // match endpoint path
          ep.description.toLowerCase().includes(query.toLowerCase()), // match description
        ),
      )
    : GROUPS; // show all when no query

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

      {/* Body: left nav + scrollable cards */}
      <div style={s.body}>
        {!searching && ( // hide sidebar when a search query is active
          <nav style={s.sidebar}>
            <p style={s.navLabel}>Groups</p>
            <ul style={s.navList}>
              {GROUPS.map(g => (
                <li key={g.id}>
                  <a
                    href={`#${g.id}`}
                    style={{ ...s.navLink, ...(active === g.id ? s.navLinkActive : {}) }}
                  >
                    <span style={{ ...s.navDot, ...(active === g.id ? s.navDotActive : {}) }} />
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div style={{ ...s.cards , height: 'fit-content'}}>
          {filtered.length === 0
            ? <p style={s.empty}>No endpoints match "{query}"</p>
            : filtered.map(g => <GroupCard key={g.id} group={g}/>)
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
