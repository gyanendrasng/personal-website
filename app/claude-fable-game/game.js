import * as THREE from 'three';
import posthog from 'posthog-js';

/* ============================================================
   BLADEFALL — game module.
   initGame() boots the game into the already-rendered DOM
   (see page.js) and returns a cleanup function for unmount.
============================================================ */
export function initGame() {

/* ---- lifecycle plumbing (React mount/unmount safety) ---- */
const disposed = { v: false };
const listeners = [];
const on = (t, e, f, o) => { t.addEventListener(e, f, o); listeners.push([t, e, f]); };
const timeouts = new Set();
const sto = (fn, ms) => { const id = setTimeout(() => { timeouts.delete(id); if (!disposed.v) fn(); }, ms); timeouts.add(id); return id; };
let rafId = 0;

/* ============================================================
   UTIL
============================================================ */
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function angleLerp(a,b,t){let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return a+d*t;}
const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const el=id=>document.getElementById(id);

/* ============================================================
   AUDIO — fully procedural WebAudio (no files)
============================================================ */
const AudioSys = {
  ctx:null, master:null, sfxBus:null, musicBus:null, noise:null, muted:false,
  init(){
    if(this.ctx) return;
    this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value=.6; this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value=.9; this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value=.3; this.musicBus.connect(this.master);
    const len=this.ctx.sampleRate, buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    this.noise=buf;
  },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  toggleMute(){ this.muted=!this.muted; if(this.master) this.master.gain.value=this.muted?0:.6;
    el('mute-ind').textContent=this.muted?'MUTED':''; },
  env(t0,a,d,peak=1){ const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(.001,t0+a+d); return g; },
  osc(type,f0,f1,t0,dur){ const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t0);
    if(f1!==null) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t0+dur); o.start(t0); o.stop(t0+dur+.05); return o; },
  noiseSrc(t0,dur){ const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.loop=true; s.start(t0); s.stop(t0+dur+.05); return s; },
  // ---- SFX ----
  swing(p=1){ if(!this.ctx)return; const t=this.ctx.currentTime, n=this.noiseSrc(t,.14);
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=2.2;
    f.frequency.setValueAtTime(2600*p,t); f.frequency.exponentialRampToValueAtTime(420,t+.13);
    const g=this.env(t,.01,.12,.4); n.connect(f).connect(g).connect(this.sfxBus); },
  hit(p=1,heavy=false){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('sine',heavy?130:170*p,45,t,.14); const g1=this.env(t,.004,heavy?.22:.13,heavy?.95:.7);
    o.connect(g1).connect(this.sfxBus);
    const n=this.noiseSrc(t,.06); const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1400;
    const g2=this.env(t,.002,.055,.45); n.connect(f).connect(g2).connect(this.sfxBus); },
  hurt(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('sawtooth',220,70,t,.25); const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
    const g=this.env(t,.005,.24,.55); o.connect(f).connect(g).connect(this.sfxBus);
    const o2=this.osc('sine',110,40,t,.25); const g2=this.env(t,.005,.24,.6); o2.connect(g2).connect(this.sfxBus); },
  dodge(){ if(!this.ctx)return; const t=this.ctx.currentTime; const n=this.noiseSrc(t,.22);
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.4;
    f.frequency.setValueAtTime(500,t); f.frequency.exponentialRampToValueAtTime(2400,t+.2);
    const g=this.env(t,.02,.19,.28); n.connect(f).connect(g).connect(this.sfxBus); },
  shoot(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('square',880,160,t,.18); const g=this.env(t,.004,.16,.22); o.connect(g).connect(this.sfxBus); },
  slam(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('sine',95,28,t,.5); const g=this.env(t,.004,.48,1.1); o.connect(g).connect(this.sfxBus);
    const n=this.noiseSrc(t,.3); const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=420;
    const g2=this.env(t,.004,.28,.7); n.connect(f).connect(g2).connect(this.sfxBus); },
  die(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('sawtooth',300,55,t,.4); const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1100;
    const g=this.env(t,.005,.38,.4); o.connect(f).connect(g).connect(this.sfxBus); },
  pickup(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    [660,990].forEach((fr,i)=>{ const o=this.osc('sine',fr,fr,t+i*.08,.16); const g=this.env(t+i*.08,.01,.15,.35);
      o.connect(g).connect(this.sfxBus); }); },
  roar(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    [60,63,90].forEach(fr=>{ const o=this.osc('sawtooth',fr,fr*0.7,t,.9);
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(700,t);
      f.frequency.exponentialRampToValueAtTime(150,t+.85);
      const g=this.env(t,.06,.8,.4); o.connect(f).connect(g).connect(this.sfxBus); }); },
  jingle(win=false){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const seq=win?[523,659,784,1047,1319]:[523,659,784,1047];
    seq.forEach((fr,i)=>{ const o=this.osc('triangle',fr,fr,t+i*.12,.3); const g=this.env(t+i*.12,.01,.28,.35);
      o.connect(g).connect(this.sfxBus); }); },
  sad(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    [392,330,262,196].forEach((fr,i)=>{ const o=this.osc('triangle',fr,fr*.99,t+i*.3,.5);
      const g=this.env(t+i*.3,.02,.45,.3); o.connect(g).connect(this.sfxBus); }); },
  ui(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    const o=this.osc('sine',700,900,t,.08); const g=this.env(t,.005,.07,.2); o.connect(g).connect(this.sfxBus); },
  waveHorn(){ if(!this.ctx)return; const t=this.ctx.currentTime;
    [196,247].forEach(fr=>{ const o=this.osc('sawtooth',fr,fr,t,.5);
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
      const g=this.env(t,.05,.45,.18); o.connect(f).connect(g).connect(this.sfxBus); }); },
};

/* ---- music: procedural dark pulse loop ---- */
const Music = {
  playing:false, nextT:0, step:0, profile:null, droneNodes:[],
  profiles:{
    arena:{bpm:112, notes:[45,45,48,43], drone:55, hatEvery:2, kickEvery:4},
    boss:{bpm:138, notes:[41,41,44,40], drone:41, hatEvery:1, kickEvery:2},
  },
  midi(n){ return 440*Math.pow(2,(n-69)/12); },
  start(name){
    if(!AudioSys.ctx) return;
    this.stopDrone();
    this.profile=this.profiles[name]; this.playing=true;
    this.step=0; this.nextT=AudioSys.ctx.currentTime+.1;
    // drone pad
    const t=AudioSys.ctx.currentTime;
    const f=AudioSys.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=320; f.Q.value=.8;
    const g=AudioSys.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.10,t+2);
    f.connect(g).connect(AudioSys.musicBus);
    [0,-0.07,12.05].forEach(det=>{
      const o=AudioSys.ctx.createOscillator(); o.type='sawtooth';
      o.frequency.value=this.midi(this.profile.drone+det); o.start(t); o.connect(f);
      this.droneNodes.push(o);
    });
    this.droneNodes.push(g);
  },
  stopDrone(){
    this.droneNodes.forEach(n=>{ try{ if(n.stop)n.stop(); if(n.gain)n.gain.value=0; n.disconnect(); }catch(e){} });
    this.droneNodes=[];
  },
  stop(){ this.playing=false; this.stopDrone(); },
  tick(){
    if(!this.playing||!AudioSys.ctx) return;
    const ctx=AudioSys.ctx, spb=60/this.profile.bpm/2; // 8th notes
    while(this.nextT < ctx.currentTime+.25){
      const s=this.step, t=this.nextT, bar=Math.floor(s/8), p=this.profile;
      if(s%p.kickEvery===0){ // kick
        const o=AudioSys.osc('sine',150,40,t,.16); const g=AudioSys.env(t,.002,.15,.85);
        o.connect(g); g.connect(this.gainTo()); }
      if(s%8===0||s%8===3||s%8===6){ // bass
        const note=p.notes[bar%p.notes.length];
        const o=AudioSys.osc('triangle',this.midi(note),this.midi(note),t,spb*.9);
        const g=AudioSys.env(t,.01,spb*.85,.5); o.connect(g); g.connect(this.gainTo()); }
      if(s%p.hatEvery===1||p.hatEvery===1){ // hat
        const n=AudioSys.noiseSrc(t,.04); const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7000;
        const g=AudioSys.env(t,.001,.035,.12); n.connect(f).connect(g); g.connect(this.gainTo()); }
      this.nextT+=spb; this.step++;
    }
  },
  gainTo(){ return AudioSys.musicBus; },
};
const musicIv=setInterval(()=>Music.tick(),60);

/* ============================================================
   RENDERER / SCENE
============================================================ */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
el('app').appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,1,200);
const CAM_OFF=V3(0,21,11.5);
camera.position.copy(CAM_OFF); camera.lookAt(0,0,0);

const hemi=new THREE.HemisphereLight(0x8899ff,0x202028,.85); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffeedd,1.6);
sun.position.set(10,22,8); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;
sun.shadow.camera.far=60; sun.shadow.bias=-0.0008;
scene.add(sun);

on(window,'resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* ============================================================
   ARENA
============================================================ */
const ARENA_R=16.5;
let arenaGroup=null, props=[]; // props: {x,z,r}
const THEMES=[
  {name:'THE PIT', flavor:'Prove your worth', floor:0x3a3330, accent:0xff9d4d, fog:0x14110d, sky:0x6a5c4a, wall:0x2a2522},
  {name:'FROSTMARCH BASTION', flavor:'The cold bites back', floor:0x2e3a46, accent:0x6ee7ff, fog:0x0d1318, sky:0x7a96b8, wall:0x222d38},
  {name:'OBSIDIAN THRONE', flavor:'The Warlord awaits', floor:0x2b2230, accent:0xff4d5e, fog:0x120a12, sky:0x8a5470, wall:0x1e1722},
];
function buildArena(theme){
  if(arenaGroup){ scene.remove(arenaGroup); arenaGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();}); }
  props=[];
  arenaGroup=new THREE.Group();
  scene.background=new THREE.Color(theme.fog);
  scene.fog=new THREE.Fog(theme.fog,30,70);
  hemi.color.set(theme.sky);
  // floor
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R+1.2,ARENA_R+1.2,1,64),
    new THREE.MeshStandardMaterial({color:theme.floor,roughness:.92}));
  floor.position.y=-.5; floor.receiveShadow=true; arenaGroup.add(floor);
  // inner detail ring
  const ring=new THREE.Mesh(new THREE.RingGeometry(ARENA_R-1.1,ARENA_R-.85,72),
    new THREE.MeshBasicMaterial({color:theme.accent,transparent:true,opacity:.4,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.02; arenaGroup.add(ring);
  const ring2=new THREE.Mesh(new THREE.RingGeometry(5.9,6.05,64),
    new THREE.MeshBasicMaterial({color:theme.accent,transparent:true,opacity:.14,side:THREE.DoubleSide}));
  ring2.rotation.x=-Math.PI/2; ring2.position.y=.02; arenaGroup.add(ring2);
  // outer wall ring
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R+1.8,ARENA_R+2.2,2.4,64,1,true),
    new THREE.MeshStandardMaterial({color:theme.wall,roughness:1,side:THREE.DoubleSide}));
  wall.position.y=1.2; arenaGroup.add(wall);
  // pillars
  const pillarMat=new THREE.MeshStandardMaterial({color:theme.wall,roughness:.85});
  const glowMat=new THREE.MeshStandardMaterial({color:theme.accent,emissive:theme.accent,emissiveIntensity:1.4});
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+Math.PI/6, r=ARENA_R+.4;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,rand(3.4,4.6),8),pillarMat);
    p.position.set(Math.cos(a)*r,1.8,Math.sin(a)*r); p.castShadow=true; arenaGroup.add(p);
    const torch=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),glowMat);
    torch.position.set(Math.cos(a)*r,p.position.y+2.1,Math.sin(a)*r); arenaGroup.add(torch);
  }
  // interior obstacles (2 broken pillars)
  for(let i=0;i<2;i++){
    const a=rand(0,Math.PI*2), r=rand(6.5,9.5);
    const x=Math.cos(a)*r, z=Math.sin(a)*r;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.7,.85,rand(1.1,2.0),8),pillarMat);
    p.position.set(x,.7,z); p.rotation.y=rand(0,3); p.castShadow=true; p.receiveShadow=true; arenaGroup.add(p);
    props.push({x,z,r:1.0});
  }
  // scattered rubble
  const rubbleMat=new THREE.MeshStandardMaterial({color:theme.floor,roughness:1});
  for(let i=0;i<14;i++){
    const a=rand(0,Math.PI*2), r=rand(3,ARENA_R-1);
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.1,.3)),rubbleMat);
    rock.position.set(Math.cos(a)*r,.08,Math.sin(a)*r); rock.rotation.set(rand(0,3),rand(0,3),rand(0,3));
    rock.castShadow=true; arenaGroup.add(rock);
  }
  scene.add(arenaGroup);
}
function constrainToArena(pos,radius){
  const d=Math.hypot(pos.x,pos.z);
  if(d>ARENA_R-radius){ const s=(ARENA_R-radius)/d; pos.x*=s; pos.z*=s; }
  for(const p of props){
    const dx=pos.x-p.x,dz=pos.z-p.z,dd=Math.hypot(dx,dz),min=p.r+radius;
    if(dd<min&&dd>0.0001){ pos.x=p.x+dx/dd*min; pos.z=p.z+dz/dd*min; }
  }
}

/* ============================================================
   CHARACTER BUILDER (procedural humanoids)
============================================================ */
function buildHumanoid(opt){
  const {body=0x4d6fff, trim=0x222633, eye=0x6ee7ff, scale=1, sword=true, swordColor=0xcfd6e6}=opt;
  const root=new THREE.Group();
  const mats=[];
  const M=c=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.1}); mats.push(m); return m;};
  const bodyMat=M(body), trimMat=M(trim);
  const mk=(geo,mat,x,y,z,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  // torso + hips
  mk(new THREE.BoxGeometry(.72,.78,.44),bodyMat,0,1.18,0);
  mk(new THREE.BoxGeometry(.56,.3,.4),trimMat,0,.72,0);
  // head
  const head=mk(new THREE.SphereGeometry(.27,12,10),M(0xd9c2a8),0,1.83,0);
  mk(new THREE.BoxGeometry(.6,.16,.6),trimMat,0,1.98,0); // helm brim
  // eyes (emissive)
  const eyeMat=new THREE.MeshStandardMaterial({color:eye,emissive:eye,emissiveIntensity:2.2}); mats.push(eyeMat);
  mk(new THREE.SphereGeometry(.05,6,6),eyeMat,-.1,1.86,.23);
  mk(new THREE.SphereGeometry(.05,6,6),eyeMat,.1,1.86,.23);
  // legs (pivots at hip)
  const legL=new THREE.Group(), legR=new THREE.Group();
  legL.position.set(-.18,.62,0); legR.position.set(.18,.62,0);
  mk(new THREE.BoxGeometry(.22,.62,.26),trimMat,0,-.31,0,legL);
  mk(new THREE.BoxGeometry(.22,.62,.26),trimMat,0,-.31,0,legR);
  root.add(legL,legR);
  // arms (pivots at shoulder)
  const armL=new THREE.Group(), armR=new THREE.Group();
  armL.position.set(-.46,1.5,0); armR.position.set(.46,1.5,0);
  mk(new THREE.BoxGeometry(.18,.6,.22),bodyMat,0,-.3,0,armL);
  mk(new THREE.BoxGeometry(.18,.6,.22),bodyMat,0,-.3,0,armR);
  root.add(armL,armR);
  let blade=null;
  if(sword){
    const sw=new THREE.Group(); sw.position.set(0,-.58,.06);
    const bladeMat=new THREE.MeshStandardMaterial({color:swordColor,roughness:.25,metalness:.85,emissive:swordColor,emissiveIntensity:.08});
    mats.push(bladeMat);
    blade=new THREE.Mesh(new THREE.BoxGeometry(.07,.12,1.25),bladeMat); blade.position.z=.72; blade.castShadow=true;
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.3,.08,.1),trimMat); guard.position.z=.12;
    sw.add(blade,guard); armR.add(sw);
  }
  root.scale.setScalar(scale);
  return {root,head,legL,legR,armL,armR,mats,blade};
}

/* ============================================================
   FX: particles, shockwaves, slash arcs, floating text
============================================================ */
const particles=[];
const particleGeo=new THREE.BoxGeometry(.13,.13,.13);
const PARTICLE_POOL=160;
for(let i=0;i<PARTICLE_POOL;i++){
  const m=new THREE.Mesh(particleGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));
  m.visible=false; scene.add(m);
  particles.push({m,vel:V3(),life:0,max:1});
}
function burst(pos,color,count=10,speed=5,up=4,size=1){
  let made=0;
  for(const p of particles){
    if(p.life>0) continue;
    p.life=p.max=rand(.3,.7); p.m.visible=true;
    p.m.position.copy(pos); p.m.position.y+=rand(.4,1.2);
    p.m.material.color.set(color); p.m.material.opacity=1;
    p.m.scale.setScalar(rand(.6,1.6)*size);
    const a=rand(0,Math.PI*2);
    p.vel.set(Math.cos(a)*rand(1,speed),rand(1,up),Math.sin(a)*rand(1,speed));
    if(++made>=count) break;
  }
}
function updateParticles(dt){
  for(const p of particles){
    if(p.life<=0) continue;
    p.life-=dt;
    if(p.life<=0){ p.m.visible=false; continue; }
    p.vel.y-=14*dt;
    p.m.position.addScaledVector(p.vel,dt);
    if(p.m.position.y<.06){ p.m.position.y=.06; p.vel.y*=-.4; p.vel.x*=.8; p.vel.z*=.8; }
    p.m.material.opacity=p.life/p.max;
    p.m.rotation.x+=dt*6; p.m.rotation.z+=dt*5;
  }
}
// shockwave rings
const waves=[];
function shockwave(pos,color,maxR=3.4,dur=.45){
  const m=new THREE.Mesh(new THREE.RingGeometry(.86,1,48),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(pos.x,.06,pos.z);
  scene.add(m); waves.push({m,t:0,dur,maxR});
}
function updateWaves(dt){
  for(let i=waves.length-1;i>=0;i--){
    const w=waves[i]; w.t+=dt;
    const k=w.t/w.dur;
    if(k>=1){ scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i,1); continue; }
    w.m.scale.setScalar(lerp(.4,w.maxR,Math.pow(k,.6)));
    w.m.material.opacity=.9*(1-k);
  }
}
// slash arcs
const slashes=[];
function slashArc(pos,heading,range,arc,color=0xbfe9ff){
  const g=new THREE.RingGeometry(range*.35,range,28,1,heading-Math.PI/2-arc/2,arc);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(pos.x,.85,pos.z);
  scene.add(m); slashes.push({m,t:0,dur:.16});
}
function updateSlashes(dt){
  for(let i=slashes.length-1;i>=0;i--){
    const s=slashes[i]; s.t+=dt;
    if(s.t>=s.dur){ scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); slashes.splice(i,1); continue; }
    s.m.material.opacity=.75*(1-s.t/s.dur);
    s.m.position.y+=dt*.6;
  }
}
// telegraph decals (danger zones)
const decals=[];
function dangerZone(x,z,radius,dur,color=0xff3344){
  const m=new THREE.Mesh(new THREE.CircleGeometry(radius,40),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,.05,z);
  const edge=new THREE.Mesh(new THREE.RingGeometry(radius*.93,radius,40),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
  edge.rotation.x=-Math.PI/2; edge.position.set(x,.06,z);
  scene.add(m,edge);
  const d={m,edge,t:0,dur};
  decals.push(d); return d;
}
function removeDecal(d){
  const i=decals.indexOf(d); if(i<0) return;
  scene.remove(d.m,d.edge); d.m.geometry.dispose(); d.m.material.dispose();
  d.edge.geometry.dispose(); d.edge.material.dispose(); decals.splice(i,1);
}
function updateDecals(dt){
  for(let i=decals.length-1;i>=0;i--){
    const d=decals[i]; d.t+=dt;
    if(d.t>=d.dur){ removeDecal(d); continue; }
    const pulse=.5+.5*Math.sin(d.t*18);
    d.m.material.opacity=.12+.14*pulse*(d.t/d.dur);
    d.edge.material.opacity=.4+.5*pulse;
  }
}
// floating damage text
const barsDiv=el('bars');
const tmpV=new THREE.Vector3();
function worldToScreen(x,y,z){
  tmpV.set(x,y,z).project(camera);
  return [( tmpV.x*.5+.5)*innerWidth, (-tmpV.y*.5+.5)*innerHeight, tmpV.z<1];
}
function dmgText(pos,txt,cls=''){
  const [sx,sy,vis]=worldToScreen(pos.x,pos.y+2.1,pos.z);
  if(!vis) return;
  const d=document.createElement('div');
  d.className='dmg '+cls; d.textContent=txt;
  d.style.left=(sx+rand(-14,14))+'px'; d.style.top=(sy+rand(-8,8))+'px';
  document.body.appendChild(d);
  sto(()=>d.remove(),820);
}

/* ============================================================
   GAME STATE / FEEL
============================================================ */
const G={
  state:'loading', // loading,title,levelintro,playing,paused,dead,win
  time:0, level:0, wave:0, score:0, bestCombo:0,
  combo:0, comboTimer:0,
  hitStop:0, shake:0,
  enemies:[], projectiles:[], pickups:[],
  pendingSpawns:0,
};
function hitStop(s){ G.hitStop=Math.max(G.hitStop,s); }
function addShake(s){ G.shake=Math.max(G.shake,s); }
function addScore(n){ G.score+=Math.round(n*(1+G.combo*.08)); el('score').textContent=G.score; }
function bumpCombo(){
  G.combo++; G.comboTimer=2.6;
  G.bestCombo=Math.max(G.bestCombo,G.combo);
  if(G.combo>=2){ const c=el('combo'); c.textContent=G.combo+'× COMBO'; c.classList.add('show');
    c.style.transform=`scale(${1+Math.min(G.combo,12)*.03})`;
    requestAnimationFrame(()=>c.style.transform='scale(1)');
  }
}

/* attack coordination: only N enemies may attack at once */
const Director={
  slots:2, holders:new Set(), lastGrant:-99,
  request(e){
    if(this.holders.has(e)) return true;
    if(this.holders.size<this.slots && G.time-this.lastGrant>.45){
      this.holders.add(e); this.lastGrant=G.time; return true;
    }
    return false;
  },
  release(e){ this.holders.delete(e); },
  reset(){ this.holders.clear(); this.lastGrant=-99; },
};

/* ============================================================
   PLAYER
============================================================ */
const ATTACKS=[
  {windup:.10,active:.07,recover:.22,dmg:10,range:2.3,arc:1.9,knock:5, lunge:7, shake:.12,stop:.045},
  {windup:.09,active:.07,recover:.24,dmg:12,range:2.4,arc:2.1,knock:6, lunge:8, shake:.14,stop:.05},
  {windup:.13,active:.08,recover:.34,dmg:18,range:2.7,arc:2.4,knock:11,lunge:10,shake:.24,stop:.09},
];
const HEAVY={windup:.34,active:.10,recover:.5,dmg:28,range:3.1,arc:2.9,knock:14,lunge:5,shake:.32,stop:.11};

const player={
  hp:100,maxHp:100,pos:V3(0,0,0),vel:V3(),heading:0,radius:.55,speed:7.2,
  state:'idle',t:0,attackIdx:0,phase:'',buffered:null,hitDone:false,
  dodgeT:0,dodgeCD:0,invuln:0,hurtFlash:0,dead:false,
  rig:null,
  reset(){
    this.hp=this.maxHp; this.pos.set(0,0,3); this.vel.set(0,0,0); this.heading=Math.PI;
    this.state='idle'; this.buffered=null; this.invuln=0; this.dodgeCD=0; this.dead=false;
    if(this.rig){ this.rig.root.visible=true; this.rig.root.rotation.x=0; this.rig.root.position.y=0; }
  },
  build(){
    this.rig=buildHumanoid({body:0x3e6cff,trim:0x1c2236,eye:0x6ee7ff,sword:true,swordColor:0xd8ecff});
    scene.add(this.rig.root);
  },
  queueAttack(kind){
    if(this.dead||G.state!=='playing') return;
    if(this.state==='idle'||this.state==='move'){ this.startAttack(kind==='heavy'?-1:0); }
    else if(this.state==='attack'||this.state==='heavy'){ this.buffered=kind; }
    else if(this.state==='dodge'&&this.dodgeT>.2){ this.buffered=kind; }
  },
  startAttack(idx){
    const heavy=idx===-1;
    this.state=heavy?'heavy':'attack';
    this.attackIdx=heavy?0:idx;
    this.t=0; this.phase='windup'; this.hitDone=false; this.buffered=null;
    // soft-lock: face nearest living enemy
    let best=null,bd=5.2;
    for(const e of G.enemies){ if(e.dead) continue;
      const d=e.pos.distanceTo(this.pos);
      if(d<bd){ bd=d; best=e; } }
    if(best) this.heading=Math.atan2(best.pos.x-this.pos.x,best.pos.z-this.pos.z);
    AudioSys.swing(heavy?.6:1+idx*.12);
  },
  startDodge(){
    if(this.dead||G.state!=='playing') return;
    if(this.dodgeCD>0||this.state==='dodge') return;
    const k=keys;
    let dx=(k.d?1:0)-(k.a?1:0), dz=(k.s?1:0)-(k.w?1:0);
    if(dx===0&&dz===0){ dx=Math.sin(this.heading); dz=Math.cos(this.heading); }
    const len=Math.hypot(dx,dz); dx/=len; dz/=len;
    this.heading=Math.atan2(dx,dz);
    this.state='dodge'; this.dodgeT=0; this.dodgeCD=.95; this.invuln=.42;
    if(this.phase) this.phase='';
    AudioSys.dodge();
    burst(this.pos,0x9fb8ff,6,3,2,.7);
  },
  doAttackHit(spec){
    const heavy=this.state==='heavy';
    slashArc(this.pos,this.heading,spec.range,spec.arc,heavy?0xffd166:0xbfe9ff);
    let landed=false;
    const fx=Math.sin(this.heading), fz=Math.cos(this.heading);
    for(const e of G.enemies){
      if(e.dead) continue;
      const dx=e.pos.x-this.pos.x, dz=e.pos.z-this.pos.z;
      const d=Math.hypot(dx,dz);
      if(d>spec.range+e.radius) continue;
      const dot=(dx*fx+dz*fz)/Math.max(d,.001);
      if(d>0.6 && dot<Math.cos(spec.arc/2)) continue;
      landed=true;
      e.takeHit(spec.dmg,this.pos,spec.knock,heavy);
    }
    if(landed){
      hitStop(spec.stop); addShake(spec.shake);
      AudioSys.hit(1+this.attackIdx*.1,heavy||this.attackIdx===2);
      bumpCombo();
    }
  },
  takeDamage(dmg,from){
    if(this.dead||this.invuln>0||G.state!=='playing') return;
    this.hp-=dmg; this.invuln=.65; this.hurtFlash=.4;
    AudioSys.hurt(); addShake(.4); hitStop(.06);
    dmgText(this.pos,'-'+dmg,'hurt');
    burst(this.pos,0xff5566,12,5,5);
    const fl=el('flash'); fl.style.opacity=.9; sto(()=>fl.style.opacity=0,120);
    // knockback
    if(from){ const dx=this.pos.x-from.x,dz=this.pos.z-from.z,d=Math.hypot(dx,dz)||1;
      this.vel.x+=dx/d*7; this.vel.z+=dz/d*7; }
    if(this.hp<=0){ this.hp=0; this.die(); }
    updateHpUI();
  },
  die(){
    this.dead=true; this.state='dead'; this.t=0;
    Music.stop(); AudioSys.sad();
    burst(this.pos,0xff4455,26,7,7,1.3);
    addShake(.5);
    sto(()=>showDeath(),1400);
  },
  update(dt){
    this.t+=dt;
    this.dodgeCD=Math.max(0,this.dodgeCD-dt);
    this.invuln=Math.max(0,this.invuln-dt);
    this.hurtFlash=Math.max(0,this.hurtFlash-dt);
    const r=this.rig;
    if(this.dead){
      r.root.rotation.x=lerp(r.root.rotation.x,-Math.PI/2,dt*5);
      r.root.position.y=lerp(r.root.position.y,.3,dt*5);
      this.vel.multiplyScalar(1-6*dt);
      this.pos.addScaledVector(this.vel,dt);
      this.syncRig(dt); return;
    }
    const k=keys;
    let ix=(k.d?1:0)-(k.a?1:0), iz=(k.s?1:0)-(k.w?1:0);
    const moving=ix!==0||iz!==0;
    if(moving){ const l=Math.hypot(ix,iz); ix/=l; iz/=l; }

    if(this.state==='dodge'){
      this.dodgeT+=dt;
      const dur=.34;
      const sp=lerp(17,8,this.dodgeT/dur);
      this.vel.x=Math.sin(this.heading)*sp; this.vel.z=Math.cos(this.heading)*sp;
      r.root.rotation.x=-(this.dodgeT/dur)*Math.PI*2;
      if(this.dodgeT>=dur){
        this.state='idle'; r.root.rotation.x=0;
        if(this.buffered){ this.startAttack(this.buffered==='heavy'?-1:0); this.buffered=null; }
      }
    }
    else if(this.state==='attack'||this.state==='heavy'){
      const heavy=this.state==='heavy';
      const spec=heavy?HEAVY:ATTACKS[this.attackIdx];
      // lunge forward during windup+active
      if(this.phase!=='recover'){
        this.vel.x+=Math.sin(this.heading)*spec.lunge*dt*6;
        this.vel.z+=Math.cos(this.heading)*spec.lunge*dt*6;
      }
      if(this.phase==='windup'&&this.t>=spec.windup){ this.phase='active'; this.t=0; this.doAttackHit(spec); }
      else if(this.phase==='active'&&this.t>=spec.active){ this.phase='recover'; this.t=0; }
      else if(this.phase==='recover'){
        const canCancel=this.t>=spec.recover*.5;
        if(canCancel&&this.buffered){
          if(this.buffered==='heavy'){ this.startAttack(-1); }
          else if(!heavy&&this.attackIdx<2){ this.startAttack(this.attackIdx+1); }
          else { this.startAttack(0); }
        }
        else if(canCancel&&moving&&!this.buffered){ this.state='idle'; this.phase=''; } // move-cancel for responsiveness
        else if(this.t>=spec.recover){ this.state='idle'; this.phase=''; }
      }
      // arm animation
      const p=this.phase, tt=this.t;
      if(p==='windup') r.armR.rotation.x=lerp(r.armR.rotation.x,-2.4,Math.min(1,tt/spec.windup)*.9);
      else if(p==='active') r.armR.rotation.x=lerp(-2.4,1.1,Math.min(1,tt/spec.active));
      else r.armR.rotation.x=lerp(r.armR.rotation.x,0,dt*10);
      this.vel.multiplyScalar(1-8*dt);
    }
    else{
      // free movement — snappy: high accel toward target velocity
      if(moving){
        const kk=Math.min(1,20*dt);
        this.vel.x+=(ix*this.speed-this.vel.x)*kk;
        this.vel.z+=(iz*this.speed-this.vel.z)*kk;
        this.heading=angleLerp(this.heading,Math.atan2(ix,iz),Math.min(1,24*dt));
        this.state='move';
      } else {
        const kk=Math.min(1,26*dt);
        this.vel.x-=this.vel.x*kk;
        this.vel.z-=this.vel.z*kk;
        this.state='idle';
      }
      // walk anim
      const sp=Math.hypot(this.vel.x,this.vel.z);
      const cyc=this.t*11;
      const amp=Math.min(1,sp/this.speed)*.55;
      r.legL.rotation.x=Math.sin(cyc)*amp; r.legR.rotation.x=-Math.sin(cyc)*amp;
      r.armL.rotation.x=-Math.sin(cyc)*amp*.7;
      r.armR.rotation.x=lerp(r.armR.rotation.x,Math.sin(cyc)*amp*.5,dt*8);
      r.root.position.y=Math.abs(Math.sin(cyc))*amp*.1;
    }
    this.pos.addScaledVector(this.vel,dt);
    constrainToArena(this.pos,this.radius);
    this.syncRig(dt);
  },
  syncRig(dt){
    const r=this.rig;
    r.root.position.x=this.pos.x; r.root.position.z=this.pos.z;
    r.root.rotation.y=this.heading;
    // invuln blink
    const blink=this.invuln>0&&Math.sin(G.time*40)>0;
    r.mats.forEach(m=>{ m.transparent=true; m.opacity=blink?.45:1; });
  },
};

/* ============================================================
   ENEMIES
============================================================ */
const ETYPES={
  grunt:{hp:32,speed:4.4,radius:.55,scale:1,body:0x99352f,trim:0x33201c,eye:0xff7a3c,score:100,sword:true,swordColor:0x99622f,
    engage:2.0,prefer:3.2,windup:.5,active:.16,recover:.75,dmg:8,range:2.2,arc:1.6,lunge:11,poise:0},
  ranger:{hp:24,speed:3.6,radius:.5,scale:.92,body:0x6a3f8f,trim:0x261a33,eye:0xc98aff,score:140,sword:false,
    prefer:9.5,windup:.7,recover:.6,dmg:11,projSpeed:11.5,shootCD:[2.0,3.2],poise:0},
  brute:{hp:100,speed:2.6,radius:.85,scale:1.55,body:0x4f5a2e,trim:0x23291a,eye:0xc3ff4d,score:320,sword:false,
    engage:2.9,prefer:2.9,windup:1.0,active:.2,recover:1.1,dmg:22,slamR:3.6,poise:5},
  boss:{hp:440,speed:3.1,radius:1.0,scale:1.9,body:0x73243a,trim:0x2b1118,eye:0xff4d5e,score:2000,sword:true,swordColor:0xff8a7a,
    engage:3.2,prefer:3.2,windup:.55,active:.16,recover:.55,dmg:14,range:3.3,arc:2.0,lunge:12,slamR:4.4,poise:8,name:'VORGATH, THE WARLORD'},
};

class Enemy{
  constructor(type,x,z,lvlScale=1){
    this.type=type; this.cfg=ETYPES[type];
    this.maxHp=Math.round(this.cfg.hp*lvlScale); this.hp=this.maxHp;
    this.dmgScale=lvlScale>1?1+(lvlScale-1)*.6:1;
    this.pos=V3(x,0,z); this.vel=V3();
    this.heading=Math.atan2(-x,-z);
    this.radius=this.cfg.radius; this.speed=this.cfg.speed*rand(.92,1.08);
    this.state='approach'; this.t=0; this.dead=false; this.deadT=0;
    this.strafeDir=Math.random()<.5?1:-1; this.strafeTimer=rand(1,2.5);
    this.shootTimer=rand(1,2); this.poise=this.cfg.poise; this.flashT=0;
    this.actionKind=null; this.decal=null; this.hitPlayer=false;
    this.phase=1; this.comboStep=0;
    this.rig=buildHumanoid({body:this.cfg.body,trim:this.cfg.trim,eye:this.cfg.eye,
      scale:this.cfg.scale,sword:this.cfg.sword,swordColor:this.cfg.swordColor});
    this.rig.root.position.set(x,0,z);
    scene.add(this.rig.root);
    // floating hp bar
    if(type!=='boss'){
      this.bar=document.createElement('div'); this.bar.className='ebar';
      this.bar.innerHTML='<i></i>'; barsDiv.appendChild(this.bar);
      this.barFill=this.bar.querySelector('i');
    }
    if(type==='boss'){
      el('bossbar').classList.add('on');
      el('boss-name').textContent=this.cfg.name;
      AudioSys.roar(); addShake(.35);
    }
  }
  takeHit(dmg,from,knock,heavy){
    if(this.dead) return;
    this.hp-=dmg;
    addScore(dmg);
    dmgText(this.pos,dmg,heavy?'big':'');
    burst(this.pos,0xffd9a0,heavy?14:8,heavy?7:5,4);
    this.flashT=.09;
    this.rig.mats.forEach(m=>{m.emissive.setHex(0xffffff);m.emissiveIntensity=.9;});
    const dx=this.pos.x-from.x,dz=this.pos.z-from.z,d=Math.hypot(dx,dz)||1;
    const resist=this.cfg.poise>0?.35:1;
    this.vel.x+=dx/d*knock*resist; this.vel.z+=dz/d*knock*resist;
    if(this.hp<=0){ this.die(); return; }
    // stagger
    if(this.cfg.poise>0){
      this.poise-=heavy?2:1;
      if(this.poise<=0){ this.poise=this.cfg.poise; this.stagger(.8); dmgText(this.pos,'BREAK','big'); }
    } else this.stagger(.32);
  }
  stagger(dur){
    if(this.dead) return;
    this.clearDecal();
    Director.release(this);
    this.state='stagger'; this.t=0; this.staggerDur=dur;
  }
  die(){
    this.dead=true; this.deadT=0;
    this.clearDecal();
    Director.release(this);
    addScore(this.cfg.score);
    AudioSys.die(); hitStop(this.type==='boss'?.25:.07); addShake(this.type==='boss'?.7:.25);
    burst(this.pos,this.cfg.eye,this.type==='boss'?40:16,8,7,1.2);
    shockwave(this.pos,this.cfg.eye,this.type==='boss'?6:2.2,.5);
    if(this.bar){ this.bar.remove(); this.bar=null; }
    if(this.type==='boss'){ el('bossbar').classList.remove('on'); Music.stop(); }
    // health drop
    if(this.type!=='boss'&&Math.random()<.24) spawnPickup(this.pos.x,this.pos.z);
  }
  clearDecal(){ if(this.decal){ removeDecal(this.decal); this.decal=null; } }
  facePlayer(dt,rate=10){
    const want=Math.atan2(player.pos.x-this.pos.x,player.pos.z-this.pos.z);
    this.heading=angleLerp(this.heading,want,1-Math.pow(.0001,dt*rate/10));
  }
  distToPlayer(){ return this.pos.distanceTo(player.pos); }
  beginWindup(kind){
    this.state='windup'; this.t=0; this.actionKind=kind; this.hitPlayer=false;
    if(kind==='slam'){
      const r=this.cfg.slamR;
      this.decal=dangerZone(this.pos.x,this.pos.z,r,this.cfg.windup*1.9);
    }
    if(kind==='shoot'){ /* purple glow telegraph */
      this.rig.mats.forEach(m=>{m.emissive.setHex(this.cfg.eye);m.emissiveIntensity=.5;});
    }
  }
  update(dt){
    this.t+=dt;
    if(this.flashT>0){ this.flashT-=dt;
      if(this.flashT<=0) this.rig.mats.forEach((m,i)=>{m.emissive.setHex(0x000000);m.emissiveIntensity=0;});
    }
    if(this.dead){
      this.deadT+=dt;
      this.rig.root.rotation.x=lerp(this.rig.root.rotation.x,-Math.PI/2,dt*6);
      const k=clamp(1-(this.deadT-.5)/.6,0,1);
      this.rig.root.scale.setScalar(this.cfg.scale*Math.max(.01,k));
      this.pos.addScaledVector(this.vel,dt); this.vel.multiplyScalar(1-5*dt);
      this.syncRig(); return this.deadT<1.2;
    }
    const dp=this.distToPlayer();
    const cfg=this.cfg;
    switch(this.state){
      case 'approach':{
        this.facePlayer(dt);
        const want=this.type==='ranger'?cfg.prefer:cfg.engage;
        if(this.type==='ranger'){
          // kite: stay at preferred range
          const dir=dp>cfg.prefer+1?1:(dp<cfg.prefer-1.5?-1:0);
          this.vel.x=lerp(this.vel.x,Math.sin(this.heading)*this.speed*dir,dt*6);
          this.vel.z=lerp(this.vel.z,Math.cos(this.heading)*this.speed*dir,dt*6);
          this.shootTimer-=dt;
          if(this.shootTimer<=0&&dp>3){ this.beginWindup('shoot'); AudioSys.swing(.5); }
          if(dir===0){ this.state='strafe'; this.t=0; }
        } else {
          if(dp>want+.4){
            this.vel.x=lerp(this.vel.x,Math.sin(this.heading)*this.speed,dt*6);
            this.vel.z=lerp(this.vel.z,Math.cos(this.heading)*this.speed,dt*6);
          } else {
            if(!player.dead&&Director.request(this)){
              this.beginWindup(this.type==='brute'?'slam':(this.type==='boss'?this.pickBossAttack(dp):'melee'));
              AudioSys.swing(.45);
            }
            else { this.state='strafe'; this.t=0; }
          }
        }
        break;
      }
      case 'strafe':{
        this.facePlayer(dt);
        this.strafeTimer-=dt;
        if(this.strafeTimer<=0){ this.strafeDir*=-1; this.strafeTimer=rand(1.2,2.6); }
        // orbit + spring to preferred radius
        const px=player.pos.x-this.pos.x, pz=player.pos.z-this.pos.z, d=Math.hypot(px,pz)||1;
        const tx=-pz/d*this.strafeDir, tz=px/d*this.strafeDir;
        const radial=(dp-cfg.prefer)*.9;
        this.vel.x=lerp(this.vel.x,(tx*this.speed*.55)+px/d*radial,dt*5);
        this.vel.z=lerp(this.vel.z,(tz*this.speed*.55)+pz/d*radial,dt*5);
        if(this.type==='ranger'){
          this.shootTimer-=dt;
          if(this.shootTimer<=0&&dp>3){ this.beginWindup('shoot'); AudioSys.swing(.5); }
        } else if(this.t>rand(.5,.9)){
          if(dp<=cfg.engage+.5&&!player.dead&&Director.request(this)){
            this.beginWindup(this.type==='brute'?'slam':(this.type==='boss'?this.pickBossAttack(dp):'melee'));
            AudioSys.swing(.45);
          } else if(this.type==='boss'&&this.phase>=2&&dp>4.5&&Math.random()<.5&&!player.dead&&Director.request(this)){
            this.beginWindup('dash'); AudioSys.swing(.4);
          } else if(dp>cfg.prefer+2.5){ this.state='approach'; }
          this.t=0;
        }
        break;
      }
      case 'windup':{
        const wind=this.actionKind==='shoot'?cfg.windup:(this.actionKind==='slam'?cfg.windup*1.9:cfg.windup);
        this.facePlayer(dt,this.actionKind==='slam'?2:6);
        this.vel.multiplyScalar(1-8*dt);
        // telegraph pose: arms raise
        const k=Math.min(1,this.t/wind);
        this.rig.armR.rotation.x=-2.6*k;
        if(this.actionKind==='slam') this.rig.armL.rotation.x=-2.6*k;
        // red tint ramp
        if(this.actionKind!=='shoot'&&this.flashT<=0){
          this.rig.mats.forEach(m=>{m.emissive.setHex(0xff2222);m.emissiveIntensity=k*.55;});
        }
        if(this.t>=wind){ this.state='attack'; this.t=0; }
        break;
      }
      case 'attack':{
        const act=this.actionKind;
        if(act==='melee'||act==='bosscombo'){
          // lunge
          this.vel.x+=Math.sin(this.heading)*cfg.lunge*dt*7;
          this.vel.z+=Math.cos(this.heading)*cfg.lunge*dt*7;
          this.rig.armR.rotation.x=lerp(-2.6,1.2,Math.min(1,this.t/cfg.active));
          if(!this.hitPlayer&&this.t>cfg.active*.3){
            const fx=Math.sin(this.heading),fz=Math.cos(this.heading);
            const dx=player.pos.x-this.pos.x,dz=player.pos.z-this.pos.z,d=Math.hypot(dx,dz);
            if(d<cfg.range+player.radius&&(dx*fx+dz*fz)/Math.max(d,.001)>Math.cos(cfg.arc/2)){
              this.hitPlayer=true;
              player.takeDamage(Math.round(cfg.dmg*this.dmgScale),this.pos);
            }
          }
          if(this.t>=cfg.active){
            if(act==='bosscombo'&&this.comboStep<2&&!player.dead){
              this.comboStep++; this.state='windup'; this.t=0; this.actionKind='bosscombo';
              this.hitPlayer=false; AudioSys.swing(.5);
            } else { this.state='recover'; this.t=0; this.comboStep=0; }
          }
        }
        else if(act==='slam'){
          if(this.t<.12){ this.rig.armR.rotation.x=this.rig.armL.rotation.x=lerp(-2.6,1.4,this.t/.12); }
          if(!this.hitPlayer&&this.t>=.1){
            this.hitPlayer=true;
            this.clearDecal();
            AudioSys.slam(); addShake(.5); hitStop(.04);
            shockwave(this.pos,0xffaa55,cfg.slamR+ .4,.5);
            burst(this.pos,0xbbaa88,18,7,6,1.2);
            if(this.distToPlayer()<cfg.slamR+player.radius*.5&&player.invuln<=0){
              player.takeDamage(Math.round(cfg.dmg*this.dmgScale),this.pos);
            }
          }
          if(this.t>=.45){ this.state='recover'; this.t=0; }
        }
        else if(act==='shoot'||act==='volley'){
          if(!this.hitPlayer){
            this.hitPlayer=true;
            AudioSys.shoot();
            this.rig.mats.forEach(m=>{m.emissive.setHex(0x000000);m.emissiveIntensity=0;});
            if(act==='volley'){
              for(let i=0;i<8;i++){
                const a=i/8*Math.PI*2;
                spawnProjectile(this,this.pos.x,this.pos.z,a,8.5,Math.round(10*this.dmgScale));
              }
            } else {
              const a=Math.atan2(player.pos.x-this.pos.x,player.pos.z-this.pos.z);
              spawnProjectile(this,this.pos.x,this.pos.z,a,cfg.projSpeed||10,Math.round(cfg.dmg*this.dmgScale));
            }
          }
          if(this.t>=.25){ this.state='recover'; this.t=0;
            this.shootTimer=rand(cfg.shootCD?cfg.shootCD[0]:2,cfg.shootCD?cfg.shootCD[1]:3); }
        }
        else if(act==='dash'){
          this.vel.x=Math.sin(this.heading)*16; this.vel.z=Math.cos(this.heading)*16;
          if(!this.hitPlayer&&this.distToPlayer()<this.radius+player.radius+.4){
            this.hitPlayer=true;
            player.takeDamage(Math.round(12*this.dmgScale),this.pos);
          }
          if(this.t>=.4){ this.state='recover'; this.t=0; this.vel.multiplyScalar(.2); }
        }
        break;
      }
      case 'recover':{
        this.vel.multiplyScalar(1-6*dt);
        this.rig.armR.rotation.x=lerp(this.rig.armR.rotation.x,0,dt*6);
        this.rig.armL.rotation.x=lerp(this.rig.armL.rotation.x,0,dt*6);
        const rec=this.type==='boss'&&this.phase>=2?cfg.recover*.7:cfg.recover;
        if(this.t>=rec){ Director.release(this); this.state=Math.random()<.55?'strafe':'approach'; this.t=0; }
        break;
      }
      case 'stagger':{
        this.vel.multiplyScalar(1-5*dt);
        this.rig.root.rotation.x=Math.sin(this.t*30)*.07*(1-this.t/this.staggerDur);
        if(this.t>=this.staggerDur){ this.rig.root.rotation.x=0; this.state='approach'; this.t=0; }
        break;
      }
    }
    // boss phase transitions
    if(this.type==='boss'){
      const frac=this.hp/this.maxHp;
      if(this.phase===1&&frac<.66){ this.phase=2; this.speed*=1.18; AudioSys.roar(); addShake(.4);
        showBanner('','THE WARLORD RAGES',1.4); burst(this.pos,0xff4d5e,24,8,7,1.3); }
      if(this.phase===2&&frac<.33){ this.phase=3; this.speed*=1.15; AudioSys.roar(); addShake(.5);
        showBanner('','NOTHING LEFT TO LOSE',1.4); burst(this.pos,0xff4d5e,30,9,8,1.4);
        // summon adds once
        if(!this.summoned){ this.summoned=true;
          for(let i=0;i<2;i++){ const a=rand(0,Math.PI*2); scheduleSpawn('grunt',Math.cos(a)*9,Math.sin(a)*9,1); } }
      }
    }
    // separation from other enemies
    for(const o of G.enemies){
      if(o===this||o.dead) continue;
      const dx=this.pos.x-o.pos.x,dz=this.pos.z-o.pos.z,d=Math.hypot(dx,dz);
      const min=this.radius+o.radius+.35;
      if(d<min&&d>.001){ const push=(min-d)*3; this.vel.x+=dx/d*push*dt*10; this.vel.z+=dz/d*push*dt*10; }
    }
    // walk anim
    const sp=Math.hypot(this.vel.x,this.vel.z);
    if(this.state!=='windup'&&this.state!=='attack'){
      const cyc=G.time*9*(this.speed/4);
      const amp=Math.min(1,sp/this.speed)*.5;
      this.rig.legL.rotation.x=Math.sin(cyc)*amp; this.rig.legR.rotation.x=-Math.sin(cyc)*amp;
    }
    this.pos.addScaledVector(this.vel,dt);
    this.vel.multiplyScalar(1-3.5*dt);
    constrainToArena(this.pos,this.radius);
    this.syncRig();
    return true;
  }
  pickBossAttack(dp){
    const r=Math.random();
    if(this.phase>=2&&dp>5&&r<.4) return 'dash';
    if(dp<3.6&&r<.35) return 'slam';
    if(this.phase>=2&&r<.25) return 'volley';
    this.comboStep=0;
    return 'bosscombo';
  }
  syncRig(){
    this.rig.root.position.x=this.pos.x; this.rig.root.position.z=this.pos.z;
    this.rig.root.rotation.y=this.heading;
    // hp bar
    if(this.bar){
      const [sx,sy,vis]=worldToScreen(this.pos.x,2.5*this.cfg.scale,this.pos.z);
      if(vis&&!this.dead){
        this.bar.style.display='block';
        this.bar.style.transform=`translate(${sx}px,${sy}px)`;
        this.barFill.style.width=clamp(this.hp/this.maxHp*100,0,100)+'%';
      } else this.bar.style.display='none';
    }
    if(this.type==='boss'&&!this.dead){
      el('boss-fill').style.width=clamp(this.hp/this.maxHp*100,0,100)+'%';
    }
  }
  destroy(){
    scene.remove(this.rig.root);
    this.rig.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    this.rig.mats.forEach(m=>m.dispose());
    if(this.bar) this.bar.remove();
    this.clearDecal();
    Director.release(this);
  }
}

/* projectiles */
const projGeo=new THREE.SphereGeometry(.22,10,8);
function spawnProjectile(owner,x,z,angle,speed,dmg){
  const mat=new THREE.MeshStandardMaterial({color:0xc98aff,emissive:0xa64dff,emissiveIntensity:2.5});
  const m=new THREE.Mesh(projGeo,mat);
  m.position.set(x,1.1,z); scene.add(m);
  G.projectiles.push({m,vx:Math.sin(angle)*speed,vz:Math.cos(angle)*speed,dmg,life:3.2});
}
function updateProjectiles(dt){
  for(let i=G.projectiles.length-1;i>=0;i--){
    const p=G.projectiles[i];
    p.life-=dt;
    p.m.position.x+=p.vx*dt; p.m.position.z+=p.vz*dt;
    p.m.rotation.y+=dt*8;
    let kill=p.life<=0;
    const px=p.m.position.x,pz=p.m.position.z;
    if(Math.hypot(px,pz)>ARENA_R+1) kill=true;
    for(const pr of props){ if(Math.hypot(px-pr.x,pz-pr.z)<pr.r+.2) kill=true; }
    if(!kill&&!player.dead&&player.invuln<=0){
      if(Math.hypot(px-player.pos.x,pz-player.pos.z)<player.radius+.3){
        player.takeDamage(p.dmg,p.m.position); kill=true;
      }
    }
    if(kill){
      burst(p.m.position,0xc98aff,5,3,2,.6);
      scene.remove(p.m); p.m.material.dispose();
      G.projectiles.splice(i,1);
    }
  }
}

/* pickups */
const pickupGeo=new THREE.OctahedronGeometry(.3);
function spawnPickup(x,z){
  const mat=new THREE.MeshStandardMaterial({color:0x7dff9b,emissive:0x2dff6b,emissiveIntensity:1.8});
  const m=new THREE.Mesh(pickupGeo,mat);
  m.position.set(x,1,z); scene.add(m);
  G.pickups.push({m,life:12,x,z});
}
function updatePickups(dt){
  for(let i=G.pickups.length-1;i>=0;i--){
    const p=G.pickups[i];
    p.life-=dt;
    p.m.rotation.y+=dt*3;
    p.m.position.y=1+Math.sin(G.time*3)*.18;
    p.m.visible=!(p.life<3&&Math.sin(G.time*14)>0);
    let kill=p.life<=0;
    if(!player.dead&&Math.hypot(p.x-player.pos.x,p.z-player.pos.z)<1.1){
      kill=true;
      player.hp=Math.min(player.maxHp,player.hp+18);
      updateHpUI(); AudioSys.pickup();
      dmgText(player.pos,'+18','heal');
      burst(player.pos,0x7dff9b,10,4,5,.8);
    }
    if(kill){ scene.remove(p.m); p.m.material.dispose(); G.pickups.splice(i,1); }
  }
}

/* spawn telegraphs */
const spawnQueue=[];
function scheduleSpawn(type,x,z,lvlScale){
  const d=dangerZone(x,z,.9,.8,0xff5566);
  spawnQueue.push({type,x,z,lvlScale,t:.8,d});
  G.pendingSpawns++;
}
function updateSpawns(dt){
  for(let i=spawnQueue.length-1;i>=0;i--){
    const s=spawnQueue[i];
    s.t-=dt;
    if(s.t<=0){
      removeDecal(s.d);
      const e=new Enemy(s.type,s.x,s.z,s.lvlScale);
      G.enemies.push(e);
      burst(V3(s.x,0,s.z),0xff7755,10,4,6,.9);
      spawnQueue.splice(i,1);
      G.pendingSpawns--;
    }
  }
}

/* ============================================================
   LEVELS / WAVES
============================================================ */
const LEVELS=[
  {theme:0, waves:[['grunt','grunt'],['grunt','grunt','ranger']]},
  {theme:1, waves:[['grunt','grunt','ranger'],['brute','grunt'],['brute','ranger','ranger','grunt']]},
  {theme:2, waves:[['grunt','grunt','ranger','brute'],['boss']]},
];
function lvlScale(i){ return 1+i*.18; }

function clearEntities(){
  G.enemies.forEach(e=>e.destroy()); G.enemies=[];
  G.projectiles.forEach(p=>{scene.remove(p.m);p.m.material.dispose();}); G.projectiles=[];
  G.pickups.forEach(p=>{scene.remove(p.m);p.m.material.dispose();}); G.pickups=[];
  spawnQueue.forEach(s=>removeDecal(s.d)); spawnQueue.length=0;
  G.pendingSpawns=0;
  while(decals.length) removeDecal(decals[0]);
  Director.reset();
  el('bossbar').classList.remove('on');
}

function startLevel(i,fresh=true){
  clearEntities();
  G.level=i; G.wave=0; G.state='levelintro';
  if(fresh){ player.reset(); }
  else { player.hp=Math.min(player.maxHp,player.hp+40); player.pos.set(0,0,3); player.vel.set(0,0,0); }
  updateHpUI();
  const L=LEVELS[i], T=THEMES[L.theme];
  buildArena(T);
  Director.slots=i>=2?3:2;
  el('level-num').textContent='LEVEL '+(i+1)+' OF '+LEVELS.length;
  el('level-name').textContent=T.name;
  el('level-flavor').textContent=T.flavor;
  showScreen('screen-level');
  el('hud').classList.add('on');
  sto(()=>{
    if(G.state!=='levelintro') return;
    hideScreens();
    G.state='playing';
    Music.start(i===2?'boss':'arena');
    startWave(0);
  },2200);
}
function startWave(w){
  G.wave=w;
  const L=LEVELS[G.level];
  const isBossWave=L.waves[w].includes('boss');
  el('wave-label').textContent=isBossWave?'FINAL BATTLE':('WAVE '+(w+1)+' / '+L.waves.length);
  showBanner(isBossWave?'VORGATH':'WAVE '+(w+1),isBossWave?'THE WARLORD':THEMES[L.theme].name,1.5);
  AudioSys.waveHorn();
  const specs=L.waves[w];
  specs.forEach((type,i)=>{
    let a,x,z,tries=0;
    do{ a=rand(0,Math.PI*2); const r=rand(9,13); x=Math.cos(a)*r; z=Math.sin(a)*r; tries++; }
    while(Math.hypot(x-player.pos.x,z-player.pos.z)<6&&tries<20);
    sto(()=>{ if(G.state==='playing') scheduleSpawn(type,x,z,lvlScale(G.level)); },200+i*350);
  });
  G.waveSpawning=true;
  sto(()=>{G.waveSpawning=false;},200+specs.length*350+900);
}
function onWaveCleared(){
  const L=LEVELS[G.level];
  if(G.wave+1<L.waves.length){
    const next=G.wave+1;
    sto(()=>{ if(G.state==='playing') startWave(next); },1300);
    G.wave=-99; // guard against double-trigger; startWave sets real value
  } else {
    G.wave=-99;
    AudioSys.jingle(G.level===LEVELS.length-1);
    if(G.level+1<LEVELS.length){
      posthog.capture('level_cleared', {
        level: G.level + 1,
        level_name: THEMES[L.theme].name,
        score: G.score,
      });
      showBanner('LEVEL CLEAR','PREPARE YOURSELF',1.8);
      Music.stop();
      sto(()=>{ if(G.state==='playing') startLevel(G.level+1,false); },2300);
    } else {
      sto(()=>showWin(),1800);
    }
  }
}

/* ============================================================
   UI HELPERS
============================================================ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  el(id).classList.remove('hidden');
}
function hideScreens(){ document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden')); }
let bannerTimer=null;
function showBanner(main,sub,dur=1.6){
  el('banner-main').textContent=main;
  el('banner-sub').textContent=sub;
  el('banner').classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer=sto(()=>el('banner').classList.remove('show'),dur*1000);
}
let hpGhostTimer=null;
function updateHpUI(){
  const pct=clamp(player.hp/player.maxHp*100,0,100);
  el('hp-fill').style.width=pct+'%';
  clearTimeout(hpGhostTimer);
  hpGhostTimer=sto(()=>{ el('hp-ghost').style.width=pct+'%'; },350);
  el('lowhp').style.opacity=player.hp<30&&player.hp>0?1:0;
}
function showDeath(){
  G.state='dead';
  el('dead-score').textContent=G.score;
  el('dead-level').textContent='LEVEL '+(G.level+1)+' — '+THEMES[LEVELS[G.level].theme].name;
  posthog.capture('game_over', {
    score: G.score,
    level: G.level + 1,
    level_name: THEMES[LEVELS[G.level].theme].name,
    best_combo: G.bestCombo,
  });
  showScreen('screen-dead');
}
function showWin(){
  G.state='win';
  Music.stop();
  el('win-score').textContent=G.score;
  el('win-combo').textContent=G.bestCombo+'×';
  posthog.capture('game_won', {
    final_score: G.score,
    best_combo: G.bestCombo,
  });
  showScreen('screen-win');
  el('hud').classList.remove('on');
}
function toTitle(){
  G.state='title';
  Music.stop();
  clearEntities();
  el('hud').classList.remove('on');
  showScreen('screen-title');
}

/* ============================================================
   INPUT
============================================================ */
const keys={w:false,a:false,s:false,d:false};
on(window,'keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup')keys.w=true;
  if(k==='a'||k==='arrowleft')keys.a=true;
  if(k==='s'||k==='arrowdown')keys.s=true;
  if(k==='d'||k==='arrowright')keys.d=true;
  if(k==='j'||k==='z'||k==='f') player.queueAttack('light');
  if(k==='k'||k==='x'||k==='e'||k==='q') player.queueAttack('heavy');
  if(k===' '||k==='shift'){ e.preventDefault(); player.startDodge(); }
  if(k==='m') AudioSys.toggleMute();
  if(k==='tab'){ e.preventDefault(); } // Tab sits above W — never let it move focus onto hidden menu buttons
  if(k==='escape'||k==='p'){
    if(G.state==='playing'){ G.state='paused'; showScreen('screen-pause'); AudioSys.ui(); }
    else if(G.state==='paused'){ G.state='playing'; hideScreens(); AudioSys.ui(); }
  }
});
on(window,'keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup')keys.w=false;
  if(k==='a'||k==='arrowleft')keys.a=false;
  if(k==='s'||k==='arrowdown')keys.s=false;
  if(k==='d'||k==='arrowright')keys.d=false;
});
on(window,'blur',()=>{ keys.w=keys.a=keys.s=keys.d=false; }); // no stuck keys on focus loss
on(window,'mousedown',e=>{
  if(G.state==='playing'&&e.target.tagName!=='BUTTON'){
    if(e.button===0) player.queueAttack('light');
    if(e.button===2) player.queueAttack('heavy');
  }
});
on(window,'contextmenu',e=>{ if(G.state==='playing') e.preventDefault(); });

/* buttons — state-guarded so a stray focused button can never fire mid-game */
function bindBtn(id,states,fn){
  const b=el(id); b.tabIndex=-1;
  on(b,'click',ev=>{
    ev.currentTarget.blur();
    if(!states.includes(G.state)) return;
    if(ev.currentTarget.closest('.screen').classList.contains('hidden')) return;
    AudioSys.init(); AudioSys.resume(); AudioSys.ui(); fn();
  });
}
bindBtn('btn-start',['title'],()=>{ G.score=0; G.combo=0; G.bestCombo=0; el('score').textContent='0'; posthog.capture('game_started'); startLevel(0,true); });
bindBtn('btn-resume',['paused'],()=>{ G.state='playing'; hideScreens(); });
bindBtn('btn-retry-pause',['paused'],()=>{ posthog.capture('game_retried', { from_pause: true, level: G.level + 1, score: G.score }); startLevel(G.level,true); });
bindBtn('btn-quit',['paused'],()=>{ posthog.capture('game_quit_to_menu', { level: G.level + 1, score: G.score }); toTitle(); });
bindBtn('btn-retry',['dead'],()=>{ posthog.capture('game_retried', { from_pause: false, level: G.level + 1, score: G.score }); startLevel(G.level,true); });
bindBtn('btn-dead-menu',['dead'],()=>toTitle());
bindBtn('btn-again',['win'],()=>{ G.score=0; G.combo=0; G.bestCombo=0; el('score').textContent='0'; startLevel(0,true); });
bindBtn('btn-win-menu',['win'],()=>toTitle());

/* ============================================================
   CAMERA
============================================================ */
const camTarget=V3();
function updateCamera(dt){
  camTarget.lerp(V3(player.pos.x+player.vel.x*.18,0,player.pos.z+player.vel.z*.18),1-Math.pow(.001,dt));
  camera.position.set(camTarget.x+CAM_OFF.x,CAM_OFF.y,camTarget.z+CAM_OFF.z);
  if(G.shake>0){
    camera.position.x+=rand(-1,1)*G.shake;
    camera.position.y+=rand(-1,1)*G.shake*.6;
    camera.position.z+=rand(-1,1)*G.shake;
    G.shake=Math.max(0,G.shake-G.shake*7*dt-.01*dt);
  }
  camera.lookAt(camTarget.x,0,camTarget.z);
}

/* ============================================================
   MAIN LOOP
============================================================ */
let lastT=performance.now();
function loop(){
  if(disposed.v) return;
  rafId=requestAnimationFrame(loop);
  const now=performance.now();
  let rawDt=Math.min((now-lastT)/1000,.05);
  lastT=now;
  let dt=rawDt;
  if(G.hitStop>0){ G.hitStop-=rawDt; dt=rawDt*.05; }
  // cursor hidden only during actual combat; menus need it back
  document.body.classList.toggle('hide-cursor',G.state==='playing');

  if(G.state==='playing'||G.state==='levelintro'||(G.state==='dead'&&player.dead)){
    G.time+=dt;
    if(G.state==='playing'){
      player.update(dt);
      updateSpawns(dt);
      for(let i=G.enemies.length-1;i>=0;i--){
        const alive=G.enemies[i].update(dt);
        if(!alive){ G.enemies[i].destroy(); G.enemies.splice(i,1); }
      }
      updateProjectiles(dt);
      updatePickups(dt);
      // combo timer
      if(G.comboTimer>0){ G.comboTimer-=dt;
        if(G.comboTimer<=0){ G.combo=0; el('combo').classList.remove('show'); } }
      // wave cleared?
      if(G.wave>=0&&!G.waveSpawning&&G.pendingSpawns===0&&G.enemies.every(e=>e.dead)){
        const anyAlive=G.enemies.some(e=>!e.dead);
        if(!anyAlive&&spawnQueue.length===0) onWaveCleared();
      }
    } else if(G.state==='dead'){
      player.update(dt); // death anim continues
    }
    updateParticles(dt);
    updateWaves(dt);
    updateSlashes(dt);
    updateDecals(dt);
    updateCamera(dt);
  } else if(G.state==='title'){
    // idle title spin
    G.time+=dt;
    camera.position.set(Math.sin(G.time*.1)*4,CAM_OFF.y+2,CAM_OFF.z+4);
    camera.lookAt(0,0,0);
    updateParticles(dt); updateWaves(dt);
  }
  renderer.render(scene,camera);
}

/* ============================================================
   LOADING SEQUENCE
============================================================ */
const TIPS=[
  'Dodge rolls grant invincibility — roll through attacks, not away from them.',
  'Your third combo hit staggers hard. Finish the chain.',
  'Heavy strikes (E or right-click) break a Brute\'s poise.',
  'Red circles mean get out. Now.',
  'Enemies telegraph in red before striking — watch their arms.',
  'Rangers are fragile. Close the gap fast.',
  'Combos multiply your score. Keep the chain alive.',
];
const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
async function load(){
  el('loadtip').textContent='“'+TIPS[randi(0,TIPS.length-1)]+'”';
  const steps=[
    ['FORGING THE ARENA',()=>buildArena(THEMES[0])],
    ['SUMMONING THE CHAMPION',()=>player.build()],
    ['SHARPENING BLADES',()=>{ const t=new Enemy('grunt',30,30,1); t.die(); t.destroy(); el('bars').innerHTML=''; }],
    ['WARMING THE FORGE',()=>{ renderer.compile(scene,camera); renderer.render(scene,camera); }],
    ['RAISING THE GATES',()=>{}],
  ];
  for(let i=0;i<steps.length;i++){
    if(disposed.v) return;
    el('loadtext').textContent=steps[i][0];
    el('loadbar').style.width=((i)/steps.length*100)+'%';
    await nextFrame(); await nextFrame();
    if(disposed.v) return;
    try{ steps[i][1](); }catch(e){ console.error(e); }
    await new Promise(r=>setTimeout(r,160));
  }
  if(disposed.v) return;
  el('loadbar').style.width='100%';
  el('loadtext').textContent='READY';
  await new Promise(r=>setTimeout(r,350));
  if(disposed.v) return;
  G.state='title';
  showScreen('screen-title');
}
player.build=player.build.bind(player);
if(typeof window!=='undefined'){ window.__G=G; window.__player=player; window.__startLevel=startLevel; }
loop();
load();

/* ---- cleanup for React unmount ---- */
return function destroy(){
  disposed.v=true;
  cancelAnimationFrame(rafId);
  clearInterval(musicIv);
  timeouts.forEach(id=>clearTimeout(id));
  listeners.forEach(([t,e,f])=>t.removeEventListener(e,f));
  Music.stop();
  if(AudioSys.ctx){ AudioSys.ctx.close().catch(()=>{}); }
  document.body.classList.remove('hide-cursor');
  document.querySelectorAll('.dmg').forEach(d=>d.remove());
  const bars=document.getElementById('bars'); if(bars) bars.innerHTML='';
  renderer.dispose();
  renderer.domElement.remove();
};
}
