// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, query, where, FieldValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ===== app.js ===== */

// ----- Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKiQvra1lMhiqYL5ZLDAh2qMJRjTByHSA",
  authDomain: "all-hall.firebaseapp.com",
  projectId: "all-hall",
  storageBucket: "all-hall.firebasestorage.app",
  messagingSenderId: "141379512602",
  appId: "1:141379512602:web:83f6f94655646893efa4a3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Local Storage Keys (for simplicity)
const STORAGE_KEYS = {
  CART: 'ah_cart',
  ORDERS: 'ah_orders',
  USER: 'ah_user',
  USER_ROLE: 'ah_user_role'
};

// --- Helper Functions
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);
const writeLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const readLS = (key) => JSON.parse(localStorage.getItem(key));
const toast = (message, duration = 3000) => {
  const toastEl = qs('#message-box');
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, duration);
  }
};

// --- Authentication Handlers
const handleLogin = (e) => {
  e.preventDefault();
  const email = qs('#login-email').value;
  const password = qs('#login-pass').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("User signed in:", userCredential.user.uid);
      writeLS(STORAGE_KEYS.USER, userCredential.user.uid);
      toast('Login successful!');
      window.location.href = 'index.html';
    })
    .catch((error) => {
      const errorMessage = error.message;
      console.error("Login failed:", errorMessage);
      toast(`Login failed: ${errorMessage}`);
    });
};

const handleRegister = (e) => {
  e.preventDefault();
  const email = qs('#reg-email').value;
  const password = qs('#reg-pass').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("User registered:", userCredential.user.uid);
      writeLS(STORAGE_KEYS.USER, userCredential.user.uid);
      toast('Registration successful!');
      window.location.href = 'index.html';
    })
    .catch((error) => {
      const errorMessage = error.message;
      console.error("Registration failed:", errorMessage);
      toast(`Registration failed: ${errorMessage}`);
    });
};

const handleGoogleLogin = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("Google login successful:", result.user.uid);
      writeLS(STORAGE_KEYS.USER, result.user.uid);
      toast('Login with Google successful!');
      window.location.href = 'index.html';
    }).catch((error) => {
      const errorMessage = error.message;
      console.error("Google login failed:", errorMessage);
      toast(`Google login failed: ${errorMessage}`);
    });
};

// --- Seller Center Logic
function initSeller() {
  const form = qs('#addProduct form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newProduct = {
      name: qs('#product-name').value,
      desc: qs('#product-desc').value,
      img: qs('#product-image').value,
      price: parseFloat(qs('#product-price').value),
      oldPrice: parseFloat(qs('#product-old-price').value) || null,
      colors: qs('#product-colors').value.split(',').map(s => s.trim()).filter(Boolean),
      sizes: qs('#product-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
      badges: [],
      rating: 0,
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "products"), newProduct);
      toast("Product added successfully!");
      form.reset();
      console.log("Document written with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast("Failed to add product. Please try again.");
    }
  });
}

// --- Product Grid Rendering
const renderProductGrid = (products) => {
  const container = qs('#product-grid');
  if (!container) return;
  container.innerHTML = products.map(p => `
    <div class="product-card rounded-2xl overflow-hidden shadow-lg transform transition-transform hover:scale-105" data-id="${p.id}">
      <img src="${p.img}" alt="${p.name}" class="w-full h-48 object-cover">
      <div class="p-4 bg-surface text-text">
        <h3 class="text-lg font-semibold">${p.name}</h3>
        <p class="text-sm text-muted mb-2">${p.desc}</p>
        <div class="flex items-center justify-between">
          <span class="text-xl font-bold text-accent">$${p.price.toFixed(2)}</span>
          <button class="add-to-cart bg-accent text-white px-4 py-2 rounded-full hover:bg-accent-2 transition-colors">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `).join('');
};

// --- Dynamically hide seller link based on user role
function hideSellerLinkBasedOnRole() {
  const sellerLink = qs('#seller-link');
  if (sellerLink) {
    const userRole = readLS(STORAGE_KEYS.USER_ROLE);
    if (userRole !== 'seller') {
      sellerLink.style.display = 'none';
    } else {
      sellerLink.style.display = 'flex';
    }
  }
}

// --- Initializer
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch products from Firestore and render the grid
  const productGrid = qs('#product-grid');
  if (productGrid) {
    const products = [];
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      renderProductGrid(products);
    } catch (e) {
      console.error("Error fetching documents: ", e);
      toast("Failed to load products.");
    }
  }
  
  // Existing calls to other page-specific functions
  // renderProductPage(); // Assuming you will add this functionality later
  // renderCart();
  // renderOrders();
  initSeller();
  hideSellerLinkBasedOnRole();
});

// Added event listeners for authentication
const loginBtn = qs('#btn-login');
if (loginBtn) {
  loginBtn.addEventListener('click', handleLogin);
}

const registerBtn = qs('#btn-register');
if (registerBtn) {
  registerBtn.addEventListener('click', handleRegister);
}

const googleLoginBtn = qs('#btn-google-login');
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', handleGoogleLogin);
}

const googleRegisterBtn = qs('#btn-google-register');
if (googleRegisterBtn) {
  googleRegisterBtn.addEventListener('click', handleGoogleLogin);
}
