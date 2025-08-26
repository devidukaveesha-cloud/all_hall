// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase config
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
const auth = getAuth(app);

// Selectors
const emailInput = document.getElementById("login-email");
const passInput = document.getElementById("login-pass");
const loginBtn = document.getElementById("btn-login");
const googleBtn = document.getElementById("btn-google-login");
const errorMsg = document.getElementById("login-error-msg");

// Custom toast
function toast(message, duration = 3000) {
  const toastEl = document.getElementById('message-box');
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    toastEl.style.opacity = '1';
    setTimeout(() => {
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl.style.display = 'none', 300);
    }, duration);
  }
}

// 🔹 Email/Password Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();

  if (!email || !pass) {
    errorMsg.textContent = "Please enter email and password.";
    return;
  }

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    toast("✅ Login successful!");
    console.log("User:", userCred.user);

    // Redirect based on role later
    window.location.href = "seller_center.html";  

  } catch (error) {
    console.error(error);
    errorMsg.textContent = error.message;
  }
});

// 🔹 Google Login
googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    toast("✅ Google login successful!");
    console.log("Google User:", result.user);

    window.location.href = "seller_center.html";

  } catch (error) {
    console.error(error);
    errorMsg.textContent = error.message;
  }
});
