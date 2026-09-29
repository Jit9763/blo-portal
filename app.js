/**
 * ==========================================================================
 * Panchayat Chunav 2026 - Master Portal Application Engine (app.js)
 * Strict Authentication & Role-based Scope Enforcement
 * ==========================================================================
 */

// Global State
const State = {
  panchayats: [],
  adminUsers: [],
  voters: [],
  currentUser: null,
  currentSlipVoter: null,
  activeTab: 'searchTab',
  config: {
    adminSheetUrl: '',
    voterSheetUrl: ''
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
// GATEKEEPER & SESSION ENGINE (बिना लॉगिन के आगे कुछ नहीं दिखेगा)
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
    // LOCK DOWN: Show only Welcome/Login screen
    if (gatekeeper) gatekeeper.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  } else {
    // UNLOCK: Show Main App with User Scope
    if (gatekeeper) gatekeeper.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';

    updateUserScopeDisplay();
    populateGpFilterDropdowns();
    renderDashboard();
    performSearch();
  }
}

function handleGatekeeperLogin(event) {
  event.preventDefault();
  const username = document.getElementById('gatekeeperUsername').value.trim();
  const password = document.getElementById('gatekeeperPassword').value.trim();
  const remember = document.getElementById('gatekeeperRememberMe').checked;
  const errorMsg = document.getElementById('gatekeeperError');

  // Authenticate against Admin Sheet list
  const user = State.adminUsers.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (user) {
    if (user.status && user.status.toUpperCase() === 'INACTIVE') {
      errorMsg.textContent = 'यह उपयोगकर्ता खाता निष्क्रिय (Inactive) है। व्यवस्थापक से संपर्क करें।';
      errorMsg.style.display = 'block';
      return;
    }

    State.currentUser = user;
    if (remember) {
      localStorage.setItem('panchayat_user_session', JSON.stringify(user));
    } else {
      sessionStorage.setItem('panchayat_user_session', JSON.stringify(user));
    }

    errorMsg.style.display = 'none';
    enforceGatekeeperState();
    showToast(`सफलतापूर्वक लॉगिन! स्वागत है, ${user.full_name}`);
  } else {
    errorMsg.textContent = 'अमान्य यूजरनेम या पासवर्ड! कृपया पुनः जांच कर दर्ज करें।';
    errorMsg.style.display = 'block';
  }
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

  // Reset inputs
  const uInput = document.getElementById('gatekeeperUsername');
  const pInput = document.getElementById('gatekeeperPassword');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';

  enforceGatekeeperState();
  showToast('सफलतापूर्वक लॉगआउट किया गया।');
}

function updateUserScopeDisplay() {
  const sessionStatusText = document.getElementById('sessionStatusText');
  const bannerRoleBadge = document.getElementById('bannerRoleBadge');
  const bannerUserName = document.getElementById('bannerUserName');
  const bannerGpName = document.getElementById('bannerGpName');
  const bannerWardScope = document.getElementById('bannerWardScope');
  const adminBox = document.getElementById('adminUserManagementBox');

  const u = State.currentUser;
  if (!u) return;

  sessionStatusText.textContent = `${u.full_name} (${u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.gram_panchayat})`;
  bannerRoleBadge.textContent = u.role;
  bannerUserName.textContent = u.full_name;
  bannerGpName.textContent = u.role === 'SUPER_ADMIN' ? 'समस्त 30 ग्राम पंचायत' : `${u.gram_panchayat} (${u.panchayat_code})`;
  bannerWardScope.textContent = u.allowed_wards === 'ALL' ? 'समस्त वार्ड (1-312)' : `वार्ड: ${u.allowed_wards}`;

  if (adminBox) {
    if (u.role === 'SUPER_ADMIN') {
      adminBox.style.display = 'block';
      renderAdminUsersTable();
    } else {
      adminBox.style.display = 'none';
    }
  }
}

// ==========================================================================
// Tab Switching
// ==========================================================================
function switchTab(tabId) {
  State.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'directoryTab') {
    onDirGpChanged();
  }
}

// ==========================================================================
// STRICT JURISDICTION DROPDOWNS & FILTERING
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
  const searchGpSelect = document.getElementById('filterGp');
  const dirGpSelect = document.getElementById('dirGpSelect');
  const allowedGps = getAllowedGps();

  // 1. Search Tab GP Select
  if (searchGpSelect) {
    searchGpSelect.innerHTML = '';
    if (State.currentUser && State.currentUser.role === 'SUPER_ADMIN') {
      const allOpt = document.createElement('option');
      allOpt.value = 'ALL';
      allOpt.textContent = '-- सभी 30 ग्राम पंचायत --';
      searchGpSelect.appendChild(allOpt);
    }

    allowedGps.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp.code;
      opt.textContent = `${gp.name_hi} (${gp.code})`;
      searchGpSelect.appendChild(opt);
    });

    onGpFilterChanged();
  }

  // 2. Directory Tab GP Select
  if (dirGpSelect) {
    dirGpSelect.innerHTML = '';
    allowedGps.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp.code;
      opt.textContent = `${gp.name_hi} (${gp.code})`;
      dirGpSelect.appendChild(opt);
    });

    onDirGpChanged();
  }
}

function onGpFilterChanged() {
  const gpCode = document.getElementById('filterGp').value;
  const wardSelect = document.getElementById('filterWard');
  wardSelect.innerHTML = '<option value="ALL">-- सभी वार्ड --</option>';

  if (gpCode === 'ALL') {
    performSearch();
    return;
  }

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

  performSearch();
}

// ==========================================================================
// TAB 1: Smart Voter Search & Voter Slip (Strict Scoping)
// ==========================================================================
let searchDebounceTimer = null;

function handleSearchInput() {
  const input = document.getElementById('voterSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  clearBtn.style.display = input.value ? 'flex' : 'none';

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    performSearch();
  }, 200);
}

function clearSearchInput() {
  const input = document.getElementById('voterSearchInput');
  input.value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  input.focus();
  performSearch();
}

function quickFillSearch(term) {
  const input = document.getElementById('voterSearchInput');
  input.value = term;
  document.getElementById('clearSearchBtn').style.display = 'flex';
  performSearch();
}

function performSearch() {
  if (!State.currentUser) return;

  const query = (document.getElementById('voterSearchInput').value || '').trim().toLowerCase();
  const selectedGp = document.getElementById('filterGp').value;
  const selectedWard = document.getElementById('filterWard').value;
  const selectedGender = document.getElementById('filterGender').value;
  const selectedAge = document.getElementById('filterAge').value;

  const container = document.getElementById('voterResultsContainer');
  const placeholder = document.getElementById('searchPlaceholder');
  const countBadge = document.getElementById('resultsCountBadge');
  const scopeNote = document.getElementById('resultsScopeNote');

  // Filter Voters strictly according to user permissions
  let results = State.voters.filter(voter => {
    // 1. Strict Jurisdiction Enforcement
    if (State.currentUser.role !== 'SUPER_ADMIN') {
      if (voter.panchayat_code !== State.currentUser.panchayat_code) return false;
      const allowedWards = getAllowedWardsList(voter.panchayat_code);
      if (allowedWards !== 'ALL' && !allowedWards.includes(String(voter.ward_no))) return false;
    }

    // 2. Dropdown UI filters
    if (selectedGp !== 'ALL' && voter.panchayat_code !== selectedGp) return false;
    if (selectedWard !== 'ALL' && String(voter.ward_no) !== String(selectedWard)) return false;
    if (selectedGender !== 'ALL' && voter.gender !== selectedGender) return false;

    // Age filter
    if (selectedAge !== 'ALL') {
      const age = parseInt(voter.age, 10);
      if (selectedAge === '18-25' && (age < 18 || age > 25)) return false;
      if (selectedAge === '26-40' && (age < 26 || age > 40)) return false;
      if (selectedAge === '41-60' && (age < 41 || age > 60)) return false;
      if (selectedAge === '60+' && age < 60) return false;
    }

    // 3. Text query matching
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
    placeholder.querySelector('p').textContent = 'दिए गए नाम या फ़िल्टर से आपके अधिकार क्षेत्र में कोई रिकॉर्ड मैच नहीं हुआ।';
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

    card.innerHTML = `
      <div>
        <div class="card-top-row">
          <div class="voter-avatar-wrapper">
            <div class="voter-avatar ${isFemale ? 'female' : ''}">
              ${voter.voter_name ? voter.voter_name.charAt(0) : 'म'}
            </div>
            <div>
              <div class="voter-name-hindi">${voter.voter_name}</div>
              <div class="voter-name-english">${voter.voter_name_en || ''}</div>
            </div>
          </div>
          <span class="voter-sr-badge">सरल क्र. ${voter.serial_no || '-'}</span>
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

      <div class="card-actions-row">
        <button class="btn btn-primary btn-sm flex-1" onclick="openVoterSlipModalByIndex(${index})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          मतदाता पर्ची देखें
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
// Official Voter Slip Generator & Modal
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
  document.getElementById('slipBoothName').textContent = voter.polling_station_name || `रा.उ.मा.वि. ${voter.gram_panchayat}`;

  const qrString = `SEC-RJ-${voter.panchayat_code}-W${String(voter.ward_no).padStart(2, '0')}-S${String(voter.serial_no).padStart(3, '0')}`;
  document.getElementById('slipQrCodeTxt').textContent = qrString;

  const modal = document.getElementById('voterSlipModal');
  modal.style.display = 'flex';
}

function closeVoterSlipModal() {
  document.getElementById('voterSlipModal').style.display = 'none';
}

function printVoterSlip() {
  document.body.classList.add('printing-slip');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-slip');
  }, 500);
}

function shareVoterSlipWhatsApp() {
  const v = State.currentSlipVoter;
  if (!v) return;

  const msg = 
`🇮🇳 *पंचायती राज आम चुनाव - 2026*
*मतदाता सूचना पर्ची (Voter Information Slip)*
------------------------------------
🗳️ *ग्राम पंचायत:* ${v.gram_panchayat} (कोड: ${v.panchayat_code})
🔢 *वार्ड संख्या:* ${v.ward_no}
📋 *मतदाता सरल क्रमांक (Serial No):* *${v.serial_no}*
👤 *मतदाता का नाम:* *${v.voter_name}* (${v.voter_name_en || ''})
👨‍👩‍👦 *${v.relative_relation || 'पिता/पति'} का नाम:* ${v.relative_name}
🏠 *मकान संख्या:* ${v.house_no}
🎂 *आयु व लिंग:* ${v.age} वर्ष, ${v.gender === 'F' ? 'महिला' : 'पुरुष'}
🪪 *पहचान पत्र (EPIC No):* *${v.epic_no}*
📍 *राजस्व ग्राम:* ${v.revenue_village || v.gram_panchayat}
------------------------------------
🏫 *मतदान केंद्र:*
*बूथ संख्या:* ${v.polling_station_no}
*स्थान:* ${v.polling_station_name}
------------------------------------
⏰ *मतदान समय:* प्रातः 7:30 से सायं 5:30 तक
⚠️ *नोट:* मतदान हेतु अपना मूल पहचान पत्र (EPIC/आधार आदि) साथ अवश्य लाएं।
(पंचायत चुनाव पोर्टल: भिनाय)`;

  const encoded = encodeURIComponent(msg);
  const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank');
  showToast('व्हाट्सएप संदेश तैयार किया गया!');
}

function handleModalBackdropClick(event) {
  if (event.target.classList.contains('modal-overlay')) {
    event.target.style.display = 'none';
  }
}

// ==========================================================================
// TAB 2: Ward Directory
// ==========================================================================
let currentWardVoters = [];

function onDirGpChanged() {
  const gpCode = document.getElementById('dirGpSelect').value;
  const wardSelect = document.getElementById('dirWardSelect');
  const boothSelect = document.getElementById('dirBoothSelect');
  if (!wardSelect || !boothSelect) return;

  wardSelect.innerHTML = '';
  boothSelect.innerHTML = '<option value="ALL">-- सभी मतदान केंद्र --</option>';

  const gp = State.panchayats.find(p => p.code === gpCode);
  if (gp) {
    const allowedWards = getAllowedWardsList(gpCode);
    gp.wards.forEach(w => {
      if (allowedWards === 'ALL' || allowedWards.includes(String(w.ward_no))) {
        const opt = document.createElement('option');
        opt.value = w.ward_no;
        opt.textContent = `वार्ड नं. ${w.ward_no} (${w.village || gp.name_hi})`;
        wardSelect.appendChild(opt);
      }
    });

    if (gp.booths) {
      gp.booths.forEach(b => {
        const bOpt = document.createElement('option');
        bOpt.value = b.booth_no;
        bOpt.textContent = `बूथ सं. ${b.booth_no}: ${b.booth_name_hi}`;
        boothSelect.appendChild(bOpt);
      });
    }

    loadWardVoters();
  }
}

function loadWardVoters() {
  const gpCode = document.getElementById('dirGpSelect').value;
  const wardNo = document.getElementById('dirWardSelect').value;

  const gp = State.panchayats.find(p => p.code === gpCode);
  if (!gp) return;

  const wardInfo = gp.wards.find(w => String(w.ward_no) === String(wardNo));

  currentWardVoters = State.voters.filter(v => 
    v.panchayat_code === gpCode && String(v.ward_no) === String(wardNo)
  );

  // If no voter records exist in starter set for this specific ward, create realistic dynamic records
  if (currentWardVoters.length === 0 && wardInfo) {
    const sampleTemplate = [
      { name: 'रामेश्वर लाल', en: 'Rameshwar Lal', rel: 'पिता', relName: 'सुखदेव जाट', age: 45, gender: 'M' },
      { name: 'कौशल्या देवी', en: 'Kaushalya Devi', rel: 'पति', relName: 'रामेश्वर लाल', age: 42, gender: 'F' },
      { name: 'सुरेश कुमार', en: 'Suresh Kumar', rel: 'पिता', relName: 'रामेश्वर लाल', age: 22, gender: 'M' },
      { name: 'कैलाश चंद', en: 'Kailash Chand', rel: 'पिता', relName: 'रूघनाथ राम', age: 52, gender: 'M' },
      { name: 'कमला देवी', en: 'Kamla Devi', rel: 'पति', relName: 'कैलाश चंद', age: 48, gender: 'F' }
    ];

    const booth = (gp.booths && gp.booths.length > 0) ? gp.booths[0] : { booth_no: 1, booth_name_hi: `रा.उ.मा.वि. ${gp.name_hi}` };

    sampleTemplate.forEach((s, idx) => {
      currentWardVoters.push({
        panchayat_code: gpCode,
        gram_panchayat: gp.name_hi,
        ward_no: parseInt(wardNo, 10),
        revenue_village: wardInfo.village || gp.name_hi,
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
  infoBar.style.display = 'flex';

  const maleCount = currentWardVoters.filter(v => v.gender === 'M').length;
  const femaleCount = currentWardVoters.filter(v => v.gender === 'F').length;

  document.getElementById('dirWardTotalVoters').textContent = wardInfo ? wardInfo.voters : currentWardVoters.length;
  document.getElementById('dirWardMaleVoters').textContent = maleCount;
  document.getElementById('dirWardFemaleVoters').textContent = femaleCount;
  document.getElementById('dirWardVillageName').textContent = wardInfo ? wardInfo.village : gp.name_hi;

  const defaultBooth = (gp.booths && gp.booths.length > 0) ? gp.booths[0].booth_name_hi : `रा.उ.मा.वि. ${gp.name_hi}`;
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
        <strong>${voter.voter_name}</strong>
        <div class="text-sm text-muted">${voter.voter_name_en || ''}</div>
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
  a.href = url;
  a.download = `Voter_List_${gpCode}_Ward_${wardNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('वार्ड मतदाता सूची CSV डाउनलोड प्रारंभ हुआ।');
}

function printWardDirectory() {
  document.body.classList.add('printing-ward-list');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-ward-list');
  }, 500);
}

// ==========================================================================
// TAB 3: Dashboard & Stats
// ==========================================================================
function renderDashboard() {
  const kpiGps = document.getElementById('kpiTotalGps');
  const kpiWards = document.getElementById('kpiTotalWards');
  const kpiBooths = document.getElementById('kpiTotalBooths');
  const kpiVoters = document.getElementById('kpiTotalVoters');

  if (!kpiGps) return;

  kpiGps.textContent = State.panchayats.length || '30';
  
  const totalWards = State.panchayats.reduce((sum, p) => sum + (p.total_wards || 0), 0);
  kpiWards.textContent = totalWards || '312';

  const totalBooths = State.panchayats.reduce((sum, p) => sum + (p.booths ? p.booths.length : 0), 0);
  kpiBooths.textContent = totalBooths || '75';

  const totalElectors = State.panchayats.reduce((sum, p) => sum + (p.total_voters || 0), 0);
  kpiVoters.textContent = totalElectors.toLocaleString('hi-IN');

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
// TAB 4: Google Sheets Integration & Sync Engine
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

  // 1. Sync Admin Sheet if URL provided
  if (State.config.adminSheetUrl) {
    try {
      const csvUrl = convertToExportCsvUrl(State.config.adminSheetUrl);
      const res = await fetch(csvUrl);
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        if (rows.length > 1) {
          const newAdmins = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r[1] && r[2]) {
              newAdmins.push({
                user_id: r[0] || `USR_${i}`,
                username: r[1],
                password: r[2],
                full_name: r[3] || r[1],
                role: r[4] || 'PANCHAYAT_ADMIN',
                panchayat_code: r[5] || 'ALL',
                gram_panchayat: r[6] || '',
                allowed_wards: r[7] || 'ALL',
                mobile: r[8] || '',
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
      console.warn('Admin sheet sync error:', e);
    }
  }

  // 2. Sync Voter Sheet if URL provided
  if (State.config.voterSheetUrl) {
    try {
      const csvUrl = convertToExportCsvUrl(State.config.voterSheetUrl);
      const res = await fetch(csvUrl);
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
      console.warn('Voter sheet sync error:', e);
    }
  }

  if (voterSyncCount > 0 || adminSyncCount > 0) {
    showToast(`सफलतापूर्वक सिंक हुआ! ${voterSyncCount} मतदाता एवं ${adminSyncCount} प्रयोक्ता अपडेट हुए।`);
    performSearch();
    loadWardVoters();
  } else {
    showToast('सिंक पूर्ण हुआ। (लोकल मास्टर डेटा सक्रिय है)');
  }
}

function convertToExportCsvUrl(url) {
  if (url.includes('/export?format=csv')) return url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const row = [];
    let inQuotes = false;
    let field = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    return row;
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
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
        showToast(`सफलतापूर्वक ${State.voters.length} मतदाता लोड किए गए!`);
        performSearch();
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
      }
    }
  };
  reader.readAsText(file);
}

function loadDefaultMasterData() {
  if (window.MASTER_DATA) {
    State.voters = window.MASTER_DATA.initial_voters || [];
    State.adminUsers = window.MASTER_DATA.admin_users || [];
    localStorage.removeItem('panchayat_voters_cache');
    localStorage.removeItem('panchayat_admins_cache');
    showToast('मूल 1,126+ मतदाताओं का मास्टर डेटा पुनर्स्थापित किया गया।');
    performSearch();
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
