export function Code({ children }: { children: string }) { // monospace code block for shell commands
  return (
    <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg px-4 py-3 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  )
}
