// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Clients
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'clients';

export async function createClient(workspaceId, data) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    ...data,
    workspaceId,
    createdAt: new Date(),
  });
}

export async function updateClient(clientId, data) {
  const ref = doc(db, COLLECTION, clientId);
  await updateDoc(ref, data);
}

export async function deleteClient(clientId) {
  await deleteDoc(doc(db, COLLECTION, clientId));
}

export function subscribeToClients(workspaceId) {
  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const clients = [];
    snapshot.forEach(doc => clients.push({ id: doc.id, ...doc.data() }));
    State.set('clients', clients);
  });
}
