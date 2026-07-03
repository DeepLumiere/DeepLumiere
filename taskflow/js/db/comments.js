import { 
  collection, doc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { State } from '../store/state.js';
import { createNotification } from './notifications.js';
import { logActivity } from './activity.js';

// ── Comments ───────────────────────────────────────
const COMMENTS_COLLECTION = 'comments';

export async function addComment(workspaceId, taskId, content, mentions = []) {
  const user = State.get('user');
  if (!user) return;

  const ref = collection(db, COMMENTS_COLLECTION);
  const comment = {
    workspaceId,
    taskId,
    authorId: user.uid,
    content,
    mentions, // array of userIds
    createdAt: new Date(),
  };

  const docRef = await addDoc(ref, comment);

  // Notify mentioned users
  if (mentions.length > 0) {
    const task = State.get('tasks').find(t => t.id === taskId);
    const taskTitle = task ? task.title : 'a task';
    
    mentions.forEach(uid => {
      if (uid !== user.uid) {
        createNotification(workspaceId, uid, taskId, 'mention', 
          `${user.displayName} mentioned you in a comment`, taskTitle, user);
      }
    });
  }

  return { id: docRef.id, ...comment };
}

export async function deleteComment(commentId) {
  await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
}

export function subscribeToComments(taskId, callback) {
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const comments = [];
    snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));

    // Resolve author info
    const resolved = await Promise.all(comments.map(async c => {
      let authorName = 'Unknown User';
      let authorPhoto = null;
      
      const member = State.get('members').find(m => m.userId === c.authorId);
      if (member) {
        authorName = member.name;
        authorPhoto = member.photoURL;
      } else {
        const uDoc = await getDoc(doc(db, 'users', c.authorId));
        if (uDoc.exists()) {
          authorName = uDoc.data().displayName;
          authorPhoto = uDoc.data().photoURL;
        }
      }
      return { ...c, authorName, authorPhoto };
    }));

    callback(resolved);
  });
}


