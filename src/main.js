
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { runProgram } from './language.js';
import { createIde } from './ide.js';
import { createDebuggerController } from './debugger.js';
import { CROPS, ROBOT_TYPES, MISSIONS, BUILDINGS, TECHNOLOGIES } from './data.js';
import { GRID_STEP, worldToCell, cellToWorld, findPath, buildBlockedCells } from './navigation.js';
let ide=null;
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
function pixelTexture(base,accent,seed=1){
 const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,64,64);
 let n=seed;const rnd=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
 for(let i=0;i<210;i++){x.fillStyle=accent;x.globalAlpha=.12+rnd()*.32;x.fillRect(Math.floor(rnd()*64),Math.floor(rnd()*64),1+Math.floor(rnd()*4),1+Math.floor(rnd()*3));}
 x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);return t;
}
const grassTex=pixelTexture('#719b55','#b6c879',12),soilTex=pixelTexture('#80563a','#c18a58',24);
const mat=(c,r=.85)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const grass=new THREE.MeshStandardMaterial({map:grassTex,roughness:1}),soil=new THREE.MeshStandardMaterial({map:soilTex,roughness:1}),soilDark=mat(0x563922),leaf=mat(0x5b9a43),gold=mat(0xeebc45),metal=mat(0xd5dfd1,.45),blue=mat(0x397f91,.55),dark=mat(0x20313a),white=mat(0xf2f1dc);
function box(parent,w,h,d,m,x,y,z){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const ground=box(scene,38,.4,38,grass,0,-.3,0);
const grid=new THREE.GridHelper(38,38,0x557b45,0x6f9656);grid.position.y=-.095;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
// distant hills / trees
for(let i=0;i<22;i++){let a=i*Math.PI*2/22;let x=Math.cos(a)*15,z=Math.sin(a)*15;if(Math.abs(x)<8&&Math.abs(z)<8)continue;
let trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,1,7),mat(0x65452b));trunk.position.set(x,.35,z);scene.add(trunk);
let crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,1),mat(i%2?0x397348:0x4e8950));crown.position.set(x,1.25,z);crown.castShadow=true;scene.add(crown);}
const plots=[];
for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
 let g=new THREE.Group();g.position.set(x*2.4,0,z*2.4);scene.add(g);
 box(g,1.72,.24,1.72,soil,0,.12,0);
 box(g,1.78,.07,1.78,mat(0x5b402b),0,.025,0);
 for(let j=-1;j<=1;j++){box(g,1.5,.035,.035,soilDark,0,.25,j*.42);}
 const crop=new THREE.Group();crop.position.y=.26;g.add(crop);
 const plot={g,crop,state:'empty',watered:false,waterSource:null,growth:0,cropType:'carrot',stage:0};plots.push(plot);
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
let xp=0,researchPoints=0,weather='sunny',weatherClock=0,dayClock=0,activeSeed='carrot',pumpBuilt=false,solarBuilt=false,storageBuilt=false,gameMode='campaign';
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
function renderBuildingUI(){
 const catalog=$('#buildingCatalog'),placed=$('#placedBuildings');if(!catalog||!placed)return;
 catalog.innerHTML=Object.entries(BUILDINGS).map(([id,b])=>{
  const unlocked=isBuildingUnlocked(id),cost=gameMode==='sandbox'?0:b.cost;
  return `<div class="buildCard"><b>${b.icon} ${b.name}</b><small>${b.description}</small><small>Стоимость: ${cost} 🪙 ${unlocked?'':'· исследуй технологию'}</small><button data-build-select="${id}" ${unlocked?'':'disabled'}>РАЗМЕСТИТЬ</button></div>`;
 }).join('');
 placed.innerHTML=buildings.length?buildings.map(b=>`<div class="buildingRow"><span>${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name}</span><span><button data-building-move="${b.id}">↔ ПЕРЕМЕСТИТЬ</button> <button data-building-delete="${b.id}">✕</button></span></div>`).join(''):'<p class="muted">Пока нет размещённых построек.</p>';
 catalog.querySelectorAll('[data-build-select]').forEach(btn=>btn.onclick=()=>startBuildingPlacement(btn.dataset.buildSelect));
 placed.querySelectorAll('[data-building-move]').forEach(btn=>btn.onclick=()=>startBuildingPlacement(buildings.find(b=>b.id===Number(btn.dataset.buildingMove))?.type,Number(btn.dataset.buildingMove)));
 placed.querySelectorAll('[data-building-delete]').forEach(btn=>btn.onclick=()=>deleteBuilding(Number(btn.dataset.buildingDelete)));
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
function canPlaceBuilding(type,x,z,ignoreId=null,rotation=placementRotation){
 const d=buildingFootprint(type,rotation);if(Math.abs(x)+d.width/2>10.2||Math.abs(z)+d.depth/2>10.2)return false;
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
 else{const b={id:nextBuildingId++,type,x:snappedX,z:snappedZ,rotation:placementRotation};b.mesh=createBuildingMesh(type,b.x,b.z,b.rotation,false);buildings.push(b);}
 cancelBuildingPlacement();renderBuildingUI();renderTechs();stats();saveGame();toast(`${BUILDINGS[type].name}: размещено`);
}
function disposeBuildingMesh(mesh){if(!mesh)return;scene.remove(mesh);mesh.traverse(o=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material.dispose?.();}});}
function deleteBuilding(id){const index=buildings.findIndex(b=>b.id===id);if(index<0)return;const b=buildings[index];disposeBuildingMesh(b.mesh);buildings.splice(index,1);renderBuildingUI();saveGame();toast(`${BUILDINGS[b.type].name}: удалено`);}
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
function stats(){
 $('#coins').textContent=coins;$('#harvest').textContent=harvest;$('#water').textContent=`${water}/${waterCapacity()}`;
 const lvl=1+Math.floor(xp/100);$('#level').textContent=lvl;$('#xp').textContent=xp%100;
 $('#weather').textContent=weather==='rain'?'Дождь':weather==='drought'?'Засуха':'Ясно';
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
 $('#networkInfo').textContent=`На связи: ${agents.length} · Активны: ${agents.filter(a=>a.running).length} · Склад: ${Object.values(harvestStorage).reduce((a,b)=>a+b,0)} ед. · Насос: ${pumpBuilt?'ВКЛ':'нет'} · Солнце: ${solarBuilt?'ВКЛ':'нет'}`;
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

const SAVE_KEY='farmerbot3d_save_v4',PREVIOUS_SAVE_KEY='farmerbot3d_save_v3',LEGACY_SAVE_KEY='farmerbot3d_save_v2';
function saveGame(){
 const data={
  version:4,coins,harvest,water,xp,researchPoints,seedStock,harvestStorage,metrics,gameMode,activeSeed,
  harvestedTypes:[...harvestedTypes],claimedMissions:[...claimedMissions],programmedBots:[...programmedBots],weather,
  equipment:{pump:pumpBuilt,solar:solarBuilt,storage:storageBuilt},
  buildings:buildings.map(({mesh,...b})=>b),researchedTechs:[...researchedTechs],
  challenge:{seconds:challengeSeconds,harvested:challengeHarvested,done:challengeDone,result:challengeResult},
  agents:agents.map(a=>({id:a.id,type:a.type,name:a.name,x:a.mesh.position.x,z:a.mesh.position.z,y:a.mesh.position.y,rotation:a.mesh.rotation.y,energy:a.energy,water:a.water,inventory:a.inventory,program:a.program,level:a.level})),
  plots:plots.map(p=>({state:p.state,watered:p.watered,waterSource:p.waterSource,growth:p.growth,cropType:p.cropType}))
 };
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));}catch(e){console.warn('Не удалось сохранить игру',e);}
}
function loadGame(){
 try{
  const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(PREVIOUS_SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY);if(!raw){stats();renderSeedStock();renderFleetUI();renderMissions();return;}
  const d=JSON.parse(raw);isLoadingGame=true;
  coins=Number.isFinite(d.coins)?d.coins:90;harvest=Number(d.harvest)||0;water=Number.isFinite(d.water)?d.water:8;xp=Number(d.xp)||0;researchPoints=Number.isFinite(d.researchPoints)?d.researchPoints:xp;
  if(d.seedStock)Object.assign(seedStock,d.seedStock);
  if(d.harvestStorage)Object.assign(harvestStorage,d.harvestStorage);else if(d.version!==3&&harvest>0)harvestStorage.carrot=harvest;
  if(d.metrics)Object.assign(metrics,d.metrics);
  if(Array.isArray(d.harvestedTypes))d.harvestedTypes.forEach(v=>harvestedTypes.add(v));
  if(Array.isArray(d.claimedMissions))d.claimedMissions.forEach(v=>claimedMissions.add(v));if(Array.isArray(d.programmedBots))d.programmedBots.forEach(v=>programmedBots.add(v));
  if(Array.isArray(d.researchedTechs))d.researchedTechs.forEach(v=>{if(TECHNOLOGIES.some(t=>t.id===v))researchedTechs.add(v);});
  if(d.challenge){challengeSeconds=Number.isFinite(d.challenge.seconds)?d.challenge.seconds:180;challengeHarvested=Number(d.challenge.harvested)||0;challengeDone=!!d.challenge.done;challengeResult=String(d.challenge.result||'');}
  activeSeed=CROPS[d.activeSeed]?d.activeSeed:'carrot';weather=['sunny','rain','drought'].includes(d.weather)?d.weather:'sunny';gameMode=['campaign','sandbox','challenges','freeplay'].includes(d.gameMode)?d.gameMode:'campaign';$('#gameMode').value=gameMode;
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
    agent.inventory=saved.inventory||{};agent.program=saved.program||agent.program;agent.level=Number(saved.level)||1;agent.running=false;agent.stopRequested=false;agent.pauseRequested=false;agent.resumeResolver=null;agent.stepOnce=false;
   }
  }
  if(Array.isArray(d.plots))d.plots.forEach((v,i)=>{
   if(!plots[i])return;plots[i].watered=!!v.watered;plots[i].waterSource=v.waterSource||null;plots[i].growth=Number(v.growth)||0;
   plots[i].cropType=CROPS[v.cropType]?v.cropType:'carrot';
   setState(plots[i],['empty','seed','growing','ready'].includes(v.state)?v.state:'empty');
  });
  if(d.equipment){pumpBuilt=!!d.equipment.pump;solarBuilt=!!d.equipment.solar;storageBuilt=!!d.equipment.storage;
   if(pumpBuilt)buildEquipment('pump');if(solarBuilt)buildEquipment('solar');if(storageBuilt)buildEquipment('storage');}
  buildings.length=0;nextBuildingId=1;if(Array.isArray(d.buildings))for(const saved of d.buildings){if(!BUILDINGS[saved.type])continue;const record={id:Number(saved.id)||nextBuildingId++,type:saved.type,x:Number(saved.x)||0,z:Number(saved.z)||0,rotation:Number(saved.rotation)||0};record.mesh=createBuildingMesh(record.type,record.x,record.z,record.rotation,false);buildings.push(record);nextBuildingId=Math.max(nextBuildingId,record.id+1);}
  lastLevel=1+Math.floor(xp/100);isLoadingGame=false;updateMissions();stats();renderSeedStock();renderFleetUI();renderMissions();renderBuildingUI();renderTechs();renderChallengeStatus();if(d.version<4)saveGame();
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
 if(agent.type==='waterbot'){if(gameMode!=='sandbox'&&agent.water<=0)return false;if(gameMode!=='sandbox')agent.water--;}
 else{if(gameMode!=='sandbox'&&water<=0)return false;if(gameMode!=='sandbox')water--;}
 metrics.watered++;metrics.waterUsed++;plot.watered=true;plot.waterSource=source;plot.growth=0;setState(plot,'growing');
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
 const target={x:THREE.MathUtils.clamp(start.x+dx*steps,-9,9),z:THREE.MathUtils.clamp(start.z+dz*steps,-9,9)};
 const world=cellToWorld(target);
 const ok=await navigateAgentTo(agent,world);if(!ok&&!agent.stopRequested)throw new Error('Не удалось построить маршрут: проверь препятствия и заряд');
 return ok;
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
 const p=nearest(agent),pos=agent.mesh.position;
 switch(name){
  case 'can_harvest':case 'is_ready':return !!p&&p.state==='ready'&&agent.type!=='waterbot'&&agent.type!=='dronebot';
  case 'can_plant':return !!p&&p.state==='empty'&&agent.type!=='waterbot'&&agent.type!=='harvestbot'&&agent.type!=='dronebot'&&(seedStock[args[0]||activeSeed]||0)>0;
  case 'can_water':return !!p&&(agent.type==='waterbot'?agent.water>0:water>0)&&!p.watered&&['seed','growing'].includes(p.state)&&agent.type!=='harvestbot'&&agent.type!=='dronebot';
  case 'get_water':return agent.type==='waterbot'?agent.water:water;
  case 'has_water':return agent.type==='waterbot'?agent.water>0:water>0;
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
   const dest={x:THREE.MathUtils.clamp(nx,-10.5,10.5),z:THREE.MathUtils.clamp(nz,-10.5,10.5)};
   return Math.abs(nx)<=10.5&&Math.abs(nz)<=10.5&&!isBlocked(agent,dest);
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
 if(agent.running)return;
 agent.running=true;agent.stopRequested=false;agent.pauseRequested=false;agent.stepOnce=false;agent.pauseReason='';agent.debugSteps=0;agent.actionBudget=0;agent.tileBudget=0;
 const debuggerController=createDebuggerController(agent,(debug,status)=>{if(agent.id===activeAgent().id)ide?.setDebugState(agent.id,debug,status);});agent.debuggerController=debuggerController;ide?.clearRuntimeError(agent.id);
 programmedBots.add(agent.id);metrics.programs++;metrics.botsProgrammed=programmedBots.size;updateMissions();
 if(agent.id===activeAgent().id){$('#run').textContent='⏳ РАБОТАЕТ';$('#codeStatus').textContent='выполняется';}
 programLogFor(agent,'▶ Запуск программы');
 try{
  const result=await runProgram(agent.program||'',{
   action:(name,args)=>programAction(name,args,agent),
   sense:(name,args)=>programSense(name,args,agent),
   hasSensor:name=>sensorNames.includes(name),
   log:msg=>programLogFor(agent,msg),
   shouldStop:()=>agent.stopRequested,
   onDebugState:debug=>{if(agent.id===activeAgent().id)ide?.setDebugState(agent.id,debug,agent.pauseRequested?(agent.pauseReason||'пауза'):'выполняется');},
   onVariables:debug=>{if(agent.id===activeAgent().id)ide?.setDebugState(agent.id,debug,agent.pauseRequested?(agent.pauseReason||'пауза'):'выполняется');},
   onFunctions:names=>{if(agent.id===activeAgent().id)ide?.setDebugState(agent.id,{functions:names,scopes:{global:{name:'global',values:{}},locals:[]},callStack:[]},'выполняется');},
   beforeStep:debuggerController.beforeStep,
   onStep:(line)=>{if(agent.id===activeAgent().id)$('#currentLine').textContent=`строка ${line}`;}
  });
  agent.lastError=result.ok||agent.stopRequested?'':result.error||'';if(agent.lastError){const line=Number(agent.lastError.match(/Строка\s+(\d+)/i)?.[1]);if(line)ide?.setRuntimeError(agent.id,line,agent.lastError);}
 }catch(error){agent.lastError=error?.message||String(error);const line=Number(error?.line)||Number(agent.lastError.match(/Строка\s+(\d+)/i)?.[1]);if(line)ide?.setRuntimeError(agent.id,line,agent.lastError);programLogFor(agent,'✕ '+agent.lastError);}
 const wasStopped=agent.stopRequested;
 agent.running=false;agent.stopRequested=false;agent.pauseRequested=false;agent.stepOnce=false;agent.pauseReason='';agent.resumeResolver?.();agent.resumeResolver=null;agent.debuggerController=null;
 if(agent.id===activeAgent().id){const finalStatus=agent.lastError?'ошибка':wasStopped?'остановлено':'готово';$('#run').textContent='▶ ЗАПУСТИТЬ';$('#codeStatus').textContent=finalStatus;$('#currentLine').textContent='строка —';$('#ideState').textContent=finalStatus;}
 renderFleetUI();stats();saveGame();
}

$('#run').onclick=()=>{
 const agent=activeAgent();agent.program=$('#code').value;runAgent(agent);
};
$('#pauseProgram').onclick=()=>{const agent=activeAgent();agent.debuggerController?.pause();if(agent.running)$('#codeStatus').textContent=agent.pauseReason;};
$('#stepProgram').onclick=()=>activeAgent().debuggerController?.step();
$('#resumeProgram').onclick=()=>{const agent=activeAgent();agent.debuggerController?.resume();$('#codeStatus').textContent=agent.running?'выполняется':'готов';};
$('#debugReset').onclick=()=>{const agent=activeAgent();agent.debuggerController?.stop();agent.stopRequested=true;agent.pauseRequested=false;agent.stepOnce=false;agent.resumeResolver?.();agent.resumeResolver=null;agent.pauseReason='';agent.lastError='';ide?.clearDebug(agent.id);$('#codeStatus').textContent='сброшено';$('#currentLine').textContent='строка —';$('#programOutput').textContent=(agent.logs||[]).join('\n')||'Отладчик сброшен. Код программы сохранён.';if(!agent.running)agent.stopRequested=false;};
$('#stop').onclick=()=>{
 const agent=activeAgent();agent.debuggerController?.stop();agent.stopRequested=true;agent.pauseRequested=false;agent.resumeResolver?.();agent.resumeResolver=null;programLogFor(agent,'■ Запрошена остановка');$('#codeStatus').textContent='остановка…';saveGame();
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
$('#networkRunAll').onclick=()=>agents.forEach(a=>{if(!a.running)runAgent(a);});
$('#networkStopAll').onclick=()=>agents.forEach(a=>{a.stopRequested=true;});
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
 const skyDay=new THREE.Color(0x9bc7c2),skyNight=new THREE.Color(0x18283c);
 scene.background.copy(skyNight).lerp(skyDay,daylight);scene.fog.color.copy(scene.background);

 // Challenge mode is a real timed scenario with a finite seed/water/coin budget.
 if(gameMode==='challenges'&&!challengeDone){challengeSeconds=Math.max(0,challengeSeconds-dt);if(challengeSeconds<=0){challengeDone=true;challengeResult=challengeHarvested>=5?'УСПЕХ':'ВРЕМЯ ВЫШЛО';if(challengeHarvested<5)toast('⏱ Время испытания вышло');saveGame();}if(Math.ceil(challengeSeconds)!==Math.ceil(challengeSeconds+dt))renderChallengeStatus();}
 // Weather changes every 45 seconds; rain provides water, drought slows crop growth.
 weatherClock+=dt;
 if(weatherClock>45){
  weatherClock=0;const options=['sunny','rain','drought'];weather=options[(options.indexOf(weather)+1)%options.length];
  if(weather==='rain'){
   for(const p of plots)if(['seed','growing'].includes(p.state)&&!p.watered){p.watered=true;p.waterSource='rain';metrics.watered++;if(p.state==='seed')setState(p,'growing');}
   toast('🌧 Начался дождь: грядки получают влагу');
  }else toast(weather==='drought'?'☀ Засуха: растения растут медленнее':'🌤 Погода улучшилась');
  stats();saveGame();
 }
 // Pump waters one thirsty plot automatically, consuming the shared water reserve.
 pumpClock+=dt;
 if(pumpBuilt&&pumpClock>14&&(water>0||gameMode==='sandbox')){
  pumpClock=0;const targetPlot=plots.find(p=>['seed','growing'].includes(p.state)&&!p.watered);
  if(targetPlot)waterPlot(targetPlot,agents[0],'pump');
 }
 const growthFactor=weather==='rain'?1.35:weather==='drought'?.55:1;
 for(const p of plots){
  if(p.state==='growing'&&p.watered){
   const crop=CROPS[p.cropType]||CROPS.carrot;
   const greenhouseBoost=buildings.some(b=>b.type==='greenhouse'&&Math.hypot(b.x-p.g.position.x,b.z-p.g.position.z)<4.4)?1.35:1;
   p.growth+=dt*growthFactor*greenhouseBoost;
   const progress=Math.min(1,p.growth/crop.growTime);
   const visualStage=progress<.25?0:progress<.42?1:progress<.75?2:3;
   if(p.visualStage!==visualStage){p.visualStage=visualStage;makeCrop(p);}
   p.crop.scale.setScalar(.72+Math.min(.28,progress*.28));
   if(p.growth>=crop.growTime){
    setState(p,'ready');burst(p.g.position.clone().add(new THREE.Vector3(0,1,0)),crop.color,10);toast(`${crop.icon} Созрело: ${crop.name}`);saveGame();
   }
  }
 }
 // Placeable infrastructure: conveyors collect nearby ripe crops; chargers service nearby robots.
 conveyorClock+=dt;if(conveyorClock>=4){conveyorClock=0;for(const b of buildings.filter(q=>q.type==='conveyor')){const p=plots.find(q=>q.state==='ready'&&Math.hypot(q.g.position.x-b.x,q.g.position.z-b.z)<2.25);if(p){const total=Object.values(harvestStorage).reduce((a,v)=>a+v,0),capacity=storageBuilt?100:20;if(total<capacity){const type=p.cropType||'carrot';harvestStorage[type]=(harvestStorage[type]||0)+1;harvest++;metrics.harvested++;metrics[`${type}Harvested`]=(metrics[`${type}Harvested`]||0)+1;harvestedTypes.add(type);setState(p,'empty');p.watered=false;p.waterSource=null;p.growth=0;addXP(1);recordChallengeHarvest();updateMissions();stats();saveGame();toast(`🟫 Конвейер доставил ${CROPS[type].name} на склад`);}}}}
 chargerClock+=dt;if(chargerClock>=.5){const pulse=chargerClock;chargerClock=0;for(const b of buildings.filter(q=>q.type==='charger'||q.type==='robot_station'))for(const a of agents){const distance=Math.hypot(a.mesh.position.x-b.x,a.mesh.position.z-b.z);const range=b.type==='charger'?2.7:3.1;if(distance<range)a.energy=Math.min(a.maxEnergy,a.energy+(b.type==='charger'?pulse*5:pulse*3));}}
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
