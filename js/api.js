// ==========================================================================
// CARGA DE DATOS DESDE GOOGLE SHEETS (CSV)
// ==========================================================================

export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSaTj12PhheXARdsYg3DggvqxhmGQ3MTJHpYsirLxbY3ppt_NOHtG9524MN8FQc-iaY6MNZASl_hQcW/pub?output=csv";

export function loadProductsFromSheet(onSuccess) {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("TU_ENLACE")) {
    console.warn("Por favor agrega una URL válida de Google Sheets CSV.");
    return;
  }

  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const productsData = results.data.map((item) => ({
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

        // --- NUEVOS CAMPOS DE OPCIONES (PRESENTACIONES Y FRAGANCIAS) ---
        variantes: item.variantes
          ? item.variantes.split(",").map((v) => v.trim()).filter(Boolean)
          : [],
        tipos: item.tipos
          ? item.tipos.split(",").map((t) => t.trim()).filter(Boolean)
          : []
      }));

      onSuccess(productsData);
    },
    error: (err) => console.error("Error al cargar Google Sheets:", err),
  });
}