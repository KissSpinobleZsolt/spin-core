import { Card } from '@components/ui/Card' // card wrapper
import { Code } from './Code' // shell code block
import { SectionTitle } from './SectionTitle' // section heading
import { K8S_SECRETS } from './K8S_SECRETS.constant' // k8s secret key list
import { K8S_PORTS } from './K8S_PORTS.constant' // nodeport assignments

export function KubernetesTab() { // K8s prerequisites, deploy steps, secrets, and day-to-day ops
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Prerequisites</SectionTitle>
        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
          <li><code className="font-mono text-xs">kubectl</code> connected to a cluster (K3s, GKE, EKS, bare-metal, …)</li>
          <li><code className="font-mono text-xs">kustomize</code> CLI v5+ — or <code className="font-mono text-xs">kubectl</code> ≥ 1.27 (bundles kustomize)</li>
          <li>Docker — for building and pushing images via <code className="font-mono text-xs">scripts/k8s-push.sh</code></li>
          <li>ghcr.io access — images are pushed to <code className="font-mono text-xs">ghcr.io/kissspinoblezsolt/spin-core-*</code></li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          All resources live in the <code className="font-mono">spin-core</code> Kubernetes namespace (created by <code className="font-mono">namespace.yaml</code>).
        </p>
      </Card>

      <Card>
        <SectionTitle>Deploy Steps</SectionTitle>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">1. Copy credentials template and fill in your values:</p>
            <Code>{'cp k8s/.env.example k8s/.env\n# edit k8s/.env'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">2. Build and push images (tags with current git SHA + :latest):</p>
            <Code>{'bash scripts/k8s-push.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">3. Apply manifests and wait for rollouts:</p>
            <Code>{'bash scripts/k8s-deploy.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Run both steps together:</p>
            <Code>{'bash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">4. On first run — watch model download progress:</p>
            <Code>{'kubectl logs -n spin-core -l job-name=model-downloader -f'}</Code>
          </div>
          <p className="text-xs text-slate-500">
            The model downloader pulls <code className="font-mono">qwen2.5:7b</code> (~5.5 GB) and <code className="font-mono">nomic-embed-text:latest</code> (~270 MB) into <code className="font-mono">ollama-pvc</code>. Subsequent deploys are instant — volume persists between restarts.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Secrets (k8s/.env keys)</SectionTitle>
          <p className="text-xs text-slate-500 mb-3">Generated via <code className="font-mono">kustomize secretGenerator</code> — never committed to git.</p>
          <div className="space-y-1.5">
            {K8S_SECRETS.map(s => (
              <div key={s.key} className="flex gap-2">
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 shrink-0">{s.key}</code>
                <span className="text-xs text-slate-500">— {s.description}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>NodePort Assignments</SectionTitle>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                  {['Service', 'NodePort'].map(h => (
                    <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {K8S_PORTS.map(p => (
                  <tr key={p.service}>
                    <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400">{p.service}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-300">{p.nodePort} <span className="text-slate-400">({p.description})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Non-secret config (URLs, paths) lives in <code className="font-mono">configmap.yaml</code>. Ollama URL in-cluster: <code className="font-mono">http://ollama.spin-core.svc.cluster.local:11434</code>
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Day-to-Day Operations</SectionTitle>
        <Code>{`# Live pod status\nkubectl get pods -n spin-core -w\n\n# Stream backend logs\nkubectl logs -n spin-core -l app=backend -f\n\n# Describe a pod (events, probe failures, OOM)\nkubectl describe pod -n spin-core -l app=backend\n\n# Redeploy backend after a code change\nbash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh\n\n# Restart deployment without a new image push\nkubectl rollout restart deployment/backend -n spin-core\n\n# Re-run the model downloader (e.g. to pull a newly added model)\nkubectl delete job model-downloader -n spin-core\nkubectl apply -f k8s/ollama/model-downloader-job.yaml\n\n# Tear down the namespace (volumes are deleted)\nkubectl delete namespace spin-core`}</Code>
      </Card>
    </div>
  )
}
