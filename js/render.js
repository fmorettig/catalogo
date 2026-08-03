// ==========================================================================
// RENDERIZADO DE INTERFAZ, CATEGORÍAS Y MODAL DETALLE
// ==========================================================================

let currentImages = [];
let currentImageIndex = 0;

/**
 * Renderiza la lista de tarjetas de productos en el contenedor principal
 */
export function renderProducts(products) {
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
            ${isAvailable ? "Agregar al Carrito" : "Agotado"}
          </button>
        </div>
      </article>
    `;
    })
    .join("");
}

/**
 * Genera dinámicamente los listados de categorías (tanto en el sidebar como en el select móvil)
 */
export function generateDynamicCategories(productsData) {
  const categoryList = document.getElementById("category-list");
  const selectCategory = document.getElementById("select-category");

  const rawCategories = productsData.map((p) => p.categoria).filter(Boolean);
  const uniqueCategories = ["all", ...new Set(rawCategories)];

  if (categoryList) {
    categoryList.innerHTML = uniqueCategories
      .map((cat, index) => {
        const label = cat === "all" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1);
        return `<li class="${index === 0 ? "active" : ""}" data-category="${cat}">${label}</li>`;
      })
      .join("");
  }

  if (selectCategory) {
    selectCategory.innerHTML = uniqueCategories
      .map((cat) => {
        const label = cat === "all" ? "Todas las categorías" : cat.charAt(0).toUpperCase() + cat.slice(1);
        return `<option value="${cat}">${label}</option>`;
      })
      .join("");
  }
}

/**
 * Abre y llena el modal con los detalles del producto seleccionado
 */
export function openProductModal(product) {
  const modal = document.getElementById("product-modal");
  if (!modal) return;

  // Textos e información básica
  document.getElementById("modal-title").innerText = product.nombre;
  document.getElementById("modal-variant").innerText = product.variante || "";
  document.getElementById("modal-description").innerText = product.descripcion || "";

  // Formato de Precio
  document.getElementById("modal-price").innerText = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(product.precio);

  // Estado de Disponibilidad
  const statusText = document.getElementById("modal-status-text");
  const statusDot = document.getElementById("modal-status-dot");
  const addBtn = document.getElementById("modal-add-btn");

  if (addBtn) addBtn.dataset.id = product.id;

  if (product.disponible) {
    if (statusText) statusText.innerText = "Disponible";
    if (statusDot) statusDot.style.backgroundColor = "#22c55e";
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.innerText = "Consultar por WhatsApp";
    }
  } else {
    if (statusText) statusText.innerText = "Agotado";
    if (statusDot) statusDot.style.backgroundColor = "#ef4444";
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerText = "Producto Agotado";
    }
  }

  // --- OPCIONES DINÁMICAS (PRESENTACIONES) ---
  const presentationsContainer = document.getElementById("modal-presentations");
  if (presentationsContainer) {
    if (product.variantes && product.variantes.length > 0) {
      presentationsContainer.parentElement.style.display = "block";
      presentationsContainer.innerHTML = product.variantes
        .map((v, i) => `<button class="chip-item ${i === 0 ? "active" : ""}">${v}</button>`)
        .join("");
    } else {
      presentationsContainer.parentElement.style.display = "none";
    }
  }

  // --- OPCIONES DINÁMICAS (FRAGANCIAS / TIPOS) ---
  const fragrancesContainer = document.getElementById("modal-fragrances");
  if (fragrancesContainer) {
    if (product.tipos && product.tipos.length > 0) {
      fragrancesContainer.parentElement.style.display = "block";
      fragrancesContainer.innerHTML = product.tipos
        .map((t, i) => `<button class="chip-item ${i === 0 ? "active" : ""}">${t}</button>`)
        .join("");
    } else {
      fragrancesContainer.parentElement.style.display = "none";
    }
  }

  // Configuración de interacción para los chips (Selección exclusiva)
  [presentationsContainer, fragrancesContainer].forEach((container) => {
    if (container) {
      container.onclick = (e) => {
        if (e.target.classList.contains("chip-item")) {
          container.querySelectorAll(".chip-item").forEach((btn) => btn.classList.remove("active"));
          e.target.classList.add("active");
        }
      };
    }
  });

  // --- GALERÍA DE IMÁGENES Y MINIATURAS ---
  currentImages = product.imagenes.length ? product.imagenes : ["https://via.placeholder.com/400"];
  currentImageIndex = 0;

  const mainImg = document.getElementById("modal-main-image");
  const thumbsContainer = document.getElementById("carousel-dots");

  if (mainImg) mainImg.src = currentImages[0];

  if (thumbsContainer) {
    thumbsContainer.innerHTML = currentImages
      .map(
        (img, i) =>
          `<img src="${img}" class="thumb-item ${i === 0 ? "active" : ""}" data-index="${i}" alt="Miniatura">`
      )
      .join("");

    thumbsContainer.querySelectorAll(".thumb-item").forEach((thumb) => {
      thumb.onclick = (e) => {
        currentImageIndex = parseInt(e.target.dataset.index);
        updateCarousel();
      };
    });
  }

  // Enlace para compartir en WhatsApp
  const shareLink = document.getElementById("share-whatsapp");
  if (shareLink) {
    const shareText = encodeURIComponent(`¡Hola! Mira este producto: ${product.nombre}`);
    shareLink.href = `https://wa.me/?text=${shareText}`;
  }

  modal.classList.add("active");
}

/**
 * Cambia la imagen principal del modal al navegar por flechas
 */
export function changeSlide(direction) {
  if (!currentImages.length) return;
  currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;
  updateCarousel();
}

/**
 * Actualiza la foto activa y la miniatura remarcada
 */
function updateCarousel() {
  const mainImg = document.getElementById("modal-main-image");
  if (mainImg) mainImg.src = currentImages[currentImageIndex];

  const thumbs = document.querySelectorAll(".thumb-item");
  thumbs.forEach((thumb, i) => thumb.classList.toggle("active", i === currentImageIndex));
}