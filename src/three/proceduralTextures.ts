import * as THREE from 'three';

/**
 * Generates an organic tissue albedo texture (myocardium / vessel wall)
 * with realistic muscle fiber striations and branching micro-capillaries.
 */
export function createOrganicTissueTexture(
  baseHex: string,
  veinHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Organic muscle / tissue fiber striations
  ctx.strokeStyle = veinHex;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.28;

  for (let i = 0; i < 52; i++) {
    const y = (i / 52) * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 20) {
      const wave = Math.sin((x / size) * Math.PI * 2 + i * 0.4) * 6;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // Subtle specular fiber highlights
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * size + 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 24) {
      ctx.lineTo(x, y + Math.cos((x / size) * Math.PI * 2 + i) * 4);
    }
    ctx.stroke();
  }

  // Fine branching micro-vessels
  ctx.strokeStyle = veinHex;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 18; i++) {
    const sx = ((i * 59) % 220) + 18;
    const sy = ((i * 97) % 220) + 18;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 20, sy - 14, sx + 42, sy + 8);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a linear grayscale bump map for organic wet tissue relief.
 */
export function createOrganicBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 480; i++) {
    const x = (i * 79) % size;
    const y = (i * 131) % size;
    const r = 3 + (i % 8);
    const shade = i % 2 === 0 ? 'rgba(225,225,225,0.14)' : 'rgba(35,35,35,0.14)';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft radial contact shadow texture for studio grounding.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
  grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.14)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a spongy lobular alveolar texture for realistic lungs.
 */
export function createLungAlveoliTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f2a7b3';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#be5a6c';
  ctx.lineWidth = 1.1;
  ctx.globalAlpha = 0.25;

  const step = 22;
  for (let y = 0; y < size + step; y += step) {
    for (let x = 0; x < size + step; x += step) {
      const ox = x + ((y / step) % 2 === 0 ? 0 : step * 0.5);
      ctx.beginPath();
      ctx.arc(ox, y, step * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft museum studio radial vignette texture for scene.background.
 */
export function createStudioBackdropTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.44,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.72,
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#f1f5f9');
  grad.addColorStop(1, '#cbd5e1');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates meandering cortical gyri/sulci folds bump map for the 3D brain.
 */
export function createBrainSulciBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a8a8a8';
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 5;

  for (let i = 0; i < 34; i++) {
    const sx = ((i * 67) % 210) + 22;
    const sy = ((i * 113) % 210) + 22;
    const ang = (i * 1.1) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + Math.cos(ang) * 28,
      sy + Math.sin(ang) * 28,
      sx + Math.cos(ang + 1.2) * 34,
      sy + Math.sin(ang + 1.2) * 34,
      sx + Math.cos(ang + 0.5) * 52,
      sy + Math.sin(ang + 0.5) * 52,
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates crisp circular degree markings & exhibit scale texture for the plinth top.
 */
export function createPlinthDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  const bgGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, size * 0.5);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(0.7, '#e2e8f0');
  bgGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(15, 118, 110, 0.25)';
  ctx.lineWidth = 2;
  [size * 0.24, size * 0.36, size * 0.45].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 36 radial degree tick marks around perimeter
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const isMajor = i % 3 === 0;
    const r0 = size * (isMajor ? 0.41 : 0.43);
    const r1 = size * 0.45;
    ctx.strokeStyle = isMajor ? 'rgba(15, 118, 110, 0.5)' : 'rgba(100, 116, 139, 0.35)';
    ctx.lineWidth = isMajor ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

