// ═══════════════════════════════════════════════════
// TaskFlow v2 — Toast Notifications
// ═══════════════════════════════════════════════════

/**
 * Toast Notification System
 * Handles queued toast messages that auto-dismiss.
 */

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
  }
}

// Icons for different toast types
const ICONS = {
  success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

const DEFAULT_TITLES = {
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
  info:    'Info'
};

export const Toast = {
  /**
   * Show a toast notification
   * @param {string} message - The message text
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration - Time in ms before auto-dismiss
   */
  show(message, type = 'info', duration = 4000) {
    ensureContainer();
    
    // Create element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast__icon">${ICONS[type] || ICONS.info}</div>
      <div class="toast__body">
        <div class="toast__title">${DEFAULT_TITLES[type]}</div>
        <div class="toast__message">${message}</div>
      </div>
      <div class="toast__close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
      <div class="toast__progress" style="animation: progress ${duration}ms linear forwards;"></div>
    `;

    // Style injected for the progress bar animation
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.innerHTML = `@keyframes progress { from { width: 100%; } to { width: 0%; } }`;
      document.head.appendChild(style);
    }

    container.appendChild(toast);

    // Force reflow and add visible class for animation
    toast.getBoundingClientRect();
    toast.classList.add('visible');

    // Close button event
    const closeBtn = toast.querySelector('.toast__close');
    let timeout;
    
    const dismiss = () => {
      clearTimeout(timeout);
      toast.classList.remove('visible');
      toast.classList.add('hiding');
      // Wait for transform animation to finish before removing from DOM
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 400); // Matches var(--t-bounce) / var(--t-normal)
    };

    closeBtn.addEventListener('click', dismiss);

    // Auto dismiss
    timeout = setTimeout(dismiss, duration);

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      clearTimeout(timeout);
      const progress = toast.querySelector('.toast__progress');
      if (progress) progress.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const progress = toast.querySelector('.toast__progress');
      if (progress) {
        // Just remove progress bar on resume for simplicity,
        // or recalculate remaining time. We'll just dismiss after 2s.
        progress.style.display = 'none'; 
      }
      timeout = setTimeout(dismiss, 2000);
    });

    // Limit to max 3 toasts visible at once to avoid screen clutter
    const allToasts = container.querySelectorAll('.toast');
    if (allToasts.length > 3) {
      allToasts[0].querySelector('.toast__close').click();
    }
  }
};
