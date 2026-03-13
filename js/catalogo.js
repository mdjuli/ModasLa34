// Función para cargar productos del catálogo
async function cargarCatalogo() {
    const contenedor = document.getElementById('catalogo');
    
    try {
        const response = await supabaseFetch('/rest/v1/productos?select=*&stock_actual.gt.0');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        const productos = await response.json();
        
        if (productos.length === 0) {
            contenedor.innerHTML = '<p>No hay productos disponibles</p>';
            return;
        }
        
        contenedor.innerHTML = productos.map(p => `
            <div class="producto-card">
                <img src="${p.imagen_url || 'https://placehold.co/300x300/ccc/white?text=Sin+imagen'}" 
                     alt="${p.nombre}"
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px;">
                <h3>${p.nombre}</h3>
                <p class="talla-color">${p.talla || ''} ${p.color ? '| ' + p.color : ''}</p>
                <p class="precio">$${Number(p.precio_venta).toLocaleString()}</p>
                <button onclick="consultarProducto(${p.id})" class="btn-consultar">
                    📞 Consultar
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p>Error al cargar productos</p>';
    }
}

function consultarProducto(id) {
    alert('Función: consultar producto ' + id + ' (puedes enlazar a WhatsApp)');
}

// Cargar cuando la página esté lista
document.addEventListener('DOMContentLoaded', cargarCatalogo);
