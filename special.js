import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ParametricGeometry} from 'three/addons/geometries/ParametricGeometry.js';

const params=new URLSearchParams(location.search);
const level=Math.min(3,Math.max(1,Number(params.get('level'))||1));
const rawColor=params.get('color');
const selectedColor=/^[0-9a-fA-F]{6}$/.test(rawColor||'')?parseInt(rawColor,16):0xdedede;
const colorHex=selectedColor.toString(16).padStart(6,'0');
const requestedSound=params.get('sound');
const rainEnabled=requestedSound?requestedSound!=='off':localStorage.getItem('paper-stripe-sound')!=='off';
const soundQuery=rainEnabled?'on':'off';
const rainAudio=new Audio('./rain.mp3');
rainAudio.preload='auto';rainAudio.loop=true;rainAudio.volume=.15;rainAudio.load();
function startRain(){if(rainEnabled&&rainAudio.paused)rainAudio.play().catch(()=>{})}
addEventListener('pointerdown',startRain,{once:true});addEventListener('keydown',startRain,{once:true});
const HOME='./index.html';
const SPECIAL='./special.html';
const configs={
  1:{title:'剪开三叶结',before:'莫比乌斯三叶结 · 单面 · 沿中线剪',result:'剪开后成为单面八字结',copy:'沿莫比乌斯三叶结纸带的中线剪完整圈后，纸带仍连成一条更长、更窄的单面带；它的中心路径重新组织成八字结。',facts:[['数量','1 条 → 仍为 1 条'],['表面','八字结 · 单面']]},
  2:{title:'自交克莱因瓶',before:'纸面穿过自身 · 沿纵向中线剪',result:'展开成两条莫比乌斯带',copy:'这个三维模型允许纸面穿过自身；自交只是三维呈现方式。沿选定的纵向中线切开后，曲面可以舒展为两条莫比乌斯带。',facts:[['模型','三维自交浸入'],['结果','2 条莫比乌斯带']]},
  3:{title:'环面几何',before:'第一刀：沿经线剪开',result:'环面被展开成矩形',copy:'第一刀沿经线把环面打开成圆柱面；第二刀沿纬线方向切开圆柱面，最后可摊平成一张矩形纸面。',facts:[['第一刀','环面 → 圆柱面'],['第二刀','圆柱面 → 矩形']]}
};
const config=configs[level];
const reward=document.getElementById('special-reward'),rewardConfetti=document.getElementById('reward-confetti'),rewardClose=document.getElementById('reward-close');
const mascot=document.getElementById('reward-mascot'),mascots={1:{name:'turtle',src:'./mascot-turtle.png',alt:'乌龟角色'},2:{name:'owl',src:'./mascot-owl.png',alt:'猫头鹰角色'},3:{name:'cat',src:'./mascot-cat.png',alt:'紫色猫角色'}};

document.title=`${config.title} · 纸带`;
document.getElementById('level-no').textContent=`特殊 ${String(level).padStart(2,'0')}`;
document.getElementById('level-title').textContent=config.title;
document.getElementById('before-fact').textContent=config.before;
document.getElementById('result-title').textContent=config.result;
document.getElementById('result-copy').textContent=config.copy;
document.getElementById('result-facts').innerHTML=config.facts.map(([a,b])=>`<span><b>${a}</b>${b}</span>`).join('');
document.getElementById('reward-title').textContent=config.result;
mascot.src=mascots[level].src;mascot.alt=mascots[level].alt;mascot.className=mascots[level].name;
document.getElementById('home-link').href=`${HOME}?color=${colorHex}&sound=${soundQuery}`;
document.getElementById('prev-level').href=level===1?`${HOME}?color=${colorHex}&sound=${soundQuery}`:`${SPECIAL}?level=${level-1}&color=${colorHex}&sound=${soundQuery}`;
document.getElementById('next-level').href=level===3?`${HOME}?color=${colorHex}&sound=${soundQuery}`:`${SPECIAL}?level=${level+1}&color=${colorHex}&sound=${soundQuery}`;

const canvas=document.getElementById('stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);camera.position.set(0,3.6,11);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enableZoom=false;controls.enablePan=false;controls.update();
scene.add(new THREE.AmbientLight(0xffffff,2.2));const lamp=new THREE.DirectionalLight(0xffffff,2.6);lamp.position.set(5,7,8);scene.add(lamp);

const N=280,EDGE=.022,CUT=.01;
const colorFront=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.FrontSide});
const colorBack=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide});
const colorDouble=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.DoubleSide,transparent:true,opacity:.9});
const edgeMat=new THREE.MeshBasicMaterial({color:0x111111});
const gridMat=new THREE.MeshBasicMaterial({color:0x333333});
const guideMat=new THREE.LineDashedMaterial({color:0x111111,dashSize:.09,gapSize:.075,transparent:true,opacity:.8});
const root=new THREE.Group(),cutGroup=new THREE.Group();scene.add(root,cutGroup);
let model=null,guide=null,person=null,resultRoot=null,stage=0,progress=0,direction=0,finished=false,last=0,reveal=0;

function tube(points,r=EDGE,closed=true,mat=edgeMat){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed,'centripetal'),Math.max(24,points.length),r,6,closed),mat)}
function surfacePair(geo,oneSided=false){const g=new THREE.Group();if(oneSided)g.add(new THREE.Mesh(geo,colorDouble));else g.add(new THREE.Mesh(geo,colorFront),new THREE.Mesh(geo,colorBack));return g}
function trefoilPoint(t,p=new THREE.Vector3(),scale=1.08){const r=2+Math.cos(3*t);return p.set(r*Math.cos(2*t)*scale,Math.sin(3*t)*scale,r*Math.sin(2*t)*scale)}
function trefoilPoints(){const pts=[];for(let i=0;i<N;i++)pts.push(trefoilPoint(i/N*Math.PI*2));return pts}
function figureEightPoint(t,p=new THREE.Vector3(),scale=.86){const r=2+Math.cos(2*t);return p.set(r*Math.cos(3*t)*scale,Math.sin(4*t)*scale,r*Math.sin(3*t)*scale)}
function figureEightPoints(){const pts=[];for(let i=0;i<N;i++)pts.push(figureEightPoint(i/N*Math.PI*2));return pts}
function spatialRibbon(points,width=.5,halfTwists=1){
  const curve=new THREE.CatmullRomCurve3(points,true,'centripetal'),frames=curve.computeFrenetFrames(N,true),positions=[],indices=[],aPts=[],bPts=[];
  for(let i=0;i<=N;i++){const c=curve.getPoint(i/N),angle=halfTwists*Math.PI*i/N,n=frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(angle)),a=c.clone().addScaledVector(n,width/2),b=c.clone().addScaledVector(n,-width/2);aPts.push(a);bPts.push(b);positions.push(a.x,a.y,a.z,b.x,b.y,b.z)}
  for(let i=0;i<N;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const oneSided=Math.abs(halfTwists)%2===1,g=surfacePair(geo,oneSided);
  if(oneSided)g.add(tube([...aPts.slice(0,N),...bPts.slice(0,N)]));else g.add(tube(aPts.slice(0,N)),tube(bPts.slice(0,N)));
  return g;
}
function twistPoint(t,q,k,r=2.45,p=new THREE.Vector3()){const h=k*t/2,rad=r+q*Math.cos(h);return p.set(rad*Math.cos(t),q*Math.sin(h),rad*Math.sin(t))}
function mobiusBand(reverse=false){
  const width=.5,radius=1.58,geo=new ParametricGeometry((u,v,p)=>twistPoint(u*Math.PI*2,(v-.5)*width,1,radius,p),260,12),g=surfacePair(geo,true),edge=[];
  for(let i=0;i<N*2;i++)edge.push(twistPoint(i/(N*2)*Math.PI*4,width/2,1,radius,new THREE.Vector3()));g.add(tube(edge));if(reverse)g.rotation.z=Math.PI;return g;
}
function kleinPoint(u,v,p=new THREE.Vector3()){
  let x,y,z;
  if(u<Math.PI){
    x=3*Math.cos(u)*(1+Math.sin(u))+2*(1-Math.cos(u)/2)*Math.cos(u)*Math.cos(v);
    z=-8*Math.sin(u)-2*(1-Math.cos(u)/2)*Math.sin(u)*Math.cos(v);
  }else{
    x=3*Math.cos(u)*(1+Math.sin(u))+2*(1-Math.cos(u)/2)*Math.cos(v+Math.PI);
    z=-8*Math.sin(u);
  }
  y=-2*(1-Math.cos(u)/2)*Math.sin(v);
  return p.set(x*.43,y*.43,z*.43);
}
function kleinBottle(){
  const geo=new ParametricGeometry((u,v,p)=>kleinPoint(u*Math.PI*2,v*Math.PI*2,p),180,70),g=surfacePair(geo,true);
  for(let j=0;j<6;j++){const pts=[],v=j/6*Math.PI*2;for(let i=0;i<N;i++)pts.push(kleinPoint(i/N*Math.PI*2,v));g.add(tube(pts,EDGE*.65,true,gridMat))}
  for(let j=0;j<5;j++){const pts=[],u=j/5*Math.PI*2;for(let i=0;i<N;i++)pts.push(kleinPoint(u,i/N*Math.PI*2));g.add(tube(pts,EDGE*.55,true,gridMat))}
  g.rotation.x=.08;return g;
}
function torusPoint(u,v,p=new THREE.Vector3()){const R=2.2,r=.76,rr=R+r*Math.cos(v);return p.set(rr*Math.cos(u),r*Math.sin(v),rr*Math.sin(u))}
function torusSurface(){
  const geo=new ParametricGeometry((u,v,p)=>torusPoint(u*Math.PI*2,v*Math.PI*2,p),180,54),g=surfacePair(geo,false);
  for(let j=0;j<7;j++){const pts=[],u=j/7*Math.PI*2;for(let i=0;i<N;i++)pts.push(torusPoint(u,i/N*Math.PI*2));g.add(tube(pts,EDGE*.55,true,gridMat))}
  for(let j=0;j<10;j++){const pts=[],v=j/10*Math.PI*2;for(let i=0;i<N;i++)pts.push(torusPoint(i/N*Math.PI*2,v));g.add(tube(pts,EDGE*.45,true,gridMat))}
  return g;
}
function cylinderPoint(u,v,p=new THREE.Vector3()){const x=(u-.5)*5.1,a=v*Math.PI*2;return p.set(x,1.38*Math.cos(a),1.38*Math.sin(a))}
function cylinderSurface(){
  const geo=new ParametricGeometry((u,v,p)=>cylinderPoint(u,v,p),90,48),g=surfacePair(geo,false);
  for(const x of [0,1]){const pts=[];for(let i=0;i<N;i++)pts.push(cylinderPoint(x,i/N));g.add(tube(pts))}
  for(let j=0;j<7;j++){const pts=[],v=j/7;for(let i=0;i<N;i++)pts.push(cylinderPoint(i/(N-1),v));g.add(tube(pts,EDGE*.4,false,gridMat))}
  g.rotation.y=.18;return g;
}
function flatRectangle(){
  const geo=new THREE.PlaneGeometry(6.2,3.8,1,1),g=surfacePair(geo,false),corners=[new THREE.Vector3(-3.1,-1.9,0),new THREE.Vector3(3.1,-1.9,0),new THREE.Vector3(3.1,1.9,0),new THREE.Vector3(-3.1,1.9,0)];for(let i=0;i<4;i++)g.add(tube([corners[i],corners[(i+1)%4]],EDGE,false));
  for(let i=1;i<6;i++)g.add(tube([new THREE.Vector3(-3.1+i*6.2/6,-1.9,0),new THREE.Vector3(-3.1+i*6.2/6,1.9,0)],EDGE*.35,false,gridMat));
  for(let i=1;i<4;i++)g.add(tube([new THREE.Vector3(-3.1,-1.9+i*3.8/4,0),new THREE.Vector3(3.1,-1.9+i*3.8/4,0)],EDGE*.35,false,gridMat));
  return g;
}
function makePerson(){const mat=new THREE.MeshStandardMaterial({color:0x171717,roughness:.8}),g=new THREE.Group(),body=new THREE.Mesh(new THREE.ConeGeometry(.17,.47,24),mat),head=new THREE.Mesh(new THREE.SphereGeometry(.145,22,16),mat);body.position.y=.26;head.position.y=.65;g.add(body,head);return g}

let trefoilFrameCache=null;
function trefoilSurfaceNormal(t){
  if(!trefoilFrameCache){const curve=new THREE.CatmullRomCurve3(trefoilPoints(),true,'centripetal');trefoilFrameCache={curve,frames:curve.computeFrenetFrames(N,true)}}
  const i=Math.min(N,Math.round(t*N)),frames=trefoilFrameCache.frames,angle=Math.PI*t;
  const across=frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(angle));
  return new THREE.Vector3().crossVectors(frames.tangents[i],across).normalize();
}
function kleinSurfaceNormal(t){
  const u=t*Math.PI*2,e=.001,p=kleinPoint(u,0,new THREE.Vector3()),pu=kleinPoint((u+e)%(Math.PI*2),0,new THREE.Vector3()).sub(p),pv=kleinPoint(u,e,new THREE.Vector3()).sub(p);
  return new THREE.Vector3().crossVectors(pu,pv).normalize();
}

function guidePoint(t,p=new THREE.Vector3()){
  if(level===1)return trefoilPoint(t*Math.PI*2,p);
  if(level===2)return kleinPoint(t*Math.PI*2,0,p);
  if(stage===0)return torusPoint(0,t*Math.PI*2,p);
  return cylinderPoint(t,.04,p);
}
function guideNormal(t){
  if(level===1)return trefoilSurfaceNormal(t).multiplyScalar(-1);
  if(level===2)return kleinSurfaceNormal(t);
  if(stage===0)return new THREE.Vector3(Math.cos(t*Math.PI*2),Math.sin(t*Math.PI*2),0).normalize();
  return new THREE.Vector3(0,Math.cos(.08*Math.PI),Math.sin(.08*Math.PI)).normalize();
}
function personPose(t){const p=guidePoint(t,new THREE.Vector3()),normal=guideNormal(t);person.visible=true;person.position.copy(p).addScaledVector(normal,-.025);person.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal)}
function makeModel(){if(level===1)return spatialRibbon(trefoilPoints(),.58,1);if(level===2)return kleinBottle();if(stage===0)return torusSurface();return cylinderSurface()}
function rebuildGuide(){
  if(guide)root.remove(guide);const pts=[];for(let i=0;i<=N;i++)pts.push(guidePoint(i/N,new THREE.Vector3()));guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),guideMat);guide.computeLineDistances();root.add(guide)
}
function buildScene(){if(model)root.remove(model);model=makeModel();root.add(model);rebuildGuide();if(!person)person=makePerson();if(person.parent!==root)root.add(person);personPose(0)}
function makeResult(){
  const g=new THREE.Group();
  if(level===1){const eight=spatialRibbon(figureEightPoints(),.3,1);eight.rotation.x=.12;g.add(eight)}
  if(level===2){const a=mobiusBand(false),b=mobiusBand(false);a.position.x=-1.75;b.position.x=1.75;a.rotation.set(.55,.28,.2);b.rotation.set(.42,-.5,-.25);g.add(a,b)}
  if(level===3){const rect=flatRectangle();rect.rotation.x=-.28;g.add(rect)}
  g.position.y=.45;return g;
}
function addCutSegment(a,b){const m=a.clone().lerp(b,.5);cutGroup.add(tube([a,m,b],CUT,false))}
function clearCuts(){while(cutGroup.children.length){const item=cutGroup.children.pop();item.geometry?.dispose()}}
function advanceTorus(){stage=1;progress=0;direction=0;stopCutting();clearCuts();document.body.classList.add('phase-one');document.getElementById('before-fact').textContent='第二刀：沿纬线方向剪开';buildScene();resize()}
function makeRewardConfetti(){const colors=['#171717','#dedede','#f3bfd0','#b8ddf3','#bfe1bd','#f4df94'];rewardConfetti.innerHTML='';for(let i=0;i<64;i++){const piece=document.createElement('i'),angle=Math.random()*Math.PI*2,distance=150+Math.random()*330;piece.className='reward-piece';piece.style.setProperty('--x',`${Math.cos(angle)*distance}px`);piece.style.setProperty('--y',`${Math.sin(angle)*distance+120}px`);piece.style.setProperty('--r',`${Math.round(Math.random()*900-450)}deg`);piece.style.setProperty('--delay',`${Math.random()*.18}s`);piece.style.setProperty('--color',colors[i%colors.length]);rewardConfetti.appendChild(piece)}}
function showReward(){makeRewardConfetti();reward.hidden=false;rewardClose.focus()}
function closeReward(){reward.hidden=true;rewardConfetti.innerHTML='';canvas.focus()}
function complete(){finished=true;direction=0;stopCutting();clearCuts();localStorage.setItem('paper-stripe-walker-step',String(Math.min(8,level+6)));document.body.classList.remove('phase-one');document.body.classList.add('finished');root.remove(model,guide,person);resultRoot=makeResult();resultRoot.scale.setScalar(.82);root.add(resultRoot);reveal=0;resize();setTimeout(showReward,260)}
function reset(){closeReward();stopCutting();cuttingAudio.currentTime=0;document.body.classList.remove('finished','phase-one');if(resultRoot){root.remove(resultRoot);resultRoot=null}if(person){person.removeFromParent();person=null}clearCuts();stage=0;progress=0;direction=0;finished=false;reveal=0;document.getElementById('before-fact').textContent=config.before;buildScene();resize()}

const cuttingAudio=new Audio('./scissors.mp3');cuttingAudio.preload='auto';cuttingAudio.loop=true;cuttingAudio.volume=.42;cuttingAudio.load();
function playCutting(){if(cuttingAudio.paused)cuttingAudio.play().catch(()=>{})}function stopCutting(){cuttingAudio.pause()}
function setDirection(n){if(finished)return;direction=n;playCutting()}function stopDirection(n){if(direction===n)direction=0;if(!direction)stopCutting()}
addEventListener('keydown',e=>{if(!reward.hidden&&(e.key==='Escape'||e.key==='Enter')){e.preventDefault();closeReward();return}if(e.key==='ArrowLeft'){e.preventDefault();setDirection(-1)}if(e.key==='ArrowRight'){e.preventDefault();setDirection(1)}if(e.key.toLowerCase()==='r')reset()});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft')stopDirection(-1);if(e.key==='ArrowRight')stopDirection(1)});
let touchCutDirection=0;
function beginTouchCut(e){if(e.pointerType==='mouse'||finished)return;e.preventDefault();touchCutDirection=e.clientX<innerWidth/2?-1:1;controls.enabled=false;setDirection(touchCutDirection);canvas.setPointerCapture?.(e.pointerId)}
function endTouchCut(e){if(e.pointerType==='mouse'||!touchCutDirection)return;e.preventDefault();stopDirection(touchCutDirection);touchCutDirection=0;controls.enabled=true;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId)}
canvas.addEventListener('pointerdown',beginTouchCut,{passive:false});canvas.addEventListener('pointerup',endTouchCut,{passive:false});canvas.addEventListener('pointercancel',endTouchCut,{passive:false});canvas.addEventListener('contextmenu',e=>{if(matchMedia('(pointer:coarse)').matches)e.preventDefault()});
document.getElementById('restart').addEventListener('click',reset);
rewardClose.addEventListener('click',closeReward);reward.addEventListener('click',e=>{if(e.target===reward)closeReward()});
document.getElementById('continue-cut').addEventListener('click',()=>{if(level===3&&stage===1&&!finished){direction=1;playCutting()}});
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;renderer.setSize(w,h,false);let viewH=finished?9.4:8,viewW=viewH*aspect,minW=finished?12.4:8;if(viewW<minW){viewW=minW;viewH=viewW/aspect}camera.left=-viewW/2;camera.right=viewW/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
addEventListener('resize',resize);buildScene();resize();
function animate(t){requestAnimationFrame(animate);const dt=Math.min(35,t-last||16);last=t;if(direction&&!finished){const old=progress;progress=Math.max(0,Math.min(1,progress+direction*dt*.00039));if(Math.abs(progress-old)>.00001)addCutSegment(guidePoint(old,new THREE.Vector3()),guidePoint(progress,new THREE.Vector3()));personPose(progress);if(progress>=.999){if(level===3&&stage===0)advanceTorus();else complete()}}if(resultRoot){reveal+=(1-reveal)*.035;resultRoot.scale.setScalar(.82+.18*reveal)}controls.update();renderer.render(scene,camera)}animate();
