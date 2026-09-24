// Netlify Function: todas as rotas /api/* do site (login, recordes, progresso).
// O código da API vive em api/ e é o mesmo que o server.js usa localmente.
// Variáveis no painel do Netlify: GOOGLE_CLIENT_ID, SESSION_SECRET e o banco
// NETLIFY_DATABASE_URL (criado pelo `netlify db init`).
import handler from '../../api/handler.js';
import neon from '../../api/db-neon.js';

let api;

export default async (request) => {
    const url = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    // Sem banco o site continua de pé; só login e ranking ficam desligados.
    if (!url) return Response.json({ error: 'banco não configurado' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    api ??= handler.createApi({ db: neon.createNeonDb(url), env: process.env });
    return api(request);
};

export const config = { path: '/api/*' };
