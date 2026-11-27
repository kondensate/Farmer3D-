// Procedural low-poly biome material and prop library for FarmerBot 3D.
export const BIOME_VISUAL_PALETTES = Object.freeze({
  meadow: { ground: "#719b55", detail: "#b6c879", soil: "#80563a", accent: "#4e8950", water: "#4b9eae", fog: "#9bc7c2", repeat: 9, roughness: .96 },
  desert: { ground: "#d4b477", detail: "#f0d59a", soil: "#a97843", accent: "#bd8b4e", water: "#3f9aa8", fog: "#e8c98f", repeat: 8, roughness: 1 },
  mountain: { ground: "#858d87", detail: "#b3aaa0", soil: "#765e4b", accent: "#41634b", water: "#579eb5", fog: "#b6c5cf", repeat: 8, roughness: .94 },
  snow: { ground: "#d8e7eb", detail: "#a9cbd8", soil: "#7c8990", accent: "#547d83", water: "#8bc8df", fog: "#d7e9f2", repeat: 8, roughness: .88 },
  tropical: { ground: "#4f9564", detail: "#83bd69", soil: "#594632", accent: "#24754b", water: "#27a9ad", fog: "#9bcfc6", repeat: 10, roughness: .93 },
  forest: { ground: "#496f45", detail: "#81944d", soil: "#654a34", accent: "#315b36", water: "#4d8d91", fog: "#a9bca3", repeat: 9, roughness: .98 },
  volcanic: { ground: "#514744", detail: "#806052", soil: "#352f30", accent: "#d35c35", water: "#554b50", fog: "#958078", repeat: 8, roughness: 1 },
  swamp: { ground: "#536f4d", detail: "#91a16a", soil: "#514632", accent: "#657e48", water: "#557d70", fog: "#9eaa88", repeat: 9, roughness: .98 }
});
const TEXTURE_SEEDS = { meadow: 11, desert: 23, mountain: 37, snow: 41, tropical: 53, forest: 67, volcanic: 79, swamp: 83 };
function makeGroundTexture(THREE, palette, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, 0, 128, 128);
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 190; i++) {
    const x = Math.floor(random() * 128), y = Math.floor(random() * 128);
    const size = 2 + Math.floor(random() * 7);
    ctx.globalAlpha = .12 + random() * .25;
    ctx.fillStyle = random() > .48 ? palette.detail : palette.soil;
    if (seed === TEXTURE_SEEDS.snow || seed === TEXTURE_SEEDS.mountain) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size, y + size * .35); ctx.lineTo(x + size * .35, y + size); ctx.closePath(); ctx.fill();
    } else if (seed === TEXTURE_SEEDS.desert) {
      ctx.fillRect(x, y, size * 1.5, 1 + random() * 2);
    } else {
      ctx.fillRect(x, y, size, size * (.35 + random() * .65));
    }
  }
  ctx.globalAlpha = 1;
  // A subtle tile grid preserves FarmerBot's original board-game ground language.
  ctx.strokeStyle = "rgba(35,48,30,.12)";
  ctx.lineWidth = 1;
  for (let p = 0; p <= 128; p += 32) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(128, p); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(palette.repeat, palette.repeat);
  texture.anisotropy = 2;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  return texture;
}
export function createBiomeVisualLibrary(THREE) {
  const terrainMaterials = {};
  const groundTextures = {};
  const waterMaterials = {};
  for (const [id, palette] of Object.entries(BIOME_VISUAL_PALETTES)) {
    const texture = makeGroundTexture(THREE, palette, TEXTURE_SEEDS[id]);
    groundTextures[id] = texture;
    terrainMaterials[id] = new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: palette.roughness });
    waterMaterials[id] = new THREE.MeshStandardMaterial({
      color: palette.water, roughness: .22, metalness: .04, transparent: true, opacity: .82
    });
  }
  return { terrainMaterials, groundTextures, waterMaterials };
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function makeTree(THREE, group, x, z, biome, scale, rotation, mats) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.075, .13, 1, 6), mats.trunk);
  trunk.position.set(x, .48 * scale, z); trunk.scale.setScalar(scale); trunk.rotation.y = rotation; trunk.castShadow = true; group.add(trunk);
  const crown = (geo, material, y, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y * scale, z); mesh.scale.set(sx * scale, sy * scale, sz * scale);
    mesh.rotation.y = rotation; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  };
  if (biome === "desert") {
    crown(new THREE.CylinderGeometry(.12, .17, 1.05, 7), mats.cactus, .9);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, .48, 6), mats.cactus);
      arm.position.set(x + side * .19 * scale, .85 * scale, z); arm.rotation.z = -side * .45; arm.scale.setScalar(scale); group.add(arm);
    }
  } else if (biome === "mountain" || biome === "snow") {
    for (let tier = 0; tier < 3; tier++) {
      crown(new THREE.ConeGeometry((.55 - tier * .11), .78, 7), biome === "snow" && tier === 0 ? mats.snow : mats.leaves, .95 + tier * .42);
    }
  } else if (biome === "tropical") {
    crown(new THREE.IcosahedronGeometry(.2, 0), mats.fruit, 1.28, 1, .7, 1);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(.13, .055, 1.3), mats.leaves);
      leaf.position.set(x + Math.cos(a) * .42 * scale, 1.35 * scale, z + Math.sin(a) * .42 * scale);
      leaf.rotation.set(-.42, a, Math.cos(a) * .16); leaf.scale.setScalar(scale); leaf.castShadow = true; group.add(leaf);
    }
  } else {
    crown(new THREE.IcosahedronGeometry(.72, 1), mats.leaves, 1.35, 1.05, .95, 1.05);
    crown(new THREE.IcosahedronGeometry(.46, 0), mats.leaves, 1.72, 1, .9, 1);
  }
}
export function createBiomeDecorationGroup(THREE, biomeId, seed = 1, reserved = []) {
  const group = new THREE.Group();
  const palette = BIOME_VISUAL_PALETTES[biomeId] || BIOME_VISUAL_PALETTES.meadow;
  const random = seeded((Number(seed) || 1) ^ (TEXTURE_SEEDS[biomeId] || 1));
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: .92, flatShading: true });
  const mats = {
    trunk: material(biomeId === "snow" ? 0x665746 : biomeId === "tropical" ? 0x8b633e : 0x765338),
    leaves: material(palette.accent), cactus: material(0x548653),
    snow: material(0xf0f7f7), fruit: material(0xe4a54c),
    rock: material(biomeId === "desert" ? 0xb28b5b : biomeId === "snow" ? 0x9eb4bd : 0x777e7d),
    detail: material(palette.detail)
  };
  const isReserved = (x, z) => reserved.some(p => Math.hypot(x - p.x, z - p.z) < (p.radius || 1.25));
  const treeCount = biomeId === "tropical" ? 22 : biomeId === "snow" ? 13 : biomeId === "desert" ? 7 : 16;
  for (let i = 0; i < treeCount; i++) {
    const angle = random() * Math.PI * 2, radius = 10 + random() * 9;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (isReserved(x, z)) continue;
    makeTree(THREE, group, x, z, biomeId, .78 + random() * .65, random() * Math.PI * 2, mats);
  }
  const rockGeometry = new THREE.IcosahedronGeometry(.36, 0);
  const rockInstances = new THREE.InstancedMesh(rockGeometry, mats.rock, 34);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < 34; i++) {
    const angle = random() * Math.PI * 2, radius = 8.8 + random() * 11;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (isReserved(x, z)) continue;
    dummy.position.set(x, .18, z);
    dummy.rotation.set(random() * .35, random() * Math.PI, random() * .3);
    const scale = .55 + random() * 1.5;
    dummy.scale.set(scale * 1.4, scale * .75, scale);
    dummy.updateMatrix(); rockInstances.setMatrixAt(placed++, dummy.matrix);
  }
  rockInstances.count = placed; rockInstances.castShadow = true; rockInstances.receiveShadow = true; group.add(rockInstances);
  const detailGeometry = new THREE.ConeGeometry(.12, .38, 5);
  const details = new THREE.InstancedMesh(detailGeometry, mats.detail, 42);
  placed = 0;
  for (let i = 0; i < 42; i++) {
    const x = (random() - .5) * 32, z = (random() - .5) * 32;
    if (Math.hypot(x, z - 7) < 9 || isReserved(x, z)) continue;
    dummy.position.set(x, .16, z); dummy.rotation.y = random() * Math.PI * 2;
    const scale = .45 + random() * .9; dummy.scale.setScalar(scale); dummy.updateMatrix();
    details.setMatrixAt(placed++, dummy.matrix);
  }
  details.count = placed; group.add(details);
  group.traverse(object => { if (object.isInstancedMesh) { object.instanceMatrix.needsUpdate = true; } });
  group.userData.dispose = () => {
    const geometries = new Set(), materials = new Set();
    group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
  };
  return group;
}
