// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Notifications (Full Page)
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { markRead, markAllRead } from '../../db/notifications.js';
import { timeAgo, getInitials } from '../../utils/helpers.js';
import { Router } from '../router.js';

let _unsubNotifs = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Notifications</h1>
        <p class="text-sm text-muted mt-1">Updates from your team and tasks.</p>
      </div>
      <button class="btn btn-ghost" id="btn-mark-all-read-full">Mark all as read</button>
    </div>
    <div class="view-container" style="max-width: 800px; margin: 0 auto;">
      <div class="card p-0" style="overflow:hidden;" id="notif-page-list">
        <div class="p-8 text-center text-muted">Loading...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-mark-all-read-full').addEventListener('click', () => {
    markAllRead();
  });

  _unsubNotifs = State.subscribe('notifications', (notifs) => {
    const listEl = document.getElementById('notif-page-list');
    if (!listEl) return;

    if (!notifs || notifs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <h2 class="empty-state__title">No Notifications</h2>
          <p class="empty-state__desc">You're all caught up on updates.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.isRead ? '' : 'unread'} cursor-pointer" data-id="${n.id}" data-task="${n.taskId || ''}" style="padding:var(--sp-4) var(--sp-6);">
        <div class="avatar avatar-lg" style="background:var(--color-surface-3)">
          ${n.actorPhoto 
            ? `<img src="${n.actorPhoto}" style="width:100%;height:100%;object-fit:cover"/>` 
            : `<span>${getInitials(n.actorName)}</span>`
          }
        </div>
        <div class="notif-item__content ml-3">
          <div class="text-sm font-medium" style="color:var(--color-text)">${n.message}</div>
          ${n.taskTitle ? `<div class="text-xs text-primary mt-1">${n.taskTitle}</div>` : ''}
          <div class="text-xs text-muted mt-2">${timeAgo(n.createdAt)}</div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('unread')) markRead(item.dataset.id);
        if (item.dataset.task) Router.go(`#/task/${item.dataset.task}`);
      });
    });
  });

  return function unmount() {
    if (_unsubNotifs) _unsubNotifs();
  };
}
