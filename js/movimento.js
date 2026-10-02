// Animações do site: SEMPRE LIGADAS, mesmo quando o navegador/sistema pede menos animação (prefers-reduced-motion;
// o Opera GX e o Windows com "efeitos de animação" desligados mandam isso e deixavam tudo parado). Quem quiser
// desligar usa o botão "Animações" do menu da Batalha: a escolha fica no navegador (localStorage 'enzo-movimento' = 'nao').
// Carrega primeiro, antes dos outros scripts: ajusta o <html> (para o CSS) e o matchMedia (para os scripts).
(function () {
    var CHAVE = 'enzo-movimento';
    var escolha = null;
    try { escolha = localStorage.getItem(CHAVE); } catch (e) { /* sem armazenamento: animações ligadas */ }
    if (escolha !== 'nao') escolha = 'sim';   // padrão: ligadas
    var original = window.matchMedia ? window.matchMedia.bind(window) : null;
    var osPede = !!(original && original('(prefers-reduced-motion: reduce)').matches);

    window.EnzoMovimento = {
        /** 'sim' (animações ligadas, o padrão) ou 'nao' (desligadas pela pessoa). */
        escolha: escolha,
        osPedeReduzir: osPede,
        definir: function (valor) {
            try {
                if (valor === 'nao') localStorage.setItem(CHAVE, 'nao');
                else localStorage.removeItem(CHAVE);
            } catch (e) { /* ignora */ }
            location.reload();
        },
    };

    document.documentElement.setAttribute('data-movimento', escolha);
    if (!original) return;
    var reduzir = escolha === 'nao';
    window.matchMedia = function (consulta) {
        var real = original(consulta);
        var c = String(consulta);
        if (!/prefers-reduced-motion/.test(c)) return real;
        var quer = /no-preference/.test(c) ? !reduzir : reduzir;
        return {
            matches: quer, media: c, onchange: null,
            addEventListener: function () {}, removeEventListener: function () {},
            addListener: function () {}, removeListener: function () {}, dispatchEvent: function () { return false; },
        };
    };
})();
