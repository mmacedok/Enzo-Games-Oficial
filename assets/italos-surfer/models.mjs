import * as T from './vendor/three.mjs';

// All meshes are authored for this game. Shared geometry/materials stay bounded
// during play; exported JSON assets use these same factories.
const colors = { ink:0x201e28, yellow:0xffe794, pink:0xd33d78, brown:0x8c451e, orange:0xff922e, cream:0xffeed0, teal:0x377a83, steel:0x50626b, red:0xd74838, gold:0xfac64f };
const mats = new Map(), geos = new Map();
export const mat = color => {
  if (!mats.has(color)) mats.set(color,new T.MeshToonMaterial({color}));
  return mats.get(color);
};
const ink = new T.MeshBasicMaterial({color:colors.ink,side:T.BackSide});
function geom(key,build){if(!geos.has(key))geos.set(key,build());return geos.get(key);}
function put(parent,geometry,color,pos,scale=[1,1,1],outline=true){
  const m=new T.Mesh(geometry,mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;
  if(outline){const o=new T.Mesh(geometry,ink);o.scale.setScalar(1.035);m.add(o);}parent.add(m);return m;
}
export function box(p,size,pos,c,outline=false){return put(p,geom('box',()=>new T.BoxGeometry(1,1,1)),c,pos,size,outline);}
function ball(p,size,pos,c,outline=true){return put(p,geom('ball',()=>new T.SphereGeometry(1,12,8)),c,pos,size,outline);}
function cylinder(p,r,h,pos,c){return put(p,geom('cylinder',()=>new T.CylinderGeometry(1,1,1,10)),c,pos,[r,h,r]);}
function torus(p,r,t,pos,c){return put(p,geom(`torus${r},${t}`,()=>new T.TorusGeometry(r,t,5,16)),c,pos,[1,1,1],false);}
function limb(p,x,y,length,c){const g=new T.Group();g.position.set(x,y,0);p.add(g);ball(g,[.14,length/2,.15],[0,-length/2,0],c);ball(g,[.21,.14,.28],[0,-length,-.06],c);return g;}
export function character(kind='italo'){
  const root=new T.Group(),body=new T.Group();root.name=kind==='italo'?'Italolol':'Enzo furioso';root.add(body);
  const dog=kind==='italo',fur=dog?colors.yellow:colors.orange;
  ball(body,dog?[.43,.63,.34]:[.68,.64,.49],[0,.92,0],fur);
  const head=new T.Group();head.position.y=1.78;body.add(head);
  ball(head,dog?[.53,.52,.43]:[.65,.57,.48],[0,0,0],fur);
  if(dog){
    for(const x of [-.5,.5]){const ear=ball(head,[.23,.51,.15],[x,.38,-.06],colors.brown);ear.rotation.z=x<0?-.36:.36;}
    // Current visual sheet takes precedence over older prose: black/pink split.
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.cos(a)*.42,z=Math.sin(a)*.34;ball(head,[.24,.22,.2],[x,.38,z],x<0?colors.ink:colors.pink);}
    ball(head,[.19,.31,.07],[0,-.46,-.4],0xe74750);
    for(const [x,y,z,r] of [[.22,1.04,.29,.11],[-.17,.79,.31,.1],[.2,1.04,-.31,.14],[-.15,.82,-.32,.12],[.1,.56,-.26,.1]])ball(body,[r,r*1.3,.025],[x,y,z],colors.ink,false);
    const chain=torus(body,.3,.035,[0,1.17,0],colors.gold);chain.rotation.x=Math.PI/2;
    for(const x of [-.22,.22]){ball(head,[.22,.25,.08],[x,.02,-.38],0xffffff);const ring=torus(head,.22,.019,[x,.02,-.46],colors.ink);ring.scale.y=1.07;ball(head,[.065,.11,.035],[x,.02,-.49],colors.ink,false);}
    box(head,[.1,.03,.04],[0,.02,-.46],colors.ink);
  }else{
    for(const x of [-.35,.35]){const ear=put(head,geom('ear',()=>new T.ConeGeometry(.22,.5,3)),fur,[x,.55,0]);ear.rotation.z=x<0?-.2:.2;}
    ball(head,[.43,.18,.15],[0,-.33,-.35],colors.ink);
    for(const x of [-.22,.22]){ball(head,[.24,.24,.08],[x,.02,-.42],colors.cream);box(head,[.43,.1,.045],[x,.18,-.5],colors.orange);ball(head,[.065,.07,.03],[x,-.02,-.51],colors.ink,false);const brow=box(head,[.37,.065,.05],[x,.23,-.49],colors.ink);brow.rotation.z=x<0?-.25:.25;}
    for(const x of [-.22,.22]){for(const y of [-.14,.18])box(head,[.43,.024,.025],[x,y,-.53],colors.ink);for(const edge of [-.21,.21])box(head,[.024,.34,.025],[x+edge,.02,-.53],colors.ink);}box(head,[.08,.025,.025],[0,.03,-.53],colors.ink);
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){const x=(col-2)*.19;ball(body,[.035,.075,.015],[x,.57+row*.2,.47-Math.abs(x)*.23],colors.ink,false);}
    for(let i=0;i<5;i++)box(head,[.065,.2,.04],[(i-2)*.15,.4,.36],colors.ink);
  }
  ball(head,[.28,.16,.16],[0,-.21,-.44],dog?fur:colors.cream);ball(head,[.16,.09,.09],[0,-.19,-.57],dog?colors.ink:0xd97873);
  const arms=[limb(body,-(dog?.43:.63),1.21,.57,fur),limb(body,dog?.43:.63,1.21,.57,fur)];
  const legs=[limb(body,-.23,.5,.44,fur),limb(body,.23,.5,.44,fur)];
  for(const arm of arms)for(const x of [-.11,0,.11])ball(arm,[.035,.05,.04],[x,-.58,-.2],colors.ink,false);
  if(!dog){for(let i=0;i<6;i++){const tattoo=torus(arms[1],.14,.026,[0,-.07-i*.073,0],colors.ink);tattoo.rotation.x=Math.PI/2;}box(arms[0],[.28,.13,.3],[0,-.4,0],colors.ink);box(arms[0],[.18,.08,.02],[0,-.4,-.16],colors.teal);}
  const tail=new T.Group();tail.position.set(0,.55,.26);body.add(tail);
  for(let i=0;i<5;i++)ball(tail,[.12,.11,.14],[i*.08,.1+i*.075,i*.1],dog?(i===4?colors.ink:fur):(i%2?colors.ink:fur),false);
  const shield=new T.Mesh(new T.SphereGeometry(1.05,16,12),new T.MeshBasicMaterial({color:0x6bffdc,wireframe:true,transparent:true,opacity:.3}));shield.position.y=1.1;shield.visible=false;root.add(shield);
  body.name='body';head.name='head';tail.name='tail';arms[0].name='armL';arms[1].name='armR';legs[0].name='legL';legs[1].name='legR';
  root.userData.kind=kind;
  return {root,body,head,arms,legs,tail,shield};
}
export function animateCharacter(c,phase,y=0,sliding=false){
  c.body.scale.y=sliding?.47:1;c.body.rotation.x=sliding?.3:0;c.body.position.y=Math.abs(Math.sin(phase))*.045;
  c.root.position.y=y;c.legs[0].rotation.x=Math.sin(phase)*.65;c.legs[1].rotation.x=-Math.sin(phase)*.65;
  c.arms[0].rotation.x=-Math.sin(phase)*.65;c.arms[1].rotation.x=Math.sin(phase)*.65;c.tail.rotation.z=Math.sin(phase*.6)*.22;
}
export function obstacle(type){
  const g=new T.Group();g.name=type==='dodge'?'Trem industrial':type==='jump'?'Barreira de obra':'Tubulação baixa';
  if(type==='dodge'){
    box(g,[1.72,2.65,2.65],[0,1.325,0],colors.teal,true);box(g,[1.75,.15,2.7],[0,2.55,0],colors.ink);
    for(const z of [-1.34,1.34]){box(g,[1.24,.65,.035],[0,1.9,z],0xa7e5eb);box(g,[1.55,.24,.04],[0,.55,z],colors.gold);for(const x of [-.55,.55])ball(g,[.1,.1,.025],[x,1.1,z],colors.cream,false);}
    for(const x of [-.87,.87])for(const z of [-.7,.7]){const wheel=cylinder(g,.24,.1,[x,.24,z],colors.ink);wheel.rotation.z=Math.PI/2;}
  }else if(type==='jump'){
    for(const x of [-.7,.7])box(g,[.16,.65,.6],[x,.3,0],colors.steel);
    box(g,[1.72,.34,.78],[0,.5,0],colors.gold,true);for(let i=0;i<5;i++){const stripe=box(g,[.12,.32,.025],[-.65+i*.32,.5,.403],colors.ink);stripe.rotation.z=-.3;}
  }else{
    for(const x of [-.8,.8])box(g,[.12,2.65,.25],[x,1.3,0],colors.steel);
    const pipe=cylinder(g,.29,1.72,[0,1.56,0],colors.red);pipe.rotation.z=Math.PI/2;
    for(const x of [-.6,.6]){const band=torus(g,.31,.05,[x,1.56,0],colors.gold);band.rotation.y=Math.PI/2;}
  }return g;
}
export function pasta(){const g=new T.Group();g.name='Macarronada com almôndegas';
  const bowl=put(g,geom('bowl',()=>new T.SphereGeometry(.3,10,6,0,Math.PI*2,Math.PI/2,Math.PI/2)),colors.cream,[0,.08,0]);
  for(let i=0;i<3;i++){const noodle=torus(g,.17-i*.03,.025,[0,.13+i*.025,0],colors.gold);noodle.rotation.x=Math.PI/2;}
  for(const x of [-.11,.1])ball(g,[.085,.08,.085],[x,.19,.02],colors.brown,false);return g;
}
export function powerup(type){const g=new T.Group();g.name=type==='shield'?'Escudo de aura':'Ímã de macarronada';
  if(type==='shield')put(g,geom('shield',()=>new T.OctahedronGeometry(.42)),0x6bffdc,[0,0,0]);
  else {const m=put(g,geom('magnet',()=>new T.TorusGeometry(.3,.1,6,14,Math.PI*1.45)),colors.pink,[0,0,0]);m.rotation.z=.85;}
  return g;
}
export function factory(index=0){
  const g=new T.Group();g.name='Fábrica Operator Village';const h=5+index%4*2,c=[0xa96046,0x477b83,0x6b697d,0xc18a56][index%4];
  box(g,[5,h,8],[0,h/2,0],c,true);box(g,[5.3,.3,8.3],[0,h,0],colors.ink);
  for(let row=0;row<Math.floor(h/2);row++)for(let x=-1;x<=1;x++){box(g,[.8,1,.06],[x*1.4,1.5+row*2,4.04],colors.gold);box(g,[.07,1,.08],[x*1.4,1.5+row*2,4.1],colors.ink);}
  cylinder(g,.5,h+5,[1.6,(h+5)/2,-1.5],colors.steel);for(let j=0;j<3;j++)cylinder(g,.53,.35,[1.6,h+1+j,-1.5],colors.red);
  box(g,[1.6,2.3,.08],[0,1.15,4.07],colors.ink);const pipe=cylinder(g,.16,5,[-2.58,2.4,0],colors.gold);return g;
}
export function gantry(){const g=new T.Group();g.name='Passarela industrial';for(const x of [-5.6,5.6])box(g,[.35,7,.5],[x,3.5,0],colors.steel);box(g,[11.5,.4,1.8],[0,6.4,0],colors.steel);box(g,[11.5,.2,.15],[0,7.2,.85],colors.gold);for(let i=-5;i<=5;i++)box(g,[.08,.8,.08],[i,6.8,.85],colors.ink);return g;}
export function tank(){const g=new T.Group();g.name='Tanque industrial';cylinder(g,1.8,4,[0,2,0],colors.teal);for(const y of [.3,2,3.8]){const ring=torus(g,1.82,.08,[0,y,0],colors.gold);ring.rotation.x=Math.PI/2;}ball(g,[1.8,.35,1.8],[0,4,0],colors.steel);return g;}
export function crate(){const g=new T.Group();g.name='Contêiner';box(g,[2.8,2.7,5],[0,1.35,0],colors.red,true);for(let i=0;i<8;i++)box(g,[.055,2.5,.04],[-1.2+i*.34,1.35,2.53],colors.gold);return g;}
