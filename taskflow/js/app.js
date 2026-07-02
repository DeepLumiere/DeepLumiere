import { auth, db, setDoc, doc, getDoc, collection, query, where, getDocs, onSnapshot, deleteDoc, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "./firebase-config.js";
import { injectLayout } from "./layout.js";

    // --- State ---
    let currentUser = null;
    let state = {
      tickets: [],
      projects: [],
      team: [],
      subteams: [],
      clients: [],
      settings: { ticketPrefix: 'TF', nextNum: 1, webhookUrl: '' },
      currentView: 'dashboard',
      activeTicketLinks: [],
      activeTicketComments: [],
      users: [],
      currentUserProfile: null,
      activeOrgId: null,
      activeOrg: null
    };
    
    let unsubscribes = [];

    // Initialize Icons
    lucide.createIcons();

    // --- Routing (Check for Portal) ---
    const urlParams = new URLSearchParams(window.location.search);
    const portalToken = urlParams.get('portal');
    
    async function boot() {
      if (portalToken) {
        let portalScreen = document.getElementById('portal-screen');
        if (!portalScreen) {
           portalScreen = document.createElement('div');
           portalScreen.id = 'portal-screen';
           portalScreen.className = 'centered-screen';
           portalScreen.style.backgroundColor = 'var(--bg)';
           portalScreen.innerHTML = `
             <div class="centered-card" style="max-width: 600px; width: 100%;">
               <h2 id="portal-welcome" style="margin-bottom: 24px; text-align: center;">Welcome!</h2>
               <div id="portal-form-container">
                 <div class="form-group"><label class="form-label">Name</label><input type="text" class="input" id="portal-name"></div>
                 <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="portal-email"></div>
                 <div class="form-group"><label class="form-label">Request Title</label><input type="text" class="input" id="portal-title"></div>
                 <div class="form-group"><label class="form-label">Description</label><textarea class="input" id="portal-desc" rows="4"></textarea></div>
                 <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="submitPortalTicket()">Submit Request</button>
                 
                 <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border);">
                 <div class="form-group">
                   <label class="form-label">Check Request Status (Reference ID)</label>
                   <div class="flex gap-2">
                     <input type="text" class="input" id="portal-lookup-id" placeholder="REQ-0001">
                     <button class="btn btn-ghost" onclick="checkPortalStatus()">Check Status</button>
                   </div>
                 </div>
                 <div id="portal-status-result" style="margin-top: 16px;"></div>
               </div>
               <div id="portal-success-container" style="display:none; text-align:center;">
                 <i data-lucide="check-circle" style="width:48px;height:48px;color:var(--status-res);margin-bottom:16px;"></i>
                 <h3>Request Submitted Successfully!</h3>
                 <p style="color:var(--text-muted); margin-top:8px;">Your reference ID is <strong id="portal-ref-id" style="color:var(--text-light);"></strong></p>
                 <button class="btn btn-primary" style="margin-top:24px;" onclick="location.reload()">Submit Another</button>
               </div>
             </div>
           `;
           document.body.appendChild(portalScreen);
           if (window.lucide) window.lucide.createIcons();
        }
        portalScreen.style.display = 'flex';
        setupPortal(portalToken);
      } else {
        injectLayout(); // Inject Sidebar first
        
        // Fetch Modals and append to body
        try {
            const resp = await fetch('modals.html');
            const modalsHtml = await resp.text();
            const modalsContainer = document.getElementById('modals-container');
            if (modalsContainer) {
                modalsContainer.innerHTML = modalsHtml;
            }
        } catch(e) { console.error("Failed to load modals", e); }
        
        setupInternalApp();
      }
    }
    boot();

    // --- Portal Logic ---
    async function setupPortal(token) {
      try {
        const clientSnap = await getDoc(doc(db, "clients", token));
        if (clientSnap.exists()) {
          document.getElementById('portal-welcome').innerText = `Welcome, ${clientSnap.data().company}. How can we assist you?`;
        }
      } catch(e) {
        console.warn("Client read issue.");
      }

      window.submitPortalTicket = async () => {
        const name = document.getElementById('portal-name').value.trim();
        const email = document.getElementById('portal-email').value.trim();
        const title = document.getElementById('portal-title').value.trim();
        const desc = document.getElementById('portal-desc').value.trim();

        if(!name || !email || !title) return alert("Name, email, and title are required.");

        const id = `t_${Date.now()}`;
        let displayId = `REQ-${Date.now().toString().slice(-4)}`;
        try {
           const setSnap = await getDoc(doc(db, "globals", "settings"));
           if(setSnap.exists()) {
              const s = setSnap.data();
              displayId = `${s.ticketPrefix}-${String(s.nextNum).padStart(4, '0')}`;
           }
        } catch(e) {}

        const tData = {
          orgId: state.activeOrgId,
          title,
          description: `Submitted by: ${name} (${email})\n\n${desc}`,
          project: "",
          assignee: "",
          status: "Open",
          priority: "None",
          source: "portal",
          clientToken: token,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          displayId
        };

        try {
          await setDoc(doc(db, "tickets", id), tData);
          document.getElementById('portal-form-container').style.display = 'none';
          document.getElementById('portal-success-container').style.display = 'block';
          document.getElementById('portal-ref-id').innerText = displayId;
        } catch(e) {
          alert("Error submitting ticket.");
        }
      };

      window.checkPortalStatus = async () => {
         const refId = document.getElementById('portal-lookup-id').value.trim();
         if(!refId) return;
         
         const resContainer = document.getElementById('portal-status-result');
         const badge = document.getElementById('portal-status-badge');
         
         try {
            const q = query(collection(db, "tickets"), where("displayId", "==", refId), where("clientToken", "==", token));
            const snap = await getDocs(q);
            if(snap.empty) {
               alert("Request not found. Please check your Reference ID.");
               return;
            }
            const ticket = snap.docs[0].data();
            badge.className = `badge badge-status-${ticket.status.toLowerCase().replace(' ','-')}`;
            badge.innerText = ticket.status;
            resContainer.style.display = 'block';
         } catch(e) {
            console.error(e);
            alert("Error looking up ticket.");
         }
      };
    }

    // --- Internal App Logic ---
    function setupInternalApp() {
      const loginScreen = document.getElementById('login-screen');
      const appShell = document.getElementById('app-shell');
      const btnLogin = document.getElementById('btn-login');

      if (loginScreen) loginScreen.style.display = 'flex';

      if (btnLogin) {
        btnLogin.addEventListener('click', () => {
          const provider = new GoogleAuthProvider();
          signInWithPopup(auth, provider).catch(err => {
            const errEl = document.getElementById('login-error');
            if (errEl) {
              errEl.innerText = err.message;
              errEl.style.display = 'block';
            }
          });
        });
      }

      window.appLogout = () => { signOut(auth); };

      onAuthStateChanged(auth, async (user) => {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'dashboard';

        if (user) {
          currentUser = user;

          if (page === 'index' || page === '') {
             window.location.href = 'dashboard.html';
             return;
          }

          const userNameEl = document.getElementById('current-user-name');
          const userAvatarEl = document.getElementById('current-user-avatar');
          if (userNameEl) userNameEl.innerText = user.displayName || user.email;
          if (userAvatarEl) userAvatarEl.innerText = (user.displayName || user.email).charAt(0).toUpperCase();
          if (loginScreen) loginScreen.style.display = 'none';
          if (appShell) appShell.style.display = 'grid';
          
          const userRef = doc(db, "users", user.uid);
          let snap = await getDoc(userRef);
          
          if (!snap.exists()) {
             await setDoc(userRef, {
                username: '@' + (user.email ? user.email.split('@')[0] : 'user'),
                displayName: user.displayName || user.email,
                email: user.email,
                createdAt: new Date().toISOString()
             });
             snap = await getDoc(userRef);
          }
          
          const userData = snap.data();
          state.currentUserProfile = { id: user.uid, ...userData };
          
          let orgId = userData.activeOrgId;
          if (!orgId) {
             // Check if there is an existing organization in the database to join by default
             const orgsSnap = await getDocs(query(collection(db, "organizations")));
             if (!orgsSnap.empty) {
                orgId = orgsSnap.docs[0].id;
                await setDoc(userRef, { activeOrgId: orgId }, {merge: true});
                
                // Add self to the team roster
                await setDoc(doc(db, "team", `tm_${user.uid}`), {
                   orgId: orgId,
                   uid: user.uid,
                   name: user.displayName || user.email,
                   email: user.email,
                   role: 'Member',
                   department: 'Engineering',
                   title: 'Member'
                }, {merge: true});
                showToast("Joined workspace: " + orgsSnap.docs[0].data().name);
             } else {
                // No workspaces exist yet, create the first one
                orgId = "org_" + user.uid;
                await setDoc(doc(db, "organizations", orgId), {
                   name: (user.displayName || 'My') + "'s Workspace",
                   ownerId: user.uid,
                   ticketPrefix: 'TF',
                   createdAt: new Date().toISOString()
                });
                await setDoc(userRef, { activeOrgId: orgId }, {merge: true});
                
                // Auto-add self to team as Admin
                await setDoc(doc(db, "team", `tm_${user.uid}`), {
                   orgId: orgId,
                   uid: user.uid,
                   name: user.displayName || user.email,
                   email: user.email,
                   role: 'Admin',
                   department: 'Leadership',
                   title: 'Founder'
                }, {merge: true});
             }
          }
          // Check for Invite link parameters
          const urlParams = new URLSearchParams(window.location.search);
          const inviteOrgId = urlParams.get('invite');
          if (inviteOrgId) {
             const orgSnap = await getDoc(doc(db, "organizations", inviteOrgId));
             if (orgSnap.exists()) {
                await setDoc(doc(db, "team", `tm_${user.uid}`), {
                   orgId: inviteOrgId,
                   name: user.displayName || user.email,
                   email: user.email,
                   role: 'Member',
                   department: 'Engineering',
                   title: 'Member'
                }, {merge: true});
                await setDoc(userRef, { activeOrgId: inviteOrgId }, {merge: true});
                orgId = inviteOrgId;
                showToast("Joined workspace: " + orgSnap.data().name);
             } else {
                showToast("Workspace invite link is invalid.");
             }
             window.history.replaceState({}, document.title, window.location.pathname);
          }

          state.activeOrgId = orgId;
          
          unsubscribes.push(onSnapshot(userRef, (docSnap) => {
             if(docSnap.exists()) {
               const myProfile = { id: docSnap.id, ...docSnap.data() };
               state.currentUserProfile = myProfile;
               const dName = myProfile.displayName || myProfile.username;
               const userNameEl = document.getElementById('current-user-name');
               const userAvatarEl = document.getElementById('current-user-avatar');
               if (userNameEl) userNameEl.innerText = dName;
               if (userAvatarEl) userAvatarEl.innerText = dName.charAt(0).toUpperCase();
               
               if(myProfile.activeOrgId && myProfile.activeOrgId !== state.activeOrgId) {
                  cleanupApp();
                  state.activeOrgId = myProfile.activeOrgId;
                  initApp();
               }
             }
          }));

          // Listen to user's workspaces
          unsubscribes.push(onSnapshot(query(collection(db, "team"), where("email", "==", user.email)), async (teamSnap) => {
             const orgIds = [...new Set(teamSnap.docs.map(d => d.data().orgId))];
             const orgList = [];
             for(const oId of orgIds) {
                const oSnap = await getDoc(doc(db, "organizations", oId));
                if(oSnap.exists()) {
                   orgList.push({ id: oId, ...oSnap.data() });
                }
             }
             const switcher = document.getElementById('sidebar-org-switcher');
             if(switcher) {
                switcher.innerHTML = orgList.map(o => `<option value="${o.id}" ${o.id === state.activeOrgId ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('');
             }
          }));

          initApp();
        } else {
          currentUser = null;

          if (page !== 'index' && page !== '') {
             window.location.href = 'index.html';
             return;
          }

          if (loginScreen) loginScreen.style.display = 'flex';
          if (appShell) appShell.style.display = 'none';
          cleanupApp();
        }
      });
    }

    // --- Init & Data Fetching ---
    function initApp() {
      if (!state.activeOrgId) return;
      const orgFilter = where("orgId", "==", state.activeOrgId);

      unsubscribes.push(onSnapshot(collection(db, "users"), (snapshot) => {
        state.users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const myProfile = state.users.find(u => u.id === currentUser?.uid);
        if (myProfile) {
           state.currentUserProfile = myProfile;
           const dName = myProfile.displayName || myProfile.username;
           const userNameEl = document.getElementById('current-user-name');
           const userAvatarEl = document.getElementById('current-user-avatar');
           if (userNameEl) userNameEl.innerText = dName;
           if (userAvatarEl) userAvatarEl.innerText = dName.charAt(0).toUpperCase();
        }
      }));

      unsubscribes.push(onSnapshot(doc(db, "organizations", state.activeOrgId), (docSnap) => {
        if (docSnap.exists()) {
          state.activeOrg = { id: docSnap.id, ...docSnap.data() };
          state.settings = { ticketPrefix: state.activeOrg.ticketPrefix || 'TF', nextNum: state.activeOrg.nextNum || 1 };
        }
        const setPrefixEl = document.getElementById('set-prefix');
        if (setPrefixEl) setPrefixEl.value = state.settings.ticketPrefix;
      }));

      unsubscribes.push(onSnapshot(query(collection(db, "tickets"), orgFilter), (snapshot) => {
        state.tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        refreshCurrentView();
        checkReminders();
      }));

      unsubscribes.push(onSnapshot(query(collection(db, "projects"), orgFilter), (snapshot) => {
        state.projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        populateSelects();
        refreshCurrentView();
      }));

      unsubscribes.push(onSnapshot(query(collection(db, "team"), orgFilter), (snapshot) => {
        state.team = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        populateSelects();
        refreshCurrentView();
      }));

      unsubscribes.push(onSnapshot(query(collection(db, "clients"), orgFilter), (snapshot) => {
        state.clients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        populateSelects();
        refreshCurrentView();
      }));

      unsubscribes.push(onSnapshot(query(collection(db, "subteams"), orgFilter), (snapshot) => {
        state.subteams = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        populateSelects();
        refreshCurrentView();
      }));

      setInterval(checkReminders, 60000);
    }

    function cleanupApp() {
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];
    }

    // --- Navigation & View Rendering ---
    window.nav = (viewId) => {
      if (viewId === 'project-detail') {
          // Store active project id in session storage to persist across pages
          sessionStorage.setItem('activeProjectId', state.activeProjectId);
      }
      window.location.href = viewId + '.html';
    };

    function refreshCurrentView() {
      const page = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
      if (page === 'dashboard') {
          if (typeof renderDashboard === 'function') renderDashboard();
      } else if (page === 'kanban') {
          if (typeof renderKanban === 'function') renderKanban();
      } else if (page === 'tickets') {
          if (typeof renderTicketsTable === 'function') renderTicketsTable();
      } else if (page === 'projects') {
          if (typeof renderProjectsTable === 'function') renderProjectsTable();
      } else if (page === 'team') {
          if (typeof renderTeamView === 'function') renderTeamView();
      } else if (page === 'clients') {
          if (typeof renderClientsTable === 'function') renderClientsTable();
      } else if (page === 'project-detail') {
          state.activeProjectId = sessionStorage.getItem('activeProjectId');
          if (typeof renderProjectDetail === 'function') renderProjectDetail();
      } else if (page === 'settings') {
          if (typeof renderSettings === 'function') renderSettings();
      }
      applyRBAC();
      setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 0);
    }

    function applyRBAC() {
      if(!currentUser) return;
      // Get current user role
      const myTeamRecord = state.team.find(t => t.email === currentUser.email);
      const role = myTeamRecord ? myTeamRecord.role : 'Member';
      const isAdmin = role === 'Admin' || role === 'Owner';
      
      // Select all admin-only elements
      const adminElements = document.querySelectorAll('.admin-only');
      adminElements.forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
      });
      
      // If we are in settings and not admin, hide the org settings card
      const orgSettingsCard = document.getElementById('org-settings-card');
      if(orgSettingsCard) {
         orgSettingsCard.style.display = isAdmin ? 'block' : 'none';
      }
    }
    function renderSettings() {
      const setProfileUsername = document.getElementById('set-profile-username');
      const setProfileDisplayName = document.getElementById('set-profile-display-name');
      if(state.currentUserProfile && setProfileUsername && setProfileDisplayName) {
        setProfileUsername.value = state.currentUserProfile.username || '';
        setProfileDisplayName.value = state.currentUserProfile.displayName || '';
      }
      
      const setWorkspace = document.getElementById('set-workspace');
      const setPrefix = document.getElementById('set-prefix');
      const setInviteLink = document.getElementById('set-invite-link');
      const setOrgId = document.getElementById('set-org-id');
      if(state.activeOrg && setWorkspace && setPrefix && setInviteLink) {
        setWorkspace.value = state.activeOrg.name || '';
        setPrefix.value = state.activeOrg.ticketPrefix || 'TF';
        let path = window.location.pathname;
        if (!path.endsWith('index.html')) path = path.replace(/\/[^/]*$/, '/index.html');
        setInviteLink.value = `${window.location.origin}${path}?invite=${state.activeOrgId}`;
        if (setOrgId) setOrgId.value = state.activeOrg.id || state.activeOrgId;
      }
      
      const tbody = document.getElementById('settings-team-body');
      if(tbody) {
          tbody.innerHTML = state.team.map(t => `
            <tr class="interactive" onclick="openTeamModal('${t.id}')">
              <td style="font-weight:500;">${escapeHtml(t.name)}</td>
              <td>${escapeHtml(t.email)}</td>
              <td><span class="badge" style="background:rgba(255,255,255,0.05);">${escapeHtml(t.department || 'General')}</span></td>
              <td>${escapeHtml(t.role)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); deleteTeamMember('${t.id}')"><i data-lucide="trash-2"></i></button></td>
            </tr>
          `).join('');
      }
    }

    function populateSelects() {
      const projSelects = [document.getElementById('tm-project'), document.getElementById('kanban-project-filter')];
      projSelects.forEach(select => {
        if(!select) return;
        const currentVal = select.value;
        select.innerHTML = select.id === 'kanban-project-filter' ? 
          '<option value="all">All Projects & Tasks</option><option value="unassigned">Personal / Unassigned</option>' : 
          '<option value="">None / Personal Task</option>';
        state.projects.forEach(p => { select.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`; });
        select.value = currentVal;
      });

      const tmAssignee = document.getElementById('tm-assignee');
      if (tmAssignee) {
        const currentVal = tmAssignee.value;
        tmAssignee.innerHTML = '<option value="">Unassigned</option>';
        if(state.subteams && state.subteams.length > 0) {
            tmAssignee.innerHTML += '<optgroup label="Subteams">';
            state.subteams.forEach(st => { tmAssignee.innerHTML += `<option value="${st.id}">Team: ${escapeHtml(st.name)}</option>`; });
            tmAssignee.innerHTML += '</optgroup>';
        }
        if(state.team && state.team.length > 0) {
            tmAssignee.innerHTML += '<optgroup label="Members">';
            state.team.forEach(t => { tmAssignee.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`; });
            tmAssignee.innerHTML += '</optgroup>';
        }
        tmAssignee.value = currentVal;
      }

      const teSubteam = document.getElementById('te-subteam');
      if (teSubteam) {
        const currentVal = teSubteam.value;
        teSubteam.innerHTML = '<option value="">None</option>';
        (state.subteams || []).forEach(st => { teSubteam.innerHTML += `<option value="${st.id}">${escapeHtml(st.name)}</option>`; });
        teSubteam.value = currentVal;
      }

      const pmClient = document.getElementById('pm-client');
      if (pmClient) {
        const currentVal = pmClient.value;
        pmClient.innerHTML = '<option value="">None</option>';
        state.clients.forEach(c => { pmClient.innerHTML += `<option value="${c.id}">${escapeHtml(c.company)}</option>`; });
        pmClient.value = currentVal;
      }
    }

    // --- Dashboard ---
    function renderDashboard() {
      const statOpen = document.getElementById('stat-open');
      const statProg = document.getElementById('stat-prog');
      const statPortal = document.getElementById('stat-portal');
      const queue = document.getElementById('triage-queue-content');
      if (!statOpen || !statProg || !statPortal || !queue) return;

      const open = state.tickets.filter(t => t.status === 'Open').length;
      const prog = state.tickets.filter(t => t.status === 'In Progress').length;
      const portalSubmissions = state.tickets.filter(t => t.source === 'portal' && t.status === 'Open');
      
      statOpen.innerText = open;
      statProg.innerText = prog;
      statPortal.innerText = portalSubmissions.length;

      if (portalSubmissions.length === 0) {
        queue.innerHTML = '<div style="padding: 32px; text-align: center; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-lg); color: var(--text-muted);"><i data-lucide="check-circle" style="width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.5;"></i><p>Inbox zero! No new client submissions to triage.</p></div>';
      } else {
        queue.innerHTML = `<div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Client</th><th>Request Title</th><th>Submitted At</th><th>Action</th></tr></thead>
            <tbody>
              ${portalSubmissions.map(t => {
                const c = state.clients.find(x => x.id === t.clientToken);
                return `<tr class="interactive">
                  <td style="font-family:var(--font-mono); font-size:12px;">${t.displayId}</td>
                  <td><span class="badge" style="background:var(--surface-hover)">${escapeHtml(c ? c.company : 'Unknown')}</span></td>
                  <td style="font-weight:500;">${escapeHtml(t.title)}</td>
                  <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                  <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openTicketModal('${t.id}', true)"><i data-lucide="git-merge"></i> Triage</button></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>`;
      }
    }

    // --- Kanban Board ---
    window.renderKanban = () => {
      const board = document.getElementById('kanban-board');
      const projFilterEl = document.getElementById('kanban-project-filter');
      if (!board || !projFilterEl) return;
      const projFilter = projFilterEl.value;
      
      const statuses = ['Open', 'In Progress', 'In Review', 'Resolved', 'Closed'];
      board.innerHTML = '';
      
      statuses.forEach(status => {
        const col = document.createElement('div');
        col.className = 'kanban-column';
        
        let columnTickets = state.tickets.filter(t => t.status === status);
        if (projFilter === 'unassigned') columnTickets = columnTickets.filter(t => !t.project);
        else if (projFilter !== 'all') columnTickets = columnTickets.filter(t => t.project === projFilter);
        
        col.innerHTML = `
          <div class="kanban-header">
            <span>${status}</span>
            <span class="badge" style="background: rgba(255,255,255,0.1)">${columnTickets.length}</span>
          </div>
          <div class="kanban-cards" ondrop="drop(event, '${status}')" ondragover="allowDrop(event)">
            ${columnTickets.map(t => createKanbanCardHTML(t)).join('')}
            ${projFilter !== 'all' ? `<button class="btn btn-ghost" style="width:100%; border-style:dashed; margin-top:8px;" onclick="openTicketModal(null, false, '${projFilter}', '${status}')"><i data-lucide="plus"></i> Add Task</button>` : ''}
          </div>
        `;
        board.appendChild(col);
      });
      setTimeout(() => lucide.createIcons(), 0);
    };

    function createKanbanCardHTML(t) {
      const proj = state.projects.find(p => p.id === t.project);
      const projName = proj ? proj.name : 'Personal';
      const assignee = state.team.find(tm => tm.id === t.assignee);
      const assigneeName = assignee ? assignee.name.split(' ')[0] : 'Unassigned';
      
      let priorityBadge = t.priority && t.priority !== 'None' ? `<span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>` : '';
      let sourceBadge = t.source === 'portal' ? `<span class="badge" style="background:var(--primary-bg); color:var(--primary);"><i data-lucide="globe" style="width:10px; height:10px; margin-right:4px;"></i>Portal</span>` : '';

      return `
        <div class="kanban-card" draggable="true" ondragstart="drag(event, '${t.id}')" onclick="openTicketModal('${t.id}')">
          <div class="flex justify-between items-center" style="margin-bottom:12px">
            <span style="font-size:11px; font-family:var(--font-mono); color:var(--text-muted); font-weight:600;">${t.displayId || t.id.substring(0,6)}</span>
            <div class="flex gap-2">${sourceBadge}${priorityBadge}</div>
          </div>
          <div class="kanban-card-title">${escapeHtml(t.title)}</div>
          <div class="kanban-card-meta">
            <span style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:120px;" title="${escapeHtml(projName)}"><i data-lucide="folder"></i> ${escapeHtml(projName)}</span>
            <span><i data-lucide="user"></i> ${escapeHtml(assigneeName)}</span>
          </div>
        </div>
      `;
    }

    window.allowDrop = (ev) => ev.preventDefault();
    window.drag = (ev, id) => ev.dataTransfer.setData("text", id);
    window.drop = async (ev, newStatus) => {
      ev.preventDefault();
      const id = ev.dataTransfer.getData("text");
      if(id) {
        await setDoc(doc(db, "tickets", id), { status: newStatus }, {merge: true});
      }
    };

    // --- Tables ---
    function renderTicketsTable() {
      const tbody = document.getElementById('tickets-table-body');
      if (!tbody) return;
      tbody.innerHTML = state.tickets.map(t => {
        const p = state.projects.find(x => x.id === t.project);
        const a = state.team.find(x => x.id === t.assignee);
        return `<tr class="interactive" onclick="openTicketModal('${t.id}')">
          <td style="font-family:var(--font-mono); font-size:12px;">${t.displayId || t.id.substring(0,6)}</td>
          <td style="font-weight:500;">${escapeHtml(t.title)}</td>
          <td>${p ? escapeHtml(p.name) : '-'}</td>
          <td><span class="badge badge-status-${t.status.toLowerCase().replace(' ','-')}">${t.status}</span></td>
          <td>${t.priority !== 'None' ? `<span class="badge badge-priority-${(t.priority||'').toLowerCase()}">${t.priority}</span>` : '-'}</td>
          <td>${a ? escapeHtml(a.name) : '-'}</td>
          <td>${t.source === 'portal' ? '<i data-lucide="globe" style="width:14px; vertical-align:middle;"></i> Portal' : 'Internal'}</td>
        </tr>`;
      }).join('');
    }

    function renderProjectsTable() {
      const tbody = document.getElementById('projects-table-body');
      if (!tbody) return;
      tbody.innerHTML = state.projects.map(p => {
        const c = state.clients.find(x => x.id === p.client);
        const pTickets = state.tickets.filter(t => t.project === p.id);
        const done = pTickets.filter(t => ['Resolved','Closed'].includes(t.status)).length;
        const pct = pTickets.length ? Math.round((done/pTickets.length)*100) : 0;
        
        return `<tr class="interactive" onclick="openProjectDetail('${p.id}')">
          <td style="font-weight:600; font-family:var(--font-display);">${escapeHtml(p.name)}</td>
          <td>${c ? escapeHtml(c.company) : '-'}</td>
          <td><span class="badge" style="background:var(--surface-hover); border:1px solid var(--border);">${p.status}</span></td>
          <td style="width: 250px;">
            <div class="flex items-center gap-4">
              <div class="project-progress-bar" style="flex:1; margin:0;"><div class="project-progress-fill" style="width:${pct}%"></div></div>
              <span style="font-size:12px; font-weight:600; width: 30px; text-align:right;">${pct}%</span>
            </div>
          </td>
          <td><button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation(); deleteProject('${p.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`;
      }).join('');
    }

    window.deleteProject = async (id) => {
      if (confirm('Are you sure you want to delete this project?')) {
        try {
          await deleteDoc(doc(db, 'projects', id));
          showToast('Project deleted');
        } catch(e) {
          showToast('Error: ' + e.message);
        }
      }
    };

    function renderTeamView() {
      renderTeamTable();
      renderSubteamsTable();
    }

    function renderTeamTable() {
      const tbody = document.getElementById('team-table-body');
      if(tbody) {
        tbody.innerHTML = state.team.map(t => {
          const subteam = t.subteamId ? state.subteams.find(st => st.id === t.subteamId) : null;
          return `
            <tr class="interactive" onclick="openTeamModal('${t.id}')">
              <td style="font-weight:500;">${escapeHtml(t.name)}</td>
              <td><span class="badge" style="background:rgba(255,255,255,0.05);">${escapeHtml(t.role)}</span></td>
              <td>${subteam ? escapeHtml(subteam.name) : '-'}</td>
              <td><button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation(); deleteTeamMember('${t.id}')"><i data-lucide="trash-2"></i></button></td>
            </tr>
          `;
        }).join('');
      }
    }

    function renderSubteamsTable() {
      const tbody = document.getElementById('subteams-table-body');
      if(tbody) {
        tbody.innerHTML = (state.subteams || []).map(st => `
          <tr class="interactive" onclick="openSubteamModal('${st.id}')">
            <td style="font-weight:500;">${escapeHtml(st.name)}</td>
            <td>${escapeHtml(st.description || '-')}</td>
            <td><button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation(); deleteSubteam('${st.id}')"><i data-lucide="trash-2"></i></button></td>
          </tr>
        `).join('');
      }
    }

    function renderClientsTable() {
      const tbody = document.getElementById('clients-table-body');
      if (!tbody) return;
      tbody.innerHTML = state.clients.map(c => `
        <tr class="interactive" onclick="openClientModal('${c.id}')">
          <td style="font-weight:500;">${escapeHtml(c.company)}</td>
          <td>${escapeHtml(c.email)}</td>
          <td>${escapeHtml(c.tier || '-')}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); copyPortalLink('${c.id}')"><i data-lucide="copy"></i> Copy Link</button>
          </td>
          <td><button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation(); deleteClient('${c.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>
      `).join('');
    }

    window.copyPortalLink = (clientId) => {
      let path = window.location.pathname;
      if (!path.endsWith('index.html')) path = path.replace(/\/[^/]*$/, '/index.html');
      const url = `${window.location.origin}${path}?portal=${clientId}`;
      navigator.clipboard.writeText(url).then(() => showToast("Portal link copied!"));
    };

    // --- Project Detail View ---
    window.openProjectDetail = (id) => {
      const p = state.projects.find(x => x.id === id);
      if(!p) return;
      state.activeProjectId = id;
      nav('project-detail');
    };

    function renderProjectDetail() {
      const pdContent = document.getElementById('pd-content');
      if (!pdContent) return;
      const id = state.activeProjectId;
      const p = state.projects.find(x => x.id === id);
      if(!p) return nav('projects');

      const pTickets = state.tickets.filter(t => t.project === id);
      const inProg = pTickets.filter(t => t.status === 'In Progress');
      const open = pTickets.filter(t => t.status === 'Open');
      const done = pTickets.filter(t => ['Resolved','Closed'].includes(t.status)).length;
      const pct = pTickets.length ? Math.round((done/pTickets.length)*100) : 0;

      const html = `
        <div class="project-header-card">
          <div class="flex justify-between items-center">
            <h2 style="font-size:32px;">${escapeHtml(p.name)}</h2>
            <div class="flex gap-2">
               <button class="btn btn-primary" onclick="openTicketModal(null, false, '${p.id}')"><i data-lucide="plus"></i> Add Task</button>
               <button class="btn btn-ghost" onclick="openProjectModal('${p.id}')"><i data-lucide="settings"></i> Edit</button>
            </div>
          </div>
          <div class="flex gap-4 items-center" style="margin-top:16px; color:var(--text-muted); font-size:13px; font-weight:500;">
            <span class="badge" style="background:var(--surface-hover);">${p.status}</span>
            <span><i data-lucide="building" style="width:14px; vertical-align:middle;"></i> ${p.client ? escapeHtml(state.clients.find(c=>c.id===p.client)?.company || 'None') : 'None'}</span>
          </div>
          <div class="project-progress-bar"><div class="project-progress-fill" style="width:${pct}%"></div></div>
          <div style="font-size:12px; margin-top:8px; text-align:right; font-weight:600; color:var(--text-muted);">${pct}% Complete</div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
          <div>
            <h3 style="margin-bottom:16px; display:flex; align-items:center; gap:8px;"><i data-lucide="loader" style="color:var(--status-prog);"></i> In Progress</h3>
            <div class="flex flex-col gap-2">
              ${inProg.length ? inProg.map(t => `<div class="kanban-card" onclick="openTicketModal('${t.id}')">
                <div style="font-weight:500; margin-bottom:8px;">${escapeHtml(t.title)}</div>
                <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;"><i data-lucide="user"></i> ${t.assignee ? escapeHtml(state.team.find(a=>a.id===t.assignee)?.name) : 'Unassigned'}</div>
              </div>`).join('') : '<div style="padding:24px; text-align:center; background:var(--surface-hover); border-radius:var(--radius-lg); border:1px dashed var(--border); color:var(--text-muted);">Nothing currently in progress.</div>'}
            </div>
          </div>
          <div>
            <h3 style="margin-bottom:16px; display:flex; align-items:center; gap:8px;"><i data-lucide="inbox" style="color:var(--status-open);"></i> Up Next</h3>
            <div class="flex flex-col gap-2">
              ${open.length ? open.slice(0,5).map(t => `<div class="kanban-card" onclick="openTicketModal('${t.id}')">
                <div style="font-weight:500; margin-bottom:8px;">${escapeHtml(t.title)}</div>
                <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;"><i data-lucide="flag"></i> Priority: ${t.priority !== 'None' ? t.priority : '-'}</div>
              </div>`).join('') : '<div style="padding:24px; text-align:center; background:var(--surface-hover); border-radius:var(--radius-lg); border:1px dashed var(--border); color:var(--text-muted);">No open tasks.</div>'}
            </div>
          </div>
        </div>
      `;
      pdContent.innerHTML = html;
    }

    // --- Ticket Modal (Lifecycle Flow) ---
    window.openTicketModal = (id = null, isTriage = false, prefillProject = '', prefillStatus = 'Open') => {
      state.activeTicketLinks = [];
      state.activeTicketComments = [];
      
      const title = document.getElementById('tm-title');
      const btnDel = document.getElementById('tm-btn-delete');
      
      if(id) {
        const t = state.tickets.find(x => x.id === id);
        if(!t) return;
        document.getElementById('tm-id').value = t.id;
        document.getElementById('tm-source').value = t.source || 'internal';
        document.getElementById('tm-client-token').value = t.clientToken || '';
        document.getElementById('tm-name').value = t.title || '';
        document.getElementById('tm-desc').value = t.description || '';
        document.getElementById('tm-project').value = t.project || '';
        document.getElementById('tm-assignee').value = t.assignee || '';
        document.getElementById('tm-status').value = t.status || 'Open';
        document.getElementById('tm-priority').value = t.priority || 'None';
        document.getElementById('tm-due').value = t.dueDate || '';
        
        state.activeTicketLinks = t.links || [];
        state.activeTicketComments = t.comments || [];
        
        title.innerHTML = isTriage ? `<i data-lucide="git-merge" style="margin-right:8px;"></i> Triage Request: ${t.displayId}` : `<i data-lucide="edit-3" style="margin-right:8px;"></i> Edit Task: ${t.displayId || t.id.substring(0,6)}`;
        btnDel.style.display = isTriage ? 'none' : 'block';
      } else {
        document.getElementById('tm-id').value = '';
        document.getElementById('tm-source').value = 'internal';
        document.getElementById('tm-client-token').value = '';
        document.getElementById('tm-name').value = '';
        document.getElementById('tm-desc').value = '';
        document.getElementById('tm-project').value = prefillProject;
        document.getElementById('tm-assignee').value = '';
        document.getElementById('tm-status').value = prefillStatus;
        document.getElementById('tm-priority').value = 'None';
        document.getElementById('tm-due').value = '';
        title.innerHTML = `<i data-lucide="file-plus" style="margin-right:8px;"></i> New Task`;
        btnDel.style.display = 'none';
      }
      
      renderLifecycleActions();
      renderTicketLinks();
      renderTicketComments();
      document.getElementById('ticket-modal-overlay').classList.add('active');
      setTimeout(() => lucide.createIcons(), 0);
    };
    
    function renderLifecycleActions() {
       const status = document.getElementById('tm-status').value || 'Open';
       const container = document.getElementById('tm-lifecycle-actions');
       
       const flows = [
          { s: 'Open', label: 'Open', icon: 'circle' },
          { s: 'In Progress', label: 'In Progress', icon: 'play-circle' },
          { s: 'In Review', label: 'Review', icon: 'search' },
          { s: 'Resolved', label: 'Resolve', icon: 'check-circle' }
       ];
       
       container.innerHTML = flows.map(f => `
          <button class="btn-lifecycle ${status === f.s ? 'active' : ''}" onclick="setTicketStatus('${f.s}')">
             <i data-lucide="${f.icon}" style="width:16px; height:16px; margin-bottom:4px;"></i><br>${f.label}
          </button>
       `).join('');
       
       setTimeout(() => lucide.createIcons(), 0);
    }
    
    window.setTicketStatus = (newStatus) => {
       document.getElementById('tm-status').value = newStatus;
       renderLifecycleActions();
    };

    window.saveTicket = async () => {
      try {
        const id = document.getElementById('tm-id').value || `t_${Date.now()}`;
        const isNew = !document.getElementById('tm-id').value;
        
        let displayId = null;
        if (isNew) {
          const nextNum = (state.activeOrg && state.activeOrg.nextNum) || 1;
          const prefix = (state.activeOrg && state.activeOrg.ticketPrefix) || 'TF';
          displayId = `${prefix}-${String(nextNum).padStart(4, '0')}`;
          await setDoc(doc(db, "organizations", state.activeOrgId), { nextNum: nextNum + 1 }, {merge:true});
        }

        const tData = {
          orgId: state.activeOrgId,
          title: document.getElementById('tm-name').value.trim(),
          description: document.getElementById('tm-desc').value.trim(),
          project: document.getElementById('tm-project').value,
          assignee: document.getElementById('tm-assignee').value,
          status: document.getElementById('tm-status').value,
          priority: document.getElementById('tm-priority').value,
          dueDate: document.getElementById('tm-due').value,
          source: document.getElementById('tm-source').value,
          clientToken: document.getElementById('tm-client-token').value,
          links: state.activeTicketLinks,
          comments: state.activeTicketComments,
          updatedAt: new Date().toISOString()
        };
        
        if(isNew) {
          tData.createdAt = new Date().toISOString();
          tData.displayId = displayId;
        }

        if(!tData.title) return showToast('Title is required');

        await setDoc(doc(db, "tickets", id), tData, {merge: true});
        closeModal('ticket-modal-overlay');
        showToast(isNew ? 'Task created' : 'Task updated');
      } catch (e) {
        showToast('Error: ' + e.message);
        console.error('saveTicket Error:', e);
      }
    };

    window.deleteTicket = async () => {
      const id = document.getElementById('tm-id').value;
      if(confirm('Are you sure you want to delete this task?')) {
        await deleteDoc(doc(db, "tickets", id));
        closeModal('ticket-modal-overlay');
        showToast('Task deleted');
      }
    };

    // --- Ticket Links & Comments ---
    window.addTicketLink = () => {
      const url = document.getElementById('tm-link-url').value.trim();
      const label = document.getElementById('tm-link-label').value.trim() || url;
      if(!url) return;
      state.activeTicketLinks.push({ url, label });
      document.getElementById('tm-link-url').value = '';
      document.getElementById('tm-link-label').value = '';
      renderTicketLinks();
    };
    
    window.removeTicketLink = (index) => {
      state.activeTicketLinks.splice(index, 1);
      renderTicketLinks();
    };

    function renderTicketLinks() {
      const list = document.getElementById('tm-link-list');
      if(!state.activeTicketLinks.length) { list.innerHTML = '<p class="text-muted" style="font-size:12px; font-style:italic;">No links attached.</p>'; return; }
      list.innerHTML = state.activeTicketLinks.map((l, i) => `
        <div class="link-item">
          <div class="link-item-main">
            <i data-lucide="external-link"></i>
            <a href="${escapeHtml(l.url)}" target="_blank" title="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>
          </div>
          <button class="btn-ghost" style="padding:4px; font-size:11px; border:none;" onclick="removeTicketLink(${i})"><i data-lucide="x" style="width:14px; height:14px;"></i></button>
        </div>
      `).join('');
      setTimeout(() => lucide.createIcons(), 0);
    }

    window.addTicketComment = () => {
      const text = document.getElementById('tm-new-comment').value.trim();
      if(!text) return;
      state.activeTicketComments.push({
        text,
        author: currentUser.displayName || currentUser.email,
        timestamp: new Date().toISOString()
      });
      document.getElementById('tm-new-comment').value = '';
      renderTicketComments();
    };

    function renderTicketComments() {
      const list = document.getElementById('tm-comment-list');
      if(!state.activeTicketComments.length) { list.innerHTML = ''; return; }
      list.innerHTML = state.activeTicketComments.map(c => {
        const d = new Date(c.timestamp);
        return `
        <div class="comment">
          <div class="comment-header">
            <span style="color:var(--text);"><i data-lucide="user" style="width:12px; height:12px; margin-right:4px;"></i>${escapeHtml(c.author)}</span>
            <span>${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div style="font-size:13px; white-space:pre-wrap; color:var(--text-muted); line-height:1.6;">${escapeHtml(c.text)}</div>
        </div>
      `}).join('');
      setTimeout(() => lucide.createIcons(), 0);
    }

    // --- Entity Modals ---
    window.openProjectModal = (id = null) => {
      if(id) {
        const p = state.projects.find(x => x.id === id);
        document.getElementById('pm-id').value = p.id;
        document.getElementById('pm-name').value = p.name;
        document.getElementById('pm-status').value = p.status;
        document.getElementById('pm-client').value = p.client || '';
        document.getElementById('pm-title').innerHTML = '<i data-lucide="folder-edit" style="margin-right:8px;"></i> Edit Project';
      } else {
        document.getElementById('pm-id').value = '';
        document.getElementById('pm-name').value = '';
        document.getElementById('pm-status').value = 'Active';
        document.getElementById('pm-client').value = '';
        document.getElementById('pm-title').innerHTML = '<i data-lucide="folder-plus" style="margin-right:8px;"></i> New Project';
      }
      document.getElementById('project-modal-overlay').classList.add('active');
      setTimeout(() => lucide.createIcons(), 0);
    };

    window.saveProject = async () => {
      try {
        const id = document.getElementById('pm-id').value || `p_${Date.now()}`;
        const name = document.getElementById('pm-name').value.trim();
        if(!name) return showToast("Project Name is required");
        await setDoc(doc(db, "projects", id), {
          orgId: state.activeOrgId,
          name,
          status: document.getElementById('pm-status').value,
          client: document.getElementById('pm-client').value
        }, {merge: true});
        closeModal('project-modal-overlay');
        showToast('Project saved');
      } catch (e) {
        showToast('Error: ' + e.message);
        console.error('saveProject Error:', e);
      }
    };

    window.openTeamModal = (id = null) => {
      if(id) {
        const t = state.team.find(x => x.id === id);
        document.getElementById('te-id').value = t.id;
        document.getElementById('te-name').value = t.name;
        document.getElementById('te-email').value = t.email;
        document.getElementById('te-role').value = t.role || 'Member';
        document.getElementById('te-subteam').value = t.subteamId || '';
      } else {
        document.getElementById('te-id').value = '';
        document.getElementById('te-name').value = '';
        document.getElementById('te-email').value = '';
        document.getElementById('te-role').value = 'Member';
        document.getElementById('te-subteam').value = '';
      }
      document.getElementById('team-modal-overlay').classList.add('active');
    };

    window.saveTeamMember = async () => {
      try {
        const id = document.getElementById('te-id').value || `tm_${Date.now()}`;
        const name = document.getElementById('te-name').value.trim();
        if(!name) return showToast("Name is required");
        await setDoc(doc(db, "team", id), {
          orgId: state.activeOrgId,
          name,
          email: document.getElementById('te-email').value.trim(),
          role: document.getElementById('te-role').value.trim(),
          subteamId: document.getElementById('te-subteam').value
        }, {merge: true});
        closeModal('team-modal-overlay');
      } catch (e) {
        showToast('Error: ' + e.message);
        console.error('saveTeamMember Error:', e);
      }
    };

    window.openSubteamModal = (id = null) => {
      if(id) {
        const st = state.subteams.find(x => x.id === id);
        document.getElementById('st-id').value = st.id;
        document.getElementById('st-name').value = st.name;
        document.getElementById('st-desc').value = st.description || '';
        document.getElementById('st-title').innerHTML = '<i data-lucide="network" style="margin-right:8px;"></i> Edit Subteam';
      } else {
        document.getElementById('st-id').value = '';
        document.getElementById('st-name').value = '';
        document.getElementById('st-desc').value = '';
        document.getElementById('st-title').innerHTML = '<i data-lucide="network" style="margin-right:8px;"></i> New Subteam';
      }
      document.getElementById('subteam-modal-overlay').classList.add('active');
      setTimeout(() => lucide.createIcons(), 0);
    };

    window.saveSubteam = async () => {
      try {
        const id = document.getElementById('st-id').value || `st_${Date.now()}`;
        const name = document.getElementById('st-name').value.trim();
        if(!name) return showToast("Subteam Name is required");
        await setDoc(doc(db, "subteams", id), {
          orgId: state.activeOrgId,
          name,
          description: document.getElementById('st-desc').value.trim()
        }, {merge: true});
        closeModal('subteam-modal-overlay');
        showToast('Subteam saved');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    };

    window.deleteSubteam = async (id) => {
      if (confirm('Are you sure you want to delete this subteam?')) {
        try {
          await deleteDoc(doc(db, 'subteams', id));
          showToast('Subteam deleted');
        } catch(e) {
          showToast('Error: ' + e.message);
        }
      }
    };



    window.openClientModal = (id = null) => {
      if(id) {
        const c = state.clients.find(x => x.id === id);
        document.getElementById('ce-id').value = c.id;
        document.getElementById('ce-company').value = c.company;
        document.getElementById('ce-email').value = c.email;
      } else {
        document.getElementById('ce-id').value = '';
        document.getElementById('ce-company').value = '';
        document.getElementById('ce-email').value = '';
      }
      document.getElementById('client-modal-overlay').classList.add('active');
    };

    window.saveClient = async () => {
      try {
        const id = document.getElementById('ce-id').value || `c_${Date.now()}`;
        const company = document.getElementById('ce-company').value.trim();
        if(!company) return showToast("Company Name is required");
        await setDoc(doc(db, "clients", id), {
          orgId: state.activeOrgId,
          company,
          email: document.getElementById('ce-email').value.trim()
        }, {merge: true});
        closeModal('client-modal-overlay');
      } catch (e) {
        showToast('Error: ' + e.message);
        console.error('saveClient Error:', e);
      }
    };

    // --- Settings ---
    window.saveSettings = async () => {
      if(!state.activeOrgId) return;
      try {
        const prefix = document.getElementById('set-prefix').value.trim() || 'TF';
        const workspace = document.getElementById('set-workspace').value.trim() || 'My Workspace';
        await setDoc(doc(db, "organizations", state.activeOrgId), { 
          ticketPrefix: prefix,
          name: workspace
        }, {merge:true});
        showToast('Organization saved successfully');
      } catch (e) {
        showToast('Error: ' + e.message);
        console.error('saveSettings Error:', e);
      }
    };
    
    window.saveProfileFromSettings = async () => {
      try {
        const username = document.getElementById('set-profile-username').value.trim();
        const displayName = document.getElementById('set-profile-display-name').value.trim();
        if(!username) return showToast('Username required');
        
        let formattedUsername = username;
        if (!formattedUsername.startsWith('@')) {
          formattedUsername = '@' + formattedUsername;
        }

        // Check for duplicate username
        const q = query(collection(db, "users"), where("username", "==", formattedUsername));
        const snap = await getDocs(q);
        let taken = false;
        snap.forEach(d => {
          if (d.id !== currentUser.uid) {
            taken = true;
          }
        });

        if (taken) {
          return showToast(`Username ${formattedUsername} is already taken`);
        }

        await setDoc(doc(db, "users", currentUser.uid), {
          username: formattedUsername, displayName, updatedAt: new Date().toISOString()
        }, {merge: true});
        showToast('Profile updated');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    };

    window.testWebhook = () => { showToast('Test payload simulated'); };

    // --- Notifications ---
    window.requestNotificationPermission = () => {
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") showToast('Notifications enabled');
        });
      }
    };

    function checkReminders() {
      const today = new Date().toISOString().split('T')[0];
      const dueToday = state.tickets.filter(t => t.dueDate === today && !['Resolved','Closed'].includes(t.status));
      
      const badge = document.getElementById('notif-badge');
      if (dueToday.length > 0) {
        badge.style.display = 'flex';
        badge.innerText = dueToday.length;
      } else {
        badge.style.display = 'none';
      }
    }

    // --- Utils ---
    window.closeModal = (id, event = null) => {
      if(event && event.target.id !== id) return;
      document.getElementById(id).classList.remove('active');
    };

    window.showToast = (msg) => {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i data-lucide="info"></i> ${msg}`;
      container.appendChild(toast);
      lucide.createIcons();
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
      }, 3000);
    };

    function escapeHtml(unsafe) {
      if(!unsafe) return '';
      return unsafe.toString()
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    }


    window.switchOrganization = async (orgId) => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { activeOrgId: orgId }, {merge: true});
        showToast('Switched Workspace');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    };

    window.deleteTeamMember = async (id) => {
      console.log('deleteTeamMember called for ID:', id);
      if (confirm('Are you sure you want to remove this member from the organization?')) {
        try {
          const ref = doc(db, 'team', id);
          console.log('Attempting Firestore delete on path: team/' + id);
          await deleteDoc(ref);
          console.log('Delete successful');
          showToast('Member removed');
        } catch(e) {
          console.error('Delete failed:', e);
          showToast('Error: ' + e.message);
        }
      }
    };

    window.deleteClient = async (id) => {
      console.log('deleteClient called for ID:', id);
      if (confirm('Are you sure you want to delete this client?')) {
        try {
          const ref = doc(db, 'clients', id);
          console.log('Attempting Firestore delete on path: clients/' + id);
          await deleteDoc(ref);
          console.log('Delete successful');
          showToast('Client deleted');
        } catch(e) {
          console.error('Delete failed:', e);
          showToast('Error: ' + e.message);
        }
      }
    };

    window.openCreateOrgModal = () => {
      document.getElementById('new-org-name').value = '';
      document.getElementById('new-org-prefix').value = 'TF';
      document.getElementById('create-org-modal-overlay').classList.add('active');
    };

    window.createOrganization = async () => {
      try {
        const name = document.getElementById('new-org-name').value.trim();
        const prefix = document.getElementById('new-org-prefix').value.trim() || 'TF';
        if(!name) return showToast('Workspace Name is required');
        
        const orgId = `org_${Date.now()}`;
        await setDoc(doc(db, "organizations", orgId), {
          name,
          ownerId: currentUser.uid,
          ticketPrefix: prefix,
          nextNum: 1,
          createdAt: new Date().toISOString()
        });

        // Add creator to team
        await setDoc(doc(db, "team", `tm_${currentUser.uid}_${Date.now()}`), {
          orgId: orgId,
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email,
          role: 'Admin',
          department: 'Leadership'
        });

        // Set as active org
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { activeOrgId: orgId }, {merge: true});
        
        closeModal('create-org-modal-overlay');
        showToast('Workspace Created!');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    };

    window.switchOrgTab = (tab) => {
      document.getElementById('org-tab-create').style.display = tab === 'create' ? 'block' : 'none';
      document.getElementById('org-tab-join').style.display = tab === 'join' ? 'block' : 'none';
      document.getElementById('org-footer-create').style.display = tab === 'create' ? 'flex' : 'none';
      document.getElementById('org-footer-join').style.display = tab === 'join' ? 'flex' : 'none';
      
      const btnCreate = document.getElementById('tab-create-org');
      const btnJoin = document.getElementById('tab-join-org');
      if(tab === 'create') {
         btnCreate.style.borderColor = 'var(--primary)';
         btnCreate.style.color = 'var(--text)';
         btnJoin.style.borderColor = 'transparent';
         btnJoin.style.color = 'var(--text-muted)';
      } else {
         btnJoin.style.borderColor = 'var(--primary)';
         btnJoin.style.color = 'var(--text)';
         btnCreate.style.borderColor = 'transparent';
         btnCreate.style.color = 'var(--text-muted)';
      }
    };

    window.joinOrganizationById = async () => {
      try {
        const orgId = document.getElementById('join-org-id').value.trim();
        if(!orgId) return showToast('Organization ID is required');
        
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if(!orgSnap.exists()) return showToast('Organization not found');

        // Check if already in team
        const teamSnap = await getDocs(query(collection(db, "team"), where("orgId", "==", orgId), where("email", "==", currentUser.email)));
        if(teamSnap.empty) {
           await setDoc(doc(db, "team", `tm_${currentUser.uid}_${Date.now()}`), {
             orgId: orgId,
             uid: currentUser.uid,
             name: currentUser.displayName || currentUser.email,
             email: currentUser.email,
             role: 'Member',
             department: 'Engineering'
           });
        }
        
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { activeOrgId: orgId }, {merge: true});
        
        closeModal('create-org-modal-overlay');
        showToast('Successfully joined workspace!');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    };

    window.copyInviteLink = () => {
      const inviteLink = document.getElementById('set-invite-link');
      inviteLink.select();
      inviteLink.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(inviteLink.value);
      showToast('Invite link copied to clipboard!');
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
      }
    });
    
    // --- Extra Settings Actions ---
    window.copyOrgId = () => {
        const input = document.getElementById('set-org-id');
        if(input && input.value) {
            navigator.clipboard.writeText(input.value).then(() => showToast("Organization ID copied!"));
        }
    };

    window.saveSettings = async () => {
        const name = document.getElementById('set-workspace').value.trim();
        const prefix = document.getElementById('set-prefix').value.trim();
        if(!name) return showToast("Name is required");
        
        try {
            await setDoc(doc(db, "organizations", state.activeOrgId), {
                name,
                ticketPrefix: prefix
            }, {merge: true});
            showToast("Organization saved");
        } catch(e) { showToast("Error saving: " + e.message); }
    };

    window.deleteWorkspace = async () => {
        if(!state.activeOrgId) return;
        const confirmName = prompt(`Are you sure you want to permanently delete this organization? Type '${state.activeOrg.name}' to confirm:`);
        if (confirmName !== state.activeOrg.name) {
            return showToast("Deletion cancelled.");
        }
        
        try {
            await deleteDoc(doc(db, "organizations", state.activeOrgId));
            // User will be detached on next refresh since org no longer exists
            await setDoc(doc(db, "users", currentUser.uid), { activeOrgId: null }, {merge: true});
            showToast("Organization deleted.");
            setTimeout(() => window.location.href = 'index.html', 1500);
        } catch(e) {
            showToast("Error deleting: " + e.message);
        }
    };

    window.clearWorkspaceData = async () => {
        if(!state.activeOrgId) return;
        if(!confirm("WARNING: This will permanently delete ALL Projects, Tickets, Subteams, and Clients from this Workspace. Are you sure?")) return;
        
        showToast("Clearing data, please wait...");
        try {
            const collectionsToClear = ["tickets", "projects", "clients", "subteams"];
            for (const col of collectionsToClear) {
                const q = query(collection(db, col), where("orgId", "==", state.activeOrgId));
                const snap = await getDocs(q);
                for (const docSnap of snap.docs) {
                    await deleteDoc(doc(db, col, docSnap.id));
                }
            }
            showToast("Workspace data cleared successfully!");
        } catch(e) {
            showToast("Error clearing data: " + e.message);
        }
    };
    
    // Patch renderSettings to fill set-org-id
    const originalRenderSettings = renderSettings;
    window.renderSettings = function() {
        originalRenderSettings();
        if(state.activeOrgId && document.getElementById('set-org-id')) {
            document.getElementById('set-org-id').value = state.activeOrgId;
        }
    };
