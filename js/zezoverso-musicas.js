// Discografia do ZeZoVerso: abaixo das fichas dos personagens, com as músicas completas de todos os gibis (js/musicas.js).
(async function () {
    const secao = document.getElementById('discografia');
    if (!secao || !window.EnzoMusicas) return;
    await window.EnzoMusicas.carregar();
    const disco = window.EnzoMusicas.criarDiscografia();
    if (!disco) return;
    secao.replaceChildren(disco);
    secao.hidden = false;
}());
