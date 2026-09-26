// Robô da Ronda nos Telhados no navegador (roda dentro de tools/qa.mjs).
// Abre o jogo pelo título do Degustador, começa com Espaço e joga com o
// mesmo robô de test/ronda-core.test.js. ?ronda-modo= na URL escolhe o roteiro:
//   jogar (padrão)  25 s de corrida e congela a tela para o screenshot
//   morrer          sem robô: deve terminar em 'fim' em poucos segundos
//   pausa           25 s e aperta P: o tempo do jogo tem que parar
//   fechar          25 s e fecha: a partida volta para 'pronto'
// Uso:
//   node tools/qa.mjs --url http://localhost:3000/degustador.html --width 1280 --height 800 --eval-wait 0 --eval-file tools/qa-ronda.js --out shots/ronda.png
//   (outro modo: --url http://localhost:3000/degustador.html?ronda-modo=morrer)
(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const MODO = new URLSearchParams(location.search).get('ronda-modo') || 'jogar';
  const titulo = document.querySelector('[data-ronda-trigger]');
  const papel = titulo.getAttribute('role');
  titulo.click();
  await w(1500);
  const R = window.RondaDegustador, C = window.RondaCore, CFG = C.CONFIG;
  const d = document.querySelector('.game-dialog'), c = document.querySelector('.game-canvas');
  const info = { papel, aberto: d.open, corpo: document.body.classList.contains('game-dialog-open'), fase0: R.jogo.fase, sw: c.style.width, sh: c.style.height, cursor: getComputedStyle(c).cursor.slice(0, 60) };
  const tempoParaSubir = (h) => { const v0 = -CFG.impulso; const disc = v0 * v0 - 2 * CFG.gravidade * h; return disc < 0 ? Infinity : (v0 - Math.sqrt(disc)) / CFG.gravidade; };
  const frente = () => CFG.jogadorX + CFG.jogadorL - CFG.folga;
  function robo(jogo) {
    const j = jogo.jogador, v = jogo.velocidade, base = j.y + CFG.jogadorA, pes = CFG.jogadorX + CFG.folga;
    const atual = jogo.predios.find((p) => pes < p.x + p.w && pes + CFG.jogadorL - 2 * CFG.folga > p.x);
    let q = false;
    if (atual && j.noChao) {
      const prox = jogo.predios[jogo.predios.indexOf(atual) + 1], beira = atual.x + atual.w;
      if (prox) {
        const sub = atual.topo - prox.topo, bur = prox.x - beira, ate = (prox.x - frente()) / v;
        const prec = sub > 0 ? tempoParaSubir(sub + 10) + 0.04 : 0;
        const alvo = Math.max(prec, bur > 1 ? bur / v + 0.02 : 0);
        if ((bur > 1 || sub > 0) && ate <= alvo) q = true;
      }
      // Obstáculo baixo e homem do coração (que corre na direção do jogador): pular.
      const aproxima = (dd) => v + (dd.correndo ? CFG.corridaCoracao : 0);
      if (jogo.desafios.find((dd) => (dd.tipo === 'baixo' || dd.tipo === 'coracao') && dd.x + dd.w > pes &&
        dd.x - frente() < aproxima(dd) * 0.12 && Math.abs(dd.y + dd.h - base) < 2)) q = true;
    }
    if (q) { C.pular(jogo, true); C.pular(jogo, false); j.vy = Math.min(j.vy, CFG.impulso); }
    // Atira só o necessário (conta balas em voo na altura do alvo) e recarrega
    // com menos de 3 balas: a mesma estratégia de test/ronda-core.test.js.
    const naAltura = (y, dd) => y > dd.y - 1 && y < dd.y + dd.h + 1;
    const emVoo = (dd) => jogo.tiros.filter((t) => t.x < dd.x + dd.w && naAltura(t.y, dd)).length;
    const alvo = jogo.desafios.find((dd) => ['parede', 'passaro', 'drone'].includes(dd.tipo) && dd.vida > 0 &&
      dd.x + dd.w > CFG.jogadorX && dd.x - frente() < v * 0.6 && dd.vida > emVoo(dd));
    R.entrada.gatilho = false;
    if (alvo) {
      if (naAltura(j.y + CFG.alturaArma, alvo) && C.atirar(jogo)) R.visual.ultimoTiro = R.visual.tempo;
    } else if (jogo.balas < 3) {
      C.recarregar(jogo);
    }
  }
  const avancarOriginal = C.avancar;
  let congelado = false, usarRobo = MODO !== 'morrer';
  C.avancar = (jogo, dt) => {
    if (congelado) return 0;
    let resto = Math.min(dt, 0.25);
    while (resto > 1e-9 && jogo.fase === 'correndo') {
      const passo = Math.min(resto, CFG.passo);
      if (usarRobo) robo(jogo);
      avancarOriginal(jogo, passo);
      resto -= passo;
    }
    return 0;
  };
  // Espaço no dialog começa a corrida (pelo teclado de verdade).
  d.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
  d.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
  info.faseAposEspaco = R.jogo.fase;
  const bonusAntes = R.jogo.bonus;
  const dur = MODO === 'morrer' ? 8000 : 25000;
  const t0 = performance.now();
  while (performance.now() - t0 < dur && R.jogo.fase === 'correndo') await w(50);
  info.segundos = +R.jogo.tempo.toFixed(1);
  info.distancia = Math.round(R.jogo.distancia);
  info.bonus = R.jogo.bonus - bonusAntes;
  info.fase = R.jogo.fase; info.causa = R.jogo.causa;
  info.velocidade = Math.round(R.jogo.velocidade);
  if (MODO === 'pausa') {
    d.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true }));
    const t = R.jogo.tempo; await w(500);
    info.pausado = R.visual.pausado; info.parouNaPausa = R.jogo.tempo === t;
  }
  if (MODO === 'jogar') congelado = true;
  if (MODO === 'fechar') {
    document.querySelector('.game-close').click(); await w(100);
    info.fechou = !d.open; info.faseAposFechar = R.jogo.fase; info.corpoLimpo = !document.body.classList.contains('game-dialog-open');
  }
  return info;
})()
