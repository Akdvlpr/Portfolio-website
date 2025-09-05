/* script.js
   - localStorage-backed cart (key: 'cart')
   - add / remove / qty controls
   - subtotal calculation
   - sidebar open/close with overlay
   - works on index.html and checkout.html
   - on thankyou.html it clears cart and shows order info
*/

(function () {
  // helpers
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => Number(n).toFixed(2);

  // elements reused across pages (may be null on some pages)
  const cartToggleBtns = qsa('#cart-toggle'); // could be multiple (index + checkout)
  const cartSidebar = qs('#cart-sidebar');
  const cartOverlay = qs('#cart-overlay');
  const cartItemsNode = qs('#cart-items');
  const cartCountNode = qsAllAndFirst('#cart-count'); // helper below
  const cartSubtotalNode = qsAllAndFirst('#cart-subtotal');

  // localStorage cart
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  // utility to update localStorage
  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  // helper to find index by name+price (products are small demo so this is OK)
  function findIndexByProduct(product) {
    return cart.findIndex(i => i.name === product.name && Number(i.price) === Number(product.price) && (i.img === product.img));
  }

  // ensure multiple elements with same ID (present on different pages) updated: returns first matching node if any
  function qsAllAndFirst(selector) {
    const nodes = qsa(selector);
    return nodes.length ? nodes[0] : null;
  }

  // Re-sync cart count across any #cart-count in DOM
  function refreshCartCountUI() {
    const nodes = qsa('#cart-count');
    const totalQty = cart.reduce((s, it) => s + (it.qty || 1), 0);
    nodes.forEach(n => n.textContent = totalQty);
  }

  // Render cart into a given container element (used for sidebar and mini preview)
  function renderCartInto(containerNode, subtotalNodeToUpdate) {
    if (!containerNode) return;
    containerNode.innerHTML = '';
    if (cart.length === 0) {
      containerNode.innerHTML = '<div class="muted">Your cart is empty.</div>';
      if (subtotalNodeToUpdate) subtotalNodeToUpdate.textContent = '$0.00';
      return;
    }

    cart.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'cart-item';

      div.innerHTML = `
        <img src="${it.img || 'https://via.placeholder.com/160x100?text=img'}" alt="${escapeHtml(it.name)}">
        <div class="meta">
          <h4>${escapeHtml(it.name)}</h4>
          <div class="price">$${money(it.price)} × ${it.qty || 1}</div>
        </div>
        <div class="qty-controls" data-index="${idx}">
          <button class="dec" aria-label="Decrease">−</button>
          <button class="inc" aria-label="Increase">+</button>
          <button class="remove-btn" aria-label="Remove">✖</button>
        </div>
      `;
      containerNode.appendChild(div);

      // attach handlers
      const controls = div.querySelector('.qty-controls');
      controls.querySelector('.inc').addEventListener('click', () => {
        cart[idx].qty = (cart[idx].qty || 1) + 1;
        saveCart(); refreshCartCountUI(); renderAllCartUIs();
      });
      controls.querySelector('.dec').addEventListener('click', () => {
        cart[idx].qty = (cart[idx].qty || 1) - 1;
        if (cart[idx].qty <= 0) {
          cart.splice(idx, 1);
        }
        saveCart(); refreshCartCountUI(); renderAllCartUIs();
      });
      controls.querySelector('.remove-btn').addEventListener('click', () => {
        cart.splice(idx, 1);
        saveCart(); refreshCartCountUI(); renderAllCartUIs();
      });
    });

    if (subtotalNodeToUpdate) subtotalNodeToUpdate.textContent = '$' + money(cart.reduce((s, it) => s + Number(it.price) * (it.qty || 1), 0));
  }

  // render UI across locations: sidebar, mini preview on checkout, count nodes
  function renderAllCartUIs() {
    // sidebar cart-items
    const sidebarItemsNode = qsAllAndFirst('#cart-items');
    const sidebarSubtotal = qsAllAndFirst('#cart-subtotal');
    renderCartInto(sidebarItemsNode, sidebarSubtotal);

    // checkout mini preview if available
    const miniItems = qs('#mini-cart-items');
    const miniSubtotal = qs('#mini-cart-subtotal');
    if (miniItems) renderCartInto(miniItems, miniSubtotal);

    // update cart counts
    refreshCartCountUI();
  }

  // open/close sidebar
  function openSidebar() {
    if (!cartOverlay || !cartSidebar) return;
    cartOverlay.classList.add('show');
    cartSidebar.classList.add('open');
    cartSidebar.setAttribute('aria-hidden', 'false');
    renderAllCartUIs();
  }
  function closeSidebar() {
    if (!cartOverlay || !cartSidebar) return;
    cartOverlay.classList.remove('show');
    cartSidebar.classList.remove('open');
    cartSidebar.setAttribute('aria-hidden', 'true');
  }

  // add to cart (global so inline calls still work)
  window.addToCart = function (name, price, img) {
    const product = { name: String(name), price: Number(price), qty: 1, img: img || '' };
    const idx = findIndexByProduct(product);
    if (idx > -1) {
      cart[idx].qty = (cart[idx].qty || 1) + 1;
    } else {
      cart.push(product);
    }
    saveCart(); renderAllCartUIs(); openSidebar();
  };

  // attach add-to-cart buttons present in DOM
  function attachAddButtons() {
    qsa('.add-to-cart').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.product-card');
        if (!card) return;
        const name = card.dataset.name || (card.querySelector('h3') && card.querySelector('h3').textContent);
        const priceRaw = card.dataset.price || (card.querySelector('.price') && card.querySelector('.price').textContent);
        const img = card.dataset.img || (card.querySelector('img') && card.querySelector('img').src);
        // extract numeric price if needed
        const price = Number((String(priceRaw).match(/[\d.]+/) || [0])[0]);
        window.addToCart(name, price, img);
      });
    });
  }

  // clear cart
  function clearCart() {
    cart = [];
    saveCart();
    renderAllCartUIs();
    closeSidebar();
  }

  /* === Page specific behaviors === */

  // initialize toggles and handlers used across pages
  function initCommon() {
    // attach add buttons
    attachAddButtons();

    // cart toggle buttons (there can be multiple #cart-toggle on pages)
    qsa('#cart-toggle').forEach(btn => {
      btn.addEventListener('click', openSidebar);
    });

    // overlay click to close
    if (cartOverlay) cartOverlay.addEventListener('click', closeSidebar);

    // close cart button(s)
    qsa('#close-cart').forEach(b => b.addEventListener('click', closeSidebar));

    // clear cart
    qsa('#clear-cart').forEach(b => b.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      clearCart();
    }));

    // hamburger toggling nav (simple)
    const hamburger = qs('#hamburger');
    const navLinks = qs('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
      // hide nav when link clicked (mobile)
      qsa('.nav-links a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
    }

    // render initial UI
    renderAllCartUIs();
  }

  // checkout form behavior (persist order -> redirect to thankyou)
  function initCheckoutPage() {
    const checkoutForm = qs('#checkout-form') || qs('.checkout-form');
    if (!checkoutForm) return;
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // create order object
      const formData = new FormData(checkoutForm);
      const order = {
        id: 'ORD' + Math.floor(100000 + Math.random() * 900000),
        date: new Date().toISOString(),
        customer: {
          name: formData.get('fullname') || '',
          email: formData.get('email') || '',
          address: formData.get('address') || ''
        },
        items: cart.slice(),
        total: cart.reduce((s, it) => s + Number(it.price) * (it.qty || 1), 0)
      };
      localStorage.setItem('order', JSON.stringify(order));
      // clear cart and persist empty
      cart = [];
      saveCart();
      // redirect
      window.location.href = 'thankyou.html';
    });
  }

  // thankyou page behavior: clear cart (defensive) and show order info
  function initThankyouPage() {
    // clear cart proactively (if not already)
    cart = [];
    saveCart();
    renderAllCartUIs();
    // show order details if available
    const order = JSON.parse(localStorage.getItem('order') || 'null');
    const orderInfoNode = qs('#order-info');
    if (order && orderInfoNode) {
      orderInfoNode.textContent = `Order ${order.id} — ${order.items.length} item(s) · $${money(order.total)} · ${new Date(order.date).toLocaleString()}`;
    }
  }

  // small HTML escape helper
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  /* ========== init when DOM ready ========== */
  document.addEventListener('DOMContentLoaded', () => {
    initCommon();
    initCheckoutPage();
    // If this is thankyou page, run the thankyou init
    if (document.body.classList.contains('thankyou-page') || qs('.thankyou')) {
      initThankyouPage();
    }
    // keep scanning for product buttons (in case of dynamic content)
    setInterval(attachAddButtons, 1200);
  });

})();