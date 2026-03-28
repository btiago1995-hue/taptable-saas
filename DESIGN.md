# Design System — Dineo

## Product Context
- **What this is:** B2B SaaS for restaurant management in Cabo Verde — POS, digital menus, ordering, Vinti4 payments, eFatura/DNRE fiscal compliance, loyalty program.
- **Who it's for:** Small/medium restaurant owners in Praia and Mindelo. 30-80 seats. Daily operators, not tech teams.
- **Space/industry:** Restaurant management SaaS. Primary competitor: Vendus.cv (Portuguese product copy-pasted for CV). Positioning: built for CV, not adapted for it.
- **Project type:** Web app dashboard (admin interface for restaurant staff) + public customer-facing storefront.

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with a warm CV soul
- **Decoration level:** Minimal — typography and color carry everything, no decorative elements
- **Mood:** Fast, reliable, and unmistakably local. A working tool that a restaurateur in Praia trusts daily. Not a Silicon Valley template, not a Portuguese SaaS copy-paste. The ocean blue sidebar is a deliberate signal: this was designed here.
- **Category gap:** Every competitor uses either enterprise reds/blues (reads as "imported") or food-tech oranges (generic). Neither feels local. Ocean blue + warm canvas + amber-only accents is the differentiation.

## Typography
- **UI / Body:** Plus Jakarta Sans — slightly warmer and more human than Inter, still excellent at data-dense layouts. Used for all navigation, labels, body text, buttons.
- **Data / Numbers:** Plus Jakarta Sans with `font-feature-settings: "tnum"` — tabular figures for CVE amounts, eFatura sequences, table statistics. Do not switch to a monospace font for data; use tabular-nums instead.
- **Code / IUD strings:** `font-family: 'SF Mono', 'Geist Mono', monospace` — only for eFatura IUD codes and technical strings.
- **Loading:** Google Fonts CDN. `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`
- **Scale:**

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 36–40px | 800 | Page heroes, large KPI values |
| `text-h1` | 22px | 700 | Page titles |
| `text-h2` | 18px | 600 | Section headings |
| `text-h3` | 15px | 600 | Card headings |
| `text-body` | 14px | 400 | Body copy, descriptions |
| `text-sm` | 13px | 500–600 | Navigation labels, table cells |
| `text-xs` | 12px | 500 | Metadata, timestamps |
| `text-label` | 10–11px | 700 + uppercase + tracking | Form labels, column headers |

## Color

- **Approach:** Restrained — ocean blue anchors identity, amber is reserved for value moments (loyalty stars, payment confirmations, revenue highlights). No orange-everywhere food-tech cliché.

### Palette (CSS custom properties)

```css
:root {
  /* Core */
  --ocean:        #0F2A4A;  /* Sidebar, primary actions, focus rings */
  --ocean-mid:    #1A3D6B;  /* Hover state for ocean elements */
  --ocean-light:  #2A5298;  /* Links, secondary ocean uses */

  /* Accent — use sparingly */
  --amber:        #D97706;  /* Loyalty stars, payment success, revenue highlights */
  --amber-mid:    #F59E0B;  /* Amber hover */
  --amber-light:  #FEF3C7;  /* Amber background chips */

  /* Canvas */
  --canvas:       #FAFAF8;  /* Page background — warm off-white, not pure white */
  --surface:      #FFFFFF;  /* Card backgrounds, modals, inputs */

  /* Text */
  --text:         #111827;  /* Primary text */
  --text-muted:   #6B7280;  /* Secondary text, metadata */
  --text-faint:   #9CA3AF;  /* Placeholders, disabled, column headers */

  /* Borders */
  --border:       #E5E7EB;  /* Standard borders */
  --border-subtle:#F3F4F6;  /* Dividers inside cards, table row separators */

  /* Semantic */
  --success:      #059669;
  --success-bg:   #ECFDF5;
  --error:        #DC2626;
  --error-bg:     #FEF2F2;
  --warning:      #D97706;  /* Same as --amber */
  --info:         #2563EB;
}
```

### Dark mode
Reduce `--canvas` to `#0A0F1A`, `--surface` to `#111827`, invert text, keep `--ocean` sidebar as-is (it reads identically in dark mode). Reduce amber saturation by 10%.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — not compact (this isn't a stock trading terminal), not spacious (this is a working tool, not a marketing page)

| Token | Value | Usage |
|---|---|---|
| `2xs` | 2px | |
| `xs` | 4px | Gap between inline elements, tight margins |
| `sm` | 8px | Padding inside small components, gap between items |
| `md` | 16px | Standard padding inside cards and panels |
| `lg` | 24px | Section padding, space between cards |
| `xl` | 32px | Major section breaks |
| `2xl` | 48px | Page-level top padding |

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment. Creative layout is for marketing; this is a daily working tool.
- **Admin shell:** Fixed left sidebar (220px, ocean blue) + fluid main area
- **Main canvas:** `#FAFAF8` background, 24px horizontal padding
- **Content max-width:** 1280px (on wide screens, content centers)
- **Grid:** 12-column with 16px gutters for content areas
- **Border radius scale:**
  - `radius-sm`: 4px — badges, small chips, category tabs
  - `radius-md`: 8px — buttons, inputs, small cards, nav items
  - `radius-lg`: 12px — main cards, table containers, panels
  - `radius-xl`: 16px — modals, large containers, shell mockup border
  - `radius-full`: 9999px — toggle switches, circular avatars, pill badges

## Motion
- **Approach:** Minimal-functional — every animation aids comprehension, none is decorative
- **Easing:** enter `ease-out` · exit `ease-in` · move `ease-in-out`
- **Duration:**
  - `micro`: 50–100ms — hover states, button presses
  - `short`: 150ms — tab transitions, dropdown open/close
  - `medium`: 250ms — modal appear, panel slide
  - `long`: 400ms — page transitions (if any)
- **Status changes:** Order status updates (pending → in kitchen → delivered) get a 150ms background-color flash using the semantic color for that state. No other decorative animation.
- **Never animate:** table row reorders, data refreshes, loading spinners (those should be instant or use a static loader)

## Component Rules

### Buttons
- **Primary action:** `background: var(--ocean)` — one per context. "Cobrar — Vinti4", "Confirmar Pedido", "Guardar".
- **Value action:** `background: var(--amber)` — for loyalty redemption, payment confirmation highlights.
- **Secondary:** `background: var(--canvas)`, `border: 1px solid var(--border)` — for cancel, export, secondary nav.
- **Ghost:** `background: transparent`, `color: var(--ocean)` — for inline actions like "Ver mais →".
- **Danger:** `background: var(--error-bg)`, `color: var(--error)` — for destructive actions.
- Font: 13px, weight 600. Padding: 9px 16px (default), 6px 12px (small).

### Chips / Status badges
- Always use semantic colors. Never use ocean blue for status — ocean is for navigation and primary actions.
- `chip-success` (Entregue), `chip-error` (Cancelado), `chip-amber` (Elegível, loyalty), `chip-ocean` (Em cozinha), `chip-neutral` (Pendente).

### Form labels
- Always 10–11px, weight 700, uppercase, letter-spacing 0.06–0.1em, `color: var(--text-faint)`.
- Never sentence-case for labels — it reads as body text, not a label.

### Stat cards
- Value: 28–32px, weight 800, `color: var(--ocean)` for neutral stats.
- Use `color: var(--amber)` for revenue-positive or loyalty-adjacent values.
- Label: `text-label` style (10px uppercase).
- Trend: `color: var(--success)` for positive, `color: var(--text-faint)` for neutral.

### Sidebar navigation
- Active item: `background: rgba(255,255,255,0.12)`, label `color: #FFFFFF`, icon `stroke: #FFFFFF`.
- Inactive: label `color: rgba(255,255,255,0.65)`, icon `stroke: rgba(255,255,255,0.6)`.
- Loyalty / amber features: icon `stroke: var(--amber-mid)` even when inactive — a permanent visual cue that this feature is special.
- Badge (active order count): `background: var(--amber)`, white text, pill shape.

### Tables
- Header: `background: var(--canvas)`, 10px uppercase labels, `color: var(--text-faint)`.
- Row hover: `background: var(--canvas)`.
- Row separator: `border-bottom: 1px solid var(--border-subtle)`.
- Numbers in tables: always `font-feature-settings: "tnum"`.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-28 | Initial design system created | /design-consultation — competitive research (Lightspeed, Vendus.cv, Behance restaurant SaaS) + CV market positioning analysis |
| 2026-03-28 | Ocean blue sidebar (#0F2A4A) | Deliberate departure from category norm (dark gray). Immediate visual differentiation from Vendus.cv. References CV ocean geography without being tourist-kitsch. |
| 2026-03-28 | Amber reserved for value moments only | Category defaults to orange-everywhere. Amber-only for loyalty, payments, and revenue keeps it meaningful. Perfectly matches Fidelidade star UX already in the codebase. |
| 2026-03-28 | Warm off-white canvas (#FAFAF8) | Subliminal warmth vs pure European-SaaS white. Almost invisible but felt throughout the interface. |
| 2026-03-28 | Plus Jakarta Sans (not Inter) | More warmth and roundness than Inter, still excellent at data density. Inter is overused in SaaS to the point of visual anonymity. |
