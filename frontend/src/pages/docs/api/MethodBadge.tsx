import type { Method } from './Method.type' // prop type for the HTTP verb
import { METHOD_CLS } from './METHOD_CLS.constant' // method → Tailwind colour classes

// Renders a compact, colour-coded badge for an HTTP method.
export function MethodBadge({ method }: { method: Method }) {
  return (
    <span className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded w-14 text-center shrink-0 ${METHOD_CLS[method]}`}>
      {method}
    </span>
  )
}
