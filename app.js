// State Management & Storage Keys
let currentLang = 'gu';
let currentMode = 'sunday';
let selectedDate = '';
let isUnlocked = false;

// Default Data Structure
let officeNames = {
    gu: "📊 ઓફિસ એટેન્ડન્સ પ્લાનર",
    en: "📊 Office Attendance Planner"
};

let masterData = {
    "1 P2P અંકિતભાઈ": [],
    "2 ગાલા સુરેશભાઈ": [],
    "3 ફાઇનલ હરેશભાઈ": [],
    "4 ફાઇનલ અરવિંદભાઈ": []
};

let attendanceRecords = {};
let extraFoodRecords = {};
let shiftTimeRecords = {};

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiqvmiyww8ApsZ7IPHVi2yCY4CdkKJ--I",
  authDomain: "office-attendance-a7d98.firebaseapp.com",
  databaseURL: "https://office-attendance-a7d98-default-rtdb.firebaseio.com",
  projectId: "office-attendance-a7d98",
  storageBucket: "office-attendance-a7d98.firebasestorage.app",
  messagingSenderId: "184135944529",
  appId: "1:184135944529:web:f6933cb98ebe96d5faab70"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let isFirebaseConnected = false;

// Firebase Connection State Listener
firebase.database().ref('.info/connected').on('value', function(snap) {
    const statusSpan = document.getElementById('connection-status');
    if (!statusSpan) return;
    if (snap.val() === true) {
        statusSpan.innerText = '🟢 Online (Live Sync)';
        statusSpan.style.color = '#10b981';
        isFirebaseConnected = true;
    } else {
        statusSpan.innerText = '🔴 Offline';
        statusSpan.style.color = '#ef4444';
        isFirebaseConnected = false;
    }
});

// Sync data from Firebase
firebase.database().ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        officeNames = data.title || officeNames;
        
        // Auto-fix for corrupted text caused by earlier encoding issue
        if (officeNames.gu && officeNames.gu.includes("ðŸ") || officeNames.gu && officeNames.gu.includes("?")) {
            officeNames = {
                gu: "📊 ઓફિસ એટેન્ડન્સ પ્લાનર",
                en: "📊 Office Attendance Planner"
            };
            saveToFirebase(); // Force reset everything to fix corruption
            return;
        }

        if (data.master) {
            masterData = data.master;
        } else {
            // Restore defaults if missing
            masterData = {
                "1 P2P અંકિતભાઈ": [],
                "2 ગાલા સુરેશભાઈ": [],
                "3 ફાઇનલ હરેશભાઈ": [],
                "4 ફાઇનલ અરવિંદભાઈ": []
            };
            database.ref('/master').set(masterData);
        }
        attendanceRecords = data.records || {};
        extraFoodRecords = data.extra || {};
        shiftTimeRecords = data.shift || {};
        
        // Update UI with new data
        if(document.getElementById('main-title')) {
            document.getElementById('main-title').innerText = officeNames[currentLang];
        }
        if(document.getElementById('shift-time-input')) {
            document.getElementById('shift-time-input').value = shiftTimeRecords[selectedDate] || '';
        }
        renderAll();
    } else {
        // If DB is completely empty, initialize it with default structure
        saveToFirebase();
    }
});

function saveToFirebase() {
    database.ref('/').set({
        title: officeNames,
        master: masterData,
        records: attendanceRecords,
        extra: extraFoodRecords,
        shift: shiftTimeRecords
    });
}

// Translation Dictionary
const labels = {
    gu: {
        sub: "ડિપાર્ટમેન્ટ વાઇઝ સન્ડે અને ઓવરટાઇમ હાજરી મેનેજમેન્ટ",
        labelDate: "📅 તારીખ:",
        addDeptPl: "નવો વિભાગ ઉમેરો...",
        addDeptBtn: "+ વિભાગ",
        empPl: "કર્મચારીનું નામ...",
        repSun: "📋 ફાઇનલ કાઉન્ટ રીપોર્ટ (Sunday)",
        repOt: "📋 ફાઇનલ કાઉન્ટ રીપોર્ટ (Overtime)",
        listSun: "👤 સન્ડે હાજરી રીપોર્ટ",
        listOt: "👤 ઓવરટાઇમ હાજરી રીપોર્ટ",
        extNasto: "🍩 એક્સ્ટ્રા નાસ્તો:",
        extFaral: "🥛 એક્સ્ટ્રા ફરાળ:",
        totalSun: "રવિવારે આવનાર કુલ કર્મચારીઓ",
        totalOt: "ઓવરટાઇમ કરનાર કુલ કર્મચારીઓ",
        orderNasto: "નાસ્તો ઓર્ડર",
        orderFaral: "ફરાળ ઓર્ડર",
        staff: "સ્ટાફ",
        extra: "એક્સ્ટ્રા",
        total: "કુલ",
        nBadge: "N",
        fBadge: "F",
        emptyList: "કોઈ કર્મચારી નથી.",
        noDept: "કોઈ વિભાગ નથી.",
        dlBtn: "ડાઉનલોડ રીપોર્ટ (Image)",
        modeText: "પ્રકાર",
        shiftTimeText: "⏰ શિફ્ટ સમય:",
        eraseBtnText: "🧹 ક્લિયર ઓલ",
        eraseConfirm: "શું તમે આ તારીખનો તમામ હાજરી ડેટા અને શિફ્ટ ટાઇમ ક્લિયર કરવા માંગો છો?",
        lockBtnLocked: "🔒 Lock (Safe Mode)",
        lockBtnUnlocked: "🔓 Unlocked (Edit Mode)",
        editDeptTitlePrompt: "વિભાગનું નવું નામ લખો:",
        editEmpNamePrompt: "કર્મચારીનું નવું નામ લખો:",
        editCompanyTitlePrompt: "તમારી ઓફિસ/કંપનીનું નવું નામ લખો:",
        deleteDeptConfirm: "શું તમે આખો વિભાગ ડીલીટ કરવા માંગો છો?",
        importSuccess: "બેકઅપ સફળતાપૂર્વક ઇમ્પોર્ટ થઈ ગયો છે! (Firebase માં સેવ થઈ ગયું)",
        importError: "ભૂલ: આ માન્ય બેકઅપ ફાઇલ નથી!",
        importFileError: "ફાઇલ વાંચવામાં ભૂલ આવી છે! કૃપા કરીને સાચી .txt બેકઅપ ફાઇલ સિલેક્ટ કરો.",
        importConfirm: "શું તમે આ બેકઅપ ડેટા ઇમ્પોર્ટ કરવા માંગો છો? આનાથી ફાયરબેઝનો જૂનો ડેટા બદલાઈ જશે."
    },
    en: {
        sub: "Department-wise Sunday & Overtime Attendance Management",
        labelDate: "📅 Date:",
        addDeptPl: "Add new department...",
        addDeptBtn: "+ Dept",
        empPl: "Employee name...",
        repSun: "📋 Final Count Report (Sunday)",
        repOt: "📋 Final Count Report (Overtime)",
        listSun: "👤 Sunday Attendance Report",
        listOt: "👤 Overtime Attendance Report",
        extNasto: "🍩 Extra Snacks:",
        extFaral: "🥛 Extra Faral:",
        totalSun: "Total Employees Coming on Sunday",
        totalOt: "Total Employees Doing Overtime",
        orderNasto: "Snacks Order",
        orderFaral: "Faral Order",
        staff: "Staff",
        extra: "Extra",
        total: "Total",
        nBadge: "N",
        fBadge: "F",
        emptyList: "No active attendance.",
        noDept: "No departments added.",
        dlBtn: "Download Report (Image)",
        modeText: "Mode",
        shiftTimeText: "⏰ Shift Time:",
        eraseBtnText: "🧹 Clear All",
        eraseConfirm: "Are you sure you want to clear all attendance and shift time data for this date?",
        lockBtnLocked: "🔒 Lock (Safe Mode)",
        lockBtnUnlocked: "🔓 Unlocked (Edit Mode)",
        editDeptTitlePrompt: "Enter new name for department:",
        editEmpNamePrompt: "Enter new name for employee:",
        editCompanyTitlePrompt: "Enter Office/Company name:",
        deleteDeptConfirm: "Are you sure you want to delete this department?",
        importSuccess: "Backup imported successfully to Firebase!",
        importError: "Error: Invalid backup file!",
        importFileError: "Error reading file! Please select a valid .txt backup file.",
        importConfirm: "Do you want to import this backup? It will overwrite current data on Firebase."
    }
};

const daysDictionary = {
    gu: ["રવિવાર (Sunday)", "સોમવાર (Monday)", "મંગળવાર (Tuesday)", "બુધવાર (Wednesday)", "જુરુવાર (Thursday)", "શુક્રવાર (Friday)", "શનિવાર (Saturday)"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};

// Date Handling
function initDate() {
    let savedDate = localStorage.getItem('officeSelectedDate');
    if (savedDate) {
        selectedDate = savedDate;
    } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1;
        let dd = today.getDate();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        selectedDate = yyyy + '-' + mm + '-' + dd;
    }
    document.getElementById('attendance-date').value = selectedDate;
}

function getFormattedDateAndDay(inputDateStr) {
    if (!inputDateStr) return { formattedDate: '--', dayName: '--' };
    const dateParts = inputDateStr.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    let dd = dateObj.getDate();
    let mm = dateObj.getMonth() + 1;
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return { 
        formattedDate: `${dd}/${mm}/${dateObj.getFullYear()}`, 
        dayName: daysDictionary[currentLang][dateObj.getDay()] 
    };
}

function onDateChange() {
    selectedDate = document.getElementById('attendance-date').value;
    localStorage.setItem('officeSelectedDate', selectedDate);
    document.getElementById('shift-time-input').value = shiftTimeRecords[selectedDate] || '';
    renderAll();
}

function onShiftTimeChange() {
    let val = document.getElementById('shift-time-input').value.trim();
    shiftTimeRecords[selectedDate] = val;
    saveToFirebase();
    renderAll();
}

// Theme Handling
function initTheme() {
    const savedTheme = localStorage.getItem('officeTheme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const activeTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('officeTheme', activeTheme);
}

// Localization Handling
function toggleLanguage() {
    currentLang = currentLang === 'gu' ? 'en' : 'gu';
    localStorage.setItem('officeLang', currentLang);
    updateLanguageUI();
    renderAll();
}

function updateLanguageUI() {
    const l = labels[currentLang];
    document.getElementById('main-title').innerText = officeNames[currentLang];
    document.getElementById('main-sub').innerText = l.sub;
    document.getElementById('label-date').innerText = l.labelDate;
    document.getElementById('new-dept-name').placeholder = l.addDeptPl;
    document.getElementById('add-dept-btn').innerText = l.addDeptBtn;
    document.getElementById('label-ext-nasto').innerText = l.extNasto;
    document.getElementById('label-ext-faral').innerText = l.extFaral;
    document.getElementById('label-download-btn').innerText = l.dlBtn;
    document.getElementById('label-shift-time').innerText = l.shiftTimeText;
    document.getElementById('main-erase-btn').innerText = l.eraseBtnText;
    
    // Switcher buttons lang labels
    document.getElementById('btn-sunday').innerText = currentLang === 'gu' ? "☀️ Sunday" : "☀️ Sunday";
    document.getElementById('btn-ot').innerText = currentLang === 'gu' ? "⏱️ Overtime" : "⏱️ Overtime";

    const lockBtn = document.getElementById('main-lock-btn');
    if (isUnlocked) {
        lockBtn.innerText = l.lockBtnUnlocked;
    } else {
        lockBtn.innerText = l.lockBtnLocked;
    }
}

// Mode switch Handling
function switchMode(mode) {
    currentMode = mode;
    localStorage.setItem('officeMode', mode);
    
    const body = document.body;
    const btnSunday = document.getElementById('btn-sunday');
    const btnOt = document.getElementById('btn-ot');
    const reportHeader = document.getElementById('report-header');
    const extraFoodBox = document.getElementById('extra-food-box');
    const filteredHeader = document.getElementById('filtered-header');
    const shiftTimeBox = document.getElementById('shift-time-box');
    const l = labels[currentLang];

    if (mode === 'sunday') {
        body.classList.add('sunday-theme');
        body.classList.remove('ot-theme');
        btnSunday.className = 'mode-btn active-sunday';
        btnOt.className = 'mode-btn';
        reportHeader.innerText = l.repSun;
        filteredHeader.innerText = l.listSun;
        extraFoodBox.style.display = 'none';
        shiftTimeBox.style.display = 'flex'; 
    } else {
        body.classList.add('ot-theme');
        body.classList.remove('sunday-theme');
        btnSunday.className = 'mode-btn';
        btnOt.className = 'mode-btn active-ot';
        reportHeader.innerText = l.repOt;
        filteredHeader.innerText = l.listOt;
        extraFoodBox.style.display = 'flex';
        shiftTimeBox.style.display = 'none'; 
    }
    renderAll();
}

// Attendance Records helper functions
function getStatus(deptName, empName, field) {
    let key = `${selectedDate}_${deptName}_${empName}`;
    return attendanceRecords[key] ? attendanceRecords[key][field] : false;
}

function toggleStatus(deptName, empName, field) {
    let key = `${selectedDate}_${deptName}_${empName}`;
    if (!attendanceRecords[key]) {
        attendanceRecords[key] = { sunday: false, nasto: false, faral: false, onlyOt: false };
    }
    
    if (field === 'sunday') { 
        attendanceRecords[key].sunday = !attendanceRecords[key].sunday; 
    } else if (field === 'nasto') { 
        attendanceRecords[key].nasto = !attendanceRecords[key].nasto; 
        if (attendanceRecords[key].nasto) {
            attendanceRecords[key].faral = false;
            attendanceRecords[key].onlyOt = false;
        }
    } else if (field === 'faral') { 
        attendanceRecords[key].faral = !attendanceRecords[key].faral; 
        if (attendanceRecords[key].faral) {
            attendanceRecords[key].nasto = false;
            attendanceRecords[key].onlyOt = false;
        }
    } else if (field === 'onlyOt') {
        attendanceRecords[key].onlyOt = !attendanceRecords[key].onlyOt;
        if (attendanceRecords[key].onlyOt) {
            attendanceRecords[key].nasto = false;
            attendanceRecords[key].faral = false;
        }
    }
    saveToFirebase();
    renderAll();
}

// Extra foods
function changeExtra(type, val) {
    if (!extraFoodRecords[selectedDate]) {
        extraFoodRecords[selectedDate] = { nasto: 0, faral: 0 };
    }
    extraFoodRecords[selectedDate][type] += val;
    if (extraFoodRecords[selectedDate][type] < 0) {
        extraFoodRecords[selectedDate][type] = 0;
    }
    saveToFirebase();
    renderAll();
}

// Department Operations
function addDepartment() {
    const input = document.getElementById('new-dept-name');
    const deptName = input.value.trim();
    if (deptName === '' || masterData[deptName]) return;
    masterData[deptName] = [];
    input.value = '';
    saveToFirebase();
    renderAll();
}

function handleDeptKeyPress(event) {
    if (event.key === 'Enter') addDepartment();
}

function deleteDepartment(deptName) {
    const l = labels[currentLang];
    if (confirm(`${l.deleteDeptConfirm} "${deptName}"?`)) {
        delete masterData[deptName];
        saveToFirebase();
        renderAll();
    }
}

function editDepartmentName(oldName) {
    if (!isUnlocked) return;
    const l = labels[currentLang];
    let newName = prompt(`${l.editDeptTitlePrompt} "${oldName}"`, oldName);
    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
        newName = newName.trim();
        masterData[newName] = masterData[oldName];
        delete masterData[oldName];
        
        // Migrate records key names to avoid data loss
        Object.keys(attendanceRecords).forEach(key => {
            const prefix = `${selectedDate}_${oldName}_`;
            if (key.startsWith(prefix)) {
                const empPart = key.replace(prefix, "");
                const newKey = `${selectedDate}_${newName}_${empPart}`;
                attendanceRecords[newKey] = attendanceRecords[key];
                delete attendanceRecords[key];
            }
        });

        saveToFirebase();
        renderAll();
    }
}

// Employee Operations
function addEmployee(deptName, inputId) {
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if (name === '') return;
    masterData[deptName].push(name);
    input.value = '';
    saveToFirebase();
    renderAll();
}

function handleEmpKeyPress(event, deptName, inputId) {
    if (event.key === 'Enter') addEmployee(deptName, inputId);
}

function deleteEmployee(deptName, index) {
    const empName = masterData[deptName][index];
    masterData[deptName].splice(index, 1);
    
    // Clean up record entry
    let key = `${selectedDate}_${deptName}_${empName}`;
    if (attendanceRecords[key]) delete attendanceRecords[key];

    saveToFirebase();
    renderAll();
}

function editEmployeeName(deptName, index, oldName) {
    if (!isUnlocked) return;
    const l = labels[currentLang];
    let newName = prompt(`${l.editEmpNamePrompt} "${oldName}"`, oldName);
    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
        newName = newName.trim();
        masterData[deptName][index] = newName;

        // Migrate records key name
        let oldKey = `${selectedDate}_${deptName}_${oldName}`;
        let newKey = `${selectedDate}_${deptName}_${newName}`;
        if (attendanceRecords[oldKey]) {
            attendanceRecords[newKey] = attendanceRecords[oldKey];
            delete attendanceRecords[oldKey];
        }

        saveToFirebase();
        renderAll();
    }
}

// Main Title Edit
function editMainTitle() {
    if (!isUnlocked) return;
    const l = labels[currentLang];
    let newTitle = prompt(l.editCompanyTitlePrompt, officeNames[currentLang].replace("📊 ", ""));
    if (newTitle && newTitle.trim() !== "") {
        officeNames[currentLang] = "📊 " + newTitle.trim();
        saveToFirebase();
        renderAll();
    }
}

// Erase All Data for selected date
function eraseAllAttendance() {
    const l = labels[currentLang];
    if (confirm(l.eraseConfirm)) {
        Object.keys(attendanceRecords).forEach(key => {
            if (key.startsWith(selectedDate + "_")) {
                delete attendanceRecords[key];
            }
        });
        if (extraFoodRecords[selectedDate]) delete extraFoodRecords[selectedDate];
        if (shiftTimeRecords[selectedDate]) delete shiftTimeRecords[selectedDate];
        
        saveToFirebase();
        
        document.getElementById('shift-time-input').value = '';
        renderAll();
    }
}

// Security Edit Toggle Lock
function toggleSecurityLock() {
    isUnlocked = !isUnlocked;
    const lockBtn = document.getElementById('main-lock-btn');
    const mainEditBtn = document.getElementById('main-edit-title-btn');
    const l = labels[currentLang];

    if (isUnlocked) {
        lockBtn.innerText = l.lockBtnUnlocked;
        lockBtn.classList.add('unlocked');
        mainEditBtn.style.display = 'inline-block';
    } else {
        lockBtn.innerText = l.lockBtnLocked;
        lockBtn.classList.remove('unlocked');
        mainEditBtn.style.display = 'none';
    }
    renderAll(); 
}

// Data Backup Utilities
function exportBackupData() {
    const backupObject = {
        officeCustomTitle: JSON.stringify(officeNames),
        officeMasterStructure: JSON.stringify(masterData),
        officeDateWiseRecords: JSON.stringify(attendanceRecords),
        officeDateWiseExtraFood: JSON.stringify(extraFoodRecords),
        officeDateWiseShiftTime: JSON.stringify(shiftTimeRecords)
    };
    const jsonString = JSON.stringify(backupObject);
    const blob = new Blob([jsonString], { type: "text/plain;charset=utf-8" });
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    downloadAnchor.href = URL.createObjectURL(blob);
    downloadAnchor.setAttribute("download", `attendance_backup_${today}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function triggerImportClick() {
    document.getElementById('hidden-file-input').click();
}

function importBackupData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const l = labels[currentLang];
        try {
            const parsedData = JSON.parse(e.target.result);
            if (!parsedData.officeMasterStructure && !parsedData.officeDateWiseRecords) {
                alert(l.importError);
                return;
            }

            if (confirm(l.importConfirm)) {
                if (parsedData.officeCustomTitle) officeNames = JSON.parse(parsedData.officeCustomTitle);
                if (parsedData.officeMasterStructure) masterData = JSON.parse(parsedData.officeMasterStructure);
                if (parsedData.officeDateWiseRecords) attendanceRecords = JSON.parse(parsedData.officeDateWiseRecords);
                if (parsedData.officeDateWiseExtraFood) extraFoodRecords = JSON.parse(parsedData.officeDateWiseExtraFood);
                if (parsedData.officeDateWiseShiftTime) shiftTimeRecords = JSON.parse(parsedData.officeDateWiseShiftTime);

                saveToFirebase(); // Push new imported data to Firebase
                
                document.getElementById('main-title').innerText = officeNames[currentLang];
                onDateChange();
                alert(l.importSuccess);
            }
        } catch (err) {
            console.error(err);
            alert(l.importFileError);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

// Download Report PNG Image Canvas Logic
function downloadReportImage() {
    const captureZone = document.getElementById('capture-zone');
    const { formattedDate, dayName } = getFormattedDateAndDay(selectedDate);
    
    const cleanTitle = officeNames[currentLang].replace("📊 ", "");
    document.getElementById('cap-office-title').innerText = cleanTitle;
    
    const modeLabel = currentMode === 'sunday' ? 'Sunday' : 'OT';
    
    // Add details dynamically
    let subtitleText = `${formattedDate} (${dayName}) | ${labels[currentLang].modeText}: ${modeLabel}`;
    if (currentMode === 'sunday' && shiftTimeRecords[selectedDate]) {
        subtitleText += ` | ${shiftTimeRecords[selectedDate]}`;
    }
    document.getElementById('cap-date-details').innerText = subtitleText;

    // Temporarily disable dark theme styles for the export capture
    const isDarkActive = document.body.classList.contains('dark-theme');
    if (isDarkActive) document.body.classList.remove('dark-theme');

    captureZone.classList.add('capture-mode-active');

    // Run canvas capturing
    html2canvas(captureZone, {
        scale: 2, 
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: 1200 
    }).then(canvas => {
        captureZone.classList.remove('capture-mode-active');
        if (isDarkActive) document.body.classList.add('dark-theme'); 

        const imageLink = document.createElement('a');
        imageLink.download = `Attendance_${formattedDate.replace(/\//g, '-')}_${currentMode}.png`;
        imageLink.href = canvas.toDataURL('image/png');
        imageLink.click();
    });
}

// Core Rendering UI
function renderAll() {
    const gridBox = document.getElementById('main-departments-grid');
    const reportGridBox = document.getElementById('report-grid-box');
    const filteredHorizontalBox = document.getElementById('filtered-horizontal-box');
    
    gridBox.innerHTML = '';
    reportGridBox.innerHTML = '';
    filteredHorizontalBox.innerHTML = '';

    let grandTotal = 0;
    let totalNasto = 0;
    let totalFaral = 0;
    let deptKeys = Object.keys(masterData);
    let l = labels[currentLang];

    let currentExtra = extraFoodRecords[selectedDate] || { nasto: 0, faral: 0 };
    document.getElementById('ext-nasto-val').innerText = currentExtra.nasto;
    document.getElementById('ext-faral-val').innerText = currentExtra.faral;

    if (deptKeys.length === 0) {
        gridBox.innerHTML = `<div class="no-dept-msg">${l.noDept}</div>`;
        filteredHorizontalBox.innerHTML = `<div class="no-active-msg">${l.emptyList}</div>`;
        document.getElementById('r-total-text').innerHTML = `<span class="grand-total-text">${l.total}: 0</span>`;
        return;
    }

    deptKeys.forEach((deptName, deptIndex) => {
        let deptPresentCount = 0;
        const inputId = `input-dept-${deptIndex}`;
        
        let deleteStyle = isUnlocked ? 'display: inline-flex;' : 'display: none;';
        let editStyle = isUnlocked ? 'display: inline-flex;' : 'display: none;';
        let showEmpInputStyle = isUnlocked ? 'display: flex;' : 'display: none;';
        
        const deptCard = document.createElement('div');
        deptCard.className = 'dept-card';
        
        let cardHTML = `
            <div class="dept-header">
                <div class="title-container">
                    <h3 class="dept-title">${deptName}</h3>
                    <button class="edit-btn" style="${editStyle}" onclick="editDepartmentName('${deptName}')" title="Edit Department Name">✏️</button>
                </div>
                <button class="delete-dept-btn" style="${deleteStyle}" onclick="deleteDepartment('${deptName}')" title="Delete Department">✕</button>
            </div>
            <div class="add-emp-form" style="${showEmpInputStyle}">
                <input type="text" id="${inputId}" placeholder="${l.empPl}" onkeypress="handleEmpKeyPress(event, '${deptName}', '${inputId}')" aria-label="Employee Name">
                <button onclick="addEmployee('${deptName}', '${inputId}')">+</button>
            </div>
            <ul class="emp-list">
        `;

        const employees = masterData[deptName] || [];
        if (employees.length === 0) {
            cardHTML += `<li class="no-active-msg">${l.emptyList}</li>`;
        } else {
            employees.forEach((empName, index) => {
                let innerActionHTML = '';
                let isSun = getStatus(deptName, empName, 'sunday');
                let isNasto = getStatus(deptName, empName, 'nasto');
                let isFaral = getStatus(deptName, empName, 'faral');
                let isOnlyOt = getStatus(deptName, empName, 'onlyOt');

                if (currentMode === 'sunday') {
                    if (isSun) { 
                        deptPresentCount++; 
                        grandTotal++; 
                    }
                    let statusText = isSun ? "Yes" : "No";
                    let buttonClass = isSun ? "btn-present" : "btn-absent";
                    innerActionHTML = `<button class="status-toggle-btn ${buttonClass}" onclick="toggleStatus('${deptName}', '${empName}', 'sunday')">${statusText}</button>`;
                } else {
                    if (isNasto || isFaral || isOnlyOt) {
                        deptPresentCount++; 
                        grandTotal++;
                        if (isNasto) totalNasto++; 
                        if (isFaral) totalFaral++; 
                    }
                    let nClass = isNasto ? "btn-nasto-active" : "btn-inactive";
                    let fClass = isFaral ? "btn-faral-active" : "btn-inactive";
                    let otClass = isOnlyOt ? "btn-only-ot-active" : "btn-inactive";
                    
                    innerActionHTML = `
                        <button class="status-toggle-btn ${nClass}" onclick="toggleStatus('${deptName}', '${empName}', 'nasto')">${l.nBadge}</button>
                        <button class="status-toggle-btn ${fClass}" onclick="toggleStatus('${deptName}', '${empName}', 'faral')">${l.fBadge}</button>
                        <button class="status-toggle-btn ${otClass}" onclick="toggleStatus('${deptName}', '${empName}', 'onlyOt')">OT</button>
                    `;
                }

                let showEmpDeleteStyle = isUnlocked ? 'display: inline-flex;' : 'display: none;';
                let empEditStyle = isUnlocked ? 'display: inline-flex;' : 'display: none;';

                cardHTML += `
                    <li class="emp-item">
                        <div class="name-container">
                            <span class="emp-name" onclick="editEmployeeName('${deptName}', ${index}, '${empName}')">${empName}</span>
                            <button class="edit-btn" style="${empEditStyle}" onclick="editEmployeeName('${deptName}', ${index}, '${empName}')" title="Edit Employee Name">✏️</button>
                        </div>
                        <div class="btn-group">
                            ${innerActionHTML}
                            <button class="delete-btn" style="${showEmpDeleteStyle}" onclick="deleteEmployee('${deptName}', ${index})" title="Delete Employee">✕</button>
                        </div>
                    </li>
                `;
            });
        }

        cardHTML += `</ul>`;
        deptCard.innerHTML = cardHTML;
        gridBox.appendChild(deptCard);

        // Append to Final Count Report Box if there is any attendance
        if (deptPresentCount > 0) {
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            reportItem.innerHTML = `${deptName}: <span>${deptPresentCount}</span>`;
            reportGridBox.appendChild(reportItem);
        }
    });

    // Populate Present Staff List grouped by department
    let hasAnyPresentStaff = false;
    deptKeys.forEach((deptName) => {
        let activeEmps = [];
        let employees = masterData[deptName] || [];
        employees.forEach((empName) => {
            let isSun = getStatus(deptName, empName, 'sunday');
            let isNasto = getStatus(deptName, empName, 'nasto');
            let isFaral = getStatus(deptName, empName, 'faral');
            let isOnlyOt = getStatus(deptName, empName, 'onlyOt');

            if (currentMode === 'sunday' && isSun) {
                activeEmps.push({ name: empName, badgeClass: 'badge-yes', badgeText: 'Yes' });
            } else if (currentMode === 'ot') {
                if (isNasto) activeEmps.push({ name: empName, badgeClass: 'badge-nasto', badgeText: l.nBadge });
                else if (isFaral) activeEmps.push({ name: empName, badgeClass: 'badge-faral', badgeText: l.fBadge });
                else if (isOnlyOt) activeEmps.push({ name: empName, badgeClass: 'badge-only-ot', badgeText: 'OT' });
            }
        });

        if (activeEmps.length > 0) {
            hasAnyPresentStaff = true;
            let group = document.createElement('div');
            group.className = 'filtered-dept-group';
            
            let header = document.createElement('div');
            header.className = 'filtered-dept-header';
            header.innerText = deptName;
            group.appendChild(header);

            let list = document.createElement('ul');
            list.className = 'filtered-vertical-list';
            activeEmps.forEach((emp) => {
                let row = document.createElement('li');
                row.className = 'filtered-emp-row';
                row.innerHTML = `<span>${emp.name}</span> <span class="food-badge ${emp.badgeClass}">${emp.badgeText}</span>`;
                list.appendChild(row);
            });
            group.appendChild(list);
            filteredHorizontalBox.appendChild(group);
        }
    });

    if (!hasAnyPresentStaff) {
        filteredHorizontalBox.innerHTML = `<div class="no-active-msg">${l.emptyList}</div>`;
    }

    // Grand Footer updates (Total counts, Extra snacks/faral, Food orders)
    if (currentMode === 'sunday') {
        let footerText = `<div class="grand-total-text">${l.totalSun}: ${grandTotal}</div>`;
        if (shiftTimeRecords[selectedDate]) {
            footerText += `<div style="font-size: 0.95rem; font-weight: 700; margin-top: 8px; color: var(--text-light);">${l.shiftTimeText} ${shiftTimeRecords[selectedDate]}</div>`;
        }
        document.getElementById('r-total-text').innerHTML = footerText;
    } else {
        let nastoGrand = totalNasto + currentExtra.nasto;
        let faralGrand = totalFaral + currentExtra.faral;
        document.getElementById('r-total-text').innerHTML = `
            <div class="grand-total-text">${l.totalOt}: ${grandTotal}</div>
            <div class="ot-food-breakdown">
                <div class="food-row">
                    <span>🍩 ${l.orderNasto}:</span>
                    <span>${l.staff} ${totalNasto} + ${l.extra} ${currentExtra.nasto} = <strong>${nastoGrand}</strong></span>
                </div>
                <div class="food-row">
                    <span>🥛 ${l.orderFaral}:</span>
                    <span>${l.staff} ${totalFaral} + ${l.extra} ${currentExtra.faral} = <strong>${faralGrand}</strong></span>
                </div>
            </div>
        `;
    }
}

// Initialization
initDate();
initTheme();

// Retrieve shift time for the selected date
document.getElementById('shift-time-input').value = shiftTimeRecords[selectedDate] || '';

// Select language from localstorage if saved
let savedLang = localStorage.getItem('officeLang');
if (savedLang) {
    currentLang = savedLang;
}

// Select mode from localstorage if saved
let savedMode = localStorage.getItem('officeMode');
if (savedMode) {
    currentMode = savedMode;
}

updateLanguageUI();

// Apply layout modes
switchMode(currentMode);

// Hide inputs initially by locking edit mode
isUnlocked = true; // Set to true so toggleSecurityLock turns it to false and locks it properly
toggleSecurityLock();
