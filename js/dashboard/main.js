// ============================================
// MAIN.JS - Versión CORREGIDA
// ============================================

// 1. PRIMERO: Declarar variables globales
let currentUser = null;
let currentModule = 'productos';

// 2. SEGUNDO: Declarar TODAS las funciones
async function verificarSesion() {
    console.log('🔐 Verificando sesión...');
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
        
        console.log('✅ Sesión verificada:', user.email);
        
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

function cambiarModulo(modulo, event = null) {
    document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const seccion = document.getElementById(`modulo-${modulo}`);
    if (seccion) seccion.style.display = 'block';
    
    if (event) {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    
    currentModule = modulo;
    
    // Usar setTimeout para asegurar que los módulos están cargados
    setTimeout(() => {
        if (typeof cargarDatosModulo === 'function') {
            cargarDatosModulo(modulo);
        } else {
            console.log('cargarDatosModulo no está definida todavía');
        }
    }, 100);
}

async function cargarDatosModulo(modulo) {
    console.log('📦 Cargando módulo:', modulo);
    switch(modulo) {
        case 'productos': if (window.cargarProductos) await window.cargarProductos(); break;
        case 'stock': if (window.cargarStock) await window.cargarStock(); break;
        case 'compras': if (window.cargarCompras) await window.cargarCompras(); break;
        case 'gastos': if (window.cargarGastos) await window.cargarGastos(); break;
        case 'perfiles': if (window.cargarPerfiles) await window.cargarPerfiles(); break;
        case 'proveedores': if (window.cargarProveedores) await window.cargarProveedores(); break;
        case 'ventas': if (window.cargarVentas) await window.cargarVentas(); break;
        case 'contabilidad': if (window.cargarContabilidad) window.cargarContabilidad(); break;
    }
}

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

// 3. TERCERO: Event listener (después de definir las funciones)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard iniciado');
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

// 4. CUARTO: Exportar funciones al scope global
window.verificarSesion = verificarSesion;
window.logout = logout;
window.cambiarModulo = cambiarModulo;
window.cargarDatosModulo = cargarDatosModulo;
window.toggleMenu = toggleMenu;
window.cerrarTodosModales = cerrarTodosModales;
window.cargarDatosIniciales = cargarDatosIniciales;
window.getPrimerModuloVisible = getPrimerModuloVisible;
