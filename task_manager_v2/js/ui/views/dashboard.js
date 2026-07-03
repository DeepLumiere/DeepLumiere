// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Dashboard
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { formatShortDate, isToday, isOverdue } from '../../utils/helpers.js';
import { Router } from '../router.js';

let _unsubTasks = null;
let _unsubProjects = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-container" style="max-width: 1200px;">
      <div class="view-header">
        <div>
          <h1 class="view-title">Dashboard</h1>
          <p class="text-sm text-muted mt-1">Here's what's happening in your workspace today.</p>
        </div>
      </div>
      
      <!-- Stats Row -->
      <div class="stats-grid" id="dashboard-stats">
        <div class="skeleton" style="height:120px;border-radius:16px;"></div>
        <div class="skeleton" style="height:120px;border-radius:16px;"></div>
        <div class="skeleton" style="height:120px;border-radius:16px;"></div>
        <div class="skeleton" style="height:120px;border-radius:16px;"></div>
      </div>

      <!-- Main Content Grid -->
      <div class="two-col-grid" style="align-items: start;">
        
        <!-- Left Col: My Tasks -->
        <div class="flex-col gap-4">
          <div class="card p-0" style="overflow:hidden;">
            <div class="p-4 border-b border-border">
              <h3 class="text-md font-semibold">My Tasks Due Soon</h3>
            </div>
            <div id="dashboard-my-tasks">
              <div class="p-6 text-center text-muted">Loading tasks...</div>
            </div>
          </div>
        </div>

        <!-- Right Col: Project Progress -->
        <div class="flex-col gap-4">
          <div class="card p-0" style="overflow:hidden;">
            <div class="p-4 border-b border-border">
              <h3 class="text-md font-semibold">Project Progress</h3>
            </div>
            <div id="dashboard-projects" class="p-4 flex-col gap-4">
              <div class="skeleton" style="height:40px;"></div>
              <div class="skeleton" style="height:40px;"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Bind subscriptions
  _unsubTasks = State.subscribe('tasks', () => updateDashboard());
  _unsubProjects = State.subscribe('projects', () => updateDashboard());

  return function unmount() {
    if (_unsubTasks) _unsubTasks();
    if (_unsubProjects) _unsubProjects();
  };
}

function updateDashboard() {
  const tasks = State.get('tasks') || [];
  const projects = State.get('projects') || [];
  const user = State.get('user');
  
  if (!user) return;

  // ── Calculate Stats ──
  const myTasks = tasks.filter(t => t.assigneeId === user.uid);
  const total = myTasks.length;
  const done = myTasks.filter(t => t.status === 'done').length;
  const inProgress = myTasks.filter(t => t.status === 'in-progress').length;
  const overdue = myTasks.filter(t => t.status !== 'done' && t.dueDate && isOverdue(t.dueDate)).length;

  const statsEl = document.getElementById('dashboard-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-primary-alpha);color:var(--color-primary);">📋</div>
        <div>
          <div class="stat-card__value">${total}</div>
          <div class="stat-card__label">Total Assigned</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-warning-alpha);color:var(--color-warning);">⚡</div>
        <div>
          <div class="stat-card__value">${inProgress}</div>
          <div class="stat-card__label">In Progress</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background:var(--color-success-alpha);color:var(--color-success);">✅</div>
        <div>
          <div class="stat-card__value">${done}</div>
          <div class="stat-card__label">Completed</div>
        </div>
      </div>
      <div class="stat-card" style="border-color:${overdue > 0 ? 'var(--color-danger-alpha)' : 'var(--color-border)'}">
        <div class="stat-card__icon" style="background:var(--color-danger-alpha);color:var(--color-danger);">⚠️</div>
        <div>
          <div class="stat-card__value" style="color:${overdue > 0 ? 'var(--color-danger)' : 'var(--color-text)'}">${overdue}</div>
          <div class="stat-card__label">Overdue</div>
        </div>
      </div>
    `;
  }

  // ── My Tasks Due Soon ──
  const myTasksEl = document.getElementById('dashboard-my-tasks');
  if (myTasksEl) {
    // Sort by due date (nulls last), then by priority
    const priorityWeight = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const sortedTasks = [...myTasks]
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          const dA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
          const dB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
          return dA - dB;
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      })
      .slice(0, 6);

    if (sortedTasks.length === 0) {
      myTasksEl.innerHTML = `
        <div class="empty-state" style="padding: 40px 24px;">
          <div class="empty-state__icon">☕</div>
          <div class="empty-state__title">You're all caught up!</div>
          <div class="empty-state__desc text-xs mt-2">No active tasks assigned to you.</div>
        </div>
      `;
    } else {
      myTasksEl.innerHTML = sortedTasks.map(t => {
        const isPast = t.dueDate && isOverdue(t.dueDate);
        const isTdy = t.dueDate && isToday(t.dueDate);
        let dueHtml = '';
        if (t.dueDate) {
          dueHtml = `<span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; 
            background:${isPast ? 'var(--color-danger-alpha)' : isTdy ? 'var(--color-warning-alpha)' : 'var(--color-surface-3)'}; 
            color:${isPast ? 'var(--color-danger)' : isTdy ? 'var(--color-warning)' : 'var(--color-text-muted)'};">
            ${isPast ? 'Overdue' : formatShortDate(t.dueDate)}
          </span>`;
        }

        const project = projects.find(p => p.id === t.projectId);
        const projName = project ? project.name : '';

        return `
          <div class="p-3 border-b border-border hover:bg-surface-2 flex items-center justify-between cursor-pointer dashboard-task-row" data-id="${t.id}" style="transition:background var(--t-fast)">
            <div class="flex items-center gap-3 min-w-0">
              <div class="badge-dot dot-${t.status}"></div>
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">${t.title}</div>
                ${projName ? `<div class="text-xs text-muted truncate mt-1">${projName}</div>` : ''}
              </div>
            </div>
            <div class="flex-shrink-0 ml-3">
              ${dueHtml}
            </div>
          </div>
        `;
      }).join('');

      myTasksEl.querySelectorAll('.dashboard-task-row').forEach(row => {
        row.addEventListener('click', () => {
          Router.go(`#/task/${row.dataset.id}`);
        });
      });
    }
  }

  // ── Project Progress ──
  const projEl = document.getElementById('dashboard-projects');
  if (projEl) {
    if (projects.length === 0) {
      projEl.innerHTML = `
        <div class="text-center text-muted text-sm py-4">No projects yet.</div>
      `;
    } else {
      projEl.innerHTML = projects.slice(0, 5).map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        const pTotal = pTasks.length;
        const pDone = pTasks.filter(t => t.status === 'done').length;
        const percent = pTotal === 0 ? 0 : Math.round((pDone / pTotal) * 100);

        return `
          <div class="flex-col gap-2 cursor-pointer" onclick="window.location.hash='#/board'">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">${p.name}</span>
              <span class="text-xs text-muted font-semibold">${percent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${percent}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}
