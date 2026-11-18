import * as THREE from 'three';
import { CircuitFilter, PartId } from '../data/circulatoryData';
import {
  createSeamlessArmGeometry,
  createSeamlessLegAndFootGeometry,
  createSeamlessTrunkAndHeadGeometry,
} from './humanBodyBuilder';
import {
  createBrainSulciBumpTexture,
  createContactShadowTexture,
  createLungAlveoliTexture,
  createOrganicBumpTexture,
  createOrganicTissueTexture,
  createPlinthDialTexture,
} from './proceduralTextures';

export interface SelectableEntry {
  partId: PartId;
  circuit: CircuitFilter;
  meshes: THREE.Mesh[];
  materials: THREE.MeshPhysicalMaterial[];
  baseEmissives: THREE.Color[];
  baseOpacities: number[];
}

export interface CirculatoryRig {
  rootGroup: THREE.Group;
  bodyConceptionGroup: THREE.Group;
  heartGroup: THREE.Group;
  cutawayShellGroup: THREE.Group;
  cutawayMaterials: THREE.MeshPhysicalMaterial[];
  rightAtriumGroup: THREE.Group;
  leftAtriumGroup: THREE.Group;
  rightVentricleGroup: THREE.Group;
  leftVentricleGroup: THREE.Group;
  valves: THREE.Group[];
  traceMarker: THREE.Group;
  selectables: Map<PartId, SelectableEntry>;
  clickableMeshes: THREE.Mesh[];
  pulmonaryCells: THREE.InstancedMesh;
  systemicCells: THREE.InstancedMesh;
  bumpTexture: THREE.CanvasTexture;
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
  updateAnimation: (
    elapsed: number,
    delta: number,
    params: {
      bpm: number;
      isCutaway: boolean;
      showBodyShell: boolean;
      isHealthy: boolean;
      slowMotion: boolean;
      activeCircuit: CircuitFilter;
      selectedPartId: PartId | null;
      hoveredPartId: PartId | null;
      traceMarkerPos: THREE.Vector3 | null;
      onBeatPhase?: (phase: 'lub' | 'dub') => void;
      onCardiacStage?: (stage: 'atrial' | 'ventricular' | 'diastole') => void;
    },
  ) => void;
}

// Pre-allocated scratch objects (Zero GC inside render loop)
const _pos = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();

// Blood Colors per Tunisian 6th grade curriculum & user request:
// CO2-rich = أحمر قاتم (Deep dark burgundy/maroon-red #4a0712)
// O2-rich  = أحمر قانٍ (Bright vivid scarlet red #ef4444)
const _co2CellColor = new THREE.Color(0x4a0712);
const _o2CellColor = new THREE.Color(0xef4444);
const _dimCellColor = new THREE.Color(0x94a3b8);

function createBiconcaveCellGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI;
    const r = Math.sin(angle) * 0.082;
    const pinch = 0.016 + 0.023 * Math.sin(angle) * Math.sin(angle);
    const y = Math.cos(angle) * pinch;
    pts.push(new THREE.Vector2(r, y));
  }
  const geo = new THREE.LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

function createOrganicChamberGeometry(
  rx: number,
  ry: number,
  rz: number,
  taperBottom = 0.65,
  apexLeanX = 0,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const taper = y < 0 ? THREE.MathUtils.lerp(1.0, taperBottom, Math.pow(-y, 1.15)) : 1.0;
    const lean = y < 0 ? apexLeanX * (-y) : 0;
    const ridge = 1 + 0.032 * Math.sin(x * 6 + y * 5) * Math.cos(z * 5);

    x = x * rx * taper * ridge + lean;
    y = y * ry;
    z = z * rz * taper * ridge;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createLungLobeGeometry(
  rx: number,
  ry: number,
  rz: number,
  side: -1 | 1,
  isUpper: boolean,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 28, 22);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const topTaper = isUpper && y > 0 ? THREE.MathUtils.lerp(1.0, 0.56, y) : 1.0;
    const medialFlatten = x * side < 0 ? 0.66 : 1.0;
    const cardiacNotch = side === 1 && !isUpper && x < -0.1 && y < 0.2 ? 0.72 : 1.0;
    const baseFlat =
      !isUpper && y < -0.45 ? THREE.MathUtils.lerp(1.0, 0.6, (-y - 0.45) / 0.55) : 1.0;

    x *= rx * topTaper * medialFlatten * cardiacNotch;
    y *= ry * baseFlat;
    z *= rz * topTaper;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildCirculatoryRig(maxAnisotropy: number): CirculatoryRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // Procedural Wet-Tissue Textures
  const heartMuscleTex = trackTex(createOrganicTissueTexture('#9f1d28', '#5c0c14', maxAnisotropy));
  const darkBloodTex = trackTex(createOrganicTissueTexture('#4a0712', '#260308', maxAnisotropy));
  const brightBloodTex = trackTex(createOrganicTissueTexture('#ef4444', '#991b1b', maxAnisotropy));
  const lungTex = trackTex(createLungAlveoliTexture(maxAnisotropy));
  const bumpTex = trackTex(createOrganicBumpTexture(maxAnisotropy));
  const brainSulciTex = trackTex(createBrainSulciBumpTexture(maxAnisotropy));
  const plinthDialTex = trackTex(createPlinthDialTexture(maxAnisotropy));
  const shadowTex = trackTex(createContactShadowTexture());

  const rootGroup = new THREE.Group();
  const selectables = new Map<PartId, SelectableEntry>();
  const clickableMeshes: THREE.Mesh[] = [];

  const registerSelectable = (
    partId: PartId,
    circuit: CircuitFilter,
    mesh: THREE.Mesh,
    mat: THREE.MeshPhysicalMaterial,
    baseOpacity = 1,
  ) => {
    mesh.userData.partId = partId;
    mesh.layers.enable(1);
    clickableMeshes.push(mesh);

    let entry = selectables.get(partId);
    if (!entry) {
      entry = {
        partId,
        circuit,
        meshes: [],
        materials: [],
        baseEmissives: [],
        baseOpacities: [],
      };
      selectables.set(partId, entry);
    }
    entry.meshes.push(mesh);
    entry.materials.push(mat);
    entry.baseEmissives.push(mat.emissive.clone());
    entry.baseOpacities.push(baseOpacity);
  };

  // ---------------------------------------------------------------------------
  // 1. STUDIO GROUND CONTACT SHADOW & ANATOMICAL EXHIBIT PLINTH (Under Feet)
  // ---------------------------------------------------------------------------
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(10.5, 7.0)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
      }),
    ),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, -6.58, -0.05);
  rootGroup.add(shadowPlane);

  const plinthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.16,
    }),
  );
  const plinthTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: plinthDialTex,
      roughness: 0.32,
      metalness: 0.12,
    }),
  );
  const plinthGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  const plinthTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.35,
      metalness: 0.35,
    }),
  );
  const plinthMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.9, 3.15, 0.16, 48)),
    plinthMat,
  );
  plinthMesh.position.set(0, -6.68, -0.05);
  plinthMesh.receiveShadow = true;
  rootGroup.add(plinthMesh);

  const plinthDialDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.86, 48)),
    plinthTopMat,
  );
  plinthDialDisc.rotation.x = -Math.PI / 2;
  plinthDialDisc.position.set(0, -6.598, -0.05);
  plinthDialDisc.receiveShadow = true;
  rootGroup.add(plinthDialDisc);

  const plinthGlassDisc = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.74, 2.74, 0.02, 48)),
    plinthGlassMat,
  );
  plinthGlassDisc.position.set(0, -6.59, -0.05);
  rootGroup.add(plinthGlassDisc);

  const plinthRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(2.91, 0.024, 8, 56)),
    plinthTrimMat,
  );
  plinthRing.rotation.x = Math.PI / 2;
  plinthRing.position.set(0, -6.6, -0.05);
  rootGroup.add(plinthRing);

  // ---------------------------------------------------------------------------
  // 2. SEAMLESS SCULPTED FULL 3D HUMAN BODY (Fresnel Medical-Glass Rim Shader)
  // ---------------------------------------------------------------------------
  const bodyConceptionGroup = new THREE.Group();
  rootGroup.add(bodyConceptionGroup);

  const bodyRimUniform = { value: 1.0 };
  const bodyShellMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.92,
      clearcoatRoughness: 0.12,
      sheen: 0.65,
      sheenColor: new THREE.Color(0xe0f2fe),
      sheenRoughness: 0.3,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.FrontSide,
    }),
  );
  bodyShellMat.onBeforeCompile = (shader) => {
    shader.uniforms.uBodyRimStrength = bodyRimUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uBodyRimStrength;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float fresnelRim = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
diffuseColor.a = clamp(mix(0.055, 0.58, fresnelRim), 0.0, 0.85) * uBodyRimStrength;
outgoingLight = mix(outgoingLight, vec3(0.42, 0.72, 0.82), fresnelRim * 0.42);
#include <opaque_fragment>`,
      );
  };
  bodyShellMat.customProgramCacheKey = () => 'body_fresnel_rim_v1';

  const ribBoneMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
      clearcoat: 0.25,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  );

  const brainMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfda4af,
      bumpMap: brainSulciTex,
      bumpScale: 0.085,
      roughness: 0.42,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );

  const systemicArtLineMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.32, clearcoat: 0.45 }),
  );
  const systemicVeinLineMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0x4a0712, roughness: 0.32, clearcoat: 0.45 }),
  );

  // A. Single Seamless Head + Face + Neck + Shoulders + Torso + Pelvis Mesh
  const trunkAndHeadMesh = new THREE.Mesh(
    trackGeo(createSeamlessTrunkAndHeadGeometry()),
    bodyShellMat,
  );
  trunkAndHeadMesh.renderOrder = 3;
  bodyConceptionGroup.add(trunkAndHeadMesh);

  // B. Brain Lobes + Carotid & Jugular Neck Vessels
  [-1, 1].forEach((side) => {
    const hemi = new THREE.Mesh(
      trackGeo(createOrganicChamberGeometry(0.31, 0.4, 0.48, 0.85, 0)),
      brainMat,
    );
    hemi.position.set(side * 0.21, 4.32, -0.15);
    hemi.renderOrder = 2;
    bodyConceptionGroup.add(hemi);

    const carotid = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.22, 2.28, -0.08),
            new THREE.Vector3(side * 0.2, 3.05, -0.12),
            new THREE.Vector3(side * 0.22, 4.02, -0.14),
          ]),
          14,
          0.03,
          8,
          false,
        ),
      ),
      systemicArtLineMat,
    );
    const jugular = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.27, 4.02, -0.12),
            new THREE.Vector3(side * 0.26, 3.05, -0.09),
            new THREE.Vector3(-0.36, 2.15, 0.02),
          ]),
          14,
          0.028,
          8,
          false,
        ),
      ),
      systemicVeinLineMat,
    );
    bodyConceptionGroup.add(carotid, jugular);
  });

  // C. Seamless Sculpted Arms + Forearms + Hands & Brachial/Radial Vessels
  ([-1, 1] as const).forEach((side) => {
    const armMesh = new THREE.Mesh(
      trackGeo(createSeamlessArmGeometry(side)),
      bodyShellMat,
    );
    armMesh.renderOrder = 3;
    bodyConceptionGroup.add(armMesh);

    const armArtery = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.65, 2.12, -0.08),
            new THREE.Vector3(side * 2.38, 2.08, -0.11),
            new THREE.Vector3(side * 2.7, 1.18, -0.11),
            new THREE.Vector3(side * 2.83, 0.4, -0.12),
            new THREE.Vector3(side * 2.98, -1.42, 0.1),
            new THREE.Vector3(side * 3.0, -2.02, 0.17),
          ]),
          24,
          0.034,
          8,
          false,
        ),
      ),
      systemicArtLineMat,
    );
    const armVein = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 3.04, -2.02, 0.2),
            new THREE.Vector3(side * 3.02, -1.42, 0.15),
            new THREE.Vector3(side * 2.88, 0.4, -0.07),
            new THREE.Vector3(side * 2.76, 1.18, -0.06),
            new THREE.Vector3(side * 2.42, 2.16, -0.05),
            new THREE.Vector3(-0.68, 1.88, 0.02),
          ]),
          24,
          0.032,
          8,
          false,
        ),
      ),
      systemicVeinLineMat,
    );
    bodyConceptionGroup.add(armArtery, armVein);
  });

  // D. Seamless Sculpted Legs + Knees + Calves + Feet & Femoral/Tibial Vessels
  ([-1, 1] as const).forEach((side) => {
    const legMesh = new THREE.Mesh(
      trackGeo(createSeamlessLegAndFootGeometry(side)),
      bodyShellMat,
    );
    legMesh.renderOrder = 3;
    bodyConceptionGroup.add(legMesh);

    const legArtery = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.3, -2.05, -0.08),
            new THREE.Vector3(side * 0.85, -2.75, -0.06),
            new THREE.Vector3(side * 0.92, -4.18, -0.02),
            new THREE.Vector3(side * 0.95, -6.12, -0.1),
            new THREE.Vector3(side * 0.99, -6.46, 0.32),
          ]),
          24,
          0.044,
          8,
          false,
        ),
      ),
      systemicArtLineMat,
    );
    const legVein = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 1.03, -6.46, 0.34),
            new THREE.Vector3(side * 1.0, -6.12, -0.05),
            new THREE.Vector3(side * 0.98, -4.18, 0.04),
            new THREE.Vector3(side * 0.92, -2.75, 0.01),
            new THREE.Vector3(-0.34, -2.05, 0.0),
          ]),
          24,
          0.042,
          8,
          false,
        ),
      ),
      systemicVeinLineMat,
    );
    bodyConceptionGroup.add(legArtery, legVein);
  });

  // E. Posterior Spine, Breathing Ribcage (القفص الصدري), & Muscular Diaphragm (الحجاب الحاجز)
  const spineMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 4.4, 14)),
    ribBoneMat,
  );
  spineMesh.position.set(0, 0.65, -0.82);
  spineMesh.renderOrder = 2;
  bodyConceptionGroup.add(spineMesh);

  const ribcageGroup = new THREE.Group();
  bodyConceptionGroup.add(ribcageGroup);

  const sternum = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.09, 1.38, 6, 12)),
    ribBoneMat,
  );
  sternum.position.set(0, 1.16, 0.98);
  sternum.scale.set(1.25, 1.0, 0.42);
  sternum.renderOrder = 2;
  ribcageGroup.add(sternum);

  for (let r = 0; r < 7; r++) {
    const yRib = 2.05 - r * 0.3;
    const widthScale = 1.78 + Math.sin((r / 6) * Math.PI * 0.78) * 0.56;
    const depthScale = 0.9 + Math.sin((r / 6) * Math.PI * 0.78) * 0.18;

    ([-1, 1] as const).forEach((side) => {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.22, yRib + 0.12, -0.78),
        new THREE.Vector3(side * widthScale * 0.85, yRib + 0.02, -0.45),
        new THREE.Vector3(side * widthScale, yRib - 0.12, 0.18),
        new THREE.Vector3(side * (r < 5 ? 0.14 : 0.78), yRib - 0.25, depthScale * 0.92),
      ]);
      const ribMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(ribCurve, 18, 0.035, 8, false)),
        ribBoneMat,
      );
      ribMesh.renderOrder = 2;
      ribcageGroup.add(ribMesh);
    });
  }

  // Sculpted Muscular Diaphragm Dome underneath Lungs (الحجاب الحاجز)
  const diaphragmMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,
      roughness: 0.42,
      clearcoat: 0.35,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const diaphragmGroup = new THREE.Group();
  diaphragmGroup.position.set(0, 0.45, -0.15);
  bodyConceptionGroup.add(diaphragmGroup);

  ([-1, 1] as const).forEach((side) => {
    const domeGeo = trackGeo(
      new THREE.SphereGeometry(0.95, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.44),
    );
    const dome = new THREE.Mesh(domeGeo, diaphragmMat);
    dome.position.set(side * 1.12, -0.26, 0);
    dome.scale.set(1.05, 0.48, 0.68);
    dome.renderOrder = 2;
    diaphragmGroup.add(dome);
  });

  // ---------------------------------------------------------------------------
  // 3. ENHANCED ANATOMICAL 4-CHAMBER HEART (Multi-part Sculpt + Coronary Tree + Fat Sulci + Flapping Valves)
  // ---------------------------------------------------------------------------
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0.08, 0.38, 0.22);
  heartGroup.scale.setScalar(0.9);
  rootGroup.add(heartGroup);

  const rightAtriumGroup = new THREE.Group();
  rightAtriumGroup.position.set(-0.42, 0.54, 0.02);
  heartGroup.add(rightAtriumGroup);

  const leftAtriumGroup = new THREE.Group();
  leftAtriumGroup.position.set(0.42, 0.54, 0.02);
  heartGroup.add(leftAtriumGroup);

  const rightVentricleGroup = new THREE.Group();
  rightVentricleGroup.position.set(-0.33, -0.22, 0.04);
  heartGroup.add(rightVentricleGroup);

  const leftVentricleGroup = new THREE.Group();
  leftVentricleGroup.position.set(0.32, -0.26, 0.04);
  heartGroup.add(leftVentricleGroup);

  // أحمر قاتم (Deep Dark Burgundy) Materials for CO2 Right Heart
  const rightAtriumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x580a16,
      map: darkBloodTex,
      bumpMap: bumpTex,
      bumpScale: 0.03,
      roughness: 0.3,
      metalness: 0.06,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
      emissive: 0x2a040a,
      emissiveIntensity: 0.28,
    }),
  );
  const rightVentricleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x4a0712,
      map: darkBloodTex,
      bumpMap: bumpTex,
      bumpScale: 0.032,
      roughness: 0.28,
      metalness: 0.06,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
      emissive: 0x260308,
      emissiveIntensity: 0.28,
    }),
  );

  // أحمر قانٍ (Bright Vivid Scarlet Red) Materials for O2 Left Heart
  const leftAtriumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      map: brightBloodTex,
      bumpMap: bumpTex,
      bumpScale: 0.028,
      roughness: 0.3,
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.32,
    }),
  );
  const leftVentricleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      map: brightBloodTex,
      bumpMap: bumpTex,
      bumpScale: 0.034,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.68,
      clearcoatRoughness: 0.18,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.32,
    }),
  );

  // Right Atrium + Sculpted Auricle Flap
  const raMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.35, 0.32, 0.33, 0.86, 0)),
    rightAtriumMat,
  );
  raMesh.castShadow = true;
  rightAtriumGroup.add(raMesh);
  registerSelectable('right_atrium', 'systemic', raMesh, rightAtriumMat);

  const raAuricle = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.18, 0.14, 0.18, 0.65, 0.06)),
    rightAtriumMat,
  );
  raAuricle.position.set(0.12, 0.16, 0.22);
  raAuricle.rotation.z = -0.5;
  rightAtriumGroup.add(raAuricle);
  registerSelectable('right_atrium', 'systemic', raAuricle, rightAtriumMat);

  // Left Atrium + Sculpted Auricle Flap
  const laMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.35, 0.32, 0.33, 0.86, 0)),
    leftAtriumMat,
  );
  laMesh.castShadow = true;
  leftAtriumGroup.add(laMesh);
  registerSelectable('left_atrium', 'pulmonary', laMesh, leftAtriumMat);

  const laAuricle = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.18, 0.14, 0.18, 0.65, -0.06)),
    leftAtriumMat,
  );
  laAuricle.position.set(-0.12, 0.16, 0.22);
  laAuricle.rotation.z = 0.5;
  leftAtriumGroup.add(laAuricle);
  registerSelectable('left_atrium', 'pulmonary', laAuricle, leftAtriumMat);

  // Right Ventricle (thinner muscular wall)
  const rvMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.36, 0.54, 0.36, 0.45, 0.12)),
    rightVentricleMat,
  );
  rvMesh.rotation.z = -0.12;
  rvMesh.castShadow = true;
  rightVentricleGroup.add(rvMesh);
  registerSelectable('right_ventricle', 'pulmonary', rvMesh, rightVentricleMat);

  // Left Ventricle (Thick muscular myocardium + prominent apex)
  const lvMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.44, 0.65, 0.42, 0.36, 0.15)),
    leftVentricleMat,
  );
  lvMesh.rotation.z = 0.16;
  lvMesh.castShadow = true;
  leftVentricleGroup.add(lvMesh);
  registerSelectable('left_ventricle', 'systemic', lvMesh, leftVentricleMat);

  // Muscular Wall Cutaway Rim + Papillary Muscle Ridges
  const lvWallMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x991b1b,
      map: heartMuscleTex,
      bumpMap: bumpTex,
      bumpScale: 0.04,
      roughness: 0.44,
      clearcoat: 0.4,
    }),
  );
  const lvThickWall = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.38, 0.09, 14, 26, Math.PI * 1.18)),
    lvWallMat,
  );
  lvThickWall.position.set(0.16, -0.12, 0.08);
  lvThickWall.rotation.z = -Math.PI * 0.42;
  leftVentricleGroup.add(lvThickWall);

  // Sculpted Papillary Muscles & Inner Trabecular Ridges inside Cutaway Ventricles
  const papGeo = trackGeo(new THREE.ConeGeometry(0.062, 0.22, 10));
  const trabGeo = trackGeo(new THREE.TorusGeometry(0.24, 0.022, 8, 16, Math.PI * 0.68));
  [-0.08, 0.08].forEach((px) => {
    const lvPap = new THREE.Mesh(papGeo, lvWallMat);
    lvPap.position.set(px + 0.04, -0.22, 0.14);
    lvPap.rotation.z = -px * 1.4;
    leftVentricleGroup.add(lvPap);

    const rvPap = new THREE.Mesh(papGeo, lvWallMat);
    rvPap.position.set(px - 0.04, -0.18, 0.14);
    rvPap.scale.setScalar(0.84);
    rvPap.rotation.z = -px * 1.2;
    rightVentricleGroup.add(rvPap);
  });
  for (let tIdx = 0; tIdx < 3; tIdx++) {
    const trab = new THREE.Mesh(trabGeo, lvWallMat);
    trab.position.set(0.04, -0.12 - tIdx * 0.14, 0.06);
    trab.rotation.set(Math.PI * 0.38, 0, -Math.PI * 0.3);
    leftVentricleGroup.add(trab);
  }

  // Muscular Interventricular Septum
  const septumMesh = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.12, 1.06, 12, 18)),
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x881337,
        map: heartMuscleTex,
        bumpMap: bumpTex,
        bumpScale: 0.038,
        roughness: 0.48,
        clearcoat: 0.35,
      }),
    ),
  );
  septumMesh.position.set(-0.02, 0.06, 0.05);
  septumMesh.scale.set(0.92, 1.0, 2.25);
  septumMesh.rotation.z = 0.06;
  heartGroup.add(septumMesh);

  // 4 Animated Heart Valves with Hinged Leaflet Cusps & Chordae Tendineae
  const valveMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfef3c7,
      roughness: 0.28,
      clearcoat: 0.55,
      emissive: 0x78350f,
      emissiveIntensity: 0.2,
    }),
  );
  const tendonMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 }));
  const valveRingGeo = trackGeo(new THREE.TorusGeometry(0.118, 0.024, 10, 22));
  const leafletGeo = trackGeo(new THREE.ConeGeometry(0.068, 0.12, 8));
  const tendonGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 6));

  const valves: THREE.Group[] = [];
  [
    { pos: [-0.38, 0.22, 0.06] as [number, number, number], hasTendons: true },
    { pos: [0.38, 0.22, 0.06] as [number, number, number], hasTendons: true },
    { pos: [-0.22, 0.38, 0.22] as [number, number, number], hasTendons: false },
    { pos: [0.2, 0.36, 0.18] as [number, number, number], hasTendons: false },
  ].forEach(({ pos, hasTendons }) => {
    const vGroup = new THREE.Group();
    vGroup.position.set(...pos);

    const ring = new THREE.Mesh(valveRingGeo, valveMat);
    ring.rotation.x = Math.PI / 2;
    vGroup.add(ring);

    [-1, 1].forEach((s) => {
      const cusp = new THREE.Mesh(leafletGeo, valveMat);
      cusp.position.set(s * 0.045, -0.03, 0);
      cusp.rotation.z = s * 0.42;
      cusp.rotation.x = Math.PI;
      vGroup.add(cusp);

      if (hasTendons) {
        const tendon = new THREE.Mesh(tendonGeo, tendonMat);
        tendon.position.set(s * 0.06, -0.14, 0);
        tendon.rotation.z = -s * 0.18;
        vGroup.add(tendon);
      }
    });

    heartGroup.add(vGroup);
    valves.push(vGroup);
  });

  // Outer Epicardial Shell (Realistic Sculpt + Adipose Sulcus + Rich Coronary Tree + Root Collars)
  const cutawayShellGroup = new THREE.Group();
  heartGroup.add(cutawayShellGroup);

  const shellMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xa41e2a,
      map: heartMuscleTex,
      bumpMap: bumpTex,
      bumpScale: 0.045,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.97,
      depthWrite: true,
    }),
  );
  const epicardialFatMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfde68a,
      roughness: 0.45,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const coronaryRedMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.25,
      clearcoat: 0.65,
      transparent: true,
      opacity: 0.97,
    }),
  );
  const coronaryDarkMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x4a0712,
      roughness: 0.25,
      clearcoat: 0.65,
      transparent: true,
      opacity: 0.97,
    }),
  );
  const cutawayMaterials = [shellMat, epicardialFatMat, coronaryRedMat, coronaryDarkMat];

  // Main asymmetric anterior myocardium + slight RV bulge
  const outerHeartMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.84, 0.96, 0.52, 0.38, 0.2)),
    shellMat,
  );
  outerHeartMesh.position.set(0.02, 0.02, 0.14);
  outerHeartMesh.rotation.z = 0.16;
  outerHeartMesh.castShadow = true;
  cutawayShellGroup.add(outerHeartMesh);

  // Outer sculpted Auricle Flaps visible even when cutaway is OFF
  const outerRaAuricle = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.24, 0.22, 0.24, 0.75, 0)),
    coronaryDarkMat,
  );
  outerRaAuricle.position.set(-0.48, 0.56, 0.26);
  outerRaAuricle.rotation.z = -0.3;
  cutawayShellGroup.add(outerRaAuricle);

  const outerLaAuricle = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.22, 0.2, 0.22, 0.75, 0)),
    coronaryRedMat,
  );
  outerLaAuricle.position.set(0.46, 0.58, 0.24);
  outerLaAuricle.rotation.z = 0.35;
  cutawayShellGroup.add(outerLaAuricle);

  // Sub-epicardial Adipose Bands along Atrioventricular & Interventricular Grooves
  const avSulcusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.68, 0.38, 0.25),
    new THREE.Vector3(-0.22, 0.28, 0.55),
    new THREE.Vector3(0.25, 0.24, 0.56),
    new THREE.Vector3(0.68, 0.32, 0.26),
  ]);
  cutawayShellGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(avSulcusCurve, 24, 0.052, 8, false)),
      epicardialFatMat,
    ),
  );
  const ivSulcusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.45, 0.55),
    new THREE.Vector3(-0.02, 0.12, 0.65),
    new THREE.Vector3(0.14, -0.35, 0.53),
    new THREE.Vector3(0.32, -0.72, 0.32),
  ]);
  cutawayShellGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(ivSulcusCurve, 24, 0.042, 8, false)),
      epicardialFatMat,
    ),
  );

  // Multi-branching Coronary Arteries (أحمر قانٍ) & Great Cardiac Veins (أحمر قاتم)
  const coronaryArteryCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.56, 0.52),
      new THREE.Vector3(-0.02, 0.16, 0.66),
      new THREE.Vector3(0.14, -0.35, 0.54),
      new THREE.Vector3(0.34, -0.74, 0.33),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.1, 0.64),
      new THREE.Vector3(0.38, -0.05, 0.58),
      new THREE.Vector3(0.62, -0.38, 0.38),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, -0.22, 0.58),
      new THREE.Vector3(0.36, -0.44, 0.46),
      new THREE.Vector3(0.54, -0.62, 0.26),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.32, 0.54),
      new THREE.Vector3(-0.48, 0.05, 0.48),
      new THREE.Vector3(-0.42, -0.35, 0.38),
    ]),
  ];
  coronaryArteryCurves.forEach((c, idx) => {
    cutawayShellGroup.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(c, 22, idx === 0 ? 0.026 : 0.017, 8, false)),
        coronaryRedMat,
      ),
    );
  });

  const coronaryVeinCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.24, -0.64, 0.37),
      new THREE.Vector3(-0.06, -0.08, 0.64),
      new THREE.Vector3(-0.34, 0.36, 0.5),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.06, -0.08, 0.64),
      new THREE.Vector3(0.28, 0.08, 0.58),
      new THREE.Vector3(0.56, 0.22, 0.42),
    ]),
  ];
  coronaryVeinCurves.forEach((c, idx) => {
    cutawayShellGroup.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(c, 20, idx === 0 ? 0.022 : 0.015, 8, false)),
        coronaryDarkMat,
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // 4. LUNGS & CARTILAGINOUS TRACHEA (Nestled inside the Ribcage)
  // ---------------------------------------------------------------------------
  const lungsGroup = new THREE.Group();
  rootGroup.add(lungsGroup);

  const tracheaMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.42, clearcoat: 0.25 }),
  );
  const cartilageRingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
  );

  const tracheaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.45, -0.26),
    new THREE.Vector3(0, 2.05, -0.28),
  ]);
  lungsGroup.add(
    new THREE.Mesh(trackGeo(new THREE.TubeGeometry(tracheaCurve, 14, 0.115, 14, false)), tracheaMat),
  );

  const ringGeo = trackGeo(new THREE.TorusGeometry(0.128, 0.02, 8, 18));
  for (let r = 0; r < 11; r++) {
    const ring = new THREE.Mesh(ringGeo, cartilageRingMat);
    ring.position.set(0, 2.18 + r * 0.115, -0.27);
    ring.rotation.x = Math.PI / 2;
    lungsGroup.add(ring);
  }

  [-1, 1].forEach((side) => {
    const bronchus = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.08, -0.28),
      new THREE.Vector3(side * 0.65, 1.85, -0.22),
      new THREE.Vector3(side * 1.28, 1.66, -0.16),
    ]);
    lungsGroup.add(
      new THREE.Mesh(trackGeo(new THREE.TubeGeometry(bronchus, 14, 0.075, 12, false)), tracheaMat),
    );

    // Branching Secondary & Tertiary Bronchial Tree inside Translucent Lung Lobes
    [
      [
        new THREE.Vector3(side * 1.28, 1.66, -0.16),
        new THREE.Vector3(side * 1.48, 1.94, -0.14),
        new THREE.Vector3(side * 1.56, 2.18, -0.1),
      ],
      [
        new THREE.Vector3(side * 1.28, 1.66, -0.16),
        new THREE.Vector3(side * 1.58, 1.56, -0.1),
        new THREE.Vector3(side * 1.72, 1.38, -0.06),
      ],
      [
        new THREE.Vector3(side * 1.28, 1.66, -0.16),
        new THREE.Vector3(side * 1.46, 1.28, -0.12),
        new THREE.Vector3(side * 1.64, 1.02, -0.08),
      ],
    ].forEach((pts) => {
      lungsGroup.add(
        new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.036, 8, false)),
          tracheaMat,
        ),
      );
    });
  });

  const lungMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf4a5b2,
      map: lungTex,
      bumpMap: bumpTex,
      bumpScale: 0.02,
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.48,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      emissive: 0x4c0519,
      emissiveIntensity: 0.1,
    }),
  );

  const alveoliMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.38, clearcoat: 0.3 }),
  );
  const lungCapillaryCo2Mat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0x4a0712, roughness: 0.3, clearcoat: 0.4 }),
  );
  const lungCapillaryO2Mat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.3, clearcoat: 0.4 }),
  );

  const alveoliGeo = trackGeo(new THREE.SphereGeometry(0.056, 10, 10));
  const lungLobeGroups: THREE.Group[] = [];

  ([-1, 1] as const).forEach((side) => {
    const lobeGroup = new THREE.Group();
    lobeGroup.position.set(side * 1.48, 1.56, -0.16);
    lungsGroup.add(lobeGroup);
    lungLobeGroups.push(lobeGroup);

    const upperLobe = new THREE.Mesh(
      trackGeo(createLungLobeGeometry(0.56, 0.58, 0.48, side, true)),
      lungMat,
    );
    upperLobe.position.set(-side * 0.04, 0.38, 0);
    upperLobe.rotation.z = side * 0.16;
    upperLobe.renderOrder = 2;
    lobeGroup.add(upperLobe);
    registerSelectable('lungs', 'pulmonary', upperLobe, lungMat, 0.42);

    if (side === -1) {
      const midLobe = new THREE.Mesh(
        trackGeo(createLungLobeGeometry(0.62, 0.4, 0.5, side, false)),
        lungMat,
      );
      midLobe.position.set(side * 0.04, -0.04, 0.03);
      midLobe.renderOrder = 2;
      lobeGroup.add(midLobe);
      registerSelectable('lungs', 'pulmonary', midLobe, lungMat, 0.42);
    }

    const lowerLobe = new THREE.Mesh(
      trackGeo(createLungLobeGeometry(0.68, 0.54, 0.54, side, false)),
      lungMat,
    );
    lowerLobe.position.set(side * 0.06, side === -1 ? -0.42 : -0.28, 0);
    lowerLobe.renderOrder = 2;
    lobeGroup.add(lowerLobe);
    registerSelectable('lungs', 'pulmonary', lowerLobe, lungMat, 0.42);

    for (let k = -1; k <= 1; k++) {
      const alvCluster = new THREE.Group();
      alvCluster.position.set(side * 0.12, k * 0.28, 0.04);
      for (let a = 0; a < 5; a++) {
        const sac = new THREE.Mesh(alveoliGeo, alveoliMat);
        sac.position.set(
          Math.cos(a * 1.3) * 0.075,
          Math.sin(a * 1.7) * 0.065,
          Math.sin(a * 0.9) * 0.06,
        );
        alvCluster.add(sac);
      }
      lobeGroup.add(alvCluster);

      const capIn = new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(-side * 0.34, 0.05 + k * 0.24, 0.06),
              new THREE.Vector3(0, 0.14 + k * 0.25, 0.11),
              new THREE.Vector3(side * 0.25, 0.03 + k * 0.25, 0.05),
            ]),
            14,
            0.03,
            8,
            false,
          ),
        ),
        lungCapillaryCo2Mat,
      );
      lobeGroup.add(capIn);
      registerSelectable('lungs', 'pulmonary', capIn, lungCapillaryCo2Mat);

      const capOut = new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 0.25, 0.03 + k * 0.25, 0.05),
              new THREE.Vector3(side * 0.1, -0.11 + k * 0.24, 0.03),
              new THREE.Vector3(-side * 0.32, -0.18 + k * 0.2, 0.06),
            ]),
            14,
            0.03,
            8,
            false,
          ),
        ),
        lungCapillaryO2Mat,
      );
      lobeGroup.add(capOut);
      registerSelectable('lungs', 'pulmonary', capOut, lungCapillaryO2Mat);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. ABDOMINAL SYSTEMIC ORGANS & CAPILLARY BED
  // ---------------------------------------------------------------------------
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, -1.72, 0);
  rootGroup.add(bodyGroup);

  const bodyTissueMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      bumpMap: bumpTex,
      bumpScale: 0.02,
      roughness: 0.48,
      clearcoat: 0.28,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      emissive: 0x1e293b,
      emissiveIntensity: 0.12,
    }),
  );

  const mainBed = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(1.38, 0.46, 0.64, 0.92, 0)),
    bodyTissueMat,
  );
  mainBed.renderOrder = 2;
  bodyGroup.add(mainBed);
  registerSelectable('body_capillaries', 'systemic', mainBed, bodyTissueMat, 0.44);

  const kidneyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x881337,
      map: heartMuscleTex,
      roughness: 0.38,
      clearcoat: 0.45,
      transparent: true,
      opacity: 0.85,
    }),
  );
  const liverMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x7f1d1d,
      map: heartMuscleTex,
      bumpMap: bumpTex,
      bumpScale: 0.025,
      roughness: 0.34,
      clearcoat: 0.55,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    }),
  );
  const liverMesh = new THREE.Mesh(
    trackGeo(createOrganicChamberGeometry(0.76, 0.42, 0.44, 0.65, 0.25)),
    liverMat,
  );
  liverMesh.position.set(-0.56, 0.86, 0.18);
  liverMesh.rotation.z = 0.28;
  liverMesh.renderOrder = 2;
  bodyGroup.add(liverMesh);
  registerSelectable('body_capillaries', 'systemic', liverMesh, liverMat, 0.56);

  // Subtle Intestinal Nutrient Loop inside Abdomen
  const intestineMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfda4af,
      roughness: 0.45,
      clearcoat: 0.3,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  const intestineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, 0.55, 0.15),
    new THREE.Vector3(0.65, 0.22, 0.26),
    new THREE.Vector3(-0.45, 0.02, 0.28),
    new THREE.Vector3(0.5, -0.22, 0.22),
    new THREE.Vector3(-0.35, -0.45, 0.16),
  ]);
  const intestineMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(intestineCurve, 32, 0.11, 10, false)),
    intestineMat,
  );
  intestineMesh.renderOrder = 2;
  bodyGroup.add(intestineMesh);

  [-1, 1].forEach((side) => {
    const kidney = new THREE.Mesh(
      trackGeo(createOrganicChamberGeometry(0.26, 0.36, 0.2, 0.9, -side * 0.05)),
      kidneyMat,
    );
    kidney.position.set(side * 0.92, 0.06, 0.02);
    kidney.rotation.z = side * 0.25;
    bodyGroup.add(kidney);
    registerSelectable('body_capillaries', 'systemic', kidney, kidneyMat, 0.85);

    // Renal Artery (أحمر قانٍ) & Renal Vein (أحمر قاتم) feeding each Kidney
    const renalArt = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.32, 0.12, -0.14),
            new THREE.Vector3(side * 0.62, 0.1, -0.06),
            new THREE.Vector3(side * 0.86, 0.07, 0.0),
          ]),
          10,
          0.036,
          8,
          false,
        ),
      ),
      systemicArtLineMat,
    );
    const renalVein = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.86, 0.01, 0.05),
            new THREE.Vector3(side * 0.45, 0.0, 0.02),
            new THREE.Vector3(-0.34, 0.05, -0.02),
          ]),
          10,
          0.034,
          8,
          false,
        ),
      ),
      systemicVeinLineMat,
    );
    bodyGroup.add(renalArt, renalVein);
    registerSelectable('body_capillaries', 'systemic', renalArt, systemicArtLineMat);
    registerSelectable('body_capillaries', 'systemic', renalVein, systemicVeinLineMat);
  });

  const sysArterioleMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.3, clearcoat: 0.4 }),
  );
  const sysVenuleMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0x4a0712, roughness: 0.3, clearcoat: 0.4 }),
  );

  for (let i = -2; i <= 2; i++) {
    const zOff = i * 0.11;
    const yOff = Math.sin(i * 1.1) * 0.1;
    const artTube = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.32, 0.12 + yOff, -0.12 + zOff * 0.4),
            new THREE.Vector3(0.72, 0.04 + yOff, zOff),
            new THREE.Vector3(0.0, -0.1 + yOff, zOff * 1.1 + 0.1),
          ]),
          16,
          0.036,
          8,
          false,
        ),
      ),
      sysArterioleMat,
    );
    const venTube = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.0, -0.1 + yOff, zOff * 1.1 + 0.1),
            new THREE.Vector3(-0.72, 0.04 + yOff, zOff),
            new THREE.Vector3(-0.34, 0.12 + yOff, -0.04 + zOff * 0.4),
          ]),
          16,
          0.036,
          8,
          false,
        ),
      ),
      sysVenuleMat,
    );
    bodyGroup.add(artTube, venTube);
    registerSelectable('body_capillaries', 'systemic', artTube, sysArterioleMat);
    registerSelectable('body_capillaries', 'systemic', venTube, sysVenuleMat);
  }

  // ---------------------------------------------------------------------------
  // 6. MAJOR BLOOD VESSELS (أحمر قانٍ #ef4444 for O2 vs أحمر قاتم #4a0712 for CO2)
  // ---------------------------------------------------------------------------
  const makeVesselMat = (hex: number, emissiveHex: number, tex: THREE.CanvasTexture) =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: hex,
        map: tex,
        bumpMap: bumpTex,
        bumpScale: 0.018,
        roughness: 0.28,
        metalness: 0.06,
        clearcoat: 0.65,
        clearcoatRoughness: 0.2,
        emissive: emissiveHex,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.72,
      }),
    );

  // A. Pulmonary Artery [أحمر قاتم CO2]
  const pulmArteryMat = makeVesselMat(0x4a0712, 0x260308, darkBloodTex);
  [
    {
      c: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.65, 0.36),
        new THREE.Vector3(-0.04, 1.18, 0.36),
        new THREE.Vector3(0.0, 1.48, 0.12),
      ]),
      r: 0.12,
    },
    {
      c: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 1.48, 0.12),
        new THREE.Vector3(-0.68, 1.62, -0.02),
        new THREE.Vector3(-1.24, 1.62, -0.14),
      ]),
      r: 0.09,
    },
    {
      c: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 1.48, 0.12),
        new THREE.Vector3(0.68, 1.62, -0.02),
        new THREE.Vector3(1.24, 1.62, -0.14),
      ]),
      r: 0.09,
    },
  ].forEach(({ c, r }) => {
    const m = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(c, 24, r, 14, false)),
      pulmArteryMat,
    );
    m.castShadow = true;
    rootGroup.add(m);
    registerSelectable('pulmonary_artery', 'pulmonary', m, pulmArteryMat, 0.72);
  });

  // B. Pulmonary Veins [أحمر قانٍ O2]
  const pulmVeinsMat = makeVesselMat(0xef4444, 0x7f1d1d, brightBloodTex);
  [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.22, 1.44, -0.12),
      new THREE.Vector3(0.88, 1.06, 0.04),
      new THREE.Vector3(0.5, 0.84, 0.18),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.22, 1.28, -0.15),
      new THREE.Vector3(0.88, 0.95, 0.02),
      new THREE.Vector3(0.5, 0.76, 0.16),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.22, 1.42, -0.18),
      new THREE.Vector3(-0.62, 1.06, -0.34),
      new THREE.Vector3(0.14, 0.86, -0.26),
      new THREE.Vector3(0.45, 0.82, 0.1),
    ]),
  ].forEach((c) => {
    const m = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(c, 24, 0.072, 12, false)),
      pulmVeinsMat,
    );
    m.castShadow = true;
    rootGroup.add(m);
    registerSelectable('pulmonary_veins', 'pulmonary', m, pulmVeinsMat, 0.72);
  });

  // C. Aorta + Carotid Branches [أحمر قانٍ O2]
  const aortaMat = makeVesselMat(0xef4444, 0x7f1d1d, brightBloodTex);
  const aortaMesh = new THREE.Mesh(
    trackGeo(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.24, 0.64, 0.3),
          new THREE.Vector3(0.14, 1.24, 0.22),
          new THREE.Vector3(0.3, 1.78, -0.05),
          new THREE.Vector3(0.68, 1.32, -0.36),
          new THREE.Vector3(0.52, -0.05, -0.36),
          new THREE.Vector3(0.38, -1.15, -0.22),
          new THREE.Vector3(0.28, -1.62, -0.08),
        ]),
        56,
        0.125,
        16,
        false,
      ),
    ),
    aortaMat,
  );
  aortaMesh.castShadow = true;
  rootGroup.add(aortaMesh);
  registerSelectable('aorta', 'systemic', aortaMesh, aortaMat, 0.72);

  const carotidCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.28, 1.78, -0.05),
    new THREE.Vector3(0.22, 2.75, -0.12),
    new THREE.Vector3(0.18, 3.85, -0.14),
    new THREE.Vector3(0.0, 4.35, -0.16),
  ]);
  const carotidMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(carotidCurve, 26, 0.052, 10, false)),
    aortaMat,
  );
  rootGroup.add(carotidMesh);
  registerSelectable('aorta', 'systemic', carotidMesh, aortaMat, 0.72);

  // D. Vena Cava [أحمر قاتم CO2]
  const venaCavaMat = makeVesselMat(0x4a0712, 0x260308, darkBloodTex);
  const infVenaCavaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, -1.62, -0.02),
    new THREE.Vector3(-0.62, -0.95, -0.12),
    new THREE.Vector3(-0.66, 0.02, -0.06),
    new THREE.Vector3(-0.42, 0.74, 0.16),
  ]);
  const supVenaCavaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 4.35, -0.16),
    new THREE.Vector3(-0.22, 3.85, -0.1),
    new THREE.Vector3(-0.34, 2.75, -0.02),
    new THREE.Vector3(-0.46, 1.65, 0.1),
    new THREE.Vector3(-0.38, 0.88, 0.18),
  ]);
  [infVenaCavaCurve, supVenaCavaCurve].forEach((c) => {
    const m = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(c, 34, 0.105, 14, false)),
      venaCavaMat,
    );
    m.castShadow = true;
    rootGroup.add(m);
    registerSelectable('vena_cava', 'systemic', m, venaCavaMat, 0.72);
  });

  // ---------------------------------------------------------------------------
  // 7. INSTANCED BLOOD CELLS (أحمر قاتم <-> أحمر قانٍ across Head, Torso & Legs)
  // ---------------------------------------------------------------------------
  const cellGeo = trackGeo(createBiconcaveCellGeometry());
  const cellMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.14,
    }),
  );

  const pulmonaryCurveRightLung = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.22, 0.18, 0.25),
      new THREE.Vector3(-0.1, 0.72, 0.36),
      new THREE.Vector3(0.0, 1.48, 0.12),
      new THREE.Vector3(0.76, 1.62, -0.04),
      new THREE.Vector3(1.48, 1.62, -0.15),
      new THREE.Vector3(1.22, 1.38, -0.12),
      new THREE.Vector3(0.88, 1.04, 0.04),
      new THREE.Vector3(0.46, 0.82, 0.18),
      new THREE.Vector3(0.36, 0.18, 0.25),
    ],
    true,
  );

  const pulmonaryCurveLeftLung = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.22, 0.18, 0.25),
      new THREE.Vector3(-0.1, 0.72, 0.36),
      new THREE.Vector3(0.0, 1.48, 0.12),
      new THREE.Vector3(-0.76, 1.62, -0.04),
      new THREE.Vector3(-1.48, 1.62, -0.15),
      new THREE.Vector3(-1.22, 1.4, -0.18),
      new THREE.Vector3(-0.62, 1.06, -0.34),
      new THREE.Vector3(0.42, 0.82, 0.14),
      new THREE.Vector3(0.36, 0.18, 0.25),
    ],
    true,
  );

  const systemicLowerCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.36, 0.16, 0.25),
      new THREE.Vector3(0.24, 0.66, 0.3),
      new THREE.Vector3(0.14, 1.24, 0.22),
      new THREE.Vector3(0.3, 1.76, -0.05),
      new THREE.Vector3(0.66, 1.3, -0.35),
      new THREE.Vector3(0.5, -0.05, -0.35),
      new THREE.Vector3(0.37, -1.12, -0.21),
      new THREE.Vector3(0.28, -1.62, -0.07),
      new THREE.Vector3(0.0, -1.82, 0.12),
      new THREE.Vector3(-0.32, -1.62, -0.02),
      new THREE.Vector3(-0.6, -0.94, -0.11),
      new THREE.Vector3(-0.65, 0.02, -0.05),
      new THREE.Vector3(-0.36, 0.82, 0.18),
      new THREE.Vector3(-0.22, 0.18, 0.25),
    ],
    true,
  );

  const systemicHeadCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.36, 0.16, 0.25),
      new THREE.Vector3(0.18, 1.22, 0.2),
      new THREE.Vector3(0.28, 1.78, -0.05),
      new THREE.Vector3(0.22, 2.75, -0.12),
      new THREE.Vector3(0.18, 3.85, -0.14),
      new THREE.Vector3(0.0, 4.35, -0.16),
      new THREE.Vector3(-0.22, 3.85, -0.1),
      new THREE.Vector3(-0.34, 2.75, -0.02),
      new THREE.Vector3(-0.46, 1.65, 0.1),
      new THREE.Vector3(-0.36, 0.84, 0.18),
      new THREE.Vector3(-0.22, 0.18, 0.25),
    ],
    true,
  );

  const PULM_CELL_COUNT = 72;
  const SYS_CELL_COUNT = 120;

  const pulmonaryCells = new THREE.InstancedMesh(cellGeo, cellMat, PULM_CELL_COUNT);
  pulmonaryCells.frustumCulled = false;
  pulmonaryCells.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(PULM_CELL_COUNT * 3),
    3,
  );
  rootGroup.add(pulmonaryCells);

  const systemicCells = new THREE.InstancedMesh(cellGeo, cellMat, SYS_CELL_COUNT);
  systemicCells.frustumCulled = false;
  systemicCells.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(SYS_CELL_COUNT * 3),
    3,
  );
  rootGroup.add(systemicCells);

  // Flowing Blood Cells in Arms & Legs (Systemic Peripheral Loops)
  const limbLoopCurves: THREE.CatmullRomCurve3[] = ([-1, 1] as const).flatMap((side) => [
    // Arm arterial -> hand capillary -> venous return
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(side * 0.65, 2.12, -0.08),
        new THREE.Vector3(side * 2.38, 2.08, -0.11),
        new THREE.Vector3(side * 2.83, 0.4, -0.12),
        new THREE.Vector3(side * 3.0, -2.02, 0.17),
        new THREE.Vector3(side * 3.04, -2.02, 0.2),
        new THREE.Vector3(side * 2.88, 0.4, -0.07),
        new THREE.Vector3(side * 2.42, 2.16, -0.05),
        new THREE.Vector3(-0.68, 1.88, 0.02),
      ],
      true,
    ),
    // Leg arterial -> foot capillary -> venous return
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.3, -2.05, -0.08),
        new THREE.Vector3(side * 0.85, -2.75, -0.06),
        new THREE.Vector3(side * 0.92, -4.18, -0.02),
        new THREE.Vector3(side * 0.99, -6.46, 0.32),
        new THREE.Vector3(side * 1.03, -6.46, 0.34),
        new THREE.Vector3(side * 0.98, -4.18, 0.04),
        new THREE.Vector3(side * 0.92, -2.75, 0.01),
        new THREE.Vector3(-0.34, -2.05, 0.0),
      ],
      true,
    ),
  ]);

  const LIMB_CELL_COUNT = 80;
  const limbCells = new THREE.InstancedMesh(cellGeo, cellMat, LIMB_CELL_COUNT);
  limbCells.frustumCulled = false;
  limbCells.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(LIMB_CELL_COUNT * 3),
    3,
  );
  bodyConceptionGroup.add(limbCells);

  // 3D Directional Flow Arrowheads along Major Pulmonary & Systemic Circuits
  const ARROW_COUNT = 24;
  const arrowGeo = trackGeo(new THREE.ConeGeometry(0.068, 0.16, 10));
  const arrowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x222222,
      emissiveIntensity: 0.25,
      roughness: 0.25,
    }),
  );
  const flowArrows = new THREE.InstancedMesh(arrowGeo, arrowMat, ARROW_COUNT);
  flowArrows.frustumCulled = false;
  flowArrows.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(ARROW_COUNT * 3),
    3,
  );
  rootGroup.add(flowArrows);

  // ---------------------------------------------------------------------------
  // 8. TRACE MARKER & CHOLESTEROL PLAQUE
  // ---------------------------------------------------------------------------
  const traceMarker = new THREE.Group();
  traceMarker.visible = false;
  const outerRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.24, 0.032, 12, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
      }),
    ),
  );
  const coreDrop = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.11, 16, 16)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
    ),
  );
  traceMarker.add(outerRing, coreDrop);
  rootGroup.add(traceMarker);

  const plaqueGroup = new THREE.Group();
  plaqueGroup.visible = false;
  rootGroup.add(plaqueGroup);

  const plaqueMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.52,
      clearcoat: 0.35,
      emissive: 0x854d0e,
      emissiveIntensity: 0.2,
    }),
  );
  const plaqueGeo = trackGeo(new THREE.TorusGeometry(0.11, 0.048, 10, 18));
  [
    [0.54, 0.1, -0.35, 0.1],
    [0.48, -0.45, -0.31, 0.25],
    [0.42, -0.95, -0.25, -0.15],
  ].forEach(([px, py, pz, rz]) => {
    const p = new THREE.Mesh(plaqueGeo, plaqueMat);
    p.position.set(px, py, pz);
    p.rotation.x = Math.PI / 2;
    p.rotation.y = rz;
    plaqueGroup.add(p);
  });

  // ---------------------------------------------------------------------------
  // 9. ANIMATION UPDATE
  // ---------------------------------------------------------------------------
  const _healthyLungColor = new THREE.Color(0xf4a5b2);
  const _unhealthyLungColor = new THREE.Color(0x6b6260);
  let cardiacPhase = 0;
  let lastBeatPhase = 0;
  let lastCardiacStage: 'atrial' | 'ventricular' | 'diastole' = 'diastole';
  let simTime = 0;
  let breathTime = 0;
  let cutawayProgress = 0;
  let bodyShellProgress = 1;
  let healthProgress = 1;
  let pulmActivity = 1;
  let sysActivity = 1;
  const currentMarkerPos = new THREE.Vector3();
  let markerInitialized = false;

  const updateAnimation: CirculatoryRig['updateAnimation'] = (
    elapsed,
    delta,
    {
      bpm,
      isCutaway,
      showBodyShell,
      isHealthy,
      slowMotion,
      activeCircuit,
      selectedPartId,
      hoveredPartId,
      traceMarkerPos,
      onBeatPhase,
      onCardiacStage,
    },
  ) => {
    const dt = Math.min(delta, 0.05);
    const timeScale = slowMotion ? 0.32 : 1.0;
    simTime += dt * timeScale;
    breathTime += dt * timeScale * (1.2 + (bpm - 60) / 70);

    const beatsPerSecond = (bpm / 60) * timeScale;

    healthProgress = THREE.MathUtils.damp(healthProgress, isHealthy ? 1 : 0, 5, dt);
    lungMat.color.copy(_unhealthyLungColor).lerp(_healthyLungColor, healthProgress);
    plaqueGroup.visible = healthProgress < 0.96;
    plaqueGroup.children.forEach((child) => {
      child.scale.setScalar(1 - healthProgress);
    });

    cardiacPhase = (cardiacPhase + dt * beatsPerSecond) % 1;

    if (lastBeatPhase < 0.22 && cardiacPhase >= 0.22) {
      onBeatPhase?.('lub');
    } else if (lastBeatPhase < 0.56 && cardiacPhase >= 0.56) {
      onBeatPhase?.('dub');
    }
    lastBeatPhase = cardiacPhase;

    const currentStage: 'atrial' | 'ventricular' | 'diastole' =
      cardiacPhase < 0.22 ? 'atrial' : cardiacPhase < 0.56 ? 'ventricular' : 'diastole';
    if (currentStage !== lastCardiacStage) {
      lastCardiacStage = currentStage;
      onCardiacStage?.(currentStage);
    }

    const atrialWave =
      cardiacPhase < 0.22 ? Math.sin((cardiacPhase / 0.22) * Math.PI) : 0;
    const ventWave =
      cardiacPhase >= 0.22 && cardiacPhase < 0.56
        ? Math.sin(((cardiacPhase - 0.22) / 0.34) * Math.PI)
        : 0;

    const aScale = 1 - atrialWave * 0.1 + ventWave * 0.04;
    const vScale = 1 - ventWave * 0.11 + atrialWave * 0.03;

    rightAtriumGroup.scale.setScalar(aScale);
    leftAtriumGroup.scale.setScalar(aScale);
    rightVentricleGroup.scale.set(vScale, 1 - ventWave * 0.08, vScale);
    leftVentricleGroup.scale.set(vScale, 1 - ventWave * 0.08, vScale);

    heartGroup.rotation.z = Math.sin(cardiacPhase * Math.PI * 2) * 0.025;

    // Synchronized Breathing: Lungs + Ribcage Expansion + Diaphragm Descent on Inhale
    const breathWave = Math.sin(breathTime);
    const breathAmp = THREE.MathUtils.lerp(0.014, 0.032, healthProgress);
    const breath = 1 + breathWave * breathAmp;
    lungLobeGroups.forEach((lg) => {
      lg.scale.set(breath, 1 + (breath - 1) * 0.72, breath);
    });
    ribcageGroup.scale.set(1 + breathWave * 0.016, 1, 1 + breathWave * 0.022);
    diaphragmGroup.position.y = 0.45 - breathWave * 0.075;
    diaphragmGroup.scale.set(1, 1 - breathWave * 0.14, 1);

    const avOpen = 1 - ventWave * 0.38;
    const semiOpen = 0.7 + ventWave * 0.38;
    valves[0].scale.setScalar(avOpen);
    valves[1].scale.setScalar(avOpen);
    valves[2].scale.setScalar(semiOpen);
    valves[3].scale.setScalar(semiOpen);

    bodyShellProgress = THREE.MathUtils.damp(bodyShellProgress, showBodyShell ? 1 : 0, 7, dt);
    bodyConceptionGroup.visible = bodyShellProgress > 0.02;
    bodyShellMat.opacity = 0.24 * bodyShellProgress;
    bodyRimUniform.value = bodyShellProgress;
    ribBoneMat.opacity = 0.36 * bodyShellProgress;
    diaphragmMat.opacity = 0.28 * bodyShellProgress;
    brainMat.opacity = 0.58 * bodyShellProgress;

    cutawayProgress = THREE.MathUtils.damp(cutawayProgress, isCutaway ? 1 : 0, 7, dt);
    const shellOpacity = Math.max(0, 0.97 * (1 - cutawayProgress));
    cutawayShellGroup.position.z = cutawayProgress * 0.65;
    cutawayShellGroup.visible = shellOpacity > 0.02;
    cutawayMaterials.forEach((m) => {
      m.opacity = shellOpacity;
    });
    cutawayShellGroup.scale.setScalar(1 - ventWave * 0.055);

    const targetPulm = activeCircuit === 'systemic' ? 0.16 : 1.0;
    const targetSys = activeCircuit === 'pulmonary' ? 0.16 : 1.0;
    pulmActivity = THREE.MathUtils.damp(pulmActivity, targetPulm, 6, dt);
    sysActivity = THREE.MathUtils.damp(sysActivity, targetSys, 6, dt);

    selectables.forEach((entry, partId) => {
      const circuitWeight =
        entry.circuit === 'pulmonary'
          ? pulmActivity
          : entry.circuit === 'systemic'
            ? sysActivity
            : 1.0;
      const isSelected = selectedPartId === partId;
      const isHovered = hoveredPartId === partId;

      for (let i = 0; i < entry.materials.length; i++) {
        const mat = entry.materials[i];
        const baseEmissive = entry.baseEmissives[i];
        const baseOpacity = entry.baseOpacities[i];

        if (isSelected) {
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.55 + Math.sin(elapsed * 4) * 0.12;
        } else if (isHovered) {
          mat.emissive.copy(baseEmissive).lerp(_color.setHex(0xfbbf24), 0.45);
          mat.emissiveIntensity = 0.5;
        } else {
          mat.emissive.copy(baseEmissive);
          mat.emissiveIntensity = 0.24 * circuitWeight;
        }

        if (mat.transparent) {
          mat.opacity = Math.max(0.12, baseOpacity * circuitWeight);
        }
      }
    });

    const flowSpeed = 0.065 * (bpm / 72) * THREE.MathUtils.lerp(0.58, 1.0, healthProgress);
    const pulmScaleFactor = THREE.MathUtils.lerp(0.45, 1.0, pulmActivity);

    for (let i = 0; i < PULM_CELL_COUNT; i++) {
      const curve = i % 2 === 0 ? pulmonaryCurveRightLung : pulmonaryCurveLeftLung;
      const t = (i / PULM_CELL_COUNT + simTime * flowSpeed * 1.15) % 1;

      curve.getPointAt(t, _pos);
      curve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      _scale.setScalar(pulmScaleFactor);
      _mat4.compose(_pos, _quat, _scale);
      pulmonaryCells.setMatrixAt(i, _mat4);

      const oxy = THREE.MathUtils.smoothstep(t, 0.4, 0.58);
      _color.copy(_co2CellColor).lerp(_o2CellColor, oxy);
      if (pulmActivity < 0.5) {
        _color.lerp(_dimCellColor, 0.65);
      }
      pulmonaryCells.setColorAt(i, _color);
    }
    pulmonaryCells.instanceMatrix.needsUpdate = true;
    if (pulmonaryCells.instanceColor) pulmonaryCells.instanceColor.needsUpdate = true;

    const sysScaleFactor = THREE.MathUtils.lerp(0.45, 1.0, sysActivity);
    for (let i = 0; i < SYS_CELL_COUNT; i++) {
      const isHeadBranch = i % 3 === 0;
      const curve = isHeadBranch ? systemicHeadCurve : systemicLowerCurve;
      const t = (i / SYS_CELL_COUNT + simTime * flowSpeed * 0.9) % 1;

      curve.getPointAt(t, _pos);
      curve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      _scale.setScalar(sysScaleFactor);
      _mat4.compose(_pos, _quat, _scale);
      systemicCells.setMatrixAt(i, _mat4);

      const deoxy = isHeadBranch
        ? THREE.MathUtils.smoothstep(t, 0.45, 0.6)
        : THREE.MathUtils.smoothstep(t, 0.5, 0.66);
      _color.copy(_o2CellColor).lerp(_co2CellColor, deoxy);
      if (sysActivity < 0.5) {
        _color.lerp(_dimCellColor, 0.65);
      }
      systemicCells.setColorAt(i, _color);
    }
    systemicCells.instanceMatrix.needsUpdate = true;
    if (systemicCells.instanceColor) systemicCells.instanceColor.needsUpdate = true;

    const limbScaleFactor = THREE.MathUtils.lerp(0.45, 1.0, sysActivity) * 0.85;
    for (let i = 0; i < LIMB_CELL_COUNT; i++) {
      const curve = limbLoopCurves[i % limbLoopCurves.length];
      const t = (i / LIMB_CELL_COUNT + simTime * flowSpeed * 0.72) % 1;

      curve.getPointAt(t, _pos);
      curve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      _scale.setScalar(limbScaleFactor);
      _mat4.compose(_pos, _quat, _scale);
      limbCells.setMatrixAt(i, _mat4);

      const deoxy = THREE.MathUtils.smoothstep(t, 0.42, 0.56);
      _color.copy(_o2CellColor).lerp(_co2CellColor, deoxy);
      if (sysActivity < 0.5) {
        _color.lerp(_dimCellColor, 0.65);
      }
      limbCells.setColorAt(i, _color);
    }
    limbCells.instanceMatrix.needsUpdate = true;
    if (limbCells.instanceColor) limbCells.instanceColor.needsUpdate = true;

    // 3D Directional Flow Arrowheads (Pulmonary + Systemic)
    for (let i = 0; i < ARROW_COUNT; i++) {
      const isPulmArrow = i < 8;
      const curve = isPulmArrow
        ? i % 2 === 0
          ? pulmonaryCurveRightLung
          : pulmonaryCurveLeftLung
        : i % 3 === 0
          ? systemicHeadCurve
          : systemicLowerCurve;
      const groupCount = isPulmArrow ? 8 : ARROW_COUNT - 8;
      const localIdx = isPulmArrow ? i : i - 8;
      const speedMult = isPulmArrow ? 1.15 : 0.9;
      const t = (localIdx / groupCount + simTime * flowSpeed * speedMult + 0.04) % 1;

      curve.getPointAt(t, _pos);
      curve.getTangentAt(t, _tangent);
      _quat.setFromUnitVectors(_up, _tangent);
      const actWeight = isPulmArrow ? pulmScaleFactor : sysScaleFactor;
      _scale.setScalar(actWeight * 0.95);
      _mat4.compose(_pos, _quat, _scale);
      flowArrows.setMatrixAt(i, _mat4);

      if (isPulmArrow) {
        const oxy = THREE.MathUtils.smoothstep(t, 0.4, 0.58);
        _color.copy(_co2CellColor).lerp(_o2CellColor, oxy);
        if (pulmActivity < 0.5) _color.lerp(_dimCellColor, 0.65);
      } else {
        const deoxy = i % 3 === 0 ? THREE.MathUtils.smoothstep(t, 0.45, 0.6) : THREE.MathUtils.smoothstep(t, 0.5, 0.66);
        _color.copy(_o2CellColor).lerp(_co2CellColor, deoxy);
        if (sysActivity < 0.5) _color.lerp(_dimCellColor, 0.65);
      }
      flowArrows.setColorAt(i, _color);
    }
    flowArrows.instanceMatrix.needsUpdate = true;
    if (flowArrows.instanceColor) flowArrows.instanceColor.needsUpdate = true;

    if (traceMarkerPos) {
      traceMarker.visible = true;
      if (!markerInitialized) {
        currentMarkerPos.copy(traceMarkerPos);
        markerInitialized = true;
      } else {
        currentMarkerPos.x = THREE.MathUtils.damp(currentMarkerPos.x, traceMarkerPos.x, 8, dt);
        currentMarkerPos.y = THREE.MathUtils.damp(currentMarkerPos.y, traceMarkerPos.y, 8, dt);
        currentMarkerPos.z = THREE.MathUtils.damp(currentMarkerPos.z, traceMarkerPos.z, 8, dt);
      }
      traceMarker.position.copy(currentMarkerPos);
      outerRing.rotation.y = elapsed * 2.1;
      outerRing.rotation.x = Math.sin(elapsed * 1.4) * 0.35;
      outerRing.scale.setScalar(1 + Math.sin(elapsed * 4.5) * 0.1);
    } else {
      traceMarker.visible = false;
      markerInitialized = false;
    }
  };

  return {
    rootGroup,
    bodyConceptionGroup,
    heartGroup,
    cutawayShellGroup,
    cutawayMaterials,
    rightAtriumGroup,
    leftAtriumGroup,
    rightVentricleGroup,
    leftVentricleGroup,
    valves,
    traceMarker,
    selectables,
    clickableMeshes,
    pulmonaryCells,
    systemicCells,
    bumpTexture: bumpTex,
    disposables: { geometries, materials, textures },
    updateAnimation,
  };
}
