// Animações do site: por padrão seguem o navegador/sistema (prefers-reduced-motion). Em alguns navegadores
// (ex.: Opera GX, ou o Windows com "efeitos de animação" desligados) isso deixa tudo parado; aqui a pessoa
// escolhe ligar ou desligar de vez. A escolha fica no navegador (localStorage 'enzo-movimento': 'sim' | 'nao').
// Carrega primeiro, antes dos outros scripts: ajusta o <html> (para o CSS) e o matchMedia (para os scripts).
(function () {
    var CHAVE = 'enzo-movimento';
    var escolha = null;
    try { escolha = localStorage.getItem(CHAVE); } catch (e) { /* sem armazenamento: segue o navegador */ }
    var original = window.matchMedia ? window.matchMedia.bind(window) : null;
    var osPede = !!(original && original('(prefers-reduced-motion: reduce)').matches);

    window.EnzoMovimento = {
        /** 'auto' (segue o navegador), 'sim' (animações ligadas) ou 'nao' (desligadas). */
        escolha: escolha === 'sim' || escolha === 'nao' ? escolha : 'auto',
        osPedeReduzir: osPede,
        definir: function (valor) {
            try {
                if (valor === 'sim' || valor === 'nao') localStorage.setItem(CHAVE, valor);
                else localStorage.removeItem(CHAVE);
            } catch (e) { /* ignora */ }
            location.reload();
        },
    };

    if (escolha !== 'sim' && escolha !== 'nao') return;
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
