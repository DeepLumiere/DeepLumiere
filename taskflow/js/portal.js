// ═══════════════════════════════════════════════════
// TaskFlow v2 — Support Portal JavaScript
// Standalone module: no auth, read-write Firestore tickets access.
// ═══════════════════════════════════════════════════

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Firebase Config (Production) ──
const firebaseConfig = {
  apiKey: "AIzaSyAk_YmDpbaedj-McM2K7ALUqkJyIJBKcfM",
  authDomain: "taskflow-e7f24.firebaseapp.com",
  projectId: "taskflow-e7f24",
  storageBucket: "taskflow-e7f24.firebasestorage.app",
  messagingSenderId: "431732571375",
  appId: "1:431732571375:web:b14d105be4058b0e79af1a"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── DOM References ──
const loaderEl   = document.getElementById('portal-loader');
const headerEl   = document.getElementById('portal-header');
const contentEl  = document.getElementById('portal-content');
const errorEl    = document.getElementById('portal-error');
const formEl     = document.getElementById('ticket-form');
const listEl     = document.getElementById('ticket-list');

// ── Parse URL Params ──
const params = new URLSearchParams(window.location.search);
const clientId   = params.get('c');
const workspaceId = params.get('w');

async function boot() {
  try {
    if (!clientId || !workspaceId) throw new Error('Missing parameters');

    // 1. Validate client record
    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    if (!clientDoc.exists()) throw new Error('Client not found');

    const client = clientDoc.data();
    if (client.workspaceId !== workspaceId) throw new Error('Invalid workspace');

    // 2. Fetch workspace for branding
    const wsDoc = await getDoc(doc(db, 'workspaces', workspaceId));
    if (!wsDoc.exists()) throw new Error('Workspace not found');

    const ws = wsDoc.data();

    // 3. Render header branding
    const logoEl = document.getElementById('portal-logo');
    if (ws.logoURL) {
      logoEl.src = ws.logoURL;
    } else {
      logoEl.style.display = 'none';
    }
    document.getElementById('portal-title').textContent = `${ws.name} — Support Portal`;
    document.getElementById('portal-subtitle').textContent = `Client: ${client.name}`;
    document.title = `${ws.name} — Client Support Portal`;

    // 4. Set up realtime listener for tickets
    const q = query(
      collection(db, 'tickets'),
      where('workspaceId', '==', workspaceId),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
      const tickets = [];
      snapshot.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));
      renderTickets(tickets);
    }, (err) => {
      console.error("Subscription error: ", err);
    });

    // 5. Wire up ticket form submission
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('ticket-title');
      const descInput = document.getElementById('ticket-desc');
      const btn = document.getElementById('btn-submit-ticket');

      const title = titleInput.value.trim();
      const description = descInput.value.trim();

      if (!title || !description) return;

      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        await addDoc(collection(db, 'tickets'), {
          title,
          description,
          workspaceId,
          clientId,
          status: 'pending',
          createdAt: new Date(),
          convertedTaskId: null,
        });

        titleInput.value = '';
        descInput.value = '';
        alert('Ticket submitted successfully!');
      } catch (err) {
        console.error('Error submitting ticket:', err);
        alert('Failed to submit ticket. Please try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Ticket';
      }
    });

    // 6. Show content
    loaderEl.style.display = 'none';
    headerEl.classList.remove('hidden');
    contentEl.classList.remove('hidden');

  } catch (err) {
    console.error('Portal boot error:', err);
    loaderEl.style.display = 'none';
    errorEl.classList.remove('hidden');
  }
}

function renderTickets(tickets) {
  if (tickets.length === 0) {
    listEl.innerHTML = `<div style="padding: var(--sp-8); text-align: center; color: var(--color-text-muted);">No tickets submitted yet.</div>`;
    return;
  }

  const statusLabel = {
    'pending': 'Pending',
    'dropped': 'Dropped',
    'in-progress': 'In Progress',
    'done': 'Done'
  };

  listEl.innerHTML = tickets.map(t => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
    const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const cleanStatus = t.status || 'pending';
    const statusClass = cleanStatus.replace('-', ''); // in-progress -> inprogress

    return `
      <div class="ticket-item">
        <div class="ticket-header">
          <span class="ticket-title-text">${escapeHtml(t.title)}</span>
          <span class="badge-status ${statusClass}">${statusLabel[cleanStatus] || cleanStatus}</span>
        </div>
        <div class="ticket-desc">${escapeHtml(t.description)}</div>
        <div class="ticket-meta">
          <span class="ticket-date">Submitted: ${dateStr}</span>
          ${t.convertedTaskId ? `<span style="font-size:10px; color:var(--color-primary-light); font-weight:600;">Linked to Active Task</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

boot();
