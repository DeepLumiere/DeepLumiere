// ═══════════════════════════════════════════════════
// TaskFlow v2 — Client Portal JavaScript
// Standalone module: no auth, read-only Firestore access.
// ═══════════════════════════════════════════════════

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Firebase Config (Same as main app) ──
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTaskFlowV2Implementation",
  authDomain: "taskflow-v2.firebaseapp.com",
  projectId: "taskflow-v2",
  storageBucket: "taskflow-v2.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── DOM References ──
const loaderEl   = document.getElementById('portal-loader');
const headerEl   = document.getElementById('portal-header');
const contentEl  = document.getElementById('portal-content');
const errorEl    = document.getElementById('portal-error');

// ── Parse URL Params ──
const params = new URLSearchParams(window.location.search);
const clientId   = params.get('c');
const workspaceId = params.get('w');

async function boot() {
  try {
    // 1. Validate client record exists
    if (!clientId || !workspaceId) throw new Error('Missing parameters');

    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    if (!clientDoc.exists()) throw new Error('Client not found');

    const client = clientDoc.data();
    if (client.workspaceId !== workspaceId) throw new Error('Invalid workspace');

    // 2. Fetch workspace for branding
    const wsDoc = await getDoc(doc(db, 'workspaces', workspaceId));
    if (!wsDoc.exists()) throw new Error('Workspace not found');

    const ws = wsDoc.data();

    // 3. Render header
    const logoEl = document.getElementById('portal-logo');
    if (ws.logoURL) {
      logoEl.src = ws.logoURL;
    } else {
      logoEl.style.display = 'none';
    }
    document.getElementById('portal-title').textContent = `${ws.name} — Tasks`;
    document.getElementById('portal-subtitle').textContent = `Portal for ${client.name}`;
    document.title = `${ws.name} — Client Portal`;

    // 4. Fetch tasks that belong to this workspace (filtered to client's projects)
    const projectIds = client.projectIds || [];
    
    let tasks = [];
    if (projectIds.length > 0) {
      // Fetch tasks per project (Firestore 'in' supports up to 10 items)
      const batch = [];
      for (let i = 0; i < projectIds.length; i += 10) {
        const slice = projectIds.slice(i, i + 10);
        const q = query(
          collection(db, 'tasks'),
          where('workspaceId', '==', workspaceId),
          where('projectId', 'in', slice)
        );
        const snap = await getDocs(q);
        snap.forEach(d => tasks.push({ id: d.id, ...d.data() }));
      }
    } else {
      // No projects linked → show all tasks in this workspace
      const q = query(
        collection(db, 'tasks'),
        where('workspaceId', '==', workspaceId)
      );
      const snap = await getDocs(q);
      snap.forEach(d => tasks.push({ id: d.id, ...d.data() }));
    }

    // 5. Render board columns
    renderBoard(tasks);

    // 6. Show content
    loaderEl.style.display = 'none';
    headerEl.classList.remove('hidden');
    contentEl.classList.remove('hidden');

  } catch (err) {
    console.error('Portal error:', err);
    loaderEl.style.display = 'none';
    errorEl.classList.remove('hidden');
  }
}

function renderBoard(tasks) {
  const statusMap = {
    'todo': 'col-todo',
    'in-progress': 'col-in-progress',
    'review': 'col-review',
    'done': 'col-done',
    'blocked': 'col-todo', // fallback blocked tasks to todo column
  };

  const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0 };

  tasks.forEach(task => {
    const colId = statusMap[task.status] || 'col-todo';
    const colEl = document.getElementById(colId);
    if (!colEl) return;

    const countKey = task.status === 'blocked' ? 'todo' : (task.status || 'todo');
    if (counts[countKey] !== undefined) counts[countKey]++;

    const card = document.createElement('div');
    card.className = 'portal-card';
    
    let priorityBorder = '';
    if (task.priority === 'critical') priorityBorder = 'border-left:3px solid hsl(0,78%,55%)';
    else if (task.priority === 'high') priorityBorder = 'border-left:3px solid hsl(25,90%,55%)';
    
    let dueDateHtml = '';
    if (task.dueDate) {
      const d = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const now = new Date();
      const isOverdue = d < now && task.status !== 'done';
      dueDateHtml = `
        <div style="font-size:11px;font-weight:600;margin-top:6px;color:${isOverdue ? 'hsl(0,78%,55%)' : 'var(--color-text-muted)'};">
          📅 ${isOverdue ? 'Overdue · ' : ''}${dateStr}
        </div>
      `;
    }

    card.innerHTML = `
      <div style="font-size:13px;font-weight:500;color:var(--color-text);line-height:1.4;${priorityBorder}${priorityBorder ? ';padding-left:8px' : ''}">
        ${task.title}
      </div>
      ${dueDateHtml}
    `;

    colEl.appendChild(card);
  });

  // Update count badges
  Object.entries(counts).forEach(([status, count]) => {
    const el = document.getElementById(`count-${status}`);
    if (el) el.textContent = count;
  });
}

boot();
