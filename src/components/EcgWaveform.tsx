import { useEffect, useRef } from 'react';

interface EcgWaveformProps {
  bpm: number;
  isHealthy: boolean;
  slowMotion?: boolean;
}

/**
 * Generates a realistic P-QRS-T cardiac waveform voltage for phase in [0, 1).
 */
function sampleEcgVoltage(phase: number): number {
  // P-wave (atrial contraction ~0.05..0.16)
  if (phase >= 0.04 && phase <= 0.16) {
    return Math.sin(((phase - 0.04) / 0.12) * Math.PI) * 0.18;
  }
  // QRS complex (ventricular systole / Lub ~0.20..0.30)
  if (phase >= 0.19 && phase < 0.215) {
    return -((phase - 0.19) / 0.025) * 0.22;
  }
  if (phase >= 0.215 && phase < 0.245) {
    return -0.22 + ((phase - 0.215) / 0.03) * 1.17; // spike up to +0.95
  }
  if (phase >= 0.245 && phase < 0.275) {
    return 0.95 - ((phase - 0.245) / 0.03) * 1.3; // dip down to -0.35
  }
  if (phase >= 0.275 && phase <= 0.305) {
    return -0.35 + ((phase - 0.275) / 0.03) * 0.35;
  }
  // T-wave (repolarization / Dub ~0.46..0.64)
  if (phase >= 0.46 && phase <= 0.64) {
    return Math.sin(((phase - 0.46) / 0.18) * Math.PI) * 0.28;
  }
  return 0;
}

export default function EcgWaveform({ bpm, isHealthy, slowMotion = false }: EcgWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bpmRef = useRef(bpm);
  const healthyRef = useRef(isHealthy);
  const slowRef = useRef(slowMotion);
  bpmRef.current = bpm;
  healthyRef.current = isHealthy;
  slowRef.current = slowMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 104;
    const height = 28;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;
    let lastTime = performance.now();
    let frameId = 0;
    const buffer = new Array<number>(width).fill(0);

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const beatsPerSec = (bpmRef.current / 60) * (slowRef.current ? 0.32 : 1.0);
      phase = (phase + dt * beatsPerSec) % 1;

      buffer.shift();
      buffer.push(sampleEcgVoltage(phase));

      ctx.clearRect(0, 0, width, height);

      // Subtle baseline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.62);
      ctx.lineTo(width, height * 0.62);
      ctx.stroke();

      // ECG trace
      ctx.strokeStyle = healthyRef.current ? '#0f766e' : '#d97706';
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = height * 0.62 - buffer[x] * (height * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="مخطط نبض القلب الكهربائي"
      className="w-[104px] h-[28px] rounded-md bg-slate-50 border border-slate-200 shrink-0"
    />
  );
}
