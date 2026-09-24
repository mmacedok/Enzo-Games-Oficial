// ============================================================================
// Banco local: PGlite (Postgres de verdade, em WebAssembly, sem instalar nada).
// Usado pelo server.js no computador e pelos testes. Em produção (Netlify)
// quem responde é api/db-neon.js — este arquivo nunca entra na function.
//   pasta = caminho da pasta do banco, ou null para um banco só na memória.
// O banco só é aberto na primeira consulta.
// ============================================================================
function createLocalDb(pasta = null) {
    let aberto = null;
    const abrir = () => {
        aberto ??= import('@electric-sql/pglite').then(async ({ PGlite }) => {
            const pg = pasta ? new PGlite(pasta) : new PGlite();
            await pg.waitReady;
            return pg;
        });
        return aberto;
    };
    return {
        query: async (texto, params = []) => (await (await abrir()).query(texto, params)).rows,
        close: async () => { if (aberto) await (await aberto).close(); },
    };
}

module.exports = { createLocalDb };
