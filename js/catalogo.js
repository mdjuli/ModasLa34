// Variables globales
let todosLosProductos = [];
let categoriaActual = 'todos';

// PRODUCTOS DE EJEMPLO (para probar sin Supabase)
const productosEjemplo = [
    { id: 1, nombre: 'Vestido Floral', precio: 45000, categoria: 'vestidos', talla: 'S', color: 'Rosado', stock: 5, imagen: 'https://via.placeholder.com/300x200?text=Vestido+Floral' },
    { id: 2, nombre: 'Vestido Negro', precio: 52000, categoria: 'vestidos', talla: 'M', color: 'Negro', stock: 3, imagen: 'https://via.placeholder.com/300x200?text=Vestido+Negro' },
    { id: 3, nombre: 'Blusa Blanca', precio: 25000, categoria: 'blusas', talla: 'L', color: 'Blanco', stock: 8, imagen: 'https://via.placeholder.com/300x200?text=Blusa+Blanca' },
    { id: 4, nombre: 'Blusa Estampada', precio: 32000, categoria: 'blusas', talla: 'M', color: 'Multicolor', stock: 4, imagen: 'https://via.placeholder.com/300x200?text=Blusa+Estampada' },
    { id: 5, nombre: 'Pantalón Jean', precio: 65000, categoria: 'pantalones', talla: '38', color: 'Azul', stock: 6, imagen: 'https://via.placeholder.com/300x200?text=Pantalon+Jean' },
    { id: 6, nombre: 'Pantalón Negro', precio: 55000, categoria: 'pantalones', talla: '40', color: 'Negro', stock: 2, imagen: 'https://via.placeholder.com/300x200?text=Pantalon+Negro' },
    { id: 7, nombre: 'Conjunto Deportivo', precio: 75000, categoria: 'deportivo', talla: 'M', color: 'Gris', stock: 4, imagen: 'https://via.placeholder.com/300x200?text=Conjunto+Deportivo' },
    { id: 8, nombre: 'Camiseta Deportiva', precio: 35000, categoria: 'deportivo', talla: 'L', color: 'Rojo', stock: 7, imagen: 'https://via.placeholder.com/300x200?text=Camiseta+Deportiva' },
    { id: 9, nombre: 'Camisa Caballero', precio: 48000, categoria: 'caballero', talla: 'M', color: 'Celeste', stock: 5, imagen: 'https://via.placeholder.com/300x200?text=Camisa+Caballero' },
    { id: 10, nombre: 'Pantalón Formal', precio: 68000, categoria: 'caballero', talla: '36', color: 'Gris', stock: 3, imagen: 'https://via.placeholder.com/300x200?text=Pantalon+Formal' },
    { id: 11, nombre: 'Gorra', precio: 15000, categoria: 'accesorios', talla: 'Única', color: 'Negro', stock: 10, imagen: 'https://via.placeholder.com/300x200?text=Gorra' },
    { id: 12, nombre: 'Bufanda', precio: 22000, categoria: 'accesorios', talla: 'Única', color: 'Rojo', stock: 6, imagen: 'https://via.placeholder.com/300x200?text=Bufanda' }
];

// Función para cargar productos (desde Supabase o usando ejemplo)
async function cargarProductos() {
    const contenedor = document.getElementById('catalogo-productos');
    if (!contenedor) return;
    
    try {
        // INTENTAMOS con Supabase (si está configurado)
        if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== 'https://tu-proyecto.supabase.co') {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&stock_actual.gt.0`, {
                headers: { 'apikey': SUPABASE_KEY }
            });
            
            if (response.ok) {
                todosLosProductos = await response.json();
            } else {
                // Si falla, usamos los datos de ejemplo
                todosLosProductos = productosEjemplo;
            }
        } else {
            // Si no hay Supabase configurado, usamos ejemplo
            todosLosProductos = productosEjemplo;
        }
        
        // Mostrar los productos
        mostrarProductos(todosLosProductos);
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        todosLosProductos = productosEjemplo;
        mostrarProductos(todosLosProductos);
    }
}

// Función para mostrar productos en HTML
function mostrarProductos(productos) {
    const contenedor = document.getElementById('catalogo-productos');
    if (!contenedor) return;
    
    if (productos.length === 0) {
        contenedor.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos en esta categoría</p>';
        return;
    }
    
    contenedor.innerHTML = productos.map(p => `
        <div class="producto-card">
            <img src="${p.imagen || 'https://via.placeholder.com/300x200?text=Producto'}" alt="${p.nombre}" class="producto-imagen">
            <div class="producto-info">
                <div class="producto-categoria">${p.categoria || 'General'}</div>
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-precio">$${p.precio_venta || p.precio || 0}</div>
                <div class="producto-stock">Stock: ${p.stock_actual || p.stock || 0} unidades</div>
                <button class="btn-ver-mas" onclick="verProducto(${p.id})">Ver detalles</button>
            </div>
        </div>
    `).join('');
}

// Función para filtrar por categoría
function filtrarPorCategoria(categoria) {
    categoriaActual = categoria;
    
    // Actualizar botón activo
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filtrar productos
    if (categoria === 'todos') {
        mostrarProductos(todosLosProductos);
    } else {
        const filtrados = todosLosProductos.filter(p => 
            (p.categoria || '').toLowerCase() === categoria.toLowerCase()
        );
        mostrarProductos(filtrados);
    }
}

// Función para ver detalle de producto
function verProducto(id) {
    // Por ahora solo mostramos alerta, luego podemos abrir modal o página de detalle
    const producto = todosLosProductos.find(p => p.id == id);
    if (producto) {
        alert(`📦 ${producto.nombre}\n💰 $${producto.precio_venta || producto.precio}\n📏 Talla: ${producto.talla || 'Única'}\n🎨 Color: ${producto.color || 'Varios'}`);
    }
}

// Cargar productos cuando la página esté lista
document.addEventListener('DOMContentLoaded', cargarProductos);
