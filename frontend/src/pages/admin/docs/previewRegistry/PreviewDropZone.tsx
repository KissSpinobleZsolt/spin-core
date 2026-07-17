import { useState } from 'react'
import { DropZone } from '../../../../components/ui/dropZone' // file drag-and-drop zone
import { Btn } from '../../../../components/ui/button' // clear button

// Shows a DropZone that captures one file and a Clear button to reset.
export function PreviewDropZone() {
  const [file, setFile] = useState<File | null>(null) // currently dropped file, null when empty
  return (
    <div className="max-w-xs">
      <DropZone file={file} hint="CSV, XLSX — max 50 MB" onFiles={([f]) => setFile(f)} /> {/* accepts the first file from the drop list */}
      {file && <Btn variant="secondary" className="mt-2" onClick={() => setFile(null)}>Clear</Btn>}
    </div>
  )
}
