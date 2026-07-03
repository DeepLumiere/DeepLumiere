// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Tasks
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';
import { logActivity } from './activity.js';

const COLLECTION = 'tasks';

/**
 * Creates a new task
 */
export async function createTask(workspaceId, data) {
  const user = State.get('user');
  if (!user) return null;

  const taskData = {
    ...data,
    workspaceId,
    reporterId: user.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Standard defaults if missing
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assigneeId: data.assigneeId || null,
    projectId: data.projectId || null,
    dueDate: data.dueDate || null,
    labels: data.labels || [],
    description: data.description || '',
    estimatedHours: data.estimatedHours || null,
  };

  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, taskData);

  // Log activity
  await logActivity(workspaceId, docRef.id, 'task_created', { title: taskData.title });

  return { id: docRef.id, ...taskData };
}

/**
 * Updates a task and logs activity for specific fields
 */
export async function updateTask(taskId, updates) {
  const ws = State.get('currentWorkspace');
  if (!ws) return;

  const ref = doc(db, COLLECTION, taskId);
  
  // Get old data for activity logging
  const oldSnap = await getDoc(ref);
  const oldData = oldSnap.exists() ? oldSnap.data() : {};

  updates.updatedAt = new Date();
  await updateDoc(ref, updates);

  // Activity logic based on changed fields
  if (updates.status && updates.status !== oldData.status) {
    await logActivity(ws.id, taskId, 'status_changed', { 
      oldStatus: oldData.status, 
      newStatus: updates.status 
    });
  }
  if ('assigneeId' in updates && updates.assigneeId !== oldData.assigneeId) {
    await logActivity(ws.id, taskId, 'assignee_changed', { 
      newAssigneeId: updates.assigneeId 
    });
  }
}

/**
 * Delete a task entirely
 */
export async function deleteTask(taskId) {
  await deleteDoc(doc(db, COLLECTION, taskId));
}

/**
 * Subscribe to tasks for a workspace, applying State filters locally.
 * Using onSnapshot allows real-time updates.
 */
export function subscribeToTasks(workspaceId) {
  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    let tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));

    // Apply client-side filters (State.filters)
    const filters = State.get('filters') || {};
    
    if (filters.projectId) {
      tasks = tasks.filter(t => t.projectId === filters.projectId);
    }
    if (filters.assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }
    if (filters.labelIds && filters.labelIds.length > 0) {
      tasks = tasks.filter(t => filters.labelIds.every(l => (t.labels || []).includes(l)));
    }
    if (!filters.showDone) {
      // By default, board might show done, list might not. 
      // We will handle specific view requirements in the UI layers.
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      tasks = tasks.filter(t => 
        (t.title || '').toLowerCase().includes(s) || 
        (t.description || '').toLowerCase().includes(s)
      );
    }

    State.set('tasks', tasks);

    // If detail drawer is open for a task, update currentTask state
    const currentTask = State.get('currentTask');
    if (currentTask) {
      const updatedTask = tasks.find(t => t.id === currentTask.id);
      if (updatedTask) State.set('currentTask', updatedTask);
    }
  });
}

/**
 * Fetch a single task by ID (for initial drawer load)
 */
export async function getTask(taskId) {
  const ref = doc(db, COLLECTION, taskId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
