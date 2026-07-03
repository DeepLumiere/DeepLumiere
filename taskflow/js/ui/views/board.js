// ═══════════════════════════════════════════════════
// TaskFlow v2 — View: Kanban Board
// ═══════════════════════════════════════════════════

import { State } from '../../store/state.js';
import { Permissions } from '../../auth/permissions.js';
import { createTask } from '../../db/tasks.js';
import { renderTaskCard } from '../components/taskCard.js';
import { DragDrop } from '../../utils/dragdrop.js';

let _unsubTasks = null;
let _boardContainer = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view-header" style="padding: 0 var(--sp-6);">
      <div>
        <h1 class="view-title">Board</h1>
        <p class="text-sm text-muted mt-1">Manage tasks across stages.</p>
      </div>
      
      <!-- Filter Bar Placeholder (omitted for brevity, could be added later) -->
    </div>
    
    <div class="kanban-board" id="board-container">
      ${renderColumn('todo', 'To Do', 'dot-todo')}
      ${renderColumn('in-progress', 'In Progress', 'dot-in-progress')}
      ${renderColumn('review', 'In Review', 'dot-review')}
      ${renderColumn('done', 'Done', 'dot-done')}
    </div>
  `;

  _boardContainer = document.getElementById('board-container');
  DragDrop.init(_boardContainer);
  
  bindQuickAddEvents();

  // Subscribe to task state changes
  _unsubTasks = State.subscribe('tasks', (tasks) => {
    updateColumns(tasks || []);
  });

  return function unmount() {
    if (_unsubTasks) _unsubTasks();
  };
}

function renderColumn(status, name, dotClass) {
  return `
    <div class="kanban-column" data-status="${status}" id="col-${status}">
      <div class="column-header">
        <div class="column-status-dot ${dotClass}"></div>
        <div class="column-name">${name}</div>
        <div class="column-count" id="count-${status}">0</div>
        ${Permissions.canCreateTask() ? `
          <div class="column-add-btn" data-target="${status}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        ` : ''}
      </div>
      <div class="quick-add-wrap hidden" id="quick-add-${status}">
        <input type="text" class="quick-add-input" placeholder="Task title..." id="quick-input-${status}" />
        <span class="quick-add-hint mt-1">Press Enter to save</span>
      </div>
      <div class="column-cards" id="cards-${status}">
        <!-- Tasks injected here -->
      </div>
    </div>
  `;
}

function updateColumns(tasks) {
  const cols = ['todo', 'in-progress', 'review', 'done'];
  
  cols.forEach(col => {
    const colTasks = tasks.filter(t => t.status === col);
    
    // Update count
    const countEl = document.getElementById(`count-${col}`);
    if (countEl) countEl.textContent = colTasks.length;
    
    // Update cards
    const cardsEl = document.getElementById(`cards-${col}`);
    if (cardsEl) {
      cardsEl.innerHTML = colTasks.map(t => renderTaskCard(t)).join('');
      
      // Bind click to open drawer
      cardsEl.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
          // Prevent opening if clicking on specific interactive elements inside card later
          window.location.hash = `#/task/${card.dataset.id}`;
        });
      });
    }
  });
}

function bindQuickAddEvents() {
  const ws = State.get('currentWorkspace');
  
  document.querySelectorAll('.column-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.target;
      const wrap = document.getElementById(`quick-add-${status}`);
      const input = document.getElementById(`quick-input-${status}`);
      
      if (wrap.classList.contains('hidden')) {
        wrap.classList.remove('hidden');
        input.focus();
      } else {
        wrap.classList.add('hidden');
      }
    });
  });

  document.querySelectorAll('.quick-add-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const title = input.value.trim();
        if (!title) return;
        
        const status = input.id.replace('quick-input-', '');
        input.disabled = true;
        
        try {
          await createTask(ws.id, { title, status });
          input.value = '';
        } catch (err) {
          console.error('Failed to create task:', err);
          import('../toast.js').then(m => m.Toast.show('Failed to create task', 'error'));
        } finally {
          input.disabled = false;
          input.focus();
        }
      } else if (e.key === 'Escape') {
        input.value = '';
        input.parentElement.classList.add('hidden');
      }
    });
    
    // Hide when clicking outside
    input.addEventListener('blur', () => {
      if (!input.value.trim()) {
        input.parentElement.classList.add('hidden');
      }
    });
  });
}
