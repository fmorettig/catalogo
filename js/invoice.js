// ==========================================================================
// MÓDULO DE COTIZACIÓN / FACTURA E IMPRESIÓN
// ==========================================================================

// Configuración general del formato (Ajusta aquí logos y datos)
export const INVOICE_CONFIG = {
  companyName: "NOMBRE DE LA EMPRESA",
  rif: "J-00000000-0",
  phone: "+58 414-0000000",
  address: "Barquisimeto / Cabudare, Lara",
  logoUrl: "assets/images/logo-empresa.png", // Asegúrate de tener esta ruta o cámbiala
  currencyLocale: "es-CO",
  currencyCode: "COP",
};

/**
 * Decodifica la orden recibida desde los parámetros URL (Base64)
 */
export function parseOrderFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orden");
  const encodedData = urlParams.get("data");

  if (!orderId) return null;

  if (encodedData) {
    try {
      return JSON.parse(atob(decodeURIComponent(encodedData)));
    } catch (e) {
      console.error("Error al decodificar los datos de la orden:", e);
    }
  }

  // Fallback por si la orden está en localStorage local
  const savedOrder = localStorage.getItem(orderId);
  return savedOrder ? JSON.parse(savedOrder) : null;
}

/**
 * Renderiza la vista de cotización inyectando los datos del objeto Order
 */
export function renderInvoiceView(order) {
  if (!order) return;

  const views = document.querySelectorAll(".app-view");
  const cotizacionView = document.getElementById("view-cotizacion");

  if (!cotizacionView) return;

  // 1. Mostrar únicamente la vista de cotización
  views.forEach((view) => {
    if (view.id === "view-cotizacion") {
      view.classList.remove("hidden");
      view.classList.add("active");
    } else {
      view.classList.add("hidden");
      view.classList.remove("active");
    }
  });

  // 2. Inyectar Datos de la Configuración de la Empresa
  const storeNameEl = document.getElementById("invoice-store-name");
  const storePhoneEl = document.getElementById("invoice-store-phone");
  const storeLogoEl = document.getElementById("invoice-logo");

  if (storeNameEl) storeNameEl.innerText = INVOICE_CONFIG.companyName;
  if (storePhoneEl) storePhoneEl.innerText = `Contacto: ${INVOICE_CONFIG.phone}`;
  if (storeLogoEl && INVOICE_CONFIG.logoUrl) {
    storeLogoEl.src = INVOICE_CONFIG.logoUrl;
  }

  // 3. Inyectar Metadatos del Pedido
  const invoiceId = document.getElementById("invoice-id");
  const invoiceDate = document.getElementById("invoice-date");
  const invoiceBody = document.getElementById("invoice-items-body");
  const invoiceTotal = document.getElementById("invoice-total-amount");

  if (invoiceId) invoiceId.innerText = order.id;
  if (invoiceDate) invoiceDate.innerText = order.date;

  const formatter = new Intl.NumberFormat(INVOICE_CONFIG.currencyLocale, {
    style: "currency",
    currency: INVOICE_CONFIG.currencyCode,
    maximumFractionDigits: 0,
  });

  // 4. Inyectar Filas de Productos
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

  // 5. Vincular/Inicializar eventos del botón de impresión
  setupPrintButton();
}

/**
 * Asigna el evento click al botón de impresión de forma limpia
 */
function setupPrintButton() {
  const btnPrint = document.getElementById("btn-print-invoice");
  if (btnPrint) {
    // Se elimina listener previo si existiera y se vincula la acción
    btnPrint.onclick = () => {
      window.print();
    };
  }
}