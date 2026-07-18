import { useState } from 'react'
import { Btn } from '../@components/ui/button' // trigger button
import { Modal } from '../@components/ui/modal' // overlay dialog

// Demonstrates a Modal opened via a button, with Cancel and Confirm actions.
export function PreviewModal() {
  const [open, setOpen] = useState(false) // controls modal visibility
  return (
    <>
      <Btn variant="secondary" onClick={() => setOpen(true)}>Open Modal</Btn>
      {open && (
        <Modal title="Example Modal" onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Modal body content. Click × or the buttons below to close.</p>
          <div className="mt-4 flex gap-2 justify-end">
            <Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => setOpen(false)}>Confirm</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}
