import type { TabsProps } from './TabsProps.type'
import './Tabs.style.css'

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`tabs__tab ${
            active === tab.key
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
