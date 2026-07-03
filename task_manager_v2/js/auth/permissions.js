// ═══════════════════════════════════════════════════
// TaskFlow v2 — RBAC Helpers
// ═══════════════════════════════════════════════════

import { State } from '../store/state.js';

export const Permissions = {
  
  // Basic checks
  isOwner:  () => State.get('myRole') === 'Owner',
  isAdmin:  () => ['Owner', 'Admin'].includes(State.get('myRole')),
  isMember: () => ['Owner', 'Admin', 'Member'].includes(State.get('myRole')),
  isViewer: () => State.get('myRole') === 'Viewer',

  // Task capabilities
  canCreateTask: () => Permissions.isMember(),
  
  canEditTask(task) {
    if (!task) return false;
    if (Permissions.isAdmin()) return true;
    if (Permissions.isMember()) {
      const uid = State.get('user')?.uid;
      return uid === task.assigneeId || uid === task.reporterId;
    }
    return false;
  },
  
  canDeleteTask: () => Permissions.isAdmin(),

  // Comment capabilities
  canDeleteComment(comment) {
    if (!comment) return false;
    const uid = State.get('user')?.uid;
    return uid === comment.authorId || Permissions.isAdmin();
  },

  // Attachment capabilities
  canDeleteAttachment(attachment) {
    if (!attachment) return false;
    const uid = State.get('user')?.uid;
    return uid === attachment.uploaderId || Permissions.isAdmin();
  },

  // Workspace capabilities
  canManageMembers:   () => Permissions.isAdmin(),
  canManageProjects:  () => Permissions.isAdmin(),
  canManageClients:   () => Permissions.isAdmin(),
  canManageLabels:    () => Permissions.isAdmin(),
  canManageWorkspace: () => Permissions.isOwner(),
};
