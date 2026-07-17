import type React from 'react' // React.FC type used as map values
import { PreviewButton } from './PreviewButton' // button variants preview
import { PreviewCard } from './PreviewCard' // card container preview
import { PreviewErrorBanner } from './PreviewErrorBanner' // error banner preview
import { PreviewInput } from './PreviewInput' // input field variants preview
import { PreviewLabel } from './PreviewLabel' // label element preview
import { PreviewModal } from './PreviewModal' // modal dialog preview
import { PreviewPageTitle } from './PreviewPageTitle' // page title preview
import { PreviewSpinner } from './PreviewSpinner' // spinner sizes preview
import { PreviewToggle } from './PreviewToggle' // toggle states preview
import { PreviewBadge } from './PreviewBadge' // badge variants preview
import { PreviewStatCard } from './PreviewStatCard' // stat card preview
import { PreviewTabs } from './PreviewTabs' // tabs preview
import { PreviewProgressBar } from './PreviewProgressBar' // progress bar preview
import { PreviewChip } from './PreviewChip' // chip remove preview
import { PreviewDropZone } from './PreviewDropZone' // drop zone preview

// Maps component display name → live preview FC. Add new entries here when registering a component.
export const previewRegistry: Partial<Record<string, React.FC>> = {
  Button:      PreviewButton,
  Card:        PreviewCard,
  ErrorBanner: PreviewErrorBanner,
  Input:       PreviewInput,
  Label:       PreviewLabel,
  Modal:       PreviewModal,
  PageTitle:   PreviewPageTitle,
  Spinner:     PreviewSpinner,
  Toggle:      PreviewToggle,
  Badge:       PreviewBadge,
  StatCard:    PreviewStatCard,
  Tabs:        PreviewTabs,
  ProgressBar: PreviewProgressBar,
  Chip:        PreviewChip,
  DropZone:    PreviewDropZone,
}
