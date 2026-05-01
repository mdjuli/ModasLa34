// ============================================
// PRODUCTOS.JS - Versión COMPLETA y FUNCIONAL
// ============================================

let productosData = [];
let varianteCount = 0;

// ============================================
// VARIABLES GLOBALES
// ============================================

async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        productosData = await response.json();
        
        mostrarTablaProductos(productosData);
        
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

// ============================================
// FUNCIONES DE VARIANTES
// ============================================

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
                        <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: S, M, L, 6, 8..." required>
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
                <input type="color" id="color-hex-${colorId}" value="#d4a5a9" class="color-picker" style="width: 40px; height: 40px;">
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

function getVariantesFromForm() {
    const variantes = [];
    const precioCompraGlobal = document.getElementById('producto-precio-compra')?.value || 0;
    const precioVentaGeneral = document.getElementById('producto-precio-venta-general')?.value || 0;
    
    for (let i = 0; i < varianteCount; i++) {
        const tallaInput = document.getElementById(`variante-${i}-talla`);
        let precioInput = document.getElementById(`variante-${i}-precio`);
        
        if (!tallaInput || !tallaInput.value.trim()) continue;
        
        const talla = tallaInput.value.trim();
        let precioVenta = parseFloat(precioInput?.value) || 0;
        
        if (precioVenta === 0 && precioVentaGeneral > 0) {
            precioVenta = precioVentaGeneral;
            if (precioInput) precioInput.value = precioVentaGeneral;
        }
        
        const precioCompra = parseFloat(precioCompraGlobal) || 0;
        
        if (precioVenta === 0) {
            mostrarAlerta(`⚠️ La talla ${talla} no tiene precio asignado`, 'error');
            return [];
        }
        
        const colores = [];
        const coloresContainer = document.getElementById(`colores-${i}-container`);
        
        if (coloresContainer) {
            const colorRows = coloresContainer.querySelectorAll('.color-row');
            
            colorRows.forEach(row => {
                const colorId = row.id.replace('color-', '');
                
                if (row.classList.contains('sin-color-item')) {
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    const stock = parseInt(stockInput?.value) || 0;
                    if (stock > 0) {
                        colores.push({ nombre: null, codigo: null, stock: stock });
                    }
                } else {
                    const nombreInput = document.getElementById(`color-nombre-${colorId}`);
                    const hexTextInput = document.getElementById(`color-hex-text-${colorId}`);
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    
                    let hexValue = hexTextInput?.value || '#d4a5a9';
                    if (!hexValue.startsWith('#')) hexValue = '#' + hexValue;
                    
                    if (nombreInput && nombreInput.value.trim()) {
                        colores.push({
                            nombre: nombreInput.value.trim(),
                            codigo: hexValue,
                            stock: parseInt(stockInput?.value) || 0
                        });
                    }
                }
            });
        }
        
        if (colores.length === 0) {
            colores.push({ nombre: 'Sin color', codigo: '#d4a5a9', stock: 0 });
        }
        
        const stockTotal = colores.reduce((sum, c) => sum + c.stock, 0);
        
        variantes.push({
            talla: talla,
            precio_venta: precioVenta,
            precio_compra: precioCompra,
            colores: colores,
            stock_total: stockTotal
        });
    }
    
    return variantes;
}

// ============================================
// GUARDAR PRODUCTO BASE (COMPLETO)
// ============================================

async function guardarProductoBase() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const codigo = document.getElementById('producto-codigo')?.value;
        const nombre = document.getElementById('producto-nombre')?.value;
        const categoria = document.getElementById('producto-categoria')?.value;
        
        if (!codigo || !nombre || !categoria) {
            mostrarAlerta('Código, nombre y categoría son obligatorios', 'error');
            return;
        }
        
        const variantes = getVariantesFromForm();
        if (variantes.length === 0) {
            mostrarAlerta('Debe agregar al menos una talla con precio', 'error');
            return;
        }
        
        for (const v of variantes) {
            if (v.precio_venta === 0) {
                mostrarAlerta(`La talla ${v.talla} no tiene precio asignado`, 'error');
                return;
            }
        }
        
        const editId = document.getElementById('form-producto').dataset.editId;
        let productoId;
        
        if (editId) {
            productoId = parseInt(editId);
            
            const productoBase = {
                codigo: codigo,
                nombre: nombre,
                categoria: categoria,
                imagen_url: document.getElementById('producto-imagen')?.value || null
            };
            
            await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productoBase)
            });
            
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`
                }
            });
            
        } else {
            const productoBase = {
                codigo: codigo,
                nombre: nombre,
                categoria: categoria,
                imagen_url: document.getElementById('producto-imagen')?.value || null
            };
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(productoBase)
            });
            
            const productoGuardado = await response.json();
            productoId = productoGuardado[0].id;
        }
        
        let variantesGuardadas = 0;
        
        for (const variante of variantes) {
            const skuFinal = `${codigo}-${variante.talla}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            
            const varianteData = {
                producto_id: productoId,
                talla: variante.talla,
                colores: variante.colores,
                stock_total: variante.stock_total,
                precio_venta: variante.precio_venta,
                precio_compra: variante.precio_compra,
                sku: skuFinal
            };
            
            const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(varianteData)
            });
            
            if (varResponse.ok) variantesGuardadas++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        mostrarAlerta(`🌸 Producto ${editId ? 'actualizado' : 'guardado'} con ${variantesGuardadas} variantes`, 'success');
        
        cerrarFormulario('producto');
        await cargarProductos();
        
        document.getElementById('producto-codigo').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-categoria').value = '';
        document.getElementById('producto-imagen').value = '';
        document.getElementById('producto-precio-compra').value = '';
        document.getElementById('producto-precio-venta-general').value = '';
        document.getElementById('variantes-container').innerHTML = '';
        varianteCount = 0;
        agregarVariante();
        
        delete document.getElementById('form-producto').dataset.editId;
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Guardar Producto';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// ============================================
// CRUD PRODUCTOS (EDITAR, ELIMINAR, VER)
// ============================================

async function editarProducto(id) {
    console.log('✏️ Editando producto:', id);
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        const producto = productos[0];
        
        const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await varResponse.json();
        
        mostrarFormulario('producto');
        document.getElementById('form-producto').dataset.editId = id;
        
        document.getElementById('producto-codigo').value = producto.codigo || '';
        document.getElementById('producto-nombre').value = producto.nombre || '';
        document.getElementById('producto-categoria').value = producto.categoria || '';
        document.getElementById('producto-imagen').value = producto.imagen_url || '';
        
        if (variantes.length > 0 && variantes[0].precio_compra) {
            document.getElementById('producto-precio-compra').value = variantes[0].precio_compra;
        }
        
        const container = document.getElementById('variantes-container');
        if (container) {
            container.innerHTML = '';
            varianteCount = 0;
            
            if (variantes.length === 0) {
                agregarVariante();
            } else {
                variantes.forEach(v => {
                    const varianteId = varianteCount;
                    const varianteHTML = `
                        <div class="variante-card" id="variante-${varianteId}">
                            <div class="variante-header">
                                <div style="display: flex; gap: 1rem;">
                                    <div><label>📏 Talla:</label><input type="text" id="variante-${varianteId}-talla" value="${v.talla}" required></div>
                                    <div><label>💰 Precio:</label><input type="number" id="variante-${varianteId}-precio" value="${v.precio_venta}" style="width:120px;"></div>
                                </div>
                                <button type="button" onclick="eliminarVariante(${varianteId})" class="btn-secondary-sm">✖️</button>
                            </div>
                            <div><label>🎨 Colores:</label><div id="colores-${varianteId}-container"></div>
                            <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-secondary-sm">+ Color</button>
                            <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-secondary-sm">⚪ Sin color</button></div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', varianteHTML);
                    
                    const coloresContainer = document.getElementById(`colores-${varianteId}-container`);
                    const colores = v.colores || [];
                    
                    colores.forEach(color => {
                        const colorId = `${varianteId}-${Date.now()}-${Math.random()}`;
                        let colorHTML = '';
                        if (color.nombre === null && color.codigo === null) {
                            colorHTML = `<div class="color-row" id="color-${colorId}"><span>⚪</span><span>Sin color</span><input type="number" id="color-stock-${colorId}" value="${color.stock}" style="width:80px;"><button onclick="eliminarColor('${colorId}')">🗑️</button></div>`;
                        } else {
                            colorHTML = `<div class="color-row" id="color-${colorId}"><input type="color" id="color-hex-${colorId}" value="${color.codigo || '#d4a5a9'}"><input type="text" id="color-nombre-${colorId}" value="${color.nombre || ''}"><input type="number" id="color-stock-${colorId}" value="${color.stock}" style="width:80px;"><button onclick="eliminarColor('${colorId}')">🗑️</button></div>`;
                        }
                        coloresContainer.insertAdjacentHTML('beforeend', colorHTML);
                    });
                    
                    varianteCount++;
                });
            }
        }
        
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Producto';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el producto', 'error');
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto? También se eliminarán todas sus variantes.')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
        });
        mostrarAlerta('✅ Producto eliminado', 'success');
        await cargarProductos();
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar', 'error');
    }
}

async function verVariantes(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const data = await response.json();
        if (data.length === 0) return;
        
        const producto = data[0];
        const variantes = producto.variantes || [];
        
        let mensaje = `📋 PRODUCTO: ${producto.nombre}\n`;
        mensaje += `═══════════════════════════════════\n\n`;
        
        variantes.forEach(v => {
            mensaje += `📏 TALLA: ${v.talla}\n`;
            mensaje += `💰 PRECIO: $${(v.precio_venta || 0).toLocaleString()}\n`;
            mensaje += `💰 COMPRA: $${(v.precio_compra || 0).toLocaleString()}\n`;
            mensaje += `🔢 SKU: ${v.sku || 'N/A'}\n`;
            
            const colores = v.colores || [];
            if (colores.length > 0) {
                mensaje += `🎨 COLORES:\n`;
                colores.forEach(c => {
                    mensaje += `   • ${c.nombre || 'Sin color'}: ${c.stock || 0} unidades\n`;
                });
            }
            mensaje += `\n`;
        });
        
        alert(mensaje);
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar variantes', 'error');
    }
}

En imprimir etiquetas todavia falta un codigo de barras y ademas que se pueda editar cuantas etiquetas hacer una hoja (Como 5 por columna y cuatro por fila y asi)

// ============================================
// FILTROS
// ============================================

function aplicarFiltrosProductos() {
    const rows = document.querySelectorAll('#tabla-productos tbody tr');
    const searchTerm = document.getElementById('search-productos')?.value.toLowerCase() || '';
    const categoria = document.getElementById('filter-categoria-productos')?.value || '';
    const stockFilter = document.getElementById('filter-stock-productos')?.value || '';
    
    let visibleCount = 0;
    
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
        if (mostrar) visibleCount++;
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
    if (sortProductosColumn === columna) {
        sortProductosDirection = sortProductosDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortProductosColumn = columna;
        sortProductosDirection = 'asc';
    }
    
    const productosOrdenados = [...productosData];
    
    productosOrdenados.sort((a, b) => {
        let valA, valB;
        switch(columna) {
            case 'codigo': valA = (a.codigo || '').toLowerCase(); valB = (b.codigo || '').toLowerCase(); break;
            case 'nombre': valA = (a.nombre || '').toLowerCase(); valB = (b.nombre || '').toLowerCase(); break;
            case 'categoria': valA = (a.categoria || '').toLowerCase(); valB = (b.categoria || '').toLowerCase(); break;
            case 'stock': valA = a.stock_total || 0; valB = b.stock_total || 0; break;
            case 'precio': 
                const preciosA = a.variantes?.map(v => v.precio_venta) || [0];
                const preciosB = b.variantes?.map(v => v.precio_venta) || [0];
                valA = Math.min(...preciosA); valB = Math.min(...preciosB); break;
            default: valA = a.nombre; valB = b.nombre;
        }
        if (valA < valB) return sortProductosDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortProductosDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    mostrarTablaProductos(productosOrdenados);
}

// ============================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// ============================================

window.agregarVariante = agregarVariante;
window.agregarColorAVariante = agregarColorAVariante;
window.agregarSinColor = agregarSinColor;
window.eliminarColor = eliminarColor;
window.eliminarVariante = eliminarVariante;
window.getVariantesFromForm = getVariantesFromForm;
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
console.log('📦 Funciones disponibles:', {
    agregarVariante: typeof agregarVariante,
    guardarProductoBase: typeof guardarProductoBase,
    cargarProductos: typeof cargarProductos,
    editarProducto: typeof editarProducto,
    eliminarProducto: typeof eliminarProducto,
    verVariantes: typeof verVariantes,
    imprimirEtiquetasProducto: typeof imprimirEtiquetasProducto
});
