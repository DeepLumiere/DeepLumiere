// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Profile
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { updateProfile } from '../../db/users.js';
import { Toast } from '../toast.js';
import { getInitials, stringToColor } from '../../utils/helpers.js';

export async function render(container) {
  const user = State.get('user');
  const ws = State.get('currentWorkspace');
  const members = State.get('members') || [];
  const tasks = State.get('tasks') || [];
  
  const myMember = members.find(m => m.userId === user.uid);
  const myTasks = tasks.filter(t => t.assigneeId === user.uid);
  const doneTasks = myTasks.filter(t => t.status === 'done');

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">My Profile</h1>
        <p class="text-sm text-muted mt-1">Manage your personal information and preferences.</p>
      </div>
    </div>

    <div class="view-container" style="max-width: 720px;">
      
      <!-- Profile Card -->
      <div class="card flex-col gap-6 mb-6">
        
        <!-- Avatar & Identity -->
        <div class="flex items-center gap-5 pb-5" style="border-bottom:1px solid var(--color-border-subtle);">
          <div class="avatar avatar-xl" id="profile-avatar" style="background:${stringToColor(user.displayName)};color:#fff;font-size:1.5rem;cursor:pointer;position:relative;overflow:visible;">
            ${user.photoURL 
              ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` 
              : `<span>${getInitials(user.displayName)}</span>`
            }
          </div>
          <div class="flex-col gap-1 flex-1">
            <div class="text-xl font-bold">${user.displayName}</div>
            <div class="text-sm text-muted">${user.email}</div>
            <div class="badge mt-1" style="background:var(--color-primary-alpha);color:var(--color-primary-light);">
              ${myMember?.role || 'Member'}
            </div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="three-col-grid" style="gap:var(--sp-4);">
          <div class="card-sm text-center">
            <div class="text-2xl font-bold text-primary">${myTasks.length}</div>
            <div class="text-xs text-muted font-medium mt-1">Tasks Assigned</div>
          </div>
          <div class="card-sm text-center">
            <div class="text-2xl font-bold text-success">${doneTasks.length}</div>
            <div class="text-xs text-muted font-medium mt-1">Completed</div>
          </div>
          <div class="card-sm text-center">
            <div class="text-2xl font-bold text-warning">${myTasks.filter(t => t.status === 'in-progress').length}</div>
            <div class="text-xs text-muted font-medium mt-1">In Progress</div>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="flex-col gap-4">
          <h3 class="text-md font-semibold">Account Details</h3>
          
          <div class="form-group">
            <label class="form-label">Display Name</label>
            <input type="text" class="form-input" id="prof-name" value="${user.displayName}" placeholder="Your full name">
          </div>
          
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" value="${user.email}" disabled style="opacity:0.5;" title="Email cannot be changed here">
          </div>

          <button class="btn btn-primary" id="btn-save-profile" style="align-self:flex-start;">
            Save Changes
          </button>
          <div id="prof-save-status" style="font-size:0.8125rem; color:var(--color-success); display:none; align-self:flex-start;">
            ✓ Saved successfully
          </div>
        </div>
      </div>

      <!-- Workspace Info -->
      <div class="card flex-col gap-4">
        <h3 class="text-md font-semibold">Workspace</h3>
        <div class="flex items-center gap-3">
          <div class="avatar avatar-sm" style="background:${stringToColor(ws?.name || 'WS')};color:#fff;border-radius:6px;">
            ${getInitials(ws?.name || 'WS')}
          </div>
          <div>
            <div class="text-sm font-semibold">${ws?.name || 'Unknown'}</div>
            <div class="text-xs text-muted">Your current workspace</div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Save handler
  const saveBtn = document.getElementById('btn-save-profile');
  const statusEl = document.getElementById('prof-save-status');

  saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('prof-name').value.trim();
    if (!name) {
      Toast.show('Name cannot be empty.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await updateProfile(user.uid, { displayName: name });
      State.update('user', curr => ({ ...curr, displayName: name }));
      Toast.show('Profile updated.', 'success');
      statusEl.style.display = 'block';
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    } catch (e) {
      Toast.show('Error saving profile.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}
