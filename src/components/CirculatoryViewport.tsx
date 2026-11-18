import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ANATOMICAL_PARTS,
  CircuitFilter,
  PartId,
} from '../data/circulatoryData';
import { OWNER_FB_PAGE_NAME, OWNER_FB_URL, OWNER_LOGO_URL } from '../data/branding';
import { buildAlveolusRig } from '../three/alveolusBuilder';
import { buildCirculatoryRig } from '../three/anatomyBuilder';
import { buildTissueCapillaryRig } from '../three/tissueCapillaryBuilder';

export interface CameraFocusTarget {
  position: [number, number, number];
  target: [number, number, number];
  nonce: number;
}

interface CirculatoryViewportProps {
  sceneMode: 'macro' | 'alveolus' | 'capillary';
  bpm: number;
  isCutaway: boolean;
  showBodyShell: boolean;
  showLabels: boolean;
  isHealthy: boolean;
  slowMotion: boolean;
  activeCircuit: CircuitFilter;
  selectedPartId: PartId | null;
  traceMarkerPos: [number, number, number] | null;
  cameraFocus: CameraFocusTarget | null;
  autoRotate: boolean;
  onSelectPart: (partId: PartId | null) => void;
  onBeatPhase: (phase: 'lub' | 'dub') => void;
  onCardiacStage?: (stage: 'atrial' | 'ventricular' | 'diastole') => void;
  onUserCameraMove?: () => void;
}

export const DEFAULT_CAMERA_POS: [number, number, number] = [0.0, -0.65, 17.8];
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0.0, -0.85, 0.0];
export const ALVEOLUS_CAMERA_POS: [number, number, number] = [0.0, 0.35, 5.4];
export const ALVEOLUS_CAMERA_TARGET: [number, number, number] = [0.0, 0.1, 0.0];
export const CAPILLARY_CAMERA_POS: [number, number, number] = [0.0, 0.25, 5.4];
export const CAPILLARY_CAMERA_TARGET: [number, number, number] = [0.0, 0.0, 0.0];

const LABELED_PARTS: PartId[] = [
  'right_atrium',
  'left_atrium',
  'right_ventricle',
  'left_ventricle',
  'pulmonary_artery',
  'pulmonary_veins',
  'aorta',
  'vena_cava',
  'lungs',
  'body_capillaries',
];

// Pre-allocated projection vector (Zero GC in render loop)
const _projVec = new THREE.Vector3();

export default function CirculatoryViewport({
  sceneMode,
  bpm,
  isCutaway,
  showBodyShell,
  showLabels,
  isHealthy,
  slowMotion,
  activeCircuit,
  selectedPartId,
  traceMarkerPos,
  cameraFocus,
  autoRotate,
  onSelectPart,
  onBeatPhase,
  onCardiacStage,
  onUserCameraMove,
}: CirculatoryViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelElsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [webglError, setWebglError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const stateRef = useRef({
    sceneMode,
    bpm,
    isCutaway,
    showBodyShell,
    showLabels,
    isHealthy,
    slowMotion,
    activeCircuit,
    selectedPartId,
    autoRotate,
    traceMarkerPosVec: null as THREE.Vector3 | null,
    onSelectPart,
    onBeatPhase,
    onCardiacStage,
    onUserCameraMove,
  });

  stateRef.current.sceneMode = sceneMode;
  stateRef.current.bpm = bpm;
  stateRef.current.isCutaway = isCutaway;
  stateRef.current.showBodyShell = showBodyShell;
  stateRef.current.showLabels = showLabels;
  stateRef.current.isHealthy = isHealthy;
  stateRef.current.slowMotion = slowMotion;
  stateRef.current.activeCircuit = activeCircuit;
  stateRef.current.selectedPartId = selectedPartId;
  stateRef.current.autoRotate = autoRotate;
  stateRef.current.onSelectPart = onSelectPart;
  stateRef.current.onBeatPhase = onBeatPhase;
  stateRef.current.onCardiacStage = onCardiacStage;
  stateRef.current.onUserCameraMove = onUserCameraMove;
  stateRef.current.traceMarkerPosVec = traceMarkerPos
    ? new THREE.Vector3(traceMarkerPos[0], traceMarkerPos[1], traceMarkerPos[2])
    : null;

  const cameraGoalRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...DEFAULT_CAMERA_POS),
    target: new THREE.Vector3(...DEFAULT_CAMERA_TARGET),
  });

  useEffect(() => {
    if (!cameraFocus) return;
    cameraGoalRef.current.pos.set(...cameraFocus.position);
    cameraGoalRef.current.target.set(...cameraFocus.target);
    cameraGoalRef.current.active = true;
  }, [cameraFocus]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: true,
      });
    } catch {
      setWebglError('تعذر تشغيل العرض ثلاثي الأبعاد (WebGL) على هذا المتصفح.');
      return;
    }

    let viewportW = container.clientWidth || window.innerWidth;
    let viewportH = container.clientHeight || window.innerHeight;

    renderer.setSize(viewportW, viewportH);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe2e8f0, 22, 46);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, viewportW / viewportH, 0.1, 100);
    camera.position.set(...DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...DEFAULT_CAMERA_TARGET);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.2;
    controls.maxDistance = 24.0;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.autoRotateSpeed = 1.6;
    controls.update();

    const handleControlsStart = () => {
      cameraGoalRef.current.active = false;
      stateRef.current.onUserCameraMove?.();
    };
    controls.addEventListener('start', handleControlsStart);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xcbd5e1, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    keyLight.position.set(4.5, 7.5, 6.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 6.5;
    keyLight.shadow.camera.bottom = -7.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.05);
    rimLight.position.set(-5.5, 4.0, -5.5);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const rig = buildCirculatoryRig(maxAnisotropy);
    scene.add(rig.rootGroup);

    const alveolusRig = buildAlveolusRig(rig.bumpTexture);
    scene.add(alveolusRig.group);

    const tissueRig = buildTissueCapillaryRig(rig.bumpTexture);
    scene.add(tissueRig.group);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let hoveredPartId: PartId | null = null;
    let lastHoverCheck = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickPart = (): PartId | null => {
      if (stateRef.current.sceneMode !== 'macro') return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(rig.clickableMeshes, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.partId as PartId) ?? null;
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      updateNdc(e.clientX, e.clientY);
      const hit = pickPart();
      if (hit !== hoveredPartId) {
        hoveredPartId = hit;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (!hoveredPartId) {
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) <= 6 && stateRef.current.sceneMode === 'macro') {
        updateNdc(e.clientX, e.clientY);
        const hit = pickPart();
        stateRef.current.onSelectPart(hit);
      }
      renderer.domElement.style.cursor = hoveredPartId ? 'pointer' : 'grab';
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        viewportW = Math.max(1, entry.contentRect.width);
        viewportH = Math.max(1, entry.contentRect.height);
        camera.aspect = viewportW / viewportH;
        camera.updateProjectionMatrix();
        renderer.setSize(viewportW, viewportH);
      }
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateProjectedLabels() {
      const s = stateRef.current;
      const shouldShow = s.sceneMode === 'macro' && s.showLabels;
      for (const partId of LABELED_PARTS) {
        const el = labelElsRef.current[partId];
        if (!el) continue;
        if (!shouldShow) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }
        const anchor = ANATOMICAL_PARTS[partId].labelAnchor;
        _projVec.set(anchor[0], anchor[1], anchor[2]).project(camera);

        if (_projVec.z > 1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }
        const sx = ((_projVec.x + 1) * 0.5) * viewportW;
        const sy = ((-_projVec.y + 1) * 0.5) * viewportH;
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    }

    function tick() {
      if (disposed) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const s = stateRef.current;

      const goal = cameraGoalRef.current;
      if (goal.active) {
        const dt = Math.min(delta, 0.05);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, goal.pos.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, goal.pos.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, goal.pos.z, 5.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, goal.target.x, 6.0, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, goal.target.y, 6.0, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, goal.target.z, 6.0, dt);

        if (
          camera.position.distanceTo(goal.pos) < 0.04 &&
          controls.target.distanceTo(goal.target) < 0.04
        ) {
          goal.active = false;
        }
      }

      controls.autoRotate = !goal.active && s.autoRotate && s.sceneMode === 'macro';
      controls.update();

      const isMacro = s.sceneMode === 'macro';
      const isAlveolus = s.sceneMode === 'alveolus';
      const isCapillary = s.sceneMode === 'capillary';
      rig.rootGroup.visible = isMacro;
      alveolusRig.group.visible = isAlveolus;
      tissueRig.group.visible = isCapillary;

      if (isMacro) {
        rig.updateAnimation(elapsed, delta, {
          bpm: s.bpm,
          isCutaway: s.isCutaway,
          showBodyShell: s.showBodyShell,
          isHealthy: s.isHealthy,
          slowMotion: s.slowMotion,
          activeCircuit: s.activeCircuit,
          selectedPartId: s.selectedPartId,
          hoveredPartId,
          traceMarkerPos: s.traceMarkerPosVec,
          onBeatPhase: s.onBeatPhase,
          onCardiacStage: s.onCardiacStage,
        });
      } else if (isAlveolus) {
        alveolusRig.updateAnimation(elapsed, delta, {
          bpm: s.bpm,
          isHealthy: s.isHealthy,
          slowMotion: s.slowMotion,
        });
      } else {
        tissueRig.updateAnimation(elapsed, delta, {
          bpm: s.bpm,
          isHealthy: s.isHealthy,
          slowMotion: s.slowMotion,
        });
      }

      updateProjectedLabels();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      rig.disposables.geometries.forEach((g) => g.dispose());
      rig.disposables.materials.forEach((m) => m.dispose());
      rig.disposables.textures.forEach((t) => t.dispose());
      alveolusRig.disposables.geometries.forEach((g) => g.dispose());
      alveolusRig.disposables.materials.forEach((m) => m.dispose());
      tissueRig.disposables.geometries.forEach((g) => g.dispose());
      tissueRig.disposables.materials.forEach((m) => m.dispose());
      envTex.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">العرض ثلاثي الأبعاد غير متاح</h2>
          <p className="text-sm text-slate-600">{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 44%, #ffffff 0%, #f1f5f9 45%, #cbd5e1 100%)',
      }}
    >
      {/* Smaller Studio Background Profile Pic on the Right (behind 3D model) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-40 sm:bottom-24 right-4 sm:right-8 w-24 sm:w-32 md:w-36 z-0 flex justify-center select-none"
      >
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-slate-400/30 scale-105" />
          <div className="absolute inset-0 rounded-full border border-red-600/15 scale-112" />
          <img
            src={OWNER_LOGO_URL}
            alt=""
            className="w-full h-full rounded-full object-cover opacity-[0.28] saturate-[0.92] shadow-sm"
          />
        </div>
      </div>

      {/* Clickable Facebook Page Name centered under Right Background Profile Pic */}
      <div className="pointer-events-none absolute bottom-32 sm:bottom-14 right-4 sm:right-8 w-24 sm:w-32 md:w-36 z-[5] flex justify-center">
        <a
          href={OWNER_FB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={`زيارة صفحة ${OWNER_FB_PAGE_NAME} على فيسبوك`}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-slate-200/90 text-[#1877F2] hover:text-[#0d5bbd] text-[11px] font-extrabold shadow-xs transition-colors whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
          </svg>
          <span>صفحة {OWNER_FB_PAGE_NAME}</span>
        </a>
      </div>

      <div ref={mountRef} className="relative z-[1] w-full h-full" />

      {/* Projected 3D Pin Labels Overlay (Zero-GC transform updates, no backdrop-blur) */}
      <div aria-hidden={!showLabels || sceneMode !== 'macro'} className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {LABELED_PARTS.map((partId) => {
          const part = ANATOMICAL_PARTS[partId];
          const isSelected = selectedPartId === partId;
          return (
            <button
              key={partId}
              ref={(el) => {
                labelElsRef.current[partId] = el;
              }}
              type="button"
              onClick={() => onSelectPart(partId)}
              style={{ opacity: 0, left: 0, top: 0 }}
              className={`absolute px-2 py-0.5 rounded-md border text-[11px] font-bold whitespace-nowrap shadow-xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 border-amber-600 text-white'
                  : 'bg-white/95 border-slate-300 text-slate-800 hover:border-teal-600'
              }`}
            >
              <span>{part.titleAr}</span>
            </button>
          );
        })}
      </div>

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 z-20 p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-base font-bold text-slate-900">جارٍ استعادة العرض ثلاثي الأبعاد...</p>
          </div>
        </div>
      )}
    </div>
  );
}
