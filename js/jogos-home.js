// Jogos da home: cartões com a capa e o nome de cada jogo (antes eles ficavam na tela do fliperama 3D).
(() => {
    const grade = document.getElementById('jogos-grade');
    if (!grade) return;

    // 'flappy' e 'ronda' são os nomes que o js/main.js (window.EnzoJogos) conhece.
    const JOGOS = [
        { nome: 'Flappy Enzo', capa: 'flappy', abrir: () => window.EnzoJogos?.abrir('flappy') },
        { nome: 'Caçada ao Inominável', capa: 'cacada', abrir: () => window.EnzoJogos?.abrir('ronda') },
        { nome: 'Batalha dos Torados', capa: 'batalha', abrir: () => { location.href = 'batalha.html'; } },
        { nome: "Italo's Surfer", capa: 'italos-surfer', abrir: () => { location.href = 'italos-surfer.html'; } },
        { nome: 'Degustação Noturna', capa: 'degustacao', breve: true },
    ];

    for (const jogo of JOGOS) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'jogo-cartao';
        botao.setAttribute('aria-label', jogo.breve ? `${jogo.nome} (em breve)` : jogo.nome);
        const img = document.createElement('img');
        img.src = `/assets/fliperama-3d/jogos/${jogo.capa}.webp`;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        const nome = document.createElement('span');
        nome.className = 'jogo-cartao__nome';
        nome.textContent = jogo.nome;
        botao.append(img, nome);
        if (jogo.breve) {
            botao.disabled = true;
            const breve = document.createElement('span');
            breve.className = 'jogo-cartao__breve';
            breve.textContent = 'Em breve';
            botao.append(breve);
        } else {
            botao.addEventListener('click', jogo.abrir);
        }
        grade.append(botao);
    }
})();
