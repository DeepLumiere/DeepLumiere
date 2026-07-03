// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: List
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { formatShortDate, isOverdue } from '../../utils/helpers.js';
import { StatusBadge, PriorityBadge } from '../components/badges.js';
import { getInitials, stringToColor } from '../../utils/helpers.js';
import { Router } from '../router.js';

let _unsubTasks = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">List</h1>
        <p class="text-sm text-muted mt-1">All tasks in a dense view.</p>
      </div>
    </div>
    
    <div class="view-container" style="max-width: 1400px; padding: var(--sp-4) var(--sp-6);">
      <div class="card p-0" style="overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border-subtle); background:var(--color-surface-2);">
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Task</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:140px;">Status</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:120px;">Priority</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:120px;">Assignee</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:120px;">Due</th>
            </tr>
          </thead>
          <tbody id="list-table-body">
            <tr><td colspan="5" class="p-6 text-center text-muted">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  _unsubTasks = State.subscribe('tasks', () => updateList());

  return function unmount() {
    if (_unsubTasks) _unsubTasks();
  };
}

function updateList() {
  const tbody = document.getElementById('list-table-body');
  if (!tbody) return;

  const tasks = State.get('tasks') || [];
  const projects = State.get('projects') || [];
  const members = State.get('members') || [];

  if (tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-muted">No tasks found.</td></tr>`;
    return;
  }

  // Group by project (optional, we'll just sort for now)
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  tbody.innerHTML = sorted.map(t => {
    const p = projects.find(x => x.id === t.projectId);
    const m = members.find(x => x.userId === t.assigneeId);
    
    let dueStr = '-';
    let dueCol = 'inherit';
    if (t.dueDate) {
      dueStr = formatShortDate(t.dueDate);
      if (isOverdue(t.dueDate) && t.status !== 'done') dueCol = 'var(--color-danger)';
    }

    let memHtml = '<span class="text-xs text-muted">Unassigned</span>';
    if (m) {
      memHtml = `
        <div class="flex items-center gap-2">
          <div class="avatar avatar-xs" style="background:${m.photoURL ? 'transparent' : stringToColor(m.name)}">
            ${m.photoURL ? `<img src="${m.photoURL}" style="width:100%;height:100%;object-fit:cover"/>` : getInitials(m.name)}
          </div>
          <span class="text-sm truncate" style="max-width:80px;">${m.name.split(' ')[0]}</span>
        </div>
      `;
    }

    return `
      <tr class="hover:bg-surface-2 cursor-pointer list-row" data-id="${t.id}" style="border-bottom:1px solid var(--color-border-subtle); transition:background var(--t-fast);">
        <td style="padding:var(--sp-3) var(--sp-4);">
          <div class="font-medium text-sm truncate" style="max-width:300px; ${t.status === 'done' ? 'text-decoration:line-through; color:var(--color-text-muted);' : ''}">${t.title}</div>
          ${p ? `<div class="text-xs text-muted truncate mt-1">${p.name}</div>` : ''}
        </td>
        <td style="padding:var(--sp-3) var(--sp-4);">${StatusBadge(t.status)}</td>
        <td style="padding:var(--sp-3) var(--sp-4);">${PriorityBadge(t.priority)}</td>
        <td style="padding:var(--sp-3) var(--sp-4);">${memHtml}</td>
        <td style="padding:var(--sp-3) var(--sp-4); font-size:0.8125rem; color:${dueCol};">${dueStr}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.list-row').forEach(row => {
    row.addEventListener('click', () => {
      Router.go(`#/task/${row.dataset.id}`);
    });
  });
}
