# Agent Guidelines & Design System

## UI/UX Pro Max Intelligence

This project utilizes the `ui-ux-pro-max` design intelligence skill located in `.agents/skills/ui-ux-pro-max/`.

### Active Design System
The Master Design System for this workspace is persisted at:
- **Master Design System**: [MASTER.md](file:///c:/Users/dell/Desktop/Intern_Portal/design-system/uptoskill-intern-portal/MASTER.md)
- **Chatbot Page Overrides**: [chatbot.md](file:///c:/Users/dell/Desktop/Intern_Portal/design-system/uptoskill-intern-portal/pages/chatbot.md)

When designing, refactoring, or building UI components and pages in this repository, check `design-system/uptoskill-intern-portal/pages/[page].md` first. If it exists, its rules override `MASTER.md`. Otherwise, follow `MASTER.md`.

---

## Core UI/UX Rules & Anti-Patterns

1. **No Emojis as Icons**:
   - ❌ Never use raw emojis (`💬`, `🤖`, `👉`, `✕`) for UI controls or status indicators.
   - ✅ Always use accessible, scalable inline SVG icons (Phosphor, Heroicons, or Lucide).
2. **Keyboard Focus & Visibility**:
   - ❌ Never use `outline: none` without providing an immediate visible replacement.
   - ✅ Provide visible `:focus-visible` rings with at least 2px thickness and high contrast (e.g. `outline: 2px solid var(--primary)`).
3. **Accessibility & Semantic Elements**:
   - ❌ Do not use non-interactive elements (`div`, `span`) for click handlers without keyboard event listeners, ARIA roles, and tabindex.
   - ✅ Use semantic HTML buttons (`<button type="button">`), labels, and `aria-label` / `aria-expanded` attributes.
4. **Motion & Reduced Motion**:
   - ❌ Do not create infinite, distracting animations without user control.
   - ✅ Always honor `@media (prefers-reduced-motion: reduce)` by disabling or clamping animations and transitions.
5. **Interactive Cursors & Feedback**:
   - ✅ All interactive controls must explicitly specify `cursor: pointer`.
   - ✅ Smooth transitions must be scoped (150–250ms) to avoid layout-shifting hover scales.
6. **Contrast**:
   - ✅ Ensure a minimum contrast ratio of 4.5:1 for standard text and 3:1 for large text / UI borders.

---

## Running UI/UX Pro Max CLI Queries

To search for tailored design patterns, palettes, or stack advice:
```bash
# Design system generation
python .agents/skills/ui-ux-pro-max/scripts/search.py "<product_query>" --design-system

# Targeted domain queries (style, color, chart, landing, product, ux, typography, icons, gsap, react, web)
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>

# Stack-specific best practices (react, html-tailwind, etc.)
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```
