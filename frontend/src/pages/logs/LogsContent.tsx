import { Tabs } from '../../components/ui/tabs' // tab bar
import { ApiLogsTab } from './ApiLogsTab' // API request log tab
import { UserLogsTab } from './UserLogsTab' // user activity log tab
import { ChatLogsTab } from './ChatLogsTab' // chat log tab
import { useLogsContext } from './LogsContext.context' // active tab state
import { type Tab } from './Tab.type' // Tab type

export function LogsContent() { // tab switcher + active tab content
  const { tab, setTab } = useLogsContext()
  return (
    <>
      <Tabs
        tabs={[
          { key: 'api',  label: 'API Logs' },
          { key: 'user', label: 'User Logs' },
          { key: 'chat', label: 'Chat Logs' },
        ]}
        active={tab}
        onChange={t => setTab(t as Tab)}
      />
      {tab === 'api'  && <ApiLogsTab />}
      {tab === 'user' && <UserLogsTab />}
      {tab === 'chat' && <ChatLogsTab />}
    </>
  )
}
