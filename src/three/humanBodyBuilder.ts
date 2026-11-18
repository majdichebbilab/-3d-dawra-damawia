import * as THREE from 'three';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-d * d);
}

/**
 * Builds a single seamless lofted geometry for the human Pelvis, Waist, Chest,
 * Shoulders, Neck, Jaw, Face, and Cranium (zero overlapping primitive seams).
 * Angle theta = 0 points straight forward (+Z); theta = PI/2 points right (+X).
 */
export function createSeamlessTrunkAndHeadGeometry(): THREE.BufferGeometry {
  const stacks = 96;
  const slices = 56;

  const yMin = -2.68;
  const yMax = 5.18;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= stacks; i++) {
    const v = i / stacks;
    const y = THREE.MathUtils.lerp(yMin, yMax, v);

    // Base half-widths (rx = lateral X, rz = depth Z) & spine S-curve Z offset
    let rx = 1.5;
    let rz = 0.85;
    let zCenter = -0.12;

    if (y < -2.35) {
      // Smooth perineal/pelvic base closure
      const t = smoothstep(yMin, -2.35, y);
      rx = THREE.MathUtils.lerp(0.02, 1.52, Math.pow(t, 0.55));
      rz = THREE.MathUtils.lerp(0.02, 0.88, Math.pow(t, 0.55));
      zCenter = -0.12;
    } else if (y < -0.75) {
      // Pelvis -> Iliac Crest -> Waist taper
      const t = (y - -2.35) / 1.6;
      const hipBulge = gaussian(y, -1.95, 0.52) * 0.24;
      rx = THREE.MathUtils.lerp(1.52, 1.44, smoothstep(0.2, 1.0, t)) + hipBulge;
      rz = THREE.MathUtils.lerp(0.88, 0.78, t) + hipBulge * 0.35;
      zCenter = -0.12 + gaussian(y, -1.1, 0.7) * 0.06; // subtle lumbar lordosis
    } else if (y < 2.25) {
      // Waist -> Ribcage -> Chest / Pectorals -> Broad Shoulders
      const t = (y - -0.75) / 3.0;
      const chestWidth = THREE.MathUtils.lerp(1.44, 2.34, Math.pow(smoothstep(0.0, 0.92, t), 0.85));
      const ribDepth = THREE.MathUtils.lerp(0.78, 1.12, smoothstep(0.0, 0.75, t));
      const shoulderCap = gaussian(y, 2.08, 0.45) * 0.12;
      rx = chestWidth + shoulderCap;
      rz = ribDepth - smoothstep(0.78, 1.0, t) * 0.14;
      zCenter = -0.12 - gaussian(y, 1.2, 0.9) * 0.08;
    } else if (y < 2.78) {
      // Clavicle shelf & Trapezius slope smoothly into Neck base
      const t = smoothstep(2.25, 2.78, y);
      rx = THREE.MathUtils.lerp(2.38, 0.50, Math.pow(t, 0.75));
      rz = THREE.MathUtils.lerp(0.98, 0.48, Math.pow(t, 0.82));
      zCenter = THREE.MathUtils.lerp(-0.14, -0.18, t);
    } else if (y < 3.45) {
      // Muscular Neck column
      const t = (y - 2.78) / 0.67;
      rx = THREE.MathUtils.lerp(0.50, 0.44, Math.sin(t * Math.PI * 0.5)) - gaussian(y, 3.12, 0.25) * 0.03;
      rz = THREE.MathUtils.lerp(0.48, 0.44, t);
      zCenter = THREE.MathUtils.lerp(-0.18, -0.15, t);
    } else {
      // Jaw -> Face -> Brow -> Cranium dome (y in [3.45, 5.18])
      const t = (y - 3.45) / (yMax - 3.45);
      // Cranial oval width & depth
      const headCurve = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.96);
      const neckBlend = 1 - smoothstep(0.0, 0.24, t);
      rx = THREE.MathUtils.lerp(headCurve * 0.76, 0.44, neckBlend);
      rz = THREE.MathUtils.lerp(headCurve * 0.88, 0.44, neckBlend);
      zCenter = THREE.MathUtils.lerp(-0.15, -0.16, t);
      if (t > 0.96) {
        const cap = smoothstep(1.0, 0.96, t);
        rx *= cap;
        rz *= cap;
      }
    }

    for (let j = 0; j <= slices; j++) {
      const u = j / slices;
      const theta = u * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta); // +1 front (+Z), -1 back (-Z)

      let localRx = rx;
      let localRz = rz;
      let yOffset = 0;

      // Subtle anatomical surface sculpting by region
      if (y > 0.55 && y < 2.25) {
        // Pectoral & sternum gentle contour on front, trapezius/scapula on back
        const pecWeight = gaussian(y, 1.48, 0.52) * Math.max(0, cosT);
        const sternumGroove = Math.exp(-Math.pow(sinT / 0.16, 2)) * pecWeight * 0.06;
        const pecBulge = pecWeight * (0.09 * Math.sin(Math.abs(sinT) * Math.PI)) - sternumGroove;
        localRz += pecBulge;
      }

      if (y > -2.5 && y < -1.4 && cosT < 0) {
        // Subtle gluteal contour in back
        const gluteWeight = gaussian(y, -2.02, 0.42) * Math.max(0, -cosT);
        localRz += gluteWeight * 0.14 * Math.sin(Math.abs(sinT) * Math.PI);
      }

      if (y >= 3.45) {
        // Facial features: Chin, Jawline, Nose bridge, Eye sockets, Ears, Cranium back
        const frontFace = Math.max(0, cosT);
        // Chin protrusion (y ≈ 3.60)
        const chin = gaussian(y, 3.60, 0.13) * Math.pow(frontFace, 3.5) * 0.22;
        // Jawline flare (y ≈ 3.74)
        const jawAngle = gaussian(y, 3.74, 0.18) * Math.pow(Math.abs(sinT), 1.5) * 0.08;
        // Nose ridge (y ≈ 4.08)
        const nose =
          gaussian(y, 4.06, 0.13) * Math.exp(-Math.pow(sinT / 0.18, 2)) * frontFace * 0.17;
        // Subtle eye socket indentations flanking the nose (y ≈ 4.22)
        const eyeSocket =
          gaussian(y, 4.22, 0.1) *
          gaussian(Math.abs(sinT), 0.38, 0.14) *
          frontFace *
          0.075;
        // Brow ridge (y ≈ 4.38)
        const brow = gaussian(y, 4.38, 0.09) * Math.pow(frontFace, 2.2) * 0.055;
        // Ear silhouette (y ≈ 4.12, |sinT| ≈ 1)
        const ear =
          gaussian(y, 4.12, 0.14) * Math.pow(Math.abs(sinT), 10) * 0.065;
        // Occipital skull back curve (y ≈ 4.25, cosT < 0)
        const occiput = gaussian(y, 4.28, 0.4) * Math.max(0, -cosT) * 0.11;

        localRz += chin + nose + brow + occiput - eyeSocket;
        localRx += jawAngle + ear;
      }

      const x = sinT * localRx;
      const z = zCenter + cosT * localRz;
      positions.push(x, y + yOffset, z);
      uvs.push(u, v);
    }
  }

  const ringStride = slices + 1;
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * ringStride + j;
      const b = a + 1;
      const c = (i + 1) * ringStride + j;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a seamless sculpted Arm -> Forearm -> Wrist -> Hand & Fingers mesh
 * along an anatomical curve with natural muscle taper and zero ball/cylinder seams.
 */
export function createSeamlessArmGeometry(side: -1 | 1): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.98, 2.22, -0.10), // Inside shoulder / clavicle socket
    new THREE.Vector3(side * 2.46, 2.08, -0.11), // Deltoid cap
    new THREE.Vector3(side * 2.72, 1.20, -0.12), // Mid upper arm (biceps/triceps)
    new THREE.Vector3(side * 2.84, 0.42, -0.13), // Elbow
    new THREE.Vector3(side * 2.94, -0.45, -0.02), // Upper forearm swell
    new THREE.Vector3(side * 3.00, -1.42, 0.12), // Distal forearm -> Wrist
    new THREE.Vector3(side * 3.02, -1.96, 0.18), // Palm
    new THREE.Vector3(side * 3.00, -2.52, 0.22), // Fingertips
  ]);

  const stacks = 54;
  const slices = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const frames = curve.computeFrenetFrames(stacks, false);
  const worldFront = new THREE.Vector3(0, 0, 1);
  const lateral = new THREE.Vector3();
  const forward = new THREE.Vector3();

  for (let i = 0; i <= stacks; i++) {
    const t = i / stacks;
    const p = curve.getPointAt(t);
    const tangent = frames.tangents[i];

    // Stable anatomical frame: lateral (~±X) and forward (~+Z)
    lateral.crossVectors(worldFront, tangent).normalize();
    forward.crossVectors(tangent, lateral).normalize();

    // Sculpted anatomical cross-section radii (rLat = width, rFwd = thickness)
    let rLat = 0.25;
    let rFwd = 0.25;

    if (t < 0.08) {
      // Smoothly tucked inside shoulder
      const k = smoothstep(0.0, 0.08, t);
      rLat = THREE.MathUtils.lerp(0.16, 0.36, k);
      rFwd = THREE.MathUtils.lerp(0.16, 0.35, k);
    } else if (t < 0.44) {
      // Deltoid -> Biceps -> Elbow taper
      const deltoid = gaussian(t, 0.12, 0.09) * 0.08;
      const biceps = gaussian(t, 0.28, 0.11) * 0.05;
      const base = THREE.MathUtils.lerp(0.35, 0.25, smoothstep(0.12, 0.44, t));
      rLat = base + deltoid + biceps * 0.6;
      rFwd = base + deltoid * 0.8 + biceps;
    } else if (t < 0.78) {
      // Elbow -> Forearm muscle -> Slender Wrist
      const forearm = gaussian(t, 0.54, 0.1) * 0.055;
      const base = THREE.MathUtils.lerp(0.25, 0.145, smoothstep(0.44, 0.78, t));
      rLat = base + forearm;
      rFwd = base * 0.86 + forearm * 0.75;
    } else {
      // Wrist -> Flattened Palm -> Tapered Fingers (t in [0.78, 1.0])
      const ht = (t - 0.78) / 0.22;
      const palmWidth = 0.15 + gaussian(ht, 0.32, 0.25) * 0.075;
      const fingerTaper = smoothstep(1.0, 0.55, ht);
      rLat = palmWidth * (0.2 + 0.8 * fingerTaper);
      rFwd = THREE.MathUtils.lerp(0.125, 0.032, Math.pow(ht, 0.85));
      if (ht > 0.94) {
        const tip = smoothstep(1.0, 0.94, ht);
        rLat *= tip;
        rFwd *= tip;
      }
    }

    for (let j = 0; j <= slices; j++) {
      const u = j / slices;
      const theta = u * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      // Subtle thumb contour on anterior edge of palm
      let extraFwd = 0;
      if (t > 0.80 && t < 0.92 && c > 0.45) {
        extraFwd = gaussian(t, 0.85, 0.04) * Math.pow(c, 3) * 0.11;
      }

      const vx = p.x + lateral.x * (s * rLat) + forward.x * (c * (rFwd + extraFwd));
      const vy = p.y + lateral.y * (s * rLat) + forward.y * (c * (rFwd + extraFwd));
      const vz = p.z + lateral.z * (s * rLat) + forward.z * (c * (rFwd + extraFwd));

      positions.push(vx, vy, vz);
      uvs.push(u, t);
    }
  }

  const ringStride = slices + 1;
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * ringStride + j;
      const b = a + 1;
      const c = (i + 1) * ringStride + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a seamless sculpted Leg -> Knee -> Calf -> Ankle -> Foot mesh
 * standing flush on the exhibit plinth (y = -6.59).
 */
export function createSeamlessLegAndFootGeometry(side: -1 | 1): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.84, -2.05, -0.08), // Inside pelvis/hip socket
    new THREE.Vector3(side * 0.90, -3.10, -0.04), // Mid thigh (quadriceps)
    new THREE.Vector3(side * 0.94, -4.18, -0.02), // Knee
    new THREE.Vector3(side * 0.96, -5.05, -0.10), // Muscular calf (slight posterior sweep)
    new THREE.Vector3(side * 0.97, -6.12, -0.12), // Ankle
    new THREE.Vector3(side * 0.98, -6.42, 0.02),  // Heel -> Instep curve
    new THREE.Vector3(side * 1.00, -6.46, 0.34),  // Midfoot
    new THREE.Vector3(side * 1.02, -6.50, 0.62),  // Forefoot / Toes
  ]);

  const stacks = 64;
  const slices = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const frames = curve.computeFrenetFrames(stacks, false);
  const worldFront = new THREE.Vector3(0, 0, 1);
  const worldUp = new THREE.Vector3(0, 1, 0);
  const lateral = new THREE.Vector3();
  const orthoB = new THREE.Vector3();

  for (let i = 0; i <= stacks; i++) {
    const t = i / stacks;
    const p = curve.getPointAt(t);
    const tangent = frames.tangents[i];

    // Smoothly transition frame reference from vertical leg to horizontal foot
    const footBlend = smoothstep(0.72, 0.88, t);
    const refAxis = worldFront.clone().lerp(worldUp, footBlend).normalize();
    lateral.crossVectors(refAxis, tangent).normalize();
    orthoB.crossVectors(tangent, lateral).normalize();

    let rLat = 0.35;
    let rOrtho = 0.35;

    if (t < 0.38) {
      // Hip -> Thigh -> Knee
      const lt = t / 0.38;
      const quadBulge = gaussian(lt, 0.35, 0.32) * 0.08;
      rLat = THREE.MathUtils.lerp(0.62, 0.39, smoothstep(0.0, 1.0, lt)) + quadBulge;
      rOrtho = THREE.MathUtils.lerp(0.60, 0.40, smoothstep(0.0, 1.0, lt)) + quadBulge * 1.1;
    } else if (t < 0.75) {
      // Knee -> Calf -> Ankle
      const lt = (t - 0.38) / 0.37;
      const calfSwell = gaussian(lt, 0.34, 0.24) * 0.095;
      rLat = THREE.MathUtils.lerp(0.39, 0.22, smoothstep(0.1, 1.0, lt)) + calfSwell * 0.8;
      rOrtho = THREE.MathUtils.lerp(0.40, 0.24, smoothstep(0.1, 1.0, lt)) + calfSwell;
    } else {
      // Ankle -> Sculpted Foot & Toes
      const ft = (t - 0.75) / 0.25;
      const ballWidth = gaussian(ft, 0.62, 0.28) * 0.09;
      const toeTaper = smoothstep(1.0, 0.72, ft);
      rLat = (0.22 + ballWidth) * (0.15 + 0.85 * toeTaper);
      rOrtho = THREE.MathUtils.lerp(0.24, 0.11, Math.pow(ft, 0.75));
      if (ft > 0.94) {
        const cap = smoothstep(1.0, 0.94, ft);
        rLat *= cap;
        rOrtho *= cap;
      }
    }

    for (let j = 0; j <= slices; j++) {
      const u = j / slices;
      const theta = u * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      // Subtle kneecap (patella) contour & calf posterior contour
      let orthoShift = 0;
      if (t > 0.32 && t < 0.44 && c > 0.3) {
        orthoShift = gaussian(t, 0.38, 0.04) * Math.pow(c, 2) * 0.045;
      }

      let vx = p.x + lateral.x * (s * rLat) + orthoB.x * (c * (rOrtho + orthoShift));
      let vy = p.y + lateral.y * (s * rLat) + orthoB.y * (c * (rOrtho + orthoShift));
      let vz = p.z + lateral.z * (s * rLat) + orthoB.z * (c * (rOrtho + orthoShift));

      // Flatten foot sole cleanly onto the exhibit plinth top (y = -6.59)
      if (t > 0.74 && vy < -6.59) {
        vy = -6.59;
      }
      // Subtle sculpted heel projection backward at ankle transition
      if (t > 0.73 && t < 0.82 && vz < -0.14) {
        vz -= gaussian(t, 0.77, 0.03) * 0.09;
      }

      positions.push(vx, vy, vz);
      uvs.push(u, t);
    }
  }

  const ringStride = slices + 1;
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * ringStride + j;
      const b = a + 1;
      const c = (i + 1) * ringStride + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
