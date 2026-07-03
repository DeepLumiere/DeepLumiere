import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAk_YmDpbaedj-McM2K7ALUqkJyIJBKcfM",
  authDomain: "taskflow-e7f24.firebaseapp.com",
  projectId: "taskflow-e7f24",
  storageBucket: "taskflow-e7f24.firebasestorage.app",
  messagingSenderId: "431732571375",
  appId: "1:431732571375:web:b14d105be4058b0e79af1a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- State ----
let clientToken = null;
let clientData = null;
let orgId = null;
let allTickets = [];

// ---- Boot ----
const urlParams = new URLSearchParams(window.location.search);
clientToken = urlParams.get('portal');

if (!clientToken) {
  showError("No portal token found in URL. Please use the link provided by your account manager.");
} else {
  initPortal();
}

async function initPortal() {
  showState('loading');
  try {
    const clientSnap = await getDoc(doc(db, "clients", clientToken));
    if (!clientSnap.exists()) {
      showError("This portal link is invalid or has been deactivated. Please contact your account manager.");
      return;
    }
    clientData = { id: clientSnap.id, ...clientSnap.data() };
    orgId = clientData.orgId;

    // Populate branding
    document.getElementById('portal-company-name').textContent = clientData.company || 'Client Portal';
    document.getElementById('portal-hero-subtitle').textContent = `Logged in as ${clientData.company} · ${clientData.email || ''}`;

    showState('portal');
    loadTickets();
  } catch (e) {
    console.error(e);
    showError("Failed to load portal. " + e.message);
  }
}

// ---- State Display ----
function showState(state) {
  document.getElementById('state-loading').style.display = state === 'loading' ? 'flex' : 'none';
  document.getElementById('state-error').style.display  = state === 'error'   ? 'flex' : 'none';
  document.getElementById('state-portal').style.display = state === 'portal'  ? 'block': 'none';
}

function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  showState('error');
}

// ---- Load Tickets ----
async function loadTickets() {
  try {
    const q = query(
      collection(db, "tickets"),
      where("clientToken", "==", clientToken),
      where("source", "==", "portal")
    );
    const snap = await getDocs(q);
    allTickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allTickets.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderTickets();
  } catch(e) {
    console.warn("Could not load tickets:", e.message);
    document.getElementById('tickets-container').innerHTML = `<p class="portal-empty">Unable to load existing requests.</p>`;
  }
}

function renderTickets() {
  const container = document.getElementById('tickets-container');
  const badge = document.getElementById('tickets-count-badge');
  badge.textContent = allTickets.length;

  if (!allTickets.length) {
    container.innerHTML = `
      <div class="portal-empty-state">
        <div class="portal-empty-icon">📋</div>
        <p>No requests yet. Submit your first request above.</p>
      </div>`;
    return;
  }

  container.innerHTML = allTickets.map(t => {
    const statusCls = getStatusClass(t.status);
    const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
    return `
    <div class="portal-ticket-card">
      <div class="portal-ticket-header">
        <div>
          <div class="portal-ticket-id">${escHtml(t.displayId || t.id.slice(0,8))}</div>
          <div class="portal-ticket-title">${escHtml(t.title)}</div>
        </div>
        <span class="portal-status-badge portal-status-${statusCls}">${escHtml(t.status)}</span>
      </div>
      ${t.description ? `<div class="portal-ticket-desc">${escHtml(t.description).replace(/\n/g,'<br>')}</div>` : ''}
      <div class="portal-ticket-meta">
        <span>📅 ${date}</span>
        <span>Priority: ${escHtml(t.priority || 'None')}</span>
      </div>
    </div>`;
  }).join('');
}

function getStatusClass(status) {
  const map = { 'Open': 'open', 'In Progress': 'progress', 'Review': 'review', 'Resolve': 'resolve', 'Closed': 'resolve' };
  return map[status] || 'open';
}

// ---- Submit Ticket ----
window.submitPortalTicket = async () => {
  const nameEl  = document.getElementById('portal-name');
  const emailEl = document.getElementById('portal-email');
  const titleEl = document.getElementById('portal-title');
  const descEl  = document.getElementById('portal-desc');
  const btn     = document.getElementById('submit-btn');

  const name  = nameEl.value.trim();
  const email = emailEl.value.trim();
  const title = titleEl.value.trim();
  const desc  = descEl.value.trim();

  // Validation
  let valid = true;
  [nameEl, emailEl, titleEl].forEach(el => {
    if (!el.value.trim()) { el.classList.add('input-error'); valid = false; }
    else el.classList.remove('input-error');
  });
  if (!valid) { showToast('Please fill in all required fields.', 'error'); return; }

  if (!orgId) { showToast('Portal not properly initialized.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const ticketId = `t_portal_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const displayId = `REQ-${Date.now().toString().slice(-6)}`;

  const tData = {
    orgId: orgId,
    title: title,
    description: `Submitted by: ${name} (${email})\n\n${desc}`,
    project: "",
    assignee: "",
    status: "Open",
    priority: "None",
    source: "portal",
    clientToken: clientToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    displayId: displayId
  };

  try {
    await setDoc(doc(db, "tickets", ticketId), tData);

    // Show success
    document.getElementById('success-ref-id').textContent = displayId;
    document.getElementById('portal-form').style.display = 'none';
    document.getElementById('portal-success').style.display = 'flex';

    // Refresh ticket list
    allTickets.unshift({ id: ticketId, ...tData });
    renderTickets();

    showToast('Request submitted successfully!', 'success');
  } catch(e) {
    console.error(e);
    showToast('Error submitting request: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✉️</span> Submit Request';
  }
};

window.resetPortalForm = () => {
  document.getElementById('portal-name').value = '';
  document.getElementById('portal-email').value = '';
  document.getElementById('portal-title').value = '';
  document.getElementById('portal-desc').value = '';
  document.getElementById('portal-form').style.display = 'block';
  document.getElementById('portal-success').style.display = 'none';
  const btn = document.getElementById('submit-btn');
  btn.disabled = false;
  btn.innerHTML = '<span class="btn-icon">✉️</span> Submit Request';
};

// ---- Utils ----
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('portal-toast');
  const toast = document.createElement('div');
  toast.className = `portal-toast portal-toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// Remove error class on input
document.addEventListener('DOMContentLoaded', () => {
  ['portal-name','portal-email','portal-title','portal-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => el.classList.remove('input-error'));
  });
});
