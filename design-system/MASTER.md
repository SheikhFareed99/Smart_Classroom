# AICo Classroom — Design System Master File

> **Project:** AICo — AI-Powered Classroom Platform  
> **Version:** 1.0  
> **Date:** 2026-05-02  
> **Stack:** React + Vite + TypeScript, Plain CSS with CSS Custom Properties  
> **Modes:** Light + Dark  
> **Icon Library:** Lucide React  

---

## 1. Design Principles

1. **Clarity over cleverness** — Every element earns its place. Avoid decoration that doesn't serve comprehension.
2. **Whitespace is a feature** — Generous spacing reduces cognitive load. Let content breathe.
3. **Consistency builds trust** — Same patterns, same tokens, same behavior everywhere.
4. **AI features feel magical, not noisy** — Use the violet accent sparingly; AI is a helper, not the hero.
5. **Accessible by default** — Every interaction works with keyboard, screen reader, and reduced motion.
6. **Dark mode is a first-class citizen** — Not an afterthought; designed with equal care.
7. **Progressive disclosure** — Show the essentials first, reveal complexity on demand.

---

## 2. Color System

### 2.1 Color Palette — Full Scales

#### Neutral (Slate)
Used for backgrounds, text, borders, and surfaces.

| Token | Hex | HSL |
|-------|-----|-----|
| `neutral-50` | `#F8FAFC` | `210 40% 98%` |
| `neutral-100` | `#F1F5F9` | `210 40% 96%` |
| `neutral-200` | `#E2E8F0` | `214 32% 91%` |
| `neutral-300` | `#CBD5E1` | `213 27% 84%` |
| `neutral-400` | `#94A3B8` | `215 20% 65%` |
| `neutral-500` | `#64748B` | `215 16% 47%` |
| `neutral-600` | `#475569` | `215 19% 35%` |
| `neutral-700` | `#334155` | `215 25% 27%` |
| `neutral-800` | `#1E293B` | `217 33% 17%` |
| `neutral-900` | `#0F172A` | `222 47% 11%` |
| `neutral-950` | `#020617` | `229 84% 5%` |

#### Primary (Indigo)
The main brand color — academic, calm, trustworthy.

| Token | Hex | HSL |
|-------|-----|-----|
| `primary-50` | `#EEF2FF` | `226 100% 97%` |
| `primary-100` | `#E0E7FF` | `226 100% 94%` |
| `primary-200` | `#C7D2FE` | `228 96% 89%` |
| `primary-300` | `#A5B4FC` | `230 94% 82%` |
| `primary-400` | `#818CF8` | `234 89% 74%` |
| `primary-500` | `#6366F1` | `239 84% 67%` |
| `primary-600` | `#4F46E5` | `243 75% 59%` |
| `primary-700` | `#4338CA` | `245 58% 51%` |
| `primary-800` | `#3730A3` | `244 56% 42%` |
| `primary-900` | `#312E81` | `242 47% 34%` |
| `primary-950` | `#1E1B4B` | `244 47% 20%` |

#### Accent / AI (Violet)
Used exclusively for AI-powered features — sparkles, suggestions, chat.

| Token | Hex | HSL |
|-------|-----|-----|
| `accent-50` | `#F5F3FF` | `250 100% 97%` |
| `accent-100` | `#EDE9FE` | `251 91% 95%` |
| `accent-200` | `#DDD6FE` | `251 95% 92%` |
| `accent-300` | `#C4B5FD` | `252 95% 85%` |
| `accent-400` | `#A78BFA` | `255 92% 76%` |
| `accent-500` | `#8B5CF6` | `258 90% 66%` |
| `accent-600` | `#7C3AED` | `262 83% 58%` |
| `accent-700` | `#6D28D9` | `263 70% 50%` |
| `accent-800` | `#5B21B6` | `263 69% 42%` |
| `accent-900` | `#4C1D95` | `264 67% 35%` |
| `accent-950` | `#2E1065` | `261 73% 23%` |

#### Success (Emerald)

| Token | Hex | HSL |
|-------|-----|-----|
| `success-50` | `#ECFDF5` | `152 81% 96%` |
| `success-100` | `#D1FAE5` | `149 80% 90%` |
| `success-500` | `#10B981` | `160 84% 39%` |
| `success-600` | `#059669` | `161 94% 30%` |
| `success-700` | `#047857` | `162 93% 24%` |

#### Warning (Amber)

| Token | Hex | HSL |
|-------|-----|-----|
| `warning-50` | `#FFFBEB` | `48 100% 96%` |
| `warning-100` | `#FEF3C7` | `48 96% 89%` |
| `warning-500` | `#F59E0B` | `38 92% 50%` |
| `warning-600` | `#D97706` | `32 95% 44%` |
| `warning-700` | `#B45309` | `26 90% 37%` |

#### Error (Red)

| Token | Hex | HSL |
|-------|-----|-----|
| `error-50` | `#FEF2F2` | `0 86% 97%` |
| `error-100` | `#FEE2E2` | `0 93% 94%` |
| `error-500` | `#EF4444` | `0 84% 60%` |
| `error-600` | `#DC2626` | `0 72% 51%` |
| `error-700` | `#B91C1C` | `0 74% 42%` |

#### Info (Sky)

| Token | Hex | HSL |
|-------|-----|-----|
| `info-50` | `#F0F9FF` | `204 100% 97%` |
| `info-100` | `#E0F2FE` | `204 94% 94%` |
| `info-500` | `#0EA5E9` | `199 89% 48%` |
| `info-600` | `#0284C7` | `200 98% 39%` |
| `info-700` | `#0369A1` | `201 96% 32%` |

### 2.2 Semantic Token Mapping

| Role | Light Mode Token | Dark Mode Token |
|------|-----------------|----------------|
| `--bg-app` | `neutral-50` (#F8FAFC) | `neutral-950` (#020617) |
| `--bg-surface` | `white` (#FFFFFF) | `neutral-900` (#0F172A) |
| `--bg-elevated` | `white` (#FFFFFF) | `neutral-800` (#1E293B) |
| `--bg-sunken` | `neutral-100` (#F1F5F9) | `neutral-950` (#020617) |
| `--text-primary` | `neutral-900` (#0F172A) | `neutral-50` (#F8FAFC) |
| `--text-secondary` | `neutral-600` (#475569) | `neutral-400` (#94A3B8) |
| `--text-muted` | `neutral-400` (#94A3B8) | `neutral-500` (#64748B) |
| `--text-inverse` | `white` (#FFFFFF) | `neutral-950` (#020617) |
| `--border-default` | `neutral-200` (#E2E8F0) | `neutral-700` (#334155) |
| `--border-strong` | `neutral-300` (#CBD5E1) | `neutral-600` (#475569) |
| `--ring-focus` | `primary-500` (#6366F1) | `primary-400` (#818CF8) |
| `--primary` | `primary-600` (#4F46E5) | `primary-500` (#6366F1) |
| `--primary-hover` | `primary-700` (#4338CA) | `primary-400` (#818CF8) |
| `--primary-bg` | `primary-50` (#EEF2FF) | `primary-950` (#1E1B4B) |
| `--accent` | `accent-600` (#7C3AED) | `accent-400` (#A78BFA) |
| `--accent-bg` | `accent-50` (#F5F3FF) | `accent-950` (#2E1065) |

---

## 3. Typography

### 3.1 Font Family
```
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
```

**Load via Google Fonts (single import in `index.html`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Use Case |
|-------|------|-------------|--------|----------------|----------|
| `display` | 48px (3rem) | 1.1 | 700 | -0.025em | Hero headings |
| `h1` | 36px (2.25rem) | 1.2 | 700 | -0.025em | Page titles |
| `h2` | 24px (1.5rem) | 1.3 | 700 | -0.02em | Section headings |
| `h3` | 20px (1.25rem) | 1.4 | 600 | -0.015em | Card/widget titles |
| `h4` | 18px (1.125rem) | 1.4 | 600 | -0.01em | Sub-headings |
| `body` | 16px (1rem) | 1.6 | 400 | normal | Default body |
| `body-sm` | 14px (0.875rem) | 1.5 | 400 | normal | Secondary text |
| `caption` | 12px (0.75rem) | 1.5 | 500 | 0.02em | Labels, timestamps |
| `label` | 14px (0.875rem) | 1.4 | 500 | normal | Form labels |
| `code` | 14px (0.875rem) | 1.6 | 400 | normal | Code blocks |

### 3.3 Font Weights
- `400` — Regular (body text)
- `500` — Medium (labels, nav items)
- `600` — Semibold (sub-headings, buttons)
- `700` — Bold (headings only)

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px base)

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--space-0` | 0 | — |
| `--space-0.5` | 2px | Micro adjustments |
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-1.5` | 6px | Small icon gaps |
| `--space-2` | 8px | Inline spacing |
| `--space-3` | 12px | Card internal gaps |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Component padding |
| `--space-6` | 24px | Section padding |
| `--space-8` | 32px | Large gaps |
| `--space-10` | 40px | Major separators |
| `--space-12` | 48px | Section margins |
| `--space-16` | 64px | Page-level spacing |
| `--space-20` | 80px | Hero spacing |
| `--space-24` | 96px | Large section gaps |

### 4.2 Layout

| Token | Value |
|-------|-------|
| Container max-width | 1280px |
| Navbar height | 64px |
| Sidebar width | 260px |
| Content padding (desktop) | 32px |
| Content padding (tablet) | 24px |
| Content padding (mobile) | 16px |

### 4.3 Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### 4.4 Grid
- Desktop: 12 columns
- Tablet: 6 columns
- Mobile: 4 columns
- Gap: `--space-6` (24px)

---

## 5. Radius, Shadows, Borders

### 5.1 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small elements (badges, chips) |
| `--radius-md` | 8px | Buttons, inputs, dropdowns |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Large cards, modals |
| `--radius-2xl` | 20px | Auth cards, hero elements |
| `--radius-full` | 9999px | Pills, avatars, circular buttons |

### 5.2 Shadows

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--shadow-xs` | `0 1px 2px rgba(15,23,42,0.04)` | `0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-sm` | `0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)` | `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-md` | `0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.06)` | `0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(15,23,42,0.06), 0 4px 6px -4px rgba(15,23,42,0.04)` | `0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.2)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(15,23,42,0.08), 0 8px 10px -6px rgba(15,23,42,0.04)` | `0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3)` |

### 5.3 Borders
- Default: `1px solid var(--border-default)`
- Strong: `1px solid var(--border-strong)`
- Focus ring: `0 0 0 2px var(--bg-surface), 0 0 0 4px var(--ring-focus)`

---

## 6. Motion

### 6.1 Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 100ms | Checkbox, radio toggle |
| `--duration-normal` | 150ms | Hover states, focus rings |
| `--duration-moderate` | 200ms | Dropdowns, tooltips |
| `--duration-slow` | 300ms | Modals, page transitions |
| `--duration-slower` | 500ms | Skeleton fades |

### 6.2 Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| `--ease-out` | `ease-out` | Exit animations |
| `--ease-in-out` | `ease-in-out` | Looping animations |

### 6.3 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Iconography

### 7.1 Library
**Lucide React** (`lucide-react`) — single source of truth for all icons.

### 7.2 Sizes & Stroke

| Size | Usage | Stroke Width |
|------|-------|-------------|
| 16px | Inline with small text, badges | 1.75 |
| 20px | Sidebar items, buttons | 1.75 |
| 24px | Section headers, standalone | 1.75 |

### 7.3 Emoji → Icon Mapping (from Phase 1)

| Emoji | Replacement | Lucide Component |
|-------|------------|-----------------|
| 👋 | Wave/greeting | `Hand` |
| 📚 | Books/materials | `BookOpen` |
| 📖 | Reading material | `BookOpenText` |
| ⚠️ | Warning | `AlertTriangle` |
| ✅ | Success/selected | `CheckCircle2` |
| ✏️ / 📝 | Edit/write | `Pencil` / `FileText` |
| 🎓 | Academic | `GraduationCap` |
| 👨‍🏫 / 👩‍🏫 | Teacher | `Users` |
| 🤖 / AI | AI features | `Sparkles` |
| ❌ | Error/close | `X` / `XCircle` |
| 🔔 | Notifications | `Bell` |
| 🔍 | Search | `Search` |
| ⚙️ | Settings | `Settings` |
| 📊 | Analytics | `BarChart3` |
| 💬 | Chat/messages | `MessageSquare` |
| 🏠 | Home | `Home` |
| ➕ | Add/create | `Plus` |
| 🗑️ | Delete | `Trash2` |

### 7.4 Icon Rules
- Decorative icons: `aria-hidden="true"`
- Icon-only buttons: must have `aria-label="<action>"`
- Always use `className` for sizing, not inline `width`/`height` props
- Use `currentColor` for stroke (default in Lucide)

---

## 8. Component Specs

### 8.1 Button

| Variant | Background | Text | Border | Hover BG |
|---------|-----------|------|--------|----------|
| **Primary** | `var(--primary)` | `white` | none | `var(--primary-hover)` |
| **Secondary** | `transparent` | `var(--text-primary)` | `var(--border-default)` | `var(--bg-sunken)` |
| **Ghost** | `transparent` | `var(--text-secondary)` | none | `var(--bg-sunken)` |
| **Destructive** | `error-600` | `white` | none | `error-700` |
| **Link** | `transparent` | `var(--primary)` | none | underline |

| Size | Padding | Font Size | Height | Radius |
|------|---------|-----------|--------|--------|
| `sm` | 6px 12px | 13px | 32px | `--radius-md` |
| `md` | 10px 20px | 14px | 40px | `--radius-md` |
| `lg` | 12px 24px | 16px | 48px | `--radius-md` |

**States:**
- Focus: `box-shadow: var(--focus-ring)`
- Disabled: `opacity: 0.5; cursor: not-allowed`
- Loading: spinner replaces icon, `pointer-events: none`

### 8.2 Input / Textarea / Select

| Property | Value |
|----------|-------|
| Height (input) | 40px |
| Padding | 10px 14px |
| Border | 1.5px solid `var(--border-default)` |
| Radius | `--radius-md` (8px) |
| Font size | 14px |
| Background | `var(--bg-surface)` |
| Focus border | `var(--primary)` |
| Focus ring | `0 0 0 3px rgba(99,102,241,0.12)` |
| Error border | `error-500` |
| Disabled | `opacity: 0.5; background: var(--bg-sunken)` |

### 8.3 Card

| Property | Value |
|----------|-------|
| Background | `var(--bg-surface)` |
| Border | 1px solid `var(--border-default)` |
| Radius | `--radius-lg` (12px) |
| Shadow | `var(--shadow-sm)` |
| Padding | 16–24px |
| Hover shadow | `var(--shadow-md)` |
| Hover transform | `translateY(-2px)` |

### 8.4 Modal / Dialog

| Property | Value |
|----------|-------|
| Overlay BG | `rgba(2,6,23,0.5)` light / `rgba(0,0,0,0.6)` dark |
| Backdrop filter | `blur(4px)` |
| Modal BG | `var(--bg-elevated)` |
| Radius | `--radius-xl` (16px) |
| Shadow | `var(--shadow-xl)` |
| Padding | 24–32px |
| Max width | 500px |
| Enter animation | fade + `translateY(8px)` → center, 200ms |
| Exit animation | fade + center → `translateY(4px)`, 150ms |

### 8.5 Toast / Notification

| Variant | Border-left | Icon | Background |
|---------|------------|------|-----------|
| Success | `success-500` | `CheckCircle2` | `success-50` / `success-950` |
| Warning | `warning-500` | `AlertTriangle` | `warning-50` / `warning-950` |
| Error | `error-500` | `XCircle` | `error-50` / `error-950` |
| Info | `info-500` | `Info` | `info-50` / `info-950` |

### 8.6 Badge / Chip

| Property | Value |
|----------|-------|
| Padding | 4px 10px |
| Radius | `--radius-full` |
| Font size | 12px |
| Font weight | 600 |
| Variants | Primary BG, Accent BG, Success BG, Neutral BG |

### 8.7 Avatar

| Size | Dimensions | Font Size | Radius |
|------|-----------|-----------|--------|
| `sm` | 28px | 11px | `full` |
| `md` | 36px | 13px | `full` |
| `lg` | 48px | 18px | `full` |

Background: `var(--primary)`, Text: `white`, Font weight: 700

### 8.8 Tabs

| State | Style |
|-------|-------|
| Default | `text-secondary`, no border |
| Hover | `text-primary`, subtle bg |
| Active | `text-primary`, `border-bottom: 2px solid var(--primary)`, font-weight 600 |

### 8.9 Navbar

| Property | Value |
|----------|-------|
| Height | 64px |
| Position | fixed, top |
| Background | `var(--bg-surface)` |
| Border bottom | 1px solid `var(--border-default)` |
| Shadow | `var(--shadow-xs)` |
| Z-index | 1000 |

### 8.10 Sidebar

| Property | Value |
|----------|-------|
| Width | 260px |
| Position | fixed, top 64px |
| Background | `var(--bg-surface)` |
| Border right | 1px solid `var(--border-default)` |
| Z-index | 900 |
| Link padding | 10px 12px |
| Link radius | `--radius-md` |
| Active BG | `var(--primary-bg)` |
| Active color | `var(--primary)` |

### 8.11 Table Row

| Property | Value |
|----------|-------|
| Border bottom | 1px solid `var(--border-default)` |
| Padding | 12px 16px |
| Hover BG | `var(--bg-sunken)` |
| Header font | 13px, 600, `text-secondary`, uppercase |

### 8.12 Skeleton Loader

| Property | Value |
|----------|-------|
| Background | `var(--bg-sunken)` |
| Animation | pulse, 1.5s `ease-in-out` infinite |
| Radius | Match target element |
| Opacity | Light: 1, Dark: 0.5 |

### 8.13 Empty State

| Property | Value |
|----------|-------|
| Icon size | 48px |
| Icon color | `text-muted` |
| Title | `h3` style |
| Description | `body-sm`, `text-secondary` |
| CTA | Primary button, sm size |

### 8.14 AI-Specific Components

#### AI Message Bubble
- Background: `var(--accent-bg)` with subtle gradient border
- Border: 1px solid `accent-200` / `accent-800`
- Icon: `Sparkles` (16px) in `accent-500` color
- Radius: `--radius-lg`

#### AI Suggestion Card
- Background: gradient from `accent-50` to `primary-50` / dark equivalents
- Left border: 3px solid `accent-500`
- Icon: `Sparkles` in header

#### AI Loading Shimmer
- Gradient: `accent-100` → `accent-200` → `accent-100` sweep
- Duration: 1.5s
- Three animated bars at different widths (100%, 80%, 60%)

---

## 9. Accessibility

### 9.1 Contrast Requirements
- Body text: ≥ 4.5:1 against background
- Large text (≥18px bold or ≥24px): ≥ 3:1
- UI components (borders, icons): ≥ 3:1
- Placeholder text: ≥ 3:1 is ideal, minimum informational

### 9.2 Focus Ring
```css
--focus-ring: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--ring-focus);
```
- Applied via `:focus-visible` (not `:focus`)
- Offset: 2px from element edge
- Color: `var(--ring-focus)` — `primary-500` light / `primary-400` dark

### 9.3 Touch Targets
- Minimum interactive size: 44×44px
- If visually smaller, expand hit area with padding or `::after` pseudo-element

### 9.4 ARIA Patterns
- Icon-only buttons: `aria-label="<action>"` (e.g., `aria-label="Close"`)
- Decorative icons: `aria-hidden="true"`
- Loading states: `aria-busy="true"`
- Expandable elements: `aria-expanded="true|false"`
- Modal: `role="dialog"`, `aria-modal="true"`, trap focus
