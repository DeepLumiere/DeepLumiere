// ═══════════════════════════════════════════════════
// TaskFlow v2 — SPA Router
// ═══════════════════════════════════════════════════

import { State } from '../store/state.js';
import { Permissions } from '../auth/permissions.js';
import { Toast } from './toast.js';

// Pre-define all routes and their loader functions.
// We use dynamic imports so the user only downloads the JS for the view they are visiting.
const routes = {
  '#/dashboard':     () => import('./views/dashboard.js'),
  '#/board':         () => import('./views/board.js'),
  '#/list':          () => import('./views/listView.js'),
  '#/timeline':      () => import('./views/timeline.js'),
  '#/projects':      () => import('./views/projects.js'),
  '#/team':          () => import('./views/team.js'),
  '#/clients':       () => import('./views/clients.js'),
  '#/tickets':       () => import('./views/tickets.js'),
  '#/notifications': () => import('./views/notificationsView.js'),
  '#/settings':      () => import('./views/settings.js'),
  '#/profile':       () => import('./views/profile.js'),
};

// Store active view unmount function if the view provides one (to clear intervals/events)
let currentUnmount = null;

export const Router = {
  
  /**
   * Initialize router, attach hashchange listener, and trigger first navigation
   */
  init() {
    window.addEventListener('hashchange', this.navigate.bind(this));
    this.navigate(); // Trigger initial route
  },

  /**
   * Programmatically navigate to a hash
   */
  go(hash) {
    window.location.hash = hash;
  },

  /**
   * Core navigation logic
   */
  async navigate() {
    let hash = window.location.hash;
    
    // Default to dashboard if no hash
    if (!hash || hash === '#' || hash === '#/') {
      window.location.hash = '#/dashboard';
      return; // hashchange event will fire and recall navigate()
    }

    // ── Handle Task Detail Drawer Route ──
    // Format: #/task/taskId
    if (hash.startsWith('#/task/')) {
      const taskId = hash.replace('#/task/', '');
      // dynamically import taskDetail and open it
      const taskDetail = await import('./views/taskDetail.js');
      taskDetail.openDrawer(taskId);
      
      // Update sidebar active state based on underlying view, but don't re-render main
      // Just keep currentView as is.
      return; 
    } else {
      // If we navigate away from a task route to a main route, ensure drawer is closed
      const taskDetail = await import('./views/taskDetail.js');
      taskDetail.closeDrawer(false); // false = don't update hash again
    }

    // ── Route Guards ──
    if (hash === '#/clients' && !Permissions.canManageClients()) {
      Toast.show('You do not have permission to view clients.', 'error');
      window.location.hash = '#/dashboard';
      return;
    }
    if (hash === '#/settings' && !Permissions.canManageWorkspace()) {
      Toast.show('Only the Workspace Owner can access settings.', 'error');
      window.location.hash = '#/dashboard';
      return;
    }

    // ── Unmount Previous View ──
    if (currentUnmount && typeof currentUnmount === 'function') {
      currentUnmount();
      currentUnmount = null;
    }

    // Update state
    State.set('currentView', hash.replace('#/', ''));
    updateSidebarActive(hash);

    const mainEl = document.getElementById('main-content');
    if (!mainEl) return;

    // Show loading skeleton while dynamic import loads
    mainEl.innerHTML = `
      <div class="view-container">
        <div class="skeleton" style="width: 200px; height: 32px; margin-bottom: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 400px;"></div>
      </div>
    `;

    // ── Load and Render View ──
    const routeKey = hash.split('?')[0];
    const importFn = routes[routeKey];
    
    if (importFn) {
      try {
        const module = await importFn();
        // The module must export a `render()` function
        // It may optionally return an `unmount()` function
        currentUnmount = await module.render(mainEl);
      } catch (err) {
        console.error('Failed to load view:', err);
        mainEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">⚠️</div>
            <h2 class="empty-state__title">Error loading view</h2>
            <p class="empty-state__desc">There was a problem loading this page. Please try refreshing.</p>
          </div>
        `;
      }
    } else {
      // 404 Route Not Found -> redirect to dashboard
      window.location.hash = '#/dashboard';
    }
  }
};

/**
 * Highlight the active link in the sidebar
 */
function updateSidebarActive(hash) {
  document.querySelectorAll('.sidebar__nav .nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('href') === hash) {
      el.classList.add('active');
    }
  });
}
