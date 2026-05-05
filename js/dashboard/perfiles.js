// ============================================
// PERFILES.JS - Gestión de usuarios CORREGIDO
// ============================================

async function cargarPerfiles() {
    console.log('📋 Cargando perfiles...');
    
    try {
        // Obtener el elemento tbody de la tabla
        const tbody = document.querySelector('#tabla-perfiles tbody');
        
        if (!tbody) {
            console.error('❌ No se encontró el elemento #tabla-perfiles tbody');
            return;
        }
        
        // Mostrar loading
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando usuarios...</td></tr>';
        
        // Obtener datos de Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const perfiles = await response.json();
        console.log('📋 Perfiles obtenidos:', perfiles.length);
        
        if (perfiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        // Actualizar el contador de empleados
        const statsEmpleados = document.getElementById('stats-empleados');
        if (statsEmpleados) {
            statsEmpleados.textContent = perfiles.length;
        }
        
        // Generar HTML de la tabla
        let html = '';
        for (const p of perfiles) {
            const rolClass = p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1';
            const rolText = p.rol === 'admin' ? 'Administrador' : 'Empleado';
            
            html += `
                <tr>
                    <td><strong>${escapeHtml(p.nombre || 'Sin nombre')}</strong></td>
                    <td>${escapeHtml(p.email)}</td>
                    <td><span style="background: ${rolClass}; color: white; padding: 0.2rem 0.8rem; border-radius: 50px; display: inline-block;">${rolText}</span></td>
                    <td>
                        <button class="action-btn" onclick="editarPerfil('${p.id}')" title="Editar">✏️</button>
                        ${p.id !== currentUser?.id ? `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')" title="Eliminar">🗑️</button>` : ''}
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html;
        console.log('✅ Perfiles cargados correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando perfiles:', error);
        const tbody = document.querySelector('#tabla-perfiles tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error al cargar usuarios</td></tr>';
        }
    }
}

function editarPerfil(id) {
    mostrarAlerta('Función de editar perfil en desarrollo', 'info');
}

async function eliminarPerfil(id) {
    if (!confirm('¿Estás segura de eliminar este usuario?')) return;
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Usuario eliminado', 'success');
            await cargarPerfiles();
        } else {
            mostrarAlerta('Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'error');
    }
}

// Función auxiliar para escapar HTML (si no existe en utils.js)
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Exportar funciones
window.cargarPerfiles = cargarPerfiles;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;

console.log('✅ Perfiles.js cargado correctamente');
