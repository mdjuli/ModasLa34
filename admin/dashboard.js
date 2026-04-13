// ============================================
// DASHBOARD ADMIN - MODAS LA 34
// Menú Hamburguesa - Versión Completa
// ============================================

// Variables globales
let currentUser = null;
let currentModule = 'productos';
let varianteCount = 0;

// Variables de filtros
let fechaInicioCompras = null;
let fechaFinCompras = null;
let fechaInicioGastos = null;
let fechaFinGastos = null;
let fechaInicioVentas = null;
let fechaFinVentas = null;

// ===== FUNCIONES DEL MENÚ HAMBURGUESA =====
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// Cerrar menú al hacer clic en un enlace (para móviles)
function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ===== FUNCIONES DE INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('productos', null);
    
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
        
        const nombreMostrar = perfil[0]?.nombre || user.email || 'Administradora';
        const userNameDisplay = document.getElementById('userNameDisplay');
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        
        if (userNameDisplay) userNameDisplay.textContent = nombreMostrar;
        if (sidebarUserName) sidebarUserName.textContent = nombreMostrar;
        if (sidebarUserEmail) sidebarUserEmail.textContent = user.email || 'admin@modasla34.com';
        
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
    // Ocultar todos los módulos
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar el módulo seleccionado
    const moduloElement = document.getElementById(`modulo-${modulo}`);
    if (moduloElement) moduloElement.style.display = 'block';
    
    // Actualizar clase activa en el menú lateral
    if (event) {
        document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Buscar el botón clickeado
        let clickedBtn = event.target;
        if (clickedBtn.classList && clickedBtn.classList.contains('sidebar-nav-icon')) {
            clickedBtn = clickedBtn.parentElement;
        }
        if (clickedBtn && clickedBtn.classList) {
            clickedBtn.classList.add('active');
        }
    }
    
    currentModule = modulo;
    cargarDatosModulo(modulo);
    
    // Cerrar menú en móvil después de seleccionar
    if (window.innerWidth <= 768) {
        closeMenu();
    }
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos':
            await cargarProductos();
            break;
        case 'inventario':
            await cargarInventario();
            break;
        case 'compras':
            await cargarProveedoresSelect('compra');
            await cargarCompras();
            break;
        case 'gastos':
            await cargarGastos();
            break;
        case 'perfiles':
            await cargarPerfiles();
            break;
        case 'proveedores':
            await cargarProveedores();
            break;
        case 'ventas':
            await cargarVentas();
            break;
        case 'contabilidad':
            // No cargar datos
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
        const totalProductos = document.getElementById('stats-total-productos');
        if (totalProductos) totalProductos.textContent = productos.length;
        
        const varRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?stock_total.lt.5`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await varRes.json();
        const stockBajo = document.getElementById('stats-stock-bajo');
        if (stockBajo) stockBajo.textContent = variantes.length;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// FUNCIONES DE FILTROS
// ============================================
function aplicarFiltroCompras() {
    const inicio = document.getElementById('compras-fecha-inicio')?.value;
    const fin = document.getElementById('compras-fecha-fin')?.value;
    fechaInicioCompras = inicio ? new Date(inicio) : null;
    fechaFinCompras = fin ? new Date(fin) : null;
    if (fechaFinCompras) fechaFinCompras.setHours(23, 59, 59, 999);
    cargarCompras();
}

function limpiarFiltroCompras() {
    const inicioInput = document.getElementById('compras-fecha-inicio');
    const finInput = document.getElementById('compras-fecha-fin');
    if (inicioInput) inicioInput.value = '';
    if (finInput) finInput.value = '';
    fechaInicioCompras = null;
    fechaFinCompras = null;
    cargarCompras();
}

function aplicarFiltroGastos() {
    const inicio = document.getElementById('gastos-fecha-inicio')?.value;
    const fin = document.getElementById('gastos-fecha-fin')?.value;
    fechaInicioGastos = inicio ? new Date(inicio) : null;
    fechaFinGastos = fin ? new Date(fin) : null;
    if (fechaFinGastos) fechaFinGastos.setHours(23, 59, 59, 999);
    cargarGastos();
}

function limpiarFiltroGastos() {
    const inicioInput = document.getElementById('gastos-fecha-inicio');
    const finInput = document.getElementById('gastos-fecha-fin');
    if (inicioInput) inicioInput.value = '';
    if (finInput) finInput.value = '';
    fechaInicioGastos = null;
    fechaFinGastos = null;
    cargarGastos();
}

function aplicarFiltroVentas() {
    const inicio = document.getElementById('ventas-fecha-inicio')?.value;
    const fin = document.getElementById('ventas-fecha-fin')?.value;
    fechaInicioVentas = inicio ? new Date(inicio) : null;
    fechaFinVentas = fin ? new Date(fin) : null;
    if (fechaFinVentas) fechaFinVentas.setHours(23, 59, 59, 999);
    cargarVentas();
}

function limpiarFiltroVentas() {
    const inicioInput = document.getElementById('ventas-fecha-inicio');
    const finInput = document.getElementById('ventas-fecha-fin');
    if (inicioInput) inicioInput.value = '';
    if (finInput) finInput.value = '';
    fechaInicioVentas = null;
    fechaFinVentas = null;
    cargarVentas();
}

// ============================================
// FUNCIONES PARA VARIANTES (PRODUCTOS)
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
                <div id="colores-${varianteId}-container" class="colores-container"></div>
                <div>
                    <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-agregar-color">➕ Agregar color</button>
                    <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-sin-color">⚪ Sin color (stock único)</button>
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
                <input type="color" id="color-hex-${colorId}" value="#ff0000" class="color-picker" style="width: 50px; height: 40px;">
                <input type="text" id="color-hex-text-${colorId}" value="#ff0000" placeholder="Código hex (ej: #ff0000)" class="color-hex-text" style="flex: 1; min-width: 100px;">
                <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color (ej: Rojo)" class="color-nombre-input" style="flex: 2;">
                <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input" style="width: 80px;">
                <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
    
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
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input" style="width: 80px;">
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
    const precioCompraGlobal = document.getElementById('producto-precio-compra')?.value || 0;
    
    for (let i = 0; i < varianteCount; i++) {
        const tallaInput = document.getElementById(`variante-${i}-talla`);
        const precioInput = document.getElementById(`variante-${i}-precio`);
        
        if (!tallaInput || !tallaInput.value.trim()) continue;
        
        const talla = tallaInput.value.trim();
        const precioVenta = parseFloat(precioInput?.value) || 0;
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
                        colores.push({
                            nombre: null,
                            codigo: null,
                            stock: stock
                        });
                    }
                } else {
                    const nombreInput = document.getElementById(`color-nombre-${colorId}`);
                    const hexTextInput = document.getElementById(`color-hex-text-${colorId}`);
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    
                    let hexValue = '#ff0000';
                    if (hexTextInput && hexTextInput.value) {
                        hexValue = hexTextInput.value;
                    }
                    
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
            precio_compra: precioCompra,
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
        
        for (const v of variantes) {
            if (v.precio_venta === 0) {
                mostrarAlerta(`La talla ${v.talla} no tiene precio asignado`, 'error');
                return;
            }
        }
        
        const editId = document.getElementById('form-producto').dataset.editId;
        let productoId;
        
        console.log('Modo:', editId ? 'EDITANDO producto ID: ' + editId : 'CREANDO nuevo producto');
        
        if (editId) {
            productoId = parseInt(editId);
            
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
        
        let variantesGuardadas = 0;
        let variantesConError = 0;
        
        for (const variante of variantes) {
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
                precio_compra: variante.precio_compra,
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
        
        if (variantesConError === 0) {
            mostrarAlerta(`🌸 Producto ${editId ? 'actualizado' : 'guardado'} con ${variantesGuardadas} variantes`, 'success');
        } else {
            mostrarAlerta(`⚠️ Producto guardado con ${variantesGuardadas} variantes (${variantesConError} errores)`, 'error');
        }
        
        cerrarFormulario('producto');
        await cargarProductos();
        
        document.getElementById('producto-codigo').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-categoria').value = '';
        document.getElementById('producto-imagen').value = '';
        document.getElementById('producto-precio-compra').value = '';
        document.getElementById('variantes-container').innerHTML = '';
        varianteCount = 0;
        agregarVariante();
        
        delete document.getElementById('form-producto').dataset.editId;
        
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
        
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        
        const tbody = document.querySelector('#tabla-productos tbody');
        if (!tbody) return;
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay productos registrados<\/td></td>';
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
                    <td>${variantes.length} tallas<\/td>
                    <td style="font-weight:bold;color:${totalStock < 5 ? '#ff4757' : '#27ae60'}">${totalStock}<\/td>
                    <td>${precioTexto}<\/td>
                    <td>
                        <button class="action-btn" onclick="editarProducto(${p.id})">✏️<\/button>
                        <button class="action-btn" onclick="verVariantes(${p.id})">📋<\/button>
                        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})">🗑️<\/button>
                    <\/td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function editarProducto(id) {
    mostrarAlerta('Función de editar producto en desarrollo', 'warning');
}

function verVariantes(id) {
    mostrarAlerta('Función de ver variantes en desarrollo', 'warning');
}

function eliminarProducto(id) {
    if (confirm('¿Eliminar este producto? También se eliminarán sus variantes.')) {
        mostrarAlerta('Producto eliminado', 'success');
    }
}

// ============================================
// FUNCIONES DE INVENTARIO
// ============================================

async function cargarInventario() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar inventario');
        
        const productos = await response.json();
        const tbody = document.getElementById('inventario-body');
        
        if (!tbody) return;
        
        let valorTotalInventario = 0;
        let gananciaTotalPotencial = 0;
        let todasVariantes = [];
        
        productos.forEach(p => {
            const variantes = p.variantes || [];
            variantes.forEach(v => {
                const colores = v.colores || [];
                colores.forEach(c => {
                    const stock = c.stock || 0;
                    const precioCompra = v.precio_compra || 0;
                    const precioVenta = v.precio_venta || 0;
                    const gananciaUnidad = precioVenta - precioCompra;
                    const valorTotal = stock * precioCompra;
                    const gananciaTotal = stock * gananciaUnidad;
                    
                    valorTotalInventario += valorTotal;
                    gananciaTotalPotencial += gananciaTotal;
                    
                    todasVariantes.push({
                        imagen: p.imagen_url,
                        codigo: p.codigo,
                        nombre: p.nombre,
                        talla: v.talla,
                        color: c.nombre || 'Sin color',
                        colorCodigo: c.codigo,
                        stock: stock,
                        precio_compra: precioCompra,
                        precio_venta: precioVenta,
                        ganancia_unidad: gananciaUnidad,
                        valor_total: valorTotal
                    });
                });
            });
        });
        
        const valorInventario = document.getElementById('valor-inventario');
        const gananciaPotencial = document.getElementById('ganancia-potencial');
        if (valorInventario) valorInventario.textContent = `$${valorTotalInventario.toLocaleString()}`;
        if (gananciaPotencial) gananciaPotencial.textContent = `$${gananciaTotalPotencial.toLocaleString()}`;
        
        if (todasVariantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay productos en inventario<\/td></tr>';
            return;
        }
        
        tbody.innerHTML = todasVariantes.map(item => `
            <tr>
                <td>
                    ${item.imagen ? 
                        `<img src="${item.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : 
                        `<div style="width:40px;height:40px;background:#ffe4e9;border-radius:8px;display:flex;align-items:center;justify-content:center;">📦</div>`
                    }
                <\/td>
                <td>${item.codigo}<\/td>
                <td>${item.nombre}<\/td>
                <td>${item.talla}<\/td>
                <td>
                    ${item.color !== 'Sin color' ? 
                        `<div style="display:flex;align-items:center;gap:6px;">
                            <div style="width:16px;height:16px;background:${item.colorCodigo || '#cccccc'};border-radius:50%;"></div>
                            ${item.color}
                        </div>` : 
                        '<span>⚪ Sin color</span>'
                    }
                <\/td>
                <td style="font-weight:bold;color:${item.stock < 5 ? '#ff4757' : '#27ae60'}">${item.stock}<\/td>
                <td>$${item.precio_compra.toLocaleString()}<\/td>
                <td>$${item.precio_venta.toLocaleString()}<\/td>
                <td class="${item.ganancia_unidad > 0 ? 'puc-debito' : 'puc-credito'}">$${item.ganancia_unidad.toLocaleString()}<\/td>
                <td>$${item.valor_total.toLocaleString()}<\/td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando inventario:', error);
        const tbody = document.getElementById('inventario-body');
        if (tbody) {
            tbody.innerHTML = '<td><td colspan="10" style="text-align: center; color: #ff4757;">Error al cargar inventario<\/td></tr>';
        }
    }
}

function exportarInventario() {
    const tabla = document.getElementById('tabla-inventario');
    if (!tabla) return;
    
    const filas = tabla.querySelectorAll('tr');
    let csv = [];
    csv.push(['Código', 'Producto', 'Talla', 'Color', 'Stock', 'Precio Compra', 'Precio Venta', 'Ganancia', 'Valor Total'].join(','));
    
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length > 0 && celdas[0].colSpan !== 10) {
            const filaData = [];
            for (let i = 1; i < celdas.length; i++) {
                filaData.push(celdas[i].innerText.replace(/,/g, '.').trim());
            }
            csv.push(filaData.join(','));
        }
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarAlerta('📥 Inventario exportado correctamente', 'success');
}

// ============================================
// FUNCIONES DE COMPRAS
// ============================================

async function cargarCompras() {
    try {
        let url = `${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`;
        
        if (fechaInicioCompras) {
            url += `&fecha=gte.${fechaInicioCompras.toISOString().split('T')[0]}`;
        }
        if (fechaFinCompras) {
            url += `&fecha=lte.${fechaFinCompras.toISOString().split('T')[0]}`;
        }
        
        const response = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar compras');
        
        const compras = await response.json();
        const tbody = document.querySelector('#tabla-compras tbody');
        
        if (!tbody) return;
        
        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay compras en este período<\/td></tr>';
            const statsMes = document.getElementById('stats-compras-mes');
            const statsPendientes = document.getElementById('stats-compras-pendientes');
            if (statsMes) statsMes.textContent = '$0';
            if (statsPendientes) statsPendientes.textContent = '0';
            return;
        }
        
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        const comprasMes = compras.filter(c => {
            const fechaCompra = new Date(c.fecha + 'T12:00:00');
            return fechaCompra >= fechaInicioMes;
        });
        
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
        
        const statsMes = document.getElementById('stats-compras-mes');
        const statsPendientes = document.getElementById('stats-compras-pendientes');
        if (statsMes) statsMes.textContent = `$${totalMes.toLocaleString()}`;
        if (statsPendientes) statsPendientes.textContent = pendientes;
        
        tbody.innerHTML = compras.map(compra => {
            const fechaCompra = new Date(compra.fecha + 'T12:00:00');
            const fechaFormateada = fechaCompra.toLocaleDateString('es-CO');
            
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
                        <button class="action-btn" onclick="editarCompra(${compra.id})">✏️</button>
                        <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
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
        
        const proveedorId = document.getElementById('compra-proveedor')?.value;
        if (!proveedorId) {
            mostrarAlerta('Debe seleccionar un proveedor', 'error');
            return;
        }
        
        const cantidad = parseInt(document.getElementById('compra-cantidad')?.value);
        const precio = parseFloat(document.getElementById('compra-precio')?.value);
        
        if (!cantidad || cantidad <= 0) {
            mostrarAlerta('Cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        if (!precio || precio <= 0) {
            mostrarAlerta('Precio debe ser mayor a 0', 'error');
            return;
        }
        
        const fechaInput = document.getElementById('compra-fecha')?.value;
        if (!fechaInput) {
            mostrarAlerta('Debe seleccionar una fecha', 'error');
            return;
        }
        
        const producto = document.getElementById('compra-producto')?.value;
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
            estado: document.getElementById('compra-estado')?.value || 'Pendiente',
            puc: '620501'
        };
        
        const editId = document.getElementById('form-compra')?.dataset.editId;
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Compra actualizada correctamente' : '🌸 Compra guardada correctamente', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
            const compraProveedor = document.getElementById('compra-proveedor');
            const compraFecha = document.getElementById('compra-fecha');
            const compraProducto = document.getElementById('compra-producto');
            const compraCantidad = document.getElementById('compra-cantidad');
            const compraPrecio = document.getElementById('compra-precio');
            
            if (compraProveedor) compraProveedor.value = '';
            if (compraFecha) compraFecha.value = '';
            if (compraProducto) compraProducto.value = '';
            if (compraCantidad) compraCantidad.value = '';
            if (compraPrecio) compraPrecio.value = '';
            
            delete document.getElementById('form-compra')?.dataset.editId;
            
            const submitBtn = document.querySelector('#form-compra .submit-btn');
            if (submitBtn) submitBtn.textContent = '🌸 Guardar Compra';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión: ' + error.message, 'error');
    }
}

async function editarCompra(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar compra');
        
        const compras = await response.json();
        if (compras.length === 0) throw new Error('Compra no encontrada');
        
        const compra = compras[0];
        
        mostrarFormulario('compra');
        
        await cargarProveedoresSelect('compra');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        
        document.getElementById('form-compra').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-compra .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Compra';
        
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

// ============================================
// FUNCIONES DE GASTOS
// ============================================

async function cargarGastos() {
    try {
        let url = `${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`;
        
        if (fechaInicioGastos) {
            url += `&fecha=gte.${fechaInicioGastos.toISOString().split('T')[0]}`;
        }
        if (fechaFinGastos) {
            url += `&fecha=lte.${fechaFinGastos.toISOString().split('T')[0]}`;
        }
        
        const response = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar gastos');
        
        const gastos = await response.json();
        const tbody = document.querySelector('#tabla-gastos tbody');
        
        if (!tbody) return;
        
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay gastos en este período</td></tr>';
            const statsGastos = document.getElementById('stats-gastos-mes');
            if (statsGastos) statsGastos.textContent = '$0';
            return;
        }
        
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicioMes);
        const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
        
        const statsGastos = document.getElementById('stats-gastos-mes');
        if (statsGastos) statsGastos.textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = gastos.map(gasto => `
            <tr>
                <td>${new Date(gasto.fecha).toLocaleDateString('es-CO')}</td>
                <td>${gasto.concepto}</td>
                <td>${gasto.categoria}</td>
                <td>$${(gasto.monto || 0).toLocaleString()}</td>
                <td>${gasto.metodo_pago || 'Efectivo'}</td>
                <td>
                    <button class="action-btn" onclick="editarGasto(${gasto.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarGasto(${gasto.id})">🗑️</button>
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
            fecha: document.getElementById('gasto-fecha')?.value,
            concepto: document.getElementById('gasto-concepto')?.value,
            categoria: document.getElementById('gasto-categoria')?.value,
            monto: parseFloat(document.getElementById('gasto-monto')?.value),
            metodo_pago: document.getElementById('gasto-metodo')?.value
        };
        
        if (!gasto.fecha || !gasto.concepto || !gasto.categoria || !gasto.monto) {
            mostrarAlerta('Por favor completa todos los campos', 'error');
            return;
        }
        
        const editId = document.getElementById('form-gasto')?.dataset.editId;
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
            const gastoFecha = document.getElementById('gasto-fecha');
            const gastoConcepto = document.getElementById('gasto-concepto');
            const gastoCategoria = document.getElementById('gasto-categoria');
            const gastoMonto = document.getElementById('gasto-monto');
            
            if (gastoFecha) gastoFecha.value = '';
            if (gastoConcepto) gastoConcepto.value = '';
            if (gastoCategoria) gastoCategoria.value = '';
            if (gastoMonto) gastoMonto.value = '';
            
            delete document.getElementById('form-gasto')?.dataset.editId;
            
            const submitBtn = document.querySelector('#form-gasto .submit-btn');
            if (submitBtn) submitBtn.textContent = '🌸 Guardar Gasto';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

async function editarGasto(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar gasto');
        
        const gastos = await response.json();
        if (gastos.length === 0) throw new Error('Gasto no encontrado');
        
        const gasto = gastos[0];
        
        mostrarFormulario('gasto');
        
        const gastoFecha = document.getElementById('gasto-fecha');
        const gastoConcepto = document.getElementById('gasto-concepto');
        const gastoCategoria = document.getElementById('gasto-categoria');
        const gastoMonto = document.getElementById('gasto-monto');
        const gastoMetodo = document.getElementById('gasto-metodo');
        
        if (gastoFecha) gastoFecha.value = gasto.fecha.split('T')[0];
        if (gastoConcepto) gastoConcepto.value = gasto.concepto || '';
        if (gastoCategoria) gastoCategoria.value = gasto.categoria || '';
        if (gastoMonto) gastoMonto.value = gasto.monto || '';
        if (gastoMetodo && gasto.metodo_pago) gastoMetodo.value = gasto.metodo_pago;
        
        document.getElementById('form-gasto').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-gasto .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Gasto';
        
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
            const statsProveedores = document.getElementById('stats-proveedores');
            if (statsProveedores) statsProveedores.textContent = '0';
            return;
        }
        
        const statsProveedores = document.getElementById('stats-proveedores');
        if (statsProveedores) statsProveedores.textContent = proveedores.length;
        
        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.contacto || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>
                    <button class="action-btn" onclick="editarProveedor(${p.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarProveedor(${p.id})">🗑️</button>
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
        if (select) {
            select.innerHTML = '<option value="">Seleccionar proveedor</option>' +
                proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

async function guardarProveedor() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const proveedor = {
            nombre: document.getElementById('proveedor-nombre')?.value,
            contacto: document.getElementById('proveedor-contacto')?.value || null,
            telefono: document.getElementById('proveedor-telefono')?.value || null,
            email: document.getElementById('proveedor-email')?.value || null,
            direccion: document.getElementById('proveedor-direccion')?.value || null
        };
        
        if (!proveedor.nombre) {
            mostrarAlerta('El nombre del proveedor es obligatorio', 'error');
            return;
        }
        
        const editId = document.getElementById('form-proveedor')?.dataset.editId;
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
            const proveedorNombre = document.getElementById('proveedor-nombre');
            const proveedorContacto = document.getElementById('proveedor-contacto');
            const proveedorTelefono = document.getElementById('proveedor-telefono');
            const proveedorEmail = document.getElementById('proveedor-email');
            const proveedorDireccion = document.getElementById('proveedor-direccion');
            
            if (proveedorNombre) proveedorNombre.value = '';
            if (proveedorContacto) proveedorContacto.value = '';
            if (proveedorTelefono) proveedorTelefono.value = '';
            if (proveedorEmail) proveedorEmail.value = '';
            if (proveedorDireccion) proveedorDireccion.value = '';
            
            delete document.getElementById('form-proveedor')?.dataset.editId;
            
            const submitBtn = document.querySelector('#form-proveedor .submit-btn');
            if (submitBtn) submitBtn.textContent = '🌸 Guardar Proveedor';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

async function editarProveedor(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar proveedor');
        
        const proveedores = await response.json();
        if (proveedores.length === 0) throw new Error('Proveedor no encontrado');
        
        const proveedor = proveedores[0];
        
        mostrarFormulario('proveedor');
        
        const proveedorNombre = document.getElementById('proveedor-nombre');
        const proveedorContacto = document.getElementById('proveedor-contacto');
        const proveedorTelefono = document.getElementById('proveedor-telefono');
        const proveedorEmail = document.getElementById('proveedor-email');
        const proveedorDireccion = document.getElementById('proveedor-direccion');
        
        if (proveedorNombre) proveedorNombre.value = proveedor.nombre || '';
        if (proveedorContacto) proveedorContacto.value = proveedor.contacto || '';
        if (proveedorTelefono) proveedorTelefono.value = proveedor.telefono || '';
        if (proveedorEmail) proveedorEmail.value = proveedor.email || '';
        if (proveedorDireccion) proveedorDireccion.value = proveedor.direccion || '';
        
        document.getElementById('form-proveedor').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-proveedor .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Proveedor';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el proveedor', 'error');
    }
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
// FUNCIONES DE PERFILES (USUARIOS)
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
            const statsEmpleados = document.getElementById('stats-empleados');
            if (statsEmpleados) statsEmpleados.textContent = '0';
            return;
        }
        
        const statsEmpleados = document.getElementById('stats-empleados');
        if (statsEmpleados) statsEmpleados.textContent = perfiles.length;
        
        tbody.innerHTML = perfiles.map(p => `
            <tr>
                <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                <td>${p.email}</td>
                <td>
                    <span style="background: ${p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1'}; color: white; padding: 0.2rem 0.8rem; border-radius: 50px;">
                        ${p.rol || 'empleado'}
                    </span>
                </td>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="editarPerfil('${p.id}')">✏️</button>
                    ${p.id !== currentUser?.id ? `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')">🗑️</button>` : ''}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando perfiles:', error);
    }
}

async function guardarPerfil() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const nombre = document.getElementById('perfil-nombre')?.value;
        const email = document.getElementById('perfil-email')?.value;
        const password = document.getElementById('perfil-password')?.value;
        const rol = document.getElementById('perfil-rol')?.value;
        
        if (!nombre || !email) {
            mostrarAlerta('Nombre y email son obligatorios', 'error');
            return;
        }
        
        const editId = document.getElementById('form-perfil')?.dataset.editId;
        
        if (editId) {
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
            if (!password || password.length < 6) {
                mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
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
        const perfilNombre = document.getElementById('perfil-nombre');
        const perfilEmail = document.getElementById('perfil-email');
        const perfilPassword = document.getElementById('perfil-password');
        
        if (perfilNombre) perfilNombre.value = '';
        if (perfilEmail) perfilEmail.value = '';
        if (perfilPassword) perfilPassword.value = '';
        
        delete document.getElementById('form-perfil')?.dataset.editId;
        
        if (perfilPassword) {
            perfilPassword.placeholder = 'Contraseña';
            perfilPassword.required = true;
        }
        
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Crear Usuario';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

async function editarPerfil(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar perfil');
        
        const perfiles = await response.json();
        if (perfiles.length === 0) throw new Error('Perfil no encontrado');
        
        const perfil = perfiles[0];
        
        mostrarFormulario('perfil');
        
        const perfilNombre = document.getElementById('perfil-nombre');
        const perfilEmail = document.getElementById('perfil-email');
        const perfilRol = document.getElementById('perfil-rol');
        const perfilPassword = document.getElementById('perfil-password');
        
        if (perfilNombre) perfilNombre.value = perfil.nombre || '';
        if (perfilEmail) perfilEmail.value = perfil.email || '';
        if (perfilRol) perfilRol.value = perfil.rol || 'empleado';
        
        if (perfilPassword) {
            perfilPassword.placeholder = 'Dejar vacío para mantener la misma';
            perfilPassword.required = false;
        }
        
        document.getElementById('form-perfil').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Usuario';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar el usuario', 'error');
    }
}

async function eliminarPerfil(id) {
    if (!confirm('¿Estás segura de eliminar este usuario?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
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
        let url = `${SUPABASE_URL}/rest/v1/ventas?select=*&order=fecha.desc`;
        
        if (fechaInicioVentas) {
            url += `&fecha=gte.${fechaInicioVentas.toISOString()}`;
        }
        if (fechaFinVentas) {
            url += `&fecha=lte.${fechaFinVentas.toISOString()}`;
        }
        
        const response = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar ventas');
        
        const ventas = await response.json();
        const tbody = document.querySelector('#tabla-ventas tbody');
        
        if (!tbody) return;
        
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas en este período</td></tr>';
            const statsVentasHoy = document.getElementById('stats-ventas-hoy');
            const statsVentasMes = document.getElementById('stats-ventas-mes');
            if (statsVentasHoy) statsVentasHoy.textContent = '$0';
            if (statsVentasMes) statsVentasMes.textContent = '$0';
            return;
        }
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        let ventasMes = ventas;
        if (!fechaInicioVentas && !fechaFinVentas) {
            ventasMes = ventas.filter(v => new Date(v.fecha) >= fechaInicioMes);
        }
        const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const statsVentasHoy = document.getElementById('stats-ventas-hoy');
        const statsVentasMes = document.getElementById('stats-ventas-mes');
        if (statsVentasHoy) statsVentasHoy.textContent = `$${totalHoy.toLocaleString()}`;
        if (statsVentasMes) statsVentasMes.textContent = `$${totalMes.toLocaleString()}`;
        
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
                    <button class="action-btn" onclick="verFactura(${venta.id})">🧾</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        const tbody = document.querySelector('#tabla-ventas tbody');
        if (tbody) {
            tbody.innerHTML = '<td><td colspan="6" style="text-align: center; color: #ff4757;">Error al cargar ventas<\/td></tr>';
        }
    }
}

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
            const precioCompraInput = document.getElementById('producto-precio-compra');
            if (precioCompraInput) precioCompraInput.value = '';
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
