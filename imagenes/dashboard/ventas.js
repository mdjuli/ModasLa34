// ============================================
// VENTAS.JS - Historial de ventas
// ============================================

let ventasData = [];

async function cargarVentas() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar ventas');
        
        ventasData = await response.json();
        
        // Calcular totales
        const hoy = new Date().toISOString().split('T')[0];
        const ventasHoy = ventasData.filter(v => v.fecha?.split('T')[0] === hoy);
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        const ventasMes = ventasData.filter(v => new Date(v.fecha) >= fechaInicio);
        const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const cambiosCount = ventasData.filter(v => v.estado === 'cambiado' || v.estado === 'devuelto').length;
        
        document.getElementById('ventas-hoy-total').textContent = `$${totalHoy.toLocaleString()}`;
        document.getElementById('ventas-mes-total').textContent = `$${totalMes.toLocaleString()}`;
        document.getElementById('ventas-cambios-count').textContent = cambiosCount;
        
        // Configurar botón de nueva venta
        const btnNuevaVenta = document.querySelector('#modulo-ventas .add-btn');
        if (btnNuevaVenta) btnNuevaVenta.onclick = () => window.open('ventas.html', '_blank');
        
        mostrarTablaVentas(ventasData);
        
        // Configurar filtros
        setTimeout(() => configurarFiltrosVentas(), 100);
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('ventas-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8">Error al cargar ventas</td></tr>';
    }
}

function mostrarTablaVentas(ventas) {
    const tbody = document.getElementById('ventas-body');
    if (!tbody) return;
    
    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No hay ventas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = ventas.map(venta => {
        let estadoClass = '', estadoText = '';
        switch(venta.estado) {
            case 'completada': estadoClass = 'estado-pagada'; estadoText = '✅ Completada'; break;
            case 'pendiente': estadoClass = 'estado-pendiente'; estadoText = '⏳ Pendiente'; break;
            case 'cambiado': estadoClass = 'estado-badge-cambiado'; estadoText = '🔄 Cambio solicitado'; break;
            case 'devuelto': estadoClass = 'estado-badge-devuelto'; estadoText = '📦 Devuelto'; break;
            default: estadoClass = 'estado-pagada'; estadoText = '✅ Completada';
        }
        
        return `
            <tr>
                <td><strong>#${venta.id}</strong></td>
                <td>${new Date(venta.fecha).toLocaleDateString('es-CO')}</td>
                <td>${venta.cliente || 'Consumidor final'}</td>
                <td>${venta.productos || '-'}</td>
                <td><strong>$${(venta.total || 0).toLocaleString()}</strong></td>
                <td>${venta.metodo_pago || 'Efectivo'}</td>
                <td><span class="estado-badge ${estadoClass}">${estadoText}</span></td>
                <td>
                    <button class="action-btn" onclick="verDetalleVenta(${venta.id})">👁️</button>
                    <button class="action-btn" onclick="editarVenta(${venta.id})">✏️</button>
                    <button class="action-btn" onclick="solicitarCambio(${venta.id})">🔄</button>
                    <button class="action-btn delete-btn" onclick="eliminarVenta(${venta.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function configurarFiltrosVentas() {
    const searchInput = document.getElementById('search-ventas');
    const fechaInicio = document.getElementById('filter-fecha-inicio');
    const fechaFin = document.getElementById('filter-fecha-fin');
    const estadoSelect = document.getElementById('filter-estado-ventas');
    const metodoSelect = document.getElementById('filter-metodo-ventas');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosVentas());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosVentas());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosVentas());
    if (estadoSelect) estadoSelect.addEventListener('change', () => aplicarFiltrosVentas());
    if (metodoSelect) metodoSelect.addEventListener('change', () => aplicarFiltrosVentas());
}

function aplicarFiltrosVentas() {
    const rows = document.querySelectorAll('#tabla-ventas tbody tr');
    const searchTerm = document.getElementById('search-ventas')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-fecha-fin')?.value;
    const estado = document.getElementById('filter-estado-ventas')?.value || '';
    const metodo = document.getElementById('filter-metodo-ventas')?.value || '';
    
    rows.forEach(row
