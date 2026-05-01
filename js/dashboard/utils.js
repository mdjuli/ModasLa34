// ============================================
// UTILS.JS - Funciones globales y utilidades
// ============================================

// ===== ALERTAS =====
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (alerta) {
        alerta.textContent = mensaje;
        alerta.className = `alert ${tipo}`;
        alerta.style.display = 'block';
        setTimeout(() => {
            alerta.style.display = 'none';
        }, 3000);
    } else {
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
        alert(mensaje);
    }
}

// ===== MODALES =====
function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.add('active');
        form.style.display = 'flex';
        console.log(`✅ Mostrando formulario: ${tipo}`);
    } else {
        console.error(`❌ No existe form-${tipo}`);
        mostrarAlerta(`Error: Formulario ${tipo} no encontrado`, 'error');
    }
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.remove('active');
        form.style.display = 'none';
        console.log(`✅ Cerrando formulario: ${tipo}`);
    }
    
    // Limpieza específica por tipo
    if (tipo === 'producto') {
        delete document.getElementById('form-producto')?.dataset.editId;
        const btn = document.querySelector('#form-producto .submit-btn');
        if (btn) btn.textContent = 'Guardar Producto';
        const precioCompraInput = document.getElementById('producto-precio-compra');
        if (precioCompraInput) precioCompraInput.value = '';
        const precioVentaGeneral = document.getElementById('producto-precio-venta-general');
        if (precioVentaGeneral) precioVentaGeneral.value = '';
    }
    
    if (tipo === 'venta') {
        if (typeof carrito !== 'undefined') {
            carrito = [];
            if (typeof actualizarCarritoUIManual === 'function') {
                actualizarCarritoUIManual();
            }
        }
        const clienteInput = document.getElementById('venta-cliente');
        if (clienteInput) clienteInput.value = '';
        const buscador = document.getElementById('buscador-producto-venta');
        if (buscador) buscador.value = '';
    }
}

function cerrarTodosModales() {
    document.querySelectorAll('.form-modal, .modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
}

// ===== ESCAPE HTML =====
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===== FACTURAS =====
function verFactura(id) {
    if (id) {
        window.open(`factura.html?id=${id}`, '_blank');
    } else {
        mostrarAlerta('No se puede ver la factura: ID no válido', 'error');
    }
}

function verDetalleVenta(id) {
    verFactura(id);
}

// ===== EMOJIS POR CATEGORÍA =====
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

// ===== FORMATEO DE PRECIOS =====
function formatearPrecio(precio) {
    if (!precio && precio !== 0) return '$0';
    return `$${precio.toLocaleString('es-CO')}`;
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO');
}

// ===== NÚMEROS POR CIERTAS OPERACIONES =====
function calcularPorcentaje(valor, total) {
    if (!total || total === 0) return 0;
    return ((valor / total) * 100).toFixed(1);
}

// ===== VALIDACIONES =====
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validarTelefono(telefono) {
    const re = /^[0-9]{7,15}$/;
    return re.test(telefono);
}

// ===== DEBOUNCE (para búsquedas) =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== DESCARGAR COMO CSV =====
function descargarCSV(data, nombreArchivo, columnas) {
    if (!data || data.length === 0) {
        mostrarAlerta('No hay datos para exportar', 'error');
        return;
    }
    
    let csvContent = columnas.map(col => `"${col.titulo}"`).join(',') + '\n';
    
    data.forEach(row => {
        const fila = columnas.map(col => {
            let valor = row[col.campo];
            if (typeof valor === 'string') valor = valor.replace(/"/g, '""');
            return `"${valor || ''}"`;
        }).join(',');
        csvContent += fila + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    mostrarAlerta(`✅ Exportado: ${nombreArchivo}`, 'success');
}

// ===== COPIAR AL PORTAPAPELES =====
async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        mostrarAlerta('✅ Copiado al portapapeles', 'success');
    } catch (err) {
        console.error('Error al copiar:', err);
        mostrarAlerta('❌ No se pudo copiar', 'error');
    }
}

// ===== TOAST NOTIFICATION (alternativa a alert) =====
function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-${tipo}`;
    toast.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${mensaje}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${tipo === 'success' ? '#27ae60' : tipo === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 0.85rem;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== ANIMACIÓN DE CARGA =====
function mostrarCarga(mostrar, elementoId = null) {
    if (elementoId) {
        const elemento = document.getElementById(elementoId);
        if (elemento) {
            if (mostrar) {
                elemento.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
            }
        }
    } else {
        let loader = document.getElementById('loader-global');
        if (mostrar && !loader) {
            loader = document.createElement('div');
            loader.id = 'loader-global';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;
            loader.innerHTML = '<div style="background:white;padding:20px;border-radius:16px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
            document.body.appendChild(loader);
        } else if (!mostrar && loader) {
            loader.remove();
        }
    }
}

// ===== CONFIGURAR FILTROS GENÉRICOS =====
function configurarFiltrosTabla(idTabla, inputs) {
    const rows = document.querySelectorAll(`#${idTabla} tbody tr`);
    
    function aplicarFiltros() {
        const valores = {};
        inputs.forEach(input => {
            valores[input.id] = document.getElementById(input.id)?.value.toLowerCase() || '';
        });
        
        rows.forEach(row => {
            let mostrar = true;
            for (const input of inputs) {
                const filtro = valores[input.id];
                if (filtro) {
                    const indiceColumna = input.columna;
                    const texto = row.cells[indiceColumna]?.textContent.toLowerCase() || '';
                    if (!texto.includes(filtro)) {
                        mostrar = false;
                        break;
                    }
                }
            }
            row.style.display = mostrar ? '' : 'none';
        });
    }
    
    inputs.forEach(input => {
        const elemento = document.getElementById(input.id);
        if (elemento) {
            elemento.addEventListener('input', debounce(aplicarFiltros, 300));
            elemento.addEventListener('change', aplicarFiltros);
        }
    });
}

// ===== ACTUALIZAR CONTRASEÑA (para perfil) =====
async function actualizarPassword(userId, nuevaPassword) {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'PUT',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: nuevaPassword })
        });
        return response.ok;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ===== OBTENER INFORMACIÓN DEL USUARIO ACTUAL =====
function getCurrentUser() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) return null;
    try {
        const token = JSON.parse(tokenData);
        return token;
    } catch {
        return null;
    }
}

// ===== ANIMACIONES =====
function animateElement(elementId, animation) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.animation = `${animation} 0.3s ease`;
        setTimeout(() => {
            element.style.animation = '';
        }, 300);
    }
}

// ===== SCROLL SUAVE =====
function scrollASeccion(seccionId) {
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ============================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// ============================================
window.mostrarAlerta = mostrarAlerta;
window.mostrarFormulario = mostrarFormulario;
window.cerrarFormulario = cerrarFormulario;
window.cerrarTodosModales = cerrarTodosModales;
window.escapeHtml = escapeHtml;
window.verFactura = verFactura;
window.verDetalleVenta = verDetalleVenta;
window.getEmojiCategoria = getEmojiCategoria;
window.formatearPrecio = formatearPrecio;
window.formatearFecha = formatearFecha;
window.calcularPorcentaje = calcularPorcentaje;
window.validarEmail = validarEmail;
window.validarTelefono = validarTelefono;
window.debounce = debounce;
window.descargarCSV = descargarCSV;
window.copiarAlPortapapeles = copiarAlPortapapeles;
window.mostrarToast = mostrarToast;
window.mostrarCarga = mostrarCarga;
window.configurarFiltrosTabla = configurarFiltrosTabla;
window.actualizarPassword = actualizarPassword;
window.getCurrentUser = getCurrentUser;
window.animateElement = animateElement;
window.scrollASeccion = scrollASeccion;

// ===== ANIMACIONES CSS GLOBALES =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    .animate-pulse { animation: pulse 0.5s ease; }
    .animate-fade { animation: fadeIn 0.3s ease; }
`;
document.head.appendChild(style);

console.log('✅ Utils.js cargado correctamente');
