import * as THREE from 'three';
import { createEnzoArcade } from './fliperama-arcade.js';

// Fliperama da home: o único ponto de entrada dos jogos do site. Ao chegar perto, a tela da máquina
// mostra os jogos (capa + nome); clicar abre o jogo escolhido.
const machine = document.getElementById('arcade-machine');
const stage = document.getElementById('arcade-scene');
const prompt = document.getElementById('arcade-prompt');
const menu = document.getElementById('arcade-menu');

// 'flappy' e 'ronda' são os nomes que o js/main.js (window.EnzoJogos) conhece.
const JOGOS = [
  { nome: 'Flappy Enzo', capa: 'flappy', abrir: () => window.EnzoJogos?.abrir('flappy') },
  { nome: 'Caçada ao Inominável', capa: 'cacada', abrir: () => window.EnzoJogos?.abrir('ronda') },
  { nome: 'Batalha dos Torados', capa: 'batalha', abrir: () => { location.href = 'batalha.html'; } },
  { nome: 'Degustação Noturna', capa: 'degustacao', breve: true },
];

// Cantos da tela do fliperama no modelo 3D (js/fliperama-arcade.js, "Tela do jogo").
const TELA = [[-0.405, 1.205, 0.510], [0.405, 1.205, 0.510], [0.405, 1.695, 0.393], [-0.405, 1.695, 0.393]];

if (machine && stage && prompt && menu) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  let model;
  let camera;
  let scene;
  let frame = 0;
  let visible = false;
  let loaded = false;
  let progress = 0;
  let target = 0;
  let lastTime = 0;
  let loading = false;

  for (const jogo of JOGOS) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'arcade-jogo';
    botao.setAttribute('aria-label', jogo.breve ? `${jogo.nome} (em breve)` : jogo.nome);
    const img = document.createElement('img');
    img.src = `/assets/fliperama-3d/jogos/${jogo.capa}.webp`;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    const nome = document.createElement('span');
    nome.className = 'arcade-jogo__nome';
    nome.textContent = jogo.nome;
    botao.append(img, nome);
    if (jogo.breve) {
      botao.disabled = true;
      const breve = document.createElement('span');
      breve.className = 'arcade-jogo__breve';
      breve.textContent = 'Em breve';
      botao.append(breve);
    } else {
      botao.addEventListener('click', jogo.abrir);
    }
    menu.append(botao);
  }

  /** Encaixa o menu HTML sobre a tela 3D (projeta os cantos da tela na imagem da câmera). */
  const posicionarMenu = () => {
    if (!model || !camera) return;
    const { width, height } = stage.getBoundingClientRect();
    model.updateMatrixWorld(true);
    const [bl, br, tr, tl] = TELA.map(([x, y, z]) => {
      const v = new THREE.Vector3(x, y, z);
      model.localToWorld(v);
      v.project(camera);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
    });
    const esquerda = Math.max(bl.x, tl.x);
    const direita = Math.min(br.x, tr.x);
    const topo = Math.min(tl.y, tr.y);
    const base = Math.max(bl.y, br.y);
    Object.assign(menu.style, {
      left: `${esquerda}px`, top: `${topo}px`, width: `${direita - esquerda}px`, height: `${base - topo}px`,
    });
  };

  const mostrarMenu = () => {
    const perto = target === 1 && progress > 0.94;
    if (perto) { menu.hidden = false; posicionarMenu(); }
    menu.classList.toggle('arcade-menu--aberto', perto);
    if (!perto && progress < 0.02) menu.hidden = true;
  };

  const resize = () => {
    if (!renderer || !camera) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = width < 480 ? 5.7 : 5.0;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    posicionarMenu();
  };

  const animate = (time) => {
    frame = 0;
    if (!visible || document.hidden || !renderer) return;
    const elapsed = Math.min((time - (lastTime || time)) / 1000, 0.08);
    lastTime = time;
    const speed = reducedMotion.matches ? 10 : 2.4;
    progress += (target - progress) * Math.min(1, elapsed * speed);
    if (Math.abs(target - progress) < 0.001) progress = target;
    const gentleTurn = reducedMotion.matches ? 0 : Math.sin(time * 0.00032) * 0.19;
    model.rotation.y = gentleTurn * (1 - progress);
    model.position.z = progress * 1.45;
    model.position.y = -progress * 0.83;
    const scale = 1 + progress * 0.52;
    model.scale.setScalar(scale);
    renderer.render(scene, camera);
    mostrarMenu();
    if (!reducedMotion.matches || progress !== target) frame = requestAnimationFrame(animate);
  };

  const start = () => {
    if (loaded && !frame && visible && !document.hidden) {
      lastTime = 0;
      frame = requestAnimationFrame(animate);
    }
  };

  async function load() {
    if (loaded || loading) return;
    loading = true;
    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(37, 1, 0.1, 30);
      camera.position.set(0, 1.5, 5);
      camera.lookAt(0, 1.36, 0);
      scene.add(new THREE.HemisphereLight(0xffe8bd, 0x4c2330, 2.15));
      const key = new THREE.DirectionalLight(0xffffff, 2.25);
      key.position.set(-2, 5, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xff6e20, 1.15);
      rim.position.set(3, 3, -2);
      scene.add(rim);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      stage.appendChild(renderer.domElement);
      model = await createEnzoArcade('/assets/fliperama-3d/');
      scene.add(model);
      loaded = true;
      machine.classList.add('arcade-machine--ready');
      resize();
      start();
    } catch (error) {
      console.error('Não foi possível carregar o fliperama 3D.', error);
      machine.classList.add('arcade-machine--error');
      prompt.textContent = 'O fliperama não carregou. Toque para tentar novamente.';
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = null;
      loading = false;
    }
  }

  const alternar = () => {
    if (!loaded) {
      load();
      return;
    }
    target = target ? 0 : 1;
    prompt.setAttribute('aria-pressed', String(Boolean(target)));
    prompt.textContent = target ? 'Escolha um jogo na tela · toque para afastar' : 'Toque no fliperama para chegar mais perto';
    mostrarMenu();
    start();
  };
  prompt.addEventListener('click', alternar);
  stage.addEventListener('click', alternar);

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      load();
      start();
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '250px 0px', threshold: 0 }).observe(machine);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
}
