// ============================================
// MAIN.JS - COMPLETO Y CORREGIDO
// ============================================

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let currentModule = 'productos';

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
        
        const userNameSpan = document.getElementById('userNameDisplay');
        if (userNameSpan) {
            userNameSpan.textContent = perfil[0]?.nombre || user.email || 'Administradora';
        }
        
        if (typeof cargarPermisosUsuario === 'function') {
            await cargarPermisosUsuario(user.id);
            if (typeof aplicarPermisosUI === 'function') aplicarPermisosUI();
            if (typeof filtrarModulosPorPermisos === 'function') filtrarModulosPorPermisos();
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

// ===== NAVEGACIÓN =====
function cambiarModulo(modulo, event = null) {
    console.log('🔄 Cambiando a módulo:', modulo);
    
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const seccion = document.getElementById(`modulo-${modulo}`);
    if (seccion) {
        seccion.style.display = 'block';
        console.log(`✅ Mostrando módulo: ${modulo}`);
    } else {
        console.error(`❌ No existe la sección: modulo-${modulo}`);
    }
    
    if (event) {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    
    currentModule = modulo;
    cargarDatosModulo(modulo);
}

// ===== CARGA DE DATOS POR MÓDULO (¡ESTA ES LA PARTE IMPORTANTE!) =====
async function cargarDatosModulo(modulo) {
    console.log('📦 Cargando datos del módulo:', modulo);
    
    switch(modulo) {
        case 'productos':
            if (typeof cargarProductos === 'function') {
                await cargarProductos();
            } else {
                console.error('❌ cargarProductos no está definida');
            }
            break;
        case 'stock':
            if (typeof cargarStock === 'function') {
                await cargarStock();
            } else {
                console.error('❌ cargarStock no está definida');
            }
            break;
        case 'compras':
            if (typeof cargarCompras === 'function') {
                await cargarCompras();
            } else {
                console.error('❌ cargarCompras no está definida');
            }
            break;
        case 'gastos':
            if (typeof cargarGastos === 'function') {
                await cargarGastos();
            } else {
                console.error('❌ cargarGastos no está definida');
            }
            break;
        case 'perfiles':
            if (typeof cargarPerfiles === 'function') {
                await cargarPerfiles();
            } else {
                console.error('❌ cargarPerfiles no está definida');
            }
            break;
        case 'proveedores':
            if (typeof cargarProveedores === 'function') {
                await cargarProveedores();
            } else {
                console.error('❌ cargarProveedores no está definida');
            }
            break;
        case 'ventas':
            if (typeof cargarVentas === 'function') {
                await cargarVentas();
            } else {
                console.error('❌ cargarVentas no está definida');
            }
            break;
        case 'contabilidad':
            if (typeof cargarContabilidad === 'function') {
                await cargarContabilidad();
            } else {
                console.log('📊 cargarContabilidad no está definida, usando versión simple');
                // Versión simple si no existe la función
                try {
                    const [ventas, compras, gastos] = await Promise.all([
                        fetch(`${SUPABASE_URL}/rest/v1/ventas`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
                        fetch(`${SUPABASE_URL}/rest/v1/compras`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
                        fetch(`${SUPABASE_URL}/rest/v1/gastos`, { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json())
                    ]);
                    const ingresos = ventas.reduce((s, v) => s + (v.total || 0), 0);
                    const egresos = compras.reduce((s, c) => s + (c.total || 0), 0) + gastos.reduce((s, g) => s + (g.monto || 0), 0);
                    const ingresosElem = document.getElementById('stats-ingresos');
                    const egresosElem = document.getElementById('stats-egresos');
                    if (ingresosElem) ingresosElem.textContent = `$${ingresos.toLocaleString()}`;
                    if (egresosElem) egresosElem.textContent = `$${egresos.toLocaleString()}`;
                } catch(e) { console.error('Error contabilidad simple:', e); }
            }
            break;
        default:
            console.log(`Módulo ${modulo} no reconocido`);
    }
}

// ===== UTILIDADES =====
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function getPrimerModuloVisible() { 
    return 'productos'; 
}

function cerrarTodosModales() {
    document.querySelectorAll('.form-modal, .modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
}

async function cargarDatosIniciales() {
    try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos_base`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await prodRes.json();
        const totalProductos = document.getElementById('stats-total-productos');
        if (totalProductos) totalProductos.textContent = productos.length;
        
        const varRes = await fetch(`${SUPABASE_URL}/rest/v1/variantes_producto?stock_total.lt.5`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const variantes = await varRes.json();
        const stockBajo = document.getElementById('stats-stock-bajo');
        if (stockBajo) stockBajo.textContent = variantes.length;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard iniciado');
    console.log('📋 Funciones disponibles:', {
        cargarProductos: typeof cargarProductos,
        cargarStock: typeof cargarStock,
        cargarCompras: typeof cargarCompras,
        cargarGastos: typeof cargarGastos,
        cargarPerfiles: typeof cargarPerfiles,
        cargarProveedores: typeof cargarProveedores,
        cargarVentas: typeof cargarVentas
    });
    
    await verificarSesion();
    await cargarDatosIniciales();
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarTodosModales();
    });
    
    const primerModulo = getPrimerModuloVisible();
    cambiarModulo(primerModulo, null);
    
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) menuBtn.onclick = () => toggleMenu();
    
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.onclick = () => toggleMenu();
});

// ===== EXPORTAR FUNCIONES AL SCOPE GLOBAL =====
window.verificarSesion = verificarSesion;
window.logout = logout;
window.cambiarModulo = cambiarModulo;
window.cargarDatosModulo = cargarDatosModulo;
window.toggleMenu = toggleMenu;
window.cerrarTodosModales = cerrarTodosModales;
window.cargarDatosIniciales = cargarDatosIniciales;
window.getPrimerModuloVisible = getPrimerModuloVisible;

console.log('✅ Main.js cargado correctamente');
