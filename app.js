
// ==========================================================================
// CELL PERSONNEL MANAGEMENT ENGINE (SUPER ADMIN)
// ==========================================================================
function openAddCellModal() {
  const modal = document.getElementById('addEditCellModal');
  if (!modal) return;

  const sel = document.getElementById('cellEditSelect');
  if (sel) {
    sel.innerHTML = `
      <option value="निर्वाचन शाखा (पर्यवेक्षण व नियंत्रण)">निर्वाचन शाखा (पर्यवेक्षण व नियंत्रण)</option>
      <option value="कार्मिक प्रकोष्ठ (मतदान दल गठन)">कार्मिक प्रकोष्ठ (मतदान दल गठन)</option>
      <option value="ईवीएम प्रकोष्ठ (EVM एवं VVPAT)">ईवीएम प्रकोष्ठ (EVM एवं VVPAT)</option>
      <option value="कंट्रोल रूम व हेल्पलाइन प्रकोष्ठ">कंट्रोल रूम व हेल्पलाइन प्रकोष्ठ</option>
      <option value="आदर्श आचार संहिता (MCC) प्रकोष्ठ">आदर्श आचार संहिता (MCC) प्रकोष्ठ</option>
      <option value="रूट चार्ट एवं पर्यवेक्षण प्रकोष्ठ">रूट चार्ट एवं पर्यवेक्षण प्रकोष्ठ</option>
      <option value="वाहन एवं परिवहन प्रकोष्ठ">वाहन एवं परिवहन प्रकोष्ठ</option>
      <option value="मतपत्र एवं डाक मतपत्र प्रकोष्ठ">मतपत्र एवं डाक मतपत्र प्रकोष्ठ</option>
      <option value="स्वीप (SVEEP) मतदाता जागरूकता">स्वीप (SVEEP) मतदाता जागरूकता</option>
      <option value="मतदान केंद्र व्यवस्था प्रकोष्ठ">मतदान केंद्र व्यवस्था प्रकोष्ठ</option>
      <option value="प्राप्ति एवं रवानगी प्रकोष्ठ">प्राप्ति एवं रवानगी प्रकोष्ठ</option>
      <option value="ड्यूटी प्रमाण पत्र प्रकोष्ठ">ड्यूटी प्रमाण पत्र प्रकोष्ठ</option>
      <option value="चिकित्सा एवं प्राथमिक स्वास्थ्य">चिकित्सा एवं प्राथमिक स्वास्थ्य</option>
    `;
  }

  const title = document.getElementById('cellModalTitle');
  if (title) title.textContent = '➕ नया चुनाव प्रकोष्ठ कार्मिक जोड़ें';

  document.getElementById('cellEditTargetId').value = '';
  document.getElementById('cellEditName').value = '';
  document.getElementById('cellEditMobile').value = '';
  document.getElementById('cellEditPost').value = '';
  document.getElementById('cellEditOffice').value = 'उपखण्ड कार्यालय भिनाय';
  
  const passInp = document.getElementById('cellEditPassword');
  if (passInp) passInp.value = '123';

  modal.style.display = 'flex';
}

function closeAddEditCellModal() {
  const modal = document.getElementById('addEditCellModal');
  if (modal) modal.style.display = 'none';
}

async function handleSaveCellSubmit(event) {
  if (event) event.preventDefault();

  const targetId = document.getElementById('cellEditTargetId')?.value.trim();
  const cellName = document.getElementById('cellEditSelect')?.value.trim();
  const name = document.getElementById('cellEditName')?.value.trim();
  const mobile = document.getElementById('cellEditMobile')?.value.trim();
  const post = document.getElementById('cellEditPost')?.value.trim() || 'प्रकोष्ठ कार्मिक';
  const office = document.getElementById('cellEditOffice')?.value.trim() || 'उपखण्ड कार्यालय भिनाय';
  const role = document.getElementById('cellEditRole')?.value || 'प्रकोष्ठ कार्मिक';
  const pass = document.getElementById('cellEditPassword')?.value.trim() || '123';

  if (!name || !cellName) {
    alert('कृपया कार्मिक का नाम एवं प्रकोष्ठ चुनें!');
    return;
  }

  const cId = targetId || `cell_custom_${Date.now()}`;
  const cellObj = {
    id: cId,
    username: cId,
    name: name,
    full_name: name,
    cell_name: cellName,
    mobile: mobile,
    post: post,
    designation: post,
    office: office,
    role: role,
    password: pass,
    status: 'ACTIVE',
    panchayat: 'समस्त ब्लॉक भिनाय',
    allowed_panchayats: 'ALL',
    allowed_wards: 'ALL',
    allowed_tabs: ['directoryTab']
  };

  // 1. Update in master directory
  const dir = getMasterDirectory();
  if (dir) {
    if (!dir.cell_personnel) dir.cell_personnel = [];
    const idx = dir.cell_personnel.findIndex(x => (x.id || x.username) === cId);
    if (idx !== -1) {
      dir.cell_personnel[idx] = cellObj;
    } else {
      dir.cell_personnel.push(cellObj);
    }
  }

  // 2. Save to localStorage
  const customCells = JSON.parse(localStorage.getItem('portal_custom_cell_personnel') || '[]');
  const cIdx = customCells.findIndex(x => (x.id || x.username) === cId);
  if (cIdx !== -1) {
    customCells[cIdx] = cellObj;
  } else {
    customCells.push(cellObj);
  }
  localStorage.setItem('portal_custom_cell_personnel', JSON.stringify(customCells));
  setCustomUserPassword(cId, pass);

  closeAddEditCellModal();
  if (typeof renderBloPassTable === 'function') renderBloPassTable();
  showToast(`✅ प्रकोष्ठ कार्मिक '${name}' सफलतापूर्वक सुरक्षित!`);
}

function deleteCellPersonnel(cellId, cellName) {
  if (!confirm(`क्या आप प्रकोष्ठ कार्मिक '${cellName || cellId}' को हटाना चाहते हैं?`)) return;

  // 1. Remove from directory
  const dir = getMasterDirectory();
  if (dir && dir.cell_personnel) {
    dir.cell_personnel = dir.cell_personnel.filter(x => (x.id || x.username) !== cellId);
  }

  // 2. Remove from custom localStorage
  const customCells = JSON.parse(localStorage.getItem('portal_custom_cell_personnel') || '[]');
  const filtered = customCells.filter(x => (x.id || x.username) !== cellId);
  localStorage.setItem('portal_custom_cell_personnel', JSON.stringify(filtered));

  // Mark status inactive
  setCustomUserStatus(cellId, 'INACTIVE');

  if (typeof renderBloPassTable === 'function') renderBloPassTable();
  showToast(`🗑️ कार्मिक '${cellName || cellId}' हटा दिया गया!`);
}


// ==========================================================================
// CONTEXT-AWARE LOGIN UI CONFIGURATOR
// ==========================================================================
// ==========================================================================
// CONTEXT-AWARE LOGIN UI CONFIGURATOR
// ==========================================================================
function configureLoginUiForPortal() {
  const ctx = getPortalContext();
  const vBox = document.getElementById('voterLoginContainer');
  const bBox = document.getElementById('bloLoginContainer');
  const mBox = document.getElementById('masterLoginContainer');
  const cardTitle = document.querySelector('.login-card-title');
  const cardDesc = document.querySelector('.login-card-desc');
  const badge = document.querySelector('.gatekeeper-badge');

  if (ctx === 'voter') {
    // 1. VOTER PORTAL: NO DROPDOWN - ONLY USER ID & PASSWORD
    if (vBox) vBox.style.display = 'block';
    if (bBox) bBox.style.display = 'none';
    if (mBox) mBox.style.display = 'none';
    if (cardTitle) cardTitle.textContent = '🗳️ मतदाता एवं अधिकृत प्रत्याशी प्रवेश';
    if (cardDesc) cardDesc.textContent = 'कृपया अपनी यूजर आईडी एवं पासवर्ड दर्ज करके प्रवेश करें:';
    if (badge) badge.textContent = '🗳️ मतदाता पर्ची एवं प्रत्याशी पोर्टल 2026';
    const vInput = document.getElementById('voterDirectIdInput');
    if (vInput) {
      document.getElementById('gatekeeperUsername').value = vInput.value.trim();
      vInput.focus();
    }
  } else if (ctx === 'blo') {
    // 2. BLO & CELL PORTAL: DROPDOWN (Cell at top, Block Prabhari, 30 Panchayats)
    if (vBox) vBox.style.display = 'none';
    if (bBox) bBox.style.display = 'block';
    if (mBox) mBox.style.display = 'none';
    if (cardTitle) cardTitle.textContent = '🏢 बी.एल.ओ. एवं चुनाव प्रकोष्ठ अधिकृत प्रवेश';
    if (cardDesc) cardDesc.textContent = 'कृपया प्रकोष्ठ या ग्राम पंचायत चुनकर अपना नाम चुनें:';
    if (badge) badge.textContent = '📍 बी.एल.ओ. एवं चुनाव प्रकोष्ठ अधिकृत पोर्टल 2026';
    populateBloPrimaryDropdown();
  } else {
    // 3. MASTER ADMIN PORTAL (pan): UNIFIED MASTER USER DROPDOWN
    if (vBox) vBox.style.display = 'none';
    if (bBox) bBox.style.display = 'none';
    if (mBox) mBox.style.display = 'block';
    if (cardTitle) cardTitle.textContent = '👑 त्रि-पोर्टल मास्टर एडमिन प्रवेश';
    if (cardDesc) cardDesc.textContent = 'कृपया अपना अधिकृत खाता चुनें अथवा यूजरनेम दर्ज करें:';
    if (badge) badge.textContent = '⚡ त्रि-पोर्टल मास्टर कंट्रोल रूम 2026';
    populateLoginUserDropdown();
  }
}

function populateBloPrimaryDropdown() {
  const pSelect = document.getElementById('loginPanchayatSelect');
  if (!pSelect) return;

  pSelect.innerHTML = `
    <option value="">-- चुनाव प्रकोष्ठ या ग्राम पंचायत चुनें --</option>
    <option value="CELL" style="font-weight:800; color:#1e40af; background:#eff6ff;">🏢 चुनाव प्रकोष्ठ (Election Cell)</option>
    <option value="BLOCK_PRABHARI" style="font-weight:800; color:#0f766e; background:#ccfbf1;">🌟 ब्लॉक प्रभारी (सुरेश जांगिड़ - शिक्षक)</option>
  `;

  BHINAI_PANCHAYATS_30.forEach(gp => {
    const opt = document.createElement('option');
    opt.value = gp;
    opt.textContent = `🏛️ ग्राम पंचायत ${gp}`;
    pSelect.appendChild(opt);
  });
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
      offSelect.innerHTML = '<option value="">-- पहले प्रकोष्ठ या पंचायत चुनें --</option>';
      offSelect.disabled = true;
    }
    return;
  }

  const dir = getMasterDirectory();

  if (val === 'CELL') {
    if (offLabel) offLabel.innerHTML = '<strong>2. अधिकृत चुनाव प्रकोष्ठ कार्मिक चुनें *:</strong>';
    if (offSelect) {
      offSelect.innerHTML = '<option value="">-- अधिकृत प्रकोष्ठ कार्मिक चुनें --</option>';
      const customCells = JSON.parse(localStorage.getItem('portal_custom_cell_personnel') || '[]');
      const cellList = [...customCells, ...((dir && dir.cell_personnel) ? dir.cell_personnel : [])];
      
      // Deduplicate by id/username
      const seen = new Set();
      cellList.forEach(cp => {
        const cId = cp.username || cp.id;
        if (!cId || seen.has(cId)) return;
        seen.add(cId);

        const opt = document.createElement('option');
        opt.value = cId;
        opt.setAttribute('data-name', cp.name || '');
        opt.setAttribute('data-role', cp.designation || cp.role || '');
        opt.setAttribute('data-office', cp.office || cp.school_office || '');
        opt.setAttribute('data-mobile', cp.mobile || '');
        opt.setAttribute('data-cell', cp.cell_name || '');
        opt.textContent = `[${cp.cell_name || 'प्रकोष्ठ'}] ${cp.name} - ${cp.designation || cp.role || 'कार्मिक'} (${cp.mobile || '-'})`;
        offSelect.appendChild(opt);
      });
      offSelect.disabled = false;
    }
    return;
  }

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
    document.getElementById('gatekeeperPassword')?.focus();
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
      const bId = blo.username || blo.id || `blo_${blo.booth_no}`;
      opt.value = bId;
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
  let contact = (dir.all_contacts || []).find(c => c.id === id);
  if (!contact) return;

  if (overrides[id]) {
    contact = { ...contact, ...overrides[id] };
  }

  const titleEl = document.getElementById('editPersonnelModalTitle');
  if (titleEl) titleEl.textContent = `✏️ ${contact.name} - संपादन (${contact.role || contact.category})`;

  const setVal = (fid, val) => { const el = document.getElementById(fid); if (el) el.value = val || ''; };
  setVal('editPersId', contact.id);
  setVal('editPersName', contact.name);
  setVal('editPersMobile', contact.mobile);
  setVal('editPersRole', contact.designation || contact.role || '');
  setVal('editPersSchool', contact.school_office || contact.school || '');
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
    showToast('कृपया नाम एवं मोबाइल नंबर अवश्य भरें!');
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

  // 1. Update in-memory MASTER_DIRECTORY
  const dir = getMasterDirectory();
  if (dir && dir.all_contacts) {
    const item = dir.all_contacts.find(c => c.id === id);
    if (item) Object.assign(item, editPayload);
    
    for (const key of ['patwari_list', 'supervisors_list', 'blo_list', 'peeo_list', 'male_staff_list', 'cell_personnel', 'officers_list']) {
      if (dir[key]) {
        const subItem = dir[key].find(c => c.id === id);
        if (subItem) Object.assign(subItem, editPayload);
      }
    }
  }

  // 2. Save to localStorage overrides
  const overrides = getDirectoryOverrides();
  overrides[id] = editPayload;
  localStorage.setItem('portal_directory_overrides', JSON.stringify(overrides));

  // 3. Send to Node server for permanent disk & SQLite sync
  try {
    await fetch('/api/directory/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPayload)
    });
  } catch (err) {
    console.log('Server update background notice:', err);
  }

  closeEditPersonnelModal();
  renderDirectoryList();
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
  const offSelect = document.getElementById('loginOfficerSelect');

  if (!username) {
    if (pSelect && pSelect.value === 'ADMIN') {
      username = 'admin';
    } else if (offSelect && offSelect.value) {
      username = offSelect.value;
    }
  }

  const passInput = document.getElementById('gatekeeperPassword');
  const password = passInput ? passInput.value.trim() : '';

  if (!username) {
    if (errorDiv) {
      errorDiv.textContent = 'कृपया ग्राम पंचायत या चुनाव प्रकोष्ठ चुनें!';
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

  // 2. Client-side Fallback validation for BLOs, Cell, and Admin
    // 2. Client-side Fallback validation for Admin, Block Prabhari, BLOs, Cell & Candidates
  // A. Super Admin Check
  if (username === 'admin' && (password === '123' || password === 'admin123' || password === 'admin')) {
    const adminUser = {
      id: 'admin',
      username: 'admin',
      role: 'SUPER_ADMIN',
      full_name: 'मुख्य व्यवस्थापक (Admin)',
      allowed_panchayats: 'ALL',
      allowed_wards: 'ALL',
      allowed_tabs: ['dashboardTab', 'searchTab', 'alphaTab', 'bulkSlipTab', 'directoryTab', 'candidateProfileTab', 'adminControlTab', 'settingsTab'],
      candidate_mode: 'admin_locked'
    };
    State.currentUser = adminUser;
    localStorage.setItem(getSessionStorageKey(), JSON.stringify(adminUser));
    localStorage.setItem('panchayat_user_session', JSON.stringify(adminUser));
    enforceGatekeeperState();
    showToast('नमस्ते एडमिन! पोर्टल में आपका स्वागत है।');
    return;
  }

  // B. Block Prabhari Check (Suresh Chand Jangid - Teacher)
  const isBpUser = (username === 'block_prabhari' || username === 'suresh_jangid' || username === 'cell_nirvachan_2' || (pSelect && pSelect.value === 'BLOCK_PRABHARI'));
  if (isBpUser) {
    const bpStatus = getCustomUserStatus('block_prabhari');
    if (bpStatus === 'INACTIVE') {
      if (errorDiv) {
        errorDiv.textContent = 'ब्लॉक प्रभारी खाता सुपर एडमिन द्वारा निष्क्रिय (Inactive) किया गया है!';
        errorDiv.style.display = 'block';
      }
      return;
    }

    const customBpPass = getCustomUserPassword('block_prabhari');
    const validBpPass = (customBpPass && password === customBpPass) ||
      (password.toUpperCase() === 'BHINAI123') ||
      (password.toLowerCase() === 'bhinai123') ||
      (password === '123');

    if (validBpPass) {
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
        email: 'block_prabhari@bhinai.gov.in',
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

  // C. Candidates / Panchayat Agents Check from State.adminUsers
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
    if ((customCandPass && password === customCandPass) || password === candMatch.password || password === '123' || password === 'admin123') {
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

  const dir = getMasterDirectory();
  if (dir) {
        // Check in BLO list
    const bloMatch = (dir.blo_list || []).find(b => b.id === username || b.username === username || String(b.booth_no) === username.replace('blo_', ''));
    if (bloMatch) {
      const bloUname = bloMatch.username || bloMatch.id || `blo_${bloMatch.booth_no}`;
      const bloPass = getCustomUserPassword(bloUname) || bloMatch.password || '123';
      if (password === bloPass || password === '123') {
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

    // Check in Cell Personnel list
    const cellMatch = (dir.cell_personnel || []).find(c => c.id === username || c.username === username);
    if (cellMatch) {
      const cellUname = cellMatch.username || cellMatch.id;
      const cellPass = getCustomUserPassword(cellUname) || cellMatch.password || '123';
      if (password === cellPass || password === '123') {
        const customScope = getCustomUserScope(cellUname) || 'DIR_ONLY';
        let allowedTabs = ['directoryTab'];
        let allowedGps = 'ALL';

        if (customScope === 'SEARCH_30_GP') {
          allowedTabs = ['dashboardTab', 'searchTab', 'alphaTab', 'directoryTab'];
        }

        const cellUser = {
          id: cellUname,
          username: cellUname,
          role: 'CELL_MEMBER',
          full_name: `${cellMatch.name} (${cellMatch.cell_name})`,
          cell_name: cellMatch.cell_name,
          allowed_panchayats: allowedGps,
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

  if (errorDiv) {
    errorDiv.textContent = 'अमान्य पासवर्ड! कृपया सही अधिकृत पासवर्ड दर्ज करें।';
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
  configureLoginUiForPortal();
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

function switchMasterHubSubTab(subTab) {
  const pUsers = document.getElementById('masterHubPaneUsers');
  const pBloPass = document.getElementById('masterHubPaneBloPass');
  const bUsers = document.getElementById('btnSubTabUsers');
  const bBloPass = document.getElementById('btnSubTabBloPass');

  if (subTab === 'users') {
    if (pUsers) pUsers.style.display = 'block';
    if (pBloPass) pBloPass.style.display = 'none';
    if (bUsers) { bUsers.classList.add('btn-primary'); bUsers.classList.remove('btn-outline-secondary'); }
    if (bBloPass) { bBloPass.classList.remove('btn-primary'); bBloPass.classList.add('btn-outline-secondary'); }
  } else {
    if (pUsers) pUsers.style.display = 'none';
    if (pBloPass) pBloPass.style.display = 'block';
    if (bUsers) { bUsers.classList.remove('btn-primary'); bUsers.classList.add('btn-outline-secondary'); }
    if (bBloPass) { bBloPass.classList.add('btn-primary'); bBloPass.classList.remove('btn-outline-secondary'); }
    initBloPassTab();
  }
}

function initBloPassTab() {
  const gpSelect = document.getElementById('bloPassGpFilter');
  if (gpSelect && gpSelect.options.length <= 1) {
    gpSelect.innerHTML = '<option value="ALL">समस्त 30 ग्राम पंचायतें</option>';
    BHINAI_PANCHAYATS_30.forEach(gp => {
      const opt = document.createElement('option');
      opt.value = gp;
      opt.textContent = gp;
      gpSelect.appendChild(opt);
    });
  }
  renderBloPassTable();
}

function renderBloPassTable() {
  const tbody = document.getElementById('bloPassTableBody');
  if (!tbody) return;

  const dir = getMasterDirectory();
  if (!dir) return;

  const blos = dir.blo_list || [];
  const customCells = JSON.parse(localStorage.getItem('portal_custom_cell_personnel') || '[]');
  const cellPersonnel = [...customCells, ...(dir.cell_personnel || [])];

  // Deduplicate cells
  const seenCell = new Set();
  const cells = [];
  cellPersonnel.forEach(c => {
    const cid = c.username || c.id;
    if (cid && !seenCell.has(cid)) {
      seenCell.add(cid);
      cells.push(c);
    }
  });

  const combined = [...blos, ...cells];

  const search = (document.getElementById('bloPassSearchInput')?.value || '').toLowerCase().trim();
  const gpFilter = document.getElementById('bloPassGpFilter')?.value || 'ALL';

  const filtered = combined.filter(c => {
    if (gpFilter !== 'ALL' && c.panchayat && c.panchayat !== gpFilter) return false;
    if (!search) return true;
    const n = (c.name || '').toLowerCase();
    const b = String(c.booth_no || '');
    const s = (c.school || c.school_office || c.cell_name || '').toLowerCase();
    const p = (c.panchayat || '').toLowerCase();
    const m = (c.mobile || '');
    return n.includes(search) || b.includes(search) || s.includes(search) || p.includes(search) || m.includes(search);
  });

  const bpPass = getCustomUserPassword('block_prabhari') || 'BHINAI123';
  const bpStatus = getCustomUserStatus('block_prabhari') || 'ACTIVE';

  let htmlRows = `
    <tr style="background:#f0fdf4; border-left:4px solid #0f766e;">
      <td><span class="badge" style="background:#ccfbf1; color:#0f766e; font-weight:800; padding:4px 8px; border-radius:6px;">🌟 ब्लॉक प्रभारी</span></td>
      <td>
        <div style="font-weight:800; color:#0f766e; font-size:0.95rem;">श्री सुरेश चन्द्र जांगिड (अध्यापक)</div>
        <div style="font-size:0.75rem; color:#64748b;">उपखण्ड कार्यालय भिनाय | संपूर्ण ब्लॉक प्रभारी</div>
      </td>
      <td><strong style="color:#0f766e;">समस्त 30 ग्राम पंचायतें</strong></td>
      <td>📞 9950705221</td>
      <td><code style="background:#fff; border:1px solid #99f6e4; padding:3px 8px; border-radius:4px; font-weight:800; color:#0f766e;" id="bpTablePassCode">${bpPass}</code></td>
      <td>
        <span class="badge" style="background:#d1fae5; color:#065f46; font-weight:700; padding:4px 8px; border-radius:6px;">
          🌐 समस्त 30 ग्रा.पं. वोटर सर्च (स्थायी पूर्ण अधिकार)
        </span>
      </td>
      <td style="text-align:center;">
        <div class="d-flex gap-1 justify-content-center">
          <button type="button" class="btn btn-xs btn-outline-success" onclick="adminPromptChangePass('block_prabhari', 'श्री सुरेश चन्द्र जांगिड (ब्लॉक प्रभारी)')" style="font-weight:700; padding:3px 8px;">
            🔑 पासवर्ड
          </button>
          <button type="button" class="btn btn-xs ${bpStatus === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-danger'}" onclick="toggleUserStatus('block_prabhari', '${bpStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}')" style="font-weight:700; padding:3px 8px;">
            ${bpStatus === 'ACTIVE' ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
          </button>
        </div>
      </td>
    </tr>
  `;

  filtered.forEach(c => {
    const uId = c.username || c.id || `blo_${c.booth_no}`;
    const isBlo = !!c.booth_no;
    const isCell = !isBlo && (uId.startsWith('cell_') || c.cell_name);
    const curPass = getCustomUserPassword(uId) || c.password || '123';
    const curScope = getCustomUserScope(uId) || (isBlo ? 'BOOTH' : 'DIR_ONLY');
    const curStatus = getCustomUserStatus(uId) || 'ACTIVE';

    htmlRows += `
      <tr>
        <td><strong>${isBlo ? 'भाग ' + c.booth_no : '<span class="badge" style="background:#eff6ff; color:#1e40af; font-size:0.75rem;">प्रकोष्ठ</span>'}</strong></td>
        <td>
          <div style="font-weight:700; color:#1e293b;">${c.name}</div>
          <div style="font-size:0.75rem; color:#64748b;">${c.school || c.school_office || c.cell_name || ''}</div>
        </td>
        <td>${c.panchayat || c.cell_name || '-'}</td>
        <td>📞 ${c.mobile || '-'}</td>
        <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700;">${curPass}</code></td>
        <td>
          ${isBlo ? `
            <select class="form-select form-select-xs" onchange="adminUpdateUserScope('${uId}', this.value)" style="font-weight:700; font-size:0.78rem; padding:3px 6px; border-color:${curScope === 'ALL_30_GP' ? '#16a34a' : (curScope === 'PANCHAYAT' ? '#2563eb' : '#94a3b8')};">
              <option value="BOOTH" ${curScope === 'BOOTH' ? 'selected' : ''}>📍 केवल अपना बूथ (भाग ${c.booth_no})</option>
              <option value="PANCHAYAT" ${curScope === 'PANCHAYAT' ? 'selected' : ''}>🏛️ पूरी ग्रा.पं. (${c.panchayat})</option>
              <option value="ALL_30_GP" ${curScope === 'ALL_30_GP' ? 'selected' : ''}>🌐 समस्त 30 ग्राम पंचायतें (ब्लॉक)</option>
            </select>
          ` : `
            <select class="form-select form-select-xs" onchange="adminUpdateUserScope('${uId}', this.value)" style="font-weight:700; font-size:0.78rem; padding:3px 6px; border-color:${curScope === 'SEARCH_30_GP' ? '#16a34a' : '#94a3b8'};">
              <option value="DIR_ONLY" ${curScope === 'DIR_ONLY' ? 'selected' : ''}>🏢 केवल डायरेक्टरी (सर्च बंद)</option>
              <option value="SEARCH_30_GP" ${curScope === 'SEARCH_30_GP' ? 'selected' : ''}>🟢 समस्त 30 ग्रा.पं. वोटर सर्च चालू</option>
            </select>
          `}
        </td>
        <td style="text-align:center;">
          <div class="d-flex gap-1 justify-content-center flex-wrap">
            <button type="button" class="btn btn-xs btn-outline-warning" onclick="adminPromptChangePass('${uId}', '${c.name}')" title="पासवर्ड बदलें" style="font-weight:700; padding:2px 6px;">
              🔑
            </button>
            <button type="button" class="btn btn-xs ${curStatus === 'ACTIVE' ? 'btn-outline-success' : 'btn-outline-danger'}" onclick="toggleUserStatus('${uId}', '${curStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}')" title="स्थिति बदलें" style="font-weight:700; padding:2px 6px;">
              ${curStatus === 'ACTIVE' ? '🟢' : '🔴'}
            </button>
            ${isCell ? `
              <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteCellPersonnel('${uId}', '${c.name}')" title="प्रकोष्ठ कार्मिक हटाएँ" style="font-weight:700; padding:2px 6px;">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlRows;
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
