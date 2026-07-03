// ═══════════════════════════════════════════════════
// TaskFlow v2 — Authentication Service
// ═══════════════════════════════════════════════════

import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { auth } from '../firebase-config.js';

/**
 * Sign in with email and password
 * @returns {Promise<string|null>} null on success, error message on failure
 */
export async function signInWithEmail(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return null;
  } catch (error) {
    return _mapAuthError(error.code);
  }
}

/**
 * Sign in with Google SSO
 * @returns {Promise<string|null>} null on success, error message on failure
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    return null;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') return null; // Ignored
    return _mapAuthError(error.code);
  }
}

/**
 * Send password reset email
 * @returns {Promise<string|null>} null on success, error message on failure
 */
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return null;
  } catch (error) {
    return _mapAuthError(error.code);
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Watch auth state changes
 */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Private Helpers ──

function _mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Account temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return `Authentication failed (${code}). Please try again.`;
  }
}
