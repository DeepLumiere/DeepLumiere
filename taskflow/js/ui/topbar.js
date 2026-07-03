// ═══════════════════════════════════════════════════
// TaskFlow v2 — Topbar Component
// ═══════════════════════════════════════════════════

import { State } from '../store/state.js';
import { getInitials, stringToColor, debounce } from '../utils/helpers.js';
import { signOut } from '../auth/auth.js';
import { Router } from './router.js';

let _unsubscribeUser = null;
let _unsubscribeNotifs = null;

export const Topbar = {
  init() {
    this.renderAvatar();
    this.bindEvents();
    
    // Subscribe to user changes to update avatar
    _unsubscribeUser = State.subscribe('user', () => {
      this.renderAvatar();
    });

    // Subscribe to notifications for bell badge
    _unsubscribeNotifs = State.subscribe('notifications', (notifs) => {
      this.updateBellBadge(notifs || []);
    });
  },

  renderAvatar() {
    const user = State.get('user');
    const avatarEl = document.getElementById('topbar-avatar');
    if (!avatarEl || !user) return;

    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;" />`;
      avatarEl.style.background = 'transparent';
    } else {
      avatarEl.textContent = getInitials(user.displayName);
      avatarEl.style.background = stringToColor(user.displayName);
      avatarEl.style.color = '#fff';
    }
  },

  updateBellBadge(notifs) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    const unreadCount = notifs.filter(n => !n.isRead).length;
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.remove('hidden');
      document.getElementById('notif-bell').classList.add('has-unread');
    } else {
      badge.classList.add('hidden');
      document.getElementById('notif-bell').classList.remove('has-unread');
    }
  },

  bindEvents() {
    // Topbar User Menu Toggle
    const avatarBtn = document.getElementById('topbar-avatar');
    const userMenu = document.getElementById('topbar-user-menu');
    
    if (avatarBtn && userMenu) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('open');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target) && e.target !== avatarBtn) {
          userMenu.classList.remove('open');
        }
      });
    }

    // Sign Out Button
    const signoutBtn = document.getElementById('btn-signout');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        signOut();
      });
    }

    // New Task Button (Global)
    const newTaskBtn = document.getElementById('btn-new-task');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', async () => {
        const modals = await import('./modals.js');
        modals.Modals.openTaskForm(); // We'll build this in Phase 6
      });
    }

    // Mobile Hamburger
    const hamburger = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (hamburger && sidebar && overlay) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        overlay.classList.remove('hidden');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.add('hidden');
      });
    }

    // Notification Bell Toggle
    const bellBtn = document.getElementById('notif-bell');
    const notifPanel = document.getElementById('notif-panel');
    
    if (bellBtn && notifPanel) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifPanel.classList.contains('open');
        
        // Close other dropdowns
        if (userMenu) userMenu.classList.remove('open');
        
        if (isOpen) {
          notifPanel.classList.remove('open');
        } else {
          notifPanel.classList.add('open');
          this.renderNotificationPanel();
        }
      });

      // Close panel clicking outside
      document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !bellBtn.contains(e.target)) {
          notifPanel.classList.remove('open');
        }
      });
    }

    // Global Search Input
    const searchInput = document.getElementById('global-search');
    const searchPanel = document.getElementById('search-results-panel');
    
    if (searchInput && searchPanel) {
      const handleSearch = debounce((e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
          searchPanel.classList.add('hidden');
          return;
        }

        const tasks = State.get('tasks') || [];
        const results = tasks.filter(t => 
          (t.title && t.title.toLowerCase().includes(query)) || 
          (t.description && t.description.toLowerCase().includes(query))
        ).slice(0, 8); // Max 8 results

        if (results.length === 0) {
          searchPanel.innerHTML = `<div class="p-4 text-center text-muted text-sm">No tasks found</div>`;
        } else {
          searchPanel.innerHTML = results.map(t => `
            <div class="search-result-item" data-id="${t.id}">
              <div class="badge-dot dot-${t.status || 'todo'}"></div>
              <div style="flex:1; min-width:0;">
                <div class="text-sm font-medium text-text truncate">${t.title}</div>
                ${t.projectId ? `<div class="text-xs text-muted truncate">${this.getProjectName(t.projectId)}</div>` : ''}
              </div>
            </div>
          `).join('');

          // Bind click to open drawer
          searchPanel.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
              searchPanel.classList.add('hidden');
              searchInput.value = '';
              Router.go(`#/task/${item.dataset.id}`);
            });
          });
        }
        
        searchPanel.classList.remove('hidden');
      }, 300);

      searchInput.addEventListener('input', handleSearch);
      
      // Focus shortcut
      document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && 
            !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          searchInput.focus();
        }
      });

      // Close search clicking outside
      document.addEventListener('click', (e) => {
        if (!searchPanel.contains(e.target) && e.target !== searchInput) {
          searchPanel.classList.add('hidden');
        }
      });
    }
  },

  getProjectName(projectId) {
    const projects = State.get('projects') || [];
    const p = projects.find(p => p.id === projectId);
    return p ? p.name : 'Unknown Project';
  },

  renderNotificationPanel() {
    const notifs = State.get('notifications') || [];
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    if (notifs.length === 0) {
      listEl.innerHTML = `
        <div class="notif-panel__empty">
          <div style="font-size:2rem; margin-bottom:8px; opacity:0.5;">📭</div>
          You're all caught up!
        </div>
      `;
      return;
    }

    import('../utils/helpers.js').then(({ timeAgo }) => {
      // Render up to 10 notifications in the dropdown
      listEl.innerHTML = notifs.slice(0, 10).map(n => `
        <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" data-task="${n.taskId || ''}">
          <div class="avatar avatar-md" style="background:var(--color-surface-3)">
            ${n.actorPhoto 
              ? `<img src="${n.actorPhoto}" style="width:100%;height:100%;object-fit:cover"/>` 
              : `<span>${getInitials(n.actorName)}</span>`
            }
          </div>
          <div class="notif-item__content">
            <div class="notif-item__message">${n.message}</div>
            ${n.taskTitle ? `<div class="notif-item__task">${n.taskTitle}</div>` : ''}
          </div>
          <div class="notif-item__time">${timeAgo(n.createdAt)}</div>
        </div>
      `).join('');

      // Bind clicks
      listEl.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', () => {
          document.getElementById('notif-panel').classList.remove('open');
          
          // Mark read
          if (item.classList.contains('unread')) {
            import('../db/notifications.js').then(module => {
              module.markRead(item.dataset.id);
            });
          }

          // Navigate if there's a task ID
          if (item.dataset.task) {
            Router.go(`#/task/${item.dataset.task}`);
          }
        });
      });
    });
  },

  cleanup() {
    if (_unsubscribeUser) _unsubscribeUser();
    if (_unsubscribeNotifs) _unsubscribeNotifs();
  }
};
