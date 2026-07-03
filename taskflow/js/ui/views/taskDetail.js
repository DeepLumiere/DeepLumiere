// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Task Detail Drawer
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { updateTask, getTask } from '../../db/tasks.js';
import { Permissions } from '../../auth/permissions.js';
import { formatShortDate, formatDate } from '../../utils/helpers.js';
import { StatusBadge, PriorityBadge } from '../components/badges.js';
import { Router } from '../router.js';
import { Toast } from '../toast.js';

let _taskId = null;
let _drawerEl = null;
let _overlayEl = null;
let _unsubTask = null;

export async function openDrawer(taskId) {
  _taskId = taskId;
  _drawerEl = document.getElementById('task-drawer');
  _overlayEl = document.getElementById('drawer-overlay');
  
  if (!_drawerEl || !_overlayEl) return;

  _overlayEl.classList.remove('hidden');
  
  // Show skeleton state while loading
  renderSkeleton();
  _drawerEl.classList.add('open');
  
  // Disable body scroll
  document.body.style.overflow = 'hidden';

  // Fetch initial data if not in state
  let task = State.get('tasks').find(t => t.id === taskId);
  if (!task) {
    task = await getTask(taskId);
    if (!task) {
      Toast.show('Task not found.', 'error');
      closeDrawer();
      return;
    }
  }

  // Subscribe to task updates in State
  _unsubTask = State.subscribe('currentTask', (t) => {
    if (t && t.id === _taskId) {
      renderContent(t);
    }
  });

  State.set('currentTask', task); // triggers initial render
  
  bindEvents();
}

export function closeDrawer(updateHash = true) {
  if (_drawerEl) _drawerEl.classList.remove('open');
  if (_overlayEl) _overlayEl.classList.add('hidden');
  document.body.style.overflow = '';
  
  if (_unsubTask) {
    _unsubTask();
    _unsubTask = null;
  }
  
  State.set('currentTask', null);
  _taskId = null;

  if (updateHash) {
    // Return to the parent view
    const currentView = State.get('currentView') || 'dashboard';
    // If the hash was /task/123, go back to previous. For simplicity, go back to board if not known
    if (currentView.startsWith('task/')) {
      Router.go('#/board');
    } else {
      Router.go(`#/${currentView}`);
    }
  }
}

function renderSkeleton() {
  _drawerEl.innerHTML = `
    <div class="drawer-header">
      <div class="skeleton" style="width:70%; height:32px;"></div>
      <div class="skeleton" style="width:32px; height:32px; border-radius:4px;"></div>
    </div>
    <div class="drawer-body">
      <div class="drawer-meta-grid">
        <div class="skeleton" style="height:50px;"></div>
        <div class="skeleton" style="height:50px;"></div>
      </div>
      <div class="skeleton" style="height:100px;"></div>
      <div class="skeleton" style="height:100px;"></div>
    </div>
  `;
}

function renderContent(task) {
  if (!_drawerEl) return;
  const canEdit = Permissions.canEditTask(task);
  const projects = State.get('projects') || [];
  const project = projects.find(p => p.id === task.projectId);

  _drawerEl.innerHTML = `
    <div class="drawer-header">
      <div style="flex:1; min-width:0;">
        ${project ? `<div class="text-xs font-semibold text-muted mb-1 uppercase tracking-wide">${project.name}</div>` : ''}
        <textarea id="drawer-title" class="drawer-title-input" rows="1" ${!canEdit ? 'readonly' : ''}>${task.title}</textarea>
      </div>
      <div class="drawer-header-actions">
        <!-- Close Button -->
        <button class="btn-icon" id="btn-close-drawer" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    
    <div class="drawer-body">
      <!-- Meta Grid -->
      <div class="drawer-meta-grid">
        <div class="drawer-meta-row">
          <span class="meta-label">Status</span>
          <div class="dropdown">
            <button class="btn btn-ghost btn-sm" id="btn-status" ${!canEdit ? 'disabled' : ''}>
              ${StatusBadge(task.status)}
            </button>
          </div>
        </div>
        <div class="drawer-meta-row">
          <span class="meta-label">Assignee</span>
          <div class="dropdown">
            <button class="btn btn-ghost btn-sm" id="btn-assignee" ${!canEdit ? 'disabled' : ''}>
              ${task.assigneeId ? getAssigneeHtml(task.assigneeId) : 'Unassigned'}
            </button>
          </div>
        </div>
        <div class="drawer-meta-row">
          <span class="meta-label">Due Date</span>
          <input type="date" class="form-input btn-sm" id="drawer-due" value="${formatDateForInput(task.dueDate)}" ${!canEdit ? 'readonly' : ''} style="max-width: 140px; border-color:transparent; background:var(--color-surface-2);">
        </div>
        <div class="drawer-meta-row">
          <span class="meta-label">Priority</span>
          <div class="dropdown">
            <button class="btn btn-ghost btn-sm" id="btn-priority" ${!canEdit ? 'disabled' : ''}>
              ${PriorityBadge(task.priority)}
            </button>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="drawer-section">
        <div class="drawer-section-title">Description</div>
        <textarea id="drawer-desc" class="form-textarea" placeholder="Add a more detailed description..." ${!canEdit ? 'readonly' : ''}>${task.description || ''}</textarea>
      </div>

      <!-- Subtasks Placeholder -->
      <div class="drawer-section">
        <div class="drawer-section-header">
          <span class="drawer-section-title">Subtasks</span>
        </div>
        <div id="subtasks-container">
          <div class="text-sm text-muted">Subtasks will load here...</div>
        </div>
      </div>

      <!-- Attachments Placeholder -->
      <div class="drawer-section">
        <div class="drawer-section-header">
          <span class="drawer-section-title">Attachments</span>
        </div>
        <div id="attachments-container">
          <div class="attachment-upload-zone" id="btn-upload">
            <div class="text-sm text-muted">Drag & drop files or click to upload</div>
          </div>
        </div>
      </div>

      <!-- Comments Placeholder -->
      <div class="drawer-section mt-4">
        <div class="drawer-section-title mb-2">Activity</div>
        <div id="comments-container">
           <div class="text-sm text-muted">Activity will load here...</div>
        </div>
      </div>
      
    </div>
  `;

  // Auto-resize title textarea
  const titleEl = document.getElementById('drawer-title');
  if (titleEl) {
    const resize = () => {
      titleEl.style.height = 'auto';
      titleEl.style.height = titleEl.scrollHeight + 'px';
    };
    titleEl.addEventListener('input', resize);
    setTimeout(resize, 0); // initial resize
    
    // Save on blur
    if (canEdit) {
      titleEl.addEventListener('blur', () => {
        if (titleEl.value.trim() !== task.title) {
          updateTask(task.id, { title: titleEl.value.trim() });
        }
      });
    }
  }

  // Save desc on blur
  const descEl = document.getElementById('drawer-desc');
  if (descEl && canEdit) {
    descEl.addEventListener('blur', () => {
      if (descEl.value.trim() !== (task.description || '')) {
        updateTask(task.id, { description: descEl.value.trim() });
      }
    });
  }

  // Save due date
  const dueEl = document.getElementById('drawer-due');
  if (dueEl && canEdit) {
    dueEl.addEventListener('change', () => {
      const d = dueEl.value ? new Date(dueEl.value) : null;
      updateTask(task.id, { dueDate: d });
    });
  }

  // Load sub-modules (Subtasks, Comments, Attachments)
  // For brevity in this architectural phase, we would mount them here.
}

function bindEvents() {
  const closeBtn = document.getElementById('btn-close-drawer');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeDrawer());
  }

  if (_overlayEl) {
    _overlayEl.addEventListener('click', () => closeDrawer());
  }
}

// Helpers
function getAssigneeHtml(uid) {
  const mem = State.get('members').find(m => m.userId === uid);
  if (!mem) return 'Unknown';
  return `
    <div style="display:flex;align-items:center;gap:6px;">
      <div class="avatar avatar-xs"><img src="${mem.photoURL || ''}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"></div>
      <span>${mem.name.split(' ')[0]}</span>
    </div>
  `;
}

function formatDateForInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}
