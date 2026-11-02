// js/factura.js — Comprobante interno de venta (PDF con jsPDF + jspdf-autotable)
// Se abre como admin/factura.html?id=<ventas.id>. El número es INT-0001 (ventas.id con 4 dígitos).
// Lee el detalle de ventas.notas ("ITEMS_JSON:[...]"); para ventas antiguas muestra el texto de ventas.productos.

import * as cfg from './supabase-config.js';

const supabase = [cfg.supabase, cfg.supabaseClient, cfg.sb, cfg.default, window.supabaseClient, window.supabase]
  .find((c) => c && typeof c.from === 'function');

const TIENDA = {
  nombre: 'ModasLa34',
  rubro: 'Ropa de Dama y Caballero',
  direccion: 'Calle 34 16 40',
  telefono: '3208049635',
  aviso: 'COMPROBANTE INTERNO DE VENTA - NO ES FACTURA FISCAL',
};

const $ = (id) => document.getElementById(id);
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => COP.format(Number(n) || 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const numeroComprobante = (id) => 'INT-' + String(id).padStart(4, '0');
const fmtFecha = (f) => new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

let datos = null; // { venta, items, numero }

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------
function parsearItems(venta) {
  if ((venta.notas || '').startsWith('ITEMS_JSON:')) {
    try {
      return JSON.parse(venta.notas.slice('ITEMS_JSON:'.length)).map((i) => ({
        cantidad: i.cantidad,
        descripcion: `${i.nombre} ${i.talla}${i.color ? ' ' + i.color : ''}`,
        unitario: i.precio_unitario,
        subtotal: i.subtotal,
      }));
    } catch (e) { console.warn('ITEMS_JSON inválido', e); }
  }
  // Venta antigua: sin detalle por ítem
  return [{ cantidad: 1, descripcion: venta.productos || 'Venta', unitario: venta.subtotal ?? venta.total, subtotal: venta.subtotal ?? venta.total }];
}

async function cargar() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!supabase) { $('estado').textContent = 'Falta configurar Supabase.'; return; }
  if (!id) { $('estado').textContent = 'Falta el número de venta en la URL (?id=...).'; return; }

  const { data: ses } = await supabase.auth.getSession();
  if (!ses?.session) { window.location.href = 'login.html'; return; }

  try {
    const { data: venta, error } = await supabase.from('ventas').select('*').eq('id', id).single();
    if (error) throw error;
    datos = { venta, items: parsearItems(venta), numero: numeroComprobante(venta.id) };
    renderPreview();
    $('estado').textContent = venta.estado === 'anulada' ? '⚠ Esta venta está ANULADA.' : '';
  } catch (e) {
    $('estado').textContent = 'No se pudo cargar el comprobante: ' + (e.message || e);
  }
}

// ---------------------------------------------------------------------------
// Vista previa en pantalla
// ---------------------------------------------------------------------------
function renderPreview() {
  const { venta, items, numero } = datos;
  const box = $('ticket');
  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="text-center">
      <div class="text-base font-bold tracking-wider">${esc(TIENDA.nombre.toUpperCase())}</div>
      <div>${esc(TIENDA.rubro)}</div>
      <div>${esc(TIENDA.direccion)} · Tel. ${esc(TIENDA.telefono)}</div>
      <div class="font-bold mt-2 border-y border-dashed py-1">${esc(TIENDA.aviso)}</div>
    </div>
    <div class="mt-2">
      <div>N.º: <b>${numero}</b>${venta.estado === 'anulada' ? ' <b>(ANULADA)</b>' : ''}</div>
      <div>Fecha: ${fmtFecha(venta.fecha)}</div>
      <div>Cliente: ${esc(venta.cliente || 'Consumidor final')}</div>
      ${venta.vendedor ? `<div>Vendedor: ${esc(venta.vendedor)}</div>` : ''}
      <div>Pago: ${esc(venta.metodo_pago || '')}</div>
    </div>
    <table class="w-full mt-2 border-t border-dashed">
      <thead><tr class="text-left"><th class="py-1">Cant</th><th>Descripción</th><th class="text-right">Total</th></tr></thead>
      <tbody>${items.map((i) => `<tr class="align-top"><td class="py-0.5">${i.cantidad}</td>
        <td>${esc(i.descripcion)}<div class="text-stone-500">${money(i.unitario)} c/u</div></td>
        <td class="text-right">${money(i.subtotal)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="border-t border-dashed mt-2 pt-1">
      <div class="flex justify-between"><span>Subtotal</span><span>${money(venta.subtotal ?? venta.total)}</span></div>
      ${Number(venta.iva) > 0 ? `<div class="flex justify-between"><span>IVA ${venta.iva_porcentaje}%</span><span>${money(venta.iva)}</span></div>` : ''}
      <div class="flex justify-between text-sm font-bold"><span>TOTAL</span><span>${money(venta.total)}</span></div>
    </div>
    <div class="text-center mt-3 border-t border-dashed pt-2">¡Gracias por su compra!<br>Documento sin validez fiscal</div>`;
}

// ---------------------------------------------------------------------------
// Generación del PDF
// ---------------------------------------------------------------------------
/** Dibuja el comprobante en `doc`. Devuelve la posición Y final (para ajustar la altura del ticket). */
function dibujar(doc, formato) {
  const { venta, items, numero } = datos;
  const ticket = formato === 'ticket';
  const W = doc.internal.pageSize.getWidth();
  const m = ticket ? 4 : 20;
  const cx = W / 2;
  const fs = ticket ? { t: 11, n: 7.5, s: 6.5 } : { t: 18, n: 10, s: 9 };
  const lh = ticket ? 3.4 : 5;
  let y = ticket ? 6 : 22;

  const centro = (txt, size, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lineas = doc.splitTextToSize(txt, W - m * 2);
    lineas.forEach((l) => { doc.text(l, cx, y, { align: 'center' }); y += lh + (size > 9 ? 1.5 : 0); });
  };
  const izq = (txt, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(fs.n);
    doc.text(txt, m, y); y += lh;
  };
  const linea = () => {
    doc.setLineDashPattern([0.6, 0.6], 0); doc.line(m, y, W - m, y); doc.setLineDashPattern([], 0); y += lh;
  };

  centro(TIENDA.nombre.toUpperCase(), fs.t, true);
  centro(TIENDA.rubro, fs.s);
  centro(`${TIENDA.direccion} · Tel. ${TIENDA.telefono}`, fs.s);
  y += 1; linea();
  centro(TIENDA.aviso, fs.n, true);
  linea();

  izq(`N.º: ${numero}${venta.estado === 'anulada' ? '  (ANULADA)' : ''}`, true);
  izq(`Fecha: ${fmtFecha(venta.fecha)}`);
  izq(`Cliente: ${venta.cliente || 'Consumidor final'}`);
  if (venta.vendedor) izq(`Vendedor: ${venta.vendedor}`);
  izq(`Pago: ${venta.metodo_pago || ''}`);
  y += 1;

  // Tabla de ítems
  const cols = ticket
    ? [{ header: 'Cant', dataKey: 'c' }, { header: 'Descripción', dataKey: 'd' }, { header: 'Total', dataKey: 's' }]
    : [{ header: 'Cant', dataKey: 'c' }, { header: 'Descripción', dataKey: 'd' }, { header: 'V. unitario', dataKey: 'u' }, { header: 'Subtotal', dataKey: 's' }];
  const body = items.map((i) => ({ c: String(i.cantidad), d: i.descripcion, u: money(i.unitario), s: money(i.subtotal) }));
  doc.autoTable({
    startY: y, columns: cols, body,
    theme: ticket ? 'plain' : 'striped',
    margin: { left: m, right: m },
    styles: { fontSize: fs.n - (ticket ? 0.5 : 0), cellPadding: ticket ? 0.6 : 2, font: 'helvetica' },
    headStyles: ticket ? { fontStyle: 'bold', fillColor: false, textColor: 0 } : { fillColor: [41, 37, 36], textColor: 255 },
    columnStyles: ticket
      ? { c: { cellWidth: 8 }, s: { halign: 'right', cellWidth: 17 } }
      : { c: { cellWidth: 16 }, u: { halign: 'right', cellWidth: 32 }, s: { halign: 'right', cellWidth: 32 } },
  });
  y = doc.lastAutoTable.finalY + 3;

  // Totales
  const fila = (a, b, bold = false, size = fs.n) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.text(a, ticket ? m : W - m - 70, y);
    doc.text(b, W - m, y, { align: 'right' });
    y += lh + (bold ? 1 : 0);
  };
  linea();
  fila('Subtotal', money(venta.subtotal ?? venta.total));
  if (Number(venta.iva) > 0) fila(`IVA ${venta.iva_porcentaje}%`, money(venta.iva));
  fila('TOTAL', money(venta.total), true, fs.n + 2);
  y += 2; linea();
  centro('¡Gracias por su compra!', fs.n);
  centro('Documento sin validez fiscal', fs.s);
  return y + 4;
}

function crearPdf(formato) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('No se cargó jsPDF (revisa tu conexión a internet).');
  if (formato === 'a4') {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    dibujar(doc, 'a4');
    return doc;
  }
  // Ticket: primero se dibuja en una hoja alta para medir y luego se crea la hoja con la altura exacta
  const prueba = new jsPDF({ unit: 'mm', format: [80, 600] });
  const alto = Math.max(60, Math.ceil(dibujar(prueba, 'ticket')));
  const doc = new jsPDF({ unit: 'mm', format: [80, alto] });
  dibujar(doc, 'ticket');
  return doc;
}

function descargar(formato) {
  if (!datos) return;
  try {
    const doc = crearPdf(formato);
    doc.save(`${datos.numero}${formato === 'a4' ? '-A4' : ''}.pdf`);
  } catch (e) { alert('No se pudo generar el PDF: ' + (e.message || e)); }
}

function imprimir() { if (datos) window.print(); }

function compartirWhatsapp() {
  if (!datos) return;
  const { venta, numero } = datos;
  const txt = `${TIENDA.nombre} - Comprobante interno ${numero}\nFecha: ${fmtFecha(venta.fecha)}\nTotal: ${money(venta.total)}\n(No es factura fiscal)\n${TIENDA.direccion} · Tel. ${TIENDA.telefono}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}

$('btnTicket').addEventListener('click', () => descargar('ticket'));
$('btnA4').addEventListener('click', () => descargar('a4'));
$('btnImprimir').addEventListener('click', imprimir);
$('btnWhatsapp').addEventListener('click', compartirWhatsapp);
cargar();
