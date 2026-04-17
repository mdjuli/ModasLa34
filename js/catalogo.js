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

// ============================================
// FUNCIONES PARA ORDENAR TALLAS CORRECTAMENTE
// ============================================

// Función para ordenar tallas numérica y alfabéticamente
function ordenarTallas(tallas) {
    const ordenTallas = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7,
        '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
        '6': 10, '7': 11, '8': 12, '9': 13, '10': 14, '11': 15, '12': 16,
        '34': 17, '35': 18, '36': 19, '37': 20, '38': 21, '39': 22, '40': 23,
        '41': 24, '42': 25, '43': 26, '44': 27
    };
    
    return tallas.sort((a, b) => {
        const ordenA = ordenTallas[a.talla] || 999;
        const ordenB = ordenTallas[b.talla] || 999;
        return ordenA - ordenB;
    });
}

// Función para ordenar colores
function ordenarColores(colores) {
    if (!colores || colores.length === 0) return [];
    
    // Primero los que tienen nombre, luego los "sin color"
    return [...colores].sort((a, b) => {
        if (a.nombre === null && b.nombre !== null) return 1;
        if (a.nombre !== null && b.nombre === null) return -1;
        if (a.nombre && b.nombre) return a.nombre.localeCompare(b.nombre);
        return 0;
    });
}

// ============================================
// MODAL MEJORADO CON SCROLL Y ORDEN
// ============================================

let selectedTalla = null;
let selectedColor = null;
let currentStock = 0;

function verDetalleProducto(productoId) {
    const producto = productosData.find(p => p.id === productoId);
    if (!producto) return;
    
    // Ordenar variantes por talla
    const variantesOrdenadas = ordenarTallas([...producto.variantes]);
    
    // Crear modal
    const modalHTML = `
        <div id="productModal" class="product-modal" onclick="cerrarModalClickFondo(event)">
            <div class="product-modal-content">
                <span class="close-modal" onclick="cerrarModal()">&times;</span>
                <div class="modal-body">
                    <img src="${producto.imagen_url || 'https://via.placeholder.com/300x300?text=Modas+La+34'}" 
                         style="width: 100%; border-radius: 15px; margin-bottom: 15px;">
                    
                    <h2 style="color: #ff6b6b; margin: 0 0 5px 0;">${producto.nombre}</h2>
                    <p style="color: #666; margin-bottom: 15px;">${producto.categoria || 'Ropa'}</p>
                    
                    <div class="tallas-container" id="tallasContainer">
                        ${variantesOrdenadas.map(v => `
                            <div class="talla-item" onclick="seleccionarTalla(${v.id}, '${v.talla}', ${v.precio_venta})">
                                <div class="talla-size">${v.talla}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div id="coloresContainer" style="display: none;"></div>
                    
                    <div id="stockInfo" class="stock-info" style="display: none;"></div>
                    
                    <div class="modal-actions">
                        <button id="addToCartBtn" class="btn-add-to-cart" disabled onclick="agregarAlCarrito()">
                            🛍️ Agregar al carrito
                        </button>
                        <button class="btn-whatsapp" onclick="compartirWhatsApp('${producto.nombre}')">
                            💬
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Guardar datos del producto seleccionado
    window.selectedProducto = producto;
    window.variantesData = variantesOrdenadas;
    
    // Mostrar modal
    const modal = document.getElementById('productModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function seleccionarTalla(varianteId, talla, precio) {
    // Limpiar selección anterior
    document.querySelectorAll('.talla-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Marcar talla seleccionada
    event.currentTarget.classList.add('selected');
    
    // Guardar selección
    window.selectedVarianteId = varianteId;
    window.selectedTallaNombre = talla;
    window.selectedPrecio = precio;
    
    // Mostrar colores de esta talla
    const variante = window.variantesData.find(v => v.id === varianteId);
    
    if (variante && variante.colores && variante.colores.length > 0) {
        const coloresOrdenados = ordenarColores(variante.colores);
        
        const coloresHTML = `
            <h4 style="margin: 15px 0 10px 0;">🎨 Colores disponibles:</h4>
            <div class="colores-container-modal">
                ${coloresOrdenados.map((color, idx) => {
                    const tieneStock = color.stock > 0;
                    return `
                        <div class="color-option ${tieneStock ? '' : 'disabled'}" 
                             onclick="${tieneStock ? `seleccionarColor(${idx}, ${color.stock})` : ''}"
                             style="${!tieneStock ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                            ${color.codigo ? 
                                `<div class="color-circle" style="background: ${color.codigo};"></div>` :
                                `<div class="color-circle" style="background: #ccc; display: flex; align-items: center; justify-content: center;">⚪</div>`
                            }
                            <div class="color-name">${color.nombre || 'Sin color'}</div>
                            <small>${color.stock} uds</small>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        const coloresContainer = document.getElementById('coloresContainer');
        coloresContainer.innerHTML = coloresHTML;
        coloresContainer.style.display = 'block';
        
        // Resetear selección de color
        window.selectedColorIndex = null;
        document.getElementById('addToCartBtn').disabled = true;
        document.getElementById('stockInfo').style.display = 'none';
    } else {
        // Sin colores, agregar directamente
        window.selectedColorIndex = null;
        window.selectedStock = variante.stock_total || 0;
        
        const stockInfo = document.getElementById('stockInfo');
        if (window.selectedStock > 0) {
            stockInfo.innerHTML = `
                <span class="stock-badge stock-available">✅ Stock disponible: ${window.selectedStock} unidades</span>
            `;
            document.getElementById('addToCartBtn').disabled = false;
        } else {
            stockInfo.innerHTML = `
                <span class="stock-badge stock-out">❌ Agotado</span>
            `;
            document.getElementById('addToCartBtn').disabled = true;
        }
        stockInfo.style.display = 'block';
    }
}

function seleccionarColor(index, stock) {
    // Limpiar selección anterior
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Marcar color seleccionado
    event.currentTarget.classList.add('selected');
    
    // Guardar selección
    window.selectedColorIndex = index;
    window.selectedStock = stock;
    
    // Actualizar stock info
    const stockInfo = document.getElementById('stockInfo');
    if (stock > 0) {
        stockInfo.innerHTML = `
            <span class="stock-badge stock-available">✅ Stock disponible: ${stock} unidades</span>
        `;
        document.getElementById('addToCartBtn').disabled = false;
    } else {
        stockInfo.innerHTML = `
            <span class="stock-badge stock-out">❌ Agotado</span>
        `;
        document.getElementById('addToCartBtn').disabled = true;
    }
    stockInfo.style.display = 'block';
}

function agregarAlCarrito() {
    if (!window.selectedVarianteId) {
        mostrarNotificacion('❌ Por favor selecciona una talla', 'error');
        return;
    }
    
    const producto = window.selectedProducto;
    const variante = window.variantesData.find(v => v.id === window.selectedVarianteId);
    let colorInfo = '';
    
    if (window.selectedColorIndex !== null && variante.colores[window.selectedColorIndex]) {
        const color = variante.colores[window.selectedColorIndex];
        colorInfo = color.nombre ? ` - ${color.nombre}` : '';
    }
    
    const itemCarrito = {
        id: producto.id,
        varianteId: window.selectedVarianteId,
        nombre: producto.nombre,
        talla: window.selectedTallaNombre,
        color: colorInfo,
        precio: window.selectedPrecio,
        cantidad: 1,
        imagen: producto.imagen_url,
        stock: window.selectedStock
    };
    
    // Obtener carrito actual
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    // Verificar si ya existe el mismo producto
    const existeIndex = carrito.findIndex(item => 
        item.varianteId === window.selectedVarianteId && 
        item.color === colorInfo
    );
    
    if (existeIndex !== -1) {
        carrito[existeIndex].cantidad++;
    } else {
        carrito.push(itemCarrito);
    }
    
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    mostrarNotificacion(`✅ ${producto.nombre} - Talla ${window.selectedTallaNombre}${colorInfo} agregado al carrito`, 'success');
    actualizarContadorCarrito();
    
    // Opcional: cerrar modal después de agregar
    setTimeout(() => {
        cerrarModal();
    }, 1500);
}

function cerrarModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
    window.selectedTalla = null;
    window.selectedColor = null;
}

function cerrarModalClickFondo(event) {
    if (event.target.classList.contains('product-modal')) {
        cerrarModal();
    }
}

function compartirWhatsApp(productoNombre) {
    const mensaje = `🌸 *Modas La 34* 🌸\n\nMe interesa el producto: *${productoNombre}*\n¿Podrían darme más información?`;
    const url = `https://wa.me/573000000000?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

function mostrarNotificacion(mensaje, tipo) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${tipo === 'success' ? '#4CAF50' : '#ff4757'};
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        ">
            ${mensaje}
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}

// Agregar estilos de animación para notificaciones
const notificacionStyles = document.createElement('style');
notificacionStyles.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificacionStyles);

// ============================================
// FUNCIÓN PARA RENDERIZAR PRODUCTOS CON MEJOR VISUAL
// ============================================

async function cargarProductosCatalogo() {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        window.productosData = productos;
        
        const container = document.getElementById('productos-container');
        if (!container) return;
        
        if (productos.length === 0) {
            container.innerHTML = '<div class="no-products">No hay productos disponibles</div>';
            return;
        }
        
        // Filtrar solo productos con stock
        const productosConStock = productos.filter(p => {
            const stockTotal = p.variantes?.reduce((sum, v) => sum + (v.stock_total || 0), 0) || 0;
            return stockTotal > 0;
        });
        
        container.innerHTML = productosConStock.map(producto => {
            const variantes = producto.variantes || [];
            const stockTotal = variantes.reduce((sum, v) => sum + (v.stock_total || 0), 0);
            const precioMin = Math.min(...variantes.map(v => v.precio_venta || 0));
            const precioMax = Math.max(...variantes.map(v => v.precio_venta || 0));
            const precioTexto = precioMin === precioMax ? `$${precioMin.toLocaleString()}` : `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
            
            // Obtener primeras tallas para mostrar (ordenadas)
            const tallasUnicas = [...new Set(variantes.map(v => v.talla))];
            const tallasOrdenadas = ordenarTallasPorValor(tallasUnicas);
            const primerasTallas = tallasOrdenadas.slice(0, 4);
            
            return `
                <div class="producto-card" onclick="verDetalleProducto(${producto.id})">
                    <div class="producto-imagen">
                        ${producto.imagen_url ? 
                            `<img src="${producto.imagen_url}" alt="${producto.nombre}">` : 
                            `<div class="producto-imagen-placeholder">📦</div>`
                        }
                        ${stockTotal < 5 && stockTotal > 0 ? '<span class="stock-bajo">📉 Stock bajo</span>' : ''}
                        ${stockTotal === 0 ? '<span class="stock-agotado">❌ Agotado</span>' : ''}
                    </div>
                    <div class="producto-info">
                        <h3 class="producto-nombre">${producto.nombre}</h3>
                        <p class="producto-categoria">${producto.categoria || 'Ropa'}</p>
                        <p class="producto-precio">${precioTexto}</p>
                        <div class="producto-tallas">
                            ${primerasTallas.map(talla => `<span class="talla-badge">${talla}</span>`).join('')}
                            ${tallasUnicas.length > 4 ? `<span class="talla-badge">+${tallasUnicas.length - 4}</span>` : ''}
                        </div>
                        <button class="btn-ver-mas" onclick="event.stopPropagation(); verDetalleProducto(${producto.id})">
                            Ver más 🔍
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        mostrarLoading(false);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarLoading(false);
        mostrarNotificacion('Error al cargar productos', 'error');
    }
}

// Función auxiliar para ordenar tallas
function ordenarTallasPorValor(tallas) {
    const ordenTallas = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7,
        '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
        '6': 10, '7': 11, '8': 12, '9': 13, '10': 14, '11': 15, '12': 16,
        '34': 17, '35': 18, '36': 19, '37': 20, '38': 21, '39': 22, '40': 23,
        '41': 24, '42': 25, '43': 26, '44': 27
    };
    
    return [...tallas].sort((a, b) => {
        const ordenA = ordenTallas[a] || 999;
        const ordenB = ordenTallas[b] || 999;
        return ordenA - ordenB;
    });
}

function mostrarLoading(mostrar) {
    const loader = document.getElementById('loading-spinner');
    if (loader) {
        loader.style.display = mostrar ? 'flex' : 'none';
    }
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    const contador = document.getElementById('cart-count');
    if (contador) {
        contador.textContent = totalItems;
        contador.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function toggleCarrito() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function renderizarCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartItems) return;
    
    if (carrito.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty">🛒 El carrito está vacío</div>';
        if (cartTotal) cartTotal.textContent = '$0';
        return;
    }
    
    let total = 0;
    
    cartItems.innerHTML = carrito.map((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        return `
            <div class="cart-item">
                <div class="cart-item-imagen">
                    ${item.imagen ? 
                        `<img src="${item.imagen}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px;">` :
                        `<div style="width: 60px; height: 60px; background: #ffe4e9; border-radius: 10px; display: flex; align-items: center; justify-content: center;">👕</div>`
                    }
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-nombre">${item.nombre}</div>
                    <div class="cart-item-detalle">Talla: ${item.talla}${item.color}</div>
                    <div class="cart-item-precio">$${item.precio.toLocaleString()}</div>
                </div>
                <div class="cart-item-cantidad">
                    <button class="cantidad-btn" onclick="modificarCantidad(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="cantidad-btn" onclick="modificarCantidad(${index}, 1)">+</button>
                </div>
                <button class="cart-item-eliminar" onclick="eliminarDelCarrito(${index})">🗑️</button>
            </div>
        `;
    }).join('');
    
    if (cartTotal) {
        cartTotal.textContent = `$${total.toLocaleString()}`;
    }
}

function modificarCantidad(index, cambio) {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    if (carrito[index]) {
        const nuevaCantidad = carrito[index].cantidad + cambio;
        
        if (nuevaCantidad <= 0) {
            carrito.splice(index, 1);
        } else if (nuevaCantidad <= carrito[index].stock) {
            carrito[index].cantidad = nuevaCantidad;
        } else {
            mostrarNotificacion(`⚠️ Solo hay ${carrito[index].stock} unidades disponibles`, 'error');
            return;
        }
        
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

function eliminarDelCarrito(index) {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderizarCarrito();
    actualizarContadorCarrito();
    mostrarNotificacion('✅ Producto eliminado del carrito', 'success');
}

async finalizarCompra() {
    const carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    if (carrito.length === 0) {
        mostrarNotificacion('🛒 El carrito está vacío', 'error');
        return;
    }
    
    // Generar mensaje para WhatsApp
    let mensaje = "🌸 *MODAS LA 34 - NUEVO PEDIDO* 🌸\n\n";
    mensaje += "📋 *DETALLE DEL PEDIDO:*\n";
    mensaje += "─────────────────────\n\n";
    
    let total = 0;
    
    carrito.forEach((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        mensaje += `*${idx + 1}.* ${item.nombre}\n`;
        mensaje += `   📏 Talla: ${item.talla}\n`;
        if (item.color) mensaje += `   🎨 Color: ${item.color}\n`;
        mensaje += `   📦 Cantidad: ${item.cantidad}\n`;
        mensaje += `   💰 Precio unitario: $${item.precio.toLocaleString()}\n`;
        mensaje += `   💵 Subtotal: $${subtotal.toLocaleString()}\n\n`;
    });
    
    mensaje += "─────────────────────\n";
    mensaje += `💰 *TOTAL: $${total.toLocaleString()}*\n\n`;
    mensaje += "📞 *DATOS DE CONTACTO:*\n";
    mensaje += "Nombre: _____________\n";
    mensaje += "Teléfono: ___________\n";
    mensaje += "Dirección: __________\n\n";
    mensaje += "🌸 ¡Gracias por tu compra! 🌸";
    
    // Enviar a WhatsApp
    const numeroWhatsApp = "573000000000"; // Cambia por tu número
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(url, '_blank');
    
    // Limpiar carrito después de enviar
    localStorage.removeItem('carrito');
    renderizarCarrito();
    actualizarContadorCarrito();
    toggleCarrito();
}

// ============================================
// FUNCIONES DE BÚSQUEDA Y FILTROS
// ============================================

function buscarProductos() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const categoriaFiltro = document.getElementById('categoria-filtro')?.value || '';
    
    let productosFiltrados = window.productosData || [];
    
    // Filtrar por búsqueda
    if (searchTerm) {
        productosFiltrados = productosFiltrados.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) || 
            p.codigo.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtrar por categoría
    if (categoriaFiltro) {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === categoriaFiltro);
    }
    
    // Filtrar solo con stock
    productosFiltrados = productosFiltrados.filter(p => {
        const stockTotal = p.variantes?.reduce((sum, v) => sum + (v.stock_total || 0), 0) || 0;
        return stockTotal > 0;
    });
    
    // Renderizar productos filtrados
    const container = document.getElementById('productos-container');
    if (!container) return;
    
    if (productosFiltrados.length === 0) {
        container.innerHTML = '<div class="no-products">🔍 No se encontraron productos</div>';
        return;
    }
    
    container.innerHTML = productosFiltrados.map(producto => {
        const variantes = producto.variantes || [];
        const stockTotal = variantes.reduce((sum, v) => sum + (v.stock_total || 0), 0);
        const precioMin = Math.min(...variantes.map(v => v.precio_venta || 0));
        const precioMax = Math.max(...variantes.map(v => v.precio_venta || 0));
        const precioTexto = precioMin === precioMax ? `$${precioMin.toLocaleString()}` : `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
        
        const tallasUnicas = [...new Set(variantes.map(v => v.talla))];
        const tallasOrdenadas = ordenarTallasPorValor(tallasUnicas);
        const primerasTallas = tallasOrdenadas.slice(0, 4);
        
        return `
            <div class="producto-card" onclick="verDetalleProducto(${producto.id})">
                <div class="producto-imagen">
                    ${producto.imagen_url ? 
                        `<img src="${producto.imagen_url}" alt="${producto.nombre}">` : 
                        `<div class="producto-imagen-placeholder">📦</div>`
                    }
                    ${stockTotal < 5 && stockTotal > 0 ? '<span class="stock-bajo">📉 Stock bajo</span>' : ''}
                </div>
                <div class="producto-info">
                    <h3 class="producto-nombre">${producto.nombre}</h3>
                    <p class="producto-categoria">${producto.categoria || 'Ropa'}</p>
                    <p class="producto-precio">${precioTexto}</p>
                    <div class="producto-tallas">
                        ${primerasTallas.map(talla => `<span class="talla-badge">${talla}</span>`).join('')}
                        ${tallasUnicas.length > 4 ? `<span class="talla-badge">+${tallasUnicas.length - 4}</span>` : ''}
                    </div>
                    <button class="btn-ver-mas" onclick="event.stopPropagation(); verDetalleProducto(${producto.id})">
                        Ver más 🔍
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// INICIALIZACIÓN DEL CATÁLOGO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Catálogo iniciado');
    
    await cargarProductosCatalogo();
    actualizarContadorCarrito();
    
    // Configurar eventos de búsqueda
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', buscarProductos);
    }
    
    const categoriaFiltro = document.getElementById('categoria-filtro');
    if (categoriaFiltro) {
        categoriaFiltro.addEventListener('change', buscarProductos);
    }
    
    // Cerrar carrito al hacer clic fuera
    document.addEventListener('click', (event) => {
        const sidebar = document.getElementById('cart-sidebar');
        const cartIcon = document.querySelector('.cart-icon');
        
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(event.target) && !cartIcon?.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
});
