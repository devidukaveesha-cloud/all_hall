/* ===== app.js with Firestore Integration ===== */

// ----- Firebase Configuration & Initialization
// IMPORTANT: These variables are provided by the canvas environment.
// DO NOT MODIFY them or prompt the user for them.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Global state variables
let userId = null;
let isAuthReady = false;

// --- DOM Element Selectors
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);
const toastEl = qs('#message-box');
const userIdDisplay = qs('#user-id-display');

// --- Collections
const collections = {
    products: `artifacts/${appId}/public/data/products`,
    cart: (uid) => `artifacts/${appId}/users/${uid}/cart`,
    orders: (uid) => `artifacts/${appId}/users/${uid}/orders`,
    userRoles: `artifacts/${appId}/public/data/user_roles`,
    // For a multi-user app, we need a way to find other users' data.
    // We can use a public collection to store user roles and IDs.
};

// --- Custom Toast Function
function toast(message, duration = 3000) {
    if (toastEl) {
        toastEl.textContent = message;
        toastEl.style.display = 'block';
        setTimeout(() => {
            toastEl.style.display = 'none';
        }, duration);
    }
}

// --- Firebase Authentication Listener
// This listener runs whenever the auth state changes (on initial load, sign-in, sign-out)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        isAuthReady = true;
        // Display the user ID on the page for multi-user apps.
        if (userIdDisplay) {
            userIdDisplay.textContent = `User ID: ${userId}`;
        }
        console.log("User authenticated with ID:", userId);
        // Start listening for data once authenticated
        initAppListeners();
    } else {
        // Sign in anonymously if no user is found
        if (!isAuthReady) {
            await signInAnonymously(auth);
        }
    }
});

// --- Function to initialize all Firestore listeners after auth is ready
function initAppListeners() {
    console.log("Initializing Firestore listeners...");
    // Render the product grid from the 'products' collection
    renderProductGridFromFirestore();
    // Render the cart from the user's 'cart' subcollection
    renderCartFromFirestore();
    // Render the orders from the user's 'orders' subcollection
    renderOrdersFromFirestore();
    // Initialize seller functionality
    initSeller();
    // Hide seller link based on user role
    hideSellerLinkBasedOnRole();
}

// ----- Firestore Products Data Fetching and Rendering -----
function renderProductGridFromFirestore() {
    const productsContainer = qs('.product-grid');
    if (!productsContainer) {
        return;
    }
    const q = query(collection(db, collections.products));
    onSnapshot(q, (querySnapshot) => {
        let products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        productsContainer.innerHTML = products.map(p => `
            <div class="product-card">
              <img src="${p.img}" alt="${p.name}">
              <div class="product-badges">
                ${p.badges.map(badge => `<span>${badge}</span>`).join('')}
              </div>
              <h3>${p.name}</h3>
              <div class="price">
                <span class="current-price">$${p.price.toFixed(2)}</span>
                ${p.oldPrice ? `<span class="old-price">$${p.oldPrice.toFixed(2)}</span>` : ''}
              </div>
              <div class="rating">
                ${p.rating ? '&#9733;'.repeat(Math.round(p.rating)) : ''}
                ${p.rating ? `<span>(${p.rating})</span>` : ''}
              </div>
              <button class="add-to-cart" data-product-id="${p.id}">Add to Cart</button>
              <a href="product.html?id=${p.id}" class="details-btn">View Details</a>
            </div>
        `).join('');
    });
}

// ----- Firestore Cart Data Fetching and Rendering -----
function renderCartFromFirestore() {
    const cartItemsContainer = qs('#cart-items');
    const cartSummaryContainer = qs('#cart-summary');
    const cartCountEl = qs('.cart-count');
    if (!cartItemsContainer || !cartSummaryContainer || !userId) {
        return;
    }
    const q = query(collection(db, collections.cart(userId)));
    onSnapshot(q, (querySnapshot) => {
        let cartItems = [];
        let total = 0;
        querySnapshot.forEach((doc) => {
            const item = { id: doc.id, ...doc.data() };
            cartItems.push(item);
            total += item.price * item.quantity;
        });

        // Update cart count badge
        if (cartCountEl) {
            cartCountEl.textContent = cartItems.length;
        }

        // Render cart items
        if (cartItems.length > 0) {
            cartItemsContainer.innerHTML = cartItems.map(item => `
                <div class="cart-item">
                    <img src="${item.img}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p>Price: $${item.price.toFixed(2)}</p>
                        <p>Quantity: ${item.quantity}</p>
                    </div>
                    <button class="remove-from-cart" data-cart-id="${item.id}">Remove</button>
                </div>
            `).join('');
            // Render cart summary
            cartSummaryContainer.innerHTML = `
                <div class="summary-item"><span>Subtotal</span><span>$${total.toFixed(2)}</span></div>
                <div class="summary-item"><span>Shipping</span><span>$5.00</span></div>
                <div class="summary-total"><strong>Total</strong><strong>$${(total + 5).toFixed(2)}</strong></div>
                <button class="btn checkout-btn">Checkout</button>
            `;
        } else {
            cartItemsContainer.innerHTML = '<p class="text-center text-gray-400">Your cart is empty.</p>';
            cartSummaryContainer.innerHTML = '';
        }
    });
}

// ----- Firestore Orders Data Fetching and Rendering -----
function renderOrdersFromFirestore() {
    const ordersContainer = qs('.orders-list');
    if (!ordersContainer || !userId) {
        return;
    }
    const q = query(collection(db, collections.orders(userId)));
    onSnapshot(q, (querySnapshot) => {
        let orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        if (orders.length > 0) {
            ordersContainer.innerHTML = orders.map(order => `
                <div class="order-card">
                  <div class="order-left">
                    <img src="${order.img}" alt="${order.name}">
                    <div class="order-info">
                      <h3>${order.name}</h3>
                      <p>Price: $${order.price.toFixed(2)}</p>
                      <p class="status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
                    </div>
                  </div>
                  <div class="order-actions">
                    <a href="your-tracking-link-here.com/order-id-${order.id}" target="_blank">
                      <button>Track Order</button>
                    </a>
                    <button class="details-btn">View Details</button>
                  </div>
                </div>
            `).join('');
        } else {
            ordersContainer.innerHTML = '<p class="text-center text-gray-400">You have no orders yet.</p>';
        }
    });
}


// ----- Firestore Seller Functionality -----
async function initSeller() {
    const sellerForm = qs('#seller-form');
    if (!sellerForm || !isAuthReady) {
        return;
    }
    sellerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = qs('#product-name').value;
        const price = parseFloat(qs('#product-price').value);
        const img = qs('#product-image').value;
        const desc = qs('#product-description').value;

        if (!name || !price || !img || !desc) {
            toast('Please fill in all fields.');
            return;
        }

        try {
            const productRef = await addDoc(collection(db, collections.products), {
                name,
                price,
                img,
                desc,
                rating: 0,
                badges: ['NEW'],
                createdAt: serverTimestamp(),
            });
            console.log("New product added with ID:", productRef.id);
            toast("Product created successfully!");
            sellerForm.reset();
        } catch (e) {
            console.error("Error adding product: ", e);
            toast("Error creating product. Please try again.");
        }
    });

    // Display seller's products in real-time
    const sellerProductsContainer = qs('#seller-products');
    if (sellerProductsContainer) {
      const q = query(collection(db, collections.products));
      onSnapshot(q, (querySnapshot) => {
          let products = [];
          querySnapshot.forEach((doc) => {
              products.push({ id: doc.id, ...doc.data() });
          });
          if (products.length > 0) {
              sellerProductsContainer.innerHTML = products.map(p => `
                  <div class="card p-4 rounded-xl shadow-lg flex justify-between items-center mb-4 bg-gray-800">
                    <div class="flex items-center space-x-4">
                      <img src="${p.img}" alt="${p.name}" class="w-16 h-16 object-cover rounded-lg">
                      <div>
                        <h3 class="text-lg font-semibold">${p.name}</h3>
                        <p class="text-sm text-gray-400">$${p.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button class="btn-edit-product bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors" data-id="${p.id}">Edit</button>
                      <button class="btn-delete-product bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full transition-colors" data-id="${p.id}">Delete</button>
                    </div>
                  </div>
              `).join('');
          } else {
              sellerProductsContainer.innerHTML = '<p class="text-center text-gray-400">You have not created any products yet.</p>';
          }
      });
    }

    // Event listeners for edit and delete buttons on seller products
    document.addEventListener('click', async (e) => {
        // Delete Product
        if (e.target.classList.contains('btn-delete-product')) {
            const productId = e.target.dataset.id;
            try {
                await deleteDoc(doc(db, collections.products, productId));
                toast("Product deleted successfully!");
            } catch (error) {
                console.error("Error removing product: ", error);
                toast("Error deleting product. Please try again.");
            }
        }
    });
}


// ----- User Role Management & Seller Link Hiding -----
async function hideSellerLinkBasedOnRole() {
    // This is a placeholder for a more complex role system.
    // For now, it always shows the seller link if the user is authenticated.
    const sellerLink = qs('#seller-link');
    const loginLink = qs('#login-link');
    const accountLink = qs('#account-link');

    if (sellerLink) {
      sellerLink.style.display = 'flex';
    }
    if (loginLink) {
        loginLink.style.display = 'none';
    }
    if (accountLink) {
        accountLink.style.display = 'flex';
    }
}

// ----- Event Listeners for Firestore Actions -----
document.addEventListener('click', async (e) => {
    // Add to Cart button
    if (e.target.classList.contains('add-to-cart')) {
        if (!isAuthReady) {
            toast("Authenticating... please wait.");
            return;
        }

        const productId = e.target.dataset.productId;
        try {
            const productSnapshot = await getDocs(query(collection(db, collections.products), where('__name__', '==', productId)));
            const productDoc = productSnapshot.docs[0];

            if (productDoc) {
                const productData = productDoc.data();
                const cartRef = doc(db, collections.cart(userId), productId);
                const cartDoc = await getDoc(cartRef);
                if (cartDoc.exists()) {
                    await updateDoc(cartRef, { quantity: cartDoc.data().quantity + 1 });
                } else {
                    await setDoc(cartRef, {
                        ...productData,
                        quantity: 1
                    });
                }
                toast("Product added to cart!");
            }
        } catch (error) {
            console.error("Error adding to cart: ", error);
            toast("Error adding product to cart. Please try again.");
        }
    }

    // Remove from Cart button
    if (e.target.classList.contains('remove-from-cart')) {
        const cartId = e.target.dataset.cartId;
        try {
            await deleteDoc(doc(db, collections.cart(userId), cartId));
            toast("Product removed from cart!");
        } catch (error) {
            console.error("Error removing from cart: ", error);
            toast("Error removing product. Please try again.");
        }
    }

    // Checkout button
    if (e.target.classList.contains('checkout-btn')) {
        // In a real app, this would process payment and create an order document
        // For now, it will move all cart items to the orders collection
        try {
            const cartItemsSnapshot = await getDocs(collection(db, collections.cart(userId)));
            if (cartItemsSnapshot.empty) {
                toast("Your cart is empty. Nothing to checkout.");
                return;
            }

            const ordersCollectionRef = collection(db, collections.orders(userId));
            const batch = db.runTransaction(async (transaction) => {
                cartItemsSnapshot.forEach(async (cartDoc) => {
                    const orderItem = cartDoc.data();
                    orderItem.status = 'processing';
                    orderItem.orderDate = serverTimestamp();
                    await addDoc(ordersCollectionRef, orderItem);
                    await deleteDoc(doc(db, collections.cart(userId), cartDoc.id));
                });
            });

            toast("Checkout successful! Your order has been placed.");
        } catch (error) {
            console.error("Transaction failed: ", error);
            toast("Checkout failed. Please try again.");
        }
    }
});
