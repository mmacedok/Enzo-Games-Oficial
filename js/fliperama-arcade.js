import * as THREE from 'three';

// Web-ready, low-poly arcade. Every visible side has geometry; no billboard cabinet.
export async function createEnzoArcade(assetBase = new URL('./assets/', import.meta.url).href) {
  const loader = new THREE.TextureLoader();
  const paths = ['lateral.jpg', 'tela.jpg', 'frente.jpg', 'letreiro.jpg'];
  const base = new URL(assetBase, window.location.href);
  const [side, screen, front, marquee] = await Promise.all(
    paths.map((name) => loader.loadAsync(new URL(name, base).href))
  );
  for (const texture of [side, screen, front, marquee]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 2;
  }

  const root = new THREE.Group();
  root.name = 'Fliperama Enzo Games';
  const color = (hex, metalness = 0) => new THREE.MeshStandardMaterial({
    color: hex, roughness: 0.88, metalness, flatShading: true, side: THREE.DoubleSide
  });
  const mat = {
    sauce: color('#9e2117'), darkSauce: color('#5c1714'), cream: color('#f7d894'),
    edge: color('#1a1112'), brass: color('#dc9027', 0.2), screenEdge: color('#101318'),
    meat: color('#713820'), tomato: color('#d43b20'), noodle: color('#f5bd53'),
    redButton: color('#d82824'), goldButton: color('#fac639'), coin: color('#6e7479', 0.35),
    glow: new THREE.MeshStandardMaterial({
      color: '#ffdd6c', emissive: '#ff9e13', emissiveIntensity: 1.7,
      roughness: 0.35, flatShading: true
    }),
    side: new THREE.MeshBasicMaterial({map: side, side: THREE.DoubleSide}),
    screen: new THREE.MeshBasicMaterial({map: screen, side: THREE.DoubleSide}),
    front: new THREE.MeshBasicMaterial({map: front, side: THREE.DoubleSide}),
    marquee: new THREE.MeshBasicMaterial({map: marquee, side: THREE.DoubleSide})
  };

  function box(name, w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name; mesh.position.set(x, y, z); root.add(mesh); return mesh;
  }
  function ball(name, radius, x, y, z, material, detail = 0) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), material);
    mesh.name = name; mesh.position.set(x, y, z); root.add(mesh); return mesh;
  }
  function bar(name, a, b, radius, material, sides = 7) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), sides), material);
    mesh.name = name;
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    root.add(mesh); return mesh;
  }
  function panel(name, corners, material) {
    // Corners: lower-left, lower-right, upper-right, upper-left.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1], 2));
    geo.setIndex([0,1,2, 0,2,3]);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name; root.add(mesh); return mesh;
  }
  function tube(name, points, radius, material, segments = 28) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 5, false), material);
    mesh.name = name; root.add(mesh); return mesh;
  }

  // A profiled silhouette, including the projecting control deck and marquee.
  const profile = [
    [-0.44,0.06], [0.45,0.06], [0.45,0.89], [0.66,0.98],
    [0.43,1.15], [0.31,1.73], [0.53,1.88], [0.53,2.20], [-0.44,2.20]
  ];
  const contour = profile.map(([z, y]) => new THREE.Vector2(z, y));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const sideX of [-0.525, 0.525]) {
    const geo = new THREE.BufferGeometry();
    const positions = [], uv = [];
    for (const [z,y] of profile) {
      positions.push(sideX, y, z);
      uv.push((z + 0.44) / 1.10, (y - 0.06) / 2.14);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(triangles.flat());
    geo.computeVertexNormals();
    const sidePanel = new THREE.Mesh(geo, mat.side);
    sidePanel.name = sideX < 0 ? 'Arte lateral esquerda' : 'Arte lateral direita';
    root.add(sidePanel);
    const trimX = sideX < 0 ? sideX - 0.018 : sideX + 0.018;
    for (let i=0; i<profile.length; i++) {
      const p = profile[i], q = profile[(i+1)%profile.length];
      bar('Contorno lateral', [trimX,p[1],p[0]], [trimX,q[1],q[0]], 0.022, mat.edge);
    }
  }

  box('Corpo principal', 1.00, 2.08, 0.85, 0, 1.11, -0.015, mat.sauce);
  box('Base frontal', 1.02, 0.90, 0.94, 0, 0.52, 0.01, mat.darkSauce);
  box('Teto', 1.04, 0.085, 1.00, 0, 2.16, 0.03, mat.edge);
  panel('Adesivo frontal', [
    [-0.48,0.12,0.484], [0.48,0.12,0.484], [0.48,0.89,0.484], [-0.48,0.89,0.484]
  ], mat.front);
  // Real rear details make the cabinet complete in a 360-degree view.
  box('Tampa traseira', 0.91, 1.93, 0.024, 0, 1.11, -0.468, mat.darkSauce);
  box('Porta de manutenção', 0.56, 0.78, 0.028, 0, 0.80, -0.491, mat.edge);
  box('Maçaneta de manutenção', 0.10, 0.034, 0.035, 0.19, 0.80, -0.512, mat.coin);
  for (let i=0;i<7;i++) box('Grade de ventilação', 0.38,0.018,0.017,0,1.58+i*0.065,-0.492,mat.edge);
  for (const sx of [-0.30,0.30]) for (const sy of [0.48,1.10])
    ball('Parafuso traseiro',0.013,sx,sy,-0.515,mat.coin);

  // Sloped display and its thick black bezel.
  panel('Moldura da tela', [
    [-0.455,1.14,0.505], [0.455,1.14,0.505],
    [0.455,1.77,0.355], [-0.455,1.77,0.355]
  ], mat.screenEdge);
  panel('Tela do jogo', [
    [-0.405,1.205,0.510], [0.405,1.205,0.510],
    [0.405,1.695,0.393], [-0.405,1.695,0.393]
  ], mat.screen);
  for (const x of [-0.47,0.47])
    bar('Borda da tela', [x,1.14,0.510], [x,1.77,0.355],0.025,mat.edge);

  // Marquee and low-poly pasta/sauce trim.
  box('Volume do letreiro',1.03,0.34,0.24,0,2.005,0.41,mat.cream);
  panel('Letreiro ENZO GAMES',[
    [-0.50,1.87,0.542], [0.50,1.87,0.542],
    [0.50,2.14,0.542], [-0.50,2.14,0.542]
  ],mat.marquee);
  for (const y of [1.86,2.15])
    bar('Filete do letreiro',[-0.52,y,0.553],[0.52,y,0.553],0.021,mat.brass);

  // Projecting control deck, joystick, buttons, coin door.
  panel('Painel de controle',[
    [-0.48,0.985,0.675], [0.48,0.985,0.675],
    [0.48,1.15,0.425], [-0.48,1.15,0.425]
  ],mat.sauce);
  box('Borda dos controles',1.00,0.055,0.12,0,0.975,0.66,mat.brass);
  const joyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.085,0.026,10),mat.edge);
  joyBase.position.set(-0.22,1.075,0.55); joyBase.name='Base do joystick'; root.add(joyBase);
  bar('Haste do joystick',[-0.22,1.08,0.55],[-0.22,1.22,0.55],0.019,mat.coin);
  ball('Manopla vermelha do joystick',0.055,-0.22,1.235,0.55,mat.redButton,1);
  for (let i=0;i<6;i++) {
    const x = 0.07 + (i%3)*0.12, z = 0.51 + Math.floor(i/3)*0.085;
    const key = new THREE.Mesh(new THREE.CylinderGeometry(0.041,0.041,0.026,9),i%2 ? mat.goldButton : mat.redButton);
    key.name='Botão de fliperama'; key.position.set(x,1.087-Math.floor(i/3)*0.032,z); root.add(key);
  }
  box('Moldura da porta de moedas',0.30,0.40,0.04,0,0.51,0.510,mat.edge);
  box('Chapa da porta de moedas',0.26,0.36,0.046,0,0.51,0.535,mat.screenEdge);
  for (const x of [-0.067,0.067]) {
    box('Boca de moeda',0.055,0.105,0.018,x,0.575,0.569,mat.coin);
    box('Ranhura de moeda',0.036,0.011,0.019,x,0.602,0.582,mat.edge);
  }
  for (const x of [-0.40,0.40]) for (const z of [-0.32,0.32])
    box('Pé de borracha',0.11,0.09,0.12,x,0.035,z,mat.edge);

  // Sculpted macaroni bowl: not a 2D sign. Simple low-poly rings, noodles and meatballs.
  const bowlProfile = [
    new THREE.Vector2(0.12,0), new THREE.Vector2(0.27,0.035),
    new THREE.Vector2(0.35,0.17), new THREE.Vector2(0.40,0.23),
    new THREE.Vector2(0.41,0.265)
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile,16),mat.cream);
  bowl.name='Tigela de macarronada em relevo'; bowl.position.set(0,2.20,0.03); root.add(bowl);
  const sauceTop = new THREE.Mesh(new THREE.CylinderGeometry(0.395,0.395,0.02,16),mat.tomato);
  sauceTop.position.set(0,2.463,0.03); sauceTop.name='Molho da macarronada'; root.add(sauceTop);
  for (let i=0;i<12;i++) {
    const phase=i*0.57, z=0.03 + (i%4-1.5)*0.075;
    const points=[];
    for(let k=0;k<=8;k++){
      const t=k/8;
      points.push([-0.33+0.66*t,2.49+0.065*Math.sin(2.4*Math.PI*t+phase),z+0.055*Math.cos(2*Math.PI*t+phase)]);
    }
    tube('Fio de espaguete',points,0.019,mat.noodle,32);
  }
  for (const [x,y,z] of [[-0.21,2.55,0.19],[0.02,2.60,0.03],[0.25,2.54,0.17]]) {
    ball('Almôndega',0.086,x,y,z,mat.meat,0);
    ball('Molho da almôndega',0.038,x-0.02,y+0.06,z+0.03,mat.tomato,0);
  }
  for (const x of [-0.23,0.04,0.26])
    tube('Gota de molho',[[x,2.465,0.33],[x+0.01,2.38,0.37],[x-0.02,2.31,0.38]],0.013,mat.tomato,10);

  // A distinct LED arch and individual bulbs survive low resolution on mobile.
  const arc=[];
  for(let i=0;i<=32;i++){
    const a=Math.PI*i/32;
    arc.push([0.51*Math.cos(a),2.32+0.51*Math.sin(a),-0.065]);
  }
  tube('Arco dos LEDs',arc,0.024,mat.tomato,64);
  for(let i=0;i<=31;i++){
    const a=Math.PI*i/31;
    ball('LED da macarronada',0.025,0.51*Math.cos(a),2.32+0.51*Math.sin(a),-0.025,mat.glow,0);
  }

  root.userData = {title:'Fliperama Enzo Games',format:'Three.js',style:'low-poly retro'};
  return root;
}
