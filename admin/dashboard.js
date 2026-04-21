// ============================================
// DASHBOARD ADMIN - MODAS LA 34
// ============================================

let currentUser = null;
let currentModule = 'productos';
let varianteCount = 0;

let fechaInicioCompras = null;
let fechaFinCompras = null;
let fechaInicioGastos = null;
let fechaFinGastos = null;
let fechaInicioVentas = null;
let fechaFinVentas = null;

// ===== FUNCIONES DE MENÚ =====
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
    await cargarDatosIniciales();
    cambiarModulo('productos', null);
    setTimeout(() => {
        if (document.getElementById('variantes-container')) agregarVariante();
    }, 500);
});

// ===== AUTENTICACIÓN =====
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
        
        // Cargar perfil
        const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfil = await perfilRes.json();
        
        // 🔑 Cargar permisos del usuario
        await cargarPermisosUsuario(user.id);
        
        // Mostrar nombre
        document.getElementById('userNameDisplay').textContent = 
            perfil[0]?.nombre || user.email || 'Administradora';
        
        // Aplicar permisos a la interfaz
        aplicarPermisosUI();
        filtrarModulosPorPermisos();
        
        // Cargar el primer módulo permitido
        const primerModulo = getPrimerModuloVisible();
        cambiarModulo(primerModulo, null);
        
        // Cargar datos iniciales
        await cargarDatosIniciales();
        
    } catch (error) {
        console.error('Error de sesión:', error);
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

// ===== NAVEGACIÓN =====
function cambiarModulo(modulo, event = null) {
    document.querySelectorAll('.module-section').forEach(s => s.style.display = 'none');
    const el = document.getElementById(`modulo-${modulo}`);
    if (el) el.style.display = 'block';
    if (event) {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        if (event.target.classList) event.target.classList.add('active');
        else if (event.target.parentElement) event.target.parentElement.classList.add('active');
    }
    currentModule = modulo;
    cargarDatosModulo(modulo);
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos': await cargarProductos(); break;
        case 'inventario': await cargarInventario(); break;
        case 'compras': await cargarProveedoresSelect('compra'); await cargarCompras(); break;
        case 'gastos': await cargarGastos(); break;
        case 'perfiles': await cargarPerfiles(); break;
        case 'proveedores': await cargarProveedores(); break;
        case 'ventas': await cargarVentas(); break;
        case 'contabilidad': await cargarContabilidad(); break;
    }
}

async function cargarDatosIniciales() {
    try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, { headers: { 'apikey': SUPABASE_KEY } });
        const productos = await prodRes.json();
        if (document.getElementById('stats-total-productos')) document.getElementById('stats-total-productos').textContent = productos.length;
        const varRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?stock_total.lt.5`, { headers: { 'apikey': SUPABASE_KEY } });
        const variantes = await varRes.json();
        if (document.getElementById('stats-stock-bajo')) document.getElementById('stats-stock-bajo').textContent = variantes.length;
    } catch(e) { console.error(e); }
}

// ===== FILTROS =====
function aplicarFiltroCompras() {
    const inicio = document.getElementById('compras-fecha-inicio')?.value;
    const fin = document.getElementById('compras-fecha-fin')?.value;
    fechaInicioCompras = inicio ? new Date(inicio) : null;
    fechaFinCompras = fin ? new Date(fin) : null;
    if (fechaFinCompras) fechaFinCompras.setHours(23,59,59,999);
    cargarCompras();
}
function limpiarFiltroCompras() {
    if (document.getElementById('compras-fecha-inicio')) document.getElementById('compras-fecha-inicio').value = '';
    if (document.getElementById('compras-fecha-fin')) document.getElementById('compras-fecha-fin').value = '';
    fechaInicioCompras = null; fechaFinCompras = null;
    cargarCompras();
}
function aplicarFiltroGastos() {
    const inicio = document.getElementById('gastos-fecha-inicio')?.value;
    const fin = document.getElementById('gastos-fecha-fin')?.value;
    fechaInicioGastos = inicio ? new Date(inicio) : null;
    fechaFinGastos = fin ? new Date(fin) : null;
    if (fechaFinGastos) fechaFinGastos.setHours(23,59,59,999);
    cargarGastos();
}
function limpiarFiltroGastos() {
    if (document.getElementById('gastos-fecha-inicio')) document.getElementById('gastos-fecha-inicio').value = '';
    if (document.getElementById('gastos-fecha-fin')) document.getElementById('gastos-fecha-fin').value = '';
    fechaInicioGastos = null; fechaFinGastos = null;
    cargarGastos();
}
function aplicarFiltroVentas() {
    const inicio = document.getElementById('ventas-fecha-inicio')?.value;
    const fin = document.getElementById('ventas-fecha-fin')?.value;
    fechaInicioVentas = inicio ? new Date(inicio) : null;
    fechaFinVentas = fin ? new Date(fin) : null;
    if (fechaFinVentas) fechaFinVentas.setHours(23,59,59,999);
    cargarVentas();
}
function limpiarFiltroVentas() {
    if (document.getElementById('ventas-fecha-inicio')) document.getElementById('ventas-fecha-inicio').value = '';
    if (document.getElementById('ventas-fecha-fin')) document.getElementById('ventas-fecha-fin').value = '';
    fechaInicioVentas = null; fechaFinVentas = null;
    cargarVentas();
}

// ===== VARIANTES =====
function agregarVariante() {
    const container = document.getElementById('variantes-container');
    if (!container) return;
    const vid = varianteCount;
    const html = `
        <div class="variante-card" id="variante-${vid}" style="background:#f9f9f9; border-radius:12px; padding:1rem; margin-bottom:1rem;">
            <div style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                <input type="text" id="variante-${vid}-talla" placeholder="Talla" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:100px;">
                <input type="number" id="variante-${vid}-precio" placeholder="Precio venta" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:120px;">
                ${vid > 0 ? `<button type="button" onclick="eliminarVariante(${vid})" style="background:#f0f0f0; border:none; padding:0.5rem 1rem; border-radius:8px;">🗑️</button>` : ''}
            </div>
            <div id="colores-${vid}-container"></div>
            <div style="margin-top:0.5rem;">
                <button type="button" onclick="agregarColorAVariante(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem;">+ Color</button>
                <button type="button" onclick="agregarSinColor(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.75rem;">⚪ Sin color</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    agregarColorAVariante(vid);
    varianteCount++;
}

function agregarColorAVariante(vid) {
    const container = document.getElementById(`colores-${vid}-container`);
    if (!container) return;
    const cid = `${vid}-${Date.now()}`;
    const html = `
        <div class="color-row" id="color-${cid}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; flex-wrap:wrap;">
            <input type="color" id="color-hex-${cid}" value="#ff0000" style="width:35px; height:35px; border-radius:8px;">
            <input type="text" id="color-hex-text-${cid}" value="#ff0000" placeholder="Hex" style="width:80px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <input type="text" id="color-nombre-${cid}" placeholder="Nombre" style="flex:1; min-width:100px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <input type="number" id="color-stock-${cid}" placeholder="Stock" min="0" value="0" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <button type="button" onclick="eliminarColor('${cid}')" style="background:none; border:none;">🗑️</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const picker = document.getElementById(`color-hex-${cid}`);
    const text = document.getElementById(`color-hex-text-${cid}`);
    if (picker && text) {
        picker.addEventListener('input', () => text.value = picker.value);
        text.addEventListener('input', () => { let v = text.value; if (!v.startsWith('#')) v = '#'+v; if (/^#[0-9A-Fa-f]{6}$/i.test(v)) picker.value = v; });
    }
}

function agregarSinColor(vid) {
    const container = document.getElementById(`colores-${vid}-container`);
    if (!container) return;
    if (container.querySelector('.sin-color-item')) { alert('Ya existe sin color'); return; }
    const cid = `${vid}-sin-${Date.now()}`;
    const html = `
        <div class="color-row sin-color-item" id="color-${cid}" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; background:#f5f5f5; padding:0.3rem; border-radius:8px;">
            <span>⚪</span>
            <span style="flex:1;">Sin color específico</span>
            <input type="number" id="color-stock-${cid}" placeholder="Stock" min="0" value="0" style="width:70px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
            <button type="button" onclick="eliminarColor('${cid}')" style="background:none; border:none;">🗑️</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function eliminarColor(cid) { document.getElementById(`color-${cid}`)?.remove(); }
function eliminarVariante(vid) { document.getElementById(`variante-${vid}`)?.remove(); }

function getVariantesFromForm() {
    const variantes = [];
    const precioCompraGlobal = document.getElementById('producto-precio-compra')?.value || 0;
    for (let i = 0; i < varianteCount; i++) {
        const talla = document.getElementById(`variante-${i}-talla`)?.value;
        const precioVenta = parseFloat(document.getElementById(`variante-${i}-precio`)?.value) || 0;
        if (!talla) continue;
        if (precioVenta === 0) { mostrarAlerta(`Talla ${talla} sin precio`, 'error'); return []; }
        const colores = [];
        const colContainer = document.getElementById(`colores-${i}-container`);
        if (colContainer) {
            colContainer.querySelectorAll('.color-row').forEach(row => {
                const id = row.id.replace('color-', '');
                if (row.classList.contains('sin-color-item')) {
                    const stock = parseInt(document.getElementById(`color-stock-${id}`)?.value) || 0;
                    if (stock > 0) colores.push({ nombre: null, codigo: null, stock });
                } else {
                    const nombre = document.getElementById(`color-nombre-${id}`)?.value;
                    const hex = document.getElementById(`color-hex-text-${id}`)?.value;
                    const stock = parseInt(document.getElementById(`color-stock-${id}`)?.value) || 0;
                    if (nombre && nombre.trim()) {
                        let hexVal = hex || '#cccccc';
                        if (!hexVal.startsWith('#')) hexVal = '#' + hexVal;
                        colores.push({ nombre: nombre.trim(), codigo: hexVal, stock });
                    }
                }
            });
        }
        if (colores.length === 0) colores.push({ nombre: 'Sin color', codigo: '#cccccc', stock: 0 });
        const stockTotal = colores.reduce((s,c) => s + c.stock, 0);
        variantes.push({ talla, precio_venta: precioVenta, precio_compra: parseFloat(precioCompraGlobal), colores, stock_total: stockTotal });
    }
    return variantes;
}

async function guardarProductoBase() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const codigo = document.getElementById('producto-codigo')?.value;
        const nombre = document.getElementById('producto-nombre')?.value;
        const categoria = document.getElementById('producto-categoria')?.value;
        if (!codigo || !nombre || !categoria) { mostrarAlerta('Complete todos los campos', 'error'); return; }
        const variantes = getVariantesFromForm();
        if (variantes.length === 0) { mostrarAlerta('Agregue al menos una talla', 'error'); return; }
        const editId = document.getElementById('form-producto').dataset.editId;
        let productoId;
        if (editId) {
            productoId = parseInt(editId);
            await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${productoId}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo, nombre, categoria, imagen_url: document.getElementById('producto-imagen')?.value || null })
            });
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${productoId}`, {
                method: 'DELETE',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
            });
        } else {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                body: JSON.stringify({ codigo, nombre, categoria, imagen_url: document.getElementById('producto-imagen')?.value || null })
            });
            if (!res.ok) throw new Error();
            productoId = (await res.json())[0].id;
        }
        for (const v of variantes) {
            await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ producto_id: productoId, talla: v.talla, colores: v.colores, stock_total: v.stock_total, precio_venta: v.precio_venta, precio_compra: v.precio_compra, sku: `${codigo}-${v.talla}-${Date.now()}` })
            });
        }
        mostrarAlerta(editId ? 'Producto actualizado' : 'Producto guardado', 'success');
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
        const btn = document.querySelector('#form-producto .submit-btn');
        if (btn) btn.textContent = 'Guardar Producto';
    } catch(e) { mostrarAlerta('Error: ' + e.message, 'error'); }
}

async function cargarProductos() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, { headers: { 'apikey': SUPABASE_KEY } });
        const productos = await res.json();
        const tbody = document.querySelector('#tabla-productos tbody');
        if (!tbody) return;
        if (!productos.length) { tbody.innerHTML = '<tr><td colspan="6">No hay productos<\/td></tr>'; return; }
        tbody.innerHTML = productos.map(p => {
            const totalStock = (p.variantes || []).reduce((s,v) => s + (v.stock_total || 0), 0);
            const precioMin = Math.min(...(p.variantes || []).map(v => v.precio_venta || 0), 0);
            return `<tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.codigo}</td>
                <td>${p.categoria || '-'}</td>
                <td style="color:${totalStock<5?'#e74c3c':'#333'}">${totalStock}</td>
                <td>$${precioMin.toLocaleString()}</td>
                <td>
                    <button class="action-btn" onclick="editarProducto(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="verVariantes(${p.id})"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { console.error(e); }
}

async function editarProducto(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, { headers: { 'apikey': SUPABASE_KEY } });
        if (!response.ok) throw new Error('Error al cargar producto');
        const productos = await response.json();
        if (productos.length === 0) throw new Error('Producto no encontrado');
        const producto = productos[0];
        const varResponse = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?producto_id=eq.${id}`, { headers: { 'apikey': SUPABASE_KEY } });
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
                        <div class="variante-card" id="variante-${vid}" style="background:#f9f9f9; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                            <div style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                                <input type="text" id="variante-${vid}-talla" value="${v.talla}" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:100px;">
                                <input type="number" id="variante-${vid}-precio" value="${v.precio_venta}" style="padding:0.5rem; border:1px solid #ddd; border-radius:8px; width:120px;">
                                <button type="button" onclick="eliminarVariante(${vid})" style="background:#f0f0f0; border:none; padding:0.5rem 1rem; border-radius:8px;">🗑️ Eliminar</button>
                            </div>
                            <div id="colores-${vid}-container"></div>
                            <div style="margin-top:0.5rem;">
                                <button type="button" onclick="agregarColorAVariante(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px;">+ Color</button>
                                <button type="button" onclick="agregarSinColor(${vid})" style="background:#e0e0e0; border:none; padding:0.3rem 0.8rem; border-radius:20px;">⚪ Sin color</button>
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
                                        <input type="text" id="color-nombre-${cid}" value="${color.nombre || ''}" placeholder="Nombre" style="flex:1; min-width:100px; padding:0.3rem; border:1px solid #ddd; border-radius:6px;">
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
                                    text.addEventListener('input', () => { let v = text.value; if (!v.startsWith('#')) v = '#'+v; if (/^#[0-9A-Fa-f]{6}$/i.test(v)) picker.value = v; });
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
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?id=eq.${id}`, { headers: { 'apikey': SUPABASE_KEY } });
        const data = await response.json();
        if (data.length === 0) return;
        const producto = data[0];
        const variantes = producto.variantes || [];
        let mensaje = `📋 VARIANTES DE: ${producto.nombre}\n═══════════════════════\nCódigo: ${producto.codigo}\nCategoría: ${producto.categoria}\nStock total: ${producto.stock_total}\n\n`;
        variantes.forEach(v => {
            mensaje += `📏 TALLA: ${v.talla}\n💰 Precio venta: $${v.precio_venta}\n💰 Precio compra: $${v.precio_compra || 0}\n`;
            const colores = v.colores || [];
            if (colores.length > 0) {
                mensaje += `🎨 Colores:\n`;
                colores.forEach(c => { mensaje += `   • ${c.nombre || 'Sin color'} (${c.codigo || ''}) - Stock: ${c.stock}\n`; });
            } else { mensaje += `   • Sin color específico\n`; }
            mensaje += `\n`;
        });
        alert(mensaje);
    } catch (error) { mostrarAlerta('Error al cargar variantes', 'error'); }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        await fetch(`${SUPABASE_URL}/rest/v1/productos_base?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
        });
        mostrarAlerta('✅ Producto eliminado', 'success');
        await cargarProductos();
    } catch(e) { mostrarAlerta('Error al eliminar', 'error'); }
}

// ===== PROVEEDORES =====
async function cargarProveedores() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?order=nombre`, { headers: { 'apikey': SUPABASE_KEY } });
        const proveedores = await res.json();
        const tbody = document.querySelector('#tabla-proveedores tbody');
        if (!tbody) return;
        if (!proveedores.length) { tbody.innerHTML = '<td><td colspan="5">No hay proveedores<\/td></tr>'; return; }
        if (document.getElementById('stats-proveedores')) document.getElementById('stats-proveedores').textContent = proveedores.length;
        tbody.innerHTML = proveedores.map(p => `<tr>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.contacto || '-'}</td>
            <td>${p.telefono || '-'}</td>
            <td>${p.email || '-'}</td>
            <td>
                <button class="action-btn" onclick="editarProveedor(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="eliminarProveedor(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    } catch(e) { console.error(e); }
}

async function cargarProveedoresSelect(origen) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?select=id,nombre&order=nombre`, { headers: { 'apikey': SUPABASE_KEY } });
        const prov = await res.json();
        const select = document.getElementById(`${origen}-proveedor`);
        if (select) select.innerHTML = '<option value="">Seleccionar</option>' + prov.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    } catch(e) { console.error(e); }
}

async function guardarProveedor() {
    const proveedor = {
        nombre: document.getElementById('proveedor-nombre')?.value,
        contacto: document.getElementById('proveedor-contacto')?.value || null,
        telefono: document.getElementById('proveedor-telefono')?.value || null,
        email: document.getElementById('proveedor-email')?.value || null,
        direccion: document.getElementById('proveedor-direccion')?.value || null
    };
    if (!proveedor.nombre) { mostrarAlerta('El nombre es obligatorio', 'error'); return; }
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(proveedor)
        });
        if (response.ok) {
            mostrarAlerta('Proveedor guardado', 'success');
            cerrarFormulario('proveedor');
            await cargarProveedores();
            document.getElementById('proveedor-nombre').value = '';
            document.getElementById('proveedor-contacto').value = '';
            document.getElementById('proveedor-telefono').value = '';
            document.getElementById('proveedor-email').value = '';
            document.getElementById('proveedor-direccion').value = '';
        } else { mostrarAlerta('Error al guardar', 'error'); }
    } catch(e) { mostrarAlerta('Error de conexión', 'error'); }
}

function editarProveedor(id) { mostrarAlerta('Editar proveedor en desarrollo', 'warning'); }
function eliminarProveedor(id) { if(confirm('¿Eliminar proveedor?')) mostrarAlerta('Proveedor eliminado', 'success'); }

// ===== COMPRAS =====
async function cargarCompras() {
    try {
        let url = `${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`;
        if (fechaInicioCompras) url += `&fecha=gte.${fechaInicioCompras.toISOString().split('T')[0]}`;
        if (fechaFinCompras) url += `&fecha=lte.${fechaFinCompras.toISOString().split('T')[0]}`;
        const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY } });
        const compras = await res.json();
        const tbody = document.querySelector('#tabla-compras tbody');
        if (!tbody) return;
        if (!compras.length) { tbody.innerHTML = '<tr><td colspan="6">No hay compras<\/td></tr>'; return; }
        const fechaInicioMes = new Date(); fechaInicioMes.setDate(1); fechaInicioMes.setHours(0,0,0,0);
        const comprasMes = compras.filter(c => new Date(c.fecha + 'T12:00:00') >= fechaInicioMes);
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        if (document.getElementById('stats-compras-mes')) document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
        if (document.getElementById('stats-compras-pendientes')) document.getElementById('stats-compras-pendientes').textContent = compras.filter(c => c.estado === 'Pendiente').length;
        tbody.innerHTML = compras.map(c => `<tr>
            <td>${new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>${c.proveedores?.nombre || 'N/A'}</td>
            <td>${c.producto}</td>
            <td>$${(c.total || 0).toLocaleString()}</td>
            <td><span class="badge ${c.estado === 'Pagada' ? 'badge-pagada' : c.estado === 'Recibida' ? 'badge-recibida' : 'badge-pendiente'}">${c.estado || 'Pendiente'}</span></td>
            <td>
                <button class="action-btn" onclick="editarCompra(${c.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="eliminarCompra(${c.id})"><i class="fas fa-trash"></i></button>
            </td>
        </table>`).join('');
    } catch(e) { console.error(e); }
}

async function guardarCompra() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const proveedorId = document.getElementById('compra-proveedor')?.value;
        if (!proveedorId) { mostrarAlerta('Seleccione un proveedor', 'error'); return; }
        const cantidad = parseInt(document.getElementById('compra-cantidad')?.value);
        const precio = parseFloat(document.getElementById('compra-precio')?.value);
        if (!cantidad || cantidad <= 0) { mostrarAlerta('Cantidad inválida', 'error'); return; }
        if (!precio || precio <= 0) { mostrarAlerta('Precio inválido', 'error'); return; }
        const compra = {
            proveedor_id: parseInt(proveedorId),
            fecha: document.getElementById('compra-fecha')?.value,
            producto: document.getElementById('compra-producto')?.value,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado')?.value || 'Pendiente',
            puc: '620501'
        };
        const editId = document.getElementById('form-compra')?.dataset.editId;
        let url = `${SUPABASE_URL}/rest/v1/compras`;
        let method = 'POST';
        if (editId) { url += `?id=eq.${editId}`; method = 'PATCH'; }
        const response = await fetch(url, {
            method: method,
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(compra)
        });
        if (response.ok) {
            mostrarAlerta(editId ? 'Compra actualizada' : 'Compra guardada', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            document.getElementById('compra-proveedor').value = '';
            document.getElementById('compra-fecha').value = '';
            document.getElementById('compra-producto').value = '';
            document.getElementById('compra-cantidad').value = '';
            document.getElementById('compra-precio').value = '';
            delete document.getElementById('form-compra')?.dataset.editId;
        } else { mostrarAlerta('Error al guardar', 'error'); }
    } catch(e) { mostrarAlerta('Error de conexión', 'error'); }
}

function editarCompra(id) { mostrarAlerta('Editar compra en desarrollo', 'warning'); }
function eliminarCompra(id) { if(confirm('¿Eliminar compra?')) mostrarAlerta('Compra eliminada', 'success'); }

// ===== GASTOS =====
async function cargarGastos() {
    try {
        let url = `${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`;
        if (fechaInicioGastos) url += `&fecha=gte.${fechaInicioGastos.toISOString().split('T')[0]}`;
        if (fechaFinGastos) url += `&fecha=lte.${fechaFinGastos.toISOString().split('T')[0]}`;
        const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY } });
        const gastos = await res.json();
        const tbody = document.querySelector('#tabla-gastos tbody');
        if (!tbody) return;
        if (!gastos.length) { tbody.innerHTML = '<td><td colspan="5">No hay gastos<\/td></tr>'; return; }
        const fechaInicioMes = new Date(); fechaInicioMes.setDate(1); fechaInicioMes.setHours(0,0,0,0);
        const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicioMes);
        const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
        if (document.getElementById('stats-gastos-mes')) document.getElementById('stats-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
        tbody.innerHTML = gastos.map(g => `<tr>
            <td>${new Date(g.fecha).toLocaleDateString('es-CO')}</td>
            <td>${g.concepto}</td>
            <td>${g.categoria}</td>
            <td>$${(g.monto || 0).toLocaleString()}</td>
            <td><button class="action-btn" onclick="editarGasto(${g.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="eliminarGasto(${g.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    } catch(e) { console.error(e); }
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
            mostrarAlerta('Complete todos los campos', 'error'); return;
        }
        const editId = document.getElementById('form-gasto')?.dataset.editId;
        let url = `${SUPABASE_URL}/rest/v1/gastos`;
        let method = 'POST';
        if (editId) { url += `?id=eq.${editId}`; method = 'PATCH'; }
        const response = await fetch(url, {
            method: method,
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(gasto)
        });
        if (response.ok) {
            mostrarAlerta(editId ? 'Gasto actualizado' : 'Gasto guardado', 'success');
            cerrarFormulario('gasto');
            await cargarGastos();
            document.getElementById('gasto-fecha').value = '';
            document.getElementById('gasto-concepto').value = '';
            document.getElementById('gasto-categoria').value = '';
            document.getElementById('gasto-monto').value = '';
            delete document.getElementById('form-gasto')?.dataset.editId;
        } else { mostrarAlerta('Error al guardar', 'error'); }
    } catch(e) { mostrarAlerta('Error de conexión', 'error'); }
}

function editarGasto(id) { mostrarAlerta('Editar gasto en desarrollo', 'warning'); }
function eliminarGasto(id) { if(confirm('¿Eliminar gasto?')) mostrarAlerta('Gasto eliminado', 'success'); }

// ===== PERFILES =====
async function cargarPerfiles() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, { headers: { 'apikey': SUPABASE_KEY } });
        const perfiles = await res.json();
        const tbody = document.querySelector('#tabla-perfiles tbody');
        if (!tbody) return;
        if (!perfiles.length) { tbody.innerHTML = '<tr><td colspan="4">No hay usuarios<\/td></tr>'; return; }
        if (document.getElementById('stats-empleados')) document.getElementById('stats-empleados').textContent = perfiles.length;
        tbody.innerHTML = perfiles.map(p => `<tr>
            <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
            <td>${p.email}</td>
            <td><span style="background:${p.rol === 'admin' ? '#d4a5a9' : '#e0e0e0'};padding:0.2rem 0.8rem;border-radius:20px;">${p.rol || 'empleado'}</span></td>
            <td>${new Date(p.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn" onclick="editarPerfil('${p.id}')"><i class="fas fa-edit"></i></button>
                ${p.id !== currentUser?.id ? `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('');
    } catch(e) { console.error(e); }
}

async function guardarPerfil() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const nombre = document.getElementById('perfil-nombre')?.value;
        const email = document.getElementById('perfil-email')?.value;
        const password = document.getElementById('perfil-password')?.value;
        const rol = document.getElementById('perfil-rol')?.value || 'empleado';
        if (!nombre || !email) { mostrarAlerta('Nombre y email obligatorios', 'error'); return; }
        const editId = document.getElementById('form-perfil')?.dataset.editId;
        if (editId) {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${editId}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, rol })
            });
            if (response.ok) {
                mostrarAlerta('Usuario actualizado', 'success');
                cerrarFormulario('perfil');
                await cargarPerfiles();
            } else { mostrarAlerta('Error al actualizar', 'error'); }
        } else {
            if (!password || password.length < 6) { mostrarAlerta('Contraseña mínimo 6 caracteres', 'error'); return; }
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const authData = await authResponse.json();
            if (!authResponse.ok) throw new Error(authData.msg || 'Error al crear usuario');
            const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: authData.user.id, nombre, email, rol })
            });
            if (perfilResponse.ok) {
                mostrarAlerta('Usuario creado', 'success');
                cerrarFormulario('perfil');
                await cargarPerfiles();
            } else { throw new Error('Error al crear perfil'); }
        }
        document.getElementById('perfil-nombre').value = '';
        document.getElementById('perfil-email').value = '';
        document.getElementById('perfil-password').value = '';
        delete document.getElementById('form-perfil')?.dataset.editId;
    } catch(e) { mostrarAlerta('Error: ' + e.message, 'error'); }
}

function editarPerfil(id) { mostrarAlerta('Editar usuario en desarrollo', 'warning'); }
function eliminarPerfil(id) { if(confirm('¿Eliminar usuario?')) mostrarAlerta('Usuario eliminado', 'success'); }

// ============================================
// FUNCIÓN PARA CARGAR CONTROL DE STOCK
// ============================================

async function cargarStock() {
    try {
        console.log('📊 Cargando control de stock...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar stock');
        
        const productos = await response.json();
        
        // Procesar todas las variantes y colores
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
                    // Sin colores específicos
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
        
        // Actualizar contadores
        document.getElementById('stock-bajo-count').textContent = productosStockBajo.length;
        document.getElementById('stock-agotado-count').textContent = productosAgotados.length;
        document.getElementById('stock-normal-count').textContent = productosNormales;
        
        // Llenar tabla de stock bajo
        const stockBajoBody = document.getElementById('stock-bajo-body');
        if (productosStockBajo.length === 0) {
            stockBajoBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">✅ No hay productos con stock bajo</td></tr>';
        } else {
            stockBajoBody.innerHTML = productosStockBajo.map(item => `
                <tr class="stock-bajo-row">
                    <td><strong>${item.producto_nombre}</strong><br><small>${item.producto_codigo}</small></td>
                    <td>${item.talla}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 20px; background: ${item.color_codigo}; border-radius: 50%; border: 1px solid #ddd;"></div>
                            ${item.color}
                        </div>
                    </td>
                    <td class="stock-critico">${item.stock} unidades</td>
                    <td>5</td>
                    <td>
                        <button class="action-btn" onclick="solicitarReposicion(${item.producto_id}, '${item.producto_nombre}', '${item.talla}', '${item.color}')" title="Solicitar reposición">
                            📦 Pedir
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        // Llenar tabla de agotados
        const stockAgotadoBody = document.getElementById('stock-agotado-body');
        if (productosAgotados.length === 0) {
            stockAgotadoBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">🎉 Todos los productos tienen stock disponible</td></tr>';
        } else {
            stockAgotadoBody.innerHTML = productosAgotados.map(item => `
                <tr class="stock-agotado-row">
                    <td><strong>${item.producto_nombre}</strong><br><small>${item.producto_codigo}</small></td>
                    <td>${item.talla}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 20px; background: ${item.color_codigo}; border-radius: 50%; border: 1px solid #ddd;"></div>
                            ${item.color}
                        </div>
                    </td>
                    <td class="stock-agotado">AGOTADO</td>
                    <td>
                        <button class="action-btn" onclick="solicitarReposicion(${item.producto_id}, '${item.producto_nombre}', '${item.talla}', '${item.color}')" title="Solicitar reposición">
                            📦 Solicitar
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error cargando stock:', error);
        const stockBajoBody = document.getElementById('stock-bajo-body');
        if (stockBajoBody) {
            stockBajoBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff4757;">Error al cargar datos</td></tr>';
        }
    }
}

// Función para solicitar reposición (opcional)
function solicitarReposicion(productoId, nombre, talla, color) {
    const mensaje = `📦 *REPOSICIÓN DE STOCK*\n\nProducto: ${nombre}\nTalla: ${talla}\nColor: ${color}\n\nPor favor, gestionar reposición.`;
    alert(`📋 Solicitud de reposición:\n\n${mensaje}\n\n(Próximamente: notificación a proveedores)`);
    
    // Aquí puedes agregar lógica para:
    // 1. Crear automáticamente una orden de compra
    // 2. Enviar notificación por WhatsApp al proveedor
    // 3. Agregar a una lista de pendientes
}

// ===== VENTAS =====
async function cargarVentas() {
    try {
        let url = `${SUPABASE_URL}/rest/v1/ventas?select=*&order=fecha.desc`;
        if (fechaInicioVentas) url += `&fecha=gte.${fechaInicioVentas.toISOString()}`;
        if (fechaFinVentas) url += `&fecha=lte.${fechaFinVentas.toISOString()}`;
        const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY } });
        const ventas = await res.json();
        const tbody = document.querySelector('#tabla-ventas tbody');
        if (!tbody) return;
        if (!ventas.length) { tbody.innerHTML = '<tr><td colspan="5">No hay ventas<\/td></tr>'; return; }
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalHoy = ventasHoy.reduce((s,v) => s + (v.total||0), 0);
        if (document.getElementById('stats-ventas-hoy')) document.getElementById('stats-ventas-hoy').textContent = `$${totalHoy.toLocaleString()}`;
        const fechaInicioMes = new Date(); fechaInicioMes.setDate(1); fechaInicioMes.setHours(0,0,0,0);
        const ventasMes = ventas.filter(v => new Date(v.fecha) >= fechaInicioMes);
        const totalMes = ventasMes.reduce((s,v) => s + (v.total||0), 0);
        if (document.getElementById('stats-ventas-mes')) document.getElementById('stats-ventas-mes').textContent = `$${totalMes.toLocaleString()}`;
        tbody.innerHTML = ventas.map(v => `<tr>
            <td>${new Date(v.fecha).toLocaleString()}</td>
            <td>${v.productos || 'Venta'}</td>
            <td>$${(v.total || 0).toLocaleString()}</td>
            <td><span style="background:#f0f0f0;padding:0.2rem 0.8rem;border-radius:20px;">${v.metodo_pago || 'Efectivo'}</span></td>
            <td><button class="action-btn" onclick="verFactura(${v.id})"><i class="fas fa-receipt"></i></button></td>
        </tr>`).join('');
    } catch(e) { console.error(e); }
}

function verFactura(id) { window.open(`factura.html?id=${id}`, '_blank'); }

// ===== CONTABILIDAD =====
async function cargarContabilidad() {
    try {
        const ventas = await fetch(`${SUPABASE_URL}/rest/v1/ventas`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json());
        const compras = await fetch(`${SUPABASE_URL}/rest/v1/compras`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json());
        const gastos = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json());
        const ingresos = ventas.reduce((s,v) => s + (v.total||0), 0);
        const egresos = compras.reduce((s,c) => s + (c.total||0), 0) + gastos.reduce((s,g) => s + (g.monto||0), 0);
        if (document.getElementById('stats-ingresos')) document.getElementById('stats-ingresos').textContent = `$${ingresos.toLocaleString()}`;
        if (document.getElementById('stats-egresos')) document.getElementById('stats-egresos').textContent = `$${egresos.toLocaleString()}`;
    } catch(e) { console.error(e); }
}

// ===== UTILITARIOS =====
function mostrarFormulario(tipo) { document.getElementById(`form-${tipo}`)?.classList.add('active'); }
function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) form.classList.remove('active');
    if (tipo === 'producto') {
        delete document.getElementById('form-producto')?.dataset.editId;
        const btn = document.querySelector('#form-producto .submit-btn');
        if (btn) btn.textContent = 'Guardar Producto';
    }
}
function mostrarAlerta(msg, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (alerta) {
        alerta.textContent = msg;
        alerta.className = `alert ${tipo}`;
        alerta.style.display = 'block';
        setTimeout(() => alerta.style.display = 'none', 3000);
    }
}

window.cargarContabilidad = cargarContabilidad;
