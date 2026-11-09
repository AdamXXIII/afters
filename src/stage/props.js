// Table, tablecloth, room and dinner props (DESIGN 3.6). Built once; screens toggle visibility.
import * as THREE from 'three';
import { radialTexture, weaveNormalTexture, willowPlateTexture, wallTexture, woodTexture, paperTexture } from './textures.js';
import { mulberry32 } from '../util/rng.js';

export const TABLE_Y = -0.02; // tablecloth top; Cyril's holder sits on it

const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

export function buildRoom() {
  const group = new THREE.Group();
  group.name = 'room';

  // Table (oak) under the cloth
  const wood = new THREE.MeshStandardMaterial({ color: '#5A3424', roughness: 0.55, map: woodTexture() });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 64), wood);
  table.position.y = TABLE_Y - 0.03;
  group.add(table);

  // Tablecloth: top disc + skirt with sine folds
  const weave = weaveNormalTexture(256);
  const cloth = new THREE.MeshStandardMaterial({ color: '#F3E6D3', roughness: 0.95, normalMap: weave, normalScale: new THREE.Vector2(0.35, 0.35) });
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.28, 96), cloth);
  top.rotation.x = -Math.PI / 2;
  top.position.y = TABLE_Y;
  group.add(top);
  const skirtGeo = new THREE.CylinderGeometry(1.28, 1.34, 0.42, 160, 6, true);
  const pos = skirtGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const depth = (0.21 - y) / 0.42; // 0 top -> 1 bottom
    const fold = Math.sin(a * 36) * 0.018 * depth + Math.sin(a * 11 + 1.3) * 0.01 * depth;
    const r = Math.hypot(x, z) + fold;
    pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
  }
  skirtGeo.computeVertexNormals();
  const skirt = new THREE.Mesh(skirtGeo, cloth);
  skirt.position.y = TABLE_Y - 0.21;
  group.add(skirt);

  // Back wall with gradient, window and picture
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: wallTexture(), fog: false }));
  wall.position.set(0, 0.9, -3.2);
  group.add(wall);

  // Floor (dark)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshStandardMaterial({ color: '#2A1510', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.75;
  group.add(floor);

  // Chair silhouettes around the back of the table (merged into one mesh)
  const chairMat = new THREE.MeshStandardMaterial({ color: '#4A2A1C', roughness: 0.6 });
  const back = new THREE.Shape();
  back.moveTo(-0.2, -0.33); back.lineTo(-0.2, 0.18);
  back.quadraticCurveTo(-0.2, 0.33, 0, 0.35); back.quadraticCurveTo(0.2, 0.33, 0.2, 0.18);
  back.lineTo(0.2, -0.33); back.lineTo(0.15, -0.33); back.lineTo(0.15, 0.12);
  back.quadraticCurveTo(0.14, 0.25, 0, 0.27); back.quadraticCurveTo(-0.14, 0.25, -0.15, 0.12);
  back.lineTo(-0.15, -0.33); back.closePath();
  const splat = new THREE.Shape();
  splat.moveTo(-0.045, -0.2); splat.lineTo(0.045, -0.2); splat.lineTo(0.06, 0.15); splat.quadraticCurveTo(0, 0.22, -0.06, 0.15); splat.closePath();
  const backGeo = new THREE.ExtrudeGeometry([back, splat], { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 10 });
  backGeo.translate(0, 0, -0.015);
  const chairs = new THREE.InstancedMesh(backGeo, chairMat, 8);
  const chairAngles = [22, -22, 62, -62, 102, -102, 142, -142].map((d) => THREE.MathUtils.degToRad(d));
  for (let i = 0; i < 8; i++) {
    const a = chairAngles[i];
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.sin(a) * 1.8, TABLE_Y + 0.02, -Math.cos(a) * 1.8),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a),
      new THREE.Vector3(1, 1, 1),
    );
    chairs.setMatrixAt(i, m);
  }
  group.add(chairs);

  return group;
}

/** Seats are spread over the back 220 degrees so no avatar blocks the camera. */
export function seatAngle(i) {
  const order = [0, 1, -1, 2, -2, 3, -3, 4];
  return (order[i] / 4) * THREE.MathUtils.degToRad(105);
}

export function seatPosition(i, r = 0.74) {
  const a = seatAngle(i);
  return new THREE.Vector3(Math.sin(a) * r, TABLE_Y, -Math.cos(a) * r);
}

export function buildProps() {
  const group = new THREE.Group();
  group.name = 'props';
  const rng = mulberry32(7);

  // Wine glasses (one with claret)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#FFF8EE', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, specularIntensity: 1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const glassGeo = lathe([[0, 0], [0.04, 0], [0.04, 0.003], [0.006, 0.008], [0.004, 0.09], [0.01, 0.1], [0.038, 0.13], [0.045, 0.17], [0.042, 0.21], [0.04, 0.215]], 28);
  const wineGeo = lathe([[0, 0.11], [0.025, 0.118], [0.038, 0.135], [0.042, 0.155], [0, 0.155]], 24);
  const wineMat = new THREE.MeshStandardMaterial({ color: '#5E0F1C', roughness: 0.15, transparent: true, opacity: 0.9 });
  for (const [x, z, wine] of [[-0.34, 0.18, true], [0.42, -0.12, false]]) {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.renderOrder = 2;
    g.add(glass);
    if (wine) g.add(new THREE.Mesh(wineGeo, wineMat));
    g.position.set(x, TABLE_Y, z);
    group.add(g);
  }

  // Willow plate
  const plate = new THREE.Mesh(
    lathe([[0, 0], [0.11, 0], [0.12, 0.004], [0.15, 0.012], [0.16, 0.016], [0.158, 0.018], [0.12, 0.009], [0, 0.007]], 48),
    new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 }),
  );
  plate.position.set(0.26, TABLE_Y, 0.26);
  group.add(plate);
  const plateTop = new THREE.Mesh(new THREE.CircleGeometry(0.155, 48), new THREE.MeshStandardMaterial({ map: willowPlateTexture(512), roughness: 0.22, polygonOffset: true, polygonOffsetFactor: -1 }));
  plateTop.rotation.x = -Math.PI / 2;
  plateTop.position.set(0.26, TABLE_Y + 0.0085, 0.26);
  group.add(plateTop);

  // Cheese board: rounded oak paddle with a handle, three proper wedges and a bunch of grapes
  const cheeseGroup = new THREE.Group();
  const paddle = new THREE.Shape();
  const bw = 0.15; const bd = 0.09; const rr = 0.03;
  paddle.moveTo(-bw + rr, -bd); paddle.lineTo(bw - rr, -bd); paddle.quadraticCurveTo(bw, -bd, bw, -bd + rr);
  paddle.lineTo(bw, -0.022); paddle.lineTo(bw + 0.07, -0.016); paddle.quadraticCurveTo(bw + 0.09, 0, bw + 0.07, 0.016); paddle.lineTo(bw, 0.022);
  paddle.lineTo(bw, bd - rr); paddle.quadraticCurveTo(bw, bd, bw - rr, bd); paddle.lineTo(-bw + rr, bd);
  paddle.quadraticCurveTo(-bw, bd, -bw, bd - rr); paddle.lineTo(-bw, -bd + rr); paddle.quadraticCurveTo(-bw, -bd, -bw + rr, -bd);
  const hole = new THREE.Path(); hole.absarc(bw + 0.06, 0, 0.007, 0, Math.PI * 2, true); paddle.holes.push(hole);
  const boardGeo = new THREE.ExtrudeGeometry(paddle, { depth: 0.014, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 3, curveSegments: 16 });
  boardGeo.rotateX(-Math.PI / 2);
  const board = new THREE.Mesh(boardGeo, new THREE.MeshStandardMaterial({ color: '#9A6542', roughness: 0.5, map: woodTexture(128) }));
  board.position.y = 0.003;
  cheeseGroup.add(board);
  const cheeseMat = new THREE.MeshStandardMaterial({ color: '#F4C95D', roughness: 0.5 });
  const rindMat = new THREE.MeshStandardMaterial({ color: '#E3A93B', roughness: 0.7 });
  const wedge = new THREE.Shape();
  wedge.moveTo(0, 0); wedge.lineTo(0.075, 0); wedge.quadraticCurveTo(0.07, 0.03, 0.004, 0.045); wedge.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(wedge, { depth: 0.04, bevelEnabled: true, bevelSize: 0.0025, bevelThickness: 0.0025, bevelSegments: 2 });
  wedgeGeo.rotateX(-Math.PI / 2);
  for (const [x, z, ry, sc] of [[-0.1, 0.03, 0.4, 1], [-0.01, -0.035, 2.3, 0.85], [0.07, 0.04, -0.6, 0.75]]) {
    const w = new THREE.Mesh(wedgeGeo, cheeseMat);
    w.position.set(x, 0.021, z); w.rotation.y = ry; w.scale.setScalar(sc);
    cheeseGroup.add(w);
  }
  const brie = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.022, 28), new THREE.MeshStandardMaterial({ color: '#F7F0E2', roughness: 0.85 }));
  brie.position.set(0.09, 0.032, -0.04);
  cheeseGroup.add(brie);
  const grapeMat = new THREE.MeshStandardMaterial({ color: '#5B2A4A', roughness: 0.25 });
  const grapes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 10, 8), grapeMat, 9);
  [[0, 0, 0], [0.02, 0, 0.004], [-0.02, 0, 0.006], [0.01, 0, 0.02], [-0.01, 0, 0.022], [0, 0, -0.02], [0.012, 0.016, 0.008], [-0.01, 0.016, 0.006], [0, 0.016, -0.008]].forEach(([x, y, z], i) => {
    grapes.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x - 0.04, 0.033 + y, z + 0.06));
  });
  cheeseGroup.add(grapes);
  cheeseGroup.position.set(-0.42, TABLE_Y, -0.2);
  cheeseGroup.rotation.y = 0.55;
  group.add(cheeseGroup);

  // Cutlery (merged fork + knife), silver
  const silver = new THREE.MeshStandardMaterial({ color: '#D9D4CC', metalness: 0.9, roughness: 0.25 });
  const knife = new THREE.BoxGeometry(0.012, 0.003, 0.2); knife.translate(0.46, TABLE_Y + 0.002, 0.3);
  const fork = new THREE.BoxGeometry(0.012, 0.003, 0.19); fork.translate(0.07, TABLE_Y + 0.002, 0.3);
  const cut = new THREE.Mesh(knife, silver); group.add(cut);
  const cut2 = new THREE.Mesh(fork, silver); group.add(cut2);

  // Napkin: a folded claret square with a soft crease
  const napGeo = new THREE.BoxGeometry(0.15, 0.006, 0.1, 6, 1, 1);
  { const p = napGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.cos(p.getX(i) / 0.075 * Math.PI * 0.5) * 0.004); napGeo.computeVertexNormals(); }
  const nap = new THREE.Mesh(napGeo, new THREE.MeshStandardMaterial({ color: '#7A1E2C', roughness: 0.85, map: paperTexture(64, '#8A2836') }));
  nap.rotation.y = 0.4;
  nap.position.set(-0.16, TABLE_Y + 0.004, 0.44);
  group.add(nap);

  // Crumbs (one InstancedMesh)
  const crumbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.005, 0), new THREE.MeshStandardMaterial({ color: '#C9A06B', roughness: 0.9 }), 40);
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2; const r = 0.2 + rng() * 0.7;
    const s = 0.5 + rng();
    crumbs.setMatrixAt(i, new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * r, TABLE_Y + 0.002, Math.sin(a) * r * 0.8),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3)),
      new THREE.Vector3(s, s * 0.6, s),
    ));
  }
  group.add(crumbs);

  // Blob shadows (instanced, one radial texture)
  const blobMat = new THREE.MeshBasicMaterial({ map: radialTexture({ size: 64, inner: 'rgba(40,20,14,0.55)', outer: 'rgba(40,20,14,0)' }), transparent: true, depthWrite: false });
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat, 6);
  const blobAt = [[-0.34, 0.18, 0.12], [0.42, -0.12, 0.12], [0.26, 0.26, 0.36], [-0.42, -0.2, 0.42], [0, 0, 0.34]];
  blobAt.forEach(([x, z, s], i) => blobs.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, TABLE_Y + 0.001, z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s))));
  blobs.count = blobAt.length;
  group.add(blobs);

  return group;
}

/** Three-tier cake for the podium, with a little candle "cousin" on top. */
export function buildCake() {
  const g = new THREE.Group();
  g.name = 'cake';
  const sponge = new THREE.MeshStandardMaterial({ color: '#FBF0DD', roughness: 0.5 });
  const icing = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.35 });
  const ribbon = new THREE.MeshStandardMaterial({ color: '#7A1E2C', roughness: 0.5 });
  const tiers = [[0.2, 0.08], [0.14, 0.07], [0.09, 0.06]];
  let y = 0;
  g.userData.tiers = [];
  tiers.forEach(([r, h]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), sponge);
    t.position.y = y + h / 2;
    g.add(t);
    const drip = new THREE.Mesh(lathe([[r + 0.003, h - 0.02], [r + 0.006, h - 0.005], [r * 0.6, h + 0.004], [0, h + 0.004]], 48), icing);
    drip.position.y = y;
    g.add(drip);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, 0.012, 48, 1, true), ribbon);
    band.position.y = y + 0.015;
    g.add(band);
    g.userData.tiers.push({ top: y + h, r });
    y += h;
  });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.05, 12), new THREE.MeshStandardMaterial({ color: '#F3E6CF', roughness: 0.5 }));
  candle.position.set(0, y + 0.025, -0.055);
  g.add(candle);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture({ size: 64, inner: 'rgba(255,240,200,1)', mid: 'rgba(255,190,100,0.6)', outer: 'rgba(255,150,60,0)' }), blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.scale.set(0.03, 0.05, 1);
  flame.position.set(0, y + 0.07, -0.055);
  g.add(flame);
  return g;
}

/** Bread roll and rose meshes for thrown reactions. */
export function buildThrowables() {
  const roll = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: '#C98A4B', roughness: 0.75 }));
  roll.scale.set(1.3, 0.8, 1);
  const rose = new THREE.Group();
  const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 1), new THREE.MeshStandardMaterial({ color: '#B0243A', roughness: 0.6, flatShading: true }));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.09, 5), new THREE.MeshStandardMaterial({ color: '#3F6B3A', roughness: 0.8 }));
  stem.position.y = -0.05;
  rose.add(bloom, stem);
  return { roll, rose };
}
