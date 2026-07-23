# styles.ts — CSS Injection

## Purpose

Inject CSS that makes the Random Episode button look like a native Netflix feature.

---

## Responsibilities

1. Inject a `<style>` tag into the page
2. Define styles for the button and its states
3. Use Netflix's own CSS variables where possible
4. Match Netflix's design language (dark theme, red accent)

---

## CSS Variables (Netflix)

Netflix exposes these CSS custom properties on `:root`:

```css
:root {
  --color-primary: #e50914;       /* Netflix red */
  --color-primary-hover: #f40612;
  --color-text-primary: #ffffff;
  --color-text-secondary: #b3b3b3;
  --color-background: #141414;
  --color-background-soft: #1a1a1a;
  --font-family: 'Netflix Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --border-radius: 4px;
}
```

**Note**: These variables may not be available on all Netflix pages. Provide hardcoded fallbacks.

---

## Injected CSS

```css
/* Button base */
.ep-roulette-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  border-radius: var(--border-radius, 4px);
  background: var(--color-background-soft, #1a1a1a);
  color: var(--color-text-primary, #ffffff);
  font-family: var(--font-family, 'Helvetica Neue', Helvetica, Arial, sans-serif);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, filter 0.2s ease;
  white-space: nowrap;
  user-select: none;
}

.ep-roulette-btn:hover {
  background: var(--color-primary, #e50914);
}

.ep-roulette-btn:active {
  filter: brightness(0.8);
}

/* Icon */
.ep-roulette-icon {
  font-size: 18px;
  line-height: 1;
}

/* Text */
.ep-roulette-text {
  line-height: 1;
}

/* Loading state */
.ep-roulette-btn[data-state="loading"] {
  opacity: 0.7;
  cursor: wait;
  pointer-events: none;
}

.ep-roulette-btn[data-state="loading"] .ep-roulette-text::after {
  content: '';
  display: inline-block;
  width: 12px;
  animation: ep-roulette-dots 1.5s steps(4, end) infinite;
}

@keyframes ep-roulette-dots {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
  100% { content: ''; }
}

/* Error toast */
.ep-roulette-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  animation: ep-roulette-toast-in 0.3s ease;
}

.ep-roulette-toast-exit {
  animation: ep-roulette-toast-out 0.3s ease forwards;
}

@keyframes ep-roulette-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes ep-roulette-toast-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px); }
}

/* Error state */
.ep-roulette-btn[data-state="error"] {
  opacity: 0.7;
  cursor: pointer;
  pointer-events: auto;
}

.ep-roulette-btn[data-state="error"]::after {
  content: '⚠';
  margin-left: 4px;
  font-size: 14px;
}

/* Tooltip for error */
.ep-roulette-btn[data-state="error"]::before {
  content: attr(data-error);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #333;
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.ep-roulette-btn[data-state="error"]:hover::before {
  opacity: 1;
}
```

---

## Injection Method

```typescript
export function injectStyles(): void {
  const existing = document.getElementById('ep-roulette-styles')
  if (existing) return // Don't inject twice

  const style = document.createElement('style')
  style.id = 'ep-roulette-styles'
  style.textContent = CSS
  document.head.appendChild(style)
}

export function removeStyles(): void {
  document.getElementById('ep-roulette-styles')?.remove()
}
```

---

## Style Isolation

- All class names are prefixed with `ep-roulette-` to avoid conflicts
- No global styles modified
- All extension-owned button, tooltip, loading-animation, and toast styles are injected from this module
- `removeStyles()` is used by explicit content-script teardown in tests and HMR

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Netflix changes CSS variables | Hardcoded fallbacks kick in |
| Style tag already exists | Don't inject duplicate |
| Netflix Content Security Policy | Style injection should work (no external resources) |

---

## Testing

- Manual test: Button styling matches Netflix design
- Manual test: Hover/active states work correctly
- Manual test: Loading and error states display correctly
