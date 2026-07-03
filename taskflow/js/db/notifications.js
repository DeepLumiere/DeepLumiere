// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Notifications
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, updateDoc, writeBatch, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'notifications';

/**
 * Internal helper to create a notification for a user
 */
export async function createNotification(workspaceId, userId, taskId, type, message, taskTitle, actor) {
  const ref = collection(db, COLLECTION);
  await addDoc(ref, {
    workspaceId,
    userId,
    taskId,
    type,
    message,
    taskTitle,
    actorName: actor.displayName,
    actorPhoto: actor.photoURL || null,
    isRead: false,
    createdAt: new Date(),
  });
}

/**
 * Mark a single notification as read
 */
export async function markRead(notificationId) {
  const ref = doc(db, COLLECTION, notificationId);
  await updateDoc(ref, { isRead: true });
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllRead() {
  const user = State.get('user');
  if (!user) return;

  const notifs = State.get('notifications') || [];
  const unread = notifs.filter(n => !n.isRead);
  
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  unread.forEach(n => {
    const ref = doc(db, COLLECTION, n.id);
    batch.update(ref, { isRead: true });
  });

  await batch.commit();
}

/**
 * Subscribe to notifications for the current user in the current workspace
 */
export function subscribeToNotifications(workspaceId) {
  const user = State.get('user');
  if (!user) return () => {};

  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));
    State.set('notifications', notifications);
  });
}
