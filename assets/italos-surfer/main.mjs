import * as T from './vendor/three.mjs';
import {createInitialState,createScenario,queueAction,step,scoreFor,snapshot,laneToX,clamp} from './core.mjs';
import {character,animateCharacter,box,factory,gantry,tank,crate,obstacle,pasta,powerup,mat} from './models.mjs';

const $=id=>document.getElementById(id),qa=new URLSearchParams(location.search).has('qa');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let settings={best:0,muted:false};
try{const saved=JSON.parse(localStorage.getItem('italos-surfer-v1')||'{}');settings.best=Number.isFinite(saved.best)?Math.max(0,saved.best):0;settings.muted=saved.muted===true;}catch{}
const save=()=>{try{localStorage.setItem('italos-surfer-v1',JSON.stringify(settings));}catch{}};
let audio,beat=0;
function tone(frequency=440,length=.1,type='square',volume=.03){
  if(settings.muted)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audio.currentTime);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{}
}
function toggleSound(){settings.muted=!settings.muted;save();$('menu-sound').textContent='SOM: '+(settings.muted?'DESLIGADO':'LIGADO');$('sound').textContent=settings.muted?'×':'♪';if(!settings.muted)tone();}
$('menu-sound').textContent='SOM: '+(settings.muted?'DESLIGADO':'LIGADO');$('sound').textContent=settings.muted?'×':'♪';
$('best').textContent=settings.best.toLocaleString('pt-BR');
let state=createInitialState(),mode='menu',renderer,scene,camera,player,chaser,last=0,toastUntil=0,accumulator=0;
const segments=[],views=new Map(),pools=new Map(),particles=[];
const particleGeo=new T.IcosahedronGeometry(.06,0);
const counts={frames:0,totalTime:0};

// Merge repeating industrial scenery by material to avoid hundreds of draw calls.
function batch(group){
  group.updateMatrixWorld(true);const buckets=new Map();
  group.traverse(m=>{if(!m.isMesh)return;const key=m.material;let b=buckets.get(key);if(!b)buckets.set(key,b=[]);b.push(m.geometry.clone().applyMatrix4(m.matrixWorld));});
  const result=new T.Group();
  for(const [material,list] of buckets){let length=0;for(const g of list)length+=(g.index?.count||g.attributes.position.count);const pos=new Float32Array(length*3),normal=new Float32Array(length*3);let offset=0;
    for(const geo of list){const p=geo.attributes.position,n=geo.attributes.normal;for(let i=0;i<(geo.index?.count||p.count);i++){const j=geo.index?geo.index.getX(i):i;pos.set([p.getX(j),p.getY(j),p.getZ(j)],offset*3);normal.set([n.getX(j),n.getY(j),n.getZ(j)],offset*3);offset++;}geo.dispose();}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=true;result.add(mesh);
  }return result;
}
function sign(text,width=4,height=.8){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#252634';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#f4bd60';ctx.lineWidth=9;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#fff0d4';ctx.font='900 30px Arial';ctx.textAlign='center';ctx.fillText(text,256,76);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:tex}));}
function buildWorld(){
  box(scene,[120,.3,260],[0,-.3,-100],0x665d5c);
  for(let index=0;index<8;index++){
    const raw=new T.Group();box(raw,[9,.1,24],[0,-.11,0],0x6b747b);
    for(const lane of [-2.45,0,2.45]){for(const offset of [-.65,.65])box(raw,[.065,.09,24],[lane+offset,-.01,0],0x30333c);for(let z=-11;z<12;z+=1.9)box(raw,[1.6,.035,.18],[lane,-.035,z],0x9c8064);}
    for(const side of [-1,1]){box(raw,[.4,.38,24],[side*4.8,0,0],0xf1bd5b);const f=factory(index+(side>0?1:0));f.position.set(side*(9+index%2),0,-4);raw.add(f);
      if(index%2===0){const t=tank();t.position.set(side*6.9,0,6);raw.add(t);}else{const c=crate();c.position.set(side*7,0,5);raw.add(c);}
      box(raw,[.15,6,.15],[side*5.9,3,8],0x2a3039);box(raw,[1.1,.2,.6],[side*5.6,6,8],0xffd478);
    }
    if(index%2===0)raw.add(gantry());const merged=batch(raw);merged.position.z=12-index*24;scene.add(merged);segments.push(merged);
  }
  const banner=sign('OPERATOR VILLAGE',7,1.5);banner.position.set(0,7.5,-34);scene.add(banner);
  const skyline=new T.Group();for(let i=0;i<20;i++){const h=12+(i*7)%23;box(skyline,[4,h,7],[(i-10)*7,h/2,-145-i%3*8],0x576172);}scene.add(batch(skyline));
  const sun=new T.Mesh(new T.SphereGeometry(7,16,12),new T.MeshBasicMaterial({color:0xffd693}));sun.position.set(-32,38,-135);scene.add(sun);
}
function make(kind,type){return kind==='obstacle'?obstacle(type):kind==='coin'?pasta():powerup(type);}
function obtain(kind,type){const key=kind+':'+(type||'pasta');let pool=pools.get(key);if(!pool)pools.set(key,pool=[]);const mesh=pool.pop()||make(kind,type);mesh.visible=true;scene.add(mesh);return {mesh,key,kind,type};}
function release(id){const v=views.get(id);if(!v)return;v.mesh.visible=false;scene.remove(v.mesh);pools.get(v.key).push(v.mesh);views.delete(id);}
function sync(){const alive=new Set();for(const [kind,items] of [['obstacle',state.obstacles],['coin',state.collectibles],['powerup',state.powerups]])for(const item of items){alive.add(item.id);let view=views.get(item.id);if(!view){view=obtain(kind,item.type);views.set(item.id,view);}view.mesh.position.set(laneToX(item.lane),kind==='obstacle'?0:1.04,item.z);if(kind!=='obstacle')view.mesh.rotation.y=state.elapsed*2;}
  for(const id of views.keys())if(!alive.has(id))release(id);
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+1500;}
function burst(x,color){for(let i=0;i<10;i++){let p=particles.find(p=>p.life<=0);if(!p){if(particles.length>=30)break;p={mesh:new T.Mesh(particleGeo,mat(color)),velocity:new T.Vector3(),life:0};scene.add(p.mesh);particles.push(p);}p.mesh.material=mat(color);p.mesh.visible=true;p.mesh.position.set(x,1.1,0);p.velocity.set((Math.random()-.5)*4,Math.random()*4+1,(Math.random()-.5)*3);p.life=.5;}}
function show(next){mode=next;for(const id of ['menu','paused','over'])$(id).hidden=id!==next;$('hud').hidden=next==='menu'||next==='over';$('touch').hidden=next!=='playing'||!(qa||innerWidth<650||matchMedia('(pointer: coarse)').matches);}
function updateHud(){
  $('score').textContent=scoreFor(state).toLocaleString('pt-BR');$('distance').textContent=Math.floor(state.distance);$('coins').textContent=state.coins;
  $('chase-meter').style.width=(15+(3-state.lives)*35)+'%';$('chase-text').textContent=['Enzo te pegou!','Última chance!','Ele está chegando!','Mantenha distância!'][state.lives];
  $('powers').textContent=[state.shieldTime>0?'◆ AURA '+Math.ceil(state.shieldTime)+' s':'',state.magnetTime>0?'U ÍMÃ '+Math.ceil(state.magnetTime)+' s':''].filter(Boolean).join(' · ');
}
function begin(scenario){state=scenario?createScenario(scenario):createInitialState();if(!state)return;state.status='playing';accumulator=0;for(const id of [...views.keys()])release(id);for(const p of particles){p.life=0;p.mesh.visible=false;}for(let i=0;i<segments.length;i++)segments[i].position.z=12-i*24;
  player.root.rotation.y=0;chaser.root.rotation.y=0;chaser.root.position.set(laneToX(state.lane),0,4.1);show('playing');sync();updateHud();tone(330);toast('CORRE, ITALOLOL!');last=performance.now();}
function pause(){if(mode==='playing')show('paused');}
function resume(){if(mode==='paused'){show('playing');last=performance.now();accumulator=0;}}
function finish(){show('over');const score=scoreFor(state),record=score>settings.best;if(record){settings.best=score;save();}$('best').textContent=settings.best.toLocaleString('pt-BR');$('result-score').textContent=score.toLocaleString('pt-BR');$('result-message').textContent=record?'NOVO RECORDE! Você farmou muita aura.':'AURA... Enzo alcançou a macarronada.';$('result-details').textContent=Math.floor(state.distance)+' metros · '+state.coins+' macarronadas · Recorde '+settings.best;tone(90,.45,'sawtooth');}
function action(a){if(mode!=='playing')return;queueAction(state,a);if(a==='jump')tone(570,.12,'triangle');if(a==='slide')tone(140,.1,'triangle');}
function input(){
  $('play').onclick=()=>begin();$('retry').onclick=()=>begin();$('restart').onclick=()=>begin();$('resume').onclick=resume;$('pause-btn').onclick=pause;$('home-menu').onclick=()=>{show('menu');};
  $('menu-sound').onclick=toggleSound;$('sound').onclick=toggleSound;$('help-btn').onclick=()=>{$('help').hidden=false;};$('help-close').onclick=()=>{$('help').hidden=true;};
  const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',ArrowDown:'slide',KeyS:'slide'};
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('help').hidden){$('help').hidden=true;return;}if(keys[e.code]||e.code==='KeyP'||e.code==='Escape')e.preventDefault();if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape'){mode==='playing'?pause():resume();return;}if(keys[e.code])action(keys[e.code]);});
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.action);}));
  let gesture;const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{if(mode!=='playing')return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.hypot(dx,dy)<25)return;action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'slide':'jump');});canvas.addEventListener('pointercancel',()=>gesture=null);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
}
function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<650?65:55;camera.updateProjectionMatrix();show(mode);}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-(last||now))/1000,.05);last=now;
  if(document.hidden)return;
  if(mode==='playing'){
    accumulator+=dt;while(accumulator>=1/60&&state.status==='playing'){step(state,{},1/60);accumulator-=1/60;}
    sync();for(const e of state.events){if(e.type==='coin'){tone(790,.065,'triangle',.025);burst(e.x,0xffce5c);}else if(e.type==='life'){tone(110,.2,'sawtooth');burst(e.x,0xe6524a);toast(state.lives===1?'ENZO ESTÁ NA SUA COLA!':'TUM! ENZO SE APROXIMOU!');}else{tone(650,.2,'triangle');toast(e.type==='magnet'?'ÍMÃ DE MACARRONADA!':state.shieldTime>0?'ESCUDO DE AURA!':'ESCUDO ABSORVEU O IMPACTO!');}}state.events.length=0;
    updateHud();for(const g of segments){g.position.z+=state.speed*dt;if(g.position.z>36)g.position.z-=192;}
    beat+=dt;if(beat>.22){beat=0;tone([110,165,146,220][Math.floor(state.elapsed*2)%4],.1,'triangle',.007);}
    if(state.status==='gameover')finish();
  }
  const running=mode==='playing',phase=mode==='menu'?now*.001:state.distance*.65;
  animateCharacter(player,phase,running?state.y:0,running&&state.sliding);animateCharacter(chaser,phase+.8);
  if(mode==='menu'){
    player.root.position.set(innerWidth<650?1:2.4,0,0);chaser.root.position.set(innerWidth<650?1.8:4.4,0,innerWidth<650?-2:1);player.root.rotation.y=Math.PI-.35;chaser.root.rotation.y=Math.PI-.55;
    camera.position.set(0,3.1,9);camera.lookAt(0,1.1,-1);
  }else{
    player.root.position.x=laneToX(state.lane);const targetZ=state.status==='gameover'?.55:4.1-(3-state.lives)*.85;
    chaser.root.position.x=T.MathUtils.lerp(chaser.root.position.x,player.root.position.x,1-Math.exp(-5*dt));chaser.root.position.z=T.MathUtils.lerp(chaser.root.position.z,targetZ,1-Math.exp(-3*dt));
    const mobileView=innerWidth<650,playerX=laneToX(state.lane);
    camera.position.set(playerX*(mobileView?1:.12),4.2,9.8);camera.lookAt(mobileView?playerX*.65:0,1,-10);
  }
  player.shield.visible=state.shieldTime>0&&mode==='playing';player.body.visible=!(running&&state.invulnerable>0&&Math.floor(now/90)%2===0);
  for(const p of particles)if(p.life>0){if(running){p.life-=dt;p.velocity.y-=9*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.scale.setScalar(Math.max(.01,p.life*2));}p.mesh.visible=p.life>0;}
  if(now>toastUntil)$('toast').classList.remove('show');renderer.render(scene,camera);counts.frames++;counts.totalTime+=dt;
}
function init(){
  try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setClearColor(0xb7ac9d);renderer.outputColorSpace=T.SRGBColorSpace;$('scene').appendChild(renderer.domElement);}catch{$('error').hidden=false;return;}
  scene=new T.Scene();scene.fog=new T.Fog(0xb7ac9d,55,160);camera=new T.PerspectiveCamera(55,innerWidth/innerHeight,.1,240);scene.add(new T.HemisphereLight(0xffefce,0x565169,2.5));const sun=new T.DirectionalLight(0xffdcb0,2.4);sun.position.set(-12,22,8);scene.add(sun);
  buildWorld();player=character('italo');chaser=character('enzo');scene.add(player.root,chaser.root);input();resize();window.addEventListener('resize',resize);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('error').hidden=false;});
  window.italosSurfer={snapshot:()=>({...snapshot(state),mode,map:'Operator Village',characters:['Italolol','Enzo Games'],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,objects:views.size,pool:[...pools.values()].reduce((n,a)=>n+a.length,0),fps:Math.round(counts.frames/Math.max(1,counts.totalTime))}),pause,resume};
  if(qa){
    const toolbar=document.createElement('aside');toolbar.className='qa';
    for(const type of ['jump','slide','dodge','coin','shield','magnet']){const b=document.createElement('button');b.textContent=type;b.onclick=()=>begin(type);toolbar.append(b);}
    const output=document.createElement('output');output.id='qa-status';toolbar.append(output);$('game').append(toolbar);
    setInterval(()=>output.textContent=JSON.stringify(window.italosSurfer.snapshot()),200);
  }
  if(new URLSearchParams(location.search).has('preview')){show('playing');state.status='playing';state.scenario='preview';state.obstacles=[{id:'preview-train',type:'dodge',lane:0,z:-22},{id:'preview-barrier',type:'jump',lane:2,z:-14},{id:'preview-pipe',type:'slide',lane:1,z:-45}];for(let i=0;i<8;i++)state.collectibles.push({id:'preview-pasta'+i,lane:1,z:-6-i*2.5,value:1});}
  requestAnimationFrame(frame);
}
init();
