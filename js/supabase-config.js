const SUPABASE_URL = 'https://frvcpaymckwyxwcvmugl.supabase.co”></script';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNwYXltY2t3eXh3Y3ZtdWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTU0MjgsImV4cCI6MjA4ODkzMTQyOH0.9sT1fV333AunNH0X__tXuIaeXM3Qrd_jp12ljFpOWzM';

async function supabaseRequest(tabla, options = {}) {
    const {
        method = 'GET',
        data = null,
        token = null
    } = options;

    const headers = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${SUPABASE_URL}/rest/v1/${tabla}`;
    
    const response = await fetch(url, {
        method: method,
        headers: headers,
        body: data ? JSON.stringify(data) : null
    });

    return response;
}

console.log('✅ Configuración de Supabase lista');
