// ============================================================================
// Banco de produção: Postgres do Netlify DB (Neon) pelo driver HTTP, que
// funciona em Netlify Functions sem manter conexão aberta.
// A URL vem de NETLIFY_DATABASE_URL (criada pelo `netlify db init`) ou DATABASE_URL.
// ============================================================================
const { neon } = require('@neondatabase/serverless');

function createNeonDb(url) {
    if (!url) throw new Error('Falta NETLIFY_DATABASE_URL (ou DATABASE_URL) para o banco.');
    const sql = neon(url);
    return {
        query: (texto, params = []) => sql.query(texto, params),
        close: async () => {},
    };
}

module.exports = { createNeonDb };
