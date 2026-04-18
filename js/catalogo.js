// ============================================
// 🌸 CATÁLOGO PÚBLICO - MODAS LA 34
// ============================================

// Variable global para almacenar todos los productos
let todosLosProductos = [];
let categoriaActual = 'todos';

function ordenarVariantesPorTalla(variantes) {
    const ordenTallas = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7,
        '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
        '6': 10, '7': 11, '8': 12, '9': 13, '10': 14, '11': 15, '12': 16,
        '34': 17, '35': 18, '36': 19, '37': 20, '38': 21, '39': 22, '40': 23,
        '41': 24, '42': 25, '43': 26, '44': 27, '45': 28, '46': 29
    };
    
    return [...variantes].sort((a, b) => {
        const ordenA = ordenTallas[a.talla] || 999;
        const ordenB = ordenTallas[b.talla] || 999;
        return ordenA - ordenB;
    });
}

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
// Función para llenar el modal (VERSIÓN CON SCROLL)
function llenarModal(producto) {
    const contenedor = document.getElementById('modal-contenido-producto');
    if (!contenedor) return;
    
    // Ordenar variantes por talla
    const variantes = ordenarVariantesPorTalla(producto.variantes || []);
    
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
    
    // Obtener rango de precios
    const precios = variantes.map(v => v.precio_venta || 0);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);
    const rangoPrecios = precioMin === precioMax ? 
        `$${precioMin.toLocaleString()}` : 
        `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
    
    // Stock badge
    let stockBadgeClass = 'stock-disponible';
    let stockBadgeText = '✅ En stock';
    if (stockTotal === 0) {
        stockBadgeClass = 'stock-agotado';
        stockBadgeText = '❌ Agotado';
    } else if (stockTotal < 5) {
        stockBadgeClass = 'stock-bajo';
        stockBadgeText = `⚠️ Stock bajo (${stockTotal})`;
    } else {
        stockBadgeText = `✅ En stock (${stockTotal})`;
    }
    
    // Generar HTML de tallas (CON SCROLL)
    let tallasHTML = '';
    
    if (variantes.length > 0) {
        tallasHTML = `
            <div style="margin: 1rem 0;">
                <h4 style="color: #4a3728; margin-bottom: 0.8rem;">📏 Tallas disponibles</h4>
                <div class="tallas-scroll-container">
                    <div class="tallas-grid">
        `;
        
        variantes.forEach(v => {
            const colores = v.colores || [];
            const tieneStock = colores.some(c => (c.stock || 0) > 0) || (v.stock_total > 0);
            
            let stockClass = 'talla-sin-stock';
            let stockTexto = 'Sin stock';
            
            if (tieneStock) {
                const maxStock = Math.max(...colores.map(c => c.stock || 0), v.stock_total || 0);
                if (maxStock > 5) {
                    stockClass = 'talla-con-stock';
                    stockTexto = `${maxStock} uds`;
                } else if (maxStock > 0) {
                    stockClass = 'talla-stock-bajo';
                    stockTexto = `¡Quedan ${maxStock}!`;
                }
            }
            
            tallasHTML += `
                <div class="talla-card ${stockClass}" onclick="seleccionarTallaModal(${v.id}, '${v.talla}', ${v.precio_venta})">
                    <div class="talla-numero">${v.talla}</div>
                    <div class="talla-precio">$${(v.precio_venta || 0).toLocaleString()}</div>
                    <div class="talla-stock">${stockTexto}</div>
                </div>
            `;
        });
        
        tallasHTML += `
                    </div>
                </div>
            </div>
            <div id="colores-section" style="display: none;">
                <h4 style="color: #4a3728; margin-bottom: 0.8rem;">🎨 Colores disponibles</h4>
                <div class="colores-scroll-container">
                    <div id="colores-grid" class="colores-grid"></div>
                </div>
            </div>
            <div id="seleccion-info" class="seleccion-info" style="display: none;">
                <p>✅ <span id="selected-talla-text"></span> <span id="selected-color-text"></span></p>
            </div>
        `;
    } else {
        tallasHTML = '<p style="color: #a5a5a5; text-align: center;">No hay variantes disponibles</p>';
    }
    
    // Generar todo el HTML del modal
    contenedor.innerHTML = `
        <div class="modal-grid">
            <div class="modal-imagen">
                ${producto.imagen_url ? 
                    `<img src="${producto.imagen_url}" alt="${producto.nombre}">` : 
                    `<div class="modal-imagen-placeholder">
                        <span>${emoji}</span>
                    </div>`
                }
            </div>
            <div class="modal-info">
                <h2>${producto.nombre}</h2>
                <div class="modal-codigo">Código: ${producto.codigo || 'N/A'}</div>
                
                <div class="modal-detalle">
                    <p><strong>Categoría:</strong> ${emoji} ${producto.categoria || 'General'}</p>
                    <p><strong>Stock total:</strong> <span class="${stockBadgeClass}" style="display: inline-block; padding: 0.2rem 0.8rem; border-radius: 20px;">${stockBadgeText}</span></p>
                </div>
                
                <div class="modal-precio">${rangoPrecios}</div>
                
                ${tallasHTML}
                
                <div class="modal-botones">
                    <button class="modal-btn btn-consultar" onclick="consultarProductoWhatsApp()">
                        💬 Consultar por WhatsApp
                    </button>
                    <button class="modal-btn btn-cerrar" onclick="cerrarModal()">
                        ❌ Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Guardar datos para usar después
    window.modalProductoActual = producto;
    window.modalVariantesActuales = variantes;
    window.modalSeleccion = {
        varianteId: null,
        talla: null,
        precio: null,
        colorIndex: null,
        colorNombre: null,
        stock: 0
    };
}

// Función para seleccionar talla en el modal
function seleccionarTallaModal(varianteId, talla, precio) {
    // Remover selección anterior
    document.querySelectorAll('.talla-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar seleccionada
    event.currentTarget.classList.add('selected');
    
    // Guardar selección
    window.modalSeleccion = {
        varianteId: varianteId,
        talla: talla,
        precio: precio,
        colorIndex: null,
        colorNombre: null,
        stock: 0
    };
    
    // Buscar la variante
    const variante = window.modalVariantesActuales.find(v => v.id === varianteId);
    
    // Actualizar texto de talla seleccionada
    document.getElementById('selected-talla-text').innerHTML = `Talla ${talla}`;
    
    if (variante && variante.colores && variante.colores.length > 0) {
        // Mostrar colores
        const coloresSection = document.getElementById('colores-section');
        const coloresGrid = document.getElementById('colores-grid');
        const seleccionInfo = document.getElementById('seleccion-info');
        
        const coloresOrdenados = [...variante.colores].sort((a, b) => {
            if (a.nombre === null && b.nombre !== null) return 1;
            if (a.nombre !== null && b.nombre === null) return -1;
            if (a.nombre && b.nombre) return a.nombre.localeCompare(b.nombre);
            return 0;
        });
        
        coloresGrid.innerHTML = coloresOrdenados.map((color, idx) => {
            const tieneStock = (color.stock || 0) > 0;
            return `
                <div class="color-card ${tieneStock ? '' : 'color-sin-stock'}" 
                     onclick="seleccionarColorModal(${idx}, '${color.nombre || 'Sin color'}', ${color.stock || 0})">
                    <div class="color-circulo" style="background: ${color.codigo || '#ccc'};"></div>
                    <div class="color-nombre">${color.nombre || 'Sin color'}</div>
                    <div class="color-stock">${color.stock > 0 ? color.stock + ' uds' : 'Agotado'}</div>
                </div>
            `;
        }).join('');
        
        coloresSection.style.display = 'block';
        seleccionInfo.style.display = 'block';
        document.getElementById('selected-color-text').innerHTML = 'Selecciona un color';
        
    } else {
        // Sin colores
        window.modalSeleccion.stock = variante?.stock_total || 0;
        document.getElementById('selected-color-text').innerHTML = 'Sin color específico';
        document.getElementById('seleccion-info').style.display = 'block';
        document.getElementById('colores-section').style.display = 'none';
    }
}

// Función para seleccionar color en el modal
function seleccionarColorModal(index, nombre, stock) {
    // Remover selección anterior
    document.querySelectorAll('.color-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar seleccionado
    event.currentTarget.classList.add('selected');
    
    // Guardar selección
    window.modalSeleccion.colorIndex = index;
    window.modalSeleccion.colorNombre = nombre;
    window.modalSeleccion.stock = stock;
    
    // Actualizar texto
    document.getElementById('selected-color-text').innerHTML = nombre;
}

// Función para ordenar tallas
function ordenarVariantesPorTalla(variantes) {
    const ordenTallas = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7,
        '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
        '6': 10, '7': 11, '8': 12, '9': 13, '10': 14, '11': 15, '12': 16,
        '34': 17, '35': 18, '36': 19, '37': 20, '38': 21, '39': 22, '40': 23,
        '41': 24, '42': 25, '43': 26, '44': 27, '45': 28, '46': 29
    };
    
    return [...variantes].sort((a, b) => {
        const ordenA = ordenTallas[a.talla] || 999;
        const ordenB = ordenTallas[b.talla] || 999;
        return ordenA - ordenB;
    });
}

// Función para consultar por WhatsApp
function consultarProductoWhatsApp() {
    if (!window.modalProductoActual) return;
    
    const producto = window.modalProductoActual;
    const seleccion = window.modalSeleccion;
    
    let mensaje = `🌸 MODAS LA 34 🌸\n\n`;
    mensaje += `Me interesa: ${producto.nombre}\n`;
    
    if (seleccion.talla) {
        mensaje += `Talla: ${seleccion.talla}\n`;
    }
    if (seleccion.colorNombre && seleccion.colorNombre !== 'Sin color') {
        mensaje += `Color: ${seleccion.colorNombre}\n`;
    }
    
    mensaje += `\n¿Podrían darme más información?`;
    
    // Cambia este número por el WhatsApp del negocio
    const numeroWhatsApp = "573208049635";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Función para mostrar colores de una talla específica
function mostrarColoresTalla(varianteId, talla, precio) {
    // Remover selección anterior de tallas
    document.querySelectorAll('.talla-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar la talla seleccionada
    event.currentTarget.classList.add('selected');
    
    // Guardar talla seleccionada
    window.tallaSeleccionada = {
        id: varianteId,
        talla: talla,
        precio: precio
    };
    
    // Buscar la variante para mostrar sus colores
    const variante = window.modalVariantesActuales.find(v => v.id === varianteId);
    
    if (variante && variante.colores && variante.colores.length > 0) {
        // Actualizar título
        document.getElementById('talla-seleccionada-nombre').textContent = talla;
        
        const coloresGrid = document.getElementById('modal-colores-grid');
        const coloresContainer = document.getElementById('modal-colores-container');
        
        if (coloresGrid) {
            const coloresOrdenados = [...variante.colores].sort((a, b) => {
                if (a.nombre === null && b.nombre !== null) return 1;
                if (a.nombre !== null && b.nombre === null) return -1;
                if (a.nombre && b.nombre) return a.nombre.localeCompare(b.nombre);
                return 0;
            });
            
            coloresGrid.innerHTML = coloresOrdenados.map((color) => {
                const tieneStock = (color.stock || 0) > 0;
                return `
                    <div class="color-card ${tieneStock ? '' : 'color-sin-stock'}">
                        <div class="color-circulo" style="background: ${color.codigo || '#ccc'};"></div>
                        <div class="color-nombre">${color.nombre || 'Sin color'}</div>
                        <div class="color-stock">${color.stock > 0 ? color.stock + ' uds' : 'Agotado'}</div>
                    </div>
                `;
            }).join('');
        }
        
        coloresContainer.style.display = 'block';
        
        // Hacer scroll hacia los colores
        coloresContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Sin colores, mostrar mensaje
        const coloresContainer = document.getElementById('modal-colores-container');
        const coloresGrid = document.getElementById('modal-colores-grid');
        
        if (coloresGrid) {
            coloresGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: #888;">
                    ⚪ Sin colores específicos para esta talla
                </div>
            `;
        }
        coloresContainer.style.display = 'block';
    }
}

// Función para consultar por WhatsApp
function consultarProductoWhatsApp() {
    if (!window.modalProductoActual) return;
    
    const producto = window.modalProductoActual;
    const tallaSel = window.tallaSeleccionada;
    
    let mensaje = `🌸 *MODAS LA 34* 🌸\n\n`;
    mensaje += `Me interesa este producto:\n`;
    mensaje += `📦 *${producto.nombre}*\n`;
    mensaje += `💵 Precio: *$${(tallaSel?.precio || 0).toLocaleString()}*\n`;
    
    if (tallaSel?.talla) {
        mensaje += `📏 Talla: *${tallaSel.talla}*\n`;
    }
    
    mensaje += `\n¿Podrían darme más información sobre disponibilidad?`;
    
    const numeroWhatsApp = "573208049635";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
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
