import { Card } from '@components/ui/Card' // card wrapper
import { Code } from './Code' // shell code block
import { SectionTitle } from './SectionTitle' // section heading
import { DC_SERVICES } from './DC_SERVICES.constant' // service table rows
import { DC_ENV } from './DC_ENV.constant' // env var table rows

export function DockerTab() { // Docker Compose quick-start, services, env vars, GPU tips
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Quick Start</SectionTitle>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Full stack (production builds):</p>
            <Code>{'docker compose up'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Core platform + databases only (faster iteration):</p>
            <Code>{'docker compose up backend frontend postgres clickhouse ollama model-downloader'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Frontend dev server with HMR (requires core stack running):</p>
            <Code>{'docker compose --profile dev up frontend-dev'}</Code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Rebuild a service after a code change:</p>
            <Code>{'docker compose up --build backend'}</Code>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Services & Ports</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                {['Service', 'Port', 'Image / Build', 'Description'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DC_SERVICES.map(s => (
                <tr key={s.name}>
                  <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{s.name}</td>
                  <td className="py-2 pr-4 font-mono text-slate-500 whitespace-nowrap">{s.port}</td>
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{s.image}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Environment Variables</SectionTitle>
        <p className="text-xs text-slate-500 mb-3">Set in the <code className="font-mono">backend</code> service under <code className="font-mono">environment:</code> in docker-compose.yml.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                {['Variable', 'Default', 'Description'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DC_ENV.map(e => (
                <tr key={e.key}>
                  <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{e.key}</td>
                  <td className="py-2 pr-4 font-mono text-slate-400 whitespace-nowrap max-w-[180px] truncate">{e.default}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>GPU & WSL2 Tips</SectionTitle>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>Ollama is configured to use 1 NVIDIA GPU via the <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">deploy.resources.reservations.devices</code> block. Requires NVIDIA Container Toolkit installed in WSL2.</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">Fix TCP connection resets during large model downloads (WSL2):</p>
            <Code>{`sudo sysctl -w net.ipv4.tcp_keepalive_time=30\nsudo sysctl -w net.ipv4.tcp_keepalive_intvl=10\nsudo sysctl -w net.ipv4.tcp_keepalive_probes=5\n# To persist: add these 3 lines to /etc/sysctl.conf`}</Code>
          </div>
          <p>All model weights are persisted in the <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">ollama_data</code> Docker volume — downloaded once, instant on subsequent starts.</p>
        </div>
      </Card>
    </div>
  )
}
