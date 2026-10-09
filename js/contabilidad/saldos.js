// ============================================
// SALDOS.JS - Cálculo de saldos y movimientos
// ============================================

// ============================================ 
// CALCULAR SALDOS POR CUENTA
// ============================================

async function calcularSaldosCuentas(fechaIni = null, fechaFinParam = null) {
    const fIni = fechaIni || fechaInicio.toISOString().split('T')[0];
    const fFin = fechaFinParam || fechaFin.toISOString().split('T')[0];
    
    try {
        // Obtener todas las líneas de asientos CONTABILIZADOS en el período
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?select=cuenta_id,codigo_cuenta,nombre_cuenta,debito,credito,asientos_contables!inner(fecha,estado)`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) return {};
        
        const lineas = await response.json();
        
        const saldos = {};
        
        lineas.forEach(l => {
            const asiento = l.asientos_contables;
            if (!asiento) return;
            
            // Solo contabilizados
            if (asiento.estado !== 'contabilizado') return;
            
            const fecha = asiento.fecha;
            const dentroDelPeriodo = fecha >= fIni && fecha <= fFin;
            
            if (!dentroDelPeriodo) return;
            
            if (!saldos[l.cuenta_id]) {
                saldos[l.cuenta_id] = {
                    cuenta_id: l.cuenta_id,
                    codigo: l.codigo_cuenta,
                    nombre: l.nombre_cuenta,
                    debito: 0,
                    credito: 0
                };
            }
            
            saldos[l.cuenta_id].debito += parseFloat(l.debito) || 0;
            saldos[l.cuenta_id].credito += parseFloat(l.credito) || 0;
        });
        
        return saldos;
        
    } catch (error) {
        console.error('Error calculando saldos:', error);
        return {};
    }
}

// ============================================
// SALDO DE UNA CUENTA ESPECÍFICA
// ============================================

async function saldoCuenta(codigo, fechaIni = null, fechaFinParam = null) {
    const fIni = fechaIni || fechaInicio.toISOString().split('T')[0];
    const fFin = fechaFinParam || fechaFin.toISOString().split('T')[0];
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/saldo_cuenta`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_cuenta_id: (planCuentasCache.find(c => c.codigo === codigo) || {}).id,
                    p_fecha_inicio: fIni,
                    p_fecha_fin: fFin
                })
            }
        );
        
        if (!response.ok) return { saldo_inicial: 0, total_debito: 0, total_credito: 0, saldo_final: 0 };
        
        const [resultado] = await response.json();
        return resultado;
        
    } catch (error) {
        console.error('Error:', error);
        return { saldo_inicial: 0, total_debito: 0, total_credito: 0, saldo_final: 0 };
    }
}

// ============================================
// MAYOR DE CUENTA
// ============================================

async function cargarListaCuentasMayor() {
    const select = document.getElementById('select-cuenta-mayor');
    if (!select) return;
    
    // Cargar plan de cuentas si no está cargado
    if (!planCuentasCache || planCuentasCache.length === 0) {
        await cargarPlanCuentas();
    }
    
    const cuentasMov = planCuentasCache.filter(c => c.permite_movimiento);
    
    select.innerHTML = '<option value="">Seleccionar cuenta...</option>' +
        cuentasMov.map(c => `<option value="${c.codigo}">${c.codigo} - ${c.nombre}</option>`).join('');
}

async function cargarMayorCuenta() {
    const codigo = document.getElementById('select-cuenta-mayor')?.value;
    const contenido = document.getElementById('mayor-contenido');
    
    if (!contenido) return;
    
    if (!codigo) {
        contenido.innerHTML = '<p class="empty-message">Selecciona una cuenta para ver su movimiento</p>';
        return;
    }
    
    try {
        contenido.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando movimientos...</p></div>';
        
        // Obtener movimientos de esa cuenta
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento
        // Obtener movimientos de esa cuenta
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?codigo_cuenta=eq.${codigo}&select=*,asientos_contables!inner(numero,fecha,concepto,referencia,tercero,estado)&order=asientos_contables(fecha).asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Error al cargar movimientos');
        
        const movimientos = await response.json();
        
        // Filtrar por período y estado contabilizado
        const movimientosFiltrados = movimientos.filter(m => {
            const fecha = m.asientos_contables?.fecha;
            const estado = m.asientos_contables?.estado;
            if (estado !== 'contabilizado') return false;
            if (!fecha) return false;
            return fecha >= fechaInicio.toISOString().split('T')[0] && 
                   fecha <= fechaFin.toISOString().split('T')[0];
        });
        
        if (movimientosFiltrados.length === 0) {
            contenido.innerHTML = `
                <div class="empty-message">
                    No hay movimientos para esta cuenta en el período seleccionado
                </div>
            `;
            return;
        }
        
        // Calcular saldo acumulado
        let saldoAcumulado = 0;
        let totalDebitos = 0;
        let totalCreditos = 0;
        
        const filas = movimientosFiltrados.map(m => {
            const debito = parseFloat(m.debito) || 0;
            const credito = parseFloat(m.credito) || 0;
            totalDebitos += debito;
            totalCreditos += credito;
            saldoAcumulado += (debito - credito);
            
            const a = m.asientos_contables;
            
            return `
                <tr>
                    <td>${formatearFecha(a.fecha)}</td>
                    <td><span style="font-family: monospace; color: #d4a5a9;">${a.numero}</span></td>
                    <td>${escaparHTML(a.concepto || '')}</td>
                    <td>${escaparHTML(a.tercero || '-')}</td>
                    <td class="monto-debito">${debito > 0 ? formatearMoneda(debito) : '—'}</td>
                    <td class="monto-credito">${credito > 0 ? formatearMoneda(credito) : '—'}</td>
                    <td class="monto-debito">${formatearMoneda(saldoAcumulado)}</td>
                </tr>
            `;
        }).join('');
        
        // Determinar naturaleza
        const cuenta = planCuentasCache.find(c => c.codigo === codigo);
        const naturaleza = cuenta?.naturaleza || 'DEUDORA';
        const saldoFinal = naturaleza === 'DEUDORA' ? saldoAcumulado : -saldoAcumulado;
        
        contenido.innerHTML = `
            <div class="mayor-info-card">
                <h3>${codigo} - ${cuenta?.nombre || ''}</h3>
                <p><strong>Naturaleza:</strong> ${naturaleza}</p>
                <p><strong>Período:</strong> ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaFin)}</p>
            </div>
            
            <div class="table-responsive">
                <table class="mayor-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Comprobante</th>
                            <th>Concepto</th>
                            <th>Tercero</th>
                            <th style="text-align:right;">Débito</th>
                            <th style="text-align:right;">Crédito</th>
                            <th style="text-align:right;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                    <tfoot>
                        <tr style="background: rgba(212,165,169,0.1); font-weight: bold;">
                            <td colspan="4">TOTALES DEL PERÍODO</td>
                            <td class="monto-debito">${formatearMoneda(totalDebitos)}</td>
                            <td class="monto-credito">${formatearMoneda(totalCreditos)}</td>
                            <td class="monto-debito">${formatearMoneda(saldoFinal)}</td>
                        </tr>
                        <tr style="background: rgba(212,165,169,0.15); font-weight: bold;">
                            <td colspan="6" style="text-align:right;">SALDO FINAL:</td>
                            <td class="monto-${naturaleza === 'DEUDORA' ? 'debito' : 'credito'}">
                                ${formatearMoneda(Math.abs(saldoFinal))} ${naturaleza === 'DEUDORA' ? 'Débito' : 'Crédito'}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Error:', error);
        contenido.innerHTML = `<div class="empty-message" style="color: #f87171;">Error: ${error.message}</div>`;
    }
}

// ============================================
// CALCULAR RESUMEN DE TARJETAS
// ============================================

async function calcularResumenTarjetas() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        // Buscar cuentas por código
        const buscarSaldo = (codigo) => {
            const cuenta = planCuentasCache.find(c => c.codigo === codigo);
            if (!cuenta) return 0;
            const s = saldos[cuenta.id];
            if (!s) return 0;
            return s.debito - s.credito;
        };
        
        // Ingresos (crédito de cuentas de ingreso)
        let ingresos = 0;
        planCuentasCache.filter(c => c.tipo === 'INGRESO' && c.permite_movimiento).forEach(c => {
            const s = saldos[c.id];
            if (s) ingresos += s.credito - s.debito;
        });
        
        // Egresos (débito de gastos + costo)
        let egresos = 0;
        planCuentasCache.filter(c => (c.tipo === 'GASTO' || c.tipo === 'COSTO') && c.permite_movimiento).forEach(c => {
            const s = saldos[c.id];
            if (s) egresos += s.debito - s.credito;
        });
        
        const utilidad = ingresos - egresos;
        
        // Caja, bancos, inventario
        const saldoCaja = buscarSaldo('110505');
        const saldoBancos = buscarSaldo('111005');
        const saldoInventario = buscarSaldo('143505');
        
        // Actualizar UI
        const elIngresos = document.getElementById('total-ingresos');
        const elEgresos = document.getElementById('total-egresos');
        const elUtilidad = document.getElementById('utilidad');
        const elCaja = document.getElementById('saldo-caja');
        const elBancos = document.getElementById('saldo-bancos');
        const elInventario = document.getElementById('saldo-inventario');
        
        if (elIngresos) elIngresos.textContent = formatearMoneda(ingresos);
        if (elEgresos) elEgresos.textContent = formatearMoneda(egresos);
        if (elUtilidad) {
            elUtilidad.textContent = formatearMoneda(utilidad);
            elUtilidad.className = 'valor ' + (utilidad >= 0 ? 'positivo' : 'negativo');
        }
        if (elCaja) elCaja.textContent = formatearMoneda(saldoCaja);
        if (elBancos) elBancos.textContent = formatearMoneda(saldoBancos);
        if (elInventario) elInventario.textContent = formatearMoneda(saldoInventario);
        
    } catch (error) {
        console.error('Error calculando resumen:', error);
    }
}

// ============================================
// EXPORTAR
// ============================================

window.calcularSaldosCuentas = calcularSaldosCuentas;
window.saldoCuenta = saldoCuenta;
window.cargarListaCuentasMayor = cargarListaCuentasMayor;
window.cargarMayorCuenta = cargarMayorCuenta;
window.calcularResumenTarjetas = calcularResumenTarjetas;

console.log('✅ saldos.js cargado');
