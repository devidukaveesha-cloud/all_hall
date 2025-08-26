
/* ========= AllHall | app.js (universal, no-UI-changes) =========
 * This file auto-loads Firebase *compat* SDKs so your current HTML
 * <script src=".../firebase-*.js"> tags can stay as-is.
 *
 * Features:
 * - Firebase init (Auth, Firestore, Storage)
 * - Register / Login / Google Login / Logout / Password Reset
 * - Roles in Firestore: roles/{uid} -> role: 'user' | 'seller' | 'admin' | 'boss'
 * - Index: load only APPROVED products
 * - Seller Center: add product (supports Storage upload if #product-image-file exists; else uses Image URL)
 *                  product doc: { name, price, img, desc, rating, badges, status, sellerId, createdAt }
 *                  status: 'pending' (default) -> admin approves -> 'approved'
 * - Admin: review pending products -> approve/reject
 * - Cart: add/remove for current user
 * - Checkout: place order
 * - My Orders: list orders for current user
 * - Account: show sign-in state
 *
 * IMPORTANT: This script is written in plain JS (no module) and lazy-loads
 *            compat SDKs if they aren't already present.
 * =============================================================== */

(function () {
  // ---------- Tiny helpers ----------
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const byId = (id) => document.getElementById(id);
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(message, duration = 3000) {
    let el = byId('message-box');
    if (!el) {
      el = document.createElement('div');
      el.id = 'message-box';
      el.style.position = 'fixed';
      el.style.bottom = '24px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.background = 'rgba(30,30,30,0.9)';
      el.style.color = '#fff';
      el.style.padding = '12px 20px';
      el.style.borderRadius = '12px';
      el.style.zIndex = '9999';
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    setTimeout(() => (el.style.opacity = '0'), duration);
  }

  // ---------- Firebase lazy loader (compat) ----------
  const SDK = {
    app: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js',
    auth: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth-compat.js',
    firestore: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js',
    storage: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage-compat.js',
    analytics: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics-compat.js',
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Prevent duplicates
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureFirebase() {
    // If compat is available already, skip
    if (window.firebase && firebase.app) return;

    await loadScript(SDK.app);
    await loadScript(SDK.auth);
    await loadScript(SDK.firestore);
    await loadScript(SDK.storage);
    // analytics is optional; load best-effort
    try { await loadScript(SDK.analytics); } catch (_) {}
  }

  // ---------- Main app ----------
  (async function start() {
    await ensureFirebase();

    // === CONFIG ===
    const firebaseConfig = {
      apiKey: "AIzaSyDKiQvra1lMhiqYL5ZLDAh2qMJRjTByHSA",
      authDomain: "all-hall.firebaseapp.com",
      projectId: "all-hall",
      storageBucket: "all-hall.firebasestorage.app",
      messagingSenderId: "141379512602",
      appId: "1:141379512602:web:83f6f94655646893efa4a3",
      measurementId: "G-QQPR0QJW4L"
    };

    // Init
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    let analytics = null;
    try { analytics = firebase.analytics(); } catch (_) {}
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Global state
    let currentUser = null;
    let userRole = 'user';

    // ------------- AUTH UI WIRING -------------
    const btnLogin = byId('btn-login');
    const btnGoogleLogin = byId('btn-google-login');
    const registerForm = byId('register-form');
    const btnLogout = byId('btn-logout');

    // Register (email/password)
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = byId('reg-email')?.value || '';
        const pass = byId('reg-pass')?.value || '';
        try {
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          await db.collection('roles').doc(cred.user.uid).set({
            role: 'user',
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          toast('Registered successfully!');
          window.location.href = 'index.html';
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Login (email/password)
    if (btnLogin) {
      btnLogin.addEventListener('click', async () => {
        const email = byId('login-email')?.value || '';
        const pass = byId('login-pass')?.value || '';
        try {
          await auth.signInWithEmailAndPassword(email, pass);
          toast('Logged in!');
          window.location.href = 'index.html';
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Password reset (if the "Forgot Password?" link exists)
    const forgotLink = qs('.forgot-pass');
    if (forgotLink) {
      forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = byId('login-email')?.value || prompt('Enter your email for reset:');
        if (!email) return;
        try {
          await auth.sendPasswordResetEmail(email);
          toast('Reset email sent!');
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Google login
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', async () => {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const res = await auth.signInWithPopup(provider);
          // Ensure role doc exists
          const r = await db.collection('roles').doc(res.user.uid).get();
          if (!r.exists) {
            await db.collection('roles').doc(res.user.uid).set({
              role: 'user',
              email: res.user.email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          toast('Logged in with Google!');
          window.location.href = 'index.html';
        } catch (err) {
          toast(err.message);
        }
      });
    }

    // Logout
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'login.html';
      });
    }

    // ------------- AUTH STATE -------------
    auth.onAuthStateChanged(async (user) => {
      currentUser = user || null;
      userRole = 'user';
      if (user) {
        const roleDoc = await db.collection('roles').doc(user.uid).get();
        if (roleDoc.exists) {
          userRole = roleDoc.data().role || 'user';
        }
        // Show/hide nav bits if pages use these IDs
        const sellerLink = byId('seller-link');
        const loginLink = byId('login-link');
        const accountLink = byId('account-link');
        if (sellerLink) sellerLink.style.display = (userRole === 'seller' || userRole === 'admin' || userRole === 'boss') ? 'flex' : 'none';
        if (loginLink) loginLink.style.display = user ? 'none' : 'flex';
        if (accountLink) accountLink.style.display = user ? 'flex' : 'none';
      } else {
        // Not signed in
        const sellerLink = byId('seller-link');
        const loginLink = byId('login-link');
        const accountLink = byId('account-link');
        if (sellerLink) sellerLink.style.display = 'none';
        if (loginLink) loginLink.style.display = 'flex';
        if (accountLink) accountLink.style.display = 'none';
      }

      // After we know auth, wire page-specific logic
      await wireIndex();
      await wireSellerCenter();
      await wireAdmin();
      await wireCart();
      await wireCheckout();
      await wireMyOrders();
      await wireAccount();
    });

    // ------------- COLLECTION HELPERS -------------
    const col = {
      products: db.collection('products'),
      carts: db.collection('carts'),
      orders: db.collection('orders'),
      roles: db.collection('roles'),
    };

    // ------------- INDEX PAGE (approved products) -------------
    async function wireIndex() {
      const grid = byId('products-grid') || byId('home-products') || byId('product-list');
      if (!grid) return;

      const snap = await col.products.where('status', '==', 'approved').orderBy('createdAt', 'desc').get();
      let html = '';
      snap.forEach((doc) => {
        const p = doc.data();
        const price = (p.price ?? 0).toFixed ? p.price.toFixed(2) : Number(p.price || 0).toFixed(2);
        html += `
          <div class="card product-card" data-id="${doc.id}" style="background: rgba(23,23,23,0.8); border:1px solid #2e2e2e; border-radius:12px; padding:14px;">
            <img src="${p.img}" alt="${p.name}" style="width:100%; height:200px; object-fit:cover; border-radius:10px;">
            <h3 style="margin:8px 0 4px; font-weight:700;">${p.name}</h3>
            <p style="color:#a1a1a1; margin:0 0 8px;">$${price}</p>
            <button class="btn-add-cart" data-id="${doc.id}">Add to Cart</button>
          </div>
        `;
      });
      grid.innerHTML = html || '<p class="text-gray-400">No products yet.</p>';

      qsa('.btn-add-cart').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const docRef = await col.products.doc(id).get();
          if (!docRef.exists) return;
          await addToCart(id, docRef.data());
        });
      });
    }

    // ------------- SELLER CENTER -------------
    async function wireSellerCenter() {
      const form = byId('seller-form');
      const listEl = byId('seller-products');
      if (!form && !listEl) return;

      if (!currentUser) {
        if (form) form.addEventListener('submit', (e) => { e.preventDefault(); toast('Please log in first.'); });
        return;
      }

      // Create product
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = byId('product-name')?.value?.trim();
          const priceRaw = byId('product-price')?.value;
          const price = Number(priceRaw || 0);
          const imgUrlInput = byId('product-image')?.value?.trim();
          const desc = byId('product-description')?.value?.trim();
          const fileInput = byId('product-image-file'); // optional (if your HTML has it)

          if (!name || !price || (!imgUrlInput && !(fileInput && fileInput.files?.length)) || !desc) {
            toast('Please fill in all fields.');
            return;
          }

          let finalImg = imgUrlInput || '';

          // Prefer Storage upload if file is provided
          if (fileInput && fileInput.files && fileInput.files[0]) {
            try {
              const f = fileInput.files[0];
              const path = `product_images/${currentUser.uid}/${Date.now()}_${f.name}`;
              const ref = storage.ref().child(path);
              await ref.put(f);
              finalImg = await ref.getDownloadURL();
            } catch (err) {
              console.error(err);
              toast('Image upload failed, using URL if provided.');
            }
          }

          const product = {
            name,
            price,
            img: finalImg || imgUrlInput,
            desc,
            rating: 0,
            badges: ['NEW'],
            status: 'pending', // require admin approval
            sellerId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          };

          try {
            const docRef = await col.products.add(product);
            toast('Product submitted for approval!');
            form.reset();
          } catch (err) {
            toast('Error creating product: ' + err.message);
          }
        });
      }

      // Render seller's products (live)
      if (listEl) {
        col.products.where('sellerId', '==', currentUser.uid).orderBy('createdAt', 'desc')
          .onSnapshot((qsnap) => {
            const items = [];
            qsnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
            if (!items.length) {
              listEl.innerHTML = '<p class="text-center text-gray-400">You have not created any products yet.</p>';
              return;
            }
            listEl.innerHTML = items.map(p => `
              <div class="card p-4 rounded-xl shadow-lg flex justify-between items-center mb-4 bg-gray-800">
                <div class="flex items-center space-x-4">
                  <img src="${p.img}" alt="${p.name}" class="w-16 h-16 object-cover rounded-lg">
                  <div>
                    <h3 class="text-lg font-semibold">${p.name}</h3>
                    <p class="text-sm text-gray-400">$${Number(p.price||0).toFixed(2)} — <em>${p.status||'pending'}</em></p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button class="btn-delete-product bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full transition-colors" data-id="${p.id}">Delete</button>
                </div>
              </div>
            `).join('');
          });

        document.addEventListener('click', async (e) => {
          const t = e.target;
          if (t.classList && t.classList.contains('btn-delete-product')) {
            const id = t.getAttribute('data-id');
            try {
              await col.products.doc(id).delete();
              toast('Product deleted.');
            } catch (err) {
              toast('Delete failed: ' + err.message);
            }
          }
        });
      }
    }

    // ------------- ADMIN (approve/reject) -------------
    async function wireAdmin() {
      const container = byId('admin-products');
      if (!container) return;

      if (!currentUser) {
        container.innerHTML = '<p class="text-center text-gray-400">Please log in.</p>';
        return;
      }
      if (!(userRole === 'admin' || userRole === 'boss')) {
        container.innerHTML = '<p class="text-center text-gray-400">Admins only.</p>';
        return;
      }

      const render = async () => {
        const snap = await col.products.where('status', '==', 'pending').orderBy('createdAt', 'asc').get();
        if (snap.empty) {
          container.innerHTML = '<p class="text-center text-gray-400">No pending products.</p>';
          return;
        }
        let html = '';
        snap.forEach((d) => {
          const p = d.data();
          html += `
            <div class="card p-4 mb-4 flex items-center justify-between bg-gray-800 rounded-xl">
              <div class="flex items-center space-x-4">
                <img src="${p.img}" alt="${p.name}" class="w-16 h-16 object-cover rounded-lg">
                <div>
                  <h3 class="font-semibold">${p.name}</h3>
                  <p class="text-sm text-gray-400">$${Number(p.price||0).toFixed(2)}</p>
                  <p class="text-xs text-gray-500">Seller: ${p.sellerId || '-'}</p>
                </div>
              </div>
              <div class="flex space-x-2">
                <button class="btn-approve px-4 py-2 rounded-full bg-green-500 text-white" data-id="${d.id}">Approve</button>
                <button class="btn-reject px-4 py-2 rounded-full bg-red-500 text-white" data-id="${d.id}">Reject</button>
              </div>
            </div>
          `;
        });
        container.innerHTML = html;
      };

      await render();

      document.addEventListener('click', async (e) => {
        const t = e.target;
        if (!t.classList) return;
        if (t.classList.contains('btn-approve')) {
          const id = t.getAttribute('data-id');
          await col.products.doc(id).update({ status: 'approved' });
          toast('Approved.');
          await render();
        }
        if (t.classList.contains('btn-reject')) {
          const id = t.getAttribute('data-id');
          await col.products.doc(id).update({ status: 'rejected' });
          toast('Rejected.');
          await render();
        }
      });
    }

    // ------------- CART -------------
    async function addToCart(productId, p) {
      if (!currentUser) { toast('Please log in first!'); return; }
      const id = `${currentUser.uid}_${productId}`;
      await col.carts.doc(id).set({
        userId: currentUser.uid,
        productId,
        name: p.name, price: Number(p.price||0), img: p.img,
        qty: firebase.firestore.FieldValue.increment(1),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      toast('Added to cart!');
      await renderCartIconCount();
    }

    async function renderCartIconCount() {
      const badge = qs('.cart-count');
      if (!badge || !currentUser) return;
      const snap = await col.carts.where('userId', '==', currentUser.uid).get();
      badge.textContent = String(snap.size);
    }

    async function wireCart() {
      const table = byId('cart-table') || byId('cart-items');
      if (!table) return;
      if (!currentUser) {
        table.innerHTML = '<p class="text-gray-400">Please log in.</p>';
        return;
      }
      const snap = await col.carts.where('userId', '==', currentUser.uid).get();
      let total = 0;
      let html = '';
      snap.forEach((d) => {
        const c = d.data();
        const line = (c.price||0) * (c.qty||1);
        total += line;
        html += `
          <div class="card p-3 mb-3 flex justify-between items-center bg-gray-800 rounded-xl">
            <div class="flex items-center space-x-3">
              <img src="${c.img}" class="w-12 h-12 object-cover rounded-lg">
              <div>
                <div class="font-semibold">${c.name}</div>
                <div class="text-sm text-gray-400">$${Number(c.price||0).toFixed(2)} × ${c.qty||1}</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button class="btn-remove-cart bg-red-500 text-white px-3 py-1 rounded-full" data-id="${d.id}">Remove</button>
            </div>
          </div>
        `;
      });
      const totalEl = byId('cart-total');
      if (totalEl) totalEl.textContent = '$' + Number(total).toFixed(2);
      table.innerHTML = html || '<p class="text-gray-400">Your cart is empty.</p>';

      qsa('.btn-remove-cart').forEach((b) => b.addEventListener('click', async () => {
        await col.carts.doc(b.getAttribute('data-id')).delete();
        toast('Removed.');
        await wireCart();
      }));
    }

    // ------------- CHECKOUT / ORDERS -------------
    async function wireCheckout() {
      const btn = byId('btn-checkout');
      if (!btn) return;
      if (!currentUser) {
        btn.addEventListener('click', (e) => { e.preventDefault(); toast('Please log in.'); });
        return;
      }
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        // collect cart
        const cartSnap = await col.carts.where('userId', '==', currentUser.uid).get();
        if (cartSnap.empty) { toast('Cart is empty.'); return; }
        const items = [];
        let total = 0;
        cartSnap.forEach((d) => {
          const c = d.data();
          items.push({ name: c.name, price: c.price, qty: c.qty||1, productId: c.productId, img: c.img });
          total += (c.price||0) * (c.qty||1);
        });
        // create order
        const order = {
          userId: currentUser.uid,
          items, total,
          status: 'placed',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await col.orders.add(order);
        // clear cart
        const batch = db.batch();
        cartSnap.forEach((d) => batch.delete(col.carts.doc(d.id)));
        await batch.commit();
        toast('Order placed!');
        window.location.href = 'myorders.html';
      });
    }

    async function wireMyOrders() {
      const container = byId('orders-list');
      if (!container) return;
      if (!currentUser) {
        container.innerHTML = '<p class="text-gray-400">Please log in.</p>';
        return;
      }
      const snap = await col.orders.where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        container.innerHTML = '<p class="text-gray-400">No orders yet.</p>';
        return;
      }
      let html = '';
      snap.forEach((d) => {
        const o = d.data();
        html += `
          <div class="card p-4 mb-4 bg-gray-800 rounded-xl">
            <div class="font-semibold mb-2">Order #${d.id.slice(-6)} — $${Number(o.total||0).toFixed(2)} — <em>${o.status}</em></div>
            ${(o.items||[]).map(it => `
              <div class="flex items-center space-x-3 mb-2">
                <img src="${it.img}" class="w-10 h-10 object-cover rounded">
                <div class="text-sm">${it.name} × ${it.qty} — $${Number(it.price||0).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
        `;
      });
      container.innerHTML = html;
    }

    // ------------- ACCOUNT PAGE -------------
    async function wireAccount() {
      const info = byId('account-info');
      if (!info) return;
      if (!currentUser) {
        info.innerHTML = '<p class="text-gray-400">Not logged in.</p>';
        return;
      }
      info.innerHTML = `
        <div class="card p-4 bg-gray-800 rounded-xl">
          <div><strong>Email:</strong> ${currentUser.email || '-'}</div>
          <div><strong>Role:</strong> ${userRole}</div>
          <div class="mt-2"><button id="btn-logout" class="bg-red-500 text-white px-4 py-2 rounded-full">Logout</button></div>
        </div>`;
      const out = byId('btn-logout');
      if (out) out.addEventListener('click', async () => { await auth.signOut(); window.location.href = 'login.html'; });
    }

    // Render cart badge if present (after auth change)
    await sleep(200);
    await renderCartIconCount();
  })();
})();
