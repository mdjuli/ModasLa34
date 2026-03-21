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
            <input type="color" id="color-hex-${colorId}" value="#ff0000" class="color-picker">
            <input type="text" id="color-nombre-${colorId}" placeholder="Nombre del color (ej: Rojo)" class="color-nombre-input">
            <input type="number" id="color-stock-${colorId}" placeholder="Stock" min="0" value="0" class="color-stock-input">
            <button type="button" onclick="eliminarColor('${colorId}')" class="btn-eliminar-color">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
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
                    const hexInput = document.getElementById(`color-hex-${colorId}`);
                    const stockInput = document.getElementById(`color-stock-${colorId}`);
                    
                    if (nombreInput && nombreInput.value.trim()) {
                        colores.push({
                            nombre: nombreInput.value.trim(),
                            codigo: hexInput ? hexInput.value : '#cccccc',
                            stock: parseInt(stockInput?.value) || 0
                        });
                    }
                }
            });
        }
        
        // Si no hay colores, crear uno por defecto con stock 0
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
        
        // Guardar producto base
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
            throw new Error(error.message || 'Error al guardar');
        }
        
        const productoGuardado = await response.json();
        const productoId = productoGuardado[0].id;
        
        // Guardar variantes con precio
        for (const variante of variantes) {
            const varianteData = {
                producto_id: productoId,
                talla: variante.talla,
                colores: variante.colores,
                stock_total: variante.stock_total,
                precio_venta: variante.precio_venta,
                precio_compra: 0,
                sku: `${codigo}-${variante.talla}`.toUpperCase()
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
            
            if (!varResponse.ok) {
                console.error('Error guardando variante:', await varResponse.text());
            }
        }
        
        mostrarAlerta('🌸 Producto guardado correctamente', 'success');
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
        
        // CORRECCIÓN: Obtener la fecha en formato YYYY-MM-DD sin conversión de zona
        const fechaInput = document.getElementById('compra-fecha').value;
        
        const compra = {
            proveedor_id: proveedorId,
            fecha: fechaInput, // Guardar exactamente como YYYY-MM-DD
            producto: document.getElementById('compra-producto').value,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado').value,
            puc: '620501'
        };
        
        if (!compra.fecha || !compra.producto) {
            mostrarAlerta('Fecha y producto son obligatorios', 'error');
            return;
        }
        
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Compra actualizada correctamente' : '🌸 Compra guardada correctamente', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
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
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
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
        
        // Mostrar formulario
        mostrarFormulario('compra');
        
        // Cargar proveedores y productos
        await cargarProveedoresSelect('compra');
        await cargarProductosSelect();
        
        // Llenar campos básicos
        document.getElementById('compra-proveedor').value = compra.proveedor_id || '';
        document.getElementById('compra-fecha').value = compra.fecha.split('T')[0];
        document.getElementById('compra-cantidad').value = compra.cantidad || '';
        document.getElementById('compra-precio').value = compra.precio_unitario || '';
        document.getElementById('compra-estado').value = compra.estado || 'Pendiente';
        
        // Si tiene producto asociado
        if (compra.producto_id) {
            document.getElementById('compra-producto-select').value = compra.producto_id;
            await cargarVariantesProducto();
            
            // Esperar un momento para que carguen las variantes
            setTimeout(() => {
                if (compra.variante_id) {
                    document.getElementById('compra-variante-select').value = compra.variante_id;
                }
            }, 500);
        } else {
            // Producto manual
            document.getElementById('compra-producto-manual').value = compra.producto || '';
            document.getElementById('compra-talla').value = compra.talla || '';
            document.getElementById('compra-color').value = compra.color_nombre || '';
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
        mostrarAlerta('Error al cargar la compra', 'error');
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

// Actualizar la función guardarCompra
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
        
        // Datos básicos de la compra
        const compra = {
            proveedor_id: proveedorId,
            fecha: document.getElementById('compra-fecha').value,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado').value,
            puc: '620501'
        };
        
        // Verificar si se seleccionó un producto existente
        const productoId = document.getElementById('compra-producto-select').value;
        const varianteSelect = document.getElementById('compra-variante-select');
        
        if (productoId && varianteSelect.value) {
            // Se seleccionó producto y variante
            const varianteOption = varianteSelect.options[varianteSelect.selectedIndex];
            
            compra.producto_id = productoId;
            compra.variante_id = varianteSelect.value;
            compra.producto = varianteOption.text.split('|')[0].replace('Talla:', '').trim();
            compra.talla = varianteOption.dataset.talla;
            compra.color_nombre = varianteOption.dataset.colorNombre;
            compra.color_codigo = varianteOption.dataset.colorCodigo;
            
        } else {
            // Producto manual
            compra.producto = document.getElementById('compra-producto-manual').value;
            compra.talla = document.getElementById('compra-talla').value || null;
            compra.color_nombre = document.getElementById('compra-color').value || null;
        }
        
        if (!compra.producto) {
            mostrarAlerta('Debe especificar el producto', 'error');
            return;
        }
        
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
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar');
        }
        
        // Si la compra está "Recibida" y tiene variante, actualizar stock
        if (compra.estado === 'Recibida' && compra.variante_id) {
            await actualizarStockPorCompra(compra.variante_id, cantidad);
        }
        
        mostrarAlerta(editId ? '🌸 Compra actualizada correctamente' : '🌸 Compra guardada correctamente', 'success');
        cerrarFormulario('compra');
        await cargarCompras();
        
        // Limpiar formulario
        document.getElementById('compra-fecha').value = '';
        document.getElementById('compra-producto-select').value = '';
        document.getElementById('compra-producto-manual').value = '';
        document.getElementById('compra-talla').value = '';
        document.getElementById('compra-color').value = '';
        document.getElementById('compra-cantidad').value = '';
        document.getElementById('compra-precio').value = '';
        document.getElementById('compra-variante-container').style.display = 'none';
        document.getElementById('compra-manual-container').style.display = 'block';
        
        // Limpiar ID de edición
        delete document.getElementById('form-compra').dataset.editId;
        
        // Restaurar texto del botón
        const submitBtn = document.querySelector('#form-compra .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Guardar Compra';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
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
        
        // Limpiar ID de edición según el tipo
        if (tipo === 'producto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto con Variantes';
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
