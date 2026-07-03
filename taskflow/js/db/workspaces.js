// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Workspaces
// ═══════════════════════════════════════════════════

import { 
  collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';
import { addMember } from './members.js';

const COLLECTION = 'workspaces';

/**
 * Creates a new workspace and automatically makes the creator an Owner
 */
export async function createWorkspace(name) {
  const user = State.get('user');
  if (!user || !user.uid) throw new Error('Must be logged in to create workspace');

  const wsRef = doc(collection(db, COLLECTION));
  const wsData = {
    name,
    createdAt: new Date(),
    createdBy: user.uid,
    logoURL: null
  };

  await setDoc(wsRef, wsData);

  // Add the creator as Owner in workspace_members
  await addMember(wsRef.id, user.uid, 'Owner', user.email);

  return { id: wsRef.id, ...wsData };
}

/**
 * Updates a workspace's settings
 */
export async function updateWorkspace(wsId, data) {
  if (!wsId) return;
  const wsRef = doc(db, COLLECTION, wsId);
  await updateDoc(wsRef, data);
}

/**
 * Get a specific workspace
 */
export async function getWorkspace(wsId) {
  if (!wsId) return null;
  const snap = await getDoc(doc(db, COLLECTION, wsId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get all workspaces for a given user (requires querying workspace_members first)
 * This is usually handled via the State initialization flow, but provided here as a helper.
 */
export async function getUserWorkspaces(uid) {
  if (!uid) return [];
  
  // First, find all member records for this user
  const membersRef = collection(db, 'workspace_members');
  const q = query(membersRef, where('userId', '==', uid));
  const snap = await getDocs(q);
  
  const workspaceIds = snap.docs.map(d => d.data().workspaceId);
  if (workspaceIds.length === 0) return [];

  // Then fetch the actual workspace docs (Firestore 'in' query max is 10)
  // For simplicity, we loop if > 10, or just do multiple getDoc
  const workspaces = [];
  for (const wId of workspaceIds) {
    const wDoc = await getDoc(doc(db, COLLECTION, wId));
    if (wDoc.exists()) {
      workspaces.push({ id: wDoc.id, ...wDoc.data() });
    }
  }

  return workspaces;
}
