import { PageTitle } from '../../../components/ui/PageTitle' // page heading
import { AdminPageShell } from '../../../components/layout/adminPageShell' // layout wrapper
import { AppHealthSection } from './AppHealthSection' // API health row
import { DbStatusSection } from './DbStatusSection' // postgres + clickhouse rows
import { InstalledLLMsSection } from './InstalledLLMsSection' // ollama model list
import { ModulesStatusSection } from './ModulesStatusSection' // module enable/disable
import { ActiveBotsSection } from './ActiveBotsSection' // active bots list

export default function Status() { // admin status dashboard page
  return (
    <AdminPageShell maxWidth="max-w-3xl">
      <PageTitle>Status</PageTitle>
      <AppHealthSection />
      <DbStatusSection />
      <InstalledLLMsSection />
      <ModulesStatusSection />
      <ActiveBotsSection />
    </AdminPageShell>
  )
}
