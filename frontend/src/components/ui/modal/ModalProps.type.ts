import type { ReactNode } from 'react'

/** Props for the Modal overlay component. */
export type ModalProps = {
  title: string
  onClose?: () => void
  maxWidth?: string
  children: ReactNode
}
