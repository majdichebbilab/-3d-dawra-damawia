import * as THREE from 'three';

export interface TissueCapillaryRig {
  group: THREE.Group;
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
  };
  updateAnimation: (
    elapsed: number,
    delta: number,
    params: {
      bpm: number;
      isHealthy: boolean;
      slowMotion: boolean;
    },
  ) => void;
}

const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();

const _o2BloodColor = new THREE.Color(0xef4444); // أحمر قانٍ
const _co2BloodColor = new THREE.Color(0x4a0712); // أحمر قاتم

function createBiconcaveCellGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI;
    const r = Math.sin(angle) * 0.14;
    const pinch = 0.028 + 0.038 * Math.sin(angle) * Math.sin(angle);
    const y = Math.cos(angle) * pinch;
    pts.push(new THREE.Vector2(r, y));
  }
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the 2nd zoomed-in 3D micro-scene: Body Tissue / Muscle Cells + Systemic Capillary.
 * Blood arrives bright red (أحمر قانٍ, O2 + Nutrients) on the left,
 * delivers O2 + Glucose to surrounding tissue cells, picks up CO2 + Wastes,
 * and leaves dark crimson (أحمر قاتم) on the right toward the Vena Cava.
 */
export function buildTissueCapillaryRig(bumpTex: THREE.CanvasTexture): TissueCapillaryRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const group = new THREE.Group();
  group.visible = false;

  // 1. Surrounding Muscle / Tissue Cells Cluster with Cell Nuclei
  const cellsGroup = new THREE.Group();
  group.add(cellsGroup);

  const cellMembraneMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfca5a5,
      bumpMap: bumpTex,
      bumpScale: 0.022,
      roughness: 0.34,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  const nucleusMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x9f1239,
      roughness: 0.38,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.72,
    }),
  );

  const cellGeo = trackGeo(new THREE.SphereGeometry(1, 24, 18));
  const nucGeo = trackGeo(new THREE.SphereGeometry(0.22, 14, 12));

  const cellSpecs: [number, number, number, number, number, number][] = [
    [-1.18, -0.78, -0.35, 0.72, 0.55, 0.62],
    [0.0, -0.96, -0.25, 0.78, 0.56, 0.66],
    [1.18, -0.76, -0.35, 0.72, 0.55, 0.62],
    [-0.65, -0.58, -1.05, 0.68, 0.52, 0.62],
    [0.68, -0.56, -1.02, 0.68, 0.52, 0.62],
    [0.0, 0.92, -0.95, 0.76, 0.56, 0.62],
  ];

  cellSpecs.forEach(([cx, cy, cz, sx, sy, sz]) => {
    const cellMesh = new THREE.Mesh(cellGeo, cellMembraneMat);
    cellMesh.position.set(cx, cy, cz);
    cellMesh.scale.set(sx, sy, sz);
    cellMesh.renderOrder = 2;
    cellsGroup.add(cellMesh);

    const nucMesh = new THREE.Mesh(nucGeo, nucleusMat);
    nucMesh.position.set(cx, cy, cz);
    nucMesh.scale.set(1.1, 0.85, 0.95);
    cellsGroup.add(nucMesh);
  });

  // 2. Systemic Capillary Vessel (Left O2 أحمر قانٍ -> Right CO2 أحمر قاتم)
  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.65, 0.65, 0.2),
    new THREE.Vector3(-1.55, 0.32, 0.65),
    new THREE.Vector3(-0.6, 0.08, 0.78),
    new THREE.Vector3(0.45, 0.08, 0.76),
    new THREE.Vector3(1.5, 0.3, 0.62),
    new THREE.Vector3(2.65, 0.65, 0.2),
  ]);

  const capGeo = trackGeo(new THREE.TubeGeometry(capCurve, 64, 0.24, 18, false));
  const posAttr = capGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const t = THREE.MathUtils.smoothstep(vx, -0.95, 0.95);
    _color.copy(_o2BloodColor).lerp(_co2BloodColor, t);
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }
  capGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const capMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.25,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.renderOrder = 3;
  group.add(capMesh);

  // Arterial lipid narrowing plaque (visible when !isHealthy)
  const plaqueMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.5,
      clearcoat: 0.35,
      transparent: true,
      opacity: 0,
    }),
  );
  const plaqueRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.18, 0.07, 12, 22)),
    plaqueMat,
  );
  plaqueRing.position.set(-1.65, 0.35, 0.6);
  plaqueRing.rotation.y = Math.PI / 2;
  group.add(plaqueRing);

  // 3. Instanced Red Blood Cells (O2 أحمر قانٍ -> CO2 أحمر قاتم)
  const CELL_COUNT = 24;
  const rbcGeo = trackGeo(createBiconcaveCellGeometry());
  const rbcMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.14,
    }),
  );
  const bloodCells = new THREE.InstancedMesh(rbcGeo, rbcMat, CELL_COUNT);
  bloodCells.frustumCulled = false;
  bloodCells.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(CELL_COUNT * 3),
    3,
  );
  group.add(bloodCells);

  // 4. Diffusing O2 (Emerald), Nutrients/Glucose (Gold), & CO2/Wastes (Dark Slate)
  const O2_COUNT = 18;
  const NUTRIENT_COUNT = 16;
  const CO2_COUNT = 20;
  const gasGeo = trackGeo(new THREE.SphereGeometry(0.064, 12, 10));
  const nutrientGeo = trackGeo(new THREE.OctahedronGeometry(0.075, 1));

  const o2Mat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      clearcoat: 0.6,
    }),
  );
  const nutrientMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      clearcoat: 0.5,
    }),
  );
  const co2Mat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      emissive: 0x0f172a,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    }),
  );

  const o2Particles = new THREE.InstancedMesh(gasGeo, o2Mat, O2_COUNT);
  o2Particles.frustumCulled = false;
  group.add(o2Particles);

  const nutrientParticles = new THREE.InstancedMesh(nutrientGeo, nutrientMat, NUTRIENT_COUNT);
  nutrientParticles.frustumCulled = false;
  group.add(nutrientParticles);

  const co2Particles = new THREE.InstancedMesh(gasGeo, co2Mat, CO2_COUNT);
  co2Particles.frustumCulled = false;
  group.add(co2Particles);

  // Delivery curves: Capillary -> Body Tissue Cells
  const o2DeliveryCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, 0.28, 0.66),
    new THREE.Vector3(-0.65, 0.02, 0.72),
    new THREE.Vector3(-0.45, -0.45, 0.22),
    new THREE.Vector3(-0.35, -0.82, -0.28),
  ]);

  const nutrientDeliveryCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, 0.2, 0.7),
    new THREE.Vector3(-0.2, 0.04, 0.74),
    new THREE.Vector3(0.18, -0.48, 0.18),
    new THREE.Vector3(0.65, -0.78, -0.32),
  ]);

  // Return curve: Tissue Cells -> Venous Capillary
  const co2PickupCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, -0.82, -0.32),
    new THREE.Vector3(0.58, -0.32, 0.25),
    new THREE.Vector3(0.75, 0.14, 0.72),
    new THREE.Vector3(1.75, 0.4, 0.52),
  ]);

  const _healthyCellColor = new THREE.Color(0xfca5a5);
  const _stressedCellColor = new THREE.Color(0xd6b4b4);
  let healthProgress = 1;
  let simTime = 0;

  const updateAnimation: TissueCapillaryRig['updateAnimation'] = (
    elapsed,
    delta,
    { bpm, isHealthy, slowMotion },
  ) => {
    const dt = Math.min(delta, 0.05);
    const timeScale = slowMotion ? 0.32 : 1.0;
    simTime += dt * timeScale;

    healthProgress = THREE.MathUtils.damp(healthProgress, isHealthy ? 1 : 0, 5, dt);
    cellMembraneMat.color.copy(_stressedCellColor).lerp(_healthyCellColor, healthProgress);

    plaqueMat.opacity = (1 - healthProgress) * 0.85;
    plaqueRing.visible = healthProgress < 0.98;
    plaqueRing.scale.setScalar(1 - healthProgress * 0.35);

    const pulseScale = 1 + Math.sin(simTime * 2.2) * 0.025;
    cellsGroup.scale.setScalar(pulseScale);

    const speedFactor = (bpm / 72) * THREE.MathUtils.lerp(0.52, 1.0, healthProgress);

    for (let i = 0; i < CELL_COUNT; i++) {
      const t = (i / CELL_COUNT + simTime * 0.14 * speedFactor) % 1;
      capCurve.getPointAt(t, _pos);
      capCurve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      _scale.setScalar(1);
      _mat4.compose(_pos, _quat, _scale);
      bloodCells.setMatrixAt(i, _mat4);

      const deoxy = THREE.MathUtils.smoothstep(t, 0.34, 0.64);
      _color.copy(_o2BloodColor).lerp(_co2BloodColor, deoxy);
      bloodCells.setColorAt(i, _color);
    }
    bloodCells.instanceMatrix.needsUpdate = true;
    if (bloodCells.instanceColor) bloodCells.instanceColor.needsUpdate = true;

    for (let i = 0; i < O2_COUNT; i++) {
      const t = (i / O2_COUNT + simTime * 0.22 * speedFactor) % 1;
      o2DeliveryCurve.getPointAt(t, _pos);
      _pos.x += Math.sin(elapsed * 2.2 + i * 1.5) * 0.1;
      _pos.y += Math.cos(elapsed * 2.0 + i * 1.1) * 0.08;
      _quat.identity();
      _scale.setScalar(!isHealthy && i % 2 === 0 ? 0.25 : 1.0);
      _mat4.compose(_pos, _quat, _scale);
      o2Particles.setMatrixAt(i, _mat4);
    }
    o2Particles.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NUTRIENT_COUNT; i++) {
      const t = (i / NUTRIENT_COUNT + simTime * 0.18 * speedFactor) % 1;
      nutrientDeliveryCurve.getPointAt(t, _pos);
      _pos.x += Math.cos(elapsed * 1.9 + i * 1.7) * 0.1;
      _pos.z += Math.sin(elapsed * 2.1 + i * 1.3) * 0.08;
      _quat.setFromAxisAngle(_up, simTime * 2 + i);
      _scale.setScalar(!isHealthy && i % 3 === 0 ? 0.3 : 1.0);
      _mat4.compose(_pos, _quat, _scale);
      nutrientParticles.setMatrixAt(i, _mat4);
    }
    nutrientParticles.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < CO2_COUNT; i++) {
      const t = (i / CO2_COUNT + simTime * 0.2 * speedFactor) % 1;
      co2PickupCurve.getPointAt(t, _pos);
      _pos.x += Math.cos(elapsed * 2.3 + i * 1.8) * 0.1;
      _pos.y += Math.sin(elapsed * 2.0 + i * 1.2) * 0.08;
      _quat.identity();
      _scale.setScalar(1);
      _mat4.compose(_pos, _quat, _scale);
      co2Particles.setMatrixAt(i, _mat4);
    }
    co2Particles.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    disposables: { geometries, materials },
    updateAnimation,
  };
}
