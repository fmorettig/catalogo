// ==========================================================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================================================

// Pega aquí tu URL en formato CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaTj12PhheXARdsYg3DggvqxhmGQ3MTJHpYsirLxbY3ppt_NOHtG9524MN8FQc-iaY6MNZASl_hQcW/pub?output=csv";

// Número de WhatsApp al que llegará la consulta (incluye código de país sin el '+')
const WHATSAPP_NUMBER = "584145045002"; 

let productsData = []; 
let cart = []; // Estructura: [{ product: {...}, quantity: N }]

let currentImages = [];
let currentImageIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Catálogo e interfaz inicializados.");

  loadProductsFromSheet();
  setupViewToggle();
  setupModalEvents();
  setupFilterEvents();
  setupCartEvents();
});

// ==========================================================================
// 1. CARGA DE DATOS DESDE GOOGLE SHEETS
// ==========================================================================
function loadProductsFromSheet() {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("TU_ENLACE")) {
    console.warn("Por favor agrega una URL válida de Google Sheets CSV.");
    return;
  }

  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      productsData = results.data.map((item) => ({
        id: String(item.id || Math.random()),
        nombre: item.nombre || "Producto sin nombre",
        categoria: (item.categoria || "otros").toLowerCase().trim(),
        precio: parseFloat(item.precio) || 0,
        disponible: item.disponible?.toLowerCase().trim() === "si",
        imagenes: item.imagenes
          ? item.imagenes.split(",").map((url) => url.trim())
          : ["https://via.placeholder.com/300"],
        descripcion: item.descripcion || "",
        variante: item.variante || "",
      }));

      renderProducts(productsData);
    },
    error: (err) => console.error("Error al cargar Google Sheets:", err),
  });
}

// ==========================================================================
// 2. RENDERIZADO DE PRODUCTOS
// ==========================================================================
function renderProducts(products) {
  const container = document.getElementById("products-container");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<p class="no-results">No se encontraron productos.</p>`;
    return;
  }

  container.innerHTML = products
    .map((prod) => {
      const isAvailable = prod.disponible;
      const formattedPrice = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(prod.precio);
      const mainImg = prod.imagenes[0] || "https://via.placeholder.com/300";

      return `
      <article class="product-card" data-id="${prod.id}">
        <div class="product-image-container">
          <img src="${mainImg}" alt="${prod.nombre}" class="product-image" loading="lazy">
        </div>
        <div class="product-info">
          <h2 class="product-title">${prod.nombre}</h2>
          <p class="product-variant">${prod.variante}</p>
          <div class="product-price-row">
            <span class="product-price">${formattedPrice}</span>
            <span class="status-badge ${isAvailable ? "available" : "unavailable"}">
              <span class="dot"></span> ${isAvailable ? "Disponible" : "Agotado"}
            </span>
          </div>
          <button class="btn-add-cart" ${!isAvailable ? "disabled" : ""} data-action="add-cart">
            ${isAvailable ? "Agregar a consulta" : "Agotado"}
          </button>
        </div>
      </article>
    `;
    })
    .join("");
}

// ==========================================================================
// 3. LÓGICA DEL CARRITO DE COMPRAS Y WHATSAPP
// ==========================================================================
function setupCartEvents() {
  const container = document.getElementById("products-container");
  const modalAddBtn = document.getElementById("modal-add-btn");
  const btnWhatsappMobile = document.querySelector(".btn-whatsapp-cart");
  const btnCartDesktop = document.getElementById("btn-cart-desktop");

  // Click en "Agregar" desde las tarjetas
  container?.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="add-cart"]');
    if (!btn) return;

    const card = btn.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    addToCart(productId);
  });

  // Click en "Agregar" desde el modal
  modalAddBtn?.addEventListener("click", () => {
    const productId = modalAddBtn.dataset.id;
    if (productId) addToCart(productId);
  });

  // Botones para enviar la consulta por WhatsApp
  btnWhatsappMobile?.addEventListener("click", sendCartToWhatsApp);
  btnCartDesktop?.addEventListener("click", sendCartToWhatsApp);
}

function addToCart(productId) {
  const product = productsData.find((p) => p.id === productId);
  if (!product || !product.disponible) return;

  const existingItem = cart.find((item) => item.product.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const cartCountDesktop = document.getElementById("cart-count");
  const cartCountMobile = document.getElementById("mobile-cart-count");

  if (cartCountDesktop) cartCountDesktop.innerText = totalItems;
  if (cartCountMobile) cartCountMobile.innerText = totalItems;
}

function sendCartToWhatsApp() {
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

    message += `${index + 1}. *${item.product.nombre}* (${item.product.variante})\n`;
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

// ==========================================================================
// 4. ALTERNADOR DE VISTAS (CUADRÍCULA / LISTA)
// ==========================================================================
function setupViewToggle() {
  const btnGrid = document.getElementById("btn-grid-view");
  const btnList = document.getElementById("btn-list-view");
  const productsContainer = document.getElementById("products-container");

  btnGrid?.addEventListener("click", () => {
    productsContainer.classList.remove("list-view");
    btnGrid.classList.add("active");
    btnList.classList.remove("active");
  });

  btnList?.addEventListener("click", () => {
    productsContainer.classList.add("list-view");
    btnList.classList.add("active");
    btnGrid.classList.remove("active");
  });
}

// ==========================================================================
// 5. BÚSQUEDA Y FILTROS
// ==========================================================================
function setupFilterEvents() {
  const searchInput = document.getElementById("search-input");
  const selectCategory = document.getElementById("select-category");
  const sortBy = document.getElementById("sort-by");

  const applyFilters = () => {
    let filtered = [...productsData];

    const query = searchInput?.value.toLowerCase().trim() || "";
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.descripcion.toLowerCase().includes(query)
      );
    }

    const cat = selectCategory?.value || "all";
    if (cat !== "all") {
      filtered = filtered.filter((p) => p.categoria === cat.toLowerCase());
    }

    const sortVal = sortBy?.value;
    if (sortVal === "name-asc") filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sortVal === "name-desc") filtered.sort((a, b) => b.nombre.localeCompare(a.nombre));
    if (sortVal === "price-asc") filtered.sort((a, b) => a.precio - b.precio);
    if (sortVal === "price-desc") filtered.sort((a, b) => b.precio - a.precio);

    renderProducts(filtered);
  };

  searchInput?.addEventListener("input", applyFilters);
  selectCategory?.addEventListener("change", applyFilters);
  sortBy?.addEventListener("change", applyFilters);
}

// ==========================================================================
// 6. MODAL Y CARRUSEL
// ==========================================================================
function setupModalEvents() {
  const container = document.getElementById("products-container");
  const modal = document.getElementById("product-modal");
  const btnClose = document.getElementById("btn-close-modal");

  container?.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="add-cart"]')) return;

    const card = e.target.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    const product = productsData.find((p) => p.id === productId);
    if (product) openProductModal(product);
  });

  btnClose?.addEventListener("click", () => modal.classList.remove("active"));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  document.getElementById("carousel-prev")?.addEventListener("click", () => changeSlide(-1));
  document.getElementById("carousel-next")?.addEventListener("click", () => changeSlide(1));
}

function openProductModal(product) {
  const modal = document.getElementById("product-modal");

  document.getElementById("modal-title").innerText = product.nombre;
  document.getElementById("modal-variant").innerText = product.variante;
  document.getElementById("modal-description").innerText = product.descripcion;
  document.getElementById("modal-price").innerText = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(product.precio);

  const statusBadge = document.getElementById("modal-status");
  const addBtn = document.getElementById("modal-add-btn");

  addBtn.dataset.id = product.id;

  if (product.disponible) {
    statusBadge.className = "status-badge available";
    statusBadge.innerText = "Disponible";
    addBtn.disabled = false;
    addBtn.innerText = "Agregar a consulta";
  } else {
    statusBadge.className = "status-badge unavailable";
    statusBadge.innerText = "No disponible";
    addBtn.disabled = true;
    addBtn.innerText = "Agotado";
  }

  currentImages = product.imagenes.length ? product.imagenes : ["https://via.placeholder.com/300"];
  currentImageIndex = 0;

  const track = document.getElementById("modal-carousel-track");
  const dotsContainer = document.getElementById("carousel-dots");

  track.innerHTML = currentImages.map((img) => `<img src="${img}" alt="Foto producto">`).join("");
  dotsContainer.innerHTML = currentImages
    .map((_, i) => `<span class="dot-item ${i === 0 ? "active" : ""}"></span>`)
    .join("");

  updateCarousel();
  modal.classList.add("active");
}

function changeSlide(direction) {
  currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;
  updateCarousel();
}

function updateCarousel() {
  const track = document.getElementById("modal-carousel-track");
  if (track) track.style.transform = `translateX(-${currentImageIndex * 100}%)`;

  const dots = document.querySelectorAll(".dot-item");
  dots.forEach((dot, i) => dot.classList.toggle("active", i === currentImageIndex));
}