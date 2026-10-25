// ============================================
// PRODUCTOS.JS - Versión mejorada
// ============================================

// ---------- Estado ----------
let productosData = [];
let productosMap = new Map();
let sortColumn = 'nombre';
let sortDirection = 'asc';

const formState = {
  editId: null,
  variantes: [], // { talla, precio_venta, precio_compra, colores: [{nombre, codigo, stock}] }
  ultimoCodigo: null,
};

const configEtiquetas = {
  columnas: 2,
  filas: 4,
  mostrarPrecio: true,
  mostrarBarcode: true,
  margen: 10,
  tamanoFuente: 12,
};

// ---------- Helpers de API ----------
function headersAuth() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  const token = JSON.parse(localStorage.getItem('admin_token') || 'null');
  if (token?.access_token) h.Authorization = `Bearer ${token.access_token}`;
  return h;
}

async function apiGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headersAuth() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...headersAuth(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: headersAuth(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
}

async function apiDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: headersAuth(),
  });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
}

// ---------- Utilidades ----------
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizarHex(valor) {
  let hex = (valor || '').trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (/^#[A-Fa-f0-9]{3}$/.test(hex)) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return /^#[A-Fa-f0-9]{6}$/.test(hex) ? hex.toUpperCase() : null;
}

function getEmojiCategoria(cat) {
  const emojis = {
    vestidos: '👗', blusas: '👚', pantalones: '👖',
    deportivo: '⚽', caballero: '👔', accesorios: '🎀',
  };
  return emojis[cat] || '📦';
}

const PREFIJOS_CODIGO = {
  vestidos: 'VES', blusas: 'BLU', pantalones: 'PAN',
  deportivo: 'DEP', caballero: 'CAB', accesorios: 'ACC',
};

function generarCodigoProducto(categoria) {
  const prefijo = PREFIJOS_CODIGO[categoria] || 'PRO';
  const existentes = productosData
    .filter(p => (p.codigo || '').startsWith(prefijo + '-'))
    .map(p => parseInt(p.codigo.split('-')[1], 10))
    .filter(n => !isNaN(n));
  const siguiente = existentes.length ? Math.max(...existentes) + 1 : 1;
  return `${prefijo}-${String(siguiente).padStart(4, '0')}`;
}

// ---------- Carga ----------
async function cargarProductos() {
  try {
    productosData = await apiGet('vista_productos_completa');
    productosMap = new Map(productosData.map(p => [p.id, p]));
    ordenarProductos('nombre');
    enlazarFiltros();
  } catch (error) {
    console.error('Error cargando productos:', error);
    const tbody = document.querySelector('#tabla-productos tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9">Error al cargar productos</td></tr>';
  }
}

function enlazarFiltros() {
  setTimeout(() => {
    const ids = [
      'search-productos', 'filter-categoria-productos',
      'filter-stock-productos', 'filter-visibilidad',
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.addEventListener('input', aplicarFiltrosProductos);
        el.addEventListener('change', aplicarFiltrosProductos);
        el.dataset.bound = '1';
      }
    });
  }, 100);
}

// ---------- Tabla ----------
function mostrarTablaProductos(productos) {
  const tbody = document.querySelector('#tabla-productos tbody');
  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay productos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = productos.map(p => {
    const variantes = p.variantes || [];
    const totalStock = variantes.reduce((s, v) => s + (v.stock_total || 0), 0);
    const precios = variantes.map(v => v.precio_venta || 0).filter(n => n > 0);
    const precioTexto = precios.length
      ? (Math.min(...precios) === Math.max(...precios)
          ? `$${Math.min(...precios).toLocaleString()}`
          : `$${Math.min(...precios).toLocaleString()} - $${Math.max(...precios).toLocaleString()}`)
      : '-';

    const esVisible = p.visible !== false;
    const img = p.imagen_url
      ? `<img src="${escapeHtml(p.imagen_url)}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">`
      : `<div style="width:50px;height:50px;background:#f5ede8;border-radius:10px;display:flex;align-items:center;justify-content:center;">${getEmojiCategoria(p.categoria)}</div>`;

    return `<tr data-id="${p.id}" data-visible="${esVisible}">
      <td>${img}</td>
      <td>${escapeHtml(p.codigo || '-')}</td>
      <td><strong>${escapeHtml(p.nombre)}</strong></td>
      <td><span style="background:#f5ede8;padding:0.2rem 0.8rem;border-radius:50px;">${escapeHtml(p.categoria || '-')}</span></td>
      <td>${variantes.length} tallas</td>
      <td>${totalStock}</td>
      <td>${precioTexto}</td>
      <td>
        <span class="badge-visible ${esVisible ? 'visible' : 'oculto'}"
              title="${esVisible ? 'Visible en catálogo' : 'Oculto en catálogo'}">
          ${esVisible ? 'Sí' : 'No'}
        </span>
      </td>
      <td>
        <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">Editar</button>
        <button class="action-btn" onclick="verVariantes(${p.id})" title="Variantes">Variantes</button>
        <button class="action-btn" onclick="imprimirEtiquetasProducto(${p.id})" title="Etiquetas">Etiquetas</button>
        <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

// ---------- Formulario: variantes ----------
function renderVariantes() {
  const container = document.getElementById('variantes-container');
  if (!container) return;

  if (formState.variantes.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:0.9rem;">Aún no hay tallas. Agrega la primera.</p>';
    return;
  }

  container.innerHTML = formState.variantes.map((v, i) => `
    <div class="variante-card" data-index="${i}">
      <div class="variante-header" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
        <div>
          <label>Talla:</label>
          <input type="text" value="${escapeHtml(v.talla)}" data-field="talla" data-index="${i}" required>
        </div>
        <div>
          <label>Precio venta:</label>
          <input type="number" value="${v.precio_venta || ''}" data-field="precio" data-index="${i}" step="1000" style="width:120px;">
        </div>
        <button type="button" onclick="duplicarVariante(${i})" class="btn-secondary-sm">Duplicar</button>
        <button type="button" onclick="eliminarVariante(${i})" class="btn-secondary-sm">Quitar talla</button>
      </div>
      <div style="margin-top:0.75rem;">
        <label>Colores y stock:</label>
        ${v.colores.map((c, j) => `
          <div class="color-row" style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem;flex-wrap:wrap;">
            <input type="color" value="${c.codigo || '#d4a5a9'}" data-field="color-codigo" data-i="${i}" data-j="${j}"
                   style="width:45px;height:38px;border-radius:8px;cursor:pointer;">
            <input type="text" value="${escapeHtml(c.codigo || '#d4a5a9')}" data-field="color-hex" data-i="${i}" data-j="${j}"
                   style="width:100px;padding:0.4rem;border:1px solid #f0e4d8;border-radius:8px;" placeholder="#RRGGBB">
            <input type="text" value="${escapeHtml(c.nombre || '')}" data-field="color-nombre" data-i="${i}" data-j="${j}"
                   style="flex:2;min-width:120px;padding:0.4rem;border:1px solid #f0e4d8;border-radius:8px;" placeholder="Nombre (ej: Rojo)">
            <input type="number" value="${c.stock || 0}" data-field="color-stock" data-i="${i}" data-j="${j}" min="0"
                   style="width:80px;padding:0.4rem;border:1px solid #f0e4d8;border-radius:8px;" placeholder="Stock">
            <button type="button" onclick="eliminarColor(${i},${j})" class="btn-secondary-sm">Quitar</button>
          </div>
        `).join('')}
        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button type="button" onclick="agregarColor(${i})" class="btn-secondary-sm">Agregar color</button>
          <button type="button" onclick="agregarSinColor(${i})" class="btn-secondary-sm">Sin color</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', sincronizarDesdeDOM);
    input.addEventListener('change', sincronizarDesdeDOM);
  });
}

function sincronizarDesdeDOM() {
  const container = document.getElementById('variantes-container');
  if (!container) return;

  container.querySelectorAll('.variante-card').forEach(card => {
    const i = parseInt(card.dataset.index, 10);
    const v = formState.variantes[i];
    if (!v) return;

    const talla = card.querySelector('[data-field="talla"]')?.value.trim() || '';
    const precio = parseFloat(card.querySelector('[data-field="precio"]')?.value) || 0;
    v.talla = talla;
    v.precio_venta = precio;

    card.querySelectorAll('[data-field^="color-"]').forEach(input => {
      const j = parseInt(input.dataset.j, 10);
      const c = v.colores[j];
      if (!c) return;
      const campo = input.dataset.field.replace('color-', '');
      if (campo === 'codigo') {
        const hex = normalizarHex(input.value);
        if (hex) c.codigo = hex;
      } else if (campo === 'hex') {
        const hex = normalizarHex(input.value);
        if (hex) c.codigo = hex;
      } else if (campo === 'nombre') {
        c.nombre = input.value.trim();
      } else if (campo === 'stock') {
        c.stock = parseInt(input.value, 10) || 0;
      }
    });
  });
}

function agregarVariante() {
  sincronizarDesdeDOM();
  formState.variantes.push({
    talla: '',
    precio_venta: 0,
    colores: [{ nombre: '', codigo: '#D4A5A9', stock: 0 }],
  });
  renderVariantes();
}

function duplicarVariante(i) {
  sincronizarDesdeDOM();
  const original = formState.variantes[i];
  if (!original) return;
  formState.variantes.splice(i + 1, 0, JSON.parse(JSON.stringify(original)));
  renderVariantes();
}

function eliminarVariante(i) {
  sincronizarDesdeDOM();
  formState.variantes.splice(i, 1);
  renderVariantes();
}

function agregarColor(i) {
  sincronizarDesdeDOM();
  const v = formState.variantes[i];
  if (!v) return;
  v.colores.push({ nombre: '', codigo: '#D4A5A9', stock: 0 });
  renderVariantes();
}

function agregarSinColor(i) {
  sincronizarDesdeDOM();
  const v = formState.variantes[i];
  if (!v) return;
  if (v.colores.some(c => c.nombre === null && c.codigo === null)) {
    mostrarAlerta('Ya existe una opción "Sin color" para esta talla', 'error');
    return;
  }
  v.colores.push({ nombre: null, codigo: null, stock: 0 });
  renderVariantes();
}

function eliminarColor(i, j) {
  sincronizarDesdeDOM();
  const v = formState.variantes[i];
  if (!v) return;
  v.colores.splice(j, 1);
  if (v.colores.length === 0) {
    v.colores.push({ nombre: '', codigo: '#D4A5A9', stock: 0 });
  }
  renderVariantes();
}

// ---------- Validación y guardado ----------
function validarFormulario() {
  const codigo = document.getElementById('producto-codigo')?.value.trim();
  const nombre = document.getElementById('producto-nombre')?.value.trim();
  const categoria = document.getElementById('producto-categoria')?.value;

  if (!codigo || !nombre || !categoria) {
    mostrarAlerta('Código, nombre y categoría son obligatorios', 'error');
    return null;
  }

  sincronizarDesdeDOM();

  const variantes = formState.variantes
    .map(v => {
      const colores = v.colores
        .filter(c => c.nombre !== null || c.codigo !== null || c.stock > 0)
        .map(c => ({
          nombre: c.nombre || null,
          codigo: c.codigo ? normalizarHex(c.codigo) : null,
          stock: c.stock || 0,
        }));
      const coloresFinal = colores.length ? colores : [{ nombre: 'Sin color', codigo: '#D4A5A9', stock: 0 }];
      const stockTotal = coloresFinal.reduce((s, c) => s + c.stock, 0);
      return {
        talla: v.talla,
        precio_venta: v.precio_venta,
        precio_compra: parseFloat(document.getElementById('producto-precio-compra')?.value) || 0,
        colores: coloresFinal,
        stock_total: stockTotal,
      };
    })
    .filter(v => v.talla);

  if (variantes.length === 0) {
    mostrarAlerta('Debe agregar al menos una talla', 'error');
    return null;
  }
  const sinPrecio = variantes.find(v => !v.precio_venta || v.precio_venta <= 0);
  if (sinPrecio) {
    mostrarAlerta(`La talla ${sinPrecio.talla} no tiene precio asignado`, 'error');
    return null;
  }

  return {
    codigo,
    nombre,
    categoria,
    imagen_url: document.getElementById('producto-imagen')?.value.trim() || null,
    visible: document.getElementById('producto-visible')?.value !== 'false',
    variantes,
  };
}

async function guardarProductoBase() {
  const data = validarFormulario();
  if (!data) return;

  const submitBtn = document.querySelector('#form-producto .submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando...'; }

  try {
    let productoId = formState.editId;

    const base = {
      codigo: data.codigo,
      nombre: data.nombre,
      categoria: data.categoria,
      imagen_url: data.imagen_url,
      visible: data.visible,
    };

    if (productoId) {
      await apiPatch(`productos_base?id=eq.${productoId}`, base);
      await apiDelete(`variantes_producto?producto_id=eq.${productoId}`);
    } else {
      const guardado = await apiPost('productos_base', base);
      productoId = guardado[0].id;
    }

    for (const v of data.variantes) {
      const sku = `${data.codigo}-${v.talla}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      await apiPost('variantes_producto', {
        producto_id: productoId,
        talla: v.talla,
        colores: v.colores,
        stock_total: v.stock_total,
        precio_venta: v.precio_venta,
        precio_compra: v.precio_compra,
        sku,
      });
    }

    mostrarAlerta(
      `Producto ${formState.editId ? 'actualizado' : 'guardado'} con ${data.variantes.length} variante(s)`,
      'success'
    );

    resetFormulario();
    cerrarFormulario('producto');
    await cargarProductos();
  } catch (error) {
    console.error(error);
    mostrarAlerta('Error: ' + error.message, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar Producto'; }
  }
}

function resetFormulario() {
  formState.editId = null;
  formState.variantes = [{ talla: '', precio_venta: 0, colores: [{ nombre: '', codigo: '#D4A5A9', stock: 0 }] }];

  const campos = ['producto-codigo', 'producto-nombre', 'producto-imagen', 'producto-precio-compra', 'producto-precio-venta-general'];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cat = document.getElementById('producto-categoria');
  if (cat) cat.value = '';
  const visible = document.getElementById('producto-visible');
  if (visible) visible.value = 'true';

  const form = document.getElementById('form-producto');
  if (form) delete form.dataset.editId;

  const submitBtn = document.querySelector('#form-producto .submit-btn');
  if (submitBtn) submitBtn.textContent = 'Guardar Producto';

  renderVariantes();
}

function autogenerarCodigo() {
  const cat = document.getElementById('producto-categoria')?.value;
  const input = document.getElementById('producto-codigo');
  if (!input) return;
  if (!cat) {
    mostrarAlerta('Selecciona una categoría primero', 'error');
    return;
  }
  input.value = generarCodigoProducto(cat);
}

// ---------- Edición ----------
async function editarProducto(id) {
  try {
    const [producto] = await apiGet(`productos_base?id=eq.${id}`);
    if (!producto) throw new Error('Producto no encontrado');
    const variantes = await apiGet(`variantes_producto?producto_id=eq.${id}`);

    mostrarFormulario('producto');
    const form = document.getElementById('form-producto');
    if (form) form.dataset.editId = id;

    formState.editId = id;
    document.getElementById('producto-codigo').value = producto.codigo || '';
    document.getElementById('producto-nombre').value = producto.nombre || '';
    document.getElementById('producto-categoria').value = producto.categoria || '';
    document.getElementById('producto-imagen').value = producto.imagen_url || '';
    const vis = document.getElementById('producto-visible');
    if (vis) vis.value = producto.visible === false ? 'false' : 'true';

    const precioCompra = variantes.find(v => v.precio_compra)?.precio_compra || '';
    document.getElementById('producto-precio-compra').value = precioCompra;

    formState.variantes = variantes.length
      ? variantes.map(v => ({
          talla: v.talla || '',
          precio_venta: v.precio_venta || 0,
          colores: (v.colores && v.colores.length
            ? v.colores
            : [{ nombre: 'Sin color', codigo: '#D4A5A9', stock: v.stock_total || 0 }]
          ).map(c => ({
            nombre: c.nombre ?? null,
            codigo: c.codigo || '#D4A5A9',
            stock: c.stock || 0,
          })),
        }))
      : [{ talla: '', precio_venta: 0, colores: [{ nombre: '', codigo: '#D4A5A9', stock: 0 }] }];

    renderVariantes();

    const submitBtn = document.querySelector('#form-producto .submit-btn');
    if (submitBtn) submitBtn.textContent = 'Actualizar Producto';
  } catch (error) {
    console.error(error);
    mostrarAlerta('Error al cargar el producto', 'error');
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto y todas sus variantes?')) return;
  try {
    await apiDelete(`variantes_producto?producto_id=eq.${id}`);
    await apiDelete(`productos_base?id=eq.${id}`);
    mostrarAlerta('Producto eliminado', 'success');
    await cargarProductos();
  } catch (error) {
    console.error(error);
    mostrarAlerta('Error al eliminar', 'error');
  }
}

async function verVariantes(id) {
  try {
    const cached = productosMap.get(id);
    const producto = cached || (await apiGet(`vista_productos_completa?id=eq.${id}`))[0];
    if (!producto) return;

    const variantes = producto.variantes || [];
    let mensaje = `PRODUCTO: ${producto.nombre}\n${'='.repeat(35)}\n\n`;
    if (variantes.length === 0) mensaje += 'Sin variantes registradas.\n';
    variantes.forEach(v => {
      mensaje += `Talla: ${v.talla}\n`;
      mensaje += `Precio venta: $${(v.precio_venta || 0).toLocaleString()}\n`;
      mensaje += `Precio compra: $${(v.precio_compra || 0).toLocaleString()}\n`;
      mensaje += `SKU: ${v.sku || 'N/A'}\n`;
      const colores = v.colores || [];
      if (colores.length) {
        mensaje += 'Colores:\n';
        colores.forEach(c => {
          mensaje += `  - ${c.nombre || 'Sin color'}: ${c.stock || 0} unidades\n`;
        });
      }
      mensaje += '\n';
    });
    alert(mensaje);
  } catch (error) {
    console.error(error);
    mostrarAlerta('Error al cargar variantes', 'error');
  }
}

// ---------- Impresión de etiquetas ----------
async function abrirConfiguracionEtiquetas(productoId) {
  window.productoActualEtiquetas = productoId;
  const c = configEtiquetas;

  const modalHTML = `
    <div id="modal-config-etiquetas" class="form-modal" style="display:flex;">
      <div class="form-modal-content" style="max-width:500px;">
        <div class="form-modal-header">
          <h3>Configurar impresión de etiquetas</h3>
          <span class="close" onclick="cerrarConfigEtiquetas()">&times;</span>
        </div>
        <div class="form-modal-body">
          <div class="form-group">
            <label>Columnas por hoja: <span id="valor-columnas">${c.columnas}</span></label>
            <input type="range" id="config-columnas" min="1" max="5" value="${c.columnas}" step="1" style="width:100%;">
          </div>
          <div class="form-group">
            <label>Filas por hoja: <span id="valor-filas">${c.filas}</span></label>
            <input type="range" id="config-filas" min="2" max="8" value="${c.filas}" step="1" style="width:100%;">
          </div>
          <div class="form-group">
            <label>Márgenes (mm): <span id="valor-margen">${c.margen}</span></label>
            <input type="range" id="config-margen" min="5" max="20" value="${c.margen}" step="1" style="width:100%;">
          </div>
          <div class="form-group">
            <label>Tamaño de letra (px): <span id="valor-fuente">${c.tamanoFuente}</span></label>
            <input type="range" id="config-fuente" min="8" max="16" value="${c.tamanoFuente}" step="1" style="width:100%;">
          </div>
          <div class="form-group">
            <label>Mostrar código de barras</label>
            <select id="config-mostrar-barcode">
              <option value="si" ${c.mostrarBarcode ? 'selected' : ''}>Sí</option>
              <option value="no" ${!c.mostrarBarcode ? 'selected' : ''}>No</option>
            </select>
          </div>
          <div class="form-group">
            <label>Mostrar precio</label>
            <select id="config-mostrar-precio">
              <option value="si" ${c.mostrarPrecio ? 'selected' : ''}>Sí</option>
              <option value="no" ${!c.mostrarPrecio ? 'selected' : ''}>No</option>
            </select>
          </div>
          <div class="form-actions" style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="btn-primary" onclick="imprimirEtiquetasConConfig()" style="flex:1;">Imprimir</button>
            <button class="btn-secondary" onclick="cerrarConfigEtiquetas()" style="flex:1;">Cancelar</button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('modal-config-etiquetas')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('config-columnas').addEventListener('input', e => {
    configEtiquetas.columnas = parseInt(e.target.value, 10);
    document.getElementById('valor-columnas').textContent = e.target.value;
  });
  document.getElementById('config-filas').addEventListener('input', e => {
    configEtiquetas.filas = parseInt(e.target.value, 10);
    document.getElementById('valor-filas').textContent = e.target.value;
  });
  document.getElementById('config-margen').addEventListener('input', e => {
    configEtiquetas.margen = parseInt(e.target.value, 10);
    document.getElementById('valor-margen').textContent = e.target.value;
  });
  document.getElementById('config-fuente').addEventListener('input', e => {
    configEtiquetas.tamanoFuente = parseInt(e.target.value, 10);
    document.getElementById('valor-fuente').textContent = e.target.value;
  });
  document.getElementById('config-mostrar-barcode').addEventListener('change', e => {
    configEtiquetas.mostrarBarcode = e.target.value === 'si';
  });
  document.getElementById('config-mostrar-precio').addEventListener('change', e => {
    configEtiquetas.mostrarPrecio = e.target.value === 'si';
  });
}

function cerrarConfigEtiquetas() {
  document.getElementById('modal-config-etiquetas')?.remove();
}

async function imprimirEtiquetasConConfig() {
  const productoId = window.productoActualEtiquetas;
  if (!productoId) return;
  cerrarConfigEtiquetas();

  try {
    const producto = productosMap.get(productoId) || (await apiGet(`vista_productos_completa?id=eq.${productoId}`))[0];
    if (!producto) throw new Error('Producto no encontrado');
    const variantes = producto.variantes || [];
    if (variantes.length === 0) {
      mostrarAlerta('No hay variantes para imprimir', 'error');
      return;
    }

    const total = configEtiquetas.columnas * configEtiquetas.filas;
    const etiquetas = [];
    let i = 0;
    while (etiquetas.length < total) {
      etiquetas.push(variantes[i % variantes.length]);
      i++;
    }

    const html = generarHTMLImpresion(producto, etiquetas);
    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  } catch (error) {
    console.error(error);
    mostrarAlerta('Error al imprimir etiquetas', 'error');
  }
}

function generarHTMLImpresion(producto, variantes) {
  const { columnas, filas, margen, mostrarBarcode, mostrarPrecio, tamanoFuente } = configEtiquetas;
  const altoEtiqueta = Math.floor((297 - margen * 2 - filas * 5) / filas);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Etiquetas - ${escapeHtml(producto.nombre)}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4;margin:${margen}mm;}
  body{background:white;font-family:Arial,sans-serif;}
  .etiquetas-grid{display:grid;grid-template-columns:repeat(${columnas},1fr);gap:5px;}
  .etiqueta{border:1px dashed #ccc;padding:6px;text-align:center;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;justify-content:space-between;height:${altoEtiqueta}px;}
  .tienda{font-size:${Math.max(8,tamanoFuente-4)}px;color:#d4a5a9;letter-spacing:1px;}
  .nombre{font-size:${tamanoFuente}px;font-weight:bold;color:#4a3728;}
  .talla{font-size:${tamanoFuente+4}px;font-weight:bold;color:#b87c4e;}
  .barcode-container{margin:5px 0;display:flex;justify-content:center;}
  canvas.barcode{max-width:100%;height:auto;}
  .sku-texto{font-family:monospace;font-size:${Math.max(8,tamanoFuente-4)}px;color:#666;word-break:break-all;}
  .precio{font-size:${tamanoFuente+2}px;font-weight:bold;color:#27ae60;margin-top:5px;}
  @media print{body{margin:0;padding:0;}.etiqueta{border:1px dashed #aaa;}}
</style></head>
<body>
  <div class="etiquetas-grid">
    ${variantes.map((v, idx) => {
      const sku = v.sku || `${producto.codigo}-${v.talla}`;
      return `
        <div class="etiqueta">
          <div>
            <div class="tienda">MODAS LA 34</div>
            <div class="nombre">${escapeHtml(producto.nombre)}</div>
            <div class="talla">Talla: ${escapeHtml(v.talla)}</div>
          </div>
          ${mostrarBarcode ? `
            <div class="barcode-container">
              <canvas class="barcode" data-sku="${escapeHtml(sku)}"></canvas>
            </div>
            <div class="sku-texto">${escapeHtml(sku)}</div>
          ` : ''}
          ${mostrarPrecio ? `
            <div class="precio">$${(v.precio_venta || 0).toLocaleString()}</div>
          ` : ''}
        </div>`;
    }).join('')}
  </div>
  <script>
    window.addEventListener('load', function(){
      document.querySelectorAll('.barcode').forEach(function(canvas){
        var sku = canvas.getAttribute('data-sku');
        if (sku && typeof JsBarcode !== 'undefined') {
          JsBarcode(canvas, sku, {
            format: 'CODE128',
            width: 1.5,
            height: 35,
            fontSize: 9,
            margin: 3,
            displayValue: false
          });
        }
      });
    });
  <\/script>
</body></html>`;
}

async function imprimirEtiquetasProducto(productoId) {
  abrirConfiguracionEtiquetas(productoId);
}

// ---------- Filtros y ordenamiento ----------
function aplicarFiltrosProductos() {
  const rows = document.querySelectorAll('#tabla-productos tbody tr');
  const searchTerm = document.getElementById('search-productos')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filter-categoria-productos')?.value || '';
  const stockFilter = document.getElementById('filter-stock-productos')?.value || '';
  const visibilidad = document.getElementById('filter-visibilidad')?.value || '';

  rows.forEach(row => {
    if (!row.dataset.id) return;
    let mostrar = true;

    const nombre = row.cells[2]?.textContent.toLowerCase() || '';
    const codigo = row.cells[1]?.textContent.toLowerCase() || '';
    const categoriaTexto = row.cells[3]?.textContent.toLowerCase() || '';
    const stock = parseInt(row.cells[5]?.textContent, 10) || 0;
    const esVisible = row.dataset.visible === 'true';

    if (searchTerm && !nombre.includes(searchTerm) && !codigo.includes(searchTerm)) mostrar = false;
    if (mostrar && categoria && !categoriaTexto.includes(categoria.toLowerCase())) mostrar = false;
    if (mostrar && stockFilter === 'bajo' && stock >= 5) mostrar = false;
    if (mostrar && stockFilter === 'agotado' && stock > 0) mostrar = false;
    if (mostrar && visibilidad === 'visible' && !esVisible) mostrar = false;
    if (mostrar && visibilidad === 'oculto' && esVisible) mostrar = false;

    row.style.display = mostrar ? '' : 'none';
  });
}

function limpiarFiltrosProductos() {
  ['search-productos', 'filter-categoria-productos', 'filter-stock-productos', 'filter-visibilidad']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  aplicarFiltrosProductos();
}

function ordenarProductos(columna) {
  if (sortColumn === columna) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = columna;
    sortDirection = 'asc';
  }

  const ordenados = [...productosData].sort((a, b) => {
    let valA, valB;
    switch (columna) {
      case 'codigo':
        valA = (a.codigo || '').toLowerCase();
        valB = (b.codigo || '').toLowerCase();
        break;
      case 'categoria':
        valA = (a.categoria || '').toLowerCase();
        valB = (b.categoria || '').toLowerCase();
        break;
      case 'stock':
        valA = a.stock_total || 0;
        valB = b.stock_total || 0;
        break;
      case 'precio': {
        const pa = (a.variantes || []).map(v => v.precio_venta || 0).filter(n => n > 0);
        const pb = (b.variantes || []).map(v => v.precio_venta || 0).filter(n => n > 0);
        valA = pa.length ? Math.min(...pa) : 0;
        valB = pb.length ? Math.min(...pb) : 0;
        break;
      }
      default:
        valA = (a.nombre || '').toLowerCase();
        valB = (b.nombre || '').toLowerCase();
    }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  mostrarTablaProductos(ordenados);
}

// ---------- Eventos globales ----------
function inicializarFormularioProducto() {
  const catSelect = document.getElementById('producto-categoria');
  const codigoInput = document.getElementById('producto-codigo');

  if (catSelect && !catSelect.dataset.bound) {
    catSelect.addEventListener('change', () => {
      // Autogenerar código si está vacío o fue generado automáticamente
      if (codigoInput && (!codigoInput.value || codigoInput.dataset.auto === '1')) {
        codigoInput.value = generarCodigoProducto(catSelect.value);
        codigoInput.dataset.auto = '1';
      }
    });
    catSelect.dataset.bound = '1';
  }

  if (codigoInput && !codigoInput.dataset.bound) {
    codigoInput.addEventListener('input', () => {
      codigoInput.dataset.auto = '0';
    });
    codigoInput.dataset.bound = '1';
  }

  // Botón para regenerar el código
  const btnRegenerar = document.getElementById('btn-regenerar-codigo');
  if (btnRegenerar && !btnRegenerar.dataset.bound) {
    btnRegenerar.addEventListener('click', () => {
      autogenerarCodigo();
      if (codigoInput) codigoInput.dataset.auto = '1';
    });
    btnRegenerar.dataset.bound = '1';
  }

  // Inicializar estado del formulario si está vacío
  if (formState.variantes.length === 0) {
    formState.variantes = [{
      talla: '',
      precio_venta: 0,
      colores: [{ nombre: '', codigo: '#D4A5A9', stock: 0 }],
    }];
  }
  renderVariantes();
}

// ---------- Exponer al scope global ----------
Object.assign(window, {
  // Carga y tabla
  cargarProductos,
  mostrarTablaProductos,
  ordenarProductos,
  aplicarFiltrosProductos,
  limpiarFiltrosProductos,
  // Formulario
  agregarVariante,
  duplicarVariante,
  eliminarVariante,
  agregarColor,
  agregarSinColor,
  eliminarColor,
  renderVariantes,
  sincronizarDesdeDOM,
  validarFormulario,
  guardarProductoBase,
  resetFormulario,
  autogenerarCodigo,
  inicializarFormularioProducto,
  // CRUD
  editarProducto,
  eliminarProducto,
  verVariantes,
  // Etiquetas
  abrirConfiguracionEtiquetas,
  cerrarConfigEtiquetas,
  imprimirEtiquetasConConfig,
  imprimirEtiquetasProducto,
  // Utilidades
  escapeHtml,
  normalizarHex,
  generarCodigoProducto,
});

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  inicializarFormularioProducto();
});

console.log('productos.js cargado — módulo listo.');
