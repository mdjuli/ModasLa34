// ============================================
// CLIENTES.JS — Módulo de clientes
// Documentos colombianos: CC, NIT, CE, TI, PP
// ============================================

let clientesData = [];
let clientesFiltrados = [];
let clienteEditandoId = null;

const $c = id => document.getElementById(id);
const fmtC = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const escC = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getTokenSafe(){
  try { return JSON.parse(localStorage.getItem('admin_token')); } catch { return null; }
}

function alertaCliente(msg, tipo='info'){
  if (typeof mostrarToast === 'function') {
    const titulo = tipo === 'error' ? 'Error' : tipo === 'success' ? 'Listo' : 'Aviso';
    mostrarToast(tipo, titulo, msg);
  } else {
    alert(msg);
  }
}

// ============ VALIDACIÓN DOCUMENTOS COLOMBIANOS ============
function validarDocumento(tipo, numero){
  const num = String(numero || '').replace(/[.\s-]/g, '');
  if (!num) return { ok: false, msg: 'El documento no puede estar vacío.' };

  switch (tipo){
    case 'CC':
      if (!/^\d{6,10}$/.test(num)) return { ok: false, msg: 'La CC debe tener entre 6 y 10 dígitos.' };
      return { ok: true, msg: `✓ CC válida (${num.length} dígitos)` };

    case 'TI':
      if (!/^\d{10,11}$/.test(num)) return { ok: false, msg: 'La TI debe tener 10 u 11 dígitos.' };
      return { ok: true, msg: '✓ TI válida' };

    case 'CE':
      if (!/^\d{6,12}$/.test(num)) return { ok: false, msg: 'La CE debe tener entre 6 y 12 dígitos.' };
      return { ok: true, msg: '✓ CE válida' };

    case 'NIT': {
      const limpio = num.replace(/-/g, '');
      if (!/^\d{9,10}$/.test(limpio)) return { ok: false, msg: 'El NIT debe tener 9 dígitos + DV.' };
      if (limpio.length === 10){
        const base = limpio.slice(0, 9);
        const dv = parseInt(limpio.slice(9), 10);
        const dvCalc = calcularDVNit(base);
        if (dv !== dvCalc) return { ok: false, msg: `DV incorrecto. Debería ser ${dvCalc}.` };
        return { ok: true, msg: `✓ NIT válido (DV ${dv})` };
      }
      return { ok: true, msg: `✓ NIT válido (sin DV, se sugiere ${calcularDVNit(limpio)})` };
    }

    case 'PP':
      if (!/^[A-Z0-9]{5,15}$/i.test(num)) return { ok: false, msg: 'Pasaporte: 5-15 caracteres alfanuméricos.' };
      return { ok: true, msg: '✓ Pasaporte válido' };

    default:
      return { ok: true, msg: '' };
  }
}

// Algoritmo oficial DV del NIT (DIAN)
function calcularDVNit(nit){
  const primos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digits = String(nit).padStart(9, '0').split('').reverse();
  let suma = 0;
  for (let i = 0; i < digits.length; i++){
    suma += parseInt(digits[i], 10) * primos[i];
  }
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

function actualizarValidacionDoc(){
  const tipo = $c('cliente-tipo-doc').value;
  const input = $c('cliente-documento');
  const hint = $c('cliente-doc-hint');
  const placeholders = {
    CC: 'Ej: 1020304050', NIT: 'Ej: 900123456-7', CE: 'Ej: 123456',
    TI: 'Ej: 1020304050', PP: 'Ej: AB123456'
  };
  input.placeholder = placeholders[tipo] || '';
  hint.textContent = 'Sin puntos ni guiones.';
  hint.className = 'doc-hint';
  validarDocumentoInput();
}

function validarDocumentoInput(){
  const tipo = $c('cliente-tipo-doc').value;
  const num = $c('cliente-documento').value.trim();
  const hint = $c('cliente-doc-hint');
  if (!num){ hint.textContent = 'Sin puntos ni guiones.'; hint.className = 'doc-hint'; return; }
  const r = validarDocumento(tipo, num);
  hint.textContent = r.msg;
  hint.className = 'doc-hint ' + (r.ok ? 'ok' : 'error');
}

// ============ CARGA ============
async function cargarClientes(){
  const tbody = $c('clientes-body');
  if (!tbody) return;

  try {
    const token = getTokenSafe();
    const headers = { 'apikey': SUPABASE_KEY };
    if (token?.access_token) headers['Authorization'] = `Bearer ${token.access_token}`;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clientes?order=created_at.desc&limit=1000`,
      { headers }
    );

    if (!res.ok){
      if (res.status === 404 || res.status === 400){
        tbody.innerHTML = `
          <tr><td colspan="9" class="empty-state">
            <h3>Tabla "clientes" no encontrada</h3>
            <p class="nota">Crea la tabla en Supabase con columnas: id, tipo_doc, documento, nombre, telefono, email, ciudad, direccion, notas, created_at</p>
          </td></tr>`;
        return;
      }
      throw new Error('HTTP ' + res.status);
    }

    clientesData = await res.json();

    // Traer ventas para historial
    const ventasRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ventas?select=id,fecha,total,cliente,metodo_pago,estado,productos&limit=2000`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    const ventas = ventasRes.ok ? await ventasRes.json() : [];

    // Enriquecer cada cliente
    clientesData = clientesData.map(c => {
      const nombreLower = String(c.nombre || '').trim().toLowerCase();
      const docStr = String(c.documento || '').trim();
      const ventasCliente = ventas.filter(v => {
        const cv = String(v.cliente || '').trim().toLowerCase();
        return cv === nombreLower || cv === docStr || cv === `${nombreLower} (${docStr})`;
      });
      const total = ventasCliente.reduce((s, v) => s + (v.total || 0), 0);
      const fechas = ventasCliente.map(v => new Date(v.fecha)).filter(d => !isNaN(d));
      const ultima = fechas.length ? new Date(Math.max(...fechas)) : null;
      return { ...c, _ventas: ventasCliente, _count: ventasCliente.length, _total: total, _ultima: ultima };
    });

    actualizarStatsClientes();
    aplicarFiltrosClientes();

    const badge = $c('nav-badge-clientes');
    if (badge){
      badge.textContent = clientesData.length;
      badge.classList.toggle('cero', clientesData.length === 0);
    }
  } catch(error){
    console.error('Error clientes:', error);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--err);">Error al cargar clientes</td></tr>';
    alertaCliente('No se pudieron cargar los clientes', 'error');
  }
}

function actualizarStatsClientes(){
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const nuevos = clientesData.filter(c => {
    const f = new Date(c.created_at);
    return !isNaN(f) && f >= inicioMes;
  }).length;

  const conCompras = clientesData.filter(c => c._count > 0);
  const totalVentas = conCompras.reduce((s, c) => s + c._count, 0);
  const totalMonto = conCompras.reduce((s, c) => s + c._total, 0);
  const ticketProm = totalVentas > 0 ? Math.round(totalMonto / totalVentas) : 0;

  if ($c('clientes-total')) $c('clientes-total').textContent = clientesData.length;
  if ($c('clientes-nuevos-mes')) $c('clientes-nuevos-mes').textContent = nuevos;
  if ($c('clientes-con-compras')) $c('clientes-con-compras').textContent = conCompras.length;
  if ($c('clientes-ticket-promedio')) $c('clientes-ticket-promedio').textContent = fmtC(ticketProm);
}

// ============ RENDER ============
function mostrarTablaClientes(lista){
  const tbody = $c('clientes-body');
  if (!tbody) return;
  clientesFiltrados = lista || [];

  if (!lista || lista.length === 0){
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><h3>Sin clientes</h3><p class="nota">Registra tu primer cliente con el botón de arriba.</p></td></tr>';
    if ($c('clientes-contador')) $c('clientes-contador').textContent = '0';
    return;
  }

  if ($c('clientes-contador')) $c('clientes-contador').textContent = lista.length;

  tbody.innerHTML = lista.map(c => {
    const docMostrar = c.documento
      ? `<span class="cliente-tipo-doc">${escC(c.tipo_doc || 'CC')}</span><span class="cliente-doc">${escC(c.documento)}</span>`
      : '—';
    const ultimaStr = c._ultima
      ? c._ultima.toLocaleDateString('es-CO')
      : '<span style="color:var(--tx3)">—</span>';
    const badgeCompras = c._count > 0
      ? `<span class="estado-badge estado-completada">${c._count} compra${c._count > 1 ? 's' : ''}</span>`
      : '<span class="estado-badge estado-pendiente">Sin compras</span>';

    return `
      <tr>
        <td>${docMostrar}</td>
        <td>${escC(c.nombre || '—')}</td>
        <td>${escC(c.telefono || '—')}</td>
        <td>${escC(c.email || '—')}</td>
        <td>${escC(c.ciudad || '—')}</td>
        <td>${badgeCompras}</td>
        <td><strong>${fmtC(c._total)}</strong></td>
        <td>${ultimaStr}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn" onclick="verHistorialCliente(${c.id})" title="Historial">👁️</button>
            <button class="action-btn" onclick="editarCliente(${c.id})" title="Editar">✏️</button>
            <button class="action-btn delete-btn" onclick="eliminarCliente(${c.id})" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============ FILTROS ============
function configurarFiltrosClientes(){
  ['search-clientes','filter-tipodoc-clientes','filter-compras-clientes'].forEach(id => {
    const el = $c(id);
    if (el && !el._bound){
      el._bound = true;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', aplicarFiltrosClientes);
    }
  });
}

function aplicarFiltrosClientes(){
  const q = ($c('search-clientes')?.value || '').toLowerCase().trim();
  const tipo = $c('filter-tipodoc-clientes')?.value || '';
  const compras = $c('filter-compras-clientes')?.value || '';

  const filtrados = clientesData.filter(c => {
    if (q){
      const hay =
        String(c.nombre || '').toLowerCase().includes(q) ||
        String(c.documento || '').includes(q) ||
        String(c.telefono || '').includes(q) ||
        String(c.email || '').toLowerCase().includes(q);
      if (!hay) return false;
    }
    if (tipo && c.tipo_doc !== tipo) return false;
    if (compras === 'con' && c._count === 0) return false;
    if (compras === 'sin' && c._count > 0) return false;
    return true;
  });

  mostrarTablaClientes(filtrados);
}

function limpiarFiltrosClientes(){
  ['search-clientes','filter-tipodoc-clientes','filter-compras-clientes'].forEach(id => {
    const el = $c(id); if (el) el.value = '';
  });
  aplicarFiltrosClientes();
}

// ============ GUARDAR / EDITAR ============
async function guardarCliente(){
  const id = $c('cliente-id').value;
  const tipoDoc = $c('cliente-tipo-doc').value;
  const documento = $c('cliente-documento').value.trim();
  const nombre = $c('cliente-nombre').value.trim();
  const telefono = $c('cliente-telefono').value.trim();
  const email = $c('cliente-email').value.trim();
  const ciudad = $c('cliente-ciudad').value.trim();
  const direccion = $c('cliente-direccion').value.trim();
  const notas = $c('cliente-notas').value.trim();

  if (!nombre) return alertaCliente('El nombre es obligatorio', 'error');
  const vDoc = validarDocumento(tipoDoc, documento);
  if (!vDoc.ok) return alertaCliente(vDoc.msg, 'error');

  const duplicado = clientesData.find(c =>
    c.tipo_doc === tipoDoc && c.documento === documento && String(c.id) !== String(id)
  );
  if (duplicado) return alertaCliente('Ya existe un cliente con ese documento', 'error');

  const payload = { tipo_doc: tipoDoc, documento, nombre, telefono, email, ciudad, direccion, notas };

  const token = getTokenSafe();
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  if (token?.access_token) headers['Authorization'] = `Bearer ${token.access_token}`;

  try {
    let res;
    if (id){
      res = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${id}`, {
        method: 'PATCH', headers, body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${SUPABASE_URL}/rest/v1/clientes`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      });
    }

    if (!res.ok){
      const err = await res.text();
      throw new Error(err);
    }

    alertaCliente(id ? '✅ Cliente actualizado' : '✅ Cliente creado', 'success');
    cerrarFormulario('cliente');
    limpiarFormularioCliente();
    await cargarClientes();
  } catch(error){
    console.error(error);
    alertaCliente('Error al guardar: ' + (error.message || 'desconocido'), 'error');
  }
}

function limpiarFormularioCliente(){
  ['cliente-id','cliente-documento','cliente-nombre','cliente-telefono',
   'cliente-email','cliente-ciudad','cliente-direccion','cliente-notas'].forEach(id => {
    const el = $c(id); if (el) el.value = '';
  });
  if ($c('cliente-tipo-doc')) $c('cliente-tipo-doc').value = 'CC';
  if ($c('cliente-modal-titulo')) $c('cliente-modal-titulo').textContent = 'Nuevo cliente';
  if ($c('cliente-submit-btn')) $c('cliente-submit-btn').textContent = 'Guardar cliente';
  clienteEditandoId = null;
  actualizarValidacionDoc();
}

function editarCliente(id){
  const c = clientesData.find(x => x.id === id);
  if (!c) return;
  clienteEditandoId = id;

  $c('cliente-id').value = c.id;
  $c('cliente-tipo-doc').value = c.tipo_doc || 'CC';
  $c('cliente-documento').value = c.documento || '';
  $c('cliente-nombre').value = c.nombre || '';
  $c('cliente-telefono').value = c.telefono || '';
  $c('cliente-email').value = c.email || '';
  $c('cliente-ciudad').value = c.ciudad || '';
  $c('cliente-direccion').value = c.direccion || '';
  $c('cliente-notas').value = c.notas || '';

  $c('cliente-modal-titulo').textContent = 'Editar cliente';
  $c('cliente-submit-btn').textContent = 'Guardar cambios';
  validarDocumentoInput();

  abrirModal('form-cliente');
}

async function eliminarCliente(id){
  const c = clientesData.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar al cliente "${c.nombre}"?\n\nSus ventas NO se eliminarán, solo se desvinculará.`)) return;

  const token = getTokenSafe();
  const headers = { 'apikey': SUPABASE_KEY };
  if (token?.access_token) headers['Authorization'] = `Bearer ${token.access_token}`;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${id}`, {
      method: 'DELETE', headers
    });
    if (res.ok){
      alertaCliente('✅ Cliente eliminado', 'success');
      await cargarClientes();
    } else {
      alertaCliente('Error al eliminar', 'error');
    }
  } catch(error){
    console.error(error);
    alertaCliente('Error de conexión', 'error');
  }
}

// ============ HISTORIAL ============
function verHistorialCliente(id){
  const c = clientesData.find(x => x.id === id);
  if (!c) return;

  $c('historial-cliente-titulo').textContent =
    `Historial de ${c.nombre} (${c.tipo_doc || 'CC'} ${c.documento || '—'})`;

  const stats = $c('historial-cliente-stats');
  stats.innerHTML = `
    <div class="stat-card" style="flex:1;min-width:140px">
      <div class="stat-title">Compras</div>
      <div class="stat-value" style="font-size:1.3rem">${c._count}</div>
    </div>
    <div class="stat-card" style="flex:1;min-width:140px">
      <div class="stat-title">Total gastado</div>
      <div class="stat-value" style="font-size:1.3rem">${fmtC(c._total)}</div>
    </div>
    <div class="stat-card" style="flex:1;min-width:140px">
      <div class="stat-title">Ticket promedio</div>
      <div class="stat-value" style="font-size:1.3rem">${c._count > 0 ? fmtC(c._total / c._count) : '$0'}</div>
    </div>
  `;

  const tbody = $c('historial-cliente-body');
  if (c._ventas.length === 0){
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><h3>Sin compras registradas</h3><p class="nota">Este cliente aún no ha realizado compras.</p></td></tr>';
  } else {
    tbody.innerHTML = c._ventas.map(v => {
      const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO') : '—';
      let badge = 'estado-completada';
      if (v.estado === 'pendiente') badge = 'estado-pendiente';
      else if (v.estado === 'cambiado' || v.estado === 'devuelto') badge = 'estado-cambiado';
      return `
        <tr>
          <td><strong>#${v.id}</strong></td>
          <td>${fecha}</td>
          <td>${escC(v.productos || '—')}</td>
          <td><strong>${fmtC(v.total)}</strong></td>
          <td>${escC(v.metodo_pago || '—')}</td>
          <td><span class="estado-badge ${badge}">${escC(v.estado || 'completada')}</span></td>
        </tr>
      `;
    }).join('');
  }

  abrirModal('modal-historial-cliente');
}

// ============ EXPORTAR CSV ============
function exportarClientesCSV(){
  if (clientesFiltrados.length === 0){
    alertaCliente('No hay clientes para exportar', 'error');
    return;
  }

  const headers = ['Tipo Doc','Documento','Nombre','Teléfono','Email','Ciudad','Dirección','Compras','Total','Última compra','Notas'];
  const rows = clientesFiltrados.map(c => [
    c.tipo_doc || '',
    c.documento || '',
    `"${(c.nombre || '').replace(/"/g,'""')}"`,
    c.telefono || '',
    c.email || '',
    c.ciudad || '',
    `"${(c.direccion || '').replace(/"/g,'""')}"`,
    c._count,
    c._total,
    c._ultima ? c._ultima.toLocaleDateString('es-CO') : '',
    `"${(c.notas || '').replace(/"/g,'""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alertaCliente(`📥 Exportados ${clientesFiltrados.length} clientes`, 'success');
}

// ============ INTEGRACIÓN CON MÓDULO ============
// Hook para que el dashboard cargue clientes al cambiar al módulo
const _cargarDatosModulo = window.cargarDatosModulo;
window.cargarDatosModulo = function(modulo){
  if (typeof _cargarDatosModulo === 'function') _cargarDatosModulo.apply(this, arguments);
  if (modulo === 'clientes'){
    cargarClientes().then(() => configurarFiltrosClientes());
  }
};

// Exportar al scope global
window.cargarClientes = cargarClientes;
window.mostrarTablaClientes = mostrarTablaClientes;
window.aplicarFiltrosClientes = aplicarFiltrosClientes;
window.limpiarFiltrosClientes = limpiarFiltrosClientes;
window.guardarCliente = guardarCliente;
window.editarCliente = editarCliente;
window.eliminarCliente = eliminarCliente;
window.verHistorialCliente = verHistorialCliente;
window.exportarClientesCSV = exportarClientesCSV;
window.actualizarValidacionDoc = actualizarValidacionDoc;
window.validarDocumentoInput = validarDocumentoInput;
window.limpiarFormularioCliente = limpiarFormularioCliente;

// Init: si estamos en el módulo de clientes al cargar, cargar datos
document.addEventListener('DOMContentLoaded', () => {
  const secClientes = document.getElementById('modulo-clientes');
  if (secClientes && secClientes.style.display !== 'none'){
    cargarClientes().then(() => configurarFiltrosClientes());
  }
});
