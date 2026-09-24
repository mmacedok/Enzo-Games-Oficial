// Netlify Function: todas as rotas /api/* do site (login, recordes, progresso).
// FONTE: tools/build-function.mjs empacota este arquivo (com todas as dependências)
// em netlify/functions/api.mjs, que é o que o Netlify publica. Não edite o gerado.
// O código da API vive em api/ e é o mesmo que o server.js usa localmente.
// Variáveis no painel do Netlify: GOOGLE_CLIENT_ID e SESSION_SECRET. O banco é o
// Netlify Database (NETLIFY_DB_URL, criado no deploy por causa do @netlify/database);
// NETLIFY_DATABASE_URL / DATABASE_URL (Neon direto) continuam funcionando.
import handler from '../../api/handler.js';
import netlifyDb from '../../api/db-netlify.js';
import neon from '../../api/db-neon.js';

let api;

function abrirBanco() {
    if (netlifyDb.lerUrl()) return netlifyDb.createNetlifyDb();
    const url = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    return url ? neon.createNeonDb(url) : null;
}

export default async (request) => {
    if (!api) {
        const db = abrirBanco();
        // Sem banco o site continua de pé; só login e ranking ficam desligados.
        if (!db) return Response.json({ error: 'banco não configurado' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        api = handler.createApi({ db, env: process.env });
    }
    return api(request);
};

export const config = { path: '/api/*' };
