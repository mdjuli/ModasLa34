// ============================================
// STOCK.JS - Control de inventari
// ============================================

async function cargarStock() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        
        let stockBajo = [], agotados = [], normales = 0;
        
        productos.forEach(producto => {
            (producto.variantes || []).forEach(variante => {
                const colores = variante.colores || [];
                if (colores.length) {
                    colores.forEach(color => {
                        const stock = color.stock || 0;
                        const item = { producto_id: producto.id, nombre: producto.nombre, codigo: producto.codigo, talla: variante.talla, color: color.nombre || 'Sin color', color_codigo: color.codigo, stock };
                        if (stock === 0) agotados.push(item);
                        else if (stock < 5) stockBajo.push(item);
                        else normales++;
                    });
                } else {
                    const stock = variante.stock_total || 0;
                    const item = { producto_id: producto.id, nombre: producto.nombre, codigo: producto.codigo, talla: variante.talla, color: 'N/A', color_codigo: '#ccc', stock };
                    if (stock === 0) agotados.push(item);
                    else if (stock < 5) stockBajo.push(item);
                    else normales++;
                }
            });
        });
        
        document.getElementById('stock-bajo-count').textContent = stockBajo.length;
        document.getElementById('stock-agotado-count').textContent = agotados.length;
        document.getElementById('stock-normal-count').textContent = normales;
        
        renderizarTablaStock('stock-bajo-body', stockBajo, true);
        renderizarTablaStock('stock-agotado-body', agotados, false);
    } catch (error) { console.error('Error:', error); }
}

function renderizarTablaStock(elementId, items, mostrarMinimo) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">✅ No hay productos</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr class="${item.stock === 0 ? 'stock-agotado-row' : 'stock-bajo-row'}">
            <td><strong>${item.nombre}</strong><br><small>${item.codigo}</small></td>
            <td>${item.talla}</td>
            <td><div style="display:flex;align-items:center;gap:8px;"><div style="width:20px;height:20px;background:${item.color_codigo};border-radius:50%;"></div>${item.color}</div></td>
            <td class="${item.stock === 0 ? 'stock-agotado' : 'stock-critico'}">${item.stock === 0 ? 'AGOTADO' : item.stock + ' unidades'}</td>
            ${mostrarMinimo ? '<td>5</td>' : ''}
            <td><button class="action-btn" onclick="solicitarReposicion(${item.producto_id}, \'${item.nombre}\', \'${item.talla}\', \'${item.color}\')">📦 ${item.stock === 0 ? 'Solicitar' : 'Pedir'}</button></td>
        </tr>
    `).join('');
}

function solicitarReposicion(id, nombre, talla, color) {
    alert(`📋 Solicitud de reposición\n\nProducto: ${nombre}\nTalla: ${talla}\nColor: ${color}`);
}
