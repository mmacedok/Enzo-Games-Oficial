// ============================================================================
// Banco de produção: Netlify Database (Postgres gerenciado pelo Netlify).
// O pacote @netlify/database lê NETLIFY_DB_URL sozinho (e acompanha quando a
// conexão é renovada). Em Functions ele usa o driver HTTP do Neon; em servidor
// comum, um pool do pg — os dois viram o mesmo { query(texto, params) -> linhas }.
// ============================================================================
const { getDatabase } = require('@netlify/database');

function createNetlifyDb() {
    let conexao = null;
    const abrir = () => (conexao ??= getDatabase());
    return {
        async query(texto, params = []) {
            const db = abrir();
            if (db.driver === 'serverless') return db.httpClient.query(texto, params);
            return (await db.pool.query(texto, params)).rows;
        },
        close: async () => { if (conexao?.driver === 'server') await conexao.pool.end(); },
    };
}

module.exports = { createNetlifyDb };
