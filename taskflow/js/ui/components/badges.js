// ═══════════════════════════════════════════════════
// TaskFlow v2 — Component: Badges
// ═══════════════════════════════════════════════════

export function PriorityBadge(priority) {
  const map = {
    'critical': { text: 'CRITICAL', class: 'critical', icon: '🔥' },
    'high':     { text: 'HIGH',     class: 'high',     icon: '⬆️' },
    'medium':   { text: 'MEDIUM',   class: 'medium',   icon: '⏸️' },
    'low':      { text: 'LOW',      class: 'low',      icon: '⬇️' }
  };
  const config = map[priority] || map['medium'];
  return `<span class="priority-badge ${config.class}">${config.icon} ${config.text}</span>`;
}

export function StatusBadge(status) {
  const map = {
    'todo':        { text: 'To Do',       class: 'todo' },
    'in-progress': { text: 'In Progress', class: 'in-progress' },
    'review':      { text: 'Review',      class: 'review' },
    'done':        { text: 'Done',        class: 'done' },
    'blocked':     { text: 'Blocked',     class: 'blocked' }
  };
  const config = map[status] || map['todo'];
  return `<span class="status-badge ${config.class}"><div class="badge-dot dot-${config.class}"></div>${config.text}</span>`;
}
