// ============================================================================
// Cliente da API do site: um lugar só para falar com /api/*.
//   EnzoApi.pedir(caminho, corpo, opcoes)   -> { ok, status, dados }
//   EnzoApi.exigir(caminho, corpo, opcoes)  -> dados (lança Error quando !ok)
// Sem corpo o pedido é GET; com corpo, POST em JSON. A sessão é um cookie
// HttpOnly, então todo pedido vai com credentials: same-origin.
// ============================================================================
(() => {
    'use strict';

    async function pedir(caminho, corpo, extra = {}) {
        const opcoes = corpo === undefined
            ? { credentials: 'same-origin', ...extra }
            : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), ...extra };
        const resposta = await fetch(caminho, opcoes);
        let dados = null;
        try { dados = await resposta.json(); } catch { /* resposta sem JSON */ }
        return { ok: resposta.ok, status: resposta.status, dados };
    }

    /**
     * Como pedir(), mas devolve só os dados e lança Error com a mensagem do
     * servidor (com .status). `opcoes.falha` é a mensagem quando o servidor
     * não manda nenhuma.
     */
    async function exigir(caminho, corpo, extra = {}) {
        const { falha, ...opcoes } = extra;
        const { ok, status, dados } = await pedir(caminho, corpo, opcoes);
        if (ok) return dados;
        const erro = new Error(dados?.error || falha || `HTTP ${status}`);
        erro.status = status;
        throw erro;
    }

    window.EnzoApi = { pedir, exigir };
})();
