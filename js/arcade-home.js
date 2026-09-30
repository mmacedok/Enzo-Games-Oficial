import * as THREE from 'three';
import { createEnzoArcade } from './fliperama-arcade.js';

const button = document.getElementById('arcade-machine');
const stage = document.getElementById('arcade-scene');
const prompt = document.getElementById('arcade-prompt');

if (button && stage) {
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

  const resize = () => {
    if (!renderer || !camera) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.z = width < 480 ? 5.7 : 5.0;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
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
    if (!reducedMotion.matches || progress !== target) frame = requestAnimationFrame(animate);
  };

  const start = () => {
    if (loaded && !frame && visible && !document.hidden) {
      lastTime = 0;
      frame = requestAnimationFrame(animate);
    }
  };

  async function load() {
    if (loaded || button.dataset.loading) return;
    button.dataset.loading = 'true';
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
      button.classList.add('arcade-machine--ready');
      resize();
      start();
    } catch (error) {
      console.error('Não foi possível carregar o fliperama 3D.', error);
      button.classList.add('arcade-machine--error');
      prompt.textContent = 'O fliperama não carregou. Toque para tentar novamente.';
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = null;
      button.dataset.loading = '';
    }
  }

  button.addEventListener('click', () => {
    if (!loaded) {
      load();
      return;
    }
    target = target ? 0 : 1;
    button.setAttribute('aria-pressed', String(Boolean(target)));
    button.setAttribute('aria-label', target ? 'Afastar o fliperama' : 'Aproximar o fliperama');
    prompt.textContent = target ? 'Toque para afastar o fliperama' : 'Toque no fliperama para chegar mais perto';
    start();
  });

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
  }, { rootMargin: '250px 0px', threshold: 0 }).observe(button);
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
}