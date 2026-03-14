const SUPABASE_URL = 'https://frvcpaymckwyxwcvmugl.supabase.co”></script';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNwYXltY2t3eXh3Y3ZtdWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTU0MjgsImV4cCI6MjA4ODkzMTQyOH0.9sT1fV333AunNH0X__tXuIaeXM3Qrd_jp12ljFpOWzM';

const supabaseClient = {
  async query(tabla, opciones = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${tabla}`;
    
    // Construir query params
    const params = new URLSearchParams();
    if (opciones.select) params.append('select', opciones.select);
    if (opciones.order) params.append('order', opciones.order);
    if (opciones.limit) params.append('limit', opciones.limit);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    return response.json();
  },
  
  async insert(tabla, datos) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(datos)
    });
    return response.ok;
  }
};

console.log('✅ Configuración de Supabase cargada');
