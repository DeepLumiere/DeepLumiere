// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Tickets
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'tickets';

export async function createTicket(workspaceId, clientId, data) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    ...data,
    workspaceId,
    clientId,
    status: 'pending',
    createdAt: new Date(),
    convertedTaskId: null,
  });
}

export async function updateTicket(ticketId, data) {
  const ref = doc(db, COLLECTION, ticketId);
  await updateDoc(ref, data);
}

export async function deleteTicket(ticketId) {
  await deleteDoc(doc(db, COLLECTION, ticketId));
}

export function subscribeToTickets(workspaceId) {
  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const tickets = [];
    snapshot.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));
    State.set('tickets', tickets);
  });
}
