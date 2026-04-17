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
    
    // Verificar que el modal existe en el HTML
    const modal = document.getElementById('modal-producto');
    if (!modal) {
        console.error('❌ Modal no encontrado en el HTML');
    }
});

// Función para cargar productos desde Supabase
async function cargarProductos() {
    try {
        // Mostrar indicador de carga
        const catalogo = document.getElementById('catalogo-productos');
        if (!catalogo) {
            console.error('❌ No se encontró el elemento catalogo-productos');
            return;
        }
        
        catalogo.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Cargando productos...</div>';
        
        // Usar la vista completa con la nueva estructura
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        todosLosProductos = await response.json();
        console.log('✅ Productos cargados:', todosLosProductos);
        
        // Mostrar todos los productos inicialmente
        mostrarProductos('todos');
        
    } catch (error) {
        console.error('❌ Error:', error);
        const catalogo = document.getElementById('catalogo-productos');
        if (catalogo) {
            catalogo.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ff4757;">
                    ❌ Error al cargar los productos. Intenta de nuevo más tarde.
                </div>
            `;
        }
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

// Función para obtener todas las tallas únicas de un producto
function obtenerTallasUnicas(producto) {
    const variantes = producto.variantes || [];
    return variantes.map(v => v.talla).filter((v, i, a) => a.indexOf(v) === i);
}

// Función para obtener todos los colores únicos de un producto
function obtenerColoresUnicos(producto) {
    const variantes = producto.variantes || [];
    const coloresVistos = new Set();
    const coloresUnicos = [];
    
    variantes.forEach(v => {
        const colores = v.colores || [];
        colores.forEach(c => {
            if (c.codigo && !coloresVistos.has(c.codigo)) {
                coloresVistos.add(c.codigo);
                coloresUnicos.push({
                    nombre: c.nombre || 'Color',
                    codigo: c.codigo
                });
            }
        });
    });
    
    return coloresUnicos;
}

// Función para obtener el rango de precios
function obtenerRangoPrecios(producto) {
    const variantes = producto.variantes || [];
    const precios = variantes.map(v => v.precio_venta || 0);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    
    if (min === max) {
        return `$${min.toLocaleString()}`;
    }
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

// Función para obtener el stock total
function obtenerStockTotal(producto) {
    const variantes = producto.variantes || [];
    let total = 0;
    variantes.forEach(v => {
        const colores = v.colores || [];
        colores.forEach(c => {
            total += c.stock || 0;
        });
    });
    return total;
}

// Función para mostrar productos según categoría
function mostrarProductos(categoria) {
    const catalogo = document.getElementById('catalogo-productos');
    if (!catalogo) return;
    
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
    catalogo.innerHTML = productosFiltrados.map(p => {
        const tallasUnicas = obtenerTallasUnicas(p);
        const coloresUnicos = obtenerColoresUnicos(p);
        const stockTotal = obtenerStockTotal(p);
        const rangoPrecios = obtenerRangoPrecios(p);
        
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
                    
                    ${tallasUnicas.length > 0 ? `
                        <p class="producto-detalle" style="font-size: 0.9rem; color: #666;">
                            <strong>Tallas:</strong> ${tallasUnicas.join(' - ')}
                        </p>
                    ` : ''}
                    
                    ${coloresUnicos.length > 0 ? `
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
                                " title="${c.nombre}"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <p class="producto-precio">${rangoPrecios}</p>
                    
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

// Función para llenar el modal (actualizada para la nueva estructura)
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
    
    // Calcular stock total
    let stockTotal = 0;
    variantes.forEach(v => {
        const colores = v.colores || [];
        colores.forEach(c => {
            stockTotal += c.stock || 0;
        });
    });
    
    // Generar HTML de tallas y colores
    let tallasHTML = '';
    
    if (variantes.length > 0) {
        tallasHTML = '<div style="margin: 1.5rem 0;">';
        tallasHTML += '<h4 style="color: #ff6b6b; margin-bottom: 1rem;">📋 Tallas y colores disponibles:</h4>';
        
        variantes.forEach(v => {
            const colores = v.colores || [];
            if (colores.length > 0) {
                tallasHTML += `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fff9fc; border-radius: 15px; border: 1px solid #ffe4e9;">
                        <h5 style="color: #ff6b6b; margin-bottom: 0.8rem;">Talla ${v.talla} - Precio: $${(v.precio_venta || 0).toLocaleString()}</h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
                `;
                
                colores.forEach(c => {
                    const stockColor = c.stock > 5 ? '#27ae60' : (c.stock > 0 ? '#f39c12' : '#ff4757');
                    
                    tallasHTML += `
                        <div style="text-align: center; padding: 0.8rem; background: white; border-radius: 10px;">
                            <div style="
                                display: inline-block;
                                width: 40px;
                                height: 40px;
                                background-color: ${c.codigo || '#cccccc'};
                                border-radius: 50%;
                                border: 3px solid white;
                                box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                                margin-bottom: 5px;
                            "></div>
                            <p style="font-size: 0.9rem; font-weight: bold; margin: 5px 0;">${c.nombre || 'Color'}</p>
                            <p style="font-size: 0.8rem; color: ${stockColor};">
                                Stock: ${c.stock}
                            </p>
                        </div>
                    `;
                });
                
                tallasHTML += `</div></div>`;
            } else {
                // Sin colores específicos
                tallasHTML += `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fff9fc; border-radius: 15px; border: 1px solid #ffe4e9;">
                        <h5 style="color: #ff6b6b; margin-bottom: 0.8rem;">Talla ${v.talla}</h5>
                        <p style="color: #a5a5a5;">Stock disponible: ${v.stock_total || 0} unidades</p>
                        <p><strong>Precio:</strong> $${(v.precio_venta || 0).toLocaleString()}</p>
                    </div>
                `;
            }
        });
        
        tallasHTML += '</div>';
    } else {
        tallasHTML = '<p style="color: #a5a5a5; text-align: center;">No hay variantes disponibles</p>';
    }
    
    // Obtener rango de precios
    const precios = variantes.map(v => v.precio_venta || 0);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);
    const rangoPrecios = precioMin === precioMax ? 
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
                    
                    ${tallasHTML}
                </div>
                
                <div class="modal-precio">
                    ${rangoPrecios}
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
    
    alert(`📱 Para consultar sobre "${productoActual.nombre}", contáctanos:\n\nWhatsApp: 300 123 4567\nEmail: ventas@modasla34.com`);
}

// ===== FUNCIONES DEL BUSCADOR =====
function configurarBuscador() {
    const main = document.querySelector('main');
    if (!main) return;
    
    let buscador = document.getElementById('buscador-productos');
    
    if (!buscador) {
        const buscadorHTML = `
            <div class="buscador-container">
                <input type="text" id="buscador-productos" placeholder="🔍 Buscar productos por nombre, talla o color..." class="buscador-input">
            </div>
        `;
        main.insertAdjacentHTML('afterbegin', buscadorHTML);
        buscador = document.getElementById('buscador-productos');
    }
    
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase().trim();
            
            if (busqueda === '') {
                mostrarProductos(categoriaActual);
            } else {
                const productosFiltrados = todosLosProductos.filter(p => {
                    if (p.nombre?.toLowerCase().includes(busqueda)) return true;
                    if (p.categoria?.toLowerCase().includes(busqueda)) return true;
                    
                    const variantes = p.variantes || [];
                    for (const v of variantes) {
                        if (v.talla?.toLowerCase().includes(busqueda)) return true;
                        const colores = v.colores || [];
                        for (const c of colores) {
                            if (c.nombre?.toLowerCase().includes(busqueda)) return true;
                        }
                    }
                    return false;
                });
                
                const catalogo = document.getElementById('catalogo-productos');
                if (!catalogo) return;
                
                if (productosFiltrados.length === 0) {
                    catalogo.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a5a5a5;">
                            🔍 No se encontraron productos para "${busqueda}"
                        </div>
                    `;
                } else {
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
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
    }
});
