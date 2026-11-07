import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ParametricGeometry} from 'three/addons/geometries/ParametricGeometry.js';

const canvas=document.getElementById('stage'),scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);camera.position.set(0,3.4,10.8);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enableZoom=false;controls.enablePan=false;controls.update();
scene.add(new THREE.AmbientLight(0xffffff,2.1));const light=new THREE.DirectionalLight(0xffffff,2.7);light.position.set(5,7,8);scene.add(light);

const requestedColor=new URLSearchParams(location.search).get('color');
const selectedColor=/^[0-9a-fA-F]{6}$/.test(requestedColor||'')?parseInt(requestedColor,16):0xd9d9d9;
const requestedSound=new URLSearchParams(location.search).get('sound');
const rainEnabled=requestedSound!=='off',soundQuery=rainEnabled?'on':'off';
const rainAudio=new Audio('https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3');
rainAudio.preload='metadata';rainAudio.loop=true;rainAudio.volume=.15;
function startRain(){if(rainEnabled&&rainAudio.paused)rainAudio.play().catch(()=>{})}
addEventListener('pointerdown',startRain,{once:true});addEventListener('keydown',startRain,{once:true});
document.querySelectorAll('[data-color-link]').forEach(link=>{const url=new URL(link.href);url.searchParams.set('color',selectedColor.toString(16).padStart(6,'0'));url.searchParams.set('sound',soundQuery);link.href=url.toString()});
const R=3.15,W=1.35,N=240,EDGE_R=.022,CUT_R=.011;
const frontMat=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.FrontSide}),backMat=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide}),edgeMat=new THREE.MeshBasicMaterial({color:0x111111});
const uncutMat=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.DoubleSide});
const guideMat=new THREE.LineDashedMaterial({color:0x111111,dashSize:.09,gapSize:.075,transparent:true,opacity:.92});
const root=new THREE.Group();scene.add(root);

function mobiusGeometry(){return new ParametricGeometry((u,v,p)=>{const t=u*Math.PI*2,q=(v-.5)*W,rad=R+q*Math.cos(t/2);p.set(rad*Math.cos(t),q*Math.sin(t/2),rad*Math.sin(t))},280,18)}
function mobiusBoundary(){const points=[];for(let i=0;i<N*2;i++){const t=i/(N*2)*Math.PI*4,q=W/2,rad=R+q*Math.cos(t/2);points.push(new THREE.Vector3(rad*Math.cos(t),q*Math.sin(t/2),rad*Math.sin(t)))}return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'centripetal'),N*2,EDGE_R,6,true),edgeMat)}
function addColoredSurface(group,geo){group.add(new THREE.Mesh(geo,frontMat),new THREE.Mesh(geo,backMat))}
function makeMobius(){const g=new THREE.Group(),geo=mobiusGeometry();g.add(new THREE.Mesh(geo,uncutMat),mobiusBoundary());return g}
let strip=makeMobius();root.add(strip);

function centerPoints(count=N){const p=[];for(let i=0;i<=count;i++){const t=i/count*Math.PI*2;p.push(new THREE.Vector3(R*Math.cos(t),0,R*Math.sin(t)))}return p}
const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(centerPoints()),guideMat);guide.computeLineDistances();root.add(guide);
const cutGroup=new THREE.Group(),cutMeshes=new Array(N).fill(null);root.add(cutGroup);
function addCut(i){if(cutMeshes[i])return;const a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2,m=(a+b)/2,pts=[new THREE.Vector3(R*Math.cos(a),0,R*Math.sin(a)),new THREE.Vector3(R*Math.cos(m),0,R*Math.sin(m)),new THREE.Vector3(R*Math.cos(b),0,R*Math.sin(b))],mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),3,CUT_R,6,false),edgeMat);cutMeshes[i]=mesh;cutGroup.add(mesh)}
function clearCuts(){for(let i=0;i<N;i++){if(cutMeshes[i]){cutGroup.remove(cutMeshes[i]);cutMeshes[i].geometry.dispose();cutMeshes[i]=null}}}

const skinMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:.82}),bodyMat=new THREE.MeshStandardMaterial({color:0x262626,roughness:.72});
function makePerson(){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.ConeGeometry(.18,.48,24),bodyMat),head=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),skinMat);body.position.y=.27;head.position.y=.66;g.add(body,head);g.scale.setScalar(.86);return g}
const person=makePerson();root.add(person);

let angle=0,direction=0,finished=false,last=0,cutCount=0,result=null,reveal=0,unfold=0;const cut=new Array(N).fill(false),up=new THREE.Vector3(0,1,0);
function updatePerson(){const t=angle,p=new THREE.Vector3(R*Math.cos(t),0,R*Math.sin(t)),tangent=new THREE.Vector3(-Math.sin(t),0,Math.cos(t)),widthDir=new THREE.Vector3(Math.cos(t/2)*Math.cos(t),Math.sin(t/2),Math.cos(t/2)*Math.sin(t)),normal=new THREE.Vector3().crossVectors(tangent,widthDir).normalize();person.position.copy(p).addScaledVector(normal,.075);person.quaternion.setFromUnitVectors(up,normal)}
updatePerson();

const cuttingAudio=new Audio('https://sfxmint.com/dl/scissors-snip-07.mp3');cuttingAudio.preload='auto';cuttingAudio.loop=true;cuttingAudio.volume=.42;
function playCutting(){if(cuttingAudio.paused)cuttingAudio.play().catch(()=>{})}
function stopCutting(){cuttingAudio.pause()}

function resultPoint(t,q,morph,p){const offset=W/4,ri=R+offset*Math.cos(t/2)+q*Math.cos(t),x0=ri*Math.cos(t),y0=offset*Math.sin(t/2)+q*Math.sin(t),z0=ri*Math.sin(t),theta=t/2,A=5.15,B=2.25,c=Math.cos(theta),s=Math.sin(theta),twist=Math.cos(t),lift=Math.sin(t),x1=A*c+q*twist*c,y1=q*lift,z1=B*s+q*twist*s;p.set(THREE.MathUtils.lerp(x0,x1,morph),THREE.MathUtils.lerp(y0,y1,morph),THREE.MathUtils.lerp(z0,z1,morph))}
function resultGeometry(morph=0){const width=W/2;return new ParametricGeometry((u,v,p)=>resultPoint(u*Math.PI*4,(v-.5)*width,morph,p),420,14)}
function resultEdge(sign,morph=0){const width=W/2,q=sign*width/2,pts=[];for(let i=0;i<N*2;i++){const p=new THREE.Vector3();resultPoint(i/(N*2)*Math.PI*4,q,morph,p);pts.push(p)}return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true,'centripetal'),N*2,EDGE_R,6,true),edgeMat)}
function makeResult(){const g=new THREE.Group(),geo=resultGeometry(0),front=new THREE.Mesh(geo,frontMat),back=new THREE.Mesh(geo,backMat),edgeA=resultEdge(1,0),edgeB=resultEdge(-1,0);g.add(front,back,edgeA,edgeB);g.userData={front,back,edgeA,edgeB,morph:0};g.scale.setScalar(.78);return g}
function updateResult(morph){const d=result.userData,geo=resultGeometry(morph),edgeA=resultEdge(1,morph),edgeB=resultEdge(-1,morph);d.front.geometry.dispose();d.edgeA.geometry.dispose();d.edgeB.geometry.dispose();d.front.geometry=geo;d.back.geometry=geo;result.remove(d.edgeA,d.edgeB);d.edgeA=edgeA;d.edgeB=edgeB;result.add(edgeA,edgeB);d.morph=morph}
function complete(){finished=true;direction=0;stopCutting();document.body.classList.add('finished');root.remove(strip,guide,cutGroup,person);result=makeResult();root.add(result);reveal=0;unfold=0;resize()}
function reset(){document.body.classList.remove('finished');stopCutting();cuttingAudio.currentTime=0;if(result){root.remove(result);result=null}clearCuts();strip=makeMobius();root.add(strip,guide,cutGroup,person);angle=0;direction=0;finished=false;cutCount=0;reveal=0;unfold=0;cut.fill(false);updatePerson();resize()}
document.getElementById('restart').addEventListener('click',reset);
function setDirection(n){if(finished)return;direction=n;playCutting()}
function stopDirection(n){if(direction===n)direction=0;if(!direction)stopCutting()}
addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();setDirection(-1)}if(e.key==='ArrowRight'){e.preventDefault();setDirection(1)}if(e.key.toLowerCase()==='r')reset()});addEventListener('keyup',e=>{if(e.key==='ArrowLeft')stopDirection(-1);if(e.key==='ArrowRight')stopDirection(1)});
let touchCutDirection=0;
function beginTouchCut(e){if(e.pointerType==='mouse'||finished)return;e.preventDefault();touchCutDirection=e.clientX<innerWidth/2?-1:1;controls.enabled=false;setDirection(touchCutDirection);canvas.setPointerCapture?.(e.pointerId)}
function endTouchCut(e){if(e.pointerType==='mouse'||!touchCutDirection)return;e.preventDefault();stopDirection(touchCutDirection);touchCutDirection=0;controls.enabled=true;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId)}
canvas.addEventListener('pointerdown',beginTouchCut,{passive:false});canvas.addEventListener('pointerup',endTouchCut,{passive:false});canvas.addEventListener('pointercancel',endTouchCut,{passive:false});canvas.addEventListener('contextmenu',e=>{if(matchMedia('(pointer:coarse)').matches)e.preventDefault()});

function resize(){const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio||1,2),aspect=w/h,minW=finished?13.5:8;renderer.setPixelRatio(d);renderer.setSize(w,h,false);let viewH=finished?9:8,viewW=viewH*aspect;if(viewW<minW){viewW=minW;viewH=viewW/aspect}camera.left=-viewW/2;camera.right=viewW/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
function animate(t){requestAnimationFrame(animate);const dt=Math.min(35,t-last||16);last=t;if(direction&&!finished){angle+=direction*dt*.00245;angle=(angle%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const idx=Math.floor(angle/(Math.PI*2)*N)%N;let fresh=0;for(let d=-2;d<=2;d++){const j=(idx+d+N)%N;if(!cut[j]){cut[j]=true;addCut(j);cutCount++;fresh++}}if(fresh&&cutCount>=N-2)complete();updatePerson()}if(finished&&result){reveal+=(1-reveal)*.025;if(reveal>.8)unfold+=(1-unfold)*.018;if(unfold-result.userData.morph>.012||(unfold>.995&&result.userData.morph<.999))updateResult(unfold);const s=.78+.22*reveal;result.scale.setScalar(s);result.rotation.y=.18*(1-reveal)}controls.update();renderer.render(scene,camera)}animate();
