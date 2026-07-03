// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Subtasks
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';

const COLLECTION = 'subtasks';

export async function createSubtask(taskId, title) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    taskId,
    title,
    isDone: false,
    createdAt: new Date(),
  });
}

export async function updateSubtask(subtaskId, data) {
  const ref = doc(db, COLLECTION, subtaskId);
  await updateDoc(ref, data);
}

export async function deleteSubtask(subtaskId) {
  await deleteDoc(doc(db, COLLECTION, subtaskId));
}

/**
 * Note: Subtasks are specific to a task, so we don't store them in global state.
 * We return the unsubscribe function so the TaskDetail view can manage it.
 */
export function subscribeToSubtasks(taskId, callback) {
  const q = query(
    collection(db, COLLECTION),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const subtasks = [];
    snapshot.forEach(doc => subtasks.push({ id: doc.id, ...doc.data() }));
    callback(subtasks);
  });
}
