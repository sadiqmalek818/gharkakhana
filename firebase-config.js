// ============================================================
// GharKaKhana — Firebase config (SHARED by all 3 apps)
// ============================================================
// 1. Replace the values below with YOUR project's config
//    (Firebase Console → ⚙️ Project settings → Your apps → Web app)
// 2. Keep this exact filename: firebase-config.js
// 3. Put it in the SAME folder as gharkakhana-website.html,
//    gharkakhana-cook.html, and gharkakhana-admin.html
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDo1rNicf4mCvqYquh08sMpiVQiIYfXRA4",
  authDomain: "gharkakhana-1905d.firebaseapp.com",
  projectId: "gharkakhana-1905d",
  storageBucket: "gharkakhana-1905d.firebasestorage.app",
  messagingSenderId: "135072807838",
  appId: "1:135072807838:web:c5125af6b36e42dba9748f",
};

// window.FIREBASE_CONFIGURED tells the 3 HTML files whether it's safe to talk
// to Firestore. If you haven't pasted your real config yet, we skip
// initializing Firebase entirely — that's what stops the "Uncaught Error" and
// lets the apps fall back to local demo mode instead of crashing.
window.FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY";

let db = null;
if(window.FIREBASE_CONFIGURED){
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  } catch(err){
    console.error("Firebase failed to initialize — check your config values:", err);
    window.FIREBASE_CONFIGURED = false;
  }
}

// Collections used across the app — same names everywhere so all
// three panels (admin, cook, website) read/write the same data:
//   cooks   → cook profiles (name, area, phone, status)
//   riders  → delivery riders (name, area, phone, status)
//   menu    → all menu items (name, cook, category, unit, price, status)
//   orders  → customer orders (items, cook, meal, date, status, fulfilment)
