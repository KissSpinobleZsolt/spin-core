import { useState } from 'react'
import { Tabs } from '@components/ui/tabs' // horizontal tab bar

// Shows a three-tab bar with a controlled active key and a readout below.
export function PreviewTabs() {
  const [active, setActive] = useState('one') // currently selected tab key
  return (
    <div className="space-y-3">
      <Tabs
        tabs={[{ key: 'one', label: 'Overview' }, { key: 'two', label: 'Details' }, { key: 'three', label: 'Logs' }]}
        active={active}
        onChange={setActive} // lift selection state up
      />
      <p className="text-sm text-slate-500">Active: <strong className="text-slate-700 dark:text-slate-300">{active}</strong></p>
    </div>
  )
}
