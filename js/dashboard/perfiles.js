// ============================================
// PERFILES.JS - Gestión de usuarios
// ============================================

async function cargarPerfiles() {
    console.log('📋 Cargando perfiles...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await response.json();
        const tbody = document.querySelector('#tabla-perfiles tbody');
        
        if (!tbody) return;
        
        if (perfiles.length === 0) {
            tbody.innerHTML = '<td><td colspan="4" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = perfiles.map(p => `
            <tr>
                <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                <td>${p.email}</td>
                <td><span style="background: ${p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1'}; color: white; padding: 0.2rem 0.8rem; border-radius: 50px;">${p.rol || 'empleado'}</span></td>
                <td>
                    <button class="action-btn" onclick="editarPerfil('${p.id}')">✏️</button>
                    ${p.id !== currentUser?.id ? `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')">🗑️</button>` : ''}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando perfiles:', error);
    }
}

function editarPerfil(id) {
    mostrarAlerta('Función de editar perfil en desarrollo', 'info');
}

async function eliminarPerfil(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token.access_token}` }
        });
        mostrarAlerta('✅ Usuario eliminado', 'success');
        await cargarPerfiles();
    } catch (error) {
        mostrarAlerta('Error al eliminar', 'error');
    }
}

// Exportar
window.cargarPerfiles = cargarPerfiles;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;

console.log('✅ Perfiles.js cargado');
