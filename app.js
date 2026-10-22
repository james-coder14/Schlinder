// ============================================================
// SCHLINDER v2 – Discover, Matches, Chat, Fake profiles
// ============================================================

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const chatScreen = document.getElementById('chat-screen');
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

const photoInput = document.getElementById('photo-input');
const profilePhoto = document.getElementById('profile-photo');
const photoPlaceholder = document.getElementById('photo-placeholder');
const aboutCount = document.getElementById('about-count');
const profileForm = document.getElementById('profile-form');

let currentUser = null;
let userProfile = null;
let discoverQueue = [];
let currentCardIndex = 0;
let isDragging = false;
let startX = 0;
let currentX = 0;
let activeChatId = null; // other user's uid
let activeChatName = '';
let chatUnsub = null;
let lastMatchTarget = null;

// Colored placeholder avatars (no external deps)
const AVATAR_COLORS = ['#ff6b81', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'];
function avatarDataUrl(name, color) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const c = color || AVATAR_COLORS[Math.abs(hashCode(name || '')) % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="${c}" width="400" height="400"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="160" font-family="system-ui,sans-serif" font-weight="700">${initial}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return h;
}

// ---------- FAKE PROFILE TEMPLATES ----------
const FAKE_TEMPLATES = [
  { name: 'Maya', gender: 'Woman', city: 'WELOCK', age: 16, about: 'Always down for iced coffee runs and late-night playlists ☕', interests: 'Music, Food, Movies', lookingFor: 'Friends' },
  { name: 'Jordan', gender: 'Man', city: 'BARHEN', age: 17, about: 'Gamer by night, gym sometimes. Looking for people who get the jokes.', interests: 'Gaming, Memes, Sports', lookingFor: 'Hangouts' },
  { name: 'Ava', gender: 'Woman', city: 'WELOCK', age: 15, about: 'Art kid. Sketching, Pinterest boards, and chaos.', interests: 'Art, Music, Memes', lookingFor: 'Friends' },
  { name: 'Leo', gender: 'Man', city: 'BARHEN', age: 18, about: 'Soccer, coding, and bad movies. Take your pick.', interests: 'Sports, Coding, Movies', lookingFor: 'Friends' },
  { name: 'Sam', gender: 'Non-binary', city: 'WELOCK', age: 16, about: 'Quiet until you get me talking about music or food trucks.', interests: 'Music, Food, Art', lookingFor: 'Hangouts' },
  { name: 'Zoe', gender: 'Woman', city: 'BARHEN', age: 17, about: 'Drama club + matcha addiction. Hmu if you like spontaneous plans.', interests: 'Movies, Food, Music', lookingFor: 'Friends' },
  { name: 'Noah', gender: 'Man', city: 'WELOCK', age: 15, about: 'Bikes, basketball, and trying not to fail math.', interests: 'Sports, Gaming, Memes', lookingFor: 'Hangouts' },
  { name: 'Riley', gender: 'Woman', city: 'BARHEN', age: 16, about: 'Bookworm who also games. Soft chaos energy.', interests: 'Movies, Gaming, Art', lookingFor: 'Friends' }
];

function ageToDob(age) {
  const y = new Date().getFullYear() - age;
  return `${y}-06-15`;
}

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
  if (!email || !password) { authError.textContent = 'Please fill in all fields'; return; }
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
  if (!name || !email || !password) { authError.textContent = 'Please fill in all fields'; return; }
  if (password.length < 6) { authError.textContent = 'Password must be at least 6 characters'; return; }
  try {
    authError.textContent = 'Creating account...';
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name, email, dob: '', city: '', about: '', interests: '', lookingFor: 'Friends',
      gender: 'Man', showMe: 'Everyone', minAge: 15, maxAge: 25, visible: true,
      photoURL: '', isFake: false, likes: [], matches: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    authError.textContent = err.message.replace('Firebase: ', '');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    await loadUserProfile();
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
    chatScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
  }
});

function isProfileComplete(p) {
  return !!(p && p.name && p.dob && p.city);
}

function switchToTab(target) {
  tabs.forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`.tab[data-tab="${target}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  Object.values(tabContents).forEach(c => c.classList.add('hidden'));
  if (tabContents[target]) tabContents[target].classList.remove('hidden');
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
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
  const ref = db.collection('users').doc(currentUser.uid);
  const doc = await ref.get();
  if (doc.exists) {
    userProfile = doc.data();
  } else {
    userProfile = {
      name: '', email: currentUser.email || '', dob: '', city: '', about: '', interests: '',
      lookingFor: 'Friends', gender: 'Man', showMe: 'Everyone', minAge: 15, maxAge: 25,
      visible: true, photoURL: '', isFake: false, likes: [], matches: []
    };
    try { await ref.set(userProfile); } catch (e) { console.error(e); }
  }
  fillProfileForm(userProfile);
}

function fillProfileForm(p) {
  document.getElementById('profile-name').value = p.name || '';
  document.getElementById('profile-dob').value = p.dob || '';
  const citySelect = document.getElementById('profile-city');
  if (p.city === 'WELOCK' || p.city === 'BARHEN') citySelect.value = p.city;
  else citySelect.selectedIndex = 0;
  document.getElementById('profile-about').value = p.about || '';
  aboutCount.textContent = (p.about || '').length;
  document.getElementById('profile-interests').value = p.interests || '';
  const lookingEl = document.getElementById('profile-lookingfor');
  if (lookingEl) lookingEl.value = p.lookingFor || 'Friends';
  document.getElementById('profile-gender').value = p.gender || 'Man';
  document.getElementById('profile-showme').value = p.showMe || 'Everyone';
  document.getElementById('profile-minage').value = p.minAge || 15;
  document.getElementById('profile-maxage').value = p.maxAge || 25;
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

function compressImage(file, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
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
  if (file.size > 8 * 1024 * 1024) { showToast('Photo must be under 8 MB'); return; }
  try {
    showToast('Saving photo...');
    const dataUrl = await compressImage(file);
    if (dataUrl.length > 900000) { showToast('Photo still too large — try a smaller one'); return; }
    profilePhoto.src = dataUrl;
    profilePhoto.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    await db.collection('users').doc(currentUser.uid).set({ photoURL: dataUrl }, { merge: true });
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
    lookingFor: document.getElementById('profile-lookingfor')?.value || 'Friends',
    gender: document.getElementById('profile-gender').value,
    showMe: document.getElementById('profile-showme').value,
    minAge: parseInt(document.getElementById('profile-minage').value) || 15,
    maxAge: parseInt(document.getElementById('profile-maxage').value) || 25,
    visible: document.getElementById('profile-visible').checked
  };
  if (!data.name || !data.dob || !data.city) {
    showToast('Please fill in name, date of birth, and city');
    return;
  }
  try {
    await db.collection('users').doc(currentUser.uid).set(data, { merge: true });
    userProfile = { ...userProfile, ...data };
    showToast('Profile saved! You can now start matching 🔥');
    loadDiscover();
    loadMatches();
  } catch (err) {
    showToast('Error saving: ' + err.message);
  }
});

document.getElementById('interest-chips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  e.preventDefault();
  const interest = btn.dataset.interest;
  const input = document.getElementById('profile-interests');
  let list = (input.value || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes(interest)) {
    list = list.filter(i => i !== interest);
    btn.classList.remove('active');
  } else if (list.length < 6) {
    list.push(interest);
    btn.classList.add('active');
  } else {
    showToast('Max 6 interests');
    return;
  }
  input.value = list.join(', ');
});

// ============================================================
// FAKE PROFILES
// ============================================================

async function createFakeProfile(data) {
  const id = 'fake_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const photoURL = avatarDataUrl(data.name);
  await db.collection('users').doc(id).set({
    name: data.name,
    email: '',
    dob: ageToDob(data.age || 17),
    city: data.city || 'WELOCK',
    about: data.about || '',
    interests: data.interests || '',
    lookingFor: data.lookingFor || 'Friends',
    gender: data.gender || 'Woman',
    showMe: 'Everyone',
    minAge: 13,
    maxAge: 99,
    visible: true,
    photoURL,
    isFake: true,
    likes: [],
    matches: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return id;
}

async function seedFakeProfiles() {
  showToast('Adding fake profiles...');
  try {
    for (const t of FAKE_TEMPLATES) {
      await createFakeProfile(t);
    }
    showToast('Added 8 fake profiles! Check Discover 🔥');
    loadDiscover();
  } catch (err) {
    showToast('Failed: ' + err.message);
  }
}

document.getElementById('seed-fake-btn')?.addEventListener('click', seedFakeProfiles);
document.getElementById('seed-fakes-profile-btn')?.addEventListener('click', seedFakeProfiles);

document.getElementById('open-create-fake')?.addEventListener('click', () => {
  document.getElementById('fake-modal').classList.remove('hidden');
});
document.getElementById('close-fake')?.addEventListener('click', () => {
  document.getElementById('fake-modal').classList.add('hidden');
});

document.getElementById('create-fake-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('fake-name').value.trim();
  if (!name) { showToast('Name required'); return; }
  try {
    await createFakeProfile({
      name,
      city: document.getElementById('fake-city').value,
      gender: document.getElementById('fake-gender').value,
      age: parseInt(document.getElementById('fake-age').value) || 17,
      about: document.getElementById('fake-about').value.trim(),
      interests: document.getElementById('fake-interests').value.trim(),
      lookingFor: document.getElementById('fake-looking').value
    });
    document.getElementById('fake-modal').classList.add('hidden');
    showToast(`Created ${name}! They're in Discover now`);
    loadDiscover();
  } catch (err) {
    showToast('Error: ' + err.message);
  }
});

// ============================================================
// DISCOVER
// ============================================================

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

async function loadDiscover() {
  if (!userProfile) return;
  cardStack.innerHTML = '<div class="spinner"></div>';
  noMoreCards.classList.add('hidden');
  swipeActions.classList.add('hidden');

  try {
    const snapshot = await db.collection('users').where('visible', '==', true).limit(50).get();
    const myLikes = userProfile.likes || [];
    const myMatches = userProfile.matches || [];

    discoverQueue = [];
    snapshot.forEach(doc => {
      if (doc.id === currentUser.uid) return;
      if (myLikes.includes(doc.id) || myMatches.includes(doc.id)) return;
      const data = doc.data();
      const age = calcAge(data.dob);
      if (age != null && (age < (userProfile.minAge || 13) || age > (userProfile.maxAge || 99))) return;
      discoverQueue.push({ id: doc.id, ...data });
    });
    discoverQueue = discoverQueue.sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    renderCurrentCard();
  } catch (err) {
    console.error(err);
    cardStack.innerHTML = '';
    noMoreCards.classList.remove('hidden');
  }
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
  const photo = p.photoURL || avatarDataUrl(p.name);

  const card = document.createElement('div');
  card.className = 'profile-card';
  card.innerHTML = `
    <img src="${photo}" alt="${p.name || ''}" />
    <div class="card-info">
      <h3>${p.name || 'Anonymous'}${age ? ', ' + age : ''}</h3>
      <p class="age-city">${p.city || ''}${p.lookingFor ? ' · ' + p.lookingFor : ''}</p>
      <p class="about">${p.about || ''}</p>
      <div class="interests">
        ${interests.map(i => `<span class="interest-tag">${i}</span>`).join('')}
      </div>
    </div>
  `;
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
  cardStack.querySelector('.profile-card')?.classList.add('swiping');
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
    card.style.transform = 'translateX(120%) rotate(15deg)';
    card.style.opacity = '0';
    setTimeout(() => handleSwipe(true), 250);
  } else if (delta < -100) {
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
    const myLikes = userProfile.likes || [];
    if (!myLikes.includes(target.id)) {
      myLikes.push(target.id);
      await db.collection('users').doc(currentUser.uid).set({ likes: myLikes }, { merge: true });
      userProfile.likes = myLikes;
    }

    // Fake profiles auto-like back so you can demo matches + chat
    let theirLikes = [];
    if (target.isFake) {
      theirLikes = [currentUser.uid];
      await db.collection('users').doc(target.id).set({ likes: theirLikes }, { merge: true });
    } else {
      const theirDoc = await db.collection('users').doc(target.id).get();
      theirLikes = (theirDoc.data() || {}).likes || [];
    }

    if (theirLikes.includes(currentUser.uid)) {
      const myMatches = userProfile.matches || [];
      if (!myMatches.includes(target.id)) {
        myMatches.push(target.id);
        await db.collection('users').doc(currentUser.uid).set({ matches: myMatches }, { merge: true });
        userProfile.matches = myMatches;
      }
      if (!target.isFake) {
        const theirDoc = await db.collection('users').doc(target.id).get();
        const theirMatches = (theirDoc.data() || {}).matches || [];
        if (!theirMatches.includes(currentUser.uid)) {
          theirMatches.push(currentUser.uid);
          await db.collection('users').doc(target.id).set({ matches: theirMatches }, { merge: true });
        }
      } else {
        await db.collection('users').doc(target.id).set({ matches: [currentUser.uid] }, { merge: true });
      }

      lastMatchTarget = target;
      document.getElementById('match-name').textContent = `You and ${target.name} liked each other!`;
      matchModal.classList.remove('hidden');
      burstConfetti();
    }
  }
  renderCurrentCard();
}

document.getElementById('close-match').addEventListener('click', () => {
  matchModal.classList.add('hidden');
});
document.getElementById('match-message-btn')?.addEventListener('click', () => {
  matchModal.classList.add('hidden');
  if (lastMatchTarget) openChat(lastMatchTarget.id, lastMatchTarget.name, lastMatchTarget.photoURL, lastMatchTarget.city);
});

function burstConfetti() {
  const box = document.getElementById('confetti');
  if (!box) return;
  box.innerHTML = '';
  const emojis = ['🔥', '💕', '✨', '🎉', '💖', '⭐', '🥳'];
  for (let i = 0; i < 18; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = Math.random() * 0.4 + 's';
    span.style.fontSize = 0.9 + Math.random() * 0.8 + 'rem';
    box.appendChild(span);
  }
  setTimeout(() => { box.innerHTML = ''; }, 2500);
}

// ============================================================
// MATCHES + CHAT
// ============================================================

function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

async function loadMatches() {
  matchesList.innerHTML = '';
  const matchIds = userProfile?.matches || [];
  const badge = document.getElementById('match-count-badge');

  if (matchIds.length === 0) {
    noMatches.classList.remove('hidden');
    if (badge) { badge.classList.add('hidden'); badge.textContent = '0'; }
    return;
  }
  noMatches.classList.add('hidden');
  if (badge) { badge.textContent = matchIds.length; badge.classList.remove('hidden'); }

  for (const id of matchIds) {
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) continue;
      const p = doc.data();
      const age = calcAge(p.dob);
      const photo = p.photoURL || avatarDataUrl(p.name);

      // Last message preview
      let preview = p.city || 'Say hello!';
      try {
        const cid = chatIdFor(currentUser.uid, id);
        const msgs = await db.collection('chats').doc(cid).collection('messages')
          .orderBy('createdAt', 'desc').limit(1).get();
        if (!msgs.empty) {
          const m = msgs.docs[0].data();
          preview = (m.from === currentUser.uid ? 'You: ' : '') + (m.text || '').slice(0, 40);
        }
      } catch (_) {}

      const item = document.createElement('div');
      item.className = 'match-item';
      item.innerHTML = `
        <img src="${photo}" alt="" />
        <div class="match-info">
          <h4>${p.name || 'Someone'}${age ? ', ' + age : ''}</h4>
          <p>${preview}</p>
        </div>
        <button class="say-hi-btn">Chat</button>
      `;
      item.addEventListener('click', () => openChat(id, p.name, photo, p.city));
      matchesList.appendChild(item);
    } catch (e) {
      console.error(e);
    }
  }
}

function openChat(otherId, name, photo, city) {
  activeChatId = otherId;
  activeChatName = name || 'Chat';
  appScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  document.getElementById('chat-name').textContent = name || 'Chat';
  document.getElementById('chat-city').textContent = city || '';
  document.getElementById('chat-avatar').src = photo || avatarDataUrl(name);
  document.getElementById('chat-messages').innerHTML = '<div class="spinner"></div>';
  document.getElementById('chat-input').value = '';

  if (chatUnsub) { chatUnsub(); chatUnsub = null; }

  const cid = chatIdFor(currentUser.uid, otherId);
  chatUnsub = db.collection('chats').doc(cid).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap) => {
      const box = document.getElementById('chat-messages');
      box.innerHTML = '';
      if (snap.empty) {
        box.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;font-size:0.9rem">Say hi 👋</p>';
      }
      snap.forEach(doc => {
        const m = doc.data();
        const div = document.createElement('div');
        div.className = 'msg ' + (m.from === currentUser.uid ? 'mine' : 'theirs');
        let time = '';
        if (m.createdAt && m.createdAt.toDate) {
          time = m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        div.innerHTML = `${escapeHtml(m.text || '')}<span class="msg-time">${time}</span>`;
        box.appendChild(div);
      });
      box.scrollTop = box.scrollHeight;
    }, (err) => {
      console.error(err);
      showToast('Chat error: ' + err.message);
    });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('chat-back').addEventListener('click', () => {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  activeChatId = null;
  chatScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  switchToTab('matches');
  loadMatches();
});

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !activeChatId) return;
  input.value = '';
  const cid = chatIdFor(currentUser.uid, activeChatId);
  try {
    await db.collection('chats').doc(cid).set({
      users: [currentUser.uid, activeChatId],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await db.collection('chats').doc(cid).collection('messages').add({
      from: currentUser.uid,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    showToast('Could not send: ' + err.message);
    input.value = text;
  }
}

document.getElementById('chat-send').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
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
  setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});
