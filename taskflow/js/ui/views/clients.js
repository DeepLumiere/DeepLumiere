// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Clients & Portals
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { Permissions } from '../../auth/permissions.js';
import { createClient, deleteClient } from '../../db/clients.js';
import { Toast } from '../toast.js';

let _unsubClients = null;

export async function render(container) {
  if (!Permissions.isAdmin()) {
    container.innerHTML = `<div class="p-6 text-danger text-center">Unauthorized</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Clients & Portals</h1>
        <p class="text-sm text-muted mt-1">Manage external clients and portal access links.</p>
      </div>
      <div class="flex gap-2">
        <input type="text" id="new-client-name" class="form-input btn-sm" placeholder="Client Name..." style="width: 200px;">
        <button class="btn btn-primary btn-sm" id="btn-new-client">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Client
        </button>
      </div>
    </div>
    <div class="view-container">
      <div class="card p-0" style="overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border-subtle); background:var(--color-surface-2);">
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Client Name</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Associated Projects</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Portal Link</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="clients-table-body">
            <tr><td colspan="4" class="p-6 text-center text-muted">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-new-client').addEventListener('click', async () => {
    const input = document.getElementById('new-client-name');
    const name = input.value.trim();
    if (!name) {
      Toast.show('Please enter a client name', 'warning');
      return;
    }
    try {
      await createClient(State.get('currentWorkspace').id, { name, projectIds: [] });
      Toast.show('Client created', 'success');
      input.value = '';
    } catch(e) {
      Toast.show('Error creating client', 'error');
    }
  });

  _unsubClients = State.subscribe('clients', (clients) => {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody || !clients) return;

    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-muted">No clients yet.</td></tr>`;
      return;
    }

    const projects = State.get('projects') || [];
    const wsId = State.get('currentWorkspace').id;

    tbody.innerHTML = clients.map(c => {
      // Mock mapping for demo
      const assignedCount = (c.projectIds || []).length;
      // In a real app, URL params would be encrypted or signed for secure sharing
      const portalLink = `${window.location.origin}${window.location.pathname.replace('index.html','')}portal.html?c=${c.id}&w=${wsId}`;

      return `
        <tr style="border-bottom:1px solid var(--color-border-subtle);">
          <td style="padding:var(--sp-3) var(--sp-4); font-weight:500;">${c.name}</td>
          <td style="padding:var(--sp-3) var(--sp-4); font-size:0.8125rem; color:var(--color-text-muted);">
            ${assignedCount} project(s)
          </td>
          <td style="padding:var(--sp-3) var(--sp-4);">
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="text" readonly value="${portalLink}" class="form-input btn-sm" style="width:200px;font-family:monospace;font-size:11px;">
              <button class="btn-icon btn-copy" data-link="${portalLink}" title="Copy Link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </td>
          <td style="padding:var(--sp-3) var(--sp-4); text-align:right;">
            <button class="btn-icon text-danger btn-del" data-id="${c.id}" title="Delete Client">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.link);
        Toast.show('Link copied to clipboard', 'success');
      });
    });

    tbody.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const modals = await import('../modals.js');
        const confirm = await modals.Modals.confirm('Delete Client', 'Remove this client and revoke their portal access?', true);
        if (confirm) {
          try {
            await deleteClient(btn.dataset.id);
            Toast.show('Client removed', 'success');
          } catch(e) {
            Toast.show('Error removing client', 'error');
          }
        }
      });
    });
  });

  return function unmount() {
    if (_unsubClients) _unsubClients();
  };
}
