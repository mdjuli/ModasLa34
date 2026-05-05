// ============================================
// SERVICE WORKER - MODAS LA 34 PWA
// ============================================

const CACHE_NAME = 'modas-la34-v1.0.0';
const urlsToCache = [
  '/',
  '/admin/ventas.html',
  '/admin/dashboard.html',
  '/admin/login.html',
  '/admin/factura.html',
  '/css/styles.css',
  '/js/supabase-config.js',
  '/js/permisos.js',
  '/js/ventas/punto-venta.js',
  '/js/ventas/carrito.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Limpiando cache antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Interceptar peticiones (modo offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolver cache
        if (response) {
          return response;
        }
        
        // Si no, buscar en red
        return fetch(event.request)
          .then(response => {
            // Guardar en cache para próxima vez
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Si no hay internet y no está en cache
            if (event.request.url.includes('/admin/')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Sincronización en segundo plano (para ventas sin internet)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ventas') {
    event.waitUntil(sincronizarVentasOffline());
  }
});

async function sincronizarVentasOffline() {
  // Obtener ventas pendientes de IndexedDB
  const db = await openDB();
  const ventasPendientes = await db.getAll('ventas-offline');
  
  for (const venta of ventasPendientes) {
    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venta)
      });
      if (response.ok) {
        await db.delete('ventas-offline', venta.id);
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  }
}

// Notificaciones push
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
