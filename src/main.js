
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { runProgram } from './language.js';
import { createIde } from './ide.js';
import { createDebuggerController } from './debugger.js';
import { CROPS, ROBOT_TYPES, MISSIONS, BUILDINGS, TECHNOLOGIES } from './data.js';
import { GRID_STEP, worldToCell, cellToWorld, findPath, buildBlockedCells } from './navigation.js';
import { updatePowerGrid, transferInventory, buildFarmTaskQueue, selectAgentForTask, stepConveyorNetwork } from './automation.js';
import { BIOMES, BIOME_ORDER, SEASONS, LAND_PARCELS, SEASON_LENGTH_SECONDS, WORLD_SCHEMA_VERSION, WEATHER_LABELS, advanceSeason, getSeasonWeather, getBiomeWeather, getBiomeUnlockState, unlockBiome, generateWorldMap, getEnvironmentEffects, waterCostForPlot, landParcelPlotPositions, purchaseLand } from './world.js';
let ide=null;
let activeBiome='meadow',worldSeed='legacy-meadow',generatedWorld=null;
const unlockedWorldBiomes=new Set(['meadow']);
const sensorNames=['can_harvest','can_plant','can_water','is_ready','get_water','get_coins','get_harvest','tile_state','count_ready','count_empty','front_is_clear','at_plot','distance_to_plot','has_water','get_energy','get_position','get_inventory','get_plant_age','scan','has_ready_plot','has_empty_plot','has_thirsty_plot'];
const root=document.querySelector('#game');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x9bc7c2); scene.fog=new THREE.Fog(0x9bc7c2,22,48);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100); camera.position.set(8,11,12);
let cameraYaw=.58,cameraPitch=.58,cameraDistance=16;
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.35)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12; renderer.domElement.style.imageRendering="pixelated"; renderer.domElement.style.touchAction="none"; root.appendChild(renderer.domElement);
let cameraPointer=null,lastPointerX=0,lastPointerY=0,pinchDistance=0;const activeCameraPointers=new Map();
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;activeCameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture?.(e.pointerId);if(activeCameraPointers.size===1){cameraPointer=e.pointerId;lastPointerX=e.clientX;lastPointerY=e.clientY;}else if(activeCameraPointers.size===2){cameraPointer=null;const pts=[...activeCameraPointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}});
renderer.domElement.addEventListener('pointermove',e=>{if(!activeCameraPointers.has(e.pointerId))return;const previous=activeCameraPointers.get(e.pointerId);activeCameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activeCameraPointers.size>=2){const pts=[...activeCameraPointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0&&distance>0)cameraDistance=THREE.MathUtils.clamp(cameraDistance*pinchDistance/distance,9,28);pinchDistance=distance;return;}if(cameraPointer!==e.pointerId)return;const dx=e.clientX-lastPointerX,dy=e.clientY-lastPointerY;lastPointerX=e.clientX;lastPointerY=e.clientY;cameraYaw-=dx*.008;cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.006,.22,.92);});
const releaseCameraPointer=e=>{activeCameraPointers.delete(e.pointerId);if(activeCameraPointers.size===1){const [id,point]=[...activeCameraPointers.entries()][0];cameraPointer=id;lastPointerX=point.x;lastPointerY=point.y;}else cameraPointer=null;if(activeCameraPointers.size<2)pinchDistance=0;};
renderer.domElement.addEventListener('pointerup',releaseCameraPointer);renderer.domElement.addEventListener('pointercancel',releaseCameraPointer);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.012,9,28);},{passive:false});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
scene.add(new THREE.HemisphereLight(0xe6f6d7,0x52613b,1.65));
const skyDay=new THREE.Color(0x9bc7c2),skyNight=new THREE.Color(0x18283c);
const sun=new THREE.DirectionalLight(0xffedc2,2.0);sun.position.set(-7,14,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;sun.shadow.bias=-0.00035;scene.add(sun);
const seasonSkyColors=Object.fromEntries(SEASONS.map(item=>[item.id,new THREE.Color(item.sky)]));
function pixelTexture(base,accent,seed=1){
 const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,64,64);
 let n=seed;const rnd=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
 for(let i=0;i<210;i++){x.fillStyle=accent;x.globalAlpha=.12+rnd()*.32;x.fillRect(Math.floor(rnd()*64),Math.floor(rnd()*64),1+Math.floor(rnd()*4),1+Math.floor(rnd()*3));}
 x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);return t;
}
const grassTex=pixelTexture('#719b55','#b6c879',12),soilTex=pixelTexture('#80563a','#c18a58',24);
const mat=(c,r=.85)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const grass=new THREE.MeshStandardMaterial({map:grassTex,roughness:1}),soil=new THREE.MeshStandardMaterial({map:soilTex,roughness:1}),soilDark=mat(0x563922),leaf=mat(0x5b9a43),gold=mat(0xeebc45),metal=mat(0xd5dfd1,.45),blue=mat(0x397f91,.55),dark=mat(0x20313a),white=mat(0xf2f1dc);
const biomeSoilMaterials=Object.fromEntries(Object.values(BIOMES).map(item=>[item.id,mat(item.soil)]));
const biomeTerrainMaterials=Object.fromEntries(Object.values(BIOMES).map(item=>[item.id,mat(item.terrain)]));
function box(parent,w,h,d,m,x,y,z){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const ground=box(scene,38,.4,38,grass,0,-.3,0);
const grid=new THREE.GridHelper(38,38,0x557b45,0x6f9656);grid.position.y=-.095;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
const startingWorldGroup=new THREE.Group();scene.add(startingWorldGroup);
// distant hills / trees
for(let i=0;i<22;i++){let a=i*Math.PI*2/22;let x=Math.cos(a)*15,z=Math.sin(a)*15;if(Math.abs(x)<8&&Math.abs(z)<8)continue;
let trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,1,7),mat(0x65452b));trunk.position.set(x,.35,z);startingWorldGroup.add(trunk);
let crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,1),mat(i%2?0x397348:0x4e8950));crown.position.set(x,1.25,z);crown.castShadow=true;startingWorldGroup.add(crown);}
const plots=[],ownedBiomes=new Set(['meadow']),landMeshes=new Map();
function createPlotAt(x,z,biome='meadow'){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 box(g,1.72,.24,1.72,biome==='meadow'?soil:(biomeSoilMaterials[biome]||soil),0,.12,0);
 box(g,1.78,.07,1.78,mat(0x5b402b),0,.025,0);
 for(let j=-1;j<=1;j++)box(g,1.5,.035,.035,soilDark,0,.25,j*.42);
 const crop=new THREE.Group();crop.position.y=.26;g.add(crop);
 const plot={g,crop,state:'empty',watered:false,waterSource:null,growth:0,cropType:'carrot',stage:0,biome};plots.push(plot);return plot;
}
function createBiomeDecorations(biomeId,centerX,centerZ){
 const corners=[[-3.65,-3.55],[-3.65,3.55],[3.65,-3.55],[3.65,3.55]];
 if(biomeId==='desert'){
  const cactusMat=mat(0x548653),spineMat=mat(0xd0d29a);
  for(const [dx,dz] of corners){
   const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.19,.9,7),cactusMat);trunk.position.set(centerX+dx,.45,centerZ+dz);scene.add(trunk);
   for(const side of [-1,1]){const arm=box(scene,.12,.42,.12,cactusMat,centerX+dx+side*.2,.48,centerZ+dz);arm.rotation.z=-side*.22;box(scene,.12,.12,.12,spineMat,centerX+dx+side*.2,.7,centerZ+dz);}
  }
 }else if(biomeId==='mountain'){
  const rockMat=mat(0x858a84);
  corners.forEach(([dx,dz],i)=>{const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.35+(i%2)*.12,0),rockMat);rock.position.set(centerX+dx,.22,centerZ+dz);rock.rotation.set(.2*i,.45*i,.12*i);rock.scale.set(1.3,.8,1);scene.add(rock);});
 }else if(biomeId==='snow'){
  const trunkMat=mat(0x6c5846),pineMat=mat(0x547d78),snowMat=mat(0xe7f1f2);
  for(const [dx,dz] of corners){
   const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.55,6),trunkMat);trunk.position.set(centerX+dx,.28,centerZ+dz);scene.add(trunk);
   for(let level=0;level<3;level++){const cone=new THREE.Mesh(new THREE.ConeGeometry(.42-level*.06,.72,7),level===2?snowMat:pineMat);cone.position.set(centerX+dx,.55+level*.36,centerZ+dz);cone.castShadow=true;scene.add(cone);}
  }
 }else if(biomeId==='tropical'){
  const trunkMat=mat(0x8d6540),palmMat=mat(0x3d995d);
  for(const [dx,dz] of corners){
   const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,1.35,7),trunkMat);trunk.position.set(centerX+dx,.67,centerZ+dz);trunk.rotation.z=-.12;scene.add(trunk);
   for(let i=0;i<6;i++){const angle=i*Math.PI/3,frond=box(scene,.14,.055,1.15,palmMat,centerX+dx+Math.cos(angle)*.48,1.42,centerZ+dz+Math.sin(angle)*.48);frond.rotation.y=angle;frond.rotation.x=-.38;}
  }
 }
}
function createBiomeLand(biomeId){
 const parcel=LAND_PARCELS[biomeId];if(!parcel||landMeshes.has(biomeId))return false;
 ownedBiomes.add(biomeId);
 const pad=box(scene,parcel.size,.12,parcel.size,biomeTerrainMaterials[biomeId],parcel.x,-.08,parcel.z);landMeshes.set(biomeId,pad);
 createBiomeDecorations(biomeId,parcel.x,parcel.z);
 for(const point of landParcelPlotPositions(biomeId))createPlotAt(point.x,point.z,biomeId);
 return true;
}
for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)createPlotAt(x*2.4,z*2.4,'meadow');

function clearStartingWorldGroup(){
 for(const child of [...startingWorldGroup.children]){
  child.traverse?.(object=>{if(object.geometry)object.geometry.dispose();});
  startingWorldGroup.remove(child);
 }
}
function addStartingTree(x,z,kind='tree'){
 const trunkColor=activeBiome==='volcanic'?0x383332:activeBiome==='snow'?0x6c5846:0x765338;
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.16,1.05,6),mat(trunkColor));
 trunk.position.set(x,.52,z);startingWorldGroup.add(trunk);
 if(kind==='palm'){
  const crown=mat(0x3d995d);
  for(let i=0;i<6;i++){const angle=i*Math.PI/3;const frond=new THREE.Mesh(new THREE.BoxGeometry(.13,.055,1.55),crown);frond.position.set(x+Math.cos(angle)*.45,1.18,z+Math.sin(angle)*.45);frond.rotation.y=angle;frond.rotation.x=-.38;startingWorldGroup.add(frond);}
 }else if(kind.includes('pine')||kind.includes('fir')){
  const leafMat=mat(activeBiome==='snow'?0x547d78:0x315c3c);
  for(let i=0;i<3;i++){const cone=new THREE.Mesh(new THREE.ConeGeometry(.58-i*.1,.95,7),leafMat);cone.position.set(x,.62+i*.44,z);cone.castShadow=true;startingWorldGroup.add(cone);}
 }else{
  const colors={forest:0x315b36,meadow:0x4e8950,tropical:0x2d7e48,swamp:0x506b43,volcanic:0x595247};
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(kind==='broadleaf'?1.05:.78,1),mat(colors[activeBiome]||0x4e8950));
  crown.position.set(x,1.25,z);crown.castShadow=true;startingWorldGroup.add(crown);
 }
}
function addStartingRock(x,z,kind='rock'){
 const color=activeBiome==='volcanic'?0x343034:activeBiome==='snow'?0x9cabb2:activeBiome==='desert'?0x9c8057:0x777b78;
 const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(kind==='cliff'?1.15:.62,0),mat(color));
 rock.position.set(x,.35,z);rock.scale.set(1.35,.8,1);rock.rotation.y=(x-z)*.17;rock.castShadow=true;startingWorldGroup.add(rock);
}
function createStartingWorldVisuals(map){
 clearStartingWorldGroup();
 const scale=1.15;
 for(const item of map.vegetation){
  const x=item.x*scale,z=item.z*scale;
  if(['cactus'].includes(item.type)){
   const cactusMat=mat(0x548653),body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,1.05,7),cactusMat);body.position.set(x,.53,z);startingWorldGroup.add(body);
   for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.48,6),cactusMat);arm.position.set(x+side*.23,.48,z);arm.rotation.z=-side*.45;startingWorldGroup.add(arm);}
  }else if(item.type.includes('shrub')||item.type.includes('grass')||item.type.includes('moss')||item.type==='mushroom'){
   const sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(.3,0),mat(item.type==='mushroom'?0xc66b54:0x64814a));sphere.position.set(x,.2,z);sphere.scale.set(1,.55,1);startingWorldGroup.add(sphere);
  }else addStartingTree(x,z,item.type);
 }
 for(const item of map.obstacles){
  const x=item.x*scale,z=item.z*scale;
  if(['river','deep-water','flood-zone','frozen-lake'].includes(item.type)){
   const waterMat=mat(activeBiome==='snow'?0x9ccbd8:0x397f8e,.35);
   const patch=new THREE.Mesh(new THREE.BoxGeometry(2.1,.035,1.2),waterMat);patch.position.set(x,-.075,z);patch.rotation.y=(x+z)*.12;startingWorldGroup.add(patch);
  }else if(['lava','crater','steam-vent','hot-rock'].includes(item.type)){
   const hot=mat(item.type==='lava'?0xe6572d:0x4b4240,.45);
   const patch=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,.12,7),hot);patch.position.set(x,.04,z);startingWorldGroup.add(patch);
   if(item.type==='steam-vent'){const steam=new THREE.Mesh(new THREE.ConeGeometry(.18,.65,6),mat(0xb9aaa0,.9));steam.position.set(x,.38,z);startingWorldGroup.add(steam);}
  }else if(['tree','dense-tree','fallen-tree','stump','thicket','reed-bed'].includes(item.type)){
   if(item.type==='stump'||item.type==='fallen-tree')addStartingRock(x,z,'rock');else addStartingTree(x,z,item.type.includes('pine')?'pine':item.type);
  }else addStartingRock(x,z,item.type==='cliff'||item.type==='ravine'?'cliff':'rock');
 }
 for(const item of map.resources){
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),mat(activeBiome==='volcanic'?0xe28a4b:activeBiome==='snow'?0x9be0e8:0xd7c478));
  marker.position.set(item.x*scale,.2,item.z*scale);startingWorldGroup.add(marker);
 }
 if(activeBiome==='swamp'||activeBiome==='tropical'){
  for(let i=0;i<7;i++){const x=(i-3)*3.2,z=(i%2? -13:13);const waterPatch=new THREE.Mesh(new THREE.BoxGeometry(2.2,.035,1.3),mat(0x397f8e,.35));waterPatch.position.set(x,-.075,z);startingWorldGroup.add(waterPatch);}
 }
}
function applyStartingBiome(biomeId,seed){
 const definition=BIOMES[biomeId]||BIOMES.meadow;
 activeBiome=definition.id;worldSeed=String(seed||'farmerbot-world-1');
 generatedWorld=generateWorldMap(worldSeed,activeBiome);
 ground.material=activeBiome==='meadow'?grass:(biomeTerrainMaterials[activeBiome]||grass);
 ground.material.needsUpdate=true;
 scene.background.setHex(definition.terrain);scene.fog.color.setHex(definition.terrain);
 for(const plot of plots){scene.remove(plot.g);plot.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 plots.length=0;
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)createPlotAt(x*2.4,z*2.4,activeBiome);
 createStartingWorldVisuals(generatedWorld);
 if(typeof robot!=='undefined')robot.position.set(0,0,7);
 if(typeof agents!=='undefined'&&agents[0])agents[0].mesh.position.set(0,0,7);
}

const particleGeo=new THREE.BoxGeometry(.075,.075,.075),particles=[];
function burst(pos,color=0xf2d36e,count=10){
 for(let i=0;i<count;i++){const q=new THREE.Mesh(particleGeo,new THREE.MeshBasicMaterial({color}));q.position.copy(pos);q.userData.v=new THREE.Vector3((Math.random()-.5)*2,1+Math.random()*1.8,(Math.random()-.5)*2);q.userData.life=.7+Math.random()*.2;scene.add(q);particles.push(q);}
}

const cropMaterialCache=new Map();
function cropMat(color){if(!cropMaterialCache.has(color))cropMaterialCache.set(color,mat(color));return cropMaterialCache.get(color);}
function makeCrop(plot){
 plot.crop.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
 plot.crop.clear();
 if(plot.state==='empty')return;
 const cfg=CROPS[plot.cropType]||CROPS.carrot;
 const progress=plot.state==='ready'?1:Math.min(1,plot.growth/(cfg.growTime||18));
 const h=(plot.state==='seed'?.16:.28+progress*.72);
 const stemMat=cropMat(cfg.leaf),fruitMat=cropMat(cfg.color),leafMat=stemMat;
 const mesh=(geo,m,x,y,z,scale=null)=>{const q=new THREE.Mesh(geo,m);q.position.set(x,y,z);if(scale)q.scale.set(...scale);q.castShadow=true;plot.crop.add(q);return q;};
 if(plot.state==='seed'){
   mesh(new THREE.SphereGeometry(.075,7,5),soilDark,0,.08,0);
   return;
 }
 const stem=mesh(new THREE.CylinderGeometry(.035,.06,h,7),stemMat,0,h/2,0);
 const leafCount=cfg.shape==='corn'||cfg.shape==='sunflower'?5:4;
 for(let k=0;k<leafCount;k++){
   const angle=k*Math.PI*2/leafCount;
   const l=mesh(new THREE.BoxGeometry(.28,.075,.12),leafMat,Math.cos(angle)*.16,h*(.28+k*.105),Math.sin(angle)*.16);
   l.rotation.y=angle;l.rotation.z=(k%2?1:-1)*.28;
 }
 if(progress>.42 || plot.state==='ready'){
   const y=h+.12;
   switch(cfg.shape){
    case 'root':
      mesh(new THREE.ConeGeometry(.19,.55,7),fruitMat,0,y-.16,0).rotation.z=Math.PI;
      break;
    case 'tuber':
      for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.16,8,6),fruitMat,(i-1)*.17,.13,Math.sin(i*2)*.1,[1.2,.8,1]);
      break;
    case 'tomato':
      for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.15,10,8),fruitMat,Math.sin(i*2.1)*.19,y+Math.cos(i*2.1)*.04,Math.cos(i*2.1)*.16);
      break;
    case 'corn':
      mesh(new THREE.CylinderGeometry(.11,.13,.48,8),fruitMat,.08,h*.62,.02).rotation.z=-.3;
      break;
    case 'berry':
      for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.105,9,7),fruitMat,Math.sin(i*2.1)*.17,.19,Math.cos(i*2.1)*.17,[.9,1.1,.9]);
      break;
    case 'eggplant':
      mesh(new THREE.SphereGeometry(.2,10,8),fruitMat,.08,h*.7,0,[.75,1.5,.7]).rotation.z=-.35;
      mesh(new THREE.ConeGeometry(.1,.18,5),leafMat,.08,h*.88,0);
      break;
    case 'cucumber':
      mesh(new THREE.CylinderGeometry(.09,.11,.52,8),fruitMat,.05,h*.75,0).rotation.z=-.28;
      break;
    case 'cabbage':
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(new THREE.SphereGeometry(.18,8,7),leafMat,Math.cos(a)*.13,.25,Math.sin(a)*.13,[1.1,.85,1]);}
      mesh(new THREE.SphereGeometry(.19,9,8),cropMat(0xb3d77a),0,.34,0);
      break;
    case 'pumpkin':
      mesh(new THREE.SphereGeometry(.28,12,9),fruitMat,0,.3,0,[1, .78,1]);
      for(let i=0;i<6;i++){const rib=mesh(new THREE.TorusGeometry(.22,.025,5,12),cropMat(0xc9792d),0,.3,0);rib.rotation.y=i*Math.PI/6;}
      mesh(new THREE.CylinderGeometry(.035,.055,.12,6),stemMat,0,.56,0);
      break;
    case 'sunflower':
      mesh(new THREE.SphereGeometry(.13,9,8),mat(0x754b26),0,h+.08,0);
      for(let i=0;i<10;i++){const a=i*Math.PI*2/10;mesh(new THREE.SphereGeometry(.075,7,6),cropMat(0xf4cb4f),Math.cos(a)*.2,h+.08,Math.sin(a)*.2,[.7,1.35,.7]);}
      break;
   }
 }
}
function setState(p,s){p.state=s;p.stage=s==='empty'?0:s==='seed'?1:s==='growing'?2:3;p.visualStage=-1;makeCrop(p);}
function plantPlot(plot,type='carrot',agent=selectedAgent){
 const crop=CROPS[type]?type:'carrot';
 if(!plot||plot.state!=='empty')return false;
 if(gameMode!=='sandbox'&&(seedStock[crop]||0)<=0){toast(`Нет семян: ${CROPS[crop].name}`);return false;}
 if(gameMode!=='sandbox')seedStock[crop]--;plot.cropType=crop;plot.growth=0;plot.watered=false;plot.waterSource=null;plot.stage=1;setState(plot,'seed');
 metrics.planted++;updateMissions();burst(plot.g.position.clone().add(new THREE.Vector3(0,.55,0)),0x9bcf65,8);
 renderSeedStock();saveGame();return true;
}
const robot=new THREE.Group();scene.add(robot);
const bodyPivot=new THREE.Group();bodyPivot.position.y=.78;robot.add(bodyPivot);
const body=box(bodyPivot,.72,.65,.62,blue,0,0,0);body.material=blue;
box(bodyPivot,.57,.32,.53,metal,0,.44,0);
const head=new THREE.Group();head.position.set(0,.77,.08);bodyPivot.add(head);
box(head,.66,.48,.5,metal,0,0,0);
box(head,.43,.13,.08,dark,0,.02,.27);
for(let x of [-.13,.13]){let eye=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),mat(0x8ce8fa,.2));eye.position.set(x,.03,.325);head.add(eye);}
const arms=[];
for(let x of [-.43,.43]){let pivot=new THREE.Group();pivot.position.set(x,.2,0);bodyPivot.add(pivot);let arm=box(pivot,.16,.48,.18,metal,0,-.2,0);arm.position.y=-.18;arms.push(pivot);}
const legs=[];
for(let x of [-.22,.22]){let pivot=new THREE.Group();pivot.position.set(x,-.27,0);robot.add(pivot);box(pivot,.19,.42,.22,dark,0,-.2,0);box(pivot,.25,.11,.34,metal,0,-.4,.07);legs.push(pivot);}
let antenna= new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.27,8),dark);antenna.position.set(0,.42,0);head.add(antenna);
let bulb=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),gold);bulb.position.set(0,.57,0);head.add(bulb);
robot.position.set(0,0,7);
let robotMoving=false,robotAction=0,robotAnimTime=0;
let coins=90,harvest=0,water=8,isLoadingGame=false;
let xp=0,researchPoints=0,weather='sunny',weatherClock=0,weatherStep=0,season='spring',seasonClock=0,dayClock=0,activeSeed='carrot',pumpBuilt=false,solarBuilt=false,storageBuilt=false,gameMode='campaign';
const seedStock={carrot:8,potato:2,tomato:2,corn:2,strawberry:2,eggplant:1,cucumber:2,cabbage:2,pumpkin:1,sunflower:1};
const harvestStorage={};
const metrics={planted:0,watered:0,harvested:0,earned:0,programs:0,tilesMoved:0,robots:1,botsProgrammed:0,programActions:0,waterUsed:0,waterEfficiency:0,cropTypes:0,sales:0};
const harvestedTypes=new Set();
const robotPrograms={
 farmbot:`# Универсальный фермер\nif can_plant():\n    plant("carrot")\nelif can_water():\n    water()\nelif can_harvest():\n    harvest()\n`
};
const agents=[];
function createAuxRobot(type,x,z){
 const cfg=ROBOT_TYPES[type],group=new THREE.Group(),bodyMat=mat(cfg.color,.52),trim=mat(0xd6e2d7,.42),visor=mat(0x17313b,.3);
 const make=(w,h,d,m,px,py,pz)=>box(group,w,h,d,m,px,py,pz);
 if(type==='dronebot'){
  make(.62,.22,.5,bodyMat,0,1.25,0);make(.34,.12,.35,trim,0,1.4,0);
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const arm=make(.68,.045,.07,trim,sx*.42,1.3,sz*.35);arm.rotation.y=sx*sz*.25;
   const rotor=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.07,8),visor);rotor.position.set(sx*.68,1.34,sz*.56);group.add(rotor);
   const blade=make(.58,.025,.07,mat(0x293a42),sx*.68,1.39,sz*.56);blade.userData.rotor=true;
  }
 }else{
  make(.72,.58,.62,bodyMat,0,.72,0);make(.58,.28,.52,trim,0,1.15,0);make(.48,.14,.06,visor,0,1.15,.3);
  for(const sx of [-1,1])for(const sz of [-1,1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.12,10),mat(0x26343b));wheel.rotation.z=Math.PI/2;wheel.position.set(sx*.39,.25,sz*.25);group.add(wheel);}
  if(type==='waterbot'){make(.2,.34,.22,mat(0x4cb8dd),-.42,.95,0);make(.12,.08,.12,trim,-.42,1.16,0);}
  if(type==='harvestbot'){make(.58,.28,.5,mat(0x85623d),0,1.15,-.43);make(.38,.14,.08,mat(0xe9b858),0,1.32,-.43);}
 }
 group.position.set(x,0,z);scene.add(group);
 return group;
}
agents.push({id:'farmbot',type:'farmbot',name:'FarmBot Basic',mesh:robot,energy:100,maxEnergy:100,speed:1,water:5,capacity:6,inventory:{},program:robotPrograms.farmbot,running:false,stopRequested:false,pauseRequested:false,resumeResolver:null,stepOnce:false,moving:false,actionBudget:0,tileBudget:0,level:1});
let selectedAgent=agents[0];
function createAgent(type){
 if(!ROBOT_TYPES[type]||agents.some(a=>a.type===type))return null;
 const cfg=ROBOT_TYPES[type],dock=baseDock({type}),x=dock.x,z=dock.z;
 const mesh=createAuxRobot(type,x,z);
 const a={id:type,type,name:cfg.name,mesh,energy:cfg.energy,maxEnergy:cfg.energy,speed:cfg.speed,water:cfg.water,capacity:type==='harvestbot'?18:type==='waterbot'?3:1,inventory:{},program:`# Программа ${cfg.name}\nscan()\n`,running:false,stopRequested:false,pauseRequested:false,resumeResolver:null,stepOnce:false,moving:false,actionBudget:0,tileBudget:0,level:1};
 agents.push(a);metrics.robots=agents.length;if(!isLoadingGame)updateMissions();renderFleetUI();return a;
}
function activeAgent(){return selectedAgent||agents[0];}
function addXP(amount){xp+=amount;researchPoints+=Math.max(0,Number(amount)||0);const newLevel=1+Math.floor(xp/100);if(newLevel>lastLevel){lastLevel=newLevel;toast(`⭐ Новый уровень фермы: ${newLevel}`);}stats();}
let lastLevel=1;
const equipmentMeshes={};
const buildings=[];
const powerLinks=[],conveyorLinks=[],automationLineMeshes=[];
let pendingAutomationLink=null,autoDispatchEnabled=false,taskQueue=[],dispatchClock=0,powerState={powered:new Map(),generation:0,consumption:0,stored:0,outages:0};
const researchedTechs=new Set();
let nextBuildingId=1,placingBuilding=null,previewMesh=null,placementRotation=0,challengeSeconds=180,challengeHarvested=0,challengeDone=false,challengeResult='';
let conveyorClock=0,chargerClock=0;
function buildEquipment(type){
 if(equipmentMeshes[type])return;
 const g=new THREE.Group();
 if(type==='pump'){
  const base=box(g,1.2,.35,1,mat(0x477f9e),0,.18,0);box(g,.5,.65,.5,mat(0x9bb5b7),0,.65,0);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.75,8),mat(0x4c9eb8));pipe.rotation.z=Math.PI/2;pipe.position.set(.58,.72,0);g.add(pipe);
  g.position.set(-8,0,7);
 }else if(type==='solar'){
  box(g,1.6,.12,1.1,mat(0x244d76),0,.6,0);
  for(let i=-2;i<=2;i++)box(g,.025,.025,1.1,mat(0x8bb9dc),i*.3,.67,0);
  g.position.set(0,0,6.2);
 }else{
  box(g,1.3,.8,1.2,mat(0x96774d),0,.4,0);box(g,.9,.45,.06,mat(0xd7c18d),0,.65,.62);g.position.set(8,0,7);
 }
 scene.add(g);equipmentMeshes[type]=g;
}

function createBuildingMesh(type,x,z,rotation=0,preview=false){
 const def=BUILDINGS[type];if(!def)return null;
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;
 if(preview){
  const material=new THREE.MeshStandardMaterial({color:0x9bd568,transparent:true,opacity:.48,roughness:.5,depthWrite:false});
  const footprint=new THREE.Mesh(new THREE.BoxGeometry(def.width,.14,def.depth),material);footprint.position.y=.08;g.add(footprint);g.userData.previewMaterial=material;
 }else if(type==='greenhouse'){
  const glass=new THREE.MeshStandardMaterial({color:0x8fd4df,transparent:true,opacity:.2,roughness:.25,metalness:.05,depthWrite:false});
  const frame=mat(0xd9e4cc,.55),floor=mat(0x876341);
  box(g,def.width,.12,def.depth,floor,0,.06,0);
  for(const sx of [-1,1])for(const sz of [-1,1])box(g,.09,1.45,.09,frame,sx*(def.width/2-.06),.79,sz*(def.depth/2-.06));
  for(const sx of [-1,1]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.035,1.35,def.depth-.12),glass);wall.position.set(sx*(def.width/2-.03),.78,0);g.add(wall);}
  for(const sz of [-1,1]){const wall=new THREE.Mesh(new THREE.BoxGeometry(def.width-.12,1.35,.035),glass);wall.position.set(0,.78,sz*(def.depth/2-.03));g.add(wall);}
  const roof=box(g,def.width+.12,.1,def.depth+.12,frame,0,1.55,0);roof.rotation.z=.12;
  box(g,.08,.34,def.depth+.08,frame,0,1.38,0);
 }else if(type==='tank'){
  const bodyMat=mat(0x4d8da0,.42),rim=mat(0xc6d9d2,.45);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.72,.78,1.65,12),bodyMat);body.position.y=.85;body.castShadow=true;g.add(body);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,.12,12),rim);top.position.y=1.7;g.add(top);
  const tap=box(g,.42,.12,.16,rim,.65,.55,.22);tap.rotation.z=.2;
 }else if(type==='solar_generator'){
  box(g,1.55,.12,1.05,mat(0x244d76),0,.55,0);
  for(let i=-2;i<=2;i++)box(g,.025,.025,1.05,mat(0x8bb9dc),i*.29,.62,0);
  box(g,.12,.62,.12,mat(0x687b75),0,.28,0);
 }else if(type==='wind_generator'){
  box(g,.16,2.15,.16,mat(0x9caeaa),0,1.05,0);
  const hub=new THREE.Group();hub.position.set(0,2.05,0);g.add(hub);
  const bladeMat=mat(0xe8eee0);
  for(let i=0;i<3;i++){const blade=box(hub,.16,.95,.09,bladeMat,0,.58,0);blade.rotation.z=i*Math.PI*2/3;}
  hub.userData.windHub=true;
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.19,8,7),mat(0x536b74));hub.add(cap);
 }else if(type==='battery'){
  box(g,1.12,.95,.9,mat(0x526b60),0,.5,0);box(g,.66,.62,.08,mat(0x9adf66),0,.56,.48);
  box(g,.24,.12,.12,mat(0x34443d),0,1.05,0);
 }else if(type==='power_pole'){
  box(g,.22,.16,.22,mat(0x6e7770),0,.08,0);box(g,.09,1.75,.09,mat(0x967c51),0,.92,0);
  box(g,.95,.08,.08,mat(0xb3b8a6),0,1.52,0);
  for(let x of [-.32,.32])box(g,.07,.18,.07,mat(0x526b60),x,1.42,0);
 }else if(type==='water_pump'){
  box(g,1.1,.4,.95,mat(0x477f9e),0,.22,0);box(g,.46,.78,.46,mat(0x9bb5b7),0,.78,0);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.7,8),mat(0x4c9eb8));pipe.rotation.z=Math.PI/2;pipe.position.set(.6,.9,0);g.add(pipe);
 }else if(type==='conveyor_splitter'||type==='conveyor_filter'||type==='conveyor_buffer'||type==='conveyor_storage'){
  const frame=mat(0x5b5140),belt=mat(0x343c37),accent=mat(type==='conveyor_splitter'?0xd3ad54:type==='conveyor_filter'?0x61a4b2:type==='conveyor_buffer'?0x8ea66c:0x96774d);
  box(g,def.width,.22,def.depth,frame,0,.28,0);box(g,def.width-.14,.06,def.depth-.16,belt,0,.42,0);box(g,.12,.48,.12,accent,0,.72,0);
  if(type==='conveyor_splitter'){box(g,.95,.08,.1,accent,0,.83,0);box(g,.1,.35,.1,accent,-.42,.7,.25);box(g,.1,.35,.1,accent,.42,.7,-.25);}
  if(type==='conveyor_filter'){box(g,.32,.18,.28,accent,0,.76,0);}
  if(type==='conveyor_buffer'||type==='conveyor_storage'){box(g,def.width*.68,.48,def.depth*.68,accent,0,.67,0);}
 }else if(type==='conveyor'){
  const frame=mat(0x5b5140),belt=mat(0x343c37),roller=mat(0xa9b5a2,.5);
  box(g,def.width,.22,def.depth,frame,0,.28,0);box(g,def.width-.15,.06,def.depth-.2,belt,0,.42,0);
  for(let x=-def.width/2+.2;x<def.width/2;x+=.32){const r=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,def.depth-.08,8),roller);r.rotation.x=Math.PI/2;r.position.set(x,.43,0);g.add(r);}
  for(const z of [-1,1])box(g,def.width,.16,.07,roller,0,.55,z*def.depth*.42);
 }else if(type==='charger'){
  const base=mat(0x344e58),glow=mat(0x9adf66,.35);
  const disk=new THREE.Mesh(new THREE.CylinderGeometry(.9,.95,.18,16),base);disk.position.y=.09;disk.castShadow=true;g.add(disk);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.08,16),glow);pad.position.y=.22;g.add(pad);
  for(let i=0;i<4;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.08,.35,.08),glow);p.position.set(Math.cos(i*Math.PI/2)*.72,.38,Math.sin(i*Math.PI/2)*.72);g.add(p);}
 }else if(type==='robot_station'){
  const shell=mat(0x657a79),accent=mat(0xd6b35f),screen=mat(0x1f3739,.25);
  box(g,1.85,1.45,1.35,shell,0,.73,0);box(g,1.1,.63,.08,screen,0,.96,.72);box(g,.22,.12,.1,accent,0,.3,.74);
  for(const x0 of [-.7,.7])box(g,.12,1.6,.12,accent,x0,.8,-.62);
 }
 scene.add(g);return g;
}
function renderLandMarket(){
 const list=$('#landMarket');if(!list)return;
 const info=$('#worldStatus'),seasonInfo=SEASONS.find(item=>item.id===season)||SEASONS[0];
 if(info)info.textContent=`${seasonInfo.icon} ${seasonInfo.name} · Погода: ${weather==='rain'?'дождь':weather==='drought'?'засуха':weather==='snow'?'снег':'ясно'} · Открыто участков: ${ownedBiomes.size}/5 · Всего грядок: ${plots.length}`;
 list.innerHTML=Object.values(LAND_PARCELS).map(parcel=>{const biome=BIOMES[parcel.biome],owned=ownedBiomes.has(parcel.biome),cost=gameMode==='sandbox'?0:biome.price;return `<div class="buildCard ${owned?'done':''}"><b>${biome.icon} ${biome.name}</b><small>${biome.growth<1?'Медленный рост':biome.growth>1?'Ускоренный рост':'Обычный рост'} · потребность в воде ×${biome.water.toFixed(2)}</small><small>${owned?'Открыто · 9 дополнительных грядок':`Цена участка: ${cost} 🪙`}</small><button data-buy-land="${parcel.biome}" ${owned?'disabled':''}>${owned?'ОТКРЫТО':'КУПИТЬ УЧАСТОК'}</button></div>`;}).join('');
 list.querySelectorAll('[data-buy-land]').forEach(button=>button.onclick=()=>buyLand(button.dataset.buyLand));
}
function buyLand(biomeId){
 const transaction=purchaseLand(biomeId,ownedBiomes,coins,gameMode);
 if(!transaction.ok){toast(transaction.reason==='already-owned'?'Этот участок уже открыт':transaction.reason==='insufficient-coins'?`Нужно ${transaction.cost} монет`:'Неизвестный участок');return;}
 coins=transaction.coins;createBiomeLand(biomeId);stats();renderBuildingUI();saveGame();toast(`${BIOMES[biomeId].name}: открыто 9 новых грядок!`);
}
function renderBuildingUI(){
 const catalog=$('#buildingCatalog'),placed=$('#placedBuildings');if(!catalog||!placed)return;
 catalog.innerHTML=Object.entries(BUILDINGS).map(([id,b])=>{
  const unlocked=isBuildingUnlocked(id),cost=gameMode==='sandbox'?0:b.cost;
  return `<div class="buildCard"><b>${b.icon} ${b.name}</b><small>${b.description}</small><small>Стоимость: ${cost} 🪙 ${unlocked?'':'· исследуй технологию'}</small><button data-build-select="${id}" ${unlocked?'':'disabled'}>РАЗМЕСТИТЬ</button></div>`;
 }).join('');
 placed.innerHTML=buildings.length?buildings.map(b=>{
  const def=BUILDINGS[b.type]||{},links=`${def.powerNode?` <button data-connect-power="${b.id}">⚡ КАБЕЛЬ</button>`:''}${def.logisticsNode?` <button data-connect-conveyor="${b.id}">⇢ ЛЕНТА</button>`:''}`;
  const status=def.powerNode&&def.powerRole==='consumer'?(b.powered?' · ⚡ ВКЛ':' · ⚠ НЕТ ПИТАНИЯ'):'';
  const filter=b.type==='conveyor_filter'?`<button data-filter-cycle="${b.id}">ФИЛЬТР: ${b.filterCrop||'all'}</button>`:'';
  return `<div class="buildingRow"><span>${def.icon||'🏗'} ${def.name||b.type}${status}</span><span>${filter}${links} <button data-building-move="${b.id}">↔ ПЕРЕМЕСТИТЬ</button> <button data-building-delete="${b.id}">✕</button></span></div>`;
 }).join(''):'<p class="muted">Пока нет размещённых построек.</p>';
 catalog.querySelectorAll('[data-build-select]').forEach(btn=>btn.onclick=()=>startBuildingPlacement(btn.dataset.buildSelect));
 placed.querySelectorAll('[data-building-move]').forEach(btn=>btn.onclick=()=>startBuildingPlacement(buildings.find(b=>b.id===Number(btn.dataset.buildingMove))?.type,Number(btn.dataset.buildingMove)));
 placed.querySelectorAll('[data-building-delete]').forEach(btn=>btn.onclick=()=>deleteBuilding(Number(btn.dataset.buildingDelete)));
 placed.querySelectorAll('[data-connect-power]').forEach(btn=>btn.onclick=()=>chooseAutomationLink('power',Number(btn.dataset.connectPower)));
 placed.querySelectorAll('[data-connect-conveyor]').forEach(btn=>btn.onclick=()=>chooseAutomationLink('conveyor',Number(btn.dataset.connectConveyor)));
 placed.querySelectorAll('[data-filter-cycle]').forEach(btn=>btn.onclick=()=>{
  const node=buildings.find(b=>b.id===Number(btn.dataset.filterCycle));if(!node)return;
  const crops=['all',...Object.keys(CROPS)],index=crops.indexOf(node.filterCrop||'all');node.filterCrop=crops[(index+1)%crops.length];renderBuildingUI();saveGame();
 });
 renderLandMarket();
}
function waterCapacity(){return 99+buildings.filter(b=>b.type==='tank').length*30;}
function isBuildingUnlocked(type){const def=BUILDINGS[type];return !!def&&(gameMode==='sandbox'||researchedTechs.has(def.unlock));}
function renderTechs(){
 const list=$('#techCatalog');if(!list)return;
 $('#researchSummary').textContent=`Очки исследований: ${researchPoints} · Монеты: ${coins} · Открыто технологий: ${researchedTechs.size}/${TECHNOLOGIES.length}`;
 list.innerHTML=TECHNOLOGIES.map(t=>{
  const done=researchedTechs.has(t.id),requirements=gameMode==='sandbox'||t.requires.every(r=>researchedTechs.has(r)),affordable=gameMode==='sandbox'||(researchPoints>=t.costXP&&coins>=t.costCoins);
  return `<div class="techCard ${done?'done':!requirements?'locked':''}"><b>${done?'✓':t.icon} ${t.name}</b><small>${t.description}</small><small>Цена: ${t.costXP} XP · ${t.costCoins} 🪙</small><small>${done?'Исследовано':requirements?'Готово к исследованию':`Нужно: ${t.requires.join(', ')}`}</small><button data-research="${t.id}" ${done||!requirements||(!affordable&&gameMode!=='sandbox')?'disabled':''}>${done?'ИЗУЧЕНО':'ИССЛЕДОВАТЬ'}</button></div>`;
 }).join('');
 list.querySelectorAll('[data-research]').forEach(btn=>btn.onclick=()=>researchTechnology(btn.dataset.research));
}
function researchTechnology(id){
 const tech=TECHNOLOGIES.find(t=>t.id===id);if(!tech||researchedTechs.has(id))return;
 if(gameMode!=='sandbox'&&!tech.requires.every(r=>researchedTechs.has(r))){toast('Сначала изучи необходимые технологии');return;}
 if(gameMode!=='sandbox'&&(researchPoints<tech.costXP||coins<tech.costCoins)){toast(`Нужно ${tech.costXP} XP и ${tech.costCoins} монет`);return;}
 if(gameMode!=='sandbox'){researchPoints-=tech.costXP;coins-=tech.costCoins;}
 researchedTechs.add(id);addXP(0);renderTechs();renderBuildingUI();stats();saveGame();toast(`🔬 Изучено: ${tech.name}`);
}
function startBuildingPlacement(type,moveId=null){
 if(!BUILDINGS[type])return;
 if(!moveId&&!isBuildingUnlocked(type)){toast('Сначала исследуй технологию для этого здания');return;}
 if(!moveId&&gameMode!=='sandbox'&&coins<BUILDINGS[type].cost){toast(`Нужно ${BUILDINGS[type].cost} монет`);return;}
 cancelBuildingPlacement();
 const record=moveId?buildings.find(b=>b.id===moveId):null;
 placingBuilding={type,moveId:moveId||null};placementRotation=record?.rotation||0;
 if(record)record.mesh.visible=false;
 previewMesh=createBuildingMesh(type,record?.x??0,record?.z??0,placementRotation,true);
 $('#buildHint').textContent=record?`Перемещение: ${BUILDINGS[type].name}. Коснись нового места.`:`Размещение: ${BUILDINGS[type].name}. Коснись свободного места на поле.`;
}
function cancelBuildingPlacement(){
 if(previewMesh){scene.remove(previewMesh);previewMesh.geometry?.dispose?.();previewMesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});previewMesh.userData.previewMaterial?.dispose?.();previewMesh=null;}
 if(placingBuilding?.moveId){const record=buildings.find(b=>b.id===placingBuilding.moveId);if(record)record.mesh.visible=true;}
 placingBuilding=null;$('#buildHint').textContent='Выбери объект для размещения.';
}
function rotateBuildingPlacement(){if(!placingBuilding)return;placementRotation=(placementRotation+Math.PI/2)%(Math.PI*2);previewMesh.rotation.y=placementRotation;}
function buildingFootprint(type,rotation=0){const d=BUILDINGS[type],c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));return {width:d.width*c+d.depth*s,depth:d.depth*c+d.width*s};}
function isOwnedLandAt(x,z){
 if((Math.abs(x)<=6.2&&Math.abs(z)<=6.2)||(Math.abs(x)<=2.5&&z>=5.5&&z<=9.4))return true;
 return Object.values(LAND_PARCELS).some(parcel=>ownedBiomes.has(parcel.biome)&&Math.abs(x-parcel.x)<=parcel.size/2&&Math.abs(z-parcel.z)<=parcel.size/2);
}
function canPlaceBuilding(type,x,z,ignoreId=null,rotation=placementRotation){
 const d=buildingFootprint(type,rotation);if(Math.abs(x)+d.width/2>17||Math.abs(z)+d.depth/2>17)return false;
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]];if(!corners.every(([sx,sz])=>isOwnedLandAt(x+sx*d.width/2,z+sz*d.depth/2)))return false;
 for(const b of buildings){if(b.id===ignoreId)continue;const other=buildingFootprint(b.type,b.rotation);if(Math.abs(x-b.x)<(d.width+other.width)/2-.15&&Math.abs(z-b.z)<(d.depth+other.depth)/2-.15)return false;}
 if(Math.hypot(x,z-7)<1.6)return false;
 if(agents.some(a=>Math.abs(a.mesh.position.x-x)<d.width/2+.4&&Math.abs(a.mesh.position.z-z)<d.depth/2+.4))return false;
 return true;
}
function placeBuildingAt(x,z){
 if(!placingBuilding)return;
 const type=placingBuilding.type,moveId=placingBuilding.moveId;
 const snappedX=Math.round(x/GRID_STEP)*GRID_STEP,snappedZ=Math.round(z/GRID_STEP)*GRID_STEP;
 if(!canPlaceBuilding(type,snappedX,snappedZ,moveId,placementRotation)){toast('Здесь нельзя разместить здание: место занято или вне фермы');return;}
 if(!moveId&&gameMode!=='sandbox'){coins-=BUILDINGS[type].cost;}
 if(moveId){const b=buildings.find(q=>q.id===moveId);if(b){disposeBuildingMesh(b.mesh);b.x=snappedX;b.z=snappedZ;b.rotation=placementRotation;b.mesh=createBuildingMesh(type,b.x,b.z,b.rotation,false);}}
 else{const b={...BUILDINGS[type],id:nextBuildingId++,type,x:snappedX,z:snappedZ,rotation:placementRotation,items:[],batteryCharge:0,filterCrop:'all',routeIndex:0,routeClock:0};b.mesh=createBuildingMesh(type,b.x,b.z,b.rotation,false);buildings.push(b);}
 cancelBuildingPlacement();renderAutomationLinks();renderBuildingUI();renderTechs();stats();saveGame();toast(`${BUILDINGS[type].name}: размещено`);
}
function disposeBuildingMesh(mesh){if(!mesh)return;scene.remove(mesh);mesh.traverse(o=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material.dispose?.();}});}
function renderAutomationLinks(){
 for(const line of automationLineMeshes){scene.remove(line);line.geometry.dispose();line.material.dispose();}
 automationLineMeshes.length=0;
 const draw=(links,color,y)=>{
  for(const edge of links){
   const a=buildings.find(b=>b.id===Number(edge.from)),b=buildings.find(b=>b.id===Number(edge.to));if(!a||!b)continue;
   const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,y,a.z),new THREE.Vector3(b.x,y,b.z)]);
   const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color,dashSize:.24,gapSize:.12,transparent:true,opacity:.88}));
   line.computeLineDistances();scene.add(line);automationLineMeshes.push(line);
  }
 };
 draw(powerLinks,0x9ee477,.8);draw(conveyorLinks,0xe5bd60,.58);
}
function chooseAutomationLink(kind,id){
 const node=buildings.find(b=>b.id===id);if(!node)return;
 const allowed=kind==='power'?BUILDINGS[node.type]?.powerNode:BUILDINGS[node.type]?.logisticsNode;
 if(!allowed){toast('Этот объект нельзя подключить к такой сети');return;}
 if(!pendingAutomationLink||pendingAutomationLink.kind!==kind){
  pendingAutomationLink={kind,from:id};toast(kind==='power'?'Выбран первый узел питания. Теперь выбери второй.':'Выбран источник конвейера. Теперь выбери следующий узел.');return;
 }
 if(pendingAutomationLink.from===id){pendingAutomationLink=null;toast('Соединение отменено');return;}
 const links=kind==='power'?powerLinks:conveyorLinks,from=pendingAutomationLink.from;
 if(!links.some(e=>Number(e.from)===from&&Number(e.to)===id))links.push({from,to:id});
 pendingAutomationLink=null;renderAutomationLinks();renderBuildingUI();saveGame();toast(kind==='power'?'⚡ Кабель подключён':'⇢ Конвейерная линия подключена');
}
function deleteBuilding(id){const index=buildings.findIndex(b=>b.id===id);if(index<0)return;const b=buildings[index];disposeBuildingMesh(b.mesh);buildings.splice(index,1);powerLinks.splice(0,powerLinks.length,...powerLinks.filter(e=>Number(e.from)!==id&&Number(e.to)!==id));conveyorLinks.splice(0,conveyorLinks.length,...conveyorLinks.filter(e=>Number(e.from)!==id&&Number(e.to)!==id));renderAutomationLinks();renderBuildingUI();saveGame();toast(`${BUILDINGS[b.type].name}: удалено`);}
function updatePlacementPreview(e){if(!placingBuilding||!previewMesh)return;const rect=renderer.domElement.getBoundingClientRect();const ndc=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);const hit=ray.intersectObject(ground,false)[0];if(!hit)return;const x=Math.round(hit.point.x/GRID_STEP)*GRID_STEP,z=Math.round(hit.point.z/GRID_STEP)*GRID_STEP;previewMesh.position.set(x,.02,z);const valid=canPlaceBuilding(placingBuilding.type,x,z,placingBuilding.moveId,placementRotation);previewMesh.userData.previewMaterial.color.set(valid?0x9bd568:0xe56e5c);}
const buildPointerStarts=new Map();
renderer.domElement.addEventListener('pointerdown',e=>{if(placingBuilding)buildPointerStarts.set(e.pointerId,{x:e.clientX,y:e.clientY});});
renderer.domElement.addEventListener('pointermove',e=>{if(placingBuilding)updatePlacementPreview(e);});
renderer.domElement.addEventListener('pointerup',e=>{const start=buildPointerStarts.get(e.pointerId);buildPointerStarts.delete(e.pointerId);if(!placingBuilding||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)return;const rect=renderer.domElement.getBoundingClientRect(),ndc=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);const hit=ray.intersectObject(ground,false)[0];if(hit)placeBuildingAt(hit.point.x,hit.point.z);});
function recordChallengeHarvest(){if(gameMode!=='challenges'||challengeDone)return;challengeHarvested++;if(challengeHarvested>=5){challengeDone=true;challengeResult='УСПЕХ';coins+=40;addXP(25);toast('🏆 Испытание пройдено: +40 🪙 и 25 XP');}renderChallengeStatus();saveGame();}
function renderChallengeStatus(){const el=$('#challengeStatus');if(!el)return;if(gameMode==='challenges'){el.textContent=challengeDone?`Испытание завершено: ${challengeResult} · урожай ${challengeHarvested}/5`: `ИСПЫТАНИЕ · ${Math.max(0,Math.ceil(challengeSeconds))} сек. · собери 5 культур (${challengeHarvested}/5)`;}else if(gameMode==='sandbox')el.textContent='SANDBOX: ресурсы и строительство бесплатны, все технологии можно открыть без затрат.';else if(gameMode==='freeplay')el.textContent='FREE PLAY: свободная экономика и развитие фермы без таймера.';else el.textContent='CAMPAIGN: выполняй миссии и открывай технологии за опыт и монеты.';}
const BASE_POSITION=new THREE.Vector3(0,0,7);
const BASE_DOCKS={
 farmbot:new THREE.Vector3(0,0,7),waterbot:new THREE.Vector3(-1.5,0,7),
 harvestbot:new THREE.Vector3(1.5,0,7),dronebot:new THREE.Vector3(0,.75,8.5)
};
function baseDock(agent){return (BASE_DOCKS[agent.type]||BASE_POSITION).clone();}
const $=s=>document.querySelector(s);
function renderBiomeSelector(){
 const grid=$('#biomeSelectGrid');if(!grid)return;
 const progress={xp,harvested:metrics.harvested||0};
 grid.innerHTML=BIOME_ORDER.map(id=>{
  const b=BIOMES[id],state=getBiomeUnlockState(id,progress,unlockedWorldBiomes),isOpen=state.unlocked,owned=unlockedWorldBiomes.has(id),color='#'+Number(b.terrain).toString(16).padStart(6,'0');
  const requirement=b.unlock.type==='starter'?'Стартовая территория':owned?'Территория открыта':isOpen?'Готово к открытию':`Осталось ${state.missingXP} XP · ${state.missingHarvest} урожаев`;
  const button=owned?'ВЫБРАТЬ':isOpen?'ОТКРЫТЬ':'ЗАКРЫТО';
  return `<article class="biomeSelectCard ${isOpen?'':'locked'} ${activeBiome===id?'selected':''}" style="--biome-color:${color}">
   <span class="biomeIcon">${b.icon}</span><strong>${b.name}</strong><small>${b.description}</small>
   <small>🌡 ${b.temperature} · 💧 ${b.humidity}</small><small>Ресурсы: ${b.resources.slice(0,3).join(', ')}</small>
   <span class="biomeDifficulty">${b.difficulty}</span><small>${requirement}</small>
   <button type="button" data-start-biome="${id}" ${isOpen?'':'disabled'}>${button}</button>
  </article>`;
 }).join('');
 grid.querySelectorAll('[data-start-biome]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.startBiome;
  const state=getBiomeUnlockState(id,progress,unlockedWorldBiomes);
  if(!state.unlocked){toast('Сначала выполни условия открытия этого биома');return;}
  const result=unlockBiome(id,progress,unlockedWorldBiomes);
  if(!result.ok){toast('Биом пока закрыт');return;}
  unlockedWorldBiomes.add(id);
  const seed=`farmerbot-${Date.now().toString(36)}-${id}`;
  applyStartingBiome(id,seed);season='spring';seasonClock=0;weatherStep=0;weather=getBiomeWeather(activeBiome,season,weatherStep,worldSeed);
  $('#biomeSelectScreen').classList.remove('show');stats();renderLandMarket();saveGame();
  toast(`${BIOMES[id].name}: создан новый мир · seed ${worldSeed}`);
 });
}
function stats(){
 $('#coins').textContent=coins;$('#harvest').textContent=harvest;$('#water').textContent=`${water}/${waterCapacity()}`;
 const lvl=1+Math.floor(xp/100);$('#level').textContent=lvl;$('#xp').textContent=xp%100;
 $('#weather').textContent=WEATHER_LABELS[weather]||weather;
 $('#biomeName').textContent=BIOMES[activeBiome]?.name||'Зелёные равнины';
 const climate=getEnvironmentEffects(activeBiome,season,weather);
 $('#temperature').textContent=`${Math.round(climate.temperature)} °C`;
 $('#humidity').textContent=BIOMES[activeBiome]?.humidity||'Умеренная';
 const seasonInfo=SEASONS.find(item=>item.id===season)||SEASONS[0];$('#season').textContent=`${seasonInfo.icon} ${seasonInfo.name}`;
}
const claimedMissions=new Set(),programmedBots=new Set();
function metricValue(key){
 if(key==='cropTypes')return harvestedTypes.size;
 return Number(metrics[key]||0);
}
function updateMissions(){
 if(gameMode!=='campaign'){renderMissions();return;}
 let changed=false;
 for(const mission of MISSIONS){
  if(claimedMissions.has(mission.id))continue;
  if(metricValue(mission.stat)>=mission.target){
   claimedMissions.add(mission.id);coins+=mission.reward;addXP(mission.reward);
   toast(`🏆 ${mission.title} · +${mission.reward} 🪙`);changed=true;
  }
 }
 if(changed)saveGame();
 renderMissions();
}
function renderMissions(){
 const list=$('#missionList');if(!list)return;
 const completed=claimedMissions.size;
 $('#missionSummary').textContent=gameMode==='campaign'?`Выполнено ${completed} из ${MISSIONS.length} · награда за каждое задание: монеты и опыт`:`Миссии кампании приостановлены в режиме ${gameMode.toUpperCase()}. Переключись на CAMPAIGN, чтобы продолжить прогресс.`;
 list.innerHTML=MISSIONS.map(m=>{
  const v=Math.min(m.target,metricValue(m.stat)),done=claimedMissions.has(m.id);
  return `<div class="missionItem ${done?'done':''}"><b>${done?'✓':'○'} ${m.order}. ${m.title}</b><small>${m.description}</small><div class="meter"><i style="width:${Math.min(100,v/m.target*100)}%"></i></div><small>${v}/${m.target} · награда ${m.reward} 🪙</small></div>`;
 }).join('');
}
function renderSeedStock(){
 const select=$('#seedType');if(!select)return;
 if(!select.options.length)select.innerHTML=Object.entries(CROPS).map(([id,c])=>`<option value="${id}">${c.icon} ${c.name} · ${c.seedCost} 🪙</option>`).join('');
 select.value=activeSeed;
 $('#seedStock').textContent=Object.entries(CROPS).map(([id,c])=>`${c.icon} ${gameMode==='sandbox'?'∞':seedStock[id]||0}`).join('  ·  ');
}
function saveProgram(){
 const a=activeAgent();a.program=$('#code').value;
 try{localStorage.setItem(`farmerbot3d_program_${a.id}`,a.program);$('#codeStatus').textContent='сохранено';toast(`Программа ${a.name} сохранена`);saveGame();}
 catch(e){toast('Не удалось сохранить код');}
}
function loadProgram(){
 const a=activeAgent();let saved=null;
 try{saved=localStorage.getItem(`farmerbot3d_program_${a.id}`)||(a.id==='farmbot'?localStorage.getItem('farmerbot3d_program_v2'):null);}catch(e){console.warn('Локальное хранилище программы недоступно',e);}
 if(saved!==null)a.program=saved;
 $('#code').value=a.program||'# Программа робота\nscan()\n';ide?.refresh();
 $('#codeStatus').textContent=a.running?'выполняется':'готов';
}
function renderFleetUI(){
 const cards=$('#fleetCards');if(!cards)return;
 const select=$('#robotSelect');
 if(select){
  const selected=activeAgent().id;
  if(select.options.length!==agents.length)select.innerHTML=agents.map(a=>`<option value="${a.id}">${ROBOT_TYPES[a.type].icon} ${a.name}</option>`).join('');
  if(select.value!==selected)select.value=selected;
 }
 cards.innerHTML=agents.map(a=>{
  const inv=Object.values(a.inventory).reduce((n,v)=>n+v,0),cfg=ROBOT_TYPES[a.type],pct=Math.round(a.energy/a.maxEnergy*100);
  return `<div class="fleetCard ${a.id===activeAgent().id?'selected':''}">
   <strong>${cfg.icon} ${a.name}</strong><small>${a.running?'● Выполняет программу':a.type==='dronebot'?'Ожидает задания':'На связи'} · ур. ${a.level}</small>
   <div class="meter"><i style="width:${pct}%"></i></div><small>⚡ ${Math.round(a.energy)}/${a.maxEnergy} · 📍 ${a.mesh.position.x.toFixed(1)}, ${a.mesh.position.z.toFixed(1)} · 💧 ${a.water} · 📦 ${inv}/${a.capacity}</small>
   <div class="fleetActions"><button data-bot-select="${a.id}">КОД</button><button data-bot-run="${a.id}" ${a.running?'disabled':''}>▶</button><button data-bot-stop="${a.id}" ${!a.running?'disabled':''}>■</button></div>
  </div>`;
 }).join('');
 $('#networkInfo').textContent=`На связи: ${agents.length} · Активны: ${agents.filter(a=>a.running).length} · Склад: ${Object.values(harvestStorage).reduce((a,b)=>a+b,0)} ед. · Питание: ${Math.round(powerState.generation*10)/10}/${Math.round(powerState.consumption*10)/10} · Отключено: ${powerState.outages}`;
 renderAutomationPanel();
 cards.querySelectorAll('[data-bot-select]').forEach(b=>b.onclick=()=>{selectAgent(b.dataset.botSelect);$('#networkPanel').classList.remove('show');$('#codePanel').classList.add('show');});
 cards.querySelectorAll('[data-bot-run]').forEach(b=>b.onclick=()=>{const a=agents.find(x=>x.id===b.dataset.botRun);if(a)runAgent(a);});
 cards.querySelectorAll('[data-bot-stop]').forEach(b=>b.onclick=()=>{const a=agents.find(x=>x.id===b.dataset.botStop);if(a){a.stopRequested=true;renderFleetUI();}});
}
function selectAgent(id){
 const a=agents.find(x=>x.id===id);if(!a)return;
 selectedAgent=a;loadProgram();const out=$('#programOutput');out.textContent=(a.logs||[]).join('\n')||'Журнал программы появится здесь.';renderFleetUI();ide?.refresh();
}
function buyRobot(type,cost){
 if(agents.some(a=>a.type===type)){toast('Этот робот уже куплен');return;}
 if(gameMode!=='sandbox'&&coins<cost){toast(`Нужно ${cost} монет`);return;}
 if(gameMode!=='sandbox')coins-=cost;const a=createAgent(type);if(a){toast(`${a.name} присоединился к ферме`);selectAgent(a.id);stats();saveGame();}
}
function buyEquipment(type,cost){
 if((type==='pump'&&pumpBuilt)||(type==='solar'&&solarBuilt)||(type==='storage'&&storageBuilt)){toast('Это оборудование уже построено');return;}
 if(gameMode!=='sandbox'&&coins<cost){toast(`Нужно ${cost} монет`);return;}
 if(gameMode!=='sandbox')coins-=cost;
 if(type==='pump')pumpBuilt=true;if(type==='solar')solarBuilt=true;if(type==='storage')storageBuilt=true;
 buildEquipment(type);stats();saveGame();toast(`Оборудование построено: ${type}`);
}
function buySeedPack(){
 const c=CROPS[activeSeed];if(gameMode!=='sandbox'&&coins<c.seedCost){toast(`Нужно ${c.seedCost} монет`);return;}
 if(gameMode!=='sandbox')coins-=c.seedCost;seedStock[activeSeed]=(seedStock[activeSeed]||0)+5;stats();renderSeedStock();saveGame();toast(`${c.icon} Куплено 5 семян: ${c.name}`);
}

const SAVE_KEY='farmerbot3d_save_v7',PREVIOUS_SAVE_KEY='farmerbot3d_save_v6',LEGACY_SAVE_KEY='farmerbot3d_save_v5',OLDER_SAVE_KEY='farmerbot3d_save_v4',OLD_SAVE_KEY='farmerbot3d_save_v3',OLDEST_SAVE_KEY='farmerbot3d_save_v2';
function saveGame(){
 const data={
  version:7,coins,harvest,water,xp,researchPoints,seedStock,harvestStorage,metrics,gameMode,activeSeed,automation:{powerLinks,conveyorLinks,autoDispatchEnabled},world:{schemaVersion:WORLD_SCHEMA_VERSION,activeBiome,seed:worldSeed,season,seasonClock,weatherStep,unlockedWorldBiomes:[...unlockedWorldBiomes],unlockedBiomes:[...ownedBiomes]},
  harvestedTypes:[...harvestedTypes],claimedMissions:[...claimedMissions],programmedBots:[...programmedBots],weather,
  equipment:{pump:pumpBuilt,solar:solarBuilt,storage:storageBuilt},
  buildings:buildings.map(({mesh,...b})=>b),researchedTechs:[...researchedTechs],
  challenge:{seconds:challengeSeconds,harvested:challengeHarvested,done:challengeDone,result:challengeResult},
  agents:agents.map(a=>({id:a.id,type:a.type,name:a.name,x:a.mesh.position.x,z:a.mesh.position.z,y:a.mesh.position.y,rotation:a.mesh.rotation.y,energy:a.energy,water:a.water,inventory:a.inventory,program:a.program,level:a.level})),
  plots:plots.map(p=>({state:p.state,watered:p.watered,waterSource:p.waterSource,growth:p.growth,cropType:p.cropType,biome:p.biome||'meadow'}))
 };
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));}catch(e){console.warn('Не удалось сохранить игру',e);}
}
function loadGame(){
 try{
  const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(PREVIOUS_SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)||localStorage.getItem(OLDER_SAVE_KEY)||localStorage.getItem(OLD_SAVE_KEY)||localStorage.getItem(OLDEST_SAVE_KEY);if(!raw){stats();renderSeedStock();renderFleetUI();renderMissions();renderBiomeSelector();$('#biomeSelectScreen').classList.add('show');return;}
  const d=JSON.parse(raw);isLoadingGame=true;
  coins=Number.isFinite(d.coins)?d.coins:90;harvest=Number(d.harvest)||0;water=Number.isFinite(d.water)?d.water:8;xp=Number(d.xp)||0;researchPoints=Number.isFinite(d.researchPoints)?d.researchPoints:xp;
  if(d.seedStock)Object.assign(seedStock,d.seedStock);
  if(d.harvestStorage)Object.assign(harvestStorage,d.harvestStorage);else if(d.version!==3&&harvest>0)harvestStorage.carrot=harvest;
  if(d.metrics)Object.assign(metrics,d.metrics);
  if(Array.isArray(d.harvestedTypes))d.harvestedTypes.forEach(v=>harvestedTypes.add(v));
  if(Array.isArray(d.claimedMissions))d.claimedMissions.forEach(v=>claimedMissions.add(v));if(Array.isArray(d.programmedBots))d.programmedBots.forEach(v=>programmedBots.add(v));
  if(Array.isArray(d.researchedTechs))d.researchedTechs.forEach(v=>{if(TECHNOLOGIES.some(t=>t.id===v))researchedTechs.add(v);});
  if(d.challenge){challengeSeconds=Number.isFinite(d.challenge.seconds)?d.challenge.seconds:180;challengeHarvested=Number(d.challenge.harvested)||0;challengeDone=!!d.challenge.done;challengeResult=String(d.challenge.result||'');}
  if(d.world){season=SEASONS.some(item=>item.id===d.world.season)?d.world.season:'spring';seasonClock=Math.max(0,Math.min(SEASON_LENGTH_SECONDS-0.001,Number(d.world.seasonClock)||0));weatherStep=Math.max(0,Number(d.world.weatherStep)||0);activeBiome=BIOMES[d.world.activeBiome]?d.world.activeBiome:'meadow';worldSeed=String(d.world.seed||'legacy-meadow');unlockedWorldBiomes.clear();unlockedWorldBiomes.add('meadow');for(const id of Array.isArray(d.world.unlockedWorldBiomes)?d.world.unlockedWorldBiomes:[])if(BIOMES[id])unlockedWorldBiomes.add(id);if(BIOMES[activeBiome])unlockedWorldBiomes.add(activeBiome);applyStartingBiome(activeBiome,worldSeed);ownedBiomes.clear();ownedBiomes.add('meadow');for(const id of Array.isArray(d.world.unlockedBiomes)?d.world.unlockedBiomes:[])if(LAND_PARCELS[id])createBiomeLand(id);}
  activeSeed=CROPS[d.activeSeed]?d.activeSeed:'carrot';weather=WEATHER_LABELS[d.weather]?d.weather:getBiomeWeather(activeBiome,season,weatherStep,worldSeed);gameMode=['campaign','sandbox','challenges','freeplay'].includes(d.gameMode)?d.gameMode:'campaign';$('#gameMode').value=gameMode;
  const a0=d.agents?.find(a=>a.id==='farmbot');
  if(a0){robot.position.set(Number.isFinite(Number(a0.x))?Number(a0.x):0,0,Number.isFinite(Number(a0.z))?Number(a0.z):7);robot.rotation.y=Number(a0.rotation)||0;agents[0].energy=THREE.MathUtils.clamp(Number.isFinite(Number(a0.energy))?Number(a0.energy):100,0,agents[0].maxEnergy);agents[0].inventory=a0.inventory||{};agents[0].program=a0.program??agents[0].program;}
  else if(d.robot){robot.position.set(Number(d.robot.x)||0,0,Number(d.robot.z)||7);robot.rotation.y=Number(d.robot.rotation)||0;}
  if(Array.isArray(d.agents)){
   for(const saved of d.agents){
    if(saved.type==='farmbot')continue;
    const agent=agents.find(a=>a.type===saved.type)||createAgent(saved.type);
    if(!agent)continue;
    agent.mesh.position.set(Number.isFinite(Number(saved.x))?Number(saved.x):0,Number.isFinite(Number(saved.y))?Number(saved.y):0,Number.isFinite(Number(saved.z))?Number(saved.z):7);
    agent.mesh.rotation.y=Number(saved.rotation)||0;agent.energy=THREE.MathUtils.clamp(Number.isFinite(Number(saved.energy))?Number(saved.energy):agent.maxEnergy,0,agent.maxEnergy);
    agent.water=Number.isFinite(saved.water)?saved.water:agent.water;
    agent.inventory=saved.inventory||{};agent.program=saved.program??agent.program;agent.level=Number(saved.level)||1;agent.running=false;agent.stopRequested=false;agent.pauseRequested=false;agent.resumeResolver=null;agent.stepOnce=false;
   }
  }
  if(Array.isArray(d.plots))d.plots.forEach((v,i)=>{
   if(!plots[i])return;plots[i].watered=!!v.watered;plots[i].waterSource=v.waterSource||null;plots[i].growth=Number(v.growth)||0;
   plots[i].cropType=CROPS[v.cropType]?v.cropType:'carrot';plots[i].biome=BIOMES[v.biome]?v.biome:(plots[i].biome||'meadow');
   setState(plots[i],['empty','seed','growing','ready'].includes(v.state)?v.state:'empty');
  });
  if(d.equipment){pumpBuilt=!!d.equipment.pump;solarBuilt=!!d.equipment.solar;storageBuilt=!!d.equipment.storage;
   if(pumpBuilt)buildEquipment('pump');if(solarBuilt)buildEquipment('solar');if(storageBuilt)buildEquipment('storage');}
  buildings.length=0;nextBuildingId=1;if(Array.isArray(d.buildings))for(const saved of d.buildings){if(!BUILDINGS[saved.type])continue;const record={...BUILDINGS[saved.type],...saved,id:Number(saved.id)||nextBuildingId++,type:saved.type,x:Number(saved.x)||0,z:Number(saved.z)||0,rotation:Number(saved.rotation)||0,items:Array.isArray(saved.items)?saved.items:[],batteryCharge:Math.max(0,Number(saved.batteryCharge)||0),filterCrop:CROPS[saved.filterCrop]?saved.filterCrop:'all',routeIndex:Number(saved.routeIndex)||0,routeClock:Number(saved.routeClock)||0,legacyUnwired:Number(d.version||0)<5&&['conveyor','charger','robot_station'].includes(saved.type)};record.mesh=createBuildingMesh(record.type,record.x,record.z,record.rotation,false);buildings.push(record);nextBuildingId=Math.max(nextBuildingId,record.id+1);}if(d.automation){powerLinks.splice(0,powerLinks.length,...(Array.isArray(d.automation.powerLinks)?d.automation.powerLinks:[]));conveyorLinks.splice(0,conveyorLinks.length,...(Array.isArray(d.automation.conveyorLinks)?d.automation.conveyorLinks:[]));autoDispatchEnabled=!!d.automation.autoDispatchEnabled;}renderAutomationLinks();
  lastLevel=1+Math.floor(xp/100);isLoadingGame=false;updateMissions();stats();renderSeedStock();renderFleetUI();renderMissions();renderBuildingUI();renderTechs();renderChallengeStatus();renderLandMarket();if(Number(d.version||0)<7)saveGame();
 }catch(e){isLoadingGame=false;console.warn('Ошибка загрузки сохранения',e);stats();}
}


let soundOn=false,audioCtx=null;
function blip(freq=520,duration=.07,type='sine'){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.04,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}}
$('#soundToggle').onclick=()=>{soundOn=!soundOn;$('#soundToggle').textContent=soundOn?'♫ ЗВУК ВКЛ':'♫ ЗВУК';blip(660,.1);};

let toastTimer;function toast(t){blip(560,.055);let el=$('#toast');el.textContent=t;el.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.opacity=0,1800);}
function nearest(agent=activeAgent()){
 const pos=agent.mesh.position;let best=null,bd=2.25;
 for(const p of plots){const d=Math.hypot(p.g.position.x-pos.x,p.g.position.z-pos.z);if(d<bd){bd=d;best=p;}}
 return best;
}
function waterPlot(plot,agent=activeAgent(),source='robot'){
 if(!plot||!['seed','growing'].includes(plot.state)||plot.watered)return false;
 const cost=waterCostForPlot(plot.biome||'meadow',season,weather);
 if(agent.type==='waterbot'){if(gameMode!=='sandbox'&&agent.water<cost){toast(`Нужно ${cost} воды для этого климата`);return false;}if(gameMode!=='sandbox')agent.water-=cost;}
 else{if(gameMode!=='sandbox'&&water<cost){toast(`Нужно ${cost} воды для этого климата`);return false;}if(gameMode!=='sandbox')water-=cost;}
 metrics.watered++;metrics.waterUsed+=cost;plot.watered=true;plot.waterSource=source;plot.growth=0;setState(plot,'growing');
 stats();updateMissions();burst(plot.g.position.clone().add(new THREE.Vector3(0,.45,0)),0x70c9ed,9);saveGame();return true;
}
function harvestPlot(plot,agent=activeAgent()){
 if(!plot||plot.state!=='ready')return false;
 const carried=Object.values(agent.inventory).reduce((n,v)=>n+v,0);
 if(carried>=agent.capacity){toast(`${agent.name}: инвентарь заполнен — вернись на склад`);return false;}
 const type=plot.cropType||'carrot';
 agent.inventory[type]=(agent.inventory[type]||0)+1;harvest++;coins+=1;metrics.earned+=1;
 harvestedTypes.add(type);metrics.harvested++;metrics[`${type}Harvested`]=(metrics[`${type}Harvested`]||0)+1;recordChallengeHarvest();if(plot.waterSource==='rain'||plot.waterSource==='pump')metrics.waterEfficiency++;
 burst(plot.g.position.clone().add(new THREE.Vector3(0,1,0)),CROPS[type].color,14);
 setState(plot,'empty');plot.watered=false;plot.waterSource=null;plot.growth=0;
 addXP(2);stats();updateMissions();saveGame();return true;
}
function interact(agent=activeAgent()){
 robotAction=1;
 if(agent.running){toast('Останови программу робота перед ручным действием');return;}
 const p=nearest(agent);if(!p){toast('Подойди ближе к грядке');return;}
 if(agent.type==='dronebot'){toast('DroneBot сканирует ферму — используй scan()');return;}
 if(p.state==='empty'){
  if(agent.type==='waterbot'){toast('WaterBot умеет поливать, но не сажать');return;}
  if(plantPlot(p,activeSeed,agent)){toast(`${CROPS[activeSeed].icon} Посажено: ${CROPS[activeSeed].name}`);}
 }else if(p.state==='seed'||(p.state==='growing'&&!p.watered)){
  if(agent.type==='harvestbot'){toast('HarvestBot не поливает растения');return;}
  if(!waterPlot(p,agent))toast('Нет воды или грядку уже полили');
  else toast('💧 Грядка полита');
 }else if(p.state==='ready'){
  if(agent.type==='waterbot'){toast('WaterBot не собирает урожай');return;}
  if(harvestPlot(p,agent))toast(`📦 Урожай ${CROPS[p.cropType].name} собран`);
 }else toast('Растение растёт — подожди немного');
}
$('#act').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('#shop').onclick=()=>$('#shopPanel').classList.add('show');$('#closeShop').onclick=()=>$('#shopPanel').classList.remove('show');
$('#sell').onclick=()=>{
 const units=Object.values(harvestStorage).reduce((a,b)=>a+b,0);
 if(!units){toast('На складе пока нет урожая');return;}
 let revenue=0;for(const [type,count] of Object.entries(harvestStorage)){revenue+=count*(CROPS[type]?.price||5);harvestStorage[type]=0;}
 coins+=revenue;metrics.earned+=revenue;metrics.sales+=revenue;addXP(Math.ceil(revenue/3));stats();updateMissions();saveGame();toast(`Продано ${units} ед. урожая · +${revenue} 🪙`);
};
$('#buyWater').onclick=()=>{if(coins<3){toast('Нужно 3 монеты');return;}coins-=3;water=Math.min(waterCapacity(),water+5);stats();toast('+5 единиц воды');saveGame();};
$('#buySeeds').onclick=buySeedPack;
$('#seedType').onchange=e=>{activeSeed=e.target.value;renderSeedStock();};
$('#shopInfo').textContent='Продажа урожая даёт монеты. За 3 монеты покупаешь 5 единиц воды.';
$('#codeToggle').onclick=()=>$('#codePanel').classList.add('show');$('#closeCode').onclick=()=>$('#codePanel').classList.remove('show');
$('#saveProgram').onclick=saveProgram;$('#loadProgram').onclick=loadProgram;
ide=createIde({
 getAgent:activeAgent,getAgents:()=>agents,getSensors:()=>sensorNames,
 onSelectRobot:id=>selectAgent(id),
 onEdit:source=>{try{const a=activeAgent();a.program=source;localStorage.setItem(`farmerbot3d_program_${a.id}`,source);$('#codeStatus').textContent='автосохранено';}catch(e){$('#codeStatus').textContent='не сохранено';}}
});
$('#code').addEventListener('keydown',e=>{
 if(ide?.handleKeydown(e))return;
 if(e.key!=='Tab')return;
 e.preventDefault();
 const el=e.currentTarget,start=el.selectionStart,end=el.selectionEnd;
 if(start!==end){const before=el.value.slice(0,start),selected=el.value.slice(start,end),after=el.value.slice(end);
  const lines=selected.split('\n').map(line=>e.shiftKey?line.replace(/^ {1,4}/,''): '    '+line);
  const replacement=lines.join('\n');el.setRangeText(replacement,start,end,'select');
 }else if(e.shiftKey){const lineStart=el.value.lastIndexOf('\n',start-1)+1;const prefix=el.value.slice(lineStart,start);const remove=(prefix.match(/^ {1,4}/)||[''])[0].length;if(remove){el.setRangeText('',lineStart,lineStart+remove,'end');}}
 else {el.setRangeText('    ',start,end,'end');}
 el.dispatchEvent(new Event('input'));
});

$('#example').onclick=()=>{$('#code').value=`# Функция ухода за одной грядкой
def tend_plot():
    if can_plant():
        plant()
    elif can_water():
        water()
    elif can_harvest():
        harvest()
    else:
        print("Пока ничего делать не нужно")

# Подойти к первой грядке
turn_right()
turn_right()
move(1)
tend_plot()
wait(10)
tend_plot()
print("Осталось воды:", get_water())`;$('#code').dispatchEvent(new Event('input'));};
// Каждое нажатие стрелки перемещает робота ровно на одну клетку.
const moveBtns=[...document.querySelectorAll('[data-move]')];
async function moveOneTile(direction,button){
 const agent=activeAgent();if(agent.running||agent.moving)return;
 button.classList.add('active');
 const vectors={forward:[0,-1],back:[0,1],left:[-1,0],right:[1,0]};
 const [dx,dz]=vectors[direction];agent.mesh.rotation.y=Math.atan2(dx,dz);
 try{await moveAgent(agent,1);}catch(error){toast(error.message||'Маршрут недоступен');}
 saveGame();button.classList.remove('active');
}
moveBtns.forEach(b=>{
 b.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(b.dataset.pressed==='1')return;
  b.dataset.pressed='1';
  moveOneTile(b.dataset.move,b);
 });
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>{b.dataset.pressed='0';}));
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function isBlocked(agent,dest){
 const robotBlocked=agents.some(other=>other!==agent&&Math.hypot(other.mesh.position.x-dest.x,other.mesh.position.z-dest.z)<.72&&agent.type!=='dronebot'&&other.type!=='dronebot');
 const buildingBlocked=buildings.some(b=>{const d=buildingFootprint(b.type,b.rotation);return Math.abs(dest.x-b.x)<d.width/2+.18&&Math.abs(dest.z-b.z)<d.depth/2+.18;});
 return robotBlocked||buildingBlocked;
}
function routeForAgent(agent,target){
 const start=worldToCell(agent.mesh.position),goal=worldToCell(target);
 const obstacleBuildings=buildings.map(b=>({...b,...buildingFootprint(b.type,b.rotation)}));
 const blocked=buildBlockedCells({buildings:obstacleBuildings,agents,ignoreAgentId:agent.id});
 blocked.delete(`${start.x},${start.z}`);
 return findPath(start,goal,blocked);
}
async function followPath(agent,path,emergency=false){
 if(!path)return false;
 for(const cell of path.slice(1)){
  if(agent.stopRequested)return false;
  const world=cellToWorld(cell);const dx=world.x-agent.mesh.position.x,dz=world.z-agent.mesh.position.z;agent.mesh.rotation.y=Math.atan2(dx,dz);
  const dest=new THREE.Vector3(world.x,agent.mesh.position.y,world.z);
  if(!await animateAgentTo(agent,dest,emergency))return false;
 }
 return true;
}
async function navigateAgentTo(agent,target,emergency=false){
 let path=routeForAgent(agent,target);if(!path)return false;
 for(let attempt=0;attempt<2;attempt++){
  if(await followPath(agent,path,emergency))return true;
  if(agent.stopRequested)return false;
  path=routeForAgent(agent,target);if(!path)return false;
 }
 return false;
}
async function navigateToNearestPlot(agent,state='any'){
 const matches=plots.filter(p=>state==='ready'?p.state==='ready':state==='empty'?p.state==='empty':state==='thirsty'?['seed','growing'].includes(p.state)&&!p.watered:p.state!=='empty');
 if(!matches.length)throw new Error(`Нет подходящих грядок (${state})`);
 const start=worldToCell(agent.mesh.position),obstacleBuildings=buildings.map(b=>({...b,...buildingFootprint(b.type,b.rotation)}));
 const blocked=buildBlockedCells({buildings:obstacleBuildings,agents,ignoreAgentId:agent.id});blocked.delete(`${start.x},${start.z}`);
 let best=null;
 for(const plot of matches){
  const c=worldToCell(plot.g.position);
  for(const stop of [{x:c.x+1,z:c.z},{x:c.x-1,z:c.z},{x:c.x,z:c.z+1},{x:c.x,z:c.z-1}]){
   const path=findPath(start,stop,blocked);if(path&&(!best||path.length<best.path.length))best={path,plot};
  }
 }
 if(!best)throw new Error('Не удалось найти свободный маршрут к грядке');
 if(!await followPath(agent,best.path))throw new Error('Маршрут прерван или заблокирован');
 return best.plot;
}
async function animateAgentTo(agent,dest,emergency=false){
 if(agent.energy<=0&&!emergency){toast(`${agent.name}: разряжен — вернись на базу`);return false;}
 if(isBlocked(agent,dest)){toast(`${agent.name}: маршрут занят другим роботом`);return false;}
 const start=agent.mesh.position.clone(),duration=520/Math.max(.55,agent.speed*(agent.running?programSpeed:1)),started=performance.now();
 agent.moving=true;if(agent===agents[0])robotMoving=true;
 await new Promise(resolve=>{
  const tick=now=>{
   const t=Math.min(1,(now-started)/duration);
   agent.mesh.position.lerpVectors(start,dest,t);
   if(t<1&&!agent.stopRequested)requestAnimationFrame(tick);
   else{agent.moving=false;if(agent===agents[0])robotMoving=false;resolve();}
  };requestAnimationFrame(tick);
 });
 if(agent.stopRequested)return false;
 if(!emergency)agent.energy=Math.max(0,agent.energy-.65);metrics.tilesMoved++;
 renderFleetUI();return true;
}
async function moveAgent(agent,count){
 const steps=Math.max(0,Math.min(20,Math.floor(Number(count)||0)));if(!steps)return true;
 if(agent.energy<1)return false;
 const start=worldToCell(agent.mesh.position),dx=Math.round(Math.sin(agent.mesh.rotation.y)),dz=Math.round(Math.cos(agent.mesh.rotation.y));
 const target={x:THREE.MathUtils.clamp(start.x+dx*steps,-15,15),z:THREE.MathUtils.clamp(start.z+dz*steps,-15,15)};
 const world=cellToWorld(target);
 const ok=await navigateAgentTo(agent,world);if(!ok&&!agent.stopRequested)throw new Error('Не удалось построить маршрут: проверь препятствия и заряд');
 return ok;
}
async function navigateToSpecificPlot(agent,plot){
 const start=worldToCell(agent.mesh.position),obstacleBuildings=buildings.map(b=>({...b,...buildingFootprint(b.type,b.rotation)}));
 const blocked=buildBlockedCells({buildings:obstacleBuildings,agents,ignoreAgentId:agent.id});blocked.delete(`${start.x},${start.z}`);
 const c=worldToCell(plot.g.position),stops=[{x:c.x+1,z:c.z},{x:c.x-1,z:c.z},{x:c.x,z:c.z+1},{x:c.x,z:c.z-1}];
 let best=null;for(const stop of stops){const path=findPath(start,stop,blocked);if(path&&(!best||path.length<best.length))best=path;}
 if(!best||!await followPath(agent,best))throw new Error('Не удалось добраться до назначенной грядки');
 return true;
}
function getAutomationQueue(){
 const tasks=buildFarmTaskQueue(plots,activeSeed,{...seedStock,unlimited:gameMode==='sandbox'}).filter(t=>t.type!=='water'||gameMode==='sandbox'||water>0||agents.some(a=>a.type==='waterbot'&&a.water>0&&a.energy>8));
 tasks.forEach(t=>{t.sharedWaterAvailable=water>0||gameMode==='sandbox';});
 const stored=Object.values(harvestStorage).reduce((sum,n)=>sum+n,0),storageCap=storageBuilt?100:20;
 for(const agent of agents){
  if(agent.running||agent.autoTaskBusy)continue;
  const load=Object.values(agent.inventory||{}).reduce((sum,n)=>sum+Math.max(0,Number(n)||0),0);
  if(agent.energy<18||(load>=agent.capacity-1&&load>0&&stored<storageCap)){
   tasks.unshift({id:`return:${agent.id}`,type:'return',agentId:agent.id,priority:110});
  }
 }
 return tasks;
}
function renderAutomationPanel(){
 const button=$('#autoDispatchToggle'),status=$('#automationStatus'),list=$('#taskQueue');
 if(button)button.textContent=autoDispatchEnabled?'⏸ ОСТАНОВИТЬ ДИСПЕТЧЕР':'▶ АВТОДИСПЕТЧЕР';
 if(!status||!list)return;
 const active=agents.filter(a=>a.autoTaskBusy).length;
 status.textContent=`Энергия: выработка ${powerState.generation.toFixed(1)} ед/с · нагрузка ${powerState.consumption.toFixed(1)} ед/с · аккумуляторы ${powerState.stored.toFixed(0)} · отключено потребителей: ${powerState.outages}. Диспетчер: ${autoDispatchEnabled?'включён':'выключен'} · назначено задач: ${active}`;
 const tasks=getAutomationQueue();taskQueue=tasks;
 const assigned=new Set(agents.map(a=>a.autoTaskTaskId).filter(Boolean));
 list.innerHTML=tasks.slice(0,10).map(t=>{
  const labels={harvest:'Сбор урожая',water:'Полив',plant:'Посадка',return:'Возврат на базу / разгрузка'};
  const detail=t.type==='return'?agents.find(a=>a.id===t.agentId)?.name||t.agentId:`грядка ${t.plotIndex+1} · ${CROPS[t.crop]?.name||t.crop}`;
  return `<div class="missionItem"><b>${assigned.has(t.id)?'◉':'○'} ${labels[t.type]} · ${detail}</b><small>Приоритет ${t.priority}${assigned.has(t.id)?' · назначено':''}</small></div>`;
 }).join('')||'<p class="muted">Нет доступных задач. Проверь свободные грядки, воду и семена.</p>';
}
async function executeAutomationTask(agent,task){
 const plot=plots[task.plotIndex];if(!plot)return;
 if(agent.energy<18||Object.values(agent.inventory).reduce((sum,n)=>sum+n,0)>=agent.capacity-1)await returnToBase(agent);
 if(agent.stopRequested)return;
 await navigateToSpecificPlot(agent,plot);
 if(agent.stopRequested)return;
 if(task.type==='plant'&&plot.state==='empty'){
  if(plantPlot(plot,task.crop,agent))agent.energy=Math.max(0,agent.energy-.5);
 }else if(task.type==='water'&&['seed','growing'].includes(plot.state)&&!plot.watered){
  if(!waterPlot(plot,agent))throw new Error('Нет воды для автоматического полива');agent.energy=Math.max(0,agent.energy-.35);
 }else if(task.type==='harvest'&&plot.state==='ready'){
  if(!harvestPlot(plot,agent))throw new Error('Не удалось собрать назначенный урожай');agent.energy=Math.max(0,agent.energy-.5);
 }
 const load=Object.values(agent.inventory).reduce((sum,n)=>sum+n,0);
 if(load>=agent.capacity-1||agent.energy<18)await returnToBase(agent);
 programLogFor(agent,`Автодиспетчер: задача «${task.type}» завершена`);
}
function dispatchAutomationTasks(){
 if(!autoDispatchEnabled)return;
 taskQueue=getAutomationQueue();
 const idle=agents.filter(a=>!a.running&&!a.autoTaskBusy&&!a.stopRequested);
 const reserved=new Set(agents.map(a=>a.autoTaskTaskId).filter(Boolean));
 // Return, unload and recharge before assigning new field work.
 for(const task of taskQueue.filter(t=>t.type==='return')){
  const agent=idle.find(a=>a.id===task.agentId);if(!agent||reserved.has(task.id))continue;
  agent.autoTaskBusy=true;agent.autoTaskTaskId=task.id;reserved.add(task.id);idle.splice(idle.indexOf(agent),1);
  returnToBase(agent).then(()=>programLogFor(agent,'Автодиспетчер: разгрузка и подзарядка завершены')).catch(error=>programLogFor(agent,`⚠ Возврат: ${error.message||error}`)).finally(()=>{
   agent.autoTaskBusy=false;agent.autoTaskTaskId=null;agent.stopRequested=false;renderFleetUI();renderAutomationPanel();saveGame();
  });
 }
 for(const task of taskQueue.filter(t=>t.type!=='return')){
  if(!idle.length)break;if(reserved.has(task.id))continue;
  const plot=plots[task.plotIndex],best=selectAgentForTask(idle,task,plot?.g?.position||{x:0,z:0});
  if(!best)continue;
  best.autoTaskBusy=true;best.autoTaskTaskId=task.id;reserved.add(task.id);
  const index=idle.indexOf(best);if(index>=0)idle.splice(index,1);
  executeAutomationTask(best,task).catch(error=>programLogFor(best,`⚠ Автозадача: ${error.message||error}`)).finally(()=>{
   best.autoTaskBusy=false;best.autoTaskTaskId=null;best.stopRequested=false;renderFleetUI();renderAutomationPanel();saveGame();
  });
 }
 renderAutomationPanel();
}

async function returnToBase(agent){
 const target=baseDock(agent);
 if(!await navigateAgentTo(agent,target,true))throw new Error('Не удалось вернуться на базу: путь заблокирован');
 const capacity=storageBuilt?100:20;
 for(const [type,count] of Object.entries(agent.inventory)){
  const current=Object.values(harvestStorage).reduce((a,b)=>a+b,0),space=Math.max(0,capacity-current),moved=Math.min(space,count);
  if(moved){harvestStorage[type]=(harvestStorage[type]||0)+moved;agent.inventory[type]-=moved;if(agent.inventory[type]<=0)delete agent.inventory[type];}
 }
 agent.energy=Math.min(agent.maxEnergy,agent.energy+28);
 water=Math.min(waterCapacity(),water+3);if(agent.type==='waterbot')agent.water=Math.min(ROBOT_TYPES.waterbot.water,agent.water+5);stats();saveGame();toast(`${agent.name}: база достигнута, энергия восстановлена`);
 return true;
}

function programLogFor(agent,message){
 const stamp=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 agent.logs=agent.logs||[];agent.logs.push(`[${stamp}] ${message}`);agent.logs=agent.logs.slice(-80);
 if(agent.id===activeAgent().id){
  const out=$('#programOutput');out.textContent=agent.logs.join('\n');out.scrollTop=out.scrollHeight;
 }
}
function programLog(message){programLogFor(activeAgent(),message);}
function programSense(name,args=[],agent=activeAgent()){
 const p=nearest(agent),pos=agent.mesh.position,requiredWater=p?waterCostForPlot(p.biome||'meadow',season,weather):1;
 switch(name){
  case 'can_harvest':case 'is_ready':return !!p&&p.state==='ready'&&agent.type!=='waterbot'&&agent.type!=='dronebot';
  case 'can_plant':return !!p&&p.state==='empty'&&agent.type!=='waterbot'&&agent.type!=='harvestbot'&&agent.type!=='dronebot'&&(seedStock[args[0]||activeSeed]||0)>0;
  case 'can_water':return !!p&&(agent.type==='waterbot'?agent.water>=requiredWater:water>=requiredWater)&&!p.watered&&['seed','growing'].includes(p.state)&&agent.type!=='harvestbot'&&agent.type!=='dronebot';
  case 'get_water':return agent.type==='waterbot'?agent.water:water;
  case 'has_water':return agent.type==='waterbot'?agent.water>=requiredWater:water>=requiredWater;
  case 'get_coins':return coins;
  case 'get_harvest':return harvest;
  case 'get_energy':return Math.floor(agent.energy);
  case 'get_position':return `(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`;
  case 'get_inventory':return args[0]?(agent.inventory[args[0]]||0):(Object.entries(agent.inventory).map(([k,v])=>`${CROPS[k]?.name||k}: ${v}`).join(', ')||'пусто');
  case 'get_plant_age':return p?Math.round(p.growth*10)/10:0;
  case 'tile_state':return p?p.state:'none';
  case 'count_ready':return plots.filter(q=>q.state==='ready').length;
  case 'count_empty':return plots.filter(q=>q.state==='empty').length;
  case 'at_plot':return !!p;
  case 'distance_to_plot':return p?Math.hypot(p.g.position.x-pos.x,p.g.position.z-pos.z):999;
  case 'front_is_clear':{
   const nx=pos.x+Math.sin(agent.mesh.rotation.y)*1.15,nz=pos.z+Math.cos(agent.mesh.rotation.y)*1.15;
   const dest={x:THREE.MathUtils.clamp(nx,-17.25,17.25),z:THREE.MathUtils.clamp(nz,-17.25,17.25)};
   return Math.abs(nx)<=17.25&&Math.abs(nz)<=17.25&&!isBlocked(agent,dest);
  }
  case 'scan':return plots.filter(q=>Math.hypot(q.g.position.x-pos.x,q.g.position.z-pos.z)<5&&q.state!=='empty').length;
  case 'has_ready_plot':return plots.some(q=>q.state==='ready');
  case 'has_empty_plot':return plots.some(q=>q.state==='empty');
  case 'has_thirsty_plot':return plots.some(q=>['seed','growing'].includes(q.state)&&!q.watered);
  default:return false;
 }
}
async function programAction(name,args=[],agent=activeAgent()){
 if(agent.stopRequested)return;
 if(++agent.actionBudget>350)throw new Error('Лимит программы: максимум 350 игровых действий за запуск');
 metrics.programActions++;
 if(name==='move'){
  const count=Number(args[0]??1);if(!Number.isInteger(count)||count<0||count>20)throw new Error('move() принимает целое число от 0 до 20');
  agent.tileBudget+=count;if(agent.tileBudget>250)throw new Error('Лимит перемещения: 250 клеток за запуск');
  const moved=await moveAgent(agent,count);if(!moved&&!agent.stopRequested)throw new Error('Батарея разряжена или путь заблокирован');
 }else if(name==='turn_left'||name==='turn_right'){
  agent.mesh.rotation.y+=(name==='turn_left'?1:-1)*Math.PI/2;agent.energy=Math.max(0,agent.energy-.2);
 }else if(name==='plant'){
  if(agent.type==='waterbot'||agent.type==='harvestbot'||agent.type==='dronebot')throw new Error(`${agent.name} не умеет сажать`);
  const type=CROPS[args[0]]?args[0]:'carrot';
  if(!plantPlot(nearest(agent),type,agent))throw new Error(`Не удалось посадить ${type}: проверь семена и свободную грядку`);
  agent.energy=Math.max(0,agent.energy-.5);
 }else if(name==='water'){
  if(agent.type==='harvestbot'||agent.type==='dronebot')throw new Error(`${agent.name} не умеет поливать`);
  if(!waterPlot(nearest(agent),agent))throw new Error('Не удалось полить грядку: проверь воду и состояние растения');
  agent.energy=Math.max(0,agent.energy-.35);
 }else if(name==='harvest'){
  if(agent.type==='waterbot'||agent.type==='dronebot')throw new Error(`${agent.name} не умеет собирать урожай`);
  if(!harvestPlot(nearest(agent),agent))throw new Error('У ближайшей грядки нет готового урожая');
  agent.energy=Math.max(0,agent.energy-.5);
 }else if(name==='scan'){
  const count=programSense('scan',[],agent);programLogFor(agent,`${agent.name}: сканирование завершено · найдено ${count} занятых грядок`);agent.energy=Math.max(0,agent.energy-.25);
 }else if(name==='go_to_plot'){
  if(agent.type==='dronebot'){programLogFor(agent,'DroneBot: перемещение по земле недоступно');return;}
  const state=['ready','empty','thirsty'].includes(String(args[0]||'any'))?String(args[0]):'any';await navigateToNearestPlot(agent,state);
 }else if(name==='return_to_base'){
  await returnToBase(agent);
 }else if(name==='transfer_to'||name==='transfer_from'){
  const target=agents.find(a=>a.id===String(args[0]));if(!target)throw new Error(`Робот «${args[0]}» не найден`);
  const result=name==='transfer_to'?transferInventory(agent,target,args[1],args[2]):transferInventory(target,agent,args[1],args[2]);
  if(!result.ok){const reasons={'insufficient-resource':'у отправителя недостаточно ресурса','destination-full':'у получателя нет места','invalid-amount':'количество должно быть положительным целым числом'};throw new Error(`Передача не выполнена: ${reasons[result.reason]||'проверь параметры'}`);}
  programLogFor(agent,`Передано ${result.moved} ед. ${args[1]} ${name==='transfer_to'?'роботу':'от робота'} ${target.name}`);renderFleetUI();
 }else if(name==='refill_water'){
  if(Math.hypot(agent.mesh.position.x-baseDock(agent).x,agent.mesh.position.z-baseDock(agent).z)>2.5)throw new Error('Для refill_water() вернись на базу');
  if(agent.type==='waterbot')agent.water=ROBOT_TYPES.waterbot.water;else water=Math.min(waterCapacity(),water+10);stats();toast(`${agent.name}: запас воды пополнен`);
 }else if(name==='sleep'||name==='wait'){
  const ms=Math.max(0,Math.min(30,Number(args[0]??1))*1000/programSpeed);
  let remaining=ms;while(remaining>0&&!agent.stopRequested){const slice=Math.min(100,remaining);await sleep(slice);remaining-=slice;}
 }
 addXP(name==='harvest'?2:0);if($('#networkPanel').classList.contains('show'))renderFleetUI();stats();saveGame();
}
async function runAgent(agent){
 if(agent.running||agent.autoTaskBusy)return;
 agent.running=true;agent.stopRequested=false;agent.pauseRequested=false;agent.stepOnce=false;agent.pauseReason='';agent.debugSteps=0;agent.actionBudget=0;agent.tileBudget=0;
 const debuggerController=createDebuggerController(agent,(debug,status)=>{ide?.setDebugState(agent.id,debug,status);});agent.debuggerController=debuggerController;ide?.clearDebug(agent.id);
 programmedBots.add(agent.id);metrics.programs++;metrics.botsProgrammed=programmedBots.size;updateMissions();
 if(agent.id===activeAgent().id){$('#run').textContent='⏳ РАБОТАЕТ';$('#codeStatus').textContent='выполняется';}
 ide?.setRunStatus(agent.id,'выполняется',{clearLine:true,resetChanges:true});
 programLogFor(agent,'▶ Запуск программы');
 try{
  const result=await runProgram(agent.program||'',{
   action:(name,args)=>programAction(name,args,agent),
   sense:(name,args)=>programSense(name,args,agent),
   hasSensor:name=>sensorNames.includes(name),
   log:msg=>programLogFor(agent,msg),
   shouldStop:()=>agent.stopRequested,
   onDebugState:debug=>{ide?.setDebugState(agent.id,debug,agent.pauseRequested?(agent.pauseReason||'пауза'):'выполняется');},
   onVariables:debug=>{ide?.setDebugState(agent.id,debug,agent.pauseRequested?(agent.pauseReason||'пауза'):'выполняется');},
   onCallStack:frames=>{ide?.setDebugCallStack(agent.id,frames);},
   onFunctions:names=>{ide?.setDebugFunctions(agent.id,names);},
   beforeStep:debuggerController.beforeStep,
   onStep:(line)=>{if(agent.id===activeAgent().id)$('#currentLine').textContent=`строка ${line}`;}
  });
  agent.lastError=result.ok||agent.stopRequested?'':result.error||'';if(agent.lastError){const line=Number(agent.lastError.match(/Строка\s+(\d+)/i)?.[1]);if(line)ide?.setRuntimeError(agent.id,line,agent.lastError);}
 }catch(error){agent.lastError=error?.message||String(error);const line=Number(error?.line)||Number(agent.lastError.match(/Строка\s+(\d+)/i)?.[1]);if(line)ide?.setRuntimeError(agent.id,line,agent.lastError);programLogFor(agent,'✕ '+agent.lastError);}
 const wasStopped=agent.stopRequested;
 agent.running=false;agent.stopRequested=false;agent.pauseRequested=false;agent.stepOnce=false;agent.pauseReason='';agent.resumeResolver?.();agent.resumeResolver=null;agent.debuggerController=null;
 const finalStatus=agent.lastError?'ошибка':wasStopped?'остановлено':'готово';
 if(agent.id===activeAgent().id)$('#run').textContent='▶ ЗАПУСТИТЬ';
 ide?.setRunStatus(agent.id,finalStatus,{clearLine:true});
 renderFleetUI();stats();saveGame();
}

$('#run').onclick=()=>{
 const agent=activeAgent();agent.program=$('#code').value;runAgent(agent);
};
$('#pauseProgram').onclick=()=>{const agent=activeAgent();agent.debuggerController?.pause();if(agent.running)ide?.setRunStatus(agent.id,agent.pauseReason||'пауза запрошена');};
$('#stepProgram').onclick=()=>{const agent=activeAgent();agent.debuggerController?.step();if(agent.running)ide?.setRunStatus(agent.id,'выполняется · шаг');};
$('#resumeProgram').onclick=()=>{const agent=activeAgent();agent.debuggerController?.resume();ide?.setRunStatus(agent.id,agent.running?'выполняется':'готов');};
$('#debugReset').onclick=()=>{const agent=activeAgent();agent.debuggerController?.stop();agent.stopRequested=true;agent.pauseRequested=false;agent.stepOnce=false;agent.resumeResolver?.();agent.resumeResolver=null;agent.pauseReason='';agent.lastError='';ide?.clearDebug(agent.id);$('#codeStatus').textContent='сброшено';$('#currentLine').textContent='строка —';$('#programOutput').textContent=(agent.logs||[]).join('\n')||'Отладчик сброшен. Код программы сохранён.';if(!agent.running)agent.stopRequested=false;};
$('#stop').onclick=()=>{
 const agent=activeAgent();agent.debuggerController?.stop();agent.stopRequested=true;agent.pauseRequested=false;agent.resumeResolver?.();agent.resumeResolver=null;programLogFor(agent,'■ Запрошена остановка');ide?.setRunStatus(agent.id,'остановка…');saveGame();
};
$('#robotSelect').onchange=e=>selectAgent(e.target.value);$('#runSpeed').onchange=e=>{programSpeed=Number(e.target.value)||1;};
$('#networkToggle').onclick=()=>{$('#networkPanel').classList.add('show');renderFleetUI();};
$('#closeNetwork').onclick=()=>$('#networkPanel').classList.remove('show');
$('#missionToggle').onclick=()=>{$('#missionPanel').classList.add('show');renderMissions();};
$('#closeMissions').onclick=()=>$('#missionPanel').classList.remove('show');
$('#gameMode').value=gameMode;
$('#gameMode').onchange=e=>{
 gameMode=e.target.value;
 if(gameMode==='sandbox'){
  toast('SANDBOX: ресурсы и строительство бесплатны, семена и вода не расходуются');
 }else if(gameMode==='challenges'){
  coins=25;water=6;Object.keys(CROPS).forEach(k=>seedStock[k]=0);seedStock.carrot=8;
  challengeSeconds=180;challengeHarvested=0;challengeDone=false;challengeResult='';
  toast('CHALLENGES: 3 минуты, собери 5 культур');
 }else if(gameMode==='campaign')toast('CAMPAIGN: развивай ферму и выполняй миссии');
 else toast('FREE PLAY: свободная экономика без таймера');
 renderChallengeStatus();renderBuildingUI();renderTechs();stats();renderSeedStock();saveGame();
};
$('#buildToggle').onclick=()=>{$('#buildPanel').classList.add('show');renderBuildingUI();};
$('#closeBuild').onclick=()=>{$('#buildPanel').classList.remove('show');cancelBuildingPlacement();};
$('#rotateBuilding').onclick=rotateBuildingPlacement;$('#cancelBuilding').onclick=cancelBuildingPlacement;
$('#researchToggle').onclick=()=>{$('#researchPanel').classList.add('show');renderTechs();};
$('#closeResearch').onclick=()=>$('#researchPanel').classList.remove('show');
$('#networkRunAll').onclick=()=>agents.forEach(a=>{if(!a.running&&!a.autoTaskBusy)runAgent(a);});
$('#networkStopAll').onclick=()=>{autoDispatchEnabled=false;agents.forEach(a=>{if(a.running||a.autoTaskBusy)a.stopRequested=true;else a.stopRequested=false;});renderAutomationPanel();saveGame();};
$('#autoDispatchToggle').onclick=()=>{autoDispatchEnabled=!autoDispatchEnabled;if(autoDispatchEnabled)agents.filter(a=>!a.running&&!a.autoTaskBusy).forEach(a=>a.stopRequested=false);$('#autoDispatchToggle').textContent=autoDispatchEnabled?'⏸ ОСТАНОВИТЬ ДИСПЕТЧЕР':'▶ АВТОДИСПЕТЧЕР';toast(autoDispatchEnabled?'Диспетчер задач включён':'Диспетчер задач остановлен');renderAutomationPanel();saveGame();};
$('#buyWaterBot').onclick=()=>buyRobot('waterbot',35);
$('#buyHarvestBot').onclick=()=>buyRobot('harvestbot',50);
$('#buyDroneBot').onclick=()=>buyRobot('dronebot',70);
$('#buildPump').onclick=()=>buyEquipment('pump',45);
$('#buildSolar').onclick=()=>buyEquipment('solar',60);
$('#buildStorage').onclick=()=>buyEquipment('storage',40);

loadGame();loadProgram();
const clock=new THREE.Clock();
let pumpClock=0,fleetUiClock=0,programSpeed=1;
function update(dt){
 robotAnimTime+=dt;
 const moving=robotMoving;
 const walk=robotAnimTime*10;
 bodyPivot.position.y=.78+(moving?Math.abs(Math.sin(walk))*.055:Math.sin(robotAnimTime*2.1)*.018);
 bodyPivot.rotation.z=moving?Math.sin(walk)*.035:Math.sin(robotAnimTime*1.3)*.012;
 legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(walk+i*Math.PI)*.48:Math.sin(robotAnimTime*1.5+i)*.025;});
 arms.forEach((arm,i)=>{arm.rotation.x=moving?Math.sin(walk+i*Math.PI+Math.PI)*.42:Math.sin(robotAnimTime*1.7+i)*.035;arm.rotation.z=(i===0?-.12:.12)+(robotAction>0?(i===0?-.55:.55)*Math.sin(robotAction*Math.PI):0);});
 head.rotation.y=Math.sin(robotAnimTime*.9)*.12;head.rotation.x=Math.sin(robotAnimTime*1.4)*.025;
 bulb.scale.setScalar(1+Math.sin(robotAnimTime*4)*.12);robotAction=Math.max(0,robotAction-dt*1.5);

 // Day/night cycle with matching directional light and sky colors.
 dayClock=(dayClock+dt/180)%1;
 const daylight=.28+.72*Math.max(0,Math.sin(dayClock*Math.PI*2-Math.PI/2));
 sun.intensity=1.1+1.15*daylight;
 const skyNight=new THREE.Color(0x18283c);
 scene.background.copy(skyNight).lerp(seasonSkyColors[season]||skyDay,daylight);scene.fog.color.copy(scene.background);
 sun.color.set((SEASONS.find(item=>item.id===season)||SEASONS[0]).sun);

 // Season calendar advances independently from the day/night clock.
 const seasonChange=advanceSeason(season,seasonClock,dt);seasonClock=seasonChange.seasonClock;
 if(seasonChange.changed){season=seasonChange.season;seasonClock=0;weatherClock=0;weatherStep=0;weather=getBiomeWeather(activeBiome,season,weatherStep,worldSeed);stats();renderLandMarket();toast(`🗓 Наступил сезон: ${(SEASONS.find(item=>item.id===season)||SEASONS[0]).name}`);saveGame();}
 // Challenge mode is a real timed scenario with a finite seed/water/coin budget.
 if(gameMode==='challenges'&&!challengeDone){challengeSeconds=Math.max(0,challengeSeconds-dt);if(challengeSeconds<=0){challengeDone=true;challengeResult=challengeHarvested>=5?'УСПЕХ':'ВРЕМЯ ВЫШЛО';if(challengeHarvested<5)toast('⏱ Время испытания вышло');saveGame();}if(Math.ceil(challengeSeconds)!==Math.ceil(challengeSeconds+dt))renderChallengeStatus();}
 // Seasonal weather cycle; rain and snow restore soil moisture, drought slows growth.
 weatherClock+=dt;
 if(weatherClock>45){
  weatherClock=0;weatherStep=(weatherStep+1)%8;weather=getBiomeWeather(activeBiome,season,weatherStep,worldSeed);
  if(['rain','heavy-rain','thunderstorm','snow','blizzard'].includes(weather)){
   for(const p of plots)if(['seed','growing'].includes(p.state)&&!p.watered){p.watered=true;p.waterSource=weather;metrics.watered++;if(p.state==='seed')setState(p,'growing');}
   toast(['snow','blizzard'].includes(weather)?'❄️ Снег укрыл ферму и увлажнил грядки':'🌧 Осадки увлажнили грядки');
  }else toast(weather==='drought'?'☀ Засуха: растения растут медленнее':'🌤 Погода улучшилась');
  stats();renderLandMarket();saveGame();
 }
 // Pump waters one thirsty plot automatically, consuming the shared water reserve.
 pumpClock+=dt;
 if(pumpBuilt&&pumpClock>14){
  pumpClock=0;const targetPlot=plots.find(p=>['seed','growing'].includes(p.state)&&!p.watered);
  if(targetPlot&&(water>=waterCostForPlot(targetPlot.biome||'meadow',season,weather)||gameMode==='sandbox'))waterPlot(targetPlot,agents[0],'pump');
 }
 for(const p of plots){
  if(p.state==='growing'&&p.watered){
   const crop=CROPS[p.cropType]||CROPS.carrot;
   const greenhouseBoost=buildings.some(b=>b.type==='greenhouse'&&Math.hypot(b.x-p.g.position.x,b.z-p.g.position.z)<4.4)?1.35:1;
   p.growth+=dt*getEnvironmentEffects(p.biome||'meadow',season,weather).growth*greenhouseBoost;
   const progress=Math.min(1,p.growth/crop.growTime);
   const visualStage=progress<.25?0:progress<.42?1:progress<.75?2:3;
   if(p.visualStage!==visualStage){p.visualStage=visualStage;makeCrop(p);}
   p.crop.scale.setScalar(.72+Math.min(.28,progress*.28));
   if(p.growth>=crop.growTime){
    setState(p,'ready');burst(p.g.position.clone().add(new THREE.Vector3(0,1,0)),crop.color,10);toast(`${crop.icon} Созрело: ${crop.name}`);saveGame();
   }
  }
 }
 // Stage B grid: generate, route, buffer and allocate energy each simulation tick.
 const climateEffects=getEnvironmentEffects(activeBiome,season,weather);
 powerState=updatePowerGrid(buildings,powerLinks,dt,{solarFactor:Math.max(.08,daylight)*climateEffects.solar,windFactor:weather==='wind'||weather==='blizzard'?1.35:weather==='rain'||weather==='heavy-rain'?1.15:['drought','heatwave'].includes(weather)?.75:.9});
 for(const b of buildings)b.powered=!!powerState.powered.get(String(b.id))||!!b.legacyUnwired;
 // Powered pumps irrigate one thirsty plot at a time.
 pumpClock+=dt;
 if(pumpClock>=8){
  pumpClock=0;const targetPlot=buildings.some(b=>b.type==='water_pump'&&b.powered)&&plots.find(p=>['seed','growing'].includes(p.state)&&!p.watered);
  if(targetPlot&&(water>=waterCostForPlot(targetPlot.biome||'meadow',season,weather)||gameMode==='sandbox'))waterPlot(targetPlot,agents[0],'pump');
 }
 // Powered source conveyors pick ripe crops and push them into the directed belt graph.
 conveyorClock+=dt;
 if(conveyorClock>=4){
  conveyorClock=0;
  for(const b of buildings.filter(q=>q.type==='conveyor'&&q.powered)){
   const p=plots.find(q=>q.state==='ready'&&Math.hypot(q.g.position.x-b.x,q.g.position.z-b.z)<2.25);if(!p)continue;
   const linked=conveyorLinks.some(edge=>Number(edge.from)===b.id);if(linked&&(b.items||[]).length>=4)continue;
   const total=Object.values(harvestStorage).reduce((a,v)=>a+v,0),capacity=storageBuilt?100:20;if(!linked&&total>=capacity)continue;
   const type=p.cropType||'carrot';if(linked)b.items.push({crop:type,count:1});else harvestStorage[type]=(harvestStorage[type]||0)+1;
   harvest++;metrics.harvested++;metrics[`${type}Harvested`]=(metrics[`${type}Harvested`]||0)+1;harvestedTypes.add(type);
   setState(p,'empty');p.watered=false;p.waterSource=null;p.growth=0;addXP(1);recordChallengeHarvest();updateMissions();stats();saveGame();toast(`🟫 Конвейер забрал ${CROPS[type].name}`);
  }
 }
 // Branches split, filters hold mismatched crops, buffers queue, and sinks deliver to storage.
 const storageTotal=Object.values(harvestStorage).reduce((a,v)=>a+v,0),storageLimit=storageBuilt?100:20;
 const delivered=stepConveyorNetwork(buildings.filter(b=>b.powered),conveyorLinks,dt,Math.max(0,storageLimit-storageTotal));
 if(delivered.length){for(const item of delivered){const type=CROPS[item.crop]?item.crop:'carrot';harvestStorage[type]=(harvestStorage[type]||0)+(Number(item.count)||1);}stats();saveGame();toast(`📦 Логистика доставила ${delivered.length} ед. на склад`);}
 // Connected chargers and robot stations draw power; an outage switches them off.
 chargerClock+=dt;if(chargerClock>=.5){const pulse=chargerClock;chargerClock=0;for(const b of buildings.filter(q=>(q.type==='charger'||q.type==='robot_station')&&q.powered))for(const a of agents){const distance=Math.hypot(a.mesh.position.x-b.x,a.mesh.position.z-b.z);const range=b.type==='charger'?2.7:3.1;if(distance<range)a.energy=Math.min(a.maxEnergy,a.energy+(b.type==='charger'?pulse*5:pulse*3));}}
 // Automatic dispatcher ranks and assigns unclaimed work to idle specialist robots.
 dispatchClock+=dt;if(dispatchClock>=1.25){dispatchClock=0;dispatchAutomationTasks();}
 if($('#networkPanel').classList.contains('show'))renderAutomationPanel();
 // Solar charging is local: robots must return to the base pad.
 for(const a of agents){
  if(solarBuilt&&Math.hypot(a.mesh.position.x-BASE_POSITION.x,a.mesh.position.z-BASE_POSITION.z)<2.6){
   a.energy=Math.min(a.maxEnergy,a.energy+dt*2.4);
  }
  a.mesh.userData.anim=(a.mesh.userData.anim||0)+dt;
  if(a.type!=='farmbot'){
   a.mesh.position.y=(a.type==='dronebot'?.75:0)+(a.moving?Math.sin(a.mesh.userData.anim*12)*.035:Math.sin(a.mesh.userData.anim*2)*.018);
   if(a.type==='dronebot')a.mesh.traverse(o=>{if(o.userData.rotor)o.rotation.y+=dt*18;});
  }
 }
 for(const b of buildings)if(b.type==='wind_generator')b.mesh.traverse(o=>{if(o.userData.windHub)o.rotation.z+=dt*1.8;});
 for(let i=particles.length-1;i>=0;i--){
  const q=particles[i];q.userData.life-=dt;q.position.addScaledVector(q.userData.v,dt);q.userData.v.y-=3*dt;
  q.scale.multiplyScalar(Math.max(.01,1-dt*1.4));
  if(q.userData.life<=0){scene.remove(q);q.material.dispose();particles.splice(i,1);}
 }
 fleetUiClock+=dt;
 if(fleetUiClock>1){fleetUiClock=0;if($('#networkPanel').classList.contains('show'))renderFleetUI();}
}
let saveAccumulator=0;function frame(){requestAnimationFrame(frame);let dt=Math.min(clock.getDelta(),.04);update(dt);saveAccumulator+=dt;if(saveAccumulator>5){saveAccumulator=0;saveGame();}
 const follow=activeAgent().mesh.position;
 let target=new THREE.Vector3(follow.x+Math.sin(cameraYaw)*cameraDistance,follow.y+cameraDistance*cameraPitch,follow.z+Math.cos(cameraYaw)*cameraDistance);
 camera.position.lerp(target,.055);camera.lookAt(follow.x,follow.y*.5,follow.z);
 renderer.render(scene,camera);}
frame();
addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?52:45;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});camera.fov=innerHeight>innerWidth?52:45;camera.updateProjectionMatrix();
