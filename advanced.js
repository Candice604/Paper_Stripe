import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ParametricGeometry} from 'three/addons/geometries/ParametricGeometry.js';

const level=Math.min(6,Math.max(3,Number(new URLSearchParams(location.search).get('level'))||3));
const rawColor=new URLSearchParams(location.search).get('color');
const selectedColor=/^[0-9a-fA-F]{6}$/.test(rawColor||'')?parseInt(rawColor,16):0xd8eaf4;
const colorHex=selectedColor.toString(16).padStart(6,'0');
const requestedSound=new URLSearchParams(location.search).get('sound');
const rainEnabled=requestedSound?requestedSound!=='off':localStorage.getItem('paper-stripe-sound')!=='off';
const soundQuery=rainEnabled?'on':'off';
const rainAudio=new Audio('https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3');
rainAudio.preload='metadata';rainAudio.loop=true;rainAudio.volume=.15;
function startRain(){if(rainEnabled&&rainAudio.paused)rainAudio.play().catch(()=>{})}
addEventListener('pointerdown',startRain,{once:true});addEventListener('keydown',startRain,{once:true});
const ADVANCED='./advanced.html';
const HOME='./index.html';
const LEVEL2='./level-2.html';

const configs={
  3:{title:'普通环 · 1/3',before:'两个面 · 一个环',result:'两个不等宽的普通环',copy:'切口偏离中线后，普通环仍会分成两个独立的双面环；它们的宽度分别约为原纸带的 1/3 与 2/3。',facts:[['形状','1 个环 → 2 个环'],['宽度','1/3 ＋ 2/3']],kind:'cylinder',fraction:1/3},
  4:{title:'莫比乌斯环 · 1/3',before:'一个面 · 一个环',result:'两个彼此相扣的环',copy:'偏离中线剪莫比乌斯环，需要沿纸带走两圈。结果是一条较窄的莫比乌斯环与一条更长的双面扭转环，两者彼此相扣。',facts:[['形状','1 个环 → 2 个相扣环'],['表面','一个单面环 ＋ 一个双面环']],kind:'mobiusOffset',fraction:1/3},
  5:{title:'双扭环',before:'两个半扭转 · 双面',result:'两个相扣的纸环',copy:'具有两个半扭转的纸带是双面的。沿中线剪开后，它会分成两个彼此穿套、无法直接分开的窄纸环。',facts:[['形状','1 个纸环 → 2 个纸环'],['关系','霍普相扣']],kind:'twist2'},
  6:{title:'三扭环',before:'三个半扭转（540°）· 单面',result:'单面的三叶结纸环',copy:'剪前的三扭环只有一个面；沿中线剪开后仍是一条连续长环，它形成三叶结，并保持只有一个面。',facts:[['剪前','三扭环 · 单面'],['剪后','三叶结纸环 · 单面']],kind:'twist3'}
};
const config=configs[level];

document.title=`${config.title} · 纸带`;
document.getElementById('level-no').textContent=`关卡 ${String(level).padStart(2,'0')}`;
document.getElementById('level-title').textContent=config.title;
document.getElementById('before-fact').textContent=config.before;
document.getElementById('result-title').textContent=config.result;
document.getElementById('result-copy').textContent=config.copy;
document.getElementById('result-facts').innerHTML=config.facts.map(([a,b])=>`<span><b>${a}</b>${b}</span>`).join('');
document.getElementById('home-link').href=`${HOME}?color=${colorHex}&sound=${soundQuery}`;
document.getElementById('prev-level').href=level===3?`${LEVEL2}?color=${colorHex}&sound=${soundQuery}`:`${ADVANCED}?level=${level-1}&color=${colorHex}&sound=${soundQuery}`;
document.getElementById('next-level').href=level===6?`${HOME}?color=${colorHex}&sound=${soundQuery}`:`${ADVANCED}?level=${level+1}&color=${colorHex}&sound=${soundQuery}`;

let fraction=config.fraction||.5;

const canvas=document.getElementById('stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);camera.position.set(0,level===3?2.35:3.5,10.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enableZoom=false;controls.enablePan=false;controls.update();
scene.add(new THREE.AmbientLight(0xffffff,2.2));const light=new THREE.DirectionalLight(0xffffff,2.8);light.position.set(5,7,8);scene.add(light);

const R=3.05,W=1.35,N=300,EDGE=.021,CUT=.009;
const colorFront=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.FrontSide});
const colorBack=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide});
const colorDouble=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.DoubleSide});
const whiteFront=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.FrontSide});
const whiteBack=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.BackSide});
const edgeMat=new THREE.MeshBasicMaterial({color:0x111111});
const guideMat=new THREE.LineDashedMaterial({color:0x111111,dashSize:.085,gapSize:.07,transparent:true,opacity:.78});
const root=new THREE.Group(),cutGroup=new THREE.Group();scene.add(root,cutGroup);
let initialRoot=null,resultRoot=null,guide=null,person=null,progress=0,direction=0,finished=false,last=0,reveal=0;

function tube(points,r=EDGE,closed=true){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed,'centripetal'),Math.max(24,points.length),r,6,closed),edgeMat)}
function twistPoint(t,q,k,r=R,p=new THREE.Vector3()){const h=k*t/2,rad=r+q*Math.cos(h);return p.set(rad*Math.cos(t),q*Math.sin(h),rad*Math.sin(t))}
function cylinderPoint(t,y,r=R,p=new THREE.Vector3()){return p.set(r*Math.cos(t),y,r*Math.sin(t))}
function surfacePair(geo,oneColor=false,reverse=false){const g=new THREE.Group();if(oneColor)g.add(new THREE.Mesh(geo,colorDouble));else g.add(new THREE.Mesh(geo,reverse?whiteFront:colorFront),new THREE.Mesh(geo,reverse?whiteBack:colorBack));return g}

function makeTwistBand(k,width=W,r=R,oneColor=false,reverse=false){
  const geo=new ParametricGeometry((u,v,p)=>twistPoint(u*Math.PI*2,(v-.5)*width,k,r,p),300,16),g=surfacePair(geo,oneColor,reverse);
  const odd=Math.abs(k)%2===1,edges=[];
  if(odd){for(let i=0;i<N*2;i++)edges.push(twistPoint(i/(N*2)*Math.PI*4,width/2,k,r,new THREE.Vector3()));g.add(tube(edges))}
  else{for(const sign of [-1,1]){const pts=[];for(let i=0;i<N;i++)pts.push(twistPoint(i/N*Math.PI*2,sign*width/2,k,r,new THREE.Vector3()));g.add(tube(pts))}}
  return g;
}
function makeCylinderBand(width=W,r=R,reverse=false){
  const geo=new ParametricGeometry((u,v,p)=>cylinderPoint(u*Math.PI*2,(v-.5)*width,r,p),260,10),g=surfacePair(geo,false,reverse);
  for(const sign of [-1,1]){const pts=[];for(let i=0;i<N;i++)pts.push(cylinderPoint(i/N*Math.PI*2,sign*width/2,r,new THREE.Vector3()));g.add(tube(pts))}
  return g;
}
function spatialRibbon(points,width=W*.36,halfTwists=0){
  const curve=new THREE.CatmullRomCurve3(points,true,'centripetal'),frames=curve.computeFrenetFrames(N,true),positions=[],indices=[],aPts=[],bPts=[];
  for(let i=0;i<=N;i++){const c=curve.getPoint(i/N),angle=halfTwists*Math.PI*i/N,n=frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(angle)),a=c.clone().addScaledVector(n,width/2),b=c.clone().addScaledVector(n,-width/2);aPts.push(a);bPts.push(b);positions.push(a.x,a.y,a.z,b.x,b.y,b.z)}
  for(let i=0;i<N;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const oneSided=Math.abs(halfTwists)%2===1,g=surfacePair(geo,oneSided);
  if(oneSided)g.add(tube([...aPts.slice(0,N),...bPts.slice(0,N)]));
  else g.add(tube(aPts.slice(0,N)),tube(bPts.slice(0,N)));
  return g;
}
function trefoilPoints(scale=1.12){const pts=[];for(let i=0;i<N;i++){const t=i/N*Math.PI*2,rad=2+Math.cos(3*t);pts.push(new THREE.Vector3(rad*Math.cos(2*t)*scale,Math.sin(3*t)*scale,rad*Math.sin(2*t)*scale))}return pts}

function makePerson(){const skin=new THREE.MeshStandardMaterial({color:0x111111,roughness:.8}),bodyMat=new THREE.MeshStandardMaterial({color:0x222222,roughness:.72}),g=new THREE.Group(),body=new THREE.Mesh(new THREE.ConeGeometry(.18,.48,24),bodyMat),head=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),skin);body.position.y=.27;head.position.y=.66;g.add(body,head);g.scale.setScalar(.86);return g}
function guideSettings(){
  if(level===3)return{kind:'cylinder',q:(fraction-.5)*W,total:Math.PI*2,k:0,r:R};
  if(level===4)return{kind:'twist',q:(fraction-.5)*W,total:Math.PI*4,k:1,r:R};
  if(level===5)return{kind:'twist',q:0,total:Math.PI*2,k:2,r:R};
  if(level===6)return{kind:'twist',q:0,total:Math.PI*2,k:3,r:R};
  return{kind:'twist',q:0,total:Math.PI*2,k:1,r:R};
}
function guidePoint(t,p=new THREE.Vector3()){const s=guideSettings();return s.kind==='cylinder'?cylinderPoint(t,s.q,s.r+.01,p):twistPoint(t,s.q,s.k,s.r,p)}
function personPose(t){const s=guideSettings(),p=guidePoint(t,new THREE.Vector3()),p2=guidePoint(t+.01,new THREE.Vector3()),tan=p2.sub(p).normalize();let normal;if(s.kind==='cylinder')normal=new THREE.Vector3(Math.cos(t),0,Math.sin(t));else{const w=twistPoint(t,s.q+.04,s.k,s.r,new THREE.Vector3());normal=new THREE.Vector3().crossVectors(tan,w.sub(p).normalize()).normalize()}person.visible=true;person.position.copy(p).addScaledVector(normal,-.026);person.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal)}

function makeInitial(){
  const g=new THREE.Group();
  if(level===3)g.add(makeCylinderBand());
  if(level===4)g.add(makeTwistBand(1,W,R,true));
  if(level===5)g.add(makeTwistBand(2));
  if(level===6)g.add(makeTwistBand(3,W,R,true));
  return g;
}
function disposeGuide(){if(!guide)return;guide.traverse(o=>{if(o.geometry)o.geometry.dispose()});root.remove(guide);guide=null}
function rebuildGuide(){
  disposeGuide();const s=guideSettings();
  const pts=[];for(let i=0;i<=N;i++)pts.push(guidePoint(i/N*s.total,new THREE.Vector3()));guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),guideMat);guide.computeLineDistances();
  root.add(guide);if(person)personPose(0)
}
function buildScene(){if(initialRoot)root.remove(initialRoot);initialRoot=makeInitial();root.add(initialRoot);rebuildGuide();if(!person)person=makePerson();if(person.parent!==root)root.add(person);personPose(0)}

function linkedOffsetResult(){
  const g=new THREE.Group(),narrow=makeTwistBand(1,W*.34,R*.72,true),wide=makeTwistBand(2,W*.34,R*.9,false);narrow.rotation.z=.62;narrow.position.x=-1.05;wide.rotation.x=.78;wide.position.x=1.05;g.add(narrow,wide);return g
}
function hopfLinkedResult(){
  const g=new THREE.Group(),r=R*.72;
  const horizontal=makeCylinderBand(W*.38,r,false);
  const vertical=makeCylinderBand(W*.38,r,true);
  vertical.rotation.x=Math.PI/2;
  vertical.position.x=r*.5;
  g.add(horizontal,vertical);
  g.rotation.x=.14;
  g.rotation.y=.22;
  return g;
}
function makeResult(){
  const g=new THREE.Group();
  if(level===3){const a=makeCylinderBand(W*fraction),b=makeCylinderBand(W*(1-fraction),R,false);a.position.y=1.25;b.position.y=-1.15;g.add(a,b)}
  if(level===4)g.add(linkedOffsetResult());
  if(level===5)g.add(hopfLinkedResult());
  if(level===6){const knot=spatialRibbon(trefoilPoints(),W*.36,1);knot.rotation.x=.18;g.add(knot)}
  g.position.y=.65;return g;
}

function addCutSegment(a,b){const m=a.clone().lerp(b,.5),mesh=tube([a,m,b],CUT,false);cutGroup.add(mesh)}
function clearCuts(){while(cutGroup.children.length){const m=cutGroup.children.pop();m.geometry.dispose()}}
function complete(){finished=true;direction=0;stopCutting();clearCuts();localStorage.setItem('paper-stripe-walker-step',String(Math.min(8,level)));document.body.classList.add('finished');root.remove(initialRoot,guide,person);resultRoot=makeResult();resultRoot.scale.setScalar(.82);root.add(resultRoot);reveal=0;resize()}
function reset(){stopCutting();cuttingAudio.currentTime=0;document.body.classList.remove('finished');if(resultRoot){root.remove(resultRoot);resultRoot=null}if(person){person.removeFromParent();person=null}clearCuts();progress=0;direction=0;finished=false;reveal=0;buildScene();resize()}

const cuttingAudio=new Audio('https://sfxmint.com/dl/scissors-snip-07.mp3');cuttingAudio.preload='auto';cuttingAudio.loop=true;cuttingAudio.volume=.42;
function playCutting(){if(cuttingAudio.paused)cuttingAudio.play().catch(()=>{})}
function stopCutting(){cuttingAudio.pause()}
function setDirection(n){if(finished)return;direction=n;playCutting()}
function stopDirection(n){if(direction===n)direction=0;if(!direction)stopCutting()}
addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();setDirection(-1)}if(e.key==='ArrowRight'){e.preventDefault();setDirection(1)}if(e.key.toLowerCase()==='r')reset()});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft')stopDirection(-1);if(e.key==='ArrowRight')stopDirection(1)});
let touchCutDirection=0;
function beginTouchCut(e){if(e.pointerType==='mouse'||finished)return;e.preventDefault();touchCutDirection=e.clientX<innerWidth/2?-1:1;controls.enabled=false;setDirection(touchCutDirection);canvas.setPointerCapture?.(e.pointerId)}
function endTouchCut(e){if(e.pointerType==='mouse'||!touchCutDirection)return;e.preventDefault();stopDirection(touchCutDirection);touchCutDirection=0;controls.enabled=true;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId)}
canvas.addEventListener('pointerdown',beginTouchCut,{passive:false});canvas.addEventListener('pointerup',endTouchCut,{passive:false});canvas.addEventListener('pointercancel',endTouchCut,{passive:false});canvas.addEventListener('contextmenu',e=>{if(matchMedia('(pointer:coarse)').matches)e.preventDefault()});
document.getElementById('restart').addEventListener('click',reset);

function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);let viewH=finished?9.2:8,viewW=viewH*aspect,minW=finished?12.2:8;if(viewW<minW){viewW=minW;viewH=viewW/aspect}camera.left=-viewW/2;camera.right=viewW/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
addEventListener('resize',resize);buildScene();resize();
function animate(t){requestAnimationFrame(animate);const dt=Math.min(35,t-last||16);last=t;if(direction&&!finished){const s=guideSettings(),old=progress;progress+=direction*dt*.00039;progress=Math.max(0,Math.min(1,progress));if(Math.abs(progress-old)>.00001)addCutSegment(guidePoint(old*s.total,new THREE.Vector3()),guidePoint(progress*s.total,new THREE.Vector3()));personPose(progress*s.total);if(progress>=.999)complete()}if(resultRoot){reveal+=(1-reveal)*.035;const s=.82+.18*reveal;resultRoot.scale.setScalar(s)}controls.update();renderer.render(scene,camera)}animate();
