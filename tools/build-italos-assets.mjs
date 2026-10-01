import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from '../assets/italos-surfer/vendor/three.mjs';
import {character,obstacle,pasta,powerup,factory,gantry,tank,crate,hoverboard,crane} from '../assets/italos-surfer/models.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/italos-surfer');
fs.mkdirSync(path.join(root,'models'),{recursive:true});fs.mkdirSync(path.join(root,'audio'),{recursive:true});
function clips(){const times=[0,.15,.3,.45,.6],tracks=[];for(const [name,sign] of [['legL',1],['legR',-1],['armL',-1],['armR',1]])tracks.push(new T.NumberKeyframeTrack(name+'.rotation[x]',times,[0,.65*sign,0,-.65*sign,0]));
  return [new T.AnimationClip('correr',.6,tracks),new T.AnimationClip('pular',.84,[new T.NumberKeyframeTrack('.position[y]',[0,.21,.42,.63,.84],[0,1.62,2.2,1.66,0])]),new T.AnimationClip('deslizar',.72,[new T.NumberKeyframeTrack('body.scale[y]',[0,.08,.63,.72],[1,.47,.47,1])]),new T.AnimationClip('tropecar',.4,[new T.NumberKeyframeTrack('body.rotation[z]',[0,.1,.2,.3,.4],[0,.25,-.25,.15,0])])];}
const assets=[];
function exportModel(name,model,collision){let triangles=0;model.traverse(m=>{if(m.isMesh)triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});
  fs.writeFileSync(path.join(root,'models',name+'.json'),JSON.stringify(model.toJSON()));assets.push({id:name,path:'models/'+name+'.json',triangles:Math.round(triangles),collision:collision||null});}
for(const kind of ['italo','enzo']){const c=character(kind);c.root.animations=clips();exportModel(kind,c.root);}
for(const type of ['dodge','jump','slide','train','ramp'])exportModel(type,obstacle(type),{width:1.72,depth:({dodge:2.65,jump:.78,slide:.58,train:12,ramp:6})[type],action:type});
exportModel('prancha',hoverboard());exportModel('guindaste',crane());exportModel('macarronada',pasta());for(const type of ['shield','magnet','jetpack','sneakers','double'])exportModel(type,powerup(type));for(let i=0;i<4;i++)exportModel('factory-'+i,factory(i));exportModel('gantry',gantry());exportModel('tank',tank());exportModel('container',crate());
function wav(name,frequencies,duration,volume=.18){const rate=22050,n=Math.floor(duration*rate),buffer=Buffer.alloc(44+n*2);buffer.write('RIFF',0);buffer.writeUInt32LE(36+n*2,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++){const t=i/rate,f=frequencies[Math.min(frequencies.length-1,Math.floor(t/duration*frequencies.length))],envelope=Math.pow(1-(t%(duration/frequencies.length))/(duration/frequencies.length),2);buffer.writeInt16LE(Math.round(Math.sin(t*f*Math.PI*2)*volume*envelope*32767),44+i*2);}
  fs.writeFileSync(path.join(root,'audio',name+'.wav'),buffer);assets.push({id:name,path:'audio/'+name+'.wav',duration});}
wav('coleta',[790,990],.15);wav('pulo',[430,570,680],.18);wav('deslize',[190,140],.15);wav('impacto',[110,80,65],.25);wav('poder',[330,440,650],.3);wav('capturado',[170,130,90],.5);wav('operator-loop',[110,165,146,220,110,165,196,146],1.76,.1);
if(fs.existsSync(path.join(root,'cover.png')))assets.push({id:'cover',path:'cover.png',type:'comic cover'});
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({title:"Italo's Surfer",map:'Operator Village',format:'Three.js ObjectLoader JSON + PCM WAV',reference:'Fichas Italolol.png e Enzo games ficha.png; cabelo preto e rosa conforme ficha atual',assets},null,2));
console.log('Assets exportados: '+assets.length);
