async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo');
    
    if (!contenedor) return;
    
    try {
         contenedor.innerHTML = '<p style="text-align: center;">Cargando productos...</p>';
        const response = await supabaseRequest('productos?select=*&stock_actual.gt.0&order=created_at');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        const productos = await response.json();
        
        if (productos.length === 0) {
            contenedor.innerHTML = '<p style="text-align: center;">No hay productos disponibles en este momento.</p>';
            return;
        }
        
            contenedor.innerHTML = productos.map(producto => `
            <div class="producto-card">
                <h3>${producto.nombre}</h3>
                <p class="precio">$${Number(producto.precio_venta).toLocaleString()}</p>
                <p class="detalles">
                    ${producto.talla ? `Talla: ${producto.talla}<br>` : ''}
                    ${producto.color ? `Color: ${producto.color}` : ''}
                </p>
                <button onclick="verProducto(${producto.id})">Ver detalles</button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p style="color: red;">Error al cargar productos. Intenta más tarde.</p>';
    }
}
function verProducto(id) {
    alert(`Ver producto ${id} - Funcionalidad próximamente`);
}
document.addEventListener('DOMContentLoaded', cargarCatalogo);
