// ============================================
// SISTEMA DE PERMISOS - MODAS LA 34
// ============================================

// Roles posibles (esto es lo que preguntaste)
const ROLES = {
    ADMIN_TOTAL: 'admin_total',           // Dueña - Ve todo
    ADMIN_PRODUCTOS: 'admin_productos',   // Encargada de inventario
    ADMIN_VENTAS: 'admin_ventas',         // Vendedora
    ADMIN_CONTABILIDAD: 'admin_contabilidad', // Contadora
    ADMIN_CAJA: 'admin_caja'              // Cajera
};

// Configuración completa de cada rol
const ROLES_CONFIG = {
    // 👑 Administradora Total - Dueña del negocio
    [ROLES.ADMIN_TOTAL]: {
        nombre: "👑 Administradora General",
        color: "#ff6b6b",
        modulos_visibles: ['productos', 'inventario', 'compras', 'gastos', 'proveedores', 'ventas', 'perfiles', 'contabilidad'],
        permisos: {
            productos: { ver: true, crear: true, editar: true, eliminar: true },
            inventario: { ver: true, ajustar: true },
            compras: { ver: true, crear: true, editar: true, eliminar: true },
            gastos: { ver: true, crear: true, editar: true, eliminar: true },
            proveedores: { ver: true, crear: true, editar: true, eliminar: true },
            ventas: { ver: true, crear: true, anular: true },
            perfiles: { ver: true, crear: true, editar: true, eliminar: true },
            contabilidad: { ver: true, exportar: true },
            reportes: { ver: true, exportar: true }
        }
    },
    
    // 📦 Administradora de Productos - Encargada de inventario
    [ROLES.ADMIN_PRODUCTOS]: {
        nombre: "📦 Administradora de Productos",
        color: "#4a90e2",
        modulos_visibles: ['productos', 'inventario', 'compras', 'proveedores'],
        permisos: {
            productos: { ver: true, crear: true, editar: true, eliminar: true },
            inventario: { ver: true, ajustar: true },
            compras: { ver: true, crear: true, editar: false, eliminar: false },
            gastos: { ver: false, crear: false, editar: false, eliminar: false },
            proveedores: { ver: true, crear: true, editar: true, eliminar: false },
            ventas: { ver: false, crear: false, anular: false },
            perfiles: { ver: false, crear: false, editar: false, eliminar: false },
            contabilidad: { ver: false, exportar: false },
            reportes: { ver: true, exportar: false }
        }
    },
    
    // 🛍️ Administradora de Ventas - Vendedora
    [ROLES.ADMIN_VENTAS]: {
        nombre: "🛍️ Administradora de Ventas",
        color: "#27ae60",
        modulos_visibles: ['productos', 'inventario', 'ventas'],
        permisos: {
            productos: { ver: true, crear: false, editar: false, eliminar: false },
            inventario: { ver: true, ajustar: false },
            compras: { ver: false, crear: false, editar: false, eliminar: false },
            gastos: { ver: false, crear: false, editar: false, eliminar: false },
            proveedores: { ver: false, crear: false, editar: false, eliminar: false },
            ventas: { ver: true, crear: true, anular: false },
            perfiles: { ver: false, crear: false, editar: false, eliminar: false },
            contabilidad: { ver: false, exportar: false },
            reportes: { ver: true, exportar: false }
        }
    },
    
    // 💰 Administradora de Contabilidad
    [ROLES.ADMIN_CONTABILIDAD]: {
        nombre: "💰 Administradora de Contabilidad",
        color: "#f39c12",
        modulos_visibles: ['compras', 'gastos', 'proveedores', 'ventas', 'contabilidad'],
        permisos: {
            productos: { ver: true, crear: false, editar: false, eliminar: false },
            inventario: { ver: true, ajustar: false },
            compras: { ver: true, crear: true, editar: true, eliminar: false },
            gastos: { ver: true, crear: true, editar: true, eliminar: false },
            proveedores: { ver: true, crear: true, editar: true, eliminar: false },
            ventas: { ver: true, crear: false, anular: false },
            perfiles: { ver: false, crear: false, editar: false, eliminar: false },
            contabilidad: { ver: true, exportar: true },
            reportes: { ver: true, exportar: true }
        }
    },
    
    // 💵 Cajera
    [ROLES.ADMIN_CAJA]: {
        nombre: "💵 Cajera",
        color: "#e74c3c",
        modulos_visibles: ['productos', 'ventas'],
        permisos: {
            productos: { ver: true, crear: false, editar: false, eliminar: false },
            inventario: { ver: false, ajustar: false },
            compras: { ver: false, crear: false, editar: false, eliminar: false },
            gastos: { ver: false, crear: false, editar: false, eliminar: false },
            proveedores: { ver: false, crear: false, editar: false, eliminar: false },
            ventas: { ver: true, crear: true, anular: false },
            perfiles: { ver: false, crear: false, editar: false, eliminar: false },
            contabilidad: { ver: false, exportar: false },
            reportes: { ver: false, exportar: false }
        }
    }
};

// Variable global del usuario actual
let currentUserPermissions = null;
let currentUserRol = null;

// Función para cargar permisos del usuario
async function cargarPermisosUsuario(userId) {
    try {
        console.log('📡 Cargando permisos para userId:', userId);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${userId}`, {
            headers: { 
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Error HTTP:', response.status);
            return null;
        }
        
        const perfiles = await response.json();
        console.log('📡 Perfil recibido:', perfiles);
        
        if (perfiles.length === 0) {
            console.error('❌ No se encontró perfil para userId:', userId);
            return null;
        }
        
        const perfil = perfiles[0];
        console.log('📡 Datos del perfil:', perfil);
        
        // Leer el rol_usuario (con fallback)
        const rolUsuario = perfil.rol_usuario || perfil.rol || 'admin_productos';
        console.log('📡 Rol detectado:', rolUsuario);
        
        currentUserRol = rolUsuario;
        currentUserPermissions = ROLES_CONFIG[rolUsuario] || ROLES_CONFIG['admin_productos'];
        
        console.log('✅ Permisos cargados:', currentUserPermissions.nombre);
        console.log('✅ Módulos visibles:', currentUserPermissions.modulos_visibles);
        
        return currentUserPermissions;
        
    } catch (error) {
        console.error('❌ Error cargando permisos:', error);
        return null;
    }
}

// Función para verificar si tiene permiso
function tienePermiso(modulo, accion = 'ver') {
    if (!currentUserPermissions) return false;
    return currentUserPermissions.permisos[modulo]?.[accion] || false;
}

// Función para verificar si puede ver un módulo
function puedeVerModulo(modulo) {
    return currentUserPermissions?.modulos_visibles?.includes(modulo) || false;
}

// Función para ocultar/mostrar elementos según permisos
function aplicarPermisosUI() {
    if (!currentUserPermissions) return;
    
    // Ocultar/mostrar botones de navegación
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const modulo = btn.dataset.modulo;
        if (modulo && !puedeVerModulo(modulo)) {
            btn.style.display = 'none';
        } else if (modulo) {
            btn.style.display = 'flex';
        }
    });
    
    // Mostrar el rol del usuario en la interfaz
    const userRolSpan = document.getElementById('userRolDisplay');
    if (userRolSpan) {
        userRolSpan.textContent = currentUserPermissions.nombre;
        userRolSpan.style.background = currentUserPermissions.color + '20';
        userRolSpan.style.color = currentUserPermissions.color;
    }
}

// Función para mostrar solo módulos permitidos
function filtrarModulosPorPermisos() {
    const todasSecciones = ['productos', 'inventario', 'compras', 'gastos', 'proveedores', 'ventas', 'perfiles', 'contabilidad'];
    
    todasSecciones.forEach(modulo => {
        const seccion = document.getElementById(`modulo-${modulo}`);
        if (seccion) {
            if (puedeVerModulo(modulo)) {
                seccion.style.display = 'block';
            } else {
                seccion.style.display = 'none';
            }
        }
    });
}

// Función para obtener el primer módulo visible
function getPrimerModuloVisible() {
    const modulos = currentUserPermissions?.modulos_visibles || ['productos'];
    return modulos[0];
}
