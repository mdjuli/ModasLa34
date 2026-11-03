// ============================================
// VENTAS.JS — Historial de ventas (mejorado)
// Compatible con POS que genera tags [manual] y [N/A]
// ============================================

let ventasData = [];
let ventasFiltradas = [];

// ============ HELPERS ============
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getToken(){
  try { return JSON.parse(localStorage.getItem('admin_token')); }
  catch { return null; }
}

// Alerta fallback si no existe en el scope global
function alerta(msg, tipo = 'info'){
  if (typeof window.mostrarAlerta === 'function') {
    window.mostrarAlerta(msg, tipo);
  } else {
    console.log(`[${tipo}] ${msg}`);
    // Fallback visual mínimo
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:${tipo==='error'?'#EF4444':tipo==='success'?'#10B981':'#BE185D'};
      color:#fff;padding:.8rem 1.2rem;border-radius:12px;z-index:9999;
      font:600 .85rem Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
}

// ============ PARSEO DE PRODUCTOS (detecta manual / N/A) ============
function parsearProductos(texto){
  const str = String(texto || '');
  return {
    tieneManual: /\[manual/i.test(str),
    tieneNA: /\[N\/A/i.test(str),
    limpio: str.replace(/\s*\[[^\]]*\]/g, '').trim()
  };
}

// ============ CARGA DE VENTAS ============
async function cargarVentas(){
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ventas?order=fecha.desc&limit=500`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    if (!response.ok) throw new Error('Error al cargar ventas');

    ventasData = await response.json();

    // Enriquecer cada venta con flags de manual / N/A
    ventasData = ventasData.map(v => {
      const p = parsearProductos(v.productos);
      return {
        ...v,
        _tieneManual: p.tieneManual,
        _tieneNA: p.tieneNA,
        _productosLimpio: p.limpio,
        _fechaObj: v.fecha ? new Date(v.fecha) : null
      };
    });

    actualizarMetricas();
    aplicarFiltrosVentas(); // renderiza la tabla ya filtrada
    setTimeout(configurarFiltrosVentas, 100);

    const btnNuevaVenta = document.querySelector('#modulo-ventas .add-btn');
    if (btnNuevaVenta) btnNuevaVenta.onclick = () => window.open('ventas.html', '_blank');

  } catch(error){
    console.error('Error:', error);
    const tbody = $('ventas-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#EF4444;">Error al cargar ventas</td></tr>';
    alerta('No se pudieron cargar las ventas', 'error');
  }
}

// ============ MÉTRICAS ============
function actualizarMetricas(){
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const ventasHoy = ventasData.filter(v => v._fechaObj && v._fechaObj >= hoy);
  const totalHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);

  const ventasMes = ventasData.filter(v => v._fechaObj && v._fechaObj >= inicioMes);
  const totalMes = ventasMes.reduce((s, v) => s + (v.total || 0), 0);

  const cambiosCount = ventasData.filter(v => v.estado === 'cambiado' || v.estado === 'devuelto').length;

  // NUEVO: ventas con ajuste manual / N/A (para cuadre contable)
  const conAjuste = ventasData.filter(v => v._tieneManual || v._tieneNA);
  const totalAjustes = conAjuste.length;

  if ($('ventas-hoy-total')) $('ventas-hoy-total').textContent = fmt(totalHoy);
  if ($('ventas-mes-total')) $('ventas-mes-total').textContent = fmt(totalMes);
  if ($('ventas-cambios-count')) $('ventas-cambios-count').textContent = cambiosCount;

  // Si agregas un KPI nuevo en el HTML con id="ventas-ajustes-count", se llena solo
  if ($('ventas-ajustes-count')) $('ventas-ajustes-count').textContent = totalAjustes;
}

// ============ RENDER TABLA ============
function mostrarTablaVentas(ventas){
  const tbody = $('ventas-body');
  if (!tbody) return;

  ventasFiltradas = ventas || [];

  if (!ventas || ventas.length === 0){
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#9CA3AF;">No hay ventas que coincidan</td></tr>';
    return;
  }

  tbody.innerHTML = ventas.map(venta => {
    let estadoClass = 'estado-pagada', estadoText = '✅ Completada';
    switch(venta.estado){
      case 'completada': estadoClass = 'estado-pagada'; estadoText = '✅ Completada'; break;
      case 'pendiente': estadoClass = 'estado-pendiente'; estadoText = '⏳ Pendiente'; break;
      case 'cambiado': estadoClass = 'estado-badge-cambiado'; estadoText = '🔄 Cambio'; break;
      case 'devuelto': estadoClass = 'estado-badge-devuelto'; estadoText = '📦 Devuelto'; break;
    }

    const badges = [];
    if (venta._tieneManual) badges.push('<span class="badge-manual" title="Precio modificado en caja">✏️ MANUAL</span>');
    if (venta._tieneNA) badges.push('<span class="badge-na" title="Precio N/A en origen">⛔ N/A</span>');

    const fechaStr = venta._fechaObj
      ? venta._fechaObj.toLocaleDateString('es-CO') + ' ' +
        venta._fechaObj.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})
      : '—';

    return `
      <tr data-id="${venta.id}" class="${venta._tieneManual || venta._tieneNA ? 'fila-ajuste' : ''}">
        <td><strong>#${venta.id}</strong></td>
        <td>${fechaStr}</td>
        <td>${esc(venta.cliente || 'Consumidor final')}</td>
        <td>
          <div class="productos-cell">
            ${esc(venta._productosLimpio || '-')}
            ${badges.length ? `<div class="badges-row">${badges.join(' ')}</div>` : ''}
          </div>
        </td>
        <td><strong>${fmt(venta.total)}</strong></td>
        <td>${esc(venta.metodo_pago || 'Efectivo')}</td>
        <td><span class="estado-badge ${estadoClass}">${estadoText}</span></td>
        <td>
          <div class="acciones-cell">
            <button class="action-btn" onclick="verDetalleVenta(${venta.id})" title="Ver">👁️</button>
            <button class="action-btn" onclick="solicitarCambio(${venta.id})" title="Cambio/Devolución">🔄</button>
            <button class="action-btn delete-btn" onclick="eliminarVenta(${venta.id})" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============ FILTROS (sobre el array, no el DOM) ============
function configurarFiltrosVentas(){
  const ids = ['search-ventas','filter-fecha-inicio','filter-fecha-fin',
               'filter-estado-ventas','filter-metodo-ventas','filter-ajustes'];
  ids.forEach(id => {
    const el = $(id);
    if (el && !el._bound){
      el._bound = true;
      el.addEventListener(el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change', aplicarFiltrosVentas);
    }
  });
}

function aplicarFiltrosVentas(){
  const search = ($('search-ventas')?.value || '').toLowerCase().trim();
  const fIni = $('filter-fecha-inicio')?.value;
  const fFin = $('filter-fecha-fin')?.value;
  const estado = $('filter-estado-ventas')?.value || '';
  const metodo = $('filter-metodo-ventas')?.value || '';
  const soloAjustes = $('filter-ajustes')?.checked || false;

  const desde = fIni ? new Date(fIni + 'T00:00:00') : null;
  const hasta = fFin ? new Date(fFin + 'T23:59:59') : null;

  const filtradas = ventasData.filter(v => {
    if (search){
      const match =
        String(v.id).includes(search) ||
        (v.cliente || '').toLowerCase().includes(search) ||
        (v._productosLimpio || '').toLowerCase().includes(search) ||
        (v.metodo_pago || '').toLowerCase().includes(search);
      if (!match) return false;
    }
    if (desde && v._fechaObj && v._fechaObj < desde) return false;
    if (hasta && v._fechaObj && v._fechaObj > hasta) return false;
    if (estado && v.estado !== estado) return false;
    if (metodo && v.metodo_pago !== metodo) return false;
    if (soloAjustes && !(v._tieneManual || v._tieneNA)) return false;
    return true;
  });

  mostrarTablaVentas(filtradas);
}

function limpiarFiltrosVentas(){
  ['search-ventas','filter-fecha-inicio','filter-fecha-fin',
   'filter-estado-ventas','filter-metodo-ventas'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  const chk = $('filter-ajustes'); if (chk) chk.checked = false;
  aplicarFiltrosVentas();
}

// ============ DETALLE ============
function verDetalleVenta(id){
  window.open(`factura.html?id=${id}`, '_blank');
}

// ============ ELIMINAR (modal propio) ============
async function eliminarVenta(id){
  const venta = ventasData.find(v => v.id === id);
  if (!venta) return;

  const ok = await modalConfirmar({
    titulo: '⚠️ Eliminar venta',
    mensaje: `¿Eliminar la venta #${id} por ${fmt(venta.total)}?\nEsta acción no se puede deshacer.`,
    textoAceptar: 'Eliminar',
    peligro: true
  });
  if (!ok) return;

  try {
    const token = getToken();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token.access_token}`
      }
    });
    if (response.ok){
      alerta('✅ Venta eliminada', 'success');
      await cargarVentas();
    } else {
      alerta('Error al eliminar', 'error');
    }
  } catch(error){
    console.error('Error:', error);
    alerta('Error de conexión', 'error');
  }
}

// ============ CAMBIO / DEVOLUCIÓN (modal propio) ============
async function solicitarCambio(id){
  const venta = ventasData.find(v => v.id === id);
  if (!venta) return;

  const data = await modalCambio(venta);
  if (!data) return;

  try {
    const token = getToken();
    const nota = `[${data.tipo.toUpperCase()}] ${data.motivo}` +
                 (data.detalle ? ` — ${data.detalle}` : '') +
                 ` — ${new Date().toLocaleString('es-CO')}`;

    const nuevoEstado = data.tipo === 'devolucion' ? 'devuelto' : 'cambiado';

    const res = await fetch(`${SUPABASE_URL}/rest/v1/ventas?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ estado: nuevoEstado, notas: nota })
    });

    if (res.ok){
      alerta(`🔄 ${data.tipo === 'devolucion' ? 'Devolución' : 'Cambio'} registrado`, 'success');
      await cargarVentas();
    } else {
      alerta('Error al registrar', 'error');
    }
  } catch(error){
    console.error('Error:', error);
    alerta('Error de conexión', 'error');
  }
}

// ============ EXPORTAR CSV ============
function exportarVentasCSV(){
  if (ventasFiltradas.length === 0){ alerta('No hay ventas para exportar', 'error'); return; }

  const headers = ['ID','Fecha','Cliente','Productos','Total','Método','Estado','Ajuste manual','N/A','Notas'];
  const rows = ventasFiltradas.map(v => [
    v.id,
    v._fechaObj ? v._fechaObj.toLocaleString('es-CO') : '',
    v.cliente || 'Consumidor final',
    `"${(v._productosLimpio || '').replace(/"/g,'""')}"`,
    v.total || 0,
    v.metodo_pago || '',
    v.estado || 'completada',
    v._tieneManual ? 'SÍ' : 'NO',
    v._tieneNA ? 'SÍ' : 'NO',
    `"${(v.notas || '').replace(/"/g,'""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alerta(`📥 Exportadas ${ventasFiltradas.length} ventas`, 'success');
}

// ============ MODALES PROPIOS (reemplazo de confirm/prompt) ============
function modalConfirmar({ titulo, mensaje, textoAceptar = 'Aceptar', peligro = false }){
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(131,24,67,.4);
      backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;
      justify-content:center;padding:1rem;`;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:1.5rem;max-width:420px;
                  width:100%;box-shadow:0 20px 60px rgba(131,24,67,.3);font-family:Inter,sans-serif;">
        <h3 style="font-size:1.1rem;color:#831843;font-weight:800;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;">${esc(titulo)}</h3>
        <p style="font-size:.9rem;color:#4B5563;line-height:1.5;margin-bottom:1.25rem;white-space:pre-line;">${esc(mensaje)}</p>
        <div style="display:flex;gap:.6rem;">
          <button data-r="0" style="flex:1;padding:.8rem;border:none;border-radius:12px;
                  background:#FCE7F3;color:#831843;font-weight:800;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button data-r="1" style="flex:1;padding:.8rem;border:none;border-radius:12px;
                  background:${peligro ? '#EF4444' : '#EC4899'};color:#fff;font-weight:800;cursor:pointer;font-family:inherit;">${esc(textoAceptar)}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      const r = e.target.dataset?.r;
      if (r !== undefined){ resolve(r === '1'); modal.remove(); }
      if (e.target === modal){ resolve(false); modal.remove(); }
    });
  });
}

function modalCambio(venta){
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;background:rgba(131,24,67,.4);
      backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;
      justify-content:center;padding:1rem;`;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:1.5rem;max-width:440px;
                  width:100%;box-shadow:0 20px 60px rgba(131,24,67,.3);font-family:Inter,sans-serif;">
        <h3 style="font-size:1.1rem;color:#831843;font-weight:800;margin-bottom:.5rem;">🔄 Cambio / Devolución</h3>
        <p style="font-size:.8rem;color:#6B7280;margin-bottom:1rem;">Venta #${venta.id} · ${fmt(venta.total)}</p>
        <label style="font-size:.75rem;font-weight:700;color:#831843;display:block;margin-bottom:.35rem;">Tipo</label>
        <select id="m-tipo" style="width:100%;padding:.7rem;border:2px solid #FBCFE8;border-radius:12px;
                font-family:inherit;font-size:.9rem;margin-bottom:.75rem;font-weight:600;">
          <option value="cambio">🔄 Cambio de producto</option>
          <option value="devolucion">📦 Devolución</option>
          <option value="garantia">🛡️ Garantía</option>
        </select>
        <label style="font-size:.75rem;font-weight:700;color:#831843;display:block;margin-bottom:.35rem;">Motivo</label>
        <select id="m-motivo" style="width:100%;padding:.7rem;border:2px solid #FBCFE8;border-radius:12px;
                font-family:inherit;font-size:.9rem;margin-bottom:.75rem;font-weight:600;">
          <option>Talla incorrecta</option>
          <option>Color incorrecto</option>
          <option>Producto defectuoso</option>
          <option>No le gustó</option>
          <option>Otro</option>
        </select>
        <label style="font-size:.75rem;font-weight:700;color:#831843;display:block;margin-bottom:.35rem;">Detalle (opcional)</label>
        <textarea id="m-detalle" rows="2" placeholder="Observaciones..." style="width:100%;padding:.7rem;
                  border:2px solid #FBCFE8;border-radius:12px;font-family:inherit;font-size:.85rem;
                  margin-bottom:1rem;resize:vertical;"></textarea>
        <div style="display:flex;gap:.6rem;">
          <button data-r="0" style="flex:1;padding:.8rem;border:none;border-radius:12px;
                  background:#FCE7F3;color:#831843;font-weight:800;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button data-r="1" style="flex:1;padding:.8rem;border:none;border-radius:12px;
                  background:#EC4899;color:#fff;font-weight:800;cursor:pointer;font-family:inherit;">Registrar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      const r = e.target.dataset?.r;
      if (r === '0'){ resolve(null); modal.remove(); }
      if (r === '1'){
        resolve({
          tipo: modal.querySelector('#m-tipo').value,
          motivo: modal.querySelector('#m-motivo').value,
          detalle: modal.querySelector('#m-detalle').value.trim()
        });
        modal.remove();
      }
      if (e.target === modal){ resolve(null); modal.remove(); }
    });
  });
}

// ============ EXPORTAR AL SCOPE GLOBAL ============
window.cargarVentas = cargarVentas;
window.verDetalleVenta = verDetalleVenta;
window.editarVenta = verDetalleVenta; // ahora sí hace algo: abre detalle
window.eliminarVenta = eliminarVenta;
window.solicitarCambio = solicitarCambio;
window.limpiarFiltrosVentas = limpiarFiltrosVentas;
window.exportarVentasCSV = exportarVentasCSV;
window.aplicarFiltrosVentas = aplicarFiltrosVentas;

// ============================================
// PWA (Service Worker) — ruta relativa, más segura
// ============================================
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js').catch(err => console.log('SW:', err));
  });
}
