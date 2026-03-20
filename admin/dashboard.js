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
        // Productos base
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await prodRes.json();
        document.getElementById('stats-total-productos').textContent = productos.length;
        
        // Stock bajo (consultar variantes)
        const varRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?stock.lt.5`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantesBajo = await varRes.json();
        const productosBajoStock = new Set(variantesBajo.map(v => v.producto_id)).size;
        document.getElementById('stats-stock-bajo').textContent = productosBajoStock;
        
        // Proveedores
        const provRes = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const proveedores = await provRes.json();
        document.getElementById('stats-proveedores').textContent = proveedores.length;
        
        // Perfiles
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
// NUEVAS FUNCIONES PARA TALLAS Y COLORES
// ============================================

let tallaCount = 0;
let colorCounters = {};

// Función para agregar una nueva talla
function agregarTalla() {
    const container = document.getElementById('tallas-container');
    const tallaId = tallaCount;
    colorCounters[tallaId] = 0;
    
    const tallaHTML = `
        <div class="talla-card" id="talla-${tallaId}" style="
            background: #fff9fc;
            border: 2px solid #ffe4e9;
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="color: #ff6b6b; margin:0;">📏 Talla <span class="talla-numero">${tallaId + 1}</span></h4>
                ${tallaId > 0 ? 
                    `<button type="button" onclick="eliminarTalla(${tallaId})" class="remove-variante">✖️ Eliminar talla</button>` 
                    : ''
                }
            </div>
            
            <div class="form-group">
                <label>Nombre de la talla:</label>
                <input type="text" id="talla-${tallaId}-nombre" placeholder="Ej: S, M, L, XL, 6, 8, 10..." required>
            </div>
            
            <div style="margin: 1rem 0;">
                <h5 style="color: #ff6b6b; margin-bottom: 0.5rem;">🎨 Colores para esta talla:</h5>
                <div id="talla-${tallaId}-colores-container" class="colores-container-talla"></div>
                <button type="button" onclick="agregarColorATalla(${tallaId})" class="add-btn" style="margin-top: 0.5rem;">
                    ➕ Agregar color
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', tallaHTML);
    
    // Agregar un color por defecto
    setTimeout(() => {
        agregarColorATalla(tallaId);
    }, 100);
    
    tallaCount++;
}

// Función para agregar un color a una talla específica
function agregarColorATalla(tallaId) {
    const container = document.getElementById(`talla-${tallaId}-colores-container`);
    const colorId = colorCounters[tallaId];
    
    const colorHTML = `
        <div class="color-row" id="talla-${tallaId}-color-${colorId}" style="
            background: white;
            border: 1px solid #ffe4e9;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
        ">
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 150px;">
                                    <label style="font-size: 0.9rem; color: #ff6b6b;">Color:</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="color" id="talla-${tallaId}-color-${colorId}-hex" value="#ff0000" style="width: 50px; height: 40px; border: 2px solid #ffe4e9; border-radius: 10px;">
                        <input type="text" id="talla-${tallaId}-color-${colorId}-nombre" placeholder="Nombre del color (ej: Rojo)" style="flex:1; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                    </div>
                </div>
                
                <div style="flex: 1; min-width: 120px;">
                    <label style="font-size: 0.9rem; color: #ff6b6b;">Stock:</label>
                    <input type="number" id="talla-${tallaId}-color-${colorId}-stock" value="0" min="0" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                </div>
                
                <div style="flex: 1; min-width: 120px;">
                    <label style="font-size: 0.9rem; color: #ff6b6b;">Precio:</label>
                    <input type="number" id="talla-${tallaId}-color-${colorId}-precio" value="0" min="0" step="100" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;" required>
                </div>
                
                <div style="flex: 1; min-width: 120px;">
                    <label style="font-size: 0.9rem; color: #ff6b6b;">Precio compra:</label>
                    <input type="number" id="talla-${tallaId}-color-${colorId}-precio-compra" value="0" min="0" step="100" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                </div>
                
                <div>
                    <button type="button" onclick="eliminarColor(${tallaId}, ${colorId})" style="
                        background: #ffe4e9;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        color: #ff6b6b;
                        font-size: 1.2rem;
                    ">✖️</button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', colorHTML);
    colorCounters[tallaId]++;
}

// Función para eliminar una talla completa
function eliminarTalla(tallaId) {
    const element = document.getElementById(`talla-${tallaId}`);
    if (element) {
        element.remove();
        delete colorCounters[tallaId];
    }
}

// Función para eliminar un color específico
function eliminarColor(tallaId, colorId) {
    const element = document.getElementById(`talla-${tallaId}-color-${colorId}`);
    if (element) {
        element.remove();
    }
}

// Función para obtener los datos del formulario
function getProductoDataFromForm() {
    const tallas = [];
    
    for (let i = 0; i < tallaCount; i++) {
        const tallaElement = document.getElementById(`talla-${i}-nombre`);
        if (tallaElement && tallaElement.value.trim() !== '') {
            const colores = [];
            const colorCount = colorCounters[i] || 0;
            
            for (let j = 0; j < colorCount; j++) {
                const colorNombre = document.getElementById(`talla-${i}-color-${j}-nombre`);
                const colorHex = document.getElementById(`talla-${i}-color-${j}-hex`);
                const stock = document.getElementById(`talla-${i}-color-${j}-stock`);
                const precio = document.getElementById(`talla-${i}-color-${j}-precio`);
                const precioCompra = document.getElementById(`talla-${i}-color-${j}-precio-compra`);
                
                // Solo agregar si el color tiene nombre o si se ha configurado algo
                if (colorNombre && (colorNombre.value.trim() !== '' || (precio && precio.value > 0))) {
                    colores.push({
                        nombre: colorNombre.value.trim() || 'Color',
                        codigo: colorHex ? colorHex.value : '#cccccc',
                        stock: parseInt(stock?.value) || 0,
                        precio: parseFloat(precio?.value) || 0,
                        precioCompra: parseFloat(precioCompra?.value) || 0
                    });
                }
            }
            
            if (colores.length > 0) {
                tallas.push({
                    nombre: tallaElement.value.trim(),
                    colores: colores
                });
            }
        }
    }
    
    return tallas;
}

// Función guardar producto (actualizada)
async function guardarProductoBase() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // 1. Validar producto base
        const codigo = document.getElementById('producto-codigo')?.value;
        const nombre = document.getElementById('producto-nombre')?.value;
        const categoria = document.getElementById('producto-categoria')?.value;
        
        if (!codigo || !nombre || !categoria) {
            mostrarAlerta('Código, nombre y categoría son obligatorios', 'error');
            return;
        }
        
        // 2. Obtener tallas y colores
        const tallas = getProductoDataFromForm();
        if (tallas.length === 0) {
            mostrarAlerta('Debe agregar al menos una talla con colores', 'error');
            return;
        }
        
        console.log('Guardando producto:', { codigo, nombre, categoria, tallas });
        
        // 3. Verificar si estamos editando
        const formProducto = document.getElementById('form-producto');
        const editId = formProducto?.dataset.editId;
        
        let productoId;
        
        if (editId) {
            // Actualizar producto existente
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
            
            // Eliminar tallas y colores antiguos
            await fetch(`${SUPABASE_URL}/rest/v1/producto_tallas?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`
                }
            });
            
        } else {
            // Crear nuevo producto
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
            
            if (!response.ok) throw new Error('Error al crear producto');
            const productoGuardado = await response.json();
            productoId = productoGuardado[0].id;
        }
        
        // 4. Guardar tallas y colores
        for (let i = 0; i < tallas.length; i++) {
            const talla = tallas[i];
            
            // Insertar talla
            const tallaResponse = await fetch(`${SUPABASE_URL}/rest/v1/producto_tallas`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    producto_id: productoId,
                    talla: talla.nombre,
                    orden: i
                })
            });
            
            if (!tallaResponse.ok) continue;
            
            const tallaData = await tallaResponse.json();
            const tallaId = tallaData[0].id;
            
            // Insertar colores para esta talla
            for (const color of talla.colores) {
                const sku = `${codigo}-${talla.nombre}-${color.nombre}`.replace(/[^a-zA-Z0-9-]/g, '') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                
                await fetch(`${SUPABASE_URL}/rest/v1/talla_colores`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${token.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        talla_id: tallaId,
                        color_nombre: color.nombre,
                        color_codigo: color.codigo,
                        stock: color.stock,
                        precio_venta: color.precio,
                        precio_compra: color.precioCompra || 0,
                        sku: sku
                    })
                });
            }
        }
        
        mostrarAlerta(editId ? '🌸 Producto actualizado correctamente' : '🌸 Producto guardado correctamente', 'success');
        cerrarFormulario('producto');
        await cargarProductos();
        
        // Limpiar formulario
        document.getElementById('producto-codigo').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-categoria').value = '';
        document.getElementById('producto-imagen').value = '';
        
        const container = document.getElementById('tallas-container');
        if (container) {
            container.innerHTML = '';
        }
        tallaCount = 0;
        colorCounters = {};
        
        // Agregar una talla por defecto
        agregarTalla();
        
        if (editId) {
            delete document.getElementById('form-producto').dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto';
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// Función cargar productos (actualizada)
async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        const productos = await response.json();
        console.log('Productos cargados:', productos);
        
        const tbody = document.querySelector('#tabla-productos tbody');
        if (!tbody) return;
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay productos registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-total-productos').textContent = productos.length;
        
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
            const tallas = p.tallas || [];
            const numTallas = tallas.length;
            const totalColores = tallas.reduce((sum, t) => sum + (t.colores?.length || 0), 0);
            
            // Verificar stock bajo
            let stockBajo = 0;
            tallas.forEach(t => {
                t.colores?.forEach(c => {
                    if (c.stock < 5) stockBajo++;
                });
            });
            
            return `
                <tr ${stockBajo > 0 ? 'style="background: #fff0f3;"' : ''}>
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
                    <td>
                        <span title="${numTallas} tallas, ${totalColores} colores">
                            ${numTallas} tallas
                            ${stockBajo > 0 ? `<span style="color: #ff4757; margin-left: 5px;">⚠️${stockBajo}</span>` : ''}
                        </span>
                    </td>
                    <td>${p.stock_total || 0}</td>
                    <td>$${(p.precio_min || 0).toLocaleString()} - $${(p.precio_max || 0).toLocaleString()}</td>
                    <td>
                        <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                        <button class="action-btn" onclick="verVariantes(${p.id})" title="Ver tallas y colores">📋</button>
                        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Función para editar producto (actualizada)
async function editarProducto(id) {
    try {
        // Cargar datos del producto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const producto = await response.json();
        const p = producto[0];
        
        if (!p) {
            mostrarAlerta('Producto no encontrado', 'error');
            return;
        }
        
        // Cargar tallas y colores
        const tallasRes = await fetch(`${SUPABASE_URL}/rest/v1/producto_tallas?producto_id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const tallas = await tallasRes.json();
        
        // Mostrar formulario
        mostrarFormulario('producto');
        
        // Llenar datos básicos
        document.getElementById('producto-codigo').value = p.codigo || '';
        document.getElementById('producto-nombre').value = p.nombre || '';
        document.getElementById('producto-categoria').value = p.categoria || '';
        document.getElementById('producto-imagen').value = p.imagen_url || '';
        
        // Limpiar y recrear tallas
        const container = document.getElementById('tallas-container');
        if (container) {
            container.innerHTML = '';
            tallaCount = 0;
            colorCounters = {};
            
            for (const talla of tallas) {
                const tallaId = tallaCount;
                
                // Crear la talla
                agregarTalla();
                
                // Esperar a que se cree el DOM
                setTimeout(async () => {
                    document.getElementById(`talla-${tallaId}-nombre`).value = talla.talla;
                    
                    // Cargar colores de esta talla
                    const coloresRes = await fetch(`${SUPABASE_URL}/rest/v1/talla_colores?talla_id=eq.${talla.id}`, {
                        headers: { 'apikey': SUPABASE_KEY }
                    });
                    const colores = await coloresRes.json();
                    
                    // Eliminar el color por defecto
                    const containerColores = document.getElementById(`talla-${tallaId}-colores-container`);
                    containerColores.innerHTML = '';
                    
                    // Agregar colores existentes
                    for (const color of colores) {
                        const colorId = colorCounters[tallaId] || 0;
                        const colorHTML = `
                            <div class="color-row" id="talla-${tallaId}-color-${colorId}" style="background: white; border:1px solid #ffe4e9; border-radius:10px; padding:1rem; margin-bottom:1rem;">
                                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                                    <div style="flex:2; min-width:150px;">
                                        <label style="font-size:0.9rem; color:#ff6b6b;">Color:</label>
                                        <div style="display:flex; gap:0.5rem; align-items:center;">
                                            <input type="color" id="talla-${tallaId}-color-${colorId}-hex" value="${color.color_codigo || '#ff0000'}" style="width:50px; height:40px; border:2px solid #ffe4e9; border-radius:10px;">
                                            <input type="text" id="talla-${tallaId}-color-${colorId}-nombre" value="${color.color_nombre || ''}" placeholder="Nombre del color" style="flex:1; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                                        </div>
                                    </div>
                                    <div style="flex:1; min-width:120px;">
                                        <label style="font-size:0.9rem; color:#ff6b6b;">Stock:</label>
                                        <input type="number" id="talla-${tallaId}-color-${colorId}-stock" value="${color.stock || 0}" min="0" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                                    </div>
                                    <div style="flex:1; min-width:120px;">
                                        <label style="font-size:0.9rem; color:#ff6b6b;">Precio:</label>
                                        <input type="number" id="talla-${tallaId}-color-${colorId}-precio" value="${color.precio_venta || 0}" min="0" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;" required>
                                    </div>
                                    <div style="flex:1; min-width:120px;">
                                        <label style="font-size:0.9rem; color:#ff6b6b;">Precio compra:</label>
                                        <input type="number" id="talla-${tallaId}-color-${colorId}-precio-compra" value="${color.precio_compra || 0}" min="0" style="width:100%; padding:0.5rem; border:2px solid #ffe4e9; border-radius:10px;">
                                    </div>
                                    <div>
                                        <button type="button" onclick="eliminarColor(${tallaId}, ${colorId})" style="background:#ffe4e9; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; color:#ff6b6b;">✖️</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        containerColores.insertAdjacentHTML('beforeend', colorHTML);
                        colorCounters[tallaId]++;
                    }
                    
                    // Agregar botón para nuevo color
                    const btnHTML = `<button type="button" onclick="agregarColorATalla(${tallaId})" class="add-btn" style="margin-top:0.5rem;">➕ Agregar color</button>`;
                    containerColores.insertAdjacentHTML('beforeend', btnHTML);
                    
                }, 200 * (tallaId + 1)); // Delay para evitar conflictos
                
                tallaCount++;
            }
        }
        
        // Guardar ID para editar
        document.getElementById('form-producto').dataset.editId = id;
        
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

// Inicializar con una talla por defecto
setTimeout(() => {
    if (document.getElementById('tallas-container') && document.getElementById('tallas-container').children.length === 0) {
        agregarTalla();
    }
}, 500);
                   
// ============================================
// FUNCIÓN PARA VER DETALLE DE VARIANTES (MEJORADA)
// ============================================

async function verVariantes(id) {
    try {
        console.log('Ver variantes del producto:', id);
        
        // Mostrar indicador de carga
        mostrarAlerta('Cargando variantes...', 'success');
        
        // Buscar el producto con sus variantes
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar variantes');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            mostrarAlerta('Producto no encontrado', 'error');
            return;
        }
        
        const producto = data[0];
        const variantes = producto.variantes || [];
        
        // Función para obtener emoji según categoría
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
        
        // Crear modal bonito
        const modalHTML = `
            <div id="modal-variantes" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            ">
                <div style="
                    background: white;
                    border-radius: 25px;
                    padding: 2rem;
                    max-width: 800px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(255,154,158,0.3);
                    border: 3px solid #ffe4e9;
                ">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="color: #ff6b6b; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 2rem;">${getEmojiCategoria(producto.categoria)}</span>
                            ${producto.nombre}
                        </h2>
                        <button onclick="cerrarModalVariantes()" style="
                            background: #ffe4e9;
                            border: none;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #ff6b6b;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    
                    <!-- Info del producto -->
                    <div style="
                        background: #fff9fc;
                        border-radius: 15px;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                        display: flex;
                        gap: 2rem;
                        flex-wrap: wrap;
                    ">
                        <div><strong>Código:</strong> ${producto.codigo}</div>
                        <div><strong>Categoría:</strong> ${producto.categoria}</div>
                        <div><strong>Stock total:</strong> <span style="color: #27ae60; font-weight: bold;">${producto.stock_total || 0}</span> unidades</div>
                        <div><strong>Rango precio:</strong> $${producto.precio_min || 0} - $${producto.precio_max || 0}</div>
                    </div>
                    
                    <!-- Tabla de variantes -->
                    <h3 style="color: #ff6b6b; margin-bottom: 1rem;">📋 Variantes (${variantes.length})</h3>
                    
                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 15px;
                        overflow: hidden;
                    ">
                        <thead>
                            <tr style="background: #fff0f3;">
                                <th style="padding: 1rem; text-align: left; color: #ff6b6b;">Talla</th>
                                <th style="padding: 1rem; text-align: left; color: #ff6b6b;">Color</th>
                                <th style="padding: 1rem; text-align: right; color: #ff6b6b;">Stock</th>
                                <th style="padding: 1rem; text-align: right; color: #ff6b6b;">Precio</th>
                                <th style="padding: 1rem; text-align: left; color: #ff6b6b;">SKU</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${variantes.map(v => `
                                <tr style="border-bottom: 1px solid #ffe4e9;">
                                    <td style="padding: 1rem; font-weight: 600;">${v.talla}</td>
                                    <td style="padding: 1rem;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="
                                                display: inline-block;
                                                width: 25px;
                                                height: 25px;
                                                background-color: ${v.color_codigo || '#cccccc'};
                                                border-radius: 50%;
                                                border: 2px solid white;
                                                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                                            "></span>
                                            <span>${v.color_nombre || 'No especificado'}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 1rem; text-align: right; font-weight: bold; color: ${v.stock < 5 ? '#ff4757' : '#27ae60'};">
                                        ${v.stock || 0}
                                        ${v.stock < 5 ? ' ⚠️' : ''}
                                    </td>
                                    <td style="padding: 1rem; text-align: right; font-weight: bold;">$${(v.precio_venta || 0).toLocaleString()}</td>
                                    <td style="padding: 1rem; font-family: monospace; font-size: 0.85rem; color: #a5a5a5;">${v.sku}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <!-- Botón de cierre -->
                    <div style="margin-top: 2rem; text-align: center;">
                        <button onclick="cerrarModalVariantes()" style="
                            background: #ffb6c1;
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 50px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            width: 200px;
                        ">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Cerrar la alerta de carga
        const alerta = document.getElementById('alertMessage');
        if (alerta) alerta.style.display = 'none';
        
    } catch (error) {
        console.error('Error al ver variantes:', error);
        mostrarAlerta('Error al cargar variantes', 'error');
    }
}

// Función para cerrar el modal de variantes
function cerrarModalVariantes() {
    const modal = document.getElementById('modal-variantes');
    if (modal) {
        modal.remove();
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
