// Copia os dados do banco do Netlify para o Neon novo (mudança para a Cloudflare).
// Uso (PowerShell, na pasta do projeto):
//   $env:ORIGEM="postgresql://...netlify..."; $env:DESTINO="postgresql://...neon..."; node tools/copiar-banco.mjs
// Antes, abra o site na Cloudflare uma vez com o DATABASE_URL já ligado: a API cria as
// tabelas no Neon sozinha. Este script só copia as linhas. Pode rodar de novo sem duplicar
// (linhas que já existem são puladas). As senhas ficam só nas variáveis, nunca no arquivo.
import { neon } from '@neondatabase/serverless';
import { pathToFileURL } from 'node:url';

const ORDEM = ['users'];   // tabelas que as outras apontam (REFERENCES users) vão primeiro
const LOTE = 100;

async function tabelas(query) {
    const linhas = await query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
    return linhas.map((l) => l.table_name);
}

async function colunas(query, tabela) {
    const linhas = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [tabela]);
    return linhas.map((l) => l.column_name);
}

const aspas = (nome) => `"${nome.replaceAll('"', '""')}"`;

/** origem/destino: (texto, params) => linhas. Devolve { tabela: { lidas, novas } }. */
export async function copiar(origem, destino, log = console.log) {
    const daOrigem = await tabelas(origem);
    const doDestino = new Set(await tabelas(destino));
    const faltando = daOrigem.filter((t) => !doDestino.has(t));
    if (faltando.length) log(`⚠️  Sem tabela no Neon (pulando): ${faltando.join(', ')}. Abra o site na Cloudflare antes?`);
    const lista = daOrigem.filter((t) => doDestino.has(t))
        .sort((a, b) => (ORDEM.includes(b) - ORDEM.includes(a)) || a.localeCompare(b));

    const resumo = {};
    for (const tabela of lista) {
        const destinoCols = new Set(await colunas(destino, tabela));
        const cols = (await colunas(origem, tabela)).filter((c) => destinoCols.has(c));
        // Tudo como texto: o Postgres converte de volta para o tipo da coluna no INSERT.
        const linhas = await origem(`SELECT ${cols.map((c) => `${aspas(c)}::text AS ${aspas(c)}`).join(', ')} FROM ${aspas(tabela)}`);
        let novas = 0;
        for (let i = 0; i < linhas.length; i += LOTE) {
            const lote = linhas.slice(i, i + LOTE);
            const params = lote.flatMap((l) => cols.map((c) => l[c]));
            const valores = lote.map((_, r) => `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(', ')})`).join(', ');
            const inseridas = await destino(
                `INSERT INTO ${aspas(tabela)} (${cols.map(aspas).join(', ')}) VALUES ${valores} ON CONFLICT DO NOTHING RETURNING 1 AS ok`, params);
            novas += inseridas.length;
        }
        resumo[tabela] = { lidas: linhas.length, novas };
        log(`  ${tabela}: ${linhas.length} linha(s), ${novas} nova(s) no Neon`);
    }
    return resumo;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { ORIGEM, DESTINO } = process.env;
    if (!ORIGEM || !DESTINO) {
        console.error('Faltam as variáveis ORIGEM (banco do Netlify) e DESTINO (Neon novo).');
        process.exit(1);
    }
    if (ORIGEM === DESTINO) { console.error('ORIGEM e DESTINO são o mesmo banco.'); process.exit(1); }
    const abrir = (url) => { const sql = neon(url); return (texto, params = []) => sql.query(texto, params); };
    console.log('📦 Copiando do Netlify para o Neon...');
    await copiar(abrir(ORIGEM), abrir(DESTINO));
    console.log('✅ Pronto.');
}
