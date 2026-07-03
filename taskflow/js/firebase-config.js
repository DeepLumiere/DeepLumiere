import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
      showError("This portal link is invalid or has been deactivated.");
      return;
    }
    clientData = { id: clientSnap.id, ...clientSnap.data() };
    orgId = clientData.orgId;

    document.getElementById('portal-company-name').textContent = clientData.company || 'Client Portal';
    document.getElementById('portal-hero-subtitle').textContent = `Logged in as ${clientData.company}`;

    showState('portal');
    loadTickets();
  } catch (e) {
    console.error(e);
    showError("Failed to load portal.");
  }
}

function showState(state) {
  document.getElementById('state-loading').style.display = state === 'loading' ? 'flex' : 'none';
  document.getElementById('state-error').style.display  = state === 'error'   ? 'flex' : 'none';
  document.getElementById('state-portal').style.display = state === 'portal'  ? 'block': 'none';
}

function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  showState('error');
}

async function loadTickets() {
  try {
    const q = query(collection(db, "tickets"), where("clientToken", "==", clientToken), where("source", "==", "portal"));
    const snap = await getDocs(q);
    allTickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allTickets.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderTickets();
  } catch(e) {
    document.getElementById('tickets-container').innerHTML = `<p class="portal-empty">Unable to load requests.</p>`;
  }
}

function renderTickets() {
  const container = document.getElementById('tickets-container');
  const badge = document.getElementById('tickets-count-badge');
  badge.textContent = allTickets.length;

  if (!allTickets.length) {
    container.innerHTML = `<div class="portal-empty-state"><p>No requests yet. Submit your first request above.</p></div>`;
    return;
  }

  container.innerHTML = allTickets.map(t => {
    const statusCls = t.status === 'Open' ? 'open' : 'progress';
    const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—';
    return `
    <div class="portal-ticket-card">
      <div class="portal-ticket-header">
        <div>
          <div class="portal-ticket-id">${escHtml(t.displayId || t.id.slice(0,8))}</div>
          <div class="portal-ticket-title">${escHtml(t.title)}</div>
        </div>
        <span class="portal-status-badge portal-status-${statusCls}">${escHtml(t.status)}</span>
      </div>
    </div>`;
  }).join('');
}

window.submitPortalTicket = async () => {
  const name = document.getElementById('portal-name').value.trim();
  const email = document.getElementById('portal-email').value.trim();
  const title = document.getElementById('portal-title').value.trim();
  const desc = document.getElementById('portal-desc').value.trim();

  if (!name || !email || !title) return alert('Fill required fields');
  if (!orgId) return alert('Portal not properly initialized.');

  const ticketId = `t_portal_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const displayId = `REQ-${Date.now().toString().slice(-6)}`;

  const tData = {
    orgId: orgId, // CRITICAL: This was failing the Security Rules before
    title: title,
    description: `Submitted by: ${name} (${email})\n\n${desc}`,
    project: "",
    assignee: "",
    status: "Open",
    priority: "None",
    source: "portal",
    clientToken: clientToken,
    createdAt: new Date().toISOString(),
    displayId: displayId
  };

  try {
    await setDoc(doc(db, "tickets", ticketId), tData);
    document.getElementById('success-ref-id').textContent = displayId;
    document.getElementById('portal-form').style.display = 'none';
    document.getElementById('portal-success').style.display = 'flex';
  } catch(e) {
    alert('Error submitting request: ' + e.message);
  }
};

function escHtml(str) { return String(str).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
