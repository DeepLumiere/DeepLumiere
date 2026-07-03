// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Settings & Profile
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { updateWorkspace } from '../../db/workspaces.js';
import { updateProfile } from '../../db/users.js';
import { Toast } from '../toast.js';
import { Permissions } from '../../auth/permissions.js';

// ── Settings (Workspace) ──
export async function renderSettings(container) {
  if (!Permissions.isOwner()) {
    container.innerHTML = `<div class="p-6 text-danger text-center">Unauthorized</div>`;
    return;
  }

  const ws = State.get('currentWorkspace');

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Workspace Settings</h1>
        <p class="text-sm text-muted mt-1">Manage ${ws.name} preferences.</p>
      </div>
    </div>
    <div class="view-container" style="max-width: 600px;">
      <div class="card flex-col gap-5">
        <div class="form-group">
          <label class="form-label">Workspace Name</label>
          <input type="text" class="form-input" id="set-ws-name" value="${ws.name}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Workspace ID (Share with your team to join)</label>
          <div class="flex gap-2">
            <input type="text" class="form-input flex-1" id="set-ws-id" value="${ws.id}" readonly style="background: var(--color-surface-2); font-family: monospace;">
            <button class="btn btn-ghost" id="btn-copy-ws-id">Copy</button>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-save-settings">Save Changes</button>
      </div>

      <div class="danger-zone mt-6">
        <h3 class="danger-zone__title">Danger Zone</h3>
        <p class="text-sm text-danger opacity-80 mb-4">Deleting a workspace is irreversible and removes all data, tasks, and member access.</p>
        <button class="btn btn-danger" id="btn-delete-ws">Delete Workspace</button>
      </div>
    </div>
  `;

  document.getElementById('btn-copy-ws-id').addEventListener('click', () => {
    const wsIdInput = document.getElementById('set-ws-id');
    wsIdInput.select();
    navigator.clipboard.writeText(wsIdInput.value);
    Toast.show('Workspace ID copied to clipboard!', 'success');
  });

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const name = document.getElementById('set-ws-name').value.trim();
    if (!name) return;
    try {
      await updateWorkspace(ws.id, { name });
      Toast.show('Workspace settings saved.', 'success');
      // Update local state manually so header updates immediately
      State.update('currentWorkspace', curr => ({ ...curr, name }));
      State.update('workspaces', list => list.map(w => w.id === ws.id ? { ...w, name } : w));
    } catch(e) {
      Toast.show('Error saving settings.', 'error');
    }
  });

  document.getElementById('btn-delete-ws').addEventListener('click', async () => {
    const modals = await import('../modals.js');
    const res = await modals.Modals.confirm('Delete Workspace', `Type "${ws.name}" to confirm deletion: (MOCK - Deletion disabled in demo)`, true);
    if (res) {
      Toast.show('Workspace deletion is disabled in this demo.', 'warning');
    }
  });
}

// ── Profile ──
export async function renderProfile(container) {
  const user = State.get('user');
  
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">My Profile</h1>
        <p class="text-sm text-muted mt-1">Manage your personal settings.</p>
      </div>
    </div>
    <div class="view-container" style="max-width: 600px;">
      <div class="card flex-col gap-5">
        
        <div class="flex items-center gap-4 mb-2">
          <div class="avatar avatar-xl" style="background:var(--color-surface-3);">
            ${user.photoURL ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover"/>` : ''}
          </div>
          <div>
            <div class="text-lg font-bold">${user.displayName}</div>
            <div class="text-sm text-muted">${user.email}</div>
          </div>
        </div>

        <div class="form-group mt-4">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" id="prof-name" value="${user.displayName}">
        </div>

        <button class="btn btn-primary" id="btn-save-profile">Save Profile</button>
      </div>
    </div>
  `;

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const name = document.getElementById('prof-name').value.trim();
    if (!name) return;
    try {
      await updateProfile(user.uid, { displayName: name });
      Toast.show('Profile saved.', 'success');
      State.update('user', curr => ({ ...curr, displayName: name }));
    } catch(e) {
      Toast.show('Error saving profile.', 'error');
    }
  });
}

// Export render so router can call it
export const render = renderSettings;
