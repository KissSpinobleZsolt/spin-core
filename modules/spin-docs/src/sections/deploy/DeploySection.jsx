import { useState } from 'react';
import { DockerTab } from './DockerTab'; // Docker Compose content
import { KubernetesTab } from './KubernetesTab'; // Kubernetes content

const TABS = [
  { id: 'docker',     label: '🐳 Docker Compose' },
  { id: 'kubernetes', label: '☸️ Kubernetes' },
];

// Deployment guide with Docker Compose / Kubernetes tab toggle.
export function DeploySection() {
  const [tab, setTab] = useState('docker'); // active tab id

  return (
    <div style={s.root}>
      {/* Page header */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>🚀 Deployment</h1>
          <p style={s.subtitle}>Docker Compose for local dev · Kubernetes for production</p>
        </div>

        {/* Tab switcher */}
        <div style={s.tabRow}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)} // switch deployment mode tab
              style={{ ...s.tabBtn, ...(tab === t.id ? s.tabBtnActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={s.content}>
        {tab === 'docker'     && <DockerTab />}
        {tab === 'kubernetes' && <KubernetesTab />}
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
  tabRow: {
    display: 'flex',
    gap: '4px',
  },
  tabBtn: {
    background: 'transparent',
    border: '1px solid #334155', // slate-700
    borderRadius: '8px',
    color: '#94a3b8',        // slate-400
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 14px',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: '#1e3a5f',   // dark blue tint
    border: '1px solid #3b82f6', // blue-500
    color: '#93c5fd',        // blue-300
  },
  content: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px 32px',
  },
};
