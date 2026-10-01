// Simulation uses world-space feet height; the renderer shares these dimensions.
export const LANES = [-2.45, 0, 2.45], PLAYER_Z = 0, TUTORIAL_SECONDS = 10, MAX_SPEED = 27;
export const PLAYER_RADIUS = .38, OBSTACLE_WIDTH = 1.72, PLAYER_HEIGHT = 2.35, SLIDING_HEIGHT = 1.06;
export const TRAIN_HEIGHT = 2.65, GRAVITY = 24, JUMP_SPEED = 10.5;
export const OBSTACLE_DEPTH = {dodge:2.65, jump:.78, slide:.58, train:12, ramp:6};
export const COLLISION = {dodge:{minY:TRAIN_HEIGHT}, train:{minY:TRAIN_HEIGHT}, jump:{minY:.67}, slide:{requireSliding:true,maxPlayerTopY:1.27}};
export const POWER_TYPES = ['magnet','sneakers','jetpack','double','shield'];
export const MISSIONS = [{key:'distance',goal:500,label:'Corra 500 metros'}, {key:'coins',goal:40,label:'Colete 40 macarronadas'}, {key:'jumps',goal:12,label:'Faça 12 saltos'}];
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const laneToX = lane => (clamp(lane,0,2)-1)*2.45;
export const scoreFor = s => Math.floor(s.points+s.coins*25);
export function makeRng(seed=1337){let n=seed>>>0;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
const depth = o => o.depth || OBSTACLE_DEPTH[o.type] || 1;
const overlapsX = (s,o) => Math.abs(laneToX(s.lane)-laneToX(o.lane)) < OBSTACLE_WIDTH/2+PLAYER_RADIUS;
function overlapsZ(o,margin=PLAYER_RADIUS){return Math.min(o.prevZ??o.z,o.z)<=depth(o)/2+margin && Math.max(o.prevZ??o.z,o.z)>=-depth(o)/2-margin;}
export function isCollision(s,o){
  if(!o || o.type==='ramp' || s.jetpackTime>0 || !overlapsX(s,o) || !overlapsZ(o))return false;
  const rule=COLLISION[o.type];if(!rule)return false;
  if(rule.minY!==undefined)return s.y<rule.minY-.04;
  const top=s.y+(s.sliding?SLIDING_HEIGHT:PLAYER_HEIGHT);
  return top>1.27 && s.y<1.87;
}
export function isPatternSafe(p,type){return !!p && Number.isInteger(p.safeLane) && p.safeLane>=0 && p.safeLane<=2 && p.items.length>0 && p.items.length<3 && new Set(p.items.map(o=>o.lane)).size===p.items.length && p.items.every(o=>o.type===type&&o.lane!==p.safeLane);}
export function createPattern(index,elapsed=0,rng=Math.random){
  const safeLane=Math.floor(rng()*3),type=elapsed<TUTORIAL_SECONDS?'jump':['train','jump','slide','train','jump','slide'][index%6];
  const choices=[0,1,2].filter(l=>l!==safeLane),lanes=[choices[Math.floor(rng()*2)]];
  if(index>3&&rng()>.5)lanes.push(choices.find(l=>l!==lanes[0]));
  return {index,type,safeLane,items:lanes.map(lane=>({type,lane}))};
}
export function createInitialState(){return {
  status:'menu',scenario:null,lane:1,targetLane:1,y:0,vy:0,grounded:true,surface:0,coyote:.1,jumpBuffer:0,
  jumpTime:0,jumpDuration:.875,slideTime:0,sliding:false,speed:14,distance:0,points:0,coins:0,coinProgress:0,combo:0,comboTime:0,
  lives:3,invulnerable:0,shieldTime:0,magnetTime:0,sneakersTime:0,jetpackTime:0,doubleTime:0,boardTime:0,boards:2,
  elapsed:0,spawnTimer:1,nextPattern:0,nextPowerup:8,lastPowerup:0,rng:Math.random,obstacles:[],collectibles:[],powerups:[],events:[],
  jumps:0,slides:0,nearMisses:0,completed:[],multiplier:1,lastInput:null
};}
function event(s,type,x=laneToX(s.lane)){s.events.push({type,x,z:0});}
function jump(s){s.vy=s.sneakersTime>0?14:JUMP_SPEED;s.grounded=false;s.coyote=0;s.jumpBuffer=0;s.slideTime=0;s.sliding=false;s.jumpTime=.875;s.jumps++;event(s,'jump');}
export function queueAction(s,a){
  if(s.status!=='playing')return s;s.lastInput=a;
  if(a==='left')s.targetLane=Math.max(0,s.targetLane-1);
  if(a==='right')s.targetLane=Math.min(2,s.targetLane+1);
  if(a==='jump'&&s.jetpackTime<=0){if(s.grounded||s.coyote>0)jump(s);else s.jumpBuffer=.18;}
  if(a==='slide'&&s.jetpackTime<=0){s.vy=Math.min(s.vy,-19);s.slideTime=.85;s.sliding=true;s.jumpBuffer=0;s.slides++;event(s,'slide');}
  if(a==='board'&&s.boardTime<=0&&s.boards>0&&s.jetpackTime<=0){s.boards--;s.boardTime=25;event(s,'board');}
  return s;
}
export function activatePower(s,type){
  const field=type+'Time';if(!POWER_TYPES.includes(type))return;
  s[field]=type==='jetpack'?9:12;
  if(type==='jetpack'){s.slideTime=0;s.sliding=false;s.vy=0;s.grounded=false;}
  event(s,type);
}
function damage(s){
  if(s.invulnerable>0||s.status!=='playing')return false;
  if(s.boardTime>0){s.boardTime=0;s.invulnerable=2;event(s,'board-break');return true;}
  if(s.shieldTime>0){s.shieldTime=0;s.invulnerable=1.8;event(s,'shield-break');return true;}
  s.lives--;s.invulnerable=1.8;s.combo=0;s.comboTime=0;event(s,'life');
  if(s.lives<=0)s.status='gameover';return true;
}
function addCoins(s,lane,start,count,height=1.1,arc=false){
  for(let i=0;i<count;i++)s.collectibles.push({id:`c${s.nextPattern}-${s.elapsed}-${lane}-${i}`,lane,z:start-i*2,prevZ:start-i*2,y:height+(arc?Math.sin(i/(count-1)*Math.PI)*1.8:0),value:1});
}
function spawn(s){
  const p=createPattern(s.nextPattern++,s.elapsed,s.rng);
  for(const [i,item] of p.items.entries()){
    const o={...item,id:`o${s.nextPattern}-${i}`,z:-78,prevZ:-78,hit:false};
    if(item.type==='train'){
      // A ramp touches the near end of the stationary train. The free lane stays open.
      if(s.nextPattern%2===0){s.obstacles.push({id:o.id+'r',type:'ramp',lane:o.lane,z:-69,prevZ:-69});addCoins(s,o.lane,-78,5,TRAIN_HEIGHT+1.1);}
      else if(s.elapsed>35){o.moving=true;}
    }
    s.obstacles.push(o);
    if(item.type==='jump')addCoins(s,item.lane,-73,6,1.1,true);
  }
  addCoins(s,p.safeLane,-68,8,s.jetpackTime>2?8.2:1.1);
  s.spawnTimer=Math.max(1.65,2.8-s.elapsed/160);
}
function surfaceAt(s){
  let floor=0;
  for(const o of s.obstacles){
    if(Math.abs(laneToX(s.lane)-laneToX(o.lane))>.88)continue;
    if(o.type==='ramp'&&Math.abs(o.z)<=3.2){const h=clamp((o.z+3)/6,0,1)*TRAIN_HEIGHT;if(s.y>=h-.35)floor=Math.max(floor,h);}
    if((o.type==='train'||o.type==='dodge')&&Math.abs(o.z)<=depth(o)/2+PLAYER_RADIUS&&s.y>=TRAIN_HEIGHT-.25)floor=Math.max(floor,TRAIN_HEIGHT);
  }return floor;
}
export function createScenario(type){
  if(!['jump','slide','dodge','coin','ramp','board',...POWER_TYPES].includes(type))return null;
  const s=createInitialState();s.scenario=type;s.status='playing';
  if(['jump','slide','dodge','board'].includes(type))s.obstacles.push({id:'qa-1',type:type==='board'?'dodge':type,lane:1,z:-30,prevZ:-30});
  if(type==='ramp'){s.obstacles.push({id:'qa-r',type:'ramp',lane:1,z:-20,prevZ:-20},{id:'qa-t',type:'train',lane:1,z:-29,prevZ:-29});addCoins(s,1,-24,5,3.75);}
  if(type==='coin')addCoins(s,1,-.2,2);
  if(POWER_TYPES.includes(type))s.powerups.push({id:'qa-p',type,lane:1,z:-20,prevZ:-20});
  return s;
}
export function step(s,input={},dt=1/60){
  if(s.status!=='playing')return s;const d=clamp(dt,0,.05);
  for(const a of [].concat(input.actions||[]))queueAction(s,a);
  s.elapsed+=d;s.targetLane=clamp(s.targetLane,0,2);s.lane+=(s.targetLane-s.lane)*(1-Math.exp(-18*d));
  s.speed=Math.min(MAX_SPEED,14+s.elapsed*.075);s.distance+=s.speed*d;
  s.points+=s.speed*d*s.multiplier*(s.doubleTime>0?2:1);
  for(const key of ['invulnerable','shieldTime','magnetTime','sneakersTime','jetpackTime','doubleTime','boardTime','comboTime','jumpBuffer','slideTime','jumpTime'])s[key]=Math.max(0,s[key]-d);
  if(!s.comboTime)s.combo=0;s.sliding=s.slideTime>0;
  for(const o of s.obstacles){o.prevZ=o.z;o.z+=(s.speed+(o.moving?8:0))*d;}
  const oldY=s.y;s.surface=surfaceAt(s);
  if(s.jetpackTime>0){s.y+=(7.1-s.y)*(1-Math.exp(-5*d));s.vy=0;s.grounded=false;s.invulnerable=Math.max(s.invulnerable,1.2);}
  else{
    if(s.grounded&&s.surface>=s.y-.08){s.y=s.surface;s.vy=0;}else{s.grounded=false;s.vy-=GRAVITY*d;s.y+=s.vy*d;}
    if(s.y<=s.surface&&s.vy<=0){s.y=s.surface;s.vy=0;if(!s.grounded&&oldY>s.surface+.05)event(s,'land');s.grounded=true;s.jumpTime=0;}
    s.coyote=s.grounded?.1:Math.max(0,s.coyote-d);
    if(s.grounded&&s.jumpBuffer>0)jump(s);
  }
  s.spawnTimer-=d;if(s.spawnTimer<=0&&!s.scenario)spawn(s);
  if(s.elapsed>=s.nextPowerup&&!s.scenario){const type=POWER_TYPES[s.lastPowerup++%POWER_TYPES.length];const open=[0,1,2].filter(lane=>!s.obstacles.some(o=>o.lane===lane&&Math.abs(o.z+55)<depth(o)/2+8));if(open.length)s.powerups.push({id:`p${s.nextPowerup}`,type,lane:open[Math.floor(s.rng()*open.length)],z:-55,prevZ:-55,y:1.25});s.nextPowerup+=13;}
  for(const o of s.obstacles){
    if(!o.hit&&isCollision(s,o)&&damage(s))o.hit=true;
    if(!o.passed&&o.prevZ<=depth(o)/2+.5&&o.z>depth(o)/2+.5){o.passed=true;if(!o.hit&&o.type!=='ramp'&&overlapsX(s,o)){s.nearMisses++;s.points+=50*s.multiplier;event(s,'dodge');}}
  }
  s.obstacles=s.obstacles.filter(o=>o.z<depth(o)/2+10);
  for(const c of s.collectibles){
    c.prevZ=c.z;c.z+=s.speed*d;c.y??=1.1;
    if((s.magnetTime>0||s.jetpackTime>0)&&c.z>-18&&c.z<2){c.lane+=(s.lane-c.lane)*(1-Math.exp(-10*d));c.y+=(s.y+1-c.y)*(1-Math.exp(-10*d));c.z=Math.min(c.z+20*d,.1);}
    if(Math.abs(c.z)<1.15&&Math.abs(laneToX(c.lane)-laneToX(s.lane))<.85&&Math.abs(c.y-(s.y+1.1))<1.25){c.collected=true;s.coins+=c.value||1;s.coinProgress++;s.combo++;s.comboTime=3.5;event(s,'coin');}
  }
  s.collectibles=s.collectibles.filter(c=>!c.collected&&c.z<8);
  for(const p of s.powerups){p.prevZ=p.z;p.z+=s.speed*d;if(Math.abs(p.z)<1.3&&Math.abs(laneToX(p.lane)-laneToX(s.lane))<.85&&Math.abs((p.y||1.25)-(s.y+1))<1.8){p.collected=true;activatePower(s,p.type);}}
  s.powerups=s.powerups.filter(p=>!p.collected&&p.z<8);
  for(const m of MISSIONS)if(!s.completed.includes(m.key)&&s[m.key]>=m.goal){s.completed.push(m.key);s.multiplier++;s.boards++;s.points+=500;event(s,'mission');}
  return s;
}
export function snapshot(s){return {state:s.status,lane:Math.round(s.lane*100)/100,y:Math.round(s.y*100)/100,vy:Math.round(s.vy*100)/100,grounded:s.grounded,sliding:s.sliding,lives:s.lives,distance:Math.floor(s.distance),coins:s.coins,speed:Math.round(s.speed*10)/10,boards:s.boards,jumps:s.jumps,lastInput:s.lastInput,completed:s.completed,activeObstacles:s.obstacles.map(o=>({type:o.type,lane:o.lane,z:Math.round(o.z*100)/100})),powerups:Object.fromEntries(['shield','magnet','sneakers','jetpack','double','board'].map(k=>[k,Math.ceil(s[k+'Time'])]))};}
