/* ===== app.js ===== */

// ----- Fake Data (replace with Firebase later)
const PRODUCTS = [
  {id:'p1', name:'Cool Gadget', price:79.99, oldPrice:99.99, img:'https://picsum.photos/seed/gadget/600/400', rating:4.6, badges:['-20%'], colors:['Black','Silver'], sizes:['S','M','L'], desc:'Sleek design, smart features.'},
  {id:'p2', name:'Coffee Maker', price:75.00, img:'https://picsum.photos/seed/coffee/600/400', rating:4.8, badges:['HOT'], colors:['Black'], sizes:['One Size'], desc:'Brew the perfect cup.'},
  {id:'p3', name:'Gaming Mouse', price:59.99, img:'https://picsum.photos/seed/mouse/600/400', rating:[], colors:['Black','White'], sizes:['Std'], desc:'High-precision sensor.'},
  {id:'p4', name:'Smart Watch', price:99.00, img:'https://picsum.photos/seed/watch/600/400', rating:4.4, badges:['NEW'], colors:['Black','Gold'], sizes:['42mm','46mm'], desc:'Track fitness & notifications.'}
];

const STORAGE_KEYS = {
  CART:'ah_cart',
  ORDERS:'ah_orders',
  USER:'ah_user',
  USER_ROLE:'ah_user_role' // Added a key for user role
};

// ----- Helper Functions
const qs  = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);
const readLS = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch(e) { console.error(e); return fallback; }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const toast = m => {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
};

// ----- Product Grid
function renderProductGrid(products) {
  const grid = qs('#product-grid');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <a href="product.html?id=${p.id}" class="product-card">
      <img src="${p.img}" alt="${p.name}">
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="price-group">
          <span class="price">$${p.price.toFixed(2)}</span>
          ${p.oldPrice ? `<span class="old-price">$${p.oldPrice.toFixed(2)}</span>` : ''}
        </div>
        ${p.badges.length ? `<div class="badges">${p.badges.map(b => `<span class="badge">${b}</span>`).join('')}</div>` : ''}
      </div>
    </a>
  `).join('');
}

// ----- Product Page
function renderProductPage() {
  const main = qs('#product-details');
  if (!main) return;
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    main.innerHTML = '<p>Product not found.</p>';
    return;
  }

  main.innerHTML = `
    <div class="product-header">
      <h1 class="product-title">${product.name}</h1>
    </div>
    <div class="product-main">
      <div class="product-image-gallery">
        <img src="${product.img}" alt="${product.name}">
      </div>
      <div class="product-info-details">
        <div class="product-price">
          <span class="current-price">$${product.price.toFixed(2)}</span>
          ${product.oldPrice ? `<span class="old-price-line">$${product.oldPrice.toFixed(2)}</span>` : ''}
        </div>
        <div class="product-options">
          <div class="option-group">
            <label>Color:</label>
            <div class="option-swatches">
              ${(product.colors || []).map(color => `<span class="swatch" style="background-color: ${color.toLowerCase()};" title="${color}"></span>`).join('')}
            </div>
          </div>
          <div class="option-group">
            <label>Size:</label>
            <div class="option-buttons">
              ${(product.sizes || []).map(size => `<button class="size-btn">${size}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn add-to-cart" data-id="${product.id}">Add to Cart</button>
          <button class="btn buy-now">Buy Now</button>
        </div>
        <div class="product-description">
          <h2>Product Description</h2>
          <p>${product.desc}</p>
        </div>
      </div>
    </div>
  `;
}

// ----- Cart
function renderCart() {
  const cartPage = qs('.cart-page');
  if (!cartPage) return;

  const cart = readLS(STORAGE_KEYS.CART, []);
  if (cart.length === 0) {
    cartPage.innerHTML = `<h1>Your Cart</h1><p>Your cart is empty.</p>`;
    return;
  }

  const itemsHtml = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return '';
    return `
      <div class="cart-item">
        <img src="${product.img}" alt="${product.name}">
        <div class="cart-details">
          <h3>${product.name}</h3>
          <p>$${product.price.toFixed(2)}</p>
        </div>
        <div class="cart-actions">
          <button class="btn btn-remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  const total = cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? product.price : 0);
  }, 0);

  cartPage.innerHTML = `
    <h1>Your Cart</h1>
    ${itemsHtml}
    <div class="cart-total">Total: $${total.toFixed(2)}</div>
    <button class="btn btn-checkout" onclick="location.href='checkout.html'">Proceed to Checkout</button>
  `;

  qsa('.btn-remove').forEach(btn => btn.onclick = e => {
    const id = e.currentTarget.dataset.id;
    const newCart = cart.filter(item => item.id !== id);
    writeLS(STORAGE_KEYS.CART, newCart);
    renderCart();
  });
}

// ----- My Orders
function renderOrders() {
  const ordersContainer = qs('.container.my-orders');
  if (!ordersContainer) return;
  const orders = readLS(STORAGE_KEYS.ORDERS, []);
  if (orders.length === 0) {
    ordersContainer.innerHTML = '<h2>Your Orders</h2><p>You have no orders yet.</p>';
    return;
  }
  
  ordersContainer.innerHTML = orders.map((o, i) => `
    <div class="order-card">
      <div class="order-left">
        <img src="${o.img}" alt="${o.name}">
        <div class="order-info">
          <h3>${o.name}</h3>
          <p>Price: $${o.price.toFixed(2)}</p>
          <p class="status ${o.status.toLowerCase()}">${o.status}</p>
        </div>
      </div>
      <div class="order-actions">
        <button class="details-btn">View Details</button>
        ${o.status.toLowerCase() === 'delivered' ? `<button class="reorder-btn">Reorder</button>` : ''}
        ${o.status.toLowerCase() === 'pending' ? `<button class="cancel-btn" data-cancel-index="${i}">Cancel</button>` : ''}
      </div>
    </div>
  `).join('');

  qsa('.cancel-btn').forEach(btn => btn.onclick = e => {
    const index = parseInt(e.currentTarget.dataset.cancelIndex, 10);
    orders[index].status = 'Cancelled';
    writeLS(STORAGE_KEYS.ORDERS, orders);
    renderOrders();
  });
}

// ----- Seller Center (client-only demo)
function initSeller() {
  const form = qs('#seller-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const p = {
      id: 'p' + (Math.random() * 1e6 | 0),
      name: fd.get('name'),
      price: +fd.get('price') || 0,
      img: fd.get('img') || 'https://picsum.photos/seed/new/600/400',
      desc: fd.get('desc') || '',
      colors: fd.get('colors').split(',').map(s => s.trim()).filter(Boolean),
      sizes: fd.get('sizes').split(',').map(s => s.trim()).filter(Boolean),
      rating: 0,
      badges: []
    };
    PRODUCTS.push(p);
    toast("Product created!");
    form.reset();
  });
}

// ----- Dynamically hide seller link based on user role
function hideSellerLinkBasedOnRole() {
  // NOTE: You must add 'id="seller-link"' to the seller_center.html link in your index.html file for this to work.
  // Example: <a href="seller_center.html" id="seller-link">...</a>
  const sellerLink = qs('#seller-link');
  if (sellerLink) {
    const userRole = readLS(STORAGE_KEYS.USER_ROLE);
    if (userRole !== 'seller') {
      sellerLink.style.display = 'none';
    } else {
      sellerLink.style.display = 'flex'; // Ensure it's visible if the role is 'seller'
    }
  }
}

// ----- Initialize all pages
document.addEventListener('DOMContentLoaded', () => {
  renderProductGrid(PRODUCTS);
  renderProductPage();
  renderCart();
  renderOrders();
  initSeller();
  hideSellerLinkBasedOnRole();
});

// Added function to handle the "Add to Cart" button functionality
document.addEventListener('click', e => {
  if (e.target.classList.contains('add-to-cart')) {
    const productId = e.target.dataset.id;
    const product = PRODUCTS.find(p => p.id === productId);
    if (product) {
      const cart = readLS(STORAGE_KEYS.CART, []);
      cart.push({ id: product.id });
      writeLS(STORAGE_KEYS.CART, cart);
      toast(`${product.name} added to cart!`);
    }
  }
});
