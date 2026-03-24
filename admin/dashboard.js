// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34
// ============================================

// Variables globales
let currentUser = null;
let currentModule = 'compras';
let varianteCount = 0;

// ===== FUNCIONES DE INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('productos', null); // Cambiar a productos por defecto
    
    // Inicializar variantes si el formulario existe
    setTimeout(() => {
        if (document.getElementById('variantes-container')) {
            agregarVariante();
        }
    }, 500);
});

// ===== FUNCIONES DE AUTENTICACIÓN =====
async function verificarSesion() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const token = JSON.parse(tokenData);
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });

        if (!response.ok) throw new Error('Sesión inválida');

        const user = await response.json();
        currentUser = user;
        
        const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfil = await perfilRes.json();
        
        document.getElementById('userNameDisplay').textContent = 
            perfil[0]?.nombre || user.email || 'Administradora';
        
    } catch (error) {
        console.error('Error de sesión:', error);
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    }
}

function logout() {
    if (confirm('¿Estás segura de cerrar sesión?')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    }
}

// ===== FUNCIONES DE NAVEGACIÓN =====
function cambiarModulo(modulo, event = null) {
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    document.getElementById(`modulo-${modulo}`).style.display = 'block';
    
    if (event) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    currentModule = modulo;
    
    if (modulo !== 'ventas' && modulo !== 'contabilidad') {
        cargarDatosModulo(modulo);
    }
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'compras':
            await cargarCompras();
            await cargarProveedoresSelect('compra');
            break;
        case 'gastos':
            await cargarGastos();
            break;
        case 'productos':
            await cargarProductos();
            await cargarProveedoresSelect('producto');
            break;
        case 'perfiles':
            await cargarPerfiles();
            break;
        case 'proveedores':
            await cargarProveedores();
            break;
        case 'ventas':  // <-- AGREGAR ESTE CASO
            await cargarVentas();
            break;
        case 'contabilidad':
            // No cargar nada por ahora
            break;
    }
}

// ===== FUNCIONES DE DATOS INICIALES =====
async function cargarDatosIniciales() {
    try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await prodRes.json();
        document.getElementById('stats-total-productos').textContent = productos.length;
        
        const varRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?stock_total.lt.5`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await varRes.json();
        document.getElementById('stats-stock-bajo').textContent = variantes.length;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// FUNCIONES PARA VARIANTES CON MÚLTIPLES COLORES
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
                        <label style="color: #ff6b6b;">📏 Talla:</label>
                        <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: S, M, L, 6, 8..." required>
                    </div>
                    <div>
                        <label style="color: #ff6b6b;">💰 Precio de venta:</label>
                        <input type="number" id="variante-${varianteId}-precio" placeholder="Ej: 45000" min="0" step="1000" required style="width: 120px;">
                    </div>
                </div>
                ${varianteId > 0 ? `<button type="button" onclick="eliminarVariante(${varianteId})" class="btn-eliminar-talla">✖️ Eliminar talla</button>` : ''}
            </div>
            
            <div style="margin-top: 1rem;">
                <label style="color: #ff6b6b;">🎨 Colores y stock:</label>
                <div id="colores-${varianteId}-container" class="colores-container">
                    <!-- Los colores se agregan aquí -->
                </div>
                <div>
                    <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-agregar-color">➕ Agregar color</button>
                    <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-sin-color">⚪ Sin color (stock único)</button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', varianteHTML);
    
    // Inicializar con un color por defecto
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
                <input type="color" id="color-hex-${colorId}" value="#ff0000" class="color-picker" style="width: 50px; height: 40px;">
                <input type="text" id="color-hex-text-${colorId}" value="#ff0000" placeholder="Código hex (ej: #ff0000)" class="color-hex-text" style="flex: 1; min-width: 100px; padding: 0.5rem; border: 2px solid #ffe4e9; border-radius: 10px; font-family: monospace;">
                <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color (ej: Rojo)" class="color-nombre-input" style="flex: 2; min-width: 120px;">
                <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input" style="width: 80px;">
                <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
    
    // Sincronizar el color picker con el campo de texto
    const colorPicker = document.getElementById(`color-hex-${colorId}`);
    const colorText = document.getElementById(`color-hex-text-${colorId}`);
    
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function() {
            colorText.value = this.value;
        });
        
        colorText.addEventListener('input', function() {
            let value = this.value;
            if (!value.startsWith('#')) {
                value = '#' + value;
            }
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                colorPicker.value = value;
            }
        });
    }
}

function agregarSinColor(varianteId) {
    const container = document.getElementById(`colores-${varianteId}-container`);
    if (!container) return;
    
    // Verificar si ya existe un "sin color"
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
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input">
            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', sinColorHTML);
}

function eliminarColor(colorId) {
    const elemento = document.getElementById(`color-${colorId}`);
    if (elemento) {
        elemento.remove();
    }
}

function eliminarVariante(varianteId) {
    const element = document.getElementById(`variante-${varianteId}`);
    if (element) {
        element.remove();
    }
}

function getVariantesFromForm() {
    const variantes = [];
    
    for (let i = 0; i < varianteCount; i++) {
        const tallaInput = document.getElementById(`variante-${i}-talla`);
        const precioInput = document.getElementById(`variante-${i}-precio`);
        
        if (!tallaInput || !tallaInput.value.trim()) continue;
        
        const talla = tallaInput.value.trim();
        const precioVenta = parseFloat(precioInput?.value) || 0;
        
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
                    // Para colores con nombre
                    const nombreInput = document.getElementById(`color-nombre-${colorId}`);
                    let hexInput = document.getElementById(`color-hex-${colorId}`);
                    const hexTextInput = document.getElementById(`color-hex-text-${colorId}`);
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    
                    // Obtener el valor hexadecimal (priorizar el texto si existe)
                    let hexValue = '#ff0000';
                    if (hexTextInput && hexTextInput.value) {
                        hexValue = hexTextInput.value;
                    } else if (hexInput && hexInput.value) {
                        hexValue = hexInput.value;
                    }
                    
                    // Validar y formatear el código hexadecimal
                    if (!hexValue.startsWith('#')) {
                        hexValue = '#' + hexValue;
                    }
                    if (!/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                        hexValue = '#cccccc';
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
        }
        
        // Si no hay colores válidos, crear uno por defecto
        if (colores.length === 0) {
            colores.push({
                nombre: 'Sin color',
                codigo: '#cccccc',
                stock: 0
            });
        }
        
        const stockTotal = colores.reduce((sum, c) => sum + c.stock, 0);
        
        variantes.push({
            talla: talla,
            precio_venta: precioVenta,
            colores: colores,
            stock_total: stockTotal
        });
    }
    
    return variantes;
}

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
        
        // Verificar que todas las variantes tengan precio
        for (const v of variantes) {
            if (v.precio_venta === 0) {
                mostrarAlerta(`La talla ${v.talla} no tiene precio asignado`, 'error');
                return;
            }
        }
        
        // 🔑 CLAVE: Verificar si estamos EDITANDO o CREANDO
        const editId = document.getElementById('form-producto').dataset.editId;
        let productoId;
        
        console.log('Modo:', editId ? 'EDITANDO producto ID: ' + editId : 'CREANDO nuevo producto');
        
        if (editId) {
            // ========== MODO EDICIÓN ==========
            productoId = parseInt(editId);
            
            // 1. Actualizar producto base
            const productoBase = {
                codigo: codigo,
                nombre: nombre,
                categoria: categoria,
                imagen_url: document.getElementById('producto-imagen')?.value || null
            };
            
            const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productoBase)
            });
            
            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                throw new Error('Error al actualizar producto base: ' + (error.message || ''));
            }
            
            console.log('✅ Producto base actualizado');
            
            // 2. Eliminar variantes antiguas
            const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`
                }
            });
            
            if (!deleteResponse.ok) {
                console.warn('Error al eliminar variantes antiguas:', await deleteResponse.text());
            } else {
                console.log('✅ Variantes antiguas eliminadas');
            }
            
        } else {
            // ========== MODO CREACIÓN ==========
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
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al guardar producto base');
            }
            
            const productoGuardado = await response.json();
            productoId = productoGuardado[0].id;
            console.log('✅ Nuevo producto base creado con ID:', productoId);
        }
        
        // ========== GUARDAR NUEVAS VARIANTES ==========
        let variantesGuardadas = 0;
        let variantesConError = 0;
        
        for (const variante of variantes) {
            // Generar SKU único
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).substring(2, 10);
            const skuBase = `${codigo}-${variante.talla}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            const skuUnico = `${skuBase}-${timestamp}-${randomPart}`;
            
            const varianteData = {
                producto_id: productoId,
                talla: variante.talla,
                colores: variante.colores,
                stock_total: variante.stock_total,
                precio_venta: variante.precio_venta,
                precio_compra: 0,
                sku: skuUnico
            };
            
            try {
                const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${token.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(varianteData)
                });
                
                if (varResponse.ok) {
                    variantesGuardadas++;
                    console.log(`✅ Variante ${variante.talla} guardada`);
                } else {
                    variantesConError++;
                    const errorText = await varResponse.text();
                    console.error(`❌ Error guardando variante ${variante.talla}:`, errorText);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (varError) {
                variantesConError++;
                console.error(`❌ Excepción en variante ${variante.talla}:`, varError);
            }
        }
        
        // Mensaje final
        if (variantesConError === 0) {
            mostrarAlerta(`🌸 Producto ${editId ? 'actualizado' : 'guardado'} con ${variantesGuardadas} variantes`, 'success');
        } else {
            mostrarAlerta(`⚠️ Producto guardado con ${variantesGuardadas} variantes (${variantesConError} errores)`, 'error');
        }
        
        // Cerrar formulario y recargar
        cerrarFormulario('producto');
        await cargarProductos();
        
        // Limpiar formulario
        document.getElementById('producto-codigo').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-categoria').value = '';
        document.getElementById('producto-imagen').value = '';
        document.getElementById('variantes-container').innerHTML = '';
        varianteCount = 0;
        agregarVariante();
        
        // Limpiar ID de edición
        delete document.getElementById('form-producto').dataset.editId;
        
        // Restaurar texto del botón
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Guardar Producto';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar');
        
        const productos = await response.json();
        
        const tbody = document.querySelector('#tabla-productos tbody');
        if (!tbody) return;
        
        if (productos.length === 0) {
            tbody.innerHTML = '}<tr><td colspan="8" style="text-align: center;">No hay productos registrados</td></tr>';
            return;
        }
        
        function getEmojiCategoria(cat) {
            const emojis = { 'vestidos': '👗', 'blusas': '👚', 'pantalones': '👖', 'deportivo': '⚽', 'caballero': '👔', 'accesorios': '🎀' };
            return emojis[cat] || '📦';
        }
        
        tbody.innerHTML = productos.map(p => {
            const variantes = p.variantes || [];
            const totalStock = variantes.reduce((sum, v) => sum + (v.stock_total || 0), 0);
            const precioMin = Math.min(...variantes.map(v => v.precio_venta || 0));
            const precioMax = Math.max(...variantes.map(v => v.precio_venta || 0));
            const precioTexto = precioMin === precioMax ? `$${precioMin}` : `$${precioMin} - $${precioMax}`;
            
            return `
                <tr>
                    <td>
                        ${p.imagen_url ? 
                            `<img src="${p.imagen_url}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">` : 
                            `<div style="width:50px;height:50px;background:#ffe4e9;border-radius:10px;display:flex;align-items:center;justify-content:center;">${getEmojiCategoria(p.categoria)}</div>`
                        }
                    </td>
                    <td>${p.codigo}</td>
                    <td><strong>${p.nombre}</strong></td>
                    <td><span style="background:#ffe4e9;padding:0.2rem 0.8rem;border-radius:50px;">${p.categoria || '-'}</span></td>
                    <td>${variantes.length} tallas</td>
                    <td>${totalStock}</td>
                    <td>${precioTexto}</td>
                    <td>
                        <button class="action-btn" onclick="editarProducto(${p.id})">✏️</button>
                        <button class="action-btn" onclick="verVariantes(${p.id})">📋</button>
                        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
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
        
        let mensaje = `📋 VARIANTES DE: ${producto.nombre}\n`;
        mensaje += `═══════════════════════\n`;
        mensaje += `Código: ${producto.codigo}\n`;
        mensaje += `Categoría: ${producto.categoria}\n`;
        mensaje += `Stock total: ${producto.stock_total}\n\n`;
        
        variantes.forEach(v => {
            mensaje += `📏 TALLA: ${v.talla}\n`;
            mensaje += `💰 Precio: $${v.precio_venta}\n`;
            
            const colores = v.colores || [];
            if (colores.length > 0) {
                mensaje += `🎨 Colores:\n`;
                colores.forEach(c => {
                    const nombre = c.nombre || 'Sin color';
                    const stock = c.stock || 0;
                    const codigo = c.codigo || '';
                    mensaje += `   • ${nombre} (${codigo}) - Stock: ${stock}\n`;
                });
            } else {
                mensaje += `   • Sin color específico\n`;
            }
            mensaje += `\n`;
        });
        
        alert(mensaje);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar variantes', 'error');
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto? También se eliminarán todas sus variantes.')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        mostrarAlerta('✅ Producto eliminado', 'success');
        await cargarProductos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al eliminar', 'error');
    }
}

// ============================================
// FUNCIÓN PARA EDITAR PRODUCTO
// ============================================

async function editarProducto(id) {
    try {
        console.log('Editando producto:', id);
        
        // Cargar datos del producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar producto');
        
        const productos = await response.json();
        if (productos.length === 0) throw new Error('Producto no encontrado');
        
        const producto = productos[0];
        
        // Cargar variantes
        const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const variantes = await varResponse.json();
        
        // Mostrar formulario
        mostrarFormulario('producto');
        
        // 🔑 CLAVE: Guardar el ID del producto que estamos editando
        document.getElementById('form-producto').dataset.editId = id;
        
        // Llenar datos básicos
        document.getElementById('producto-codigo').value = producto.codigo || '';
        document.getElementById('producto-nombre').value = producto.nombre || '';
        document.getElementById('producto-categoria').value = producto.categoria || '';
        document.getElementById('producto-imagen').value = producto.imagen_url || '';
        
        // Limpiar y recrear variantes
        const container = document.getElementById('variantes-container');
        if (container) {
            container.innerHTML = '';
            varianteCount = 0;
            
            if (variantes.length === 0) {
                // Si no hay variantes, agregar una vacía
                agregarVariante();
            } else {
                variantes.forEach(v => {
                    const varianteId = varianteCount;
                    const varianteHTML = `
                        <div class="variante-card" id="variante-${varianteId}">
                            <div class="variante-header">
                                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                                    <div>
                                        <label style="color: #ff6b6b;">📏 Talla:</label>
                                        <input type="text" id="variante-${varianteId}-talla" value="${v.talla}" required>
                                    </div>
                                    <div>
                                        <label style="color: #ff6b6b;">💰 Precio de venta:</label>
                                        <input type="number" id="variante-${varianteId}-precio" value="${v.precio_venta}" min="0" step="1000" required style="width: 120px;">
                                    </div>
                                </div>
                                <button type="button" onclick="eliminarVariante(${varianteId})" class="btn-eliminar-talla">✖️ Eliminar talla</button>
                            </div>
                            
                            <div style="margin-top: 1rem;">
                                <label style="color: #ff6b6b;">🎨 Colores y stock:</label>
                                <div id="colores-${varianteId}-container" class="colores-container"></div>
                                <div>
                                    <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-agregar-color">➕ Agregar color</button>
                                    <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-sin-color">⚪ Sin color (stock único)</button>
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', varianteHTML);
                    
                    // Agregar colores existentes
                    const coloresContainer = document.getElementById(`colores-${varianteId}-container`);
                    const colores = v.colores || [];
                    
                    if (colores.length > 0) {
                        colores.forEach(color => {
                            const colorId = `${varianteId}-${Date.now()}-${Math.random()}`;
                            let colorHTML = '';
                            
                            if (color.nombre === null && color.codigo === null) {
                                colorHTML = `
                                    <div class="color-row sin-color-item" id="color-${colorId}">
                                        <span style="font-size: 1.5rem;">⚪</span>
                                        <span style="flex: 1; font-weight: 500;">Sin color específico</span>
                                        <input type="number" id="color-stock-${colorId}" value="${color.stock}" placeholder="Stock" min="0" class="color-stock-input" style="width: 80px;">
                                        <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
                                    </div>
                                `;
                            } else {
                                colorHTML = `
                                    <div class="color-row" id="color-${colorId}">
                                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; width: 100%;">
                                            <input type="color" id="color-hex-${colorId}" value="${color.codigo || '#ff0000'}" class="color-picker" style="width: 50px; height: 40px;">
                                            <input type="text" id="color-hex-text-${colorId}" value="${color.codigo || '#ff0000'}" placeholder="Código hex" class="color-hex-text" style="flex: 1; min-width: 100px;">
                                            <input type="text" id="color-nombre-${colorId}" value="${color.nombre || ''}" placeholder="Nombre del color" class="color-nombre-input" style="flex: 2;">
                                            <input type="number" id="color-stock-${colorId}" value="${color.stock}" placeholder="Stock" min="0" class="color-stock-input" style="width: 80px;">
                                            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
                                        </div>
                                    </div>
                                `;
                            }
                            
                            coloresContainer.insertAdjacentHTML('beforeend', colorHTML);
                            
                            // Sincronizar color picker con texto
                            if (color.nombre !== null) {
                                const colorPicker = document.getElementById(`color-hex-${colorId}`);
                                const colorText = document.getElementById(`color-hex-text-${colorId}`);
                                if (colorPicker && colorText) {
                                    colorPicker.addEventListener('input', function() { colorText.value = this.value; });
                                    colorText.addEventListener('input', function() {
                                        let val = this.value;
                                        if (!val.startsWith('#')) val = '#' + val;
                                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) colorPicker.value = val;
                                    });
                                }
                            }
                        });
                    } else {
                        agregarColorAVariante(varianteId);
                    }
                    
                    varianteCount++;
                });
            }
        }
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Producto';
        }
        
    } catch (error) {
        console.error('Error al editar:', error);
        mostrarAlerta('Error al cargar el producto', 'error');
    }
}
                   

// ============================================
// FUNCIONES DE PROVEEDORES
// ============================================

async function cargarProveedores() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const proveedores = await response.json();
        
        const tbody = document.querySelector('#tabla-proveedores tbody');
        
        if (proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay proveedores registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-proveedores').textContent = proveedores.length;
        
        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.contacto || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>
                    <button class="action-btn" onclick="editarProveedor(${p.id})" title="Editar">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarProveedor(${p.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

async function cargarProveedoresSelect(origen) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?select=id,nombre&order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const proveedores = await response.json();
        
        const select = document.getElementById(`${origen}-proveedor`);
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar proveedor</option>' +
            proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
            
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

async function guardarProveedor() {
    const proveedor = {
        nombre: document.getElementById('proveedor-nombre').value,
        contacto: document.getElementById('proveedor-contacto').value || null,
        telefono: document.getElementById('proveedor-telefono').value || null,
        email: document.getElementById('proveedor-email').value || null,
        direccion: document.getElementById('proveedor-direccion').value || null
    };
    
    if (!proveedor.nombre) {
        mostrarAlerta('El nombre del proveedor es obligatorio', 'error');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proveedor)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Proveedor guardado correctamente', 'success');
            cerrarFormulario('proveedor');
            await cargarProveedores();
            document.getElementById('proveedor-nombre').value = '';
            document.getElementById('proveedor-contacto').value = '';
            document.getElementById('proveedor-telefono').value = '';
            document.getElementById('proveedor-email').value = '';
            document.getElementById('proveedor-direccion').value = '';
        } else {
            mostrarAlerta('Error al guardar el proveedor', 'error');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'error');
    }
}

function editarProveedor(id) {
    alert('Función de editar proveedor en desarrollo');
}

async function eliminarProveedor(id) {
    if (!confirm('¿Estás segura de eliminar este proveedor?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Proveedor eliminado', 'success');
            await cargarProveedores();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ============================================
// FUNCIONES DE PROVEEDORES (COMPLETAS CON EDICIÓN)
// ============================================

async function editarProveedor(id) {
    try {
        console.log('Editando proveedor:', id);
        
        // Cargar datos del proveedor
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar proveedor');
        
        const proveedores = await response.json();
        if (proveedores.length === 0) throw new Error('Proveedor no encontrado');
        
        const proveedor = proveedores[0];
        
        // Mostrar formulario
        mostrarFormulario('proveedor');
        
        // Llenar campos
        document.getElementById('proveedor-nombre').value = proveedor.nombre || '';
        document.getElementById('proveedor-contacto').value = proveedor.contacto || '';
        document.getElementById('proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('proveedor-email').value = proveedor.email || '';
        document.getElementById('proveedor-direccion').value = proveedor.direccion || '';
        
        // Guardar ID para actualizar
        document.getElementById('form-proveedor').dataset.editId = id;
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-proveedor .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Proveedor';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el proveedor', 'error');
    }
}

// Modificar guardarProveedor para manejar edición
async function guardarProveedor() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const proveedor = {
            nombre: document.getElementById('proveedor-nombre').value,
            contacto: document.getElementById('proveedor-contacto').value || null,
            telefono: document.getElementById('proveedor-telefono').value || null,
            email: document.getElementById('proveedor-email').value || null,
            direccion: document.getElementById('proveedor-direccion').value || null
        };
        
        if (!proveedor.nombre) {
            mostrarAlerta('El nombre del proveedor es obligatorio', 'error');
            return;
        }
        
        // Verificar si estamos editando o creando
        const editId = document.getElementById('form-proveedor').dataset.editId;
        let url = `${SUPABASE_URL}/rest/v1/proveedores`;
        let method = 'POST';
        
        if (editId) {
            url += `?id=eq.${editId}`;
            method = 'PATCH';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proveedor)
        });
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Proveedor actualizado correctamente' : '🌸 Proveedor guardado correctamente', 'success');
            cerrarFormulario('proveedor');
            await cargarProveedores();
            
            // Limpiar formulario
            document.getElementById('proveedor-nombre').value = '';
            document.getElementById('proveedor-contacto').value = '';
            document.getElementById('proveedor-telefono').value = '';
            document.getElementById('proveedor-email').value = '';
            document.getElementById('proveedor-direccion').value = '';
            
            // Limpiar ID de edición
            delete document.getElementById('form-proveedor').dataset.editId;
            
            // Restaurar texto del botón
            const submitBtn = document.querySelector('#form-proveedor .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Proveedor';
            }
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ============================================
// FUNCIONES DE COMPRAS (COMPLETAS)
// ============================================

async function cargarCompras() {
    try {
        console.log('Cargando compras...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar compras');
        }
        
        const compras = await response.json();
        console.log('Compras cargadas:', compras);
        
        const tbody = document.querySelector('#tabla-compras tbody');
        if (!tbody) return;
        
        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay compras registradas</td></tr>';
            return;
        }
        
        // Calcular total compras mes
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const comprasMes = compras.filter(c => {
            // CORRECCIÓN: Ajustar la fecha para evitar el desplazamiento
            const fechaCompra = new Date(c.fecha + 'T12:00:00'); // Agregamos hora del mediodía para evitar problemas de zona
            return fechaCompra >= fechaInicio;
        });
        
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
        document.getElementById('stats-compras-pendientes').textContent = pendientes;
        
        tbody.innerHTML = compras.map(compra => {
            // CORRECCIÓN: Formatear fecha correctamente
            const fechaCompra = new Date(compra.fecha + 'T12:00:00');
            const fechaFormateada = fechaCompra.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${compra.proveedores?.nombre || 'N/A'}</td>
                <td>${compra.producto || 'Varios'}</td>
                <td>${compra.cantidad || '-'}</td>
                <td>$${(compra.total || 0).toLocaleString()}</td>
                <td>
                    <span class="estado-badge ${compra.estado === 'Pagada' ? 'estado-pagada' : compra.estado === 'Recibida' ? 'estado-recibida' : 'estado-pendiente'}">
                        ${compra.estado || 'Pendiente'}
                    </span>
                </td>
                <td>${compra.puc || '620501'}</td>
                <td>
                    <button class="action-btn" onclick="editarCompra(${compra.id})" title="Editar">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `}).join('');
        
    } catch (error) {
        console.error('Error cargando compras:', error);
        const tbody = document.querySelector('#tabla-compras tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ff4757;">Error al cargar compras</td></tr>';
        }
    }
}

async function guardarCompra() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const proveedorId = document.getElementById('compra-proveedor').value;
        if (!proveedorId) {
            mostrarAlerta('Debe seleccionar un proveedor', 'error');
            return;
        }
        
        const cantidad = parseInt(document.getElementById('compra-cantidad').value);
        const precio = parseFloat(document.getElementById('compra-precio').value);
        
        if (!cantidad || cantidad <= 0) {
            mostrarAlerta('Cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        if (!precio || precio <= 0) {
            mostrarAlerta('Precio debe ser mayor a 0', 'error');
            return;
        }
        
        const fechaInput = document.getElementById('compra-fecha').value;
        if (!fechaInput) {
            mostrarAlerta('Debe seleccionar una fecha', 'error');
            return;
        }
        
        const producto = document.getElementById('compra-producto').value;
        if (!producto) {
            mostrarAlerta('Debe especificar el producto', 'error');
            return;
        }
        
        const compra = {
            proveedor_id: parseInt(proveedorId),
            fecha: fechaInput,
            producto: producto,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado').value,
            puc: '620501'
        };
        
        console.log('Guardando compra:', compra);
        
        // Verificar si estamos editando o creando
        const editId = document.getElementById('form-compra').dataset.editId;
        let url = `${SUPABASE_URL}/rest/v1/compras`;
        let method = 'POST';
        
        if (editId) {
            url += `?id=eq.${editId}`;
            method = 'PATCH';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Compra actualizada correctamente' : '🌸 Compra guardada correctamente', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
            document.getElementById('compra-proveedor').value = '';
            document.getElementById('compra-fecha').value = '';
            document.getElementById('compra-producto').value = '';
            document.getElementById('compra-cantidad').value = '';
            document.getElementById('compra-precio').value = '';
            
            // Limpiar ID de edición
            delete document.getElementById('form-compra').dataset.editId;
            
            // Restaurar texto del botón
            const submitBtn = document.querySelector('#form-compra .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Compra';
            }
        } else {
            const error = await response.json();
            console.error('Error respuesta:', error);
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión: ' + error.message, 'error');
    }
}

async function editarCompra(id) {
    try {
        console.log('Editando compra:', id);
        
        // Cargar datos de la compra
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar compra');
        
        const compras = await response.json();
        if (compras.length === 0) throw new Error('Compra no encontrada');
        
        const compra = compras[0];
        console.log('Compra cargada:', compra);
        
        // Mostrar formulario
        mostrarFormulario('compra');
        
        // Cargar proveedores en el select
        await cargarProveedoresSelect('compra');
        
        // Pequeña pausa para asegurar que el select se cargó
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Llenar campos básicos (verificando que existan)
        const proveedorSelect = document.getElementById('compra-proveedor');
        if (proveedorSelect && compra.proveedor_id) {
            proveedorSelect.value = compra.proveedor_id;
        }
        
        const fechaInput = document.getElementById('compra-fecha');
        if (fechaInput && compra.fecha) {
            fechaInput.value = compra.fecha.split('T')[0];
        }
        
        const productoInput = document.getElementById('compra-producto');
        if (productoInput && compra.producto) {
            productoInput.value = compra.producto;
        }
        
        const cantidadInput = document.getElementById('compra-cantidad');
        if (cantidadInput && compra.cantidad) {
            cantidadInput.value = compra.cantidad;
        }
        
        const precioInput = document.getElementById('compra-precio');
        if (precioInput && compra.precio_unitario) {
            precioInput.value = compra.precio_unitario;
        }
        
        const estadoSelect = document.getElementById('compra-estado');
        if (estadoSelect && compra.estado) {
            estadoSelect.value = compra.estado;
        }
        
        // Guardar ID para actualizar
        document.getElementById('form-compra').dataset.editId = id;
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-compra .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Compra';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar la compra: ' + error.message, 'error');
    }
}

async function eliminarCompra(id) {
    if (!confirm('¿Estás segura de eliminar esta compra?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Compra eliminada correctamente', 'success');
            await cargarCompras();
        } else {
            mostrarAlerta('Error al eliminar la compra', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ===== NUEVAS FUNCIONES PARA COMPRAS CON PRODUCTOS =====

// Cargar productos en el select
async function cargarProductosSelect() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?select=id,codigo,nombre&order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const productos = await response.json();
        const select = document.getElementById('compra-producto-select');
        
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar producto existente (opcional)</option>' +
            productos.map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`).join('');
            
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Cargar variantes del producto seleccionado
async function cargarVariantesProducto() {
    const productoId = document.getElementById('compra-producto-select').value;
    const varianteContainer = document.getElementById('compra-variante-container');
    const varianteSelect = document.getElementById('compra-variante-select');
    const manualContainer = document.getElementById('compra-manual-container');
    
    if (!productoId) {
        varianteContainer.style.display = 'none';
        manualContainer.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const variantes = await response.json();
        
        if (variantes.length > 0) {
            varianteSelect.innerHTML = '<option value="">Seleccionar variante</option>' +
                variantes.map(v => {
                    const colorMuestra = v.color_codigo ? 
                        `<span style="display:inline-block; width:12px; height:12px; background:${v.color_codigo}; border-radius:50%;"></span>` : '';
                    return `<option value="${v.id}" data-talla="${v.talla}" data-color-nombre="${v.color_nombre || ''}" data-color-codigo="${v.color_codigo || ''}">
                        Talla: ${v.talla} | Color: ${v.color_nombre || 'N/A'} ${colorMuestra}
                    </option>`;
                }).join('');
            
            varianteContainer.style.display = 'block';
            manualContainer.style.display = 'none';
        } else {
            varianteContainer.style.display = 'none';
            manualContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error cargando variantes:', error);
    }
}

// Función para actualizar stock cuando llega una compra
async function actualizarStockPorCompra(varianteId, cantidad) {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // Obtener stock actual
        const response = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?id=eq.${varianteId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const variantes = await response.json();
        if (variantes.length === 0) return;
        
        const stockActual = variantes[0].stock || 0;
        const nuevoStock = stockActual + cantidad;
        
        // Actualizar stock
        await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?id=eq.${varianteId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stock: nuevoStock })
        });
        
        console.log(`Stock actualizado: ${stockActual} → ${nuevoStock}`);
        
    } catch (error) {
        console.error('Error actualizando stock:', error);
    }
}

// ============================================
// FUNCIONES DE GASTOS (COMPLETAS)
// ============================================

async function cargarGastos() {
    try {
        console.log('Cargando gastos...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar gastos');
        }
        
        const gastos = await response.json();
        console.log('Gastos cargados:', gastos);
        
        const tbody = document.querySelector('#tabla-gastos tbody');
        if (!tbody) return;
        
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay gastos registrados</td></tr>';
            return;
        }
        
        // Calcular gastos del mes
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicio);
        const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
        document.getElementById('stats-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = gastos.map(gasto => `
            <tr>
                <td>${new Date(gasto.fecha).toLocaleDateString()}</td>
                <td>${gasto.concepto}</td>
                <td>${gasto.categoria}</td>
                <td>$${(gasto.monto || 0).toLocaleString()}</td>
                <td>${gasto.metodo_pago || 'Efectivo'}</td>
                <td>
                    <button class="action-btn" onclick="editarGasto(${gasto.id})" title="Editar">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarGasto(${gasto.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando gastos:', error);
        const tbody = document.querySelector('#tabla-gastos tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff4757;">Error al cargar gastos</td></tr>';
        }
    }
}

async function guardarGasto() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const gasto = {
            fecha: document.getElementById('gasto-fecha').value,
            concepto: document.getElementById('gasto-concepto').value,
            categoria: document.getElementById('gasto-categoria').value,
            monto: parseFloat(document.getElementById('gasto-monto').value),
            metodo_pago: document.getElementById('gasto-metodo').value,
            puc: obtenerPUCGasto(document.getElementById('gasto-categoria').value)
        };
        
        if (!gasto.fecha || !gasto.concepto || !gasto.categoria || !gasto.monto) {
            mostrarAlerta('Por favor completa todos los campos', 'error');
            return;
        }
        
        // Verificar si estamos editando o creando
        const editId = document.getElementById('form-gasto').dataset.editId;
        let url = `${SUPABASE_URL}/rest/v1/gastos`;
        let method = 'POST';
        
        if (editId) {
            url += `?id=eq.${editId}`;
            method = 'PATCH';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gasto)
        });
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Gasto actualizado correctamente' : '🌸 Gasto guardado correctamente', 'success');
            cerrarFormulario('gasto');
            await cargarGastos();
            
            // Limpiar formulario
            document.getElementById('gasto-fecha').value = '';
            document.getElementById('gasto-concepto').value = '';
            document.getElementById('gasto-categoria').value = '';
            document.getElementById('gasto-monto').value = '';
            
            // Limpiar ID de edición
            delete document.getElementById('form-gasto').dataset.editId;
            
            // Restaurar texto del botón
            const submitBtn = document.querySelector('#form-gasto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Gasto';
            }
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function obtenerPUCGasto(categoria) {
    const pucMap = {
        'Alquiler': '511005',
        'Servicios': '511010',
        'Sueldos': '510506',
        'Marketing': '513505',
        'Mantenimiento': '513505',
        'Otros': '519595'
    };
    return pucMap[categoria] || '519595';
}

async function editarGasto(id) {
    try {
        console.log('Editando gasto:', id);
        
        // Cargar datos del gasto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar gasto');
        
        const gastos = await response.json();
        if (gastos.length === 0) throw new Error('Gasto no encontrado');
        
        const gasto = gastos[0];
        
        // Mostrar formulario
        mostrarFormulario('gasto');
        
        // Llenar campos
        document.getElementById('gasto-fecha').value = gasto.fecha.split('T')[0];
        document.getElementById('gasto-concepto').value = gasto.concepto || '';
        document.getElementById('gasto-categoria').value = gasto.categoria || '';
        document.getElementById('gasto-monto').value = gasto.monto || '';
        if (gasto.metodo_pago) {
            document.getElementById('gasto-metodo').value = gasto.metodo_pago;
        }
        
        // Guardar ID para actualizar
        document.getElementById('form-gasto').dataset.editId = id;
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-gasto .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Gasto';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el gasto', 'error');
    }
}

async function eliminarGasto(id) {
    if (!confirm('¿Estás segura de eliminar este gasto?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Gasto eliminado correctamente', 'success');
            await cargarGastos();
        } else {
            mostrarAlerta('Error al eliminar el gasto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ============================================
// FUNCIONES DE PERFILES (BÁSICAS)
// ============================================

async function cargarPerfiles() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await response.json();
        
        const tbody = document.querySelector('#tabla-perfiles tbody');
        
        if (perfiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-empleados').textContent = perfiles.length;
        
        tbody.innerHTML = perfiles.map(p => `
            <tr>
                <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                <td>${p.email}</td>
                <td>
                    <span style="background: ${p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1'}; 
                                 color: white; padding: 0.2rem 0.8rem; border-radius: 50px;">
                        ${p.rol || 'empleado'}
                    </span>
                </td>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="editarPerfil('${p.id}')" title="Editar">✏️</button>
                    ${p.id !== currentUser?.id ? 
                        `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')" title="Eliminar">🗑️</button>` 
                        : ''}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando perfiles:', error);
    }
}

async function guardarPerfil() {
    mostrarAlerta('Función de guardar perfil en desarrollo', 'error');
}

function editarPerfil(id) {
    alert('Función de editar perfil en desarrollo');
}

function eliminarPerfil(id) {
    if (confirm('¿Eliminar este usuario?')) {
        mostrarAlerta('Función de eliminar en desarrollo', 'error');
    }
}

// ============================================
// FUNCIONES DE PERFILES (COMPLETAS CON EDICIÓN)
// ============================================

async function editarPerfil(id) {
    try {
        console.log('Editando perfil:', id);
        
        // Cargar datos del perfil
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar perfil');
        
        const perfiles = await response.json();
        if (perfiles.length === 0) throw new Error('Perfil no encontrado');
        
        const perfil = perfiles[0];
        
        // Mostrar formulario
        mostrarFormulario('perfil');
        
        // Llenar campos
        document.getElementById('perfil-nombre').value = perfil.nombre || '';
        document.getElementById('perfil-email').value = perfil.email || '';
        document.getElementById('perfil-rol').value = perfil.rol || 'empleado';
        
        // Guardar ID para actualizar
        document.getElementById('form-perfil').dataset.editId = id;
        
        // Ocultar campo de contraseña (no se puede editar directamente)
        const passwordField = document.getElementById('perfil-password');
        if (passwordField) {
            passwordField.placeholder = 'Dejar vacío para mantener la misma';
            passwordField.required = false;
        }
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Usuario';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el usuario', 'error');
    }
}

// Modificar guardarPerfil para manejar edición
async function guardarPerfil() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const nombre = document.getElementById('perfil-nombre').value;
        const email = document.getElementById('perfil-email').value;
        const password = document.getElementById('perfil-password').value;
        const rol = document.getElementById('perfil-rol').value;
        
        if (!nombre || !email) {
            mostrarAlerta('Nombre y email son obligatorios', 'error');
            return;
        }
        
        const editId = document.getElementById('form-perfil').dataset.editId;
        
        if (editId) {
            // ACTUALIZAR perfil existente
            const perfilData = {
                nombre: nombre,
                email: email,
                rol: rol
            };
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${editId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(perfilData)
            });
            
            if (response.ok) {
                mostrarAlerta('🌸 Usuario actualizado correctamente', 'success');
                cerrarFormulario('perfil');
                await cargarPerfiles();
            } else {
                const error = await response.json();
                mostrarAlerta('Error: ' + (error.message || 'No se pudo actualizar'), 'error');
            }
            
        } else {
            // CREAR nuevo usuario
            if (!password || password.length < 6) {
                mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            // Crear usuario en Auth
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const authData = await authResponse.json();
            
            if (!authResponse.ok) {
                throw new Error(authData.msg || 'Error al crear usuario');
            }
            
            // Crear perfil
            const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: authData.user.id,
                    nombre: nombre,
                    email: email,
                    rol: rol
                })
            });
            
            if (perfilResponse.ok) {
                mostrarAlerta('🌸 Usuario creado correctamente', 'success');
                cerrarFormulario('perfil');
                await cargarPerfiles();
            } else {
                throw new Error('Error al crear perfil');
            }
        }
        
        // Limpiar formulario
        document.getElementById('perfil-nombre').value = '';
        document.getElementById('perfil-email').value = '';
        document.getElementById('perfil-password').value = '';
        
        // Limpiar ID de edición
        delete document.getElementById('form-perfil').dataset.editId;
        
        // Restaurar campo de contraseña
        const passwordField = document.getElementById('perfil-password');
        if (passwordField) {
            passwordField.placeholder = 'Contraseña';
            passwordField.required = true;
        }
        
        // Restaurar texto del botón
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Crear Usuario';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

async function eliminarPerfil(id) {
    if (!confirm('¿Estás segura de eliminar este usuario?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // Eliminar perfil (el usuario en auth se elimina automáticamente si hay trigger)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Usuario eliminado', 'success');
            await cargarPerfiles();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ============================================
// FUNCIONES DE VENTAS
// ============================================

async function cargarVentas() {
    try {
        console.log('Cargando ventas...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?select=*&order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar ventas');
        }
        
        const ventas = await response.json();
        console.log('Ventas cargadas:', ventas);
        
        const tbody = document.querySelector('#tabla-ventas tbody');
        if (!tbody) return;
        
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas registradas</td></tr>';
            return;
        }
        
        // Ventas de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        document.getElementById('stats-ventas-hoy').textContent = `$${totalHoy.toLocaleString()}`;
        
        // Ventas del mes
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const ventasMes = ventas.filter(v => new Date(v.fecha) >= fechaInicio);
        const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
        document.getElementById('stats-ventas-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = ventas.map(venta => `
            <tr>
                <td>${new Date(venta.fecha).toLocaleString()}</td>
                <td>${venta.productos || 'Venta'}</td>
                <td>$${(venta.total || 0).toLocaleString()}</td>
                <td>
                    <span style="background: #ffe4e9; padding: 0.2rem 0.8rem; border-radius: 50px;">
                        ${venta.metodo_pago || 'Efectivo'}
                    </span>
                </td>
                <td>${venta.vendedor || '-'}</td>
                <td>
                    <button class="action-btn" onclick="verFactura(${venta.id})" title="Ver factura">🧾</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        const tbody = document.querySelector('#tabla-ventas tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff4757;">Error al cargar ventas</td></tr>';
        }
    }
}

// Función para ver factura
function verFactura(id) {
    window.open(`factura.html?id=${id}`, '_blank');
}

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.add('active');
    }
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.remove('active');
        
        if (tipo === 'producto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto';
            }
        } else if (tipo === 'compra') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-compra .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Compra';
            }
        } else if (tipo === 'gasto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-gasto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Gasto';
            }
        } else if (tipo === 'proveedor') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-proveedor .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Proveedor';
            }
        } else if (tipo === 'perfil') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-perfil .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Crear Usuario';
            }
            // Restaurar campo de contraseña
            const passwordField = document.getElementById('perfil-password');
            if (passwordField) {
                passwordField.placeholder = 'Contraseña';
                passwordField.required = true;
                passwordField.value = '';
            }
        }
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (!alerta) return;
    
    alerta.textContent = mensaje;
    alerta.className = `alert ${tipo}`;
    alerta.style.display = 'block';
    
    setTimeout(() => {
        alerta.style.display = 'none';
    }, 3000);
}
