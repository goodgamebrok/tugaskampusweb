# KingVypers Design Guidelines

## Design Approach

**Selected System**: Material Design-inspired with gaming aesthetic touches  
**Rationale**: Admin dashboard requires clarity, efficiency, and data density. Material Design provides robust component patterns for tables, cards, and data visualization while maintaining modern aesthetics. Gaming-adjacent branding through typography and subtle design elements.

## Typography System

**Font Families**:
- Primary: Inter or DM Sans (Google Fonts) - for UI, data tables, and body text
- Accent: Rajdhani or Orbitron (Google Fonts) - for headings and key codes to evoke gaming aesthetic

**Hierarchy**:
- Page Headers: 2xl to 3xl, semi-bold to bold, accent font
- Section Headers: xl to 2xl, semi-bold, accent font
- Card Titles: lg, medium, primary font
- Body Text: base, regular, primary font
- Data Tables: sm, medium, primary font
- Key Codes: lg to xl, mono-spaced effect with accent font, letter-spacing-wide
- Stats/Metrics: 3xl to 4xl, bold, accent font

## Layout System

**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Component padding: p-4 to p-6
- Card spacing: p-6 to p-8
- Section spacing: py-12 to py-16
- Grid gaps: gap-4 to gap-6
- Between elements: space-y-4 to space-y-8

**Container Structure**:
- Maximum width: max-w-7xl for main content area
- Sidebar: Fixed width 256px (w-64) on desktop, collapsible on mobile
- Content padding: px-4 md:px-6 lg:px-8

## Core Component Library

### Navigation & Layout

**Admin Sidebar**:
- Fixed left sidebar (desktop), drawer (mobile)
- Logo/brand at top (h-16)
- Navigation items with icon + label
- Active state with subtle indicator bar
- Grouped sections: Dashboard, Keys, Revenue, Settings
- Logout at bottom

**Top Bar**:
- Height: h-16
- Contains: breadcrumb navigation, admin username, notification icon
- Sticky positioning for scroll persistence

### Dashboard Components

**Stat Cards** (4-column grid on desktop, 2-col tablet, 1-col mobile):
- Card structure: rounded-lg with subtle shadow
- Icon in circular container (w-12 h-12)
- Large number display (3xl, bold)
- Label beneath (sm, secondary text)
- Optional trend indicator (arrow + percentage)
- Padding: p-6

**Data Tables**:
- Striped rows for readability
- Header row with sort indicators
- Columns: fixed width for actions, flexible for content
- Row actions: icon buttons for delete, reset, blacklist
- Hover states on rows
- Pagination at bottom
- Search bar above table (w-full max-w-md)
- Filter chips/badges for status (unused, active, expired, blacklisted)

**Charts & Visualizations**:
- Card container with title and date range selector
- Chart height: h-64 to h-80
- Use Recharts with area/line charts for trends
- Bar charts for revenue breakdown
- Responsive and tooltip-enabled

**Key Generation Form**:
- Card layout with clear sections
- Duration selector: Radio buttons or segmented control (1M, 2M, 3M, Custom)
- Price input: prefix with currency symbol
- Quantity: number input with increment/decrement buttons
- Notes: textarea (h-24)
- Generate button: large, prominent, full-width on mobile
- Generated keys display: monospace font in bordered container, copy-to-clipboard button for each

**Key Display Cards**:
- When showing generated keys: each in its own card
- Key code: large, centered, accent font, letter-spaced
- Status badge: pill-shaped with appropriate styling
- Metadata below: created date, expiration, HWID (if bound)
- Action buttons in card footer

### Utility Components

**Status Badges**:
- Pill-shaped (rounded-full)
- Padding: px-3 py-1
- Text: xs to sm, font-medium
- States: Unused, Active, Expired, Blacklisted

**Toast Notifications**:
- Position: top-right (toast-top-right)
- Icons: success, error, warning, info
- Auto-dismiss: 3-5 seconds
- Slide-in animation

**Loading States**:
- Skeleton loaders for table rows
- Spinner for button states
- Progress bars for bulk operations

**Modals/Dialogs**:
- Centered overlay with backdrop blur
- Max width: max-w-lg to max-w-2xl depending on content
- Header with close button
- Content area with padding
- Footer with action buttons (Cancel, Confirm)

## Page Layouts

### Login Page
- Centered card on viewport (max-w-md)
- Logo/brand above form
- Username and password inputs
- Remember me checkbox
- Full-width login button
- Minimal, focused design

### Dashboard Overview
- Grid of 4 stat cards at top
- Recent activations table below (last 10 entries)
- Line chart showing key activations over last 30 days
- Two-column layout for charts on desktop

### Key Management Page
- Search and filter bar at top
- Action buttons: "Generate New Keys", "Export CSV"
- Data table as main content
- Pagination controls at bottom

### Generate Keys Page
- Two-column layout on desktop: form left, preview/instructions right
- Single column on mobile
- Generated keys displayed in expandable section below form

### Revenue Tracking Page
- Stats cards: Total Revenue, This Month, This Week, Today
- Bar chart: revenue by key duration
- Table: transaction history with search

### Settings Page
- Card-based sections
- Change password form
- API configuration
- System settings toggles

## Images

**Logo/Branding**:
- Main logo: Display in sidebar top (h-10 to h-12)
- Favicon: Gaming/key-themed icon
- Login page: Larger logo above form (h-16 to h-20)

**Empty States**:
- Illustration for "no keys generated yet" - gaming-themed graphic
- "No results found" for filtered tables - search icon illustration

**Icons**:
- Use Heroicons throughout for consistency
- Key icon for key-related actions
- Chart/graph icons for revenue
- Shield/lock for security features
- Copy icon for copy-to-clipboard actions

## Animation Guidelines

Use sparingly and only for feedback:
- Button hover: subtle scale or brightness change
- Table row hover: background transition
- Modal/dialog entry: fade + scale
- Toast notifications: slide-in from right
- Loading spinners: smooth rotation
- No auto-playing animations or distracting effects

## Accessibility

- All form inputs with proper labels
- Focus states clearly visible on all interactive elements
- Keyboard navigation support for tables and forms
- ARIA labels for icon buttons
- Sufficient contrast ratios maintained throughout
- Screen reader friendly table structures