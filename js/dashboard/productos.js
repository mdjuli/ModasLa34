// ============================================
// PRODUCTOS.JS - COMPLETO Y FUNCIONAL
// ============================================

let productosData = [];
let varianteCount = 0;
let sortProductosColumn = 'nombre';
let sortProductosDirection = 'asc';

// Configuración de etiquetas
let configuracionEtiquetas = {
    columnas: 2,
    filas: 4,
    mostrarPrecio: true,
    mostrarBarcode: true,
    margen: 10,
    tamanoFuente: 12
};

// ============================================
// CARGAR PRODUCTOS
// ============================================

async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        productosData = await response.json();
        
        ordenarProductos('nombre');
        
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

function getEmojiCategoria(cat) {
    const emojis = { 'vestidos': '👗', 'blusas': '👚', 'pantalones': '👖', 'deportivo': '⚽', 'caballero': '👔', 'accesorios': '🎀' };
    return emojis[cat] || '📦';
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
    
    const colorId = `${varianteId}-color-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const colorHTML = `
        <div class="color-row" id="color-${colorId}" data-color-id="${colorId}">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; width: 100%;">
                <input type="color" id="color-hex-${colorId}" value="#d4a5a9" class="color-picker" 
                       style="width: 45px; height: 40px; border-radius: 8px; cursor: pointer;"
                       onchange="actualizarHexTexto('${colorId}')">
                <input type="text" id="color-hex-text-${colorId}" value="#d4a5a9" 
                       placeholder="#RRGGBB" class="color-hex-text" 
                       style="flex: 1; min-width: 100px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;"
                       oninput="validarHexColor('${colorId}', this.value)">
                <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color (ej: Rojo, Azul)" 
                       class="color-nombre-input" 
                       style="flex: 2; min-width: 120px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;">
                <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" 
                       class="color-stock-input" style="width: 80px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;">
                <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color" 
                        style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1.2rem;">
                    🗑️
                </button>
            </div>
            <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px; padding-left: 5px;">
                💡 Puedes escribir el código hexadecimal manualmente (ej: #ff0000 para rojo)
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
        <div class="color-row sin-color-item" id="color-${colorId}" data-color-id="${colorId}">
            <span style="font-size: 1.5rem;">⚪</span>
            <span style="flex: 1; font-weight: 500;">Sin color específico</span>
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" 
                   class="color-stock-input" style="width: 80px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;">
            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color" 
                    style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1.2rem;">
                🗑️
            </button>
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

// Actualizar el texto hexadecimal cuando se cambia el color picker
function actualizarHexTexto(colorId) {
    const colorPicker = document.getElementById(`color-hex-${colorId}`);
    const hexText = document.getElementById(`color-hex-text-${colorId}`);
    if (colorPicker && hexText) {
        hexText.value = colorPicker.value.toUpperCase();
    }
}

// Validar y corregir código hexadecimal
function validarHexColor(colorId, valor) {
    const hexText = document.getElementById(`color-hex-text-${colorId}`);
    const colorPicker = document.getElementById(`color-hex-${colorId}`);
    
    let hex = valor.trim();
    
    // Agregar # si no tiene
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    
    // Validar formato hexadecimal (6 caracteres después de #)
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (hexPattern.test(hex)) {
        // Si es formato corto (3 dígitos), convertirlo a 6
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        hexText.value = hex.toUpperCase();
        if (colorPicker) colorPicker.value = hex;
        hexText.style.borderColor = "#27ae60";
        hexText.style.backgroundColor = "#e8f5e9";
    } else if (hex === '#') {
        hexText.value = '#';
        hexText.style.borderColor = "#f0e4d8";
        hexText.style.backgroundColor = "white";
    } else {
        hexText.style.borderColor = "#e74c3c";
        hexText.style.backgroundColor = "#ffebee";
    }
}

// Obtener todos los colores del formulario correctamente
function obtenerColoresFromForm(varianteId) {
    const colores = [];
    const container = document.getElementById(`colores-${varianteId}-container`);
    if (!container) return colores;
    
    const colorRows = container.querySelectorAll('.color-row');
    
    colorRows.forEach(row => {
        const colorId = row.id.replace('color-', '');
        
        // Para "sin color"
        if (row.classList.contains('sin-color-item')) {
            const stockInput = document.getElementById(`color-stock-${colorId}`);
            const stock = parseInt(stockInput?.value) || 0;
            if (stock > 0) {
                colores.push({
                    nombre: null,
                    codigo: null,
                    stock: stock
                });
            }
        } else {
            // Para colores con nombre y código hexadecimal
            const nombreInput = document.getElementById(`color-nombre-${colorId}`);
            const hexTextInput = document.getElementById(`color-hex-text-${colorId}`);
            const colorPicker = document.getElementById(`color-hex-${colorId}`);
            const stockInput = document.getElementById(`color-stock-${colorId}`);
            
            // Obtener el valor hexadecimal (priorizar el texto si es válido)
            let hexValue = '#d4a5a9';
            
            if (hexTextInput && hexTextInput.value) {
                let hex = hexTextInput.value.trim();
                if (!hex.startsWith('#')) hex = '#' + hex;
                const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexPattern.test(hex)) {
                    hexValue = hex.toUpperCase();
                }
            } else if (colorPicker && colorPicker.value) {
                hexValue = colorPicker.value;
            }
            
            // Asegurar formato de 6 dígitos
            if (hexValue.length === 4) {
                hexValue = '#' + hexValue[1] + hexValue[1] + hexValue[2] + hexValue[2] + hexValue[3] + hexValue[3];
            }
            
            if (nombreInput && nombreInput.value.trim()) {
                colores.push({
                    nombre: nombreInput.value.trim(),
                    codigo: hexValue,
                    stock: parseInt(stockInput?.value) || 0
                });
            }
        }
    });
    
    return colores;
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
        
        // Usar la nueva función para obtener colores
        const colores = obtenerColoresFromForm(i);
        
        // Si no hay colores válidos, crear uno por defecto
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
// GUARDAR PRODUCTO
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
// CRUD PRODUCTOS
// ============================================

async function editarProducto(id) {
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
                            const colorId = `${varianteId}-color-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                            let colorHTML = '';
                            
                            if (color.nombre === null && color.codigo === null) {
                                // Sin color
                                colorHTML = `
                                    <div class="color-row sin-color-item" id="color-${colorId}">
                                        <span style="font-size: 1.5rem;">⚪</span>
                                        <span style="flex: 1; font-weight: 500;">Sin color específico</span>
                                        <input type="number" id="color-stock-${colorId}" value="${color.stock}" style="width: 80px;">
                                        <button type="button" onclick="eliminarColor('${colorId}')">🗑️</button>
                                    </div>
                                `;
                            } else {
                                const hexValue = color.codigo || '#d4a5a9';
                                colorHTML = `
                                    <div class="color-row" id="color-${colorId}">
                                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; width: 100%;">
                                            <input type="color" id="color-hex-${colorId}" value="${hexValue}" class="color-picker" 
                                                   style="width: 45px; height: 40px; border-radius: 8px; cursor: pointer;"
                                                   onchange="actualizarHexTexto('${colorId}')">
                                            <input type="text" id="color-hex-text-${colorId}" value="${hexValue}" 
                                                   placeholder="#RRGGBB" class="color-hex-text" 
                                                   style="flex: 1; min-width: 100px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;"
                                                   oninput="validarHexColor('${colorId}', this.value)">
                                            <input type="text" id="color-nombre-${colorId}" value="${color.nombre || ''}" 
                                                   placeholder="Nombre del color" class="color-nombre-input" 
                                                   style="flex: 2; min-width: 120px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;">
                                            <input type="number" id="color-stock-${colorId}" value="${color.stock}" 
                                                   placeholder="Stock" min="0" class="color-stock-input" 
                                                   style="width: 80px; padding: 0.5rem; border: 1px solid #f0e4d8; border-radius: 8px;">
                                            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color" 
                                                    style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1.2rem;">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                `;
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

// ============================================
// IMPRESIÓN DE ETIQUETAS CON CÓDIGO DE BARRAS
// ============================================

function abrirConfiguracionEtiquetas(productoId) {
    window.productoActualEtiquetas = productoId;
    
    const modalHTML = `
        <div id="modal-config-etiquetas" class="form-modal" style="display: flex;">
            <div class="form-modal-content" style="max-width: 500px;">
                <div class="form-modal-header">
                    <h3>🖨️ Configurar impresión de etiquetas</h3>
                    <span class="close" onclick="cerrarConfigEtiquetas()">&times;</span>
                </div>
                <div class="form-modal-body">
                    <div class="form-group">
                        <label>📐 Columnas por hoja</label>
                        <input type="range" id="config-columnas" min="1" max="5" value="${configuracionEtiquetas.columnas}" step="1" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                        </div>
                        <span id="valor-columnas" style="color: #d4a5a9;">${configuracionEtiquetas.columnas} columnas</span>
                    </div>
                    
                    <div class="form-group">
                        <label>📏 Filas por hoja</label>
                        <input type="range" id="config-filas" min="2" max="8" value="${configuracionEtiquetas.filas}" step="1" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
                        </div>
                        <span id="valor-filas" style="color: #d4a5a9;">${configuracionEtiquetas.filas} filas</span>
                    </div>
                    
                    <div class="form-group">
                        <label>📏 Márgenes (mm)</label>
                        <input type="range" id="config-margen" min="5" max="20" value="${configuracionEtiquetas.margen}" step="1" style="width: 100%;">
                        <span id="valor-margen" style="color: #d4a5a9;">${configuracionEtiquetas.margen} mm</span>
                    </div>
                    
                    <div class="form-group">
                        <label>🎨 Mostrar código de barras</label>
                        <select id="config-mostrar-barcode">
                            <option value="si" ${configuracionEtiquetas.mostrarBarcode ? 'selected' : ''}>Sí</option>
                            <option value="no" ${!configuracionEtiquetas.mostrarBarcode ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>💰 Mostrar precio</label>
                        <select id="config-mostrar-precio">
                            <option value="si" ${configuracionEtiquetas.mostrarPrecio ? 'selected' : ''}>Sí</option>
                            <option value="no" ${!configuracionEtiquetas.mostrarPrecio ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>📦 Tamaño de letra</label>
                        <input type="range" id="config-fuente" min="8" max="16" value="${configuracionEtiquetas.tamanoFuente}" step="1">
                        <span id="valor-fuente" style="color: #d4a5a9;">${configuracionEtiquetas.tamanoFuente} px</span>
                    </div>
                    
                    <div class="form-actions" style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-primary" onclick="imprimirEtiquetasConConfig()" style="flex: 1;">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="btn-secondary" onclick="cerrarConfigEtiquetas()" style="flex: 1;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('modal-config-etiquetas');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('config-columnas').addEventListener('input', function() {
        configuracionEtiquetas.columnas = parseInt(this.value);
        document.getElementById('valor-columnas').textContent = this.value + ' columnas';
    });
    
    document.getElementById('config-filas').addEventListener('input', function() {
        configuracionEtiquetas.filas = parseInt(this.value);
        document.getElementById('valor-filas').textContent = this.value + ' filas';
    });
    
    document.getElementById('config-margen').addEventListener('input', function() {
        configuracionEtiquetas.margen = parseInt(this.value);
        document.getElementById('valor-margen').textContent = this.value + ' mm';
    });
    
    document.getElementById('config-fuente').addEventListener('input', function() {
        configuracionEtiquetas.tamanoFuente = parseInt(this.value);
        document.getElementById('valor-fuente').textContent = this.value + ' px';
    });
    
    document.getElementById('config-mostrar-barcode').addEventListener('change', function() {
        configuracionEtiquetas.mostrarBarcode = this.value === 'si';
    });
    
    document.getElementById('config-mostrar-precio').addEventListener('change', function() {
        configuracionEtiquetas.mostrarPrecio = this.value === 'si';
    });
}

function cerrarConfigEtiquetas() {
    const modal = document.getElementById('modal-config-etiquetas');
    if (modal) modal.remove();
}

async function imprimirEtiquetasConConfig() {
    const productoId = window.productoActualEtiquetas;
    if (!productoId) return;
    
    cerrarConfigEtiquetas();
    
    try {
        const productoRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await productoRes.json();
        const producto = productos[0];
        
        const variantesRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await variantesRes.json();
        
        if (variantes.length === 0) {
            mostrarAlerta('No hay variantes para imprimir', 'error');
            return;
        }
        
        const totalEtiquetas = configuracionEtiquetas.columnas * configuracionEtiquetas.filas;
        let variantesParaImprimir = [];
        
        while (variantesParaImprimir.length < totalEtiquetas) {
            for (const v of variantes) {
                if (variantesParaImprimir.length < totalEtiquetas) {
                    variantesParaImprimir.push(v);
                }
            }
        }
        
        const html = generarHTMLImpresion(producto, variantesParaImprimir);
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        ventana.print();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al imprimir etiquetas', 'error');
    }
}

function generarHTMLImpresion(producto, variantes) {
    const columnas = configuracionEtiquetas.columnas;
    const filas = configuracionEtiquetas.filas;
    const margen = configuracionEtiquetas.margen;
    const altoEtiqueta = Math.floor((297 - (margen * 2) - (filas * 5)) / filas);
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiquetas - ${producto.nombre}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
            size: A4;
            margin: ${margen}mm;
        }
        
        body { 
            background: white;
            font-family: 'Arial', sans-serif;
        }
        
        .etiquetas-grid {
            display: grid;
            grid-template-columns: repeat(${columnas}, 1fr);
            gap: 5px;
        }
        
        .etiqueta {
            border: 1px dashed #ccc;
            padding: 6px;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: ${altoEtiqueta}px;
        }
        
        .tienda {
            font-size: ${Math.max(8, configuracionEtiquetas.tamanoFuente - 4)}px;
            color: #d4a5a9;
            letter-spacing: 1px;
        }
        
        .nombre {
            font-size: ${configuracionEtiquetas.tamanoFuente}px;
            font-weight: bold;
            color: #4a3728;
        }
        
        .talla {
            font-size: ${configuracionEtiquetas.tamanoFuente + 4}px;
            font-weight: bold;
            color: #b87c4e;
        }
        
        .barcode-container {
            margin: 5px 0;
            display: flex;
            justify-content: center;
        }
        
        canvas.barcode {
            max-width: 100%;
            height: auto;
        }
        
        .sku-texto {
            font-family: monospace;
            font-size: ${Math.max(8, configuracionEtiquetas.tamanoFuente - 4)}px;
            color: #666;
            word-break: break-all;
        }
        
        .precio {
            font-size: ${configuracionEtiquetas.tamanoFuente + 2}px;
            font-weight: bold;
            color: #27ae60;
            margin-top: 5px;
        }
        
        @media print {
            body { margin: 0; padding: 0; }
            .etiqueta { border: 1px dashed #aaa; }
        }
    </style>
</head>
<body>
    <div class="etiquetas-grid">
        ${variantes.map((v, idx) => `
            <div class="etiqueta">
                <div>
                    <div class="tienda">🌸 MODAS LA 34</div>
                    <div class="nombre">${escapeHtml(producto.nombre)}</div>
                    <div class="talla">Talla: ${v.talla}</div>
                </div>
                ${configuracionEtiquetas.mostrarBarcode ? `
                    <div class="barcode-container">
                        <canvas id="barcode-${idx}" class="barcode" data-sku="${v.sku || `${producto.codigo}-${v.talla}`}"></canvas>
                    </div>
                    <div class="sku-texto">${v.sku || `${producto.codigo}-${v.talla}`}</div>
                ` : ''}
                ${configuracionEtiquetas.mostrarPrecio ? `
                    <div class="precio">$${(v.precio_venta || 0).toLocaleString()}</div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    <script>
        window.addEventListener('load', function() {
            document.querySelectorAll('.barcode').forEach(function(canvas) {
                var sku = canvas.getAttribute('data-sku');
                if (sku && typeof JsBarcode !== 'undefined') {
                    JsBarcode(canvas, sku, {
                        format: "CODE128",
                        width: 1.5,
                        height: 35,
                        fontSize: 9,
                        margin: 3,
                        displayValue: false
                    });
                }
            });
        });
    </script>
</body>
</html>`;
}

async function imprimirEtiquetasProducto(productoId) {
    abrirConfiguracionEtiquetas(productoId);
}

// ============================================
// FILTROS Y ORDENAMIENTO
// ============================================

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
            case 'codigo':
                valA = (a.codigo || '').toLowerCase();
                valB = (b.codigo || '').toLowerCase();
                break;
            case 'nombre':
                valA = (a.nombre || '').toLowerCase();
                valB = (b.nombre || '').toLowerCase();
                break;
            case 'categoria':
                valA = (a.categoria || '').toLowerCase();
                valB = (b.categoria || '').toLowerCase();
                break;
            case 'stock':
                valA = a.stock_total || 0;
                valB = b.stock_total || 0;
                break;
            case 'precio':
                const preciosA = a.variantes?.map(v => v.precio_venta) || [0];
                const preciosB = b.variantes?.map(v => v.precio_venta) || [0];
                valA = Math.min(...preciosA);
                valB = Math.min(...preciosB);
                break;
            default:
                valA = a.nombre;
                valB = b.nombre;
        }
        if (valA < valB) return sortProductosDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortProductosDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    mostrarTablaProductos(productosOrdenados);
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
window.abrirConfiguracionEtiquetas = abrirConfiguracionEtiquetas;
window.cerrarConfigEtiquetas = cerrarConfigEtiquetas;
window.imprimirEtiquetasConConfig = imprimirEtiquetasConConfig;
window.actualizarHexTexto = actualizarHexTexto;
window.validarHexColor = validarHexColor;
window.obtenerColoresFromForm = obtenerColoresFromForm;

console.log('✅ Productos.js cargado correctamente');
console.log('📦 Funciones disponibles:', {
    agregarVariante: typeof agregarVariante,
    guardarProductoBase: typeof guardarProductoBase,
    cargarProductos: typeof cargarProductos,
    editarProducto: typeof editarProducto,
    eliminarProducto: typeof eliminarProducto,
    imprimirEtiquetasProducto: typeof imprimirEtiquetasProducto
});
