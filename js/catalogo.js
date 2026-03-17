// ============================================
// 🌸 CATÁLOGO PÚBLICO - MODAS LA 34
// ============================================

// Variable global para almacenar todos los productos
let todosLosProductos = [];
let categoriaActual = 'todos';

// Cargar productos al iniciar la página
document.addEventListener('DOMContentLoaded', async () => {
    await cargarProductos();
    configurarBuscador();
});

// Función para cargar productos desde Supabase
async function cargarProductos() {
    try {
        // Mostrar indicador de carga
        const catalogo = document.getElementById('catalogo-productos');
        catalogo.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Cargando productos...</div>';
        
        // Obtener productos con stock > 0
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&stock_actual.gt.0&order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        todosLosProductos = await response.json();
        
        // Mostrar todos los productos inicialmente
        mostrarProductos('todos');
        
    } catch (error) {
        console.error('Error:', error);
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
    
    // Actualizar el texto del menú (opcional, para feedback visual)
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
    
    // Generar HTML de los productos
    catalogo.innerHTML = productosFiltrados.map(p => `
        <div class="producto-card">
            ${p.imagen_url ? 
                `<img src="${p.imagen_url}" alt="${p.nombre}" class="producto-imagen">` : 
                `<div class="producto-sin-imagen">
                    <span class="producto-emoji">${getEmojiCategoria(p.categoria)}</span>
                </div>`
            }
            <div class="producto-info">
                <h3 class="producto-titulo">${p.nombre}</h3>
                <p class="producto-detalle">
                    ${p.talla ? `<span>Talla: ${p.talla}</span>` : ''}
                    ${p.color ? `<span>Color: ${p.color}</span>` : ''}
                </p>
                <p class="producto-precio">$${(p.precio_venta || 0).toLocaleString()}</p>
                <button class="producto-btn" onclick="verProducto(${p.id})">Ver más</button>
            </div>
        </div>
    `).join('');
}

// Función para configurar el buscador en tiempo real
function configurarBuscador() {
    // Crear buscador si no existe
    const main = document.querySelector('main');
    const buscadorExistente = document.getElementById('buscador-productos');
    
    if (!buscadorExistente) {
        const buscadorHTML = `
            <div class="buscador-container">
                <input type="text" id="buscador-productos" placeholder="🔍 Buscar productos..." class="buscador-input">
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
                // Si no hay búsqueda, mostrar según categoría actual
                mostrarProductos(categoriaActual);
            } else {
                // Filtrar productos por nombre o descripción
                const productosFiltrados = todosLosProductos.filter(p => 
                    p.nombre.toLowerCase().includes(busqueda) ||
                    (p.categoria && p.categoria.toLowerCase().includes(busqueda)) ||
                    (p.color && p.color.toLowerCase().includes(busqueda))
                );
                
                // Mostrar resultados de búsqueda
                const catalogo = document.getElementById('catalogo-productos');
                
                if (productosFiltrados.length === 0) {
                    catalogo.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a5a5a5;">
                            🔍 No se encontraron productos para "${busqueda}"
                        </div>
                    `;
                } else {
                    catalogo.innerHTML = productosFiltrados.map(p => `
                        <div class="producto-card">
                            ${p.imagen_url ? 
                                `<img src="${p.imagen_url}" alt="${p.nombre}" class="producto-imagen">` : 
                                `<div class="producto-sin-imagen">
                                    <span class="producto-emoji">📦</span>
                                </div>`
                            }
                            <div class="producto-info">
                                <h3 class="producto-titulo">${p.nombre}</h3>
                                <p class="producto-precio">$${(p.precio_venta || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        });
    }
}

// Función para ver detalles del producto (placeholder por ahora)
function verProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    
    if (!producto) {
        alert('Producto no encontrado');
        return;
    }
    
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
    
    const contenido = `
        <div class="detalle-producto">
            ${producto.imagen_url ? 
                `<img src="${producto.imagen_url}" alt="${producto.nombre}" class="detalle-imagen">` : 
                `<div class="detalle-sin-imagen">${getEmojiCategoria(producto.categoria)}</div>`
            }
            
            <h2 class="detalle-titulo">${producto.nombre}</h2>
            <div class="detalle-precio">$${(producto.precio_venta || 0).toLocaleString()}</div>
            
            <div class="detalle-info-grid">
                ${producto.categoria ? `
                    <div class="detalle-info-item">
                        <div class="detalle-info-label">Categoría</div>
                        <div class="detalle-info-valor">${getEmojiCategoria(producto.categoria)} ${producto.categoria}</div>
                    </div>
                ` : ''}
                
                ${producto.talla ? `
                    <div class="detalle-info-item">
                        <div class="detalle-info-label">Talla</div>
                        <div class="detalle-info-valor">${producto.talla}</div>
                    </div>
                ` : ''}
                
                ${producto.color ? `
                    <div class="detalle-info-item">
                        <div class="detalle-info-label">Color</div>
                        <div class="detalle-info-valor">${producto.color}</div>
                    </div>
                ` : ''}
                
                ${producto.codigo ? `
                    <div class="detalle-info-item">
                        <div class="detalle-info-label">Código</div>
                        <div class="detalle-info-valor">${producto.codigo}</div>
                    </div>
                ` : ''}
            </div>
            
            ${producto.descripcion ? `
                <div class="detalle-descripcion">
                    ${producto.descripcion}
                </div>
            ` : ''}
            
            <div class="detalle-stock">
                ${producto.stock_actual > 0 ? 
                    `<span class="stock-disponible">✅ Stock disponible: ${producto.stock_actual} unidades</span>` : 
                    `<span class="stock-agotado">❌ Producto agotado</span>`
                }
            </div>
            
            <div class="detalle-acciones">
                <button class="detalle-btn btn-comprar" onclick="comprarProducto(${producto.id})" ${producto.stock_actual <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    🛍️ Comprar
                </button>
                <button class="detalle-btn btn-contactar" onclick="contactarVendedor('${producto.nombre}')">
                    💬 Contactar
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('modal-contenido-producto').innerHTML = contenido;
    
    const modal = document.getElementById('modal-producto');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Función para cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Función para comprar
function comprarProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    const token = localStorage.getItem('admin_token');
    
    if (token) {
        window.location.href = `admin/venta-rapida.html?producto=${id}`;
    } else {
        alert(`Para comprar ${producto.nombre}, por favor contacta a la tienda al WhatsApp o visita el local.`);
    }
    
    cerrarModal();
}

// Función para contactar vendedor
function contactarVendedor(nombreProducto) {
    const mensaje = encodeURIComponent(`Hola, me interesa comprar ${nombreProducto} de Modas La 34. ¿Está disponible?`);
    window.open(`https://wa.me/573001234567?text=${mensaje}`, '_blank');
    cerrarModal();
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
}
}
