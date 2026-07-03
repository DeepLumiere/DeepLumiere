// ═══════════════════════════════════════════════════
// TaskFlow v2 — Component: TaskCard
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { formatShortDate, isOverdue, isToday, getInitials, stringToColor } from '../../utils/helpers.js';

export function renderTaskCard(task) {
  const projects = State.get('projects') || [];
  const members = State.get('members') || [];
  const labels = State.get('labels') || [];

  // Project
  const project = projects.find(p => p.id === task.projectId);
  const projHtml = project 
    ? `<div class="card-project" style="color:${project.color || 'var(--color-primary)'}; border-color:currentColor;">
        <span style="color:var(--color-text-muted)">${project.name}</span>
       </div>`
    : '';

  // Labels
  let labelsHtml = '';
  if (task.labels && task.labels.length > 0) {
    labelsHtml = task.labels.map(lid => {
      const l = labels.find(x => x.id === lid);
      if (!l) return '';
      return `<div class="label-pill" style="background:${l.color}22; color:${l.color};">${l.name}</div>`;
    }).join('');
  }

  // Priority
  let prioClass = '';
  let prioText = '';
  if (task.priority === 'critical') { prioClass = 'priority-critical'; prioText = 'CRITICAL'; }
  else if (task.priority === 'high') { prioClass = 'priority-high'; prioText = 'HIGH'; }
  else if (task.priority === 'low') { prioClass = 'priority-low'; prioText = 'LOW'; }
  else { prioClass = 'priority-medium'; prioText = 'MED'; }

  // Assignee Avatar
  let avatarHtml = '';
  if (task.assigneeId) {
    const mem = members.find(m => m.userId === task.assigneeId);
    if (mem) {
      if (mem.photoURL) {
        avatarHtml = `<div class="avatar avatar-sm"><img src="${mem.photoURL}" style="width:100%;height:100%;object-fit:cover"/></div>`;
      } else {
        avatarHtml = `<div class="avatar avatar-sm" style="background:${stringToColor(mem.name)};color:#fff;">${getInitials(mem.name)}</div>`;
      }
    } else {
      avatarHtml = `<div class="avatar avatar-sm" style="background:var(--color-surface-3);">?</div>`;
    }
  }

  // Due Date
  let dueHtml = '';
  if (task.dueDate) {
    const past = isOverdue(task.dueDate) && task.status !== 'done';
    const tdy = isToday(task.dueDate) && task.status !== 'done';
    const dueClass = past ? 'overdue' : tdy ? 'due-today' : '';
    const iconColor = past ? 'var(--color-danger)' : tdy ? 'var(--color-warning)' : 'var(--color-text-subtle)';
    dueHtml = `
      <div class="card-meta-item ${dueClass}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${formatShortDate(task.dueDate)}</span>
      </div>
    `;
  }

  // Meta stats (comments, attachments) - Optional mock if real counts aren't in task doc
  // For V2 architecture, these counts might be updated via Cloud Functions into the task doc, 
  // or we render icons if array fields exist. We'll just omit them if data isn't there.
  let metaHtml = dueHtml;
  if (task.commentCount) {
    metaHtml += `
      <div class="card-meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span>${task.commentCount}</span>
      </div>
    `;
  }
  if (task.attachmentCount) {
    metaHtml += `
      <div class="card-meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        <span>${task.attachmentCount}</span>
      </div>
    `;
  }

  return `
    <div class="task-card ${prioClass}" data-id="${task.id}" draggable="true">
      ${projHtml || labelsHtml ? `
        <div class="card-labels">
          ${projHtml}
          ${labelsHtml}
        </div>
      ` : ''}
      
      <div class="card-title">${task.title}</div>
      
      <div class="card-footer">
        <div class="card-meta">
          ${metaHtml}
        </div>
        ${avatarHtml}
      </div>
    </div>
  `;
}
