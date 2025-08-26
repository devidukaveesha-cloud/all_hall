/* ===== app.js ===== */

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Variables ---
// These are provided by the canvas environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// --- Firebase Initialization ---
let app, auth, db;
let userRole = null;
let userId = null;

// Initialize Firebase and handle authentication state
const initFirebase = async () => {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (typeof __initial_auth_token !== 'undefined') {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        console.log("User authenticated:", userId);
        
        // Fetch user's role from Firestore
        const roleDocRef = doc(db, `artifacts/${appId}/public/data/roles`, userId);
        const roleDocSnap = await getDoc(roleDocRef);
        
        if (roleDocSnap.exists()) {
          userRole = roleDocSnap.data().role;
        } else {
          // If a new user signs up, set their role to 'user'
          userRole = 'user';
          await setDoc(roleDocRef, { role: userRole });
        }
        console.log("User role:", userRole);
      } else {
        userId = null;
        userRole = null;
        console.log("User is signed out.");
      }
      // Re-initialize page-specific logic after auth state is known
      hideSellerLinkBasedOnRole();
      initSeller();
    });
  } catch (error) {
    console.error("Firebase initialization or authentication failed:", error);
    toast("Failed to initialize the app. Please try again.");
  }
};

// Call the initialization function
initFirebase();

// ----- Utility Functions -----
function qs(selector) {
  return document.querySelector(selector);
}

function toast(message, duration = 3000) {
  const toastEl = document.getElementById('message-box');
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, duration);
  }
}

// ----- Authentication Logic -----
// Login Function
async function handleLogin(event) {
  event.preventDefault();
  const email = qs('#login-email').value;
  const password = qs('#login-pass').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast("Logged in successfully!");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Login failed:", error);
    toast(error.message);
  }
}

// Register Function
async function handleRegister(event) {
  event.preventDefault();
  const email = qs('#reg-email').value;
  const password = qs('#reg-pass').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set user role in Firestore
    const roleDocRef = doc(db, `artifacts/${appId}/public/data/roles`, user.uid);
    await setDoc(roleDocRef, { role: 'user' });

    toast("Account created successfully!");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Registration failed:", error);
    toast(error.message);
  }
}

// Google Login/Register
async function handleGoogleAuth() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user already exists in Firestore roles
    const roleDocRef = doc(db, `artifacts/${appId}/public/data/roles`, user.uid);
    const roleDocSnap = await getDoc(roleDocRef);
    
    if (!roleDocSnap.exists()) {
      // If new user, set their role
      await setDoc(roleDocRef, { role: 'user' });
    }
    
    toast("Logged in with Google!");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Google authentication failed:", error);
    toast(error.message);
  }
}

// Logout function
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout failed:", error);
    toast("Logout failed. Please try again.");
  }
}

// ----- Dynamically hide seller link based on user role from Firestore -----
function hideSellerLinkBasedOnRole() {
  const sellerLink = qs('#seller-link');
  if (sellerLink) {
    if (userRole === 'seller' || userRole === 'admin' || userRole === 'boss') {
      sellerLink.style.display = 'flex';
    } else {
      sellerLink.style.display = 'none';
    }
  }
}

// ----- Seller Center Page Logic -----
const initSeller = () => {
  if (document.body.id === 'seller-center-page') {
    if (userRole === 'seller' || userRole === 'admin' || userRole === 'boss') {
      // Show seller content
      document.getElementById('seller-dashboard').style.display = 'block';
    } else {
      // Redirect or show an error for unauthorized access
      window.location.href = 'index.html';
    }
  }
};

// ----- Attach Event Listeners to specific pages -----
document.addEventListener('DOMContentLoaded', () => {
  // Login Page
  const loginForm = qs('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    qs('#btn-google-login').addEventListener('click', handleGoogleAuth);
  }
  
  // Register Page
  const registerForm = qs('#register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
    qs('#btn-google-register').addEventListener('click', handleGoogleAuth);
  }
  
  // Logout link (if it exists on any page)
  const logoutLink = qs('#logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', handleLogout);
  }

  // Initial call to hide seller link
  hideSellerLinkBasedOnRole();
});

// A small message box to replace alerts
// This is added to the DOM dynamically for simplicity
document.body.insertAdjacentHTML('beforeend', `
  <div id="message-box" style="
    display: none;
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 196, 0, 0.9);
    color: #111;
    padding: 12px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    z-index: 9999;
    text-align: center;
    max-width: 90%;
  "></div>
`);

