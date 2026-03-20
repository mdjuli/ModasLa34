// ============================================
// 🌸 DASHBOARD ADMIN - MODAS LA 34
// ============================================

// Variables globales
let currentUser = null;
let currentModule = 'productos';
let varianteCount = 0;

// ===== FUNCIONES DE INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('productos', null);
    
    // Inicializar con una variante
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
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
        });

        if (!response.ok) throw new Error('Sesión inválida');

        const user = await response.json();
        currentUser = user;
        
        const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfil = await perfilRes.json();
        
        document.getElementById('userNameDisplay').textContent = perfil[0]?.nombre || user.email || 'Administradora';
        
    } catch (error) {
        console.error('Error:', error);
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    }
}

function logout() {
    if (confirm('¿Cerrar sesión?')) {
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
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    currentModule = modulo;
    
    if (modulo !== 'ventas' && modulo !== 'contabilidad') {
        cargarDatosModulo(modulo);
    }
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos':
            await cargarProductos();
            break;
        case 'compras':
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
                <div>
                    <label style="color: #ff6b6b;">📏 Talla:</label>
                    <input type="text" id="variante-${varianteId}-talla" placeholder="Ej: S, M, L, 6, 8..." required>
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
        if (!tallaInput || !tallaInput.value.trim()) continue;
        
        const talla = tallaInput.value.trim();
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
        
        // Si no hay colores, crear uno por defecto
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
            mostrarAlerta('Debe agregar al menos una talla', 'error');
            return;
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
        
        // Guardar variantes
        for (const variante of variantes) {
            const varianteData = {
                producto_id: productoId,
                talla: variante.talla,
                colores: variante.colores,
                stock_total: variante.stock_total,
                precio_venta: 0,
                precio_compra: 0,
                sku: `${codigo}-${variante.talla}`.toUpperCase()
            };
            
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(varianteData)
            });
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

// ===== FUNCIONES UTILITARIAS =====
function mostrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`)?.classList.add('active');
}

function cerrarFormulario(tipo) {
    document.getElementById(`form-${tipo}`)?.classList.remove('active');
    if (tipo === 'producto') {
        delete document.getElementById('form-producto')?.dataset.editId;
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (alerta) {
        alerta.textContent = mensaje;
        alerta.className = `alert ${tipo}`;
        alerta.style.display = 'block';
        setTimeout(() => alerta.style.display = 'none', 3000);
    }
}

// Funciones placeholder para otros módulos
async function cargarCompras() { console.log('Compras'); }
async function cargarGastos() { console.log('Gastos'); }
async function cargarPerfiles() { console.log('Perfiles'); }
async function cargarProveedores() { console.log('Proveedores'); }
async function cargarVentas() { console.log('Ventas'); }
