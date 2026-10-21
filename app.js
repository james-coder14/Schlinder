// ============================================================
// SCHLINDER – Main App Logic
// ============================================================

// ---------- DOM refs ----------
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

const tabs = document.querySelectorAll('.tab');
const tabContents = {
  discover: document.getElementById('discover-tab'),
  matches: document.getElementById('matches-tab'),
  profile: document.getElementById('profile-tab')
};

const cardStack = document.getElementById('card-stack');
const noMoreCards = document.getElementById('no-more-cards');
const swipeActions = document.getElementById('swipe-actions');
const matchesList = document.getElementById('matches-list');
const noMatches = document.getElementById('no-matches');
const matchModal = document.getElementById('match-modal');

// Profile form
const profileForm = document.getElementById('profile-form');
const photoInput = document.getElementById('photo-input');
const profilePhoto = document.getElementById('profile-photo');
const photoPlaceholder = document.getElementById('photo-placeholder');
const aboutCount = document.getElementById('about-count');

// State
let currentUser = null;
let userProfile = null;
let discoverQueue = [];
let currentCardIndex = 0;
let isDragging = false;
let startX = 0;
let currentX = 0;

// ============================================================
// AUTH
// ============================================================

document.getElementById('show-signup').addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  authError.textContent = '';
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  authError.textContent = '';
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    authError.textContent = 'Please fill in all fields';
    return;
  }
  try {
    authError.textContent = 'Logging in...';
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    authError.textContent = err.message.replace('Firebase: ', '');
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) {
    authError.textContent = 'Please fill in all fields';
    return;
  }
  if (password.length < 6) {
    authError.textContent = 'Password must be at least 6 characters';
    return;
  }
  try {
    authError.textContent = 'Creating account...';
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    // Create initial profile
    await db.collection('users').doc(cred.user.uid).set({
      name,
      email,
      dob: '',
      city: '',
      about: '',
      interests: '',
      gender: 'Man',
      showMe: 'Everyone',
      minAge: 18,
      maxAge: 29,
      visible: true,
      photoURL: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      likes: [],
      matches: []
    });
  } catch (err) {
    authError.textContent = err.message.replace('Firebase: ', '');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut();
});

// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    await loadUserProfile();

    // Force new users to finish their profile first
    if (!isProfileComplete(userProfile)) {
      switchToTab('profile');
      showToast('Finish setting up your profile to start matching!');
    } else {
      loadDiscover();
      loadMatches();
    }
  } else {
    currentUser = null;
    userProfile = null;
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
  }
});

function isProfileComplete(p) {
  if (!p) return false;
  return !!(p.name && p.dob && p.city);
}

function switchToTab(target) {
  tabs.forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`.tab[data-tab="${target}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  Object.values(tabContents).forEach(c => c.classList.add('hidden'));
  if (tabContents[target]) tabContents[target].classList.remove('hidden');
}

// ============================================================
// TABS
// ============================================================

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    // Block Discover & Matches until profile is complete
    if ((target === 'discover' || target === 'matches') && !isProfileComplete(userProfile)) {
      showToast('Please finish your profile first');
      switchToTab('profile');
      return;
    }

    switchToTab(target);

    if (target === 'matches') loadMatches();
    if (target === 'discover') loadDiscover();
  });
});

// ============================================================
// PROFILE
// ============================================================

async function loadUserProfile() {
  const doc = await db.collection('users').doc(currentUser.uid).get();
  if (doc.exists) {
    userProfile = doc.data();
    fillProfileForm(userProfile);
  }
}

function fillProfileForm(p) {
  document.getElementById('profile-name').value = p.name || '';
  document.getElementById('profile-dob').value = p.dob || '';
  const citySelect = document.getElementById('profile-city');
  if (p.city === 'WELOCK' || p.city === 'BARHEN') {
    citySelect.value = p.city;
  } else {
    citySelect.selectedIndex = 0;
  }
  document.getElementById('profile-about').value = p.about || '';
  aboutCount.textContent = (p.about || '').length;
  document.getElementById('profile-interests').value = p.interests || '';
  document.getElementById('profile-gender').value = p.gender || 'Man';
  document.getElementById('profile-showme').value = p.showMe || 'Everyone';
  document.getElementById('profile-minage').value = p.minAge || 18;
  document.getElementById('profile-maxage').value = p.maxAge || 29;
  document.getElementById('profile-visible').checked = p.visible !== false;

  if (p.photoURL) {
    profilePhoto.src = p.photoURL;
    profilePhoto.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
  } else {
    profilePhoto.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
  }
}

document.getElementById('profile-about').addEventListener('input', (e) => {
  aboutCount.textContent = e.target.value.length;
});

// Compress image to base64 so we don't need Firebase Storage (free Spark plan)
function compressImage(file, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    showToast('Photo must be under 8 MB');
    return;
  }
  try {
    showToast('Saving photo...');
    const dataUrl = await compressImage(file);
    // Keep under Firestore 1MB doc limit
    if (dataUrl.length > 900000) {
      showToast('Photo still too large — try a smaller one');
      return;
    }
    profilePhoto.src = dataUrl;
    profilePhoto.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    await db.collection('users').doc(currentUser.uid).update({ photoURL: dataUrl });
    userProfile.photoURL = dataUrl;
    showToast('Photo updated!');
  } catch (err) {
    showToast('Photo failed: ' + (err.message || 'try again'));
  }
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('profile-name').value.trim(),
    dob: document.getElementById('profile-dob').value,
    city: document.getElementById('profile-city').value.trim(),
    about: document.getElementById('profile-about').value.trim(),
    interests: document.getElementById('profile-interests').value.trim(),
    gender: document.getElementById('profile-gender').value,
    showMe: document.getElementById('profile-showme').value,
    minAge: parseInt(document.getElementById('profile-minage').value) || 18,
    maxAge: parseInt(document.getElementById('profile-maxage').value) || 99,
    visible: document.getElementById('profile-visible').checked
  };

  if (!data.name || !data.dob || !data.city) {
    showToast('Please fill in name, date of birth, and city');
    return;
  }

  try {
    await db.collection('users').doc(currentUser.uid).update(data);
    userProfile = { ...userProfile, ...data };
    showToast('Profile saved! You can now start matching 🔥');
    // Unlock the rest of the app
    loadDiscover();
    loadMatches();
  } catch (err) {
    showToast('Error saving: ' + err.message);
  }
});

// ============================================================
// DISCOVER
// ============================================================

async function loadDiscover() {
  if (!userProfile) return;

  cardStack.innerHTML = '<div class="spinner"></div>';
  noMoreCards.classList.add('hidden');
  swipeActions.classList.add('hidden');

  try {
    // Simple query: get other users who are visible
    // (In production you'd add better filtering by age/gender/location)
    const snapshot = await db.collection('users')
      .where('visible', '==', true)
      .limit(30)
      .get();

    const myLikes = userProfile.likes || [];
    const myMatches = userProfile.matches || [];

    discoverQueue = [];
    snapshot.forEach(doc => {
      if (doc.id === currentUser.uid) return;
      if (myLikes.includes(doc.id) || myMatches.includes(doc.id)) return;
      const data = doc.data();
      // Basic age filter
      const age = calcAge(data.dob);
      if (age && (age < (userProfile.minAge || 18) || age > (userProfile.maxAge || 99))) return;
      discoverQueue.push({ id: doc.id, ...data });
    });

    // Shuffle a bit
    discoverQueue = discoverQueue.sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    renderCurrentCard();
  } catch (err) {
    console.error(err);
    cardStack.innerHTML = '';
    noMoreCards.classList.remove('hidden');
  }
}

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function renderCurrentCard() {
  cardStack.innerHTML = '';
  if (currentCardIndex >= discoverQueue.length) {
    noMoreCards.classList.remove('hidden');
    swipeActions.classList.add('hidden');
    return;
  }

  noMoreCards.classList.add('hidden');
  swipeActions.classList.remove('hidden');

  const p = discoverQueue[currentCardIndex];
  const age = calcAge(p.dob);
  const interests = (p.interests || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);

  const card = document.createElement('div');
  card.className = 'profile-card';
  card.innerHTML = `
    <img src="${p.photoURL || 'https://via.placeholder.com/400x400?text=No+Photo'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x400?text=No+Photo'" />
    <div class="card-info">
      <h3>${p.name || 'Anonymous'}${age ? ', ' + age : ''}</h3>
      <p class="age-city">${p.city || ''}</p>
      <p class="about">${p.about || ''}</p>
      <div class="interests">
        ${interests.map(i => `<span class="interest-tag">${i}</span>`).join('')}
      </div>
    </div>
  `;

  // Swipe gestures
  card.addEventListener('touchstart', onDragStart, { passive: true });
  card.addEventListener('mousedown', onDragStart);
  card.addEventListener('touchmove', onDragMove, { passive: false });
  card.addEventListener('mousemove', onDragMove);
  card.addEventListener('touchend', onDragEnd);
  card.addEventListener('mouseup', onDragEnd);
  card.addEventListener('mouseleave', onDragEnd);

  cardStack.appendChild(card);
}

function onDragStart(e) {
  isDragging = true;
  startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  currentX = startX;
  const card = cardStack.querySelector('.profile-card');
  if (card) card.classList.add('swiping');
}

function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
  const delta = currentX - startX;
  const card = cardStack.querySelector('.profile-card');
  if (card) {
    card.style.transform = `translateX(${delta}px) rotate(${delta * 0.05}deg)`;
    card.style.opacity = 1 - Math.abs(delta) / 400;
  }
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  const delta = currentX - startX;
  const card = cardStack.querySelector('.profile-card');
  if (!card) return;

  if (delta > 100) {
    // Like
    card.style.transform = 'translateX(120%) rotate(15deg)';
    card.style.opacity = '0';
    setTimeout(() => handleSwipe(true), 250);
  } else if (delta < -100) {
    // Dislike
    card.style.transform = 'translateX(-120%) rotate(-15deg)';
    card.style.opacity = '0';
    setTimeout(() => handleSwipe(false), 250);
  } else {
    card.style.transform = '';
    card.style.opacity = '1';
    card.classList.remove('swiping');
  }
}

document.getElementById('like-btn').addEventListener('click', () => {
  const card = cardStack.querySelector('.profile-card');
  if (card) {
    card.style.transform = 'translateX(120%) rotate(15deg)';
    card.style.opacity = '0';
    setTimeout(() => handleSwipe(true), 250);
  }
});

document.getElementById('dislike-btn').addEventListener('click', () => {
  const card = cardStack.querySelector('.profile-card');
  if (card) {
    card.style.transform = 'translateX(-120%) rotate(-15deg)';
    card.style.opacity = '0';
    setTimeout(() => handleSwipe(false), 250);
  }
});

document.getElementById('check-again-btn').addEventListener('click', loadDiscover);

async function handleSwipe(liked) {
  const target = discoverQueue[currentCardIndex];
  if (!target) return;

  currentCardIndex++;

  if (liked) {
    // Add to my likes
    const myLikes = userProfile.likes || [];
    if (!myLikes.includes(target.id)) {
      myLikes.push(target.id);
      await db.collection('users').doc(currentUser.uid).update({ likes: myLikes });
      userProfile.likes = myLikes;
    }

    // Check if they already liked me → match!
    const theirDoc = await db.collection('users').doc(target.id).get();
    const theirData = theirDoc.data() || {};
    const theirLikes = theirData.likes || [];

    if (theirLikes.includes(currentUser.uid)) {
      // It's a match!
      const myMatches = userProfile.matches || [];
      if (!myMatches.includes(target.id)) {
        myMatches.push(target.id);
        await db.collection('users').doc(currentUser.uid).update({ matches: myMatches });
        userProfile.matches = myMatches;
      }
      const theirMatches = theirData.matches || [];
      if (!theirMatches.includes(currentUser.uid)) {
        theirMatches.push(currentUser.uid);
        await db.collection('users').doc(target.id).update({ matches: theirMatches });
      }
      // Show match modal
      document.getElementById('match-name').textContent = `You and ${target.name} liked each other!`;
      matchModal.classList.remove('hidden');
    }
  }

  renderCurrentCard();
}

document.getElementById('close-match').addEventListener('click', () => {
  matchModal.classList.add('hidden');
});

// ============================================================
// MATCHES
// ============================================================

async function loadMatches() {
  matchesList.innerHTML = '';
  const matchIds = userProfile?.matches || [];
  const badge = document.getElementById('match-count-badge');

  if (matchIds.length === 0) {
    noMatches.classList.remove('hidden');
    if (badge) {
      badge.classList.add('hidden');
      badge.textContent = '0';
    }
    return;
  }

  noMatches.classList.add('hidden');
  if (badge) {
    badge.textContent = matchIds.length;
    badge.classList.remove('hidden');
  }

  for (const id of matchIds) {
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) continue;
      const p = doc.data();
      const age = calcAge(p.dob);

      const item = document.createElement('div');
      item.className = 'match-item';
      item.innerHTML = `
        <img src="${p.photoURL || 'https://via.placeholder.com/100?text=?'}" alt="" onerror="this.src='https://via.placeholder.com/100?text=?'" />
        <div class="match-info">
          <h4>${p.name || 'Someone'}${age ? ', ' + age : ''}</h4>
          <p>${p.city || 'Say hello!'}</p>
        </div>
        <button class="say-hi-btn" data-name="${(p.name || 'them').replace(/"/g, '')}" data-id="${id}">Say hi 👋</button>
      `;
      matchesList.appendChild(item);
    } catch (e) {
      console.error(e);
    }
  }

  // Wire up Say hi buttons
  matchesList.querySelectorAll('.say-hi-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMessageModal(btn.dataset.name, btn.dataset.id);
    });
  });
}

function openMessageModal(name, id) {
  document.getElementById('message-to-name').textContent = `To ${name}`;
  document.getElementById('message-text').value = '';
  document.getElementById('message-modal').dataset.targetId = id;
  document.getElementById('message-modal').classList.remove('hidden');
}

document.getElementById('close-message').addEventListener('click', () => {
  document.getElementById('message-modal').classList.add('hidden');
});

document.getElementById('send-message-btn').addEventListener('click', () => {
  const text = document.getElementById('message-text').value.trim();
  if (!text) {
    showToast('Type a message first');
    return;
  }
  // Simple local "sent" for now (no real chat backend yet)
  document.getElementById('message-modal').classList.add('hidden');
  showToast('Message sent! 🔥');
});

// ============================================================
// UTILS
// ============================================================

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Prevent default drag behavior on images
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});
