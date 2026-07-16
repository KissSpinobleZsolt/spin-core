import { useRef, useState } from 'react'

interface DropZoneProps {
  onFiles?: (files: File[]) => void
  accept?: string
  hint?: string
  file?: File | null
}

export function DropZone({ onFiles, accept, hint, file }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles?.(files)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles?.(files)
    e.target.value = ''
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer select-none transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
    >
      <p className="text-2xl mb-2">☁️</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {file ? `📄 ${file.name}` : 'Drop files here or click to browse'}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}
