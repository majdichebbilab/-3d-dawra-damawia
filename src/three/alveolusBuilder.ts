import * as THREE from 'three';

export interface AlveolusRig {
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

const _co2CellColor = new THREE.Color(0x4a0712); // أحمر قاتم
const _o2CellColor = new THREE.Color(0xef4444); // أحمر قانٍ

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

export function buildAlveolusRig(bumpTex: THREE.CanvasTexture): AlveolusRig {
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

  // 1. Terminal Bronchiole Airway + Grape-like Alveolar Sac Cluster
  const sacGroup = new THREE.Group();
  group.add(sacGroup);

  const bronchioleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      bumpMap: bumpTex,
      bumpScale: 0.02,
      roughness: 0.4,
      clearcoat: 0.3,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  const alveolusMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfda4af,
      bumpMap: bumpTex,
      bumpScale: 0.025,
      roughness: 0.28,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  const tarDepositMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.85,
      transparent: true,
      opacity: 0,
    }),
  );

  // Bronchiole neck entering from top
  const bronchioleMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.52, 1.45, 24, 1, true)),
    bronchioleMat,
  );
  bronchioleMesh.position.set(0, 1.55, 0);
  bronchioleMesh.renderOrder = 2;
  sacGroup.add(bronchioleMesh);

  // Main central Alveolar Chamber + surrounding cluster lobes
  const mainSac = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.18, 32, 24)),
    alveolusMat,
  );
  mainSac.position.set(0, 0.08, 0);
  mainSac.renderOrder = 2;
  sacGroup.add(mainSac);

  const lobeOffsets: [number, number, number, number][] = [
    [-0.86, -0.24, 0.35, 0.58],
    [0.86, -0.18, 0.32, 0.56],
    [0.0, -0.78, 0.42, 0.6],
    [-0.55, 0.52, -0.58, 0.52],
    [0.58, 0.48, -0.55, 0.52],
  ];
  const lobeGeo = trackGeo(new THREE.SphereGeometry(1, 22, 18));
  lobeOffsets.forEach(([x, y, z, s]) => {
    const lobe = new THREE.Mesh(lobeGeo, alveolusMat);
    lobe.position.set(x, y, z);
    lobe.scale.setScalar(s);
    lobe.renderOrder = 2;
    sacGroup.add(lobe);
  });

  // Smoking soot/tar patches (hidden when healthy, visible when unhealthy)
  const tarPatches: THREE.Mesh[] = [];
  const tarGeo = trackGeo(new THREE.SphereGeometry(0.24, 12, 10));
  [
    [-0.55, 0.2, 0.88],
    [0.62, -0.15, 0.82],
    [0.12, -0.68, 0.85],
    [-0.25, 0.65, 0.72],
    [0.48, 0.55, -0.68],
  ].forEach(([tx, ty, tz]) => {
    const patch = new THREE.Mesh(tarGeo, tarDepositMat);
    patch.position.set(tx, ty, tz);
    patch.scale.set(1.2, 0.75, 0.4);
    patch.lookAt(0, 0, 0);
    sacGroup.add(patch);
    tarPatches.push(patch);
  });

  // 2. Capillary Vessel Wrapping Snugly Around the Alveolus
  // Left side incoming (CO2 black) -> Bottom/Front exchange -> Right side outgoing (O2 bright red)
  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, -1.15, -0.3),
    new THREE.Vector3(-1.7, -0.65, 0.55),
    new THREE.Vector3(-0.95, -0.1, 1.24),
    new THREE.Vector3(0.0, 0.12, 1.38),
    new THREE.Vector3(0.95, -0.08, 1.24),
    new THREE.Vector3(1.75, -0.65, 0.52),
    new THREE.Vector3(2.6, -1.15, -0.3),
  ]);

  // Vertex-colored semi-transparent capillary tube (smooth gradient from Black -> Red)
  const capGeo = trackGeo(new THREE.TubeGeometry(capCurve, 64, 0.24, 18, false));
  const posAttr = capGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const t = THREE.MathUtils.smoothstep(vx, -0.95, 0.95);
    _color.copy(_co2CellColor).lerp(_o2CellColor, t);
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }
  capGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const capMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.26,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
  );
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.renderOrder = 3;
  group.add(capMesh);

  // 3. Instanced Red Blood Cells Moving Single-File Through the Capillary
  const CELL_COUNT = 24;
  const cellGeo = trackGeo(createBiconcaveCellGeometry());
  const cellMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.14,
    }),
  );
  const bloodCells = new THREE.InstancedMesh(cellGeo, cellMat, CELL_COUNT);
  bloodCells.frustumCulled = false;
  bloodCells.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(CELL_COUNT * 3),
    3,
  );
  group.add(bloodCells);

  // 4. Diffusing O2 (Bright Emerald/Cyan) & CO2 (Dark Charcoal/Amber) Gas Molecules
  const O2_COUNT = 24;
  const CO2_COUNT = 20;
  const gasGeo = trackGeo(new THREE.SphereGeometry(0.068, 12, 10));

  const o2Mat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      clearcoat: 0.6,
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

  const co2Particles = new THREE.InstancedMesh(gasGeo, co2Mat, CO2_COUNT);
  co2Particles.frustumCulled = false;
  group.add(co2Particles);

  // O2 diffusion curve (Bronchiole down into Alveolus -> crosses wall into Capillary)
  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 2.2, 0.05),
    new THREE.Vector3(-0.08, 1.0, 0.18),
    new THREE.Vector3(0.15, 0.15, 0.65),
    new THREE.Vector3(0.35, 0.06, 1.32), // crosses into red blood!
    new THREE.Vector3(1.15, -0.25, 1.1),
  ]);

  // CO2 diffusion curve (Capillary -> crosses wall into Alveolus -> rises up Bronchiole)
  const co2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, -0.22, 1.12),
    new THREE.Vector3(-0.32, 0.04, 1.32), // exits dark blood!
    new THREE.Vector3(-0.15, 0.22, 0.58),
    new THREE.Vector3(0.08, 1.05, 0.12),
    new THREE.Vector3(0.18, 2.25, 0.0),
  ]);

  const _healthyAlvColor = new THREE.Color(0xfda4af);
  const _unhealthyAlvColor = new THREE.Color(0x78716c);
  let healthProgress = 1;
  let simTime = 0;

  const updateAnimation: AlveolusRig['updateAnimation'] = (
    elapsed,
    delta,
    { bpm, isHealthy, slowMotion },
  ) => {
    const dt = Math.min(delta, 0.05);
    const timeScale = slowMotion ? 0.32 : 1.0;
    simTime += dt * timeScale;
    healthProgress = THREE.MathUtils.damp(healthProgress, isHealthy ? 1 : 0, 5, dt);

    // Breathing rhythm scales with BPM
    const breathSpeed = 1.6 * (bpm / 72);
    const breathAmplitude = THREE.MathUtils.lerp(0.025, 0.065, healthProgress);
    const breathScale = 1 + Math.sin(simTime * breathSpeed) * breathAmplitude;
    sacGroup.scale.setScalar(breathScale);

    // Smoking tar appearance & alveolar discoloration
    alveolusMat.color.copy(_unhealthyAlvColor).lerp(_healthyAlvColor, healthProgress);
    tarDepositMat.opacity = (1 - healthProgress) * 0.72;
    tarPatches.forEach((p) => {
      p.visible = healthProgress < 0.98;
    });

    // Blood cell movement (slower if unhealthy / constricted)
    const speedFactor = (bpm / 72) * THREE.MathUtils.lerp(0.58, 1.0, healthProgress);
    for (let i = 0; i < CELL_COUNT; i++) {
      const t = (i / CELL_COUNT + simTime * 0.14 * speedFactor) % 1;
      capCurve.getPointAt(t, _pos);
      capCurve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      _scale.setScalar(1);
      _mat4.compose(_pos, _quat, _scale);
      bloodCells.setMatrixAt(i, _mat4);

      const oxy = THREE.MathUtils.smoothstep(t, 0.34, 0.64);
      _color.copy(_co2CellColor).lerp(_o2CellColor, oxy);
      bloodCells.setColorAt(i, _color);
    }
    bloodCells.instanceMatrix.needsUpdate = true;
    if (bloodCells.instanceColor) bloodCells.instanceColor.needsUpdate = true;

    // O2 molecules entering blood
    for (let i = 0; i < O2_COUNT; i++) {
      const t = (i / O2_COUNT + simTime * 0.22 * speedFactor) % 1;
      o2Curve.getPointAt(t, _pos);
      _pos.x += Math.sin(elapsed * 2.5 + i * 1.7) * 0.12;
      _pos.y += Math.cos(elapsed * 2.2 + i * 1.3) * 0.08;
      _quat.identity();
      // Reduce visible O2 flow slightly in smoking/unhealthy mode
      const visScale = !isHealthy && i % 2 === 0 ? 0.25 : 1.0;
      _scale.setScalar(visScale);
      _mat4.compose(_pos, _quat, _scale);
      o2Particles.setMatrixAt(i, _mat4);
    }
    o2Particles.instanceMatrix.needsUpdate = true;

    // CO2 molecules exiting blood into exhalation airway
    for (let i = 0; i < CO2_COUNT; i++) {
      const t = (i / CO2_COUNT + simTime * 0.2 * speedFactor) % 1;
      co2Curve.getPointAt(t, _pos);
      _pos.x += Math.cos(elapsed * 2.3 + i * 1.9) * 0.12;
      _pos.y += Math.sin(elapsed * 2.1 + i * 1.1) * 0.08;
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
