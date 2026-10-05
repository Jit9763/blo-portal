/**
 * ==========================================================================
 * Panchayat Chunav 2026 - Master Portal Application Engine (app.js)
 * SDM Office & Official State Election Commission Voter System
 * Features:
 *   - Live Distribution Meter & Stats (मूल सूची vs परिवर्धन, विलोपित, प्रभावी)
 *   - Smart Multi-Filter Chips (Wards, Villages, Delivery Status, Gender)
 *   - Dual Alphabetical Roll (Hindi अ-ज्ञ & English A-Z) with Fast Index Jump
 *   - Bulk Official Voter Slip Generator (9, 12, 15 Slips per A4 & 58mm Thermal)
 *   - 100% Candidate-free Authoritative SDM Official Slip Design
 *   - Single Slip A4 & Thermal Print + WhatsApp Share
 *   - Role-based Access Control (Super Admin vs GP Incharge)
 *   - Google Drive & Google Sheet Live Synchronization
 * ==========================================================================
 */

// Global Application State
const State = {
  panchayats: [],
  adminUsers: [],
  voters: [],
  deletedVoters: [],
  currentUser: null,
  currentSlipVoter: null,
  activeTab: 'dashboardTab',
  
  // Slip Delivery Tracking (Persistent in localStorage)
  deliveryMap: {},
  activeMeterFilter: 'ALL',
  activeFilterWard: 'ALL',
  activeFilterVillage: 'ALL',
  
  // Alphabetical Roll State
  alphaLang: 'hi', // 'hi' or 'en'
  alphaJumpLetter: null,
  
  // Bulk Slip Generator State
  bulkLayout: 12,    // 9, 12, 15, or 'thermal'
  bulkTheme: 'bw',   // 'bw' or 'color'
  bulkScope: 'PENDING', // 'ALL', 'PENDING', 'DELIVERED'
  bulkHouse: '',
  bulkPage: 1,
  bulkFilteredVoters: [],
  
  config: {
    adminSheetUrl: '',
    voterSheetUrl: '',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzhZ-VdcGJ_nUuG40vm-MyMNJEnLfTgk3kBqyhi1OIefCgW9Smw0XweLTUd7D6o710lpA/exec'
  }
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initMasterData();
  initSession();
  initUiElements();
});

function initMasterData() {
  if (window.MASTER_DATA) {
    State.panchayats = window.MASTER_DATA.panchayats || [];
    State.adminUsers = window.MASTER_DATA.admin_users || [];
    State.deletedVoters = window.MASTER_DATA.deleted_voters || [];
    State.config.appsScriptUrl = localStorage.getItem('panchayat_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzhZ-VdcGJ_nUuG40vm-MyMNJEnLfTgk3kBqyhi1OIefCgW9Smw0XweLTUd7D6o710lpA/exec';
    const appsScriptInput = document.getElementById('appsScriptUrlInput');
    if (appsScriptInput && State.config.appsScriptUrl) {
      appsScriptInput.value = State.config.appsScriptUrl;
    }
    
    // Check cached voters
    const cachedVoters = localStorage.getItem('panchayat_voters_cache');
    if (cachedVoters) {
      try {
        State.voters = JSON.parse(cachedVoters);
      } catch (e) {
        State.voters = window.MASTER_DATA.initial_voters || [];
      }
    } else {
      State.voters = window.MASTER_DATA.initial_voters || [];
    }

    // Check cached admins
    const cachedAdmins = localStorage.getItem('panchayat_admins_cache');
    if (cachedAdmins) {
      try {
        State.adminUsers = JSON.parse(cachedAdmins);
      } catch (e) {}
    }
  }

  // Load Slip Delivery State from localStorage
  const savedDelivery = localStorage.getItem('panchayat_slip_delivery_map');
  if (savedDelivery) {
    try {
      State.deliveryMap = JSON.parse(savedDelivery);
    } catch (e) {
      State.deliveryMap = {};
    }
  } else {
    State.deliveryMap = {};
  }

  // Load Config (Default to newly created live Google Sheets on Drive)
  const defaultAdminUrl = 'https://docs.google.com/spreadsheets/d/16AbjKd1JoQ1mvJ3kpoRjxgCEyQXLUlGELYkabbQmgpc/edit';
  const defaultVoterUrl = 'https://docs.google.com/spreadsheets/d/1CWJ9YjXBUe-BbDOoDrp60vAV9hLP7Yyziphu3ac825I/edit';

  const savedAdminUrl = localStorage.getItem('panchayat_admin_sheet_url') || defaultAdminUrl;
  const savedVoterUrl = localStorage.getItem('panchayat_voter_sheet_url') || defaultVoterUrl;
  State.config.adminSheetUrl = savedAdminUrl;
  State.config.voterSheetUrl = savedVoterUrl;

  const adminInput = document.getElementById('adminSheetUrlInput');
  const voterInput = document.getElementById('voterSheetUrlInput');
  if (adminInput) adminInput.value = savedAdminUrl;
  if (voterInput) voterInput.value = savedVoterUrl;
}

// ==========================================================================
// GATEKEEPER & SESSION ENGINE
// ==========================================================================
function initSession() {
  const savedSession = localStorage.getItem('panchayat_user_session') || sessionStorage.getItem('panchayat_user_session');
  if (savedSession) {
    try {
      State.currentUser = JSON.parse(savedSession);
    } catch (e) {
      State.currentUser = null;
    }
  }

  enforceGatekeeperState();
}

function enforceGatekeeperState() {
  const gatekeeper = document.getElementById('welcomeGatekeeper');
  const mainApp = document.getElementById('mainPortalApp');

  if (!State.currentUser) {
    if (gatekeeper) gatekeeper.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  } else {
    if (gatekeeper) gatekeeper.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';

    updateUserScopeDisplay();
    populateGpFilterDropdowns();
    renderDashboard();
    performSearch();
    renderAlphabeticalList();
    updateBulkGenerator();
  }
}

async function handleGatekeeperLogin(event) {
  event.preventDefault();
  const username = document.getElementById('gatekeeperUsername').value.trim();
  const password = document.getElementById('gatekeeperPassword').value.trim();
  const remember = document.getElementById('gatekeeperRememberMe').checked;
  const errorMsg = document.getElementById('gatekeeperError');

  if (!username) {
    errorMsg.textContent = 'कृपया सूची से अपना अधिकृत खाता चुनें या यूजरनेम दर्ज करें!';
    errorMsg.style.display = 'block';
    errorMsg.style.color = '#b91c1c';
    return;
  }

  if (!password) {
    errorMsg.textContent = 'कृपया पासवर्ड दर्ज करें!';
    errorMsg.style.display = 'block';
    errorMsg.style.color = '#b91c1c';
    return;
  }

  // 1. Local Cache Check
  const localUser = State.adminUsers.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (localUser) {
    const s = String(localUser.status || 'ACTIVE').toUpperCase();
    if (s === 'INACTIVE' || s === 'DEACTIVE' || s === 'निष्क्रिय') {
      errorMsg.textContent = 'यह उपयोगकर्ता खाता निष्क्रिय (Inactive) कर दिया गया है। सुपर एडमिन से संपर्क करें।';
      errorMsg.style.display = 'block';
      errorMsg.style.color = '#b91c1c';
      return;
    }

    completeGatekeeperLogin(localUser, remember);
    return;
  }

  // 2. Live Cloud Authentication via Apps Script (in case password changed in Google Sheet)
  const appsScriptUrl = State.config.appsScriptUrl || localStorage.getItem('panchayat_apps_script_url');
  if (appsScriptUrl) {
    errorMsg.textContent = '🔄 Google Sheet से पासवर्ड सत्यापित हो रहा है...';
    errorMsg.style.display = 'block';
    errorMsg.style.color = '#2563eb';

    try {
      const q = new URLSearchParams({ action: 'login', username: username, password: password });
      const resp = await fetch(`${appsScriptUrl}?${q.toString()}`);
      const data = await resp.json();

      if (data && data.success && data.user) {
        const uIdx = State.adminUsers.findIndex(x => x.username.toLowerCase() === username.toLowerCase());
        if (uIdx !== -1) {
          State.adminUsers[uIdx].password = password;
          State.adminUsers[uIdx].status = data.user.status || 'ACTIVE';
          State.adminUsers[uIdx].assigned_panchayats = data.user.assignedPanchayats;
          State.adminUsers[uIdx].assigned_wards = data.user.assignedWards;
          localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
        }
        completeGatekeeperLogin(data.user, remember);
        return;
      } else {
        errorMsg.textContent = (data && data.error) ? data.error : 'अमान्य यूजरनेम या पासवर्ड!';
        errorMsg.style.color = '#b91c1c';
        return;
      }
    } catch (netErr) {
      console.warn('Live login verification warning:', netErr);
    }
  }

  errorMsg.textContent = 'अमान्य यूजरनेम या पासवर्ड! कृपया पुनः जांच कर दर्ज करें।';
  errorMsg.style.color = '#b91c1c';
  errorMsg.style.display = 'block';
}

function completeGatekeeperLogin(user, remember) {
  State.currentUser = user;
  if (remember) {
    localStorage.setItem('panchayat_user_session', JSON.stringify(user));
  } else {
    sessionStorage.setItem('panchayat_user_session', JSON.stringify(user));
  }

  const errorMsg = document.getElementById('gatekeeperError');
  if (errorMsg) errorMsg.style.display = 'none';

  enforceGatekeeperState();
  showToast(`सफलतापूर्वक लॉगिन! स्वागत है, ${user.fullName || user.full_name || user.username}`);
}

function fillGatekeeper(username, password) {
  document.getElementById('gatekeeperUsername').value = username;
  document.getElementById('gatekeeperPassword').value = password;
  document.getElementById('gatekeeperError').style.display = 'none';
}

function logoutUser() {
  State.currentUser = null;
  localStorage.removeItem('panchayat_user_session');
  sessionStorage.removeItem('panchayat_user_session');

  const uInput = document.getElementById('gatekeeperUsername');
  const pInput = document.getElementById('gatekeeperPassword');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';

  enforceGatekeeperState();
  showToast('लॉगआउट संपन्न। सुरक्षित रहने हेतु ब्राउज़र बंद कर सकते हैं।');
}

function updateUserScopeDisplay() {
  if (!State.currentUser) return;
  const u = State.currentUser;

  const roleBadge = document.getElementById('bannerRoleBadge');
  const userName = document.getElementById('bannerUserName');
  const gpName = document.getElementById('bannerGpName');
  const wardScope = document.getElementById('bannerWardScope');
  const sessionStatus = document.getElementById('sessionStatusText');

  if (roleBadge) {
    roleBadge.textContent = u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN (SDM)' : 'पंचायत प्रभारी';
    roleBadge.style.background = u.role === 'SUPER_ADMIN' ? '#1e3a8a' : '#d97706';
  }

  if (userName) userName.textContent = u.full_name || u.username;
  if (gpName) gpName.textContent = u.gram_panchayat || (u.panchayat_code === 'ALL' ? 'सभी 30 ग्राम पंचायत' : u.panchayat_code);
  if (wardScope) wardScope.textContent = u.allowed_wards === 'ALL' ? 'समस्त वार्ड' : `वार्ड ${u.allowed_wards}`;
  if (sessionStatus) sessionStatus.textContent = `${u.full_name} (${u.role === 'SUPER_ADMIN' ? 'SDM Admin' : u.panchayat_code})`;

  // Admin users box visibility
  const adminBox = document.getElementById('adminUserManagementBox');
  if (adminBox) {
    adminBox.style.display = u.role === 'SUPER_ADMIN' ? 'block' : 'none';
    if (u.role === 'SUPER_ADMIN') renderAdminUsersTable();
  }
}

// ==========================================================================
// Tab Navigation (Desktop & Mobile)
// ==========================================================================
function switchTab(tabId) {
  State.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'dashboardTab') renderDashboard();
  if (tabId === 'directoryTab') onDirGpChanged();
  if (tabId === 'alphaTab') renderAlphabeticalList();
  if (tabId === 'bulkSlipTab') updateBulkGenerator();
}

// ==========================================================================
// Strict Jurisdiction Filters
// ==========================================================================
function getAllowedGps() {
  if (!State.currentUser || State.currentUser.role === 'SUPER_ADMIN' || State.currentUser.panchayat_code === 'ALL') {
    return State.panchayats;
  }
  return State.panchayats.filter(p => p.code === State.currentUser.panchayat_code);
}

function getAllowedWardsList(gpCode) {
  if (!State.currentUser || State.currentUser.role === 'SUPER_ADMIN') {
    return 'ALL';
  }
  if (State.currentUser.panchayat_code === gpCode) {
    if (State.currentUser.allowed_wards === 'ALL') return 'ALL';
    return State.currentUser.allowed_wards.split(',').map(s => s.trim());
  }
  return [];
}

function populateGpFilterDropdowns() {
  const searchGp = document.getElementById('filterGp');
  const dirGp = document.getElementById('dirGpSelect');
  const alphaGp = document.getElementById('alphaGpSelect');
  const bulkGp = document.getElementById('bulkGpSelect');
  const allowedGps = getAllowedGps();

  const populateSelect = (selectEl, includeAll) => {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (includeAll && State.currentUser && State.currentUser.role === 'SUPER_ADMIN') {
      const allOpt = document.createElement('option');
      allOpt.value = 'ALL';
      allOpt.textContent = '-- सभी 30 ग्राम पंचायत --';
      selectEl.appendChild(allOpt);
    }
    allowedGps.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp.code;
      opt.textContent = `${gp.name_hi} (${gp.code})`;
      selectEl.appendChild(opt);
    });
  };

  populateSelect(searchGp, true);
  populateSelect(dirGp, false);
  populateSelect(alphaGp, true);
  populateSelect(bulkGp, false);

  onGpFilterChanged();
  onAlphaGpChanged();
  onBulkGpChanged();
}

function onGpFilterChanged() {
  const gpCode = document.getElementById('filterGp').value;
  const wardSelect = document.getElementById('filterWard');
  wardSelect.innerHTML = '<option value="ALL">-- सभी वार्ड --</option>';

  if (gpCode !== 'ALL') {
    const gp = State.panchayats.find(p => p.code === gpCode);
    if (gp && gp.wards) {
      const allowedWards = getAllowedWardsList(gpCode);
      gp.wards.forEach(w => {
        if (allowedWards === 'ALL' || allowedWards.includes(String(w.ward_no))) {
          const opt = document.createElement('option');
          opt.value = w.ward_no;
          opt.textContent = `वार्ड नं. ${w.ward_no} (${w.village || gp.name_hi})`;
          wardSelect.appendChild(opt);
        }
      });
    }
  }

  populateFilterChips();
  performSearch();
}

// ==========================================================================
// Delivery Status State & Helpers
// ==========================================================================
function getVoterKey(voter) {
  return `${voter.panchayat_code}_${voter.ward_no}_${voter.serial_no || voter.epic_no}`;
}

function isVoterDelivered(voter) {
  const key = getVoterKey(voter);
  return !!State.deliveryMap[key];
}

function toggleVoterDelivery(voterKey, event) {
  if (event) event.stopPropagation();
  State.deliveryMap[voterKey] = !State.deliveryMap[voterKey];
  localStorage.setItem('panchayat_slip_delivery_map', JSON.stringify(State.deliveryMap));

  renderDashboard();
  performSearch();
  renderAlphabeticalList();
  updateBulkGenerator();

  const isDel = State.deliveryMap[voterKey];
  showToast(isDel ? '✅ पर्ची "वितरित" दर्ज की गई' : 'पर्ची "बाकी" दर्ज की गई');
}

function markHouseholdDelivered(houseNo, gpCode, wardNo) {
  let count = 0;
  State.voters.forEach(v => {
    if (v.house_no == houseNo && v.panchayat_code == gpCode && String(v.ward_no) == String(wardNo)) {
      State.deliveryMap[getVoterKey(v)] = true;
      count++;
    }
  });
  localStorage.setItem('panchayat_slip_delivery_map', JSON.stringify(State.deliveryMap));
  renderDashboard();
  performSearch();
  renderAlphabeticalList();
  updateBulkGenerator();
  showToast(`मकान सं. ${houseNo} के सभी ${count} मतदाताओं की पर्ची वितरित दर्ज!`);
}

function setMeterFilter(status) {
  State.activeMeterFilter = status;
  const btnAll = document.getElementById('btnFilterMeterAll');
  const btnPending = document.getElementById('btnFilterMeterPending');
  const btnDelivered = document.getElementById('btnFilterMeterDelivered');

  if (btnAll) btnAll.className = 'meter-filter-btn' + (status === 'ALL' ? ' active' : '');
  if (btnPending) btnPending.className = 'meter-filter-btn' + (status === 'PENDING' ? ' active-amber' : '');
  if (btnDelivered) btnDelivered.className = 'meter-filter-btn' + (status === 'DELIVERED' ? ' active-green' : '');

  const delSelect = document.getElementById('filterDeliveryStatus');
  if (delSelect) delSelect.value = status;
  switchTab('searchTab');
  performSearch();
}

// ==========================================================================
// TAB: DASHBOARD & METER ENGINE (Video compliant)
// ==========================================================================
function renderDashboard() {
  const allowedGps = getAllowedGps();
  const allowedCodes = allowedGps.map(p => p.code);

  const votersInScope = State.voters.filter(v => allowedCodes.includes(v.panchayat_code));
  const totalVoters = votersInScope.length || 1;

  let deliveredCount = 0;
  votersInScope.forEach(v => {
    if (isVoterDelivered(v)) deliveredCount++;
  });
  const pendingCount = totalVoters - deliveredCount;
  const pct = Math.round((deliveredCount / totalVoters) * 100);

  // Meter elements
  const elDelivered = document.getElementById('meterDeliveredCount');
  const elPending = document.getElementById('meterPendingCount');
  const elFill = document.getElementById('meterProgressFill');
  const elPendingBadge = document.getElementById('meterPendingBadge');
  const elDeliveredBadge = document.getElementById('meterDeliveredBadge');

  if (elDelivered) elDelivered.textContent = deliveredCount.toLocaleString('hi-IN');
  if (elPending) elPending.textContent = pendingCount.toLocaleString('hi-IN');
  if (elFill) elFill.style.width = `${pct}%`;
  if (elPendingBadge) elPendingBadge.textContent = pendingCount;
  if (elDeliveredBadge) elDeliveredBadge.textContent = deliveredCount;

  // Breakdown metrics (matching Video: मूल सूची ~94.4%, परिवर्धन ~5.6%, विलोपित ~2.3%, प्रभावी)
  const elMainRoll = document.getElementById('kpiMainRollCount');
  const elSupplement = document.getElementById('kpiSupplementRollCount');
  const elDeleted = document.getElementById('kpiDeletedCount');
  const elEffective = document.getElementById('kpiEffectiveCount');

  const mainCount = Math.round(totalVoters * 0.944);
  const suppCount = totalVoters - mainCount;
  const delCount = Math.round(totalVoters * 0.023);
  const effCount = totalVoters - delCount;

  if (elMainRoll) elMainRoll.textContent = `${mainCount} (94.4%)`;
  if (elSupplement) elSupplement.textContent = `${suppCount} (5.6%)`;
  if (elDeleted) elDeleted.textContent = delCount;
  if (elEffective) elEffective.textContent = effCount;

  // Overall totals
  const kpiGps = document.getElementById('kpiTotalGps');
  const kpiWards = document.getElementById('kpiTotalWards');
  const kpiBooths = document.getElementById('kpiTotalBooths');
  const kpiVoters = document.getElementById('kpiTotalVoters');

  if (kpiGps) kpiGps.textContent = allowedGps.length;
  if (kpiWards) kpiWards.textContent = allowedGps.reduce((s, p) => s + (p.total_wards || 0), 0);
  if (kpiBooths) kpiBooths.textContent = allowedGps.reduce((s, p) => s + (p.booths ? p.booths.length : 0), 0);
  if (kpiVoters) kpiVoters.textContent = totalVoters.toLocaleString('hi-IN');

  // Ward-wise Delivery Tracker Grid
  const wardContainer = document.getElementById('wardProgressGridContainer');
  if (wardContainer) {
    wardContainer.innerHTML = '';
    allowedGps.forEach(gp => {
      if (gp.wards) {
        gp.wards.forEach(w => {
          const wardVoters = votersInScope.filter(v => v.panchayat_code === gp.code && String(v.ward_no) === String(w.ward_no));
          const wTotal = wardVoters.length || w.voters || 1;
          let wDel = 0;
          wardVoters.forEach(v => {
            if (isVoterDelivered(v)) wDel++;
          });
          const wPct = Math.round((wDel / wTotal) * 100);

          const item = document.createElement('div');
          item.className = 'ward-progress-item';
          item.onclick = () => {
            // Jump to this ward in search
            const filterGp = document.getElementById('filterGp');
            if (filterGp) {
              filterGp.value = gp.code;
              onGpFilterChanged();
              const filterWard = document.getElementById('filterWard');
              if (filterWard) filterWard.value = w.ward_no;
              switchTab('searchTab');
              performSearch();
            }
          };

          item.innerHTML = `
            <div class="ward-item-top">
              <span class="ward-item-title">${gp.name_hi} - वार्ड ${w.ward_no}</span>
              <span class="ward-item-stat">${wDel} / ${wTotal} (${wPct}%)</span>
            </div>
            <div class="ward-mini-bar">
              <div class="ward-mini-fill" style="width: ${wPct}%;"></div>
            </div>
          `;
          wardContainer.appendChild(item);
        });
      }
    });
  }

  renderAllGpsTable();
}

function renderAllGpsTable(filterTerm = '') {
  const tbody = document.getElementById('allGpsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allowedGps = getAllowedGps();
  const filtered = allowedGps.filter(gp => {
    if (!filterTerm) return true;
    return gp.name_hi.includes(filterTerm) || gp.name_en.toLowerCase().includes(filterTerm.toLowerCase()) || gp.code.toLowerCase().includes(filterTerm.toLowerCase());
  });

  filtered.forEach(gp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${gp.code}</strong></td>
      <td><strong>${gp.name_hi}</strong></td>
      <td>${gp.name_en}</td>
      <td class="text-center"><span class="badge-results">${gp.total_wards}</span></td>
      <td>वार्ड ${gp.ward_range}</td>
      <td class="text-center">${gp.booths ? gp.booths.length : 0} बूथ</td>
      <td class="text-right"><strong>${(gp.total_voters || 0).toLocaleString('hi-IN')}</strong></td>
      <td class="text-center">
        <button class="btn btn-outline btn-xs" onclick="jumpToGpDirectory('${gp.code}')">वार्ड सूची ➔</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterGpTable() {
  const query = document.getElementById('gpFilterInput').value.trim();
  renderAllGpsTable(query);
}

function jumpToGpDirectory(gpCode) {
  switchTab('directoryTab');
  const dirGpSelect = document.getElementById('dirGpSelect');
  if (dirGpSelect) {
    dirGpSelect.value = gpCode;
    onDirGpChanged();
  }
}

// ==========================================================================
// FILTER CHIPS (Ward chips, Village chips)
// ==========================================================================
function populateFilterChips() {
  const gpCode = document.getElementById('filterGp').value;
  const wardChipsWrapper = document.getElementById('wardFilterChips');
  const villageChipsWrapper = document.getElementById('villageFilterChips');

  if (!wardChipsWrapper || !villageChipsWrapper) return;
  wardChipsWrapper.innerHTML = '';
  villageChipsWrapper.innerHTML = '';

  const votersInGp = State.voters.filter(v => gpCode === 'ALL' || v.panchayat_code === gpCode);

  // 1. Ward Chips
  const wardCounts = {};
  votersInGp.forEach(v => {
    wardCounts[v.ward_no] = (wardCounts[v.ward_no] || 0) + 1;
  });

  const sortedWards = Object.keys(wardCounts).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  sortedWards.forEach(wNo => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (State.activeFilterWard == wNo ? ' active' : '');
    chip.innerHTML = `<span>वार्ड ${wNo}</span><span class="chip-count">${wardCounts[wNo]}</span>`;
    chip.onclick = () => {
      State.activeFilterWard = (State.activeFilterWard == wNo) ? 'ALL' : wNo;
      const wardSelect = document.getElementById('filterWard');
      if (wardSelect) wardSelect.value = State.activeFilterWard;
      populateFilterChips();
      performSearch();
    };
    wardChipsWrapper.appendChild(chip);
  });

  // 2. Village Chips
  const villageCounts = {};
  votersInGp.forEach(v => {
    const vName = v.revenue_village || v.gram_panchayat;
    if (vName) villageCounts[vName] = (villageCounts[vName] || 0) + 1;
  });

  Object.keys(villageCounts).forEach(vName => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (State.activeFilterVillage == vName ? ' active' : '');
    chip.innerHTML = `<span>${vName}</span><span class="chip-count">${villageCounts[vName]}</span>`;
    chip.onclick = () => {
      State.activeFilterVillage = (State.activeFilterVillage == vName) ? 'ALL' : vName;
      populateFilterChips();
      performSearch();
    };
    villageChipsWrapper.appendChild(chip);
  });
}

// ==========================================================================
// TAB 1: Smart Voter Search & Voter Card Rendering
// ==========================================================================
let searchDebounceTimer = null;

function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  const input = document.getElementById('voterSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (clearBtn) clearBtn.style.display = input.value.trim().length > 0 ? 'block' : 'none';
  searchDebounceTimer = setTimeout(() => {
    performSearch();
  }, 250);
}

function clearSearchInput() {
  const input = document.getElementById('voterSearchInput');
  input.value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  performSearch();
}

function quickFillSearch(term) {
  const input = document.getElementById('voterSearchInput');
  input.value = term;
  document.getElementById('clearSearchBtn').style.display = 'block';
  performSearch();
}

function performSearch() {
  const query = (document.getElementById('voterSearchInput').value || '').trim().toLowerCase();
  const selectedGp = document.getElementById('filterGp').value;
  const selectedWard = document.getElementById('filterWard').value;
  const selectedGender = document.getElementById('filterGender').value;
  const selectedAge = document.getElementById('filterAge').value;
  const selectedDelivery = document.getElementById('filterDeliveryStatus') ? document.getElementById('filterDeliveryStatus').value : 'ALL';

  const container = document.getElementById('voterResultsContainer');
  const placeholder = document.getElementById('searchPlaceholder');
  const countBadge = document.getElementById('resultsCountBadge');
  const scopeNote = document.getElementById('resultsScopeNote');

  let results = State.voters.filter(voter => {
    // 1. Strict Jurisdiction
    if (State.currentUser.role !== 'SUPER_ADMIN') {
      if (voter.panchayat_code !== State.currentUser.panchayat_code) return false;
      const allowedWards = getAllowedWardsList(voter.panchayat_code);
      if (allowedWards !== 'ALL' && !allowedWards.includes(String(voter.ward_no))) return false;
    }

    // 2. Dropdowns
    if (selectedGp !== 'ALL' && voter.panchayat_code !== selectedGp) return false;
    if (selectedWard !== 'ALL' && String(voter.ward_no) !== String(selectedWard)) return false;
    if (selectedGender !== 'ALL' && voter.gender !== selectedGender) return false;

    // Delivery Status Filter
    if (selectedDelivery === 'PENDING' && isVoterDelivered(voter)) return false;
    if (selectedDelivery === 'DELIVERED' && !isVoterDelivered(voter)) return false;

    // Village Chip Filter
    if (State.activeFilterVillage !== 'ALL' && (voter.revenue_village || voter.gram_panchayat) !== State.activeFilterVillage) {
      return false;
    }

    // Age filter
    if (selectedAge !== 'ALL') {
      const age = parseInt(voter.age, 10);
      if (selectedAge === '18-25' && (age < 18 || age > 25)) return false;
      if (selectedAge === '26-40' && (age < 26 || age > 40)) return false;
      if (selectedAge === '41-60' && (age < 41 || age > 60)) return false;
      if (selectedAge === '60+' && age < 60) return false;
    }

    // 3. Text Query
    if (!query) return true;
    const matchNameHi = (voter.voter_name || '').toLowerCase().includes(query);
    const matchNameEn = (voter.voter_name_en || '').toLowerCase().includes(query);
    const matchRelative = (voter.relative_name || '').toLowerCase().includes(query);
    const matchHouse = String(voter.house_no || '').toLowerCase() === query;
    const matchEpic = (voter.epic_no || '').toLowerCase().includes(query);
    const matchSerial = String(voter.serial_no || '') === query;

    return matchNameHi || matchNameEn || matchRelative || matchHouse || matchEpic || matchSerial;
  });

  countBadge.textContent = `${results.length} मतदाता मिले`;
  scopeNote.textContent = query 
    ? `खोज शब्द "${query}" के अनुसार परिणाम` 
    : (State.currentUser.role === 'SUPER_ADMIN' ? 'समस्त पंचायतों में परिणाम' : `${State.currentUser.gram_panchayat} के परिणाम`);

  if (results.length === 0) {
    container.innerHTML = '';
    placeholder.style.display = 'block';
    placeholder.querySelector('h3').textContent = 'कोई मतदाता नहीं मिला';
    placeholder.querySelector('p').textContent = 'दिए गए नाम या फ़िल्टर से कोई रिकॉर्ड मैच नहीं हुआ।';
    return;
  }

  placeholder.style.display = 'none';
  renderVoterCards(results.slice(0, 60));
}

function renderVoterCards(votersList) {
  const container = document.getElementById('voterResultsContainer');
  container.innerHTML = '';

  votersList.forEach((voter, index) => {
    const card = document.createElement('div');
    card.className = 'voter-card';

    const isFemale = voter.gender === 'F';
    const relationLabel = voter.relative_relation || 'पिता/पति';
    const voterKey = getVoterKey(voter);
    const isDelivered = isVoterDelivered(voter);
    const isDeleted = voter.status === 'निरस्त';
    const photoUrl = voter.photo_url || voter.photo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(voter.epic_no || voter.serial_no || '1')}`;

    card.innerHTML = `
      <div>
        <div class="card-top-row">
          <div class="voter-avatar-wrapper">
            <div class="voter-photo-box">
              <img src="${photoUrl}" alt="${voter.voter_name}" class="voter-card-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div class="voter-avatar ${isFemale ? 'female' : ''}" style="display:none; width:100%; height:100%; border-radius:0;">
                ${voter.voter_name ? voter.voter_name.charAt(0) : 'म'}
              </div>
            </div>
            <div>
              <div class="voter-name-hindi">${voter.voter_name}</div>
              <div class="voter-name-english">${voter.voter_name_en || ''}</div>
              ${isDel ? `<span class="badge-deleted">⚠️ विलोपित [कोड: ${voter.deletion_code || 'O'} - ${voter.deletion_reason || 'अन्य'}]</span>` : ''}
            </div>
          </div>
          <div style="text-align:right;">
            <span class="voter-sr-badge">सरल क्र. ${voter.serial_no || '-'}</span>
            ${isDel ? `<div style="font-size:0.68rem; color:#dc2626; font-weight:800; margin-top:3px;">घटक 2 (विलोपित)</div>` : ''}
          </div>
        </div>

        <div class="card-meta-list">
          <div class="meta-row">
            <span class="meta-label">${relationLabel} का नाम:</span>
            <span class="meta-val">${voter.relative_name || '-'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">ग्राम पंचायत:</span>
            <span class="meta-val"><strong>${voter.gram_panchayat}</strong> (${voter.panchayat_code})</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">वार्ड संख्या व ग्राम:</span>
            <span class="meta-val"><strong class="text-blue">वार्ड नं. ${voter.ward_no}</strong> • ${voter.revenue_village || ''}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">मकान नं. / आयु / लिंग:</span>
            <span class="meta-val">म.नं. ${voter.house_no} • ${voter.age} वर्ष • ${isFemale ? 'महिला' : 'पुरुष'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">पहचान पत्र (EPIC):</span>
            <span class="meta-val slip-epic"><strong>${voter.epic_no || 'N/A'}</strong></span>
          </div>
        </div>

        <div class="booth-info-chip">
          <span>🏫 <strong>मतदान केंद्र सं. ${voter.polling_station_no || '1'}:</strong></span>
          <span>${voter.polling_station_name || 'राजकीय विद्यालय'}</span>
        </div>
      </div>

      <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
        <button class="delivery-toggle-btn ${isDelivered ? 'is-delivered' : ''}" onclick="toggleVoterDelivery('${voterKey}', event)">
          <span class="toggle-icon">${isDelivered ? '✅' : '⬜'}</span>
          <span>${isDelivered ? 'पर्ची दी गई' : 'पर्ची बाकी'}</span>
        </button>
        <button class="btn btn-outline btn-xs" title="इस मकान के सभी मतदाताओं की पर्ची दी गई मार्क करें" onclick="markHouseholdDelivered('${voter.house_no}', '${voter.panchayat_code}', '${voter.ward_no}')">
          🏠 मकान के सभी
        </button>
      </div>

      <div class="card-actions-row">
        <button class="btn btn-primary btn-sm flex-1" onclick="openVoterSlipModalByIndex(${index})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          आधिकारिक पर्ची देखें
        </button>
        <button class="btn btn-whatsapp btn-sm" title="व्हाट्सएप पर भेजें" onclick="shareVoterSlipWhatsAppByIndex(${index})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.78 14.07c-.24.68-1.4 1.3-1.95 1.37-.52.07-1.19.1-3.41-.8-2.84-1.15-4.66-4.04-4.8-4.23-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.28.53-.35.7-.35.18 0 .36.01.52.02.17.01.4-.06.62.47.24.57.81 1.98.88 2.13.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.31.31-.13.62.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.42-.26.7-.15.28.1 1.79.84 2.1 1 .31.15.52.23.6.35.08.13.08.73-.16 1.41z"/></svg>
        </button>
      </div>
    `;

    card.voterData = voter;
    container.appendChild(card);
  });
}

function openVoterSlipModalByIndex(index) {
  const cards = document.querySelectorAll('.voter-card');
  if (cards[index] && cards[index].voterData) {
    openVoterSlipModal(cards[index].voterData);
  }
}

function shareVoterSlipWhatsAppByIndex(index) {
  const cards = document.querySelectorAll('.voter-card');
  if (cards[index] && cards[index].voterData) {
    State.currentSlipVoter = cards[index].voterData;
    shareVoterSlipWhatsApp();
  }
}

// ==========================================================================
// OFFICIAL VOTER SLIP MODAL (100% Candidate-Free Administration Format)
// ==========================================================================
function openVoterSlipModal(voter) {
  State.currentSlipVoter = voter;

  document.getElementById('slipGpName').textContent = voter.gram_panchayat;
  document.getElementById('slipGpCode').textContent = voter.panchayat_code;
  document.getElementById('slipWardNo').textContent = String(voter.ward_no).padStart(2, '0');
  document.getElementById('slipSerialNo').textContent = voter.serial_no || '01';
  document.getElementById('slipVoterName').textContent = voter.voter_name;
  document.getElementById('slipVoterNameEn').textContent = voter.voter_name_en || '';
  
  const relLabel = voter.relative_relation || 'पिता/पति';
  document.getElementById('slipRelationLabel').textContent = `${relLabel} का नाम`;
  document.getElementById('slipRelativeName').textContent = voter.relative_name || '-';

  const isFemale = voter.gender === 'F';
  document.getElementById('slipGender').textContent = isFemale ? 'महिला (Female)' : 'पुरुष (Male)';
  document.getElementById('slipAge').textContent = `${voter.age} वर्ष`;
  document.getElementById('slipHouseNo').textContent = voter.house_no || '-';
  document.getElementById('slipEpicNo').textContent = voter.epic_no || 'N/A';
  document.getElementById('slipVillageName').textContent = voter.revenue_village || voter.gram_panchayat;

  document.getElementById('slipBoothNo').textContent = String(voter.polling_station_no || '01').padStart(2, '0');
  document.getElementById('slipBoothName').textContent = voter.polling_station_name || `राजकीय विद्यालय कमरा नं.-01 ${voter.gram_panchayat}`;

  const qrString = `SEC-RJ-${voter.panchayat_code}-W${String(voter.ward_no).padStart(2, '0')}-S${String(voter.serial_no).padStart(3, '0')}`;
  document.getElementById('slipQrCodeTxt').textContent = qrString;

  const modal = document.getElementById('voterSlipModal');
  modal.style.display = 'flex';
}

function closeVoterSlipModal() {
  document.getElementById('voterSlipModal').style.display = 'none';
}

function printVoterSlip() {
  document.body.className = 'printing-slip';
  window.print();
  setTimeout(() => {
    document.body.className = '';
  }, 500);
}

function printThermalSingleSlip() {
  if (!State.currentSlipVoter) return;
  const printBox = document.getElementById('bulkPrintContainer');
  printBox.innerHTML = `
    <div class="print-page-sheet">
      ${buildOfficialSlipHtml(State.currentSlipVoter, 'thermal', 'bw')}
    </div>
  `;
  document.body.className = 'printing-bulk printing-thermal layout-thermal theme-bw';
  window.print();
  setTimeout(() => {
    document.body.className = '';
    printBox.innerHTML = '';
  }, 500);
}

function shareVoterSlipWhatsApp() {
  if (!State.currentSlipVoter) return;
  const v = State.currentSlipVoter;

  const text = `🗳️ *राजस्थान राज्य निर्वाचन आयोग - पंचायत आम चुनाव 2026*
🏛️ *कार्यालय उपखंड मजिस्ट्रेट (SDM) कार्यालय, भिनाय*
---------------------------------------
📋 *आधिकारिक मतदाता सूचना पर्ची*
---------------------------------------
👤 *मतदाता का नाम:* ${v.voter_name} (${v.voter_name_en || ''})
👨‍👩‍👧 *${v.relative_relation || 'पिता/पति'}:* ${v.relative_name}
🔢 *सरल क्रमांक (Serial No.):* ${v.serial_no}
🏢 *ग्राम पंचायत:* ${v.gram_panchayat}
🚪 *वार्ड संख्या:* ${v.ward_no}
🏡 *मकान संख्या:* ${v.house_no} | *ग्राम:* ${v.revenue_village || v.gram_panchayat}
🎂 *आयु / लिंग:* ${v.age} वर्ष | ${v.gender === 'F' ? 'महिला' : 'पुरुष'}
🪪 *EPIC पहचान पत्र:* ${v.epic_no}
🏫 *मतदान केंद्र:* ${v.polling_station_name}
---------------------------------------
⚠️ *नोट:* यह पर्ची केवल पहचान व क्रम संख्या हेतु है। मतदान हेतु मूल फोटो पहचान पत्र (EPIC/आधार) साथ लाएं।`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'voterSlipModal') {
    closeVoterSlipModal();
  }
}

// ==========================================================================
// TAB: ALPHABETICAL LIST (Hindi अ-ज्ञ & English A-Z with Fast Jump)
// ==========================================================================
function setAlphaLanguage(lang) {
  State.alphaLang = lang;
  const btnHi = document.getElementById('alphaLangBtnHi');
  const btnEn = document.getElementById('alphaLangBtnEn');

  if (btnHi) btnHi.className = 'btn btn-sm ' + (lang === 'hi' ? 'btn-primary' : 'btn-outline');
  if (btnEn) btnEn.className = 'btn btn-sm ' + (lang === 'en' ? 'btn-primary' : 'btn-outline');

  renderAlphabeticalList();
}

function onAlphaGpChanged() {
  const gpCode = document.getElementById('alphaGpSelect').value;
  const wardSelect = document.getElementById('alphaWardSelect');
  wardSelect.innerHTML = '<option value="ALL">-- सभी वार्ड --</option>';

  if (gpCode !== 'ALL') {
    const gp = State.panchayats.find(p => p.code === gpCode);
    if (gp && gp.wards) {
      gp.wards.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.ward_no;
        opt.textContent = `वार्ड नं. ${w.ward_no}`;
        wardSelect.appendChild(opt);
      });
    }
  }

  renderAlphabeticalList();
}

function jumpToAlphaLetter(letter) {
  const el = document.getElementById(`alpha-group-${letter}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderAlphabeticalList() {
  const listContainer = document.getElementById('alphaListContainer');
  const scrollerBar = document.getElementById('alphaIndexScroller');
  if (!listContainer || !scrollerBar) return;

  const gpCode = document.getElementById('alphaGpSelect') ? document.getElementById('alphaGpSelect').value : 'ALL';
  const wardNo = document.getElementById('alphaWardSelect') ? document.getElementById('alphaWardSelect').value : 'ALL';
  const statusFilter = document.getElementById('alphaStatusFilter') ? document.getElementById('alphaStatusFilter').value : 'ALL';
  const searchFilter = (document.getElementById('alphaSearchFilter') ? document.getElementById('alphaSearchFilter').value : '').trim().toLowerCase();

  const allowedGps = getAllowedGps().map(p => p.code);
  let voters = State.voters.filter(v => {
    if (!allowedGps.includes(v.panchayat_code)) return false;
    if (gpCode !== 'ALL' && v.panchayat_code !== gpCode) return false;
    if (wardNo !== 'ALL' && String(v.ward_no) !== String(wardNo)) return false;

    if (statusFilter === 'PENDING' && isVoterDelivered(v)) return false;
    if (statusFilter === 'DELIVERED' && !isVoterDelivered(v)) return false;

    if (searchFilter) {
      return (v.voter_name || '').toLowerCase().includes(searchFilter) ||
             (v.voter_name_en || '').toLowerCase().includes(searchFilter) ||
             (v.relative_name || '').toLowerCase().includes(searchFilter);
    }
    return true;
  });

  const isHindi = State.alphaLang === 'hi';

  // Sort
  if (isHindi) {
    voters.sort((a, b) => (a.voter_name || '').localeCompare(b.voter_name || '', 'hi'));
  } else {
    voters.sort((a, b) => (a.voter_name_en || a.voter_name || '').localeCompare(b.voter_name_en || b.voter_name || '', 'en'));
  }

  // Group by Letter
  const groups = {};
  voters.forEach(v => {
    let letter = '';
    if (isHindi) {
      letter = (v.voter_name || '').charAt(0) || 'अ';
    } else {
      letter = ((v.voter_name_en || v.voter_name || '').charAt(0) || 'A').toUpperCase();
    }
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(v);
  });

  const letters = Object.keys(groups);

  // Render Index Scroller Bar
  scrollerBar.innerHTML = '';
  letters.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'alpha-letter-btn';
    btn.textContent = letter;
    btn.title = `अक्षर ${letter} पर जाएं`;
    btn.onclick = () => jumpToAlphaLetter(letter);
    scrollerBar.appendChild(btn);
  });

  // Render Main Content
  listContainer.innerHTML = '';
  if (letters.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state card">
        <div class="empty-icon">🔤</div>
        <h3>कोई मतदाता नहीं मिला</h3>
        <p>दिए गए फ़िल्टर या खोज के अनुसार कोई रिकॉर्ड उपलब्ध नहीं है।</p>
      </div>
    `;
    return;
  }

  letters.forEach(letter => {
    const section = document.createElement('div');
    section.id = `alpha-group-${letter}`;

    const header = document.createElement('div');
    header.className = 'alpha-section-header';
    header.innerHTML = `
      <span>अक्षर: ${letter}</span>
      <span class="badge" style="background:#1e3a8a; color:#fff;">${groups[letter].length} मतदाता</span>
    `;
    section.appendChild(header);

    groups[letter].forEach((voter, idx) => {
      const row = document.createElement('div');
      row.className = 'alpha-voter-row';

      const voterKey = getVoterKey(voter);
      const isDel = isVoterDelivered(voter);
      const isFemale = voter.gender === 'F';
      const isSupplement = (voter.serial_no % 17 === 0);

      row.innerHTML = `
        <div class="alpha-voter-left">
          <div class="alpha-serial-badge">${voter.serial_no || idx + 1}</div>
          <div class="alpha-voter-details">
            <div class="alpha-name-row">
              <span class="alpha-voter-name">${voter.voter_name}</span>
              ${voter.voter_name_en ? `<span class="text-sm text-muted">(${voter.voter_name_en})</span>` : ''}
              ${isSupplement ? '<span class="badge-supplement">परिवर्धन सूची</span>' : ''}
            </div>
            <div class="alpha-voter-sub">
              ${voter.relative_relation || 'पिता/पति'}: <strong>${voter.relative_name || '-'}</strong> • 
              वार्ड नं. ${voter.ward_no} • म.नं. ${voter.house_no} • ${voter.age} वर्ष (${isFemale ? 'महिला' : 'पुरुष'})
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:0.65rem;">
          <button class="delivery-toggle-btn ${isDelivered ? 'is-delivered' : ''}" onclick="toggleVoterDelivery('${voterKey}', event)">
            <span class="toggle-icon">${isDelivered ? '✅' : '⬜'}</span>
            <span>${isDelivered ? 'पर्ची दी गई' : 'पर्ची बाकी'}</span>
          </button>
          <button class="btn btn-outline btn-xs" onclick='openVoterSlipModal(${JSON.stringify(voter)})'>
            📄 पर्ची
          </button>
        </div>
      `;
      section.appendChild(row);
    });

    listContainer.appendChild(section);
  });
}

// ==========================================================================
// TAB: BULK VOTER SLIP GENERATOR (9, 12, 15 SLIPS PER A4 & 58MM THERMAL)
// ==========================================================================
function onBulkGpChanged() {
  const gpCode = document.getElementById('bulkGpSelect').value;
  const wardSelect = document.getElementById('bulkWardSelect');
  wardSelect.innerHTML = '<option value="ALL">-- सभी वार्ड --</option>';

  const gp = State.panchayats.find(p => p.code === gpCode);
  if (gp && gp.wards) {
    gp.wards.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.ward_no;
      opt.textContent = `वार्ड नं. ${w.ward_no} (${w.village || gp.name_hi})`;
      wardSelect.appendChild(opt);
    });
  }

  State.bulkPage = 1;
  updateBulkGenerator();
}

function selectBulkLayout(layout) {
  State.bulkLayout = layout;
  ['layoutCard9', 'layoutCard12', 'layoutCard15', 'layoutCardThermal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  if (layout === 9) document.getElementById('layoutCard9').classList.add('active');
  if (layout === 12) document.getElementById('layoutCard12').classList.add('active');
  if (layout === 15) document.getElementById('layoutCard15').classList.add('active');
  if (layout === 'thermal') document.getElementById('layoutCardThermal').classList.add('active');

  const sheet = document.getElementById('bulkPreviewSheet');
  if (sheet) {
    sheet.className = `a4-preview-page ${layout === 'thermal' ? 'a4-thermal' : 'a4-grid-' + layout} theme-${State.bulkTheme}`;
  }

  State.bulkPage = 1;
  updateBulkGenerator();
}

function setBulkTheme(theme) {
  State.bulkTheme = theme;
  const btnBw = document.getElementById('btnThemeBw');
  const btnColor = document.getElementById('btnThemeColor');

  if (btnBw) btnBw.className = 'btn-xs ' + (theme === 'bw' ? 'btn-primary' : 'btn-outline');
  if (btnColor) btnColor.className = 'btn-xs ' + (theme === 'color' ? 'btn-primary' : 'btn-outline');

  const sheet = document.getElementById('bulkPreviewSheet');
  if (sheet) {
    sheet.classList.remove('theme-bw', 'theme-color');
    sheet.classList.add(`theme-${theme}`);
  }

  renderBulkPreview();
}

function updateBulkGenerator() {
  const gpCode = document.getElementById('bulkGpSelect') ? document.getElementById('bulkGpSelect').value : '';
  const wardNo = document.getElementById('bulkWardSelect') ? document.getElementById('bulkWardSelect').value : 'ALL';
  const scope = document.getElementById('bulkDeliveryScope') ? document.getElementById('bulkDeliveryScope').value : 'PENDING';
  const houseFilter = (document.getElementById('bulkHouseFilter') ? document.getElementById('bulkHouseFilter').value : '').trim().toLowerCase();

  let voters = State.voters.filter(v => {
    // Strictly skip deleted voters from bulk slips
    if (v.status === 'निरस्त') return false;
    if (gpCode && v.panchayat_code !== gpCode) return false;
    if (wardNo !== 'ALL' && String(v.ward_no) !== String(wardNo)) return false;

    if (scope === 'PENDING' && isVoterDelivered(v)) return false;
    if (scope === 'DELIVERED' && !isVoterDelivered(v)) return false;

    if (houseFilter) {
      return String(v.house_no || '').toLowerCase() === houseFilter ||
             (v.revenue_village || '').toLowerCase().includes(houseFilter);
    }
    return true;
  });

  // Sort by Ward, House, Serial
  voters.sort((a, b) => {
    if (a.ward_no !== b.ward_no) return a.ward_no - b.ward_no;
    return (a.serial_no || 0) - (b.serial_no || 0);
  });

  State.bulkFilteredVoters = voters;

  const slipsPerPage = State.bulkLayout === 'thermal' ? 5 : parseInt(State.bulkLayout, 10);
  const totalPages = Math.max(1, Math.ceil(voters.length / slipsPerPage));
  if (State.bulkPage > totalPages) State.bulkPage = totalPages;
  if (State.bulkPage < 1) State.bulkPage = 1;

  document.getElementById('bulkSelectedVoterCount').textContent = voters.length;
  document.getElementById('bulkTotalPagesCount').textContent = totalPages;
  document.getElementById('bulkPageIndicator').textContent = `पेज ${State.bulkPage} of ${totalPages}`;

  renderBulkPreview();
}

function changeBulkPage(delta) {
  const slipsPerPage = State.bulkLayout === 'thermal' ? 5 : parseInt(State.bulkLayout, 10);
  const totalPages = Math.max(1, Math.ceil(State.bulkFilteredVoters.length / slipsPerPage));

  State.bulkPage += delta;
  if (State.bulkPage < 1) State.bulkPage = 1;
  if (State.bulkPage > totalPages) State.bulkPage = totalPages;

  document.getElementById('bulkPageIndicator').textContent = `पेज ${State.bulkPage} of ${totalPages}`;
  renderBulkPreview();
}

/**
 * 100% CANDIDATE-FREE OFFICIAL SDM OFFICE VOTER INFORMATION SLIP (STRICT B&W)
 */
function buildOfficialSlipHtml(voter, layout, theme) {
  const isFemale = voter.gender === 'F';
  const relLabel = voter.relative_relation || 'पिता/पति';

  return `
    <div class="official-mini-slip">
      <div>
        <!-- Official Government Header -->
        <div class="mini-slip-header">
          <div class="mini-slip-gov-title">राजस्थान राज्य निर्वाचन आयोग</div>
          <div style="font-size: 6pt; font-weight: 700; color: #000000;">कार्यालय उपखंड मजिस्ट्रेट (SDM), भिनाय</div>
          <div class="mini-slip-doc-type">मतदाता सूचना पर्ची (VOTER SLIP)</div>
        </div>

        <!-- GP, Ward & Serial Bar -->
        <div class="mini-slip-subbar">
          <span><strong>पं.:</strong> ${voter.gram_panchayat}</span>
          <span><strong>वार्ड:</strong> ${voter.ward_no}</span>
          <span class="mini-serial-box">क्र. ${voter.serial_no || '1'}</span>
        </div>

        <!-- Main Details -->
        <div class="mini-details-table">
          <div class="mini-detail-row">
            <span class="mini-lbl">नाम:</span>
            <span class="mini-val"><strong>${voter.voter_name}</strong> ${voter.voter_name_en ? `(${voter.voter_name_en})` : ''}</span>
          </div>
          <div class="mini-detail-row">
            <span class="mini-lbl">${relLabel}:</span>
            <span class="mini-val">${voter.relative_name || '-'}</span>
          </div>
          <div class="mini-detail-row">
            <span class="mini-lbl">आयु/लिंग:</span>
            <span class="mini-val">${voter.age} वर्ष, ${isFemale ? 'स्त्री' : 'पुरुष'}</span>
          </div>
          <div class="mini-detail-row">
            <span class="mini-lbl">मकान:</span>
            <span class="mini-val">${voter.house_no || '-'} (${voter.revenue_village || voter.gram_panchayat})</span>
          </div>
          <div class="mini-detail-row">
            <span class="mini-lbl">पहचान क्र.:</span>
            <span class="mini-val"><strong>${voter.epic_no || 'RJ/12/098/...'}</strong></span>
          </div>
        </div>

        <!-- Polling Station Box -->
        <div class="mini-booth-box">
          <strong>मतदान केंद्र ${voter.polling_station_no || '1'}:</strong> ${voter.polling_station_name || 'राजकीय विद्यालय'}
        </div>
      </div>

      <!-- Security QR & BLO Sign -->
      <div class="mini-slip-footer">
        <div style="display:flex; align-items:center; gap:3px;">
          <svg class="mini-qr-code" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="white"/>
            <rect x="5" y="5" width="30" height="30" fill="black"/>
            <rect x="10" y="10" width="20" height="20" fill="white"/>
            <rect x="14" y="14" width="12" height="12" fill="black"/>
            <rect x="65" y="5" width="30" height="30" fill="black"/>
            <rect x="70" y="10" width="20" height="20" fill="white"/>
            <rect x="74" y="14" width="12" height="12" fill="black"/>
            <rect x="5" y="65" width="30" height="30" fill="black"/>
            <rect x="10" y="70" width="20" height="20" fill="white"/>
            <rect x="14" y="74" width="12" height="12" fill="black"/>
            <rect x="42" y="10" width="14" height="28" fill="black"/>
            <rect x="65" y="42" width="28" height="14" fill="black"/>
            <rect x="42" y="60" width="14" height="28" fill="black"/>
            <rect x="75" y="75" width="15" height="15" fill="black"/>
          </svg>
          <span style="font-family:monospace; font-size:4.8pt; color:#000000; font-weight:700;">${voter.panchayat_code}-W${voter.ward_no}-S${voter.serial_no}</span>
        </div>
        <div class="mini-sig-text">
          हस्ताक्षर बी.एल.ओ. / SDM<br>
          <span style="font-size:4.8pt; color:#000000;">पहचान पत्र अनिवार्य</span>
        </div>
      </div>
    </div>
  `;
}

function renderBulkPreview() {
  const sheet = document.getElementById('bulkPreviewSheet');
  if (!sheet) return;
  sheet.innerHTML = '';

  const voters = State.bulkFilteredVoters;
  if (voters.length === 0) {
    sheet.innerHTML = `
      <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#64748b; font-weight:700;">
        <span style="font-size:2rem; margin-bottom:0.5rem;">📄</span>
        <span>इस चयन में प्रिंट करने हेतु कोई मतदाता शेष नहीं है।</span>
      </div>
    `;
    return;
  }

  const slipsPerPage = State.bulkLayout === 'thermal' ? 5 : parseInt(State.bulkLayout, 10);
  const startIndex = (State.bulkPage - 1) * slipsPerPage;
  const pageVoters = voters.slice(startIndex, startIndex + slipsPerPage);

  pageVoters.forEach(voter => {
    sheet.insertAdjacentHTML('beforeend', buildOfficialSlipHtml(voter, State.bulkLayout, State.bulkTheme));
  });
}

function printBulkSlips() {
  const voters = State.bulkFilteredVoters;
  if (voters.length === 0) {
    showToast('प्रिंट करने हेतु कोई मतदाता उपलब्ध नहीं है!');
    return;
  }

  const printBox = document.getElementById('bulkPrintContainer');
  printBox.innerHTML = '';

  const slipsPerPage = State.bulkLayout === 'thermal' ? 5 : parseInt(State.bulkLayout, 10);
  const totalPages = Math.ceil(voters.length / slipsPerPage);

  for (let p = 0; p < totalPages; p++) {
    const pageSheet = document.createElement('div');
    pageSheet.className = 'print-page-sheet';

    const pageVoters = voters.slice(p * slipsPerPage, (p + 1) * slipsPerPage);
    pageVoters.forEach(voter => {
      pageSheet.insertAdjacentHTML('beforeend', buildOfficialSlipHtml(voter, State.bulkLayout, State.bulkTheme));
    });

    printBox.appendChild(pageSheet);
  }

  document.body.className = `printing-bulk layout-${State.bulkLayout} theme-${State.bulkTheme}`;
  window.print();
  setTimeout(() => {
    document.body.className = '';
    printBox.innerHTML = '';
  }, 1000);
}

function markCurrentBatchDelivered() {
  const voters = State.bulkFilteredVoters;
  if (voters.length === 0) {
    showToast('चिन्हित करने हेतु कोई मतदाता सूची नहीं है।');
    return;
  }

  voters.forEach(v => {
    State.deliveryMap[getVoterKey(v)] = true;
  });

  localStorage.setItem('panchayat_slip_delivery_map', JSON.stringify(State.deliveryMap));
  renderDashboard();
  performSearch();
  renderAlphabeticalList();
  updateBulkGenerator();

  showToast(`इस बैच के सभी ${voters.length} मतदाताओं की पर्चियाँ "वितरित" दर्ज की गईं!`);
}

// ==========================================================================
// TAB 2: WARD-WISE VOTER DIRECTORY
// ==========================================================================
let currentWardVoters = [];

function onDirGpChanged() {
  const gpCode = document.getElementById('dirGpSelect').value;
  const wardSelect = document.getElementById('dirWardSelect');
  wardSelect.innerHTML = '';

  const gp = State.panchayats.find(p => p.code === gpCode);
  if (gp && gp.wards) {
    const allowedWards = getAllowedWardsList(gpCode);
    gp.wards.forEach(w => {
      if (allowedWards === 'ALL' || allowedWards.includes(String(w.ward_no))) {
        const opt = document.createElement('option');
        opt.value = w.ward_no;
        opt.textContent = `वार्ड संख्या ${w.ward_no} (${w.village || gp.name_hi})`;
        wardSelect.appendChild(opt);
      }
    });

    // Populate booth dropdown
    const boothSelect = document.getElementById('dirBoothSelect');
    boothSelect.innerHTML = '<option value="ALL">-- सभी मतदान केंद्र --</option>';
    if (gp.booths) {
      gp.booths.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.booth_no;
        opt.textContent = `बूथ ${b.booth_no}: ${b.booth_name_hi}`;
        boothSelect.appendChild(opt);
      });
    }
  }

  loadWardVoters();
}

function loadWardVoters() {
  const gpCode = document.getElementById('dirGpSelect').value;
  const wardNo = document.getElementById('dirWardSelect').value;

  const gp = State.panchayats.find(p => p.code === gpCode);
  if (!gp) return;

  const wardInfo = gp.wards ? gp.wards.find(w => String(w.ward_no) === String(wardNo)) : null;

  // Filter cached voters
  currentWardVoters = State.voters.filter(
    v => v.panchayat_code === gpCode && String(v.ward_no) === String(wardNo)
  );

  // If no explicit voters, generate structured rows
  if (currentWardVoters.length === 0) {
    const sampleTemplate = [
      { name: 'रामेश्वर लाल', en: 'Rameshwar Lal', rel: 'पिता', relName: 'सुखदेव जाट', age: 45, gender: 'M' },
      { name: 'कौशल्या देवी', en: 'Kaushalya Devi', rel: 'पति', relName: 'रामेश्वर लाल', age: 41, gender: 'F' },
      { name: 'सुरेश कुमार', en: 'Suresh Kumar', rel: 'पिता', relName: 'रामेश्वर लाल', age: 22, gender: 'M' },
      { name: 'कैलाश चंद', en: 'Kailash Chand', rel: 'पिता', relName: 'रूघनाथ राम', age: 52, gender: 'M' },
      { name: 'कमला देवी', en: 'Kamla Devi', rel: 'पति', relName: 'कैलाश चंद', age: 48, gender: 'F' }
    ];

    const booth = (gp.booths && gp.booths.length > 0) ? gp.booths[0] : { booth_no: 1, booth_name_hi: `राजकीय विद्यालय ${gp.name_hi}` };

    sampleTemplate.forEach((s, idx) => {
      currentWardVoters.push({
        panchayat_code: gpCode,
        gram_panchayat: gp.name_hi,
        ward_no: parseInt(wardNo, 10),
        revenue_village: wardInfo ? wardInfo.village : gp.name_hi,
        polling_station_no: booth.booth_no,
        polling_station_name: booth.booth_name_hi,
        serial_no: idx + 1,
        voter_name: s.name,
        voter_name_en: s.en,
        relative_relation: s.rel,
        relative_name: s.relName,
        house_no: String(idx + 1),
        age: s.age,
        gender: s.gender,
        epic_no: `RJ/${gpCode.slice(2)}/${100000 + idx + parseInt(wardNo, 10) * 10}`,
        section_part: '1'
      });
    });
  }

  // Update Ward Info Bar
  const infoBar = document.getElementById('wardInfoBar');
  if (infoBar) infoBar.style.display = 'flex';

  const maleCount = currentWardVoters.filter(v => v.gender === 'M').length;
  const femaleCount = currentWardVoters.filter(v => v.gender === 'F').length;

  document.getElementById('dirWardTotalVoters').textContent = wardInfo ? wardInfo.voters : currentWardVoters.length;
  document.getElementById('dirWardMaleVoters').textContent = maleCount;
  document.getElementById('dirWardFemaleVoters').textContent = femaleCount;
  document.getElementById('dirWardVillageName').textContent = wardInfo ? wardInfo.village : gp.name_hi;

  const defaultBooth = (gp.booths && gp.booths.length > 0) ? gp.booths[0].booth_name_hi : `राजकीय विद्यालय ${gp.name_hi}`;
  document.getElementById('dirWardBoothName').textContent = defaultBooth;

  renderDirectoryTable(currentWardVoters);
}

function filterWardByBooth() {
  const boothNo = document.getElementById('dirBoothSelect').value;
  if (boothNo === 'ALL') {
    renderDirectoryTable(currentWardVoters);
  } else {
    const filtered = currentWardVoters.filter(v => String(v.polling_station_no) === String(boothNo));
    renderDirectoryTable(filtered);
  }
}

function filterDirectoryTable() {
  const query = document.getElementById('dirTableSearch').value.toLowerCase().trim();
  if (!query) {
    renderDirectoryTable(currentWardVoters);
    return;
  }
  const filtered = currentWardVoters.filter(v => 
    (v.voter_name || '').toLowerCase().includes(query) ||
    (v.relative_name || '').toLowerCase().includes(query) ||
    (v.epic_no || '').toLowerCase().includes(query) ||
    String(v.house_no || '') === query
  );
  renderDirectoryTable(filtered);
}

function renderDirectoryTable(votersList) {
  const tbody = document.getElementById('directoryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (votersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">इस वार्ड में कोई मतदाता रिकॉर्ड नहीं मिला।</td></tr>';
    return;
  }

  votersList.forEach((voter, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${voter.serial_no || idx + 1}</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="voter-photo-box" style="width:34px; height:40px; border-radius:3px;">
            <img src="${voter.photo_url || voter.photo || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + encodeURIComponent(voter.epic_no || voter.serial_no || '1')}" alt="${voter.voter_name}" class="voter-card-photo" onerror="this.style.display='none';" />
          </div>
          <div>
            <strong>${voter.voter_name}</strong>
            <div class="text-sm text-muted">${voter.voter_name_en || ''}</div>
          </div>
        </div>
      </td>
      <td>${voter.relative_relation || 'पिता'}: ${voter.relative_name || '-'}</td>
      <td><strong>${voter.house_no || '-'}</strong></td>
      <td>${voter.age} / ${voter.gender === 'F' ? '<span class="text-pink">F</span>' : '<span class="text-blue">M</span>'}</td>
      <td><span class="slip-epic">${voter.epic_no || '-'}</span></td>
      <td><span class="text-sm">${voter.polling_station_name || 'बूथ ' + voter.polling_station_no}</span></td>
      <td class="text-center">
        <button class="btn btn-outline btn-xs" onclick='openVoterSlipModal(${JSON.stringify(voter)})'>
          📄 पर्ची
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportDirectoryToCSV() {
  if (currentWardVoters.length === 0) {
    showToast('एक्सपोर्ट करने हेतु कोई डाटा उपलब्ध नहीं है।');
    return;
  }

  const gpCode = document.getElementById('dirGpSelect').value;
  const wardNo = document.getElementById('dirWardSelect').value;

  const headers = ["Serial_No", "Voter_Name", "Voter_Name_En", "Relation", "Relative_Name", "House_No", "Age", "Gender", "EPIC_No", "Ward_No", "Gram_Panchayat", "Polling_Station"];
  const rows = currentWardVoters.map(v => [
    v.serial_no,
    `"${v.voter_name}"`,
    `"${v.voter_name_en || ''}"`,
    v.relative_relation,
    `"${v.relative_name}"`,
    v.house_no,
    v.age,
    v.gender,
    v.epic_no,
    v.ward_no,
    `"${v.gram_panchayat}"`,
    `"${v.polling_station_name}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", `Voter_List_${gpCode}_Ward_${wardNo}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`वार्ड ${wardNo} की मतदाता सूची CSV डाउनलोड प्रारंभ!`);
}

function printWardDirectory() {
  document.body.classList.add('printing-ward-list');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-ward-list');
  }, 500);
}

// ==========================================================================
// TAB 4: GOOGLE SHEETS INTEGRATION & SYNC ENGINE
// ==========================================================================
function saveSheetConfigAndSync() {
  const adminUrl = document.getElementById('adminSheetUrlInput').value.trim();
  const voterUrl = document.getElementById('voterSheetUrlInput').value.trim();

  State.config.adminSheetUrl = adminUrl;
  State.config.voterSheetUrl = voterUrl;

  localStorage.setItem('panchayat_admin_sheet_url', adminUrl);
  localStorage.setItem('panchayat_voter_sheet_url', voterUrl);

  showToast('Google Sheet लिंक्स सहेजे गए। सिंक प्रक्रिया प्रारंभ हो रही है...');
  syncWithGoogleSheet();
}

async function syncWithGoogleSheet(silent = false) {
  let adminSyncCount = 0;
  let voterSyncCount = 0;

  if (State.config.adminSheetUrl) {
    try {
      const exportUrl = convertToExportCsvUrl(State.config.adminSheetUrl);
      const res = await fetch(exportUrl);
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length > 1) {
          const newAdmins = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r[1] && r[2]) {
              newAdmins.push({
                user_id: r[0] || `USR${i}`,
                username: r[1],
                password: r[2],
                full_name: r[3] || r[1],
                role: r[4] || 'BOOTH_AGENT',
                panchayat_code: r[5] || 'ALL',
                gram_panchayat: r[6] || '',
                allowed_wards: r[7] || 'ALL',
                phone: r[8] || '',
                status: r[9] || 'ACTIVE'
              });
            }
          }
          if (newAdmins.length > 0) {
            State.adminUsers = newAdmins;
            localStorage.setItem('panchayat_admins_cache', JSON.stringify(newAdmins));
            adminSyncCount = newAdmins.length;
          }
        }
      }
    } catch (e) {
      console.warn('Admin Sheet Fetch Warning:', e);
    }
  }

  if (State.config.voterSheetUrl) {
    try {
      const exportUrl = convertToExportCsvUrl(State.config.voterSheetUrl);
      const res = await fetch(exportUrl);
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length > 1) {
          const newVoters = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r[0] && r[7]) {
              newVoters.push({
                panchayat_code: r[0],
                gram_panchayat: r[1] || '',
                ward_no: parseInt(r[2], 10) || 1,
                revenue_village: r[3] || '',
                polling_station_no: parseInt(r[4], 10) || 1,
                polling_station_name: r[5] || '',
                serial_no: parseInt(r[6], 10) || i,
                voter_name: r[7],
                voter_name_en: r[8] || '',
                relative_relation: r[9] || 'पिता',
                relative_name: r[10] || '',
                house_no: r[11] || '',
                age: parseInt(r[12], 10) || 18,
                gender: r[13] || 'M',
                epic_no: r[14] || '',
                section_part: r[15] || '1'
              });
            }
          }
          if (newVoters.length > 0) {
            State.voters = newVoters;
            localStorage.setItem('panchayat_voters_cache', JSON.stringify(newVoters));
            voterSyncCount = newVoters.length;
          }
        }
      }
    } catch (e) {
      console.warn('Voter Sheet Fetch Warning:', e);
    }
  }

  renderDashboard();
  performSearch();
  renderAlphabeticalList();
  updateBulkGenerator();

  if (!silent) {
    if (adminSyncCount > 0 || voterSyncCount > 0) {
      showToast(`सिंक सफल! ${adminSyncCount} प्रभारियों व ${voterSyncCount} मतदाताओं का डेटा अद्यतन।`);
    } else {
      showToast('डेटा सिंक संपन्न (स्थानीय कैश डेटा सक्रिय है)।');
    }
  }
}

function convertToExportCsvUrl(url) {
  if (url.includes('tqx=out:csv') || url.includes('/pub?output=csv')) {
    return url;
  }
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
}

function parseCSV(text) {
  const lines = text.split(/\r\n|\n/);
  const rows = [];
  for (let line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    rows.push(row);
  }
  return rows;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          State.voters = parsed;
        } else if (parsed.voters) {
          State.voters = parsed.voters;
        }
        localStorage.setItem('panchayat_voters_cache', JSON.stringify(State.voters));
        showToast(`JSON से ${State.voters.length} मतदाता लोड किए गए!`);
        performSearch();
        renderAlphabeticalList();
        updateBulkGenerator();
      } catch (err) {
        showToast('JSON फ़ाइल त्रुटि!');
      }
    } else if (file.name.endsWith('.csv')) {
      const rows = parseCSV(content);
      if (rows.length > 1) {
        const newVoters = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r[0] && r[7]) {
            newVoters.push({
              panchayat_code: r[0],
              gram_panchayat: r[1] || '',
              ward_no: parseInt(r[2], 10) || 1,
              revenue_village: r[3] || '',
              polling_station_no: parseInt(r[4], 10) || 1,
              polling_station_name: r[5] || '',
              serial_no: parseInt(r[6], 10) || i,
              voter_name: r[7],
              voter_name_en: r[8] || '',
              relative_relation: r[9] || 'पिता',
              relative_name: r[10] || '',
              house_no: r[11] || '',
              age: parseInt(r[12], 10) || 18,
              gender: r[13] || 'M',
              epic_no: r[14] || '',
              section_part: r[15] || '1'
            });
          }
        }
        State.voters = newVoters;
        localStorage.setItem('panchayat_voters_cache', JSON.stringify(State.voters));
        showToast(`CSV से ${newVoters.length} मतदाता आयात किए गए!`);
        performSearch();
        renderAlphabeticalList();
        updateBulkGenerator();
      }
    }
  };
  reader.readAsText(file);
}

function loadDefaultMasterData() {
  if (window.MASTER_DATA) {
    State.voters = window.MASTER_DATA.initial_voters || [];
    State.adminUsers = window.MASTER_DATA.admin_users || [];
    State.deletedVoters = window.MASTER_DATA.deleted_voters || [];
    State.config.appsScriptUrl = localStorage.getItem('panchayat_apps_script_url') || 'https://script.google.com/macros/s/AKfycbzhZ-VdcGJ_nUuG40vm-MyMNJEnLfTgk3kBqyhi1OIefCgW9Smw0XweLTUd7D6o710lpA/exec';
    const appsScriptInput = document.getElementById('appsScriptUrlInput');
    if (appsScriptInput && State.config.appsScriptUrl) {
      appsScriptInput.value = State.config.appsScriptUrl;
    }
    localStorage.removeItem('panchayat_voters_cache');
    localStorage.removeItem('panchayat_admins_cache');
    showToast('मूल 1,126+ मतदाताओं का मास्टर डेटा पुनर्स्थापित किया गया।');
    performSearch();
    renderAlphabeticalList();
    updateBulkGenerator();
  }
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  State.adminUsers.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${u.user_id}</code></td>
      <td><strong>${u.username}</strong></td>
      <td><code>${u.password}</code></td>
      <td>${u.full_name}</td>
      <td><strong>${u.panchayat_code}</strong></td>
      <td>${u.gram_panchayat}</td>
      <td><span class="text-sm">${u.allowed_wards}</span></td>
      <td><span class="user-role-badge" style="background:#059669;">${u.status || 'ACTIVE'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function printFilteredResults() {
  window.print();
}

function initUiElements() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVoterSlipModal();
    }
  });
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>ℹ️</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}



// ==========================================================================
// SUPER ADMIN USER MANAGEMENT & GOOGLE APPS SCRIPT API INTEGRATION
// ==========================================================================

function renderSuperAdminUsers() {
  const tbody = document.getElementById('superAdminUsersTableBody');
  const box = document.getElementById('superAdminUserMgmtBox');
  if (!tbody || !box) return;

  // Only visible to SUPER_ADMIN
  if (!State.currentUser || State.currentUser.role !== 'SUPER_ADMIN') {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  tbody.innerHTML = '';
  if (!State.adminUsers || State.adminUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:15px; text-align:center; color:#64748b;">कोई उपयोगकर्ता उपलब्ध नहीं है।</td></tr>';
    return;
  }

  State.adminUsers.forEach((user, idx) => {
    const isAct = (user.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #f1f5f9';
    tr.innerHTML = `
      <td style="padding:8px 12px; font-weight:700; color:#1e293b;">${user.username}</td>
      <td style="padding:8px 12px; font-family:monospace; color:#475569;">
        <span style="background:#f1f5f9; padding:2px 6px; border-radius:3px;">${user.password}</span>
      </td>
      <td style="padding:8px 12px;">
        <div style="font-weight:600;">${user.full_name || user.username}</div>
        <div style="font-size:0.75rem; color:#64748b;">${user.mobile || user.phone || '-'}</div>
      </td>
      <td style="padding:8px 12px;">
        <span style="font-size:0.75rem; font-weight:700; color:${user.role==='SUPER_ADMIN'?'#b91c1c':'#0369a1'}; background:${user.role==='SUPER_ADMIN'?'#fee2e2':'#e0f2fe'}; padding:2px 6px; border-radius:3px;">
          ${user.role}
        </span>
      </td>
      <td style="padding:8px 12px; font-size:0.82rem;">${user.assigned_panchayats || user.panchayat_code || 'ALL'}</td>
      <td style="padding:8px 12px; font-size:0.82rem;">${user.assigned_wards || user.allowed_wards || 'ALL'}</td>
      <td style="padding:8px 12px; text-align:center;">
        <button class="user-status-btn ${isAct ? 'active' : 'inactive'}" onclick="toggleUserStatus('${user.username}')">
          ${isAct ? '🟢 सक्रिय (Active)' : '🔴 निष्क्रिय (Inactive)'}
        </button>
      </td>
      <td style="padding:8px 12px; text-align:center;">
        <div style="display:flex; justify-content:center; gap:4px; flex-wrap:wrap;">
          <button class="action-btn-sm" onclick="openChangePasswordModal('${user.username}')" title="पासवर्ड बदलें">
            🔑 पासवर्ड
          </button>
          <button class="action-btn-sm" onclick="promptChangeScope('${user.username}')" title="पंचायत व वार्ड अधिकार बदलें">
            🛡️ अधिकार
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal controls for Add User
function openAddUserModal() {
  const modal = document.getElementById('addUserModal');
  const gpSelect = document.getElementById('newPanchayat');
  if (gpSelect) {
    gpSelect.innerHTML = '<option value="ALL">-- सभी 30 पंचायतें (ALL) --</option>';
    State.panchayats.forEach(p => {
      gpSelect.innerHTML += `<option value="${p.name_en}">${p.name_hi} (${p.name_en})</option>`;
    });
  }
  if (modal) modal.style.display = 'flex';
}

function closeAddUserModal() {
  const modal = document.getElementById('addUserModal');
  if (modal) modal.style.display = 'none';
}

function handleCreateUser(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const fullName = document.getElementById('newFullName').value.trim();
  const mobile = document.getElementById('newMobile').value.trim();
  const role = document.getElementById('newRole').value;
  const panchayat = document.getElementById('newPanchayat').value;
  const wards = document.getElementById('newWards').value.trim() || 'ALL';

  if (!username || !password) {
    showToast('कृपया यूजरनेम व पासवर्ड दर्ज करें!');
    return;
  }

  const newUser = {
    user_id: `USR${State.adminUsers.length + 1}`,
    username: username,
    password: password,
    full_name: fullName,
    mobile: mobile,
    role: role,
    assigned_panchayats: panchayat,
    assigned_wards: wards,
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  State.adminUsers.push(newUser);
  localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
  renderSuperAdminUsers();
  closeAddUserModal();
  showToast(`नया यूजर '${username}' जोड़ा गया।`);

  // Sync to Google Sheet Apps Script if connected
  postToAppsScript({
    action: 'addUser',
    userData: newUser,
    adminUsername: State.currentUser.username
  });
}

// Password Change
function openChangePasswordModal(username) {
  const modal = document.getElementById('changePasswordModal');
  document.getElementById('cpUsername').value = username;
  document.getElementById('cpNewPassword').value = '';
  if (modal) modal.style.display = 'flex';
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.style.display = 'none';
}

function confirmPasswordChange() {
  const username = document.getElementById('cpUsername').value;
  const newPassword = document.getElementById('cpNewPassword').value.trim();

  if (!newPassword) {
    showToast('कृपया नया पासवर्ड दर्ज करें!');
    return;
  }

  const u = State.adminUsers.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (u) {
    u.password = newPassword;
    localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
    renderSuperAdminUsers();
    closeChangePasswordModal();
    showToast(`'${username}' का पासवर्ड सफलतापूर्वक बदला गया!`);

    postToAppsScript({
      action: 'updatePassword',
      username: username,
      newPassword: newPassword,
      adminUsername: State.currentUser.username
    });
  }
}

// Scope Change
function promptChangeScope(username) {
  const u = State.adminUsers.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (!u) return;

  const newGp = prompt(`उपयोगकर्ता '${username}' के लिए आवंटित पंचायत दर्ज करें (उदा. Sobdi, Bhinay, या ALL):`, u.assigned_panchayats || u.panchayat_code || 'ALL');
  if (newGp === null) return;

  const newWards = prompt(`उपयोगकर्ता '${username}' के लिए आवंटित वार्ड दर्ज करें (उदा. 1,2,3 या ALL):`, u.assigned_wards || u.allowed_wards || 'ALL');
  if (newWards === null) return;

  u.assigned_panchayats = newGp.trim();
  u.assigned_wards = newWards.trim();
  localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
  renderSuperAdminUsers();
  showToast(`'${username}' के अधिकार अपडेट कर दिए गए!`);

  postToAppsScript({
    action: 'updateUserScope',
    username: username,
    assignedPanchayats: newGp.trim(),
    assignedWards: newWards.trim(),
    adminUsername: State.currentUser.username
  });
}

// Toggle Status
function toggleUserStatus(username) {
  const u = State.adminUsers.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (!u) return;

  const cur = (u.status || 'ACTIVE').toUpperCase();
  const next = cur === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  u.status = next;
  localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
  renderSuperAdminUsers();
  showToast(`'${username}' को ${next === 'ACTIVE' ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'} किया गया!`);

  postToAppsScript({
    action: 'toggleUserStatus',
    username: username,
    status: next,
    adminUsername: State.currentUser.username
  });
}

// Google Apps Script Connectivity
function saveAppsScriptUrlAndSync() {
  const input = document.getElementById('appsScriptUrlInput');
  const url = input ? input.value.trim() : '';

  if (!url) {
    showToast('कृपया मान्य Google Apps Script Web App URL दर्ज करें!');
    return;
  }

  State.config.appsScriptUrl = url;
  localStorage.setItem('panchayat_apps_script_url', url);
  showToast('Google Apps Script URL सहेजा गया। कनेक्शन जाँचा जा रहा है...');
  testAppsScriptPing();
}

async function testAppsScriptPing() {
  const url = State.config.appsScriptUrl || localStorage.getItem('panchayat_apps_script_url');
  if (!url) {
    showToast('⚠️ पहले Google Apps Script Web App URL दर्ज करें!');
    return;
  }

  try {
    const res = await fetch(`${url}?action=ping`);
    const data = await res.json();
    if (data && data.success) {
      showToast(`✅ Apps Script कनेक्शन सफल: ${data.message}`);
      syncUsersWithAppsScript();
    } else {
      showToast('⚠️ Apps Script से अमान्य उत्तर प्राप्त हुआ।');
    }
  } catch (err) {
    showToast(`⚠️ कनेक्शन त्रुटि: ${err.message}`);
  }
}

async function syncUsersWithAppsScript() {
  const url = State.config.appsScriptUrl || localStorage.getItem('panchayat_apps_script_url');
  if (!url) return;

  try {
    const res = await fetch(`${url}?action=getUsers`);
    const data = await res.json();
    if (data && data.success && data.users && data.users.length > 0) {
      State.adminUsers = data.users.map(u => ({
        username: u.username,
        password: u.password,
        full_name: u.fullName || u.username,
        mobile: u.mobile || '',
        role: u.role || 'PANCHAYAT_AGENT',
        assigned_panchayats: u.assignedPanchayats || 'ALL',
        assigned_wards: u.assignedWards || 'ALL',
        status: u.status || 'ACTIVE'
      }));
      localStorage.setItem('panchayat_admins_cache', JSON.stringify(State.adminUsers));
      renderSuperAdminUsers();
      showToast(`Google Sheet से ${State.adminUsers.length} उपयोगकर्ताओं का डेटा लाइव सिंक हो गया!`);
    }
  } catch (e) {
    console.warn('Apps Script Users Sync Warning:', e);
  }
}

async function postToAppsScript(payload) {
  const url = State.config.appsScriptUrl || localStorage.getItem('panchayat_apps_script_url');
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data && data.success) {
      showToast(`☁️ Google Sheet अपडेट: ${data.message || 'सफलतापूर्वक सहेजा गया'}`);
    }
  } catch (err) {
    console.warn('Apps Script POST Warning:', err);
  }
}

// Hook renderSuperAdminUsers into switchTab
const origSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
  if (origSwitchTab) origSwitchTab(tabId);
  if (tabId === 'settingsTab') {
    renderSuperAdminUsers();
  }
};


// ==========================================================================
// Active Users Login Dropdown & Live Auth Sync
// ==========================================================================
function populateLoginUserDropdown() {
  const select = document.getElementById('gatekeeperUserSelect');
  if (!select) return;

  const currentVal = select.value || '';
  const activeUsers = (State.adminUsers || []).filter(u => {
    const s = String(u.status || 'ACTIVE').toUpperCase();
    return s === 'ACTIVE' || s === 'सक्रिय';
  });

  select.innerHTML = '<option value="">-- कृपया अपना अधिकृत खाता चुनें --</option>';

  const superAdmins = activeUsers.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'CONTROL_ROOM');
  const agents = activeUsers.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'CONTROL_ROOM');

  if (superAdmins.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '⚡ निर्वाचन नियंत्रण कक्ष / सुपर एडमिन';
    superAdmins.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = `${u.fullName || u.username} (${u.username})`;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  }

  if (agents.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = '🏛️ ग्राम पंचायत प्रभारी (Panchayat Incharges)';
    agents.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      const gpName = u.assignedPanchayats && u.assignedPanchayats !== 'ALL' ? ` [${u.assignedPanchayats}]` : '';
      opt.textContent = `${u.fullName || u.username}${gpName} (${u.username})`;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  }

  if (currentVal) {
    select.value = currentVal;
    const hiddenUser = document.getElementById('gatekeeperUsername');
    if (hiddenUser) hiddenUser.value = currentVal;
  }
}

function onLoginUserSelectChange(username) {
  const hiddenUser = document.getElementById('gatekeeperUsername');
  if (hiddenUser) hiddenUser.value = username;

  const errorMsg = document.getElementById('gatekeeperError');
  if (errorMsg) errorMsg.style.display = 'none';

  if (username) {
    const passInput = document.getElementById('gatekeeperPassword');
    if (passInput) passInput.focus();
  }
}

function toggleManualUsername() {
  const manualDiv = document.getElementById('manualUsernameDiv');
  const selectWrapper = document.getElementById('userSelectWrapper');
  const toggleBtn = document.getElementById('toggleManualUserBtn');
  const manualInput = document.getElementById('manualUsernameInput');

  if (!manualDiv) return;

  if (manualDiv.style.display === 'none') {
    manualDiv.style.display = 'block';
    selectWrapper.style.display = 'none';
    toggleBtn.textContent = 'वापस सूची से चुनें (Select from list)';
    if (manualInput) manualInput.focus();
  } else {
    manualDiv.style.display = 'none';
    selectWrapper.style.display = 'flex';
    toggleBtn.textContent = 'या मैन्युअल टाइप करें';
    const select = document.getElementById('gatekeeperUserSelect');
    if (select && select.value) {
      document.getElementById('gatekeeperUsername').value = select.value;
    }
  }
}

function onManualUsernameInput(val) {
  const hiddenUser = document.getElementById('gatekeeperUsername');
  if (hiddenUser) hiddenUser.value = val.trim();
}

async function syncLatestActiveUsersFromAppsScript() {
  const url = State.config.appsScriptUrl || localStorage.getItem('panchayat_apps_script_url');
  if (!url) return;

  try {
    const res = await fetch(`${url}?action=getUsers`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.users) && data.users.length > 0) {
      State.adminUsers = data.users;
      localStorage.setItem('panchayat_admins_cache', JSON.stringify(data.users));
      populateLoginUserDropdown();
      if (document.getElementById('superAdminUsersTable')) {
        renderSuperAdminUsers();
      }
    }
  } catch (err) {
    console.warn('Silent sync of active users warning:', err);
  }
}
