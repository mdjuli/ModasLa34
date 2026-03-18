// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34
// ============================================

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentModule = 'compras';
let colorCount = 1;
let productoEnEdicion = null; // Para editar productos

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌸 Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('productos'); // Empezamos por productos para probar
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

// ===== NAVEGACIÓN ENTRE MÓDULOS =====
function cambiarModulo(modulo) {
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    document.getElementById(`modulo-${modulo}`).style.display = 'block';
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
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
    }
}

// ===== DATOS INICIALES =====
async function cargarDatosIniciales() {
    try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await prodRes.json();
        document.getElementById('stats-total-productos').textContent = productos.length;
        
        const stockBajo = productos.filter(p => p.stock_actual < 5).length;
        document.getElementById('stats-stock-bajo').textContent = stockBajo;
        
        const provRes = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const proveedores = await provRes.json();
        document.getElementById('stats-proveedores').textContent = proveedores.length;
        
        const perfRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await perfRes.json();
        document.getElementById('stats-empleados').textContent = perfiles.length;
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

// ============================================
// 🎯 PRODUCTOS - FUNCIONES COMPLETAS
// ============================================

// Cargar productos
async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        
        const tbody = document.querySelector('#tabla-productos tbody');
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay productos registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-total-productos').textContent = productos.length;
        const stockBajo = productos.filter(p => p.stock_actual < 5).length;
        document.getElementById('stats-stock-bajo').textContent = stockBajo;
        
        function getEmojiCategoria(cat) {
            const emojis = {
                'vestidos': '👗',
                'blusas': '👚',
                'pantalones': '👖',
                'deportivo': '⚽',
                'caballero': '👔',
                'accesorios': '🎀'
            };
            return emojis[cat] || '📦';
        }
        
        tbody.innerHTML = productos.map(p => {
            // Procesar colores
            let colores = [];
            if (p.color) {
                if (typeof p.color === 'string') {
                    try {
                        colores = JSON.parse(p.color);
                    } catch {
                        colores = [{ nombre: p.color, codigo: '#cccccc' }];
                    }
                } else if (Array.isArray(p.color)) {
                    colores = p.color;
                }
            }
            
            return `
            <tr ${p.stock_actual < 5 ? 'style="background: #fff0f3;"' : ''}>
                <td>
                    ${p.imagen_url ? 
                        `<img src="${p.imagen_url}" alt="${p.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 10px;">` : 
                        `<div style="width: 50px; height: 50px; background: #ffe4e9; border-radius: 10px; display: flex; align-items: center; justify-content: center;">${getEmojiCategoria(p.categoria)}</div>`
                    }
                </td>
                <td>${p.codigo || '-'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>
                    <span style="background: #ffe4e9; padding: 0.2rem 0.8rem; border-radius: 50px;">
                        ${getEmojiCategoria(p.categoria)} ${p.categoria || 'Sin categoría'}
                    </span>
                </td>
                <td>${p.talla || '-'}</td>
                <td>
                    ${colores.length > 0 ? 
                        `<div style="display: flex; gap: 5px;">
                            ${colores.map(c => 
                                `<span style="display: inline-block; width: 20px; height: 20px; background-color: ${c.codigo}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="${c.nombre}"></span>`
                            ).join('')}
                         </div>` : 
                        '-'
                    }
                </td>
                <td>$${(p.precio_venta || 0).toLocaleString()}</td>
                <td>
                    <span style="font-weight: bold; color: ${p.stock_actual < 5 ? '#ff4757' : '#27ae60'};">
                        ${p.stock_actual || 0}
                    </span>
                    ${p.stock_actual < 5 ? ' ⚠️' : ''}
                </td>
                <td><span style="background: #fff0f3; padding: 0.2rem 0.5rem; border-radius: 50px;">${p.puc || '143501'}</span></td>
                <td>
                    <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                    <button class="action-btn" onclick="ajustarStock(${p.id})" title="Ajustar stock">📦</button>
                    <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `}).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// ELIMINAR PRODUCTO (FUNCIONAL)
async function eliminarProducto(id) {
    if (!confirm('¿Estás SEGURA de eliminar este producto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto eliminado correctamente', 'success');
            await cargarProductos(); // Recargar la tabla
        } else {
            const error = await response.json();
            mostrarAlerta('❌ Error: ' + (error.message || 'No se pudo eliminar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error de conexión', 'error');
    }
}

// EDITAR PRODUCTO (FUNCIONAL)
async function editarProducto(id) {
    try {
        // Obtener datos del producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        const producto = productos[0];
        
        if (!producto) {
            mostrarAlerta('❌ Producto no encontrado', 'error');
            return;
        }
        
        productoEnEdicion = producto;
        
        // Llenar el formulario con los datos del producto
        document.getElementById('producto-codigo').value = producto.codigo || '';
        document.getElementById('producto-categoria').value = producto.categoria || '';
        document.getElementById('producto-puc').value = producto.puc || '143501';
        document.getElementById('producto-nombre').value = producto.nombre || '';
        document.getElementById('producto-imagen').value = producto.imagen_url || '';
        document.getElementById('producto-talla').value = producto.talla || '';
        
        // Limpiar colores actuales
        const container = document.getElementById('colores-container');
        container.innerHTML = '';
        colorCount = 0;
        
        // Cargar colores del producto
        if (producto.color && producto.color.length > 0) {
            producto.color.forEach((color, index) => {
                const newRow = document.createElement('div');
                newRow.className = 'color-row';
                newRow.innerHTML = `
                    <input type="color" id="color-input-${index}" value="${color.codigo || '#ff0000'}" class="color-picker">
                    <input type="text" id="color-nombre-${index}" value="${color.nombre || ''}" placeholder="Nombre del color" class="color-nombre">
                    <button type="button" onclick="eliminarColor(this)" class="color-btn remove-color">✖️</button>
                `;
                container.appendChild(newRow);
                colorCount = index + 1;
            });
        } else {
            // Si no tiene colores, agregar uno vacío
            const newRow = document.createElement('div');
            newRow.className = 'color-row';
            newRow.innerHTML = `
                <input type="color" id="color-input-0" value="#ff0000" class="color-picker">
                <input type="text" id="color-nombre-0" placeholder="Nombre del color" class="color-nombre">
                <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
            `;
            container.appendChild(newRow);
            colorCount = 1;
        }
        
        document.getElementById('producto-precio-compra').value = producto.precio_compra || '';
        document.getElementById('producto-precio-venta').value = producto.precio_venta || '';
        document.getElementById('producto-stock').value = producto.stock_actual || '';
        
        // Cargar proveedores y seleccionar el actual
        await cargarProveedoresSelect('producto');
        if (producto.proveedor_id) {
            document.getElementById('producto-proveedor').value = producto.proveedor_id;
        }
        
        // Cambiar el botón de guardar para que sea "Actualizar"
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        submitBtn.textContent = '🌸 Actualizar Producto';
        submitBtn.onclick = function(e) {
            e.preventDefault();
            actualizarProducto(id);
        };
        
        // Mostrar el formulario
        mostrarFormulario('producto');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error al cargar el producto', 'error');
    }
}

// ACTUALIZAR PRODUCTO
async function actualizarProducto(id) {
    const coloresArray = getColoresFromForm();
    
    const producto = {
        codigo: document.getElementById('producto-codigo').value,
        categoria: document.getElementById('producto-categoria').value,
        puc: document.getElementById('producto-puc').value,
        nombre: document.getElementById('producto-nombre').value,
        imagen_url: document.getElementById('producto-imagen').value || null,
        talla: document.getElementById('producto-talla').value || null,
        color: coloresArray,
        precio_compra: parseFloat(document.getElementById('producto-precio-compra').value),
        precio_venta: parseFloat(document.getElementById('producto-precio-venta').value),
        stock_actual: parseInt(document.getElementById('producto-stock').value),
        proveedor_id: document.getElementById('producto-proveedor').value || null
    };
    
    if (!producto.codigo || !producto.categoria || !producto.nombre || !producto.precio_venta) {
        mostrarAlerta('Código, categoría, nombre y precio de venta son obligatorios', 'error');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Producto actualizado correctamente', 'success');
            cerrarFormulario('producto');
            await cargarProductos();
            resetFormularioProducto();
            productoEnEdicion = null;
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo actualizar'), 'error');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'error');
    }
}

// AJUSTAR STOCK
async function ajustarStock(id) {
    const nuevaCantidad = prompt('Ingrese la nueva cantidad de stock:', '0');
    if (nuevaCantidad === null) return;
    
    const cantidad = parseInt(nuevaCantidad);
    if (isNaN(cantidad) || cantidad < 0) {
        alert('Por favor ingrese un número válido');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stock_actual: cantidad })
        });
        
        if (response.ok) {
            mostrarAlerta('📦 Stock actualizado correctamente', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('❌ Error al actualizar stock', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error de conexión', 'error');
    }
}

// ===== FUNCIONES PARA MANEJO DE COLORES =====
function agregarColor() {
    const container = document.getElementById('colores-container');
    const newRow = document.createElement('div');
    newRow.className = 'color-row';
    newRow.innerHTML = `
        <input type="color" id="color-input-${colorCount}" value="#ff0000" class="color-picker">
        <input type="text" id="color-nombre-${colorCount}" placeholder="Nombre del color" class="color-nombre">
        <button type="button" onclick="eliminarColor(this)" class="color-btn remove-color">✖️</button>
        <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
    `;
    container.appendChild(newRow);
    colorCount++;
}

function eliminarColor(boton) {
    if (document.querySelectorAll('.color-row').length > 1) {
        boton.parentElement.remove();
    } else {
        alert('Debe haber al menos un color');
    }
}

function getColoresFromForm() {
    const colores = [];
    const rows = document.querySelectorAll('.color-row');
    
    rows.forEach(row => {
        const colorInput = row.querySelector('.color-picker');
        const nombreInput = row.querySelector('.color-nombre');
        
        if (nombreInput && nombreInput.value.trim() !== '') {
            colores.push({
                nombre: nombreInput.value.trim(),
                codigo: colorInput ? colorInput.value : '#cccccc'
            });
        }
    });
    
    return colores;
}

// ===== GUARDAR PRODUCTO (NUEVO) =====
async function guardarProducto() {
    const coloresArray = getColoresFromForm();
    
    const producto = {
        codigo: document.getElementById('producto-codigo').value,
        categoria: document.getElementById('producto-categoria').value,
        puc: document.getElementById('producto-puc').value,
        nombre: document.getElementById('producto-nombre').value,
        imagen_url: document.getElementById('producto-imagen').value || null,
        talla: document.getElementById('producto-talla').value || null,
        color: coloresArray,
        precio_compra: parseFloat(document.getElementById('producto-precio-compra').value),
        precio_venta: parseFloat(document.getElementById('producto-precio-venta').value),
        stock_actual: parseInt(document.getElementById('producto-stock').value),
        proveedor_id: document.getElementById('producto-proveedor').value || null
    };
    
    if (!producto.codigo || !producto.categoria || !producto.nombre || !producto.precio_venta) {
        mostrarAlerta('Código, categoría, nombre y precio de venta son obligatorios', 'error');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Producto guardado correctamente', 'success');
            cerrarFormulario('producto');
            await cargarProductos();
            resetFormularioProducto();
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'error');
    }
}

// Resetear formulario de producto
function resetFormularioProducto() {
    document.getElementById('producto-codigo').value = '';
    document.getElementById('producto-categoria').value = '';
    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-imagen').value = '';
    document.getElementById('producto-talla').value = '';
    document.getElementById('producto-precio-compra').value = '';
    document.getElementById('producto-precio-venta').value = '';
    document.getElementById('producto-stock').value = '';
    
    // Resetear colores
    const container = document.getElementById('colores-container');
    container.innerHTML = `
        <div class="color-row">
            <input type="color" id="color-input-0" value="#ff0000" class="color-picker">
            <input type="text" id="color-nombre-0" placeholder="Nombre del color (ej: Rojo)" class="color-nombre">
            <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
        </div>
    `;
    colorCount = 1;
    
    // Restaurar botón de guardar
    const submitBtn = document.querySelector('#form-producto .submit-btn');
    submitBtn.textContent = '🌸 Guardar Producto';
    submitBtn.onclick = function(e) {
        e.preventDefault();
        guardarProducto();
    };
}

// ===== FUNCIONES DE COMPRAS (pendientes) =====
async function cargarCompras() { 
    const tbody = document.querySelector('#tabla-compras tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Módulo de compras en desarrollo</td></tr>';
}

async function cargarGastos() {
    const tbody = document.querySelector('#tabla-gastos tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Módulo de gastos en desarrollo</td></tr>';
}

async function cargarPerfiles() {
    const tbody = document.querySelector('#tabla-perfiles tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Módulo de perfiles en desarrollo</td></tr>';
}

async function cargarProveedores() {
    const tbody = document.querySelector('#tabla-proveedores tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Módulo de proveedores en desarrollo</td></tr>';
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

// ===== FUNCIONES UTILITARIAS =====
function mostrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.add('active');
}

function cerrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.remove('active');
    if (tipo === 'producto') {
        resetFormularioProducto();
        productoEnEdicion = null;
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    alerta.textContent = mensaje;
    alerta.className = `alert ${tipo}`;
    alerta.style.display = 'block';
    
    setTimeout(() => {
        alerta.style.display = 'none';
    }, 3000);
}

// Funciones placeholder para otros módulos
function editarCompra(id) { alert('Editar compra ' + id); }
function eliminarCompra(id) { if(confirm('¿Eliminar esta compra?')) alert('Eliminar ' + id); }
function editarGasto(id) { alert('Editar gasto ' + id); }
function eliminarGasto(id) { if(confirm('¿Eliminar este gasto?')) alert('Eliminar ' + id); }
function editarProveedor(id) { alert('Editar proveedor ' + id); }
function eliminarProveedor(id) { if(confirm('¿Eliminar este proveedor?')) alert('Eliminar ' + id); }
function editarPerfil(id) { alert('Editar perfil ' + id); }
function eliminarPerfil(id) { if(confirm('¿Eliminar este usuario?')) alert('Eliminar ' + id); }
