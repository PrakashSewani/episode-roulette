const STYLE_ID = 'ep-roulette-styles'

const CSS = `
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

.ep-roulette-icon {
  font-size: 18px;
  line-height: 1;
}

.ep-roulette-text {
  line-height: 1;
}

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

.ep-roulette-btn[data-phase="spawn"] {
  position: absolute;
  left: 4%;
  bottom: 8%;
  z-index: 2;
}

@keyframes ep-roulette-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
  100% { content: ''; }
}

.ep-roulette-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  font-family: var(--font-family, 'Helvetica Neue', Helvetica, Arial, sans-serif);
  font-size: 14px;
  z-index: 9999;
  animation: ep-roulette-toast-in 0.3s ease;
}

.ep-roulette-toast[data-kind="status"] {
  border-left: 4px solid #46d369;
}

.ep-roulette-toast[data-kind="error"] {
  border-left: 4px solid #e50914;
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

.ep-roulette-btn[data-state="error"] {
  opacity: 0.7;
  cursor: pointer;
  pointer-events: auto;
}

.ep-roulette-btn[data-state="error"]::after {
  content: '\\26A0';
  margin-left: 4px;
  font-size: 14px;
}

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
`

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  ;(document.head ?? document.documentElement).append(style)
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove()
}
