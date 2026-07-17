import type { Tab } from './Tab.type'

export interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}
