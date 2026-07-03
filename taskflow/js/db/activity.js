// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Activity Log
// (Exported separately for clean imports)
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'activity';

/**
 * Log an activity event for a task
 * @param {string} workspaceId 
 * @param {string} taskId 
 * @param {string} type - e.g. 'task_created', 'status_changed', 'assignee_changed'
 * @param {Object} details - Additional context
 */
export async function logActivity(workspaceId, taskId, type, details = {}) {
  const user = State.get('user');
  if (!user) return;

  const ref = collection(db, COLLECTION);
  await addDoc(ref, {
    workspaceId,
    taskId,
    actorId: user.uid,
    actorName: user.displayName,
    type,
    details,
    createdAt: new Date(),
  });
}

/**
 * Subscribe to activity for a specific task
 * @param {string} taskId 
 * @param {function} callback 
 * @returns {function} unsubscribe
 */
export function subscribeToActivity(taskId, callback) {
  const q = query(
    collection(db, COLLECTION),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const activity = [];
    snapshot.forEach(doc => activity.push({ id: doc.id, ...doc.data() }));
    callback(activity);
  });
}

/**
 * Human-readable message generator for activity log items
 */
export function getActivityMessage(item) {
  const actor = `<strong>${item.actorName}</strong>`;

  switch (item.type) {
    case 'task_created':
      return `${actor} created this task`;
    case 'status_changed':
      return `${actor} changed status from <strong>${item.details.oldStatus}</strong> to <strong>${item.details.newStatus}</strong>`;
    case 'assignee_changed':
      if (item.details.newAssigneeId) {
        return `${actor} reassigned this task`;
      }
      return `${actor} unassigned this task`;
    case 'comment_added':
      return `${actor} added a comment`;
    case 'attachment_added':
      return `${actor} attached a file`;
    default:
      return `${actor} updated this task`;
  }
}
