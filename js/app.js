// ==========================================================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================================================

// URL de tu Google Sheet publicado como CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaTj12PhheXARdsYg3DggvqxhmGQ3MTJHpYsirLxbY3ppt_NOHtG9524MN8FQc-iaY6MNZASl_hQcW/pub?output=csv";

let productsData = []; // Guardará los productos parseados del Sheets
let currentImages = []; // Para el manejo del carrusel del modal
let currentImageIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Catálogo inicializado.");

  // 1. Cargar datos del Sheets
  loadProductsFromSheet();

  // 2. Escuchadores de interfaz (Vistas, Modal, Filtros)
  setupViewToggle();
  setupModalEvents();
  setupFilterEvents();
});

// ==========================================================================
// 1. CARGA DE DATOS DESDE GOOGLE SHEETS (PAPAPARSE)
// ==========================================================================
function loadProductsFromSheet() {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("PEGA_AQUI")) {
    console.warn("Por favor agrega una URL válida de Google Sheets CSV.");
    return;
  }

  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      // Mapeo y saneamiento de los datos del CSV
      productsData = results.data.map((item) => ({
        id: item.id || Math.random().toString(),
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

      // Renderizar productos en pantalla
      renderProducts(productsData);
    },
    error: (err) => console.error("Error al cargar Google Sheets:", err),
  });
}

// ==========================================================================
// 2. RENDERIZADO DINÁMICO DE PRODUCTOS
// ==========================================================================
function renderProducts(products) {
  const container = document.getElementById("products-container");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<p class="no-results">No se encontraron productos en esta búsqueda.</p>`;
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
          <button class="btn-add-cart" ${!isAvailable ? "disabled" : ""}>
            ${isAvailable ? "Agregar a consulta" : "Agotado"}
          </button>
        </div>
      </article>
    `;
    })
    .join("");
}

// ==========================================================================
// 3. ALTERNADOR DE VISTA (CUADRÍCULA / LISTA)
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
// 4. BÚSQUEDA, FILTROS Y ORDENAMIENTO
// ==========================================================================
function setupFilterEvents() {
  const searchInput = document.getElementById("search-input");
  const selectCategory = document.getElementById("select-category");
  const sortBy = document.getElementById("sort-by");

  const applyFilters = () => {
    let filtered = [...productsData];

    // Búsqueda por texto
    const query = searchInput?.value.toLowerCase().trim() || "";
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.descripcion.toLowerCase().includes(query)
      );
    }

    // Filtrado por categoría
    const cat = selectCategory?.value || "all";
    if (cat !== "all") {
      filtered = filtered.filter((p) => p.categoria === cat.toLowerCase());
    }

    // Ordenamiento
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
// 5. MODAL DE DETALLE Y CARRUSEL
// ==========================================================================
function setupModalEvents() {
  const container = document.getElementById("products-container");
  const modal = document.getElementById("product-modal");
  const btnClose = document.getElementById("btn-close-modal");

  // Abrir modal al hacer clic en una tarjeta
  container?.addEventListener("click", (e) => {
    if (e.target.closest(".btn-add-cart")) return; // Si fue clic en el botón de agregar, ignorar

    const card = e.target.closest(".product-card");
    if (!card) return;

    const productId = card.dataset.id;
    const product = productsData.find((p) => p.id === productId);
    if (product) openProductModal(product);
  });

  // Cerrar modal
  btnClose?.addEventListener("click", () => modal.classList.remove("active"));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  // Navegación de carrusel
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

  // Cargar imágenes en el carrusel
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