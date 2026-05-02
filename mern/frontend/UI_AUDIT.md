# UI Audit Report — AICo Smart Classroom

> **Date:** 2026-05-02  
> **Scope:** `mern/frontend/src/` — React + Vite + TypeScript  
> **Status:** Phase 1 Discovery (read-only, no code changes)

---

## 1. File Inventory

### Pages (`src/pages/`) — 13 pages, each with co-located CSS

| # | Component File | CSS File | Lines (TSX) | Lines (CSS) |
|---|---------------|----------|-------------|-------------|
| 1 | `Dashboard.tsx` | `Dashboard.css` | 204 | 375 |
| 2 | `Enrolled.tsx` | `Enrolled.css` | ~700 | ~900 |
| 3 | `Login.tsx` | `Login.css` | 162 | 323 |
| 4 | `Signup.tsx` | `Signup.css` | ~200 | 291 |
| 5 | `TeacherPanel.tsx` | `TeacherPanel.css` | ~450 | 47 |
| 6 | `TeacherCourse.tsx` | `TeacherCourse.css` | ~1500 | ~700 |
| 7 | `TeacherCreateAssignment.tsx` | `TeacherCreateAssignment.css` | ~350 | ~300 |
| 8 | `TeacherPlagiarismReport.tsx` | `TeacherPlagiarismReport.css` | ~280 | ~50 |
| 9 | `StudentPanel.tsx` | `StudentPanel.css` | ~750 | 525 |
| 10 | `StudentAssignment.tsx` | `StudentAssignment.css` | ~650 | ~350 |
| 11 | `StudentMaterials.tsx` | `StudentMaterials.css` | ~280 | ~250 |
| 12 | `JamboardEditor.tsx` | `JamboardEditor.css` | ~650 | ~120 |
| 13 | `ToDo.tsx` | `ToDo.css` | ~350 | ~500 |

### Components (`src/components/`) — 4 components + 1 layout

| Component | CSS | Purpose |
|-----------|-----|---------|
| `Navbar.tsx` | `Navbar.css` | Fixed top navbar with search, notifications, profile dropdown |
| `Sidebar.tsx` | `Sidebar.css` | Fixed left sidebar with navigation links |
| `Layout.tsx` | — | Wraps Navbar + Sidebar + `<Outlet>` |
| `ThemeToggle.tsx` | `ThemeToggle.css` | Dark/light mode toggle button + ThemeProvider context |
| `JoinCourse.tsx` | `JoinCourse.css` | FAB + modal to join a course by invite code |

### Auth (`src/auth/`) — 3 files

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | Auth context provider (login state, user object) |
| `ProtectedRoute.tsx` | Route guard for logged-in users |
| `PublicOnlyRoute.tsx` | Route guard for public-only pages (Login/Signup) |

### Lib (`src/lib/`) — 1 file

| File | Purpose |
|------|---------|
| `api.ts` | Central `apiFetch` wrapper |

### Voice (`src/voice/`) — 5 components + 4 hooks + 1 type file

| File | Purpose |
|------|---------|
| `VoiceChannel.tsx` | Voice/video channel UI |
| `VoiceControls.tsx` | Mute/unmute/leave controls |
| `ConfirmModal.tsx` | Confirmation dialog |
| `CreateChannelModal.tsx` + `.css` | Channel creation modal |
| `useLiveKit.ts`, `useMediaSoup.ts`, `useWebRTC.ts`, `useSoundEffects.ts` | Hooks |

### Global Styles

| File | Purpose |
|------|---------|
| `index.css` | Global reset, `:root` variables, `.dark` base |
| `App.css` | Nearly empty (comment only) |
| `style.css` (root) | Large compiled/generated file (68 KB) — likely unused output |

### Styling Approach
- **Plain CSS** with CSS custom properties (`var(--x)`)
- **No Tailwind, no CSS modules, no styled-components**
- CSS variables redefined per-page (scoped to page wrapper class)
- Dark mode via `.dark` class toggled on `<html>` + wrapper `<div>`

---

## 2. Emoji Locations

| File | Line | Emoji | Context |
|------|------|-------|---------|
| `Dashboard.tsx` | 116 | 👋 | `Welcome back, {name} 👋` |
| `Enrolled.tsx` | 301 | 📚 | `"📚 No course materials have been indexed yet..."` |
| `Enrolled.tsx` | 302 | 👋 | `"👋 Hi! I'm your Course AI Assistant."` |
| `Enrolled.tsx` | 309 | ⚠️ | `"⚠️ Could not load course materials..."` |
| `Enrolled.tsx` | 350 | ✅ | `"✅ You selected '${mat.title}'..."` |
| `Enrolled.tsx` | 363 | ⚠️ | `"⚠️ Please select a material first..."` |
| `Enrolled.tsx` | 393 | ⚠️ | `"⚠️ Error connecting to AI..."` |
| `Enrolled.tsx` | 682 | 📖 | `{selectedMaterial ? \`📖 ${selectedMaterial.title}\` : courseName}` |

**Total: 8 emoji instances across 2 files**

---

## 3. Current Design Language

### Fonts
- **Primary:** Inter (loaded via `@import url(...)` in multiple CSS files — duplicated import)
- **Fallback stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Weights used:** 300, 400, 500, 600, 700, 800

### Colors — Light Mode

| Token | Login/Signup | Dashboard | index.css | JoinCourse |
|-------|-------------|-----------|-----------|------------|
| `--primary` | `#2563EB` | `#2563EB` | — | `#4f46e5` (hardcoded!) |
| `--primary-dark` | `#1D4ED8` | `#1D4ED8` | — | `#4338ca` (hardcoded!) |
| `--bg` | `#F8FAFC` | `#F8FAFC` | `#F8FAFC` | — |
| `--card` | `#FFFFFF` | `#FFFFFF` | — | `#f9f9f9` (hardcoded!) |
| `--text-primary` | `#0F172A` | `#0F172A` | `#0F172A` | — |
| `--text-secondary` | `#64748B` | **`#1d1d1f`** | **`#33363b`** | — |
| `--text-muted` | `#94A3B8` | `#94A3B8` | — | — |
| `--border` | `#E2E8F0` | `#E2E8F0` | — | `#ccc` (hardcoded!) |

### Colors — Dark Mode

| Token | Login/Signup | Dashboard |
|-------|-------------|-----------|
| `--text-secondary` | `#94A3B8` | **`#ffffff`** (!) |
| `--card` | `#1E293B` | `#1E293B` |

### Spacing
- Page padding: 32px (dashboard), 24px (login/signup)
- Card padding: 48px (login/signup), 16px (dashboard), 30px/24px (JoinCourse modal)
- Grid gap: 24px (courses), 16px (stats), 10–14px (misc)
- No consistent spacing scale

### Border Radius (inconsistent)
- `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, `20px` — all used
- `50%`, `999px`, `9999px` — three different "full circle" notations
- No tokenized radius system

### Shadows
- Light: `0 1px 3px rgba(15,23,42,0.06)` (subtle)
- Medium: `0 8px 24px rgba(2,6,23,0.12)` (dropdown)
- Heavy: `0 20px 25px -5px rgba(15,23,42,0.08)` (cards on auth pages)
- Inconsistent — each page defines its own shadow values

### Icons
- **All inline SVG** — no icon library
- SVG sizes: 16px, 18px, 20px, 24px, 32px (mixed)
- `strokeWidth`: mostly 2, but inconsistent
- No `aria-hidden` or `aria-label` on icon buttons

---

## 4. Inconsistencies Found

### Critical

| Issue | Details |
|-------|---------|
| **`--text-secondary` conflict** | Defined as `#64748B` (Login), `#1d1d1f` (Dashboard light), `#33363b` (index.css), `#ffffff` (Dashboard dark). Text color is inconsistent across pages. |
| **Two primary color families** | Login/Signup/Dashboard use `#2563EB` (blue-600). JoinCourse uses `#4f46e5` (indigo-600). Different hue entirely. |
| **Hardcoded colors** | `JoinCourse.css` and `ThemeToggle.css` use raw hex values instead of CSS variables — no dark mode support in JoinCourse modal. |
| **No dark mode** for JoinCourse | Modal overlay uses `rgba(240,240,240,0.9)` — glaring white in dark mode. |
| **CSS variable scope collision** | Dashboard.css redefines `:root` variables, potentially overriding Login/Signup values on pages where both CSS files load. |

### Moderate

| Issue | Details |
|-------|---------|
| **Duplicated Google Fonts import** | `@import url('...Inter...')` appears in Login.css, Signup.css, Dashboard.css, Navbar.css (4 times). |
| **Duplicated `.btn` styles** | `.btn` is defined differently in Login.css (width: 100px) and Dashboard.css (no fixed width). |
| **Duplicated `.form-group`** | Defined in Login.css, Signup.css, and TeacherPanel.css with slightly different gaps. |
| **Inconsistent border-radius** | 8px, 10px, 12px, 14px, 16px, 20px all in active use — no token system. |
| **Three circle-radius notations** | `50%`, `999px`, `9999px` used interchangeably for pills/circles. |
| **Positioned elements w/ magic numbers** | `#active-text { right: -112px }`, `#enrolled-text { right: -245px; top: -34px }` — fragile positioning that breaks on different content lengths. |

### Minor

| Issue | Details |
|-------|---------|
| **No shared component CSS** | Button, Card, Input components have no centralized styles — each page reimplements. |
| **Missing focus states** | Most interactive elements lack visible focus indicators (except form inputs). |
| **No `cursor: pointer`** on some clickable elements | Several cards and buttons lack cursor pointer. |
| **`transition-duration: all 2s ease`** in ThemeToggle.css | Invalid CSS property; `transition-duration` takes only a time value. |
| **Duplicate Sidebar.css import** | `Sidebar.tsx` imports `./Sidebar.css` twice (line 1 and line 3). |

---

## 5. Proposed Improvements

### Global Foundation
1. **Centralize design tokens** — Create a single `variables.css` with all colors, spacing, radii, shadows for both light/dark modes.
2. **Remove duplicate `@import url(...)` for Inter** — Load once in `index.html` or `index.css`.
3. **Install `lucide-react`** — Replace all inline SVGs and emojis with consistent Lucide icons.
4. **Create shared component CSS** — `Button.css`, `Card.css`, `Input.css`, `Modal.css`, `Badge.css`.

### Auth Pages (Login / Signup)
- Already well-designed; minor polish: add subtle entry animation, standardize `border` to `beige` on Google button is a bug.
- Replace inline SVG eye toggle with Lucide `Eye`/`EyeOff`.

### Dashboard
- Remove 👋 emoji → Lucide `Hand` or just text.
- Fix `#active-text` and `#enrolled-text` magic positioning → use flexbox.
- Standardize card component design.

### Enrolled (AI Chat Page)
- Remove all emojis (📚, 👋, ⚠️, ✅, 📖) → Lucide icons or plain text.
- Redesign chat interface with modern chat bubble styling.

### Navbar
- Replace inline SVGs → Lucide `Search`, `Bell`, `Sun`/`Moon`, `ChevronDown`.
- Add `aria-label` to all icon buttons.

### Sidebar
- Replace inline SVGs → Lucide `LayoutDashboard`, `Users`, `BookOpen`, `CheckSquare`, `PenTool`, `Settings`.
- Fix duplicate CSS import.

### JoinCourse
- Use CSS variables instead of hardcoded colors.
- Add dark mode support.
- Add backdrop blur to modal overlay.

### ThemeToggle
- Fix invalid `transition-duration: all 2s ease` → remove the duplicate line.
- Use CSS variables instead of hardcoded hex values.

### All Pages
- Consolidate border-radius to 3 tokens: `8px` (sm), `12px` (md), `16px` (lg).
- Standardize shadows to 3 levels: `sm`, `md`, `lg`.
- Add consistent hover/focus states.
- Add `aria-hidden="true"` to decorative icons.
- Add `aria-label` to icon-only buttons.

---

## 6. Risk Notes

| Risk | Mitigation |
|------|------------|
| CSS variable scope collision when redefining `:root` | Move all token definitions to a single source of truth imported first. |
| `JoinCourse` uses hardcoded colors — dark mode will look broken | Refactor to use theme variables. |
| Magic-number positioning (`right: -112px`, `right: -245px`) | Replace with flexbox layout — test carefully on different course name lengths. |
| Voice components (`VoiceChannel.tsx`, `VoiceControls.tsx`) contain complex UI | These should be refactored last and tested thoroughly as they involve real-time WebRTC state. |
| `style.css` at project root (68 KB) | Likely a build artifact or unused — verify before removing. |
| Inline SVGs in `Enrolled.tsx` within chat bot messages | These are string interpolations, not JSX — will need different treatment than JSX icon replacement. |
