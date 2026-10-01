// ============================================================================
// Lançamentos: quais gibis e capítulos os leitores veem (usado pelo site, pelo terminal admin e pelos testes).
//
// Regra de visibilidade de um capítulo:
//   1. se ele tem estado no banco (aba "lançamentos"): `no-ar` aparece; `agendado` aparece a partir do horário
//      (relógio do servidor); `rascunho` fica escondido;
//   2. sem estado no banco, vale o catálogo: `hidden` no gibi ou no capítulo (data/comics.manifest.json) esconde,
//      a não ser que o gibi tenha sido revelado pelo comando antigo `reveal` ou tenha `revealAt` já vencido.
// Os horários são mostrados e digitados em horário de Fortaleza (UTC-3, sem horário de verão).
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Lancamentos = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    const FUSO = 'America/Fortaleza';
    const DESLOCAMENTO = '-03:00';

    /** `dados` = resposta de GET /api/site/revelados: { ids, capitulos: [{ c, estado, em }], avisos, agora }. */
    function indexar(dados) {
        const mapa = new Map();
        for (const item of dados?.capitulos || []) mapa.set(item.c, item);
        return { mapa, ids: dados?.ids || [], agora: Number(dados?.agora) || 0 };
    }

    /** { estado: 'no-ar' | 'agendado' | 'escondido', origem: 'banco' | 'catalogo', em } */
    function situacao(comic, capitulo, idx) {
        const linha = idx.mapa.get(`${comic.id}/${capitulo.id}`);
        if (linha) {
            if (linha.estado === 'no-ar') return { estado: 'no-ar', origem: 'banco', em: linha.em };
            if (linha.estado === 'agendado') {
                return idx.agora > 0 && linha.em <= idx.agora
                    ? { estado: 'no-ar', origem: 'banco', em: linha.em }
                    : { estado: 'agendado', origem: 'banco', em: linha.em };
            }
            return { estado: 'escondido', origem: 'banco', em: null };
        }
        const escondido = comic.hidden === true || capitulo.hidden === true;
        if (!escondido) return { estado: 'no-ar', origem: 'catalogo', em: null };
        const liberadoAntigo = idx.ids.includes(comic.id) || (idx.agora > 0 && Number(comic.revealAt) <= idx.agora);
        if (liberadoAntigo) return { estado: 'no-ar', origem: 'catalogo', em: Number(comic.revealAt) || null };
        const abre = Number(comic.revealAt);
        return Number.isFinite(abre) ? { estado: 'agendado', origem: 'catalogo', em: abre } : { estado: 'escondido', origem: 'catalogo', em: null };
    }

    /** Catálogo só com o que os leitores podem ver: capítulos escondidos saem e gibi sem capítulo no ar some. */
    function filtrar(db, dados) {
        const idx = indexar(dados);
        const comics = [];
        for (const comic of db.comics) {
            const capitulos = (comic.chapters || []).filter((c) => situacao(comic, c, idx).estado === 'no-ar');
            if (capitulos.length) comics.push(capitulos.length === (comic.chapters || []).length ? comic : { ...comic, chapters: capitulos });
        }
        return { ...db, comics };
    }

    /** "2026-10-02T09:30" (como digitado, horário de Fortaleza) -> milissegundos; NaN se inválido. */
    function deFortaleza(texto) {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(texto))) return NaN;
        return Date.parse(`${texto}:00${DESLOCAMENTO}`);
    }

    /** milissegundos -> "2026-10-02T09:30" em horário de Fortaleza (para o campo datetime-local). */
    function paraCampo(ms) {
        const d = new Date(ms - 3 * 60 * 60 * 1000);
        return d.toISOString().slice(0, 16);
    }

    function formatar(ms) {
        if (!Number.isFinite(ms) || !ms) return '—';
        return `${new Date(ms).toLocaleString('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' })} (Fortaleza)`;
    }

    return { FUSO, indexar, situacao, filtrar, deFortaleza, paraCampo, formatar };
}));
