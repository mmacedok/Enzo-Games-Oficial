// ============================================================================
// Conquistas do site: lista única usada pela aba Conquistas (js/auth-widget.js),
// pelo leitor e pelo servidor (api/user.js aceita só ids daqui).
//
// Para criar uma conquista nova: acrescente um item em LISTA. Conquistas de
// coleção ("ler tudo de X") dizem qual coleção em `colecao` (ver CAPITULOS).
// Enzos secretos: colecionáveis 1..SECRETOS escondidos nas páginas; cada um é
// um easter egg `kind: "enzo-secreto"` com `numero` em data/comics.manifest.json.
// ============================================================================
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EnzoConquistas = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const LISTA = Object.freeze([
        { id: 'serie-completa', icone: '📚', titulo: 'Leitor da Saga', descricao: 'Leia todas as edições de Enzo Games até a última página.', colecao: 'serie' },
        { id: 'degustador-completo', icone: '🦇', titulo: 'Vigília Completa', descricao: 'Leia todas as edições do Degustador da Noite até a última página.', colecao: 'degustador' },
        { id: 'macarronada', icone: '🍝', titulo: 'Caçador de Macarronada', descricao: 'Ache a macarronada escondida numa página.' },
        { id: 'cabo-coco', icone: '🥥', titulo: 'Acesso Confidencial', descricao: 'Descubra a senha do conteúdo banido em 456 países.' },
    ].map(Object.freeze));

    const SECRETOS = 99;
    const PREFIXO_SECRETO = 'enzo-secreto-';

    /** Quais gibis cada coleção exige (todos os capítulos de cada um). */
    const CAPITULOS = Object.freeze({
        serie: (comic) => comic.featured !== false,
        degustador: (comic) => comic.id === 'degustador',
    });

    const idSecreto = (numero) => `${PREFIXO_SECRETO}${numero}`;

    /** Número do Enzo secreto (1..SECRETOS) ou null. */
    function numeroSecreto(id) {
        if (typeof id !== 'string' || !id.startsWith(PREFIXO_SECRETO)) return null;
        const texto = id.slice(PREFIXO_SECRETO.length);
        const numero = Number(texto);
        return /^[1-9]\d*$/.test(texto) && numero <= SECRETOS ? numero : null;
    }

    const definicao = (id) => LISTA.find((c) => c.id === id) || null;
    const idValido = (id) => Boolean(definicao(id)) || numeroSecreto(id) !== null;

    /** Chaves "gibi/capítulo" que a coleção exige, a partir do catálogo (data/database.json). */
    function capitulosDaColecao(catalogo, colecao) {
        const filtro = CAPITULOS[colecao];
        if (!filtro || !Array.isArray(catalogo?.comics)) return [];
        return catalogo.comics.filter(filtro)
            .flatMap((comic) => (comic.chapters || []).map((cap) => `${comic.id}/${cap.id}`));
    }

    /** { lidos, total } de uma coleção, dado o progresso da conta ([{ comicId, chapterId, completed }]). */
    function progressoDaColecao(catalogo, colecao, progresso = []) {
        const exigidos = capitulosDaColecao(catalogo, colecao);
        const lidos = new Set(progresso.filter((p) => p.completed).map((p) => `${p.comicId}/${p.chapterId}`));
        return { lidos: exigidos.filter((chave) => lidos.has(chave)).length, total: exigidos.length };
    }

    return { LISTA, SECRETOS, idSecreto, numeroSecreto, definicao, idValido, capitulosDaColecao, progressoDaColecao };
});
