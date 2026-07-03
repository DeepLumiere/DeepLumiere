// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Task Detail Drawer
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { updateTask, getTask, deleteTask } from '../../db/tasks.js';
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
      <div class="skeleton" style="height:50px;"></div>
      <div class="skeleton" style="height:50px;"></div>
    </div>
  `;
}

function renderContent(task) {
  if (!_drawerEl) return;
  const canEdit = Permissions.canEditTask(task);
  const projects = State.get('projects') || [];
  const project = projects.find(p => p.id === task.projectId);
  const members = State.get('members') || [];

  _drawerEl.innerHTML = `
    <div class="drawer-header">
      <div style="flex:1; min-width:0; margin-top: 8px;">
        ${project ? `<div class="text-xs font-semibold text-muted mb-1 uppercase tracking-wide">${project.name}</div>` : ''}
        <textarea id="drawer-title" class="drawer-title-input" rows="1" ${!canEdit ? 'readonly' : ''} style="font-size: 1.5rem; padding-left: 0;">${task.title}</textarea>
      </div>
      <div class="drawer-header-actions">
        <!-- Delete Button -->
        ${canEdit ? `
        <button class="btn-icon text-danger" id="btn-delete-task" title="Delete Task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
        ` : ''}
        <!-- Close Button -->
        <button class="btn-icon" id="btn-close-drawer" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    
    <div class="drawer-body">
      <div class="drawer-layout">
        <!-- Main Content Area -->
        <div class="drawer-main">
          
          <!-- Description -->
          <div class="drawer-section">
            <textarea id="drawer-desc" class="form-textarea" placeholder="Add a more detailed description..." ${!canEdit ? 'readonly' : ''} style="border-color:transparent; background:var(--color-surface-2); min-height: 120px; font-size: 0.9375rem;">${task.description || ''}</textarea>
          </div>

          <!-- Subtasks Placeholder -->
          <div class="drawer-section">
            <div class="drawer-section-header mb-2">
              <span class="drawer-section-title">Subtasks</span>
            </div>
            <div id="subtasks-container" class="subtask-list">
              <div class="subtask-item">
                <input type="checkbox" style="cursor:pointer;">
                <span class="subtask-text-el">Design the new layout mockups</span>
              </div>
              <div class="subtask-item done">
                <input type="checkbox" checked style="cursor:pointer;">
                <span class="subtask-text-el">Gather user feedback</span>
              </div>
              ${canEdit ? `<input type="text" class="subtask-add-input mt-2" placeholder="+ Add a subtask...">` : ''}
            </div>
          </div>

          <!-- Attachments Placeholder -->
          <div class="drawer-section mt-2">
            <div class="drawer-section-header mb-2">
              <span class="drawer-section-title">Attachments</span>
            </div>
            <div id="attachments-container">
              <div class="attachment-upload-zone" id="btn-upload">
                <div class="text-sm text-muted">Drag & drop files or click to upload</div>
              </div>
            </div>
          </div>

          <!-- Comments Placeholder -->
          <div class="drawer-section mt-6">
            <div class="drawer-section-header mb-3">
              <span class="drawer-section-title">Activity</span>
            </div>
            <div id="comments-container" class="comment-list">
               <div class="comment-item">
                 <div class="avatar avatar-sm bg-primary text-white">AJ</div>
                 <div class="comment-content">
                   <div class="comment-header">
                     <span class="comment-author">Alice Johnson</span>
                     <span class="comment-time">2 hours ago</span>
                   </div>
                   <div class="comment-body">I will take a look at this task this afternoon!</div>
                 </div>
               </div>
               ${canEdit ? `
               <div class="comment-item mt-4">
                 <div class="avatar avatar-sm" style="background:var(--color-surface-3);"></div>
                 <div class="comment-content">
                   <textarea class="comment-textarea" placeholder="Write a comment..."></textarea>
                   <div class="flex justify-end mt-2">
                     <button class="btn btn-primary btn-sm">Comment</button>
                   </div>
                 </div>
               </div>
               ` : ''}
            </div>
          </div>
        </div>

        <!-- Sidebar (Metadata) -->
        <div class="drawer-sidebar">
          <div class="drawer-property-list">
            
            <div class="drawer-property-row">
              <span class="meta-label">Status</span>
              <select class="drawer-property-pill" id="select-status" ${!canEdit ? 'disabled' : ''}>
                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Todo</option>
                <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                <option value="inreview" ${task.status === 'inreview' ? 'selected' : ''}>In Review</option>
                <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
              </select>
            </div>
            
            <div class="drawer-property-row">
              <span class="meta-label">Assignee</span>
              <select class="drawer-property-pill" id="select-assignee" ${!canEdit ? 'disabled' : ''}>
                <option value="">Unassigned</option>
                ${members.map(m => `
                  <option value="${m.userId}" ${task.assigneeId === m.userId ? 'selected' : ''}>${m.name}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="drawer-property-row">
              <span class="meta-label">Priority</span>
              <select class="drawer-property-pill" id="select-priority" ${!canEdit ? 'disabled' : ''}>
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
              </select>
            </div>

            <div class="drawer-property-row">
              <span class="meta-label">Due Date</span>
              <input type="date" class="drawer-property-pill" id="drawer-due" value="${formatDateForInput(task.dueDate)}" ${!canEdit ? 'readonly' : ''}>
            </div>
            
          </div>
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

  // Save Status change
  const statusSelect = document.getElementById('select-status');
  if (statusSelect && canEdit) {
    statusSelect.addEventListener('change', () => {
      updateTask(task.id, { status: statusSelect.value });
    });
  }

  // Save Assignee change
  const assigneeSelect = document.getElementById('select-assignee');
  if (assigneeSelect && canEdit) {
    assigneeSelect.addEventListener('change', () => {
      updateTask(task.id, { assigneeId: assigneeSelect.value || null });
    });
  }

  // Save Priority change
  const prioritySelect = document.getElementById('select-priority');
  if (prioritySelect && canEdit) {
    prioritySelect.addEventListener('change', () => {
      updateTask(task.id, { priority: prioritySelect.value });
    });
  }

  // Delete Task
  const deleteBtn = document.getElementById('btn-delete-task');
  if (deleteBtn && canEdit) {
    deleteBtn.addEventListener('click', async () => {
      const modals = await import('../modals.js');
      const confirm = await modals.Modals.confirm('Delete Task?', 'Are you sure you want to permanently delete this task?', true);
      if (confirm) {
        try {
          await deleteTask(task.id);
          Toast.show('Task deleted', 'success');
          closeDrawer();
        } catch (e) {
          Toast.show('Failed to delete task', 'error');
        }
      }
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
