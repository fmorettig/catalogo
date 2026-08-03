// ==========================================================================
// LÓGICA DEL CARRITO Y WHATSAPP
// ==========================================================================

const WHATSAPP_NUMBER = "584145045002"; 
let cart = []; // [{ product: {...}, quantity: N }]

export function addToCart(product) {
  if (!product || !product.disponible) return;

  const existingItem = cart.find((item) => String(item.product.id) === String(product.id));

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  updateCartUI();
}

export function updateQuantity(productId, delta) {
  const item = cart.find((i) => String(i.product.id) === String(productId));
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    updateCartUI();
    renderCartModal();
  }
}

export function removeFromCart(productId) {
  cart = cart.filter((i) => String(i.product.id) !== String(productId));
  updateCartUI();
  renderCartModal();
}

export function updateCartUI() {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const cartCountDesktop = document.getElementById("cart-count");
  const cartCountMobile = document.getElementById("mobile-cart-count");

  if (cartCountDesktop) cartCountDesktop.innerText = totalItems;
  if (cartCountMobile) cartCountMobile.innerText = totalItems;
}

export function renderCartModal() {
  const container = document.getElementById("cart-items-container");
  const totalPriceEl = document.getElementById("cart-total-price");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p class="empty-cart-msg">Tu carrito está vacío.</p>`;
    if (totalPriceEl) totalPriceEl.innerText = "$ 0";
    return;
  }

  let total = 0;
  container.innerHTML = cart
    .map((item) => {
      const subtotal = item.product.precio * item.quantity;
      total += subtotal;

      const formattedSubtotal = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(subtotal);

      return `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.product.nombre}</h4>
          <span class="cart-item-price">${formattedSubtotal}</span>
        </div>
        <div class="cart-item-controls">
          <button type="button" class="btn-qty" data-cart-action="decrease" data-id="${item.product.id}">-</button>
          <span>${item.quantity}</span>
          <button type="button" class="btn-qty" data-cart-action="increase" data-id="${item.product.id}">+</button>
          <button type="button" class="btn-remove-item" data-cart-action="remove" data-id="${item.product.id}">&times;</button>
        </div>
      </div>
    `;
    })
    .join("");

  if (totalPriceEl) {
    totalPriceEl.innerText = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(total);
  }
}

export function sendCartToWhatsApp() {
  if (cart.length === 0) {
    alert("Tu carrito está vacío. Agrega productos para realizar una consulta.");
    return;
  }

  let message = "¡Hola! Quisiera consultar la disponibilidad e información de los siguientes productos:\n\n";

  let total = 0;
  cart.forEach((item, index) => {
    const subtotal = item.product.precio * item.quantity;
    total += subtotal;
    const formattedSubtotal = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(subtotal);

    message += `${index + 1}. *${item.product.nombre}* (${item.product.variante || "Única"})\n`;
    message += `   Cantidad: ${item.quantity} | Subtotal: ${formattedSubtotal}\n\n`;
  });

  const formattedTotal = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(total);

  message += `*Total estimado:* ${formattedTotal}\n\n`;
  message += "Quedo atento a su respuesta, ¡gracias!";

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
}