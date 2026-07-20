import { useState } from 'react';
import { DiagramViewer } from './DiagramViewer'; // mermaid diagram renderer
import { DIAGRAMS as BE_DIAGRAMS } from './data/backendDiagrams'; // backend diagram list
import { DIAGRAMS as FE_DIAGRAMS } from './data/frontendDiagrams'; // frontend diagram list
import { ApiSection } from './sections/api/ApiSection'; // full API reference
import { DeploySection } from './sections/deploy/DeploySection'; // deployment guide (Docker + K8s)
import { UISection } from './sections/ui/UISection'; // UI component catalogue

// Top-level navigation sections
const SECTIONS = [
  { id: 'diagrams', label: '📐 Architecture Diagrams' },
  { id: 'api',      label: '⚡ API Reference' },
  { id: 'ui',       label: '🧩 UI Components' },
  { id: 'deploy',   label: '🚀 Deployment' },
];

// Diagram sub-tabs (Backend / Frontend)
const DIAGRAM_TABS = [
  { id: 'backend',  label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
];

export default function App() {
  const [section, setSection]       = useState('diagrams');           // top-level nav section
  const [diagTab, setDiagTab]       = useState('backend');            // BE / FE toggle within Diagrams
  const [selectedId, setSelectedId] = useState(BE_DIAGRAMS[0]?.id ?? null); // active diagram id

  // Derive the active diagram list and selected entry from current state
  const diagrams     = diagTab === 'backend' ? BE_DIAGRAMS : FE_DIAGRAMS;
  const selectedDiag = diagrams.find(d => d.id === selectedId) ?? diagrams[0];

  // Switch diagram tab and reset the selected diagram to the first in the new list
  function switchDiagTab(tab) {
    setDiagTab(tab);
    const list = tab === 'backend' ? BE_DIAGRAMS : FE_DIAGRAMS; // pick the correct list
    setSelectedId(list[0]?.id ?? null); // reset selection to first diagram
  }

  return (
    <div style={styles.root}>
      {/* ── Top navigation bar ──────────────────────────────── */}
      <header style={styles.header}>
        <span style={styles.brand}>📚 Spin Docs</span>
        <nav style={styles.topNav}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)} // switch top-level section
              style={section === s.id ? { ...styles.topBtn, ...styles.topBtnActive } : styles.topBtn}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main style={styles.main}>
        {section === 'diagrams' && (
          <DiagramsSection
            diagTab={diagTab}
            switchDiagTab={switchDiagTab}
            diagrams={diagrams}
            selectedId={selectedDiag?.id}
            setSelectedId={setSelectedId}
            selectedDiag={selectedDiag}
          />
        )}
        {section === 'api'    && <ApiSection />}
        {section === 'ui'     && <UISection />}
        {section === 'deploy' && <DeploySection />}
      </main>
    </div>
  );
}

// ── Diagrams section ──────────────────────────────────────────────────────────

function DiagramsSection({ diagTab, switchDiagTab, diagrams, selectedId, setSelectedId, selectedDiag }) {
  return (
    <div style={styles.diagLayout}>
      {/* Left sidebar — diagram index */}
      <aside style={styles.diagSidebar}>
        {/* BE / FE toggle */}
        <div style={styles.tabRow}>
          {DIAGRAM_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchDiagTab(t.id)}
              style={diagTab === t.id ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Diagram list */}
        <ul style={styles.diagList}>
          {diagrams.map(d => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)} // select this diagram
                style={d.id === selectedId
                  ? { ...styles.diagItem, ...styles.diagItemActive }
                  : styles.diagItem}
                title={d.description}
              >
                {d.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Right panel — rendered diagram */}
      <section style={styles.diagPanel}>
        {selectedDiag && (
          <>
            <h2 style={styles.diagTitle}>{selectedDiag.title}</h2>
            {selectedDiag.description && (
              <p style={styles.diagDesc}>{selectedDiag.description}</p>
            )}
            <DiagramViewer key={selectedDiag.id} code={selectedDiag.code} />
          </>
        )}
      </section>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100vh',
    background: '#0f172a',   // slate-900 — matches host sidebar
    color: '#e2e8f0',        // slate-200
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '0 24px',
    height: '56px',
    background: '#1e293b',   // slate-800
    borderBottom: '1px solid #334155', // slate-700
    flexShrink: 0,
  },
  brand: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#f1f5f9',        // slate-100
    letterSpacing: '-0.01em',
    marginRight: '8px',
  },
  topNav: {
    display: 'flex',
    gap: '4px',
  },
  topBtn: {
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',        // slate-400
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 14px',
    transition: 'background 0.15s, color 0.15s',
  },
  topBtnActive: {
    background: '#1d4ed8',   // blue-700
    color: '#fff',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },

  // Diagrams layout
  diagLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  diagSidebar: {
    width: '220px',
    flexShrink: 0,
    borderRight: '1px solid #1e293b', // slate-800
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    background: '#0f172a',   // slate-900
  },
  tabRow: {
    display: 'flex',
    gap: '4px',
    padding: '12px 8px 8px',
    borderBottom: '1px solid #1e293b',
  },
  tabBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #334155', // slate-700
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    padding: '5px 8px',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: '#1e3a5f',   // dark blue tint
    border: '1px solid #3b82f6', // blue-500
    color: '#93c5fd',        // blue-300
  },
  diagList: {
    listStyle: 'none',
    margin: 0,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  diagItem: {
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',        // slate-400
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 400,
    padding: '7px 10px',
    textAlign: 'left',
    width: '100%',
    transition: 'background 0.12s, color 0.12s',
    lineHeight: 1.4,
  },
  diagItemActive: {
    background: '#1e3a5f',
    color: '#93c5fd',        // blue-300
    fontWeight: 600,
  },
  diagPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px 40px',
  },
  diagTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 8px',
    letterSpacing: '-0.01em',
  },
  diagDesc: {
    color: '#64748b',        // slate-500
    fontSize: '13px',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
};
