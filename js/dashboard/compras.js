// ============================================
// COMPRAS.JS - Gestión de compras
// ============================================

async function cargarCompras() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar compras');
        
        const compras = await response.json();
        const tbody = document.querySelector('#tabla-compras tbody');
        
        if (!tbody) return;
        
        if (compras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay compras registradas</td></tr>';
            return;
        }
        
        // Calcular estadísticas
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const comprasMes = compras.filter(c => new Date(c.fecha) >= fechaInicio);
        const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
        const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
        
        document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
        document.getElementById('stats-compras-pendientes').textContent = pendientes;
        
        tbody.innerHTML = compras.map(compra => {
            const fecha = new Date(compra.fecha);
            let estadoClass = compra.estado === 'Pagada' ? 'estado-pagada' : (compra.estado === 'Recibida' ? 'estado-recibida' : 'estado-pendiente');
            
            return `
                <tr>
                    <td>${fecha.toLocaleDateString('es-CO')}</td>
                    <td>${compra.proveedores?.nombre || 'N/A'}</td>
                    <td>${compra.producto || 'Varios'}</td>
                    <td>${compra.cantidad || '-'}</td>
                    <td>$${(compra.total || 0).toLocaleString()}</td>
                    <td><span class="estado-badge ${estadoClass}">${compra.estado || 'Pendiente'}</span></td>
                    <td>${compra.puc || '620501'}</td>
                    <td>
                        <button class="action-btn" onclick="editarCompra(${compra.id})">✏️</button>
                        <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Configurar filtros
        setTimeout(() => configurarFiltrosCompras(), 100);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarCompra() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const proveedorId = document.getElementById('compra-proveedor').value;
        if (!proveedorId) {
            mostrarAlerta('Debe seleccionar un proveedor', 'error');
            return;
        }
        
        const cantidad = parseInt(document.getElementById('compra-cantidad').value);
        const precio = parseFloat(document.getElementById('compra-precio').value);
        
        if (!cantidad || cantidad <= 0) {
            mostrarAlerta('Cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        if (!precio || precio <= 0) {
            mostrarAlerta('Precio debe ser mayor a 0', 'error');
            return;
        }
        
        const fecha = document.getElementById('compra-fecha').value;
        const producto = document.getElementById('compra-producto').value;
        
        if (!fecha || !producto) {
            mostrarAlerta('Fecha y producto son obligatorios', 'error');
            return;
        }
        
        const compra = {
            proveedor_id: parseInt(proveedorId),
            fecha: fecha,
            producto: producto,
            cantidad: cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
            estado: document.getElementById('compra-estado').value,
            puc: '620501'
        };
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Compra guardada correctamente', 'success');
            cerrarFormulario('compra');
            await cargarCompras();
            
            // Limpiar formulario
            document.getElementById('compra-proveedor').value = '';
            document.getElementById('compra-fecha').value = '';
            document.getElementById('compra-producto').value = '';
            document.getElementById('compra-cantidad').value = '';
            document.getElementById('compra-precio').value = '';
        } else {
            mostrarAlerta('Error al guardar la compra', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function editarCompra(id) {
    mostrarAlerta('Función de editar compra en desarrollo', 'info');
}

async function eliminarCompra(id) {
    if (!confirm('¿Estás segura de eliminar esta compra?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Compra eliminada', 'success');
            await cargarCompras();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// Filtros para compras
function configurarFiltrosCompras() {
    const searchInput = document.getElementById('search-compras');
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio');
    const fechaFin = document.getElementById('filter-compra-fecha-fin');
    const estadoSelect = document.getElementById('filter-compra-estado');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosCompras());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosCompras());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosCompras());
    if (estadoSelect) estadoSelect.addEventListener('change', () => aplicarFiltrosCompras());
}

function aplicarFiltrosCompras() {
    const rows = document.querySelectorAll('#tabla-compras tbody tr');
    const searchTerm = document.getElementById('search-compras')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-compra-fecha-fin')?.value;
    const estado = document.getElementById('filter-compra-estado')?.value || '';
    
    rows.forEach(row => {
        let mostrar = true;
        const proveedor = row.cells[1]?.textContent.toLowerCase() || '';
        const producto = row.cells[2]?.textContent.toLowerCase() || '';
        const fechaTexto = row.cells[0]?.textContent || '';
        const estadoTexto = row.cells[5]?.textContent.toLowerCase() || '';
        
        if (searchTerm && !proveedor.includes(searchTerm) && !producto.includes(searchTerm)) mostrar = false;
        if (mostrar && fechaInicio && new Date(fechaTexto) < new Date(fechaInicio)) mostrar = false;
        if (mostrar && fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59);
            if (new Date(fechaTexto) > fechaFinObj) mostrar = false;
        }
        if (mostrar && estado && !estadoTexto.includes(estado.toLowerCase())) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
    });
}

function limpiarFiltrosCompras() {
    const searchInput = document.getElementById('search-compras');
    const fechaInicio = document.getElementById('filter-compra-fecha-inicio');
    const fechaFin = document.getElementById('filter-compra-fecha-fin');
    const estadoSelect = document.getElementById('filter-compra-estado');
    
    if (searchInput) searchInput.value = '';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (estadoSelect) estadoSelect.value = '';
    aplicarFiltrosCompras();
}

// Exportar funciones
window.cargarCompras = cargarCompras;
window.guardarCompra = guardarCompra;
window.editarCompra = editarCompra;
window.eliminarCompra = eliminarCompra;
window.limpiarFiltrosCompras = limpiarFiltrosCompras;
