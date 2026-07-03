// ═══════════════════════════════════════════════════
// TaskFlow v2 — Database: Attachments
// ═══════════════════════════════════════════════════

import { 
  collection, doc, addDoc, deleteDoc, onSnapshot, query, where, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { 
  ref, uploadBytesResumable, getDownloadURL, deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { db, storage } from '../firebase-config.js';
import { State } from '../store/state.js';

const COLLECTION = 'attachments';

/**
 * Upload a file to Firebase Storage and create an attachment record in Firestore
 * @param {File} file 
 * @param {string} workspaceId 
 * @param {string} taskId 
 * @param {function} onProgress callback for upload percentage
 */
export async function uploadAttachment(file, workspaceId, taskId, onProgress) {
  const user = State.get('user');
  if (!user) throw new Error('Must be logged in');

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `workspaces/${workspaceId}/tasks/${taskId}/${fileName}`;
  
  const storageRef = ref(storage, filePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Create Firestore record
          const docData = {
            workspaceId,
            taskId,
            uploaderId: user.uid,
            fileName: file.name,
            fileURL: downloadURL,
            storagePath: filePath,
            size: file.size,
            type: file.type,
            createdAt: new Date()
          };

          const docRef = await addDoc(collection(db, COLLECTION), docData);
          resolve({ id: docRef.id, ...docData });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Delete an attachment (from Storage and Firestore)
 */
export async function deleteAttachment(attachment) {
  // Delete from Storage
  if (attachment.storagePath) {
    const storageRef = ref(storage, attachment.storagePath);
    try {
      await deleteObject(storageRef);
    } catch (e) {
      console.warn("Storage object not found or delete failed:", e);
    }
  }

  // Delete from Firestore
  await deleteDoc(doc(db, COLLECTION, attachment.id));
}

export function subscribeToAttachments(taskId, callback) {
  const q = query(
    collection(db, COLLECTION),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const attachments = [];
    snapshot.forEach(doc => attachments.push({ id: doc.id, ...doc.data() }));
    callback(attachments);
  });
}
