// ============================================
// GASTOS.JS - Gestión de gastos
// ============================================

async function cargarGastos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar gastos');
        
        const gastos = await response.json();
        const tbody = document.querySelector('#tabla-gastos tbody');
        
        if (!tbody) return;
        
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay gastos registrados</td></tr>';
            return;
        }
        
        // Calcular gastos del mes
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicio);
        const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
        document.getElementById('stats-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
        
        tbody.innerHTML = gastos.map(gasto => `
            <tr>
                <td>${new Date(gasto.fecha).toLocaleDateString()}</td>
                <td>${gasto.concepto}</td>
                <td>${gasto.categoria}</td>
                <td>$${(gasto.monto || 0).toLocaleString()}</td>
                <td>${gasto.metodo_pago || 'Efectivo'}</td>
                <td>
                    <button class="action-btn" onclick="editarGasto(${gasto.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="eliminarGasto(${gasto.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        // Configurar filtros
        setTimeout(() => configurarFiltrosGastos(), 100);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarGasto() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const fecha = document.getElementById('gasto-fecha').value;
        const concepto = document.getElementById('gasto-concepto').value;
        const categoria = document.getElementById('gasto-categoria').value;
        const monto = parseFloat(document.getElementById('gasto-monto').value);
        const metodoPago = document.getElementById('gasto-metodo').value;
        
        if (!fecha || !concepto || !categoria || !monto) {
            mostrarAlerta('Todos los campos son obligatorios', 'error');
            return;
        }
        
        const gasto = {
            fecha: fecha,
            concepto: concepto,
            categoria: categoria,
            monto: monto,
            metodo_pago: metodoPago,
            puc: obtenerPUCGasto(categoria)
        };
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gasto)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Gasto guardado correctamente', 'success');
            cerrarFormulario('gasto');
            await cargarGastos();
            
            // Limpiar formulario
            document.getElementById('gasto-fecha').value = '';
            document.getElementById('gasto-concepto').value = '';
            document.getElementById('gasto-categoria').value = '';
            document.getElementById('gasto-monto').value = '';
        } else {
            mostrarAlerta('Error al guardar el gasto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

function obtenerPUCGasto(categoria) {
    const pucMap = {
        'Alquiler': '511005',
        'Servicios': '511010',
        'Sueldos': '510506',
        'Marketing': '513505',
        'Mantenimiento': '513505',
        'Otros': '519595'
    };
    return pucMap[categoria] || '519595';
}

function editarGasto(id) {
    mostrarAlerta('Función de editar gasto en desarrollo', 'info');
}

async function eliminarGasto(id) {
    if (!confirm('¿Estás segura de eliminar este gasto?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Gasto eliminado', 'success');
            await cargarGastos();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// Filtros para gastos
function configurarFiltrosGastos() {
    const searchInput = document.getElementById('search-gastos');
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio');
    const fechaFin = document.getElementById('filter-gasto-fecha-fin');
    const categoriaSelect = document.getElementById('filter-gasto-categoria');
    
    if (searchInput) searchInput.addEventListener('input', () => aplicarFiltrosGastos());
    if (fechaInicio) fechaInicio.addEventListener('change', () => aplicarFiltrosGastos());
    if (fechaFin) fechaFin.addEventListener('change', () => aplicarFiltrosGastos());
    if (categoriaSelect) categoriaSelect.addEventListener('change', () => aplicarFiltrosGastos());
}

function aplicarFiltrosGastos() {
    const rows = document.querySelectorAll('#tabla-gastos tbody tr');
    const searchTerm = document.getElementById('search-gastos')?.value.toLowerCase() || '';
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio')?.value;
    const fechaFin = document.getElementById('filter-gasto-fecha-fin')?.value;
    const categoria = document.getElementById('filter-gasto-categoria')?.value || '';
    
    rows.forEach(row => {
        let mostrar = true;
        const concepto = row.cells[1]?.textContent.toLowerCase() || '';
        const fechaTexto = row.cells[0]?.textContent || '';
        const categoriaTexto = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (searchTerm && !concepto.includes(searchTerm)) mostrar = false;
        if (mostrar && fechaInicio && new Date(fechaTexto) < new Date(fechaInicio)) mostrar = false;
        if (mostrar && fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59);
            if (new Date(fechaTexto) > fechaFinObj) mostrar = false;
        }
        if (mostrar && categoria && !categoriaTexto.includes(categoria.toLowerCase())) mostrar = false;
        
        row.style.display = mostrar ? '' : 'none';
    });
}

function limpiarFiltrosGastos() {
    const searchInput = document.getElementById('search-gastos');
    const fechaInicio = document.getElementById('filter-gasto-fecha-inicio');
    const fechaFin = document.getElementById('filter-gasto-fecha-fin');
    const categoriaSelect = document.getElementById('filter-gasto-categoria');
    
    if (searchInput) searchInput.value = '';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (categoriaSelect) categoriaSelect.value = '';
    aplicarFiltrosGastos();
}

// Exportar funciones
window.cargarGastos = cargarGastos;
window.guardarGasto = guardarGasto;
window.editarGasto = editarGasto;
window.eliminarGasto = eliminarGasto;
window.limpiarFiltrosGastos = limpiarFiltrosGastos;
