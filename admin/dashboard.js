// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34 (COMPLETO)
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
    cambiarModulo('productos'); // Empezamos en productos por defecto
});

// ============================================
// 🛡️ FUNCIONES DE AUTENTICACIÓN
// ============================================

async function verificarSesion() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const token = JSON.parse(tokenData);
        
        // Verificar token con Supabase
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });

        if (!response.ok) throw new Error('Sesión inválida');

        const user = await response.json();
        currentUser = user;
        
        // Obtener perfil
        const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfil = await perfilRes.json();
        
        const userNameSpan = document.getElementById('userNameDisplay');
        if (userNameSpan) {
            userNameSpan.textContent = perfil[0]?.nombre || user.email || 'Administradora';
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

// ============================================
// 🧭 FUNCIONES DE NAVEGACIÓN
// ============================================

function cambiarModulo(modulo) {
    // Ocultar todos los módulos
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar el módulo seleccionado
    const moduloElement = document.getElementById(`modulo-${modulo}`);
    if (moduloElement) {
        moduloElement.style.display = 'block';
    }
    
    // Actualizar botones activos
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Buscar el botón por el texto o por el onclick
    const botones = document.querySelectorAll('.nav-btn');
    botones.forEach(btn => {
        if (btn.textContent.includes(modulo.toUpperCase())) {
            btn.classList.add('active');
        }
    });
    
    currentModule = modulo;
    
    // Cargar datos del módulo
    cargarDatosModulo(modulo);
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos':
            await cargarProductos();
            await cargarProveedoresSelect('producto');
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
            await cargarContabilidad();
            break;
    }
}

// ============================================
// 📊 FUNCIONES DE DATOS INICIALES
// ============================================

async function cargarDatosIniciales() {
    try {
        // Productos
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await prodRes.json();
        const totalProductos = document.getElementById('stats-total-productos');
        if (totalProductos) totalProductos.textContent = productos.length;
        
        const stockBajo = productos.filter(p => p.stock_actual < 5).length;
        const stockBajoEl = document.getElementById('stats-stock-bajo');
        if (stockBajoEl) stockBajoEl.textContent = stockBajo;
        
        // Proveedores
        const provRes = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const proveedores = await provRes.json();
        const totalProv = document.getElementById('stats-proveedores');
        if (totalProv) totalProv.textContent = proveedores.length;
        
        // Perfiles
        const perfRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await perfRes.json();
        const totalEmpleados = document.getElementById('stats-empleados');
        if (totalEmpleados) totalEmpleados.textContent = perfiles.length;
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

// ============================================
// 🎨 FUNCIONES PARA MANEJO DE COLORES
// ============================================

function agregarColor() {
    const container = document.getElementById('colores-container');
    if (!container) return;
    
    const newRow = document.createElement('div');
    newRow.className = 'color-row';
    newRow.innerHTML = `
        <input type="color" id="color-input-${colorCount}" value="#ff0000" class="color-picker">
        <input type="text" id="color-nombre-${colorCount}" placeholder="Nombre del color (ej: Rojo)" class="color-nombre">
        <button type="button" onclick="eliminarColor(this)" class="color-btn remove-color">✖️</button>
    `;
    container.appendChild(newRow);
    colorCount++;
}

function eliminarColor(boton) {
    boton.parentElement.remove();
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

function cargarColoresEnFormulario(colores) {
    const container = document.getElementById('colores-container');
    if (!container) return;
    
    // Limpiar container
    container.innerHTML = '';
    colorCount = 0;
    
    if (!colores || colores.length === 0) {
        // Si no hay colores, mostrar un campo vacío
        const newRow = document.createElement('div');
        newRow.className = 'color-row';
        newRow.innerHTML = `
            <input type="color" id="color-input-${colorCount}" value="#ff0000" class="color-picker">
            <input type="text" id="color-nombre-${colorCount}" placeholder="Nombre del color" class="color-nombre">
            <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
        `;
        container.appendChild(newRow);
        colorCount = 1;
        return;
    }
    
    // Cargar colores existentes
    colores.forEach((color, index) => {
        const newRow = document.createElement('div');
        newRow.className = 'color-row';
        newRow.innerHTML = `
            <input type="color" id="color-input-${index}" value="${color.codigo}" class="color-picker">
            <input type="text" id="color-nombre-${index}" value="${color.nombre}" placeholder="Nombre del color" class="color-nombre">
            <button type="button" onclick="eliminarColor(this)" class="color-btn remove-color">✖️</button>
        `;
        container.appendChild(newRow);
        colorCount = index + 1;
    });
    
    // Agregar botón para nuevo color
    const addButtonRow = document.createElement('div');
    addButtonRow.className = 'color-row';
    addButtonRow.innerHTML = `
        <button type="button" onclick="agregarColor()" class="color-btn add-color" style="width:100%;">➕ Agregar otro color</button>
    `;
    container.appendChild(addButtonRow);
}

// ============================================
// 📦 FUNCIONES DE PRODUCTOS (COMPLETAS)
// ============================================

async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        
        const tbody = document.querySelector('#tabla-productos tbody');
        if (!tbody) return;
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay productos registrados</td></tr>';
            return;
        }
        
        // Actualizar stats
        const totalProductos = document.getElementById('stats-total-productos');
        if (totalProductos) totalProductos.textContent = productos.length;
        
        const stockBajo = productos.filter(p => p.stock_actual < 5).length;
        const stockBajoEl = document.getElementById('stats-stock-bajo');
        if (stockBajoEl) stockBajoEl.textContent = stockBajo;
        
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
                        `<div style="display: flex; gap: 5px; flex-wrap: wrap;">
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
        mostrarAlerta('Error al cargar productos', 'error');
    }
}

async function guardarProducto() {
    // Obtener los colores del formulario
    const coloresArray = getColoresFromForm();
    
    const producto = {
        codigo: document.getElementById('producto-codigo')?.value || '',
        categoria: document.getElementById('producto-categoria')?.value || '',
        puc: document.getElementById('producto-puc')?.value || '143501',
        nombre: document.getElementById('producto-nombre')?.value || '',
        imagen_url: document.getElementById('producto-imagen')?.value || null,
        talla: document.getElementById('producto-talla')?.value || null,
        color: coloresArray,
        precio_compra: parseFloat(document.getElementById('producto-precio-compra')?.value || 0),
        precio_venta: parseFloat(document.getElementById('producto-precio-venta')?.value || 0),
        stock_actual: parseInt(document.getElementById('producto-stock')?.value || 0),
        proveedor_id: document.getElementById('producto-proveedor')?.value || null
    };
    
    // Validaciones
    if (!producto.codigo || !producto.categoria || !producto.nombre || !producto.precio_venta) {
        mostrarAlerta('Código, categoría, nombre y precio de venta son obligatorios', 'error');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        let response;
        
        if (productoEnEdicion) {
            // ACTUALIZAR producto existente
            response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${productoEnEdicion}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producto)
            });
        } else {
            // CREAR nuevo producto
            response = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(producto)
            });
        }
        
        if (response.ok) {
            mostrarAlerta(productoEnEdicion ? '🌸 Producto actualizado' : '🌸 Producto guardado', 'success');
            cerrarFormulario('producto');
            productoEnEdicion = null;
            await cargarProductos();
            limpiarFormularioProducto();
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

async function editarProducto(id) {
    try {
        // Obtener producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        const producto = productos[0];
        
        if (!producto) return;
        
        productoEnEdicion = id;
        
        // Llenar formulario
        document.getElementById('producto-codigo').value = producto.codigo || '';
        document.getElementById('producto-categoria').value = producto.categoria || '';
        document.getElementById('producto-puc').value = producto.puc || '143501';
        document.getElementById('producto-nombre').value = producto.nombre || '';
        document.getElementById('producto-imagen').value = producto.imagen_url || '';
        document.getElementById('producto-talla').value = producto.talla || '';
        
        // Cargar colores
        let colores = [];
        if (producto.color) {
            if (typeof producto.color === 'string') {
                try {
                    colores = JSON.parse(producto.color);
                } catch {
                    colores = [{ nombre: producto.color, codigo: '#cccccc' }];
                }
            } else if (Array.isArray(producto.color)) {
                colores = producto.color;
            }
        }
        cargarColoresEnFormulario(colores);
        
        document.getElementById('producto-precio-compra').value = producto.precio_compra || '';
        document.getElementById('producto-precio-venta').value = producto.precio_venta || '';
        document.getElementById('producto-stock').value = producto.stock_actual || '';
        document.getElementById('producto-proveedor').value = producto.proveedor_id || '';
        
        // Cambiar texto del botón
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Actualizar Producto';
        
        mostrarFormulario('producto');
        
    } catch (error) {
        console.error('Error al editar:', error);
        mostrarAlerta('Error al cargar producto', 'error');
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Estás segura de eliminar este producto? Esta acción no se puede deshacer.')) {
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
            mostrarAlerta('✅ Producto eliminado', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('Error al eliminar producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function ajustarStock(id) {
    const nuevoStock = prompt('Ingrese el nuevo stock:');
    if (nuevoStock === null) return;
    
    actualizarStock(id, parseInt(nuevoStock));
}

async function actualizarStock(id, nuevoStock) {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stock_actual: nuevoStock })
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Stock actualizado', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('Error al actualizar stock', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function limpiarFormularioProducto() {
    document.getElementById('producto-codigo').value = '';
    document.getElementById('producto-categoria').value = '';
    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-imagen').value = '';
    document.getElementById('producto-talla').value = '';
    
    // Resetear colores
    const container = document.getElementById('colores-container');
    if (container) {
        container.innerHTML = `
            <div class="color-row">
                <input type="color" id="color-input-0" value="#ff0000" class="color-picker">
                <input type="text" id="color-nombre-0" placeholder="Nombre del color (ej: Rojo)" class="color-nombre">
                <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
            </div>
        `;
    }
    colorCount = 1;
    
    document.getElementById('producto-precio-compra').value = '';
    document.getElementById('producto-precio-venta').value = '';
    document.getElementById('producto-stock').value = '';
    document.getElementById('producto-proveedor').value = '';
    
    // Restaurar texto del botón
    const submitBtn = document.querySelector('#form-producto .submit-btn');
    if (submitBtn) submitBtn.textContent = '🌸 Guardar Producto';
    
    productoEnEdicion = null;
}

// ============================================
// 📦 FUNCIONES DE PROVEEDORES
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
        console.error('Error cargando proveedores para select:', error);
    }
}

async function guardarProveedor() {
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
            // Limpiar formulario
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
    if (!confirm('¿Eliminar este proveedor?')) return;
    
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
// 👥 FUNCIONES DE PERFILES
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
    const nombre = document.getElementById('perfil-nombre')?.value;
    const email = document.getElementById('perfil-email')?.value;
    const password = document.getElementById('perfil-password')?.value;
    const rol = document.getElementById('perfil-rol')?.value;
    
    if (!nombre || !email || !password) {
        mostrarAlerta('Todos los campos son obligatorios', 'error');
        return;
    }
    
    try {
        // 1. Crear usuario en Auth
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
        
        // 2. Crear perfil
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
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
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

function editarPerfil(id) {
    alert('Función de editar perfil en desarrollo');
}

async function eliminarPerfil(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // Eliminar perfil
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
// 🛒 FUNCIONES DE COMPRAS (BÁSICAS)
// ============================================

async function cargarCompras() {
    console.log('Cargar compras - Pendiente de implementación completa');
    const tbody = document.querySelector('#tabla-compras tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Módulo en desarrollo</td></tr>';
    }
}

// ============================================
// 💸 FUNCIONES DE GASTOS (BÁSICAS)
// ============================================

async function cargarGastos() {
    console.log('Cargar gastos - Pendiente de implementación completa');
    const tbody = document.querySelector('#tabla-gastos tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Módulo en desarrollo</td></tr>';
    }
}

// ============================================
// 💰 FUNCIONES DE VENTAS (BÁSICAS)
// ============================================

async function cargarVentas() {
    console.log('Cargar ventas - Pendiente de implementación completa');
    const tbody = document.querySelector('#tabla-ventas tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Módulo en desarrollo</td></tr>';
    }
}

// ============================================
// 📊 FUNCIONES DE CONTABILIDAD (BÁSICAS)
// ============================================

async function cargarContabilidad() {
    console.log('Cargar contabilidad - Pendiente de implementación completa');
}

// ============================================
// 🛠️ FUNCIONES UTILITARIAS
// ============================================

function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) form.classList.add('active');
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) form.classList.remove('active');
    
    // Si es el formulario de productos, limpiar
    if (tipo === 'producto') {
        limpiarFormularioProducto();
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
