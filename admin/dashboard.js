    <script>
        // Variables globales
        let currentUser = null;
        let currentModule = 'compras';

        // Cargar datos al iniciar
        document.addEventListener('DOMContentLoaded', async () => {
            await verificarSesion();
            await cargarDatosIniciales();
            cambiarModulo('compras', null);
        });

        // Verificar sesión
        async function verificarSesion() {
            const tokenData = localStorage.getItem('admin_token');
            if (!tokenData) {
                window.location.href = 'login.html';
                return;
            }

            try {
                const token = JSON.parse(tokenData);
                const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${token.access_token}`
                    }
                });

                if (!response.ok) throw new Error('Sesión inválida');

                const user = await response.json();
                currentUser = user;
                
                const perfilRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const perfil = await perfilRes.json();
                
                document.getElementById('userNameDisplay').textContent = 
                    perfil[0]?.nombre || user.email || 'Administradora';
                
            } catch (error) {
                console.error('Error de sesión:', error);
                localStorage.removeItem('admin_token');
                window.location.href = 'login.html';
            }
        }

        // Cerrar sesión
        function logout() {
            if (confirm('¿Estás segura de cerrar sesión?')) {
                localStorage.removeItem('admin_token');
                window.location.href = 'login.html';
            }
        }

        // Cambiar entre módulos
        function cambiarModulo(modulo, evento = null) {
             document.querySelectorAll('.module-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Mostrar el módulo seleccionado
            const moduloElement = document.getElementById(`modulo-${modulo}`);
            if (moduloElement) {
                moduloElement.style.display = 'block';
            }
            
            // Actualizar botones activos (solo si viene de un evento de clic)
            if (evento) {
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                evento.target.classList.add('active');
            } else {
                        document.querySelectorAll('.nav-btn').forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.textContent.includes(modulo.toUpperCase()) || 
                            btn.textContent.includes('COMPRAS') && modulo === 'compras') {
                            btn.classList.add('active');
                        }
                    });
                }
                
                currentModule = modulo;
                    if (modulo !== 'ventas' && modulo !== 'contabilidad') {
                        cargarDatosModulo(modulo);
                    }
                }

        // Cargar datos según el módulo
        async function cargarDatosModulo(modulo) {
            switch(modulo) {
                case 'compras':
                    await cargarCompras();
                    await cargarProveedoresSelect('compra');
                    break;
                case 'gastos':
                    await cargarGastos();
                    break;
                case 'productos':
                    await cargarProductos();
                    await cargarProveedoresSelect('producto');
                    break;
                case 'perfiles':
                    await cargarPerfiles();
                    break;
                case 'proveedores':
                    await cargarProveedores();
                    break;
            }
        }

        // Cargar datos iniciales
        async function cargarDatosIniciales() {
            try {
                const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const productos = await prodRes.json();
                document.getElementById('stats-total-productos').textContent = productos.length;
                
                const stockBajo = productos.filter(p => p.stock_actual < 5).length;
                document.getElementById('stats-stock-bajo').textContent = stockBajo;
                
                const provRes = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const proveedores = await provRes.json();
                document.getElementById('stats-proveedores').textContent = proveedores.length;
                
                const perfRes = await fetch(`${SUPABASE_URL}/rest/v1/perfiles`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const perfiles = await perfRes.json();
                document.getElementById('stats-empleados').textContent = perfiles.length;
                
            } catch (error) {
                console.error('Error cargando datos iniciales:', error);
            }
        }

        // ===== FUNCIONES COMPRAS =====
        async function cargarCompras() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/compras?select=*,proveedores(nombre)&order=fecha.desc`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const compras = await response.json();
                
                const tbody = document.querySelector('#tabla-compras tbody');
                
                if (compras.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay compras registradas</td></tr>';
                    return;
                }
                
                const fechaInicio = new Date();
                fechaInicio.setDate(1);
                fechaInicio.setHours(0,0,0,0);
                
                const comprasMes = compras.filter(c => new Date(c.fecha) >= fechaInicio);
                const totalMes = comprasMes.reduce((sum, c) => sum + (c.total || 0), 0);
                document.getElementById('stats-compras-mes').textContent = `$${totalMes.toLocaleString()}`;
                
                const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
                document.getElementById('stats-compras-pendientes').textContent = pendientes;
                
                tbody.innerHTML = compras.map(compra => `
                    <tr>
                        <td>${new Date(compra.fecha).toLocaleDateString()}</td>
                        <td>${compra.proveedores?.nombre || 'N/A'}</td>
                        <td>${compra.producto || 'Varios'}</td>
                        <td><span style="background: #fff0f3; padding: 0.2rem 0.5rem; border-radius: 50px;">${compra.puc || '620501'}</span></td>
                        <td>${compra.cantidad || '-'}</td>
                        <td>$${(compra.total || 0).toLocaleString()}</td>
                        <td>
                            <span class="estado-badge ${compra.estado === 'Pagada' ? 'estado-pagada' : compra.estado === 'Recibida' ? 'estado-recibida' : 'estado-pendiente'}">
                                ${compra.estado || 'Pendiente'}
                            </span>
                        </td>
                        <td>
                            <button class="action-btn" onclick="editarCompra(${compra.id})" title="Editar">✏️</button>
                            <button class="action-btn delete-btn" onclick="eliminarCompra(${compra.id})" title="Eliminar">🗑️</button>
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Error cargando compras:', error);
            }
        }

        async function guardarCompra() {
            const compra = {
                proveedor_id: document.getElementById('compra-proveedor').value || null,
                puc: document.getElementById('compra-puc').value,
                fecha: document.getElementById('compra-fecha').value,
                producto: document.getElementById('compra-producto').value,
                cantidad: parseInt(document.getElementById('compra-cantidad').value),
                precio_unitario: parseFloat(document.getElementById('compra-precio').value),
                total: parseInt(document.getElementById('compra-cantidad').value) * parseFloat(document.getElementById('compra-precio').value),
                estado: document.getElementById('compra-estado').value
            };
            
            if (!compra.proveedor_id || !compra.fecha || !compra.producto) {
                mostrarAlerta('Por favor completa todos los campos obligatorios', 'error');
                return;
            }
            
            try {
                const token = JSON.parse(localStorage.getItem('admin_token'));
                
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
                    document.getElementById('compra-producto').value = '';
                    document.getElementById('compra-cantidad').value = '';
                    document.getElementById('compra-precio').value = '';
                } else {
                    mostrarAlerta('Error al guardar la compra', 'error');
                }
            } catch (error) {
                mostrarAlerta('Error de conexión', 'error');
            }
        }

        // ===== FUNCIONES GASTOS =====
        async function cargarGastos() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos?order=fecha.desc`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const gastos = await response.json();
                
                const tbody = document.querySelector('#tabla-gastos tbody');
                
                if (gastos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay gastos registrados</td></tr>';
                    return;
                }
                
                const fechaInicio = new Date();
                fechaInicio.setDate(1);
                fechaInicio.setHours(0,0,0,0);
                
                const gastosMes = gastos.filter(g => new Date(g.fecha) >= fechaInicio);
                const totalMes = gastosMes.reduce((sum, g) => sum + (g.monto || 0), 0);
                document.getElementById('stats-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
                
                tbody.innerHTML = gastos.map(gasto => `
                    <tr>
                        <td>${new Date(gasto.fecha).toLocaleDateString()}</td>
                        <td><span style="background: #fff0f3; padding: 0.2rem 0.5rem; border-radius: 50px;">${gasto.puc || '511005'}</span></td>
                        <td>${gasto.concepto}</td>
                        <td>${gasto.categoria}</td>
                        <td>$${(gasto.monto || 0).toLocaleString()}</td>
                        <td>${gasto.metodo_pago || 'Efectivo'}</td>
                        <td>
                            <button class="action-btn" onclick="editarGasto(${gasto.id})" title="Editar">✏️</button>
                            <button class="action-btn delete-btn" onclick="eliminarGasto(${gasto.id})" title="Eliminar">🗑️</button>
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Error cargando gastos:', error);
            }
        }

        async function guardarGasto() {
            const gasto = {
                fecha: document.getElementById('gasto-fecha').value,
                puc: document.getElementById('gasto-puc').value,
                concepto: document.getElementById('gasto-concepto').value,
                categoria: document.getElementById('gasto-categoria').value,
                monto: parseFloat(document.getElementById('gasto-monto').value),
                metodo_pago: document.getElementById('gasto-metodo').value
            };
            
            if (!gasto.fecha || !gasto.concepto || !gasto.categoria || !gasto.monto) {
                mostrarAlerta('Por favor completa todos los campos', 'error');
                return;
            }
            
            try {
                const token = JSON.parse(localStorage.getItem('admin_token'));
                
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
                    document.getElementById('gasto-concepto').value = '';
                    document.getElementById('gasto-monto').value = '';
                } else {
                    mostrarAlerta('Error al guardar el gasto', 'error');
                }
            } catch (error) {
                mostrarAlerta('Error de conexión', 'error');
            }
        }

        // ===== FUNCIONES PRODUCTOS =====
        async function cargarProductos() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        const productos = await response.json();
        
        const tbody = document.querySelector('#tabla-productos tbody');
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay productos registrados</td></tr>';
            return;
        }
        
        document.getElementById('stats-total-productos').textContent = productos.length;
        const stockBajo = productos.filter(p => p.stock_actual < 5).length;
        document.getElementById('stats-stock-bajo').textContent = stockBajo;
        
        // Función para obtener emoji según categoría
        function getEmojiCategoria(cat) {
            const emojis = {
                'vestidos': '👗',
                'blusas': '👚',
                'pantalones': '👖',
                'deportivo': '⚽',
                'caballero': '👔',
                'accesorios': '🎀'
            };
            return emojis[cat] || '📦';
        }
        
        tbody.innerHTML = productos.map(p => `
            <tr ${p.stock_actual < 5 ? 'style="background: #fff0f3;"' : ''}>
                <td>
                    ${p.imagen_url ? 
                        `<img src="${p.imagen_url}" alt="${p.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 10px;">` : 
                        `<div style="width: 50px; height: 50px; background: #ffe4e9; border-radius: 10px; display: flex; align-items: center; justify-content: center;">${getEmojiCategoria(p.categoria)}</div>`
                    }
                </td>
                <td>${p.codigo || '-'}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>
                    <span style="background: #ffe4e9; padding: 0.2rem 0.8rem; border-radius: 50px;">
                        ${getEmojiCategoria(p.categoria)} ${p.categoria || 'Sin categoría'}
                    </span>
                </td>
                <td>${p.talla || '-'}</td>
                <td>${p.color || '-'}</td>
                <td>$${(p.precio_venta || 0).toLocaleString()}</td>
                <td>
                    <span style="font-weight: bold; color: ${p.stock_actual < 5 ? '#ff4757' : '#27ae60'};">
                        ${p.stock_actual || 0}
                    </span>
                    ${p.stock_actual < 5 ? ' ⚠️' : ''}
                </td>
                <td><span style="background: #fff0f3; padding: 0.2rem 0.5rem; border-radius: 50px;">${p.puc || '143501'}</span></td>
                <td>
                    <button class="action-btn" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                    <button class="action-btn" onclick="ajustarStock(${p.id})" title="Ajustar stock">📦</button>
                    <button class="action-btn delete-btn" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

        async function guardarProducto() {
    const producto = {
        codigo: document.getElementById('producto-codigo').value,
        categoria: document.getElementById('producto-categoria').value,
        puc: document.getElementById('producto-puc').value,
        nombre: document.getElementById('producto-nombre').value,
        imagen_url: document.getElementById('producto-imagen').value || null,
        talla: document.getElementById('producto-talla').value || null,
        color: document.getElementById('producto-color').value || null,
        precio_compra: parseFloat(document.getElementById('producto-precio-compra').value),
        precio_venta: parseFloat(document.getElementById('producto-precio-venta').value),
        stock_actual: parseInt(document.getElementById('producto-stock').value),
        proveedor_id: document.getElementById('producto-proveedor').value || null
    };
    
    if (!producto.codigo || !producto.categoria || !producto.nombre || !producto.precio_venta) {
        mostrarAlerta('Código, categoría, nombre y precio de venta son obligatorios', 'error');
        return;
    }
    
    try {
        const token = JSON.parse(localStorage.getItem('admin_token'));
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('🌸 Producto guardado correctamente', 'success');
            cerrarFormulario('producto');
            await cargarProductos();
            // Limpiar formulario
            document.getElementById('producto-codigo').value = '';
            document.getElementById('producto-categoria').value = '';
            document.getElementById('producto-nombre').value = '';
            document.getElementById('producto-imagen').value = '';
            document.getElementById('producto-talla').value = '';
            document.getElementById('producto-color').value = '';
            document.getElementById('producto-precio-compra').value = '';
            document.getElementById('producto-precio-venta').value = '';
            document.getElementById('producto-stock').value = '';
        } else {
            const error = await response.json();
            mostrarAlerta('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'error');
    }
}
        // ===== FUNCIONES PROVEEDORES =====
        async function cargarProveedores() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?order=nombre`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const proveedores = await response.json();
                
                const tbody = document.querySelector('#tabla-proveedores tbody');
                
                if (proveedores.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay proveedores registrados</td></tr>';
                    return;
                }
                
                document.getElementById('stats-proveedores').textContent = proveedores.length;
                
                tbody.innerHTML = proveedores.map(p => `
                    <tr>
                        <td><strong>${p.nombre}</strong></td>
                        <td>${p.contacto || '-'}</td>
                        <td>${p.telefono || '-'}</td>
                        <td>${p.email || '-'}</td>
                        <td>
                            <button class="action-btn" onclick="editarProveedor(${p.id})" title="Editar">✏️</button>
                            <button class="action-btn delete-btn" onclick="eliminarProveedor(${p.id})" title="Eliminar">🗑️</button>
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Error cargando proveedores:', error);
            }
        }

        async function cargarProveedoresSelect(origen) {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores?select=id,nombre&order=nombre`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const proveedores = await response.json();
                
                const select = document.getElementById(`${origen}-proveedor`);
                if (!select) return;
                
                select.innerHTML = '<option value="">Seleccionar proveedor</option>' +
                    proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
                    
            } catch (error) {
                console.error('Error cargando proveedores:', error);
            }
        }

        async function guardarProveedor() {
            const proveedor = {
                nombre: document.getElementById('proveedor-nombre').value,
                contacto: document.getElementById('proveedor-contacto').value || null,
                telefono: document.getElementById('proveedor-telefono').value || null,
                email: document.getElementById('proveedor-email').value || null,
                direccion: document.getElementById('proveedor-direccion').value || null
            };
            
            if (!proveedor.nombre) {
                mostrarAlerta('El nombre del proveedor es obligatorio', 'error');
                return;
            }
            
            try {
                const token = JSON.parse(localStorage.getItem('admin_token'));
                
                const response = await fetch(`${SUPABASE_URL}/rest/v1/proveedores`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${token.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(proveedor)
                });
                
                if (response.ok) {
                    mostrarAlerta('🌸 Proveedor guardado correctamente', 'success');
                    cerrarFormulario('proveedor');
                    await cargarProveedores();
                    document.getElementById('proveedor-nombre').value = '';
                    document.getElementById('proveedor-contacto').value = '';
                    document.getElementById('proveedor-telefono').value = '';
                    document.getElementById('proveedor-email').value = '';
                    document.getElementById('proveedor-direccion').value = '';
                } else {
                    mostrarAlerta('Error al guardar el proveedor', 'error');
                }
            } catch (error) {
                mostrarAlerta('Error de conexión', 'error');
            }
        }

        // ===== FUNCIONES PERFILES =====
        async function cargarPerfiles() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?order=created_at.desc`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const perfiles = await response.json();
                
                const tbody = document.querySelector('#tabla-perfiles tbody');
                
                if (perfiles.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios registrados</td></tr>';
                    return;
                }
                
                document.getElementById('stats-empleados').textContent = perfiles.length;
                
                tbody.innerHTML = perfiles.map(p => `
                    <tr>
                        <td><strong>${p.nombre || 'Sin nombre'}</strong></td>
                        <td>${p.email}</td>
                        <td>
                            <span style="background: ${p.rol === 'admin' ? '#ff9a9e' : '#ffb6c1'}; 
                                         color: white; padding: 0.2rem 0.8rem; border-radius: 50px;">
                                ${p.rol || 'empleado'}
                            </span>
                        </td>
                        <td>${new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="action-btn" onclick="editarPerfil('${p.id}')" title="Editar">✏️</button>
                            ${p.id !== currentUser?.id ? 
                                `<button class="action-btn delete-btn" onclick="eliminarPerfil('${p.id}')" title="Eliminar">🗑️</button>` 
                                : ''}
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Error cargando perfiles:', error);
            }
        }

        async function guardarPerfil() {
            const nombre = document.getElementById('perfil-nombre').value;
            const email = document.getElementById('perfil-email').value;
            const password = document.getElementById('perfil-password').value;
            const rol = document.getElementById('perfil-rol').value;
            
            if (!nombre || !email || !password) {
                mostrarAlerta('Todos los campos son obligatorios', 'error');
                return;
            }
            
            try {
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
                
                const token = JSON.parse(localStorage.getItem('admin_token'));
                
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
                mostrarAlerta('Error: ' + error.message, 'error');
            }
        }
        // ===== FUNCIONES PARA VENTAS =====
        async function cargarVentas() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/ventas?select=*&order=fecha.desc`, {
                    headers: { 'apikey': SUPABASE_KEY }
                });
                const ventas = await response.json();
                
                const tbody = document.querySelector('#tabla-ventas tbody');
                
                if (ventas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas registradas</td></tr>';
                    return;
                }
                
                // Ventas de hoy
                const hoy = new Date();
                hoy.setHours(0,0,0,0);
                
                const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
                const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
                document.getElementById('stats-ventas-hoy').textContent = `$${totalHoy.toLocaleString()}`;
                
                // Ventas del mes
                const fechaInicio = new Date();
                fechaInicio.setDate(1);
                fechaInicio.setHours(0,0,0,0);
                
                const ventasMes = ventas.filter(v => new Date(v.fecha) >= fechaInicio);
                const totalMes = ventasMes.reduce((sum, v) => sum + (v.total || 0), 0);
                document.getElementById('stats-ventas-mes').textContent = `$${totalMes.toLocaleString()}`;
                
                tbody.innerHTML = ventas.map(venta => `
                    <tr>
                        <td>${new Date(venta.fecha).toLocaleString()}</td>
                        <td>${venta.productos || 'Venta'}</td>
                        <td>$${(venta.total || 0).toLocaleString()}</td>
                        <td>
                            <span style="background: #ffe4e9; padding: 0.2rem 0.8rem; border-radius: 50px;">
                                ${venta.metodo_pago || 'Efectivo'}
                            </span>
                        </td>
                        <td>${venta.vendedor || '-'}</td>
                        <td>
                            <button class="action-btn" onclick="verFactura(${venta.id})" title="Ver factura">🧾</button>
                        </td>
                    </tr>
                `).join('');
                
            } catch (error) {
                console.error('Error cargando ventas:', error);
            }
        }

        // ===== FUNCIONES UTILITARIAS =====
        function mostrarFormulario(tipo) {
            document.getElementById(`form-${tipo}`).classList.add('active');
        }

        function cerrarFormulario(tipo) {
            document.getElementById(`form-${tipo}`).classList.remove('active');
        }

        function mostrarAlerta(mensaje, tipo) {
            const alerta = document.getElementById('alertMessage');
            alerta.textContent = mensaje;
            alerta.className = `alert ${tipo}`;
            alerta.style.display = 'block';
            
            setTimeout(() => {
                alerta.style.display = 'none';
            }, 3000);
        }

        // Funciones placeholder
        function editarCompra(id) { alert('Editar compra ' + id); }
        function eliminarCompra(id) { if(confirm('¿Eliminar esta compra?')) alert('Eliminar ' + id); }
        function editarGasto(id) { alert('Editar gasto ' + id); }
        function eliminarGasto(id) { if(confirm('¿Eliminar este gasto?')) alert('Eliminar ' + id); }
        function editarProducto(id) { alert('Editar producto ' + id); }
        function ajustarStock(id) { alert('Ajustar stock ' + id); }
        function eliminarProducto(id) { if(confirm('¿Eliminar este producto?')) alert('Eliminar ' + id); }
        function editarProveedor(id) { alert('Editar proveedor ' + id); }
        function eliminarProveedor(id) { if(confirm('¿Eliminar este proveedor?')) alert('Eliminar ' + id); }
        function editarPerfil(id) { alert('Editar perfil ' + id); }
        function eliminarPerfil(id) { if(confirm('¿Eliminar este usuario?')) alert('Eliminar ' + id); }
    </script>
