// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Users
// ═══════════════════════════════════════════════════

import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';

const COLLECTION = 'users';

/**
 * Creates or updates a user document upon login
 */
export async function syncUser(userAuth) {
  if (!userAuth || !userAuth.uid) return null;

  const userRef = doc(db, COLLECTION, userAuth.uid);
  const snap = await getDoc(userRef);

  const userData = {
    displayName: userAuth.displayName || 'Unnamed User',
    email: userAuth.email || '',
    photoURL: userAuth.photoURL || '',
    lastLogin: new Date(),
  };

  if (!snap.exists()) {
    userData.createdAt = new Date();
    await setDoc(userRef, userData);
    return { uid: userAuth.uid, ...userData };
  } else {
    // Only update fields that might change or lastLogin
    await updateDoc(userRef, userData);
    return { uid: userAuth.uid, ...snap.data(), ...userData };
  }
}

/**
 * Update user profile preferences
 */
export async function updateProfile(uid, data) {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, data);
}

const userCache = new Map();

/**
 * Get a single user by ID
 */
export async function getUser(uid) {
  if (!uid) return null;
  if (userCache.has(uid)) {
    return userCache.get(uid);
  }
  const snap = await getDoc(doc(db, COLLECTION, uid));
  const data = snap.exists() ? { uid: snap.id, ...snap.data() } : null;
  if (data) {
    userCache.set(uid, data);
  }
  return data;
}
