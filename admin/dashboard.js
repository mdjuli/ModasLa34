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
    cambiarModulo('compras');
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

// ===== FUNCIONES DE PRODUCTOS (CON COLORES) =====
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

// ===== FUNCIÓN GUARDAR PRODUCTO (ACTUALIZADA) =====
async function guardarProducto() {
    // Obtener los colores del formulario
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
            
            // Limpiar formulario
            document.getElementById('producto-codigo').value = '';
            document.getElementById('producto-categoria').value = '';
            document.getElementById('producto-nombre').value = '';
            document.getElementById('producto-imagen').value = '';
            document.getElementById('producto-talla').value = '';
            
            // Limpiar colores (dejar solo uno)
            const container = document.getElementById('colores-container');
            container.innerHTML = `
                <div class="color-row">
                    <input type="color" id="color-input-0" value="#ff0000" class="color-picker">
                    <input type="text" id="color-nombre-0" placeholder="Nombre del color (ej: Rojo)" class="color-nombre">
                    <button type="button" onclick="agregarColor()" class="color-btn add-color">➕</button>
                </div>
            `;
            colorCount = 1;
            
            document.getElementById('producto-precio-compra').value = '';
            document.getElementById('producto-precio-venta').value = '';
            document.getElementById('producto-stock').value = '';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'error');
    }
}

// ===== FUNCIONES UTILITARIAS =====
function mostrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.add('active');
}

function cerrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`).classList.remove('active');
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

// ===== FUNCIONES DE COMPRAS (placeholders) =====
async function cargarCompras() { console.log('Cargar compras'); }
async function cargarProveedoresSelect(origen) { console.log('Cargar proveedores'); }
async function cargarGastos() { console.log('Cargar gastos'); }
async function cargarPerfiles() { console.log('Cargar perfiles'); }
async function cargarProveedores() { console.log('Cargar proveedores'); }
function editarProducto(id) { alert('Editar producto ' + id); }
function ajustarStock(id) { alert('Ajustar stock ' + id); }
function eliminarProducto(id) { if(confirm('¿Eliminar este producto?')) alert('Eliminar ' + id); }
