// ============================================
// DASHBOARD ADMIN - MODAS LA 34
// VERSIÓN COMPLETA - TODAS LAS FUNCIONES
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
        document.getElementById('userNameDisplay').textContent = nombreMostrar;
        if (document.getElementById('sidebarUserName')) {
            document.getElementById('sidebarUserName').textContent = nombreMostrar;
            document.getElementById('sidebarUserEmail').textContent = user.email || 'admin@modasla34.com';
        }
        if (document.getElementById('userAvatar')) {
            document.getElementById('userAvatar').textContent = nombreMostrar.charAt(0).toUpperCase();
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
    
    const moduloElement = document.getElementById(`modulo-${modulo}`);
    if (moduloElement) moduloElement.style.display = 'block';
    
    if (event) {
        document.querySelectorAll('.nav-item, .sidebar-nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        if (event.target.classList) {
            event.target.classList.add('active');
        } else if (event.target.parentElement) {
            event.target.parentElement.classList.add('active');
        }
    }
    
    currentModule = modulo;
    cargarDatosModulo(modulo);
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
            await cargarContabilidad();
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
// FUNCIONES DE FILTROS
// ============================================
function aplicarFiltroCompras() {
    const inicio = document.getElementById('compras-fecha-inicio').value;
    const fin = document.getElementById('compras-fecha-fin').value;
    fechaInicioCompras = inicio ? new Date(inicio) : null;
    fechaFinCompras = fin ? new Date(fin) : null;
    if (fechaFinCompras) fechaFinCompras.setHours(23, 59, 59, 999);
    cargarCompras();
}

function limpiarFiltroCompras() {
    document.getElementById('compras-fecha-inicio').value = '';
    document.getElementById('compras-fecha-fin').value = '';
    fechaInicioCompras = null;
    fechaFinCompras = null;
    cargarCompras();
}

function aplicarFiltroGastos() {
    const inicio = document.getElementById('gastos-fecha-inicio').value;
    const fin = document.getElementById('gastos-fecha-fin').value;
    fechaInicioGastos = inicio ? new Date(inicio) : null;
    fechaFinGastos = fin ? new Date(fin) : null;
    if (fechaFinGastos) fechaFinGastos.setHours(23, 59, 59, 999);
    cargarGastos();
}

function limpiarFiltroGastos() {
    document.getElementById('gastos-fecha-inicio').value = '';
    document.getElementById('gastos-fecha-fin').value = '';
    fechaInicioGastos = null;
    fechaFinGastos = null;
    cargarGastos();
}

function aplicarFiltroVentas() {
    const inicio = document.getElementById('ventas-fecha-inicio').value;
    const fin = document.getElementById('ventas-fecha-fin').value;
    fechaInicioVentas = inicio ? new Date(inicio) : null;
    fechaFinVentas = fin ? new Date(fin) : null;
    if (fechaFinVentas) fechaFinVentas.setHours(23, 59, 59, 999);
    cargarVentas();
}

function limpiarFiltroVentas() {
    document.getElementById('ventas-fecha-inicio').value = '';
    document.getElementById('ventas-fecha-fin').value = '';
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
        <div class="variante-card" id="variante-${varianteId}" style="background:#f9f9f9; border-radius:12px; padding:1rem; margin-bottom:1rem; border:1px solid #eee;">
            <div style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                <div>
                    <label style="font-size:0.7rem; color:#666;">Talla</label>
                    <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: S, M, L" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:100px;">
                </div>
                <div>
                    <label style="font-size:0.7rem; color:#666;">Precio venta</label>
                    <input type="number" id="variante-${varianteId}-precio" placeholder="Precio" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:120px;">
                </div>
                ${varianteId > 0 ? `<button type="button" onclick="eliminarVariante(${varianteId})" style="background:#f0f0f0; border:none; padding:0.5rem 1rem; border-radius:8px; margin-top:1.2rem;">🗑️ Eliminar</button>` : ''}
            </div>
            <div style="margin-top:0.5rem;">
                <label style="font-size:0.7rem; color:#666;">Colores y stock</label>
                <div id="colores-${varianteId}-container" style="margin-top:0.5rem;"></div>
                <div style="margin-top:0.5rem;">
                    <button type="button" onclick="agregarColorAVariante(${varianteId})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem; cursor:pointer;">+ Agregar color</button>
                    <button type="button" onclick="agregarSinColor(${varianteId})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem; cursor:pointer;">⚪ Sin color</button>
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
        <div class="color-row" id="color-${colorId}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; flex-wrap:wrap;">
            <input type="color" id="color-hex-${colorId}" value="#ff0000" style="width:35px; height:35px; border-radius:8px; cursor:pointer;">
            <input type="text" id="color-hex-text-${colorId}" value="#ff0000" placeholder="Hex" style="width:80px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <input type="text" id="color-nombre-${colorId}" placeholder="Nombre color" style="flex:1; min-width:100px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <button type="button" onclick="eliminarColor('${colorId}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
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
            if (/^#[0-9A-Fa-f]{6}$/i.test(value)) colorPicker.value = value;
        });
    }
}

function agregarSinColor(varianteId) {
    const container = document.getElementById(`colores-${varianteId}-container`);
    if (!container) return;
    
    if (container.querySelector('.sin-color-item')) {
        mostrarAlerta('⚠️ Ya existe una opción "Sin color" para esta talla', 'error');
        return;
    }
    
    const colorId = `${varianteId}-sin-color-${Date.now()}`;
    
    const sinColorHTML = `
        <div class="color-row sin-color-item" id="color-${colorId}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; background:#f5f5f5; padding:0.3rem; border-radius:8px;">
            <span style="font-size:1.2rem;">⚪</span>
            <span style="flex:1; font-weight:500;">Sin color específico</span>
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <button type="button" onclick="eliminarColor('${colorId}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
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
                    
                    let hexValue = '#ff0000';
                    if (hexTextInput && hexTextInput.value) hexValue = hexTextInput.value;
                    
                    if (!hexValue.startsWith('#')) hexValue = '#' + hexValue;
                    if (!/^#[0-9A-Fa-f]{6}$/i.test(hexValue)) hexValue = '#cccccc';
                    
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

// ============================================
// CRUD PRODUCTOS (COMPLETO)
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
            mostrarAlerta('Debe agregar al menos una talla', 'error');
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
            
            await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    codigo, nombre, categoria,
                    imagen_url: document.getElementById('producto-imagen')?.value || null
                })
            });
            
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`
                }
            });
            
        } else {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    codigo, nombre, categoria,
                    imagen_url: document.getElementById('producto-imagen')?.value || null
                })
            });
            
            if (!response.ok) throw new Error('Error al guardar producto base');
            const productoGuardado = await response.json();
            productoId = productoGuardado[0].id;
        }
        
        for (const variante of variantes) {
            const skuUnico = `${codigo}-${variante.talla}-${Date.now()}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    producto_id: productoId,
                    talla: variante.talla,
                    colores: variante.colores,
                    stock_total: variante.stock_total,
                    precio_venta: variante.precio_venta,
                    precio_compra: variante.precio_compra,
                    sku: skuUnico
                })
            });
        }
        
        mostrarAlerta(editId ? '🌸 Producto actualizado' : '🌸 Producto guardado', 'success');
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
        if (submitBtn) submitBtn.textContent = 'Guardar Producto';
        
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay productos registrados<\/td></tr>';
            return;
        }
        
        tbody.innerHTML = productos.map(p => {
            const variantes = p.variantes || [];
            const totalStock = variantes.reduce((sum, v) => sum + (v.stock_total || 0), 0);
            const precioMin = Math.min(...variantes.map(v => v.precio_venta || 0), 0);
            
            return `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td>${p.codigo}</td>
                    <td>${p.categoria || '-'}</td>
                    <td style="color:${totalStock < 5 ? '#e74c3c' : '#333'}; font-weight:bold;">${totalStock}</td>
                    <td>$${precioMin.toLocaleString()}</td>
                    <td>
                        <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn" onclick="verVariantes(${p.id})" title="Ver variantes"><i class="fas fa-eye"></i></button>
                        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function editarProducto(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar producto');
        
        const productos = await response.json();
        if (productos.length === 0) throw new Error('Producto no encontrado');
        
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
                    const vid = varianteCount;
                    const varianteHTML = `
                        <div class="variante-card" id="variante-${vid}" style="background:#f9f9f9; border-radius:12px; padding:1rem; margin-bottom:1rem; border:1px solid #eee;">
                            <div style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                                <div>
                                    <label style="font-size:0.7rem; color:#666;">Talla</label>
                                    <input type="text" id="variante-${vid}-talla" value="${v.talla}" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:100px;">
                                </div>
                                <div>
                                    <label style="font-size:0.7rem; color:#666;">Precio venta</label>
                                    <input type="number" id="variante-${vid}-precio" value="${v.precio_venta}" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:120px;">
                                </div>
                                <button type="button" onclick="eliminarVariante(${vid})" style="background:#f0f0f0; border:none; padding:0.5rem 1rem; border-radius:8px; margin-top:1.2rem;">🗑️ Eliminar</button>
                            </div>
                            <div style="margin-top:0.5rem;">
                                <label style="font-size:0.7rem; color:#666;">Colores y stock</label>
                                <div id="colores-${vid}-container" style="margin-top:0.5rem;"></div>
                                <div style="margin-top:0.5rem;">
                                    <button type="button" onclick="agregarColorAVariante(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem;">+ Agregar color</button>
                                    <button type="button" onclick="agregarSinColor(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem;">⚪ Sin color</button>
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', varianteHTML);
                    
                    const coloresContainer = document.getElementById(`colores-${vid}-container`);
                    const colores = v.colores || [];
                    
                    if (colores.length > 0) {
                        colores.forEach(color => {
                            const cid = `${vid}-${Date.now()}-${Math.random()}`;
                            let colorHTML = '';
                            if (color.nombre === null && color.codigo === null) {
                                colorHTML = `
                                    <div class="color-row sin-color-item" id="color-${cid}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; background:#f5f5f5; padding:0.3rem; border-radius:8px;">
                                        <span>⚪</span>
                                        <span style="flex:1;">Sin color específico</span>
                                        <input type="number" id="color-stock-${cid}" value="${color.stock}" placeholder="Stock" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
                                        <button type="button" onclick="eliminarColor('${cid}')" style="background:none; border:none;">🗑️</button>
                                    </div>
                                `;
                            } else {
                                colorHTML = `
                                    <div class="color-row" id="color-${cid}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; flex-wrap:wrap;">
                                        <input type="color" id="color-hex-${cid}" value="${color.codigo || '#ff0000'}" style="width:35px; height:35px; border-radius:8px;">
                                        <input type="text" id="color-hex-text-${cid}" value="${color.codigo || '#ff0000'}" placeholder="Hex" style="width:80px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
                                        <input type="text" id="color-nombre-${cid}" value="${color.nombre || ''}" placeholder="Nombre color" style="flex:1; min-width:100px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
                                        <input type="number" id="color-stock-${cid}" value="${color.stock}" placeholder="Stock" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
                                        <button type="button" onclick="eliminarColor('${cid}')" style="background:none; border:none;">🗑️</button>
                                    </div>
                                `;
                            }
                            coloresContainer.insertAdjacentHTML('beforeend', colorHTML);
                            
                            if (color.nombre !== null) {
                                const picker = document.getElementById(`color-hex-${cid}`);
                                const text = document.getElementById(`color-hex-text-${cid}`);
                                if (picker && text) {
                                    picker.addEventListener('input', () => text.value = picker.value);
                                    text.addEventListener('input', () => {
                                        let v = text.value;
                                        if (!v.startsWith('#')) v = '#' + v;
                                        if (/^#[0-9A-Fa-f]{6}$/i.test(v)) picker.value = v;
                                    });
                                }
                            }
                        });
                    } else {
                        agregarColorAVariante(vid);
                    }
                    
                    varianteCount++;
                });
            }
        }
        
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Actualizar Producto';
        
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
        mensaje += `Categoría: ${producto.categoria}\n`;
        mensaje += `Stock total: ${producto.stock_total}\n\n`;
        
        variantes.forEach(v => {
            mensaje += `📏 TALLA: ${v.talla}\n`;
            mensaje += `💰 Precio venta: $${v.precio_venta}\n`;
            mensaje += `💰 Precio compra: $${v.precio_compra || 0}\n`;
            
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
// CRUD PROVEEDORES (COMPLETO)
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay proveedores registrados<\/td></tr>';
            return;
        }
        
        if (document.getElementById('stats-proveedores')) {
            document.getElementById('stats-proveedores').textContent = proveedores.length;
        }
        
        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.contacto || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>
                    <button class="action-btn" onclick="editarProveedor(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" onclick="eliminarProveedor(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                 </td>
             </tr>
        `}).join('');
        
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
            select.innerHTML = '<option value="">Seleccionar proveedor</option>' + proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando proveedores para select:', error);
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
            mostrarAlerta(editId ? '🌸 Proveedor actualizado' : '🌸 Proveedor guardado', 'success');
            cerrarFormulario('proveedor');
            await cargarProveedores();
            
            // Limpiar formulario
            document.getElementById('proveedor-nombre').value = '';
            document.getElementById('proveedor-contacto').value = '';
            document.getElementById('proveedor-telefono').value = '';
            document.getElementById('proveedor-email').value = '';
            document.getElementById('proveedor-direccion').value = '';
            
            delete document.getElementById('form-proveedor').dataset.editId;
            const submitBtn = document.querySelector('#form-proveedor .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Proveedor';
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
        
        document.getElementById('proveedor-nombre').value = proveedor.nombre || '';
        document.getElementById('proveedor-contacto').value = proveedor.contacto || '';
        document.getElementById('proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('proveedor-email').value = proveedor.email || '';
        document.getElementById('proveedor-direccion').value = proveedor.direccion || '';
        
        document.getElementById('form-proveedor').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-proveedor .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Actualizar Proveedor';
        
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
// CRUD COMPRAS (COMPLETO)
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay compras registradas<\/td></tr>';
            if (document.getElementById('stats-compras-mes')) document.getElementById('stats-compras-mes').textContent = '$0';
            if (document.getElementById('stats-compras-pendientes')) document.getElementById('stats-compras-pendientes').textContent = '0';
            return;
        }
        
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        const comprasMes = compras.filter(c => new Date(c.fecha + 'T12:00:00') >= fechaInicioMes);
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        if (document.getElementById('stats-compras-mes')) document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
        if (document.getElementById('stats-compras-pendientes')) document.getElementById('stats-compras-pendientes').textContent = pendientes;
        
        tbody.innerHTML = compras.map(compra => {
            const fecha = new Date(compra.fecha + 'T12:00:00');
            const fechaFormateada = fecha.toLocaleDateString('es-CO');
            
            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${compra.proveedores?.nombre || 'N/A'}</td>
                    <td>${compra.producto || '-'}</td>
                    <td>${compra.cantidad || '-'}</td>
                    <td>$${(compra.total || 0).toLocaleString()}</td>
                    <td>
                        <span class="badge ${compra.estado === 'Pagada' ? 'badge-pagada' : compra.estado === 'Recibida' ? 'badge-recibida' : 'badge-pendiente'}">
                            ${compra.estado || 'Pendiente'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="editarCompra(${compra.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando compras:', error);
        const tbody = document.querySelector('#tabla-compras tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #e74c3c;">Error al cargar compras<\/td></tr>';
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
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            // Si la compra está "Recibida", actualizar stock de productos
            if (compra.estado === 'Recibida') {
                await actualizarStockPorCompra(compra);
            }
            
            mostrarAlerta(editId ? '🌸 Compra actualizada' : '🌸 Compra guardada', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
            document.getElementById('compra-proveedor').value = '';
            document.getElementById('compra-fecha').value = '';
            document.getElementById('compra-producto').value = '';
            document.getElementById('compra-cantidad').value = '';
            document.getElementById('compra-precio').value = '';
            
            delete document.getElementById('form-compra').dataset.editId;
            const submitBtn = document.querySelector('#form-compra .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Compra';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión: ' + error.message, 'error');
    }
}

async function actualizarStockPorCompra(compra) {
    try {
        // Buscar producto existente o crear uno nuevo
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // Intentar encontrar una variante similar
        const buscarVariante = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?talla=eq.${compra.talla || 'Única'}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await buscarVariante.json();
        
        if (variantes.length > 0) {
            // Actualizar stock de la primera variante encontrada
            const nuevoStock = variantes[0].stock_total + compra.cantidad;
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?id=eq.${variantes[0].id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stock_total: nuevoStock })
            });
            console.log('Stock actualizado:', nuevoStock);
        }
    } catch (error) {
        console.error('Error actualizando stock:', error);
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
        
        document.getElementById('compra-proveedor').value = compra.proveedor_id || '';
        document.getElementById('compra-fecha').value = compra.fecha?.split('T')[0] || '';
        document.getElementById('compra-producto').value = compra.producto || '';
        document.getElementById('compra-cantidad').value = compra.cantidad || '';
        document.getElementById('compra-precio').value = compra.precio_unitario || '';
        document.getElementById('compra-estado').value = compra.estado || 'Pendiente';
        
        document.getElementById('form-compra').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-compra .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Actualizar Compra';
        
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
            mostrarAlerta('✅ Compra eliminada', 'success');
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
// CRUD GASTOS (COMPLETO)
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
            tbody.innerHTML = '<td><td colspan="6" style="text-align: center;">No hay gastos registrados<\/td></tr>';
            if (document.getElementById('stats-gastos-mes')) document.getElementById('stats-gastos-mes').textContent = '$0';
            return;
        }
        
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicioMes);
        const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
        if (document.getElementById('stats-gastos-mes')) document.getElementById('stats-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = gastos.map(gasto => {
            const fecha = new Date(gasto.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-CO');
            
            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${gasto.concepto}</td>
                    <td>${gasto.categoria}</td>
                    <td>$${(gasto.monto || 0).toLocaleString()}</td>
                    <td>${gasto.metodo_pago || 'Efectivo'}</td>
                    <td>
                        <button class="action-btn" onclick="editarGasto(${gasto.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" onclick="eliminarGasto(${gasto.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando gastos:', error);
        const tbody = document.querySelector('#tabla-gastos tbody');
        if (tbody) {
            tbody.innerHTML = '<td><td colspan="6" style="text-align: center; color: #e74c3c;">Error al cargar gastos<\/td></tr>';
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
            metodo_pago: document.getElementById('gasto-metodo')?.value || 'Efectivo'
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
            mostrarAlerta(editId ? '🌸 Gasto actualizado' : '🌸 Gasto guardado', 'success');
            cerrarFormulario('gasto');
            await cargarGastos();
            
            // Limpiar formulario
            document.getElementById('gasto-fecha').value = '';
            document.getElementById('gasto-concepto').value = '';
            document.getElementById('gasto-categoria').value = '';
            document.getElementById('gasto-monto').value = '';
            
            delete document.getElementById('form-gasto').dataset.editId;
            const submitBtn = document.querySelector('#form-gasto .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Gasto';
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
        
        document.getElementById('gasto-fecha').value = gasto.fecha?.split('T')[0] || '';
        document.getElementById('gasto-concepto').value = gasto.concepto || '';
        document.getElementById('gasto-categoria').value = gasto.categoria || '';
        document.getElementById('gasto-monto').value = gasto.monto || '';
        if (gasto.metodo_pago) {
            document.getElementById('gasto-metodo').value = gasto.metodo_pago;
        }
        
        document.getElementById('form-gasto').dataset.editId = id;
        
        const submitBtn = document.querySelector('#form-gasto .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Actualizar Gasto';
        
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
            mostrarAlerta('✅ Gasto eliminado', 'success');
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
// CRUD PERFILES (COMPLETO)
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios registrados<\/td></tr>';
            if (document.getElementById('stats-empleados')) document.getElementById('stats-empleados').textContent = '0';
            return;
        }
        
        if (document.getElementById('stats-empleados')) {
            document.getElementById('stats-empleados').textContent = perfiles.length;
        }
        
        tbody.innerHTML = perfiles.map(p => `
            <tr>
                <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                <td>${p.email}</td>
                <td>
                    <span style="background:${p.rol === 'admin' ? '#d4a5a9' : '#e0e0e0'}; padding:0.2rem 0.8rem; border-radius:20px;">
                        ${p.rol || 'empleado'}
                    </span>
                </td>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="editarPerfil('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    ${p.id !== currentUser?.id ? `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
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
        const rol = document.getElementById('perfil-rol')?.value || 'empleado';
        
        if (!nombre || !email) {
            mostrarAlerta('Nombre y email son obligatorios', 'error');
            return;
        }
        
        const editId = document.getElementById('form-perfil')?.dataset.editId;
        
        if (editId) {
            // Actualizar perfil existente
            const perfilData = { nombre, email, rol };
            
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
                mostrarAlerta('🌸 Usuario actualizado', 'success');
                cerrarFormulario('perfil');
                await cargarPerfiles();
            } else {
                mostrarAlerta('Error al actualizar', 'error');
            }
        } else {
            // Crear nuevo usuario
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
                mostrarAlerta('🌸 Usuario creado', 'success');
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
        
        delete document.getElementById('form-perfil').dataset.editId;
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Crear Usuario';
        
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
        
        document.getElementById('perfil-nombre').value = perfil.nombre || '';
        document.getElementById('perfil-email').value = perfil.email || '';
        document.getElementById('perfil-rol').value = perfil.rol || 'empleado';
        
        document.getElementById('form-perfil').dataset.editId = id;
        
        const passwordField = document.getElementById('perfil-password');
        if (passwordField) {
            passwordField.placeholder = 'Dejar vacío para mantener';
            passwordField.required = false;
        }
        
        const submitBtn = document.querySelector('#form-perfil .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Actualizar Usuario';
        
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
// FUNCIONES DE INVENTARIO (COMPLETO)
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
                        stock: stock,
                        precio_compra: precioCompra,
                        precio_venta: precioVenta,
                        ganancia_unidad: gananciaUnidad,
                        valor_total: valorTotal
                    });
                });
            });
        });
        
        if (document.getElementById('valor-inventario')) {
            document.getElementById('valor-inventario').textContent = `$${valorTotalInventario.toLocaleString()}`;
        }
        if (document.getElementById('ganancia-potencial')) {
            document.getElementById('ganancia-potencial').textContent = `$${gananciaTotalPotencial.toLocaleString()}`;
        }
        
        if (todasVariantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay productos en inventario<\/td></tr>';
            return;
        }
        
        tbody.innerHTML = todasVariantes.map(item => `
            <tr>
                <td>${item.imagen ? `<img src="${item.imagen}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : '📦'}</td>
                <td>${item.codigo}</td>
                <td>${item.nombre}</td>
                <td>${item.talla}</td>
                <td><span style="display:inline-block;width:15px;height:15px;background:${item.color !== 'Sin color' ? item.color : '#ccc'};border-radius:50%;margin-right:5px;"></span>${item.color}</td>
                <td style="color:${item.stock < 5 ? '#e74c3c' : '#333'}; font-weight:bold;">${item.stock}</td>
                <td>$${item.precio_compra.toLocaleString()}</td>
                <td>$${item.precio_venta.toLocaleString()}</td>
                <td style="color:${item.ganancia_unidad > 0 ? '#27ae60' : '#e74c3c'}; font-weight:bold;">$${item.ganancia_unidad.toLocaleString()}</td>
                <td style="font-weight:bold;">$${item.valor_total.toLocaleString()}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando inventario:', error);
        const tbody = document.getElementById('inventario-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #e74c3c;">Error al cargar inventario<\/td></tr>';
        }
    }
}

function exportarInventario() {
    // Obtener la tabla
    const tabla = document.getElementById('tabla-inventario');
    if (!tabla) return;
    
    const filas = tabla.querySelectorAll('tr');
    let csv = [];
    
    // Cabeceras
    const headers = ['Código', 'Producto', 'Talla', 'Color', 'Stock', 'Precio Compra', 'Precio Venta', 'Ganancia x Unidad', 'Valor Total'];
    csv.push(headers.join(','));
    
    // Datos
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length > 0 && celdas[0].colSpan !== 10) {
            const filaData = [];
            for (let i = 1; i < celdas.length; i++) {
                let texto = celdas[i].innerText.replace(/,/g, '.').trim();
                // Limpiar símbolos de moneda
                texto = texto.replace(/\$/g, '');
                filaData.push(texto);
            }
            csv.push(filaData.join(','));
        }
    });
    
    // Descargar archivo
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarAlerta('📥 Inventario exportado correctamente', 'success');
}

// ============================================
// FUNCIONES DE VENTAS (COMPLETO)
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas registradas<\/td></tr>';
            if (document.getElementById('stats-ventas-hoy')) document.getElementById('stats-ventas-hoy').textContent = '$0';
            if (document.getElementById('stats-ventas-mes')) document.getElementById('stats-ventas-mes').textContent = '$0';
            return;
        }
        
        // Ventas de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        if (document.getElementById('stats-ventas-hoy')) document.getElementById('stats-ventas-hoy').textContent = `$${totalHoy.toLocaleString()}`;
        
        // Ventas del mes
        const fechaInicioMes = new Date();
        fechaInicioMes.setDate(1);
        fechaInicioMes.setHours(0, 0, 0, 0);
        
        let ventasMes = ventas;
        if (!fechaInicioVentas && !fechaFinVentas) {
            ventasMes = ventas.filter(v => new Date(v.fecha) >= fechaInicioMes);
        }
        const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
        if (document.getElementById('stats-ventas-mes')) document.getElementById('stats-ventas-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = ventas.map(venta => {
            const fecha = new Date(venta.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-CO') + ' ' + fecha.toLocaleTimeString();
            
            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${venta.productos || 'Venta'}</td>
                    <td>$${(venta.total || 0).toLocaleString()}</td>
                    <td>
                        <span style="background:#f0f0f0; padding:0.2rem 0.8rem; border-radius:20px;">
                            ${venta.metodo_pago || 'Efectivo'}
                        </span>
                    </td>
                    <td>${venta.vendedor || '-'}</td>
                    <td>
                        <button class="action-btn" onclick="verFactura(${venta.id})" title="Ver factura"><i class="fas fa-receipt"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        const tbody = document.querySelector('#tabla-ventas tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Error al cargar ventas<\/td></tr>';
        }
    }
}

function verFactura(id) {
    window.open(`factura.html?id=${id}`, '_blank');
}

// ============================================
// FUNCIONES DE CONTABILIDAD
// ============================================

async function cargarContabilidad() {
    try {
        // Cargar ingresos (ventas)
        const ventasRes = await fetch(`${SUPABASE_URL}/rest/v1/ventas`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const ventas = await ventasRes.json();
        const totalIngresos = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
        if (document.getElementById('stats-ingresos')) {
            document.getElementById('stats-ingresos').textContent = `$${totalIngresos.toLocaleString()}`;
        }
        
        // Cargar egresos (compras + gastos)
        const comprasRes = await fetch(`${SUPABASE_URL}/rest/v1/compras`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const compras = await comprasRes.json();
        const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);
        
        const gastosRes = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const gastos = await gastosRes.json();
        const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
        
        const totalEgresos = totalCompras + totalGastos;
        if (document.getElementById('stats-egresos')) {
            document.getElementById('stats-egresos').textContent = `$${totalEgresos.toLocaleString()}`;
        }
        
    } catch (error) {
        console.error('Error cargando contabilidad:', error);
    }
}

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.add('active');
        // Scroll al formulario
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.remove('active');
        
        if (tipo === 'producto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Producto';
            
            // Limpiar variantes
            const container = document.getElementById('variantes-container');
            if (container) {
                container.innerHTML = '';
                varianteCount = 0;
                agregarVariante();
            }
        } else if (tipo === 'compra') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-compra .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Compra';
        } else if (tipo === 'gasto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-gasto .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Gasto';
        } else if (tipo === 'proveedor') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-proveedor .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Guardar Proveedor';
        } else if (tipo === 'perfil') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-perfil .submit-btn');
            if (submitBtn) submitBtn.textContent = 'Crear Usuario';
            
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
    
    // Scroll suave a la alerta
    alerta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        alerta.style.display = 'none';
    }, 4000);
}
