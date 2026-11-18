import { useCallback, useEffect, useRef, useState } from 'react';
import BottomControlDock from './components/BottomControlDock';
import CameraFocusBar, { CameraPreset, CameraPresetId } from './components/CameraFocusBar';
import CirculatoryViewport, {
  ALVEOLUS_CAMERA_POS,
  ALVEOLUS_CAMERA_TARGET,
  CAPILLARY_CAMERA_POS,
  CAPILLARY_CAMERA_TARGET,
  CameraFocusTarget,
  DEFAULT_CAMERA_POS,
  DEFAULT_CAMERA_TARGET,
} from './components/CirculatoryViewport';
import OrderActivityModal from './components/OrderActivityModal';
import PartInspectorCard from './components/PartInspectorCard';
import QuizModal from './components/QuizModal';
import TopBar, { AppMode } from './components/TopBar';
import {
  ANATOMICAL_PARTS,
  CHALLENGE_PART_ORDER,
  CircuitFilter,
  PartId,
  TRACE_STATIONS,
} from './data/circulatoryData';
import { audioEngine } from './utils/audioEngine';

export default function App() {
  const [mode, setMode] = useState<AppMode>('explore');
  const [activeCircuit, setActiveCircuit] = useState<CircuitFilter>('both');
  const [isCutaway, setIsCutaway] = useState(false);
  const [showBodyShell, setShowBodyShell] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const [slowMotion, setSlowMotion] = useState(false);
  const [cardiacStage, setCardiacStage] = useState<'atrial' | 'ventricular' | 'diastole'>('diastole');
  const [bpm, setBpm] = useState(75);
  const [isMuted, setIsMuted] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState<PartId | null>(null);
  const [traceStepIndex, setTraceStepIndex] = useState(0);
  const [orderOpen, setOrderOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [cameraFocus, setCameraFocus] = useState<CameraFocusTarget | null>(null);
  const [activeCameraPreset, setActiveCameraPreset] = useState<CameraPresetId | null>('full_body');
  const [autoRotate, setAutoRotate] = useState(false);

  // Interactive 3D Pinpoint Challenge state
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeFinished, setChallengeFinished] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState<{
    type: 'correct' | 'wrong';
    messageAr: string;
  } | null>(null);
  const [challengeAttemptsOnCurrent, setChallengeAttemptsOnCurrent] = useState(0);

  const focusNonceRef = useRef(0);
  const challengeTimerRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const focusCamera = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      focusNonceRef.current += 1;
      setCameraFocus({ position, target, nonce: focusNonceRef.current });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (challengeTimerRef.current) window.clearTimeout(challengeTimerRef.current);
      audioEngine.dispose();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (quizOpen || orderOpen) return;
      if (e.key === 'h' || e.key === 'H' || e.key === 'أ') {
        setDockCollapsed((prev) => !prev);
      } else if (mode === 'trace') {
        if (e.key === 'ArrowLeft') {
          setTraceStepIndex((prev) => (prev + 1) % TRACE_STATIONS.length);
        } else if (e.key === 'ArrowRight') {
          setTraceStepIndex((prev) => (prev - 1 + TRACE_STATIONS.length) % TRACE_STATIONS.length);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, quizOpen, orderOpen]);

  // Trace mode synchronization
  useEffect(() => {
    if (mode !== 'trace') return;
    const station = TRACE_STATIONS[traceStepIndex];
    setSelectedPartId(station.partId);
    setActiveCircuit(station.circuit);
    if (station.requiresCutaway) {
      setIsCutaway(true);
    }
    setActiveCameraPreset(null);
    focusCamera(station.cameraPos, station.cameraTarget);
  }, [mode, traceStepIndex, focusCamera]);

  // Challenge mode automatic cutaway & overview camera when asking for heart chambers
  useEffect(() => {
    if (mode !== 'challenge' || challengeFinished) return;
    const targetId = CHALLENGE_PART_ORDER[challengeIndex];
    const targetPart = ANATOMICAL_PARTS[targetId];
    if (targetPart.requiresCutaway) {
      setIsCutaway(true);
      setActiveCameraPreset('heart');
      focusCamera([0.0, 0.45, 5.2], [0.0, 0.35, 0.2]);
    } else {
      setActiveCameraPreset('full_body');
      focusCamera(DEFAULT_CAMERA_POS, DEFAULT_CAMERA_TARGET);
    }
  }, [mode, challengeIndex, challengeFinished, focusCamera]);

  const handleRestartChallenge = useCallback(() => {
    if (challengeTimerRef.current) {
      window.clearTimeout(challengeTimerRef.current);
      challengeTimerRef.current = null;
    }
    setChallengeIndex(0);
    setChallengeScore(0);
    setChallengeFinished(false);
    setChallengeFeedback(null);
    setChallengeAttemptsOnCurrent(0);
    setSelectedPartId(null);
  }, []);

  const handleModeChange = (nextMode: AppMode) => {
    if (challengeTimerRef.current) {
      window.clearTimeout(challengeTimerRef.current);
      challengeTimerRef.current = null;
    }
    setMode(nextMode);
    if (nextMode === 'explore') {
      setActiveCircuit('both');
      setSelectedPartId(null);
      setActiveCameraPreset('full_body');
      focusCamera(DEFAULT_CAMERA_POS, DEFAULT_CAMERA_TARGET);
    } else if (nextMode === 'trace') {
      setActiveCameraPreset(null);
      setTraceStepIndex(0);
    } else if (nextMode === 'alveolus') {
      setSelectedPartId(null);
      setActiveCameraPreset(null);
      focusCamera(ALVEOLUS_CAMERA_POS, ALVEOLUS_CAMERA_TARGET);
    } else if (nextMode === 'capillary') {
      setSelectedPartId(null);
      setActiveCameraPreset(null);
      focusCamera(CAPILLARY_CAMERA_POS, CAPILLARY_CAMERA_TARGET);
    } else if (nextMode === 'challenge') {
      setActiveCircuit('both');
      setShowLabels(false);
      handleRestartChallenge();
    }
  };

  const handleSelectPart = useCallback(
    (partId: PartId | null) => {
      audioEngine.unlock();

      if (mode === 'challenge') {
        if (!partId || challengeFinished) return;
        const targetId = CHALLENGE_PART_ORDER[challengeIndex];
        if (partId === targetId) {
          if (challengeAttemptsOnCurrent === 0) {
            setChallengeScore((s) => s + 1);
          }
          setSelectedPartId(partId);
          setChallengeFeedback({
            type: 'correct',
            messageAr: `أحسنت! هذا هو ${ANATOMICAL_PARTS[partId].titleAr}.`,
          });
          if (challengeTimerRef.current) window.clearTimeout(challengeTimerRef.current);
          challengeTimerRef.current = window.setTimeout(() => {
            challengeTimerRef.current = null;
            if (challengeIndex + 1 < CHALLENGE_PART_ORDER.length) {
              setChallengeIndex((i) => i + 1);
              setChallengeAttemptsOnCurrent(0);
              setChallengeFeedback(null);
              setSelectedPartId(null);
            } else {
              setChallengeFinished(true);
            }
          }, 950);
        } else {
          setChallengeAttemptsOnCurrent((a) => a + 1);
          setChallengeFeedback({
            type: 'wrong',
            messageAr: `هذا ${ANATOMICAL_PARTS[partId].titleAr} — حاول تحديد ${ANATOMICAL_PARTS[targetId].titleAr}.`,
          });
        }
        return;
      }

      if (!partId) {
        if (mode === 'explore') {
          setSelectedPartId(null);
        }
        return;
      }

      if (mode === 'trace') {
        const idx = TRACE_STATIONS.findIndex((s) => s.partId === partId);
        if (idx !== -1) {
          setTraceStepIndex(idx);
          return;
        }
      }

      const part = ANATOMICAL_PARTS[partId];
      setSelectedPartId(partId);
      if (part.requiresCutaway) {
        setIsCutaway(true);
      }
      setActiveCameraPreset(null);
      focusCamera(part.cameraPos, part.cameraTarget);
    },
    [mode, challengeIndex, challengeFinished, challengeAttemptsOnCurrent, focusCamera],
  );

  const handleToggleMute = () => {
    audioEngine.unlock();
    const nextMuted = !isMuted;
    audioEngine.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleBeatPhase = useCallback((phase: 'lub' | 'dub') => {
    audioEngine.playHeartbeat(phase, bpmRef.current * (slowMotion ? 0.32 : 1.0));
  }, [slowMotion]);

  const handleResetView = () => {
    setSelectedPartId(null);
    setActiveCircuit('both');
    setIsCutaway(false);
    setShowBodyShell(true);
    setIsHealthy(true);
    setSlowMotion(false);
    setBpm(75);
    setAutoRotate(false);
    if (mode === 'alveolus') {
      setActiveCameraPreset(null);
      focusCamera(ALVEOLUS_CAMERA_POS, ALVEOLUS_CAMERA_TARGET);
    } else if (mode === 'capillary') {
      setActiveCameraPreset(null);
      focusCamera(CAPILLARY_CAMERA_POS, CAPILLARY_CAMERA_TARGET);
    } else {
      if (mode !== 'explore') setMode('explore');
      setActiveCameraPreset('full_body');
      focusCamera(DEFAULT_CAMERA_POS, DEFAULT_CAMERA_TARGET);
    }
  };

  const handleSelectCameraPreset = useCallback(
    (preset: CameraPreset) => {
      setActiveCameraPreset(preset.id);
      if (preset.id === 'heart' && mode === 'explore') {
        setSelectedPartId(null);
      }
      focusCamera(preset.position, preset.target);
    },
    [focusCamera, mode],
  );

  const handleUserCameraMove = useCallback(() => {
    setActiveCameraPreset(null);
  }, []);

  const traceMarkerPos =
    mode === 'trace' ? TRACE_STATIONS[traceStepIndex].markerPos : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-100">
      {/* Top 3-Zone Header */}
      <div className="relative z-20 shrink-0">
        <TopBar
          mode={mode}
          onModeChange={handleModeChange}
          onOpenOrder={() => {
            audioEngine.stopSpeech();
            setOrderOpen(true);
          }}
          onOpenQuiz={() => {
            audioEngine.stopSpeech();
            setQuizOpen(true);
          }}
        />
      </div>

      {/* Main Unobstructed 3D Stage */}
      <main className="relative flex-1 w-full overflow-hidden">
        <CirculatoryViewport
          sceneMode={
            mode === 'alveolus'
              ? 'alveolus'
              : mode === 'capillary'
                ? 'capillary'
                : 'macro'
          }
          bpm={bpm}
          isCutaway={isCutaway}
          showBodyShell={showBodyShell}
          showLabels={showLabels}
          isHealthy={isHealthy}
          slowMotion={slowMotion}
          activeCircuit={activeCircuit}
          selectedPartId={selectedPartId}
          traceMarkerPos={traceMarkerPos}
          cameraFocus={cameraFocus}
          autoRotate={autoRotate}
          onSelectPart={handleSelectPart}
          onBeatPhase={handleBeatPhase}
          onCardiacStage={setCardiacStage}
          onUserCameraMove={handleUserCameraMove}
        />

        {/* Quiet Unboxed Legend Key */}
        <div
          aria-label="مفتاح الألوان"
          className="pointer-events-none fixed top-16 left-5 z-10 hidden sm:flex items-center gap-3 text-xs font-semibold text-slate-700"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" aria-hidden="true" />
            <span>دم قانٍ (أحمر): غني بـ O₂</span>
          </span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#4a0712] inline-block" aria-hidden="true" />
            <span>دم قاتم (أحمر داكن): محمل بـ CO₂</span>
          </span>
        </div>

        {/* Quick Camera Focus Bar */}
        <CameraFocusBar
          visible={mode !== 'alveolus' && mode !== 'capillary'}
          hideOnMobile={
            mode === 'trace' ||
            mode === 'challenge' ||
            selectedPartId !== null ||
            !isHealthy
          }
          activePreset={activeCameraPreset}
          autoRotate={autoRotate}
          onSelectPreset={handleSelectCameraPreset}
          onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        />

        {/* Contextual Organ / Alveolus / Capillary / Challenge Card */}
        <PartInspectorCard
          mode={mode}
          selectedPartId={selectedPartId}
          traceStepIndex={traceStepIndex}
          isHealthy={isHealthy}
          challengeIndex={challengeIndex}
          challengeScore={challengeScore}
          challengeFinished={challengeFinished}
          challengeFeedback={challengeFeedback}
          onRestartChallenge={handleRestartChallenge}
          onClose={() => setSelectedPartId(null)}
        />

        {/* Collapsible Bottom Control Dock */}
        <BottomControlDock
          mode={mode}
          isCollapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
          activeCircuit={activeCircuit}
          onCircuitChange={(c) => {
            setActiveCircuit(c);
            if (mode === 'trace') setMode('explore');
          }}
          isCutaway={isCutaway}
          onToggleCutaway={() => setIsCutaway((prev) => !prev)}
          showBodyShell={showBodyShell}
          onToggleBodyShell={() => setShowBodyShell((prev) => !prev)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels((prev) => !prev)}
          isHealthy={isHealthy}
          onToggleHealthy={() => setIsHealthy((prev) => !prev)}
          slowMotion={slowMotion}
          onToggleSlowMotion={() => setSlowMotion((prev) => !prev)}
          cardiacStage={cardiacStage}
          bpm={bpm}
          onBpmChange={setBpm}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResetView={handleResetView}
          traceStepIndex={traceStepIndex}
          onTraceStepChange={setTraceStepIndex}
        />
      </main>

      {/* Sequence Ordering Mini-Game Modal */}
      <OrderActivityModal isOpen={orderOpen} onClose={() => setOrderOpen(false)} />

      {/* Interactive 8-Question Quiz Modal */}
      <QuizModal isOpen={quizOpen} onClose={() => setQuizOpen(false)} />
    </div>
  );
}
