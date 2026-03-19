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
// FUNCIONES PARA VARIANTES (PRODUCTOS)
// ============================================

function agregarVariante() {
    const container = document.getElementById('variantes-container');
    if (!container) return;
    
    const varianteId = varianteCount;
    
    const varianteHTML = `
        <div class="variante-card" id="variante-${varianteId}">
            <div class="variante-header">
                <h4>📦 Variante #${varianteId + 1}</h4>
                ${varianteId > 0 ? 
                    `<button type="button" onclick="eliminarVariante(${varianteId})" class="remove-variante">✖️ Eliminar</button>` 
                    : ''
                }
            </div>
            
            <div class="form-row">
                <div class="form-group" style="flex:1;">
                    <label>Talla:</label>
                    <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: 6, 8, 10, S, M, L" required>
                </div>
                <div class="form-group" style="flex:1.5;">
                    <label>Color (hexadecimal):</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="text" id="variante-${varianteId}-color-hex" placeholder="Ej: #ff0000" value="#cccccc" style="flex:1;">
                        <span class="color-muestra" id="muestra-${varianteId}" style="background-color: #cccccc;"></span>
                    </div>
                </div>
                <div class="form-group" style="flex:1.5;">
                    <label>Nombre del color:</label>
                    <input type="text" id="variante-${varianteId}-color-nombre" placeholder="Ej: Azul">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group" style="flex:1;">
                    <label>Stock:</label>
                    <input type="number" id="variante-${varianteId}-stock" min="0" value="0" required>
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Precio venta:</label>
                    <input type="number" id="variante-${varianteId}-precio" min="0" required>
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Precio compra:</label>
                    <input type="number" id="variante-${varianteId}-precio-compra" min="0">
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', varianteHTML);
    
    // Agregar evento para actualizar muestra de color
    const colorInput = document.getElementById(`variante-${varianteId}-color-hex`);
    if (colorInput) {
        colorInput.addEventListener('input', function() {
            const muestra = document.getElementById(`muestra-${varianteId}`);
            if (muestra) {
                muestra.style.backgroundColor = this.value;
            }
        });
    }
    
    varianteCount++;
}

function eliminarVariante(id) {
    const element = document.getElementById(`variante-${id}`);
    if (element) {
        element.remove();
    }
}

function getVariantesFromForm() {
    const variantes = [];
    
    for (let i = 0; i < varianteCount; i++) {
        const tallaInput = document.getElementById(`variante-${i}-talla`);
        if (tallaInput && tallaInput.value.trim() !== '') {
            const hexInput = document.getElementById(`variante-${i}-color-hex`);
            const nombreInput = document.getElementById(`variante-${i}-color-nombre`);
            const stockInput = document.getElementById(`variante-${i}-stock`);
            const precioInput = document.getElementById(`variante-${i}-precio`);
            const precioCompraInput = document.getElementById(`variante-${i}-precio-compra`);
            
            let hexValue = hexInput?.value || '#cccccc';
            if (!hexValue.startsWith('#')) {
                hexValue = '#' + hexValue;
            }
            
            variantes.push({
                talla: tallaInput.value.trim(),
                color_nombre: nombreInput?.value?.trim() || null,
                color_codigo: hexValue,
                stock: parseInt(stockInput?.value) || 0,
                precio_venta: parseFloat(precioInput?.value) || 0,
                precio_compra: parseFloat(precioCompraInput?.value) || 0
            });
        }
    }
    
    return variantes;
}

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
        
        // 2. Obtener variantes
        const variantes = getVariantesFromForm();
        if (variantes.length === 0) {
            mostrarAlerta('Debe agregar al menos una variante', 'error');
            return;
        }
        
        console.log('Guardando producto:', { codigo, nombre, categoria, variantes });
        
        // 3. Verificar si estamos editando o creando
        const formProducto = document.getElementById('form-producto');
        const editId = formProducto?.dataset.editId;
        
        let productoId;
        
        if (editId) {
            // ACTUALIZAR producto existente
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
                throw new Error('Error al actualizar producto base');
            }
            
            // Eliminar variantes antiguas
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`
                }
            });
            
        } else {
            // CREAR nuevo producto
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
        }
        
        // 4. Guardar variantes una por una con manejo de errores
        let variantesGuardadas = 0;
        let variantesConError = 0;
        
        for (const variante of variantes) {
            try {
                // Generar SKU único
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 1000);
                const skuBase = `${codigo}-${variante.talla}-${variante.color_nombre || 'COLOR'}`.replace(/[^a-zA-Z0-9-]/g, '');
                
                const varianteData = {
                    producto_id: productoId,
                    talla: variante.talla,
                    color_nombre: variante.color_nombre || null,
                    color_codigo: variante.color_codigo || '#cccccc',
                    stock: variante.stock || 0,
                    precio_venta: variante.precio_venta || 0,
                    precio_compra: variante.precio_compra || 0,
                    sku: `${skuBase}-${timestamp}-${random}`
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
                } else {
                    variantesConError++;
                    const errorText = await varResponse.text();
                    console.error('Error guardando variante:', variante, errorText);
                }
                
                // Pequeña pausa para no saturar la API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (varError) {
                variantesConError++;
                console.error('Excepción guardando variante:', varError);
            }
        }
        
        // 5. Mostrar mensaje final
        if (variantesConError === 0) {
            mostrarAlerta(`🌸 Producto guardado con ${variantesGuardadas} variantes`, 'success');
        } else {
            mostrarAlerta(`⚠️ Producto guardado con ${variantesGuardadas} variantes (${variantesConError} errores)`, 'error');
        }
        
        cerrarFormulario('producto');
        await cargarProductos();
        
        // Limpiar formulario
        document.getElementById('producto-codigo').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-categoria').value = '';
        document.getElementById('producto-imagen').value = '';
        
        const container = document.getElementById('variantes-container');
        if (container) {
            container.innerHTML = '';
        }
        varianteCount = 0;
        agregarVariante();
        
        // Limpiar ID de edición
        if (formProducto) {
            delete formProducto.dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto con Variantes';
            }
        }
        
    } catch (error) {
        console.error('Error general:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

async function cargarProductos() {
    try {
        // Usar la vista completa
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
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
            const variantes = p.variantes || [];
            const totalStock = variantes.reduce((sum, v) => sum + (v.stock || 0), 0);
            const precios = variantes.map(v => v.precio_venta || 0);
            const precioMin = precios.length ? Math.min(...precios) : 0;
            const precioMax = precios.length ? Math.max(...precios) : 0;
            const precioTexto = precioMin === precioMax ? 
                `$${precioMin}` : 
                `$${precioMin} - $${precioMax}`;
            
            const stockBajo = variantes.filter(v => v.stock < 5).length;
            
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
                        <span title="${variantes.length} variantes">
                            ${variantes.length} tallas/colores
                            ${stockBajo > 0 ? `<span style="color: #ff4757; margin-left: 5px;">⚠️${stockBajo}</span>` : ''}
                        </span>
                    </td>
                    <td>${totalStock}</td>
                    <td>${precioTexto}</td>
                    <td>
                        <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                        <button class="action-btn" onclick="verVariantes(${p.id})" title="Ver variantes">📋</button>
                        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

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
        
        // Cargar variantes
        const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await varResponse.json();
        
        // Mostrar formulario
        mostrarFormulario('producto');
        
        // Llenar datos básicos
        document.getElementById('producto-codigo').value = p.codigo || '';
        document.getElementById('producto-nombre').value = p.nombre || '';
        document.getElementById('producto-categoria').value = p.categoria || '';
        document.getElementById('producto-imagen').value = p.imagen_url || '';
        
        // Limpiar y recrear variantes
        const container = document.getElementById('variantes-container');
        if (container) {
            container.innerHTML = '';
            varianteCount = 0;
            
            variantes.forEach(v => {
                const varianteId = varianteCount;
                const varianteHTML = `
                    <div class="variante-card" id="variante-${varianteId}">
                        <div class="variante-header">
                            <h4>📦 Variante #${varianteId + 1}</h4>
                            <button type="button" onclick="eliminarVariante(${varianteId})" class="remove-variante">✖️ Eliminar</button>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Talla:</label>
                                <input type="text" id="variante-${varianteId}-talla" value="${v.talla || ''}" required>
                            </div>
                            <div class="form-group" style="flex:1.5;">
                                <label>Color (hex):</label>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <input type="text" id="variante-${varianteId}-color-hex" value="${v.color_codigo || '#cccccc'}" style="flex:1;">
                                    <span class="color-muestra" id="muestra-${varianteId}" style="background-color: ${v.color_codigo || '#cccccc'};"></span>
                                </div>
                            </div>
                            <div class="form-group" style="flex:1.5;">
                                <label>Nombre color:</label>
                                <input type="text" id="variante-${varianteId}-color-nombre" value="${v.color_nombre || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Stock:</label>
                                <input type="number" id="variante-${varianteId}-stock" value="${v.stock || 0}" min="0" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Precio venta:</label>
                                <input type="number" id="variante-${varianteId}-precio" value="${v.precio_venta || 0}" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Precio compra:</label>
                                <input type="number" id="variante-${varianteId}-precio-compra" value="${v.precio_compra || 0}">
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', varianteHTML);
                
                // Agregar evento para muestra de color
                const colorInput = document.getElementById(`variante-${varianteId}-color-hex`);
                if (colorInput) {
                    colorInput.addEventListener('input', function() {
                        const muestra = document.getElementById(`muestra-${varianteId}`);
                        if (muestra) {
                            muestra.style.backgroundColor = this.value;
                        }
                    });
                }
                
                varianteCount++;
            });
        }
        
        // Guardar ID para actualizar
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

async function eliminarProducto(id) {
    if (!confirm('¿Estás segura de eliminar este producto? También se eliminarán todas sus variantes.')) {
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        // Eliminar producto base (las variantes se eliminan en cascada por ON DELETE CASCADE)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
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

function verVariantes(id) {
    // Buscar el producto
    fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?id=eq.${id}`, {
        headers: { 'apikey': SUPABASE_KEY }
    })
    .then(res => res.json())
    .then(data => {
        if (data.length === 0) return;
        
        const producto = data[0];
        const variantes = producto.variantes || [];
        
        let mensaje = `📋 VARIANTES DE ${producto.nombre}\n`;
        mensaje += `Código: ${producto.codigo}\n`;
        mensaje += `Categoría: ${producto.categoria}\n`;
        mensaje += `Stock total: ${producto.stock_total}\n`;
        mensaje += `Precio: $${producto.precio_min} - $${producto.precio_max}\n`;
        mensaje += `\n📦 DETALLE POR VARIANTE:\n`;
        
        variantes.forEach((v, i) => {
            mensaje += `\n${i+1}. Talla: ${v.talla}\n`;
            mensaje += `   Color: ${v.color_nombre || 'No especificado'} (${v.color_codigo || 'N/A'})\n`;
            mensaje += `   Stock: ${v.stock}\n`;
            mensaje += `   Precio: $${v.precio_venta}\n`;
            mensaje += `   SKU: ${v.sku}\n`;
        });
        
        alert(mensaje);
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar variantes', 'error');
    });
}

function verVariantes(id) {
    // Función para mostrar todas las variantes de un producto
    alert('Función para ver detalles de variantes próximamente');
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay compras registradas</td></tr>';
            return;
        }
        
        // Calcular total compras mes
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const comprasMes = compras.filter(c => new Date(c.fecha) >= fechaInicio);
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
        document.getElementById('stats-compras-pendientes').textContent = pendientes;
        
        tbody.innerHTML = compras.map(compra => `
            <tr>
                <td>${new Date(compra.fecha).toLocaleDateString()}</td>
                <td>${compra.proveedores?.nombre || 'N/A'}</td>
                <td>${compra.producto || 'Varios'}</td>
                <td>${compra.cantidad || '-'}</td>
                <td>$${(compra.total || 0).toLocaleString()}</td>
                <td>
                    <span class="estado-badge ${compra.estado === 'Pagada' ? 'estado-pagada' : compra.estado === 'Recibida' ? 'estado-recibida' : 'estado-pendiente'}">
                        ${compra.estado || 'Pendiente'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" onclick="editarCompra(${compra.id})" title="Editar">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando compras:', error);
        const tbody = document.querySelector('#tabla-compras tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff4757;">Error al cargar compras</td></tr>';
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
        
        const compra = {
            proveedor_id: proveedorId,
            fecha: document.getElementById('compra-fecha').value,
            producto: document.getElementById('compra-producto').value,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado').value,
            puc: '620501' // PUC para compras
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
        
        // Cargar proveedores y seleccionar el actual
        await cargarProveedoresSelect('compra');
        
        // Llenar campos
        document.getElementById('compra-proveedor').value = compra.proveedor_id || '';
        document.getElementById('compra-fecha').value = compra.fecha.split('T')[0];
        document.getElementById('compra-producto').value = compra.producto || '';
        document.getElementById('compra-cantidad').value = compra.cantidad || '';
        document.getElementById('compra-precio').value = compra.precio_unitario || '';
        document.getElementById('compra-estado').value = compra.estado || 'Pendiente';
        
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
        
        if (tipo === 'producto') {
            delete form.dataset.editId;
            const submitBtn = document.querySelector('#form-producto .submit-btn');
            if (submitBtn) {
                submitBtn.textContent = '🌸 Guardar Producto con Variantes';
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
