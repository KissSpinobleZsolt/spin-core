import { useState } from 'react'
import { PageTitle } from '@components/ui/PageTitle'
import { DocPageShell } from '../@components/layout/docPageShell'
import { Tabs } from '@components/ui/tabs'
import { AnomaScanLayout } from './AnomaScanLayout'
import { CloudInsightAILayout } from './CloudInsightAILayout'
import { AdminShellDemo } from './AdminShellDemo'
import { DocShellDemo } from './DocShellDemo'
import { LAYOUT_TABS } from './LAYOUT_TABS.constant'

// Layouts admin page — showcases shell components and module layout demos via tabs
export default function Layouts() {
  const [active, setActive] = useState('vision') // active tab key; defaults to the Anoma Scan demo

  return (
    <DocPageShell maxWidth="max-w-5xl">
      <PageTitle>Layouts</PageTitle>

      <Tabs tabs={LAYOUT_TABS} active={active} onChange={setActive} />

      <div className="pt-2">
        {active === 'vision'    && <AnomaScanLayout />}     {/* YOLO video-analysis demo */}
        {active === 'ingestion' && <CloudInsightAILayout />} {/* data-ingestion demo */}
        {active === 'admin'     && <AdminShellDemo />}       {/* AdminPageShell usage demo */}
        {active === 'doc'       && <DocShellDemo />}         {/* DocPageShell usage demo */}
      </div>
    </DocPageShell>
  )
}
