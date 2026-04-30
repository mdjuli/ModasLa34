// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34
// VERSIÓN COMPLETA CON FILTROS Y ORDENAMIENTO
// ============================================

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentModule = 'productos';
let varianteCount = 0;
let carrito = [];
let productosData = [];
let ventasData = [];

// Variables para ordenamiento
let sortColumn = 'fecha';
let sortDirection = 'desc';
let sortProductosColumn = 'nombre';
let sortProductosDirection = 'asc';

// ===== FUNCIONES DE INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    
    // Configurar eventos de teclado para cerrar modales con ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            cerrarTodosModales();
        }
    });
    
    // Cargar primer módulo permitido
    const primerModulo = getPrimerModuloVisible();
    cambiarModulo(primerModulo, null);
    
    // Inicializar variantes si el formulario existe
    setTimeout(() => {
        if (document.getElementById('variantes-container')) {
            agregarVariante();
        }
    }, 500);
});

function cerrarTodosModales() {
    const modales = document.querySelectorAll('.form-modal, .modal');
    modales.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
}

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
        
        // Mostrar nombre
        const userNameSpan = document.getElementById('userNameDisplay');
        if (userNameSpan) {
            userNameSpan.textContent = perfil[0]?.nombre || user.email || 'Administradora';
        }
        
        // Cargar permisos (desde permisos.js)
        if (typeof cargarPermisosUsuario === 'function') {
            await cargarPermisosUsuario(user.id);
            if (typeof aplicarPermisosUI === 'function') aplicarPermisosUI();
            if (typeof filtrarModulosPorPermisos === 'function') filtrarModulosPorPermisos();
        }
        
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
    
    const seccionActiva = document.getElementById(`modulo-${modulo}`);
    if (seccionActiva) {
        seccionActiva.style.display = 'block';
    }
    
    if (event) {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }
    
    currentModule = modulo;
    
    // Cargar datos del módulo
    cargarDatosModulo(modulo);
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos':
            await cargarProductos();
            break;
        case 'stock':
            await cargarStock();
            break;
        case 'compras':
            await cargarCompras();
            await cargarProveedoresSelect('compra');
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
            if (typeof cargarContabilidad === 'function') cargarContabilidad();
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
// FUNCIONES PARA PRODUCTOS
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
                <input type="text" id="color-hex-text-${colorId}" value="#ff0000" placeholder="Código hex" class="color-hex-text" style="flex: 1; min-width: 100px;">
                <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color" class="color-nombre-input" style="flex: 2; min-width: 120px;">
                <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input" style="width: 80px;">
                <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
    
    const colorPicker = document.getElementById(`color-hex-${colorId}`);
    const colorText = document.getElementById(`color-hex-text-${colorId}`);
    
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function() { colorText.value = this.value; });
        colorText.addEventListener('input', function() {
            let value = this.value;
            if (!value.startsWith('#')) value = '#' + value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) colorPicker.value = value;
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
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input">
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
                        colores.push({ nombre: null, codigo: null, stock: stock });
                    }
                } else {
                    const nombreInput = document.getElementById(`color-nombre-${colorId}`);
                    const hexTextInput = document.getElementById(`color-hex-text-${colorId}`);
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    
                    let hexValue = hexTextInput?.value || '#ff0000';
                    if (!hexValue.startsWith('#')) hexValue = '#' + hexValue;
                    if (!/^#[0-9A-Fa-f]{6}$/.test(hexValue)) hexValue = '#cccccc';
                    
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
            colores.push({ nombre: 'Sin color', codigo: '#cccccc', stock: 0 });
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
        
        // ========== NUEVA FUNCIÓN PARA GENERAR SKU LEGIBLE ==========
        
        // Mapa de tallas a códigos de 1 letra/número
        const mapaTallas = {
            'XS': 'A', 'S': 'B', 'M': 'C', 'L': 'D', 'XL': 'E',
            'XXL': 'F', 'XXXL': 'G', '2XL': 'F', '3XL': 'G',
            '6': '6', '7': '7', '8': '8', '9': '9', '10': '0', 
            '11': '1', '12': '2', '34': 'a', '35': 'b', '36': 'c', 
            '37': 'd', '38': 'e', '39': 'f', '40': 'g', '41': 'h', 
            '42': 'i', '43': 'j', '44': 'k'
        };
        
        let variantesGuardadas = 0;
        
        for (const variante of variantes) {
            // Obtener código de talla (1 carácter)
            const tallaCode = mapaTallas[variante.talla] || variante.talla.charAt(0);
            
            // Obtener código de color (si existe)
            let colorCode = '';
            if (variante.colores && variante.colores.length > 0) {
                const primerColor = variante.colores[0];
                if (primerColor.nombre && primerColor.nombre !== 'Sin color') {
                    colorCode = primerColor.nombre.charAt(0).toUpperCase();
                }
            }
            
            // Generar SKU base: MODA-{IDproducto}{talla}{color}
            const skuBase = `MODA-${productoId}${tallaCode}${colorCode}`;
            
            // Verificar si el SKU ya existe (para evitar duplicados en variantes múltiples)
            let skuFinal = skuBase;
            let contador = 2;
            
            const existeRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?sku=eq.${skuFinal}`, {
                headers: { 'apikey': SUPABASE_KEY }
            });
            let existe = await existeRes.json();
            
            while (existe.length > 0) {
                skuFinal = `${skuBase}${contador}`;
                const resNuevo = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?sku=eq.${skuFinal}`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                existe = await resNuevo.json();
                contador++;
            }
            
            const varianteData = {
                producto_id: productoId,
                talla: variante.talla,
                colores: variante.colores,
                stock_total: variante.stock_total,
                precio_venta: variante.precio_venta,
                precio_compra: variante.precio_compra,
                sku: skuFinal  // ← SKU LEGIBLE (ej: MODA-15C)
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
            
            if (varResponse.ok) {
                variantesGuardadas++;
                console.log(`✅ Variante ${variante.talla} guardada con SKU: ${skuFinal}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        mostrarAlerta(`🌸 Producto ${editId ? 'actualizado' : 'guardado'} con ${variantesGuardadas} variantes`, 'success');
        
        cerrarFormulario('producto');
        await cargarProductos();
        
        // Limpiar formulario
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
        if (submitBtn) submitBtn.textContent = '🌸 Guardar Producto';
        
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
        
        productosData = await response.json();
        ordenarProductos('nombre');
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.querySelector('#tabla-productos tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Error al cargar productos</td></tr>';
    }
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
    
    mostrarProductosOrdenados(productosOrdenados);
}

function mostrarProductosOrdenados(productos) {
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
        const precioMin = Math.min(...variantes.map(v => v.precio_venta || Infinity));
        const precioMax = Math.max(...variantes.map(v => v.precio_venta || 0));
        const precioTexto = precioMin === Infinity ? 'N/A' : (precioMin === precioMax ? `$${precioMin.toLocaleString()}` : `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`);
        
        return `
            <tr>
                <td>
                    ${p.imagen_url ? 
                        `<img src="${p.imagen_url}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">` : 
                        `<div style="width:50px;height:50px;background:#ffe4e9;border-radius:10px;display:flex;align-items:center;justify-content:center;">${getEmojiCategoria(p.categoria)}</div>`
                    }
                </td>
                <td>${p.codigo || '-'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td><span style="background:#ffe4e9;padding:0.2rem 0.8rem;border-radius:50px;">${p.categoria || '-'}</span></td>
                <td>${variantes.length} tallas</td>
                <td>${totalStock}</td>
                <td>${precioTexto}</td>
                <td>
                    <button class="action-btn" onclick="editarProducto(${p.id})">✏️</button>
                    <button class="action-btn" onclick="verVariantes(${p.id})">📋</button>
                    <button class="action-btn" onclick="imprimirEtiquetasProducto(${p.id})">🏷️</button>
                    <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})">🗑️</button>
                </td>
             </tr>
        `;
    }).join('');
    
    // Aplicar filtros después de mostrar
    setTimeout(() => aplicarFiltrosProductos(), 100);
}

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
                                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                                    <div>
                                        <label>📏 Talla:</label>
                                        <input type="text" id="variante-${varianteId}-talla" value="${v.talla}" required>
                                    </div>
                                    <div>
                                        <label>💰 Precio de venta:</label>
                                        <input type="number" id="variante-${varianteId}-precio" value="${v.precio_venta}" required style="width: 120px;">
                                    </div>
                                </div>
                                <button type="button" onclick="eliminarVariante(${varianteId})" class="btn-eliminar-talla">✖️ Eliminar talla</button>
                            </div>
                            <div style="margin-top: 1rem;">
                                <label>🎨 Colores y stock:</label>
                                <div id="colores-${varianteId}-container" class="colores-container"></div>
                                <div>
                                    <button type="button" onclick="agregarColorAVariante(${varianteId})" class="btn-agregar-color">➕ Agregar color</button>
                                    <button type="button" onclick="agregarSinColor(${varianteId})" class="btn-sin-color">⚪ Sin color</button>
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', varianteHTML);
                    
                    const coloresContainer = document.getElementById(`colores-${varianteId}-container`);
                    const colores = v.colores || [];
                    
                    colores.forEach(color => {
                        const colorId = `${varianteId}-${Date.now()}-${Math.random()}`;
                        let colorHTML = '';
                        
                        if (color.nombre === null && color.codigo === null) {
                            colorHTML = `
                                <div class="color-row sin-color-item" id="color-${colorId}">
                                    <span>⚪</span>
                                    <span style="flex:1;">Sin color específico</span>
                                    <input type="number" id="color-stock-${colorId}" value="${color.stock}" class="color-stock-input" style="width:80px;">
                                    <button type="button" onclick="eliminarColor('${colorId}')">🗑️</button>
                                </div>
                            `;
                        } else {
                            colorHTML = `
                                <div class="color-row" id="color-${colorId}">
                                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; width:100%;">
                                        <input type="color" id="color-hex-${colorId}" value="${color.codigo || '#ff0000'}" style="width:50px;">
                                        <input type="text" id="color-hex-text-${colorId}" value="${color.codigo || '#ff0000'}">
                                        <input type="text" id="color-nombre-${colorId}" value="${color.nombre || ''}">
                                        <input type="number" id="color-stock-${colorId}" value="${color.stock}" style="width:80px;">
                                        <button type="button" onclick="eliminarColor('${colorId}')">🗑️</button>
                                    </div>
                                </div>
                            `;
                        }
                        coloresContainer.insertAdjacentHTML('beforeend', colorHTML);
                    });
                    
                    if (colores.length === 0) agregarColorAVariante(varianteId);
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
        mensaje += `Categoría: ${producto.categoria}\n\n`;
        
        variantes.forEach(v => {
            mensaje += `📏 TALLA: ${v.talla}\n`;
            mensaje += `💰 Precio venta: $${v.precio_venta.toLocaleString()}\n`;
            mensaje += `💰 Precio compra: $${(v.precio_compra || 0).toLocaleString()}\n`;
            
            const colores = v.colores || [];
            if (colores.length > 0) {
                mensaje += `🎨 Colores:\n`;
                colores.forEach(c => {
                    mensaje += `   • ${c.nombre || 'Sin color'} - Stock: ${c.stock}\n`;
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
// FILTROS PARA PRODUCTOS
// ============================================

function configurarFiltrosProductos() {
    const searchInput = document.getElementById('search-productos');
    const categoriaSelect = document.getElementById('filter-categoria-productos');
    const stockSelect = document.getElementById('filter-stock-productos');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosProductos());
    if (categoriaSelect) categoriaSelect.addEventListener('change', () => aplicarFiltrosProductos());
    if (stockSelect) stockSelect.addEventListener('change', () => aplicarFiltrosProductos());
}

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
        if (mostrar && stockFilter === 'normal' && stock < 5) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
        if (mostrar) visibleCount++;
    });
    
    const filterStats = document.querySelector('#modulo-productos .filter-stats');
    if (filterStats) filterStats.textContent = `${visibleCount} productos`;
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

// ============================================
// FUNCIONES PARA STOCK
// ============================================

async function cargarStock() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const productos = await response.json();
        
        let productosStockBajo = [];
        let productosAgotados = [];
        let productosNormales = 0;
        
        productos.forEach(producto => {
            const variantes = producto.variantes || [];
            
            variantes.forEach(variante => {
                const colores = variante.colores || [];
                
                if (colores.length > 0) {
                    colores.forEach(color => {
                        const stock = color.stock || 0;
                        const item = {
                            producto_id: producto.id,
                            producto_nombre: producto.nombre,
                            producto_codigo: producto.codigo,
                            talla: variante.talla,
                            color: color.nombre || 'Sin color',
                            color_codigo: color.codigo || '#ccc',
                            stock: stock,
                            precio_venta: variante.precio_venta
                        };
                        
                        if (stock === 0) {
                            productosAgotados.push(item);
                        } else if (stock < 5) {
                            productosStockBajo.push(item);
                        } else {
                            productosNormales++;
                        }
                    });
                } else {
                    const stock = variante.stock_total || 0;
                    const item = {
                        producto_id: producto.id,
                        producto_nombre: producto.nombre,
                        producto_codigo: producto.codigo,
                        talla: variante.talla,
                        color: 'N/A',
                        color_codigo: '#ccc',
                        stock: stock,
                        precio_venta: variante.precio_venta
                    };
                    
                    if (stock === 0) {
                        productosAgotados.push(item);
                    } else if (stock < 5) {
                        productosStockBajo.push(item);
                    } else {
                        productosNormales++;
                    }
                }
            });
        });
        
        const stockBajoCount = document.getElementById('stock-bajo-count');
        const stockAgotadoCount = document.getElementById('stock-agotado-count');
        const stockNormalCount = document.getElementById('stock-normal-count');
        
        if (stockBajoCount) stockBajoCount.textContent = productosStockBajo.length;
        if (stockAgotadoCount) stockAgotadoCount.textContent = productosAgotados.length;
        if (stockNormalCount) stockNormalCount.textContent = productosNormales;
        
        const stockBajoBody = document.getElementById('stock-bajo-body');
        if (stockBajoBody) {
            if (productosStockBajo.length === 0) {
                stockBajoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">✅ No hay productos con stock bajo</td></tr>';
            } else {
                stockBajoBody.innerHTML = productosStockBajo.map(item => `
                    <tr class="stock-bajo-row">
                        <td><strong>${item.producto_nombre}</strong><br><small>${item.producto_codigo}</small></td>
                        <td>${item.talla}</td>
                        <td><div style="display: flex; align-items: center; gap: 8px;"><div style="width: 20px; height: 20px; background: ${item.color_codigo}; border-radius: 50%;"></div>${item.color}</div></td>
                        <td class="stock-critico">${item.stock} unidades</td>
                        <td>5</td>
                        <td><button class="action-btn" onclick="solicitarReposicion(${item.producto_id}, '${item.producto_nombre}', '${item.talla}', '${item.color}')">📦 Pedir</button></td>
                    </tr>
                `).join('');
            }
        }
        
        const stockAgotadoBody = document.getElementById('stock-agotado-body');
        if (stockAgotadoBody) {
            if (productosAgotados.length === 0) {
                stockAgotadoBody.innerHTML = '<td><td colspan="5" style="text-align: center;">🎉 Todos los productos tienen stock disponible</td></tr>';
            } else {
                stockAgotadoBody.innerHTML = productosAgotados.map(item => `
                    <tr class="stock-agotado-row">
                        <td><strong>${item.producto_nombre}</strong><br><small>${item.producto_codigo}</small></td>
                        <td>${item.talla}</td>
                        <td><div style="display: flex; align-items: center; gap: 8px;"><div style="width: 20px; height: 20px; background: ${item.color_codigo}; border-radius: 50%;"></div>${item.color}</div></td>
                        <td class="stock-agotado">AGOTADO</td>
                        <td><button class="action-btn" onclick="solicitarReposicion(${item.producto_id}, '${item.producto_nombre}', '${item.talla}', '${item.color}')">📦 Solicitar</button></td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error cargando stock:', error);
    }
}

function solicitarReposicion(productoId, nombre, talla, color) {
    const mensaje = `📦 REPOSICIÓN DE STOCK\n\nProducto: ${nombre}\nTalla: ${talla}\nColor: ${color}\n\nPor favor, gestionar reposición.`;
    alert(`📋 Solicitud de reposición:\n\n${mensaje}`);
}

// ============================================
// FUNCIONES PARA VENTAS CON ORDENAMIENTO
// ============================================

async function cargarVentas() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar ventas');
        
        ventasData = await response.json();
        
        // Calcular totales
        const hoy = new Date().toISOString().split('T')[0];
        const ventasHoy = ventasData.filter(v => v.fecha?.split('T')[0] === hoy);
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        const ventasMes = ventasData.filter(v => new Date(v.fecha) >= fechaInicio);
        const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const cambiosCount = ventasData.filter(v => v.estado === 'cambiado' || v.estado === 'devuelto').length;
        
        const ventasHoyTotal = document.getElementById('ventas-hoy-total');
        const ventasMesTotal = document.getElementById('ventas-mes-total');
        const ventasCambiosCount = document.getElementById('ventas-cambios-count');
        
        if (ventasHoyTotal) ventasHoyTotal.textContent = `$${totalHoy.toLocaleString()}`;
        if (ventasMesTotal) ventasMesTotal.textContent = `$${totalMes.toLocaleString()}`;
        if (ventasCambiosCount) ventasCambiosCount.textContent = cambiosCount;
        
        // Ordenar por fecha descendente (más recientes primero)
        ordenarVentas('fecha');
        
        // Configurar filtros
        setTimeout(() => configurarFiltrosVentas(), 100);
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('ventas-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ff4757;">Error al cargar ventas</td></tr>';
    }
}

function ordenarVentas(columna) {
    if (sortColumn === columna) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columna;
        sortDirection = 'asc';
    }
    
    const ventasOrdenadas = [...ventasData];
    
    ventasOrdenadas.sort((a, b) => {
        let valA, valB;
        
        switch(columna) {
            case 'id':
                valA = a.id || 0;
                valB = b.id || 0;
                break;
            case 'fecha':
                valA = new Date(a.fecha);
                valB = new Date(b.fecha);
                break;
            case 'cliente':
                valA = (a.cliente || '').toLowerCase();
                valB = (b.cliente || '').toLowerCase();
                break;
            case 'total':
                valA = a.total || 0;
                valB = b.total || 0;
                break;
            case 'metodo':
                valA = (a.metodo_pago || '').toLowerCase();
                valB = (b.metodo_pago || '').toLowerCase();
                break;
            case 'estado':
                valA = (a.estado || '').toLowerCase();
                valB = (b.estado || '').toLowerCase();
                break;
            default:
                valA = a.fecha;
                valB = b.fecha;
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    mostrarVentasOrdenadas(ventasOrdenadas);
}

function mostrarVentasOrdenadas(ventas) {
    const tbody = document.getElementById('ventas-body');
    
    if (!tbody) return;
    
    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay ventas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = ventas.map(venta => {
        let estadoClass = '';
        let estadoText = '';
        
        switch(venta.estado) {
            case 'completada': estadoClass = 'estado-pagada'; estadoText = '✅ Completada'; break;
            case 'pendiente': estadoClass = 'estado-pendiente'; estadoText = '⏳ Pendiente'; break;
            case 'cambiado': estadoClass = 'estado-badge-cambiado'; estadoText = '🔄 Cambio solicitado'; break;
            case 'devuelto': estadoClass = 'estado-badge-devuelto'; estadoText = '📦 Devuelto'; break;
            default: estadoClass = 'estado-pagada'; estadoText = '✅ Completada';
        }
        
        const fecha = new Date(venta.fecha);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        
        return `
            <tr>
                <td><strong>#${venta.id}</strong></td>
                <td>${fechaStr}</td>
                <td>${venta.cliente || 'Consumidor final'}</td>
                <td>${venta.productos || '-'}</td>
                <td><strong>$${(venta.total || 0).toLocaleString()}</strong></td>
                <td>${venta.metodo_pago || 'Efectivo'}</td>
                <td><span class="estado-badge ${estadoClass}">${estadoText}</span></td>
                <td>
                    <button class="action-btn" onclick="verDetalleVenta(${venta.id})" title="Ver detalle">👁️</button>
                    <button class="action-btn" onclick="editarVenta(${venta.id})" title="Editar">✏️</button>
                    <button class="action-btn" onclick="solicitarCambio(${venta.id})" title="Solicitar cambio">🔄</button>
                    <button class="action-btn delete-btn" onclick="eliminarVenta(${venta.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// FILTROS PARA VENTAS
// ============================================

function configurarFiltrosVentas() {
    const searchInput = document.getElementById('search-ventas');
    const fechaInicio = document.getElementById('filter-fecha-inicio');
    const fechaFin = document.getElementById('filter-fecha-fin');
    const estadoSelect = document.getElementById('filter-estado-ventas');
    const metodoSelect = document.getElementById('filter-metodo-ventas');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosVentas());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosVentas());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosVentas());
    if (estadoSelect) estadoSelect.addEventListener('change', () => aplicarFiltrosVentas());
    if (metodoSelect) metodoSelect.addEventListener('change', () => aplicarFiltrosVentas());
}

function aplicarFiltrosVentas() {
    const rows = document.querySelectorAll('#tabla-ventas tbody tr');
    const searchTerm = document.getElementById('search-ventas')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-fecha-fin')?.value;
    const estado = document.getElementById('filter-estado-ventas')?.value || '';
    const metodo = document.getElementById('filter-metodo-ventas')?.value || '';
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        let mostrar = true;
        
        const id = row.cells[0]?.textContent || '';
        const cliente = row.cells[2]?.textContent.toLowerCase() || '';
        const productos = row.cells[3]?.textContent.toLowerCase() || '';
        const fechaTexto = row.cells[1]?.textContent || '';
        const estadoTexto = row.cells[6]?.textContent.toLowerCase() || '';
        const metodoTexto = row.cells[5]?.textContent || '';
        
        if (searchTerm && !id.includes(searchTerm) && !cliente.includes(searchTerm) && !productos.includes(searchTerm)) mostrar = false;
        
        if (mostrar && fechaInicio) {
            const fechaRow = new Date(fechaTexto);
            if (fechaRow < new Date(fechaInicio)) mostrar = false;
        }
        if (mostrar && fechaFin) {
            const fechaRow = new Date(fechaTexto);
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59);
            if (fechaRow > fechaFinObj) mostrar = false;
        }
        
        if (mostrar && estado && !estadoTexto.includes(estado.toLowerCase())) mostrar = false;
        if (mostrar && metodo && metodoTexto !== metodo) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
        if (mostrar) visibleCount++;
    });
    
    const filterStats = document.querySelector('#modulo-ventas .filter-stats');
    if (filterStats) filterStats.textContent = `${visibleCount} ventas`;
}

function limpiarFiltrosVentas() {
    const searchInput = document.getElementById('search-ventas');
    const fechaInicio = document.getElementById('filter-fecha-inicio');
    const fechaFin = document.getElementById('filter-fecha-fin');
    const estadoSelect = document.getElementById('filter-estado-ventas');
    const metodoSelect = document.getElementById('filter-metodo-ventas');
    
    if (searchInput) searchInput.value = '';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (estadoSelect) estadoSelect.value = '';
    if (metodoSelect) metodoSelect.value = '';
    aplicarFiltrosVentas();
}

// ============================================
// FUNCIONES DE VENTA RÁPIDA Y MANUAL
// ============================================

function abrirVentaRapida() {
    window.open('venta-rapida.html', '_blank');
}

function abrirNuevaVenta() {
    // Limpiar carrito
    carrito = [];
    if (typeof actualizarCarritoUIManual === 'function') {
        actualizarCarritoUIManual();
    }
    
    // Establecer fecha actual
    const fechaInput = document.getElementById('venta-fecha');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Limpiar campos
    const clienteInput = document.getElementById('venta-cliente');
    if (clienteInput) clienteInput.value = '';
    
    limpiarCamposProductoManual();
    
    // Mostrar el modal
    const formVenta = document.getElementById('form-venta');
    if (formVenta) {
        formVenta.style.display = 'flex';
        formVenta.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function limpiarCamposProductoManual() {
    const nombreInput = document.getElementById('venta-producto-nombre');
    const tallaInput = document.getElementById('venta-producto-talla');
    const colorInput = document.getElementById('venta-producto-color');
    const cantidadInput = document.getElementById('venta-producto-cantidad');
    const precioInput = document.getElementById('venta-producto-precio');
    
    if (nombreInput) nombreInput.value = '';
    if (tallaInput) tallaInput.value = '';
    if (colorInput) colorInput.value = '';
    if (cantidadInput) cantidadInput.value = '1';
    if (precioInput) precioInput.value = '';
}

function agregarProductoVentaManual() {
    const nombre = document.getElementById('venta-producto-nombre')?.value.trim();
    const talla = document.getElementById('venta-producto-talla')?.value.trim();
    const color = document.getElementById('venta-producto-color')?.value.trim();
    const cantidad = parseInt(document.getElementById('venta-producto-cantidad')?.value || '1');
    const precio = parseFloat(document.getElementById('venta-producto-precio')?.value);
    
    if (!nombre) {
        mostrarAlerta('❌ Escribe el nombre del producto', 'error');
        return;
    }
    
    if (!precio || precio <= 0) {
        mostrarAlerta('❌ Ingresa un precio válido', 'error');
        return;
    }
    
    if (!cantidad || cantidad < 1) {
        mostrarAlerta('❌ Ingresa una cantidad válida', 'error');
        return;
    }
    
    const subtotal = cantidad * precio;
    
    let textoMostrar = nombre;
    if (talla) textoMostrar += ` (Talla: ${talla})`;
    if (color) textoMostrar += ` - ${color}`;
    
    carrito.push({
        nombre: nombre,
        talla: talla || 'N/A',
        color: color || 'N/A',
        cantidad: cantidad,
        precio: precio,
        subtotal: subtotal,
        texto: textoMostrar
    });
    
    mostrarAlerta(`✅ Agregado: ${textoMostrar} x${cantidad} - $${subtotal.toLocaleString()}`, 'success');
    
    limpiarCamposProductoManual();
    document.getElementById('venta-producto-nombre')?.focus();
    actualizarCarritoUIManual();
}

function actualizarCarritoUIManual() {
    const tbody = document.getElementById('carrito-body');
    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    
    if (!tbody) return;
    
    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay productos agregados. Completa los campos arriba y haz clic en "Agregar".</td></tr>';
        const totalElement = document.getElementById('carrito-total');
        if (totalElement) totalElement.textContent = '$0';
        return;
    }
    
    tbody.innerHTML = carrito.map((item, idx) => `
        <tr>
            <td><strong>${escapeHtml(item.nombre)}</strong><br><small style="color: #888;">${item.talla !== 'N/A' ? `Talla: ${item.talla}` : ''} ${item.color !== 'N/A' ? `| Color: ${item.color}` : ''}</small></td>
            <td>${item.talla !== 'N/A' ? escapeHtml(item.talla) : '-'}</td>
            <td>${item.color !== 'N/A' ? escapeHtml(item.color) : '-'}</td>
            <td>$${item.precio.toLocaleString()}</td>
            <td><input type="number" class="cantidad-input" value="${item.cantidad}" min="1" onchange="actualizarCantidadCarritoManual(${idx}, this.value)" style="width: 70px;"></td>
            <td>$${item.subtotal.toLocaleString()}</td>
            <td><button class="btn-eliminar-item" onclick="eliminarItemCarritoManual(${idx})">🗑️</button></td>
        </tr>
    `).join('');
    
    const totalElement = document.getElementById('carrito-total');
    if (totalElement) totalElement.textContent = `$${total.toLocaleString()}`;
}

function actualizarCantidadCarritoManual(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad > 0 && carrito[index]) {
        carrito[index].cantidad = cantidad;
        carrito[index].subtotal = cantidad * carrito[index].precio;
        actualizarCarritoUIManual();
    }
}

function eliminarItemCarritoManual(index) {
    if (carrito[index]) {
        carrito.splice(index, 1);
        actualizarCarritoUIManual();
    }
}

async function guardarVentaManual() {
    if (carrito.length === 0) {
        mostrarAlerta('❌ Agrega al menos un producto a la venta', 'error');
        return;
    }
    
    const fecha = document.getElementById('venta-fecha')?.value;
    const cliente = document.getElementById('venta-cliente')?.value.trim() || 'Consumidor final';
    const metodoPago = document.getElementById('venta-metodo')?.value || 'Efectivo';
    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    
    const productosTexto = carrito.map(item => {
        let texto = `${item.nombre} x${item.cantidad}`;
        if (item.talla && item.talla !== 'N/A') texto += ` (Talla: ${item.talla})`;
        if (item.color && item.color !== 'N/A') texto += ` - ${item.color}`;
        return texto;
    }).join(', ');
    
    const nuevaVenta = {
        fecha: fecha,
        cliente: cliente,
        productos: productosTexto,
        total: total,
        metodo_pago: metodoPago,
        estado: 'completada',
        created_at: new Date().toISOString()
    };
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevaVenta)
        });
        
        if (response.ok) {
            mostrarAlerta(`✅ Venta registrada correctamente - Total: $${total.toLocaleString()}`, 'success');
            cerrarFormulario('venta');
            carrito = [];
            await cargarVentas();
        } else {
            const error = await response.json();
            mostrarAlerta('❌ Error al registrar venta: ' + (error.message || ''), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error de conexión', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function verFactura(id) {
    window.open(`factura.html?id=${id}`, '_blank');
}

function verDetalleVenta(id) {
    verFactura(id);
}

async function editarVenta(id) {
    mostrarAlerta('Función de editar venta en desarrollo', 'info');
}

async function eliminarVenta(id) {
    if (!confirm('¿Estás segura de eliminar esta venta?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Venta eliminada', 'success');
            await cargarVentas();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function solicitarCambio(id) {
    const motivo = prompt('¿Cuál es el motivo del cambio/devolución?\nEj: Talla incorrecta, producto defectuoso, cambio de color, etc.');
    if (motivo) {
        registrarCambio(id, motivo);
    }
}

async function registrarCambio(id, motivo) {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'cambiado',
                notas: `Cambio solicitado: ${motivo} - Fecha: ${new Date().toLocaleString()}`
            })
        });
        
        if (response.ok) {
            mostrarAlerta(`🔄 Cambio registrado: ${motivo}`, 'success');
            await cargarVentas();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// FUNCIONES DE COMPRAS
// ============================================

async function cargarCompras() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar compras');
        
        const compras = await response.json();
        const tbody = document.querySelector('#tabla-compras tbody');
        
        if (!tbody) return;
        
        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay compras registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = compras.map(compra => {
            const fecha = new Date(compra.fecha);
            const fechaStr = fecha.toLocaleDateString('es-CO');
            
            let estadoClass = '';
            if (compra.estado === 'Pagada') estadoClass = 'estado-pagada';
            else if (compra.estado === 'Recibida') estadoClass = 'estado-recibida';
            else estadoClass = 'estado-pendiente';
            
            return `
                <tr>
                    <td>${fechaStr}</td>
                    <td>${compra.proveedores?.nombre || 'N/A'}</td>
                    <td>${compra.producto || 'Varios'}</td>
                    <td>${compra.cantidad || '-'}</td>
                    <td>$${(compra.total || 0).toLocaleString()}</td>
                    <td><span class="estado-badge ${estadoClass}">${compra.estado || 'Pendiente'}</span></td>
                    <td>${compra.puc || '620501'}</td>
                    <td>
                        <button class="action-btn" onclick="editarCompra(${compra.id})">✏️</button>
                        <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
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
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Compra guardada correctamente', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
            document.getElementById('compra-proveedor').value = '';
            document.getElementById('compra-fecha').value = '';
            document.getElementById('compra-producto').value = '';
            document.getElementById('compra-cantidad').value = '';
            document.getElementById('compra-precio').value = '';
        } else {
            mostrarAlerta('Error al guardar la compra', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function editarCompra(id) {
    mostrarAlerta('Función de editar compra en desarrollo', 'info');
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
            mostrarAlerta('✅ Compra eliminada', 'success');
            await cargarCompras();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
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
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar gastos');
        
        const gastos = await response.json();
        const tbody = document.querySelector('#tabla-gastos tbody');
        
        if (!tbody) return;
        
        if (gastos.length === 0) {
            tbody.innerHTML = '<td><td colspan="6" style="text-align: center;">No hay gastos registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = gastos.map(gasto => `
            <tr>
                <td>${new Date(gasto.fecha).toLocaleDateString()}</td>
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
        console.error('Error:', error);
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
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gasto)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Gasto guardado correctamente', 'success');
            cerrarFormulario('gasto');
            await cargarGastos();
            
            document.getElementById('gasto-fecha').value = '';
            document.getElementById('gasto-concepto').value = '';
            document.getElementById('gasto-categoria').value = '';
            document.getElementById('gasto-monto').value = '';
        } else {
            mostrarAlerta('Error al guardar el gasto', 'error');
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

function editarGasto(id) {
    mostrarAlerta('Función de editar gasto en desarrollo', 'info');
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
            mostrarAlerta('✅ Gasto eliminado', 'success');
            await cargarGastos();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
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
        
        if (!tbody) return;
        
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
    mostrarAlerta('Función de editar proveedor en desarrollo', 'info');
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
// FUNCIONES DE PERFILES
// ============================================

async function cargarPerfiles() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await response.json();
        
        const tbody = document.querySelector('#tabla-perfiles tbody');
        
        if (!tbody) return;
        
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
                <tr>
                    <button class="action-btn" onclick="editarPerfil('${p.id}')">✏️</button>
                    ${p.id !== currentUser?.id ? 
                        `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')">🗑️</button>` 
                        : ''}
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
        
        const nombre = document.getElementById('perfil-nombre').value;
        const email = document.getElementById('perfil-email').value;
        const password = document.getElementById('perfil-password').value;
        const rol = document.getElementById('perfil-rol').value;
        
        if (!nombre || !email) {
            mostrarAlerta('Nombre y email son obligatorios', 'error');
            return;
        }
        
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
            
            document.getElementById('perfil-nombre').value = '';
            document.getElementById('perfil-email').value = '';
            document.getElementById('perfil-password').value = '';
        } else {
            throw new Error('Error al crear perfil');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

function editarPerfil(id) {
    mostrarAlerta('Función de editar perfil en desarrollo', 'info');
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
// FUNCIONES DE CONTABILIDAD
// ============================================

async function cargarContabilidad() {
    try {
        const [ventas, compras, gastos] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/ventas`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
            fetch(`${SUPABASE_URL}/rest/v1/compras`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
            fetch(`${SUPABASE_URL}/rest/v1/gastos`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json())
        ]);
        
        const ingresos = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
        const egresos = compras.reduce((sum, c) => sum + (c.total || 0), 0) + gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
        
        const ingresosElem = document.getElementById('stats-ingresos');
        const egresosElem = document.getElementById('stats-egresos');
        
        if (ingresosElem) ingresosElem.textContent = `$${ingresos.toLocaleString()}`;
        if (egresosElem) egresosElem.textContent = `$${egresos.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error cargando contabilidad:', error);
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.add('active');
        form.style.display = 'flex';
        console.log(`✅ Mostrando formulario: ${tipo}`);
    } else {
        console.error(`❌ No existe form-${tipo}`);
    }
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.remove('active');
        form.style.display = 'none';
        console.log(`✅ Cerrando formulario: ${tipo}`);
    }
    
    // Limpieza específica por tipo
    if (tipo === 'producto') {
        delete document.getElementById('form-producto')?.dataset.editId;
        const btn = document.querySelector('#form-producto .submit-btn');
        if (btn) btn.textContent = 'Guardar Producto';
        const precioCompraInput = document.getElementById('producto-precio-compra');
        if (precioCompraInput) precioCompraInput.value = '';
    }
    
    if (tipo === 'venta') {
        carrito = [];
        if (typeof actualizarCarritoUIManual === 'function') {
            actualizarCarritoUIManual();
        }
        const clienteInput = document.getElementById('venta-cliente');
        if (clienteInput) clienteInput.value = '';
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (alerta) {
        alerta.textContent = mensaje;
        alerta.className = `alert ${tipo}`;
        alerta.style.display = 'block';
        setTimeout(() => {
            alerta.style.display = 'none';
        }, 3000);
    } else {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
        alert(mensaje);
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

// ============================================
// FILTROS PARA COMPRAS Y GASTOS
// ============================================

function configurarFiltrosCompras() {
    const searchInput = document.getElementById('search-compras');
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio');
    const fechaFin = document.getElementById('filter-compra-fecha-fin');
    const estadoSelect = document.getElementById('filter-compra-estado');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosCompras());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosCompras());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosCompras());
    if (estadoSelect) estadoSelect.addEventListener('change', () => aplicarFiltrosCompras());
}

function aplicarFiltrosCompras() {
    const rows = document.querySelectorAll('#tabla-compras tbody tr');
    const searchTerm = document.getElementById('search-compras')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-compra-fecha-fin')?.value;
    const estado = document.getElementById('filter-compra-estado')?.value || '';
    
    rows.forEach(row => {
        let mostrar = true;
        const proveedor = row.cells[1]?.textContent.toLowerCase() || '';
        const producto = row.cells[2]?.textContent.toLowerCase() || '';
        const fechaTexto = row.cells[0]?.textContent || '';
        const estadoTexto = row.cells[5]?.textContent.toLowerCase() || '';
        
        if (searchTerm && !proveedor.includes(searchTerm) && !producto.includes(searchTerm)) mostrar = false;
        if (mostrar && fechaInicio && new Date(fechaTexto) < new Date(fechaInicio)) mostrar = false;
        if (mostrar && fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59);
            if (new Date(fechaTexto) > fechaFinObj) mostrar = false;
        }
        if (mostrar && estado && !estadoTexto.includes(estado.toLowerCase())) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
    });
}

function limpiarFiltrosCompras() {
    const searchInput = document.getElementById('search-compras');
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio');
    const fechaFin = document.getElementById('filter-compra-fecha-fin');
    const estadoSelect = document.getElementById('filter-compra-estado');
    
    if (searchInput) searchInput.value = '';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (estadoSelect) estadoSelect.value = '';
    aplicarFiltrosCompras();
}

function configurarFiltrosGastos() {
    const searchInput = document.getElementById('search-gastos');
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio');
    const fechaFin = document.getElementById('filter-gasto-fecha-fin');
    const categoriaSelect = document.getElementById('filter-gasto-categoria');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosGastos());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosGastos());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosGastos());
    if (categoriaSelect) categoriaSelect.addEventListener('change', () => aplicarFiltrosGastos());
}

function aplicarFiltrosGastos() {
    const rows = document.querySelectorAll('#tabla-gastos tbody tr');
    const searchTerm = document.getElementById('search-gastos')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-gasto-fecha-fin')?.value;
    const categoria = document.getElementById('filter-gasto-categoria')?.value || '';
    
    rows.forEach(row => {
        let mostrar = true;
        const concepto = row.cells[1]?.textContent.toLowerCase() || '';
        const fechaTexto = row.cells[0]?.textContent || '';
        const categoriaTexto = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (searchTerm && !concepto.includes(searchTerm)) mostrar = false;
        if (mostrar && fechaInicio && new Date(fechaTexto) < new Date(fechaInicio)) mostrar = false;
        if (mostrar && fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59);
            if (new Date(fechaTexto) > fechaFinObj) mostrar = false;
        }
        if (mostrar && categoria && !categoriaTexto.includes(categoria.toLowerCase())) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
    });
}

function limpiarFiltrosGastos() {
    const searchInput = document.getElementById('search-gastos');
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio');
    const fechaFin = document.getElementById('filter-gasto-fecha-fin');
    const categoriaSelect = document.getElementById('filter-gasto-categoria');
    
    if (searchInput) searchInput.value = '';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (categoriaSelect) categoriaSelect.value = '';
    aplicarFiltrosGastos();
}

// ============================================
// INICIALIZACIÓN DE FILTROS AL CARGAR MÓDULOS
// ============================================

// Sobrescribir cargarDatosModulo para configurar filtros
const originalCargarDatosModulo = cargarDatosModulo;
window.cargarDatosModulo = async function(modulo) {
    await originalCargarDatosModulo(modulo);
    
    switch(modulo) {
        case 'productos':
            setTimeout(() => configurarFiltrosProductos(), 500);
            break;
        case 'ventas':
            setTimeout(() => configurarFiltrosVentas(), 500);
            break;
        case 'compras':
            setTimeout(() => configurarFiltrosCompras(), 500);
            break;
        case 'gastos':
            setTimeout(() => configurarFiltrosGastos(), 500);
            break;
    }
};

// ============================================
// FUNCIONES DE PERMISOS (placeholder si no existe)
// ============================================

function getPrimerModuloVisible() {
    return 'productos';
}

// ============================================
// IMPRESIÓN DE ETIQUETAS (Para impresora normal)
// ============================================

async function imprimirEtiquetasProducto(productoId) {
    try {
        console.log('🖨️ Generando etiquetas para producto:', productoId);
        
        // Obtener producto y sus variantes
        const productoRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!productoRes.ok) throw new Error('Error al obtener producto');
        
        const productos = await productoRes.json();
        
        if (productos.length === 0) {
            mostrarAlerta('Producto no encontrado', 'error');
            return;
        }
        
        const producto = productos[0];
        
        const variantesRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!variantesRes.ok) throw new Error('Error al obtener variantes');
        
        const variantes = await variantesRes.json();
        
        if (variantes.length === 0) {
            mostrarAlerta('Este producto no tiene variantes para imprimir', 'error');
            return;
        }
        
        console.log('📦 Producto:', producto.nombre);
        console.log('📏 Variantes encontradas:', variantes.length);
        
        // Generar HTML para impresión
        const etiquetasHTML = generarHTMLParaImpresion(producto, variantes);
        
        // Abrir ventana de impresión
        const ventana = window.open('', '_blank');
        ventana.document.write(etiquetasHTML);
        ventana.document.close();
        
        // Opcional: imprimir automáticamente (descomentar si quieres)
        // ventana.print();
        
        mostrarAlerta(`✅ Etiquetas generadas para ${variantes.length} variantes`, 'success');
        
    } catch (error) {
        console.error('Error en imprimirEtiquetasProducto:', error);
        mostrarAlerta('Error al generar etiquetas: ' + error.message, 'error');
    }
}

function generarHTMLParaImpresion(producto, variantes) {
    // Formato papel: tamaño etiqueta (Avery 3473 o similar)
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Etiquetas - ${producto.nombre}</title>
            <meta charset="UTF-8">
            <style>
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                
                body { 
                    background: white; 
                    font-family: 'Arial', sans-serif;
                    padding: 20px;
                }
                
                /* Grid de etiquetas - 2x4 por página */
                .etiquetas-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .etiqueta {
                    border: 1px dashed #ccc;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    background: white;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                
                .etiqueta-tienda {
                    font-size: 10px;
                    color: #d4a5a9;
                    letter-spacing: 2px;
                    margin-bottom: 5px;
                }
                
                .etiqueta-nombre {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 5px 0;
                    color: #4a3728;
                }
                
                .etiqueta-detalle {
                    font-size: 20px;
                    font-weight: bold;
                    color: #b87c4e;
                    margin: 5px 0;
                }
                
                .etiqueta-codigo {
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                    color: #666;
                    margin: 10px 0;
                    letter-spacing: 1px;
                }
                
                .etiqueta-precio {
                    font-size: 18px;
                    font-weight: bold;
                    color: #27ae60;
                    margin-top: 10px;
                }
                
                /* Código de barras simple */
                .barcode-simple {
                    font-family: 'Courier New', monospace;
                    font-size: 22px;
                    letter-spacing: 1px;
                    margin: 10px 0;
                    background: white;
                    padding: 5px;
                    border: 1px solid #eee;
                    word-break: break-all;
                }
                
                @media print {
                    body { 
                        margin: 0; 
                        padding: 0; 
                    }
                    .etiquetas-grid { 
                        gap: 15px; 
                    }
                    .etiqueta { 
                        border: 1px dashed #aaa;
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="etiquetas-grid">
                ${variantes.map(v => `
                    <div class="etiqueta">
                        <div class="etiqueta-tienda">🌸 MODAS LA 34</div>
                        <div class="etiqueta-nombre">${escapeHtml(producto.nombre)}</div>
                        <div class="etiqueta-detalle">Talla: ${v.talla}</div>
                        <div class="barcode-simple">${generarBarraSimple(v.sku)}</div>
                        <div class="etiqueta-codigo">${v.sku || 'SKU no disponible'}</div>
                        <div class="etiqueta-precio">$${(v.precio_venta || 0).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #999;">
                ${escapeHtml(producto.nombre)} - Etiquetas generadas el ${new Date().toLocaleDateString()}
            </div>
        </body>
        </html>
    `;
}

// Generar barra simple con caracteres
function generarBarraSimple(texto) {
    if (!texto) return 'Sin código';
    // Mostrar el SKU con formato de barras
    return texto;
}

// Función auxiliar para escapar HTML
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
// LECTOR DE CÓDIGOS DE BARRAS CON CÁMARA
// ============================================

let streamLector = null;
let codigoDetectado = null;

function abrirEscannerCamara() {
    const modal = document.getElementById('modal-camara-lector');
    modal.style.display = 'flex';
    iniciarCamaraLector();
}

function cerrarEscannerCamara() {
    if (streamLector) {
        streamLector.getTracks().forEach(track => track.stop());
        streamLector = null;
    }
    const modal = document.getElementById('modal-camara-lector');
    modal.style.display = 'none';
    const video = document.getElementById('video-lector');
    if (video) video.srcObject = null;
}

async function iniciarCamaraLector() {
    try {
        // Intentar cámara trasera (si es móvil)
        let constraints = { video: { facingMode: { exact: "environment" } } };
        
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            // Si no hay cámara trasera, usar cualquier cámara
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        const video = document.getElementById('video-lector');
        video.srcObject = stream;
        streamLector = stream;
        
    } catch (error) {
        console.error('Error al iniciar cámara:', error);
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
        cerrarEscannerCamara();
    }
}

function capturarYBuscar() {
    const video = document.getElementById('video-lector');
    const canvas = document.getElementById('canvas-lector');
    const context = canvas.getContext('2d');
    
    // Capturar frame actual
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Mostrar prompt para ingresar código (por ahora manual)
    // En una versión avanzada, aquí se procesaría la imagen para extraer el código
    const codigo = prompt('🔍 Escribe el código que ves en la etiqueta (SKU):');
    
    if (codigo && codigo.trim()) {
        buscarProductoPorSKU(codigo.trim());
    }
    
    cerrarEscannerCamara();
}

async function buscarProductoPorSKU(sku) {
    try {
        // Buscar por SKU en la tabla variantes_producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?sku=eq.${sku}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const variantes = await response.json();
        
        if (variantes.length === 0) {
            mostrarAlerta(`❌ No se encontró producto con SKU: ${sku}`, 'error');
            return;
        }
        
        const variante = variantes[0];
        
        // Obtener producto base
        const productoRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${variante.producto_id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await productoRes.json();
        const producto = productos[0];
        
        // Verificar si ya está en el carrito
        const existe = carrito.findIndex(item => 
            item.producto_id === producto.id && 
            item.talla === variante.talla
        );
        
        if (existe !== -1) {
            carrito[existe].cantidad++;
            carrito[existe].subtotal = carrito[existe].cantidad * carrito[existe].precio;
            mostrarAlerta(`✅ Cantidad actualizada: ${producto.nombre} (${variante.talla})`, 'success');
        } else {
            // Agregar al carrito
            carrito.push({
                producto_id: producto.id,
                producto_nombre: producto.nombre,
                talla: variante.talla,
                color: 'N/A',
                precio: variante.precio_venta,
                cantidad: 1,
                subtotal: variante.precio_venta
            });
            mostrarAlerta(`✅ Agregado: ${producto.nombre} (${variante.talla})`, 'success');
        }
        
        actualizarCarritoUIManual();
        
        // Limpiar input
        const inputManual = document.getElementById('input-codigo-manual');
        if (inputManual) inputManual.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al buscar producto', 'error');
    }
}

// Buscar cuando escriben manualmente
document.addEventListener('DOMContentLoaded', () => {
    const inputManual = document.getElementById('input-codigo-manual');
    if (inputManual) {
        inputManual.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarProductoPorSKU(inputManual.value.trim());
                inputManual.value = '';
            }
        });
    }
});

// Exportar funciones al scope global
window.cargarProductos = cargarProductos;
window.cargarStock = cargarStock;
window.cargarVentas = cargarVentas;
window.cargarCompras = cargarCompras;
window.cargarGastos = cargarGastos;
window.cargarProveedores = cargarProveedores;
window.cargarPerfiles = cargarPerfiles;
window.cargarContabilidad = cargarContabilidad;
window.guardarProductoBase = guardarProductoBase;
window.guardarVenta = guardarVentaManual;
window.guardarCompra = guardarCompra;
window.guardarGasto = guardarGasto;
window.guardarProveedor = guardarProveedor;
window.guardarPerfil = guardarPerfil;
window.editarProducto = editarProducto;
window.editarVenta = editarVenta;
window.editarCompra = editarCompra;
window.editarGasto = editarGasto;
window.editarProveedor = editarProveedor;
window.editarPerfil = editarPerfil;
window.eliminarProducto = eliminarProducto;
window.eliminarVenta = eliminarVenta;
window.eliminarCompra = eliminarCompra;
window.eliminarGasto = eliminarGasto;
window.eliminarProveedor = eliminarProveedor;
window.eliminarPerfil = eliminarPerfil;
window.verVariantes = verVariantes;
window.verFactura = verFactura;
window.verDetalleVenta = verDetalleVenta;
window.solicitarCambio = solicitarCambio;
window.solicitarReposicion = solicitarReposicion;
window.ordenarVentas = ordenarVentas;
window.ordenarProductos = ordenarProductos;
window.limpiarFiltrosProductos = limpiarFiltrosProductos;
window.limpiarFiltrosVentas = limpiarFiltrosVentas;
window.limpiarFiltrosCompras = limpiarFiltrosCompras;
window.limpiarFiltrosGastos = limpiarFiltrosGastos;
window.abrirVentaRapida = abrirVentaRapida;
window.abrirNuevaVenta = abrirNuevaVenta;
window.agregarProductoVentaManual = agregarProductoVentaManual;
window.actualizarCantidadCarritoManual = actualizarCantidadCarritoManual;
window.eliminarItemCarritoManual = eliminarItemCarritoManual;
window.agregarVariante = agregarVariante;
window.agregarColorAVariante = agregarColorAVariante;
window.agregarSinColor = agregarSinColor;
window.eliminarColor = eliminarColor;
window.eliminarVariante = eliminarVariante;
window.mostrarFormulario = mostrarFormulario;
window.cerrarFormulario = cerrarFormulario;
window.toggleMenu = toggleMenu;
window.logout = logout;
