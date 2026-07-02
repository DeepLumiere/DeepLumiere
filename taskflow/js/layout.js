export function injectLayout() {
  const shell = document.getElementById('app-shell');
  if (!shell) return;
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'dashboard';

  const sidebarHTML = `
    <aside class="sidebar">
      <div class="sidebar-header" style="flex-direction: column; align-items: stretch; gap: 12px; height: auto; padding: 20px;">
        <div class="flex items-center gap-2" style="justify-content: space-between;">
          <div class="flex items-center gap-2">
            <i data-lucide="layers"></i>
            <h2 style="font-size: 18px; color: var(--text); letter-spacing: 0; margin: 0;">TaskFlow<span style="color: var(--primary);">Pro</span></h2>
          </div>
          <button class="btn-ghost" style="padding: 4px;" onclick="openCreateOrgModal()" title="Create/Join Workspace"><i data-lucide="plus" style="width:16px;height:16px;"></i></button>
        </div>
        <select class="select" id="sidebar-org-switcher" onchange="switchOrganization(this.value)" style="margin-top: 8px; width: 100%; font-size: 13px;">
           <option value="">Loading workspaces...</option>
        </select>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-title">Overview</div>
          <a href="dashboard.html" class="nav-item ${page === 'dashboard' ? 'active' : ''}"><i data-lucide="layout-dashboard"></i> Dashboard</a>
        </div>
        <div class="nav-section">
          <div class="nav-title">Tasks & Tickets</div>
          <a href="kanban.html" class="nav-item ${page === 'kanban' ? 'active' : ''}"><i data-lucide="kanban-square"></i> Kanban Board</a>
          <a href="tickets.html" class="nav-item ${page === 'tickets' ? 'active' : ''}"><i data-lucide="list-todo"></i> All Tasks</a>
        </div>
        <div class="nav-section">
          <div class="nav-title">Projects</div>
          <a href="projects.html" class="nav-item ${page === 'projects' || page === 'project-detail' ? 'active' : ''}"><i data-lucide="folder-kanban"></i> All Projects</a>
        </div>
        <div class="nav-section">
          <div class="nav-title">Directory</div>
          <a href="team.html" class="nav-item ${page === 'team' ? 'active' : ''}"><i data-lucide="users"></i> Team & Subteams</a>
          <a href="clients.html" class="nav-item ${page === 'clients' ? 'active' : ''}"><i data-lucide="building-2"></i> Clients</a>
        </div>
        <div class="nav-section">
          <div class="nav-title">System</div>
          <a href="settings.html" class="nav-item ${page === 'settings' ? 'active' : ''}"><i data-lucide="settings"></i> Settings</a>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-avatar" id="current-user-avatar" style="cursor: pointer;" onclick="window.location.href='settings.html'">?</div>
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; cursor: pointer;" id="current-user-name" onclick="window.location.href='settings.html'">Loading...</div>
        <button class="btn-ghost" style="padding: 6px; border-radius: var(--radius-full);" onclick="window.appLogout()" title="Sign Out"><i data-lucide="log-out" style="width: 16px; height: 16px;"></i></button>
      </div>
    </aside>
  `;
  shell.insertAdjacentHTML('afterbegin', sidebarHTML);
}