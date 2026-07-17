// Truncates ISO string to minute precision to match datetime-local input format (YYYY-MM-DDTHH:MM)
export function toInputValue(iso: string) {
  return iso.slice(0, 16)
}
