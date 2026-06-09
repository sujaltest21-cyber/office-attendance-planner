/* ============================================================
   WorkTrack Pro — app.js
   Full application logic for Attendance & Overtime Tracker
   ============================================================ */

// ─── State ────────────────────────────────────────────────
let state = {
  employees: [],          // [{id, name, empId, dept}]
  sundayAttendance: {},   // {"YYYY-MM-DD": {empId: "present"|"absent"}}
  overtimeRecords: {},    // {"YYYY-MM-DD": {empId: true/false, hours, note}}
};

// ─── Persistence (Firebase + localStorage fallback) ───────
let firebaseReady = false;
let isUpdatingFromFirebase = false; // prevent save loops

function saveState() {
  // Always save to localStorage as fallback cache
  localStorage.setItem('worktrack_state', JSON.stringify(state));
  
  // If Firebase is ready, save to cloud
  if (firebaseReady && !isUpdatingFromFirebase) {
    setSyncStatus('syncing', 'Syncing...');
    saveToFirebase(state).then(() => {
      setSyncStatus('connected', '☁️ Synced');
    }).catch(() => {
      setSyncStatus('disconnected', '⚠️ Offline');
    });
  }
}

function loadState() {
  // Load from localStorage first (instant)
  const raw = localStorage.getItem('worktrack_state');
  if (raw) {
    try { state = JSON.parse(raw); } catch(e) { console.error(e); }
  }
}

// ─── Sync Status UI ──────────────────────────────────────
function setSyncStatus(status, text) {
  const dot = document.getElementById('syncDot');
  const textEl = document.getElementById('syncText');
  if (!dot || !textEl) return;
  
  dot.className = 'sync-dot ' + status;
  textEl.textContent = text;
}

// ─── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Load from localStorage first (instant UI)
  loadState();

  // Set today's date defaults
  const today = getTodayStr();
  document.getElementById('otDate').value = today;
  document.getElementById('sundayDate').value = getNextSunday();

  // Set report month
  const d = new Date();
  document.getElementById('reportMonth').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  renderAll();
  updateStats();

  // Load OT for today
  loadOvertimeForDate();

  // ─── Firebase Setup ───────────────────────────────────
  if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
    setSyncStatus('syncing', 'Connecting...');
    
    if (initFirebase()) {
      // Monitor connection
      monitorConnection(
        () => { // onConnected
          setSyncStatus('connected', '☁️ Connected');
        },
        () => { // onDisconnected
          setSyncStatus('disconnected', '🔴 Offline');
        }
      );

      // Migrate localStorage → Firebase (one-time)
      migrateLocalStorageToFirebase().then((migrated) => {
        if (migrated) {
          console.log('📦 Data migrated to Firebase!');
          showToast('☁️ Data cloud માં migrate થઈ ગયો!', 'success');
        }
        
        // Start listening for real-time updates
        firebaseReady = true;
        listenToFirebase((data) => {
          isUpdatingFromFirebase = true;
          state = {
            employees:        data.employees        || [],
            sundayAttendance: data.sundayAttendance || {},
            overtimeRecords:  data.overtimeRecords  || {},
          };
          // Cache in localStorage
          localStorage.setItem('worktrack_state', JSON.stringify(state));
          renderAll();
          updateStats();
          setSyncStatus('connected', '☁️ Synced');
          isUpdatingFromFirebase = false;
        });
      });
    } else {
      setSyncStatus('disconnected', '❌ Firebase Error');
    }
  } else {
    // Firebase not configured - show setup needed
    setSyncStatus('not-configured', '⚙️ Setup Required');
    console.log('ℹ️ Firebase not configured. Using localStorage only.');
    console.log('📖 firebase-config.js માં તમારો Firebase config paste કરો.');
  }
});

function renderAll() {
  renderEmployeeList();
  renderSundayGrid();
  renderSundayHistory();
  renderOvertimeGrid();
  renderOTHistory();
  generateReport();
}

// ─── Helpers ──────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}
function getNextSunday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 0 : (7 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['રવિ','સોમ','મંગળ','બુધ','ગુરુ','શુક્ર','શનિ'];
  const months = ['જાન','ફેબ','માર','એપ્ર','મે','જૂન','જુલ','ઓગ','સપ્ટ','ઓક્ટ','નવ','ડિસ'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ─── Modal ────────────────────────────────────────────────
let modalCallback = null;
function showModal(title, desc, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').textContent = desc;
  document.getElementById('modal').style.display = 'flex';
  modalCallback = onConfirm;
  document.getElementById('modalConfirmBtn').onclick = () => { onConfirm(); closeModal(); };
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
  modalCallback = null;
}

// ─── Tab Switching ────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tabContent-' + tab).classList.add('active');
  const btnMap = { employees:'tabEmp', sunday:'tabSun', overtime:'tabOT', report:'tabReport' };
  document.getElementById(btnMap[tab]).classList.add('active');

  if (tab === 'sunday')   renderSundayGrid();
  if (tab === 'overtime') { renderOvertimeGrid(); loadOvertimeForDate(); }
  if (tab === 'report')   generateReport();
}

// ─── Stats ────────────────────────────────────────────────
function updateStats() {
  document.getElementById('totalEmpCount').textContent = state.employees.length;

  // Sunday - use most recent Sunday record
  const sunDates = Object.keys(state.sundayAttendance).sort().reverse();
  if (sunDates.length > 0) {
    const latest = state.sundayAttendance[sunDates[0]];
    let coming = 0, notComing = 0;
    Object.values(latest).forEach(v => { if (v === 'present') coming++; else notComing++; });
    document.getElementById('sunComingCount').textContent = coming;
    document.getElementById('sunNotComingCount').textContent = notComing;
  } else {
    document.getElementById('sunComingCount').textContent = '—';
    document.getElementById('sunNotComingCount').textContent = '—';
  }

  // Today OT
  const today = getTodayStr();
  const todayOT = state.overtimeRecords[today];
  if (todayOT) {
    const count = Object.values(todayOT.employees || {}).filter(Boolean).length;
    document.getElementById('otTodayCount').textContent = count;
  } else {
    document.getElementById('otTodayCount').textContent = '0';
  }
}

// ─── EMPLOYEES ────────────────────────────────────────────
function addEmployee() {
  const name  = document.getElementById('empName').value.trim();
  const empId = document.getElementById('empId').value.trim();
  const dept  = document.getElementById('empDept').value;

  if (!name) { showToast('⚠️ Employee નામ ભરો', 'error'); return; }

  const emp = { id: uid(), name, empId: empId || `EMP${String(state.employees.length+1).padStart(3,'0')}`, dept: dept || 'Other' };
  state.employees.push(emp);
  saveState();

  document.getElementById('empName').value = '';
  document.getElementById('empId').value = '';
  document.getElementById('empDept').value = '';

  renderEmployeeList();
  updateStats();
  showToast(`✅ "${name}" ઉમેરવામાં આવ્યો`);
}

function deleteEmployee(id) {
  const emp = state.employees.find(e => e.id === id);
  showModal(
    'Employee Delete?',
    `"${emp?.name}" ને delete કરવા માગો છો? સંબંધિત records પણ delete થઈ જશે.`,
    () => {
      state.employees = state.employees.filter(e => e.id !== id);
      // Clean from attendance & ot records
      Object.keys(state.sundayAttendance).forEach(dt => { delete state.sundayAttendance[dt][id]; });
      Object.keys(state.overtimeRecords).forEach(dt => {
        if (state.overtimeRecords[dt].employees) delete state.overtimeRecords[dt].employees[id];
      });
      saveState();
      renderAll();
      updateStats();
      showToast(`🗑️ Employee delete કરવામાં આવ્યો`);
    }
  );
}

function renderEmployeeList() {
  const container = document.getElementById('employeeList');
  const search = document.getElementById('searchEmp')?.value?.toLowerCase() || '';
  const list = state.employees.filter(e =>
    e.name.toLowerCase().includes(search) ||
    e.empId.toLowerCase().includes(search) ||
    e.dept.toLowerCase().includes(search)
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">👥</span>
      <p>કોઈ employee મળ્યો નહીં</p>
      <span>${search ? 'Search refine કરો' : 'ઉપરના ફોર્મ દ્વારા employees ઉમેરો'}</span>
    </div>`;
    return;
  }

  container.innerHTML = list.map(emp => `
    <div class="emp-row" id="empRow-${emp.id}">
      <div class="emp-avatar">${getInitials(emp.name)}</div>
      <div class="emp-info">
        <div class="emp-name">${emp.name}</div>
        <div class="emp-meta">${emp.empId} &bull; ${emp.dept}</div>
      </div>
      <span class="emp-badge">${emp.dept}</span>
      <button class="btn-icon" onclick="deleteEmployee('${emp.id}')" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14H6L5 6"></path>
          <path d="M10 11v6"></path><path d="M14 11v6"></path>
          <path d="M9 6V4h6v2"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

// ─── SUNDAY ATTENDANCE ────────────────────────────────────
let sundaySelections = {}; // {empId: 'present'|'absent'}

function renderSundayGrid() {
  const container = document.getElementById('sundayAttendanceGrid');
  const date = document.getElementById('sundayDate')?.value;

  if (state.employees.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📅</span>
      <p>Employee ઉમેર્યા નથી</p>
      <span>પ્રથમ "Employees" tab માં employees ઉમેરો</span></div>`;
    return;
  }

  // Load existing or init
  sundaySelections = date && state.sundayAttendance[date]
    ? { ...state.sundayAttendance[date] }
    : {};

  container.innerHTML = state.employees.map(emp => {
    const status = sundaySelections[emp.id] || '';
    return `
    <div class="att-card ${status}" id="sunCard-${emp.id}">
      <div class="att-avatar">${getInitials(emp.name)}</div>
      <div class="att-info">
        <div class="att-name">${emp.name}</div>
        <div class="att-dept">${emp.empId} &bull; ${emp.dept}</div>
      </div>
      <div class="att-toggle">
        <button class="toggle-pill ${status==='present'?'active-green':''}" onclick="setSundayStatus('${emp.id}','present')">✓ આવશે</button>
        <button class="toggle-pill ${status==='absent'?'active-red':''}" onclick="setSundayStatus('${emp.id}','absent')">✗ નહીં</button>
      </div>
    </div>`;
  }).join('');
}

function setSundayStatus(empId, status) {
  sundaySelections[empId] = status;
  const card = document.getElementById(`sunCard-${empId}`);
  card.className = `att-card ${status}`;
  card.querySelectorAll('.toggle-pill').forEach(btn => btn.className = 'toggle-pill');
  const [btnPresent, btnAbsent] = card.querySelectorAll('.toggle-pill');
  if (status === 'present') btnPresent.className = 'toggle-pill active-green';
  if (status === 'absent')  btnAbsent.className  = 'toggle-pill active-red';
}

function markAllSunday(status) {
  state.employees.forEach(emp => setSundayStatus(emp.id, status));
}

function saveSundayAttendance() {
  const date = document.getElementById('sundayDate').value;
  if (!date) { showToast('⚠️ Sunday date પસંદ કરો', 'error'); return; }
  if (Object.keys(sundaySelections).length === 0) { showToast('⚠️ ઓછામાં ઓછો 1 employee select કરો', 'error'); return; }

  state.sundayAttendance[date] = { ...sundaySelections };
  saveState();
  updateStats();
  renderSundayHistory();
  showToast(`✅ Sunday (${formatDate(date)}) ની હાજરી save થઈ`);
}

function renderSundayHistory() {
  const container = document.getElementById('sundayHistory');
  const dates = Object.keys(state.sundayAttendance).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>કોઈ Sunday record નથી</p></div>`;
    return;
  }

  container.innerHTML = dates.map(dt => {
    const record = state.sundayAttendance[dt];
    const coming    = Object.values(record).filter(v => v === 'present').length;
    const notComing = Object.values(record).filter(v => v === 'absent').length;
    const empDetails = state.employees.map(emp => {
      const status = record[emp.id];
      if (!status) return '';
      return `<div class="hist-emp-pill ${status === 'present' ? 'present' : 'absent'}">
        ${status === 'present' ? '✓' : '✗'} ${emp.name}
      </div>`;
    }).join('');

    return `<div class="history-item">
      <div class="history-header" onclick="toggleHistory('sun-${dt}')">
        <div class="history-date">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${formatDate(dt)}
        </div>
        <div class="history-badges">
          <span class="badge badge-green">✓ ${coming} આવ્યા</span>
          <span class="badge badge-red">✗ ${notComing} ન આવ્યા</span>
          <button class="btn-icon" style="margin-left:8px" onclick="event.stopPropagation();deleteSundayRecord('${dt}')" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-body" id="hist-sun-${dt}">
        <div class="history-body-grid">${empDetails}</div>
      </div>
    </div>`;
  }).join('');
}

function deleteSundayRecord(dt) {
  showModal('Record Delete?', `${formatDate(dt)} ની Sunday record delete કરવી?`, () => {
    delete state.sundayAttendance[dt];
    saveState();
    renderSundayHistory();
    updateStats();
    showToast('🗑️ Record delete થઈ');
  });
}

// ─── OVERTIME ─────────────────────────────────────────────
let otSelections = {}; // {empId: boolean}

function loadOvertimeForDate() {
  const date = document.getElementById('otDate')?.value;
  if (!date) return;

  const existing = state.overtimeRecords[date];
  otSelections = existing ? { ...existing.employees } : {};

  const hoursEl = document.getElementById('otHours');
  const noteEl  = document.getElementById('otNote');
  if (hoursEl) hoursEl.value = existing?.hours || '';
  if (noteEl)  noteEl.value  = existing?.note  || '';

  renderOvertimeGrid();
}

function renderOvertimeGrid() {
  const container = document.getElementById('overtimeGrid');
  const hoursSection = document.getElementById('otHoursSection');

  if (state.employees.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⏰</span>
      <p>Employee ઉમેર્યા નથી</p>
      <span>પ્રથમ "Employees" tab માં employees ઉમેરો</span></div>`;
    if (hoursSection) hoursSection.style.display = 'none';
    return;
  }
  if (hoursSection) hoursSection.style.display = 'flex';

  container.innerHTML = state.employees.map(emp => {
    const checked = otSelections[emp.id] || false;
    return `
    <div class="att-card ${checked ? 'ot-yes' : ''}" id="otCard-${emp.id}">
      <div class="att-avatar">${getInitials(emp.name)}</div>
      <div class="att-info">
        <div class="att-name">${emp.name}</div>
        <div class="att-dept">${emp.empId} &bull; ${emp.dept}</div>
      </div>
      <div class="att-toggle">
        <button class="toggle-pill ${checked ? 'active-orange' : ''}" onclick="toggleOT('${emp.id}')">
          ${checked ? '⏰ OT' : '+ OT'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function toggleOT(empId) {
  otSelections[empId] = !otSelections[empId];
  const card = document.getElementById(`otCard-${empId}`);
  const btn  = card.querySelector('.toggle-pill');
  if (otSelections[empId]) {
    card.classList.add('ot-yes');
    btn.className = 'toggle-pill active-orange';
    btn.textContent = '⏰ OT';
  } else {
    card.classList.remove('ot-yes');
    btn.className = 'toggle-pill';
    btn.textContent = '+ OT';
  }
}

function markAllOT(val) {
  state.employees.forEach(emp => {
    otSelections[emp.id] = val;
    const card = document.getElementById(`otCard-${emp.id}`);
    const btn  = card?.querySelector('.toggle-pill');
    if (!card) return;
    if (val) {
      card.classList.add('ot-yes');
      btn.className = 'toggle-pill active-orange';
      btn.textContent = '⏰ OT';
    } else {
      card.classList.remove('ot-yes');
      btn.className = 'toggle-pill';
      btn.textContent = '+ OT';
    }
  });
}

function saveOvertime() {
  const date  = document.getElementById('otDate').value;
  const hours = document.getElementById('otHours').value;
  const note  = document.getElementById('otNote').value.trim();

  if (!date) { showToast('⚠️ Overtime date પસંદ કરો', 'error'); return; }
  const hasAny = Object.values(otSelections).some(Boolean);
  if (!hasAny) { showToast('⚠️ ઓછામાં ઓછો 1 employee select કરો', 'error'); return; }

  state.overtimeRecords[date] = {
    employees: { ...otSelections },
    hours: hours ? parseFloat(hours) : null,
    note,
  };
  saveState();
  updateStats();
  renderOTHistory();
  generateReport();
  showToast(`✅ Overtime (${formatDate(date)}) save થઈ`);
}

function renderOTHistory() {
  const container = document.getElementById('otHistory');
  const dates = Object.keys(state.overtimeRecords).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>કોઈ Overtime record નથી</p></div>`;
    return;
  }

  container.innerHTML = dates.map(dt => {
    const record = state.overtimeRecords[dt];
    const otCount = Object.values(record.employees || {}).filter(Boolean).length;
    const empDetails = state.employees.map(emp => {
      if (!record.employees?.[emp.id]) return '';
      return `<div class="hist-emp-pill ot">⏰ ${emp.name}</div>`;
    }).join('');

    return `<div class="history-item">
      <div class="history-header" onclick="toggleHistory('ot-${dt}')">
        <div class="history-date">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${formatDate(dt)}
        </div>
        <div class="history-badges">
          <span class="badge badge-orange">⏰ ${otCount} Overtime</span>
          ${record.hours ? `<span class="badge badge-orange">${record.hours} કલાક</span>` : ''}
          ${record.note  ? `<span class="badge" style="background:rgba(99,179,237,0.1);color:#63b3ed;border:1px solid rgba(99,179,237,0.3)">${record.note}</span>` : ''}
          <button class="btn-icon" style="margin-left:8px" onclick="event.stopPropagation();deleteOTRecord('${dt}')" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-body" id="hist-ot-${dt}">
        ${record.note ? `<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px">📝 ${record.note}</p>` : ''}
        <div class="history-body-grid">${empDetails}</div>
      </div>
    </div>`;
  }).join('');
}

function deleteOTRecord(dt) {
  showModal('Record Delete?', `${formatDate(dt)} ની Overtime record delete કરવી?`, () => {
    delete state.overtimeRecords[dt];
    saveState();
    renderOTHistory();
    updateStats();
    showToast('🗑️ Record delete થઈ');
  });
}

// ─── History Toggle ───────────────────────────────────────
function toggleHistory(id) {
  const el = document.getElementById(`hist-${id}`);
  if (!el) return;
  el.classList.toggle('open');
}

// ─── REPORT ───────────────────────────────────────────────
function generateReport() {
  const monthVal = document.getElementById('reportMonth')?.value;
  const reportDiv = document.getElementById('reportContent');
  const empOtSummaryCard = document.getElementById('empOtSummaryCard');
  const empOtSummaryDiv  = document.getElementById('empOtSummary');

  if (!monthVal) return;

  const [year, mon] = monthVal.split('-').map(Number);

  // Filter Sunday records for month
  const sunDates = Object.keys(state.sundayAttendance).filter(dt => {
    const d = new Date(dt + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth()+1 === mon;
  });

  // Filter OT records for month
  const otDates = Object.keys(state.overtimeRecords).filter(dt => {
    const d = new Date(dt + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth()+1 === mon;
  });

  if (state.employees.length === 0) {
    reportDiv.innerHTML = `<div class="empty-state"><span class="empty-icon">📊</span><p>Employee ઉમેર્યા નથી</p></div>`;
    empOtSummaryCard.style.display = 'none';
    return;
  }

  // Build per-employee summary
  const empData = state.employees.map(emp => {
    let sunPresent = 0, sunAbsent = 0;
    sunDates.forEach(dt => {
      const s = state.sundayAttendance[dt]?.[emp.id];
      if (s === 'present') sunPresent++;
      else if (s === 'absent') sunAbsent++;
    });

    let otDays = 0, totalOTHours = 0;
    otDates.forEach(dt => {
      const rec = state.overtimeRecords[dt];
      if (rec?.employees?.[emp.id]) {
        otDays++;
        if (rec.hours) totalOTHours += rec.hours;
      }
    });

    return { ...emp, sunPresent, sunAbsent, otDays, totalOTHours };
  });

  const monthNames = ['','જાન','ફેબ','માર','એપ્ર','મે','જૂન','જુલ','ઓગ','સપ્ટ','ઓક્ટ','નવ','ડિસ'];

  reportDiv.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap">
      <span class="badge badge-green">📅 ${sunDates.length} Sundays</span>
      <span class="badge badge-orange">⏰ ${otDates.length} Overtime Days</span>
    </div>
    <div style="overflow-x:auto">
    <table class="report-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>ID</th>
          <th>Department</th>
          <th>Sun. આવ્યા</th>
          <th>Sun. ન આવ્યા</th>
          <th>OT Days</th>
          <th>OT Hours</th>
        </tr>
      </thead>
      <tbody>
        ${empData.map(e => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="emp-avatar" style="width:30px;height:30px;font-size:0.75rem;flex-shrink:0">${getInitials(e.name)}</div>
                ${e.name}
              </div>
            </td>
            <td style="color:var(--text-muted)">${e.empId}</td>
            <td><span class="emp-badge">${e.dept}</span></td>
            <td><span style="color:var(--green);font-weight:600">✓ ${e.sunPresent}</span></td>
            <td><span style="color:var(--red);font-weight:600">✗ ${e.sunAbsent}</span></td>
            <td><span style="color:var(--orange);font-weight:600">${e.otDays}</span></td>
            <td><span style="color:var(--orange);font-weight:600">${e.totalOTHours > 0 ? e.totalOTHours + ' hr' : '—'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
  `;

  // OT detail by date
  if (otDates.length > 0) {
    empOtSummaryCard.style.display = 'block';
    empOtSummaryDiv.innerHTML = `
      <div style="overflow-x:auto">
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>OT Employees</th>
            <th>Hours</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${otDates.sort().map(dt => {
            const rec = state.overtimeRecords[dt];
            const names = state.employees.filter(e => rec.employees?.[e.id]).map(e => e.name).join(', ');
            return `<tr>
              <td style="white-space:nowrap">${formatDate(dt)}</td>
              <td style="color:var(--text-secondary)">${names || '—'}</td>
              <td style="color:var(--orange)">${rec.hours ? rec.hours + ' hr' : '—'}</td>
              <td style="color:var(--text-muted)">${rec.note || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    `;
  } else {
    empOtSummaryCard.style.display = 'none';
  }
}

// ─── Export ───────────────────────────────────────────────
function exportData() {
  if (state.employees.length === 0) {
    showToast('⚠️ Export કરવા માટે employees ઉમેરો', 'error');
    return;
  }

  const monthEl = document.getElementById('reportMonth');
  const monthVal = monthEl.value;
  const [year, mon] = monthVal ? monthVal.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth()+1];
  const monthNames = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

  let csv = `WorkTrack Pro - Attendance & Overtime Report\n`;
  csv += `Month: ${monthNames[mon]} ${year}\n`;
  csv += `Generated: ${new Date().toLocaleString()}\n\n`;

  csv += `EMPLOYEES\n`;
  csv += `Name,Employee ID,Department\n`;
  state.employees.forEach(e => { csv += `"${e.name}","${e.empId}","${e.dept}"\n`; });

  csv += `\nSUNDAY ATTENDANCE\n`;
  csv += `Date,${state.employees.map(e => e.name).join(',')}\n`;
  Object.keys(state.sundayAttendance).sort().forEach(dt => {
    const rec = state.sundayAttendance[dt];
    const row = state.employees.map(e => rec[e.id] || 'N/A').join(',');
    csv += `"${dt}",${row}\n`;
  });

  csv += `\nOVERTIME RECORDS\n`;
  csv += `Date,${state.employees.map(e => e.name).join(',')},Hours,Note\n`;
  Object.keys(state.overtimeRecords).sort().forEach(dt => {
    const rec = state.overtimeRecords[dt];
    const row = state.employees.map(e => rec.employees?.[e.id] ? 'Yes' : 'No').join(',');
    csv += `"${dt}",${row},"${rec.hours || ''}","${rec.note || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `WorkTrack_${monthNames[mon]}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 CSV Export started!', 'info');
}

// ─── Keyboard Shortcuts ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'empName') addEmployee();
  if (e.key === 'Escape') closeModal();
});

// --- Export: downloadBlob helper ---
function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// --- Export JSON Backup ---
function exportJSONBackup() {
  const backup = { version: '1.0', exportedAt: new Date().toISOString(), ...state };
  const now = new Date();
  const fname = 'WorkTrack_Backup_' + now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + '.json';
  downloadBlob(JSON.stringify(backup, null, 2), fname, 'application/json');
  showToast('Backup JSON download started!', 'info');
}

// --- Import Modal ---
let parsedCSVRows = [];
let parsedJSONBackup = null;

function openImportModal() {
  document.getElementById('importModal').style.display = 'flex';
  switchImportTab('csv');
  clearCSVPreview();
  document.getElementById('jsonPreview').style.display = 'none';
  document.getElementById('jsonFileInput').value = '';
  parsedJSONBackup = null;
}
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
  parsedCSVRows = [];
  parsedJSONBackup = null;
}

function switchImportTab(tab) {
  document.querySelectorAll('.import-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.imp-content').forEach(c => c.classList.remove('active'));
  document.getElementById('impTab-' + tab).classList.add('active');
  document.getElementById('impContent-' + tab).classList.add('active');
}

function downloadCSVTemplate() {
  const t = 'Name,Employee ID,Department\nRahul Patel,EMP001,IT\nPriya Shah,EMP002,HR\nAmit Joshi,EMP003,Operations\n';
  downloadBlob(t, 'WorkTrack_Employee_Template.csv', 'text/csv;charset=utf-8;');
  showToast('Template download started!', 'info');
}

function handleCSVDrop(event) {
  event.preventDefault();
  document.getElementById('csvDropZone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) readCSVFile(file);
  else showToast('Please upload a .csv file', 'error');
}
function handleCSVFile(event) { const f = event.target.files[0]; if (f) readCSVFile(f); }

function readCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => parseCSV(e.target.result, file.name);
  reader.readAsText(file, 'UTF-8');
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseCSV(text, filename) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { showToast('CSV file is empty', 'error'); return; }
  parsedCSVRows = [];
  lines.slice(1).forEach((line, i) => {
    const cols = parseCSVLine(line);
    const name = cols[0] && cols[0].trim();
    if (name) parsedCSVRows.push({ name, empId: (cols[1] && cols[1].trim()) || 'EMP' + String(i+1).padStart(3,'0'), dept: (cols[2] && cols[2].trim()) || 'Other' });
  });
  if (parsedCSVRows.length === 0) { showToast('No valid data in CSV', 'error'); return; }
  showCSVPreview(filename);
}

function showCSVPreview(filename) {
  const existingIds = new Set(state.employees.map(e => e.empId.toLowerCase()));
  let newCount = 0, dupCount = 0;
  parsedCSVRows.forEach(r => { if (existingIds.has(r.empId.toLowerCase())) dupCount++; else newCount++; });

  document.getElementById('csvPreviewTitle').innerHTML =
    filename + ' &middot; <span style="color:var(--green)">' + newCount + ' New</span>'
    + (dupCount > 0 ? ' &middot; <span style="color:var(--orange)">' + dupCount + ' Duplicate (skip)</span>' : '');

  const rows = parsedCSVRows.slice(0,20).map((r,i) => {
    const isDup = existingIds.has(r.empId.toLowerCase());
    return '<tr><td style="color:var(--text-muted)">' + (i+1) + '</td><td>' + r.name +
      '</td><td style="color:var(--text-muted)">' + r.empId +
      '</td><td><span class="emp-badge">' + r.dept + '</span></td><td>' +
      (isDup ? '<span style="color:var(--orange);font-size:0.78rem">Duplicate</span>' : '<span style="color:var(--green);font-size:0.78rem">New</span>') + '</td></tr>';
  }).join('');
  const more = parsedCSVRows.length > 20 ? '<tr><td colspan="5" style="color:var(--text-muted);text-align:center">... and ' + (parsedCSVRows.length-20) + ' more</td></tr>' : '';

  document.getElementById('csvPreviewTable').innerHTML =
    '<table class="report-table" style="margin-top:4px"><thead><tr><th>#</th><th>Name</th><th>Employee ID</th><th>Department</th><th>Status</th></tr></thead><tbody>' + rows + more + '</tbody></table>';
  document.getElementById('csvPreview').style.display = 'block';
}

function clearCSVPreview() {
  parsedCSVRows = [];
  document.getElementById('csvPreview').style.display = 'none';
  document.getElementById('csvFileInput').value = '';
}

function importCSVData() {
  if (parsedCSVRows.length === 0) { showToast('Please select a file', 'error'); return; }
  const existingIds = new Set(state.employees.map(e => e.empId.toLowerCase()));
  let added = 0;
  parsedCSVRows.forEach(r => {
    if (!existingIds.has(r.empId.toLowerCase())) {
      state.employees.push({ id: uid(), name: r.name, empId: r.empId, dept: r.dept });
      added++;
    }
  });
  saveState(); renderAll(); updateStats();
  closeImportModal();
  showToast(added + ' employees imported successfully!');
  switchTab('employees');
}

// --- JSON Backup Restore ---
function handleJSONDrop(event) {
  event.preventDefault();
  document.getElementById('jsonDropZone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.json')) readJSONFile(file);
  else showToast('Please upload a .json backup file', 'error');
}
function handleJSONFile(event) { const f = event.target.files[0]; if (f) readJSONFile(f); }

function readJSONFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      parsedJSONBackup = JSON.parse(e.target.result);
      if (!Array.isArray(parsedJSONBackup.employees)) throw new Error('Invalid format');
      showJSONPreview(file.name);
    } catch(err) { showToast('Invalid backup file format', 'error'); parsedJSONBackup = null; }
  };
  reader.readAsText(file, 'UTF-8');
}

function showJSONPreview(filename) {
  const b = parsedJSONBackup;
  const sunCount = Object.keys(b.sundayAttendance || {}).length;
  const otCount  = Object.keys(b.overtimeRecords  || {}).length;
  const exported = b.exportedAt ? new Date(b.exportedAt).toLocaleString() : '-';
  document.getElementById('jsonPreviewInfo').innerHTML =
    '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">File: ' + filename + '  |  Exported: ' + exported + '</p>' +
    '<div class="json-info-grid">' +
    '<div class="json-info-item"><div class="json-info-label">Employees</div><div class="json-info-value" style="color:var(--blue)">' + b.employees.length + '</div></div>' +
    '<div class="json-info-item"><div class="json-info-label">Sunday Records</div><div class="json-info-value" style="color:var(--green)">' + sunCount + '</div></div>' +
    '<div class="json-info-item"><div class="json-info-label">Overtime Records</div><div class="json-info-value" style="color:var(--orange)">' + otCount + '</div></div>' +
    '<div class="json-info-item"><div class="json-info-label">Version</div><div class="json-info-value" style="color:var(--purple);font-size:1rem">' + (b.version||'N/A') + '</div></div>' +
    '</div>' +
    '<p style="font-size:0.78rem;color:var(--red);margin-top:8px">Warning: Restore will replace all current data</p>';
  document.getElementById('jsonPreview').style.display = 'block';
}

function importJSONBackup() {
  if (!parsedJSONBackup) { showToast('Please select a file', 'error'); return; }
  state = {
    employees:        parsedJSONBackup.employees        || [],
    sundayAttendance: parsedJSONBackup.sundayAttendance || {},
    overtimeRecords:  parsedJSONBackup.overtimeRecords  || {},
  };
  saveState(); renderAll(); updateStats();
  closeImportModal();
  showToast('Backup restored! ' + state.employees.length + ' employees loaded');
}
