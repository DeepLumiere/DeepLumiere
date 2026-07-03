// ═══════════════════════════════════════════════════
// TaskFlow v2 — App Entry Point (Bootstrapper)
// This is the brain of the entire application.
// Executed once, it wires auth → state → UI.
// ═══════════════════════════════════════════════════

import { watchAuthState }            from './auth/auth.js';
import { State }                     from './store/state.js';
import { syncUser }                  from './db/users.js';
import { getUserWorkspaces }         from './db/workspaces.js';
import { subscribeToMembers }        from './db/members.js';
import { subscribeToProjects }       from './db/projects.js';
import { subscribeToTasks }          from './db/tasks.js';
import { subscribeToNotifications }  from './db/notifications.js';
import { subscribeToClients }        from './db/clients.js';
import { subscribeToTickets }        from './db/tickets.js';
import { Sidebar }                   from './ui/sidebar.js';
import { Topbar }                    from './ui/topbar.js';
import { Router }                    from './ui/router.js';

// ── Active Firestore Unsubscribers ────────────────
let _activeListeners = [];

function clearListeners() {
  _activeListeners.forEach(fn => {
    if (typeof fn === 'function') fn();
  });
  _activeListeners = [];
}

// ── Boot Sequence ─────────────────────────────────
watchAuthState(async (firebaseUser) => {
  const loader = document.getElementById('app-loader');

  if (!firebaseUser) {
    // User is not logged in → redirect to login page
    if (loader) loader.classList.remove('fade-out');
    window.location.href = 'login.html';
    return;
  }

  // ── 1. Sync user to Firestore and load into State ──
  const user = await syncUser(firebaseUser);
  State.set('user', user);

  // ── 2. Load all workspaces this user belongs to ──
  const workspaces = await getUserWorkspaces(user.uid);
  State.set('workspaces', workspaces);

  if (workspaces.length === 0) {
    // New user with no workspace → prompt to create one
    if (loader) loader.classList.add('fade-out');
    setTimeout(() => { if (loader) loader.style.display = 'none'; }, 300);
    
    // Initialize shell first so modal can render
    Sidebar.init();
    Topbar.init();
    
    const modals = await import('./ui/modals.js');
    modals.Modals.init();
    const ws = await modals.Modals.openCreateWorkspace();
    if (ws) {
      await bootWorkspace(ws.id, ws, user);
      Router.init();
    }
    return;
  }

  // ── 3. Pick the active workspace ──
  // Use last-used from localStorage if available, else first in list
  const lastUsedId = localStorage.getItem('tf_last_workspace');
  const targetWs = workspaces.find(w => w.id === lastUsedId) || workspaces[0];

  await bootWorkspace(targetWs.id, targetWs, user);

  // ── 4. Initialize UI Shell ──
  Sidebar.init();
  Topbar.init();
  const modals = await import('./ui/modals.js');
  modals.Modals.init();

  // ── 5. Start Router ──
  Router.init();

  // ── 6. Dismiss App Loader ──
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 300);
  }

  State.set('isLoading', false);
});

// ── Workspace Boot ────────────────────────────────
/**
 * Subscribe to all real-time listeners for the active workspace.
 * Called on first load AND when user switches workspace.
 */
async function bootWorkspace(workspaceId, workspaceData, user) {
  clearListeners();

  State.set('currentWorkspace', workspaceData);
  localStorage.setItem('tf_last_workspace', workspaceId);

  // Determine role from workspace_members
  const { collection, query, where, getDocs, getFirestore } = 
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const { db } = await import('./firebase-config.js');

  const memberId = `${workspaceId}_${user.uid}`;
  const memberDoc = await getDocs(
    query(collection(db, 'workspace_members'), where('workspaceId', '==', workspaceId), where('userId', '==', user.uid))
  );

  let role = 'Viewer';
  if (!memberDoc.empty) {
    role = memberDoc.docs[0].data().role;
  }

  State.set('myRole', role);

  _activeListeners.push(
    subscribeToMembers(workspaceId),
    subscribeToProjects(workspaceId),
    subscribeToTasks(workspaceId),
    subscribeToNotifications(workspaceId),
    subscribeToClients(workspaceId),
    subscribeToTickets(workspaceId)
  );
}

// ── Workspace Switcher ────────────────────────────
/**
 * Called by Sidebar when user clicks a different workspace.
 * Clears listeners, re-boots with new workspace, and re-renders sidebar/views.
 */
export async function switchWorkspaceFlow(newWorkspaceId) {
  const workspaces = State.get('workspaces');
  const newWs = workspaces.find(w => w.id === newWorkspaceId);
  if (!newWs) return;

  const user = State.get('user');
  
  // Show loader briefly
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.display = 'flex';
    loader.classList.remove('fade-out');
  }

  // Reset task/filter state
  State.set('tasks', []);
  State.set('currentTask', null);
  State.set('filters', {
    projectId: null,
    assigneeId: null,
    priority: null,
    labelIds: [],
    search: '',
    showDone: false,
  });

  await bootWorkspace(newWorkspaceId, newWs, user);

  // Re-render sidebar to reflect new workspace + role-based nav
  Sidebar.render();

  // Navigate to dashboard
  window.location.hash = '#/dashboard';

  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 300);
  }
}
