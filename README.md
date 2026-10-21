# 🔥 schlinder.

A fun Tinder-style dating web app built with **vanilla JavaScript** + **Firebase**.

Looks and feels just like the screenshots you provided.

---

## Features

- Email/password authentication
- Profile with photo upload (Firebase Storage)
- Discover / swipe cards (like & dislike)
- Real mutual matches
- Matches list
- Discovery preferences (gender, age range, visibility)
- Fully responsive mobile-first UI

---

## Quick Start (5 minutes)

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it anything (e.g. `schlinder-app`)
3. Disable Google Analytics if you want (optional)
4. Click **Continue**

### 2. Register a Web App

1. On the project overview, click the **</>** (Web) icon
2. Nickname: `schlinder`
3. Check **Also set up Firebase Hosting** (optional but recommended)
4. Copy the `firebaseConfig` object

### 3. Enable services

| Service        | How to enable                                      |
|----------------|----------------------------------------------------|
| **Authentication** | Build → Authentication → Get started → **Email/Password** → Enable |
| **Firestore**      | Build → Firestore Database → Create database → **Start in test mode** (for demo) → Choose location |
| **Storage**        | Build → Storage → Get started → **Start in test mode** |

> **Important for production later**: Update Firestore & Storage rules so only authenticated users can read/write their own data.

### 4. Paste your config

Open `firebase-config.js` and replace the placeholder values with the ones from step 2.

### 5. Run locally

Just open `index.html` in a browser **or** use a simple local server:

```bash
# If you have Python
python -m http.server 3000

# Or with Node
npx serve .
```

Then visit `http://localhost:3000`

### 6. Deploy to Firebase Hosting (optional)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, set public directory to "."
firebase deploy
```

Your app will be live at `https://YOUR_PROJECT.web.app`

---

## Upload to GitHub

```bash
cd schlinder-app
git init
git add .
git commit -m "Initial schlinder app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/schlinder.git
git push -u origin main
```

---

## Project structure

```
schlinder-app/
├── index.html          # Main UI
├── styles.css          # All styling (matches the original design)
├── app.js              # Auth, discover, matches, profile logic
├── firebase-config.js  # ← Put your Firebase keys here
└── README.md
```

---

## Notes

- The discover feed shows other users who have **“Show my profile in discovery”** turned on.
- Matches only appear when **both** people swipe right (like).
- Photos are stored privately in Firebase Storage under `photos/{uid}/`.
- Age is calculated from the date of birth and only the age is shown to others.

Enjoy building! 🔥
