// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Timeline (Gantt-lite)
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';

let _unsubTasks = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Timeline</h1>
        <p class="text-sm text-muted mt-1">Visualize tasks over time.</p>
      </div>
    </div>
    <div class="view-container">
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <h2 class="empty-state__title">Coming Soon</h2>
        <p class="empty-state__desc">The Timeline view is scheduled for a future update.</p>
      </div>
    </div>
  `;

  // We could implement a full dhtmlxGantt or similar here, 
  // but keeping it as a placeholder for this architectural phase.

  return function unmount() {
    if (_unsubTasks) _unsubTasks();
  };
}
