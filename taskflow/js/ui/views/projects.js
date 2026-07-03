// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Projects
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { Permissions } from '../../auth/permissions.js';
import { createProject, deleteProject } from '../../db/projects.js';
import { Toast } from '../toast.js';

let _unsubProjects = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Projects</h1>
        <p class="text-sm text-muted mt-1">Manage project categories and milestones.</p>
      </div>
      ${Permissions.canManageProjects() ? `
        <button class="btn btn-primary" id="btn-new-project">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      ` : ''}
    </div>
    <div class="view-container">
      <div class="card-grid" id="projects-grid">
        <div class="p-6 text-center text-muted">Loading projects...</div>
      </div>
    </div>
  `;

  if (Permissions.canManageProjects()) {
    const btn = document.getElementById('btn-new-project');
    if (btn) {
      btn.addEventListener('click', async () => {
        const modals = await import('../modals.js');
        // We can reuse the confirm prompt with inputs, or build a specific one.
        // For brevity, prompt:
        const name = prompt('Enter Project Name:');
        if (name) {
          try {
            await createProject(State.get('currentWorkspace').id, { name, color: 'hsl(221, 83%, 53%)' });
            Toast.show('Project created', 'success');
          } catch (e) {
            Toast.show('Error creating project', 'error');
          }
        }
      });
    }
  }

  _unsubProjects = State.subscribe('projects', (projects) => {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (!projects || projects.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">📁</div>
          <h2 class="empty-state__title">No Projects</h2>
          <p class="empty-state__desc">Create a project to organize tasks.</p>
        </div>
      `;
      return;
    }

    const tasks = State.get('tasks') || [];

    grid.innerHTML = projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const done = pTasks.filter(t => t.status === 'done').length;
      const total = pTasks.length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);

      return `
        <div class="card card-hover flex-col gap-4">
          <div class="flex items-center justify-between">
            <h3 class="text-md font-semibold truncate">${p.name}</h3>
            ${Permissions.canManageProjects() ? `
              <button class="btn-icon btn-del-proj text-danger" data-id="${p.id}" style="margin-right:-8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            ` : ''}
          </div>
          
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-muted font-medium">${done} of ${total} tasks completed</span>
            <span class="text-xs font-bold ${percent === 100 ? 'text-success' : 'text-primary'}">${percent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width:${percent}%; background:${percent === 100 ? 'var(--color-success)' : 'var(--color-primary)'}"></div>
          </div>
        </div>
      `;
    }).join('');

    if (Permissions.canManageProjects()) {
      grid.querySelectorAll('.btn-del-proj').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const modals = await import('../modals.js');
          const confirm = await modals.Modals.confirm(
            'Delete Project?', 
            'This project and its settings will be deleted. Tasks will remain but lose their project association.', 
            true
          );
          if (confirm) {
            try {
              await deleteProject(btn.dataset.id);
              Toast.show('Project deleted', 'success');
            } catch (err) {
              Toast.show('Error deleting project', 'error');
            }
          }
        });
      });
    }
  });

  return function unmount() {
    if (_unsubProjects) _unsubProjects();
  };
}
