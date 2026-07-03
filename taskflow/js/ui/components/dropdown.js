// ═══════════════════════════════════════════════════
// TaskFlow v2 — Dropdown Utility
// Generic, reusable managed dropdown component.
// ═══════════════════════════════════════════════════

/**
 * Creates a managed dropdown menu attached to a trigger element.
 * Handles open/close, click-outside, and keyboard navigation.
 *
 * @param {HTMLElement} trigger  - The element that toggles the dropdown
 * @param {HTMLElement} menu     - The dropdown menu element (has .dropdown-menu class)
 * @param {Object}      options
 * @param {function}    options.onOpen   - Called when dropdown opens
 * @param {function}    options.onClose  - Called when dropdown closes
 * @param {boolean}     options.closeOnSelect - Close after any dropdown-item click (default true)
 * @returns {{ open, close, toggle, destroy }} Controller object
 */
export function createDropdown(trigger, menu, options = {}) {
  const { onOpen, onClose, closeOnSelect = true } = options;
  
  let isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    menu.classList.add('open');
    if (onOpen) onOpen();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove('open');
    if (onClose) onClose();
  }

  function toggle(e) {
    e.stopPropagation();
    isOpen ? close() : open();
  }

  function handleOutsideClick(e) {
    if (!menu.contains(e.target) && e.target !== trigger) {
      close();
    }
  }

  function handleItemClick(e) {
    if (closeOnSelect && e.target.closest('.dropdown-item')) {
      close();
    }
  }

  function handleKeyDown(e) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      close();
      trigger.focus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...menu.querySelectorAll('.dropdown-item:not([disabled])')];
      const focused = document.activeElement;
      const idx = items.indexOf(focused);
      
      if (e.key === 'ArrowDown') {
        const next = items[idx + 1] || items[0];
        next?.focus();
      } else {
        const prev = items[idx - 1] || items[items.length - 1];
        prev?.focus();
      }
    }
  }

  // Bind events
  trigger.addEventListener('click', toggle);
  document.addEventListener('click', handleOutsideClick);
  menu.addEventListener('click', handleItemClick);
  document.addEventListener('keydown', handleKeyDown);

  // Make items focusable for keyboard nav
  menu.querySelectorAll('.dropdown-item').forEach(item => {
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', '0');
    }
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  // Controller API
  return {
    open,
    close,
    toggle: (e) => { e.stopPropagation(); isOpen ? close() : open(); },
    destroy() {
      trigger.removeEventListener('click', toggle);
      document.removeEventListener('click', handleOutsideClick);
      menu.removeEventListener('click', handleItemClick);
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
}

/**
 * A simpler version for inline dropdowns already in the DOM.
 * Scans all .dropdown elements and auto-wires them.
 * Call once per view mount, or let components manage their own.
 */
export function autoBindDropdowns(rootEl = document) {
  rootEl.querySelectorAll('.dropdown').forEach(dropdownEl => {
    const trigger = dropdownEl.querySelector('[data-dropdown-trigger]') || dropdownEl.firstElementChild;
    const menu = dropdownEl.querySelector('.dropdown-menu');
    if (trigger && menu) {
      createDropdown(trigger, menu);
    }
  });
}
