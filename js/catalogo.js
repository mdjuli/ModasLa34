// ============================================
// 🌸 CATÁLOGO PÚBLICO - MODAS LA 34
// ============================================

// Variable global para almacenar todos los productos
let todosLosProductos = [];
let categoriaActual = 'todos';
let productoActual = null;

// ============================================
// FUNCIÓN PARA ORDENAR TALLAS
// ============================================

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

// ============================================
// CARGAR PRODUCTOS
// ============================================

async function cargarProductos() {
    try {
        const catalogo = document.getElementById('catalogo-productos');
        if (!catalogo) {
            console.error('❌ No se encontró el elemento catalogo-productos');
            return;
        }
        
        catalogo.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Cargando productos...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vista_productos_completa?visible=eq.true&order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        todosLosProductos = await response.json();
        console.log('✅ Productos cargados:', todosLosProductos.length);
        
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

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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

function obtenerTallasUnicas(producto) {
    const variantes = producto.variantes || [];
    return variantes.map(v => v.talla).filter((v, i, a) => a.indexOf(v) === i);
}

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

function obtenerRangoPrecios(producto) {
    const variantes = producto.variantes || [];
    const precios = variantes.map(v => v.precio_venta || 0);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    
    if (min === max || min === 0) {
        return `$${max.toLocaleString()}`;
    }
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

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

// ============================================
// MOSTRAR PRODUCTOS
// ============================================

function mostrarProductos(categoria) {
    const catalogo = document.getElementById('catalogo-productos');
    if (!catalogo) return;
    
    let productosFiltrados = todosLosProductos;
    
    if (categoria !== 'todos') {
        productosFiltrados = todosLosProductos.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase()
        );
    }
    
    if (productosFiltrados.length === 0) {
        catalogo.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a5a5a5;">
                🛍️ No hay productos en esta categoría
            </div>
        `;
        return;
    }
    
    catalogo.innerHTML = productosFiltrados.map(p => {
        const tallasUnicas = obtenerTallasUnicas(p);
        const coloresUnicos = obtenerColoresUnicos(p);
        const stockTotal = obtenerStockTotal(p);
        const rangoPrecios = obtenerRangoPrecios(p);
        
        // Stock status para badge
        let stockStatus = 'stock-available';
        let stockText = '✅ En stock';
        if (stockTotal === 0) { stockStatus = 'stock-out'; stockText = '❌ Agotado'; }
        else if (stockTotal < 5) { stockStatus = 'stock-low'; stockText = '⚠️ Stock bajo'; }
        
        return `
            <div class="producto-card" onclick="verProducto(${p.id})" style="cursor: pointer;">
                ${p.imagen_url ? 
                    `<img src="${p.imagen_url}" alt="${p.nombre}" class="producto-imagen" loading="lazy">` : 
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
                                    transition: transform 0.2s;
                                " title="${c.nombre}"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <p class="producto-precio">${rangoPrecios}</p>
                    
                    <span class="producto-stock-status ${stockStatus}">${stockText}</span>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <button class="producto-btn" onclick="verProducto(${p.id}); event.stopPropagation();">
                            🔍 Ver más
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FILTRAR POR CATEGORÍA
// ============================================

function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    mostrarProductos(categoria);
    
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
        dropbtn.innerHTML = `${nombresCategoria[categoria] || 'Inicio'} <i class="fas fa-chevron-down" style="font-size:0.6rem;"></i>`;
    }
}

// ============================================
// VER PRODUCTO EN MODAL
// ============================================

async function verProducto(id) {
    try {
        productoActual = todosLosProductos.find(p => p.id === id);
        
        if (!productoActual) {
            alert('Producto no encontrado');
            return;
        }
        
        llenarModal(productoActual);
        
        const modal = document.getElementById('modal-producto');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
    } catch (error) {
        console.error('Error al cargar producto:', error);
        alert('Error al cargar el producto');
    }
}

// ============================================
// LLENAR MODAL
// ============================================

function llenarModal(producto) {
    const contenedor = document.getElementById('modal-contenido-producto');
    if (!contenedor) return;
    
    const variantes = ordenarVariantesPorTalla(producto.variantes || []);
    const emojis = {
        'vestidos': '👗',
        'blusas': '👚',
        'pantalones': '👖',
        'deportivo': '⚽',
        'caballero': '👔',
        'accesorios': '🎀'
    };
    const emoji = emojis[producto.categoria] || '📦';
    
    let stockTotal = 0;
    variantes.forEach(v => {
        const colores = v.colores || [];
        colores.forEach(c => {
            stockTotal += c.stock || 0;
        });
    });
    
    const precios = variantes.map(v => v.precio_venta || 0);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);
    const rangoPrecios = precioMin === precioMax ? 
        `$${precioMin.toLocaleString()}` : 
        `$${precioMin.toLocaleString()} - $${precioMax.toLocaleString()}`;
    
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

// ============================================
// SELECCIONAR TALLA EN MODAL
// ============================================

function seleccionarTallaModal(varianteId, talla, precio) {
    // Remover selección anterior
    document.querySelectorAll('.talla-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar seleccionada
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
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
    const tallaText = document.getElementById('selected-talla-text');
    if (tallaText) tallaText.innerHTML = `Talla ${talla}`;
    
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
        
        if (coloresSection) coloresSection.style.display = 'block';
        if (seleccionInfo) seleccionInfo.style.display = 'block';
        
        const colorText = document.getElementById('selected-color-text');
        if (colorText) colorText.innerHTML = 'Selecciona un color';
        
    } else {
        // Sin colores
        window.modalSeleccion.stock = variante?.stock_total || 0;
        
        const colorText = document.getElementById('selected-color-text');
        if (colorText) colorText.innerHTML = 'Sin color específico';
        
        const seleccionInfo = document.getElementById('seleccion-info');
        if (seleccionInfo) seleccionInfo.style.display = 'block';
        
        const coloresSection = document.getElementById('colores-section');
        if (coloresSection) coloresSection.style.display = 'none';
    }
}

// ============================================
// SELECCIONAR COLOR EN MODAL
// ============================================

function seleccionarColorModal(index, nombre, stock) {
    // Remover selección anterior
    document.querySelectorAll('.color-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar seleccionado
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    // Guardar selección
    window.modalSeleccion.colorIndex = index;
    window.modalSeleccion.colorNombre = nombre;
    window.modalSeleccion.stock = stock;
    
    // Actualizar texto
    const colorText = document.getElementById('selected-color-text');
    if (colorText) colorText.innerHTML = nombre;
}

// ============================================
// CONSULTAR POR WHATSAPP
// ============================================

function consultarProductoWhatsApp() {
    if (!window.modalProductoActual) return;
    
    const producto = window.modalProductoActual;
    const seleccion = window.modalSeleccion;
    
    let mensaje = `🌸 MODAS LA 34 🌸\n\n`;
    mensaje += `Me interesa este producto:\n`;
    mensaje += `📦 *${producto.nombre}*\n`;
    
    if (seleccion.talla) {
        mensaje += `📏 Talla: *${seleccion.talla}*\n`;
    }
    if (seleccion.colorNombre && seleccion.colorNombre !== 'Sin color') {
        mensaje += `🎨 Color: *${seleccion.colorNombre}*\n`;
    }
    if (seleccion.precio) {
        mensaje += `💰 Precio: *$${seleccion.precio.toLocaleString()}*\n`;
    }
    
    mensaje += `\n¿Podrían darme más información sobre disponibilidad?`;
    
    const numeroWhatsApp = "573208049635";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ============================================
// CERRAR MODAL
// ============================================

function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    productoActual = null;
}

// ============================================
// BUSCADOR
// ============================================

function configurarBuscador() {
    const buscador = document.getElementById('buscador-productos');
    if (!buscador) return;
    
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

// ============================================
// EVENTOS DEL MODAL
// ============================================

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
};

// Cerrar modal con ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
    }
});

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', function(e) {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        const content = dropdown.querySelector('.dropdown-content');
        if (content) content.style.display = 'none';
    }
});

// Menú móvil - toggle dropdown
document.addEventListener('DOMContentLoaded', function() {
    const dropbtn = document.querySelector('.dropbtn');
    if (dropbtn) {
        dropbtn.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const content = document.querySelector('.dropdown-content');
                if (content) {
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                }
            }
        });
    }
});

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Catálogo iniciado');
    await cargarProductos();
    configurarBuscador();
});

// ============================================
// ESTO ES LO QUE FALTA - FUNCIÓN PARA MOSTRAR COLORES DE TALLA
// ============================================

// ============================================
// MOSTRAR COLORES DE UNA TALLA ESPECÍFICA
// ============================================

function mostrarColoresTalla(varianteId, talla, precio) {
    // Remover selección anterior de tallas
    document.querySelectorAll('.talla-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar la talla seleccionada
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
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
        const tituloTalla = document.getElementById('talla-seleccionada-nombre');
        if (tituloTalla) tituloTalla.textContent = talla;
        
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
                    <div class="color-card ${tieneStock ? '' : 'color-sin-stock'}" 
                         onclick="seleccionarColorModal(this, '${color.nombre || 'Sin color'}', ${color.stock || 0})">
                        <div class="color-circulo" style="background: ${color.codigo || '#ccc'};"></div>
                        <div class="color-nombre">${color.nombre || 'Sin color'}</div>
                        <div class="color-stock">${color.stock > 0 ? color.stock + ' uds' : 'Agotado'}</div>
                    </div>
                `;
            }).join('');
        }
        
        if (coloresContainer) coloresContainer.style.display = 'block';
        
        // Hacer scroll hacia los colores
        if (coloresContainer) {
            coloresContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        if (coloresContainer) coloresContainer.style.display = 'block';
    }
}

// ============================================
// SELECCIONAR COLOR (VERSIÓN CORREGIDA)
// ============================================

function seleccionarColorModal(element, nombre, stock) {
    // Remover selección anterior
    document.querySelectorAll('.color-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar seleccionado
    if (element) {
        element.classList.add('selected');
    }
    
    // Guardar selección
    window.modalSeleccion.colorNombre = nombre;
    window.modalSeleccion.stock = stock;
    
    // Actualizar texto
    const colorText = document.getElementById('selected-color-text');
    if (colorText) colorText.innerHTML = nombre;
}

// ============================================
// AGREGAR AL CARRITO O CONSULTAR (OPCIONAL)
// ============================================

function agregarAlCarritoDesdeModal() {
    const seleccion = window.modalSeleccion;
    const producto = window.modalProductoActual;
    
    if (!seleccion.varianteId) {
        alert('❌ Por favor selecciona una talla');
        return;
    }
    
    if (seleccion.stock === 0) {
        alert('❌ Producto agotado');
        return;
    }
    
    // Aquí puedes agregar la lógica para agregar al carrito
    // Por ahora, redirige a WhatsApp con la selección
    consultarProductoWhatsApp();
}

// ============================================
// CONSULTAR POR WHATSAPP (VERSIÓN COMPLETA)
// ============================================

function consultarProductoWhatsApp() {
    if (!window.modalProductoActual) return;
    
    const producto = window.modalProductoActual;
    const seleccion = window.modalSeleccion || {};
    const tallaSel = window.tallaSeleccionada || {};
    
    let mensaje = `🌸 *MODAS LA 34* 🌸\n\n`;
    mensaje += `Me interesa este producto:\n`;
    mensaje += `📦 *${producto.nombre}*\n`;
    
    // Usar precio de la talla seleccionada o el precio general
    const precio = seleccion.precio || tallaSel.precio || 0;
    if (precio > 0) {
        mensaje += `💰 Precio: *$${precio.toLocaleString()}*\n`;
    }
    
    // Usar talla de la selección
    const talla = seleccion.talla || tallaSel.talla || '';
    if (talla) {
        mensaje += `📏 Talla: *${talla}*\n`;
    }
    
    // Usar color de la selección
    const color = seleccion.colorNombre || '';
    if (color && color !== 'Sin color') {
        mensaje += `🎨 Color: *${color}*\n`;
    }
    
    mensaje += `\n¿Podrían darme más información sobre disponibilidad?`;
    
    const numeroWhatsApp = "573208049635";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ============================================
// FUNCIÓN PARA CONSULTAR PRODUCTO (SIN SELECCIÓN)
// ============================================

function consultarProducto() {
    if (!productoActual) return;
    
    let mensaje = `🌸 *MODAS LA 34* 🌸\n\n`;
    mensaje += `Me interesa el producto:\n`;
    mensaje += `📦 *${productoActual.nombre}*\n`;
    mensaje += `💰 Precio: *${obtenerRangoPrecios(productoActual)}*\n\n`;
    mensaje += `¿Podrían darme más información?`;
    
    const numeroWhatsApp = "573208049635";
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ============================================
// FUNCIÓN PARA CERRAR MODAL (MEJORADA)
// ============================================

function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Limpiar selecciones
    productoActual = null;
    window.modalProductoActual = null;
    window.modalVariantesActuales = null;
    window.modalSeleccion = {
        varianteId: null,
        talla: null,
        precio: null,
        colorIndex: null,
        colorNombre: null,
        stock: 0
    };
    window.tallaSeleccionada = null;
    
    // Remover clases seleccionadas
    document.querySelectorAll('.talla-card, .color-card').forEach(el => {
        el.classList.remove('selected');
    });
}

// ============================================
// EXPORTAR FUNCIONES (PARA USO EN HTML)
// ============================================

// Asegurar que las funciones estén disponibles globalmente
window.ordenarVariantesPorTalla = ordenarVariantesPorTalla;
window.cargarProductos = cargarProductos;
window.mostrarProductos = mostrarProductos;
window.filtrarPorCategoria = filtrarPorCategoria;
window.verProducto = verProducto;
window.llenarModal = llenarModal;
window.seleccionarTallaModal = seleccionarTallaModal;
window.seleccionarColorModal = seleccionarColorModal;
window.mostrarColoresTalla = mostrarColoresTalla;
window.consultarProductoWhatsApp = consultarProductoWhatsApp;
window.consultarProducto = consultarProducto;
window.cerrarModal = cerrarModal;
window.configurarBuscador = configurarBuscador;

console.log('✅ Todas las funciones exportadas correctamente');
