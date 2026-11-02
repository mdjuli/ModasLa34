// js/ventas.js — Punto de Venta (POS) de ModasLa34
// Usa el esquema REAL de Supabase: variantes_producto (stock en `colores` + `stock_total`),
// productos_base, ventas y clientes. No requiere cambios en la base de datos.
//
// Convenciones (sin tocar el esquema):
//  - Código de barras  = variantes_producto.sku
//  - N.º comprobante   = "INT-" + ventas.id con 4 dígitos  (INT-0001, INT-0002, ...)
//  - Detalle de ítems  = ventas.notas  →  "ITEMS_JSON:[...]"  (ventas no tiene tabla de ítems)

import * as cfg from './supabase-config.js';
import { crearAsientoVenta, anularAsientoDeOrigen } from './contabilidad/asiento-auto.js';

// ---------------------------------------------------------------------------
// Cliente de Supabase (acepta varios nombres de export de tu supabase-config.js)
// ---------------------------------------------------------------------------
const supabase = [cfg.supabase, cfg.supabaseClient, cfg.sb, cfg.default, window.supabaseClient, window.supabase]
  .find((c) => c && typeof c.from === 'function');
if (!supabase) console.error('No se encontró el cliente de Supabase. Revisa js/supabase-config.js');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => COP.format(Number(n) || 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const numeroComprobante = (id) => 'INT-' + String(id).padStart(4, '0');

function toast(msg, tipo = 'info') {
  const colores = { info: 'bg-stone-800', ok: 'bg-emerald-700', error: 'bg-red-700', warn: 'bg-amber-600' };
  const el = document.createElement('div');
  el.className = `toast ${colores[tipo] || colores.info} text-white text-sm px-4 py-2 rounded-lg shadow-lg max-w-xs`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 6000 : 3500);
}

function errMsg(e) {
  const m = e?.message || String(e);
  if (e?.code === '42501') return 'Sin permisos en la base de datos (revisa las políticas RLS).';
  return m;
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const state = {
  variantes: [],   // variantes_producto + productos_base
  clientes: [],
  cart: [],        // { key, variante_id, colorIdx, colorNombre, nombre, talla, sku, precio, precio_compra, cantidad, stockMax }
  usuario: { id: null, nombre: '' },
  procesando: false,
};

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
async function requerirSesion() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) { window.location.href = 'login.html'; return false; }
  state.usuario.id = user.id;
  try {
    const { data: perfil } = await supabase.from('perfiles').select('nombre, email').eq('id', user.id).maybeSingle();
    state.usuario.nombre = perfil?.nombre || perfil?.email || user.email || '';
  } catch { state.usuario.nombre = user.email || ''; }
  $('usuarioNombre').textContent = state.usuario.nombre;
  return true;
}

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------
async function cargarDatos() {
  try {
    const [v, c] = await Promise.all([
      supabase.from('variantes_producto')
        .select('id, producto_id, talla, precio_venta, precio_compra, colores, stock_total, sku, productos_base(id, codigo, nombre, categoria)'),
      supabase.from('clientes').select('id, nombre, documento').eq('activo', true).order('nombre'),
    ]);
    if (v.error) throw v.error;
    state.variantes = v.data || [];
    state.clientes = c.error ? [] : c.data || [];
    if (c.error) toast('No se pudieron cargar los clientes: ' + errMsg(c.error), 'warn');
    $('selCliente').innerHTML =
      '<option value="">Consumidor final</option>' +
      state.clientes.map((x) => `<option value="${x.id}">${esc(x.nombre)}${x.documento ? ' · ' + esc(x.documento) : ''}</option>`).join('');
  } catch (e) {
    toast('Error cargando productos: ' + errMsg(e), 'error');
  }
}

// ---------------------------------------------------------------------------
// Colores / stock de una variante
// ---------------------------------------------------------------------------
function opcionesColor(v) {
  const colores = Array.isArray(v.colores) ? v.colores : [];
  if (!colores.length) {
    return v.stock_total > 0 ? [{ idx: -1, nombre: '', stock: Number(v.stock_total) }] : [];
  }
  return colores
    .map((c, idx) => ({ idx, nombre: c.nombre || '', codigo: c.codigo || null, stock: Number(c.stock) || 0 }))
    .filter((c) => c.stock > 0);
}

const nombreVariante = (v) => `${v.productos_base?.nombre ?? 'Producto'} · ${v.talla}`;

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------
function buscarTexto(q) {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return state.variantes.filter((v) =>
    (v.productos_base?.nombre || '').toLowerCase().includes(t) ||
    (v.productos_base?.codigo || '').toLowerCase().includes(t) ||
    (v.sku || '').toLowerCase().includes(t) ||
    (v.talla || '').toLowerCase() === t
  ).slice(0, 12);
}

function renderResultados(lista) {
  const cont = $('resultados');
  if (!lista.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = lista.map((v) => {
    const stock = opcionesColor(v).reduce((a, c) => a + c.stock, 0);
    return `<button data-add="${v.id}" class="text-left bg-white rounded-lg p-3 shadow-sm border hover:border-stone-800 ${stock ? '' : 'opacity-50'}">
      <div class="font-medium">${esc(v.productos_base?.nombre)}</div>
      <div class="text-xs text-stone-500">Talla ${esc(v.talla)} · ${esc(v.sku)}</div>
      <div class="flex justify-between mt-1 text-sm"><b>${money(v.precio_venta)}</b><span class="${stock <= 2 ? 'text-red-700' : 'text-stone-500'}">Stock: ${stock}</span></div>
    </button>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Lógica para escanear código de barras (el lector USB escribe el código y envía Enter)
// ---------------------------------------------------------------------------
function procesarEntrada(valor) {
  const code = valor.trim();
  if (!code) return;
  const low = code.toLowerCase();

  // 1) SKU exacto (el SKU puede estar repetido: se pregunta cuál)
  let exactos = state.variantes.filter((v) => (v.sku || '').toLowerCase() === low);
  // 2) código del producto base
  if (!exactos.length) exactos = state.variantes.filter((v) => (v.productos_base?.codigo || '').toLowerCase() === low);

  if (exactos.length === 1) { agregarVariante(exactos[0]); limpiarEntrada(); return; }
  if (exactos.length > 1) { elegirVariante(exactos); limpiarEntrada(); return; }

  // 3) Búsqueda por texto
  const found = buscarTexto(code);
  if (found.length === 1) { agregarVariante(found[0]); limpiarEntrada(); return; }
  if (found.length > 1) { renderResultados(found); $('scanHint').textContent = 'Varios resultados: toca el producto.'; return; }

  toast(`Código "${code}" no encontrado`, 'error');
  $('scanInput').select();
}

function limpiarEntrada() {
  $('scanInput').value = '';
  $('resultados').innerHTML = '';
  $('scanHint').textContent = 'Enter agrega el producto al carrito.';
  focusScan();
}

function agregarVariante(v) {
  const opts = opcionesColor(v);
  if (!opts.length) { toast(`Sin stock: ${nombreVariante(v)}`, 'error'); return; }
  if (opts.length === 1) { agregarAlCarrito(v, opts[0]); return; }
  // Varios colores con stock → el vendedor elige
  abrirModal(`
    <h3 class="font-semibold mb-1">${esc(nombreVariante(v))}</h3>
    <p class="text-sm text-stone-500 mb-3">Elige el color</p>
    <div class="grid grid-cols-2 gap-2">
      ${opts.map((o) => `<button data-color="${v.id}:${o.idx}" class="flex items-center gap-2 border rounded-lg p-3 hover:border-stone-800 text-left">
        <span class="w-5 h-5 rounded-full border" style="background:${esc(o.codigo || '#ddd')}"></span>
        <span>${esc(o.nombre || 'Sin color')}<br><small class="text-stone-500">Stock ${o.stock}</small></span></button>`).join('')}
    </div>`);
}

function elegirVariante(lista) {
  abrirModal(`
    <h3 class="font-semibold mb-1">Código repetido</h3>
    <p class="text-sm text-stone-500 mb-3">Más de un producto usa este código. Elige cuál:</p>
    <div class="space-y-2">
      ${lista.map((v) => `<button data-add="${v.id}" class="w-full text-left border rounded-lg p-3 hover:border-stone-800">
        ${esc(nombreVariante(v))} <span class="float-right font-semibold">${money(v.precio_venta)}</span></button>`).join('')}
    </div>`);
}

// ---------------------------------------------------------------------------
// Carrito
// ---------------------------------------------------------------------------
function agregarAlCarrito(v, opt) {
  const key = `${v.id}:${opt.idx}`;
  const ex = state.cart.find((i) => i.key === key);
  if (ex) {
    if (ex.cantidad >= ex.stockMax) { toast(`Stock máximo: ${ex.stockMax}`, 'warn'); return; }
    ex.cantidad += 1;
  } else {
    state.cart.push({
      key, variante_id: v.id, colorIdx: opt.idx, colorNombre: opt.nombre,
      nombre: v.productos_base?.nombre ?? 'Producto', talla: v.talla, sku: v.sku,
      precio: Number(v.precio_venta) || 0, precio_compra: Number(v.precio_compra) || 0,
      cantidad: 1, stockMax: opt.stock,
    });
  }
  cerrarModal();
  renderCarrito();
}

function totales() {
  const subtotal = state.cart.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const pct = Number($('selIva').value) || 0;
  const iva = Math.round((subtotal * pct) / 100);
  return { subtotal, iva, pct, total: subtotal + iva };
}

function renderCarrito() {
  const cont = $('carrito');
  if (!state.cart.length) {
    cont.innerHTML = '<p class="text-sm text-stone-400 py-8 text-center">Carrito vacío</p>';
  } else {
    cont.innerHTML = state.cart.map((i) => `
      <div class="py-2 flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${esc(i.nombre)} · ${esc(i.talla)}</div>
          <div class="text-xs text-stone-500">${i.colorNombre ? esc(i.colorNombre) + ' · ' : ''}${money(i.precio)} c/u</div>
        </div>
        <div class="flex items-center gap-1">
          <button data-menos="${i.key}" class="w-7 h-7 rounded bg-stone-100 hover:bg-stone-200">−</button>
          <span class="w-6 text-center text-sm">${i.cantidad}</span>
          <button data-mas="${i.key}" class="w-7 h-7 rounded bg-stone-100 hover:bg-stone-200">+</button>
        </div>
        <div class="w-20 text-right text-sm font-semibold">${money(i.precio * i.cantidad)}</div>
        <button data-quitar="${i.key}" class="text-stone-400 hover:text-red-700" title="Quitar">✕</button>
      </div>`).join('');
  }
  actualizarTotales();
}

function actualizarTotales() {
  const t = totales();
  $('lblSubtotal').textContent = money(t.subtotal);
  $('lblIva').textContent = money(t.iva);
  $('lblTotal').textContent = money(t.total);
  const efectivo = $('selPago').value === 'Efectivo';
  $('boxRecibido').style.display = efectivo ? '' : 'none';
  $('boxCambio').style.display = efectivo ? '' : 'none';
  const recibido = Number($('inpRecibido').value) || 0;
  $('lblCambio').textContent = money(Math.max(0, recibido - t.total));
  $('btnCobrar').disabled = !state.cart.length || state.procesando;
}

// ---------------------------------------------------------------------------
// Registrar venta
// ---------------------------------------------------------------------------
function aplicarDescuento(colores, stockTotal, idx, nombre, cantidad) {
  // Devuelve { colores, stock_total } nuevos (resta `cantidad`; negativa = devolver)
  const arr = Array.isArray(colores) ? colores.map((c) => ({ ...c })) : [];
  if (!arr.length) {
    const nuevo = (Number(stockTotal) || 0) - cantidad;
    if (nuevo < 0) throw new Error('Stock insuficiente');
    return { colores: arr, stock_total: nuevo };
  }
  let pos = idx >= 0 && idx < arr.length && (arr[idx].nombre ?? '') === (nombre ?? '') ? idx : arr.findIndex((c) => (c.nombre ?? '') === (nombre ?? ''));
  if (pos < 0) throw new Error(`El color "${nombre || 'Sin color'}" ya no existe en esa variante`);
  const nuevoStock = (Number(arr[pos].stock) || 0) - cantidad;
  if (nuevoStock < 0) throw new Error(`Stock insuficiente de ${nombre || 'la variante'}`);
  arr[pos].stock = nuevoStock;
  return { colores: arr, stock_total: arr.reduce((a, c) => a + (Number(c.stock) || 0), 0) };
}

/** Descuento de stock tras venta (con bloqueo optimista para evitar vender stock que otro ya vendió) */
async function moverStock(items, signo /* +1 descuenta, -1 devuelve */) {
  const aplicados = [];
  try {
    const ids = [...new Set(items.map((i) => i.variante_id))];
    const { data: frescas, error } = await supabase.from('variantes_producto').select('id, colores, stock_total').in('id', ids);
    if (error) throw error;
    for (const id of ids) {
      const fresca = frescas.find((f) => f.id === id);
      if (!fresca) throw new Error('Una variante del carrito ya no existe');
      let colores = fresca.colores, total = fresca.stock_total;
      for (const it of items.filter((i) => i.variante_id === id)) {
        const r = aplicarDescuento(colores, total, it.colorIdx ?? it.color_idx ?? -1, it.colorNombre ?? it.color ?? '', signo * it.cantidad);
        colores = r.colores; total = r.stock_total;
      }
      const { data: upd, error: e2 } = await supabase.from('variantes_producto')
        .update({ colores, stock_total: total })
        .eq('id', id).eq('stock_total', fresca.stock_total) // solo si nadie lo cambió
        .select('id');
      if (e2) throw e2;
      if (!upd?.length) throw new Error('El stock cambió mientras se procesaba. Intenta de nuevo.');
      aplicados.push({ id, colores: fresca.colores, stock_total: fresca.stock_total });
    }
    return aplicados;
  } catch (e) {
    // Revertir lo ya aplicado
    for (const a of aplicados) {
      await supabase.from('variantes_producto').update({ colores: a.colores, stock_total: a.stock_total }).eq('id', a.id);
    }
    throw e;
  }
}

async function registrarVenta() {
  if (state.procesando || !state.cart.length) return;
  state.procesando = true; actualizarTotales();
  $('btnCobrar').textContent = 'Procesando…';

  const t = totales();
  const metodo = $('selPago').value;
  const clienteId = $('selCliente').value ? Number($('selCliente').value) : null;
  const clienteNombre = clienteId ? state.clientes.find((c) => c.id === clienteId)?.nombre : 'Consumidor final';
  const recibido = Number($('inpRecibido').value) || 0;

  if (metodo === 'Efectivo' && recibido && recibido < t.total) {
    toast('El efectivo recibido es menor al total', 'error');
    state.procesando = false; $('btnCobrar').textContent = 'Registrar venta'; actualizarTotales();
    return;
  }

  const items = state.cart.map((i) => ({
    variante_id: i.variante_id, color: i.colorNombre, color_idx: i.colorIdx, nombre: i.nombre, talla: i.talla,
    sku: i.sku, cantidad: i.cantidad, precio_unitario: i.precio, precio_compra: i.precio_compra, subtotal: i.precio * i.cantidad,
  }));
  const resumen = items.map((i) => `${i.cantidad}x ${i.nombre} ${i.talla}${i.color ? ' ' + i.color : ''}`).join(', ');

  let ventaId = null, stockAplicado = false;
  try {
    // 1) Validar y descontar stock (si falla, no se crea la venta)
    const moverItems = state.cart.map((i) => ({ variante_id: i.variante_id, colorIdx: i.colorIdx, colorNombre: i.colorNombre, cantidad: i.cantidad }));
    await moverStock(moverItems, +1);
    stockAplicado = true;

    // 2) Insertar la venta
    const { data: venta, error } = await supabase.from('ventas').insert({
      total: t.total, subtotal: t.subtotal, iva: t.iva, iva_porcentaje: t.pct,
      metodo_pago: metodo, productos: resumen, vendedor_id: state.usuario.id, vendedor: state.usuario.nombre,
      cliente: clienteNombre, cliente_id: clienteId, estado: 'completada',
      notas: 'ITEMS_JSON:' + JSON.stringify(items),
    }).select().single();
    if (error) throw error;
    ventaId = venta.id;

    // 3) Actualizar datos del cliente (no crítico)
    if (clienteId) {
      try {
        const { data: c } = await supabase.from('clientes').select('total_compras').eq('id', clienteId).single();
        await supabase.from('clientes').update({
          ultima_compra: new Date().toISOString().slice(0, 10),
          total_compras: (Number(c?.total_compras) || 0) + t.total,
        }).eq('id', clienteId);
      } catch (e) { console.warn('No se actualizó el cliente', e); }
    }

    // 4) Asiento contable automático (no crítico: la venta ya está registrada)
    if ($('chkAsiento').checked) {
      try { await crearAsientoVenta(venta, items); }
      catch (e) { toast('Venta guardada, pero el asiento contable falló: ' + errMsg(e), 'warn'); }
    }

    const cambio = metodo === 'Efectivo' && recibido ? Math.max(0, recibido - t.total) : 0;
    state.cart = []; $('inpRecibido').value = ''; renderCarrito();
    await cargarDatos(); // refresca stock en pantalla
    mostrarExito(ventaId, t.total, cambio);
  } catch (e) {
    // Si el stock ya se descontó pero la venta no se guardó, se devuelve
    if (stockAplicado && !ventaId) {
      try { await moverStock(state.cart.map((i) => ({ variante_id: i.variante_id, colorIdx: i.colorIdx, colorNombre: i.colorNombre, cantidad: i.cantidad })), -1); }
      catch (e2) { toast('Revisa el stock manualmente: no se pudo revertir (' + errMsg(e2) + ')', 'error'); }
    }
    toast('No se registró la venta: ' + errMsg(e), 'error');
  } finally {
    state.procesando = false; $('btnCobrar').textContent = 'Registrar venta'; actualizarTotales();
  }
}

function mostrarExito(id, total, cambio) {
  abrirModal(`
    <div class="text-center">
      <div class="text-4xl mb-1">✓</div>
      <h3 class="text-lg font-semibold">Venta registrada</h3>
      <p class="text-stone-500">${numeroComprobante(id)} · ${money(total)}</p>
      ${cambio ? `<p class="mt-1">Cambio: <b>${money(cambio)}</b></p>` : ''}
      <div class="grid grid-cols-2 gap-2 mt-4">
        <a href="factura.html?id=${id}" target="_blank" class="py-2 rounded-lg bg-stone-900 text-white">Ver comprobante</a>
        <button data-cerrar class="py-2 rounded-lg border">Nueva venta</button>
      </div>
    </div>`);
}

// ---------------------------------------------------------------------------
// Historial del día + anulación
// ---------------------------------------------------------------------------
async function abrirHistorial() {
  try {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const { data, error } = await supabase.from('ventas').select('id, fecha, cliente, total, metodo_pago, estado')
      .gte('fecha', inicio.toISOString()).order('id', { ascending: false });
    if (error) throw error;
    const totalDia = (data || []).filter((v) => v.estado === 'completada').reduce((a, v) => a + Number(v.total), 0);
    abrirModal(`
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-semibold">Ventas de hoy</h3><button data-cerrar class="text-stone-400">✕</button>
      </div>
      <p class="text-sm mb-3">Total del día: <b>${money(totalDia)}</b> · ${(data || []).filter((v) => v.estado === 'completada').length} ventas</p>
      ${(data || []).length ? `<div class="divide-y text-sm">${data.map((v) => `
        <div class="py-2 flex items-center gap-2 ${v.estado === 'anulada' ? 'opacity-50 line-through' : ''}">
          <div class="flex-1"><b>${numeroComprobante(v.id)}</b> · ${new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            <div class="text-xs text-stone-500">${esc(v.cliente)} · ${esc(v.metodo_pago)}</div></div>
          <b>${money(v.total)}</b>
          <a href="factura.html?id=${v.id}" target="_blank" class="text-blue-700 underline">Ver</a>
          ${v.estado === 'completada' ? `<button data-anular="${v.id}" class="text-red-700 underline">Anular</button>` : ''}
        </div>`).join('')}</div>` : '<p class="text-stone-400 text-center py-6">Aún no hay ventas hoy</p>'}`);
  } catch (e) { toast('No se pudo cargar el historial: ' + errMsg(e), 'error'); }
}

async function anularVenta(id) {
  if (!confirm(`¿Anular la venta ${numeroComprobante(id)}? Se devolverá el stock al inventario.`)) return;
  try {
    const { data: v, error } = await supabase.from('ventas').select('id, notas, estado').eq('id', id).single();
    if (error) throw error;
    if (v.estado !== 'completada') throw new Error('La venta ya estaba anulada');

    let devuelto = false;
    if ((v.notas || '').startsWith('ITEMS_JSON:')) {
      const items = JSON.parse(v.notas.slice('ITEMS_JSON:'.length));
      await moverStock(items.map((i) => ({ variante_id: i.variante_id, colorIdx: i.color_idx, colorNombre: i.color, cantidad: i.cantidad })), -1);
      devuelto = true;
    }
    const { error: e2 } = await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', id);
    if (e2) throw e2;
    try { await anularAsientoDeOrigen('venta', id); } catch (e) { console.warn('Asiento no anulado', e); }

    toast(devuelto ? 'Venta anulada y stock devuelto' : 'Venta anulada (venta antigua: ajusta el stock a mano)', devuelto ? 'ok' : 'warn');
    await cargarDatos();
    abrirHistorial();
  } catch (e) { toast('No se pudo anular: ' + errMsg(e), 'error'); }
}

// ---------------------------------------------------------------------------
// Modal + foco del lector
// ---------------------------------------------------------------------------
const modalAbierto = () => !$('modal').classList.contains('hidden');
function abrirModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); $('modal').classList.add('flex'); }
function cerrarModal() { $('modal').classList.add('hidden'); $('modal').classList.remove('flex'); focusScan(); }
function focusScan() { if (!modalAbierto()) $('scanInput').focus(); }

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
function enlazarEventos() {
  const scan = $('scanInput');
  // Detectar Enter del lector
  scan.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); procesarEntrada(scan.value); } });
  scan.addEventListener('input', () => renderResultados(buscarTexto(scan.value)));

  // Mantener el input del lector siempre enfocado
  document.addEventListener('click', (e) => { if (!e.target.closest('select, input, textarea')) setTimeout(focusScan, 0); });
  window.addEventListener('focus', focusScan);

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const d = t.dataset;
    if (d.add) { const v = state.variantes.find((x) => x.id === Number(d.add)); if (v) { cerrarModal(); agregarVariante(v); limpiarEntrada(); } }
    else if (d.color) { const [vid, idx] = d.color.split(':').map(Number); const v = state.variantes.find((x) => x.id === vid); const o = opcionesColor(v).find((c) => c.idx === idx); if (v && o) agregarAlCarrito(v, o); limpiarEntrada(); }
    else if (d.mas) { const i = state.cart.find((x) => x.key === d.mas); if (i && i.cantidad < i.stockMax) i.cantidad++; else toast('Stock máximo alcanzado', 'warn'); renderCarrito(); }
    else if (d.menos) { const i = state.cart.find((x) => x.key === d.menos); if (i) { i.cantidad--; if (i.cantidad <= 0) state.cart = state.cart.filter((x) => x !== i); } renderCarrito(); }
    else if (d.quitar) { state.cart = state.cart.filter((x) => x.key !== d.quitar); renderCarrito(); }
    else if (d.anular) anularVenta(Number(d.anular));
    else if (t.hasAttribute('data-cerrar')) cerrarModal();
  });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalAbierto()) cerrarModal(); });

  $('btnVaciar').addEventListener('click', () => { if (state.cart.length && confirm('¿Vaciar el carrito?')) { state.cart = []; renderCarrito(); } });
  $('btnCobrar').addEventListener('click', registrarVenta);
  $('btnHistorial').addEventListener('click', abrirHistorial);
  ['selIva', 'selPago', 'inpRecibido'].forEach((id) => $(id).addEventListener('input', actualizarTotales));
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------
(async function init() {
  if (!supabase) { toast('Falta configurar Supabase', 'error'); return; }
  if (!(await requerirSesion())) return;
  enlazarEventos();
  await cargarDatos();
  renderCarrito();
  focusScan();
})();
