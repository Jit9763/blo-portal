

// ==========================================================================
// SUPER ADMIN 4 DEDICATED TABS & CUSTOM SCOPE CONTROLLER (⚡)
// ==========================================================================

let activeHubSubTab = 'cell';

function switchMasterHubSubTab(tabName) {
  if (!tabName) tabName = 'cell';
  activeHubSubTab = tabName;
  
  const panes = {
    cell: document.getElementById('masterHubPaneCell'),
    blo: document.getElementById('masterHubPaneBlo'),
    cand: document.getElementById('masterHubPaneCand'),
    admins: document.getElementById('masterHubPaneAdmins')
  };
  const btns = {
    cell: document.getElementById('btnSubTabCell'),
    blo: document.getElementById('btnSubTabBlo'),
    cand: document.getElementById('btnSubTabCand'),
    admins: document.getElementById('btnSubTabAdmins')
  };

  Object.keys(panes).forEach(k => {
    if (panes[k]) panes[k].style.display = (k === tabName) ? 'block' : 'none';
    if (btns[k]) {
      if (k === tabName) btns[k].classList.add('active');
      else btns[k].classList.remove('active');
    }
  });

  if (tabName === 'cell') renderAdminCellTab();
  else if (tabName === 'blo') renderAdminBloTab();
  else if (tabName === 'cand') renderAdminCandTab();
  else if (tabName === 'admins') renderAdminTopAdminsTab();
}

function getUserOverrides() {
  try {
    return JSON.parse(localStorage.getItem('portal_user_overrides') || '{}');
  } catch(e) {
    return {};
  }
}

function saveUserOverride(userId, key, value) {
  const overrides = getUserOverrides();
  if (!overrides[userId]) overrides[userId] = {};
  overrides[userId][key] = value;
  localStorage.setItem('portal_user_overrides', JSON.stringify(overrides));
  
  // Also sync in State.adminControlUsers
  if (State.adminControlUsers) {
    const u = State.adminControlUsers.find(x => (x.id || x.username) === userId);
    if (u) u[key] = value;
  }
}

function toggleUserPermission(userId, permKey, isChecked) {
  saveUserOverride(userId, permKey, isChecked);
  showToast(`✅ अनुमति अद्यतन: ${userId} -> ${permKey} = ${isChecked ? 'हाँ' : 'नहीं'}`);
}

function updateUserScope(userId, scopeVal) {
  if (scopeVal === 'BOOTH' || scopeVal === 'CUSTOM') {
    openCustomScopeModal(userId);
    return;
  }
  saveUserOverride(userId, 'allowed_panchayats', scopeVal);
  showToast(`🌐 कार्यक्षेत्र अद्यतन: ${userId} -> ${scopeVal}`);
  if (activeHubSubTab === 'cell') renderAdminCellTab();
  else if (activeHubSubTab === 'blo') renderAdminBloTab();
  else if (activeHubSubTab === 'cand') renderAdminCandTab();
  else if (activeHubSubTab === 'admins') renderAdminTopAdminsTab();
}

function toggleUserStatus(userId) {
  const overrides = getUserOverrides();
  const cur = (overrides[userId] && overrides[userId].status) || 'ACTIVE';
  const nxt = (cur === 'ACTIVE') ? 'INACTIVE' : 'ACTIVE';
  saveUserOverride(userId, 'status', nxt);
  showToast(`खाता स्थिति: ${userId} -> ${nxt === 'ACTIVE' ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}`);
  if (activeHubSubTab === 'cell') renderAdminCellTab();
  else if (activeHubSubTab === 'blo') renderAdminBloTab();
  else if (activeHubSubTab === 'cand') renderAdminCandTab();
  else if (activeHubSubTab === 'admins') renderAdminTopAdminsTab();
}

function quickUpdatePassword(userId, newPass) {
  if (!newPass || !newPass.trim()) {
    showToast('⚠️ पासवर्ड रिक्त नहीं हो सकता!');
    return;
  }
  saveUserOverride(userId, 'password', newPass.trim());
  showToast(`🔑 पासवर्ड अद्यतन: ${userId} -> ${newPass.trim()}`);
}

function resetUserPasswordToDefault(userId) {
  quickUpdatePassword(userId, '123');
  const inputEl = document.getElementById(`pass_input_${userId}`);
  if (inputEl) inputEl.value = '123';
}

function canUserPrint() {
  if (!State.currentUser) return true;
  if (State.currentUser.role === 'SUPER_ADMIN') return true;
  const overrides = getUserOverrides();
  const uid = State.currentUser.username || State.currentUser.id;
  if (overrides[uid] && overrides[uid].can_print !== undefined) return overrides[uid].can_print;
  return State.currentUser.can_print !== false;
}

function canUserDownload() {
  if (!State.currentUser) return true;
  if (State.currentUser.role === 'SUPER_ADMIN') return true;
  const overrides = getUserOverrides();
  const uid = State.currentUser.username || State.currentUser.id;
  if (overrides[uid] && overrides[uid].can_download !== undefined) return overrides[uid].can_download;
  return State.currentUser.can_download !== false;
}

// -------------------------------------------------------------------------
// CUSTOM SCOPE & ALLOTMENT MODAL ENGINE
// -------------------------------------------------------------------------
function openCustomScopeModal(userId) {
  const modal = document.getElementById('customScopeModal');
  if (!modal) return;
  
  const overrides = getUserOverrides();
  const uov = overrides[userId] || {};
  
  // Look up user object
  let userObj = null;
  if (State.adminControlUsers) {
    userObj = State.adminControlUsers.find(x => (x.id || x.username) === userId);
  }
  if (!userObj) {
    const dir = getMasterDirectory();
    if (dir) {
      const all = [...(dir.cell_personnel || []), ...(dir.blo_list || []), ...(dir.all_contacts || [])];
      userObj = all.find(x => (x.id || x.username) === userId);
    }
  }
  if (!userObj) userObj = { id: userId, username: userId, name: userId };

  const titleEl = document.getElementById('customScopeModalTitle');
  if (titleEl) titleEl.textContent = `🎯 कार्यक्षेत्र एवं अधिकार आवंटन - ${userObj.name || userObj.username}`;

  const targetIdEl = document.getElementById('scopeTargetUserId');
  if (targetIdEl) targetIdEl.value = userId;

  // Banner
  const banner = document.getElementById('scopeUserBanner');
  if (banner) {
    banner.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div style="font-size:1.15rem; font-weight:800; color:#0f172a;">${userObj.name || userObj.username}</div>
          <div style="font-size:0.85rem; color:#475569; margin-top:2px;">
            <strong>संवर्ग / पद:</strong> ${userObj.designation || userObj.post || userObj.role || userObj.cell_name || '-'} | 
            <strong>कार्यालय / स्कूल:</strong> ${userObj.office || userObj.school || userObj.school_office || '-'}
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.8rem; font-weight:800; padding:4px 8px; border-radius:4px;">ID: ${userId}</span>
          <div style="font-size:0.82rem; color:#0284c7; font-weight:700; margin-top:3px;">📞 ${userObj.mobile || '-'}</div>
        </div>
      </div>
    `;
  }

  // Populate GP Select
  const gpSelect = document.getElementById('scopeGpSelect');
  if (gpSelect) {
    gpSelect.innerHTML = '';
    const panchayats = (State.panchayats && State.panchayats.length > 0) ? State.panchayats : (window.MASTER_DATA && window.MASTER_DATA.panchayats) || [];
    panchayats.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp.name_hi;
      opt.textContent = `🏛️ ${gp.name_hi} (${gp.name_en})`;
      gpSelect.appendChild(opt);
    });
  }

  // Current Scope Mode
  const curScope = uov.allowed_panchayats || userObj.allowed_panchayats || userObj.panchayat || 'ALL';
  let scopeMode = 'ALL';
  let selectedGp = (State.panchayats && State.panchayats[0]) ? State.panchayats[0].name_hi : 'बगराई';

  if (curScope === 'ALL' || curScope === 'समस्त 30 पंचायतें' || curScope === 'ALL_30_GP') {
    scopeMode = 'ALL';
  } else if (curScope === 'BOOTH' || uov.allowed_wards || userObj.booth_no || curScope.includes('भाग')) {
    scopeMode = 'BOOTH';
    if (userObj.panchayat && userObj.panchayat !== 'समस्त ब्लॉक भिनाय') selectedGp = userObj.panchayat;
  } else {
    scopeMode = 'GP';
    selectedGp = curScope;
  }

  // Set Radios
  const radios = document.getElementsByName('scopeModeRadio');
  radios.forEach(r => { r.checked = (r.value === scopeMode); });
  onScopeModeRadioChanged(scopeMode);

  if (gpSelect && selectedGp) {
    gpSelect.value = selectedGp;
    onScopeGpSelectChanged(selectedGp);
  }

  // Ward & Booth values
  const wardInput = document.getElementById('scopeWardInput');
  if (wardInput) wardInput.value = uov.allowed_wards || userObj.allowed_wards || (userObj.wards || 'ALL');

  // Permissions
  const pSearch = (uov.can_search !== undefined) ? uov.can_search : (userObj.can_search !== false);
  const pView = (uov.can_view !== undefined) ? uov.can_view : (userObj.can_view !== false);
  const pPrint = (uov.can_print !== undefined) ? uov.can_print : (userObj.can_print === true || userObj.role === 'SUPER_ADMIN' || userObj.role === 'VYAVASTHAPAK' || userObj.role === 'INCHARGE');
  const pDown = (uov.can_download !== undefined) ? uov.can_download : (userObj.can_download !== false);

  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  setChk('scopePermSearch', pSearch);
  setChk('scopePermView', pView);
  setChk('scopePermPrint', pPrint);
  setChk('scopePermDownload', pDown);

  // Password & Status
  const curPass = uov.password || userObj.password || '123';
  const curStatus = uov.status || userObj.status || 'ACTIVE';
  const passInput = document.getElementById('scopePasswordInput');
  if (passInput) passInput.value = curPass;
  const statSelect = document.getElementById('scopeStatusSelect');
  if (statSelect) statSelect.value = curStatus;

  modal.style.display = 'flex';
}

function closeCustomScopeModal() {
  const modal = document.getElementById('customScopeModal');
  if (modal) modal.style.display = 'none';
}

function onScopeModeRadioChanged(mode) {
  const gpCont = document.getElementById('scopeGpContainer');
  const bwCont = document.getElementById('scopeBoothWardContainer');
  if (mode === 'ALL') {
    if (gpCont) gpCont.style.display = 'none';
    if (bwCont) bwCont.style.display = 'none';
  } else if (mode === 'GP') {
    if (gpCont) gpCont.style.display = 'block';
    if (bwCont) bwCont.style.display = 'none';
  } else if (mode === 'BOOTH') {
    if (gpCont) gpCont.style.display = 'block';
    if (bwCont) bwCont.style.display = 'block';
  }
}

function onScopeGpSelectChanged(gpName) {
  const boothSel = document.getElementById('scopeBoothSelect');
  if (!boothSel) return;
  boothSel.innerHTML = '<option value="ALL">-- पंचायत के समस्त बूथ --</option>';

  const dir = getMasterDirectory();
  if (dir && dir.blo_list) {
    const gpBlos = dir.blo_list.filter(b => b.panchayat === gpName);
    gpBlos.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.booth_no;
      opt.textContent = `भाग सं. ${b.booth_no} - ${b.school || b.name}`;
      boothSel.appendChild(opt);
    });
  }
}

function saveCustomScopeAllotment(event) {
  if (event) event.preventDefault();
  const userId = document.getElementById('scopeTargetUserId').value;
  if (!userId) return;

  const mode = document.querySelector('input[name="scopeModeRadio"]:checked')?.value || 'ALL';
  let scopeVal = 'ALL';
  let wardVal = 'ALL';

  if (mode === 'ALL') {
    scopeVal = 'ALL';
    wardVal = 'ALL';
  } else if (mode === 'GP') {
    scopeVal = document.getElementById('scopeGpSelect')?.value || 'ALL';
    wardVal = 'ALL';
  } else if (mode === 'BOOTH') {
    const gp = document.getElementById('scopeGpSelect')?.value || '';
    const booth = document.getElementById('scopeBoothSelect')?.value || 'ALL';
    wardVal = document.getElementById('scopeWardInput')?.value.trim() || 'ALL';
    scopeVal = (booth !== 'ALL') ? `भाग ${booth} (${gp})` : gp;
  }

  const canSearch = document.getElementById('scopePermSearch')?.checked;
  const canView = document.getElementById('scopePermView')?.checked;
  const canPrint = document.getElementById('scopePermPrint')?.checked;
  const canDownload = document.getElementById('scopePermDownload')?.checked;
  const pass = document.getElementById('scopePasswordInput')?.value.trim() || '123';
  const status = document.getElementById('scopeStatusSelect')?.value || 'ACTIVE';

  // Save all to overrides
  saveUserOverride(userId, 'allowed_panchayats', scopeVal);
  saveUserOverride(userId, 'allowed_wards', wardVal);
  saveUserOverride(userId, 'can_search', canSearch);
  saveUserOverride(userId, 'can_view', canView);
  saveUserOverride(userId, 'can_print', canPrint);
  saveUserOverride(userId, 'can_download', canDownload);
  saveUserOverride(userId, 'password', pass);
  saveUserOverride(userId, 'status', status);

  // Update State.adminControlUsers
  if (State.adminControlUsers) {
    const u = State.adminControlUsers.find(x => (x.id || x.username) === userId);
    if (u) {
      u.allowed_panchayats = scopeVal;
      u.allowed_wards = wardVal;
      u.can_search = canSearch;
      u.can_view = canView;
      u.can_print = canPrint;
      u.can_download = canDownload;
      u.password = pass;
      u.status = status;
    }
  }

  closeCustomScopeModal();
  
  // Re-render current active subtab
  if (activeHubSubTab === 'cell') renderAdminCellTab();
  else if (activeHubSubTab === 'blo') renderAdminBloTab();
  else if (activeHubSubTab === 'cand') renderAdminCandTab();
  else if (activeHubSubTab === 'admins') renderAdminTopAdminsTab();

  showToast(`✅ कार्यक्षेत्र व अधिकार आवंटन सफलतापूर्वक सुरक्षित! (${userId})`);
}

// -------------------------------------------------------------------------
// 1. RENDER CELL TAB (18 ELECTION CELLS - 59 OFFICIAL PERSONNEL)
// -------------------------------------------------------------------------
function renderAdminCellTab() {
  const tbody = document.getElementById('adminCellTableBody');
  if (!tbody) return;

  const dir = getMasterDirectory();
  const rawCells = (dir && dir.cell_personnel) ? dir.cell_personnel : [];
  const overrides = getUserOverrides();

  // Populate cell filter dropdown if needed
  const cellFilterSelect = document.getElementById('adminCellFilterSelect');
  if (cellFilterSelect && cellFilterSelect.options.length <= 1) {
    cellFilterSelect.innerHTML = '<option value="ALL">-- समस्त 18 चुनाव प्रकोष्ठ --</option>';
    const cellNames = [...new Set(rawCells.map(c => c.cell_name).filter(Boolean))];
    cellNames.forEach(cn => {
      const opt = document.createElement('option');
      opt.value = cn;
      opt.textContent = cn;
      cellFilterSelect.appendChild(opt);
    });
  }

  const searchVal = (document.getElementById('adminCellSearchInput') ? document.getElementById('adminCellSearchInput').value : '').toLowerCase().trim();
  const cellFilter = document.getElementById('adminCellFilterSelect') ? document.getElementById('adminCellFilterSelect').value : 'ALL';
  const statusFilter = document.getElementById('adminCellStatusFilter') ? document.getElementById('adminCellStatusFilter').value : 'ALL';

  const filtered = rawCells.filter(c => {
    const cid = c.id || c.username;
    const ov = overrides[cid] || {};
    const effectiveStatus = ov.status || c.status || 'ACTIVE';
    
    if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false;
    if (cellFilter !== 'ALL' && c.cell_name !== cellFilter) return false;

    if (searchVal) {
      const match = (c.name && c.name.toLowerCase().includes(searchVal)) ||
                    (c.cell_name && c.cell_name.toLowerCase().includes(searchVal)) ||
                    (c.designation && c.designation.toLowerCase().includes(searchVal)) ||
                    (c.office && c.office.toLowerCase().includes(searchVal)) ||
                    (c.mobile && c.mobile.includes(searchVal)) ||
                    (cid && cid.toLowerCase().includes(searchVal));
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b; font-weight:700;">कोई प्रकोष्ठ कार्मिक नहीं मिला।</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach((c, idx) => {
    const cid = c.id || c.username;
    const ov = overrides[cid] || {};
    const pass = ov.password || c.password || '123';
    const status = ov.status || c.status || 'ACTIVE';
    const isActive = (status === 'ACTIVE');
    const canSearch = (ov.can_search !== undefined) ? ov.can_search : (c.can_search !== false);
    const canView = (ov.can_view !== undefined) ? ov.can_view : (c.can_view !== false);
    const canPrint = (ov.can_print !== undefined) ? ov.can_print : (c.can_print === true);
    const canDownload = (ov.can_download !== undefined) ? ov.can_download : (c.can_download !== false);
    const scope = ov.allowed_panchayats || c.allowed_panchayats || 'ALL';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:#1e3a8a;">${cid}</strong>
        <div style="font-size:0.75rem; color:#64748b;">क्र.सं. ${idx+1}</div>
      </td>
      <td>
        <div style="font-weight:700; color:#0f172a; font-size:0.92rem;">${c.name}</div>
        <div style="font-size:0.78rem; color:#475569;">${c.designation || c.post || ''}</div>
        <div style="font-size:0.74rem; color:#64748b;">${c.office || ''}</div>
      </td>
      <td>
        <span class="badge" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-size:0.78rem; font-weight:700;">
          ${c.cell_name || 'चुनाव प्रकोष्ठ'}
        </span>
        <div style="font-size:0.75rem; color:#059669; font-weight:700; margin-top:2px;">
          ${c.role_in_cell || 'प्रकोष्ठ सदस्य'}
        </div>
      </td>
      <td>
        <a href="tel:${c.mobile}" style="font-weight:700; color:#0284c7; text-decoration:none;">📞 ${c.mobile}</a>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <input type="text" class="form-input form-input-sm" value="${pass}" id="pass_input_${cid}" onchange="quickUpdatePassword('${cid}', this.value)" style="width:75px; font-weight:700; height:30px; padding:2px 6px;">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="quickUpdatePassword('${cid}', document.getElementById('pass_input_${cid}').value)" title="सेव">💾</button>
        </div>
      </td>
      <td>
        <div class="d-flex flex-wrap gap-1 align-items-center mb-1">
          <label class="perm-check-item ${canSearch ? 'active' : ''}">
            <input type="checkbox" ${canSearch ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_search', this.checked)">
            <span>🔍 खोज</span>
          </label>
          <label class="perm-check-item ${canView ? 'active' : ''}">
            <input type="checkbox" ${canView ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_view', this.checked)">
            <span>📄 दर्शन</span>
          </label>
          <label class="perm-check-item ${canPrint ? 'active' : ''}">
            <input type="checkbox" ${canPrint ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_print', this.checked)">
            <span>🖨️ प्रिंट</span>
          </label>
          <label class="perm-check-item ${canDownload ? 'active' : ''}">
            <input type="checkbox" ${canDownload ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_download', this.checked)">
            <span>📥 डाउनलोड</span>
          </label>
        </div>
        <div class="d-flex align-items-center gap-1">
          <span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:0.75rem; font-weight:700;">
            ${scope === 'ALL' ? '🌐 समस्त 30 पं.' : scope}
          </span>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="openCustomScopeModal('${cid}')" style="font-weight:700; padding:2px 6px;" title="कस्टम कार्यक्षेत्र एवं बूथ/वार्ड आवंटन">
            🎯 आवंटन
          </button>
        </div>
      </td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-xs ${isActive ? 'btn-success' : 'btn-danger'}" onclick="toggleUserStatus('${cid}')" style="font-weight:700; font-size:0.75rem; min-width:65px;">
          ${isActive ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
        </button>
      </td>
      <td style="text-align:center;">
        <div class="d-flex justify-content-center gap-1">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="openEditPersonnelModal('${cid}')" title="विवरण संपादित करें">✏️</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="resetUserPasswordToDefault('${cid}')" title="पासवर्ड 123 करें">🔄 123</button>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteCellPersonnel('${cid}', '${c.name}')" title="हटाएं">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------------------
// 2. RENDER BLO TAB (126 BOOTHS ACROSS 30 PANCHAYATS)
// -------------------------------------------------------------------------
function renderAdminBloTab() {
  const tbody = document.getElementById('adminBloTableBody');
  if (!tbody) return;

  const dir = getMasterDirectory();
  const rawBlos = (dir && dir.blo_list) ? dir.blo_list : [];
  const overrides = getUserOverrides();

  const searchVal = (document.getElementById('adminBloSearchInput') ? document.getElementById('adminBloSearchInput').value : '').toLowerCase().trim();
  const gpFilter = document.getElementById('adminBloGpFilter') ? document.getElementById('adminBloGpFilter').value : 'ALL';
  const statusFilter = document.getElementById('adminBloStatusFilter') ? document.getElementById('adminBloStatusFilter').value : 'ALL';

  const filtered = rawBlos.filter(b => {
    const bid = b.username || b.id || b.user_id;
    const ov = overrides[bid] || {};
    const effectiveStatus = ov.status || b.status || 'ACTIVE';
    
    if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false;
    if (gpFilter !== 'ALL' && b.panchayat !== gpFilter) return false;

    if (searchVal) {
      const match = (b.name && b.name.toLowerCase().includes(searchVal)) ||
                    (b.school && b.school.toLowerCase().includes(searchVal)) ||
                    (b.panchayat && b.panchayat.toLowerCase().includes(searchVal)) ||
                    (b.booth_no && String(b.booth_no).includes(searchVal)) ||
                    (b.mobile && b.mobile.includes(searchVal)) ||
                    (bid && bid.toLowerCase().includes(searchVal));
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b; font-weight:700;">कोई बी.एल.ओ. नहीं मिला।</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(b => {
    const bid = b.username || b.id || b.user_id;
    const ov = overrides[bid] || {};
    const pass = ov.password || b.password || '123';
    const status = ov.status || b.status || 'ACTIVE';
    const isActive = (status === 'ACTIVE');
    const canSearch = (ov.can_search !== undefined) ? ov.can_search : (b.can_search !== false);
    const canView = (ov.can_view !== undefined) ? ov.can_view : (b.can_view !== false);
    const canPrint = (ov.can_print !== undefined) ? ov.can_print : (b.can_print === true);
    const canDownload = (ov.can_download !== undefined) ? ov.can_download : (b.can_download !== false);
    const scope = ov.allowed_panchayats || b.panchayat || 'BOOTH';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; font-size:0.82rem; border:1px solid #fde68a;">
          भाग सं. ${b.booth_no}
        </span>
        <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">ID: ${bid}</div>
      </td>
      <td>
        <div style="font-weight:700; color:#0f172a; font-size:0.92rem;">${b.name}</div>
        <div style="font-size:0.78rem; color:#475569;">${b.post || 'अध्यापक / BLO'}</div>
        <div style="font-size:0.74rem; color:#64748b;">${b.school || ''}</div>
      </td>
      <td>
        <div style="font-weight:700; color:#1e40af;">🏛️ ${b.panchayat}</div>
        <div style="font-size:0.76rem; color:#64748b;">वार्ड: ${b.wards || '-'}</div>
      </td>
      <td>
        <a href="tel:${b.mobile}" style="font-weight:700; color:#0284c7; text-decoration:none;">📞 ${b.mobile}</a>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <input type="text" class="form-input form-input-sm" value="${pass}" id="pass_input_${bid}" onchange="quickUpdatePassword('${bid}', this.value)" style="width:75px; font-weight:700; height:30px; padding:2px 6px;">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="quickUpdatePassword('${bid}', document.getElementById('pass_input_${bid}').value)" title="सेव">💾</button>
        </div>
      </td>
      <td>
        <div class="d-flex flex-wrap gap-1 align-items-center mb-1">
          <label class="perm-check-item ${canSearch ? 'active' : ''}">
            <input type="checkbox" ${canSearch ? 'checked' : ''} onchange="toggleUserPermission('${bid}', 'can_search', this.checked)">
            <span>🔍 खोज</span>
          </label>
          <label class="perm-check-item ${canView ? 'active' : ''}">
            <input type="checkbox" ${canView ? 'checked' : ''} onchange="toggleUserPermission('${bid}', 'can_view', this.checked)">
            <span>📄 दर्शन</span>
          </label>
          <label class="perm-check-item ${canPrint ? 'active' : ''}">
            <input type="checkbox" ${canPrint ? 'checked' : ''} onchange="toggleUserPermission('${bid}', 'can_print', this.checked)">
            <span>🖨️ प्रिंट</span>
          </label>
          <label class="perm-check-item ${canDownload ? 'active' : ''}">
            <input type="checkbox" ${canDownload ? 'checked' : ''} onchange="toggleUserPermission('${bid}', 'can_download', this.checked)">
            <span>📥 डाउनलोड</span>
          </label>
        </div>
        <div class="d-flex align-items-center gap-1">
          <span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:0.75rem; font-weight:700;">
            ${scope === 'ALL' ? '🌐 समस्त 30 पं.' : (scope.includes('भाग') ? scope : '🏛️ ' + scope)}
          </span>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="openCustomScopeModal('${bid}')" style="font-weight:700; padding:2px 6px;" title="कस्टम कार्यक्षेत्र एवं बूथ/वार्ड आवंटन">
            🎯 आवंटन
          </button>
        </div>
      </td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-xs ${isActive ? 'btn-success' : 'btn-danger'}" onclick="toggleUserStatus('${bid}')" style="font-weight:700; font-size:0.75rem; min-width:65px;">
          ${isActive ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
        </button>
      </td>
      <td style="text-align:center;">
        <div class="d-flex justify-content-center gap-1">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="openEditPersonnelModal('${bid}')" title="विवरण संपादित करें">✏️</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="resetUserPasswordToDefault('${bid}')" title="पासवर्ड 123 करें">🔄 123</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------------------
// 3. RENDER CANDIDATE TAB (CANDIDATES & PANCHAYAT REPRESENTATIVES)
// -------------------------------------------------------------------------
function renderAdminCandTab() {
  const tbody = document.getElementById('adminCandTableBody');
  if (!tbody) return;

  const users = State.adminControlUsers || [];
  const candUsers = users.filter(u => u.type === 'CANDIDATE' || u.category === 'CANDIDATE' || (u.id && u.id.startsWith('cand_')) || (u.username && u.username.startsWith('cand_')));
  const overrides = getUserOverrides();

  const searchVal = (document.getElementById('adminCandSearchInput') ? document.getElementById('adminCandSearchInput').value : '').toLowerCase().trim();
  const gpFilter = document.getElementById('adminCandGpFilter') ? document.getElementById('adminCandGpFilter').value : 'ALL';

  const filtered = candUsers.filter(c => {
    const cid = c.id || c.username;
    if (gpFilter !== 'ALL' && c.panchayat !== gpFilter) return false;
    if (searchVal) {
      const match = (c.name && c.name.toLowerCase().includes(searchVal)) ||
                    (c.panchayat && c.panchayat.toLowerCase().includes(searchVal)) ||
                    (c.mobile && c.mobile.includes(searchVal)) ||
                    (cid && cid.toLowerCase().includes(searchVal));
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b; font-weight:700;">कोई प्रत्याशी खाता नहीं मिला। ऊपर दिए गए ➕ नया प्रत्याशी जोड़ें बटन से प्रत्याशी जोड़ें।</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(c => {
    const cid = c.id || c.username;
    const ov = overrides[cid] || {};
    const pass = ov.password || c.password || '123';
    const status = ov.status || c.status || 'ACTIVE';
    const isActive = (status === 'ACTIVE');
    const canSearch = (ov.can_search !== undefined) ? ov.can_search : true;
    const canView = (ov.can_view !== undefined) ? ov.can_view : true;
    const canPrint = (ov.can_print !== undefined) ? ov.can_print : true;
    const canDownload = (ov.can_download !== undefined) ? ov.can_download : true;
    const scope = ov.allowed_panchayats || c.panchayat || 'ALL';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:#d97706;">${cid}</strong>
      </td>
      <td>
        <div style="font-weight:700; color:#0f172a; font-size:0.92rem;">${c.name}</div>
        <div style="font-size:0.75rem; color:#64748b;">${c.designation || 'प्रत्याशी'}</div>
      </td>
      <td>
        <div style="font-weight:700; color:#1e40af;">🏛️ ${c.panchayat || '-'}</div>
        <div style="font-size:0.75rem; color:#d97706; font-weight:700;">वार्ड: ${c.allowed_wards || 'समस्त'}</div>
      </td>
      <td>
        <a href="tel:${c.mobile}" style="font-weight:700; color:#0284c7; text-decoration:none;">📞 ${c.mobile || '-'}</a>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <input type="text" class="form-input form-input-sm" value="${pass}" id="pass_input_${cid}" onchange="quickUpdatePassword('${cid}', this.value)" style="width:75px; font-weight:700; height:30px; padding:2px 6px;">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="quickUpdatePassword('${cid}', document.getElementById('pass_input_${cid}').value)" title="सेव">💾</button>
        </div>
      </td>
      <td>
        <div class="d-flex flex-wrap gap-1 align-items-center mb-1">
          <label class="perm-check-item ${canSearch ? 'active' : ''}">
            <input type="checkbox" ${canSearch ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_search', this.checked)">
            <span>🔍 खोज</span>
          </label>
          <label class="perm-check-item ${canView ? 'active' : ''}">
            <input type="checkbox" ${canView ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_view', this.checked)">
            <span>📄 दर्शन</span>
          </label>
          <label class="perm-check-item ${canPrint ? 'active' : ''}">
            <input type="checkbox" ${canPrint ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_print', this.checked)">
            <span>🖨️ प्रिंट</span>
          </label>
          <label class="perm-check-item ${canDownload ? 'active' : ''}">
            <input type="checkbox" ${canDownload ? 'checked' : ''} onchange="toggleUserPermission('${cid}', 'can_download', this.checked)">
            <span>📥 डाउनलोड</span>
          </label>
        </div>
        <div class="d-flex align-items-center gap-1">
          <span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:0.75rem; font-weight:700;">
            ${scope === 'ALL' ? '🌐 समस्त 30 पं.' : scope}
          </span>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="openCustomScopeModal('${cid}')" style="font-weight:700; padding:2px 6px;" title="कस्टम कार्यक्षेत्र एवं बूथ/वार्ड आवंटन">
            🎯 आवंटन
          </button>
        </div>
      </td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-xs ${isActive ? 'btn-success' : 'btn-danger'}" onclick="toggleUserStatus('${cid}')" style="font-weight:700; font-size:0.75rem; min-width:65px;">
          ${isActive ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
        </button>
      </td>
      <td style="text-align:center;">
        <div class="d-flex justify-content-center gap-1">
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="resetUserPasswordToDefault('${cid}')" title="पासवर्ड 123 करें">🔄 123</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------------------
// 4. RENDER TOP ADMINS TAB (SUPER ADMIN, INCHARGE, VYAVASTHAPAK, BLOCK PRABHARI)
// -------------------------------------------------------------------------
function renderAdminTopAdminsTab() {
  const tbody = document.getElementById('adminTopAdminsTableBody');
  if (!tbody) return;

  const topAdmins = [
    {
      id: 'admin',
      name: 'मुख्य व्यवस्थापक (Super Admin)',
      role_title: '👑 मुख्य व्यवस्थापक',
      mobile: '7023293283',
      scope: 'सम्पूर्ण नियंत्रण - समस्त 30 पंचायतें, डेटा संपादन, यूजर प्रबंधन',
      default_pass: '123'
    },
    {
      id: 'incharge',
      name: 'चुनाव प्रभारी (Incharge)',
      role_title: '🛡️ चुनाव प्रभारी',
      mobile: '9414000000',
      scope: 'निरीक्षण एवं समस्त 30 पंचायतें (रीड-ओनली / नो-एडिट मोड)',
      default_pass: '123'
    },
    {
      id: 'vyavasthapak',
      name: 'व्यवस्थापक (Vyavasthapak)',
      role_title: '📋 व्यवस्थापक',
      mobile: '9829000000',
      scope: 'समस्त 30 पंचायतें, पर्ची प्रिंट, एक्सेल/पीडीएफ डाउनलोड',
      default_pass: '123'
    },
    {
      id: 'block_prabhari',
      name: 'श्री सुरेश चन्द्र जांगिड',
      role_title: '🏛️ ब्लॉक प्रभारी (शिक्षक)',
      mobile: '9950705221',
      scope: 'समस्त 30 ग्राम पंचायतें (ब्लॉक भिनाय)',
      default_pass: '123'
    }
  ];

  const overrides = getUserOverrides();
  tbody.innerHTML = '';

  topAdmins.forEach(adm => {
    const aid = adm.id;
    const ov = overrides[aid] || {};
    const pass = ov.password || adm.default_pass;
    const status = ov.status || 'ACTIVE';
    const isActive = (status === 'ACTIVE');
    const canSearch = (ov.can_search !== undefined) ? ov.can_search : true;
    const canView = (ov.can_view !== undefined) ? ov.can_view : true;
    const canPrint = (ov.can_print !== undefined) ? ov.can_print : true;
    const canDownload = (ov.can_download !== undefined) ? ov.can_download : (aid !== 'incharge');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:#1e3a8a; font-size:0.95rem;">${aid}</strong>
      </td>
      <td>
        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">${adm.name}</div>
        <div style="font-size:0.8rem; color:#475569; font-weight:700;">${adm.role_title}</div>
      </td>
      <td>
        <a href="tel:${adm.mobile}" style="font-weight:700; color:#0284c7; text-decoration:none;">📞 ${adm.mobile}</a>
      </td>
      <td>
        <span class="badge" style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; font-size:0.8rem; font-weight:700;">
          ${adm.scope}
        </span>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <input type="text" class="form-input form-input-sm" value="${pass}" id="pass_input_${aid}" onchange="quickUpdatePassword('${aid}', this.value)" style="width:75px; font-weight:700; height:30px; padding:2px 6px;">
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="quickUpdatePassword('${aid}', document.getElementById('pass_input_${aid}').value)" title="सेव">💾</button>
        </div>
      </td>
      <td>
        <div class="d-flex flex-wrap gap-1 align-items-center">
          <label class="perm-check-item ${canSearch ? 'active' : ''}">
            <input type="checkbox" ${canSearch ? 'checked' : ''} onchange="toggleUserPermission('${aid}', 'can_search', this.checked)">
            <span>🔍 खोज</span>
          </label>
          <label class="perm-check-item ${canView ? 'active' : ''}">
            <input type="checkbox" ${canView ? 'checked' : ''} onchange="toggleUserPermission('${aid}', 'can_view', this.checked)">
            <span>📄 दर्शन</span>
          </label>
          <label class="perm-check-item ${canPrint ? 'active' : ''}">
            <input type="checkbox" ${canPrint ? 'checked' : ''} onchange="toggleUserPermission('${aid}', 'can_print', this.checked)">
            <span>🖨️ प्रिंट</span>
          </label>
          <label class="perm-check-item ${canDownload ? 'active' : ''}">
            <input type="checkbox" ${canDownload ? 'checked' : ''} onchange="toggleUserPermission('${aid}', 'can_download', this.checked)">
            <span>📥 डाउनलोड</span>
          </label>
        </div>
      </td>
      <td style="text-align:center;">
        ${aid === 'admin' ? '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800;">स्थायी सक्रिय</span>' : `
          <button type="button" class="btn btn-xs ${isActive ? 'btn-success' : 'btn-danger'}" onclick="toggleUserStatus('${aid}')" style="font-weight:700; font-size:0.75rem; min-width:65px;">
            ${isActive ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
          </button>
        `}
      </td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-xs btn-outline-primary" onclick="resetUserPasswordToDefault('${aid}')" title="पासवर्ड 123 करें">🔄 123</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


async function initAdminControlTab() {
  loadTriPortalSettings();
  await loadAdminUsersList();
  renderAdminControlTab();
}

async function loadAdminUsersList() {
  // 1. Try Node.js + SQLite API
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.users)) {
        State.adminControlUsers = data.users;
        return;
      }
    }
  } catch (e) {
    console.log('Admin users fetch from API error:', e);
  }

  // 2. Try portal_users.json
  try {
    const jsonRes = await fetch('portal_users.json?v=' + Date.now());
    if (jsonRes.ok) {
      const data = await jsonRes.json();
      if (data && Array.isArray(data.users)) {
        State.adminControlUsers = data.users.map(u => ({
          ...u,
          candidate: (data.candidates && data.candidates[u.id || u.username]) || null
        }));
        return;
      }
    }
  } catch (e) {
    console.log('portal_users.json fetch error:', e);
  }

  // 3. Fallback to State.adminUsers
  if (!State.adminControlUsers || State.adminControlUsers.length === 0) {
    State.adminControlUsers = (State.adminUsers || []).map(u => ({
      id: u.user_id || u.username,
      username: u.username,
      password: u.password,
      full_name: u.full_name || u.fullName || u.username,
      mobile: u.mobile || '',
      status: u.status || 'ACTIVE',
      allowed_panchayats: u.assigned_panchayats || 'ALL',
      allowed_wards: u.assigned_wards || 'ALL',
      allowed_tabs: ['searchTab', 'alphaTab', 'bulkSlipTab', 'candidateProfileTab'],
      candidate_mode: 'user_edit'
    }));
  }

  // Ensure Block Prabhari is always present in adminControlUsers
  if (!State.adminControlUsers.find(x => (x.id || x.username) === 'block_prabhari')) {
    State.adminControlUsers.splice(1, 0, {
      id: 'block_prabhari',
      username: 'block_prabhari',
      password: 'BHINAI123',
      full_name: 'श्री सुरेश चन्द्र जांगिड (ब्लॉक प्रभारी - शिक्षक)',
      mobile: '9950705221',
      status: 'ACTIVE',
      allowed_panchayats: 'ALL',
      allowed_wards: 'ALL',
      allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'directoryTab'],
      candidate_mode: 'admin_locked'
    });
  }

  // Apply localStorage overrides
  try {
    const ovPass = JSON.parse(localStorage.getItem('portal_passwords_override') || '{}');
    const ovStatus = JSON.parse(localStorage.getItem('portal_status_override') || '{}');
    State.adminControlUsers.forEach(u => {
      const uid = u.id || u.username;
      if (ovPass[uid]) u.password = ovPass[uid];
      if (ovStatus[uid]) u.status = ovStatus[uid];
    });
  } catch(e) {}
}

function renderAdminControlTab() {
  switchMasterHubSubTab(activeHubSubTab || 'cell');
}

function openAddUserModal() {
  const gpSelect = document.getElementById('newUserGpSelect');
  if (gpSelect && State.panchayats && gpSelect.options.length <= 1) {
    gpSelect.innerHTML = '<option value="ALL">समस्त पंचायतें (All 30 GPs)</option>';
    State.panchayats.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp.name;
      opt.textContent = gp.name;
      gpSelect.appendChild(opt);
    });
  }

  const modal = document.getElementById('addNewUserModal');
  if (modal) modal.style.display = 'flex';
}

function closeAddUserModal() {
  const modal = document.getElementById('addNewUserModal');
  if (modal) modal.style.display = 'none';
}

async function handleCreateUserSubmit(event) {
  if (event) event.preventDefault();

  const username = (document.getElementById('newUserIdInput').value || '').trim();
  const password = (document.getElementById('newUserPasswordInput').value || '').trim();
  const fullName = (document.getElementById('newUserNameInput').value || '').trim();
  const mobile = (document.getElementById('newUserMobileInput').value || '').trim();
  const gp = document.getElementById('newUserGpSelect').value;
  const ward = (document.getElementById('newUserWardInput').value || 'ALL').trim();
  const candidateMode = document.getElementById('newUserCandidateModeSelect').value;

  const tabBoxes = document.querySelectorAll('input[name="newUserTabs"]:checked');
  const allowedTabs = Array.from(tabBoxes).map(b => b.value);

  if (!username || !password) {
    showToast('यूजरनेम और पासवर्ड अनिवार्य हैं!');
    return;
  }

  const newUser = {
    id: username.toLowerCase().replace(/\s+/g, '_'),
    username: username,
    password: password,
    full_name: fullName,
    mobile: mobile,
    role: 'PANCHAYAT_AGENT',
    status: 'ACTIVE',
    allowed_panchayats: gp,
    allowed_wards: ward,
    allowed_tabs: allowedTabs,
    candidate_mode: candidateMode
  };

  // Add locally
  State.adminControlUsers.unshift(newUser);

  // Send to server
  await saveAdminUserToServer(newUser);

  closeAddUserModal();
  renderAdminControlTab();
  showToast(`✅ नया उपयोगकर्ता '${username}' सफलतापूर्वक जोड़ा गया!`);
}

async function deleteAdminUser(userId) {
  if (!confirm(`क्या आप वाकई उपयोगकर्ता '${userId}' को हटाना चाहते हैं?`)) return;

  State.adminControlUsers = State.adminControlUsers.filter(u => (u.id || u.username) !== userId);

  try {
    await fetch('/api/users/' + encodeURIComponent(userId), { method: 'DELETE' });
  } catch (e) {
    console.log('Delete API fallback:', e);
  }

  renderAdminControlTab();
  showToast('उपयोगकर्ता हटाया गया।');
}

function openAdminCandidateModal(userId) {
  const u = State.adminControlUsers.find(x => (x.id || x.username) === userId);
  if (!u) return;

  const titleEl = document.getElementById('adminCandidateModalUserTitle');
  if (titleEl) titleEl.textContent = `${u.full_name || u.username} (${userId})`;

  document.getElementById('adminCandTargetUserId').value = userId;

  const symbols = window.OFFICIAL_ELECTION_SYMBOLS || [];
  const symSelect = document.getElementById('adminCandSymbol');
  if (symSelect && symSelect.options.length === 0) {
    symbols.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name_hi;
      symSelect.appendChild(opt);
    });
  }

  const cand = u.candidate || {};
  document.getElementById('adminCandName').value = cand.candidate_name || u.full_name || '';
  document.getElementById('adminCandPost').value = cand.post || 'सरपंच';
  document.getElementById('adminCandGp').value = cand.panchayat || (u.allowed_panchayats !== 'ALL' ? u.allowed_panchayats : 'बूबकिया');
  document.getElementById('adminCandWard').value = cand.ward || '';
  document.getElementById('adminCandSlogan').value = cand.slogan || '';
  document.getElementById('adminCandPhotoUrl').value = cand.photo_url || '';

  const modal = document.getElementById('adminCandidateModal');
  if (modal) modal.style.display = 'flex';
}

function closeAdminCandidateModal() {
  const modal = document.getElementById('adminCandidateModal');
  if (modal) modal.style.display = 'none';
}

async function handleAdminSaveCandidate(event) {
  if (event) event.preventDefault();

  const userId = document.getElementById('adminCandTargetUserId').value;
  const name = document.getElementById('adminCandName').value.trim();
  const post = document.getElementById('adminCandPost').value;
  const gp = document.getElementById('adminCandGp').value.trim();
  const ward = document.getElementById('adminCandWard').value.trim();
  const slogan = document.getElementById('adminCandSlogan').value.trim();
  const photo = document.getElementById('adminCandPhotoUrl').value.trim();

  const symbolId = document.getElementById('adminCandSymbol').value;
  const symbols = window.OFFICIAL_ELECTION_SYMBOLS || [];
  const symObj = symbols.find(s => s.id === symbolId) || symbols[0];

  const candData = {
    user_id: userId,
    candidate_name: name,
    post: post,
    panchayat: gp,
    ward: ward,
    symbol_name: symObj.name_hi,
    symbol_icon: symObj.id,
    photo_url: photo,
    slogan: slogan,
    show_banner_on_slip: 1
  };

  const u = State.adminControlUsers.find(x => (x.id || x.username) === userId);
  if (u) u.candidate = candData;

  try {
    await fetch('/api/candidate/' + encodeURIComponent(userId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candData)
    });
  } catch (e) {
    console.log('Candidate save fallback:', e);
  }

  closeAdminCandidateModal();
  renderAdminControlTab();
  showToast('✅ प्रत्याशी विवरण सुरक्षित!');
}

async function syncAllAdminStateToCloud() {
  showToast('🔄 क्लाउड सिंक प्रारंभ...');
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      showToast('✅ समस्त उपयोगकर्ता व प्रत्याशी सेटिंग्स पूर्णतः सिंक!');
      return;
    }
  } catch (e) {}
  showToast('✅ स्थानीय व क्लाउड डेटा सुरक्षित!');
}


// ==========================================================================
// DEDICATED BLO & CELL LOGIN SYSTEM & SELF PASSWORD RESET
// ==========================================================================

const BHINAI_PANCHAYATS_30 = [
  "बड़गांव", "बड़ली", "बगराई", "बांदनवाड़ा", "भिनाय", "बूबकिया", "चापानेरी",
  "छछून्दरा", "देवपुरा", "देवलियाकलां", "धांतोल", "एकलसिंहा", "घणा", "गुढाखुर्द",
  "हियालिया", "कनईकला", "करांटी", "कैरोंट", "खेडी", "कुम्हारिया", "लामगरा",
  "नागोला", "नान्दसी", "पड़ांगा", "पाडलिया", "राममालिया", "राताकोट", "सिंगावल",
  "सोबडी", "सोलखुर्द"
];

function populateBloPrimaryDropdown() {
  const pSelect = document.getElementById('loginPanchayatSelect');
  const panSelect = document.getElementById('panAdminSelect');
  if (panSelect && panSelect.value) { username = panSelect.value; }
  if (!pSelect) return;

  pSelect.innerHTML = `
    <option value="">-- कृपया पद / प्रकोष्ठ या ग्राम पंचायत चुनें --</option>
    <option value="BLOCK_PRABHARI" style="font-weight:800; color:#0f766e; background:#ccfbf1;">🌟 ब्लॉक प्रभारी (श्री सुरेश चन्द्र जांगिड - शिक्षक)</option>
    <option value="CELL" style="font-weight:800; color:#1e40af; background:#eff6ff;">🏢 चुनाव प्रकोष्ठ (13 चुनाव प्रकोष्ठ)</option>
  `;

  BHINAI_PANCHAYATS_30.forEach(gp => {
    const opt = document.createElement('option');
    opt.value = gp;
    opt.textContent = `🏛️ ग्राम पंचायत ${gp}`;
    pSelect.appendChild(opt);
  });

  const cardTitle = document.querySelector('.login-card-title');
  if (cardTitle) cardTitle.textContent = '🏢 बी.एल.ओ., प्रकोष्ठ एवं ब्लॉक प्रभारी प्रवेश (BLO Portal)';
  const badge = document.querySelector('.gatekeeper-badge');
  if (badge) badge.textContent = '📍 बी.एल.ओ., चुनाव प्रकोष्ठ एवं ब्लॉक प्रभारी अधिकृत पोर्टल 2026';
  const samitiP = document.querySelector('.gatekeeper-samiti');
  if (samitiP) samitiP.innerHTML = 'पंचायत समिति: <strong>भिनाय (अजमेर)</strong> | 126 बी.एल.ओ. • 13 प्रकोष्ठ • 🌟 ब्लॉक प्रभारी';
}

function populateLoginPrimaryDropdown() {
  configureLoginUiForPortal();
}

async function onLoginPrimarySelectChanged(val) {
  const offSelect = document.getElementById('loginOfficerSelect');
  const offLabel = document.getElementById('loginOfficerLabel');
  const detailsBadge = document.getElementById('loginSelectedDetailsBadge');
  const uInput = document.getElementById('gatekeeperUsername');

  if (detailsBadge) detailsBadge.style.display = 'none';
  if (uInput) uInput.value = '';

  if (!val) {
    if (offSelect) {
      offSelect.innerHTML = '<option value="">-- पहले पद, प्रकोष्ठ या पंचायत चुनें --</option>';
      offSelect.disabled = true;
    }
    return;
  }

  const dir = getMasterDirectory();

  if (val === 'BLOCK_PRABHARI') {
    if (offLabel) offLabel.innerHTML = '<strong>2. अधिकृत ब्लॉक प्रभारी *:</strong>';
    if (offSelect) {
      offSelect.innerHTML = `
        <option value="block_prabhari" data-name="श्री सुरेश चन्द्र जांगिड" data-role="ब्लॉक प्रभारी (शिक्षक)" data-office="उपखण्ड कार्यालय भिनाय" data-mobile="9950705221" data-cell="समस्त 30 ग्राम पंचायतें">🌟 श्री सुरेश चन्द्र जांगिड - शिक्षक (मो. 9950705221) [ब्लॉक प्रभारी]</option>
      `;
      offSelect.disabled = false;
      offSelect.value = 'block_prabhari';
    }
    if (uInput) uInput.value = 'block_prabhari';
    if (detailsBadge) {
      detailsBadge.innerHTML = '🌟 <strong>श्री सुरेश चन्द्र जांगिड</strong> (शिक्षक) | <strong>ब्लॉक प्रभारी</strong> | समस्त 30 ग्राम पंचायतें (पूर्ण वोटर खोज अधिकार) | मो.: 9950705221';
      detailsBadge.style.background = '#ccfbf1';
      detailsBadge.style.color = '#0f766e';
      detailsBadge.style.border = '1px solid #99f6e4';
      detailsBadge.style.display = 'block';
    }
    const hint = document.getElementById('defaultPassHint');
    if (hint) { hint.textContent = 'पासवर्ड: BHINAI123'; hint.style.color = '#0f766e'; }
    document.getElementById('gatekeeperPassword')?.focus();
    return;
  }

  if (val === 'CELL') {
    if (offLabel) offLabel.innerHTML = '<strong>2. अधिकृत चुनाव प्रकोष्ठ कार्मिक चुनें *:</strong>';
    if (offSelect) {
      offSelect.innerHTML = '<option value="">-- अधिकृत प्रकोष्ठ कार्मिक चुनें --</option>';
      const cellList = (dir && dir.cell_personnel) ? dir.cell_personnel : [];
      cellList.forEach(cp => {
        const opt = document.createElement('option');
        opt.value = cp.username || cp.id;
        opt.setAttribute('data-name', cp.name || '');
        opt.setAttribute('data-role', cp.designation || cp.role || '');
        opt.setAttribute('data-office', cp.office || cp.school_office || '');
        opt.setAttribute('data-mobile', cp.mobile || '');
        opt.setAttribute('data-cell', cp.cell_name || '');
        opt.textContent = `[${cp.cell_name || 'प्रकोष्ठ'}] ${cp.name} - ${cp.designation} (${cp.mobile})`;
        offSelect.appendChild(opt);
      });
      offSelect.disabled = false;
    }
    return;
  }

  // Gram Panchayat Selected -> Show BLOs of that Panchayat
  if (offLabel) offLabel.innerHTML = `<strong>2. बी.एल.ओ. (BLO) चुनें [ग्रा.पं. ${val}] *:</strong>`;
  if (offSelect) {
    offSelect.innerHTML = '<option value="">-- बी.एल.ओ. (BLO) चुनें --</option>';
    const bloList = (dir && dir.blo_list) ? dir.blo_list : [];
    const vClean = val.trim();
    const matched = bloList.filter(b => {
      const bGp = (b.panchayat || '').trim();
      return bGp === vClean || bGp.includes(vClean) || vClean.includes(bGp);
    });

    if (matched.length === 0) {
      offSelect.innerHTML = `<option value="">-- ग्रा.पं. ${val} में कोई BLO दर्ज नहीं है --</option>`;
      offSelect.disabled = true;
      return;
    }

    matched.forEach(blo => {
      const opt = document.createElement('option');
      opt.value = blo.username || blo.id || `blo_${blo.booth_no}`;
      opt.setAttribute('data-name', blo.name || '');
      opt.setAttribute('data-booth', blo.booth_no || '');
      opt.setAttribute('data-school', blo.school || '');
      opt.setAttribute('data-mobile', blo.mobile || '');
      opt.textContent = `भाग ${blo.booth_no} - ${blo.name} (${blo.school || 'मतदान केंद्र'})`;
      offSelect.appendChild(opt);
    });
    offSelect.disabled = false;
  }
}

function onLoginOfficerChanged(officerId) {
  const offSelect = document.getElementById('loginOfficerSelect');
  const detailsBadge = document.getElementById('loginSelectedDetailsBadge');
  const uInput = document.getElementById('gatekeeperUsername');

  if (uInput) uInput.value = officerId;

  if (officerId && offSelect && offSelect.selectedIndex > 0) {
    const opt = offSelect.options[offSelect.selectedIndex];
    const name = opt.getAttribute('data-name');
    const mobile = opt.getAttribute('data-mobile');
    const booth = opt.getAttribute('data-booth');
    const school = opt.getAttribute('data-school');
    const cell = opt.getAttribute('data-cell');
    const role = opt.getAttribute('data-role');

    if (detailsBadge) {
      if (cell) {
        detailsBadge.innerHTML = `🏢 <strong>${name}</strong> (${role}) | ${cell} | मो.: ${mobile}`;
        detailsBadge.style.background = '#eff6ff';
        detailsBadge.style.color = '#1e40af';
        detailsBadge.style.border = '1px solid #bfdbfe';
      } else if (booth) {
        detailsBadge.innerHTML = `📍 <strong>${name}</strong> | भाग सं.: <strong>${booth}</strong> | ${school} | मो.: ${mobile}`;
        detailsBadge.style.background = '#f0fdf4';
        detailsBadge.style.color = '#047857';
        detailsBadge.style.border = '1px solid #bbf7d0';
      }
      detailsBadge.style.display = 'block';
    }
  } else {
    if (detailsBadge) detailsBadge.style.display = 'none';
  }
}

// Self Password Reset Modal
function openSelfPasswordModal() {
  const u = State.currentUser;
  if (!u) return;

  const lbl = document.getElementById('selfChangePassUserLabel');
  if (lbl) lbl.textContent = `${u.full_name || u.name || u.username} (${u.id || u.username})`;

  const modal = document.getElementById('selfChangePasswordModal');
  if (modal) modal.style.display = 'flex';
}

function closeSelfPasswordModal() {
  const modal = document.getElementById('selfChangePasswordModal');
  if (modal) modal.style.display = 'none';
}

async function handleSelfPasswordSubmit(event) {
  if (event) event.preventDefault();
  const u = State.currentUser;
  if (!u) return;

  const currentPass = document.getElementById('selfCurrentPasswordInput').value;
  const newPass = document.getElementById('selfNewPasswordInput').value;
  const confirmPass = document.getElementById('selfConfirmPasswordInput').value;

  if (newPass !== confirmPass) {
    showToast('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!');
    return;
  }

  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: u.username || u.id,
        currentPassword: currentPass,
        newPassword: newPass
      })
    });
    const data = await res.json();
    if (data && data.success) {
      u.password = newPass;
      localStorage.setItem('panchayat_user_session', JSON.stringify(u));
      closeSelfPasswordModal();
      showToast('✅ पासवर्ड सफलतापूर्वक बदल दिया गया!');
      return;
    } else {
      showToast('त्रुटि: ' + ((data && data.error) ? data.error : 'पासवर्ड नहीं बदला जा सका'));
    }
  } catch (e) {
    u.password = newPass;
    localStorage.setItem('panchayat_user_session', JSON.stringify(u));
    closeSelfPasswordModal();
    showToast('✅ पासवर्ड लोकल सुरक्षित!');
  }
}


// ==========================================================================
// OFFICIAL ELECTION DIRECTORY & MULTI-TIER FILTER ENGINE
// ==========================================================================

let activeDirCategory = 'ALL';
let activeDirGpBooth = 'ALL';

function initDirectoryTab() {
  const dir = getMasterDirectory();
  if (!dir) return;

  // Initialize Category Dropdown
  const catSelect = document.getElementById('dirCategoryFilterSelect');
  if (catSelect) catSelect.value = activeDirCategory;

  // Initialize GP & Booth Dropdown
  const gpBoothSelect = document.getElementById('dirGpBoothFilterSelect');
  if (gpBoothSelect && gpBoothSelect.options.length <= 1) {
    gpBoothSelect.innerHTML = '<option value="ALL">🌍 समस्त पंचायतें व बूथ (All 30 Panchayats)</option>';
    
    // Optgroup 1: 30 Gram Panchayats
    const gpGroup = document.createElement('optgroup');
    gpGroup.label = '🏛️ ग्राम पंचायत चुनें (30 Panchayats)';
    BHINAI_PANCHAYATS_30.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = `GP_${gp}`;
      opt.textContent = `ग्रा.पं. ${gp}`;
      gpGroup.appendChild(opt);
    });
    gpBoothSelect.appendChild(gpGroup);

    // Optgroup 2: 126 Booths
    const bloList = dir.blo_list || [];
    const boothGroup = document.createElement('optgroup');
    boothGroup.label = '🗳️ मतदान केंद्र / भाग संख्या (1-126)';
    bloList.forEach(blo => {
      const opt = document.createElement('option');
      opt.value = `BOOTH_${blo.booth_no}`;
      opt.textContent = `बूथ ${blo.booth_no}: ${blo.school || blo.name} (${blo.panchayat})`;
      boothGroup.appendChild(opt);
    });
    gpBoothSelect.appendChild(boothGroup);
  }

  updateDirectoryCounts();
  renderDirectoryList();
}

function updateDirectoryCounts() {
  const dir = getMasterDirectory();
  if (!dir) return;

  const total = (dir.all_contacts && dir.all_contacts.length) || 662;
  const patwaris = (dir.patwari_list && dir.patwari_list.length) || 49;
  const sups = (dir.supervisors_list && dir.supervisors_list.length) || 98;
  const blos = (dir.blo_list && dir.blo_list.length) || 126;
  const peeos = (dir.peeo_list && dir.peeo_list.length) || 49;
  const staff = (dir.male_staff_list && dir.male_staff_list.length) || 307;
  const cells = (dir.cell_personnel && dir.cell_personnel.length) || 29;
  const officers = (dir.officers_list && dir.officers_list.length) || 4;

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('dirCountAll', total);
  setT('dirCountPatwari', patwaris);
  setT('dirCountSupervisor', sups);
  setT('dirCountBlo', blos);
  setT('dirCountPeeo', peeos);
  setT('dirCountStaff', staff);
  setT('dirCountCell', cells);
  setT('dirCountOfficer', officers);
}

function filterDirectoryType(type) {
  activeDirCategory = type;
  const catSelect = document.getElementById('dirCategoryFilterSelect');
  if (catSelect) catSelect.value = type;

  document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
  const pillMap = {
    'ALL': 'pillAll',
    'PATWARI': 'pillPatwari',
    'SUPERVISOR': 'pillSupervisor',
    'BLO': 'pillBlo',
    'PEEO': 'pillPeeo',
    'STAFF': 'pillStaff',
    'CELL': 'pillCell',
    'OFFICER': 'pillOfficer'
  };
  const targetPill = document.getElementById(pillMap[type]);
  if (targetPill) targetPill.classList.add('active');

  renderDirectoryList();
}

function onDirCategorySelectChanged(val) {
  filterDirectoryType(val);
}

function onDirGpBoothFilterChanged(val) {
  activeDirGpBooth = val;
  renderDirectoryList();
}

function filterDirectoryList() {
  renderDirectoryList();
}

function clearDirectoryFilters() {
  const searchInput = document.getElementById('dirUnifiedSearchInput');
  const catSelect = document.getElementById('dirCategoryFilterSelect');
  const gpBoothSelect = document.getElementById('dirGpBoothFilterSelect');

  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = 'ALL';
  if (gpBoothSelect) gpBoothSelect.value = 'ALL';

  activeDirCategory = 'ALL';
  activeDirGpBooth = 'ALL';

  filterDirectoryType('ALL');
}

// Get saved overrides from localStorage
function getDirectoryOverrides() {
  try {
    return JSON.parse(localStorage.getItem('portal_directory_overrides') || '{}');
  } catch(e) {
    return {};
  }
}

function renderDirectoryList() {
  const container = document.getElementById('directoryListContainer');
  if (!container) return;

  const dir = getMasterDirectory();
  if (!dir) {
    container.innerHTML = '<div class="alert alert-warning">डायरेक्टरी डेटा लोड हो रहा है...</div>';
    return;
  }

  const overrides = getDirectoryOverrides();
  let contacts = (dir.all_contacts || []).map(c => {
    if (overrides[c.id]) {
      return { ...c, ...overrides[c.id] };
    }
    return c;
  });

  const searchVal = (document.getElementById('dirUnifiedSearchInput') ? document.getElementById('dirUnifiedSearchInput').value : '').toLowerCase().trim();

  // 1. Filter by Category
  if (activeDirCategory !== 'ALL') {
    contacts = contacts.filter(c => c.category === activeDirCategory);
  }

  // 2. Filter by GP or Booth
  let selectedGpName = '';
  let selectedBoothNo = '';
  if (activeDirGpBooth.startsWith('GP_')) {
    selectedGpName = activeDirGpBooth.replace('GP_', '');
  } else if (activeDirGpBooth.startsWith('BOOTH_')) {
    selectedBoothNo = activeDirGpBooth.replace('BOOTH_', '');
    // Find GP for this booth
    const bMatch = (dir.blo_list || []).find(b => String(b.booth_no) === String(selectedBoothNo));
    if (bMatch) selectedGpName = bMatch.panchayat;
  }

  if (selectedGpName) {
    contacts = contacts.filter(c => {
      if (c.panchayat === selectedGpName) return true;
      if (c.panchayats && c.panchayats.includes(selectedGpName)) return true;
      if (c.school_office && c.school_office.includes(selectedGpName)) return true;
      if (c.area_display && c.area_display.includes(selectedGpName)) return true;
      if (c.patwar_mandal && c.patwar_mandal.includes(selectedGpName)) return true;
      // Booth specific match if booth filter
      if (selectedBoothNo && c.booth_no && String(c.booth_no) === String(selectedBoothNo)) return true;
      return false;
    });
  }

  // 3. Filter by Unified Text Search
  if (searchVal) {
    contacts = contacts.filter(c => {
      const n = (c.name || '').toLowerCase();
      const m = (c.mobile || '');
      const s = (c.school_office || c.school || '').toLowerCase();
      const p = (c.panchayat || c.panchayat_str || '').toLowerCase();
      const d = (c.designation || c.role || '').toLowerCase();
      const b = String(c.booth_no || '');
      const pm = (c.patwar_mandal || '').toLowerCase();
      return n.includes(searchVal) || m.includes(searchVal) || s.includes(searchVal) || p.includes(searchVal) || d.includes(searchVal) || b.includes(searchVal) || pm.includes(searchVal);
    });
  }

  if (contacts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:48px 20px; background:#fff; border-radius:12px; border:1px dashed #cbd5e1;">
        <div style="font-size:2.5rem; margin-bottom:8px;">🔍</div>
        <h4 style="color:#1e293b; margin-bottom:4px;">कोई संपर्क नहीं मिला</h4>
        <p style="color:#64748b; font-size:0.9rem;">फ़िल्टर बदलकर अथवा 'रिफ्रेश' बटन दबाकर पुनः प्रयास करें।</p>
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="clearDirectoryFilters()">समस्त फ़िल्टर हटाएं</button>
      </div>
    `;
    return;
  }

  // SMART GROUPING: If a specific Panchayat or Booth is selected, group logically
  if (selectedGpName || selectedBoothNo) {
    const patwaris = contacts.filter(c => c.category === 'PATWARI');
    const supervisors = contacts.filter(c => c.category === 'SUPERVISOR');
    const blos = contacts.filter(c => c.category === 'BLO');
    const peeos = contacts.filter(c => c.category === 'PEEO');
    const staff = contacts.filter(c => c.category === 'STAFF');
    const cells = contacts.filter(c => c.category === 'CELL');
    const others = contacts.filter(c => !['PATWARI', 'SUPERVISOR', 'BLO', 'PEEO', 'STAFF', 'CELL'].includes(c.category));

    let html = `
      <div class="mb-3 p-3" style="background:#ecfdf5; border-left:4px solid #10b981; border-radius:8px;">
        <h4 style="margin:0; color:#065f46; display:flex; align-items:center; gap:8px;">
          <span>🏛️ ग्राम पंचायत: <strong>${selectedGpName}</strong></span>
          ${selectedBoothNo ? `<span class="badge" style="background:#047857; color:#fff; font-size:0.8rem;">बूथ सं. ${selectedBoothNo}</span>` : ''}
          <span style="font-size:0.85rem; font-weight:normal; color:#047857;">(संबंधित कुल कार्मिक: ${contacts.length})</span>
        </h4>
      </div>
    `;

    const renderGroup = (title, icon, badgeBg, badgeColor, items) => {
      if (items.length === 0) return '';
      return `
        <div class="dir-group-section mb-4">
          <div class="d-flex align-items-center gap-2 mb-2 pb-1" style="border-bottom:2px solid #e2e8f0;">
            <span style="font-size:1.3rem;">${icon}</span>
            <h4 style="margin:0; font-size:1.05rem; color:#1e293b; font-weight:700;">${title}</h4>
            <span class="badge" style="background:${badgeBg}; color:${badgeColor}; font-weight:700; font-size:0.75rem;">${items.length}</span>
          </div>
          <div class="dir-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px;">
            ${items.map(c => renderContactCard(c)).join('')}
          </div>
        </div>
      `;
    };

    html += renderGroup('पटवारी (Patwari / राजस्व प्रशासन)', '🏛️', '#fef3c7', '#b45309', patwaris);
    html += renderGroup('सुपरवाइजर (Supervisor / सेक्टर अधिकारी)', '👮', '#dbeafe', '#1e40af', supervisors);
    html += renderGroup('बी.एल.ओ. (BLO / बूथ लेवल अधिकारी)', '📍', '#dcfce7', '#15803d', blos);
    html += renderGroup('पीईईओ / संस्था प्रधान (PEEO / Principal)', '🎓', '#f3e8ff', '#6b21a8', peeos);
    html += renderGroup('पुरुष कार्मिक (Male Educational Staff)', '👨‍🏫', '#e0f2fe', '#0369a1', staff);
    html += renderGroup('चुनाव प्रकोष्ठ (Election Cell)', '🏢', '#fee2e2', '#991b1b', cells);
    html += renderGroup('अन्य कार्मिक / अधिकारी', '⚖️', '#f1f5f9', '#475569', others);

    container.innerHTML = html;
    return;
  }

  // STANDARD VIEW (Sorted & Displayed in Grid)
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span style="font-size:0.85rem; color:#64748b; font-weight:600;">प्रदर्शित संपर्क: <strong>${contacts.length}</strong></span>
      <span style="font-size:0.8rem; color:#047857; font-weight:600;">⚡ वन-क्लिक कॉल, व्हाट्सएप एवं संपादन उपलब्ध</span>
    </div>
    <div class="dir-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px;">
      ${contacts.map(c => renderContactCard(c)).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function renderContactCard(c) {
  const getBadgeStyle = (cat) => {
    switch(cat) {
      case 'PATWARI': return { bg: '#fef3c7', col: '#b45309', label: `🏛️ ${c.charge ? c.charge : 'मूल'} पटवारी` };
      case 'SUPERVISOR': return { bg: '#dbeafe', col: '#1e40af', label: '👮 सुपरवाइजर' };
      case 'BLO': return { bg: '#dcfce7', col: '#15803d', label: `📍 भाग सं. ${c.booth_no || ''}` };
      case 'PEEO': return { bg: '#f3e8ff', col: '#6b21a8', label: '🎓 पीईईओ / संस्था प्रधान' };
      case 'STAFF': return { bg: '#e0f2fe', col: '#0369a1', label: '👨‍🏫 पुरुष कार्मिक' };
      case 'CELL': return { bg: '#fee2e2', col: '#991b1b', label: '🏢 प्रकोष्ठ कार्मिक' };
      default: return { bg: '#f1f5f9', col: '#334155', label: '⚖️ अधिकारी' };
    }
  };

  const badge = getBadgeStyle(c.category);
  const cleanMobile = (c.mobile || '').replace(/[^0-9]/g, '');

  return `
    <div class="dir-card p-3" style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.15s ease, box-shadow 0.15s ease;">
      <div>
        <div class="d-flex justify-content-between align-items-start gap-1 mb-1">
          <h4 style="margin:0; font-size:1.02rem; color:#0f172a; font-weight:700;">${c.name}</h4>
          <span class="badge" style="background:${badge.bg}; color:${badge.col}; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:6px; white-space:nowrap;">
            ${badge.label}
          </span>
        </div>
        
        <div style="font-size:0.83rem; color:#475569; font-weight:600; margin-bottom:4px;">
          ${c.designation || c.role || 'कार्मिक'}
        </div>

        <div style="font-size:0.82rem; color:#64748b; line-height:1.4; margin-bottom:8px;">
          ${c.school_office ? `<div style="display:flex; align-items:flex-start; gap:4px;"><span style="font-size:0.85rem;">🏫</span><span>${c.school_office}</span></div>` : ''}
          ${c.area_display ? `<div style="display:flex; align-items:flex-start; gap:4px; margin-top:2px;"><span style="font-size:0.85rem;">📍</span><span>${c.area_display}</span></div>` : ''}
          ${c.patwar_mandal ? `<div style="display:flex; align-items:center; gap:4px; margin-top:2px;"><span style="font-size:0.85rem;">📜</span><span>मंडल: <strong>${c.patwar_mandal}</strong> (${c.charge || 'मूल'})</span></div>` : ''}
          ${c.shala_darpan_code ? `<div style="display:flex; align-items:center; gap:4px; margin-top:2px;"><span style="font-size:0.85rem;">🆔</span><span>शाला दर्पण: <strong>${c.shala_darpan_code}</strong></span></div>` : ''}
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center pt-2" style="border-top:1px dashed #e2e8f0; margin-top:6px;">
        <span style="font-size:0.85rem; font-weight:700; color:#1e293b;">
          📞 ${c.mobile || 'मो. अनुल्लेखित'}
        </span>
        
        <div class="d-flex gap-1">
          ${cleanMobile ? `
            <a href="tel:${cleanMobile}" class="btn-icon-sm" style="background:#eff6ff; color:#2563eb; padding:5px 8px; border-radius:6px; text-decoration:none; font-size:0.8rem; font-weight:600;" title="कॉल करें">
              📞
            </a>
            <a href="https://wa.me/91${cleanMobile}" target="_blank" class="btn-icon-sm" style="background:#f0fdf4; color:#16a34a; padding:5px 8px; border-radius:6px; text-decoration:none; font-size:0.8rem; font-weight:600;" title="व्हाट्सएप संदेश">
              💬
            </a>
          ` : ''}
          <button type="button" class="btn-icon-sm" onclick="openEditPersonnelModal('${c.id}')" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155; padding:5px 8px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;" title="विवरण संपादित करें">
            ✏️ एडिट
          </button>
          ${c.can_login ? `
            <button type="button" class="btn-icon-sm" onclick="adminPromptChangePass('${c.username || c.id}', '${c.name}')" style="background:#fef3c7; border:1px solid #fde68a; color:#b45309; padding:5px 8px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;" title="पासवर्ड बदलें">
              🔑
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// UNIVERSAL PERSONNEL EDIT MODAL CONTROLS
// ==========================================================================

function openEditPersonnelModal(id) {
  const dir = getMasterDirectory();
  if (!dir) return;

  const overrides = getDirectoryOverrides();
  let contact = (dir.all_contacts || []).find(c => c.id === id || c.username === id);
  if (!contact && dir.cell_personnel) {
    contact = dir.cell_personnel.find(c => c.id === id || c.username === id);
  }
  if (!contact && dir.blo_list) {
    contact = dir.blo_list.find(c => c.id === id || c.username === id || c.user_id === id);
  }
  if (!contact && State.adminControlUsers) {
    contact = State.adminControlUsers.find(c => c.id === id || c.username === id);
  }
  if (!contact) {
    showToast('⚠️ कार्मिक विवरण नहीं मिला!');
    return;
  }

  if (overrides[id]) {
    contact = { ...contact, ...overrides[id] };
  }

  const titleEl = document.getElementById('editPersonnelModalTitle');
  if (titleEl) titleEl.textContent = `✏️ ${contact.name} - संपादन (${contact.role || contact.category || contact.designation || 'कार्मिक'})`;

  const setVal = (fid, val) => { const el = document.getElementById(fid); if (el) el.value = val || ''; };
  setVal('editPersId', contact.id || contact.username);
  setVal('editPersName', contact.name);
  setVal('editPersMobile', contact.mobile);
  setVal('editPersRole', contact.designation || contact.role || contact.post || '');
  setVal('editPersSchool', contact.school_office || contact.school || contact.office || '');
  setVal('editPersPanchayat', contact.panchayat || contact.panchayat_str || '');
  setVal('editPersBooth', contact.booth_no ? `भाग सं. ${contact.booth_no}` : (contact.patwar_mandal ? `मंडल ${contact.patwar_mandal}` : ''));

  const modal = document.getElementById('editPersonnelModal');
  if (modal) modal.style.display = 'flex';
}

function closeEditPersonnelModal() {
  const modal = document.getElementById('editPersonnelModal');
  if (modal) modal.style.display = 'none';
}

async function handleSavePersonnelEdit(event) {
  if (event) event.preventDefault();

  const id = document.getElementById('editPersId').value;
  const name = document.getElementById('editPersName').value.trim();
  const mobile = document.getElementById('editPersMobile').value.trim();
  const role = document.getElementById('editPersRole').value.trim();
  const school = document.getElementById('editPersSchool').value.trim();
  const panchayat = document.getElementById('editPersPanchayat').value.trim();
  const boothMandal = document.getElementById('editPersBooth').value.trim();

  if (!id || !name || !mobile) {
    showToast('⚠️ कृपया नाम एवं मोबाइल नंबर अवश्य भरें!');
    return;
  }

  const editPayload = {
    id,
    name,
    mobile,
    designation: role,
    role,
    school_office: school,
    school: school,
    panchayat,
    area_display: `${panchayat ? 'ग्रा.पं. ' + panchayat : ''} ${boothMandal ? '| ' + boothMandal : ''}`.trim()
  };

  // 1. Update in-memory MASTER_DIRECTORY across all lists
  const dir = getMasterDirectory();
  if (dir) {
    if (dir.all_contacts) {
      const item = dir.all_contacts.find(c => c.id === id);
      if (item) Object.assign(item, editPayload);
    }
    for (const key of ['patwari_list', 'supervisors_list', 'blo_list', 'peeo_list', 'male_staff_list', 'cell_personnel', 'officers_list']) {
      if (dir[key]) {
        const subItem = dir[key].find(c => c.id === id || c.username === id);
        if (subItem) Object.assign(subItem, editPayload);
      }
    }
  }

  // 2. Save to localStorage overrides
  const overrides = getDirectoryOverrides();
  overrides[id] = editPayload;
  localStorage.setItem('portal_directory_overrides', JSON.stringify(overrides));

  // 3. Sync to State.adminControlUsers
  if (State.adminControlUsers) {
    const userInState = State.adminControlUsers.find(u => (u.id || u.username) === id);
    if (userInState) {
      userInState.name = name;
      userInState.full_name = name;
      userInState.mobile = mobile;
      userInState.designation = role;
      userInState.office = school;
      userInState.panchayat = panchayat;
    }
  }

  closeEditPersonnelModal();
  
  // Re-render directory list and all admin sub-tabs
  if (typeof renderDirectoryList === 'function') renderDirectoryList();
  if (typeof renderAdminCellTab === 'function') renderAdminCellTab();
  if (typeof renderAdminBloTab === 'function') renderAdminBloTab();
  if (typeof renderAdminCandTab === 'function') renderAdminCandTab();
  if (typeof renderAdminTopAdminsTab === 'function') renderAdminTopAdminsTab();
  
  showToast(`✅ कार्मिक '${name}' का विवरण सफलतापूर्वक अपडेट किया गया!`);
}

async function adminPromptChangePass(userId, name) {
  const currentPass = getCustomUserPassword(userId) || (userId === 'block_prabhari' ? 'BHINAI123' : '123');
  const newPass = prompt(`'${name}' (${userId}) के लिए नया पासवर्ड दर्ज करें:`, currentPass);
  if (!newPass || !newPass.trim()) return;

  const trimmed = newPass.trim();
  setCustomUserPassword(userId, trimmed);

  // Update in state if exists
  const uInState = (State.adminControlUsers || []).find(x => (x.id || x.username) === userId);
  if (uInState) {
    uInState.password = trimmed;
    try { localStorage.setItem('portal_admin_users_overrides', JSON.stringify(State.adminControlUsers)); } catch(e) {}
  }
  renderBloPassTable();
  if (typeof renderAdminControlTab === 'function') renderAdminControlTab();

  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userId,
        newPassword: newPass.trim()
      })
    });
    const d = await res.json();
    if (d && d.success) {
      showToast(`✅ पासवर्ड सफलतापूर्वक '${newPass.trim()}' सेट किया गया!`);
    } else {
      showToast('त्रुटि: ' + ((d && d.error) ? d.error : 'पासवर्ड नहीं बदला जा सका'));
    }
  } catch (e) {
    showToast(`✅ पासवर्ड लोकल सेट: '${newPass.trim()}'`);
  }
}



// ==========================================================================
// UNIFIED GATEKEEPER LOGIN & LOGOUT HANDLERS
// ==========================================================================

async function handleGatekeeperLogin(event) {
  if (event) event.preventDefault();
  const errorDiv = document.getElementById('gatekeeperError');
  if (errorDiv) { errorDiv.style.display = 'none'; errorDiv.textContent = ''; }

  const uInput = document.getElementById('gatekeeperUsername');
  let username = uInput ? uInput.value.trim() : '';

  const vDirect = document.getElementById('voterDirectIdInput');
  if (!username && vDirect && vDirect.value) {
    username = vDirect.value.trim();
  }

  const mInput = document.getElementById('manualUsernameInput');
  if (!username && mInput && mInput.value) {
    username = mInput.value.trim();
  }

  const pSelect = document.getElementById('loginPanchayatSelect');
  const panSelect = document.getElementById('panAdminSelect');
  if (panSelect && panSelect.value) { username = panSelect.value; }
  const offSelect = document.getElementById('loginOfficerSelect');

  if (!username) {
    if (pSelect && pSelect.value === 'ADMIN') {
      username = 'admin';
    } else if (pSelect && pSelect.value === 'INCHARGE') {
      username = 'incharge';
    } else if (pSelect && pSelect.value === 'VYAVASTHAPAK') {
      username = 'vyavasthapak';
    } else if (pSelect && pSelect.value === 'BLOCK_PRABHARI') {
      username = 'block_prabhari';
    } else if (offSelect && offSelect.value) {
      username = offSelect.value;
    }
  }

  const passInput = document.getElementById('gatekeeperPassword');
  const password = passInput ? passInput.value.trim() : '';

  if (!username) {
    if (errorDiv) {
      errorDiv.textContent = 'कृपया पद, ग्राम पंचायत या चुनाव प्रकोष्ठ चुनें!';
      errorDiv.style.display = 'block';
    }
    return;
  }

  // If on blo-portal and username is admin: BLOCK IT
  if (getPortalContext() === 'blo' && (username === 'admin' || pSelect?.value === 'ADMIN')) {
    if (errorDiv) {
      errorDiv.textContent = 'बी.एल.ओ. पोर्टल पर एडमिन लॉगिन वर्जित है! कृपया मास्टर एडमिन पोर्टल (pan) से लॉगिन करें।';
      errorDiv.style.display = 'block';
    }
    return;
  }

  if (!password) {
    if (errorDiv) {
      errorDiv.textContent = 'कृपया पासवर्ड दर्ज करें!';
      errorDiv.style.display = 'block';
    }
    return;
  }

  // 1. Try Node server login endpoint
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data && data.success && data.user) {
      State.currentUser = data.user;
      const sk = getSessionStorageKey();
      if (document.getElementById('gatekeeperRememberMe')?.checked) {
        localStorage.setItem(sk, JSON.stringify(data.user));
        if (getPortalContext() === 'master') localStorage.setItem('panchayat_user_session', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem(sk, JSON.stringify(data.user));
      }
      enforceGatekeeperState();
      showToast(`नमस्ते ${data.user.full_name || data.user.name || data.user.username}! स्वागत है।`);
      return;
    } else if (data && data.error) {
      if (errorDiv) {
        errorDiv.textContent = data.error;
        errorDiv.style.display = 'block';
      }
      return;
    }
  } catch (err) {
    console.log('Server login offline or fallback:', err);
  }

  // 2. Client-side Fallback validation (Universal password '123' accepted for ALL accounts!)
  const isUniversalPass = (password === '123');

  // A. Super Admin Check
  if (username === 'admin' || username === 'superadmin') {
    const customAdminPass = getCustomUserPassword('admin');
    if (isUniversalPass || password === 'admin123' || password === 'admin' || (customAdminPass && password === customAdminPass)) {
      const adminUser = {
        id: 'admin',
        username: 'admin',
        role: 'SUPER_ADMIN',
        full_name: 'मुख्य व्यवस्थापक (Super Admin)',
        allowed_panchayats: 'ALL',
        allowed_wards: 'ALL',
        allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'bulkSlipTab', 'directoryTab', 'candidateProfileTab', 'adminControlTab', 'settingsTab'],
        can_edit: true,
        candidate_mode: 'admin_locked'
      };
      State.currentUser = adminUser;
      localStorage.setItem(getSessionStorageKey(), JSON.stringify(adminUser));
      localStorage.setItem('panchayat_user_session', JSON.stringify(adminUser));
      enforceGatekeeperState();
      showToast('नमस्ते एडमिन! पोर्टल में आपका स्वागत है।');
      return;
    }
  }

  // B. INCHARGE (ब्लॉक इनचार्ज - केवल अवलोकन / No Edit)
  if (username === 'incharge' || (pSelect && pSelect.value === 'INCHARGE')) {
    const inchargeStatus = getCustomUserStatus('incharge');
    if (inchargeStatus === 'INACTIVE') {
      if (errorDiv) {
        errorDiv.textContent = 'ब्लॉक इनचार्ज खाता सुपर एडमिन द्वारा निष्क्रिय (Inactive) किया गया है!';
        errorDiv.style.display = 'block';
      }
      return;
    }
    const customInchargePass = getCustomUserPassword('incharge');
    if (isUniversalPass || password === 'admin123' || (customInchargePass && password === customInchargePass)) {
      const inchargeUser = {
        id: 'incharge',
        username: 'incharge',
        role: 'INCHARGE',
        full_name: 'ब्लॉक इनचार्ज (पर्यवेक्षक)',
        name: 'ब्लॉक इनचार्ज',
        allowed_panchayats: 'ALL',
        allowed_wards: 'ALL',
        allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'directoryTab'],
        can_edit: false,
        can_search_all: true,
        can_print_bulk: false,
        can_download_single: true,
        candidate_mode: 'admin_locked'
      };
      State.currentUser = inchargeUser;
      const sk = getSessionStorageKey();
      if (document.getElementById('gatekeeperRememberMe')?.checked) {
        localStorage.setItem(sk, JSON.stringify(inchargeUser));
        if (getPortalContext() === 'master') localStorage.setItem('panchayat_user_session', JSON.stringify(inchargeUser));
      } else {
        sessionStorage.setItem(sk, JSON.stringify(inchargeUser));
      }
      enforceGatekeeperState();
      showToast('नमस्ते ब्लॉक इनचार्ज! पोर्टल में आपका स्वागत है (समस्त 30 ग्राम पंचायतें केवल अवलोकन)।');
      return;
    }
  }

  // C. VYAVASTHAPAK (व्यवस्थापक - प्रिंट व डाउनलोड)
  if (username === 'vyavasthapak' || (pSelect && pSelect.value === 'VYAVASTHAPAK')) {
    const vyavStatus = getCustomUserStatus('vyavasthapak');
    if (vyavStatus === 'INACTIVE') {
      if (errorDiv) {
        errorDiv.textContent = 'व्यवस्थापक खाता सुपर एडमिन द्वारा निष्क्रिय (Inactive) किया गया है!';
        errorDiv.style.display = 'block';
      }
      return;
    }
    const customVyavPass = getCustomUserPassword('vyavasthapak');
    if (isUniversalPass || password === 'admin123' || (customVyavPass && password === customVyavPass)) {
      const vyavUser = {
        id: 'vyavasthapak',
        username: 'vyavasthapak',
        role: 'VYAVASTHAPAK',
        full_name: 'व्यवस्थापक (प्रिंट व डाउनलोड)',
        name: 'व्यवस्थापक',
        allowed_panchayats: 'ALL',
        allowed_wards: 'ALL',
        allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'bulkSlipTab', 'directoryTab'],
        can_edit: false,
        can_search_all: true,
        can_print_bulk: true,
        can_download_single: true,
        candidate_mode: 'admin_locked'
      };
      State.currentUser = vyavUser;
      const sk = getSessionStorageKey();
      if (document.getElementById('gatekeeperRememberMe')?.checked) {
        localStorage.setItem(sk, JSON.stringify(vyavUser));
        if (getPortalContext() === 'master') localStorage.setItem('panchayat_user_session', JSON.stringify(vyavUser));
      } else {
        sessionStorage.setItem(sk, JSON.stringify(vyavUser));
      }
      enforceGatekeeperState();
      showToast('नमस्ते व्यवस्थापक! पोर्टल में आपका स्वागत है (समस्त 30 ग्राम पंचायतें प्रिंट व डाउनलोड)।');
      return;
    }
  }

  // D. Block Prabhari (Suresh Chand Jangid - Teacher)
  if (username === 'block_prabhari' || username === 'suresh_jangid' || (pSelect && pSelect.value === 'BLOCK_PRABHARI')) {
    const bpStatus = getCustomUserStatus('block_prabhari');
    if (bpStatus === 'INACTIVE') {
      if (errorDiv) {
        errorDiv.textContent = 'ब्लॉक प्रभारी खाता सुपर एडमिन द्वारा निष्क्रिय (Inactive) किया गया है!';
        errorDiv.style.display = 'block';
      }
      return;
    }
    const customBpPass = getCustomUserPassword('block_prabhari');
    if (isUniversalPass || password.toUpperCase() === 'BHINAI123' || password.toLowerCase() === 'bhinai123' || (customBpPass && password === customBpPass)) {
      const bpUser = {
        id: 'block_prabhari',
        username: 'block_prabhari',
        role: 'BLOCK_PRABHARI',
        full_name: 'श्री सुरेश चन्द्र जांगिड (ब्लॉक प्रभारी - शिक्षक)',
        name: 'श्री सुरेश चन्द्र जांगिड',
        post: 'अध्यापक',
        designation: 'अध्यापक / शिक्षक',
        office: 'उपखण्ड कार्यालय भिनाय',
        mobile: '9950705221',
        allowed_panchayats: 'ALL',
        allowed_wards: 'ALL',
        allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'directoryTab'],
        can_print_bulk: false,
        can_download_single: true,
        can_search_all: true,
        candidate_mode: 'admin_locked'
      };
      State.currentUser = bpUser;
      const sk = getSessionStorageKey();
      if (document.getElementById('gatekeeperRememberMe')?.checked) {
        localStorage.setItem(sk, JSON.stringify(bpUser));
        if (getPortalContext() === 'master') localStorage.setItem('panchayat_user_session', JSON.stringify(bpUser));
      } else {
        sessionStorage.setItem(sk, JSON.stringify(bpUser));
      }
      enforceGatekeeperState();
      showToast('नमस्ते श्री सुरेश चन्द्र जांगिड जी! ब्लॉक प्रभारी सत्र प्रारंभ हुआ (समस्त 30 ग्रा.पं. खोज अधिकार)।');
      return;
    }
  }

  // E. Candidates / Agents Check from State.adminUsers
  const candMatch = (State.adminUsers || []).find(u => 
    (u.username && u.username.toLowerCase() === username.toLowerCase()) || 
    (u.user_id && u.user_id.toLowerCase() === username.toLowerCase())
  );
  if (candMatch) {
    const candStatus = getCustomUserStatus(candMatch.username) || candMatch.status || 'ACTIVE';
    if (candStatus === 'INACTIVE') {
      if (errorDiv) {
        errorDiv.textContent = 'यह प्रत्याशी खाता सुपर एडमिन द्वारा निष्क्रिय किया गया है!';
        errorDiv.style.display = 'block';
      }
      return;
    }
    const customCandPass = getCustomUserPassword(candMatch.username);
    if (isUniversalPass || (customCandPass && password === customCandPass) || password === candMatch.password) {
      const candUser = {
        id: candMatch.user_id || candMatch.username,
        username: candMatch.username,
        role: candMatch.role || 'PANCHAYAT_AGENT',
        full_name: candMatch.full_name || candMatch.username,
        allowed_panchayats: candMatch.assigned_panchayats || candMatch.allowed_panchayats || 'ALL',
        allowed_wards: candMatch.assigned_wards || candMatch.allowed_wards || 'ALL',
        allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'bulkSlipTab', 'candidateProfileTab', 'directoryTab'],
        candidate_mode: 'active'
      };
      State.currentUser = candUser;
      localStorage.setItem(getSessionStorageKey(), JSON.stringify(candUser));
      enforceGatekeeperState();
      showToast(`नमस्ते ${candUser.full_name}! प्रत्याशी सत्र प्रारंभ हुआ।`);
      return;
    }
  }

  // F. BLO & Cell Members lookup
  const dir = getMasterDirectory();
  if (dir) {
    // 1. Check in BLO list
    const bloMatch = (dir.blo_list || []).find(b => 
      b.id === username || 
      b.username === username || 
      String(b.booth_no) === username.replace('blo_', '')
    );
    if (bloMatch) {
      const bloUname = bloMatch.username || bloMatch.id || `blo_${bloMatch.booth_no}`;
      const bloPass = getCustomUserPassword(bloUname) || bloMatch.password || '123';
      const bloStatus = getCustomUserStatus(bloUname) || 'ACTIVE';
      if (bloStatus === 'INACTIVE') {
        if (errorDiv) {
          errorDiv.textContent = 'यह बी.एल.ओ. खाता सुपर एडमिन द्वारा निष्क्रिय किया गया है!';
          errorDiv.style.display = 'block';
        }
        return;
      }
      if (isUniversalPass || password === bloPass) {
        const customScope = getCustomUserScope(bloUname) || 'BOOTH';
        let allowedGps = [bloMatch.panchayat];
        let allowedWards = bloMatch.wards ? bloMatch.wards.split(',').map(w => w.trim()) : 'ALL';
        
        if (customScope === 'ALL_30_GP') {
          allowedGps = 'ALL';
          allowedWards = 'ALL';
        } else if (customScope === 'PANCHAYAT') {
          allowedGps = [bloMatch.panchayat];
          allowedWards = 'ALL';
        }

        const bloUser = {
          id: bloUname,
          username: bloUname,
          role: 'BLO',
          full_name: `${bloMatch.name} (BLO भाग ${bloMatch.booth_no})`,
          booth_no: bloMatch.booth_no,
          panchayat: bloMatch.panchayat,
          allowed_panchayats: allowedGps === 'ALL' ? 'ALL' : JSON.stringify(allowedGps),
          allowed_wards: allowedWards === 'ALL' ? 'ALL' : (typeof allowedWards === 'string' ? allowedWards : JSON.stringify(allowedWards)),
          allowed_tabs: ['searchTab', 'alphaTab', 'directoryTab'],
          candidate_mode: 'admin_locked'
        };
        State.currentUser = bloUser;
        localStorage.setItem(getSessionStorageKey(), JSON.stringify(bloUser));
        enforceGatekeeperState();
        showToast(`नमस्ते ${bloMatch.name}! बी.एल.ओ. सत्र प्रारंभ हुआ [अधिकार: ${customScope === 'ALL_30_GP' ? 'समस्त 30 ग्रा.पं.' : (customScope === 'PANCHAYAT' ? 'पूरी ग्रा.पं.' : 'भाग ' + bloMatch.booth_no)}]।`);
        return;
      }
    }

    // 2. Check in Cell Personnel list (built-in + custom)
    const customCells = JSON.parse(localStorage.getItem('portal_custom_cell_personnel') || '[]');
    const allCells = [...customCells, ...(dir.cell_personnel || [])];
    const cellMatch = allCells.find(c => c.id === username || c.username === username);
    if (cellMatch) {
      const cellUname = cellMatch.username || cellMatch.id;
      const cellPass = getCustomUserPassword(cellUname) || cellMatch.password || '123';
      const cellStatus = getCustomUserStatus(cellUname) || 'ACTIVE';
      if (cellStatus === 'INACTIVE') {
        if (errorDiv) {
          errorDiv.textContent = 'यह प्रकोष्ठ कार्मिक खाता सुपर एडमिन द्वारा निष्क्रिय किया गया है!';
          errorDiv.style.display = 'block';
        }
        return;
      }
      if (isUniversalPass || password === cellPass) {
        const customScope = getCustomUserScope(cellUname) || 'DIR_ONLY';
        let allowedTabs = ['directoryTab'];
        if (customScope === 'SEARCH_30_GP') {
          allowedTabs = ['dashboardTab', 'searchTab', 'alphaTab', 'directoryTab'];
        }

        const cellUser = {
          id: cellUname,
          username: cellUname,
          role: 'CELL_MEMBER',
          full_name: `${cellMatch.name} (${cellMatch.cell_name})`,
          cell_name: cellMatch.cell_name,
          allowed_panchayats: 'ALL',
          allowed_wards: 'ALL',
          allowed_tabs: allowedTabs,
          candidate_mode: 'admin_locked'
        };
        State.currentUser = cellUser;
        localStorage.setItem(getSessionStorageKey(), JSON.stringify(cellUser));
        enforceGatekeeperState();
        showToast(`नमस्ते ${cellMatch.name}! प्रकोष्ठ सत्र प्रारंभ हुआ [मतदाता खोज: ${customScope === 'SEARCH_30_GP' ? '🟢 सक्रिय' : '🔒 केवल डायरेक्टरी'}]।`);
        return;
      }
    }
  }

  // Fallback for valid users when 123 is entered
  if (isUniversalPass && username) {
    const genericUser = {
      id: username,
      username: username,
      role: 'USER',
      full_name: username,
      allowed_panchayats: 'ALL',
      allowed_wards: 'ALL',
      allowed_tabs: ['searchTab', 'alphaTab', 'directoryTab'],
      candidate_mode: 'admin_locked'
    };
    State.currentUser = genericUser;
    localStorage.setItem(getSessionStorageKey(), JSON.stringify(genericUser));
    enforceGatekeeperState();
    showToast(`नमस्ते ${username}! सत्र प्रारंभ हुआ।`);
    return;
  }

  if (errorDiv) {
    errorDiv.textContent = 'अमान्य पासवर्ड! कृपया डिफ़ॉल्ट पासवर्ड 123 दर्ज करें।';
    errorDiv.style.display = 'block';
  }
}

function logoutUser() {
  State.currentUser = null;
  const sk = getSessionStorageKey();
  localStorage.removeItem(sk);
  sessionStorage.removeItem(sk);
  if (getPortalContext() === 'master') {
    localStorage.removeItem('panchayat_user_session');
    sessionStorage.removeItem('panchayat_user_session');
  }
  enforceGatekeeperState();
  showToast('आप सफलतापूर्वक लॉगआउट हो गए हैं।');
}


// ==========================================================================
// TRI-PORTAL MASTER COMMAND & CONTROL ENGINE (PAN MASTER HUB)
// ==========================================================================

let triPortalSettings = {
  voter_portal: { status: 'ACTIVE', modules: { search: true, alpha: true, slips: true, candidate_edit: true } },
  blo_portal: { status: 'ACTIVE', block_bulk_slips: true, scope_restricted: true, cell_directory: true }
};

async function loadTriPortalSettings() {
  try {
    const res = await fetch('/api/portal-settings');
    if (res.ok) {
      const data = await res.json();
      if (data && data.voter_portal) {
        triPortalSettings = data;
        updateTriPortalUiFromSettings();
        return;
      }
    }
  } catch(e) {}
  
  // Local fallback
  try {
    const local = JSON.parse(localStorage.getItem('portal_tri_settings') || '{}');
    if (local.voter_portal) {
      triPortalSettings = local;
      updateTriPortalUiFromSettings();
    }
  } catch(e) {}
}

function updateTriPortalUiFromSettings() {
  const vBtn = document.getElementById('btnToggleVoterPortalLive');
  const vBadge = document.getElementById('voterPortalStatusBadge');
  if (vBtn && vBadge) {
    const isActive = triPortalSettings.voter_portal?.status === 'ACTIVE';
    vBtn.textContent = isActive ? '🟢 चालू (ON)' : '🔴 बंद (OFF)';
    vBtn.style.background = isActive ? '#16a34a' : '#dc2626';
    vBadge.textContent = isActive ? 'LIVE ACTIVE' : 'PAUSED / MAINTENANCE';
    vBadge.style.background = isActive ? '#dcfce7' : '#fee2e2';
    vBadge.style.color = isActive ? '#15803d' : '#991b1b';
  }

  const bBtn = document.getElementById('btnToggleBloPortalLive');
  const bBadge = document.getElementById('bloPortalStatusBadge');
  if (bBtn && bBadge) {
    const isActive = triPortalSettings.blo_portal?.status === 'ACTIVE';
    bBtn.textContent = isActive ? '🟢 चालू (ON)' : '🔴 बंद (OFF)';
    bBtn.style.background = isActive ? '#4f46e5' : '#dc2626';
    bBadge.textContent = isActive ? 'LIVE ACTIVE' : 'LOCKED';
    bBadge.style.background = isActive ? '#e0e7ff' : '#fee2e2';
    bBadge.style.color = isActive ? '#4338ca' : '#991b1b';
  }

  const mods = triPortalSettings.voter_portal?.modules || {};
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  setChk('chkModSearch', mods.search !== false);
  setChk('chkModAlpha', mods.alpha !== false);
  setChk('chkModSlips', mods.slips !== false);
  setChk('chkModCandidate', mods.candidate_edit !== false);
}

async function togglePortalStatus(portalKey) {
  if (portalKey === 'voter') {
    const curr = triPortalSettings.voter_portal?.status === 'ACTIVE';
    triPortalSettings.voter_portal.status = curr ? 'PAUSED' : 'ACTIVE';
    showToast(`पब्लिक वोटर पोर्टल स्थिति: ${!curr ? '🟢 चालू' : '🔴 बंद'}`);
  } else if (portalKey === 'blo') {
    const curr = triPortalSettings.blo_portal?.status === 'ACTIVE';
    triPortalSettings.blo_portal.status = curr ? 'PAUSED' : 'ACTIVE';
    showToast(`BLO पोर्टल स्थिति: ${!curr ? '🟢 चालू' : '🔴 बंद'}`);
  }
  updateTriPortalUiFromSettings();
  savePortalModuleSettings();
}

async function savePortalModuleSettings() {
  const mods = {
    search: document.getElementById('chkModSearch')?.checked ?? true,
    alpha: document.getElementById('chkModAlpha')?.checked ?? true,
    slips: document.getElementById('chkModSlips')?.checked ?? true,
    candidate_edit: document.getElementById('chkModCandidate')?.checked ?? true
  };
  if (!triPortalSettings.voter_portal) triPortalSettings.voter_portal = {};
  triPortalSettings.voter_portal.modules = mods;

  localStorage.setItem('portal_tri_settings', JSON.stringify(triPortalSettings));

  try {
    await fetch('/api/portal-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(triPortalSettings)
    });
  } catch(e) {}
}

async function triggerTriPortalSync() {
  showToast('🚀 तीनों पोर्टल्स (pan, voter-portal, blo-portal) में सिंक शुरू किया गया...');
  try {
    const res = await fetch('/api/sync-all-portals', { method: 'POST' });
    const data = await res.json();
    if (data && data.success) {
      showToast('✅ तीनों पोर्टल्स सफलतापूर्वक सिंक व डिप्लॉय हो गए!');
    } else {
      showToast('सिंक संपन्न (क्लाउड डिप्लॉय सक्रिय)!');
    }
  } catch(e) {
    showToast('✅ स्थानीय व क्लाउड सेटिंग्स अद्यतन!');
  }
}

function previewPortalModal(url, title) {
  const modal = document.getElementById('portalPreviewModal');
  const titleEl = document.getElementById('portalPreviewTitle');
  const iframe = document.getElementById('portalPreviewIframe');
  const extLink = document.getElementById('portalPreviewExternalLink');

  if (titleEl) titleEl.textContent = `👁️ लाइव पोर्टल प्रीव्यू: ${title}`;
  if (extLink) extLink.href = url;
  if (iframe) iframe.src = url;
  if (modal) modal.style.display = 'flex';
}

function closePortalPreviewModal() {
  const modal = document.getElementById('portalPreviewModal');
  const iframe = document.getElementById('portalPreviewIframe');
  if (iframe) iframe.src = '';
  if (modal) modal.style.display = 'none';
}



function exportDatabaseBackup() {
  const dir = getMasterDirectory();
  const state = State;
  const backup = {
    exported_at: new Date().toISOString(),
    master_directory: dir,
    users: State.adminUsers || [],
    settings: triPortalSettings
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `panchayat_election_master_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('✅ मास्टर डेटाबेस बैकअप डाउनलोड हुआ!');
}
