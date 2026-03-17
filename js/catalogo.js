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
    
    catalogo.innerHTML = productosFiltrados.map(p => `
        <div class="producto-card" style="border:1px solid #ffe4e9; padding:1rem; margin:1rem; border-radius:15px; background:white; box-shadow:0 5px 15px rgba(255,182,193,0.2);">
            ${p.imagen_url ? 
                `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%; height:200px; object-fit:cover; border-radius:10px; margin-bottom:1rem;">` : 
                `<div style="width:100%; height:200px; background:linear-gradient(135deg, #fff0f3, #ffe4e9); border-radius:10px; margin-bottom:1rem; display:flex; align-items:center; justify-content:center; font-size:4rem;">
                    ${getEmojiCategoria(p.categoria)}
                </div>`
            }
            <h3 style="color:#ff6b6b; margin:0.5rem 0;">${p.nombre}</h3>
            <p style="color:#a5a5a5; font-size:0.9rem;">
                ${p.talla ? `Talla: ${p.talla} ` : ''}
                ${p.color ? `Color: ${p.color}` : ''}
            </p>
            <p style="font-size:1.5rem; font-weight:bold; color:#ff9a9e; margin:0.5rem 0;">$${(p.precio_venta || 0).toLocaleString()}</p>
            <button onclick="verProducto(${p.id})" style="background:#ffb6c1; color:white; border:none; padding:0.8rem; border-radius:50px; cursor:pointer; width:100%; font-weight:600;">
                🔍 Ver más
            </button>
        </div>
    `).join('');
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
