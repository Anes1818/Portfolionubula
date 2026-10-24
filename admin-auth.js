/* Authentication is enforced again by Realtime Database rules, not this page. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

const config = window.NEBULA_LINK_SERVICE.firebase;
const auth = getAuth(initializeApp(config));
const database = new URL(config.databaseURL);
const status = document.getElementById('adminAuthStatus');
const panel = document.getElementById('adminLogin');
let allowed = false, authRevision = 0;
try { localStorage.removeItem('nebula_fb_secret'); } catch {}

async function authenticatedFetch(input, options = {}) {
  if (!allowed || !auth.currentUser) throw Error('Admin sign-in required');
  const url = new URL(input, location.href);
  if (url.origin !== database.origin || !url.pathname.startsWith('/nebula/') || (options.method && options.method !== 'GET')) throw Error('Unsupported admin request');
  url.searchParams.set('auth', await auth.currentUser.getIdToken());
  return fetch(url, { ...options, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
}
window.NebulaAdminAuth = { fetch: authenticatedFetch };

document.getElementById('adminSignIn').addEventListener('click', async () => {
  status.textContent = 'Opening Google sign-in…';
  try {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    const messages = {
      'auth/operation-not-allowed': 'Enable Google in Firebase Authentication → Sign-in method first.',
      'auth/unauthorized-domain': 'Add nebulastudio.site to Firebase Authentication → Settings → Authorized domains.',
      'auth/popup-blocked': 'Allow the sign-in popup, then try again.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled. No records were loaded.'
    };
    status.textContent = messages[error.code] || 'Sign-in could not be completed. Please try again.';
  }
});
document.getElementById('adminSignOut').addEventListener('click', async () => { await signOut(auth); location.reload(); });

onAuthStateChanged(auth, async user => {
  const revision = ++authRevision;
  allowed = false;
  document.getElementById('adminContent').hidden = true;
  panel.hidden = false;
  document.getElementById('adminSignOut').hidden = !user;
  if (!user) { status.textContent = 'Sign in with your approved Google account to view private records.'; return; }
  status.textContent = 'Checking admin access…';
  try {
    const url = new URL('/adminUids/' + encodeURIComponent(user.uid) + '.json', database);
    url.searchParams.set('auth', await user.getIdToken());
    const result = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    const approved = result.ok && await result.json() === true;
    if (revision !== authRevision || auth.currentUser?.uid !== user.uid) return;
    allowed = approved;
    if (!allowed) {
      status.textContent = 'This account is not approved. The project owner must set adminUids/' + user.uid + ' to true in Firebase. Publish the protected rules first.';
      return;
    }
    panel.hidden = true;
    document.getElementById('adminContent').hidden = false;
    window.dispatchEvent(new Event('nebula-admin-auth'));
  } catch { status.textContent = 'Could not verify access. Check your connection and the published database rules.'; }
});
