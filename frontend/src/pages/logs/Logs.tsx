import { LogsProvider } from './LogsContext.context' // tab + time range + purge state
import { LogsHeader } from './LogsHeader' // page title + purge button
import { LogsTimeFilter } from './LogsTimeFilter' // time range picker
import { LogsContent } from './LogsContent' // tab switcher + active tab

export default function Logs() { // logs page shell — wraps all log sections in the shared context
  return (
    <LogsProvider>
      <div className="space-y-4">
        <LogsHeader />
        <LogsTimeFilter />
        <LogsContent />
      </div>
    </LogsProvider>
  )
}
