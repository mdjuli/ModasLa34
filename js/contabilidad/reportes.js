// ============================================
// REPORTES.JS - Estado de resultados, balance, balance de prueba
// ============================================

// ============================================
// ESTADO DE RESULTADOS (PyG)
// ============================================

async function cargarEstadoResultados() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        // Calcular valores de cada categoría
        let ingresos = 0;
        let costoVentas = 0;
        const gastos = {};
        
        planCuentasCache.forEach(c => {
            const s = saldos[c.id];
            if (!s) return;
            
            if (c.tipo === 'INGRESO') {
                ingresos += (s.credito - s.debito);
            } else if (c.tipo === 'COSTO') {
                costoVentas += (s.debito - s.credito);
            } else if (c.tipo === 'GASTO') {
                const monto = s.debito - s.credito;
                if (monto !== 0) {
                    gastos[c.codigo] = {
                        nombre: c.nombre,
                        monto: monto
                    };
                }
            }
        });
        
        const totalGastos = Object.values(gastos).reduce((s, g) => s + g.monto, 0);
        const utilidadBruta = ingresos - costoVentas;
        const utilidadOperacional = utilidadBruta - totalGastos;
        
        // Actualizar UI
        const rowIngresos = document.getElementById('row-ingresos');
        if (rowIngresos) {
            rowIngresos.innerHTML = `
                <td>Ventas totales</td>
                <td class="valor">${formatearMoneda(ingresos)}</td>
            `;
        }
        
        const rowCosto = document.getElementById('row-costo');
        if (rowCosto) {
            rowCosto.innerHTML = `
                <td>Costo de ventas</td>
                <td class="valor">${formatearMoneda(costoVentas)}</td>
            `;
        }
        
        const elUtilidadBruta = document.getElementById('utilidad-bruta');
        if (elUtilidadBruta) elUtilidadBruta.textContent = formatearMoneda(utilidadBruta);
        
        // Gastos detallados
        const gastosBody = document.getElementById('gastos-body');
        if (gastosBody) {
            gastosBody.innerHTML = Object.entries(gastos).map(([cod, g]) => `
                <tr>
                    <td>${cod} - ${g.nombre}</td>
                    <td class="valor">${formatearMoneda(g.monto)}</td>
                </tr>
            `).join('');
            
            gastosBody.innerHTML += `
                <tr class="total-row">
                    <td><strong>Total gastos operacionales</strong></td>
                    <td class="valor"><strong>${formatearMoneda(totalGastos)}</strong></td>
                </tr>
            `;
        }
        
        const elUtilidadOp = document.getElementById('utilidad-operacional');
        if (elUtilidadOp) elUtilidadOp.textContent = formatearMoneda(utilidadOperacional);
        
        const elUtilidadNeta = document.getElementById('utilidad-neta');
        if (elUtilidadNeta) elUtilidadNeta.textContent = formatearMoneda(utilidadOperacional);
        
    } catch (error) {
        console.error('Error en estado de resultados:', error);
    }
}

// ============================================
// BALANCE GENERAL
// ============================================

async function cargarBalanceGeneral() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        const activos = {};
        const pasivos = {};
        const patrimonio = {};
        
        planCuentasCache.forEach(c => {
            if (!c.permite_movimiento) return;
            const s = saldos[c.id];
            if (!s) return;
            
            const saldo = s.debito - s.credito;
            if (saldo === 0) return;
            
            if (c.tipo === 'ACTIVO') {
                activos[c.codigo] = { nombre: c.nombre, saldo: saldo };
            } else if (c.tipo === 'PASIVO') {
                pasivos[c.codigo] = { nombre: c.nombre, saldo: -saldo };
            } else if (c.tipo === 'PATRIMONIO') {
                patrimonio[c.codigo] = { nombre: c.nombre, saldo: -saldo };
            }
        });
        
        // Calcular utilidad del período
        let ingresos = 0, gastos = 0;
        planCuentasCache.forEach(c => {
            const s = saldos[c.id];
            if (!s) return;
            if (c.tipo === 'INGRESO') ingresos += (s.credito - s.debito);
            if (c.tipo === 'GASTO' || c.tipo === 'COSTO') gastos += (s.debito - s.credito);
        });
        const utilidad = ingresos - gastos;
        
        // Renderizar activos
        const tablaActivos = document.getElementById('tabla-activos');
        if (tablaActivos) {
            let html = '';
            let totalActivos = 0;
            
            Object.entries(activos).forEach(([cod, a]) => {
                html += `<tr><td>${cod} - ${a.nombre}</td><td class="valor">${formatearMoneda(a.saldo)}</td></tr>`;
                totalActivos += a.saldo;
            });
            
            tablaActivos.innerHTML = `<tbody>${html}</tbody>`;
            
            const elTotalActivos = document.getElementById('total-activos');
            if (elTotalActivos) elTotalActivos.textContent = formatearMoneda(totalActivos);
        }
        
        // Renderizar pasivos + patrimonio
        const tablaPasivos = document.getElementById('tabla-pasivos');
        if (tablaPasivos) {
            let html = '';
            let totalPasivos = 0;
            let totalPatrimonio = 0;
            
            Object.entries(pasivos).forEach(([cod, p]) => {
                html += `<tr><td>${cod} - ${p.nombre}</td><td class="valor">${formatearMoneda(p.saldo)}</td></tr>`;
                totalPasivos += p.saldo;
            });
            
            html += `<tr><td colspan="2" style="padding:0.5rem;"></td></tr>`;
            html += `<tr><td style="font-weight:bold; color:#d4a5a9;">PATRIMONIO</td><td></td></tr>`;
            
            Object.entries(patrimonio).forEach(([cod, p]) => {
                html += `<tr><td>${cod} - ${p.nombre}</td><td class="valor">${formatearMoneda(p.saldo)}</td></tr>`;
                totalPatrimonio += p.saldo;
            });
            
            html += `<tr><td><strong>Utilidad del período</strong></td><td class="valor"><strong>${formatearMoneda(utilidad)}</strong></td></tr>`;
            totalPatrimonio += utilidad;
            
            tablaPasivos.innerHTML = `<tbody>${html}</tbody>`;
            
            const elTotalPasivos = document.getElementById('total-pasivos');
            const elTotalPatrimonio = document.getElementById('total-patrimonio');
            const elTotalPP = document.getElementById('total-pasivo-patrimonio');
            
            if (elTotalPasivos) elTotalPasivos.textContent = formatearMoneda(totalPasivos);
            if (elTotalPatrimonio) elTotalPatrimonio.textContent = formatearMoneda(totalPatrimonio);
            if (elTotalPP) elTotalPP.textContent = formatearMoneda(totalPasivos + totalPatrimonio);
        }
        
    } catch (error) {
        console.error('Error en balance general:', error);
    }
}

// ============================================
// BALANCE DE PRUEBA
// ============================================

async function cargarBalancePrueba() {
    try {
        const tbody = document.getElementById('balance-prueba-body');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Cargando...</td></tr>';
        
        const saldos = await calcularSaldosCuentas();
        
        let totalInicial = 0, totalDebitos = 0, totalCreditos = 0, totalFinal = 0;
        let filas = [];
        
        planCuentasCache.forEach(c => {
            if (!c.permite_movimiento) return;
            
            const s = saldos[c.id];
            if (!s) return;
            
            const debito = s.debito;
            const credito = s.credito;
            const saldoFinal = debito - credito;
            
            if (debito === 0 && credito === 0) return;
            
            totalDebitos += debito;
            totalCreditos += credito;
            totalFinal += saldoFinal;
            
            filas.push(`
                <tr>
                    <td>${c.codigo}</td>
                    <td>${escaparHTML(c.nombre)}</td>
                    <td class="monto-debito">$0</td>
                    <td class="monto-debito">${formatearMoneda(debito)}</td>
                    <td class="monto-credito">${formatearMoneda(credito)}</td>
                    <td class="monto-${saldoFinal >= 0 ? 'debito' : 'credito'}">${formatearMoneda(Math.abs(saldoFinal))}</td>
                </tr>
            `);
        });
        
        if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">No hay movimientos en el período</td></tr>';
            return;
        }
        
        tbody.innerHTML = filas.join('');
        
        // Actualizar totales
        const elTotalIni = document.getElementById('bp-total-inicial');
        const elTotalDeb = document.getElementById('bp-total-debitos');
        const elTotalCred = document.getElementById('bp-total-creditos');
        const elTotalFin = document.getElementById('bp-total-final');
        
        if (elTotalIni) elTotalIni.innerHTML = `<strong>${formatearMoneda(totalInicial)}</strong>`;
        if (elTotalDeb) elTotalDeb.innerHTML = `<strong>${formatearMoneda(totalDebitos)}</strong>`;
        if (elTotalCred) elTotalCred.innerHTML = `<strong>${formatearMoneda(totalCreditos)}</strong>`;
        if (elTotalFin) elTotalFin.innerHTML = `<strong>${formatearMoneda(totalFinal)}</strong>`;
        
    } catch (error) {
        console.error('Error en balance de prueba:', error);
    }
}

// ============================================
// EXPORTAR
// ============================================

async function exportarEstadoResultados() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        let csv = 'CONCEPTO,VALOR\n';
        let ingresos = 0, costoVentas = 0, gastosTotal = 0;
        
        planCuentasCache.forEach(c => {
            const s = saldos[c.id];
            if (!s) return;
            if (c.tipo === 'INGRESO') ingresos += (s.credito - s.debito);
            if (c.tipo === 'COSTO') costoVentas += (s.debito - s.credito);
            if (c.tipo === 'GASTO') gastosTotal += (s.debito - s.credito);
        });
        
        csv += `"Ventas Totales",${ingresos}\n`;
        csv += `"Costo de Ventas",${costoVentas}\n`;
        csv += `"Utilidad Bruta",${ingresos - costoVentas}\n`;
        csv += `"Gastos Operacionales",${gastosTotal}\n`;
        csv += `"Utilidad Neta",${ingresos - costoVentas - gastosTotal}\n`;
        
        descargarCSV(csv, `estado_resultados_${fechaInicio.toISOString().split('T')[0]}.csv`);
        mostrarToast('Estado de resultados exportado', 'success');
    } catch (error) {
        mostrarToast('Error al exportar: ' + error.message, 'error');
    }
}

async function exportarBalance() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        let csv = 'Código,Cuenta,Saldo\n';
        
        planCuentasCache.forEach(c => {
            if (!c.permite_movimiento) return;
            const s = saldos[c.id];
            if (!s) return;
            const saldo = s.debito - s.credito;
            if (saldo === 0) return;
            csv += `"${c.codigo}","${c.nombre}",${saldo}\n`;
        });
        
        descargarCSV(csv, `balance_${fechaInicio.toISOString().split('T')[0]}.csv`);
        mostrarToast('Balance exportado', 'success');
    } catch (error) {
        mostrarToast('Error al exportar: ' + error.message, 'error');
    }
}

async function exportarBalancePrueba() {
    try {
        const saldos = await calcularSaldosCuentas();
        
        let csv = 'Código,Cuenta,Saldo Inicial,Débitos,Créditos,Saldo Final\n';
        
        planCuentasCache.forEach(c => {
            if (!c.permite_movimiento) return;
            const s = saldos[c.id];
            if (!s) return;
            if (s.debito === 0 && s.credito === 0) return;
            csv += `"${c.codigo}","${c.nombre}",0,${s.debito},${s.credito},${s.debito - s.credito}\n`;
        });
        
        descargarCSV(csv, `balance_prueba_${fechaInicio.toISOString().split('T')[0]}.csv`);
        mostrarToast('Balance de prueba exportado', 'success');
    } catch (error) {
        mostrarToast('Error al exportar: ' + error.message, 'error');
    }
}

function exportarLibroDiario() {
    let csv = 'Comprobante,Fecha,Cuenta,Débito,Crédito\n';
    
    asientosCache.forEach(a => {
        (a.lineas || []).forEach(l => {
            csv += `"${a.numero || a.id}","${formatearFecha(a.fecha)}","${l.codigo} - ${l.nombre}",${l.debito},${l.credito}\n`;
        });
    });
    
    descargarCSV(csv, `libro_diario_${fechaInicio.toISOString().split('T')[0]}.csv`);
    mostrarToast('Libro diario exportado', 'success');
}

function exportarMayor() {
    const codigo = document.getElementById('select-cuenta-mayor')?.value;
    if (!codigo) {
        mostrarToast('Selecciona una cuenta', 'error');
        return;
    }
    
    const filas = document.querySelectorAll('.mayor-table tbody tr');
    let csv = 'Fecha,Comprobante,Concepto,Tercero,Débito,Crédito,Saldo\n';
    
    filas.forEach(tr => {
        const celdas = tr.querySelectorAll('td');
        if (celdas.length >= 7) {
            const vals = Array.from(celdas).map(td => `"${td.textContent.trim()}"`).join(',');
            csv += vals + '\n';
        }
    });
    
    descargarCSV(csv, `mayor_${codigo}.csv`);
    mostrarToast('Mayor exportado', 'success');
}

function exportarPlanCuentas() {
    let csv = 'Código,Nombre,Tipo,Naturaleza,Nivel,Permite Movimiento,Estado\n';
    
    planCuentasCache.forEach(c => {
        csv += `"${c.codigo}","${c.nombre}","${c.tipo}","${c.naturaleza}",${c.nivel},${c.permite_movimiento},"${c.estado || 'activa'}"\n`;
    });
    
    descargarCSV(csv, `plan_cuentas_${new Date().toISOString().split('T')[0]}.csv`);
    mostrarToast('Plan de cuentas exportado', 'success');
}

// ============================================
// HELPER DESCARGAR CSV
// ============================================

function descargarCSV(contenido, nombreArchivo) {
    const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// EXPORTAR
// ============================================

window.cargarEstadoResultados = cargarEstadoResultados;
window.cargarBalanceGeneral = cargarBalanceGeneral;
window.cargarBalancePrueba = cargarBalancePrueba;
window.exportarEstadoResultados = exportarEstadoResultados;
window.exportarBalance = exportarBalance;
window.exportarBalancePrueba = exportarBalancePrueba;
window.exportarLibroDiario = exportarLibroDiario;
window.exportarMayor = exportarMayor;
window.exportarPlanCuentas = exportarPlanCuentas;
window.descargarCSV = descargarCSV;

console.log('✅ reportes.js cargado');
