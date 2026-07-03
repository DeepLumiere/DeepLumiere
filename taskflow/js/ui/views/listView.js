// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: List
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { formatShortDate, isOverdue } from '../../utils/helpers.js';
import { StatusBadge, PriorityBadge } from '../components/badges.js';
import { getInitials, stringToColor } from '../../utils/helpers.js';
import { Router } from '../router.js';
import { createTask } from '../../db/tasks.js';
import { Toast } from '../toast.js';

let _unsubTasks = null;

export async function render(container) {
  const projects = State.get('projects') || [];
  const members = State.get('members') || [];

  const projOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const memOptions = members.map(m => `<option value="${m.userId}">${m.name}</option>`).join('');

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div class="flex justify-between w-full items-center">
        <div>
          <h1 class="view-title">List</h1>
          <p class="text-sm text-muted mt-1">All tasks in a dense view.</p>
        </div>
        <button class="btn btn-primary" id="btn-toggle-new-task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>
    </div>
    
    <div class="view-container" style="max-width: 1400px; padding: var(--sp-4) var(--sp-6);">
      <!-- Inline Task Form -->
      <div id="inline-task-form" class="card mb-6 hidden" style="background: var(--color-surface-2);">
        <div class="flex-col gap-4">
          <div class="form-group mb-0">
            <input type="text" class="form-input text-lg font-semibold" id="itask-title" placeholder="Task title..." style="border-color:transparent; background:var(--color-surface-3);" autofocus>
          </div>
          <div class="two-col-grid" style="gap:var(--sp-4); margin-top: var(--sp-3);">
            <div class="form-group">
              <label class="form-label">Project</label>
              <select class="form-select" id="itask-project">
                <option value="">No Project</option>
                ${projOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assignee</label>
              <select class="form-select" id="itask-assignee">
                <option value="">Unassigned</option>
                ${memOptions}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="itask-priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input type="date" class="form-input" id="itask-due">
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="itask-desc" placeholder="Add details..." rows="2"></textarea>
          </div>
          <div class="flex justify-end gap-3 mt-4">
            <button class="btn btn-ghost" id="btn-cancel-task">Cancel</button>
            <button class="btn btn-primary" id="btn-save-task">Create Task</button>
          </div>
        </div>
      </div>

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

  // Bind Inline Form Events
  const btnToggle = document.getElementById('btn-toggle-new-task');
  const formPanel = document.getElementById('inline-task-form');
  const btnCancel = document.getElementById('btn-cancel-task');
  const btnSave = document.getElementById('btn-save-task');

  if (btnToggle && formPanel) {
    btnToggle.addEventListener('click', () => {
      formPanel.classList.toggle('hidden');
      if (!formPanel.classList.contains('hidden')) {
        document.getElementById('itask-title').focus();
      }
    });

    btnCancel.addEventListener('click', () => {
      formPanel.classList.add('hidden');
      document.getElementById('itask-title').value = '';
      document.getElementById('itask-desc').value = '';
      document.getElementById('itask-due').value = '';
    });

    btnSave.addEventListener('click', async () => {
      const title = document.getElementById('itask-title').value.trim();
      if (!title) { Toast.show('Title is required', 'error'); return; }
      
      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';
      
      const ws = State.get('currentWorkspace');
      const data = {
        title,
        projectId: document.getElementById('itask-project').value || null,
        assigneeId: document.getElementById('itask-assignee').value || null,
        priority: document.getElementById('itask-priority').value,
        dueDate: document.getElementById('itask-due').value ? new Date(document.getElementById('itask-due').value) : null,
        description: document.getElementById('itask-desc').value.trim()
      };

      try {
        await createTask(ws.id, data);
        Toast.show('Task created', 'success');
        formPanel.classList.add('hidden');
        document.getElementById('itask-title').value = '';
        document.getElementById('itask-desc').value = '';
      } catch (err) {
        console.error(err);
        Toast.show('Failed to create task', 'error');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Create Task';
      }
    });
  }

  // If hash has ?new=true, open it automatically
  if (window.location.hash.includes('?new=true') && formPanel) {
    formPanel.classList.remove('hidden');
    setTimeout(() => document.getElementById('itask-title').focus(), 100);
    // clean up hash
    window.history.replaceState(null, '', window.location.pathname + window.location.hash.replace('?new=true', ''));
  }

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
