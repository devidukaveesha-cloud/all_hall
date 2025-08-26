// Firebase SDKs (from CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKiQvra1lMhiqYL5ZLDAh2qMJRjTByHSA",
  authDomain: "all-hall.firebaseapp.com",
  projectId: "all-hall",
  storageBucket: "all-hall.appspot.com",
  messagingSenderId: "141379512602",
  appId: "1:141379512602:web:83f6f94655646893efa4a3",
  measurementId: "G-QQPR0QJW4L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// 🟢 Example: Register User
document.getElementById("register-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-pass").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("✅ Registered Successfully!");
    window.location.href = "index.html";
  } catch (error) {
    alert("❌ " + error.message);
  }
});

// 🟢 Example: Login User
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("✅ Logged in!");
    window.location.href = "index.html";
  } catch (error) {
    alert("❌ " + error.message);
  }
});

// 🟢 Google Login
document.getElementById("google-login")?.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    alert("✅ Google login success!");
    window.location.href = "index.html";
  } catch (error) {
    alert("❌ " + error.message);
  }
});

// 🟢 Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await signOut(auth);
  alert("👋 Logged out!");
  window.location.href = "login.html";
});

// 🟢 Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
  } else {
    console.log("No user logged in");
  }
});
