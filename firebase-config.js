// ============================================================
// FIREBASE CONFIG – Your project: schlinder-bddd2
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyA9tgukVDeF2WPaA8ccP-nX1Pmo6NDqaE8",
  authDomain: "schlinder-bddd2.firebaseapp.com",
  projectId: "schlinder-bddd2",
  storageBucket: "schlinder-bddd2.firebasestorage.app",
  messagingSenderId: "261440140081",
  appId: "1:261440140081:web:8116d7ab1dbd804626f610",
  measurementId: "G-MJ6V3YJDD8"
};

// Initialize Firebase (compat SDK – matches the scripts in index.html)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
