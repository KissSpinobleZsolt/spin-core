// Static UI component catalogue — source of truth for the spin-docs UI Components section.
// Update this file when components are added, removed, or their props change.
// Ordered by sort_order (matches the original seed.json sequence).
export const UI_COMPONENTS = [
  {
    name: 'Button',
    export: 'Btn',
    file: 'components/ui/Button.tsx',
    description: 'Styled button with three semantic variants. Forwards all native <button> attributes.',
    props: [
      { name: 'variant',   type: "'primary' | 'secondary' | 'danger'",              default: "'primary'", required: false, description: 'Visual style of the button.' },
      { name: 'className', type: 'string',                                           default: "''",        required: false, description: 'Extra Tailwind classes merged onto the button element.' },
      { name: '...rest',   type: 'React.ButtonHTMLAttributes<HTMLButtonElement>',    required: false,      description: 'All standard button attributes (onClick, disabled, type, …).' },
    ],
  },
  {
    name: 'Card',
    export: 'Card',
    file: 'components/ui/Card.tsx',
    description: 'White / dark rounded container with border and p-6 padding. Use as a layout block.',
    props: [
      { name: 'children',  type: 'ReactNode', required: true,  description: 'Content rendered inside the card.' },
      { name: 'className', type: 'string',    required: false, description: 'Extra Tailwind classes appended to the wrapper div.' },
    ],
  },
  {
    name: 'ErrorBanner',
    export: 'ErrorBanner',
    file: 'components/ui/ErrorBanner.tsx',
    description: 'Full-width red-tinted alert paragraph. Renders nothing when message is empty.',
    props: [
      { name: 'message', type: 'string', required: true, description: 'Error text to display.' },
    ],
  },
  {
    name: 'Input',
    export: 'Input',
    file: 'components/ui/Input.tsx',
    description: 'Styled text input, optionally wrapped in a labelled group. Forwards all native <input> attributes.',
    props: [
      { name: 'label',     type: 'string',                                          required: false, description: "When provided, wraps the input in a <div> with a <label> above it." },
      { name: 'id',        type: 'string',                                          required: false, description: "Used to link the label's htmlFor when label is set." },
      { name: 'className', type: 'string',                                          required: false, description: 'Extra Tailwind classes on the <input> element.' },
      { name: '...rest',   type: 'React.InputHTMLAttributes<HTMLInputElement>',     required: false, description: 'All standard input attributes (value, onChange, placeholder, disabled, …).' },
    ],
  },
  {
    name: 'Label',
    export: 'Label',
    file: 'components/ui/Label.tsx',
    description: 'Styled <label> element. Use standalone or alongside Input when manual control is needed.',
    props: [
      { name: '...rest', type: 'React.LabelHTMLAttributes<HTMLLabelElement>', required: false, description: 'All standard label attributes (htmlFor, children, …).' },
    ],
  },
  {
    name: 'Modal',
    export: 'Modal',
    file: 'components/ui/Modal.tsx',
    description: 'Fixed full-screen overlay with a scrollable inner panel (max-height 90 vh). Mount/unmount to show/hide.',
    props: [
      { name: 'title',    type: 'string',       required: true,  description: 'Heading text shown in the modal header.' },
      { name: 'onClose',  type: '() => void',   required: false, description: 'When provided, an × button is rendered in the header.' },
      { name: 'maxWidth', type: 'string',        default: "'max-w-lg'", required: false, description: 'Tailwind max-width class controlling the dialog width.' },
      { name: 'children', type: 'ReactNode',    required: true,  description: 'Content rendered inside the modal body.' },
    ],
  },
  {
    name: 'PageTitle',
    export: 'PageTitle',
    file: 'components/ui/PageTitle.tsx',
    description: 'Bold h1 heading sized at text-xl. Use once at the top of each page.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'Title text or elements.' },
    ],
  },
  {
    name: 'Spinner',
    export: 'Spinner',
    file: 'components/ui/Spinner.tsx',
    description: 'Animated inline loading indicator with three size presets.',
    props: [
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'sm = 16 px, md = 24 px, lg = 32 px ring.' },
    ],
  },
  {
    name: 'Toggle',
    export: 'Toggle',
    file: 'components/ui/Toggle.tsx',
    description: 'Pill-shaped accessible switch with a sliding knob. Uses role="switch" and aria-checked.',
    props: [
      { name: 'checked',  type: 'boolean',             required: true,  description: 'Controlled checked state.' },
      { name: 'onChange', type: '(v: boolean) => void', required: true,  description: 'Called with the new value when the user clicks.' },
      { name: 'disabled', type: 'boolean',             required: false, description: 'When true, interaction is blocked and the knob is greyed out.' },
    ],
  },
  {
    name: 'Badge',
    export: 'Badge',
    file: 'components/ui/Badge.tsx',
    description: 'Colour-coded rounded label for status, severity, or category tags.',
    props: [
      { name: 'variant',  type: "'info' | 'success' | 'warn' | 'error' | 'neutral'", default: "'neutral'", required: false, description: 'Colour scheme of the badge.' },
      { name: 'dot',      type: 'boolean',  required: false, description: 'When true, prepends a small filled circle matching the variant colour.' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Badge text or content.' },
    ],
  },
  {
    name: 'StatCard',
    export: 'StatCard',
    file: 'components/ui/StatCard.tsx',
    description: 'KPI tile displaying a large metric value, a label, and an optional sub-text. Use in a grid row.',
    props: [
      { name: 'value', type: 'string | number', required: true,  description: 'Primary metric value displayed large.' },
      { name: 'label', type: 'string',          required: true,  description: 'Short descriptor shown below the value in uppercase.' },
      { name: 'sub',   type: 'string',          required: false, description: 'Secondary detail line shown below the label in muted text.' },
    ],
  },
  {
    name: 'Tabs',
    export: 'Tabs',
    file: 'components/ui/Tabs.tsx',
    description: 'Horizontal tab bar with an active underline indicator. Fully controlled — caller manages active state.',
    props: [
      { name: 'tabs',     type: "Array<{ key: string; label: string }>", required: true, description: 'Tab definitions in display order.' },
      { name: 'active',   type: 'string',                                required: true, description: 'The key of the currently active tab.' },
      { name: 'onChange', type: '(key: string) => void',                 required: true, description: "Called with the clicked tab's key." },
    ],
  },
  {
    name: 'ProgressBar',
    export: 'ProgressBar',
    file: 'components/ui/ProgressBar.tsx',
    description: 'Thin linear progress indicator. Value is clamped to 0–100.',
    props: [
      { name: 'value', type: 'number',                          required: true,  description: 'Fill percentage (0–100).' },
      { name: 'label', type: 'string',                          required: false, description: 'When provided, renders a row above the bar with the label left and percentage right.' },
      { name: 'color', type: "'blue' | 'green' | 'amber' | 'red'", default: "'blue'", required: false, description: 'Fill colour of the progress bar.' },
    ],
  },
  {
    name: 'Chip',
    export: 'Chip',
    file: 'components/ui/Chip.tsx',
    description: 'Small inline tag. Pass onRemove to show a × dismiss button.',
    props: [
      { name: 'children', type: 'ReactNode',  required: true,  description: 'Chip content.' },
      { name: 'onRemove', type: '() => void', required: false, description: 'When provided, an × button is rendered that calls this handler.' },
    ],
  },
  {
    name: 'DropZone',
    export: 'DropZone',
    file: 'components/ui/DropZone.tsx',
    description: 'Drag-and-drop file upload area. Also opens a file picker on click.',
    notes: 'DropZone manages its own internal dragging state. The file prop is display-only — keep the actual File object in the parent and pass it back in.',
    props: [
      { name: 'onFiles', type: '(files: File[]) => void', required: false, description: 'Called with the array of dropped or selected files.' },
      { name: 'accept',  type: 'string',                  required: false, description: 'MIME type or extension filter forwarded to the hidden <input type="file">. E.g. "video/*" or ".zip".' },
      { name: 'hint',    type: 'string',                  required: false, description: 'Small helper text shown below the drop prompt (e.g. accepted formats, size limit).' },
      { name: 'file',    type: 'File | null',             required: false, description: 'When set, replaces the placeholder text with the file name.' },
    ],
  },
]
