import { sizes } from './sizes.constant'
import './Spinner.style.css'

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`${sizes[size]} spinner`} />
}
