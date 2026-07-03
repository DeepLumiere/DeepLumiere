// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Labels (separate from projects)
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'labels';

export async function createLabel(workspaceId, name, color) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    workspaceId,
    name,
    color,
    createdAt: new Date()
  });
}

export async function deleteLabel(labelId) {
  await deleteDoc(doc(db, COLLECTION, labelId));
}

export function subscribeToLabels(workspaceId) {
  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const labels = [];
    snapshot.forEach(doc => labels.push({ id: doc.id, ...doc.data() }));
    State.set('labels', labels);
  });
}
