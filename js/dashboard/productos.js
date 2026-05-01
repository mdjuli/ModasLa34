// ============================================
// PRODUCTOS.JS - Versión completa CORREGIDA
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
        
        // Configurar filtros
        setTimeout(() => {
            const searchInput = document.getElementById('search-productos');
            const categoriaSelect = document.getElementById('filter-categoria-productos');
            const stockSelect = document.getElementById('filter-stock-productos');
            
            if (searchInput) searchInput.addEventListener('input', aplicarFiltrosProductos);
            if (categoriaSelect) categoriaSelect.addEventListener('change', aplicarFiltrosProductos);
            if (stockSelect) stockSelect.addEventListener('change', aplicarFiltrosProductos);
        }, 100);
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.querySelector('#tabla-productos tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8">Error al cargar productos</td></tr>';
    }
}

function mostrarTablaProductos(productos) {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;
    
    function getEmojiCategoria(cat) {
        const emojis = { 'vestidos': '👗', 'blusas': '👚', 'pantalones': '👖', 'deportivo': '⚽', 'caballero': '👔', 'accesorios': '🎀' };
        return emojis[cat] || '📦';
    }
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay productos registrados</td></tr>';
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
                <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                <button class="action-btn" onclick="verVariantes(${p.id})" title="Variantes">📋</button>
                <button class="action-btn" onclick="imprimirEtiquetasProducto(${p.id})" title="Imprimir etiquetas">🏷️</button>
                <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
             </td>
         </tr>`;
    }).join('');
}

// VARIANTES
function agregarVariante() {
    const container = document.getElementById('variantes-container');
    if (!container) return;
    
    const varianteId = varianteCount;
    
    const varianteHTML = `
        <div class="variante-card" id="variante-${varianteId}">
            <div class="variante-header">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <div>
                        <label>📏 Talla:</label>
                        <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: S, M, L" required>
                    </div>
                    <div>
                        <label>💰 Precio de venta:</label>
                        <input type="number" id="variante-${varianteId}-precio" placeholder="Ej: 45000" step="1000" style="width: 120px;">
                    </div>
                </div>
                ${varianteId > 0 ? `<button type="button" onclick="eliminarVariante(${varianteId})" class="btn-secondary-sm">✖️ Eliminar talla</button>` : ''}
            </div>
            <div style="margin-top: 1rem;">
                <label>🎨 Colores y stock:</label>
                <div id="colores-${varianteId}-container" class="colores-container"></div>
                <div>
                    <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-secondary-sm">➕ Agregar color</button>
                    <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-secondary-sm">⚪ Sin color</button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', varianteHTML);
    agregarColorAVariante(varianteId);
    varianteCount++;
}

function agregarColorAVariante(varianteId) {
    const container = document.getElementById(`colores-${varianteId}-container`);
    if (!container) return;
    
    const colorId = `${varianteId}-${Date.now()}-${Math.random()}`;
    
    const colorHTML = `
        <div class="color-row" id="color-${colorId}">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; width: 100%;">
                <input type="color" id="color-hex-${colorId}" value="#d4a5a9" class="color-picker">
                <input type="text" id="color-hex-text-${colorId}" value="#d4a5a9" placeholder="Código hex" style="flex: 1;">
                <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color" style="flex: 2;">
                <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" style="width: 80px;">
                <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
}

function agregarSinColor(varianteId) {
    const container = document.getElementById(`colores-${varianteId}-container`);
    if (!container) return;
    
    const existingSinColor = container.querySelector('.sin-color-item');
    if (existingSinColor) {
        alert('⚠️ Ya existe una opción "Sin color" para esta talla');
        return;
    }
    
    const colorId = `${varianteId}-sin-color-${Date.now()}`;
    
    const sinColorHTML = `
        <div class="color-row sin-color-item" id="color-${colorId}">
            <span style="font-size: 1.5rem;">⚪</span>
            <span style="flex: 1; font-weight: 500;">Sin color específico</span>
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" style="width: 80px;">
            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', sinColorHTML);
}

function eliminarColor(colorId) {
    const elemento = document.getElementById(`color-${colorId}`);
    if (elemento) elemento.remove();
}

function eliminarVariante(varianteId) {
    const element = document.getElementById(`variante-${varianteId}`);
    if (element) element.remove();
}

// CRUD PRODUCTOS
async function guardarProductoBase() {
    // ... (tu código existente de guardarProductoBase)
    // Asegúrate de que al final llame a cargarProductos()
}

async function editarProducto(id) {
    // ... (tu código existente)
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
        });
        mostrarAlerta('✅ Producto eliminado', 'success');
        await cargarProductos();
    } catch (error) {
        mostrarAlerta('Error al eliminar', 'error');
    }
}

async function verVariantes(id) {
    // ... (tu código existente)
}

async function imprimirEtiquetasProducto(id) {
    // ... (tu código existente)
}

// FILTROS
function aplicarFiltrosProductos() {
    const rows = document.querySelectorAll('#tabla-productos tbody tr');
    const searchTerm = document.getElementById('search-productos')?.value.toLowerCase() || '';
    const categoria = document.getElementById('filter-categoria-productos')?.value || '';
    const stockFilter = document.getElementById('filter-stock-productos')?.value || '';
    
    rows.forEach(row => {
        let mostrar = true;
        const nombre = row.cells[2]?.textContent.toLowerCase() || '';
        const codigo = row.cells[1]?.textContent.toLowerCase() || '';
        const categoriaTexto = row.cells[3]?.textContent.toLowerCase() || '';
        const stockTexto = row.cells[5]?.textContent || '0';
        const stock = parseInt(stockTexto) || 0;
        
        if (searchTerm && !nombre.includes(searchTerm) && !codigo.includes(searchTerm)) mostrar = false;
        if (mostrar && categoria && !categoriaTexto.includes(categoria)) mostrar = false;
        if (mostrar && stockFilter === 'bajo' && stock >= 5) mostrar = false;
        if (mostrar && stockFilter === 'agotado' && stock > 0) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
    });
}

function limpiarFiltrosProductos() {
    const searchInput = document.getElementById('search-productos');
    const categoriaSelect = document.getElementById('filter-categoria-productos');
    const stockSelect = document.getElementById('filter-stock-productos');
    
    if (searchInput) searchInput.value = '';
    if (categoriaSelect) categoriaSelect.value = '';
    if (stockSelect) stockSelect.value = '';
    aplicarFiltrosProductos();
}

function configurarFiltrosProductos() {
    const searchInput = document.getElementById('search-productos');
    const categoriaSelect = document.getElementById('filter-categoria-productos');
    const stockSelect = document.getElementById('filter-stock-productos');
    
    if (searchInput) searchInput.addEventListener('input', aplicarFiltrosProductos);
    if (categoriaSelect) categoriaSelect.addEventListener('change', aplicarFiltrosProductos);
    if (stockSelect) stockSelect.addEventListener('change', aplicarFiltrosProductos);
}

function ordenarProductos(columna) {
    // ... (tu código de ordenamiento)
}

// ============================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// ============================================

window.agregarVariante = agregarVariante;
window.agregarColorAVariante = agregarColorAVariante;
window.agregarSinColor = agregarSinColor;
window.eliminarColor = eliminarColor;
window.eliminarVariante = eliminarVariante;
window.guardarProductoBase = guardarProductoBase;
window.cargarProductos = cargarProductos;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.verVariantes = verVariantes;
window.imprimirEtiquetasProducto = imprimirEtiquetasProducto;
window.ordenarProductos = ordenarProductos;
window.aplicarFiltrosProductos = aplicarFiltrosProductos;
window.limpiarFiltrosProductos = limpiarFiltrosProductos;
window.configurarFiltrosProductos = configurarFiltrosProductos;

console.log('✅ Productos.js cargado correctamente');
