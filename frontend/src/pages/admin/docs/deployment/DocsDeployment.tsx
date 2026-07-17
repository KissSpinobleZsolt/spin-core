import { useState } from 'react' // tab state
import { PageTitle } from '../../../../components/ui/PageTitle' // page heading
import { DocPageShell } from '../../../../components/layout/docPageShell' // docs layout
import { Tabs } from '../../../../components/ui/tabs' // tab bar
import { DockerTab } from './DockerTab' // Docker Compose section
import { KubernetesTab } from './KubernetesTab' // Kubernetes section
import { DEPLOY_TABS } from './DEPLOY_TABS.constant' // tab definitions

export default function DocsDeployment() { // deployment guide with Docker/K8s tabs
  const [tab, setTab] = useState('docker') // default to Docker Compose

  return (
    <DocPageShell>
      <div>
        <PageTitle>Deployment</PageTitle>
        <p className="text-sm text-slate-500 mt-1">
          Docker Compose for local development · Kubernetes (Kustomize) for production
        </p>
      </div>

      <Tabs tabs={DEPLOY_TABS} active={tab} onChange={setTab} />

      <div className="pt-1">
        {tab === 'docker' && <DockerTab />}
        {tab === 'k8s'    && <KubernetesTab />}
      </div>
    </DocPageShell>
  )
}
