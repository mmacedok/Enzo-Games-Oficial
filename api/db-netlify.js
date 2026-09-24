// ============================================================================
// Banco de produção: Netlify Database (Postgres gerenciado pelo Netlify).
// O pacote @netlify/database fica no package.json porque é ele que faz o
// Netlify criar o banco no deploy; em tempo de execução, numa Function, ele só
// faria neon(NETLIFY_DB_URL) — então usamos o driver HTTP do Neon direto (mais
// leve e sem problema de empacotamento). A URL é relida a cada consulta: se o
// Netlify renovar a conexão, o cliente é recriado.
// ============================================================================
const { neon } = require('@neondatabase/serverless');

const lerUrl = () => globalThis.Netlify?.env?.get?.('NETLIFY_DB_URL') || process.env.NETLIFY_DB_URL;

function createNetlifyDb() {
    let url = null;
    let sql = null;
    return {
        query(texto, params = []) {
            const atual = lerUrl();
            if (!atual) throw new Error('NETLIFY_DB_URL ausente: o Netlify Database não está ligado neste deploy.');
            if (atual !== url) { url = atual; sql = neon(atual); }
            return sql.query(texto, params);
        },
        close: async () => {},
    };
}

module.exports = { createNetlifyDb, lerUrl };
