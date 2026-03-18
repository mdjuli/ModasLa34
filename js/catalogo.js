// ============================================
// 🌸 CATÁLOGO PÚBLICO - MODAS LA 34 (VERSIÓN DE PRUEBA)
// ===========================================

let todosLosProductos = [];
let categoriaActual = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Página cargada, cargando productos...");
    await cargarProductos();
    configurarBuscador();
});

async function cargarProductos() {
    try {
        const catalogo = document.getElementById('catalogo-productos');
        catalogo.innerHTML = '<div style="text-align: center; padding: 2rem;">Cargando productos...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&stock_actual.gt.0&order=nombre`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar productos');
        
        todosLosProductos = await response.json();
        console.log("✅ Productos cargados:", todosLosProductos.length);
        mostrarProductos('todos');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function mostrarProductos(categoria) {
    const catalogo = document.getElementById('catalogo-productos');
    
    let productosFiltrados = todosLosProductos;
    if (categoria !== 'todos') {
        productosFiltrados = todosLosProductos.filter(p => 
            p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase()
        );
    }
    
    if (productosFiltrados.length === 0) {
        catalogo.innerHTML = '<div style="text-align: center; padding: 3rem;">No hay productos</div>';
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
    
    // Función para procesar colores
    function procesarColores(coloresData) {
        let colores = [];
        
        if (!coloresData) return [];
        
        // Si es string, intentar parsear
        if (typeof coloresData === 'string') {
            try {
                colores = JSON.parse(coloresData);
            } catch {
                // Si no se puede parsear, crear un color por defecto
                return [];
            }
        } else if (Array.isArray(coloresData)) {
            colores = coloresData;
        }
        
        return colores;
    }
    
    // Función para mostrar círculos de colores
    function mostrarCirculosColores(colores) {
        if (!colores || colores.length === 0) return '';
        
        return `
            <div style="display: flex; gap: 5px; margin: 5px 0; flex-wrap: wrap;">
                ${colores.map(c => `
                    <span style="display: inline-block; width: 20px; height: 20px; background-color: ${c.codigo || '#cccccc'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="${c.nombre || 'Color'}"></span>
                `).join('')}
            </div>
        `;
    }
    
    catalogo.innerHTML = productosFiltrados.map(p => {
        // Procesar colores correctamente
        const colores = procesarColores(p.color);
        console.log('Producto:', p.nombre, 'Colores procesados:', colores);
        
        return `
            <div class="producto-card" style="border:1px solid #ffe4e9; padding:1rem; margin:1rem; border-radius:15px; background:white; box-shadow:0 5px 15px rgba(255,182,193,0.2);">
                ${p.imagen_url ? 
                    `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%; height:200px; object-fit:cover; border-radius:10px; margin-bottom:1rem;">` : 
                    `<div style="width:100%; height:200px; background:linear-gradient(135deg, #fff0f3, #ffe4e9); border-radius:10px; margin-bottom:1rem; display:flex; align-items:center; justify-content:center; font-size:4rem;">
                        ${getEmojiCategoria(p.categoria)}
                    </div>`
                }
                <h3 style="color:#ff6b6b; margin:0.5rem 0;">${p.nombre}</h3>
                
                <!-- Mostrar círculos de colores -->
                ${colores.length > 0 ? mostrarCirculosColores(colores) : ''}
                
                <p style="color:#a5a5a5; font-size:0.9rem;">
                    ${p.talla ? `Talla: ${p.talla}` : ''}
                </p>
                <p style="font-size:1.5rem; font-weight:bold; color:#ff9a9e; margin:0.5rem 0;">$${(p.precio_venta || 0).toLocaleString()}</p>
                <button onclick="verProducto(${p.id})" style="background:#ffb6c1; color:white; border:none; padding:0.8rem; border-radius:50px; cursor:pointer; width:100%; font-weight:600;">
                    🔍 Ver más
                </button>
            </div>
        `;
    }).join('');
}

function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    mostrarProductos(categoria);
}

// ===== MODAL =====
let productoActual = null;

function verProducto(id) {
    console.log("🖱️ Ver producto:", id);
    
    productoActual = todosLosProductos.find(p => p.id === id);
    if (!productoActual) {
        alert("Producto no encontrado");
        return;
    }

function llenarModal(producto) {
    const contenedor = document.getElementById('modal-contenido-producto');
    
    // Determinar estado del stock
    let stockClass = 'stock-agotado';
    let stockTexto = 'Agotado';
    
    if (producto.stock_actual > 5) {
        stockClass = 'stock-disponible';
        stockTexto = 'Disponible';
    } else if (producto.stock_actual > 0) {
        stockClass = 'stock-bajo';
        stockTexto = `¡Últimas ${producto.stock_actual} unidades!`;
    }
    
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
    
    // Procesar colores
    function procesarColores(coloresData) {
        let colores = [];
        
        if (!coloresData) return [];
        
        if (typeof coloresData === 'string') {
            try {
                colores = JSON.parse(coloresData);
            } catch {
                return [];
            }
        } else if (Array.isArray(coloresData)) {
            colores = coloresData;
        }
        
        return colores;
    }
    
    const colores = procesarColores(producto.color);
    
    // HTML para mostrar colores
    const coloresHTML = colores.length > 0 ? `
        <div style="margin: 1rem 0;">
            <p><strong>Colores disponibles:</strong></p>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                ${colores.map(c => `
                    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="seleccionarColor('${c.nombre}')">
                        <span style="display: inline-block; width: 40px; height: 40px; background-color: ${c.codigo || '#cccccc'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.2);"></span>
                        <span style="font-size: 0.8rem; color: #ff6b6b; margin-top: 0.3rem;">${c.nombre || ''}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    contenedor.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div>
                ${producto.imagen_url ? 
                    `<img src="${producto.imagen_url}" alt="${producto.nombre}" style="width:100%; border-radius:20px;">` : 
                    `<div style="width:100%; aspect-ratio:1; background:linear-gradient(135deg, #fff0f3, #ffe4e9); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:5rem;">
                        ${emoji}
                    </div>`
                }
            </div>
            <div>
                <h2 style="color:#ff6b6b; font-size:2rem; margin-bottom:1rem;">${producto.nombre}</h2>
                <p><strong>Código:</strong> ${producto.codigo || 'N/A'}</p>
                <p><strong>Categoría:</strong> ${emoji} ${producto.categoria || 'General'}</p>
                ${producto.talla ? `<p><strong>Talla:</strong> ${producto.talla}</p>` : ''}
                ${coloresHTML}
                <p><strong>Disponibilidad:</strong> 
                    <span style="display:inline-block; padding:0.5rem 1.5rem; border-radius:50px; background:${stockClass === 'stock-disponible' ? '#d4edda' : stockClass === 'stock-bajo' ? '#fff3cd' : '#f8d7da'}; color:${stockClass === 'stock-disponible' ? '#27ae60' : stockClass === 'stock-bajo' ? '#856404' : '#721c24'};">
                        ${stockTexto}
                    </span>
                </p>
                <div style="font-size:2.5rem; font-weight:bold; color:#ff9a9e; margin:1.5rem 0; text-align:center; background:#fff0f3; padding:1rem; border-radius:50px;">
                    $${(producto.precio_venta || 0).toLocaleString()}
                </div>
                <div style="display:flex; gap:1rem; margin-top:2rem;">
                    <button onclick="consultarProducto()" style="flex:1; background:#ffb6c1; color:white; border:none; padding:1rem; border-radius:50px; font-weight:600; cursor:pointer;">
                        📱 Consultar
                    </button>
                    <button onclick="cerrarModal()" style="flex:1; background:#ffe4e9; color:#ff6b6b; border:none; padding:1rem; border-radius:50px; font-weight:600; cursor:pointer;">
                        ❌ Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
}
    
    const contenedor = document.getElementById('modal-contenido-producto');
    contenedor.innerHTML = `
        <h2>${productoActual.nombre}</h2>
        <p><strong>Precio:</strong> $${productoActual.precio_venta}</p>
        <p><strong>Categoría:</strong> ${productoActual.categoria || 'General'}</p>
        <p><strong>Talla:</strong> ${productoActual.talla || 'N/A'}</p>
        <p><strong>Color:</strong> ${productoActual.color || 'N/A'}</p>
        <p><strong>Stock:</strong> ${productoActual.stock_actual}</p>
    `;
    
    document.getElementById('modal-producto').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    document.getElementById('modal-producto').style.display = 'none';
    document.body.style.overflow = 'auto';
    productoActual = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('modal-producto');
    if (event.target === modal) {
        cerrarModal();
    }
}

function configurarBuscador() {
    // Simplificado por ahora
    console.log("Buscador configurado");
}
