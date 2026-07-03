// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Members
// ═══════════════════════════════════════════════════

import { 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';
import { getUser } from './users.js';

const COLLECTION = 'workspace_members';

/**
 * Composite ID pattern for O(1) security rule lookups
 */
function getMemberId(workspaceId, userId) {
  return `${workspaceId}_${userId}`;
}

/**
 * Add a member to a workspace
 */
export async function addMember(workspaceId, userId, role = 'Member', email = '') {
  if (!workspaceId || !userId) return;
  const id = getMemberId(workspaceId, userId);
  const memberRef = doc(db, COLLECTION, id);
  
  await setDoc(memberRef, {
    workspaceId,
    userId,
    role,
    email,
    joinedAt: new Date()
  });
}

/**
 * Update member role
 */
export async function updateMemberRole(workspaceId, userId, newRole) {
  const id = getMemberId(workspaceId, userId);
  const memberRef = doc(db, COLLECTION, id);
  await updateDoc(memberRef, { role: newRole });
}

/**
 * Remove member from workspace
 */
export async function removeMember(workspaceId, userId) {
  const id = getMemberId(workspaceId, userId);
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Subscribe to all members for a specific workspace
 * Resolves user data to attach to the member object.
 * @returns {Function} unsubscribe function
 */
export function subscribeToMembers(workspaceId) {
  const q = query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId));
  
  return onSnapshot(q, async (snapshot) => {
    // Collect raw member docs
    const rawMembers = [];
    snapshot.forEach(doc => {
      rawMembers.push({ id: doc.id, ...doc.data() });
    });

    // We need to fetch the User doc for each member to get displayName and photoURL
    // In a production app with huge teams, this might need caching or a cloud function to denormalize.
    // For this architecture, we fetch them and merge.
    
    const resolvedMembers = await Promise.all(
      rawMembers.map(async (m) => {
        const u = await getUser(m.userId);
        if (u) {
          return { ...m, name: u.displayName, photoURL: u.photoURL, email: u.email || m.email };
        }
        return { ...m, name: m.email || 'Unknown User', photoURL: null };
      })
    );

    // Update global state
    State.set('members', resolvedMembers);
  });
}
