// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Projects
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const PROJECTS_COLLECTION = 'projects';

export async function createProject(workspaceId, data) {
  const ref = collection(db, PROJECTS_COLLECTION);
  return await addDoc(ref, {
    ...data,
    workspaceId,
    createdAt: new Date(),
  });
}

export async function updateProject(projectId, data) {
  const ref = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(ref, data);
}

export async function deleteProject(projectId) {
  await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
}

export function subscribeToProjects(workspaceId) {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const projects = [];
    snapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
    State.set('projects', projects);
  });
}
