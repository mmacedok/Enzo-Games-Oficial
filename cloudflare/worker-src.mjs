// Cloudflare Pages (modo avançado): este arquivo vira dist/_worker.js.
// FONTE: tools/build-cloudflare.mjs empacota este arquivo com api/ e dependências.
// É o equivalente de netlify/functions-src/api.mjs: /api/* vai para a mesma API
// (api/handler.js); o resto são arquivos estáticos (env.ASSETS). O _routes.json
// faz a Cloudflare só chamar este código em /api/*, então páginas e imagens não
// gastam a cota de requisições.
// Variáveis no painel da Cloudflare: GOOGLE_CLIENT_ID, SESSION_SECRET, ADMIN_EMAILS,
// DATABASE_URL (Neon) e NODE_ENV=production.
import handler from '../api/handler.js';
import neon from '../api/db-neon.js';
import { criarVerificadorGoogle } from './google-id-token.mjs';

let api;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
        if (!api) {
            // Sem banco o site continua de pé; só login e ranking ficam desligados.
            if (!env.DATABASE_URL) return Response.json({ error: 'banco não configurado' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
            api = handler.createApi({
                db: neon.createNeonDb(env.DATABASE_URL),
                env,
                // google-auth-library é feita para Node; aqui a assinatura é conferida com jose (Web Crypto).
                verificarGoogle: criarVerificadorGoogle(String(env.GOOGLE_CLIENT_ID || '').trim()),
            });
        }
        return api(request);
    },
};
