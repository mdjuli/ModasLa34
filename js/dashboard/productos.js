// ============================================
// PRODUCTOS.JS - Gestión de producto
// ============================================

let productosData = [];
let varianteCount = 0;

async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        productosData = await response.json();
        
        mostrarTablaProductos(productosData);
        setTimeout(() => configurarFiltrosProductos(), 100);
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarTablaProductos(productos) {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = productos.map(p => {
        const variantes = p.variantes || [];
        const totalStock = variantes.reduce((sum, v) => sum + (v.stock_total || 0), 0);
        const precios = variantes.map(v => v.precio_venta || 0);
        const precioMin = Math.min(...precios);
        const precioMax = Math.max(...precios);
        const precioTexto = precioMin === precioMax ? `$${precioMin.toLocaleString()}` : `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
        
        return `<tr>
            <td>${p.imagen_url ? `<img src="${p.imagen_url}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">` : `<div style="width:50px;height:50px;background:#f5ede8;border-radius:10px;display:flex;align-items:center;justify-content:center;">${getEmojiCategoria(p.categoria)}</div>`}</td>
            <td>${p.codigo || '-'}</td>
            <td><strong>${p.nombre}</strong></td>
            <td><span style="background:#f5ede8;padding:0.2rem 0.8rem;border-radius:50px;">${p.categoria || '-'}</span></td>
            <td>${variantes.length} tallas</td>
            <td>${totalStock}</td>
            <td>${precioTexto}</td>
            <td>
                <button class="action-btn" onclick="editarProducto(${p.id})">✏️</button>
                <button class="action-btn" onclick="verVariantes(${p.id})">📋</button>
                <button class="action-btn" onclick="imprimirEtiquetasProducto(${p.id})">🏷️</button>
                <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

// Funciones de variantes (agregarVariante, agregarColorAVariante, etc.)
// ... (mantener las funciones existentes)

async function guardarProductoBase() {
    // ... código existente
}

async function editarProducto(id) { /* ... */ }
async function eliminarProducto(id) { /* ... */ }
async function verVariantes(id) { /* ... */ }
async function imprimirEtiquetasProducto(id) { /* ... */ }

function configurarFiltrosProductos() { /* ... */ }
function aplicarFiltrosProductos() { /* ... */ }
function limpiarFiltrosProductos() { /* ... */ }
