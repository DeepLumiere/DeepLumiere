// ═══════════════════════════════════════════════════
// TaskFlow v2 — Modals System
// ═══════════════════════════════════════════════════

import { State } from '../store/state.js';
import { createWorkspace } from '../db/workspaces.js';
import { createTask } from '../db/tasks.js';
import { Toast } from './toast.js';

let _overlay = null;
let _box = null;
let _currentResolve = null;

export const Modals = {
  
  init() {
    _overlay = document.getElementById('modal-overlay');
    _box = document.getElementById('modal-box');

    // Close on overlay click
    if (_overlay) {
      _overlay.addEventListener('click', (e) => {
        if (e.target === _overlay) this.close();
      });
    }
  },

  close(result = null) {
    if (!_overlay) return;
    _overlay.classList.add('closing');
    
    setTimeout(() => {
      _overlay.classList.add('hidden');
      _overlay.classList.remove('closing');
      _box.className = 'modal-box'; // reset classes
      _box.innerHTML = '';
      
      if (_currentResolve) {
        _currentResolve(result);
        _currentResolve = null;
      }
    }, 250); // Match fadeOut duration
  },

  open(html, options = {}) {
    this.init(); // ensure dom elements bound
    return new Promise((resolve) => {
      _currentResolve = resolve;
      
      _box.className = `modal-box ${options.size ? `modal-${options.size}` : ''}`;
      _box.innerHTML = html;
      
      _overlay.classList.remove('hidden');

      // Bind close buttons inside modal
      _box.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });
    });
  },

  // ── Specific Modals ──

  async openCreateWorkspace() {
    const html = `
      <div class="modal-header">
        <h2 class="modal-title">Create Workspace</h2>
        <button class="modal-close" data-dismiss="modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Workspace Name</label>
          <input type="text" class="form-input" id="ws-name-input" placeholder="e.g. Acme Corp" autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-ws">Create Workspace</button>
      </div>
    `;

    this.open(html, { size: 'sm' });

    // Wait for DOM paint
    setTimeout(() => {
      const input = document.getElementById('ws-name-input');
      const submit = document.getElementById('btn-submit-ws');
      if (input) input.focus();

      submit.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) return;
        submit.disabled = true;
        submit.textContent = 'Creating...';
        
        try {
          const ws = await createWorkspace(name);
          Toast.show('Workspace created!', 'success');
          this.close(ws);
          // App.js should handle switching to it
        } catch (err) {
          console.error(err);
          Toast.show('Failed to create workspace.', 'error');
          submit.disabled = false;
        }
      });
    }, 0);
  },

  async openTaskForm(initialData = null) {
    const ws = State.get('currentWorkspace');
    if (!ws) return;
    const isEdit = !!initialData;
    
    const projects = State.get('projects') || [];
    const members = State.get('members') || [];

    const projOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const memOptions = members.map(m => `<option value="${m.userId}">${m.name}</option>`).join('');

    const html = `
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Edit Task' : 'New Task'}</h2>
        <button class="modal-close" data-dismiss="modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body flex-col gap-4">
        <div class="form-group mb-0">
          <input type="text" class="form-input text-lg font-semibold" id="task-title" placeholder="Task title..." style="border-color:transparent; background:var(--color-surface-2);" autofocus>
        </div>
        
        <div class="two-col-grid" style="gap:var(--sp-4)">
          <div class="form-group">
            <label class="form-label">Project</label>
            <select class="form-select" id="task-project">
              <option value="">No Project</option>
              ${projOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assignee</label>
            <select class="form-select" id="task-assignee">
              <option value="">Unassigned</option>
              ${memOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-select" id="task-priority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-input" id="task-due">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" id="task-desc" placeholder="Add details..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-task">${isEdit ? 'Save Changes' : 'Create Task'}</button>
      </div>
    `;

    this.open(html);

    setTimeout(() => {
      const submit = document.getElementById('btn-submit-task');
      submit.addEventListener('click', async () => {
        const title = document.getElementById('task-title').value.trim();
        if (!title) { Toast.show('Title is required', 'error'); return; }

        submit.disabled = true;
        const data = {
          title,
          projectId: document.getElementById('task-project').value || null,
          assigneeId: document.getElementById('task-assignee').value || null,
          priority: document.getElementById('task-priority').value,
          dueDate: document.getElementById('task-due').value ? new Date(document.getElementById('task-due').value) : null,
          description: document.getElementById('task-desc').value.trim()
        };

        try {
          if (isEdit) {
            // await updateTask(initialData.id, data);
          } else {
            await createTask(ws.id, data);
            Toast.show('Task created', 'success');
          }
          this.close(true);
        } catch (err) {
          console.error(err);
          Toast.show('Failed to save task', 'error');
          submit.disabled = false;
        }
      });
    }, 0);
  },

  async confirm(title, desc, danger = false) {
    const html = `
      <div class="confirm-dialog">
        <div class="confirm-dialog__icon" style="${danger ? '' : 'background:var(--color-primary-alpha);color:var(--color-primary);'}">
          ${danger ? '⚠️' : '❓'}
        </div>
        <h2 class="confirm-dialog__title">${title}</h2>
        <p class="confirm-dialog__desc">${desc}</p>
        <div class="flex gap-3 w-full mt-4 justify-center">
          <button class="btn btn-ghost" data-dismiss="modal">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="btn-confirm-yes">Confirm</button>
        </div>
      </div>
    `;
    
    return new Promise((resolve) => {
      this.open(html, { size: 'sm' }).then(res => resolve(res === true));
      
      setTimeout(() => {
        const btn = document.getElementById('btn-confirm-yes');
        if (btn) btn.addEventListener('click', () => this.close(true));
      }, 0);
    });
  }
};
