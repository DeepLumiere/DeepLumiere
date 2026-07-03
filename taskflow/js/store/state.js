// ═══════════════════════════════════════════════════
// TaskFlow v2 — State Management (PubSub)
// ═══════════════════════════════════════════════════

const _state = {
  user:             null,   // { uid, displayName, email, photoURL }
  workspaces:       [],     // All workspaces user belongs to
  currentWorkspace: null,   // Active workspace object
  myRole:           null,   // Role in currentWorkspace ('Owner', 'Admin', 'Member', 'Viewer')
  members:          [],     // workspace_members for currentWorkspace
  projects:         [],     // Projects for currentWorkspace
  tasks:            [],     // Tasks for current view
  labels:           [],     // Labels for currentWorkspace
  clients:          [],     // Clients (admin only)
  notifications:    [],     // Unread notifications
  currentTask:      null,   // Task open in detail drawer
  currentView:      null,   // Active route string (e.g. 'board', 'list')
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

const _listeners = {};

export const State = {
  get(key) { 
    return _state[key]; 
  },
  
  set(key, value) {
    _state[key] = value;
    if (_listeners[key]) {
      _listeners[key].forEach(fn => fn(value));
    }
  },
  
  subscribe(key, fn) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(fn);
    // Immediately invoke with current value so late subscribers get state
    fn(_state[key]);
    return () => { 
      _listeners[key] = _listeners[key].filter(f => f !== fn); 
    };
  },
  
  update(key, updater) {
    this.set(key, updater(_state[key]));
  },
};
