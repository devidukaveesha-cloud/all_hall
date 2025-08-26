/* ===== app.js ===== */

// ----- Fake Data (replace with Firebase later)
const PRODUCTS = [
  {id:'p1', name:'Cool Gadget', price:79.99, oldPrice:99.99, img:'https://picsum.photos/seed/gadget/600/400', rating:4.6, badges:['-20%'], colors:['Black','Silver'], sizes:['S','M','L'], desc:'Sleek design, smart features.'},
  {id:'p2', name:'Coffee Maker', price:75.00, img:'https://picsum.photos/seed/coffee/600/400', rating:4.8, badges:['HOT'], colors:['Black'], sizes:['One Size'], desc:'Brew the perfect cup.'},
  {id:'p3', name:'Gaming Mouse', price:59.99, img:'https://picsum.photos/seed/mouse/600/400', rating:4.5, badges:[], colors:['Black','White'], sizes:['Std'], desc:'High-precision sensor.'},
  {id:'p4', name:'Smart Watch', price:99.00, img:'https://picsum.photos/seed/watch/600/400', rating:4.4, badges:['NEW'], colors:['Black','Gold'], sizes:['42mm','46mm'], desc:'Track fitness & notifications.'}
];

const STORAGE_KEYS = {
  CART:'ah_cart',
  ORDERS:'ah_orders',
  USER:'ah_user'
};

function qs(s,root=document){return root.querySelector(s)}
function qsa(s,root=document){return [...root.querySelectorAll(s)]}
function fmt(n){return `$${n.toFixed(2)}`}

// ----- Cart helpers (localStorage)
function readLS(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
function writeLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function getCart(){ return readLS(STORAGE_KEYS.CART, []); }
function saveCart(cart){ writeLS(STORAGE_KEYS.CART, cart); renderCartBadge(); }
function addToCart(id, qty=1, color=null, size=null){
  const cart = getCart();
  const idx = cart.findIndex(i=>i.id===id && i.color===color && i.size===size);
  if(idx>-1) cart[idx].qty += qty; else cart.push({id, qty, color, size});
  saveCart(cart);
  alert('Added to cart ✅');
}
function removeFromCart(index){
  const cart = getCart(); cart.splice(index,1); saveCart(cart);
}
function setQty(index, qty){
  const cart = getCart(); cart[index].qty = Math.max(1, qty|0); saveCart(cart);
}

function cartTotals(){
  const cart = getCart();
  let items = cart.map(it=>{
    const p = PRODUCTS.find(x=>x.id===it.id);
    const line = p.price * it.qty;
    return {...it, ...p, line};
  });
  const subtotal = items.reduce((s,i)=>s+i.line,0);
  const shipping = items.length? 5.00 : 0;
  const total = subtotal + shipping;
  return {items, subtotal, shipping, total};
}

function renderCartBadge(){
  const count = getCart().reduce((s,i)=>s+i.qty,0);
  qsa('[data-cart-count]').forEach(el=>el.textContent = count);
}

// ----- Product list (index)
function renderProductGrid(){
  const wrap = qs('#product-grid'); if(!wrap) return;
  wrap.innerHTML = '';
  PRODUCTS.forEach(p=>{
    const col = document.createElement('div');
    col.className = 'col-3';
    col.innerHTML = `
      <article class="card prod">
        ${p.badges[0]?`<span class="flag">${p.badges[0]}</span>`:''}
        <img class="thumb" src="${p.img}" alt="${p.name}">
        <div class="meta">
          <h3 class="m0" style="font-size:18px">${p.name}</h3>
          <div class="mt8"><span class="price">${fmt(p.price)}</span>
            ${p.oldPrice?`<span class="old">${fmt(p.oldPrice)}</span>`:''}
          </div>
          <div class="actions">
            <a class="btn secondary" href="product.html?id=${p.id}">View</a>
            <button class="btn" data-add="${p.id}">Add</button>
          </div>
        </div>
      </article>`;
    wrap.appendChild(col);
  });
  qsa('[data-add]').forEach(b=>b.addEventListener('click',e=>{
    addToCart(e.currentTarget.dataset.add,1);
  }));
}

// ----- Product detail
function renderProductDetail(){
  const box = qs('#product-detail'); if(!box) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || PRODUCTS[0].id;
  const p = PRODUCTS.find(x=>x.id===id) || PRODUCTS[0];
  box.innerHTML = `
    <div class="grid">
      <div class="col-6">
        <article class="card pad">
          <img src="${p.img}" alt="${p.name}" style="border-radius:12px">
        </article>
      </div>
      <div class="col-6">
        <article class="card pad">
          <h1 class="m0" style="font-size:26px">${p.name}</h1>
          <p class="mt8">${p.desc}</p>
          <div class="mt8"><span class="price">${fmt(p.price)}</span> ${p.oldPrice?`<span class="old">${fmt(p.oldPrice)}</span>`:''}</div>
          <div class="mt16">
            <label>Color</label>
            <select id="selColor" class="mt8 input">
              ${p.colors.map(c=>`<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="mt12">
            <label>Size</label>
            <select id="selSize" class="mt8 input">
              ${p.sizes.map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="mt16 actions">
            <button class="btn" id="btnAdd">Add to Cart</button>
            <a class="btn ghost" href="checkout.html?buy=${p.id}">Buy Now</a>
          </div>
        </article>
      </div>
    </div>`;
  qs('#btnAdd').onclick = ()=>{
    addToCart(p.id,1, qs('#selColor').value, qs('#selSize').value);
  };
}

// ----- Cart page
function renderCartPage(){
  const wrap = qs('#cart'); if(!wrap) return;
  const {items, subtotal, shipping, total} = cartTotals();
  if(!items.length){
    wrap.innerHTML = `<div class="card pad center" style="min-height:160px"><div>No items in cart.</div></div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="table card">
      <thead><tr><th>Item</th><th>Variant</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
      <tbody>
        ${items.map((it,i)=>`
          <tr>
            <td style="display:flex;gap:10px;align-items:center">
              <img src="${it.img}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px">
              ${it.name}
            </td>
            <td>${(it.color||'') + (it.size?` / ${it.size}`:'')}</td>
            <td>${fmt(it.price)}</td>
            <td><input data-q="${i}" type="number" min="1" class="input" style="width:84px" value="${it.qty}"></td>
            <td>${fmt(it.line)}</td>
            <td><button class="btn danger" data-del="${i}">Remove</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="grid mt16">
      <div class="col-6"></div>
      <div class="col-6">
        <div class="card pad">
          <div class="mt8">Subtotal: <b>${fmt(subtotal)}</b></div>
          <div class="mt8">Delivery: <b>${fmt(shipping)}</b></div>
          <div class="mt12" style="font-size:20px">Total: <b>${fmt(total)}</b></div>
          <a class="btn mt16" href="checkout.html">Proceed to Checkout</a>
        </div>
      </div>
    </div>`;
  qsa('[data-q]').forEach(inp=>inp.addEventListener('change',e=>{
    setQty(+e.target.dataset.q, +e.target.value); renderCartPage();
  }));
  qsa('[data-del]').forEach(b=>b.addEventListener('click',e=>{
    removeFromCart(+e.currentTarget.dataset.del); renderCartPage();
  }));
}

// ----- Checkout page
function renderCheckout(){
  const box = qs('#checkout'); if(!box) return;
  const {items, subtotal, shipping, total} = cartTotals();
  if(!items.length){ box.innerHTML = `<div class="card pad">Your cart is empty.</div>`; return; }
  box.innerHTML = `
    <div class="grid">
      <div class="col-7">
        <div class="card pad">
          <h3 class="m0">Shipping Details</h3>
          <div class="form-row mt12">
            <div><label>Full Name</label><input id="name" class="input mt8" placeholder="Your Name"></div>
            <div><label>Mobile</label><input id="phone" class="input mt8" placeholder="07x xxx xxxx"></div>
          </div>
          <div class="mt12"><label>Address</label><textarea id="addr" class="input mt8" rows="3" placeholder="Street, City"></textarea></div>
          <div class="form-row mt12">
            <div>
              <label>Payment</label>
              <select id="pay" class="input mt8">
                <option>Cash on Delivery</option>
                <option>Bank Transfer</option>
              </select>
            </div>
            <div>
              <label>Coupon</label>
              <input id="coupon" class="input mt8" placeholder="Enter code">
            </div>
          </div>
        </div>
      </div>
      <div class="col-5">
        <div class="card pad">
          <h3 class="m0">Order Summary</h3>
          <ul class="mt12" style="list-style:none;padding:0;margin:0">
            ${items.map(i=>`<li class="mt8">${i.name} × ${i.qty} <span style="float:right">${fmt(i.line)}</span></li>`).join('')}
          </ul>
          <div class="mt12">Subtotal <span style="float:right">${fmt(subtotal)}</span></div>
          <div class="mt8">Delivery <span style="float:right">${fmt(shipping)}</span></div>
          <div class="mt12" style="font-size:20px">Total <span style="float:right"><b>${fmt(total)}</b></span></div>
          <button id="orderNow" class="btn mt16">Order Now</button>
        </div>
      </div>
    </div>`;
  qs('#orderNow').onclick = ()=>{
    const order = {
      id:'o_'+Date.now(),
      items, subtotal, shipping, total,
      address: qs('#addr').value, name: qs('#name').value, phone: qs('#phone').value,
      payment: qs('#pay').value,
      status:'Pending', createdAt: new Date().toISOString()
    };
    const orders = readLS(STORAGE_KEYS.ORDERS, []);
    orders.push(order); writeLS(STORAGE_KEYS.ORDERS, orders);
    saveCart([]); // clear
    location.href = 'myorders.html';
  };
}

// ----- My Orders
function renderOrders(){
  const box = qs('#orders'); if(!box) return;
  const orders = readLS(STORAGE_KEYS.ORDERS, []);
  if(!orders.length){ box.innerHTML = `<div class="card pad">No orders yet.</div>`; return; }
  box.innerHTML = `
    <table class="table card">
      <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${orders.map((o,i)=>`
          <tr>
            <td>${o.id}</td>
            <td>${new Date(o.createdAt).toLocaleString()}</td>
            <td>${o.items.map(it=>`${it.name}×${it.qty}`).join(', ')}</td>
            <td>${fmt(o.total)}</td>
            <td><span class="tag">${o.status}</span></td>
            <td>
              ${Date.now()-new Date(o.createdAt).getTime() < 24*60*60*1000 && o.status==='Pending'
                ? `<button class="btn danger" data-cancel="${i}">Cancel</button>` : ''}
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  qsa('[data-cancel]').forEach(b=>b.onclick = e=>{
    const i = +e.currentTarget.dataset.cancel;
    const orders = readLS(STORAGE_KEYS.ORDERS, []);
    orders[i].status = 'Cancelled';
    writeLS(STORAGE_KEYS.ORDERS, orders); renderOrders();
  });
}

// ----- Seller Center (client-only demo)
function initSeller(){
  const form = qs('#seller-form'); if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(form);
    const p = {
      id: 'p'+(Math.random()*1e6|0),
      name: fd.get('name'), price: +fd.get('price')||0,
      img: fd.get('img') || 'https://picsum.photos/seed/new/600/400',
      desc: fd.get('desc')||'',
      colors: fd.get('colors').split(',').map(s=>s.trim()).filter(Boolean),
      sizes: fd.get('sizes').split(',').map(s=>s.trim()).filter(Boolean),
      rating: 0, badges:[]
    };
    // For demo: push to PRODUCTS in-memory and localStorage mirror
    PRODUCTS.push(p);
    alert('Item added (demo only). It will appear on Home.');
    form.reset();
  });
}

// ----- init on load
document.addEventListener('DOMContentLoaded', ()=>{
  renderCartBadge();
  renderProductGrid();
  renderProductDetail();
  renderCartPage();
  renderCheckout();
  renderOrders();
  initSeller();
});
