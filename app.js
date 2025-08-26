/* ===== app.js ===== */

// ================= Firebase Imports =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ================= Firebase Config =================
const firebaseConfig = {
  apiKey: "AIzaSyDKiQvra1lMhiqYL5ZLDAh2qMJRjTByHSA",
  authDomain: "all-hall.firebaseapp.com",
  projectId: "all-hall",
  storageBucket: "all-hall.firebasestorage.app",
  messagingSenderId: "141379512602",
  appId: "1:141379512602:web:83f6f94655646893efa4a3",
  measurementId: "G-QQPR0QJW4L"
};

// ================= Init =================
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= Helpers =================
let currentUser = null;
let userRole = "user";

// Show message box (like a toast)
function showMessage(msg) {
  let box = document.getElementById("message-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "message-box";
    document.body.appendChild(box);
  }
  box.innerText = msg;
  box.style.opacity = 1;
  setTimeout(() => (box.style.opacity = 0), 3000);
}

// ================= Auth =================

// Register
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-pass").value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Save default role in Firestore
      await setDoc(doc(db, "roles", cred.user.uid), {
        role: "user",
        email: email,
      });
      showMessage("Registered successfully!");
      window.location.href = "index.html";
    } catch (err) {
      showMessage("Error: " + err.message);
    }
  });
}

// Google Register/Login
const googleBtn = document.getElementById("btn-google-register") || document.getElementById("btn-google-login");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Save default role if not exists
      const roleRef = doc(db, "roles", result.user.uid);
      const roleSnap = await getDoc(roleRef);
      if (!roleSnap.exists()) {
        await setDoc(roleRef, {
          role: "user",
          email: result.user.email,
        });
      }
      showMessage("Logged in with Google!");
      window.location.href = "index.html";
    } catch (err) {
      showMessage("Google Login Failed: " + err.message);
    }
  });
}

// Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-pass").value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      showMessage("Login successful!");
      window.location.href = "index.html";
    } catch (err) {
      showMessage("Login Failed: " + err.message);
    }
  });
}

// Logout
const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// ================= Roles & State =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Get role
    const roleDoc = await getDoc(doc(db, "roles", user.uid));
    if (roleDoc.exists()) {
      userRole = roleDoc.data().role;
    } else {
      userRole = "user";
    }
    console.log("Logged in as:", user.email, "Role:", userRole);
  } else {
    currentUser = null;
    userRole = "user";
    console.log("Not logged in");
  }
});

// ================= Cart =================
async function addToCart(productId, productData) {
  if (!currentUser) {
    showMessage("Please log in first!");
    return;
  }
  await setDoc(doc(db, "carts", currentUser.uid + "_" + productId), {
    userId: currentUser.uid,
    productId,
    ...productData,
  });
  showMessage("Added to cart!");
}

async function loadCart() {
  if (!currentUser) return [];
  const qSnap = await getDocs(collection(db, "carts"));
  let items = [];
  qSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.userId === currentUser.uid) {
      items.push({ id: docSnap.id, ...data });
    }
  });
  return items;
}

async function removeFromCart(cartItemId) {
  await deleteDoc(doc(db, "carts", cartItemId));
  showMessage("Item removed!");
}

// ================= Export =================
export { auth, db, addToCart, loadCart, removeFromCart };
