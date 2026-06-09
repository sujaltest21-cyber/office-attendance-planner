/* ============================================================
   Firebase Configuration — firebase-config.js
   Connect your app to Firebase Realtime Database for cloud sync
   ============================================================ */

// ─── Firebase SDK imports (from CDN loaded in index.html) ──
// firebase-app and firebase-database are loaded via CDN script tags

// ─── YOUR FIREBASE CONFIG ──────────────────────────────────
// 👇 Firebase Console → Project Settings → Web App → Config copy કરીને અહીં paste કરો
const firebaseConfig = {
  apiKey: "AIzaSyDu-HAz5glTQL17dZEGbj8k0W0e8nRQQvg",
  authDomain: "office-1b9d9.firebaseapp.com",
  databaseURL: "https://office-1b9d9-default-rtdb.firebaseio.com",
  projectId: "office-1b9d9",
  storageBucket: "office-1b9d9.firebasestorage.app",
  messagingSenderId: "726678298012",
  appId: "1:726678298012:web:7580237ecb01ea651d7c59"
};

// ─── Initialize Firebase ───────────────────────────────────
let app, db, dbRef, connectedRef;

function initFirebase() {
  try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    dbRef = db.ref('worktrack');
    connectedRef = db.ref('.info/connected');
    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return false;
  }
}

// ─── Check if Firebase is configured ───────────────────────
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.databaseURL !== "https://YOUR_PROJECT-default-rtdb.firebaseio.com";
}

// ─── Save state to Firebase ────────────────────────────────
function saveToFirebase(state) {
  if (!dbRef) return Promise.reject('Firebase not initialized');
  return dbRef.set(state)
    .then(() => {
      console.log('☁️ Data saved to Firebase');
    })
    .catch((error) => {
      console.error('❌ Firebase save error:', error);
      // Fallback: save to localStorage
      localStorage.setItem('worktrack_state', JSON.stringify(state));
    });
}

// ─── Listen for real-time changes from Firebase ────────────
function listenToFirebase(callback) {
  if (!dbRef) return;
  dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('📡 Data received from Firebase');
      callback(data);
    }
  }, (error) => {
    console.error('❌ Firebase listen error:', error);
  });
}

// ─── Monitor connection status ─────────────────────────────
function monitorConnection(onConnected, onDisconnected) {
  if (!connectedRef) return;
  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      console.log('🟢 Connected to Firebase');
      onConnected();
    } else {
      console.log('🔴 Disconnected from Firebase');
      onDisconnected();
    }
  });
}

// ─── Migrate localStorage data to Firebase ─────────────────
function migrateLocalStorageToFirebase() {
  const raw = localStorage.getItem('worktrack_state');
  if (!raw) return Promise.resolve(false);

  try {
    const localData = JSON.parse(raw);
    // Check if there's actual data to migrate
    if (!localData.employees || localData.employees.length === 0) {
      return Promise.resolve(false);
    }

    console.log('📦 Migrating localStorage data to Firebase...');
    return dbRef.once('value').then((snapshot) => {
      const cloudData = snapshot.val();

      // Only migrate if Firebase is empty or has no employees
      if (!cloudData || !cloudData.employees || cloudData.employees.length === 0) {
        return dbRef.set(localData).then(() => {
          console.log('✅ Migration complete! localStorage data pushed to Firebase');
          localStorage.setItem('worktrack_state_backup', raw); // Keep backup
          localStorage.removeItem('worktrack_state'); // Clear old storage
          return true;
        });
      } else {
        console.log('ℹ️ Firebase already has data, skipping migration');
        localStorage.removeItem('worktrack_state'); // Clear old storage
        return false;
      }
    });
  } catch (e) {
    console.error('❌ Migration error:', e);
    return Promise.resolve(false);
  }
}
