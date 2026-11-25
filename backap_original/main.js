
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { runProgram } from './language.js';
const root=document.querySelector('#game');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x9bc7c2); scene.fog=new THREE.Fog(0x9bc7c2,22,48);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100); camera.position.set(8,11,12);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.35)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12; renderer.domElement.style.imageRendering="pixelated"; root.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe6f6d7,0x52613b,1.65));
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
 const plot={g,crop,state:'empty',watered:false,growth:0};plots.push(plot);
}

const particleGeo=new THREE.BoxGeometry(.075,.075,.075),particles=[];
function burst(pos,color=0xf2d36e,count=10){
 for(let i=0;i<count;i++){const q=new THREE.Mesh(particleGeo,new THREE.MeshBasicMaterial({color}));q.position.copy(pos);q.userData.v=new THREE.Vector3((Math.random()-.5)*2,1+Math.random()*1.8,(Math.random()-.5)*2);q.userData.life=.7+Math.random()*.2;scene.add(q);particles.push(q);}
}

function makeCrop(plot){
 plot.crop.clear();
 if(plot.state==='empty')return;
 const h=plot.state==='seed'?.18:plot.state==='growing'?.55: .9;
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,h,7),leaf);stem.position.y=h/2;stem.castShadow=true;plot.crop.add(stem);
 for(let k=0;k<4;k++){let l=new THREE.Mesh(new THREE.BoxGeometry(.28,.09,.16),leaf);l.rotation.z=(k%2?1:-1)*.42;l.position.set(Math.sin(k*1.7)*.16,h*(.38+k*.12),Math.cos(k*1.7)*.14);plot.crop.add(l);}
 if(plot.state==='ready'){let fruit=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),gold);fruit.position.set(0,h+.13,0);fruit.castShadow=true;plot.crop.add(fruit);}
}
function setState(p,s){p.state=s;makeCrop(p);}
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
let coins=0,harvest=0,water=5,keys={},running=false,stopRun=false,programActionBudget=0,programTileBudget=0;
const $=s=>document.querySelector(s);
function stats(){$('#coins').textContent=coins;$('#harvest').textContent=harvest;$('#water').textContent=water;}
const SAVE_KEY='farmerbot3d_save_v2', PROGRAM_KEY='farmerbot3d_program_v2';
function saveGame(){const data={coins,harvest,water,robot:{x:robot.position.x,z:robot.position.z,rotation:robot.rotation.y},plots:plots.map(p=>({state:p.state,watered:p.watered,growth:p.growth}))};try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));}catch(e){console.warn('Не удалось сохранить игру',e);}}
function loadGame(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const d=JSON.parse(raw);coins=Number(d.coins)||0;harvest=Number(d.harvest)||0;water=Number.isFinite(d.water)?d.water:5;if(d.robot){robot.position.set(Number(d.robot.x)||0,0,Number(d.robot.z)||7);robot.rotation.y=Number(d.robot.rotation)||0;}if(Array.isArray(d.plots))d.plots.forEach((v,i)=>{if(!plots[i])return;plots[i].watered=!!v.watered;plots[i].growth=Number(v.growth)||0;setState(plots[i],['empty','seed','growing','ready'].includes(v.state)?v.state:'empty');});stats();}catch(e){console.warn('Ошибка загрузки сохранения',e);}}
function saveProgram(){try{localStorage.setItem(PROGRAM_KEY,$('#code').value);$('#codeStatus').textContent='сохранено';toast('Код сохранён на устройстве');}catch(e){toast('Не удалось сохранить код');}}
function loadProgram(){const p=localStorage.getItem(PROGRAM_KEY);if(p!==null){$('#code').value=p;$('#codeStatus').textContent='загружен';}}


let soundOn=false,audioCtx=null;
function blip(freq=520,duration=.07,type='sine'){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.04,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(e){}}
$('#soundToggle').onclick=()=>{soundOn=!soundOn;$('#soundToggle').textContent=soundOn?'♫ ЗВУК ВКЛ':'♫ ЗВУК';blip(660,.1);};

let toastTimer;function toast(t){blip(560,.055);let el=$('#toast');el.textContent=t;el.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.opacity=0,1800);}
function nearest(){let best=null,bd=2.25;for(let p of plots){let d=Math.hypot(p.g.position.x-robot.position.x,p.g.position.z-robot.position.z);if(d<bd){bd=d;best=p;}}return best;}
function interact(){robotAction=1;let p=nearest();if(!p){toast('Подойди ближе к грядке');return;}
 if(p.state==='empty'){setState(p,'seed');burst(p.g.position.clone().add(new THREE.Vector3(0,.55,0)),0x9bcf65,8);toast('🌱 Семена посажены');}
 else if(p.state==='seed'||(p.state==='growing'&&!p.watered)){if(water<=0){toast('Нет воды! Купи её в магазине');return;}water--;p.watered=true;setState(p,'growing');toast('💧 Грядка полита');stats();}
 else if(p.state==='ready'){burst(p.g.position.clone().add(new THREE.Vector3(0,1,0)),0xf2c64e,14);setState(p,'empty');harvest++;coins+=1;toast('🥕 Урожай собран! +1 монета');stats();}
 else toast('Растение растёт — подожди немного');
}
$('#act').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('#shop').onclick=()=>$('#shopPanel').classList.add('show');$('#closeShop').onclick=()=>$('#shopPanel').classList.remove('show');
$('#sell').onclick=()=>{if(!harvest){toast('Пока нечего продавать');return;}coins+=harvest*5;toast('Продано! +'+harvest*5+' монет');harvest=0;stats();saveGame();};
$('#buyWater').onclick=()=>{if(coins<3){toast('Нужно 3 монеты');return;}coins-=3;water+=5;stats();toast('+5 единиц воды');saveGame();};
$('#shopInfo').textContent='Продажа урожая даёт монеты. За 3 монеты покупаешь 5 единиц воды.';
$('#codeToggle').onclick=()=>$('#codePanel').classList.add('show');$('#closeCode').onclick=()=>$('#codePanel').classList.remove('show');
$('#saveProgram').onclick=saveProgram;$('#loadProgram').onclick=loadProgram;
$('#code').addEventListener('keydown',e=>{
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
$('#code').addEventListener('input',()=>{try{localStorage.setItem('farmerbot3d_program_v2',$('#code').value);$('#codeStatus').textContent='автосохранено';}catch(e){$('#codeStatus').textContent='не сохранено';}});

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
let manualMoveBusy=false;
const moveBtns=[...document.querySelectorAll('[data-move]')];
async function moveOneTile(direction,button){
 if(manualMoveBusy || running) return;
 manualMoveBusy=true;
 button.classList.add('active');
 const step=1.15;
 const vectors={forward:[0,-1],back:[0,1],left:[-1,0],right:[1,0]};
 const [dx,dz]=vectors[direction];
 const dest=robot.position.clone().add(new THREE.Vector3(dx*step,0,dz*step));
 dest.x=THREE.MathUtils.clamp(dest.x,-11,11);
 dest.z=THREE.MathUtils.clamp(dest.z,-11,11);
 robot.rotation.y=Math.atan2(dx,dz);
 await animateTo(dest);
 saveGame();
 button.classList.remove('active');
 manualMoveBusy=false;
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
async function interruptibleWait(ms){let remaining=Math.max(0,ms);while(remaining>0&&!stopRun){const slice=Math.min(100,remaining);await sleep(slice);remaining-=slice;}}
async function command(line){let [op,arg]=line.trim().toUpperCase().split(/\s+/);let n=Math.max(1,Math.min(5,parseInt(arg)||1));const valid=['MOVE','TURN','PLANT','WATER','HARVEST','WAIT'];if(!valid.includes(op)){toast('Неизвестная команда: '+op);return;}if(op==='TURN'&&!['LEFT','RIGHT'].includes(arg)){toast('TURN: LEFT или RIGHT');return;}
 if(op==='WAIT'){await sleep(Math.min(n,10)*1000);return;}
 if(op==='TURN'){robot.rotation.y+=(arg==='LEFT'?1:-1)*Math.PI/2;robotAction=1;await sleep(350);return;}
 if(op==='MOVE'){for(let i=0;i<n;i++){let dir=new THREE.Vector3(Math.sin(robot.rotation.y),0,Math.cos(robot.rotation.y));let dest=robot.position.clone().add(dir.multiplyScalar(1.15));dest.x=THREE.MathUtils.clamp(dest.x,-10,10);dest.z=THREE.MathUtils.clamp(dest.z,-10,10);await animateTo(dest); }return;}
 if(op==='PLANT'){robotAction=1;let p=nearest();if(p&&p.state==='empty'){setState(p,'seed');toast('Программа: посадка');}else toast('Программа: нет пустой грядки');}
 if(op==='WATER'){robotAction=1;let p=nearest();if(p&&(p.state==='seed'||p.state==='growing')&&water>0){water--;p.watered=true;setState(p,'growing');stats();toast('Программа: полив');}else toast('Программа: полить не удалось');}
 if(op==='HARVEST'){robotAction=1;let p=nearest();if(p&&p.state==='ready'){setState(p,'empty');harvest++;coins++;stats();toast('Программа: урожай собран');}else toast('Программа: урожай не готов');}
 await sleep(450);saveGame();
}
function animateTo(dest){return new Promise(resolve=>{robotMoving=true;let start=robot.position.clone(),t=0;let tick=()=>{t+=.055;robot.position.lerpVectors(start,dest,Math.min(1,t));if(t<1)requestAnimationFrame(tick);else{robotMoving=false;resolve();}};tick();});}

function programLog(message){
 const out=$('#programOutput');const stamp=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const line=`[${stamp}] ${message}`;const lines=(out.textContent?out.textContent+'\n':'').split('\n');lines.push(line);out.textContent=lines.slice(-60).join('\n');
 out.scrollTop=out.scrollHeight;
}
const sensorNames=['can_harvest','can_plant','can_water','is_ready','get_water','get_coins','get_harvest','tile_state','count_ready','count_empty','front_is_clear','at_plot','distance_to_plot','has_water'];
function programSense(name){
 const p=nearest();
 switch(name){
  case 'can_harvest': case 'is_ready': return !!p&&p.state==='ready';
  case 'can_plant': return !!p&&p.state==='empty';
  case 'can_water': return !!p&&water>0&&(p.state==='seed'||(p.state==='growing'&&!p.watered));
  case 'get_water': return water;
  case 'has_water': return water>0;
  case 'get_coins': return coins;
  case 'get_harvest': return harvest;
  case 'tile_state': return p?p.state:'none';
  case 'count_ready': return plots.filter(q=>q.state==='ready').length;
  case 'count_empty': return plots.filter(q=>q.state==='empty').length;
  case 'at_plot': return !!p;
  case 'distance_to_plot': return p?Math.hypot(p.g.position.x-robot.position.x,p.g.position.z-robot.position.z):999;
  case 'front_is_clear': {
   const nx=robot.position.x+Math.sin(robot.rotation.y)*1.15;
   const nz=robot.position.z+Math.cos(robot.rotation.y)*1.15;
   return Math.abs(nx)<=10.8&&Math.abs(nz)<=10.8;
  }
  default: return false;
 }
}
async function programAction(name,args=[]){
 if(stopRun) return;
 if(++programActionBudget>300) throw new Error('Лимит программы: не более 300 вызовов действий за запуск');
 if(name==='move'){
  const count=Number(args[0]??1);
  if(!Number.isInteger(count)||count<0) throw new Error('move() принимает неотрицательное целое число шагов');
  if(count>20) throw new Error('За один вызов move() можно пройти не более 20 клеток');
  programTileBudget+=count;
  if(programTileBudget>250) throw new Error('Лимит перемещения: не более 250 клеток за запуск');
  for(let i=0;i<count&&!stopRun;i++) await command('MOVE 1');
 }else if(name==='turn_left') await command('TURN LEFT');
 else if(name==='turn_right') await command('TURN RIGHT');
 else if(name==='plant') await command('PLANT');
 else if(name==='water') await command('WATER');
 else if(name==='harvest') await command('HARVEST');
 else if(name==='wait'){
  const seconds=Math.max(0,Math.min(30,Number(args[0]??1)));
  await interruptibleWait(seconds*1000);
 }
 saveGame();
}
$('#run').onclick=async()=>{
 if(running)return;
 running=true;stopRun=false;programActionBudget=0;programTileBudget=0;$('#run').textContent='⏳ РАБОТАЕТ';$('#programOutput').textContent='';
 $('#codeStatus').textContent='выполняется';$('#codeStatus').style.color='#f2cf72';
 try{
  const result=await runProgram($('#code').value,{
   action:programAction,sense:programSense,hasSensor:name=>sensorNames.includes(name),
   log:programLog,shouldStop:()=>stopRun
  });
  if(result.ok){toast('Программа завершена');$('#codeStatus').textContent='выполнено';$('#codeStatus').style.color='#b6e36a';}
  else {toast('В программе есть ошибка');$('#codeStatus').textContent='ошибка';$('#codeStatus').style.color='#ff9c82';}
 }catch(error){
  programLog('✕ '+(error?.message||String(error)));
  $('#codeStatus').textContent='ошибка';$('#codeStatus').style.color='#ff9c82';toast('Не удалось запустить программу');
 }
 running=false;$('#run').textContent='▶ ЗАПУСТИТЬ';saveGame();
};
$('#stop').onclick=()=>{stopRun=true;programLog('■ Запрошена остановка');$('#codeStatus').textContent='остановка…';saveGame();};
loadGame();loadProgram();
const clock=new THREE.Clock();
function update(dt){
 robotAnimTime+=dt;
 const moving=robotMoving||keys.right||keys.left||keys.back||keys.forward;
 const walk=robotAnimTime*10;
 bodyPivot.position.y=.78+(moving?Math.abs(Math.sin(walk))*.055:Math.sin(robotAnimTime*2.1)*.018);
 bodyPivot.rotation.z=moving?Math.sin(walk)*.035:Math.sin(robotAnimTime*1.3)*.012;
 legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(walk+i*Math.PI)*.48:Math.sin(robotAnimTime*1.5+i)*.025;});
 arms.forEach((arm,i)=>{arm.rotation.x=moving?Math.sin(walk+i*Math.PI+Math.PI)*.42:Math.sin(robotAnimTime*1.7+i)*.035;arm.rotation.z=(i===0?-.12:.12)+(robotAction>0?(i===0?-.55:.55)*Math.sin(robotAction*Math.PI):0);});
 head.rotation.y=Math.sin(robotAnimTime*.9)*.12;
 head.rotation.x=Math.sin(robotAnimTime*1.4)*.025;
 bulb.scale.setScalar(1+Math.sin(robotAnimTime*4)*.12);
 robotAction=Math.max(0,robotAction-dt*1.5);
 let v=new THREE.Vector3(0,0,0);
 if(v.lengthSq()>0){v.normalize();robot.position.add(v.multiplyScalar(dt*4));robot.position.x=THREE.MathUtils.clamp(robot.position.x,-11,11);robot.position.z=THREE.MathUtils.clamp(robot.position.z,-11,11);robot.rotation.y=Math.atan2(v.x,v.z);}
 for(let p of plots){if(p.state==='growing'&&p.watered){p.growth+=dt;if(p.growth>9){setState(p,'ready');burst(p.g.position.clone().add(new THREE.Vector3(0,1,0)),0xe9c34d,10);toast('✨ Урожай созрел!');saveGame();}}}
 for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.userData.life-=dt;q.position.addScaledVector(q.userData.v,dt);q.userData.v.y-=3*dt;q.scale.multiplyScalar(Math.max(.01,1-dt*1.4));if(q.userData.life<=0){scene.remove(q);q.material.dispose();particles.splice(i,1);}}
}
let saveAccumulator=0;function frame(){requestAnimationFrame(frame);let dt=Math.min(clock.getDelta(),.04);update(dt);saveAccumulator+=dt;if(saveAccumulator>5){saveAccumulator=0;saveGame();}
 let target=new THREE.Vector3(robot.position.x+7,robot.position.y+9,robot.position.z+9);
 camera.position.lerp(target,.055);camera.lookAt(robot.position.x,0,robot.position.z);
 renderer.render(scene,camera);}
frame();
addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?52:45;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});camera.fov=innerHeight>innerWidth?52:45;camera.updateProjectionMatrix();
