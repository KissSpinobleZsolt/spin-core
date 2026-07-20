import { Card } from '../../components/Card'; // shared card wrapper
import { Code } from '../../components/Code'; // dark code block
import { SectionTitle } from '../../components/SectionTitle'; // uppercase heading
import { K8S_SECRETS } from './K8S_SECRETS'; // k8s secret key list
import { K8S_PORTS } from './K8S_PORTS'; // nodeport assignments

// K8s prerequisites, deploy steps, secrets, NodePorts, and day-to-day ops.
export function KubernetesTab() {
  return (
    <div style={s.stack}>
      <Card>
        <SectionTitle>Prerequisites</SectionTitle>
        <ul style={s.list}>
          <li style={s.listItem}><code style={s.code}>kubectl</code> connected to a cluster (K3s, GKE, EKS, bare-metal, …)</li>
          <li style={s.listItem}><code style={s.code}>kustomize</code> CLI v5+ — or <code style={s.code}>kubectl</code> ≥ 1.27 (bundles kustomize)</li>
          <li style={s.listItem}>Docker — for building and pushing images via <code style={s.code}>scripts/k8s-push.sh</code></li>
          <li style={s.listItem}>ghcr.io access — images are pushed to <code style={s.code}>ghcr.io/kissspinoblezsolt/spin-core-*</code></li>
        </ul>
        <p style={s.note}>All resources live in the <code style={s.code}>spin-core</code> Kubernetes namespace (created by <code style={s.code}>namespace.yaml</code>).</p>
      </Card>

      <Card>
        <SectionTitle>Deploy Steps</SectionTitle>
        <div style={s.codeGroup}>
          <p style={s.hint}>1. Copy credentials template and fill in your values:</p>
          <Code>{'cp k8s/.env.example k8s/.env\n# edit k8s/.env'}</Code>
          <p style={s.hint}>2. Build and push images (tags with current git SHA + :latest):</p>
          <Code>{'bash scripts/k8s-push.sh'}</Code>
          <p style={s.hint}>3. Apply manifests and wait for rollouts:</p>
          <Code>{'bash scripts/k8s-deploy.sh'}</Code>
          <p style={s.hint}>Run both steps together:</p>
          <Code>{'bash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh'}</Code>
          <p style={s.hint}>4. On first run — watch model download progress:</p>
          <Code>{'kubectl logs -n spin-core -l job-name=model-downloader -f'}</Code>
        </div>
        <p style={s.note}>
          The model downloader pulls <code style={s.code}>qwen2.5:7b</code> (~5.5 GB) and{' '}
          <code style={s.code}>nomic-embed-text:latest</code> (~270 MB) into <code style={s.code}>ollama-pvc</code>.
          Subsequent deploys are instant — volume persists between restarts.
        </p>
      </Card>

      {/* Secrets + NodePorts side by side */}
      <div style={s.twoCol}>
        <Card>
          <SectionTitle>Secrets (k8s/.env keys)</SectionTitle>
          <p style={s.note}>Generated via <code style={s.code}>kustomize secretGenerator</code> — never committed to git.</p>
          <div style={s.secretList}>
            {K8S_SECRETS.map(sec => (
              <div key={sec.key} style={s.secretRow}>
                <code style={{ ...s.code, flexShrink: 0 }}>{sec.key}</code>
                <span style={s.secretDesc}>— {sec.description}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>NodePort Assignments</SectionTitle>
          <table style={s.table}>
            <thead>
              <tr style={s.theadRow}>
                {['Service', 'NodePort'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {K8S_PORTS.map((p, i) => (
                <tr key={p.service} style={{ borderTop: i === 0 ? 'none' : '1px solid #1e293b' }}>
                  <td style={{ ...s.td, color: '#60a5fa', fontFamily: 'monospace' }}>{p.service}</td>
                  <td style={s.td}>
                    <span style={{ color: '#cbd5e1' }}>{p.nodePort}</span>{' '}
                    <span style={{ color: '#64748b' }}>({p.description})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...s.note, marginTop: '12px' }}>
            Non-secret config lives in <code style={s.code}>configmap.yaml</code>. Ollama URL in-cluster:{' '}
            <code style={s.code}>http://ollama.spin-core.svc.cluster.local:11434</code>
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Day-to-Day Operations</SectionTitle>
        <Code>{`# Live pod status\nkubectl get pods -n spin-core -w\n\n# Stream backend logs\nkubectl logs -n spin-core -l app=backend -f\n\n# Describe a pod (events, probe failures, OOM)\nkubectl describe pod -n spin-core -l app=backend\n\n# Redeploy backend after a code change\nbash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh\n\n# Restart deployment without a new image push\nkubectl rollout restart deployment/backend -n spin-core\n\n# Re-run the model downloader\nkubectl delete job model-downloader -n spin-core\nkubectl apply -f k8s/ollama/model-downloader-job.yaml\n\n# Tear down the namespace (volumes are deleted)\nkubectl delete namespace spin-core`}</Code>
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
  twoCol: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  list: {
    color: '#cbd5e1',        // slate-300
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    gap: '6px',
    lineHeight: 1.6,
    listStyle: 'disc',
    margin: '0 0 8px',
    paddingLeft: '20px',
  },
  listItem: {
    color: '#cbd5e1',
    fontSize: '13px',
  },
  codeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
  },
  hint: {
    color: '#64748b',        // slate-500
    fontSize: '11px',
    margin: '8px 0 4px',
  },
  note: {
    color: '#64748b',        // slate-500
    fontSize: '11px',
    lineHeight: 1.5,
    margin: '8px 0 0',
  },
  code: {
    background: '#0f172a',   // slate-900
    borderRadius: '4px',
    color: '#7dd3fc',        // sky-300
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '1px 5px',
  },
  secretList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  secretRow: {
    alignItems: 'baseline',
    display: 'flex',
    gap: '8px',
  },
  secretDesc: {
    color: '#94a3b8',        // slate-400
    fontSize: '11px',
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
    fontSize: '11px',
    paddingBottom: '8px',
    paddingRight: '16px',
    paddingTop: '8px',
    verticalAlign: 'top',
  },
};
