import { ErrorBanner } from '../../../../components/ui/ErrorBanner' // red error notice bar

// Shows a static error banner with a sample message.
export function PreviewErrorBanner() {
  return <ErrorBanner message="Something went wrong. Please try again." />
}
