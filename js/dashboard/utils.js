// ============================================
// UTILS.JS - Utilidades comune
// ============================================

function mostrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.add('active');
        form.style.display = 'flex';
    }
}

function cerrarFormulario(tipo) {
    const form = document.getElementById(`form-${tipo}`);
    if (form) {
        form.classList.remove('active');
        form.style.display = 'none';
    }
    
    if (tipo === 'producto') {
        delete document.getElementById('form-producto')?.dataset.editId;
        const btn = document.querySelector('#form-producto .submit-btn');
        if (btn) btn.textContent = 'Guardar Producto';
    }
    if (tipo === 'venta' && typeof carrito !== 'undefined') {
        carrito = [];
        if (typeof actualizarCarritoUIManual === 'function') actualizarCarritoUIManual();
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alertMessage');
    if (alerta) {
        alerta.textContent = mensaje;
        alerta.className = `alert ${tipo}`;
        alerta.style.display = 'block';
        setTimeout(() => { alerta.style.display = 'none'; }, 3000);
    } else {
        alert(mensaje);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

function verFactura(id) { window.open(`factura.html?id=${id}`, '_blank'); }

function getEmojiCategoria(cat) {
    const emojis = { 'vestidos': '👗', 'blusas': '👚', 'pantalones': '👖', 'deportivo': '⚽', 'caballero': '👔', 'accesorios': '🎀' };
    return emojis[cat] || '📦';
}
