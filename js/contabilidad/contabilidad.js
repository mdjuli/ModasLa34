// js/contabilidad/contabilidad.js — Módulo de contabilidad de ModasLa34
// Pestañas: Resumen · Compras · Gastos · Proveedores · Asientos · Plan de cuentas · Reportes · Periodos
// Usa las tablas reales: compras, gastos, proveedores, ventas, variantes_producto, plan_cuentas,
// asientos_contables, lineas_asiento, periodos_contables y las funciones SQL contabilizar_asiento / saldo_cuenta.

import * as cfg from '../supabase-config.js';
import { crearAsiento, crearAsientoGasto, crearAsientoCompra } from './asiento-auto.js';

const supabase = [cfg.supabase, cfg.supabaseClient, cfg.sb, cfg.default, window.supabaseClient, window.supabase]
  .find((c) => c && typeof c.from === 'function');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => COP.format(Number(n) || 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoy = () => new Date().toLocaleDateString('en-CA');
const mesActual = () => hoy().slice(0, 7);
const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };

function toast(msg, tipo = 'info') {
  const colores = { info: 'bg-stone-800', ok: 'bg-emerald-700', error: 'bg-red-700', warn: 'bg-amber-600' };
  const el = document.createElement('div');
  el.className = `toast ${colores[tipo] || colores.info} text-white text-sm px-4 py-2 rounded-lg shadow-lg max-w-sm`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 7000 : 3500);
}

function errMsg(e) {
  const m = e?.message || String(e);
  if (e?.code === '42501' || /row-level security/i.test(m)) {
    return 'La base de datos bloqueó la operación (RLS). Falta crear las políticas de esa tabla; revisa el SQL de políticas del README.';
  }
  if (e?.code === '23505') return 'Ya existe un registro con ese valor único.';
  return m;
}

/** Rangos de un mes 'YYYY-MM' → fechas (date) y timestamps locales */
function rangoMes(m) {
  const [y, mm] = m.split('-').map(Number);
  const ini = `${m}-01`;
  const sig = new Date(Date.UTC(y, mm, 1)).toISOString().slice(0, 10);
  const fin = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
  return { ini, sig, fin, tsIni: new Date(ini + 'T00:00:00').toISOString(), tsSig: new Date(sig + 'T00:00:00').toISOString() };
}

/** Tabla HTML. Un encabezado que empieza con '>' se alinea a la derecha. */
function tabla(heads, rows, vacio = 'Sin registros') {
  if (!rows.length) return `<p class="text-stone-400 text-center py-8">${vacio}</p>`;
  const right = heads.map((h) => h.startsWith('>'));
  return `<div class="overflow-x-auto"><table class="w-full text-sm">
    <thead class="text-left text-xs uppercase text-stone-500 border-b"><tr>
      ${heads.map((h, i) => `<th class="py-2 pr-3 ${right[i] ? 'text-right' : ''}">${esc(h.replace(/^>/, ''))}</th>`).join('')}
    </tr></thead>
    <tbody class="divide-y">${rows.map((r) => `<tr class="align-top">${r.map((c, i) => `<td class="py-2 pr-3 ${right[i] ? 'text-right whitespace-nowrap' : ''}">${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

const card = (titulo, valor, sub = '') => `<div class="bg-white rounded-xl shadow-sm p-4">
  <div class="text-xs text-stone-500 uppercase">${titulo}</div><div class="text-xl font-bold mt-1">${valor}</div>${sub ? `<div class="text-xs text-stone-500 mt-1">${sub}</div>` : ''}</div>`;

const btn = (act, id, texto, cls = 'text-blue-700') => `<button data-act="${act}" data-id="${id}" class="${cls} underline text-xs mr-2">${texto}</button>`;
const panel = (html) => `<div class="bg-white rounded-xl shadow-sm p-4">${html}</div>`;
const barra = (titulo, extra = '') => `<div class="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 class="font-semibold">${titulo}</h2><div class="flex flex-wrap items-center gap-2">${extra}</div></div>`;
const botonNuevo = (act, txt) => `<button data-act="${act}" class="px-3 py-1.5 rounded bg-stone-900 text-white text-sm hover:bg-stone-700">${txt}</button>`;

// ---------------------------------------------------------------------------
// Modal + formulario genérico
// ---------------------------------------------------------------------------
function abrirModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); $('modal').classList.add('flex'); }
function cerrarModal() { $('modal').classList.add('hidden'); $('modal').classList.remove('flex'); }

function campoHtml(c, valor) {
  const v = valor ?? c.default ?? '';
  const base = 'mt-1 w-full border rounded px-2 py-1.5';
  const full = c.full ? 'col-span-2' : '';
  let input;
  if (c.type === 'select') {
    input = `<select name="${c.name}" class="${base}" ${c.required ? 'required' : ''}>
      ${c.required ? '' : '<option value=""></option>'}
      ${c.options.map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
  } else if (c.type === 'checkbox') {
    return `<label class="flex items-center gap-2 ${full}"><input type="checkbox" name="${c.name}" ${v ? 'checked' : ''}/> ${esc(c.label)}</label>`;
  } else if (c.type === 'textarea') {
    input = `<textarea name="${c.name}" rows="2" class="${base}">${esc(v)}</textarea>`;
  } else {
    input = `<input name="${c.name}" type="${c.type || 'text'}" value="${esc(v)}" ${c.step ? `step="${c.step}"` : ''} ${c.min != null ? `min="${c.min}"` : ''} ${c.required ? 'required' : ''} class="${base}" ${c.readonly ? 'readonly' : ''}/>`;
  }
  return `<label class="block ${full}">${esc(c.label)}${c.required ? ' *' : ''}${input}</label>`;
}

function formModal({ titulo, campos, valores = {}, guardar, ayuda = '' }) {
  abrirModal(`
    <div class="flex justify-between items-center mb-3"><h3 class="font-semibold">${esc(titulo)}</h3><button data-act="cerrar" class="text-stone-400">✕</button></div>
    ${ayuda ? `<p class="text-xs text-stone-500 mb-3">${ayuda}</p>` : ''}
    <form id="frm" class="grid grid-cols-2 gap-3 text-sm">
      ${campos.map((c) => campoHtml(c, valores[c.name])).join('')}
      <p id="frmErr" class="col-span-2 text-red-700 text-xs"></p>
      <div class="col-span-2 flex justify-end gap-2">
        <button type="button" data-act="cerrar" class="px-3 py-1.5 rounded border">Cancelar</button>
        <button type="submit" class="px-3 py-1.5 rounded bg-stone-900 text-white">Guardar</button>
      </div>
    </form>`);
  $('frm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, v = {};
    for (const c of campos) {
      let val;
      if (c.type === 'checkbox') val = f.elements[c.name].checked;
      else {
        val = f.elements[c.name].value;
        if (c.type === 'number') val = val === '' ? null : Number(val);
        else val = String(val).trim();
        if (val === '') val = null;
      }
      v[c.name] = val;
    }
    const b = f.querySelector('[type=submit]'); b.disabled = true;
    try { await guardar(v); cerrarModal(); await render(); }
    catch (err) { $('frmErr').textContent = errMsg(err); b.disabled = false; }
  });
}

// ---------------------------------------------------------------------------
// Estado y caches
// ---------------------------------------------------------------------------
const state = { tab: 'resumen', mes: mesActual(), cuentas: null, filtroPlan: '' };

async function cuentasPlan() {
  if (!state.cuentas) state.cuentas = await q(supabase.from('plan_cuentas').select('*').order('codigo'));
  return state.cuentas;
}
const cuentasMov = async (tipos) => (await cuentasPlan()).filter((c) => c.permite_movimiento && c.estado === 'activa' && (!tipos || tipos.includes(c.tipo)));
const opcionesCuentas = (lista) => lista.map((c) => ({ v: c.codigo, t: `${c.codigo} · ${c.nombre}` }));

/** Mapa transaccion_id → número de asiento (para saber qué compras/gastos ya están contabilizados) */
async function asientosDe(origen) {
  try {
    const rows = await q(supabase.from('asientos_contables').select('transaccion_id, numero').eq('transaccion_origen', origen).neq('estado', 'anulado'));
    return new Map(rows.map((r) => [r.transaccion_id, r.numero]));
  } catch (e) { console.warn(e); toast('No se pudieron leer los asientos: ' + errMsg(e), 'warn'); return new Map(); }
}

// ---------------------------------------------------------------------------
// Sesión y permisos (solo administrador)
// ---------------------------------------------------------------------------
async function requerirAdmin() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (!user) { window.location.href = 'login.html'; return false; }
  try {
    const p = await q(supabase.from('perfiles').select('rol, rol_usuario').eq('id', user.id).maybeSingle());
    const ok = p && (p.rol === 'admin' || p.rol_usuario === 'admin_total');
    if (!ok) { $('vista').innerHTML = panel('<p class="text-red-700">Solo el administrador puede entrar a Contabilidad.</p><a class="underline" href="ventas.html">Ir a la caja</a>'); return false; }
  } catch (e) { toast('No se pudo verificar tu rol: ' + errMsg(e), 'error'); return false; }
  return true;
}

// ===========================================================================
// RESUMEN
// ===========================================================================
async function vistaResumen() {
  const r = rangoMes(state.mes);
  const [ventas, compras, gastos] = await Promise.all([
    q(supabase.from('ventas').select('total, subtotal, iva').eq('estado', 'completada').gte('fecha', r.tsIni).lt('fecha', r.tsSig)),
    q(supabase.from('compras').select('total, estado').gte('fecha', r.ini).lt('fecha', r.sig)),
    q(supabase.from('gastos').select('monto, categoria').gte('fecha', r.ini).lt('fecha', r.sig)),
  ]);
  const ing = ventas.reduce((a, v) => a + Number(v.total), 0);
  const iva = ventas.reduce((a, v) => a + Number(v.iva || 0), 0);
  const com = compras.reduce((a, c) => a + Number(c.total), 0);
  const porPagar = compras.filter((c) => c.estado !== 'Pagada').reduce((a, c) => a + Number(c.total), 0);
  const gas = gastos.reduce((a, g) => a + Number(g.monto), 0);
  const porCat = {};
  gastos.forEach((g) => { porCat[g.categoria] = (porCat[g.categoria] || 0) + Number(g.monto); });

  $('vista').innerHTML = `
    ${barra('Resumen del mes', `<input id="mesSel" type="month" value="${state.mes}" class="border rounded px-2 py-1 text-sm"/>`)}
    <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      ${card('Ventas', money(ing), `${ventas.length} ventas`)}
      ${card('IVA generado', money(iva))}
      ${card('Compras', money(com), porPagar ? `Por pagar: ${money(porPagar)}` : 'Todo pagado')}
      ${card('Gastos', money(gas))}
      ${card('Resultado (simple)', `<span class="${ing - iva - com - gas < 0 ? 'text-red-700' : 'text-emerald-700'}">${money(ing - iva - com - gas)}</span>`, 'Ventas − IVA − compras − gastos')}
    </div>
    ${panel(`<h3 class="font-medium mb-2">Gastos por categoría</h3>${tabla(['Categoría', '>Total'], Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [esc(k), money(v)]), 'Sin gastos este mes')}`)}
    <p class="text-xs text-stone-500 mt-2">Este resumen sale de ventas, compras y gastos. Los reportes contables (pestaña Reportes) salen de los asientos contabilizados.</p>`;
  $('mesSel').addEventListener('change', (e) => { state.mes = e.target.value || mesActual(); render(); });
}

// ===========================================================================
// PROVEEDORES
// ===========================================================================
const camposProveedor = [
  { name: 'nombre', label: 'Nombre', required: true, full: true },
  { name: 'contacto', label: 'Contacto' }, { name: 'telefono', label: 'Teléfono' },
  { name: 'email', label: 'Correo', type: 'email' }, { name: 'direccion', label: 'Dirección' },
];

async function vistaProveedores() {
  const rows = await q(supabase.from('proveedores').select('*').order('nombre'));
  $('vista').innerHTML = panel(barra('Proveedores', botonNuevo('prov-nuevo', '+ Proveedor')) +
    tabla(['Nombre', 'Contacto', 'Teléfono', 'Correo', ''], rows.map((p) => [esc(p.nombre), esc(p.contacto), esc(p.telefono), esc(p.email),
      btn('prov-editar', p.id, 'Editar') + btn('prov-borrar', p.id, 'Eliminar', 'text-red-700')]), 'Aún no hay proveedores'));
  state.proveedores = rows;
}

// ===========================================================================
// COMPRAS
// ===========================================================================
const ESTADOS_COMPRA = ['Pendiente', 'Recibida', 'Pagada'];

async function opcionesVariantes() {
  const vs = await q(supabase.from('variantes_producto').select('id, talla, colores, productos_base(nombre)').order('producto_id'));
  state.variantesCache = vs;
  return vs.map((v) => ({ v: v.id, t: `${v.productos_base?.nombre ?? 'Producto'} · ${v.talla} (stock ${v.colores?.length ? v.colores.reduce((a, c) => a + (Number(c.stock) || 0), 0) : 0})` }));
}

/** Suma stock a una variante (entrada de inventario por compra) con bloqueo optimista */
async function sumarStock(varianteId, colorNombre, cantidad) {
  const v = await q(supabase.from('variantes_producto').select('id, colores, stock_total').eq('id', varianteId).single());
  const colores = Array.isArray(v.colores) ? v.colores.map((c) => ({ ...c })) : [];
  let nuevoTotal;
  if (!colores.length) nuevoTotal = (Number(v.stock_total) || 0) + cantidad;
  else {
    let pos = colorNombre ? colores.findIndex((c) => (c.nombre || '').toLowerCase() === colorNombre.toLowerCase()) : -1;
    if (pos < 0 && colores.length === 1) pos = 0;
    if (pos < 0) throw new Error('Indica el color exacto de la variante para sumar el stock (' + colores.map((c) => c.nombre || 'Sin color').join(', ') + ')');
    colores[pos].stock = (Number(colores[pos].stock) || 0) + cantidad;
    nuevoTotal = colores.reduce((a, c) => a + (Number(c.stock) || 0), 0);
  }
  const upd = await q(supabase.from('variantes_producto').update({ colores, stock_total: nuevoTotal }).eq('id', varianteId).eq('stock_total', v.stock_total).select('id'));
  if (!upd.length) throw new Error('El stock cambió mientras se guardaba. Intenta de nuevo.');
}

async function vistaCompras() {
  const [rows, provs, asientos] = await Promise.all([
    q(supabase.from('compras').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }).limit(200)),
    q(supabase.from('proveedores').select('id, nombre').order('nombre')),
    asientosDe('compra'),
  ]);
  state.proveedores = provs; state.compras = rows;
  const pn = (id) => provs.find((p) => p.id === id)?.nombre ?? '—';
  $('vista').innerHTML = panel(barra('Compras', botonNuevo('compra-nueva', '+ Compra')) +
    tabla(['Fecha', 'Proveedor', 'Producto', '>Cant.', '>P. unit.', '>Total', 'Estado', ''], rows.map((c) => [
      c.fecha, esc(pn(c.proveedor_id)), esc(c.producto) + (c.talla ? ` <span class="text-xs text-stone-500">${esc(c.talla)} ${esc(c.color_nombre || '')}</span>` : ''),
      c.cantidad, money(c.precio_unitario), money(c.total),
      `<span class="px-2 py-0.5 rounded text-xs ${c.estado === 'Pagada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${esc(c.estado)}</span>`,
      (c.estado !== 'Pagada' ? btn('compra-pagar', c.id, 'Marcar pagada') : '') +
      (asientos.has(c.id) ? `<span class="text-xs text-stone-500 mr-2">✓ ${esc(asientos.get(c.id))}</span>` : btn('compra-asiento', c.id, 'Contabilizar')) +
      btn('compra-borrar', c.id, 'Eliminar', 'text-red-700'),
    ]), 'Aún no hay compras'));
}

async function nuevaCompra() {
  const [provs, vars, cuentas] = await Promise.all([
    q(supabase.from('proveedores').select('id, nombre').order('nombre')), opcionesVariantes(), cuentasMov(['COSTO', 'GASTO']),
  ]);
  formModal({
    titulo: 'Nueva compra',
    ayuda: 'Si eliges una variante y marcas “Sumar al inventario”, el stock aumenta al guardar (no lo marques si ya cargaste ese stock a mano).',
    campos: [
      { name: 'proveedor_id', label: 'Proveedor', type: 'select', required: true, options: provs.map((p) => ({ v: p.id, t: p.nombre })) },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, default: hoy() },
      { name: 'variante_id', label: 'Variante del inventario (opcional)', type: 'select', options: vars, full: true },
      { name: 'producto', label: 'Descripción del producto', full: true },
      { name: 'color_nombre', label: 'Color (si la variante tiene varios)' },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 1, step: 1 },
      { name: 'precio_unitario', label: 'Precio unitario', type: 'number', required: true, min: 0, step: 'any' },
      { name: 'estado', label: 'Estado', type: 'select', required: true, options: ESTADOS_COMPRA.map((e) => ({ v: e, t: e })), default: 'Pendiente' },
      { name: 'puc', label: 'Cuenta (PUC)', type: 'select', required: true, options: opcionesCuentas(cuentas), default: '620501' },
      { name: 'sumar', label: 'Sumar al inventario', type: 'checkbox', full: true },
    ],
    guardar: async (v) => {
      const variante = v.variante_id ? state.variantesCache.find((x) => x.id === Number(v.variante_id)) : null;
      const producto = v.producto || (variante ? `${variante.productos_base?.nombre} ${variante.talla}` : null);
      if (!producto) throw new Error('Escribe la descripción o elige una variante');
      if (!(v.cantidad > 0)) throw new Error('La cantidad debe ser mayor a 0');
      if (v.sumar && !variante) throw new Error('Para sumar al inventario debes elegir la variante');
      const fila = {
        proveedor_id: Number(v.proveedor_id), fecha: v.fecha, producto, cantidad: v.cantidad, precio_unitario: v.precio_unitario,
        total: Math.round(v.cantidad * v.precio_unitario * 100) / 100, estado: v.estado, puc: v.puc,
        variante_id: variante?.id ?? null, producto_id: variante ? (await q(supabase.from('variantes_producto').select('producto_id').eq('id', variante.id).single())).producto_id : null,
        talla: variante?.talla ?? null, color_nombre: v.color_nombre,
      };
      if (v.sumar) await sumarStock(variante.id, v.color_nombre, v.cantidad); // Entrada de inventario
      try { await q(supabase.from('compras').insert(fila)); }
      catch (e) { if (v.sumar) await sumarStock(variante.id, v.color_nombre, -v.cantidad).catch(() => {}); throw e; }
      toast('Compra registrada' + (v.sumar ? ' y stock actualizado' : ''), 'ok');
    },
  });
}

// ===========================================================================
// GASTOS
// ===========================================================================
const CATEGORIAS_GASTO = ['Arriendo', 'Servicios públicos', 'Nómina', 'Publicidad', 'Transporte', 'Mantenimiento', 'Impuestos', 'Otros'];
const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta'];

async function vistaGastos() {
  const r = rangoMes(state.mes);
  const [rows, asientos] = await Promise.all([
    q(supabase.from('gastos').select('*').gte('fecha', r.ini).lt('fecha', r.sig).order('fecha', { ascending: false }).order('id', { ascending: false })),
    asientosDe('gasto'),
  ]);
  state.gastos = rows;
  const total = rows.reduce((a, g) => a + Number(g.monto), 0);
  $('vista').innerHTML = panel(barra(`Gastos · ${money(total)}`,
    `<input id="mesSel" type="month" value="${state.mes}" class="border rounded px-2 py-1 text-sm"/>${botonNuevo('gasto-nuevo', '+ Gasto')}`) +
    tabla(['Fecha', 'Concepto', 'Categoría', 'Pago', 'PUC', '>Monto', ''], rows.map((g) => [
      g.fecha, esc(g.concepto), esc(g.categoria), esc(g.metodo_pago), esc(g.puc), money(g.monto),
      (asientos.has(g.id) ? `<span class="text-xs text-stone-500 mr-2">✓ ${esc(asientos.get(g.id))}</span>` : btn('gasto-asiento', g.id, 'Contabilizar')) +
      btn('gasto-editar', g.id, 'Editar') + btn('gasto-borrar', g.id, 'Eliminar', 'text-red-700'),
    ]), 'Sin gastos en este mes'));
  $('mesSel').addEventListener('change', (e) => { state.mes = e.target.value || mesActual(); render(); });
}

async function formGasto(g) {
  const cuentas = await cuentasMov(['GASTO']);
  formModal({
    titulo: g ? 'Editar gasto' : 'Nuevo gasto', valores: g || {},
    campos: [
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, default: hoy() },
      { name: 'monto', label: 'Monto', type: 'number', required: true, min: 1, step: 'any' },
      { name: 'concepto', label: 'Concepto', required: true, full: true },
      { name: 'categoria', label: 'Categoría', type: 'select', required: true, options: CATEGORIAS_GASTO.map((c) => ({ v: c, t: c })) },
      { name: 'metodo_pago', label: 'Método de pago', type: 'select', required: true, options: METODOS.map((m) => ({ v: m, t: m })), default: 'Efectivo' },
      { name: 'puc', label: 'Cuenta (PUC)', type: 'select', required: true, options: opcionesCuentas(cuentas), default: '519595', full: true },
    ],
    guardar: async (v) => {
      if (!(v.monto > 0)) throw new Error('El monto debe ser mayor a 0');
      if (g) await q(supabase.from('gastos').update(v).eq('id', g.id));
      else await q(supabase.from('gastos').insert(v));
      toast('Gasto guardado', 'ok');
    },
  });
}

// ===========================================================================
// ASIENTOS
// ===========================================================================
async function vistaAsientos() {
  const f = state.filtroAsientos || { estado: '', mes: '' };
  let qy = supabase.from('asientos_contables').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }).limit(200);
  if (f.estado) qy = qy.eq('estado', f.estado);
  if (f.mes) qy = qy.eq('periodo', f.mes);
  const rows = await q(qy);
  const badge = { borrador: 'bg-stone-200 text-stone-700', contabilizado: 'bg-emerald-100 text-emerald-800', anulado: 'bg-red-100 text-red-800' };
  $('vista').innerHTML = panel(barra('Asientos contables', `
      <select id="fEstado" class="border rounded px-2 py-1 text-sm"><option value="">Todos</option>
        ${['borrador', 'contabilizado', 'anulado'].map((s) => `<option ${f.estado === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input id="fMes" type="month" value="${f.mes}" class="border rounded px-2 py-1 text-sm"/>
      ${botonNuevo('asiento-nuevo', '+ Asiento manual')}`) +
    tabla(['N.º', 'Fecha', 'Concepto', 'Tercero', '>Débito', '>Crédito', 'Estado', ''], rows.map((a) => [
      esc(a.numero), a.fecha, esc(a.concepto), esc(a.tercero), money(a.total_debito), money(a.total_credito),
      `<span class="px-2 py-0.5 rounded text-xs ${badge[a.estado]}">${a.estado}</span>`,
      btn('asiento-ver', a.id, 'Ver') +
      (a.estado === 'borrador' ? btn('asiento-contab', a.id, 'Contabilizar') + btn('asiento-borrar', a.id, 'Eliminar', 'text-red-700') : '') +
      (a.estado === 'contabilizado' ? btn('asiento-anular', a.id, 'Anular', 'text-red-700') : ''),
    ]), 'No hay asientos con ese filtro'));
  $('fEstado').addEventListener('change', (e) => { state.filtroAsientos = { ...f, estado: e.target.value }; render(); });
  $('fMes').addEventListener('change', (e) => { state.filtroAsientos = { ...f, mes: e.target.value }; render(); });
}

async function verAsiento(id) {
  const [a, lineas] = await Promise.all([
    q(supabase.from('asientos_contables').select('*').eq('id', id).single()),
    q(supabase.from('lineas_asiento').select('*').eq('asiento_id', id).order('orden')),
  ]);
  abrirModal(`
    <div class="flex justify-between items-center mb-2"><h3 class="font-semibold">${esc(a.numero)} · ${a.estado}</h3><button data-act="cerrar" class="text-stone-400">✕</button></div>
    <p class="text-sm mb-3">${a.fecha} · ${esc(a.concepto)}${a.tercero ? ' · ' + esc(a.tercero) : ''}${a.referencia ? ' · Ref. ' + esc(a.referencia) : ''}</p>
    ${tabla(['Cuenta', 'Descripción', '>Débito', '>Crédito'], lineas.map((l) => [`${esc(l.codigo_cuenta)} · ${esc(l.nombre_cuenta)}`, esc(l.descripcion), l.debito > 0 ? money(l.debito) : '', l.credito > 0 ? money(l.credito) : '']))}
    <p class="text-right font-semibold mt-2">Débito ${money(a.total_debito)} · Crédito ${money(a.total_credito)}</p>`);
}

async function nuevoAsiento() {
  const cuentas = await cuentasMov();
  const opts = `<option value="">— cuenta —</option>` + cuentas.map((c) => `<option value="${c.codigo}">${c.codigo} · ${esc(c.nombre)}</option>`).join('');
  const filaLinea = () => `<tr class="linea">
    <td class="pr-2 py-1"><select class="lc w-full border rounded px-1 py-1">${opts}</select></td>
    <td class="pr-2"><input class="ld w-full border rounded px-1 py-1" placeholder="Descripción"/></td>
    <td class="pr-2"><input class="lb w-28 border rounded px-1 py-1 text-right" type="number" min="0" step="any"/></td>
    <td class="pr-2"><input class="lk w-28 border rounded px-1 py-1 text-right" type="number" min="0" step="any"/></td>
    <td><button type="button" data-act="linea-quitar" class="text-stone-400">✕</button></td></tr>`;

  abrirModal(`
    <div class="flex justify-between items-center mb-3"><h3 class="font-semibold">Nuevo asiento manual</h3><button data-act="cerrar" class="text-stone-400">✕</button></div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-3">
      <label>Fecha *<input id="aFecha" type="date" value="${hoy()}" class="mt-1 w-full border rounded px-2 py-1.5"/></label>
      <label>Referencia<input id="aRef" class="mt-1 w-full border rounded px-2 py-1.5"/></label>
      <label class="col-span-2">Concepto *<input id="aConcepto" class="mt-1 w-full border rounded px-2 py-1.5"/></label>
      <label class="col-span-2">Tercero<input id="aTercero" class="mt-1 w-full border rounded px-2 py-1.5"/></label>
    </div>
    <table class="w-full text-sm"><thead class="text-xs text-stone-500 text-left"><tr><th>Cuenta</th><th>Descripción</th><th class="text-right">Débito</th><th class="text-right">Crédito</th><th></th></tr></thead>
      <tbody id="lineas">${filaLinea()}${filaLinea()}</tbody></table>
    <button type="button" data-act="linea-agregar" class="text-sm underline mt-2">+ Agregar línea</button>
    <div id="aCuadre" class="mt-3 text-sm"></div>
    <p id="aErr" class="text-red-700 text-xs mt-2"></p>
    <div class="flex justify-end gap-2 mt-3">
      <button type="button" data-act="cerrar" class="px-3 py-1.5 rounded border">Cancelar</button>
      <button type="button" id="aBorrador" class="px-3 py-1.5 rounded border border-stone-800">Guardar borrador</button>
      <button type="button" id="aContab" class="px-3 py-1.5 rounded bg-stone-900 text-white">Guardar y contabilizar</button>
    </div>`);
  const leer = () => [...document.querySelectorAll('#lineas .linea')].map((tr) => ({
    codigo: tr.querySelector('.lc').value, descripcion: tr.querySelector('.ld').value,
    debito: Number(tr.querySelector('.lb').value) || 0, credito: Number(tr.querySelector('.lk').value) || 0,
  }));
  const cuadre = () => {
    const l = leer(); const d = l.reduce((a, x) => a + x.debito, 0), c = l.reduce((a, x) => a + x.credito, 0);
    const ok = Math.abs(d - c) < 0.01 && d > 0;
    $('aCuadre').innerHTML = `Débito <b>${money(d)}</b> · Crédito <b>${money(c)}</b> · <span class="${ok ? 'text-emerald-700' : 'text-red-700'}">${ok ? 'Cuadrado ✓' : 'Diferencia ' + money(d - c)}</span>`;
  };
  $('modalBody').addEventListener('input', cuadre); cuadre();

  const guardar = async (contabilizar) => {
    $('aErr').textContent = '';
    try {
      await crearAsiento({
        tipo: 'manual', fecha: $('aFecha').value, concepto: $('aConcepto').value, referencia: $('aRef').value || null,
        tercero: $('aTercero').value || null, lineas: leer(), contabilizar,
      });
      cerrarModal(); toast(contabilizar ? 'Asiento contabilizado' : 'Borrador guardado', 'ok'); await render();
    } catch (e) { $('aErr').textContent = errMsg(e); }
  };
  $('aBorrador').addEventListener('click', () => guardar(false));
  $('aContab').addEventListener('click', () => guardar(true));
}

async function contabilizarAsiento(id) {
  const r = await q(supabase.rpc('contabilizar_asiento', { p_asiento_id: id }));
  if (r?.error) throw new Error(r.error + (r.diferencia ? ` (diferencia ${money(r.diferencia)})` : ''));
  toast('Asiento contabilizado', 'ok');
}

// ===========================================================================
// PLAN DE CUENTAS
// ===========================================================================
async function vistaPlan() {
  state.cuentas = null;
  const cuentas = await cuentasPlan();
  const f = state.filtroPlan.toLowerCase();
  const lista = cuentas.filter((c) => !f || c.codigo.startsWith(f) || c.nombre.toLowerCase().includes(f));
  $('vista').innerHTML = panel(barra('Plan de cuentas', `<input id="fPlan" placeholder="Buscar código o nombre" value="${esc(state.filtroPlan)}" class="border rounded px-2 py-1 text-sm"/>${botonNuevo('cuenta-nueva', '+ Cuenta')}`) +
    tabla(['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Mov.', 'Estado', ''], lista.map((c) => [
      `<span style="padding-left:${(c.nivel || 1) * 8 - 8}px" class="font-mono">${esc(c.codigo)}</span>`,
      c.permite_movimiento ? esc(c.nombre) : `<b>${esc(c.nombre)}</b>`, c.tipo, c.naturaleza, c.permite_movimiento ? 'Sí' : 'Título', c.estado,
      btn('cuenta-editar', c.id, 'Editar') + btn('cuenta-toggle', c.id, c.estado === 'activa' ? 'Desactivar' : 'Activar', 'text-stone-600'),
    ])));
  $('fPlan').addEventListener('input', (e) => { state.filtroPlan = e.target.value; clearTimeout(state.t); state.t = setTimeout(vistaPlan, 250); });
}

function formCuenta(c) {
  formModal({
    titulo: c ? 'Editar cuenta' : 'Nueva cuenta', valores: c || { permite_movimiento: true, estado: 'activa' },
    campos: [
      { name: 'codigo', label: 'Código', required: true, readonly: !!c },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO', 'COSTO'].map((t) => ({ v: t, t })) },
      { name: 'naturaleza', label: 'Naturaleza', type: 'select', required: true, options: ['DEUDORA', 'ACREEDORA'].map((t) => ({ v: t, t })) },
      { name: 'permite_movimiento', label: 'Permite movimientos (no es cuenta título)', type: 'checkbox', full: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    ],
    guardar: async (v) => {
      if (c) { await q(supabase.from('plan_cuentas').update({ nombre: v.nombre, tipo: v.tipo, naturaleza: v.naturaleza, permite_movimiento: v.permite_movimiento, descripcion: v.descripcion }).eq('id', c.id)); }
      else {
        if (!/^\d+$/.test(v.codigo)) throw new Error('El código debe ser numérico');
        const todas = await cuentasPlan();
        const padre = todas.filter((x) => v.codigo.startsWith(x.codigo) && x.codigo !== v.codigo).sort((a, b) => b.codigo.length - a.codigo.length)[0];
        const nivel = v.codigo.length <= 1 ? 1 : v.codigo.length <= 2 ? 2 : v.codigo.length <= 4 ? 3 : 4;
        await q(supabase.from('plan_cuentas').insert({ ...v, nivel, padre_id: padre?.id ?? null, cuenta_padre_id: padre?.id ?? null, estado: 'activa' }));
      }
      state.cuentas = null; toast('Cuenta guardada', 'ok');
    },
  });
}

// ===========================================================================
// REPORTES (sobre asientos contabilizados)
// ===========================================================================
async function lineasContabilizadas(desde, hasta, cuentaId) {
  let qy = supabase.from('lineas_asiento')
    .select('cuenta_id, codigo_cuenta, nombre_cuenta, debito, credito, descripcion, asientos_contables!inner(numero, fecha, concepto, estado)')
    .eq('asientos_contables.estado', 'contabilizado').gte('asientos_contables.fecha', desde).lte('asientos_contables.fecha', hasta).limit(5000);
  if (cuentaId) qy = qy.eq('cuenta_id', cuentaId);
  return q(qy);
}

async function vistaReportes() {
  const r = rangoMes(state.mes);
  const desde = state.desde || r.ini, hasta = state.hasta || r.fin;
  const lineas = await lineasContabilizadas(desde, hasta);
  const por = {};
  lineas.forEach((l) => {
    const k = l.codigo_cuenta; por[k] ||= { codigo: k, nombre: l.nombre_cuenta, d: 0, c: 0 };
    por[k].d += Number(l.debito); por[k].c += Number(l.credito);
  });
  const cts = Object.values(por).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const sd = (x) => (x.d > x.c ? x.d - x.c : 0), sc = (x) => (x.c > x.d ? x.c - x.d : 0);
  const tot = cts.reduce((a, x) => ({ d: a.d + x.d, c: a.c + x.c, sd: a.sd + sd(x), sc: a.sc + sc(x) }), { d: 0, c: 0, sd: 0, sc: 0 });
  const sumClase = (n, deud) => cts.filter((x) => x.codigo.startsWith(n)).reduce((a, x) => a + (deud ? x.d - x.c : x.c - x.d), 0);
  const ingresos = sumClase('4', false), costos = sumClase('6', true), gastos = sumClase('5', true);
  const cuentas = await cuentasMov();

  $('vista').innerHTML = `
    ${barra('Reportes contables', `<label class="text-sm">Desde <input id="rDesde" type="date" value="${desde}" class="border rounded px-2 py-1"/></label>
      <label class="text-sm">Hasta <input id="rHasta" type="date" value="${hasta}" class="border rounded px-2 py-1"/></label>`)}
    <div class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">${panel(`<h3 class="font-medium mb-2">Balance de prueba</h3>${tabla(['Cuenta', '>Débitos', '>Créditos', '>Saldo deudor', '>Saldo acreedor'],
        cts.map((x) => [`${esc(x.codigo)} · ${esc(x.nombre)}`, money(x.d), money(x.c), sd(x) ? money(sd(x)) : '', sc(x) ? money(sc(x)) : '']).concat(cts.length ? [[`<b>TOTALES</b>`, `<b>${money(tot.d)}</b>`, `<b>${money(tot.c)}</b>`, `<b>${money(tot.sd)}</b>`, `<b>${money(tot.sc)}</b>`]] : []),
        'No hay asientos contabilizados en este rango')}`)}</div>
      <div>${panel(`<h3 class="font-medium mb-2">Estado de resultados</h3>${tabla(['Concepto', '>Valor'], [
        ['Ingresos (4)', money(ingresos)], ['Costos (6)', money(-costos)], ['Gastos (5)', money(-gastos)],
        ['<b>Utilidad</b>', `<b class="${ingresos - costos - gastos < 0 ? 'text-red-700' : 'text-emerald-700'}">${money(ingresos - costos - gastos)}</b>`]])}`)}</div>
    </div>
    <div class="mt-4">${panel(`<h3 class="font-medium mb-2">Libro mayor</h3>
      <select id="rCuenta" class="border rounded px-2 py-1 text-sm mb-3"><option value="">— elige una cuenta —</option>${cuentas.map((c) => `<option value="${c.id}">${c.codigo} · ${esc(c.nombre)}</option>`).join('')}</select>
      <div id="mayor"></div>`)}</div>`;

  const cambiar = () => { state.desde = $('rDesde').value; state.hasta = $('rHasta').value; render(); };
  $('rDesde').addEventListener('change', cambiar); $('rHasta').addEventListener('change', cambiar);
  $('rCuenta').addEventListener('change', async (e) => {
    if (!e.target.value) { $('mayor').innerHTML = ''; return; }
    try {
      const ls = await lineasContabilizadas(desde, hasta, Number(e.target.value));
      ls.sort((a, b) => a.asientos_contables.fecha.localeCompare(b.asientos_contables.fecha));
      let acum = 0;
      $('mayor').innerHTML = tabla(['Fecha', 'Asiento', 'Concepto', '>Débito', '>Crédito', '>Saldo (D−C)'], ls.map((l) => {
        acum += Number(l.debito) - Number(l.credito);
        return [l.asientos_contables.fecha, esc(l.asientos_contables.numero), esc(l.asientos_contables.concepto), l.debito > 0 ? money(l.debito) : '', l.credito > 0 ? money(l.credito) : '', money(acum)];
      }), 'Sin movimientos en el rango');
    } catch (err) { toast(errMsg(err), 'error'); }
  });
}

// ===========================================================================
// PERIODOS
// ===========================================================================
async function vistaPeriodos() {
  const rows = await q(supabase.from('periodos_contables').select('*').order('periodo', { ascending: false }));
  $('vista').innerHTML = panel(barra('Periodos contables', botonNuevo('periodo-nuevo', '+ Periodo')) +
    tabla(['Periodo', 'Desde', 'Hasta', 'Estado', ''], rows.map((p) => [p.periodo, p.fecha_inicio, p.fecha_fin,
      `<span class="px-2 py-0.5 rounded text-xs ${p.estado === 'abierto' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200'}">${p.estado}</span>`,
      p.estado === 'abierto' ? btn('periodo-cerrar', p.id, 'Cerrar', 'text-red-700') : btn('periodo-abrir', p.id, 'Reabrir')]),
    'No hay periodos creados (si un mes no está creado, se permite contabilizar en él)') +
    '<p class="text-xs text-stone-500 mt-3">Al cerrar un periodo, el sistema no permite crear asientos con fecha en ese mes.</p>');
}

// ===========================================================================
// Render + eventos
// ===========================================================================
const VISTAS = { resumen: vistaResumen, compras: vistaCompras, gastos: vistaGastos, proveedores: vistaProveedores, asientos: vistaAsientos, plan: vistaPlan, reportes: vistaReportes, periodos: vistaPeriodos };

async function render() {
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.classList.toggle('tab-on', b.dataset.tab === state.tab));
  try { await VISTAS[state.tab](); }
  catch (e) { $('vista').innerHTML = panel(`<p class="text-red-700">${esc(errMsg(e))}</p>`); }
}

const confirmar = (t) => window.confirm(t);
const run = async (fn, ok) => { try { await fn(); if (ok) toast(ok, 'ok'); await render(); } catch (e) { toast(errMsg(e), 'error'); } };

const ACCIONES = {
  cerrar: () => cerrarModal(),
  'prov-nuevo': () => formModal({ titulo: 'Nuevo proveedor', campos: camposProveedor, guardar: async (v) => { await q(supabase.from('proveedores').insert(v)); toast('Proveedor creado', 'ok'); } }),
  'prov-editar': (id) => { const p = state.proveedores.find((x) => x.id === id); formModal({ titulo: 'Editar proveedor', campos: camposProveedor, valores: p, guardar: async (v) => { await q(supabase.from('proveedores').update(v).eq('id', id)); toast('Proveedor actualizado', 'ok'); } }); },
  'prov-borrar': (id) => confirmar('¿Eliminar este proveedor?') && run(() => q(supabase.from('proveedores').delete().eq('id', id)), 'Proveedor eliminado'),

  'compra-nueva': () => nuevaCompra(),
  'compra-pagar': (id) => run(() => q(supabase.from('compras').update({ estado: 'Pagada' }).eq('id', id)), 'Compra marcada como pagada'),
  'compra-asiento': (id) => run(async () => { const c = state.compras.find((x) => x.id === id); const p = state.proveedores.find((x) => x.id === c.proveedor_id); await crearAsientoCompra(c, p?.nombre); }, 'Asiento creado'),
  'compra-borrar': (id) => confirmar('¿Eliminar la compra? (No revierte el stock ya sumado.)') && run(() => q(supabase.from('compras').delete().eq('id', id)), 'Compra eliminada'),

  'gasto-nuevo': () => formGasto(null),
  'gasto-editar': (id) => formGasto(state.gastos.find((x) => x.id === id)),
  'gasto-asiento': (id) => run(() => crearAsientoGasto(state.gastos.find((x) => x.id === id)), 'Asiento creado'),
  'gasto-borrar': (id) => confirmar('¿Eliminar este gasto?') && run(() => q(supabase.from('gastos').delete().eq('id', id)), 'Gasto eliminado'),

  'asiento-nuevo': () => nuevoAsiento(),
  'asiento-ver': (id) => verAsiento(id).catch((e) => toast(errMsg(e), 'error')),
  'asiento-contab': (id) => run(() => contabilizarAsiento(id)),
  'asiento-anular': (id) => confirmar('¿Anular este asiento contabilizado?') && run(async () => {
    const a = await q(supabase.from('asientos_contables').select('fecha').eq('id', id).single());
    const per = await q(supabase.from('periodos_contables').select('estado').eq('periodo', a.fecha.slice(0, 7)).maybeSingle());
    if (per?.estado === 'cerrado') throw new Error('El periodo de este asiento está cerrado');
    await q(supabase.from('asientos_contables').update({ estado: 'anulado', anulado_at: new Date().toISOString() }).eq('id', id));
  }, 'Asiento anulado'),
  'asiento-borrar': (id) => confirmar('¿Eliminar este borrador?') && run(async () => {
    await q(supabase.from('lineas_asiento').delete().eq('asiento_id', id));
    await q(supabase.from('asientos_contables').delete().eq('id', id));
  }, 'Borrador eliminado'),
  'linea-agregar': () => { const t = document.querySelector('#lineas .linea'); t.parentNode.insertAdjacentHTML('beforeend', `<tr class="linea">${t.innerHTML}</tr>`); const n = t.parentNode.lastElementChild; n.querySelectorAll('input').forEach((i) => (i.value = '')); n.querySelector('select').value = ''; },
  'linea-quitar': (_id, el) => { const tbody = el.closest('tbody'); if (tbody.children.length > 2) el.closest('tr').remove(); },

  'cuenta-nueva': () => formCuenta(null),
  'cuenta-editar': (id) => formCuenta(state.cuentas.find((x) => x.id === id)),
  'cuenta-toggle': (id) => run(async () => { const c = state.cuentas.find((x) => x.id === id); await q(supabase.from('plan_cuentas').update({ estado: c.estado === 'activa' ? 'inactiva' : 'activa' }).eq('id', id)); state.cuentas = null; }),

  'periodo-nuevo': () => formModal({
    titulo: 'Nuevo periodo', campos: [{ name: 'mes', label: 'Mes', type: 'month', required: true, default: mesActual() }],
    guardar: async (v) => { const r = rangoMes(v.mes); await q(supabase.from('periodos_contables').insert({ periodo: v.mes, fecha_inicio: r.ini, fecha_fin: r.fin, estado: 'abierto' })); toast('Periodo creado', 'ok'); },
  }),
  'periodo-cerrar': async (id) => {
    if (!confirmar('¿Cerrar el periodo? No podrás crear asientos en ese mes.')) return;
    const { data } = await supabase.auth.getSession();
    run(() => q(supabase.from('periodos_contables').update({ estado: 'cerrado', cerrado_at: new Date().toISOString(), cerrado_by: data?.session?.user?.id ?? null }).eq('id', id)), 'Periodo cerrado');
  },
  'periodo-abrir': (id) => run(() => q(supabase.from('periodos_contables').update({ estado: 'abierto', cerrado_at: null, cerrado_by: null }).eq('id', id)), 'Periodo reabierto'),
};

function enlazar() {
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; render(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) { if (e.target.id === 'modal') cerrarModal(); return; }
    const fn = ACCIONES[b.dataset.act];
    if (fn) fn(b.dataset.id ? Number(b.dataset.id) : null, b);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
}

(async function init() {
  if (!supabase) { $('vista').innerHTML = panel('<p class="text-red-700">Falta configurar Supabase (js/supabase-config.js).</p>'); return; }
  if (!(await requerirAdmin())) return;
  enlazar();
  render();
})();
