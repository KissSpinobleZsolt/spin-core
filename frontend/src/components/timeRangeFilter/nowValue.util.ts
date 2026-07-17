import { toInputValue } from './toInputValue.util'

export function nowValue(): string {
  return toInputValue(new Date().toISOString()) // current time truncated to minute precision
}
