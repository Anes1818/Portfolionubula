/* Public Firebase configuration. Database rules enforce access; no server secrets. */
window.NEBULA_LINK_SERVICE={
 enabled:true,
 provider:'realtime',
 endpoint:'', // Only needed if switching to the Cloudflare provider later.
 firebase:{
  apiKey:'AIzaSyDIwvYLyHE6sVy1XMmNU_GVnlWxQpLa4wI',
  authDomain:'la-flora-6ed47.firebaseapp.com',
  databaseURL:'https://la-flora-6ed47-default-rtdb.firebaseio.com',
  projectId:'la-flora-6ed47',
  storageBucket:'la-flora-6ed47.firebasestorage.app',
  messagingSenderId:'723839530405',
  appId:'1:723839530405:web:cc546bb8e6100677c7244c'
 },
 recaptchaSiteKey:''
};
