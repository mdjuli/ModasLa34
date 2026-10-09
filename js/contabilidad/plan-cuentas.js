// ============================================
// PLAN DE CUENTAS - MODAS LA 34
// CRUD completo y funcional
// ============================================

let planCuentasCache = [];
let cuentaEditandoId = null;

// ============================================
// CARGAR PLAN DE CUENTAS
// ============================================

async function cargarPlanCuentas() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/plan_cuentas?order=codigo.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Error al cargar plan de cuentas');
        
        planCuentasCache = await response.json();
        console.log(`✅ Plan de cuentas cargado: ${planCuentasCache.length} cuentas`);
        
        renderizarTablaPlanCuentas(planCuentasCache);
        llenarSelectCuentas();
        
        return planCuentasCache;
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al cargar plan de cuentas', 'error');
        return [];
    }
}

// ============================================
// RENDERIZAR TABLA DEL PLAN DE CUENTAS
// ============================================

function renderizarTablaPlanCuentas(cuentas) {
    const tbody = document.getElementById('plan-cuentas-body');
    if (!tbody) return;
    
    if (cuentas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #a0a0b0;">
                    No hay cuentas registradas
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = cuentas.map(cuenta => {
        const colorTipo = obtenerColorTipo(cuenta.tipo);
        const indentacion = '&nbsp;'.repeat((cuenta.nivel - 1) * 4);
        const esTitulo = !cuenta.permite_movimiento;
        
        return `
            <tr style="${esTitulo ? 'background: rgba(212,165,169,0.08);' : ''}">
                <td>
                    <span style="font-family: monospace; font-weight: 600; color: #d4a5a9;">
                        ${indentacion}${cuenta.codigo}
                    </span>
                </td>
                <td>
                    <strong>${cuenta.nombre}</strong>
                    ${cuenta.descripcion ? `<br><small style="color: #a0a0b0;">${cuenta.descripcion}</small>` : ''}
                </td>
                <td>
                    <span style="background: ${colorTipo}; color: #1a1a2e; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">
                        ${cuenta.tipo}
                    </span>
                </td>
                <td>
                    <span style="color: ${cuenta.naturaleza === 'DEUDORA' ? '#4ade80' : '#f87171'}; font-size: 0.8rem;">
                        ${cuenta.naturaleza}
                    </span>
                </td>
                <td>${cuenta.nivel}</td>
                <td>
                    ${esTitulo 
                        ? '<span style="color: #fbbf24;">📁 Título</span>' 
                        : '<span style="color: #4ade80;">✅ Movimiento</span>'}
                </td>
                <td>
                    <button class="btn-editar" onclick="abrirEditarCuenta(${cuenta.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar" onclick="eliminarCuenta(${cuenta.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function obtenerColorTipo(tipo) {
    const colores = {
        'ACTIVO': '#4ade80',
        'PASIVO': '#f87171',
        'PATRIMONIO': '#38bdf8',
        'INGRESO': '#4ade80',
        'GASTO': '#fbbf24',
        'COSTO': '#a78bfa'
    };
    return colores[tipo] || '#a0a0b0';
}

// ============================================
// ABRIR MODAL: NUEVA CUENTA
// ============================================

function abrirNuevaCuenta() {
    cuentaEditandoId = null;
    document.getElementById('modal-cuenta-title').textContent = '➕ Nueva Cuenta';
    document.getElementById('cuenta-plan-id').value = '';
    document.getElementById('cuenta-codigo').value = '';
    document.getElementById('cuenta-nombre').value = '';
    document.getElementById('cuenta-descripcion').value = '';
    document.getElementById('cuenta-tipo').value = 'ACTIVO';
    document.getElementById('cuenta-naturaleza').value = 'DEUDORA';
    document.getElementById('cuenta-padre').value = '';
    document.getElementById('cuenta-permite-movimiento').checked = true;
    document.getElementById('cuenta-estado').value = 'activa';
    document.getElementById('modal-editar-cuenta').style.display = 'flex';
}

// ============================================
// ABRIR MODAL: EDITAR CUENTA (ARREGLA TU PROBLEMA)
// ============================================

async function abrirEditarCuenta(id) {
    try {
        cuentaEditandoId = id;
        
        // Cargar la cuenta fresca desde Supabase (no desde caché)
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/plan_cuentas?id=eq.${id}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Error al cargar la cuenta');
        
        const cuentas = await response.json();
        if (cuentas.length === 0) throw new Error('Cuenta no encontrada');
        
        const cuenta = cuentas[0];
        
        // Llenar el modal
        document.getElementById('modal-cuenta-title').textContent = `✏️ Editar: ${cuenta.codigo}`;
        document.getElementById('cuenta-plan-id').value = cuenta.id;
        document.getElementById('cuenta-codigo').value = cuenta.codigo;
        document.getElementById('cuenta-nombre').value = cuenta.nombre;
        document.getElementById('cuenta-descripcion').value = cuenta.descripcion || '';
        document.getElementById('cuenta-tipo').value = cuenta.tipo;
        document.getElementById('cuenta-naturaleza').value = cuenta.naturaleza;
        document.getElementById('cuenta-padre').value = cuenta.cuenta_padre_id || '';
        document.getElementById('cuenta-permite-movimiento').checked = cuenta.permite_movimiento;
        document.getElementById('cuenta-estado').value = cuenta.estado || 'activa';
        
        // Cargar opciones de cuenta padre (excluyendo la cuenta actual y sus descendientes)
        await cargarSelectCuentaPadre(cuenta.id);
        
        document.getElementById('modal-editar-cuenta').style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al cargar la cuenta: ' + error.message, 'error');
    }
}

// ============================================
// CARGAR SELECT DE CUENTA PADRE
// ============================================

async function cargarSelectCuentaPadre(cuentaExcluirId = null) {
    const select = document.getElementById('cuenta-padre');
    if (!select) return;
    
    // Obtener descendientes para excluirlos (no puede ser padre de sí mismo ni de sus hijos)
    let idsExcluir = [];
    if (cuentaExcluirId) {
        idsExcluir = await obtenerDescendientes(cuentaExcluirId);
        idsExcluir.push(cuentaExcluirId);
    }
    
    const cuentasDisponibles = planCuentasCache.filter(c => 
        !idsExcluir.includes(c.id)
    );
    
    select.innerHTML = '<option value="">Sin cuenta padre (raíz)</option>' +
        cuentasDisponibles.map(c => `
            <option value="${c.id}">
                ${'—'.repeat(c.nivel - 1)} ${c.codigo} - ${c.nombre}
            </option>
        `).join('');
}

async function obtenerDescendientes(cuentaId) {
    const descendientes = [];
    const cola = [cuentaId];
    
    while (cola.length > 0) {
        const padreId = cola.shift();
        const hijos = planCuentasCache.filter(c => c.cuenta_padre_id === padreId);
        hijos.forEach(h => {
            descendientes.push(h.id);
            cola.push(h.id);
        });
    }
    
    return descendientes;
}

// ============================================
// GUARDAR CUENTA (CREAR O ACTUALIZAR)
// ============================================

async function guardarCuenta(event) {
    event.preventDefault();
    
    try {
        const id = document.getElementById('cuenta-plan-id').value;
        const codigo = document.getElementById('cuenta-codigo').value.trim();
        const nombre = document.getElementById('cuenta-nombre').value.trim().toUpperCase();
        const descripcion = document.getElementById('cuenta-descripcion').value.trim() || null;
        const tipo = document.getElementById('cuenta-tipo').value;
        const naturaleza = document.getElementById('cuenta-naturaleza').value;
        const padreId = document.getElementById('cuenta-padre').value;
        const permiteMovimiento = document.getElementById('cuenta-permite-movimiento').checked;
        const estado = document.getElementById('cuenta-estado').value;
        
        // Validaciones
        if (!codigo || !nombre) {
            mostrarToast('Código y nombre son obligatorios', 'error');
            return;
        }
        
        // Verificar que el código no esté duplicado (excepto si es la misma cuenta)
        const codigoDuplicado = planCuentasCache.find(c => 
            c.codigo === codigo && c.id != id
        );
        
        if (codigoDuplicado) {
            mostrarToast(`El código ${codigo} ya existe`, 'error');
            return;
        }
        
        // Calcular nivel
        let nivel = 1;
        if (padreId) {
            const padre = planCuentasCache.find(c => c.id == padreId);
            if (padre) nivel = padre.nivel + 1;
        }
        
        // Preparar datos
        const cuentaData = {
            codigo,
            nombre,
            descripcion,
            tipo,
            naturaleza,
            cuenta_padre_id: padreId ? parseInt(padreId) : null,
            nivel,
            permite_movimiento: permiteMovimiento,
            estado
        };
        
        let url = `${SUPABASE_URL}/rest/v1/plan_cuentas`;
        let method = 'POST';
        
        if (id) {
            // ACTUALIZAR
            url += `?id=eq.${id}`;
            method = 'PATCH';
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${obtenerToken()}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(cuentaData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar');
        }
        
        const resultado = await response.json();
        console.log('✅ Cuenta guardada:', resultado);
        
        mostrarToast(id ? 'Cuenta actualizada' : 'Cuenta creada', 'success');
        cerrarModalCuenta();
        
        // Recargar
        await cargarPlanCuentas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// ELIMINAR CUENTA
// ============================================

async function eliminarCuenta(id) {
    try {
        const cuenta = planCuentasCache.find(c => c.id === id);
        if (!cuenta) return;
        
        // Verificar si tiene movimientos
        const movimientos = await verificarMovimientosCuenta(id);
        
        if (movimientos.tieneMovimientos) {
            mostrarToast(
                `No se puede eliminar: la cuenta tiene ${movimientos.total} movimientos. Desactívala en su lugar.`,
                'error'
            );
            return;
        }
        
        // Verificar si tiene subcuentas
        const subcuentas = planCuentasCache.filter(c => c.cuenta_padre_id === id);
        if (subcuentas.length > 0) {
            mostrarToast(
                `No se puede eliminar: tiene ${subcuentas.length} subcuentas`,
                'error'
            );
            return;
        }
        
        if (!confirm(`¿Eliminar la cuenta ${cuenta.codigo} - ${cuenta.nombre}?`)) return;
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/plan_cuentas?id=eq.${id}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Error al eliminar');
        
        mostrarToast('Cuenta eliminada', 'success');
        await cargarPlanCuentas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al eliminar: ' + error.message, 'error');
    }
}

async function verificarMovimientosCuenta(cuentaId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?cuenta_id=eq.${cuentaId}&select=id`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        const movimientos = await response.json();
        return {
            tieneMovimientos: movimientos.length > 0,
            total: movimientos.length
        };
    } catch (error) {
        return { tieneMovimientos: false, total: 0 };
    }
}

// ============================================
// LLENAR SELECT DE CUENTAS PARA ASIENTOS
// ============================================

function llenarSelectCuentas() {
    const cuentasMovimiento = planCuentasCache.filter(c => 
        c.permite_movimiento && c.estado === 'activa'
    );
    
    // Guardar en variable global para uso en asientos.js
    window.cuentasParaMovimiento = cuentasMovimiento;
    
    console.log(`📋 Cuentas disponibles para movimiento: ${cuentasMovimiento.length}`);
}

// ============================================
// CERRAR MODAL
// ============================================

function cerrarModalCuenta() {
    document.getElementById('modal-editar-cuenta').style.display = 'none';
    cuentaEditandoId = null;
}

// ============================================
// HELPERS
// ============================================

function obtenerToken() {
    const tokenData = localStorage.getItem('admin_token');
    if (!tokenData) {
        window.location.href = 'login.html';
        return '';
    }
    return JSON.parse(tokenData).access_token;
}

function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-${tipo}`;
    toast.innerHTML = `
        <i class="fas ${
            tipo === 'success' ? 'fa-check-circle' : 
            tipo === 'error' ? 'fa-exclamation-circle' : 
            'fa-info-circle'
        }"></i> ${mensaje}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// EXPORTAR
// ============================================

window.cargarPlanCuentas = cargarPlanCuentas;
window.renderizarTablaPlanCuentas = renderizarTablaPlanCuentas;
window.abrirNuevaCuenta = abrirNuevaCuenta;
window.abrirEditarCuenta = abrirEditarCuenta;
window.guardarCuenta = guardarCuenta;
window.eliminarCuenta = eliminarCuenta;
window.cerrarModalCuenta = cerrarModalCuenta;
window.cargarSelectCuentaPadre = cargarSelectCuentaPadre;
window.obtenerToken = obtenerToken;
window.mostrarToast = mostrarToast;

console.log('✅ plan-cuentas.js cargado');
