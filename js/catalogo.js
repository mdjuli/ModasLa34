// ============================================
// 🌸 CATÁLOGO PÚBLICO - MODAS LA 34
// ============================================

// Variable global para almacenar todos los productos
let todosLosProductos = [];
let categoriaActual = 'todos';

// Cargar productos al iniciar la página
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Catálogo iniciado');
    await cargarProductos();
    configurarBuscador();
});

// Función para cargar productos desde Supabase
async function cargarProductos() {
    try {
        // Mostrar indicador de carga
        const catalogo = document.getElementById('catalogo-productos');
        catalogo.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Cargando productos...</div>';
        
        // Usar la vista completa que ya tiene las variantes agregadas
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        todosLosProductos = await response.json();
        console.log('✅ Productos cargados:', todosLosProductos.length);
        console.log('📦 Datos completos:', todosLosProductos);
        
        // Mostrar todos los productos inicialmente
        mostrarProductos('todos');
        
    } catch (error) {
        console.error('❌ Error:', error);
        document.getElementById('catalogo-productos').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ff4757;">
                ❌ Error al cargar los productos. Intenta de nuevo más tarde.
            </div>
        `;
    }
}

// Función para filtrar productos por categoría
function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    mostrarProductos(categoria);
    
    // Actualizar el texto del menú
    const dropbtn = document.querySelector('.dropbtn');
    if (dropbtn) {
        const nombresCategoria = {
            'todos': '🔥 Todos los productos',
            'vestidos': '👗 Vestidos',
            'blusas': '👚 Blusas',
            'pantalones': '👖 Pantalones',
            'deportivo': '⚽ Deportivo',
            'caballero': '👔 Caballero',
            'accesorios': '🎀 Accesorios'
        };
        dropbtn.innerHTML = `${nombresCategoria[categoria] || 'Inicio'} ▼`;
    }
}

// Función para mostrar productos según categoría
function mostrarProductos(categoria) {
    const catalogo = document.getElementById('catalogo-productos');
    
    // Filtrar productos
    let productosFiltrados = todosLosProductos;
    
    if (categoria !== 'todos') {
        productosFiltrados = todosLosProductos.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase()
        );
    }
    
    // Si no hay productos en la categoría
    if (productosFiltrados.length === 0) {
        catalogo.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a5a5a5;">
                🛍️ No hay productos en esta categoría
            </div>
        `;
        return;
    }
    
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
    
    // Función para generar círculos de colores
    function generarCirculosColores(variantes) {
        if (!variantes || variantes.length === 0) return '';
        
        // Obtener colores únicos (para no repetir)
        const coloresUnicos = [];
        const coloresVistos = new Set();
        
        variantes.forEach(v => {
            const clave = `${v.color_codigo}-${v.color_nombre}`;
            if (!coloresVistos.has(clave) && v.color_codigo) {
                coloresVistos.add(clave);
                coloresUnicos.push({
                    nombre: v.color_nombre || 'Color',
                    codigo: v.color_codigo
                });
            }
        });
        
        if (coloresUnicos.length === 0) return '';
        
        return `
            <div class="producto-colores" style="display: flex; gap: 5px; margin: 8px 0; flex-wrap: wrap;">
                ${coloresUnicos.map(c => `
                    <span style="
                        display: inline-block; 
                        width: 25px; 
                        height: 25px; 
                        background-color: ${c.codigo}; 
                        border-radius: 50%; 
                        border: 2px solid white; 
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        cursor: pointer;
                        transition: transform 0.2s;
                        title="${c.nombre}"
                    "></span>
                `).join('')}
            </div>
        `;
    }
    
    // Función para obtener tallas únicas
    function obtenerTallas(variantes) {
        if (!variantes || variantes.length === 0) return '';
        
        const tallas = [...new Set(variantes.map(v => v.talla))];
        return tallas.join(' - ');
    }
    
    // Función para obtener rango de precios
    function obtenerPrecio(variantes) {
        if (!variantes || variantes.length === 0) return '$0';
        
        const precios = variantes.map(v => v.precio_venta || 0);
        const min = Math.min(...precios);
        const max = Math.max(...precios);
        
        if (min === max) {
            return `$${min.toLocaleString()}`;
        } else {
            return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
        }
    }
    
    // Generar HTML de los productos
    catalogo.innerHTML = productosFiltrados.map(p => {
        const variantes = p.variantes || [];
        const tallasTexto = obtenerTallas(variantes);
        const precioTexto = obtenerPrecio(variantes);
        const coloresHTML = generarCirculosColores(variantes);
        const stockTotal = variantes.reduce((sum, v) => sum + (v.stock || 0), 0);
        
        return `
            <div class="producto-card" onclick="verProducto(${p.id})" style="cursor: pointer;">
                ${p.imagen_url ? 
                    `<img src="${p.imagen_url}" alt="${p.nombre}" class="producto-imagen">` : 
                    `<div class="producto-sin-imagen">
                        <span class="producto-emoji">${getEmojiCategoria(p.categoria)}</span>
                    </div>`
                }
                <div class="producto-info">
                    <h3 class="producto-titulo">${p.nombre}</h3>
                    
                    ${tallasTexto ? `
                        <p class="producto-detalle" style="font-size: 0.9rem; color: #666;">
                            <strong>Tallas:</strong> ${tallasTexto}
                        </p>
                    ` : ''}
                    
                    ${coloresHTML}
                    
                    <p class="producto-precio">${precioTexto}</p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span style="font-size: 0.8rem; color: ${stockTotal > 0 ? '#27ae60' : '#ff4757'};">
                            ${stockTotal > 0 ? '✅ En stock' : '❌ Agotado'}
                        </span>
                        <button class="producto-btn" onclick="verProducto(${p.id}); event.stopPropagation();">
                            🔍 Ver más
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNCIÓN PARA VER PRODUCTO EN MODAL =====
let productoActual = null;

async function verProducto(id) {
    try {
        console.log('🖱️ Ver producto:', id);
        
        // Buscar el producto en la lista
        productoActual = todosLosProductos.find(p => p.id === id);
        
        if (!productoActual) {
            alert('Producto no encontrado');
            return;
        }
        
        console.log('Producto seleccionado:', productoActual);
        
        // Llenar el modal
        llenarModal(productoActual);
        
        // Mostrar el modal
        const modal = document.getElementById('modal-producto');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Modal no encontrado en el DOM');
            alert('Error: Modal no encontrado');
        }
        
    } catch (error) {
        console.error('Error al cargar producto:', error);
        alert('Error al cargar el producto');
    }
}

// Función para llenar el modal
function llenarModal(producto) {
    const contenedor = document.getElementById('modal-contenido-producto');
    if (!contenedor) return;
    
    const variantes = producto.variantes || [];
    
    // Emoji según categoría
    const emojis = {
        'vestidos': '👗',
        'blusas': '👚',
        'pantalones': '👖',
        'deportivo': '⚽',
        'caballero': '👔',
        'accesorios': '🎀'
    };
    const emoji = emojis[producto.categoria] || '📦';
    
    // Agrupar variantes por talla
    const variantesPorTalla = {};
    variantes.forEach(v => {
        if (!variantesPorTalla[v.talla]) {
            variantesPorTalla[v.talla] = [];
        }
        variantesPorTalla[v.talla].push(v);
    });
    
    // Calcular stock total
    const stockTotal = variantes.reduce((sum, v) => sum + (v.stock || 0), 0);
    
    // Generar HTML de variantes
    let variantesHTML = '';
    
    if (variantes.length > 0) {
        variantesHTML = '<div style="margin: 1.5rem 0;">';
        variantesHTML += '<h4 style="color: #ff6b6b; margin-bottom: 1rem;">📋 Tallas y colores disponibles:</h4>';
        
        for (const [talla, vars] of Object.entries(variantesPorTalla)) {
            variantesHTML += `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fff9fc; border-radius: 15px; border: 1px solid #ffe4e9;">
                    <h5 style="color: #ff6b6b; margin-bottom: 0.8rem;">Talla ${talla}</h5>
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
            `;
            
            vars.forEach(v => {
                const stockClass = v.stock > 5 ? 'disponible' : (v.stock > 0 ? 'bajo' : 'agotado');
                const stockColor = v.stock > 5 ? '#27ae60' : (v.stock > 0 ? '#f39c12' : '#ff4757');
                
                variantesHTML += `
                    <div style="text-align: center; min-width: 80px;">
                        <div style="
                            display: inline-block;
                            width: 50px;
                            height: 50px;
                            background-color: ${v.color_codigo || '#cccccc'};
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                            margin-bottom: 5px;
                        "></div>
                        <p style="font-size: 0.9rem; font-weight: bold; margin: 5px 0;">${v.color_nombre || 'Color'}</p>
                        <p style="font-size: 0.8rem; color: ${stockColor};">
                            ${v.stock > 0 ? `Stock: ${v.stock}` : 'Agotado'}
                        </p>
                        <p style="font-size: 0.9rem; font-weight: bold;">$${(v.precio_venta || 0).toLocaleString()}</p>
                    </div>
                `;
            });
            
            variantesHTML += '</div></div>';
        }
        
        variantesHTML += '</div>';
    } else {
        variantesHTML = '<p style="color: #a5a5a5; text-align: center;">No hay variantes disponibles</p>';
    }
    
    // Precio
    const precios = variantes.map(v => v.precio_venta || 0);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);
    const precioTexto = precioMin === precioMax ? 
        `$${precioMin.toLocaleString()}` : 
        `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
    
    contenedor.innerHTML = `
        <div class="modal-grid">
            <div class="modal-imagen">
                ${producto.imagen_url ? 
                    `<img src="${producto.imagen_url}" alt="${producto.nombre}" style="width:100%; border-radius:15px;">` : 
                    `<div class="modal-imagen-placeholder">
                        <span style="font-size: 5rem;">${emoji}</span>
                    </div>`
                }
            </div>
            <div class="modal-info">
                <h2 style="color: #ff6b6b;">${producto.nombre}</h2>
                <span class="modal-codigo">Código: ${producto.codigo || 'N/A'}</span>
                
                <div class="modal-detalle">
                    <p><strong>Categoría:</strong> ${emoji} ${producto.categoria || 'General'}</p>
                    <p><strong>Stock total:</strong> ${stockTotal} unidades</p>
                    
                    ${variantesHTML}
                </div>
                
                <div class="modal-precio">
                    ${precioTexto}
                </div>
                
                <div class="modal-botones">
                    <button class="modal-btn btn-consultar" onclick="consultarProducto()">
                        📱 Consultar disponibilidad
                    </button>
                    <button class="modal-btn btn-cerrar" onclick="cerrarModal()">
                        ❌ Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    productoActual = null;
}

// Función para consultar producto
function consultarProducto() {
    if (!productoActual) return;
    
    // Crear un modal de contacto
    const contactModal = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; border-radius: 25px; padding: 2rem; max-width: 400px; width: 90%;">
                <h3 style="color: #ff6b6b; margin-bottom: 1rem;">📱 Contactar por: ${productoActual.nombre}</h3>
                
                <div style="margin: 1.5rem 0;">
                    <a href="https://wa.me/573208049635?text=${encodeURIComponent('Hola, me interesa ' + productoActual.nombre)}" 
                       target="_blank"
                       style="display: block; background: #25D366; color: white; text-decoration: none; padding: 1rem; border-radius: 50px; margin-bottom: 1rem; text-align: center;">
                        💬 WhatsApp
                    </a>
                    
                    <a href="tel:+573208049635" 
                       style="display: block; background: #ff9a9e; color: white; text-decoration: none; padding: 1rem; border-radius: 50px; margin-bottom: 1rem; text-align: center;">
                        📞 Llamar ahora
                    </a>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #ffe4e9; color: #ff6b6b; border: none; padding: 0.8rem; border-radius: 50px; width: 100%; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', contactModal);
}

// ===== FUNCIONES DEL BUSCADOR =====
function configurarBuscador() {
    // Crear buscador si no existe
    const main = document.querySelector('main');
    const buscadorExistente = document.getElementById('buscador-productos');
    
    if (!buscadorExistente) {
        const buscadorHTML = `
            <div class="buscador-container">
                <input type="text" id="buscador-productos" placeholder="🔍 Buscar productos por nombre, talla o color..." class="buscador-input">
            </div>
        `;
        main.insertAdjacentHTML('afterbegin', buscadorHTML);
    }
    
    // Agregar evento de búsqueda
    const buscador = document.getElementById('buscador-productos');
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase().trim();
            
            if (busqueda === '') {
                mostrarProductos(categoriaActual);
            } else {
                // Filtrar productos por nombre, talla o color
                const productosFiltrados = todosLosProductos.filter(p => {
                    // Buscar en nombre
                    if (p.nombre.toLowerCase().includes(busqueda)) return true;
                    
                    // Buscar en categoría
                    if (p.categoria && p.categoria.toLowerCase().includes(busqueda)) return true;
                    
                    // Buscar en variantes (tallas y colores)
                    if (p.variantes) {
                        for (const v of p.variantes) {
                            if (v.talla && v.talla.toLowerCase().includes(busqueda)) return true;
                            if (v.color_nombre && v.color_nombre.toLowerCase().includes(busqueda)) return true;
                        }
                    }
                    
                    return false;
                });
                
                const catalogo = document.getElementById('catalogo-productos');
                
                if (productosFiltrados.length === 0) {
                    catalogo.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a5a5a5;">
                            🔍 No se encontraron productos para "${busqueda}"
                        </div>
                    `;
                } else {
                    // Usar la misma función de mostrar pero con productos filtrados
                    const categoriaOriginal = categoriaActual;
                    categoriaActual = 'todos';
                    const productosOriginal = todosLosProductos;
                    todosLosProductos = productosFiltrados;
                    mostrarProductos('todos');
                    todosLosProductos = productosOriginal;
                    categoriaActual = categoriaOriginal;
                }
            }
        });
    }
}

// ===== EVENTOS DEL MODAL =====
// Cerrar modal si se hace clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
}

// Cerrar con tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
    }
});
