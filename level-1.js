import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ParametricGeometry} from 'three/addons/geometries/ParametricGeometry.js';

const canvas=document.getElementById('stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);

// 正交相机：保留三维遮挡和边缘，但不产生近大远小，呈现“3D 伪 2D”。
const camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);
camera.position.set(0,3.1,10.5);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enableZoom=false;controls.enablePan=false;controls.update();

const ambient=new THREE.AmbientLight(0xffffff,2.2);scene.add(ambient);
const keyLight=new THREE.DirectionalLight(0xffffff,2.8);keyLight.position.set(4,7,8);scene.add(keyLight);

const requestedColor=new URLSearchParams(location.search).get('color');
const selectedColor=/^[0-9a-fA-F]{6}$/.test(requestedColor||'')?parseInt(requestedColor,16):0xf2d9e0;
const requestedSound=new URLSearchParams(location.search).get('sound');
const rainEnabled=requestedSound!=='off',soundQuery=rainEnabled?'on':'off';
const rainAudio=new Audio('https://cdn.pixabay.com/download/audio/2025/04/19/audio_8eaa8ce06b.mp3?filename=dragon-studio-rain-falling-30-seconds-329727.mp3');
rainAudio.preload='metadata';rainAudio.loop=true;rainAudio.volume=.15;
function startRain(){if(rainEnabled&&rainAudio.paused)rainAudio.play().catch(()=>{})}
addEventListener('pointerdown',startRain,{once:true});addEventListener('keydown',startRain,{once:true});
document.querySelectorAll('[data-color-link]').forEach(link=>{const url=new URL(link.href);url.searchParams.set('color',selectedColor.toString(16).padStart(6,'0'));url.searchParams.set('sound',soundQuery);link.href=url.toString()});
const R=3.2,BAND_W=1.25,N=240,SPLIT_DISTANCE=1.8,EDGE_R=.022,CUT_R=.011,PAPER_T=.08;
const paperFrontMat=new THREE.MeshBasicMaterial({color:selectedColor,side:THREE.FrontSide});
const paperBackMat=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.BackSide});
const sectionMat=new THREE.MeshBasicMaterial({color:0xe9e9e6,side:THREE.DoubleSide});
const edgeMat=new THREE.MeshBasicMaterial({color:0x111111});
const guideMat=new THREE.LineDashedMaterial({color:0x111111,dashSize:.09,gapSize:.075,transparent:true,opacity:.95});
const cutMat=new THREE.LineBasicMaterial({color:0x111111});
const ringRoot=new THREE.Group();scene.add(ringRoot);

// 半径与 v 无关，因此纸带上下两条边的直径严格一致。
function makeRingGeometry(width=BAND_W){return new ParametricGeometry((u,v,target)=>{const a=u*Math.PI*2;target.set(Math.cos(a)*R,(v-.5)*width,Math.sin(a)*R)},240,10)}
function circlePoints(y=0,r=R+.006,count=N){const points=[];for(let i=0;i<=count;i++){const a=i/count*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r))}return points}
function thickEdge(y,radius=R,tubeRadius=EDGE_R){const points=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius))}const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');return new THREE.Mesh(new THREE.TubeGeometry(curve,N,tubeRadius,6,true),edgeMat)}
function makeRing(width=BAND_W){const geo=makeRingGeometry(width),group=new THREE.Group();group.add(new THREE.Mesh(geo,paperFrontMat),new THREE.Mesh(geo,paperBackMat),thickEdge(width/2),thickEdge(-width/2));return group}
function crossSection(y){const group=new THREE.Group(),face=new THREE.Mesh(new THREE.RingGeometry(R-PAPER_T/2,R+PAPER_T/2,N),sectionMat);face.rotation.x=-Math.PI/2;face.position.y=y;group.add(face,thickEdge(y,R-PAPER_T/2,EDGE_R*.52),thickEdge(y,R+PAPER_T/2,EDGE_R*.52));return group}
let wholeRing=makeRing();ringRoot.add(wholeRing);

const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePoints()),guideMat);guide.computeLineDistances();ringRoot.add(guide);
const cutGroup=new THREE.Group(),cutMeshes=new Array(N).fill(null);ringRoot.add(cutGroup);

// 极简 3D 小人：只有球形头和圆锥身体。局部 Y 轴始终对齐纸面的径向法线。
const skinMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:.8,metalness:0});
const bodyMat=new THREE.MeshStandardMaterial({color:0x202020,roughness:.72,metalness:0});
function makePerson(){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.ConeGeometry(.18,.48,24),bodyMat),head=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),skinMat);body.position.y=.27;head.position.y=.66;g.add(body,head);g.scale.setScalar(.86);return g}
const person=makePerson();ringRoot.add(person);

let angle=0,direction=0,finished=false,separation=0,last=0,cutCount=0,halves=null;
const cut=new Array(N).fill(false),radial=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
function updatePerson(){radial.set(Math.cos(angle),0,Math.sin(angle)).normalize();person.position.copy(radial).multiplyScalar(R+.075);person.quaternion.setFromUnitVectors(up,radial)}
function addCutSegment(i){if(cutMeshes[i])return;const a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2,m=(a+b)/2,r=R+.026,points=[new THREE.Vector3(r*Math.cos(a),0,r*Math.sin(a)),new THREE.Vector3(r*Math.cos(m),0,r*Math.sin(m)),new THREE.Vector3(r*Math.cos(b),0,r*Math.sin(b))],curve=new THREE.CatmullRomCurve3(points),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,3,CUT_R,6,false),edgeMat);cutMeshes[i]=mesh;cutGroup.add(mesh)}
function clearCut(){for(let i=0;i<N;i++){const mesh=cutMeshes[i];if(mesh){cutGroup.remove(mesh);mesh.geometry.dispose();cutMeshes[i]=null}}}
updatePerson();

const cuttingAudio=new Audio('https://sfxmint.com/dl/scissors-snip-07.mp3');cuttingAudio.preload='auto';cuttingAudio.loop=true;cuttingAudio.volume=.42;
function playCutting(){if(cuttingAudio.paused)cuttingAudio.play().catch(()=>{})}
function stopCutting(){cuttingAudio.pause()}

function setDirection(n){if(finished)return;direction=n;playCutting()}
function stopDirection(n){if(direction===n)direction=0;if(!direction)stopCutting()}
addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();setDirection(-1)}if(e.key==='ArrowRight'){e.preventDefault();setDirection(1)}if(e.key.toLowerCase()==='r')reset()});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft')stopDirection(-1);if(e.key==='ArrowRight')stopDirection(1)});

function complete(){finished=true;direction=0;stopCutting();document.body.classList.add('finished');ringRoot.position.y=.55;ringRoot.remove(wholeRing,guide,cutGroup,person);const halfW=BAND_W/2,top=makeRing(halfW),bottom=makeRing(halfW);top.position.y=BAND_W/4;bottom.position.y=-BAND_W/4;top.add(crossSection(-halfW/2));bottom.add(crossSection(halfW/2));ringRoot.add(top,bottom);halves={top,bottom};resize()}
function reset(){stopCutting();cuttingAudio.currentTime=0;document.body.classList.remove('finished');ringRoot.position.y=0;if(halves){ringRoot.remove(halves.top,halves.bottom);halves=null}clearCut();wholeRing=makeRing();ringRoot.add(wholeRing,guide,cutGroup,person);angle=0;direction=0;finished=false;separation=0;cutCount=0;cut.fill(false);updatePerson();resize()}
document.getElementById('restart').addEventListener('click',reset);

function resize(){const w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio||1,2),aspect=w/h;renderer.setPixelRatio(d);renderer.setSize(w,h,false);let viewH=finished?10.5:8,viewW=viewH*aspect;if(viewW<7.5){viewW=7.5;viewH=viewW/aspect}camera.left=-viewW/2;camera.right=viewW/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
function animate(t){requestAnimationFrame(animate);const dt=Math.min(35,t-last||16);last=t;
  if(direction&&!finished){angle+=direction*dt*.00245;angle=(angle%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const idx=Math.floor(angle/(Math.PI*2)*N)%N;let fresh=0;for(let d=-2;d<=2;d++){const j=(idx+d+N)%N;if(!cut[j]){cut[j]=true;addCutSegment(j);cutCount++;fresh++}}if(fresh&&cutCount>=N-2)complete();updatePerson()}
  if(finished&&halves){separation+=(1-separation)*.025;halves.top.position.y=BAND_W/4+SPLIT_DISTANCE*separation;halves.bottom.position.y=-BAND_W/4-SPLIT_DISTANCE*separation}
  controls.update();renderer.render(scene,camera)}animate();
