// ============================================================
// FIREBASE CONFIG – REPLACE THESE VALUES WITH YOUR OWN
// ============================================================
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or use existing)
// 3. Add a Web app → copy the config object
// 4. Enable Authentication → Email/Password
// 5. Create Firestore Database (start in test mode for demo)
// 6. Enable Storage
// 7. Paste your config below

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
