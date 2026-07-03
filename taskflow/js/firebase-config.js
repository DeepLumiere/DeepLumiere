// ═══════════════════════════════════════════════════
// TaskFlow v2 — Firebase Initialization
// ═══════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAk_YmDpbaedj-McM2K7ALUqkJyIJBKcfM",
  authDomain: "taskflow-e7f24.firebaseapp.com",
  projectId: "taskflow-e7f24",
  storageBucket: "taskflow-e7f24.firebasestorage.app",
  messagingSenderId: "431732571375",
  appId: "1:431732571375:web:b14d105be4058b0e79af1a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
