// Procedural low-poly biome art for FarmerBot 3D.
// Textures are generated once per session; shared geometry/materials are reused on world rebuilds.
const ART = {
  meadow: { ground:"#719b55", soil:"#80563a", accents:["#a8c66c","#587e43","#92704b","#d6c681"], stone:"#858b78", foliage:"#4d8748", trunk:"#765338", water:"#4e9caf", sky:0x9bc7c2, fog:0xb2cec0, sun:0xffedc2, bed:"#765538" },
  desert: { ground:"#d4b16f", soil:"#a77a49", accents:["#f0d69a","#bb965c","#9c7549","#e4c98c"], stone:"#a18a68", foliage:"#6d9250", trunk:"#88613a", water:"#4fabb7", sky:0xb6d5df, fog:0xdcc9a5, sun:0xffd18a, bed:"#b48b58" },
  mountain: { ground:"#858d83", soil:"#746b5c", accents:["#b0b3a6","#696f70","#9d8c74","#657e60"], stone:"#777f7d", foliage:"#436b4b", trunk:"#73543c", water:"#4b9fae", sky:0x94c1dd, fog:0xc1d1d4, sun:0xffe1b0, bed:"#777d78" },
  snow: { ground:"#c9dce5", soil:"#9aaeb5", accents:["#eff8fb","#a9c6d7","#7fabbc","#e0eef2"], stone:"#a6b9c4", foliage:"#486d69", trunk:"#675746", water:"#8bc8dc", sky:0xc5e0ef, fog:0xe0edf3, sun:0xe3efff, bed:"#9aabb3" },
  tropical: { ground:"#4e9761", soil:"#624934", accents:["#8ac75b","#337c52","#aa9b50","#4f9b91"], stone:"#6f8570", foliage:"#2f8750", trunk:"#8a613d", water:"#36aeb2", sky:0x70bbd2, fog:0x9fcfc5, sun:0xffe2aa, bed:"#6e8954" },
  forest: { ground:"#52794a", soil:"#654a34", accents:["#8eaa58","#345f3b","#9e7949","#496d45"], stone:"#777f72", foliage:"#35633b", trunk:"#684a32", water:"#4a918c", sky:0x9dbba9, fog:0xacc1ae, sun:0xffe4bd, bed:"#6c5438" },
  volcanic: { ground:"#514743", soil:"#403633", accents:["#a55b3e","#292a30","#78604c","#d17b43"], stone:"#554c4b", foliage:"#66694a", trunk:"#493932", water:"#4a888f", sky:0xb18c7f, fog:0x8d7468, sun:0xffb27a, bed:"#56413a" },
  swamp: { ground:"#657653", soil:"#514b37", accents:["#9aa36b","#3f6048","#876c4e","#708b70"], stone:"#697667", foliage:"#54744c", trunk:"#65523a", water:"#568b81", sky:0x9db9ad, fog:0x98aa93, sun:0xf5d5a1, bed:"#62543a" }
};
const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));
function seeded(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0),16777619);
  return () => { state += 0x6D2B79F5; let t=state; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}
function makeTileTexture(THREE, id, palette, soil=false) {
  const size=128, canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext("2d"); ctx.imageSmoothingEnabled=false;
  ctx.fillStyle=soil?palette.soil:palette.ground; ctx.fillRect(0,0,size,size);
  const random=seeded(id+(soil?"-soil":"-ground"));
  const colors=palette.accents;
  const tileRect=(x,y,w,h,color)=>{
    ctx.fillStyle=color;
    const xs=[x], ys=[y];
    if(x+w>size)xs.push(x-size); if(x<0)xs.push(x+size);
    if(y+h>size)ys.push(y-size); if(y<0)ys.push(y+size);
    for(const px of xs)for(const py of ys)ctx.fillRect(px,py,w,h);
  };
  for(let i=0;i<(soil?360:430);i++){
    const x=Math.floor(random()*size), y=Math.floor(random()*size);
    const w=1+Math.floor(random()*(soil?5:4)), h=1+Math.floor(random()*(soil?4:3));
    tileRect(x,y,w,h,colors[Math.floor(random()*colors.length)]);
  }
  if(id==="desert"&&!soil){
    ctx.strokeStyle="#f0d69a";ctx.globalAlpha=.38;ctx.lineWidth=1;
    for(let row=0;row<8;row++){const y=8+row*16;ctx.beginPath();ctx.moveTo(4,y);for(let x=4;x<=124;x+=12)ctx.lineTo(x,y+Math.sin((x+row*7)*.09)*2.2);ctx.stroke();}
    ctx.globalAlpha=1;
    ctx.strokeStyle="#9c7549";ctx.globalAlpha=.35;
    for(let i=0;i<9;i++){const x=10+random()*108,y=10+random()*108;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+5);ctx.lineTo(x+2,y+9);ctx.stroke();}
    ctx.globalAlpha=1;
  } else if(id==="mountain"&&!soil){
    for(let i=0;i<16;i++){const x=8+random()*108,y=8+random()*108;ctx.fillStyle=colors[Math.floor(random()*colors.length)];ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5+random()*8,y-2);ctx.lineTo(x+2,y+5+random()*5);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;
  } else if(id==="snow"&&!soil){
    ctx.fillStyle="#ffffff";ctx.globalAlpha=.5;
    for(let i=0;i<42;i++){const x=random()*size,y=random()*size;ctx.fillRect(x,y,1+random()*3,1+random()*2);}
    ctx.globalAlpha=1;ctx.strokeStyle="#8db8cc";ctx.globalAlpha=.25;
    for(let i=0;i<6;i++){const x=8+random()*100,y=8+random()*100;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y+3);ctx.stroke();}
    ctx.globalAlpha=1;
  } else if(id==="tropical"&&!soil){
    ctx.strokeStyle="#b6d56a";ctx.globalAlpha=.4;ctx.lineWidth=1;
    for(let i=0;i<32;i++){const x=random()*size,y=random()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+(random()*4),y-2);ctx.stroke();}
    ctx.globalAlpha=1;
  } else if(id==="meadow"&&!soil){
    ctx.strokeStyle="#c5d982";ctx.globalAlpha=.45;
    for(let i=0;i<45;i++){const x=random()*size,y=random()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1,y-3-random()*3);ctx.stroke();}
    ctx.globalAlpha=1;
  } else if(id==="volcanic"&&!soil){
    ctx.strokeStyle="#dc7940";ctx.globalAlpha=.38;ctx.lineWidth=1;
    for(let i=0;i<8;i++){const x=12+random()*100,y=12+random()*100;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y+4);ctx.lineTo(x+11,y+3);ctx.stroke();}
    ctx.globalAlpha=1;
  } else if(id==="swamp"&&!soil){
    ctx.strokeStyle="#b1b47a";ctx.globalAlpha=.3;
    for(let i=0;i<10;i++){const x=12+random()*100,y=12+random()*100;ctx.beginPath();ctx.ellipse(x,y,4+random()*4,2+random()*3,0,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping; texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(18,18); texture.magFilter=THREE.NearestFilter; texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.anisotropy=4; texture.generateMipmaps=true;
  return texture;
}
export function createBiomeVisualKit(THREE) {
  const terrainMaterials={}, soilMaterials={}, plotRimMaterials={}, waterMaterials={};
  const foliage={}, trunk={}, rocks={}, special={};
  for(const [id,p] of Object.entries(ART)){
    terrainMaterials[id]=new THREE.MeshStandardMaterial({map:makeTileTexture(THREE,id,p,false),roughness:.96,color:0xffffff});
    soilMaterials[id]=new THREE.MeshStandardMaterial({map:makeTileTexture(THREE,id,p,true),roughness:1,color:0xffffff});
    plotRimMaterials[id]=new THREE.MeshStandardMaterial({color:p.bed,roughness:.94});
    waterMaterials[id]=new THREE.MeshStandardMaterial({color:p.water,roughness:.2,metalness:.08,transparent:true,opacity:.88,side:THREE.DoubleSide});
    foliage[id]=new THREE.MeshStandardMaterial({color:p.foliage,roughness:.9});
    trunk[id]=new THREE.MeshStandardMaterial({color:p.trunk,roughness:.96});
    rocks[id]=new THREE.MeshStandardMaterial({color:p.stone,roughness:.97});
  }
  const mats={
    snow:new THREE.MeshStandardMaterial({color:0xeaf4f7,roughness:1}),
    sand:new THREE.MeshStandardMaterial({color:0xe0c184,roughness:1}),
    drySand:new THREE.MeshStandardMaterial({color:0xb48a53,roughness:1}),
    ice:new THREE.MeshStandardMaterial({color:0x9bd5e7,roughness:.24,metalness:.06,transparent:true,opacity:.9}),
    cactus:new THREE.MeshStandardMaterial({color:0x548653,roughness:.88}),
    cactusFlower:new THREE.MeshStandardMaterial({color:0xd88d95,roughness:.8}),
    flowerA:new THREE.MeshStandardMaterial({color:0xf0d16c,roughness:.8}),
    flowerB:new THREE.MeshStandardMaterial({color:0xf1a5a2,roughness:.8}),
    leafLight:new THREE.MeshStandardMaterial({color:0x83b957,roughness:.9}),
    leafDark:new THREE.MeshStandardMaterial({color:0x2f7548,roughness:.9}),
    grass:new THREE.MeshStandardMaterial({color:0x8ba95b,roughness:1}),
    mushroomCap:new THREE.MeshStandardMaterial({color:0xc56f55,roughness:.88}),
    mushroomStem:new THREE.MeshStandardMaterial({color:0xe5d5b3,roughness:1}),
    crystal:new THREE.MeshStandardMaterial({color:0x7fd1dc,roughness:.28,metalness:.12}),
    deadwood:new THREE.MeshStandardMaterial({color:0x806345,roughness:1}),
    irrigation:new THREE.MeshStandardMaterial({color:0x4b9fb2,roughness:.48,metalness:.12}),
    heater:new THREE.MeshStandardMaterial({color:0xe4ad60,roughness:.52,metalness:.1,emissive:0x6b3518,emissiveIntensity:.28}),
    foam:new THREE.MeshStandardMaterial({color:0xf1fbff,roughness:.35,transparent:true,opacity:.82})
  };
  const G={
    trunk:new THREE.CylinderGeometry(.12,.18,1.25,7),
    smallTrunk:new THREE.CylinderGeometry(.08,.13,.8,6),
    crown:new THREE.IcosahedronGeometry(.78,1),
    crownSmall:new THREE.IcosahedronGeometry(.42,0),
    pine:new THREE.ConeGeometry(.62,1.05,7),
    pineSnow:new THREE.ConeGeometry(.52,.72,7),
    cactus:new THREE.CylinderGeometry(.18,.22,1.35,8),
    cactusArm:new THREE.CylinderGeometry(.075,.09,.62,7),
    palmTrunk:new THREE.CylinderGeometry(.13,.2,2.2,7),
    broadLeaf:new THREE.BoxGeometry(.12,.045,1.25),
    fernLeaf:new THREE.BoxGeometry(.07,.035,.62),
    rock:new THREE.DodecahedronGeometry(.62,0),
    rockSmall:new THREE.IcosahedronGeometry(.24,0),
    mound:new THREE.SphereGeometry(1,9,5),
    pebble:new THREE.IcosahedronGeometry(.12,0),
    crystal:new THREE.OctahedronGeometry(.35,0),
    grassBlade:new THREE.ConeGeometry(.09,.46,4),
    flower:new THREE.IcosahedronGeometry(.095,0),
    mushroomStem:new THREE.CylinderGeometry(.045,.07,.18,6),
    mushroomCap:new THREE.SphereGeometry(.14,7,5),
    plotPipe:new THREE.CylinderGeometry(.025,.025,1.45,6),
    waterfall:new THREE.BoxGeometry(.42,1.15,.06)
  };
  function part(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1,ry=0,cast=true){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.y=ry;
    mesh.castShadow=cast;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;mesh.userData.sharedMaterial=true;parent.add(mesh);return mesh;
  }
  function createTree(id,type,random){
    const group=new THREE.Group();group.userData.windSway=true;
    const yaw=random()*Math.PI*2,scale=.78+random()*.55;group.rotation.y=yaw;group.scale.setScalar(scale);
    const leaf=foliage[id]||foliage.meadow,wood=trunk[id]||trunk.meadow;
    if(id==="desert"&&(type==="cactus"||type.includes("dry"))){
      if(type==="cactus"){
        part(group,G.cactus,mats.cactus,0,.68,0,1,1,1,0,true);
        for(const side of [-1,1]){
          part(group,G.cactusArm,mats.cactus,side*.25,.83,0,1,1,1,0,true).rotation.z=-side*.55;
          part(group,G.cactusArm,mats.cactus,side*.25,1.12,0,1,.8,1,0,true).rotation.z=-side*.08;
        }
        part(group,G.flower,mats.cactusFlower,.02,1.38,0,1.25,1.25,1.25);
      }else{
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5;part(group,G.smallTrunk,mats.deadwood,Math.cos(a)*.22,.28,Math.sin(a)*.22,.55,.9,.55,a,false);}
        part(group,G.crownSmall,mats.drySand,0,.35,0,1.25,.55,1.1);
      }
    }else if(type==="palm"){
      part(group,G.palmTrunk,wood,0,1.1,0,1,1,1,0,true).rotation.z=-.08;
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const frond=part(group,G.broadLeaf,mats.leafLight,Math.cos(a)*.38,2.12,Math.sin(a)*.38,1,1,1,a,false);
        frond.rotation.x=-.32;frond.rotation.z=Math.cos(a)*.13;
        part(group,G.fernLeaf,leaf,Math.cos(a)*.18,2.06,Math.sin(a)*.18,.8,1.15,.8,a,false);
      }
      if(random()>.35)for(let i=0;i<3;i++)part(group,G.crownSmall,mats.flowerA,Math.cos(i*2.1)*.16,1.8,Math.sin(i*2.1)*.16,.42,.42,.42);
    }else if(id==="mountain"||id==="snow"||type.includes("pine")||type.includes("fir")){
      part(group,G.smallTrunk,wood,0,.42,0,1,1.8,1,0,true);
      const evergreen=id==="snow"?mats.leafDark:leaf;
      for(let level=0;level<4;level++){
        const radius=1-level*.16,y=.68+level*.43;
        part(group,G.pine,evergreen,0,y,0,radius,1,radius,0,true);
        if(id==="snow")part(group,G.pineSnow,mats.snow,0,y+.16,0,radius*.82,.72,radius*.82,0,false);
      }
    }else if(id==="tropical"){
      part(group,G.smallTrunk,wood,0,.42,0,1.2,1.45,1.2,0,true);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leafMesh=part(group,G.broadLeaf,mats.leafLight,Math.cos(a)*.3,.92,Math.sin(a)*.3,1.6,1.2,1.2,a,false);leafMesh.rotation.x=-.45;}
    }else{
      part(group,G.trunk,wood,0,.62,0,1,1,1,0,true);
      const crownCount=id==="meadow"?3:4;
      for(let i=0;i<crownCount;i++){
        const a=i*Math.PI*2/crownCount;
        part(group,G.crown,leaf,Math.cos(a)*.34,1.26+(i%2)*.13,Math.sin(a)*.34,.9+random()*.25,.82+random()*.22,.9+random()*.25,random()*Math.PI*2,true);
      }
      part(group,G.crownSmall,leaf,0,1.72,0,1.2,.9,1.2,random()*Math.PI*2,true);
    }
    return group;
  }
  function createBush(id,random){
    const group=new THREE.Group(),leaf=foliage[id]||foliage.meadow;
    for(let i=0;i<4;i++){const a=i*Math.PI/2;part(group,G.crownSmall,leaf,Math.cos(a)*.2,.2+(i%2)*.08,Math.sin(a)*.2,.9+random()*.5,.7+random()*.3,.9+random()*.4,random()*Math.PI*2,false);}
    return group;
  }
  function createFlower(random){
    const group=new THREE.Group();part(group,G.smallTrunk,mats.grass,0,.18,0,.34,.52,.34,0,false);
    const material=random()>.5?mats.flowerA:mats.flowerB;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;part(group,G.flower,material,Math.cos(a)*.11,.42,Math.sin(a)*.11,.9,1,.9,0,false);}
    part(group,G.flower,mats.flowerA,0,.44,0,.7,.7,.7,0,false);return group;
  }
  function createMushroom(){
    const group=new THREE.Group();part(group,G.mushroomStem,mats.mushroomStem,0,.1,0,1,1,1,0,false);part(group,G.mushroomCap,mats.mushroomCap,0,.23,0,1.1,.55,1.1,0,false);return group;
  }
  function createFern(random){
    const group=new THREE.Group();
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leafMesh=part(group,G.broadLeaf,mats.leafDark,Math.cos(a)*.25,.18+random()*.08,Math.sin(a)*.25,.5,.8,.8,a,false);leafMesh.rotation.x=-.42;}
    return group;
  }
  function createRock(id,random,kind="rock"){
    const group=new THREE.Group(),material=rocks[id]||rocks.meadow;
    if(kind==="crystal"||kind==="ice"){
      const crystalMaterial=id==="snow"?mats.ice:mats.crystal;
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;part(group,G.crystal,crystalMaterial,Math.cos(a)*.18,.3+(i%2)*.16,Math.sin(a)*.18,.7+random()*.7,1.4+random(),.7+random()*.5,a,true);}
    }else{
      const size=kind==="cliff"||kind==="canyon"?1.6:.8+random()*.55;
      part(group,G.rock,material,0,size*.3,0,size,size*.72,size*.92,random()*Math.PI*2,true);
      if(kind!=="cliff"&&random()>.28){part(group,G.rockSmall,material,.42,.18,.27,.9,.8,1,random()*Math.PI*2,true);part(group,G.rockSmall,material,-.42,.14,-.24,.7,.65,.75,random()*Math.PI*2,true);}
    }
    return group;
  }
  function createMound(id,random,kind){
    const group=new THREE.Group(),material=kind==="dune"?mats.sand:mats.snow;
    part(group,G.mound,material,0,.15,0,1.5+random(),.42,1+random()*.6,random()*Math.PI*2,false);
    if(kind==="dune")part(group,G.mound,mats.drySand,.35,.12,-.08,.9,.25,.55,random()*Math.PI*2,false);
    return group;
  }
  function placeObject(parent,object,x,z,height,random,scale=1){
    object.position.set(x,height,z);object.rotation.y+=random()*Math.PI*2;object.scale.multiplyScalar(scale);parent.add(object);
  }
  function makeWater(group,id,x,z,height,random,frozen=false,kind="pond"){
    const material=frozen?mats.ice:waterMaterials[id]||waterMaterials.meadow;
    const water=part(group,new THREE.CircleGeometry(1,9),material,x,height+.035,z,kind==="river"?2.8:1.35+random()*.8,kind==="river"?.52:0.8+random()*.55,1,random()*Math.PI,false);
    water.rotation.x=-Math.PI/2;water.userData.sharedGeometry=false;
    if(frozen){
      part(group,G.rockSmall,mats.snow,x-.55,height+.1,z+.2,.8,.25,.7,random(),false);
      part(group,G.rockSmall,mats.snow,x+.5,height+.1,z-.18,.65,.2,.55,random(),false);
    }
  }
  function addInstanced(group,geometry,material,items){
    if(!items.length)return null;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();
    items.forEach((item,index)=>{dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(0,item.r,0);dummy.scale.setScalar(item.s);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;mesh.userData.sharedMaterial=true;group.add(mesh);return mesh;
  }
  function decoratePlot(parent,id){
    if(id==="desert"||id==="snow"){
      const material=id==="desert"?mats.irrigation:mats.heater;
      for(const z of [-.72,.72]){
        const pipe=part(parent,G.plotPipe,material,0,.34,z,1,1,1,0,false);
        pipe.rotation.z=Math.PI/2;
      }
    }else if(id==="mountain"){
      for(const x of [-.72,.72])for(const z of [-.72,.72])
        part(parent,G.rockSmall,rocks.mountain,x,.24,z,.5,.42,.5,Math.PI*.18,false);
    }else if(id==="tropical"){
      for(const z of [-.68,.68]){
        const leafMesh=part(parent,G.broadLeaf,mats.leafDark,0,.34,z,.62,.7,.7,0,false);
        leafMesh.rotation.x=-.5;
      }
    }
  }
  function addCustomMesh(parent,geometry,material,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.sharedGeometry=false;mesh.userData.sharedMaterial=true;parent.add(mesh);return mesh;
  }
  function createFacetedPeak(parent,x,z,width,height,depth,random,snowCap=false,baseColor=0x858d8d){
    const sides=7,vertices=[],indices=[];
    const rings=[
      {y:0,r:1},
      {y:height*.36,r:.78},
      {y:height*.72,r:.42}
    ];
    for(let ring=0;ring<rings.length;ring++){
      const data=rings[ring];
      for(let i=0;i<sides;i++){
        const angle=i*Math.PI*2/sides+(ring%2)*.11;
        const variation=.82+random()*.34;
        vertices.push(Math.cos(angle)*width*data.r*variation,data.y+(random()-.5)*height*.09,Math.sin(angle)*depth*data.r*variation);
      }
    }
    const apex=vertices.length/3;vertices.push((random()-.5)*width*.12,height, (random()-.5)*depth*.12);
    for(let ring=0;ring<2;ring++)for(let i=0;i<sides;i++){
      const a=ring*sides+i,b=ring*sides+(i+1)%sides,c=(ring+1)*sides+i,d=(ring+1)*sides+(i+1)%sides;
      if((i+ring)%2){indices.push(a,c,b,b,c,d);}else{indices.push(a,c,d,a,d,b);}
    }
    for(let i=0;i<sides;i++)indices.push(2*sides+i,apex,2*sides+(i+1)%sides);
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const rockMat=new THREE.MeshStandardMaterial({color:baseColor,roughness:1,flatShading:true});
    const peak=addCustomMesh(parent,geo,rockMat,x,0,z);peak.userData.sharedMaterial=false;
    if(snowCap){
      const capGeo=new THREE.ConeGeometry(width*.24,height*.25,6,1);
      const cap=addCustomMesh(parent,capGeo,mats.snow,x,height*.86,z);cap.userData.sharedMaterial=true;cap.rotation.y=random()*Math.PI;
    }
    return peak;
  }
  function makeIrregularWater(parent,id,cx,cz,rx,rz,y,random,shore=true){
    const count=32,angles=[],radii=[];
    for(let i=0;i<count;i++){angles.push(i*Math.PI*2/count);radii.push(.88+random()*.24);}
    if(shore){
      const bankVertices=[],bankIndices=[];
      for(let i=0;i<count;i++){
        const a=angles[i],r=radii[i],next=angles[(i+1)%count],nr=radii[(i+1)%count];
        bankVertices.push(Math.cos(a)*rx*r,y-.035,Math.sin(a)*rz*r,Math.cos(a)*rx*r*1.17,y-.055,Math.sin(a)*rz*r*1.17);
        bankIndices.push(i*2,i*2+1,((i+1)%count)*2+1,i*2,((i+1)%count)*2+1,((i+1)%count)*2);
      }
      const bankGeo=new THREE.BufferGeometry();bankGeo.setAttribute("position",new THREE.Float32BufferAttribute(bankVertices,3));bankGeo.setIndex(bankIndices);bankGeo.computeVertexNormals();
      const bankMat=id==="desert"?mats.sand:new THREE.MeshStandardMaterial({color:0x77816d,roughness:1});
      const bank=addCustomMesh(parent,bankGeo,bankMat,cx,0,cz);bank.userData.sharedMaterial=id==="desert";
    }
    const vertices=[0,y,0],indices=[];
    for(let i=0;i<count;i++){const a=angles[i],r=radii[i];vertices.push(Math.cos(a)*rx*r,y+.012,Math.sin(a)*rz*r);}
    for(let i=0;i<count;i++)indices.push(0,i+1,(i+1)%count+1);
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const water=addCustomMesh(parent,geo,waterMaterials[id]||waterMaterials.meadow,cx,0,cz);water.castShadow=false;
    return water;
  }
  function createRiverRibbon(parent,points,width,material){
    const vertices=[],indices=[];
    for(let i=0;i<points.length;i++){
      const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
      const dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
      vertices.push(p.x+nx*width*.5,p.y,p.z+nz*width*.5,p.x-nx*width*.5,p.y,p.z-nz*width*.5);
      if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,d,a,d,c);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const river=addCustomMesh(parent,geo,material);river.castShadow=false;return river;
  }
  function createWoodBridge(parent,x,z,span=3.2){
    const group=new THREE.Group();group.position.set(x,.12,z);parent.add(group);
    const wood=new THREE.MeshStandardMaterial({color:0x855532,roughness:.9});
    const darkWood=new THREE.MeshStandardMaterial({color:0x593a27,roughness:1});
    for(let i=0;i<11;i++){
      const board=new THREE.Mesh(new THREE.BoxGeometry(span,.12,.22),i%3===0?darkWood:wood);
      board.position.set(0,0,(i-5)*.23);board.castShadow=true;board.receiveShadow=true;group.add(board);
    }
    for(const side of [-1,1]){
      for(const xSide of [-1,1]){
        const post=new THREE.Mesh(new THREE.BoxGeometry(.16,.72,.16),darkWood);post.position.set(xSide*(span*.5-.12),.34,side*.96);post.castShadow=true;group.add(post);
      }
      const rail=new THREE.Mesh(new THREE.BoxGeometry(span,.13,.14),wood);rail.position.set(0,.62,side*.96);group.add(rail);
    }
    group.traverse(o=>{if(o.isMesh)o.userData.sharedMaterial=false;});
    return group;
  }
  function addMountainValley(group,random,heightAt){
    // A jagged, triangulated mountain wall frames the rear of the playable valley.
    const peaks=[[-11,-18,5.8,12.8,3.8],[-5.9,-19.1,5.1,10.6,3.5],[0,-19.8,6.3,14.5,4.1],[6.4,-18.9,5.3,11.8,3.5],[12,-17.7,5.8,13.2,3.8]];
    for(const [x,z,w,h,d] of peaks)createFacetedPeak(group,x,z,w,h,d,random,true);
    // Exposed rock faces on both valley shoulders.
    for(const side of [-1,1]){
      const cliffMat=new THREE.MeshStandardMaterial({color:side<0?0x626d70:0x737c78,roughness:1,flatShading:true});
      const cliffGeo=new THREE.DodecahedronGeometry(1,1);
      const cliff=addCustomMesh(group,cliffGeo,cliffMat,side*10.8,2.35,-11.8);cliff.scale.set(5.2,4.6,2.1);cliff.rotation.set(.12,side*.14,.08);cliff.userData.sharedMaterial=false;
      for(let i=0;i<7;i++){
        const tree=createTree("mountain","pine",random);
        placeObject(group,tree,side*(8.8+random()*5),heightAt(side*9,-13+random()*6),-13+random()*7,random,.8+random()*.75);
      }
    }
    // A tall visible waterfall spilling from the rear cliff into the valley stream.
    const fallX=.2,fallZ=-15.3,topY=5.6,bottomY=.55,fallHeight=topY-bottomY;
    const fallGeo=new THREE.PlaneGeometry(2.25,fallHeight,8,12);
    const pos=fallGeo.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,Math.sin(x*3+y*1.2)*.045);}
    fallGeo.computeVertexNormals();
    const fallMat=new THREE.MeshStandardMaterial({color:0xbceeff,roughness:.12,metalness:.06,transparent:true,opacity:.78,side:THREE.DoubleSide,emissive:0x24506b,emissiveIntensity:.12});
    const fall=addCustomMesh(group,fallGeo,fallMat,fallX,(topY+bottomY)*.5,fallZ);fall.userData.sharedMaterial=false;fall.castShadow=false;
    for(let i=0;i<5;i++){
      const streakGeo=new THREE.PlaneGeometry(.055,fallHeight*(.52+random()*.4));
      const streak=addCustomMesh(group,streakGeo,mats.snow,fallX-.82+i*.4,(topY+bottomY)*.5,fallZ+.035);streak.userData.sharedMaterial=true;streak.material=mats.foam;
      streak.castShadow=false;
    }
    const foam=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mats.foam);foam.position.set(fallX,.62,fallZ+.42);foam.scale.set(1.75,.32,.75);foam.castShadow=false;group.add(foam);
    const riverPts=[];
    for(let i=0;i<=18;i++){const t=i/18,z=-14.9+t*7.2,x=.2+Math.sin(t*Math.PI*1.4)*.68;riverPts.push({x,y:.22+Math.sin(t*Math.PI)*.05,z});}
    createRiverRibbon(group,riverPts,1.35,waterMaterials.mountain);
    makeIrregularWater(group,"mountain",.15,-10.9,2.6,1.4,.24,random,false);
    createWoodBridge(group,.15,-9.0,3.6);
    for(let i=0;i<15;i++){
      const side=random()<.5?-1:1,x=.15+side*(1.35+random()*1.6),z=-8.2-random()*6.4;
      placeObject(group,createRock("mountain",random,"rock"),x,z,heightAt(x,z),random,.45+random()*.65);
      if(i%3===0)placeObject(group,createFern(random),x+side*.45,z-.25,heightAt(x,z),random,.75+random()*.45);
    }
    for(let i=0;i<10;i++){
      const side=i%2?1:-1,x=side*(5.2+random()*4.4),z=-8-random()*8;
      placeObject(group,createTree("mountain","pine",random),x,z,heightAt(x,z),random,.85+random()*.65);
    }
  }
  function addDesertOasis(group,random,heightAt){
    const lakeX=-1.1,lakeZ=-10.5,shoreY=.34;
    makeIrregularWater(group,"desert",lakeX,lakeZ,6.35,4.45,shoreY,random,true);
    // A second narrow inner lagoon edge creates a pale, shallow-water shoreline.
    makeIrregularWater(group,"desert",lakeX+.25,lakeZ-.08,5.9,4.0,shoreY+.025,random,false);
    const shallow=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshStandardMaterial({color:0x83dce4,roughness:.24,transparent:true,opacity:.3,side:THREE.DoubleSide}));
    shallow.rotation.x=-Math.PI/2;shallow.position.set(lakeX,shoreY+.045,lakeZ);shallow.scale.set(5.7,3.85,1);shallow.userData.sharedGeometry=false;shallow.userData.sharedMaterial=false;group.add(shallow);
    // Coconut palms with individually varied height and leaning trunks frame the shore.
    for(let i=0;i<11;i++){
      const angle=i*Math.PI*2/11+.17,radius=5.1+random()*1.1,x=lakeX+Math.cos(angle)*radius,z=lakeZ+Math.sin(angle)*radius;
      const palm=createTree("tropical","palm",random);palm.rotation.z=(random()-.5)*.3;palm.scale.setScalar(.78+random()*.65);
      placeObject(group,palm,x,z,heightAt(x,z),random,.95);
    }
    for(let i=0;i<12;i++){
      const angle=i*Math.PI*2/12+random()*.18,radius=8.1+random()*2.3,x=lakeX+Math.cos(angle)*radius,z=lakeZ+Math.sin(angle)*radius;
      placeObject(group,createTree("desert","cactus",random),x,z,heightAt(x,z),random,.72+random()*.58);
    }
    for(let i=0;i<7;i++){
      const x=lakeX+(random()-.5)*15,z=lakeZ+(random()-.5)*10;
      placeObject(group,createMound("desert",random,"dune"),x,z,heightAt(x,z),random,.65+random()*.75);
    }
    // Distant mesa silhouettes give the oasis the open, arid horizon from the reference.
    for(let i=0;i<7;i++){
      const x=-17+i*5.4,z=-17.5+random()*2.2,w=2.8+random()*2.1,h=3.4+random()*2.5;
      const mesa=new THREE.Mesh(new THREE.CylinderGeometry(w*.82,w,h,7,1),rocks.desert);
      mesa.position.set(x,h*.35,z);mesa.scale.y=.8;mesa.castShadow=true;mesa.userData.sharedGeometry=false;group.add(mesa);
    }
  }
  function createBackdrop(id){
    const group=new THREE.Group();group.name="biomeBackdrop-"+id;
    const random=seeded(id+"-distant-backdrop");
    const half=23.5;
    for(let i=0;i<18;i++){
      const angle=i*Math.PI*2/18,radius=half+random()*2.8;
      const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
      if(id==="mountain"||id==="snow"||id==="volcanic"){
        const height=(id==="mountain"?10.5:id==="snow"?9.2:7.5)+random()*6.5;
        const width=4.2+random()*3.2,depth=3.6+random()*2.4;
        const baseColor=id==="snow"?0x9aafba:id==="volcanic"?0x554b4b:0x77847d;
        createFacetedPeak(group,x,z,width,height,depth,random,id==="snow"||(id==="mountain"&&random()>.48),baseColor);
      }else if(id==="desert"){
        placeObject(group,createMound(id,random,"dune"),x,z,-.1,random,1.8+random());
      }else if(id==="tropical"){
        placeObject(group,createTree(id,"palm",random),x,z,-.12,random,1.3+random()*.45);
      }else{
        placeObject(group,createTree(id,id==="snow"?"snow-pine":id==="forest"?"pine":"tree",random),x,z,-.1,random,1.25+random()*.45);
      }
    }
    return group;
  }
  function createEnvironment(id,map,heightAt,tileSize=1.15){
    const group=new THREE.Group();group.name="biomeEnvironment-"+id;
    const random=seeded(map.seed+"-"+id+"-visuals");
    const half=map.size/2,occupied=new Set();
    for(const list of [map.obstacles,map.vegetation,map.resources])for(const item of list||[])occupied.add(Math.round(item.x)+":"+Math.round(item.z));
    for(const item of map.vegetation||[]){
      const x=item.x*tileSize,z=item.z*tileSize,y=heightAt(x,z);
      let object;
      if(item.type==="cactus"||item.type==="palm"||item.type==="pine"||item.type==="snow-pine"||item.type==="fir"||item.type==="broadleaf"||item.type==="tree"||item.type==="oak"||item.type==="willow")object=createTree(id,item.type,random);
      else if(item.type==="flower")object=createFlower(random);
      else if(item.type==="mushroom")object=createMushroom();
      else if(item.type==="fern")object=createFern(random);
      else object=createBush(id,random);
      placeObject(group,object,x,z,y,random,.78+random()*.55);
    }
    for(const item of map.obstacles||[]){
      const x=item.x*tileSize,z=item.z*tileSize,y=heightAt(x,z),type=item.type;
      if(["river","deep-water","flood-zone","frozen-lake"].includes(type)){
        makeWater(group,id,x,z,y,random,id==="snow"||type==="frozen-lake",type==="river"?"river":"pond");
        continue;
      }
      if(type==="dune"||type==="snowdrift")placeObject(group,createMound(id,random,id==="snow"?"snow":"dune"),x,z,y,random,.8+random()*.7);
      else if(type==="ice"||type==="crystal"||type==="cave")placeObject(group,createRock(id,random,"crystal"),x,z,y,random,.8+random()*.7);
      else if(["tree","dense-tree","fallen-tree","stump","thicket","reed-bed","dense-vegetation"].includes(type)){
        const treeKind=id==="snow"?"snow-pine":id==="mountain"?"pine":id==="tropical"?"broadleaf":"tree";
        if(type==="fallen-tree"||type==="stump")placeObject(group,createRock(id,random,"rock"),x,z,y,random,.9);
        else if(type==="reed-bed"||type==="thicket"||type==="dense-vegetation")placeObject(group,createFern(random),x,z,y,random,1.2);
        else placeObject(group,createTree(id,treeKind,random),x,z,y,random,.85+random()*.45);
      }else if(type==="lava"||type==="crater"||type==="steam-vent"||type==="hot-rock"){
        placeObject(group,createRock("volcanic",random,"rock"),x,z,y,random,1.1);
      }else placeObject(group,createRock(id,random,type==="cliff"||type==="ravine"||type==="canyon"?"cliff":"rock"),x,z,y,random,.75+random()*.65);
    }
    // Signature water feature sits beyond the starter plots and the central robot route.
    const waterSpots=[[-12,-11],[12,-11],[-12,12],[12,12],[0,-14],[-14,0]];
    let waterSpot=null;
    for(const [x,z] of waterSpots){
      const cellX=Math.round(x/tileSize),cellZ=Math.round(z/tileSize);
      if(Math.hypot(cellX,cellZ-7)<10.2||Math.abs(cellX)<2.3)continue;
      if([...occupied].some(key=>{const [ox,oz]=key.split(":").map(Number);return Math.hypot(ox-cellX,oz-cellZ)<2.2;}))continue;
      waterSpot={x,z};break;
    }
    if(waterSpot){
      makeWater(group,id,waterSpot.x,waterSpot.z,heightAt(waterSpot.x,waterSpot.z),random,id==="snow",id==="mountain"?"river":"pond");
      if(id==="desert"){
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const px=waterSpot.x+Math.cos(a)*2.4,pz=waterSpot.z+Math.sin(a)*2.4;placeObject(group,createTree("tropical","palm",random),px,pz,heightAt(px,pz),random,.72);}
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5,px=waterSpot.x+Math.cos(a)*3.3,pz=waterSpot.z+Math.sin(a)*3.3;placeObject(group,createFlower(random),px,pz,heightAt(px,pz),random,.8);}
      }else if(id==="mountain"){
        part(group,G.waterfall,waterMaterials.mountain,waterSpot.x+2.1,heightAt(waterSpot.x+2.1,waterSpot.z)+.58,waterSpot.z,1,1,1,0,false);
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5,px=waterSpot.x+Math.cos(a)*3.2,pz=waterSpot.z+Math.sin(a)*3.2;placeObject(group,createFern(random),px,pz,heightAt(px,pz),random,.85);}
      }else if(id==="tropical"){
        for(let i=0;i<7;i++){const a=i*Math.PI*2/7,px=waterSpot.x+Math.cos(a)*3.2,pz=waterSpot.z+Math.sin(a)*3.2;placeObject(group,createFern(random),px,pz,heightAt(px,pz),random,.9);}
      }else if(id==="snow"){
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5,px=waterSpot.x+Math.cos(a)*3.1,pz=waterSpot.z+Math.sin(a)*3.1;placeObject(group,createRock("snow",random,"ice"),px,pz,heightAt(px,pz),random,.45);}
      }
    }
    if(id==="mountain")addMountainValley(group,random,heightAt);
    if(id==="desert")addDesertOasis(group,random,heightAt);
    // Light scatter is InstancedMesh-based and avoids plots, resources, obstacles, and the robot corridor.
    const pebbles=[],tufts=[];
    for(let z=-half+2;z<half-2;z++)for(let x=-half+2;x<half-2;x++){
      if(Math.hypot(x,z-7)<10.2||Math.abs(x)<2.1||occupied.has(x+":"+z)||random()>.035)continue;
      const px=x*tileSize+(random()-.5)*.45,pz=z*tileSize+(random()-.5)*.45;
      if(map.plots?.some(plot=>Math.hypot(px-plot.x,pz-plot.z)<1.25))continue;
      const y=heightAt(px,pz);
      pebbles.push({x:px,y:y+.08,z:pz,r:random()*Math.PI*2,s:.55+random()*.85});
      if(random()<.35)tufts.push({x:px,y:y+.12,z:pz,r:random()*Math.PI*2,s:.55+random()*.55});
    }
    addInstanced(group,G.pebble,rocks[id]||rocks.meadow,pebbles);
    if(id==="meadow"||id==="tropical"||id==="forest"||id==="swamp")addInstanced(group,G.grassBlade,mats.grass,tufts);
    // Small stylised dunes/berms on the desert edge and snow banks frame the valley.
    if(id==="desert"||id==="snow"){
      for(let i=0;i<5;i++){
        const x=(i-2)*5.1,z=-half*tileSize+4+(i%2)*1.4;
        if(Math.hypot(x,z-7)<10)continue;
        placeObject(group,createMound(id,random,id==="snow"?"snow":"dune"),x,z,heightAt(x,z),random,.75+random()*.4);
      }
    }
    return group;
  }
  const atmosphere=Object.fromEntries(Object.entries(ART).map(([id,p])=>[id,{sky:p.sky,fog:p.fog,sun:p.sun,fogNear:id==="snow"?14:id==="tropical"?18:22,fogFar:id==="desert"?62:id==="mountain"?68:id==="tropical"?52:58}]));
  return { terrainMaterials,soilMaterials,plotRimMaterials,waterMaterials,atmosphere,createEnvironment,createBackdrop,decoratePlot,art:ART };
}
