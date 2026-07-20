import { Card } from '../../components/Card'; // shared card wrapper
import { Code } from '../../components/Code'; // dark code block
import { SectionTitle } from '../../components/SectionTitle'; // uppercase heading
import { DC_SERVICES } from './DC_SERVICES'; // service table rows
import { DC_ENV } from './DC_ENV'; // env var table rows

// Docker Compose quick-start, services & ports, environment variables, GPU tips.
export function DockerTab() {
  return (
    <div style={s.stack}>
      <Card>
        <SectionTitle>Quick Start</SectionTitle>
        <div style={s.codeGroup}>
          <p style={s.hint}>Full stack (production builds):</p>
          <Code>{'docker compose up --build'}</Code>
          <p style={s.hint}>Core platform + databases only (faster iteration):</p>
          <Code>{'docker compose up backend frontend postgres clickhouse ollama model-downloader'}</Code>
          <p style={s.hint}>Frontend dev server with HMR (requires core stack running):</p>
          <Code>{'docker compose --profile dev up frontend-dev'}</Code>
          <p style={s.hint}>Rebuild a service after a code change:</p>
          <Code>{'docker compose up --build backend'}</Code>
        </div>
      </Card>

      <Card>
        <SectionTitle>Services & Ports</SectionTitle>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.theadRow}>
                {['Service', 'Port', 'Image / Build', 'Description'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DC_SERVICES.map((svc, i) => (
                <tr key={svc.name} style={{ borderTop: i === 0 ? 'none' : '1px solid #1e293b' }}>
                  <td style={{ ...s.td, ...s.tdMono, color: '#60a5fa' }}>{svc.name}</td>
                  <td style={{ ...s.td, ...s.tdMono, color: '#94a3b8' }}>{svc.port}</td>
                  <td style={{ ...s.td, color: '#94a3b8', whiteSpace: 'nowrap' }}>{svc.image}</td>
                  <td style={{ ...s.td, color: '#cbd5e1' }}>{svc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Environment Variables</SectionTitle>
        <p style={s.hint}>
          Set in the <code style={s.code}>backend</code> service under{' '}
          <code style={s.code}>environment:</code> in docker-compose.yml.
        </p>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.theadRow}>
                {['Variable', 'Default', 'Description'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DC_ENV.map((e, i) => (
                <tr key={e.key} style={{ borderTop: i === 0 ? 'none' : '1px solid #1e293b' }}>
                  <td style={{ ...s.td, ...s.tdMono, color: '#60a5fa', whiteSpace: 'nowrap' }}>{e.key}</td>
                  <td style={{ ...s.td, ...s.tdMono, color: '#94a3b8', maxWidth: '180px' }}>{e.default}</td>
                  <td style={{ ...s.td, color: '#cbd5e1' }}>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>GPU & WSL2 Tips</SectionTitle>
        <div style={s.tipText}>
          <p style={s.para}>
            Ollama is configured to use 1 NVIDIA GPU via the{' '}
            <code style={s.code}>deploy.resources.reservations.devices</code> block. Requires NVIDIA Container Toolkit installed in WSL2.
          </p>
          <p style={s.hint}>Fix TCP connection resets during large model downloads (WSL2):</p>
          <Code>{`sudo sysctl -w net.ipv4.tcp_keepalive_time=30\nsudo sysctl -w net.ipv4.tcp_keepalive_intvl=10\nsudo sysctl -w net.ipv4.tcp_keepalive_probes=5\n# To persist: add these 3 lines to /etc/sysctl.conf`}</Code>
          <p style={s.para}>
            All model weights are persisted in the <code style={s.code}>ollama_data</code> Docker volume — downloaded once, instant on subsequent starts.
          </p>
        </div>
      </Card>
    </div>
  );
}

const s = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    paddingBottom: '32px',
  },
  codeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  hint: {
    color: '#64748b',        // slate-500
    fontSize: '11px',
    margin: '8px 0 4px',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: '11px',
    width: '100%',
  },
  theadRow: {
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
  td: {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '11px',
    paddingRight: '16px',
    paddingTop: '8px',
    paddingBottom: '8px',
    verticalAlign: 'top',
  },
  tdMono: {
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  tipText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  para: {
    color: '#cbd5e1',        // slate-300
    fontSize: '13px',
    lineHeight: 1.6,
    margin: '4px 0',
  },
  code: {
    background: '#0f172a',   // slate-900
    borderRadius: '4px',
    color: '#7dd3fc',        // sky-300
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '1px 5px',
  },
};
