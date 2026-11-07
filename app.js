import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const root=document.documentElement;
const swatches=[...document.querySelectorAll('.swatch')];
const themeKinds=['pink','blue','green','yellow','gray'];
const nameLabel=document.getElementById('color-name');
const soundButton=document.getElementById('sound-toggle');
const levelLinks=[...document.querySelectorAll('[data-level-link]')];
const canvas=document.getElementById('stair-stage');
const urls=levelLinks.map(link=>link.href);
const stepMaterials=[],stepFillMaterials=[];
let effectsRoot=null,effectItems=[];
let selectedColor='#F2D9E0',selectedEffectKind='pink';
let selectedSound=0,soundEnabled=localStorage.getItem('paper-stripe-sound')!=='off';
const soundVolumes=[.16,.14,.18,.2,.15];
const soundLabels=['雨声','雨声','雨声','雨声','雨声'];
const ambientSources=[
  'https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3',
  'https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3',
  'https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3',
  'https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3',
  'https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3'
];
const ambientTracks=ambientSources.map(src=>{const audio=new Audio(src);audio.preload='metadata';audio.loop=true;audio.volume=0;return audio});
const fades=new WeakMap();

function fadeAudio(audio,target,duration=520){const old=fades.get(audio);if(old)cancelAnimationFrame(old);if(target>0&&audio.paused)audio.play().catch(()=>{});const start=audio.volume,t0=performance.now();function step(now){const p=Math.min(1,(now-t0)/duration),value=start+(target-start)*(1-Math.pow(1-p,3));audio.volume=Math.max(0,Math.min(1,value));if(p<1)fades.set(audio,requestAnimationFrame(step));else{fades.delete(audio);if(target===0)audio.pause()}}fades.set(audio,requestAnimationFrame(step))}
function switchAmbient(index){selectedSound=index;ambientTracks.forEach((audio,i)=>{if(i===index&&soundEnabled)fadeAudio(audio,soundVolumes[i]);else fadeAudio(audio,0)});soundButton.title=`环境音：${soundLabels[index]}`;soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?`关闭${soundLabels[index]}环境音`:`开启${soundLabels[index]}环境音`)}
soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'关闭环境音':'开启环境音');
soundButton.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem('paper-stripe-sound',soundEnabled?'on':'off');switchAmbient(selectedSound);updateLevelLinks(selectedColor)});

function updateLevelLinks(color){const value=color.replace('#','');levelLinks.forEach((link,index)=>{const url=new URL(urls[index]);url.searchParams.set('color',value);url.searchParams.set('sound',soundEnabled?'on':'off');link.href=url.toString();urls[index]=url.toString()})}
function chooseColor(button,remember=true,fromGesture=false){const index=Math.max(0,swatches.indexOf(button));selectedColor=button.dataset.color;selectedEffectKind=themeKinds[index];root.style.setProperty('--theme',selectedColor);nameLabel.textContent=button.dataset.name;swatches.forEach(item=>{const selected=item===button;item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected))});stepFillMaterials.forEach(material=>material.color.set(selectedColor));if(effectsRoot)setThemeEffects();updateLevelLinks(selectedColor);if(fromGesture)switchAmbient(index,true);else{selectedSound=index;soundButton.title=`环境音：${soundLabels[index]}`}if(remember)localStorage.setItem('paper-stripe-color',selectedColor)}
swatches.forEach(button=>button.addEventListener('click',()=>chooseColor(button,true,true)));
const requested=new URLSearchParams(location.search).get('color');
const saved=requested?('#'+requested.replace('#','')):localStorage.getItem('paper-stripe-color');
chooseColor(swatches.find(button=>button.dataset.color.toLowerCase()===saved?.toLowerCase())||swatches[0],false);

const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.15,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;controls.minDistance=8.5;controls.maxDistance=30;controls.maxPolarAngle=Math.PI*.49;
controls.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=.55;
let userRotated=false;controls.addEventListener('start',()=>{userRotated=true});

const stairs=new THREE.Group();stairs.rotation.y=-.18;scene.add(stairs);
const count=9,radius=2.58,rise=.32,stepSize=1.42;
const steps=[],hits=[],centers=[];
const loader=new THREE.TextureLoader();
const mascotTextures=['./mascot-turtle.png','./mascot-owl.png','./mascot-cat.png'].map(path=>{const tex=loader.load(path);tex.colorSpace=THREE.SRGBColorSpace;return tex});
const mascotAspects=[256/250,256/234,193/256];

effectsRoot=new THREE.Group();stairs.add(effectsRoot);
function petal(material){const m=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),material);m.scale.set(.7,.2,1.35);return m}
function blossom(){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xf5b8c7}),center=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshBasicMaterial({color:0xf3cf65}));for(let i=0;i<5;i++){const p=petal(mat);const a=i/5*Math.PI*2;p.position.set(Math.cos(a)*.13,0,Math.sin(a)*.13);p.rotation.y=-a;p.rotation.z=.45;g.add(p)}center.position.y=.035;g.add(center);return g}
function bird(){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0x6fa5c7,side:THREE.DoubleSide}),geo=new THREE.ConeGeometry(.12,.34,3);for(const s of [-1,1]){const wing=new THREE.Mesh(geo,mat);wing.rotation.z=s*.92;wing.position.x=s*.13;wing.userData.side=s;g.add(wing)}return g}
function leaf(){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0x86ad7d,side:THREE.DoubleSide}),m=petal(mat);m.scale.set(.7,.1,1.65);m.rotation.z=.8;g.add(m);return g}
function starShape(){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?0.09:.2,x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y)}shape.closePath();return shape}
function star(){return new THREE.Mesh(new THREE.ShapeGeometry(starShape()),new THREE.MeshBasicMaterial({color:0xe5c654,side:THREE.DoubleSide}))}
function cloud(){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xbfc2c6,transparent:true,opacity:.92});[[-.18,0,.18],[0,.08,.24],[.22,0,.16]].forEach(([x,y,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,9),mat);m.position.set(x,y,0);m.scale.z=.5;g.add(m)});return g}
function setThemeEffects(){while(effectsRoot.children.length)effectsRoot.remove(effectsRoot.children[0]);effectItems=[];const kind=selectedEffectKind,make={pink:blossom,blue:bird,green:leaf,yellow:star,gray:cloud}[kind];for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,item=make(),r=radius+1.42,y=(i-(count-1)/2)*rise+.38;item.position.set(Math.cos(angle)*r,y,Math.sin(angle)*r);item.rotation.y=-angle+Math.PI/2;item.scale.setScalar(kind==='gray'?1.05:1);item.userData={kind,angle,radius:r,baseY:y,phase:i*.73};effectsRoot.add(item);effectItems.push(item)}}
setThemeEffects();

function labelTexture(text){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#171717';x.font='500 118px ui-monospace, monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,139);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex}
function makeStep(i){
  const angle=i/count*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=(i-(count-1)/2)*rise;
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-angle;g.userData.index=i;
  const lineMat=new THREE.MeshBasicMaterial({color:0x171717,side:THREE.DoubleSide}),border=new THREE.Mesh(new THREE.PlaneGeometry(stepSize,stepSize),lineMat);border.rotation.x=-Math.PI/2;g.add(border);stepMaterials.push(lineMat);
  const fillMat=new THREE.MeshBasicMaterial({color:selectedColor,transparent:true,opacity:.94,side:THREE.DoubleSide}),hit=new THREE.Mesh(new THREE.PlaneGeometry(stepSize-.1,stepSize-.1),fillMat);hit.rotation.x=-Math.PI/2;hit.position.y=.004;hit.userData.index=i;g.add(hit);hits.push(hit);stepFillMaterials.push(fillMat);
  const tex=i<6?labelTexture(String(i+1)):mascotTextures[i-6],height=i<6?.58:.82,width=i<6?.58:height*mascotAspects[i-6];
  const marker=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.rotation.z=-Math.PI/2;marker.position.y=.018;g.add(marker);
  stairs.add(g);steps.push({g,lineMat});centers.push(new THREE.Vector3(x,y,z));
}
for(let i=0;i<count;i++)makeStep(i);

const person=new THREE.Group(),personMat=new THREE.MeshStandardMaterial({color:0x171717,roughness:.82});
const body=new THREE.Mesh(new THREE.ConeGeometry(.14,.39,24),personMat),head=new THREE.Mesh(new THREE.SphereGeometry(.12,22,16),personMat);body.position.y=.205;head.position.y=.52;person.add(body,head);
const savedStep=Math.min(8,Math.max(0,Number(localStorage.getItem('paper-stripe-walker-step'))||0));
person.position.copy(centers[savedStep]);person.position.y-=.01;const nextCenter=centers[Math.min(8,savedStep+1)];person.rotation.y=Math.atan2(nextCenter.x-person.position.x,nextCenter.z-person.position.z);stairs.add(person);
scene.add(new THREE.HemisphereLight(0xffffff,0xffffff,2.8));

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let hover=-1,dragStart=null;
function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(hits,false)[0];return hit?hit.object.userData.index:-1}
function rememberExternalStep(index){if(index<2)localStorage.setItem('paper-stripe-walker-step',String(index+1))}
canvas.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointermove',e=>{const index=pick(e);if(index===hover)return;hover=index;steps.forEach((step,i)=>step.lineMat.color.setHex(i===hover?0x777777:0x171717))});
canvas.addEventListener('pointerup',e=>{if(!dragStart)return;const moved=Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y);dragStart=null;if(moved<6){const index=pick(e);if(index>=0){rememberExternalStep(index);location.href=levelLinks[index].href}}});
levelLinks.forEach((link,index)=>{link.addEventListener('click',()=>rememberExternalStep(index));link.addEventListener('mouseenter',()=>{hover=index;steps.forEach((step,i)=>step.lineMat.color.setHex(i===hover?0x777777:0x171717))})});

function resize(){const w=innerWidth,h=innerHeight-(innerWidth<=720?54:62),aspect=w/h,fit=Math.max(1,.78/aspect);renderer.setSize(w,h,false);camera.aspect=aspect;camera.updateProjectionMatrix();if(!userRotated){camera.position.set(9.2*fit,7.1*fit,10.4*fit);controls.target.set(0,.15,0);controls.update()}}
addEventListener('resize',resize);resize();
function animate(t=0){requestAnimationFrame(animate);const time=t*.001;effectItems.forEach(item=>{const {kind,baseY,phase,radius:effectRadius}=item.userData;if(kind==='pink'){item.rotation.y+=.002;item.rotation.z=Math.sin(time+phase)*.12}else if(kind==='blue'){item.position.y=baseY+Math.sin(time*1.8+phase)*.16;item.children.forEach(wing=>wing.rotation.y=Math.sin(time*5+phase)*.45*wing.userData.side)}else if(kind==='green'){item.rotation.z=Math.sin(time*2.2+phase)*.28}else if(kind==='yellow'){item.position.y=baseY+Math.sin(time*1.7+phase)*.28;item.rotation.z=time*.35+phase}else if(kind==='gray'){item.position.x=Math.cos(item.userData.angle+Math.sin(time*.35+phase)*.08)*effectRadius;item.position.z=Math.sin(item.userData.angle+Math.sin(time*.35+phase)*.08)*effectRadius;item.position.y=baseY+Math.sin(time*.65+phase)*.1}});controls.update();renderer.render(scene,camera)}animate();
