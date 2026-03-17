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
    alert('Función de detalle de producto próximamente');
    // Aquí luego podemos abrir un modal o ir a una página de detalle
}
