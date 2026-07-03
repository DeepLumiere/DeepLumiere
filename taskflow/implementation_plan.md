# TaskFlow v2 — Super-Detailed Implementation Plan

> **Stack:** Vanilla HTML5 · Vanilla CSS3 · Vanilla JavaScript (ES6 Modules, no build step)
> **Backend:** Firebase Auth · Cloud Firestore · Firebase Storage
> **Hosting:** GitHub Pages (100% static, zero backend servers)
> **Target:** Professional workplace task management for teams of 1–200 people

---

## Table of Contents

1. [Full Directory Structure](#1-full-directory-structure)
2. [Design System — CSS Variables & Layout](#2-design-system--css-variables--layout)
3. [Firebase Configuration](#3-firebase-configuration)
4. [Firestore Database Schema](#4-firestore-database-schema)
5. [Firestore Security Rules](#5-firestore-security-rules)
6. [Firestore Composite Indexes](#6-firestore-composite-indexes)
7. [Firebase Storage Rules](#7-firebase-storage-rules)
8. [JavaScript Module Architecture](#8-javascript-module-architecture)
9. [All Application Pages & Views](#9-all-application-pages--views)
10. [Feature Specifications (Detailed)](#10-feature-specifications-detailed)
11. [State Management Pattern](#11-state-management-pattern)
12. [Routing System](#12-routing-system)
13. [Real-Time Data Flow](#13-real-time-data-flow)
14. [Notifications System](#14-notifications-system)
15. [Build Phases & Execution Order](#15-build-phases--execution-order)
16. [Open Questions for Review](#16-open-questions-for-review)

---

## 1. Full Directory Structure

Every file has a single, clearly defined responsibility. No file exceeds ~300 lines.

```text
/task_manager_v2
│
├── index.html                        # Main SPA shell (authenticated users only)
├── login.html                        # Auth page: email/password + Google SSO
├── portal.html                       # External client read-only portal (token-based)
│
├── firebase.json                     # Firebase Hosting config + rewrite rules
├── firestore.rules                   # All Firestore security rules
├── firestore.indexes.json            # Composite index definitions
├── storage.rules                     # Firebase Storage access rules
│
├── css/
│   ├── variables.css                 # ALL design tokens: colors, spacing, radius, shadows
│   ├── reset.css                     # Modern CSS reset + universal box-sizing
│   ├── typography.css                # Google Font (Inter) import, heading scale, body
│   ├── layout.css                    # Sidebar, topbar, main content area, responsive grid
│   ├── components.css                # Buttons, inputs, badges, avatars, dropdowns, chips
│   ├── kanban.css                    # Kanban columns, task cards, drag-and-drop states
│   ├── modals.css                    # Modal overlay, drawer slide-in, backdrop blur
│   ├── notifications.css             # Toast queue styles, bell badge, notification panel
│   └── portal.css                    # Stripped-down stylesheet for portal.html only
│
└── js/
    ├── firebase-config.js            # initializeApp, getAuth, getFirestore, getStorage
    ├── app.js                        # Entry point: auth state → boot → routing
    │
    ├── store/
    │   └── state.js                  # PubSub reactive state store (single source of truth)
    │
    ├── auth/
    │   ├── auth.js                   # signIn, signOut, Google SSO, onAuthStateChanged
    │   └── permissions.js            # RBAC helpers: canEditTask, canManageMembers, etc.
    │
    ├── db/                           # DATA ACCESS LAYER — ALL Firestore/Storage calls here
    │   ├── users.js                  # getUser, getOrCreateUserProfile, updateUser
    │   ├── workspaces.js             # createWorkspace, subscribeToUserWorkspaces, updateWorkspace
    │   ├── members.js                # inviteMember, subscribeToMembers, updateRole, removeMember
    │   ├── projects.js               # createProject, subscribeToProjects, updateProject, deleteProject
    │   ├── tasks.js                  # createTask, subscribeToTasks, updateTask, moveTask, deleteTask
    │   ├── subtasks.js               # createSubtask, toggleSubtask, deleteSubtask
    │   ├── comments.js               # addComment, editComment, deleteComment, subscribeToComments
    │   ├── activity.js               # logActivity, subscribeToActivity
    │   ├── attachments.js            # uploadFile (Storage), deleteFile, subscribeToAttachments
    │   ├── labels.js                 # createLabel, subscribeToLabels, deleteLabel
    │   ├── clients.js                # createClient, updateClient, deleteClient, getClientByToken
    │   └── notifications.js          # createNotification, markRead, markAllRead, subscribeToNotifications
    │
    ├── ui/                           # UI LAYER — DOM manipulation, event listeners, rendering
    │   ├── router.js                 # Hash-based SPA router, route guards, view injection
    │   ├── sidebar.js                # Sidebar nav, workspace switcher, collapse toggle
    │   ├── topbar.js                 # Topbar: global search, notification bell, user avatar menu
    │   ├── modals.js                 # Generic modal open/close, dynamic content injection
    │   ├── toast.js                  # Toast notification queue (success / error / warning / info)
    │   │
    │   ├── views/
    │   │   ├── dashboard.js          # Stats widgets, my tasks, activity feed, project progress
    │   │   ├── board.js              # Kanban view: columns, filter bar, task cards, drag-and-drop
    │   │   ├── listView.js           # Table/list view: sortable columns, bulk actions
    │   │   ├── timeline.js           # Gantt-style timeline with CSS grid bars
    │   │   ├── taskDetail.js         # Task detail drawer: comments, subtasks, attachments, activity
    │   │   ├── projects.js           # Project list, project detail with task sub-view
    │   │   ├── team.js               # Team roster, invite flow, role editor
    │   │   ├── clients.js            # Client management, portal link generator
    │   │   ├── notificationsView.js  # Notification center: list, mark read, filter
    │   │   ├── settings.js           # Workspace: name, logo, labels editor, danger zone
    │   │   └── profile.js            # User profile: name, avatar upload, password change
    │   │
    │   └── components/
    │       ├── taskCard.js           # Task card HTML string generator (used in board + list)
    │       ├── taskForm.js           # Full task create/edit form modal content
    │       ├── memberAvatar.js       # Avatar img with initials fallback + tooltip
    │       ├── priorityBadge.js      # Colored priority pill (Critical / High / Medium / Low)
    │       ├── statusBadge.js        # Colored status pill (Todo / In Progress / Review / Done / Blocked)
    │       ├── labelPill.js          # Colored label chip, customizable per workspace
    │       ├── progressBar.js        # Subtask completion % bar
    │       ├── dropdown.js           # Generic reusable positioned dropdown component
    │       └── filePreview.js        # Image thumbnail or file-type icon for attachments
    │
    └── utils/
        ├── helpers.js                # formatDate, timeAgo, generateId, debounce, capitalize, clamp
        ├── validators.js             # validateTaskForm, validateEmail, validateRequired
        └── dragdrop.js               # HTML5 DnD handlers for Kanban: drag, dragover, drop, reorder
```

---

## 2. Design System — CSS Variables & Layout

### `css/variables.css` — Complete Design Token Set

```css
/* ─── Google Font ─── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  /* ── Brand Colors ── */
  --color-primary:          hsl(221, 83%, 53%);
  --color-primary-hover:    hsl(221, 83%, 45%);
  --color-primary-light:    hsl(221, 83%, 65%);
  --color-primary-alpha:    hsl(221, 83%, 53%, 0.15);
  --color-accent:           hsl(262, 80%, 62%);
  --color-accent-hover:     hsl(262, 80%, 54%);

  /* ── Semantic Colors ── */
  --color-success:          hsl(145, 63%, 42%);
  --color-success-alpha:    hsl(145, 63%, 42%, 0.15);
  --color-warning:          hsl(38, 92%, 50%);
  --color-warning-alpha:    hsl(38, 92%, 50%, 0.15);
  --color-danger:           hsl(0, 78%, 55%);
  --color-danger-hover:     hsl(0, 78%, 47%);
  --color-danger-alpha:     hsl(0, 78%, 55%, 0.15);
  --color-info:             hsl(200, 80%, 50%);

  /* ── Neutrals (Dark Mode Base) ── */
  --color-bg:               hsl(222, 22%, 8%);
  --color-surface:          hsl(222, 20%, 12%);
  --color-surface-2:        hsl(222, 18%, 16%);
  --color-surface-3:        hsl(222, 16%, 21%);
  --color-border:           hsl(222, 14%, 25%);
  --color-border-subtle:    hsl(222, 12%, 20%);
  --color-text:             hsl(220, 20%, 92%);
  --color-text-muted:       hsl(220, 10%, 58%);
  --color-text-subtle:      hsl(220, 8%, 40%);

  /* ── Priority Colors ── */
  --priority-critical:      hsl(0, 78%, 55%);
  --priority-high:          hsl(25, 90%, 55%);
  --priority-medium:        hsl(38, 90%, 50%);
  --priority-low:           hsl(200, 70%, 52%);

  /* ── Status Colors ── */
  --status-todo:            hsl(220, 10%, 50%);
  --status-in-progress:     hsl(221, 83%, 53%);
  --status-review:          hsl(262, 80%, 62%);
  --status-done:            hsl(145, 63%, 42%);
  --status-blocked:         hsl(0, 78%, 55%);

  /* ── Spacing Scale (4px base unit) ── */
  --sp-1: 4px;    --sp-2: 8px;    --sp-3: 12px;   --sp-4: 16px;
  --sp-5: 20px;   --sp-6: 24px;   --sp-8: 32px;   --sp-10: 40px;
  --sp-12: 48px;  --sp-16: 64px;

  /* ── Border Radius ── */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm:   0 1px 3px hsl(0 0% 0% / 0.40);
  --shadow-md:   0 4px 16px hsl(0 0% 0% / 0.44);
  --shadow-lg:   0 12px 40px hsl(0 0% 0% / 0.52);
  --shadow-glow: 0 0 28px hsl(221 83% 53% / 0.28);

  /* ── Transitions ── */
  --t-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --t-slow:   400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Layout ── */
  --sidebar-width:     260px;
  --sidebar-collapsed: 64px;
  --topbar-height:     56px;
  --drawer-width:      480px;
}
```

### `css/layout.css` — Structural Layout Rules

- **Sidebar**: `position: fixed; left: 0; top: 0; height: 100vh; width: var(--sidebar-width); z-index: 200;`
  When `.sidebar--collapsed`: `width: var(--sidebar-collapsed)`. Nav labels hide with `opacity: 0; width: 0; overflow: hidden`.
- **Topbar**: `position: fixed; top: 0; left: var(--sidebar-width); right: 0; height: var(--topbar-height); z-index: 100;`
- **Main Content**: `margin-left: var(--sidebar-width); padding-top: var(--topbar-height); min-height: 100vh;`
- **All layout transitions**: `transition: width var(--t-normal), left var(--t-normal), margin var(--t-normal);`
- **Task Drawer**: `position: fixed; top: 0; right: 0; height: 100vh; width: var(--drawer-width); transform: translateX(100%); transition: transform var(--t-normal); z-index: 300;`
  When `.drawer--open`: `transform: translateX(0);`
- **Responsive** `@media (max-width: 768px)`:
  Sidebar transforms off-screen (`translateX(-100%)`), a hamburger button appears in topbar.
  A `.sidebar-overlay` backdrop (semi-transparent) closes sidebar on click.
  Main content has `margin-left: 0`.

### `css/kanban.css` — Kanban Board

- Board container: `display: flex; gap: var(--sp-4); overflow-x: auto; padding: var(--sp-6); align-items: flex-start;`
- Each column: `min-width: 280px; max-width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: var(--sp-3);`
- Card default: `background: var(--color-surface-2); border-radius: var(--radius-md); cursor: grab; border-left: 3px solid transparent;` (border-left color = priority color)
- `.card--dragging`: `opacity: 0.4; transform: rotate(1.5deg); box-shadow: var(--shadow-lg); cursor: grabbing;`
- `.column--drag-over`: `background: var(--color-primary-alpha); border: 2px dashed var(--color-primary); border-radius: var(--radius-md);`

---

## 3. Firebase Configuration

### `js/firebase-config.js`

```js
// Import from CDN — no npm, no bundler
import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage }     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
```

---

## 4. Firestore Database Schema

### Rules for the Schema

1. Collections are **flat** — no nesting beyond one subcollection level on tasks.
2. Frequently read fields are **denormalized** (e.g., `assigneeName` on task documents) to avoid extra reads.
3. **Counters are denormalized** (`subtaskCount`, `commentCount`, `attachmentCount`) using `increment()` to avoid querying subcollections for counts.
4. All documents include `createdAt` (server timestamp) and `workspaceId` (for security rule scoping).

---

### Collection: `users`
**Document ID:** Firebase Auth UID

| Field                | Type      | Required | Description                                      |
|----------------------|-----------|:--------:|--------------------------------------------------|
| `uid`                | string    | ✅        | Mirrors the Auth UID (redundant but convenient)  |
| `email`              | string    | ✅        | Pulled from Firebase Auth on sign-in             |
| `displayName`        | string    | ✅        | Full name — editable by user in profile page     |
| `photoURL`           | string    | ❌        | Firebase Storage download URL, or null           |
| `createdAt`          | timestamp | ✅        | Server timestamp, set only once on first sign-in |
| `lastSeenAt`         | timestamp | ✅        | Updated on every app load (for "online" status)  |
| `defaultWorkspaceId` | string    | ❌        | Last active workspace ID, for fast redirect      |

---

### Collection: `workspaces`
**Document ID:** Auto-generated by Firestore

| Field         | Type      | Required | Description                                        |
|---------------|-----------|:--------:|----------------------------------------------------|
| `name`        | string    | ✅        | e.g. "Acme Corp Development"                       |
| `slug`        | string    | ✅        | URL-safe lowercase unique name (e.g. "acme-dev")   |
| `logoURL`     | string    | ❌        | Firebase Storage URL for workspace logo            |
| `ownerId`     | string    | ✅        | UID of creator — immutable after creation          |
| `plan`        | string    | ✅        | `'free'` \| `'pro'` — for future billing features |
| `memberCount` | number    | ✅        | Denormalized count, incremented/decremented        |
| `createdAt`   | timestamp | ✅        | Server timestamp                                   |
| `updatedAt`   | timestamp | ✅        | Updated on every metadata change                   |

---

### Collection: `workspace_members`
**Document ID:** `{workspaceId}_{userId}` — deterministic composite key for O(1) security rule lookups

| Field         | Type      | Required | Description                                                |
|---------------|-----------|:--------:|------------------------------------------------------------|
| `workspaceId` | string    | ✅        | Reference to parent workspace                              |
| `userId`      | string    | ✅        | Firebase Auth UID (empty string if invite is still pending)|
| `email`       | string    | ✅        | Used to match pending invite when user first signs up      |
| `displayName` | string    | ❌        | Cached from `users` doc for fast avatar/name rendering     |
| `photoURL`    | string    | ❌        | Cached avatar URL                                          |
| `role`        | string    | ✅        | `'Owner'` \| `'Admin'` \| `'Member'` \| `'Viewer'`        |
| `status`      | string    | ✅        | `'Active'` \| `'Invited'` \| `'Deactivated'`              |
| `invitedBy`   | string    | ✅        | UID of person who sent the invite                          |
| `invitedAt`   | timestamp | ✅        | Server timestamp when invite was created                   |
| `joinedAt`    | timestamp | ❌        | Set when user accepts invite and status → `'Active'`       |

---

### Collection: `projects`
**Document ID:** Auto-generated

| Field         | Type      | Required | Description                                        |
|---------------|-----------|:--------:|----------------------------------------------------|
| `workspaceId` | string    | ✅        | Parent workspace                                   |
| `name`        | string    | ✅        | Project display name                               |
| `description` | string    | ❌        | Short description shown in project cards           |
| `color`       | string    | ✅        | Hex or HSL string — unique color per project       |
| `icon`        | string    | ❌        | Emoji character used as project icon               |
| `status`      | string    | ✅        | `'active'` \| `'completed'` \| `'archived'`       |
| `ownerId`     | string    | ✅        | UID of project creator                             |
| `startDate`   | timestamp | ❌        | Optional start date for timeline view              |
| `endDate`     | timestamp | ❌        | Project deadline                                   |
| `taskCount`   | number    | ✅        | Denormalized total task count (starts at 0)        |
| `doneCount`   | number    | ✅        | Denormalized done task count (for progress bar)    |
| `createdAt`   | timestamp | ✅        | Server timestamp                                   |
| `updatedAt`   | timestamp | ✅        |                                                    |

---

### Collection: `tasks`
**Document ID:** Auto-generated

| Field            | Type      | Required | Description                                                         |
|------------------|-----------|:--------:|---------------------------------------------------------------------|
| `workspaceId`    | string    | ✅        | Required for security rule scoping                                  |
| `projectId`      | string    | ❌        | Links task to a project — null means "Inbox"                        |
| `title`          | string    | ✅        | Max 200 characters                                                  |
| `description`    | string    | ❌        | Supports plain text (can be rendered as markdown client-side)       |
| `status`         | string    | ✅        | `'todo'` \| `'in-progress'` \| `'review'` \| `'done'` \| `'blocked'` |
| `priority`       | string    | ✅        | `'critical'` \| `'high'` \| `'medium'` \| `'low'`                  |
| `assigneeId`     | string    | ❌        | UID of the assigned member, or null                                 |
| `assigneeName`   | string    | ❌        | Cached display name of assignee for fast card rendering             |
| `assigneePhoto`  | string    | ❌        | Cached avatar URL of assignee                                       |
| `reporterId`     | string    | ✅        | UID of task creator (immutable)                                     |
| `reporterName`   | string    | ✅        | Cached display name of reporter                                     |
| `clientId`       | string    | ❌        | Links task to an external client entity                             |
| `labelIds`       | string[]  | ❌        | Array of label document IDs applied to this task                    |
| `dueDate`        | timestamp | ❌        | Task deadline                                                       |
| `startDate`      | timestamp | ❌        | Optional start date (used in timeline/gantt view)                   |
| `estimatedHours` | number    | ❌        | Time estimate in decimal hours (e.g. 2.5)                           |
| `order`          | number    | ✅        | Float for sortable ordering within a Kanban column                  |
| `subtaskCount`   | number    | ✅        | Denormalized total subtask count — default: 0                       |
| `subtaskDone`    | number    | ✅        | Denormalized completed subtask count — default: 0                   |
| `commentCount`   | number    | ✅        | Denormalized — default: 0                                           |
| `attachmentCount`| number    | ✅        | Denormalized — default: 0                                           |
| `isArchived`     | boolean   | ✅        | Soft-delete flag — default: false                                   |
| `createdAt`      | timestamp | ✅        | Server timestamp                                                    |
| `updatedAt`      | timestamp | ✅        | Updated on every write via `serverTimestamp()`                      |

#### Subcollection: `tasks/{taskId}/subtasks`

| Field        | Type      | Required | Description                       |
|--------------|-----------|:--------:|-----------------------------------|
| `title`      | string    | ✅        | Subtask description               |
| `isDone`     | boolean   | ✅        | Completion toggle — default false |
| `assigneeId` | string    | ❌        | Optional assignee UID             |
| `order`      | number    | ✅        | Sort order within the list        |
| `createdBy`  | string    | ✅        | UID of creator                    |
| `createdAt`  | timestamp | ✅        | Server timestamp                  |

#### Subcollection: `tasks/{taskId}/comments`

| Field         | Type      | Required | Description                                           |
|---------------|-----------|:--------:|-------------------------------------------------------|
| `authorId`    | string    | ✅        | UID                                                   |
| `authorName`  | string    | ✅        | Cached full name                                      |
| `authorPhoto` | string    | ❌        | Cached avatar URL                                     |
| `body`        | string    | ✅        | Comment text, supports `@username` mention syntax     |
| `mentions`    | string[]  | ❌        | Array of UIDs @mentioned in body — triggers notifications |
| `isEdited`    | boolean   | ✅        | Default false, set true on any edit                   |
| `createdAt`   | timestamp | ✅        |                                                       |
| `editedAt`    | timestamp | ❌        | Set on edit                                           |

#### Subcollection: `tasks/{taskId}/activity`

| Field       | Type      | Required | Description                                                           |
|-------------|-----------|:--------:|-----------------------------------------------------------------------|
| `actorId`   | string    | ✅        | UID of person who made the change                                     |
| `actorName` | string    | ✅        | Cached name                                                           |
| `action`    | string    | ✅        | `'created'` \| `'status_changed'` \| `'priority_changed'` \| `'assignee_changed'` \| `'due_changed'` \| `'commented'` \| `'attachment_added'` |
| `from`      | any       | ❌        | Previous value (string, null, etc.)                                   |
| `to`        | any       | ❌        | New value                                                             |
| `createdAt` | timestamp | ✅        | Server timestamp (immutable — never updated)                          |

#### Subcollection: `tasks/{taskId}/attachments`

| Field         | Type      | Required | Description                                         |
|---------------|-----------|:--------:|-----------------------------------------------------|
| `uploaderId`  | string    | ✅        | UID of uploader                                     |
| `uploaderName`| string    | ✅        | Cached display name                                 |
| `fileName`    | string    | ✅        | Original filename shown in UI                       |
| `fileSize`    | number    | ✅        | Size in bytes                                       |
| `mimeType`    | string    | ✅        | e.g. `image/png`, `application/pdf`                 |
| `storageUrl`  | string    | ✅        | Firebase Storage download URL                       |
| `storagePath` | string    | ✅        | Full storage path (needed to delete the file later) |
| `createdAt`   | timestamp | ✅        |                                                     |

---

### Collection: `labels`
**Document ID:** Auto-generated, scoped per workspace

| Field         | Type   | Required | Description                          |
|---------------|--------|:--------:|--------------------------------------|
| `workspaceId` | string | ✅        | Parent workspace                     |
| `name`        | string | ✅        | e.g. "Bug", "Feature", "Urgent"      |
| `color`       | string | ✅        | Hex color (e.g. `#e74c3c`)           |
| `createdBy`   | string | ✅        | UID of creator (Admin or Owner only) |
| `createdAt`   | timestamp | ✅     |                                      |

---

### Collection: `clients`
**Document ID:** Auto-generated

| Field          | Type      | Required | Description                                                 |
|----------------|-----------|:--------:|-------------------------------------------------------------|
| `workspaceId`  | string    | ✅        | Parent workspace                                            |
| `companyName`  | string    | ✅        | Client company name                                         |
| `contactName`  | string    | ❌        | Primary contact person's name                               |
| `contactEmail` | string    | ✅        | Contact email address                                       |
| `logoURL`      | string    | ❌        | Client company logo from Storage                            |
| `portalToken`  | string    | ✅        | UUID v4 — used in magic-link URL, keep secret               |
| `isActive`     | boolean   | ✅        | Disable portal without deleting — default true              |
| `createdBy`    | string    | ✅        | UID of admin who added the client                           |
| `createdAt`    | timestamp | ✅        |                                                             |
| `updatedAt`    | timestamp | ✅        |                                                             |

---

### Collection: `notifications`
**Document ID:** Auto-generated

| Field         | Type      | Required | Description                                                           |
|---------------|-----------|:--------:|-----------------------------------------------------------------------|
| `recipientId` | string    | ✅        | UID of user who receives this notification                            |
| `workspaceId` | string    | ✅        | For filtering per workspace                                           |
| `type`        | string    | ✅        | `'task_assigned'` \| `'comment_mention'` \| `'status_changed'` \| `'due_soon'` \| `'task_commented'` |
| `actorId`     | string    | ✅        | UID who triggered the notification                                    |
| `actorName`   | string    | ✅        | Cached for display without extra read                                 |
| `taskId`      | string    | ❌        | Relevant task document ID                                             |
| `taskTitle`   | string    | ❌        | Cached task title for display                                         |
| `message`     | string    | ✅        | Human-readable message (e.g. "Alice assigned you to Fix login bug")   |
| `isRead`      | boolean   | ✅        | Default false — true when user opens notification center              |
| `createdAt`   | timestamp | ✅        |                                                                       |

---

## 5. Firestore Security Rules

### `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper Functions ──────────────────────────────────────────────────────

    function isSignedIn() {
      return request.auth != null;
    }

    function uid() {
      return request.auth.uid;
    }

    // Reads the workspace_members doc using the deterministic composite key.
    // This is a single document GET — extremely fast, no collection scan.
    function membership(workspaceId) {
      return get(/databases/$(database)/documents/workspace_members/$(workspaceId + '_' + uid())).data;
    }

    function isMember(workspaceId) {
      return isSignedIn()
        && exists(/databases/$(database)/documents/workspace_members/$(workspaceId + '_' + uid()))
        && membership(workspaceId).status == 'Active';
    }

    function role(workspaceId) {
      return membership(workspaceId).role;
    }

    function isOwner(workspaceId) {
      return isMember(workspaceId) && role(workspaceId) == 'Owner';
    }

    function isAdminOrAbove(workspaceId) {
      return isMember(workspaceId) && role(workspaceId) in ['Owner', 'Admin'];
    }

    function isMemberOrAbove(workspaceId) {
      return isMember(workspaceId) && role(workspaceId) in ['Owner', 'Admin', 'Member'];
    }

    // ── users ─────────────────────────────────────────────────────────────────
    match /users/{userId} {
      allow read:   if isSignedIn();                        // Any signed-in user can see profiles
      allow create: if isSignedIn() && uid() == userId;     // Only for yourself
      allow update: if isSignedIn() && uid() == userId;
      allow delete: if false;                               // Profiles are never deleted
    }

    // ── workspaces ────────────────────────────────────────────────────────────
    match /workspaces/{workspaceId} {
      allow read:   if isMember(workspaceId);
      allow create: if isSignedIn();                        // Any signed-in user can create a workspace
      allow update: if isAdminOrAbove(workspaceId);
      allow delete: if isOwner(workspaceId);
    }

    // ── workspace_members ─────────────────────────────────────────────────────
    match /workspace_members/{memberId} {
      // memberId = "{workspaceId}_{userId}"
      allow read: if isSignedIn() && isMember(resource.data.workspaceId);

      allow create: if isAdminOrAbove(request.resource.data.workspaceId);

      allow update: if isAdminOrAbove(resource.data.workspaceId)
                    && request.resource.data.role != 'Owner'; // Cannot promote to Owner via update

      allow delete: if isOwner(resource.data.workspaceId)    // Owner can remove anyone
                    || (isSignedIn() && uid() == resource.data.userId); // Self-removal
    }

    // ── projects ──────────────────────────────────────────────────────────────
    match /projects/{projectId} {
      allow read:          if isMember(resource.data.workspaceId);
      allow create:        if isAdminOrAbove(request.resource.data.workspaceId);
      allow update, delete: if isAdminOrAbove(resource.data.workspaceId);
    }

    // ── tasks ─────────────────────────────────────────────────────────────────
    match /tasks/{taskId} {
      allow read: if isMember(resource.data.workspaceId);

      allow create: if isMemberOrAbove(request.resource.data.workspaceId);

      allow update: if isMember(resource.data.workspaceId)
                    && (
                      isAdminOrAbove(resource.data.workspaceId) // Admins/Owners: full edit
                      || uid() == resource.data.assigneeId       // Assignees: can update status etc.
                      || uid() == resource.data.reporterId        // Reporters: can edit their own tasks
                    );

      allow delete: if isAdminOrAbove(resource.data.workspaceId); // Only admins hard-delete

      // ── subtasks ───────────────────────────────────────────────────────────
      match /subtasks/{subtaskId} {
        allow read:  if isMember(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow write: if isMemberOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
      }

      // ── comments ───────────────────────────────────────────────────────────
      match /comments/{commentId} {
        allow read:   if isMember(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow create: if isMemberOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow update: if isSignedIn() && uid() == resource.data.authorId; // Only your own comments
        allow delete: if isSignedIn() && (
          uid() == resource.data.authorId
          || isAdminOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId)
        );
      }

      // ── activity ───────────────────────────────────────────────────────────
      match /activity/{activityId} {
        allow read:          if isMember(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow create:        if isMemberOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow update, delete: if false; // Activity logs are append-only and immutable
      }

      // ── attachments ────────────────────────────────────────────────────────
      match /attachments/{attachmentId} {
        allow read:   if isMember(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow create: if isMemberOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId);
        allow delete: if isSignedIn() && (
          uid() == resource.data.uploaderId
          || isAdminOrAbove(get(/databases/$(database)/documents/tasks/$(taskId)).data.workspaceId)
        );
      }
    }

    // ── labels ────────────────────────────────────────────────────────────────
    match /labels/{labelId} {
      allow read:          if isMember(resource.data.workspaceId);
      allow create:        if isAdminOrAbove(request.resource.data.workspaceId);
      allow update, delete: if isAdminOrAbove(resource.data.workspaceId);
    }

    // ── clients ───────────────────────────────────────────────────────────────
    match /clients/{clientId} {
      // Admin reads for management panel
      allow read:          if isAdminOrAbove(resource.data.workspaceId);
      allow create:        if isAdminOrAbove(request.resource.data.workspaceId);
      allow update, delete: if isAdminOrAbove(resource.data.workspaceId);
    }

    // ── notifications ─────────────────────────────────────────────────────────
    match /notifications/{notifId} {
      allow read:   if isSignedIn() && uid() == resource.data.recipientId;
      allow create: if isMemberOrAbove(request.resource.data.workspaceId);
      allow update: if isSignedIn() && uid() == resource.data.recipientId; // Mark as read
      allow delete: if isSignedIn() && uid() == resource.data.recipientId;
    }
  }
}
```

> **Portal Access Note:** The client portal (`portal.html`) queries `clients` by `portalToken`. Because security rules cannot match on query `where` values, portal.html must use a **Firebase Function** OR the clients collection is read by an unauthenticated query — set a secondary rule for token-based read. Alternative: use a lightweight Cloud Function just for token validation (single endpoint). Decision required — see [Section 16](#16-open-questions-for-review).

---

## 6. Firestore Composite Indexes

### `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "status",      "order": "ASCENDING" },
        { "fieldPath": "order",       "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "projectId",   "order": "ASCENDING" },
        { "fieldPath": "status",      "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "assigneeId",  "order": "ASCENDING" },
        { "fieldPath": "dueDate",     "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "isArchived",  "order": "ASCENDING" },
        { "fieldPath": "updatedAt",   "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId",  "order": "ASCENDING" },
        { "fieldPath": "isArchived","order": "ASCENDING" },
        { "fieldPath": "status",    "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "workspace_members",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "status",      "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientId", "order": "ASCENDING" },
        { "fieldPath": "isRead",      "order": "ASCENDING" },
        { "fieldPath": "createdAt",   "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "status",      "order": "ASCENDING" },
        { "fieldPath": "createdAt",   "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 7. Firebase Storage Rules

### `storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // User profile avatars — only the owner can write their own
    match /avatars/{userId}/{allPaths=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024       // 5MB max
                   && request.resource.contentType.matches('image/.*');
    }

    // Task file attachments — any authenticated user can upload/read
    // Path: /attachments/{workspaceId}/{taskId}/{fileName}
    match /attachments/{workspaceId}/{taskId}/{allPaths=**} {
      allow read:   if request.auth != null;
      allow write:  if request.auth != null
                    && request.resource.size < 50 * 1024 * 1024;    // 50MB max per file
      allow delete: if request.auth != null;
    }

    // Workspace logos
    match /logos/{workspaceId}/{allPaths=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // Client company logos
    match /client-logos/{clientId}/{allPaths=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 8. JavaScript Module Architecture

### `js/store/state.js` — PubSub Reactive Store

The state store is the **single source of truth**. No module reads Firestore directly into the DOM.

```js
const _state = {
  user:             null,   // { uid, displayName, email, photoURL }
  workspaces:       [],     // All workspaces current user belongs to
  currentWorkspace: null,   // The active workspace object
  myRole:           null,   // Role string in currentWorkspace
  members:          [],     // workspace_members[] for currentWorkspace
  projects:         [],     // projects[] for currentWorkspace
  tasks:            [],     // tasks[] for current view (filtered/subscribed)
  labels:           [],     // labels[] for currentWorkspace
  clients:          [],     // clients[] — admin only
  notifications:    [],     // notifications[] for current user (unread on top)
  currentTask:      null,   // Task document open in detail drawer
  currentView:      '',     // Active route key (e.g. 'board', 'list')
  filters: {
    projectId:  null,
    assigneeId: null,
    priority:   null,
    labelIds:   [],
    search:     '',
    showDone:   false,
  },
  isLoading:        true,
};

const _subs = {}; // { 'tasks': [fn1, fn2], ... }

export const State = {
  get:       (key) => _state[key],

  set(key, value) {
    _state[key] = value;
    (_subs[key] || []).forEach(fn => fn(value));
  },

  // Returns an unsubscribe function
  subscribe(key, fn) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(fn);
    fn(_state[key]); // Immediately fire with current value
    return () => { _subs[key] = _subs[key].filter(f => f !== fn); };
  },

  update: (key, fn) => State.set(key, fn(_state[key])),
};
```

---

### `js/auth/auth.js` — Authentication

**Exports:**
- `signInWithEmail(email, password)` → `signInWithEmailAndPassword(auth, email, password)` — returns promise, catches and returns error message string
- `signInWithGoogle()` → `new GoogleAuthProvider()`, `signInWithPopup(auth, provider)`
- `sendPasswordReset(email)` → `sendPasswordResetEmail(auth, email)`
- `signOut()` → `signOut(auth)` → clears all State keys → redirects to `login.html`
- `watchAuthState(callback)` → wraps `onAuthStateChanged(auth, callback)` — called once in `app.js`

**Boot Sequence inside `onAuthStateChanged`:**
1. If `user === null`: redirect to `login.html` (if not already there).
2. If `user` exists on `login.html`: redirect to `index.html`.
3. If `user` exists on `index.html`:
   - Call `getOrCreateUserProfile(user)` (db/users.js) → updates `lastSeenAt`.
   - `State.set('user', profile)`.
   - Call `loadUserWorkspaces(user.uid)` → gets or creates first workspace.
   - Set `currentWorkspace` in State.
   - Start all real-time subscriptions (`members`, `projects`, `labels`, `notifications`).
   - Call `Router.init()` to begin routing.
   - `State.set('isLoading', false)`.

---

### `js/auth/permissions.js` — RBAC Helpers

```js
import { State } from '../store/state.js';

export const Permissions = {
  canCreateTask:      () => ['Owner','Admin','Member'].includes(State.get('myRole')),
  canDeleteTask:      () => ['Owner','Admin'].includes(State.get('myRole')),
  canManageMembers:   () => ['Owner','Admin'].includes(State.get('myRole')),
  canManageProjects:  () => ['Owner','Admin'].includes(State.get('myRole')),
  canManageClients:   () => ['Owner','Admin'].includes(State.get('myRole')),
  canManageSettings:  () => State.get('myRole') === 'Owner',
  canManageLabels:    () => ['Owner','Admin'].includes(State.get('myRole')),

  canEditTask(task) {
    const role = State.get('myRole');
    const uid  = State.get('user')?.uid;
    if (['Owner', 'Admin'].includes(role)) return true;
    if (role === 'Member') return uid === task.assigneeId || uid === task.reporterId;
    return false;
  },

  canDeleteComment(comment) {
    const role = State.get('myRole');
    const uid  = State.get('user')?.uid;
    return uid === comment.authorId || ['Owner','Admin'].includes(role);
  },

  canDeleteAttachment(attachment) {
    const role = State.get('myRole');
    const uid  = State.get('user')?.uid;
    return uid === attachment.uploaderId || ['Owner','Admin'].includes(role);
  },
};
```

---

### `js/db/tasks.js` — Task Data Access (Key Functions)

| Function | Firestore Operation | Notes |
|---|---|---|
| `subscribeToTasks(wsId, filters, cb)` | `onSnapshot` with compound query | Returns unsubscribe fn. Filters: `workspaceId`, `isArchived=false`. Optional filters: `projectId`, `assigneeId`, `status`. |
| `createTask(wsId, data)` | `addDoc` | Auto-fills: `reporterId`, `reporterName`, `createdAt`, `updatedAt` (server), `order: Date.now()`, all counters = 0, `isArchived: false`. Then logs `'created'` activity. |
| `updateTask(taskId, changes)` | `updateDoc` | Merges `updatedAt: serverTimestamp()`. Logs changed fields to activity subcollection. Sends notifications if `assigneeId` or `status` changed. |
| `moveTask(taskId, newStatus, newOrder)` | `updateDoc` | Used by drag-and-drop. Updates `status`, `order`, `updatedAt`. |
| `updateTaskStatus(taskId, newStatus)` | `updateDoc` | Used by status dropdown in list/detail view. Also logs activity. |
| `deleteTask(taskId)` | `updateDoc` `{ isArchived: true }` | Soft-delete. Members use this. |
| `hardDeleteTask(taskId)` | `deleteDoc` | Admin-only hard delete — also decrements `projects/{projectId}.taskCount`. |
| `duplicateTask(task)` | `addDoc` | Copies all fields, resets `createdAt`, `updatedAt`, `commentCount`, `subtaskCount`, `attachmentCount` to 0, appends " (copy)" to title. |
| `getTaskById(taskId)` | `getDoc` | For direct URL navigation (`#/task/taskId`). |

---

### `js/db/attachments.js` — File Upload Flow

1. User picks a file (file input, or drag-drop onto task drawer).
2. Validate file size (max 50MB) and MIME type.
3. Call `uploadBytesResumable(storageRef, file)`.
4. Attach `on('state_changed', progressCb, errorCb, completeCb)`:
   - `progressCb`: update a `<progress>` or percentage text in the UI (0–100%).
   - `completeCb`: call `getDownloadURL(snapshot.ref)` → save attachment doc to `tasks/{taskId}/attachments/`.
5. On attachment doc saved: call `updateDoc(taskRef, { attachmentCount: increment(1) })`.
6. Log activity `'attachment_added'`.

---

### `js/utils/dragdrop.js` — Kanban Drag-and-Drop

**Strategy:** HTML5 native Drag and Drop API — no library.

**Card `dragstart`:**
```js
e.dataTransfer.setData('taskId', card.dataset.taskId);
card.classList.add('card--dragging');
```

**Card `dragend`:**
```js
card.classList.remove('card--dragging');
document.querySelectorAll('.column--drag-over').forEach(c => c.classList.remove('column--drag-over'));
```

**Column `dragover`:**
```js
e.preventDefault(); // Required to allow drop
column.classList.add('column--drag-over');
```

**Column `drop`:**
```js
const taskId    = e.dataTransfer.getData('taskId');
const newStatus = column.dataset.status;
const newOrder  = computeDropOrder(column, e.clientY); // Average neighbor orders
await moveTask(taskId, newStatus, newOrder);
```

**`computeDropOrder(column, mouseY)`:**
- Gets all task cards currently in the column.
- Finds the card immediately above and below the drop position using `card.getBoundingClientRect().top`.
- Returns `(above.order + below.order) / 2` (or `above.order - 1000` if dropped at top, `below.order + 1000` if dropped at bottom).

---

### `js/ui/router.js` — Hash-Based SPA Router

```js
const routes = {
  '#/dashboard':     () => import('./views/dashboard.js').then(m => m.render()),
  '#/board':         () => import('./views/board.js').then(m => m.render()),
  '#/list':          () => import('./views/listView.js').then(m => m.render()),
  '#/timeline':      () => import('./views/timeline.js').then(m => m.render()),
  '#/projects':      () => import('./views/projects.js').then(m => m.render()),
  '#/team':          () => import('./views/team.js').then(m => m.render()),
  '#/clients':       () => import('./views/clients.js').then(m => m.render()),
  '#/notifications': () => import('./views/notificationsView.js').then(m => m.render()),
  '#/settings':      () => import('./views/settings.js').then(m => m.render()),
  '#/profile':       () => import('./views/profile.js').then(m => m.render()),
};

function navigate() {
  const hash = window.location.hash || '#/dashboard';
  // Route guard
  if (hash === '#/clients' && !Permissions.canManageClients()) {
    window.location.hash = '#/dashboard';
    Toast.show('Access denied', 'error');
    return;
  }
  // Cancel previous view's Firestore subscriptions
  cancelViewSubs();
  State.set('currentView', hash.slice(2));
  // Inject view
  const handler = routes[hash];
  if (handler) handler();
  else routes['#/dashboard']();
  // Update active state in sidebar
  updateSidebarActive(hash);
}

export const Router = {
  init: () => {
    window.addEventListener('hashchange', navigate);
    navigate();
  },
  go: (hash) => { window.location.hash = hash; },
};
```

Dynamic route for task detail: If hash is `#/task/TASKID`, the router calls `taskDetail.openDrawer(taskId)`.

---

### `js/ui/toast.js` — Toast Notification Queue

```js
// Maximum 3 toasts visible at once, auto-dismiss after 4s
// Types: 'success' | 'error' | 'warning' | 'info'

export const Toast = {
  show(message, type = 'info', duration = 4000) {
    const el = createToastEl(message, type);
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--visible'));
    setTimeout(() => dismiss(el), duration);
  },
};
```

Toast element structure: icon (SVG) + message text + close `×` button.

---

## 9. All Application Pages & Views

### `login.html` — Authentication Page

**Layout:** Two-column on desktop. Left: animated brand panel (CSS gradient blob background, app logo, tagline). Right: auth card (centered).

**Auth Card Contents:**
1. App logo + "TaskFlow" heading
2. `<form id="login-form">`:
   - Email input (`type="email"`, `id="login-email"`, `autocomplete="email"`)
   - Password input (`type="password"`, `id="login-password"`, `autocomplete="current-password"`)
   - "Forgot password?" link (inline, right-aligned) → calls `sendPasswordReset(email)`
   - "Sign in" button (`type="submit"`)
3. Divider: `── or ──`
4. "Continue with Google" button (Google brand colors, Google logo SVG)
5. Error message `<p id="auth-error">` (hidden by default, shown on failed login)
6. "Don't have an account? Contact your admin" note

**Behavior:**
- On `submit`: validate non-empty → call `signInWithEmail()` → on error show `auth-error` → on success redirect to `index.html#/dashboard`.
- If `auth.currentUser` exists on page load → immediately redirect to `index.html`.

---

### `index.html` — Main App Shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow — Workspace</title>
  <!-- SEO -->
  <meta name="description" content="TaskFlow — Professional team task management">
  <!-- CSS (in load order) -->
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/typography.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/kanban.css">
  <link rel="stylesheet" href="css/modals.css">
  <link rel="stylesheet" href="css/notifications.css">
</head>
<body>
  <!-- Loading screen (hidden after boot) -->
  <div id="app-loader" class="app-loader">
    <div class="app-loader__spinner"></div>
  </div>

  <!-- Sidebar -->
  <aside id="sidebar" class="sidebar"></aside>

  <!-- Mobile sidebar overlay -->
  <div id="sidebar-overlay" class="sidebar-overlay hidden"></div>

  <!-- Topbar -->
  <header id="topbar" class="topbar"></header>

  <!-- Main view container -->
  <main id="main-content" class="main-content">
    <!-- Views are injected here by router.js -->
  </main>

  <!-- Task Detail Drawer -->
  <div id="task-drawer" class="task-drawer"></div>
  <div id="drawer-overlay" class="drawer-overlay hidden"></div>

  <!-- Modal Portal -->
  <div id="modal-overlay" class="modal-overlay hidden">
    <div id="modal-box" class="modal-box"></div>
  </div>

  <!-- Toast Container -->
  <div id="toast-container" class="toast-container" aria-live="polite"></div>

  <!-- App Entry Point -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

---

### Sidebar (`js/ui/sidebar.js`) — Rendered Content

**Section 1 — Workspace Header:**
- Workspace logo (or colored initials avatar)
- Workspace name (truncated)
- Dropdown chevron → opens workspace switcher dropdown:
  - Lists all workspaces user belongs to (name + role badge)
  - "＋ Create New Workspace" option at bottom

**Section 2 — Primary Navigation:**
| Icon | Label | Hash Route | Visibility |
|------|-------|-----------|------------|
| 🏠 | Dashboard | `#/dashboard` | All |
| 📋 | Board | `#/board` | All |
| 📄 | List | `#/list` | All |
| 📅 | Timeline | `#/timeline` | All |
| 📁 | Projects | `#/projects` | All |

**Section 3 — Admin Navigation** (shown only if `isAdminOrAbove`):
| Icon | Label | Hash Route |
|------|-------|-----------|
| 👥 | Team | `#/team` |
| 🏢 | Clients | `#/clients` |
| ⚙️ | Settings | `#/settings` |

**Section 4 — Bottom:**
- User avatar + display name → link to `#/profile`
- "Sign out" button

**Collapse Toggle:** Arrow button on sidebar edge. Clicking toggles `.sidebar--collapsed`. In collapsed mode: only icons visible, labels hidden, workspace name hidden. Tooltip shows on hover.

---

### Topbar (`js/ui/topbar.js`) — Rendered Content

**Left:** Hamburger button (mobile only, toggles sidebar).
**Center:** Global search bar:
- `<input type="search" id="global-search" placeholder="Search tasks...">` (debounced 300ms)
- Opens a floating results dropdown showing matching tasks (title, project, status badge)
**Right:**
- ＋ New Task button → opens full task form modal
- 🔔 Notification bell → shows unread count badge → clicking opens notification panel
- User avatar → dropdown: "View Profile", "Sign out"

---

### `js/ui/views/dashboard.js` — Dashboard View

**Rendered Sections:**

1. **Welcome heading:** "Good morning, {firstName} 👋"
2. **Stats Row** (4 cards with large numbers and icons):
   - 📌 **Open Tasks** — count of non-done, non-archived tasks assigned to me
   - ⚠️ **Overdue** — count of tasks where `dueDate < now` and `status != 'done'`
   - 📅 **Due This Week** — tasks due within the next 7 days
   - ✅ **Completed This Month** — tasks moved to `done` status this calendar month
3. **My Tasks** (assigned to me, not done, sorted by dueDate ascending, max 8):
   - Each row: priority dot · title · project chip · due date · status badge
   - "View all" link → `#/list?filter=mine`
4. **Project Progress** (cards for each active project):
   - Color swatch · Project name · Description · Progress bar (`doneCount / taskCount`) · Deadline
5. **Recent Activity Feed** (last 20 activity entries across all workspace tasks):
   - Actor avatar · "{Actor} {action} on **{task title}**" · time ago

---

### `js/ui/views/board.js` — Kanban Board View

**Filter Bar** (sticky below topbar):
- 🔍 Search input (client-side filter on already-loaded tasks)
- 👤 Assignee filter — avatars of all members, click to filter
- 🏷️ Priority filter — dropdown (All / Critical / High / Medium / Low)
- 📁 Project filter — dropdown
- 🏷️ Label filter — multi-select chips
- "Clear all" link

**Board:** Horizontal scrollable flex container.

**5 Columns** (always shown, even if empty):
| Column Header | `data-status` | Header Color |
|---|---|---|
| Todo | `todo` | Gray |
| In Progress | `in-progress` | Blue |
| In Review | `review` | Purple |
| Done | `done` | Green |
| Blocked | `blocked` | Red |

**Column Header:** Colored circle · Status name · `(count)` badge · `+` icon button.
Clicking `+` opens **Quick Add** inline at top of column (see Feature #1).

**Task Card** (generated by `js/ui/components/taskCard.js`):
```
┌─────────────────────────────┐
│ [Bug] [Feature]  [🔴 High]  │  ← label pills + priority badge
│ Fix login redirect loop     │  ← title (2-line clamp)
│ ─────────────────────────── │
│ 📁 Auth Project             │  ← project chip (colored)
│ 📅 Jun 28  ● 3/5  💬 4  📎2│  ← duedate, subtasks, comments, files
│                    [avatar] │  ← assignee avatar (right-aligned)
└─────────────────────────────┘
```
Left border color = priority color. Click → opens Task Detail Drawer.

---

### `js/ui/views/taskDetail.js` — Task Detail Drawer

Slides in from the right edge. 480px wide. Has its own scroll.

**Header:**
- Back/close `×` button
- Task title (contenteditable — saves on blur)
- `⋮` Actions menu: Duplicate · Archive · Delete (delete requires confirmation)

**Meta Section (grid layout):**
| Label | Widget |
|---|---|
| Status | Styled `<select>` with color-coded options |
| Priority | Styled `<select>` with color-coded options |
| Assignee | Avatar picker (opens dropdown of members with search) |
| Reporter | Read-only avatar + name |
| Project | Searchable dropdown of projects |
| Due Date | `<input type="date">` |
| Start Date | `<input type="date">` |
| Estimate | `<input type="number">` + "hours" label |

**Labels:** Multi-select label chips. Click to add/remove. Shows existing workspace labels. Admin can click ＋ to create new label inline.

**Description:** `<textarea>` — saves on blur. Shown as formatted text when not focused.

**Subtasks Section:**
- Progress bar: `{done}/{total} subtasks`
- Checklist of subtasks with `<input type="checkbox">` + title text
- Each row: checkbox · title · optional assignee avatar · delete icon (on hover)
- `+ Add subtask` inline input at bottom (Enter to save, Escape to cancel)

**Attachments Section:**
- Grid of file cards: thumbnail (image) or file icon (PDF, doc, etc.) + filename + size
- Each card: Download icon · Delete icon (own uploads or admin)
- Upload area: drag-and-drop zone + "Choose files" button
- Upload progress bar per file (0–100%)

**Comments Section:**
- Each comment: author avatar + name · time ago · comment body · (edit/delete on hover)
- `@` in textarea triggers a mention dropdown of workspace members
- Submit button + `Ctrl+Enter` keyboard shortcut
- Edited comments show "(edited)" label

**Activity Log Section:**
- Chronological list (newest at bottom):
  - `{Actor} created this task · {time ago}`
  - `{Actor} changed status from In Progress → Review · {time ago}`
  - `{Actor} assigned to {Assignee} · {time ago}`
  - etc.

---

### `js/ui/views/listView.js` — Table/List View

A spreadsheet-style view. All tasks for current workspace (non-archived) in a scrollable table.

**Columns:**
| Column | Sortable | Editable Inline |
|---|---|---|
| ☐ checkbox | — | — |
| Priority | ✅ | ✅ (dropdown) |
| Title | ✅ | ✅ (click to edit) |
| Project | ✅ | ✅ (dropdown) |
| Status | ✅ | ✅ (dropdown) |
| Assignee | ✅ | ✅ (picker) |
| Due Date | ✅ | ✅ (date input) |
| Labels | ❌ | ❌ (click → opens drawer) |
| Last Updated | ✅ | ❌ |

**Bulk Actions Bar** (appears when ≥1 checkbox selected):
- "X tasks selected" · Change Status · Assign To · Change Priority · Delete

**Row click** → opens Task Detail Drawer.

**Sorting:** Click column header → toggle ascending/descending. Current sort indicator (▲/▼).

**Grouping dropdown:** Group by: None / Status / Priority / Assignee / Project.

---

### `js/ui/views/timeline.js` — Gantt Timeline View

A simplified Gantt chart rendered with CSS grid.

- **Y-axis:** Tasks, grouped by project.
- **X-axis:** Days/weeks across the visible date range.
- **Task Bar:** `background-color` = status color, `grid-column` = start day to end day.
- **Hover tooltip:** Task title, assignee name, date range, status.
- **Click bar:** Opens Task Detail Drawer.
- **Date Navigation:** "← Previous month" / "Today" / "Next month →" buttons.
- Tasks without `startDate` use `createdAt` as fallback. Tasks without `dueDate` show as a 1-day point.

---

### `js/ui/views/projects.js` — Projects View

**Project List:**
- Card grid: project icon + color · Project name · Description · `X/Y tasks` progress bar · Status badge · Deadline · Owner avatar
- "+ New Project" button (Admin only) → opens project form modal
- Click card → opens Project Detail sub-view

**Project Detail (replaces main content):**
- Header: Back button · Project name · Edit / Archive / Delete (Admin only)
- Stats: Total tasks · Done · Overdue · Members working on it (unique assignees)
- Embedded filtered Kanban board showing only tasks where `projectId == project.id`

---

### `js/ui/views/team.js` — Team Management View

**For All Members:**
- Roster table: Avatar · Name · Email · Role badge · Status · Last seen

**For Admins/Owners additionally:**
- "Invite Member" button → modal with: Email input, Role selector (`Admin` / `Member` / `Viewer`).
  - Creates `workspace_members` doc with `status: 'Invited'`, `userId: ''`.
  - On user's next sign-in: `auth.js` checks if `workspace_members` doc exists for their email, sets `userId` and `status: 'Active'`.
- Edit role dropdown per member row.
- Deactivate / Remove member button (confirmation required).
- Cannot change the Owner's role — that row shows locked controls.

---

### `js/ui/views/clients.js` — Client Management (Admin Only)

**Client Card Grid:**
- Company logo (or initials avatar) · Company name · Contact name & email · Status pill (Active/Disabled)
- "📋 Copy Portal Link" button → `navigator.clipboard.writeText(portalUrl)` → shows Toast
- "✏️ Edit" · "🚫 Disable" · "🗑️ Delete" actions

**"＋ Add Client" Modal Form:**
- Company Name (required)
- Contact Name
- Contact Email (required)
- Logo upload (optional)
- On submit: generates `portalToken = crypto.randomUUID()`, saves to `clients` collection.

**Portal Link format:** `https://{hostname}/portal.html?token={portalToken}`

---

### `portal.html` — External Client Portal

**Token Validation Flow:**
1. Extract `token` from `window.location.search` (`?token=xxx`).
2. Firestore query: `clients` where `portalToken == token` and `isActive == true` (limit 1).
3. If not found: render "🔒 This link has expired or is invalid."
4. If found: store `client` in local variable. Query `tasks` where `clientId == client.id` and `isArchived == false`.
5. Render a simplified Kanban view (same 5 columns, read-only cards).
6. No sidebar, no topbar, no auth. Just a branded page with the workspace logo and project name.
7. Cards are not draggable. No "New Task" button. Task click opens a read-only detail view.

**Optional Comment Field** (if `client.canComment == true`):
- Comment textarea + submit (saved to Firestore `tasks/{taskId}/comments` with `authorId: 'client'`, `authorName: client.companyName`).

---

### `js/ui/views/settings.js` — Workspace Settings (Owner Only)

**Sections:**
1. **General:** Workspace name input · Logo upload · Slug (read-only) · Save button.
2. **Labels:** Table of existing labels (name, color, delete). `+ New Label` → name input + color picker → create.
3. **Notifications:** Toggle for email/browser notifications (future feature placeholder).
4. **Danger Zone** (red-bordered card):
   - "Delete Workspace" button (requires typing workspace name to confirm).
   - "Transfer Ownership" — enter another member's email to transfer Owner role.

---

### `js/ui/views/profile.js` — User Profile

- Avatar: shows current avatar, click to upload new (progress shown).
- Display Name: editable input, "Save" button.
- Email: read-only (from Auth).
- Change Password: current password + new password + confirm → `updatePassword(user, newPass)`.
- Danger: "Delete my account" (requires confirmation — `deleteUser(user)` from Firebase Auth).

---

## 10. Feature Specifications (Detailed)

### Feature 1: Task Quick Add

1. Click `+` in a Kanban column header.
2. A text input appears at the **top** of that column (above existing cards).
3. User types task title.
4. `Enter` → calls `createTask(workspaceId, { title, status: column.status, reporterId: uid, order: -Date.now() })`.
   - `order` is negative current timestamp — places new tasks at the top of the column.
5. `Escape` → removes input without saving.
6. Input auto-focuses on appearance.

### Feature 2: Full Task Form Modal

Opened by topbar "＋ New Task" button or "New Task" in project detail.

**All fields:**
- Title `*` (text, required, max 200 chars)
- Description (textarea)
- Project (searchable `<select>`)
- Status (segmented button row — visually highlighted)
- Priority (segmented button row — color-coded)
- Assignee (member avatar picker with name search)
- Labels (multi-select chip input — type to filter, click to add)
- Due Date (`<input type="date">`)
- Start Date (`<input type="date">`)
- Estimated Hours (`<input type="number" min="0" step="0.5">`)

Keyboard: `Escape` closes modal. `Ctrl+Enter` submits.

### Feature 3: @Mentions in Comments

1. User types `@` anywhere in the comment textarea.
2. A floating dropdown appears immediately below cursor position.
3. Dropdown lists workspace members filtered by what user types after `@`.
4. Selecting a member from dropdown: inserts `@{displayName}` into text, adds `uid` to a local `mentions[]` array.
5. On comment submit: the `mentions[]` array is saved to the comment doc.
6. After save: loop through `mentions[]`, call `createNotification(uid, { type: 'comment_mention', ... })` for each.

### Feature 4: Workspace Switcher

1. Click workspace name in sidebar header → dropdown appears.
2. Lists all workspaces the current user is an active member of.
3. Click a workspace:
   a. Cancel all active `onSnapshot` listeners (stored in `app.js` listener registry).
   b. `State.set('currentWorkspace', newWorkspace)`.
   c. `State.set('myRole', newRole)`.
   d. Re-start all subscriptions for the new workspace.
   e. Update `users/{uid}.defaultWorkspaceId = newWorkspaceId`.
   f. Re-render sidebar and current view.
4. "＋ Create New Workspace" at bottom → opens create workspace modal (name input, submit → `createWorkspace()`).

### Feature 5: Global Search

1. Topbar search input — debounced 300ms.
2. Filters `State.get('tasks')` array (in-memory, already loaded for current workspace) by `task.title.toLowerCase().includes(query)`.
3. Shows results in a floating dropdown panel:
   - Each result: priority dot · task title · project chip · status badge.
   - Max 10 results shown.
4. Click a result → `taskDetail.openDrawer(task.id)`.
5. `Escape` → closes dropdown.

### Feature 6: Due-Soon Alert (Client-Side)

Runs once on app boot after `isLoading → false` (via `requestIdleCallback` or `setTimeout(fn, 2000)`):
1. Filter `State.get('tasks')` where:
   - `assigneeId === currentUser.uid`
   - `status !== 'done'`
   - `dueDate` is within 24 hours from now
2. For each such task: check if a `notifications` doc with `type: 'due_soon'` and `taskId` already exists for today (query `notifications` where `recipientId == uid`, `taskId == task.id`, `type == 'due_soon'`, `createdAt > start of today`).
3. If not exists: call `createNotification({ type: 'due_soon', ... })`.

### Feature 7: Invite Flow — Pending Invite Detection

When `onAuthStateChanged` fires with a signed-in user:
1. Query `workspace_members` where `email == user.email` and `status == 'Invited'`.
2. For each result: batch-update `userId = user.uid`, `status = 'Active'`, `joinedAt = serverTimestamp()`.
3. Reload user workspace list — new workspace now appears.
4. Show toast: "You've been added to {workspace name}!"

### Feature 8: Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `N` | Open "New Task" form modal (when no input is focused) |
| `/` | Focus global search input |
| `Escape` | Close open modal / drawer / dropdown |
| `Ctrl+Enter` | Submit open form |
| `B` | Navigate to Board view |
| `L` | Navigate to List view |
| `D` | Navigate to Dashboard |

Implemented in `app.js` via `document.addEventListener('keydown', ...)` with focus check.

---

## 11. State Management Pattern

```
User Action (click, form submit, drag-drop)
        │
        ▼
Event handler in js/ui/views/*.js or js/ui/components/*.js
        │
        ▼
db/*.js function (validates data, writes to Firestore)
        │
        ▼
Firestore confirms write (optimistically reflected in UI)
        │
        ▼
Active onSnapshot listener in db/*.js fires with updated data
        │
        ▼
State.set('tasks', newData) — updates state + notifies all subscribers
        │
        ▼
All subscribed render functions in ui/ re-run automatically
        │
        ▼
DOM updates — user sees change
```

**Listener Registry in `app.js`:**
```js
const _unsubs = []; // Stores all unsubscribe functions

function startWorkspaceSubscriptions(workspaceId) {
  _unsubs.push(subscribeToMembers(workspaceId, ...));
  _unsubs.push(subscribeToProjects(workspaceId, ...));
  _unsubs.push(subscribeToLabels(workspaceId, ...));
  _unsubs.push(subscribeToNotifications(user.uid, ...));
  // Tasks are subscribed per-view, stored separately
}

function cancelAllSubscriptions() {
  _unsubs.forEach(fn => fn());
  _unsubs.length = 0;
}
```

---

## 12. Routing System

| Route Hash | View Module | Route Guard |
|---|---|---|
| `#/dashboard` | `views/dashboard.js` | Any member |
| `#/board` | `views/board.js` | Any member |
| `#/list` | `views/listView.js` | Any member |
| `#/timeline` | `views/timeline.js` | Any member |
| `#/projects` | `views/projects.js` | Any member |
| `#/team` | `views/team.js` | Any member (edit: Admin+) |
| `#/clients` | `views/clients.js` | Admin/Owner only |
| `#/notifications` | `views/notificationsView.js` | Any member |
| `#/settings` | `views/settings.js` | Owner only |
| `#/profile` | `views/profile.js` | Current user |
| `#/task/:id` | Opens drawer over current view | Any member |

Views are **lazy-loaded** with dynamic `import()`. This keeps initial page load fast — only `app.js`, `firebase-config.js`, `auth.js`, `state.js`, `sidebar.js`, and `topbar.js` are loaded upfront.

---

## 13. Real-Time Data Flow

**Always-on subscriptions** (started at boot, cancelled on sign-out or workspace switch):
- `workspace_members` for current workspace → `State.set('members', ...)`
- `projects` for current workspace → `State.set('projects', ...)`
- `labels` for current workspace → `State.set('labels', ...)`
- `notifications` for current user → `State.set('notifications', ...)` → updates bell badge

**Per-view subscriptions** (started when view mounts, cancelled when view unmounts):
- `tasks` query with current filters → `State.set('tasks', ...)`
- `tasks/{taskId}/comments` (when drawer is open)
- `tasks/{taskId}/activity` (when drawer is open)
- `tasks/{taskId}/subtasks` (when drawer is open)
- `tasks/{taskId}/attachments` (when drawer is open)

---

## 14. Notifications System

### Triggers and Recipients

| User Action | Notification Type | Recipient |
|---|---|---|
| Task assigned to someone | `task_assigned` | New assignee |
| Task status changes | `status_changed` | Reporter (if not self) |
| Comment posted on task | `task_commented` | Assignee + Reporter (if not author) |
| @mention in comment | `comment_mention` | Each mentioned UID |
| Task due within 24h | `due_soon` | Assignee |

### UI — Notification Bell
- Bell icon in topbar.
- Badge shows count of `notifications` where `isRead == false` (from State).
- Click → opens slide-down notification panel (not a separate page — overlay panel).

### Notification Panel
- "Mark all as read" button at top.
- Each notification row: actor avatar · message text · task title (clickable link → opens drawer) · time ago · unread dot.
- Clicking a notification: marks it `isRead: true`, navigates to the task.
- "View all notifications" link → navigates to `#/notifications` full page.

### `#/notifications` Full Page
- Paginated list of all notifications (read + unread).
- Filter tabs: All · Unread · Assigned · Mentions.
- "Delete all read" button.

---

## 15. Build Phases & Execution Order

### Phase 1 — Foundation: Auth & Shell
- [ ] Create `login.html` with full styled UI (two-column, animated left panel)
- [ ] Create `index.html` shell with all DOM anchor elements
- [ ] Write `css/variables.css`, `css/reset.css`, `css/typography.css`
- [ ] Implement `js/firebase-config.js`
- [ ] Implement `js/auth/auth.js` (`signInWithEmail`, `signInWithGoogle`, `sendPasswordReset`, `watchAuthState`)
- [ ] Wire login form events in login.html inline script
- [ ] Implement auth redirect guards (unauthenticated → login.html, authenticated on login → index.html)

### Phase 2 — Layout & Navigation Shell
- [ ] Write `css/layout.css` (sidebar, topbar, main area, drawer, responsive breakpoints)
- [ ] Write `css/components.css` (buttons, inputs, badges, avatars, chips, cards)
- [ ] Implement `js/store/state.js` (PubSub store)
- [ ] Implement `js/auth/permissions.js` (RBAC helpers)
- [ ] Implement `js/ui/sidebar.js` (render all sections, workspace switcher, collapse toggle)
- [ ] Implement `js/ui/topbar.js` (search bar, bell icon, avatar menu)
- [ ] Implement `js/ui/router.js` (hash routing, lazy-load, route guards)
- [ ] Implement `js/ui/toast.js` (queue, auto-dismiss, types)
- [ ] Implement `js/utils/helpers.js` (`formatDate`, `timeAgo`, `generateId`, `debounce`)
- [ ] Implement `js/app.js` (auth → boot → subscriptions → router.init)

### Phase 3 — Database Layer
- [ ] `db/users.js` — `getOrCreateUserProfile`, `updateUser`
- [ ] `db/workspaces.js` — `createWorkspace`, `subscribeToUserWorkspaces`, `updateWorkspace`, `deleteWorkspace`
- [ ] `db/members.js` — `inviteMember`, `subscribeToMembers`, `activatePendingInvite`, `updateMemberRole`, `removeMember`
- [ ] `db/projects.js` — full CRUD + `subscribeToProjects`
- [ ] `db/labels.js` — `createLabel`, `subscribeToLabels`, `deleteLabel`
- [ ] `db/tasks.js` — all task operations
- [ ] `db/notifications.js` — `createNotification`, `markRead`, `markAllRead`, `subscribeToNotifications`
- [ ] Deploy `firestore.rules`, `firestore.indexes.json`

### Phase 4 — Dashboard & Stats
- [ ] `js/ui/views/dashboard.js` — stats cards, my tasks, activity feed, project progress
- [ ] `js/utils/helpers.js` — add `getStartOfMonth`, `getEndOfWeek`, `isOverdue`

### Phase 5 — Kanban Board (Core Feature)
- [ ] Write `css/kanban.css`
- [ ] `js/ui/components/taskCard.js`
- [ ] `js/ui/components/priorityBadge.js`, `statusBadge.js`, `labelPill.js`, `progressBar.js`, `memberAvatar.js`
- [ ] `js/ui/views/board.js` — columns, filter bar, subscribe to tasks, render cards
- [ ] `js/utils/dragdrop.js` — drag-and-drop + fractional reordering
- [ ] Quick-add inline input per column

### Phase 6 — Task Detail Drawer
- [ ] Write `css/modals.css` (drawer slide animation, modal overlay)
- [ ] `js/ui/views/taskDetail.js` — all drawer sections
- [ ] `db/subtasks.js` — full CRUD + toggle
- [ ] `db/comments.js` — add/edit/delete + `@mention` detection
- [ ] `db/activity.js` — `logActivity`, `subscribeToActivity`
- [ ] `db/attachments.js` — upload with progress + delete
- [ ] Wire notifications on: task assign, status change, comment post, @mention
- [ ] `js/ui/components/taskForm.js` — full create/edit form modal
- [ ] `js/ui/modals.js` — generic open/close/confirm

### Phase 7 — Additional Views
- [ ] `js/ui/views/listView.js` — sortable table, inline editing, bulk actions
- [ ] `js/ui/views/timeline.js` — CSS grid Gantt view
- [ ] `js/ui/views/projects.js` — project list + project detail with embedded board

### Phase 8 — Team, Clients & Portal
- [ ] `js/ui/views/team.js` — member roster + invite flow + role management
- [ ] `js/ui/views/clients.js` — client cards + portal link generator
- [ ] `portal.html` + portal-specific CSS + client token validation logic + read-only board

### Phase 9 — Notifications, Settings, Profile
- [ ] `js/ui/views/notificationsView.js` — full notification center page
- [ ] `js/ui/views/settings.js` — workspace settings + labels editor + danger zone
- [ ] `js/ui/views/profile.js` — name/avatar/password/delete account
- [ ] `css/notifications.css` — notification panel + bell badge styles

### Phase 10 — Polish, Accessibility & Deploy
- [ ] Mobile responsive layout fixes across all views
- [ ] Loading skeleton screens (CSS shimmer animations) for all async sections
- [ ] Empty state illustrations (SVG inline or CSS) for board, list, projects, notifications
- [ ] Keyboard shortcut handler in `app.js`
- [ ] `<meta>` SEO tags + `<title>` updates per view
- [ ] Deploy `storage.rules`, final `firestore.rules` audit
- [ ] `firebase.json` hosting config:
  ```json
  {
    "hosting": {
      "public": ".",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        { "source": "/portal", "destination": "/portal.html" },
        { "source": "**", "destination": "/index.html" }
      ]
    }
  }
  ```
- [ ] Smoke-test: create workspace → invite member → create project → create task → drag task → add comment → portal link

---

## 16. Open Questions for Review

> [!IMPORTANT]
> The following decisions will impact implementation. Please answer before execution begins.

1. **Client Portal Write Access**
   Should external clients in `portal.html` be able to post comments on their tasks, or is it strictly read-only? (Affects `clients` schema: `canComment` field, and Firestore rules for unauthenticated writes.)

2. **Portal Authentication Model**
   The magic-link portal currently requires an unauthenticated Firestore read by `portalToken`. Options:
   - **Option A:** Add a special Firestore rule allowing unauthenticated read of `clients` by exact `portalToken` value (simplest — no backend).
   - **Option B:** Use a single Firebase Cloud Function as a lightweight validator (token → returns tasks JSON). Keeps Firestore fully locked.
   Which do you prefer?

3. **Member Invite Flow**
   When an admin invites someone by email:
   - **Option A:** Just create the Firestore `workspace_members` doc. Tell them to sign up at the app URL manually. The app detects their pending invite on first sign-in.
   - **Option B:** Also trigger a Firebase Auth email invitation (requires Auth Email Link sign-in to be enabled in Firebase Console).
   Which option?

4. **Timeline View Complexity**
   Is a simplified Gantt chart (tasks as colored bars on a calendar grid, no dependency arrows) sufficient, or do you need task dependency arrows (Task B blocks Task A)?

5. **Notification Delivery Channels**
   Are in-app notifications (the bell icon) sufficient for V1, or do you also need:
   - Browser push notifications (requires Service Worker + FCM)?
   - Email notifications (requires Firebase Cloud Functions or a third-party email service)?

6. **Task ID Display**
   Should tasks have a short human-readable ID displayed on cards (e.g., `TF-1042`, auto-incremented per workspace), or is the Firestore auto-ID sufficient?

7. **File Size Limits**
   Current plan: 50MB per attachment, 5MB for avatars/logos. Do these limits work for your team's use case?

8. **Multiple Workspaces**
   Is there a cap on how many workspaces a single user can create (e.g., 1 on free plan, unlimited on pro), or can anyone create unlimited workspaces in V1?
