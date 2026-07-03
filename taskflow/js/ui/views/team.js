// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Team
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { Permissions } from '../../auth/permissions.js';
import { updateMemberRole, removeMember } from '../../db/members.js';
import { getInitials, stringToColor } from '../../utils/helpers.js';
import { Toast } from '../toast.js';

let _unsubMembers = null;

export async function render(container) {
  if (!Permissions.isAdmin()) {
    container.innerHTML = `<div class="p-6 text-danger text-center">Unauthorized</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Team Members</h1>
        <p class="text-sm text-muted mt-1">Manage workspace access and roles.</p>
      </div>
      <div class="flex gap-2">
        <input type="email" id="invite-email-input" class="form-input btn-sm" placeholder="Email address..." style="width: 200px;">
        <button class="btn btn-primary btn-sm" id="btn-invite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Invite
        </button>
      </div>
    </div>
    <div class="view-container">
      <div class="card p-0" style="overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border-subtle); background:var(--color-surface-2);">
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">User</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Role</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Joined</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="team-table-body">
            <tr><td colspan="4" class="p-6 text-center text-muted">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-invite').addEventListener('click', async () => {
    const input = document.getElementById('invite-email-input');
    const email = input.value.trim();
    if (!email) {
      Toast.show('Please enter an email address', 'warning');
      return;
    }
    
    try {
      const wsName = State.get('currentWorkspace').name;
      Toast.show('Sending invite...', 'info');
      
      const message = await window.Email.send({
        Host : "smtp.gmail.com",
        Username : "dudecomputerscience@gmail.com",
        Password : "hqxv gmmr drsh auof",
        To : email,
        From : "dudecomputerscience@gmail.com",
        Subject : `You have been invited to join ${wsName} on TaskFlow`,
        Body : `Hello!<br><br>You have been invited to join the workspace <b>${wsName}</b> on TaskFlow.<br>Click here to join: <a href="${window.location.origin}${window.location.pathname}">TaskFlow App</a><br><br>Regards,<br>TaskFlow Team`
      });
      
      if (message === 'OK') {
        Toast.show('Invitation sent successfully!', 'success');
        input.value = '';
      } else {
        Toast.show(`Failed to send: ${message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      Toast.show('Error sending invitation', 'error');
    }
  });

  _unsubMembers = State.subscribe('members', (members) => {
    const tbody = document.getElementById('team-table-body');
    if (!tbody || !members) return;

    tbody.innerHTML = members.map(m => {
      const isMe = m.userId === State.get('user').uid;
      const d = m.joinedAt?.toDate ? m.joinedAt.toDate() : new Date(m.joinedAt);
      const joinedStr = d.toLocaleDateString();
      
      const canEdit = Permissions.isOwner() && !isMe; // Only owner can change roles for others, simplify for demo

      return `
        <tr style="border-bottom:1px solid var(--color-border-subtle);">
          <td style="padding:var(--sp-3) var(--sp-4);">
            <div class="flex items-center gap-3">
              <div class="avatar avatar-md" style="background:${m.photoURL ? 'transparent' : stringToColor(m.name)}">
                ${m.photoURL ? `<img src="${m.photoURL}" style="width:100%;height:100%;object-fit:cover"/>` : getInitials(m.name)}
              </div>
              <div>
                <div class="font-medium text-sm">${m.name} ${isMe ? '<span class="text-xs text-muted">(You)</span>' : ''}</div>
                <div class="text-xs text-muted">${m.email}</div>
              </div>
            </div>
          </td>
          <td style="padding:var(--sp-3) var(--sp-4);">
            ${canEdit ? `
              <select class="form-select btn-sm role-select" data-uid="${m.userId}" style="width:120px;">
                <option value="Admin" ${m.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
                <option value="Viewer" ${m.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
              </select>
            ` : `<span class="badge" style="background:var(--color-surface-3);">${m.role}</span>`}
          </td>
          <td style="padding:var(--sp-3) var(--sp-4); font-size:0.8125rem; color:var(--color-text-muted);">${joinedStr}</td>
          <td style="padding:var(--sp-3) var(--sp-4); text-align:right;">
            ${canEdit ? `
              <button class="btn-icon text-danger btn-remove" data-uid="${m.userId}" title="Remove Member">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        try {
          await updateMemberRole(State.get('currentWorkspace').id, e.target.dataset.uid, e.target.value);
          Toast.show('Role updated', 'success');
        } catch(err) {
          Toast.show('Error updating role', 'error');
        }
      });
    });

    tbody.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const modals = await import('../modals.js');
        const confirm = await modals.Modals.confirm('Remove Member', 'Are you sure you want to remove this user from the workspace?', true);
        if (confirm) {
          try {
            await removeMember(State.get('currentWorkspace').id, btn.dataset.uid);
            Toast.show('Member removed', 'success');
          } catch(err) {
            Toast.show('Error removing member', 'error');
          }
        }
      });
    });
  });

  return function unmount() {
    if (_unsubMembers) _unsubMembers();
  };
}
