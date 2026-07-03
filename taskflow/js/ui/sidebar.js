// ═══════════════════════════════════════════════════
// TaskFlow v2 — Sidebar Component
// ═══════════════════════════════════════════════════

import { State } from '../store/state.js';
import { getInitials, stringToColor } from '../utils/helpers.js';
import { Permissions } from '../auth/permissions.js';
import { Router } from './router.js';

let _unsubscribeUser = null;
let _unsubscribeWorkspaces = null;
let _unsubscribeCurrentWs = null;

export const Sidebar = {
  
  init() {
    this.render();
    this.bindEvents();

    _unsubscribeUser = State.subscribe('user', () => this.updateUserSection());
    _unsubscribeWorkspaces = State.subscribe('workspaces', () => this.updateWorkspaceDropdown());
    _unsubscribeCurrentWs = State.subscribe('currentWorkspace', () => this.updateWorkspaceHeader());
  },

  render() {
    const headerEl = document.getElementById('sidebar-header');
    const navEl = document.getElementById('sidebar-nav');
    const footerEl = document.getElementById('sidebar-footer');
    
    if (!headerEl || !navEl || !footerEl) return;

    // ── Header ──
    headerEl.innerHTML = `
      <div class="dropdown" style="width: 100%;">
        <button class="sidebar__workspace-btn" id="ws-switcher-btn">
          <div class="sidebar__workspace-logo avatar" id="ws-logo"></div>
          <div class="sidebar__workspace-info">
            <div class="sidebar__workspace-name" id="ws-name">Loading...</div>
            <div class="sidebar__workspace-role" id="ws-role"></div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color:var(--color-text-muted)"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="dropdown-menu" id="ws-dropdown" style="width:100%; top:calc(100% + 4px);">
          <!-- Injected dynamically -->
        </div>
      </div>
    `;

    // ── Navigation ──
    let navHTML = `
      <div class="nav-section-label">Workspace</div>
      <a href="#/dashboard" class="nav-item">
        <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg></div>
        <span class="nav-label">Dashboard</span>
      </a>
      <a href="#/board" class="nav-item">
        <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/></svg></div>
        <span class="nav-label">Board</span>
      </a>
      <a href="#/list" class="nav-item">
        <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
        <span class="nav-label">List</span>
      </a>
      <a href="#/timeline" class="nav-item">
        <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg></div>
        <span class="nav-label">Timeline</span>
      </a>
      <a href="#/projects" class="nav-item">
        <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <span class="nav-label">Projects</span>
      </a>
    `;

    // Admin/Owner specific navigation
    if (Permissions.isAdmin()) {
      navHTML += `
        <div class="divider"></div>
        <div class="nav-section-label">Management</div>
        <a href="#/team" class="nav-item">
          <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span class="nav-label">Team Members</span>
        </a>
        <a href="#/clients" class="nav-item">
          <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
          <span class="nav-label">Clients & Portals</span>
        </a>
      `;
    }
    
    if (Permissions.isOwner()) {
      navHTML += `
        <a href="#/settings" class="nav-item">
          <div class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
          <span class="nav-label">Settings</span>
        </a>
      `;
    }

    navEl.innerHTML = navHTML;

    // ── Footer ──
    footerEl.innerHTML = `
      <div class="sidebar__user" id="sidebar-user-block">
        <div class="avatar avatar-md" id="sidebar-user-avatar"></div>
        <div class="sidebar__user-info">
          <div class="sidebar__user-name" id="sidebar-user-name"></div>
          <div class="sidebar__user-role">My Profile</div>
        </div>
      </div>
    `;

    // Setup active state for current route
    const currentView = State.get('currentView');
    if (currentView) {
      document.querySelectorAll('.sidebar__nav .nav-item').forEach(el => {
        if (el.getAttribute('href') === `#/${currentView}`) {
          el.classList.add('active');
        }
      });
    }

    this.updateUserSection();
    this.updateWorkspaceHeader();
  },

  updateWorkspaceHeader() {
    const ws = State.get('currentWorkspace');
    if (!ws) return;

    document.getElementById('ws-name').textContent = ws.name;
    document.getElementById('ws-role').textContent = `Role: ${State.get('myRole') || 'Unknown'}`;

    const logoEl = document.getElementById('ws-logo');
    if (ws.logoURL) {
      logoEl.innerHTML = `<img src="${ws.logoURL}" style="width:100%;height:100%;object-fit:cover;"/>`;
      logoEl.style.background = 'transparent';
    } else {
      logoEl.textContent = getInitials(ws.name);
      logoEl.style.background = stringToColor(ws.name);
      logoEl.style.color = '#fff';
    }
  },

  updateWorkspaceDropdown() {
    const workspaces = State.get('workspaces') || [];
    const currentWs = State.get('currentWorkspace');
    const dropdown = document.getElementById('ws-dropdown');
    if (!dropdown) return;

    if (workspaces.length === 0) {
      dropdown.innerHTML = `<div class="p-4 text-center text-muted text-sm">No workspaces</div>`;
      return;
    }

    let html = '';
    workspaces.forEach(ws => {
      if (currentWs && ws.id === currentWs.id) return; // Skip current
      html += `
        <div class="dropdown-item ws-switch-item" data-id="${ws.id}">
          <div class="avatar avatar-xs" style="background:${stringToColor(ws.name)};color:#fff">${getInitials(ws.name)}</div>
          <span style="flex:1" class="truncate">${ws.name}</span>
        </div>
      `;
    });

    if (html !== '') {
      html += `<div class="dropdown-divider"></div>`;
    }

    html += `
      <div class="dropdown-item" id="btn-create-ws">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Create Workspace
      </div>
      <div class="dropdown-item" id="btn-join-ws">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        Join Workspace
      </div>
    `;

    dropdown.innerHTML = html;

    // Bind switcher clicks
    dropdown.querySelectorAll('.ws-switch-item').forEach(item => {
      item.addEventListener('click', () => {
        dropdown.classList.remove('open');
        this.switchWorkspace(item.dataset.id);
      });
    });

    // Bind create button
    const createBtn = document.getElementById('btn-create-ws');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        dropdown.classList.remove('open');
        const modals = await import('./modals.js');
        modals.Modals.openCreateWorkspace(); // Built in Phase 6
      });
    }

    // Bind join button
    const joinBtn = document.getElementById('btn-join-ws');
    if (joinBtn) {
      joinBtn.addEventListener('click', async () => {
        dropdown.classList.remove('open');
        const wsId = prompt('Enter Workspace ID to Join:');
        if (wsId) {
          const toastModule = await import('./toast.js');
          const Toast = toastModule.Toast;
          try {
            Toast.show('Verifying workspace...', 'info');
            const wsModule = await import('../db/workspaces.js');
            const targetWs = await wsModule.getWorkspace(wsId);
            if (!targetWs) {
              Toast.show('Workspace not found. Check the ID.', 'error');
              return;
            }
            
            // Check if already member
            const currentWorkspaces = State.get('workspaces') || [];
            if (currentWorkspaces.some(w => w.id === wsId)) {
              Toast.show('You are already a member of this workspace.', 'warning');
              this.switchWorkspace(wsId);
              return;
            }

            const memberModule = await import('../db/members.js');
            const currentUser = State.get('user');
            await memberModule.addMember(wsId, currentUser.uid, 'Member', currentUser.email);
            
            Toast.show(`Successfully joined ${targetWs.name}!`, 'success');
            
            // Refresh workspace list in State and switch
            const updatedList = [...currentWorkspaces, targetWs];
            State.set('workspaces', updatedList);
            this.switchWorkspace(wsId);
          } catch (e) {
            console.error(e);
            Toast.show('Failed to join workspace.', 'error');
          }
        }
      });
    }
  },

  updateUserSection() {
    const user = State.get('user');
    if (!user) return;

    document.getElementById('sidebar-user-name').textContent = user.displayName;
    
    const avatarEl = document.getElementById('sidebar-user-avatar');
    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;"/>`;
        avatarEl.style.background = 'transparent';
      } else {
        avatarEl.textContent = getInitials(user.displayName);
        avatarEl.style.background = stringToColor(user.displayName);
        avatarEl.style.color = '#fff';
      }
    }
  },

  bindEvents() {
    // Collapse toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('sidebar--collapsed');
        document.getElementById('topbar').classList.toggle('sidebar-collapsed');
        document.getElementById('main-content').classList.toggle('sidebar-collapsed');
      });
    }

    // Workspace Dropdown Toggle
    const wsBtn = document.getElementById('ws-switcher-btn');
    const wsDropdown = document.getElementById('ws-dropdown');
    
    if (wsBtn && wsDropdown) {
      wsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wsDropdown.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!wsDropdown.contains(e.target) && e.target !== wsBtn) {
          wsDropdown.classList.remove('open');
        }
      });
    }

    // User section click -> go to profile
    const userBlock = document.getElementById('sidebar-user-block');
    if (userBlock) {
      userBlock.style.cursor = 'pointer';
      userBlock.addEventListener('click', () => {
        Router.go('#/profile');
      });
    }
  },

  switchWorkspace(newWorkspaceId) {
    import('../app.js').then(app => {
      app.switchWorkspaceFlow(newWorkspaceId);
    });
  },

  cleanup() {
    if (_unsubscribeUser) _unsubscribeUser();
    if (_unsubscribeWorkspaces) _unsubscribeWorkspaces();
    if (_unsubscribeCurrentWs) _unsubscribeCurrentWs();
  }
};
