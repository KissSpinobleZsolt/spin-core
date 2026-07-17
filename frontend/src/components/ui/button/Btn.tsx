import type { BtnProps } from './BtnProps.type'
import { base } from './base.constant'
import { variants } from './variants.constant'

export function Btn({ variant = 'primary', className = '', ...props }: BtnProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
