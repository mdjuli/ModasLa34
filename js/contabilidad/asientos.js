// ============================================
// ASIENTOS.JS - CRUD completo de asientos contables
// ============================================

let asientoEditandoId = null;
let asientoEditandoEstado = null;
let lineasNuevas = 0;
let lineasEditar = 0;

// ============================================
// CARGAR ASIENTOS GUARDADOS
// ============================================

async function cargarAsientosGuardados() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?order=fecha.desc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) return [];
        
        const asientos = await response.json();
        
        // Cargar líneas para cada asiento
        for (let as of asientos) {
            const lineasRes = await fetch(
                `${SUPABASE_URL}/rest/v1/lineas_asiento?asiento_id=eq.${as.id}&order=orden.asc`,
                { headers: { 'apikey': SUPABASE_KEY } }
            );
            as.lineas = await lineasRes.json();
        }
        
        return asientos;
        
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// ============================================
// CARGAR ASIENTOS (fusionando ventas/compras/gastos + guardados)
// ============================================

async function cargarAsientos() {
    try {
        const container = document.getElementById('asientos-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando asientos...</p>
                </div>
            `;
        }
        
        // Cargar asientos guardados (manuales)
        const asientosGuardados = await cargarAsientosGuardados();
        
        // Cargar transacciones de ventas, compras y gastos
        const [ventas, compras, gastos] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/ventas?fecha=gte.${fechaInicio.toISOString()}&fecha=lte.${fechaFin.toISOString()}&order=fecha.asc`, 
                { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
            fetch(`${SUPABASE_URL}/rest/v1/compras?fecha=gte.${fechaInicio.toISOString()}&fecha=lte.${fechaFin.toISOString()}&order=fecha.asc`, 
                { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json()),
            fetch(`${SUPABASE_URL}/rest/v1/gastos?fecha=gte.${fechaInicio.toISOString()}&fecha=lte.${fechaFin.toISOString()}&order=fecha.asc`, 
                { headers: { 'apikey': SUPABASE_KEY } }).then(r => r.json())
        ]);
        
        const asientos = [];
        
        // Asientos manuales (guardados en asientos_contables)
        asientosGuardados.forEach(a => {
            asientos.push({
                id: a.id,
                numero: a.numero,
                fecha: a.fecha,
                tipo: a.tipo,
                referencia: a.referencia,
                tercero: a.tercero,
                nota: a.concepto || a.nota,
                estado: a.estado,
                total: a.total_debito || 0,
                lineas: (a.lineas || []).map(l => ({
                    codigo: l.codigo_cuenta,
                    nombre: l.nombre_cuenta,
                    debito: parseFloat(l.debito) || 0,
                    credito: parseFloat(l.credito) || 0,
                    descripcion: l.descripcion
                })),
                origen: 'manual',
                _original: a
            });
        });
        
        // Asientos de ventas (no contabilizados como manuales)
        ventas.forEach(v => {
            const total = v.total || 0;
            asientos.push({
                id: `VTA-${v.id}`,
                numero: `VTA-${String(v.id).padStart(5, '0')}`,
                fecha: v.fecha,
                tipo: 'venta',
                referencia: `Venta #${v.id}`,
                tercero: v.cliente || 'Cliente general',
                nota: v.productos || 'Venta de productos',
                estado: 'automatico',
                total: total,
                lineas: [
                    { codigo: '110505', nombre: getNombreCuenta('110505'), debito: total, credito: 0 },
                    { codigo: '413505', nombre: getNombreCuenta('413505'), debito: 0, credito: total }
                ],
                origen: 'venta',
                origen_id: v.id
            });
        });
        
        // Asientos de compras
        compras.forEach(c => {
            const total = c.total || 0;
            const lineas = [
                { codigo: '620501', nombre: getNombreCuenta('620501'), debito: total, credito: 0 },
                { codigo: '143505', nombre: getNombreCuenta('143505'), debito: total, credito: 0 }
            ];
            if (c.estado === 'Pagada') {
                lineas.push({ codigo: '110505', nombre: getNombreCuenta('110505'), debito: 0, credito: total });
            } else {
                lineas.push({ codigo: '220505', nombre: getNombreCuenta('220505'), debito: 0, credito: total });
            }
            
            asientos.push({
                id: `COM-${c.id}`,
                numero: `COM-${String(c.id).padStart(5, '0')}`,
                fecha: c.fecha,
                tipo: 'compra',
                referencia: `Compra #${c.id}`,
                tercero: `Proveedor ID: ${c.proveedor_id}`,
                nota: c.producto || 'Compra de productos',
                estado: 'automatico',
                total: total,
                lineas: lineas,
                origen: 'compra',
                origen_id: c.id
            });
        });
        
        // Asientos de gastos
        gastos.forEach(g => {
            const monto = g.monto || 0;
            let codigoGasto = '519595';
            switch(g.categoria) {
                case 'Alquiler': codigoGasto = '511005'; break;
                case 'Servicios': codigoGasto = '511010'; break;
                case 'Sueldos': codigoGasto = '510506'; break;
                case 'Marketing': codigoGasto = '513505'; break;
            }
            
            asientos.push({
                id: `GAS-${g.id}`,
                numero: `GAS-${String(g.id).padStart(5, '0')}`,
                fecha: g.fecha,
                tipo: 'gasto',
                referencia: `Gasto #${g.id}`,
                tercero: '-',
                nota: g.concepto || 'Gasto operacional',
                estado: 'automatico',
                total: monto,
                lineas: [
                    { codigo: codigoGasto, nombre: getNombreCuenta(codigoGasto), debito: monto, credito: 0 },
                    { codigo: '110505', nombre: getNombreCuenta('110505'), debito: 0, credito: monto }
                ],
                origen: 'gasto',
                origen_id: g.id
            });
        });
        
        // Ordenar por fecha
        asientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        // Aplicar filtro de estado
        const filtroEstado = document.getElementById('filtro-estado-asientos')?.value;
        const asientosFiltrados = filtroEstado 
            ? asientos.filter(a => a.estado === filtroEstado)
            : asientos;
        
        asientosCache = asientosFiltrados;
        renderizarAsientos(asientosFiltrados);
        
    } catch (error) {
        console.error('Error cargando asientos:', error);
        const container = document.getElementById('asientos-container');
        if (container) {
            container.innerHTML = `<div class="empty-message" style="color: #f87171;">Error al cargar asientos</div>`;
        }
    }
}

// ============================================
// RENDERIZAR ASIENTOS
// ============================================

function renderizarAsientos(asientos) {
    const container = document.getElementById('asientos-container');
    const footer = document.getElementById('totales-footer');
    
    if (!container) return;
    
    if (!asientos || asientos.length === 0) {
        container.innerHTML = `<div class="empty-message">No hay asientos en el período seleccionado</div>`;
        if (footer) footer.style.display = 'none';
        return;
    }
    
    let totalDeb = 0, totalCred = 0;
    let html = '';
    
    asientos.forEach((a, idx) => {
        let debAs = 0, credAs = 0, lineasHtml = '';
        
        (a.lineas || []).forEach(l => {
            debAs += l.debito;
            credAs += l.credito;
            totalDeb += l.debito;
            totalCred += l.credito;
            
            lineasHtml += `
                <tr>
                    <td>
                        <strong>${l.codigo}</strong><br>
                        <small style="color: #a0a0b0;">${l.nombre}</small>
                    </td>
                    <td class="monto-debito">${l.debito > 0 ? formatearMoneda(l.debito) : '—'}</td>
                    <td class="monto-credito">${l.credito > 0 ? formatearMoneda(l.credito) : '—'}</td>
                </tr>
            `;
        });
        
        const tipoClass = a.tipo;
        const tipoIcon = {
            'venta': '💰', 'compra': '📦', 'gasto': '💸', 
            'manual': '✏️', 'ajuste': '🔧', 'apertura': '🚪', 'cierre': '🔐'
        }[a.tipo] || '📄';
        
        const estadoBadge = {
            'borrador': '<span class="asiento-estado estado-borrador">📝 Borrador</span>',
            'contabilizado': '<span class="asiento-estado estado-contabilizado">✅ Contabilizado</span>',
            'anulado': '<span class="asiento-estado estado-anulado">❌ Anulado</span>',
            'automatico': '<span class="asiento-estado estado-contabilizado">🔒 Auto</span>'
        }[a.estado] || '';
        
        // Botones según estado
        let botones = '';
        if (a.origen === 'manual') {
            if (a.estado === 'borrador') {
                botones = `
                    <button class="btn-accion btn-contabilizar" onclick="event.stopPropagation(); abrirModalContabilizar(${a.id})" title="Contabilizar">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="btn-accion btn-edit" onclick="event.stopPropagation(); abrirEditarAsiento(${a.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-accion btn-delete" onclick="event.stopPropagation(); eliminarAsiento(${a.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            } else if (a.estado === 'contabilizado') {
                botones = `
                    <button class="btn-accion" onclick="event.stopPropagation(); verAsiento(${a.id})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-accion btn-anular" onclick="event.stopPropagation(); abrirModalAnular(${a.id})" title="Anular">
                        <i class="fas fa-ban"></i>
                    </button>
                `;
            } else {
                botones = `
                    <button class="btn-accion" onclick="event.stopPropagation(); verAsiento(${a.id})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
            }
        } else {
            botones = `
                <button class="btn-accion" onclick="event.stopPropagation(); verAsiento('${a.id}')" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        }
        
        html += `
            <div class="asiento-group" data-asiento-id="${a.id}">
                <div class="asiento-header" onclick="toggleAsiento(this)">
                    <div class="asiento-header-left">
                        <span class="asiento-numero">${a.numero || a.id}</span>
                        <span class="asiento-fecha"><i class="far fa-calendar"></i> ${formatearFecha(a.fecha)}</span>
                        <span class="asiento-referencia">${escaparHTML(a.referencia || '')}</span>
                        <span class="asiento-tipo ${tipoClass}">${tipoIcon} ${a.tipo.toUpperCase()}</span>
                        ${estadoBadge}
                    </div>
                    <div class="asiento-header-right">
                        <span class="asiento-total">${formatearMoneda(a.total)}</span>
                        <div class="asiento-actions">${botones}</div>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                </div>
                <div class="asiento-body collapsed">
                    <table class="asientos-table">
                        <thead>
                            <tr>
                                <th>Cuenta</th>
                                <th style="text-align: right;">Débito</th>
                                <th style="text-align: right;">Crédito</th>
                            </tr>
                        </thead>
                        <tbody>${lineasHtml}</tbody>
                        <tfoot>
                            <tr style="background: rgba(212,165,169,0.05);">
                                <td style="font-weight: bold;">TOTALES</td>
                                <td class="monto-debito"><strong>${formatearMoneda(debAs)}</strong></td>
                                <td class="monto-credito"><strong>${formatearMoneda(credAs)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                    ${a.tercero || a.nota ? `
                        <div style="padding: 0.8rem 1.2rem; background: rgba(0,0,0,0.15); font-size: 0.8rem; color: #a0a0b0;">
                            ${a.tercero ? `<strong>Tercero:</strong> ${escaparHTML(a.tercero)}` : ''}
                            ${a.nota ? ` · <strong>Concepto:</strong> ${escaparHTML(a.nota)}` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Actualizar footer
    const totalDebEl = document.getElementById('total-debitos');
    const totalCredEl = document.getElementById('total-creditos');
    const estadoCuadreEl = document.getElementById('estado-cuadre');
    
    if (totalDebEl) totalDebEl.textContent = formatearMoneda(totalDeb);
    if (totalCredEl) totalCredEl.textContent = formatearMoneda(totalCred);
    
    if (estadoCuadreEl) {
        const cuadrado = Math.abs(totalDeb - totalCred) < 0.01;
        estadoCuadreEl.textContent = cuadrado ? '✅ CUADRADO' : '❌ DESCUADRADO';
        estadoCuadreEl.className = 'estado-cuadre ' + (cuadrado ? 'cuadrado' : 'descuadrado');
    }
    
    if (footer) footer.style.display = 'flex';
}

function toggleAsiento(header) {
    const body = header.nextElementSibling;
    const icon = header.querySelector('.collapse-icon');
    if (body) body.classList.toggle('collapsed');
    if (icon) icon.classList.toggle('rotated');
}

// ============================================
// NUEVO ASIENTO
// ============================================

function abrirNuevoAsiento() {
    // Resetear el formulario
    document.getElementById('nuevo-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('nuevo-tipo').value = 'manual';
    document.getElementById('nuevo-concepto').value = '';
    document.getElementById('nuevo-referencia').value = '';
    document.getElementById('nuevo-tercero').value = '';
    
    // Limpiar líneas
    const body = document.getElementById('nuevo-lineas-body');
    if (body) body.innerHTML = '';
    lineasNuevas = 0;
    
    // Agregar 2 líneas por defecto
    agregarLineaNuevo();
    agregarLineaNuevo();
    
    // Abrir modal
    const modal = document.getElementById('modal-nuevo-asiento');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function cerrarNuevoAsiento() {
    const modal = document.getElementById('modal-nuevo-asiento');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function agregarLineaNuevo() {
    const tbody = document.getElementById('nuevo-lineas-body');
    if (!tbody) return;
    
    const idx = lineasNuevas++;
    
    const cuentas = (window.cuentasParaMovimiento || []).map(c => 
        `<option value="${c.id}" data-codigo="${c.codigo}" data-nombre="${c.nombre}">${c.codigo} - ${c.nombre}</option>`
    ).join('');
    
    const tr = document.createElement('tr');
    tr.setAttribute('data-linea-idx', idx);
    tr.innerHTML = `
        <td>
            <select class="linea-cuenta-nuevo" data-idx="${idx}" onchange="actualizarTotalesNuevo()">
                <option value="">Seleccionar cuenta...</option>
                ${cuentas}
            </select>
        </td>
        <td>
            <input type="text" class="linea-descripcion-nuevo" data-idx="${idx}" placeholder="Descripción">
        </td>
        <td>
            <input type="number" class="linea-debito-nuevo" data-idx="${idx}" value="" min="0" step="0.01" 
                   placeholder="0" oninput="actualizarTotalesNuevo()">
        </td>
        <td>
            <input type="number" class="linea-credito-nuevo" data-idx="${idx}" value="" min="0" step="0.01" 
                   placeholder="0" oninput="actualizarTotalesNuevo()">
        </td>
        <td>
            <button type="button" class="btn-eliminar-linea" onclick="eliminarLineaNuevo(${idx})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    actualizarTotalesNuevo();
}

function eliminarLineaNuevo(idx) {
    const tr = document.querySelector(`#nuevo-lineas-body tr[data-linea-idx="${idx}"]`);
    if (tr) tr.remove();
    actualizarTotalesNuevo();
}

function actualizarTotalesNuevo() {
    let totalDebito = 0, totalCredito = 0;
    
    document.querySelectorAll('#nuevo-lineas-body tr').forEach(tr => {
        const deb = parseFloat(tr.querySelector('.linea-debito-nuevo')?.value) || 0;
        const cred = parseFloat(tr.querySelector('.linea-credito-nuevo')?.value) || 0;
        totalDebito += deb;
        totalCredito += cred;
    });
    
    const elDeb = document.getElementById('nuevo-total-debito');
    const elCred = document.getElementById('nuevo-total-credito');
    const elEstado = document.getElementById('nuevo-estado-cuadre');
    
    if (elDeb) elDeb.textContent = formatearMoneda(totalDebito);
    if (elCred) elCred.textContent = formatearMoneda(totalCredito);
    
    if (elEstado) {
        const cuadrado = Math.abs(totalDebito - totalCredito) < 0.01 && totalDebito > 0;
        elEstado.innerHTML = cuadrado 
            ? '<span class="estado-cuadre cuadrado">✅ CUADRADO</span>' 
            : '<span class="estado-cuadre descuadrado">❌ DESCUADRADO</span>';
    }
}

async function guardarNuevoAsiento(event, estadoDestino = 'contabilizado') {
    if (event) event.preventDefault();
    
    try {
        // Recopilar líneas
        const lineas = [];
        document.querySelectorAll('#nuevo-lineas-body tr').forEach(tr => {
            const selectCuenta = tr.querySelector('.linea-cuenta-nuevo');
            const descripcion = tr.querySelector('.linea-descripcion-nuevo')?.value.trim() || null;
            const debito = parseFloat(tr.querySelector('.linea-debito-nuevo')?.value) || 0;
            const credito = parseFloat(tr.querySelector('.linea-credito-nuevo')?.value) || 0;
            
            if (selectCuenta && selectCuenta.value && (debito > 0 || credito > 0)) {
                const opt = selectCuenta.options[selectCuenta.selectedIndex];
                lineas.push({
                    cuenta_id: parseInt(selectCuenta.value),
                    codigo_cuenta: opt.dataset.codigo,
                    nombre_cuenta: opt.dataset.nombre,
                    debito: debito,
                    credito: credito,
                    descripcion: descripcion,
                    orden: lineas.length
                });
            }
        });
        
        // Validaciones
        if (lineas.length < 2) {
            mostrarToast('Debes agregar al menos 2 líneas', 'error');
            return;
        }
        
        const totalDebito = lineas.reduce((s, l) => s + l.debito, 0);
        const totalCredito = lineas.reduce((s, l) => s + l.credito, 0);
        
        if (Math.abs(totalDebito - totalCredito) >= 0.01) {
            mostrarToast(`El asiento no está cuadrado. Diferencia: ${formatearMoneda(totalDebito - totalCredito)}`, 'error');
            return;
        }
        
        if (totalDebito === 0) {
            mostrarToast('El asiento no tiene movimientos', 'error');
            return;
        }
        
        // Validar que no haya línea con débito y crédito
        for (const l of lineas) {
            if (l.debito > 0 && l.credito > 0) {
                mostrarToast('Una línea no puede tener débito y crédito simultáneamente', 'error');
                return;
            }
        }
        
        // Datos del asiento
        const fecha = document.getElementById('nuevo-fecha').value;
        const tipo = document.getElementById('nuevo-tipo').value;
        const concepto = document.getElementById('nuevo-concepto').value.trim();
        const referencia = document.getElementById('nuevo-referencia').value.trim() || null;
        const tercero = document.getElementById('nuevo-tercero').value.trim() || null;
        
        if (!fecha || !concepto) {
            mostrarToast('Fecha y concepto son obligatorios', 'error');
            return;
        }
        
        const asientoData = {
            numero: null, // Se genera con trigger
            tipo: tipo,
            fecha: fecha,
            concepto: concepto,
            referencia: referencia,
            tercero: tercero,
            estado: estadoDestino,
            total_debito: totalDebito,
            total_credito: totalCredito,
            created_by: obtenerUserId()
        };
        
        // Insertar asiento
        const response = await fetch(`${SUPABASE_URL}/rest/v1/asientos_contables`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${obtenerToken()}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(asientoData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar el asiento');
        }
        
        const [asientoCreado] = await response.json();
        
        // Insertar líneas
        for (const linea of lineas) {
            await fetch(`${SUPABASE_URL}/rest/v1/lineas_asiento`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asiento_id: asientoCreado.id,
                    ...linea
                })
            });
        }
        
        mostrarToast(
            estadoDestino === 'borrador' 
                ? `Borrador guardado (${asientoCreado.numero})` 
                : `Asiento contabilizado (${asientoCreado.numero})`, 
            'success'
        );
        
        cerrarNuevoAsiento();
        await cargarAsientos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al guardar: ' + error.message, 'error');
    }
}

// ============================================
// EDITAR ASIENTO
// ============================================

async function abrirEditarAsiento(id) {
    try {
        asientoEditandoId = id;
        
        // Cargar asiento
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Error al cargar el asiento');
        
        const [asiento] = await response.json();
        if (!asiento) throw new Error('Asiento no encontrado');
        
        asientoEditandoEstado = asiento.estado;
        
        // Verificar que se pueda editar
        if (asiento.estado === 'contabilizado') {
            mostrarToast('Los asientos contabilizados no se pueden editar directamente. Usa "Anular" para corregirlo.', 'warning');
            return;
        }
        
        if (asiento.estado === 'anulado') {
            mostrarToast('Los asientos anulados no se pueden editar', 'error');
            return;
        }
        
        // Cargar líneas
        const lineasRes = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?asiento_id=eq.${id}&order=orden.asc`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const lineas = await lineasRes.json();
        
        // Llenar formulario
        document.getElementById('editar-asiento-id').value = asiento.id;
        document.getElementById('editar-fecha').value = asiento.fecha.split('T')[0];
        document.getElementById('editar-tipo').value = asiento.tipo;
        document.getElementById('editar-concepto').value = asiento.concepto || '';
        document.getElementById('editar-referencia').value = asiento.referencia || '';
        document.getElementById('editar-tercero').value = asiento.tercero || '';
        
        // Badge info
        const infoBadge = document.getElementById('editar-asiento-info');
        if (infoBadge) {
            infoBadge.innerHTML = `
                <strong>Número:</strong> ${asiento.numero}<br>
                <strong>Estado:</strong> ${asiento.estado === 'borrador' ? '📝 Borrador' : '✅ Contabilizado'}
            `;
        }
        
        // Título del modal
        document.getElementById('modal-asiento-title').textContent = `✏️ Editar: ${asiento.numero}`;
        
        // Cargar líneas
        const tbody = document.getElementById('editar-lineas-body');
        if (tbody) tbody.innerHTML = '';
        lineasEditar = 0;
        
        lineas.forEach(l => {
            agregarLineaEditar(l);
        });
        
        // Abrir modal
        const modal = document.getElementById('modal-editar-asiento');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

function cerrarModalAsiento() {
    const modal = document.getElementById('modal-editar-asiento');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    asientoEditandoId = null;
    asientoEditandoEstado = null;
}

function agregarLineaEditar(lineaExistente = null) {
    const tbody = document.getElementById('editar-lineas-body');
    if (!tbody) return;
    
    const idx = lineasEditar++;
    
    const cuentas = (window.cuentasParaMovimiento || []).map(c => {
        const selected = lineaExistente && lineaExistente.cuenta_id === c.id ? 'selected' : '';
        return `<option value="${c.id}" data-codigo="${c.codigo}" data-nombre="${c.nombre}" ${selected}>${c.codigo} - ${c.nombre}</option>`;
    }).join('');
    
    const tr = document.createElement('tr');
    tr.setAttribute('data-linea-idx', idx);
    tr.innerHTML = `
        <td>
            <select class="linea-cuenta-editar" data-idx="${idx}" onchange="actualizarTotalesEditar()">
                <option value="">Seleccionar cuenta...</option>
                ${cuentas}
            </select>
        </td>
        <td>
            <input type="text" class="linea-descripcion-editar" data-idx="${idx}" 
                   value="${lineaExistente?.descripcion || ''}" placeholder="Descripción">
        </td>
        <td>
            <input type="number" class="linea-debito-editar" data-idx="${idx}" 
                   value="${lineaExistente?.debito || ''}" min="0" step="0.01" 
                   placeholder="0" oninput="actualizarTotalesEditar()">
        </td>
        <td>
            <input type="number" class="linea-credito-editar" data-idx="${idx}" 
                   value="${lineaExistente?.credito || ''}" min="0" step="0.01" 
                   placeholder="0" oninput="actualizarTotalesEditar()">
        </td>
        <td>
            <button type="button" class="btn-eliminar-linea" onclick="eliminarLineaEditar(${idx})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    actualizarTotalesEditar();
}

function eliminarLineaEditar(idx) {
    const tr = document.querySelector(`#editar-lineas-body tr[data-linea-idx="${idx}"]`);
    if (tr) tr.remove();
    actualizarTotalesEditar();
}

function actualizarTotalesEditar() {
    let totalDebito = 0, totalCredito = 0;
    
    document.querySelectorAll('#editar-lineas-body tr').forEach(tr => {
        totalDebito += parseFloat(tr.querySelector('.linea-debito-editar')?.value) || 0;
        totalCredito += parseFloat(tr.querySelector('.linea-credito-editar')?.value) || 0;
    });
    
    const elDeb = document.getElementById('editar-total-debito');
    const elCred = document.getElementById('editar-total-credito');
    const elEstado = document.getElementById('editar-estado-cuadre');
    
    if (elDeb) elDeb.textContent = formatearMoneda(totalDebito);
    if (elCred) elCred.textContent = formatearMoneda(totalCredito);
    
    if (elEstado) {
        const cuadrado = Math.abs(totalDebito - totalCredito) < 0.01 && totalDebito > 0;
        elEstado.innerHTML = cuadrado 
            ? '<span class="estado-cuadre cuadrado">✅ CUADRADO</span>' 
            : '<span class="estado-cuadre descuadrado">❌ DESCUADRADO</span>';
    }
}

async function guardarEdicionAsiento(event) {
    if (event) event.preventDefault();
    
    try {
        if (!asientoEditandoId) {
            mostrarToast('No hay asiento seleccionado', 'error');
            return;
        }
        
        // Recopilar líneas
        const lineas = [];
        document.querySelectorAll('#editar-lineas-body tr').forEach(tr => {
            const selectCuenta = tr.querySelector('.linea-cuenta-editar');
            const descripcion = tr.querySelector('.linea-descripcion-editar')?.value.trim() || null;
            const debito = parseFloat(tr.querySelector('.linea-debito-editar')?.value) || 0;
            const credito = parseFloat(tr.querySelector('.linea-credito-editar')?.value) || 0;
            
            if (selectCuenta && selectCuenta.value && (debito > 0 || credito > 0)) {
                const opt = selectCuenta.options[selectCuenta.selectedIndex];
                lineas.push({
                    cuenta_id: parseInt(selectCuenta.value),
                    codigo_cuenta: opt.dataset.codigo,
                    nombre_cuenta: opt.dataset.nombre,
                    debito: debito,
                    credito: credito,
                    descripcion: descripcion,
                    orden: lineas.length
                });
            }
        });
        
        if (lineas.length < 2) {
            mostrarToast('Debes tener al menos 2 líneas', 'error');
            return;
        }
        
        const totalDebito = lineas.reduce((s, l) => s + l.debito, 0);
        const totalCredito = lineas.reduce((s, l) => s + l.credito, 0);
        
        if (Math.abs(totalDebito - totalCredito) >= 0.01) {
            mostrarToast(`No cuadra. Diferencia: ${formatearMoneda(totalDebito - totalCredito)}`, 'error');
            return;
        }
        
        // Actualizar asiento
        const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${asientoEditandoId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fecha: document.getElementById('editar-fecha').value,
                    concepto: document.getElementById('editar-concepto').value.trim(),
                    referencia: document.getElementById('editar-referencia').value.trim() || null,
                    tercero: document.getElementById('editar-tercero').value.trim() || null,
                    total_debito: totalDebito,
                    total_credito: totalCredito
                })
            }
        );
        
        if (!updateResponse.ok) throw new Error('Error al actualizar asiento');
        
        // Eliminar líneas antiguas
        await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?asiento_id=eq.${asientoEditandoId}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        // Insertar nuevas líneas
        for (const linea of lineas) {
            await fetch(`${SUPABASE_URL}/rest/v1/lineas_asiento`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asiento_id: asientoEditandoId,
                    ...linea
                })
            });
        }
        
        mostrarToast('Asiento actualizado correctamente', 'success');
        cerrarModalAsiento();
        await cargarAsientos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al guardar: ' + error.message, 'error');
    }
}

// ============================================
// CONTABILIZAR ASIENTO
// ============================================

async function abrirModalContabilizar(id) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        const [asiento] = await response.json();
        if (!asiento) throw new Error('Asiento no encontrado');
        
        document.getElementById('contabilizar-asiento-id').value = id;
        
        const resumen = document.getElementById('contabilizar-resumen');
        if (resumen) {
            resumen.innerHTML = `
                <p><span>Número:</span> <strong>${asiento.numero}</strong></p>
                <p><span>Fecha:</span> <strong>${formatearFecha(asiento.fecha)}</strong></p>
                <p><span>Concepto:</span> <strong>${escaparHTML(asiento.concepto)}</strong></p>
                <p><span>Total Débito:</span> <strong class="monto-debito">${formatearMoneda(asiento.total_debito)}</strong></p>
                <p><span>Total Crédito:</span> <strong class="monto-credito">${formatearMoneda(asiento.total_credito)}</strong></p>
            `;
        }
        
        const modal = document.getElementById('modal-contabilizar');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

function cerrarModalContabilizar() {
    const modal = document.getElementById('modal-contabilizar');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

async function confirmarContabilizar() {
    try {
        const id = document.getElementById('contabilizar-asiento-id').value;
        if (!id) return;
        
        // Llamar a la función de Supabase
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/contabilizar_asiento`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_asiento_id: parseInt(id) })
            }
        );
        
        const resultado = await response.json();
        
        if (resultado.error) {
            mostrarToast(resultado.error, 'error');
            return;
        }
        
        mostrarToast('Asiento contabilizado correctamente', 'success');
        cerrarModalContabilizar();
        await cargarAsientos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// ANULAR ASIENTO
// ============================================

async function abrirModalAnular(id) {
    document.getElementById('anular-asiento-id').value = id;
    document.getElementById('motivo-anulacion').value = '';
    
    const modal = document.getElementById('modal-anular');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function cerrarModalAnular() {
    const modal = document.getElementById('modal-anular');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

async function confirmarAnular() {
    try {
        const id = document.getElementById('anular-asiento-id').value;
        const motivo = document.getElementById('motivo-anulacion').value.trim();
        
        if (!motivo) {
            mostrarToast('El motivo es obligatorio', 'error');
            return;
        }
        
        if (!id) return;
        
        // Cargar asiento original
        const asientoRes = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const [asientoOriginal] = await asientoRes.json();
        
        // Cargar líneas del original
        const lineasRes = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?asiento_id=eq.${id}`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const lineasOriginales = await lineasRes.json();
        
        // Crear asiento de reversión (débito ↔ crédito)
        const reversoResponse = await fetch(`${SUPABASE_URL}/rest/v1/asientos_contables`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${obtenerToken()}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                tipo: 'ajuste',
                fecha: new Date().toISOString().split('T')[0],
                concepto: `REVERSIÓN: ${asientoOriginal.concepto} - Motivo: ${motivo}`,
                referencia: `REV-${asientoOriginal.numero}`,
                tercero: asientoOriginal.tercero,
                estado: 'contabilizado',
                total_debito: asientoOriginal.total_credito,
                total_credito: asientoOriginal.total_debito
            })
        });
        
        const [asientoReverso] = await reversoResponse.json();
        
        // Insertar líneas invertidas
        for (const linea of lineasOriginales) {
            await fetch(`${SUPABASE_URL}/rest/v1/lineas_asiento`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asiento_id: asientoReverso.id,
                    cuenta_id: linea.cuenta_id,
                    codigo_cuenta: linea.codigo_cuenta,
                    nombre_cuenta: linea.nombre_cuenta,
                    debito: linea.credito,  // Invertido
                    credito: linea.debito,  // Invertido
                    descripcion: `Reversión: ${linea.descripcion || ''}`,
                    orden: linea.orden
                })
            });
        }
        
        // Marcar original como anulado
        await fetch(`${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${obtenerToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estado: 'anulado',
                anulado_at: new Date().toISOString(),
                asiento_reverso_id: asientoReverso.id
            })
        });
        
        mostrarToast('Asiento anulado. Se creó el reverso: ' + asientoReverso.numero, 'success');
        cerrarModalAnular();
        await cargarAsientos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al anular: ' + error.message, 'error');
    }
}

// ============================================
// ELIMINAR ASIENTO
// ============================================

async function eliminarAsiento(id) {
    if (!confirm('¿Estás seguro de eliminar este asiento? Solo se pueden eliminar borradores.')) return;
    
    try {
        // Verificar estado
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}&select=estado`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const [asiento] = await response.json();
        
        if (asiento.estado !== 'borrador') {
            mostrarToast('Solo se pueden eliminar asientos en borrador', 'error');
            return;
        }
        
        // Eliminar (las líneas se eliminan por CASCADE)
        await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${obtenerToken()}`
                }
            }
        );
        
        mostrarToast('Asiento eliminado', 'success');
        await cargarAsientos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

function eliminarAsientoDesdeModal() {
    if (!asientoEditandoId) return;
    const id = asientoEditandoId;
    cerrarModalAsiento();
    eliminarAsiento(id);
}

// ============================================
// VER ASIENTO
// ============================================

async function verAsiento(id) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/asientos_contables?id=eq.${id}`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const [asiento] = await response.json();
        
        const lineasRes = await fetch(
            `${SUPABASE_URL}/rest/v1/lineas_asiento?asiento_id=eq.${id}&order=orden.asc`,
            { headers: { 'apikey': SUPABASE_KEY } }
        );
        const lineas = await lineasRes.json();
        
        const body = document.getElementById('ver-asiento-body');
        if (!body) return;
        
        let lineasHTML = lineas.map(l => `
            <tr>
                <td>${l.codigo_cuenta} - ${l.nombre_cuenta}</td>
                <td class="monto-debito">${l.debito > 0 ? formatearMoneda(l.debito) : '—'}</td>
                <td class="monto-credito">${l.credito > 0 ? formatearMoneda(l.credito) : '—'}</td>
            </tr>
        `).join('');
        
        body.innerHTML = `
            <div style="padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 1rem;">
                <p><strong>Número:</strong> ${asiento.numero}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(asiento.fecha)}</p>
                <p><strong>Concepto:</strong> ${escaparHTML(asiento.concepto)}</p>
                <p><strong>Tercero:</strong> ${escaparHTML(asiento.tercero || '-')}</p>
                <p><strong>Referencia:</strong> ${escaparHTML(asiento.referencia || '-')}</p>
            </div>
            <table class="asientos-table">
                <thead>
                    <tr><th>Cuenta</th><th style="text-align:right;">Débito</th><th style="text-align:right;">Crédito</th></tr>
                </thead>
                <tbody>${lineasHTML}</tbody>
                <tfoot>
                    <tr style="background: rgba(212,165,169,0.1); font-weight: bold;">
                        <td>TOTALES</td>
                        <td class="monto-debito">${formatearMoneda(asiento.total_debito)}</td>
                        <td class="monto-credito">${formatearMoneda(asiento.total_credito)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        const modal = document.getElementById('modal-ver-asiento');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error: ' + error.message, 'error');
    }
}

function cerrarVerAsiento() {
    const modal = document.getElementById('modal-ver-asiento');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ============================================
// HELPERS
// ============================================

function obtenerUserId() {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.id;
        } catch (e) { return null; }
    }
    return null;
}

function getNombreCuenta(codigo) {
    if (typeof planCuentasCache === 'undefined') return codigo;
    const cuenta = planCuentasCache.find(c => c.codigo === codigo);
    return cuenta ? cuenta.nombre : codigo;
}

async function sincronizarAsientos() {
    mostrarToast('Sincronizando asientos...', 'info');
    await cargarAsientos();
}

// ============================================
// EXPORTAR
// ============================================

window.abrirNuevoAsiento = abrirNuevoAsiento;
window.cerrarNuevoAsiento = cerrarNuevoAsiento;
window.agregarLineaNuevo = agregarLineaNuevo;
window.eliminarLineaNuevo = eliminarLineaNuevo;
window.actualizarTotalesNuevo = actualizarTotalesNuevo;
window.guardarNuevoAsiento = guardarNuevoAsiento;
window.abrirEditarAsiento = abrirEditarAsiento;
window.cerrarModalAsiento = cerrarModalAsiento;
window.agregarLineaEditar = agregarLineaEditar;
window.eliminarLineaEditar = eliminarLineaEditar;
window.actualizarTotalesEditar = actualizarTotalesEditar;
window.guardarEdicionAsiento = guardarEdicionAsiento;
window.abrirModalContabilizar = abrirModalContabilizar;
window.cerrarModalContabilizar = cerrarModalContabilizar;
window.confirmarContabilizar = confirmarContabilizar;
window.abrirModalAnular = abrirModalAnular;
window.cerrarModalAnular = cerrarModalAnular;
window.confirmarAnular = confirmarAnular;
window.eliminarAsiento = eliminarAsiento;
window.eliminarAsientoDesdeModal = eliminarAsientoDesdeModal;
window.verAsiento = verAsiento;
window.cerrarVerAsiento = cerrarVerAsiento;
window.cargarAsientos = cargarAsientos;
window.cargarAsientosGuardados = cargarAsientosGuardados;
window.sincronizarAsientos = sincronizarAsientos;
window.toggleAsiento = toggleAsiento;
window.renderizarAsientos = renderizarAsientos;

console.log('✅ asientos.js cargado');
