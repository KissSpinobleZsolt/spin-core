/** Props for the DropZone file-input component. */
export interface DropZoneProps {
  onFiles?: (files: File[]) => void
  accept?: string
  hint?: string
  file?: File | null
}
