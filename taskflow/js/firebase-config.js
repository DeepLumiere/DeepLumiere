import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAk_YmDpbaedj-McM2K7ALUqkJyIJBKcfM",
  authDomain: "taskflow-e7f24.firebaseapp.com",
  projectId: "taskflow-e7f24",
  storageBucket: "taskflow-e7f24.firebasestorage.app",
  messagingSenderId: "431732571375",
  appId: "1:431732571375:web:b14d105be4058b0e79af1a",
  measurementId: "G-HHBSC5583N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, query, where, getDocs };