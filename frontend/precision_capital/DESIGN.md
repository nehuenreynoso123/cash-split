---
name: Precision Capital
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#1e1200'
  on-tertiary: '#ffffff'
  tertiary-container: '#35260c'
  on-tertiary-container: '#a38c6a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#fadfb8'
  tertiary-fixed-dim: '#ddc39d'
  on-tertiary-fixed: '#271902'
  on-tertiary-fixed-variant: '#564427'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar_width: 260px
  header_height: 64px
  container_padding: 32px
  gutter: 24px
  stack_sm: 8px
  stack_md: 16px
  stack_lg: 24px
---

## Brand & Style
The design system is engineered for entrepreneurs managing complex financial flows. The brand personality is authoritative yet enabling, focused on clarity, speed, and reliability. 

The design style is **Corporate Modern** with a high-density, data-first approach. It prioritizes information hierarchy over decorative elements, utilizing subtle tonal shifts and precise geometry to organize complex data sets. The interface should evoke a sense of professional stability, making the user feel in complete control of their liquidity and capital.

## Colors
The palette is rooted in a deep navy (#1e293b) to establish institutional trust. This is used for navigation, primary headings, and high-level structural elements. 

- **Primary Action:** Professional blue (#3b82f6) is reserved exclusively for interactive elements like primary buttons and active states.
- **Semantic Indicators:** Emerald green (#10b981) and soft red (#ef4444) are used with high intentionality to indicate profit/loss or growth/decline. 
- **Neutral Scale:** A range of cool grays provides soft contrast for borders, secondary text, and background layering without competing with critical financial data.

## Typography
This design system utilizes **Inter** for all UI and prose to ensure maximum legibility and a systematic feel. **JetBrains Mono** is introduced specifically for numerical values in tables and data visualizations to ensure character alignment and a technical, precise appearance.

- Use **display-lg** for main dashboard totals and summary metrics.
- Use **label-caps** for table headers and section subtitles.
- **Data-mono** should be the default for all currency amounts, stock units, and timestamps.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid** model. A persistent 260px sidebar houses navigation, while the main content area utilizes a 12-column fluid grid to accommodate varying data densities.

- **Desktop:** 32px outer margins with 24px gutters between modular dashboard cards.
- **Tablet:** Sidebar collapses to a 64px icon rail; margins reduce to 24px.
- **Mobile:** Sidebar moves to a bottom navigation bar or hamburger menu; margins reduce to 16px. Cards stack vertically in a single column.
- **Density:** Spacing is tighter (8px/12px) within data tables and form groups to maximize information density.

## Elevation & Depth
This design system uses **Tonal Layers** combined with **Low-Contrast Outlines** to define hierarchy. 

- **Surface 0 (Background):** #f8fafc.
- **Surface 1 (Cards/Sidebar):** Pure white (#ffffff) with a 1px border (#e2e8f0).
- **Surface 2 (Modals/Popovers):** Pure white with a 1px border and an extra-diffused ambient shadow (0px 10px 15px -3px rgba(0,0,0,0.05)).

Shadows are rarely used for flat UI elements, reserved only for temporary overlays to minimize visual noise. Depth is primarily communicated through subtle border-bottom treatments in tables and lists.

## Shapes
A **Soft** (Level 1) shape language is applied to maintain a modern but professional feel. 

- **Standard Components:** Buttons, input fields, and tags use 0.25rem (4px) corner radii.
- **Containers:** Large dashboard cards and surface areas use 0.5rem (8px).
- **Interactive Elements:** Checkboxes use 2px rounding to remain crisp. 

Avoid pill-shaped buttons; all interactive elements should feel structured and architectural.

## Components

### Buttons
- **Primary:** Solid #3b82f6 with white text. 4px radius. High-contrast.
- **Secondary:** Transparent with #e2e8f0 border and #1e293b text.
- **Destructive:** Solid #ef4444 for irreversible financial actions.

### Data Tables
- **Header:** #f8fafc background, 11px uppercase bold labels. 
- **Rows:** 48px height for standard density, 40px for high density. Subtle #f1f5f9 border-bottom.
- **Cells:** Currency should be right-aligned using the mono typeface.

### Input Fields
- **Currency Input:** Prefixed with a static currency symbol (e.g., $). 1px border (#e2e8f0). Focus state uses 1px #3b82f6 outline with 2px soft blue glow.
- **Unit Input:** Suffixed with unit type (e.g., Shares, Lots).

### Metrics Cards
- Used for "at-a-glance" data. Must include a title, a large mono-spaced value, and a small sparkline or percentage trend indicator (colored via semantic success/error tokens).

### Sidebar Navigation
- Icons should be 20px, stroke-based, and utilize #94a3b8 in inactive states, switching to #ffffff on a #1e293b background for active states.