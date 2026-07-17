import type { Variant } from './Variant.type'

/** Props for the Btn component, extending native button attributes. */
export type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
