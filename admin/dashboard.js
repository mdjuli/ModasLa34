// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34
// ============================================

// Variables globales
let currentUser = null;
let currentModule = 'compras';
let colorCount = 1;

// ===== FUNCIONES DE INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('compras', null);
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
    
    // Si hay evento (viene de un clic), actualizar botones activos
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
    }
}

// ===== FUNCIONES DE DATOS INICIALES =====
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
// FUNCIONES DE PRODUCTOS (COMPLETAS)
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

// Editar producto
async function editarProducto(id) {
    try {
        // Primero, mostrar el formulario
        mostrarFormulario('producto');
        
        // Pequeña pausa para que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Obtener datos del producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const producto = await response.json();
        const p = producto[0];
        
        if (!p) {
            mostrarAlerta('Producto no encontrado', 'error');
            return;
        }
        
        // VERIFICAR QUE CADA CAMPO EXISTE antes de asignar
        const campoCodigo = document.getElementById('producto-codigo');
        const campoCategoria = document.getElementById('producto-categoria');
        const campoPuc = document.getElementById('producto-puc');
        const campoNombre = document.getElementById('producto-nombre');
        const campoImagen = document.getElementById('producto-imagen');
        const campoTalla = document.getElementById('producto-talla');
        const campoPrecioCompra = document.getElementById('producto-precio-compra');
        const campoPrecioVenta = document.getElementById('producto-precio-venta');
        const campoStock = document.getElementById('producto-stock');
        
        // Asignar valores solo si el campo existe
        if (campoCodigo) campoCodigo.value = p.codigo || '';
        if (campoCategoria) campoCategoria.value = p.categoria || '';
        if (campoPuc) campoPuc.value = p.puc || '143501';
        if (campoNombre) campoNombre.value = p.nombre || '';
        if (campoImagen) campoImagen.value = p.imagen_url || '';
        if (campoTalla) campoTalla.value = p.talla || '';
        
        // Limpiar colores existentes
        const container = document.getElementById('colores-container');
        if (container) {
            container.innerHTML = '';
            colorCount = 0;
            
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
            
            // Si hay colores, mostrarlos
            if (colores.length > 0) {
                colores.forEach((color, index) => {
                    const newRow = document.createElement('div');
                    newRow.className = 'color-row';
                    newRow.innerHTML = `
                        <input type="color" id="color-input-${colorCount}" value="${color.codigo || '#ff0000'}" class="color-picker">
                        <input type="text" id="color-nombre-${colorCount}" value="${color.nombre || ''}" placeholder="Nombre del color" class="color-nombre">
                        <button type="button" onclick="eliminarColor(this)" class="color-btn remove-color">✖️</button>
                    `;
                    container.appendChild(newRow);
                    colorCount++;
                });
                
                // Agregar botón para más colores
                const addBtnRow = document.createElement('div');
                addBtnRow.className = 'color-row';
                addBtnRow.innerHTML = `
                    <button type="button" onclick="agregarColor()" class="color-btn add-color" style="width:100%;">➕ Agregar otro color</button>
                `;
                container.appendChild(addBtnRow);
            } else {
                // Si no hay colores, mostrar un campo vacío
                const newRow = document.createElement('div');
                newRow.className = 'color-row';
                newRow.innerHTML = `
                    <input type="color" id="color-input-${colorCount}" value="#ff0000" class="color-picker">
                    <input type="text" id="color-nombre-${colorCount}" placeholder="Nombre del color" class="color-nombre">
                    <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
                `;
                container.appendChild(newRow);
                colorCount++;
            }
        }
        
        if (campoPrecioCompra) campoPrecioCompra.value = p.precio_compra || '';
        if (campoPrecioVenta) campoPrecioVenta.value = p.precio_venta || '';
        if (campoStock) campoStock.value = p.stock_actual || '';
        
        // Cargar proveedores y seleccionar el actual
        await cargarProveedoresSelect('producto');
        const campoProveedor = document.getElementById('producto-proveedor');
        if (campoProveedor && p.proveedor_id) {
            campoProveedor.value = p.proveedor_id;
        }
        
        // Guardar el ID del producto que estamos editando
        const formProducto = document.getElementById('form-producto');
        if (formProducto) {
            formProducto.dataset.editId = id;
        }
        
        // Cambiar el texto del botón
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '🌸 Actualizar Producto';
        }
        
    } catch (error) {
        console.error('Error al cargar producto para editar:', error);
        mostrarAlerta('Error al cargar el producto', 'error');
    }
}

// Función para guardar o actualizar producto
async function guardarProducto() {
    try {
        // Verificar token primero
        const tokenData = localStorage.getItem('admin_token');
        if (!tokenData) {
            mostrarAlerta('Sesión expirada', 'error');
            window.location.href = 'login.html';
            return;
        }
        const token = JSON.parse(tokenData);
        
        // Obtener los colores del formulario
        const coloresArray = getColoresFromForm();
        
        // Validar campos obligatorios
        const codigo = document.getElementById('producto-codigo')?.value;
        const categoria = document.getElementById('producto-categoria')?.value;
        const nombre = document.getElementById('producto-nombre')?.value;
        const precioVenta = parseFloat(document.getElementById('producto-precio-venta')?.value);
        
        if (!codigo || !categoria || !nombre || !precioVenta) {
            mostrarAlerta('Código, categoría, nombre y precio de venta son obligatorios', 'error');
            return;
        }
        
        const producto = {
            codigo: codigo,
            categoria: categoria,
            puc: document.getElementById('producto-puc')?.value || '143501',
            nombre: nombre,
            imagen_url: document.getElementById('producto-imagen')?.value || null,
            talla: document.getElementById('producto-talla')?.value || null,
            color: coloresArray,
            precio_compra: parseFloat(document.getElementById('producto-precio-compra')?.value) || 0,
            precio_venta: precioVenta,
            stock_actual: parseInt(document.getElementById('producto-stock')?.value) || 0,
            proveedor_id: document.getElementById('producto-proveedor')?.value || null
        };
        
        // Verificar si estamos editando o creando
        const formProducto = document.getElementById('form-producto');
        const editId = formProducto?.dataset.editId;
        
        let url = `${SUPABASE_URL}/rest/v1/productos`;
        let method = 'POST';
        
        if (editId) {
            url += `?id=eq.${editId}`;
            method = 'PATCH';
            console.log('Actualizando producto ID:', editId);
        }
        
        console.log('Enviando producto:', producto);
        console.log('URL:', url);
        console.log('Método:', method);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(producto)
        });
        
        const responseData = await response.json();
        console.log('Respuesta:', responseData);
        
        if (response.ok) {
            mostrarAlerta(editId ? '🌸 Producto actualizado correctamente' : '🌸 Producto guardado correctamente', 'success');
            
            // IMPORTANTE: Recargar productos ANTES de cerrar el formulario
            await cargarProductos();
            
            // Ahora sí, cerrar el formulario
            cerrarFormulario('producto');
            
            // Limpiar el ID de edición
            if (formProducto) {
                delete formProducto.dataset.editId;
            }
            
            // Restaurar texto del botón
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto';
            }
            
            // Limpiar formulario
            document.getElementById('producto-codigo').value = '';
            document.getElementById('producto-categoria').value = '';
            document.getElementById('producto-nombre').value = '';
            document.getElementById('producto-imagen').value = '';
            document.getElementById('producto-talla').value = '';
            
            // Limpiar colores (dejar solo uno)
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
            
        } else {
            console.error('Error en respuesta:', responseData);
            mostrarAlerta('Error: ' + (responseData.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('Error completo:', error);
        mostrarAlerta('Error de conexión: ' + error.message, 'error');
    }
}

// Eliminar producto
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
            mostrarAlerta('✅ Producto eliminado correctamente', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('Error al eliminar el producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// Ajustar stock
async function ajustarStock(id) {
    const nuevaCantidad = prompt('Ingrese la nueva cantidad de stock:');
    if (nuevaCantidad === null) return;
    
    const stock = parseInt(nuevaCantidad);
    if (isNaN(stock) || stock < 0) {
        mostrarAlerta('Por favor ingrese un número válido', 'error');
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
            body: JSON.stringify({ stock_actual: stock })
        });
        
        if (response.ok) {
            mostrarAlerta('📦 Stock actualizado correctamente', 'success');
            await cargarProductos();
        } else {
            mostrarAlerta('Error al actualizar stock', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
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
    `;
    container.appendChild(newRow);
    colorCount++;
}

function eliminarColor(boton) {
    if (document.querySelectorAll('.color-row').length > 1) {
        boton.parentElement.remove();
    } else {
        mostrarAlerta('Debe haber al menos un color', 'error');
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

// ============================================
// FUNCIONES DE PROVEEDORES (COMPLETAS)
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
// FUNCIONES DE COMPRAS (BÁSICAS)
// ============================================

async function cargarCompras() {
    const tbody = document.querySelector('#tabla-compras tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Módulo en desarrollo</td></tr>';
}

async function guardarCompra() {
    mostrarAlerta('Función de guardar compra en desarrollo', 'error');
}

// ============================================
// FUNCIONES DE GASTOS (BÁSICAS)
// ============================================

async function cargarGastos() {
    const tbody = document.querySelector('#tabla-gastos tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Módulo en desarrollo</td></tr>';
}

async function guardarGasto() {
    mostrarAlerta('Función de guardar gasto en desarrollo', 'error');
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
// FUNCIONES UTILITARIAS
// ============================================

function mostrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.add('active');
}

function cerrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.remove('active');
    
    // Si es el formulario de productos, limpiar el ID de edición
    if (tipo === 'producto') {
        delete document.getElementById('form-producto').dataset.editId;
        const submitBtn = document.querySelector('#form-producto .submit-btn');
        if (submitBtn) submitBtn.textContent = '🌸 Guardar Producto';
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
