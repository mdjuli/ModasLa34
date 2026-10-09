// ============================================
// CONTABILIDAD-MAIN.JS
// Inicialización, navegación y utilidades
// ============================================

// Variables globales
let fechaInicio = new Date();
fechaInicio.setDate(1);
fechaInicio.setHours(0, 0, 0, 0);

let fechaFin = new Date();
fechaFin.setHours(23, 59, 59, 999);

let asientosCache = [];
let periodoActual = 'mes';

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Módulo contabilidad iniciado');
    
    await verificarSesion();
    inicializarFechas();
    await cargarPlanCuentas();
    await cargarAsientos();
    await cargarAsientosGuardados();
    
    console.log('✅ Módulo contabilidad listo');
});

async function verificarSesion() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) {
        window.location.href = 'login.html';
        return;
    }
}

function inicializarFechas() {
    const inputInicio = document.getElementById('fecha-inicio');
    const inputFin = document.getElementById('fecha-fin');
    
    if (inputInicio) inputInicio.value = fechaInicio.toISOString().split('T')[0];
    if (inputFin) inputFin.value = fechaFin.toISOString().split('T')[0];
}

// ============================================
// TABS
// ============================================

function mostrarTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    // Cargar datos específicos según el tab
    switch(tabId) {
        case 'resultados':
            if (typeof cargarEstadoResultados === 'function') cargarEstadoResultados();
            break;
        case 'balance':
            if (typeof cargarBalanceGeneral === 'function') cargarBalanceGeneral();
            break;
        case 'mayor':
            if (typeof cargarListaCuentasMayor === 'function') cargarListaCuentasMayor();
            break;
        case 'balance-prueba':
            if (typeof cargarBalancePrueba === 'function') cargarBalancePrueba();
            break;
    }
}

// ============================================
// PERIODO
// ============================================

function cambiarPeriodo(periodo, event) {
    periodoActual = periodo;
    const hoy = new Date();
    
    if (periodo === 'mes') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodo === 'trimestre') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodo === 'año') {
        fechaInicio = new Date(hoy.getFullYear(), 0, 1);
        fechaFin = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59);
    }
    
    document.querySelectorAll('.periodo-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    document.getElementById('fecha-inicio').value = fechaInicio.toISOString().split('T')[0];
    document.getElementById('fecha-fin').value = fechaFin.toISOString().split('T')[0];
    
    recargarTodo();
}

function aplicarPeriodoPersonalizado() {
    const inputInicio = document.getElementById('fecha-inicio').value;
    const inputFin = document.getElementById('fecha-fin').value;
    
    if (!inputInicio || !inputFin) {
        mostrarToast('Selecciona ambas fechas', 'error');
        return;
    }
    
    fechaInicio = new Date(inputInicio);
    fechaFin = new Date(inputFin);
    fechaFin.setHours(23, 59, 59, 999);
    
    document.querySelectorAll('.periodo-btn').forEach(btn => btn.classList.remove('active'));
    
    recargarTodo();
}

async function recargarTodo() {
    await cargarAsientos();
    await cargarAsientosGuardados();
    
    // Recargar el tab activo
    const tabActivo = document.querySelector('.tab-content.active');
    if (tabActivo) {
        const tabId = tabActivo.id.replace('tab-', '');
        switch(tabId) {
            case 'resultados':
                if (typeof cargarEstadoResultados === 'function') cargarEstadoResultados();
                break;
            case 'balance':
                if (typeof cargarBalanceGeneral === 'function') cargarBalanceGeneral();
                break;
            case 'balance-prueba':
                if (typeof cargarBalancePrueba === 'function') cargarBalancePrueba();
                break;
        }
    }
}

// ============================================
// PLAN DE CUENTAS - MODAL
// ============================================

async function abrirPlanCuentas() {
    const modal = document.getElementById('modal-plan-cuentas');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        await cargarPlanCuentas();
    }
}

function cerrarPlanCuentas() {
    const modal = document.getElementById('modal-plan-cuentas');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function filtrarPlanCuentas() {
    const busqueda = document.getElementById('buscar-cuenta')?.value.toLowerCase() || '';
    const tipo = document.getElementById('filtro-tipo-cuenta')?.value || '';
    const nivel = document.getElementById('filtro-nivel-cuenta')?.value || '';
    
    if (typeof planCuentasCache === 'undefined') return;
    
    const filtradas = planCuentasCache.filter(c => {
        if (busqueda && !c.codigo.toLowerCase().includes(busqueda) && 
            !c.nombre.toLowerCase().includes(busqueda)) return false;
        if (tipo && c.tipo !== tipo) return false;
        if (nivel && c.nivel != nivel) return false;
        return true;
    });
    
    if (typeof renderizarTablaPlanCuentas === 'function') {
        renderizarTablaPlanCuentas(filtradas);
    }
}

// ============================================
// UTILIDADES GLOBALES
// ============================================

function mostrarToast(mensaje, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-${tipo}`;
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${iconos[tipo] || 'fa-info-circle'}"></i> ${mensaje}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function obtenerToken() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) {
        window.location.href = 'login.html';
        return '';
    }
    return JSON.parse(tokenData).access_token;
}

function formatearMoneda(valor) {
    const num = parseFloat(valor) || 0;
    return '$' + num.toLocaleString('es-CO', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
    });
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

function escaparHTML(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// EXPORTAR
// ============================================

window.mostrarTab = mostrarTab;
window.cambiarPeriodo = cambiarPeriodo;
window.aplicarPeriodoPersonalizado = aplicarPeriodoPersonalizado;
window.recargarTodo = recargarTodo;
window.abrirPlanCuentas = abrirPlanCuentas;
window.cerrarPlanCuentas = cerrarPlanCuentas;
window.filtrarPlanCuentas = filtrarPlanCuentas;
window.mostrarToast = mostrarToast;
window.obtenerToken = obtenerToken;
window.formatearMoneda = formatearMoneda;
window.formatearFecha = formatearFecha;
window.escaparHTML = escaparHTML;

console.log('✅ contabilidad-main.js cargado');
