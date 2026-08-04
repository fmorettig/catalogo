// ==========================================================================
// INICIALIZACIÓN Y EVENTOS GENERALES
// ==========================================================================

import { loadProductsFromSheet } from "./api.js";
import { renderProducts, generateDynamicCategories, openProductModal, changeSlide } from "./render.js";
import { addToCart, updateQuantity, removeFromCart, renderCartModal, sendCartToWhatsApp } from "./cart.js";
import { parseOrderFromUrl, renderInvoiceView } from "./invoice.js";

let productsData = [];
let selectedCategory = "all";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Catálogo e interfaz inicializados.");

  // Detectar y procesar si la URL contiene una cotización
  const orderData = parseOrderFromUrl();
  if (orderData) {
    renderInvoiceView(orderData);
  }

  loadProductsFromSheet((data) => {
    productsData = data;
    generateDynamicCategories(productsData);
    renderProducts(productsData);
    setupFilterEvents();
  });

  setupViewToggle();
  setupModalEvents();
  setupCartEvents();
  setupNavigation();
});


// ==========================================================================
// DETECCIÓN Y RENDERIZADO DE COTIZACIÓN DESDE URL (?orden=ORD-XXXX)
// ==========================================================================
function checkOrderUrlParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orden");
  const encodedData = urlParams.get("data");

  if (!orderId) return;

  let orderData = null;

  // Si trae data en la URL (funciona en cualquier dispositivo)
  if (encodedData) {
    try {
      orderData = JSON.parse(atob(decodeURIComponent(encodedData)));
    } catch (e) {
      console.error("Error al decodificar la orden de la URL", e);
    }
  } 

  // Fallback a localStorage si existiera localmente
  if (!orderData) {
    const savedOrder = localStorage.getItem(orderId);
    if (savedOrder) orderData = JSON.parse(savedOrder);
  }

  if (orderData) {
    renderCotizacionView(orderData);
  }
}

function renderCotizacionView(order) {
  const views = document.querySelectorAll(".app-view");
  const cotizacionView = document.getElementById("view-cotizacion");

  if (!cotizacionView) return;

  // Cambiar visibilidad de las vistas SPA
  views.forEach((view) => {
    if (view.id === "view-cotizacion") {
      view.classList.remove("hidden");
      view.classList.add("active");
    } else {
      view.classList.add("hidden");
      view.classList.remove("active");
    }
  });

  // Inyectar datos en la factura
  const invoiceId = document.getElementById("invoice-id");
  const invoiceDate = document.getElementById("invoice-date");
  const invoiceBody = document.getElementById("invoice-items-body");
  const invoiceTotal = document.getElementById("invoice-total-amount");

  if (invoiceId) invoiceId.innerText = order.id;
  if (invoiceDate) invoiceDate.innerText = order.date;

  const formatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  if (invoiceBody) {
    invoiceBody.innerHTML = order.items
      .map(
        (item) => `
        <tr>
          <td>${item.quantity}</td>
          <td>${item.nombre} (${item.variante})</td>
          <td>${formatter.format(item.precio)}</td>
          <td>${formatter.format(item.subtotal)}</td>
        </tr>
      `
      )
      .join("");
  }

  if (invoiceTotal) {
    invoiceTotal.innerText = formatter.format(order.total);
  }
}

// ==========================================================================
// NAVEGACIÓN VISTAS SPA (Catálogo / Empresa / Contacto)
// ==========================================================================
function setupNavigation() {
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  const views = document.querySelectorAll(".app-view");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      const targetId = item.getAttribute("data-target");

      // Cambiar clase activa en ítems de navegación
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Ocultar/Mostrar la vista correspondiente
      views.forEach((view) => {
        if (view.id === targetId) {
          view.classList.remove("hidden");
          view.classList.add("active");
        } else {
          view.classList.add("hidden");
          view.classList.remove("active");
        }
      });

      // Si el usuario cambia de pestaña, hacer scroll al inicio de la pantalla
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ==========================================================================
// FILTROS Y BÚSQUEDA EN TIEMPO REAL
// ==========================================================================
function setupFilterEvents() {
  const searchInput = document.getElementById("search-input");
  const selectCategory = document.getElementById("select-category");
  const sortBy = document.getElementById("sort-by");
  const categoryListItems = document.querySelectorAll("#category-list li");
  const availabilityCheckboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');

  const applyFilters = () => {
    let filtered = [...productsData];

    // Búsqueda por Texto
    const query = searchInput?.value.toLowerCase().trim() || "";
    if (query) {
      filtered = filtered.filter(
        (p) => p.nombre.toLowerCase().includes(query) || p.descripcion.toLowerCase().includes(query)
      );
    }

    // Filtrado por Categoría
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.categoria === selectedCategory);
    }

    // Filtrado por Disponibilidad
    if (availabilityCheckboxes.length >= 2) {
      const showAvailable = availabilityCheckboxes[0].checked;
      const showUnavailable = availabilityCheckboxes[1].checked;

      filtered = filtered.filter((p) => {
        if (p.disponible && showAvailable) return true;
        if (!p.disponible && showUnavailable) return true;
        return false;
      });
    }

    // Ordenamiento
    const sortVal = sortBy?.value;
    if (sortVal === "name-asc") filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sortVal === "name-desc") filtered.sort((a, b) => b.nombre.localeCompare(a.nombre));
    if (sortVal === "price-asc") filtered.sort((a, b) => a.precio - b.precio);
    if (sortVal === "price-desc") filtered.sort((a, b) => b.precio - a.precio);

    renderProducts(filtered);
  };

  categoryListItems.forEach((li) => {
    li.addEventListener("click", () => {
      categoryListItems.forEach((item) => item.classList.remove("active"));
      li.classList.add("active");

      selectedCategory = li.dataset.category || "all";
      if (selectCategory) selectCategory.value = selectedCategory;

      applyFilters();
    });
  });

  selectCategory?.addEventListener("change", (e) => {
    selectedCategory = e.target.value;

    categoryListItems.forEach((li) => {
      const cat = li.dataset.category || "all";
      li.classList.toggle("active", cat === selectedCategory);
    });

    applyFilters();
  });

  searchInput?.addEventListener("input", applyFilters);
  sortBy?.addEventListener("change", applyFilters);
  availabilityCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));
}

// ==========================================================================
// CARRITO DE COMPRAS
// ==========================================================================
function setupCartEvents() {
  const container = document.getElementById("products-container");
  const modalAddBtn = document.getElementById("modal-add-btn");
  const btnCartMobile = document.getElementById("btn-cart-mobile");
  const btnWhatsappMobile = document.querySelector(".btn-whatsapp-cart");
  const btnCartDesktop = document.getElementById("btn-cart-desktop");
  const cartModal = document.getElementById("cart-modal");
  const btnCloseCart = document.getElementById("btn-close-cart-modal");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const btnConfirmWhatsapp = document.getElementById("btn-confirm-whatsapp");

  // Agregar desde tarjeta en la grilla
  container?.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="add-cart"]');
    if (!btn) return;

    const card = btn.closest(".product-card");
    if (!card) return;

    const product = productsData.find((p) => p.id === card.dataset.id);
    addToCart(product);
  });

  // Agregar desde modal detalle del producto
  modalAddBtn?.addEventListener("click", () => {
    const productId = modalAddBtn.dataset.id;
    const product = productsData.find((p) => p.id === productId);
    if (product) {
      addToCart(product);
      document.getElementById("product-modal")?.classList.remove("active");
    }
  });

  // Abrir y Cerrar Modal del Carrito
  const openCart = () => {
    renderCartModal();
    cartModal?.classList.add("active");
  };

  btnCartMobile?.addEventListener("click", openCart);
  btnWhatsappMobile?.addEventListener("click", openCart);
  btnCartDesktop?.addEventListener("click", openCart);
  btnCloseCart?.addEventListener("click", () => cartModal?.classList.remove("active"));
  cartModal?.addEventListener("click", (e) => {
    if (e.target === cartModal) cartModal.classList.remove("active");
  });

  // Controles de cantidad (+/-) e ítem individual dentro del modal
  cartItemsContainer?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cart-action]");
    if (!btn) return;

    e.stopPropagation();
    const id = String(btn.dataset.id);
    const action = btn.dataset.cartAction;

    if (action === "increase") updateQuantity(id, 1);
    if (action === "decrease") updateQuantity(id, -1);
    if (action === "remove") removeFromCart(id);
  });

  btnConfirmWhatsapp?.addEventListener("click", sendCartToWhatsApp);
}

// ==========================================================================
// MODAL DE DETALLE DEL PRODUCTO
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

// ==========================================================================
// CONMUTACIÓN DE VISTA (CUADRÍCULA / LISTA)
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