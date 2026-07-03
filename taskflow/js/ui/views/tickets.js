// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Support Tickets Management
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { updateTicket, deleteTicket } from '../../db/tickets.js';
import { createTask } from '../../db/tasks.js';
import { Permissions } from '../../auth/permissions.js';
import { formatShortDate } from '../../utils/helpers.js';
import { Toast } from '../toast.js';
import { Router } from '../router.js';

let _unsubTickets = null;
let _unsubClients = null;

export async function render(container) {
  if (!Permissions.isAdmin()) {
    container.innerHTML = `<div class="p-6 text-danger text-center">Unauthorized</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Client Support Tickets</h1>
        <p class="text-sm text-muted mt-1">Manage, convert, and update support tickets submitted by clients.</p>
      </div>
      <div class="flex gap-3">
        <select id="filter-ticket-client" class="form-select btn-sm" style="width: 180px;">
          <option value="">All Clients</option>
        </select>
        <select id="filter-ticket-status" class="form-select btn-sm" style="width: 140px;">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>
    </div>

    <div class="view-container">
      <div class="card p-0" style="overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border-subtle); background:var(--color-surface-2);">
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:150px;">Client</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase;">Ticket Details</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:120px;">Submitted</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; width:160px;">Status</th>
              <th style="padding:var(--sp-3) var(--sp-4); font-size:0.75rem; font-weight:600; color:var(--color-text-subtle); text-transform:uppercase; text-align:right; width:180px;">Actions</th>
            </tr>
          </thead>
          <tbody id="tickets-table-body">
            <tr><td colspan="5" class="p-6 text-center text-muted">Loading tickets...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind dropdown filters
  const clientFilter = document.getElementById('filter-ticket-client');
  const statusFilter = document.getElementById('filter-ticket-status');

  const updateTable = () => {
    const tickets = State.get('tickets') || [];
    const clients = State.get('clients') || [];
    const tbody = document.getElementById('tickets-table-body');
    if (!tbody) return;

    // Populate client filter options if empty
    if (clientFilter && clientFilter.options.length === 1) {
      clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        clientFilter.appendChild(opt);
      });
    }

    const selectedClient = clientFilter ? clientFilter.value : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';

    const filtered = tickets.filter(t => {
      if (selectedClient && t.clientId !== selectedClient) return false;
      if (selectedStatus && t.status !== selectedStatus) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-muted">No tickets found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const client = clients.find(c => c.id === t.clientId);
      const clientName = client ? client.name : 'Unknown Client';
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      const dateStr = formatShortDate(d);

      const statusSelectHtml = `
        <select class="form-select btn-sm select-ticket-status" data-id="${t.id}" style="width:100%; font-weight:600;">
          <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
          <option value="dropped" ${t.status === 'dropped' ? 'selected' : ''}>Dropped</option>
        </select>
      `;

      let actionHtml = '';
      if (t.convertedTaskId) {
        actionHtml = `
          <button class="btn btn-ghost btn-sm btn-view-task" data-taskid="${t.convertedTaskId}">
            View Task
          </button>
        `;
      } else {
        actionHtml = `
          <button class="btn btn-primary btn-sm btn-convert" data-id="${t.id}">
            Convert to Task
          </button>
        `;
      }

      return `
        <tr style="border-bottom:1px solid var(--color-border-subtle);" class="ticket-row-item">
          <td style="padding:var(--sp-3) var(--sp-4); font-weight:500;">${clientName}</td>
          <td style="padding:var(--sp-3) var(--sp-4);">
            <div style="font-weight:600; color:var(--color-text); margin-bottom:4px;">${escapeHtml(t.title)}</div>
            <div style="font-size:0.8125rem; color:var(--color-text-muted); line-height:1.4;">${escapeHtml(t.description)}</div>
          </td>
          <td style="padding:var(--sp-3) var(--sp-4); font-size:0.8125rem; color:var(--color-text-subtle);">${dateStr}</td>
          <td style="padding:var(--sp-3) var(--sp-4);">${statusSelectHtml}</td>
          <td style="padding:var(--sp-3) var(--sp-4); text-align:right;">
            <div style="display:flex; justify-content:flex-end; gap:8px; align-items:center;">
              ${actionHtml}
              <button class="btn-icon text-danger btn-delete-ticket" data-id="${t.id}" title="Delete Ticket">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind status changes
    tbody.querySelectorAll('.select-ticket-status').forEach(select => {
      select.addEventListener('change', async () => {
        const id = select.dataset.id;
        const newStatus = select.value;
        try {
          await updateTicket(id, { status: newStatus });
          Toast.show('Ticket status updated', 'success');
        } catch (e) {
          Toast.show('Failed to update status', 'error');
        }
      });
    });

    // Bind delete buttons
    tbody.querySelectorAll('.btn-delete-ticket').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const modals = await import('../modals.js');
        const confirm = await modals.Modals.confirm('Delete Ticket?', 'Are you sure you want to permanently delete this ticket?', true);
        if (confirm) {
          try {
            await deleteTicket(id);
            Toast.show('Ticket deleted', 'success');
          } catch (e) {
            Toast.show('Failed to delete ticket', 'error');
          }
        }
      });
    });

    // Bind view task button
    tbody.querySelectorAll('.btn-view-task').forEach(btn => {
      btn.addEventListener('click', () => {
        Router.go(`#/task/${btn.dataset.taskid}`);
      });
    });

    // Bind convert button
    tbody.querySelectorAll('.btn-convert').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ticketId = btn.dataset.id;
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        btn.disabled = true;
        btn.textContent = 'Converting...';

        try {
          // Create the task in the active workspace
          const ws = State.get('currentWorkspace');
          const task = await createTask(ws.id, {
            title: ticket.title,
            description: ticket.description,
            status: 'todo',
            priority: 'medium'
          });

          if (task) {
            // Update the ticket to link to this task and mark it in-progress
            await updateTicket(ticketId, {
              convertedTaskId: task.id,
              status: 'in-progress'
            });
            Toast.show('Ticket successfully converted to Task!', 'success');
          } else {
            throw new Error('Task creation returned empty');
          }
        } catch (e) {
          console.error(e);
          Toast.show('Failed to convert ticket to task', 'error');
          btn.disabled = false;
          btn.textContent = 'Convert to Task';
        }
      });
    });
  };

  // Subscribe to changes in State
  _unsubTickets = State.subscribe('tickets', updateTable);
  _unsubClients = State.subscribe('clients', updateTable);

  if (clientFilter) clientFilter.addEventListener('change', updateTable);
  if (statusFilter) statusFilter.addEventListener('change', updateTable);

  updateTable();

  return function unmount() {
    if (_unsubTickets) _unsubTickets();
    if (_unsubClients) _unsubClients();
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
