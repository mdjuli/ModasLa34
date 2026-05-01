// ============================================
// MAIN.JS - Inicialización y navegación
// ============================================

let currentUser = null;
let currentModule = 'productos';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard iniciado');
    await verificarSesion();
    await cargarDatosIniciales();
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarTodosModales();
    });
    
    const primerModulo = getPrimerModuloVisible();
    cambiarModulo(primerModulo, null);
    
    // Configurar menú móvil
    setupMobileMenu();
});

function setupMobileMenu() {
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn) menuBtn.onclick = () => toggleMenu();
    if (overlay) overlay.onclick = () => toggleMenu();
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
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
    cargarDatosModulo(modulo);
}

async function cargarDatosModulo(modulo) {
    switch(modulo) {
        case 'productos': await cargarProductos(); break;
        case 'stock': await cargarStock(); break;
        case 'compras': await cargarCompras(); await cargarProveedoresSelect('compra'); break;
        case 'gastos': await cargarGastos(); break;
        case 'perfiles': await cargarPerfiles(); break;
        case 'proveedores': await cargarProveedores(); break;
        case 'ventas': await cargarVentas(); break;
        case 'contabilidad': if (typeof cargarContabilidad === 'function') cargarContabilidad(); break;
    }
}

function cerrarTodosModales() {
    document.querySelectorAll('.form-modal, .modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
}

function getPrimerModuloVisible() { return 'productos'; }
