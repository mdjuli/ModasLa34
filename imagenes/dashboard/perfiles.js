// ============================================
// PERFILES.JS - Gestión de usuarios
// ============================================

async function cargarPerfiles() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const perfiles = await response.json();
        
        const tbody = document.querySelector('#tabla-perfiles tbody');
        
        if (!tbody) return;
        
        if (perfiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-empleados').textContent = perfiles.length;
        
        tbody.innerHTML = perfiles.map(p => `
            <tr>
                <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                <td>${p.email}</td>
                <td><span style="background: ${p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1'}; color: white; padding: 0.2rem 0.8rem; border-radius: 50px;">${p.rol || 'empleado'}</span></td>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
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

async function guardarPerfil() {
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const nombre = document.getElementById('perfil-nombre').value;
        const email = document.getElementById('perfil-email').value;
        const password = document.getElementById('perfil-password').value;
        const rol = document.getElementById('perfil-rol').value;
        
        if (!nombre || !email) {
            mostrarAlerta('Nombre y email son obligatorios', 'error');
            return;
        }
        
        if (!password || password.length < 6) {
            mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        // Crear usuario en Auth
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const authData = await authResponse.json();
        
        if (!authResponse.ok) {
            throw new Error(authData.msg || 'Error al crear usuario');
        }
        
        // Crear perfil
        const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: authData.user.id,
                nombre: nombre,
                email: email,
                rol: rol
            })
        });
        
        if (perfilResponse.ok) {
            mostrarAlerta('🌸 Usuario creado correctamente', 'success');
            cerrarFormulario('perfil');
            await cargarPerfiles();
            
            document.getElementById('perfil-nombre').value = '';
            document.getElementById('perfil-email').value = '';
            document.getElementById('perfil-password').value = '';
        } else {
            throw new Error('Error al crear perfil');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
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

// Exportar funciones
window.cargarPerfiles = cargarPerfiles;
window.guardarPerfil = guardarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
