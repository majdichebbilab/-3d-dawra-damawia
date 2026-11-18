import {
  ArrowLeftRight,
  CheckCircle2,
  Droplet,
  RotateCcw,
  ShieldAlert,
  Target,
  Trophy,
  Volume2,
  Wind,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ALVEOLUS_INFO,
  ANATOMICAL_PARTS,
  CHALLENGE_PART_ORDER,
  HEALTH_STATE_INFO,
  OxygenState,
  PartId,
  TISSUE_CAPILLARY_INFO,
  TRACE_STATIONS,
} from '../data/circulatoryData';
import { audioEngine } from '../utils/audioEngine';
import { AppMode } from './TopBar';

interface PartInspectorCardProps {
  mode: AppMode;
  selectedPartId: PartId | null;
  traceStepIndex: number;
  isHealthy: boolean;
  challengeIndex: number;
  challengeScore: number;
  challengeFinished: boolean;
  challengeFeedback: { type: 'correct' | 'wrong'; messageAr: string } | null;
  onRestartChallenge: () => void;
  onClose: () => void;
}

function getOxygenVisuals(state: OxygenState) {
  if (state === 'oxygenated') {
    return {
      bgClass: 'bg-red-50 border-red-200 text-red-800',
      Icon: Droplet,
    };
  }
  if (state === 'deoxygenated') {
    return {
      bgClass: 'bg-[#4a0712] border-[#6b1020] text-rose-50',
      Icon: Wind,
    };
  }
  return {
    bgClass: 'bg-purple-50 border-purple-200 text-purple-800',
    Icon: ArrowLeftRight,
  };
}

export default function PartInspectorCard({
  mode,
  selectedPartId,
  traceStepIndex,
  isHealthy,
  challengeIndex,
  challengeScore,
  challengeFinished,
  challengeFeedback,
  onRestartChallenge,
  onClose,
}: PartInspectorCardProps) {
  const [speechState, setSpeechState] = useState<
    'idle' | 'speaking-ar' | 'speaking-fr' | 'unsupported'
  >('idle');

  const station = mode === 'trace' ? TRACE_STATIONS[traceStepIndex] : null;
  const activePart = selectedPartId
    ? ANATOMICAL_PARTS[selectedPartId]
    : station
      ? ANATOMICAL_PARTS[station.partId]
      : null;

  useEffect(() => {
    setSpeechState('idle');
    audioEngine.stopSpeech();
    return () => {
      audioEngine.stopSpeech();
    };
  }, [activePart?.id, traceStepIndex, mode, challengeIndex]);

  // 1. Alveolus Micro-Scene Card
  if (mode === 'alveolus') {
    return (
      <aside
        aria-label="شرح السنخ الرئوي"
        className="pointer-events-auto fixed top-16 right-4 z-10 w-[min(350px,calc(100vw-2rem))] bg-white/95 border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">
            الدورة الدموية الصغرى · <span className="font-latin" dir="ltr">Échanges gazeux</span>
          </span>
          <h2 className="text-base font-bold text-slate-900">{ALVEOLUS_INFO.titleAr}</h2>
          <p className="font-latin text-xs font-semibold text-teal-800" dir="ltr">
            {ALVEOLUS_INFO.titleFr}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span>جزيئات الأكسجين (O₂) تدخل إلى الدم ← أحمر قانٍ</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" aria-hidden="true" />
            <span>ثاني أكسيد الكربون (CO₂) يخرج في الزفير</span>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">{ALVEOLUS_INFO.descriptionAr}</p>

        {!isHealthy && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{ALVEOLUS_INFO.unhealthyNoteAr}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            audioEngine.speakBilingual(ALVEOLUS_INFO.titleAr, ALVEOLUS_INFO.titleFr, setSpeechState)
          }
          className="inline-flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {speechState === 'speaking-ar'
              ? 'جارٍ النطق بالعربية...'
              : speechState === 'speaking-fr'
                ? 'Prononciation en français...'
                : 'استمع للنطق (عربي / فرنسي)'}
          </span>
        </button>
      </aside>
    );
  }

  // 1b. Body Tissue / Muscle Capillary Micro-Scene Card
  if (mode === 'capillary') {
    return (
      <aside
        aria-label="شرح الشعيرات الدموية في الأعضاء"
        className="pointer-events-auto fixed top-16 right-4 z-10 w-[min(350px,calc(100vw-2rem))] bg-white/95 border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">
            الدورة الدموية الكبرى · <span className="font-latin" dir="ltr">Échanges cellulaires</span>
          </span>
          <h2 className="text-base font-bold text-slate-900">{TISSUE_CAPILLARY_INFO.titleAr}</h2>
          <p className="font-latin text-xs font-semibold text-teal-800" dir="ltr">
            {TISSUE_CAPILLARY_INFO.titleFr}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span>الأكسجين (O₂) والمغذيات (الذهبية) ← تدخل الخلايا</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#4a0712] border border-[#6b1020] text-rose-50">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
            <span>طرح CO₂ والفضلات ← يصبح الدم أحمر قاتماً</span>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">{TISSUE_CAPILLARY_INFO.descriptionAr}</p>

        {!isHealthy && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{TISSUE_CAPILLARY_INFO.unhealthyNoteAr}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            audioEngine.speakBilingual(
              TISSUE_CAPILLARY_INFO.titleAr,
              TISSUE_CAPILLARY_INFO.titleFr,
              setSpeechState,
            )
          }
          className="inline-flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {speechState === 'speaking-ar'
              ? 'جارٍ النطق بالعربية...'
              : speechState === 'speaking-fr'
                ? 'Prononciation en français...'
                : 'استمع للنطق (عربي / فرنسي)'}
          </span>
        </button>
      </aside>
    );
  }

  // 2. Interactive 3D Pinpoint Challenge Card
  if (mode === 'challenge') {
    const targetId = CHALLENGE_PART_ORDER[challengeIndex];
    const targetPart = ANATOMICAL_PARTS[targetId];

    return (
      <aside
        aria-label="تحدي التحديد على المجسم"
        className="pointer-events-auto fixed top-16 right-4 z-10 w-[min(350px,calc(100vw-2rem))] bg-white/95 border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800">
            <Target className="w-4 h-4" aria-hidden="true" />
            <span>تحدي التحديد المباشر</span>
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            النتيجة: {challengeScore} / {CHALLENGE_PART_ORDER.length}
          </span>
        </div>

        {!challengeFinished ? (
          <>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
              <span className="text-xs text-slate-500 tabular-nums">
                المهمة {challengeIndex + 1} من {CHALLENGE_PART_ORDER.length}
              </span>
              <p className="text-sm font-bold text-slate-900">
                اضغط على المجسم لتحديد: <span className="text-teal-800">{targetPart.titleAr}</span>
              </p>
              <p className="font-latin text-xs font-semibold text-slate-600" dir="ltr">
                {targetPart.titleFr}
              </p>
            </div>

            {challengeFeedback && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  challengeFeedback.type === 'correct'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{challengeFeedback.messageAr}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                audioEngine.speakBilingual(targetPart.titleAr, targetPart.titleFr, setSpeechState)
              }
              className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>استمع لاسم الجزء المطلوب</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Trophy className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 tabular-nums">
                أحسنت! {challengeScore} / {CHALLENGE_PART_ORDER.length}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                أتممت تحديد جميع أجزاء القلب والدورة الدموية!
              </p>
            </div>
            <button
              type="button"
              onClick={onRestartChallenge}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>إعادة التحدي</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  // 3. Health Alert Banner if no part selected in Explore mode & !isHealthy
  if (!activePart) {
    if (!isHealthy) {
      return (
        <aside className="pointer-events-auto fixed top-16 right-4 z-10 w-[min(330px,calc(100vw-2rem))] bg-amber-50/95 border border-amber-300 rounded-2xl shadow-md p-3.5 flex items-start gap-2.5 text-amber-950">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-bold">{HEALTH_STATE_INFO.unhealthy.titleAr}</h2>
            <p className="text-xs leading-relaxed text-amber-900">
              {HEALTH_STATE_INFO.unhealthy.noteAr}
            </p>
          </div>
        </aside>
      );
    }
    return null;
  }

  // 4. Explore / Trace Part Inspector Card
  const oxygenState = station ? station.oxygenState : activePart.oxygenState;
  const { bgClass, Icon } = getOxygenVisuals(oxygenState);

  const handleSpeak = () => {
    const arText = station ? `${station.titleAr}` : activePart.titleAr;
    const frText = station ? `${station.titleFr}` : activePart.titleFr;
    audioEngine.speakBilingual(arText, frText, (nextState) => {
      setSpeechState(nextState);
    });
  };

  return (
    <aside
      aria-label="بطاقة المعلومات العلمية"
      className="pointer-events-auto fixed top-16 right-4 z-10 w-[min(340px,calc(100vw-2rem))] bg-white/95 border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>{station ? `المحطة ${station.step}` : activePart.circuitLabelAr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-latin" dir="ltr">
              {activePart.circuitLabelFr}
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {station ? station.titleAr : activePart.titleAr}
          </h2>

          <p className="font-latin text-xs font-semibold text-teal-800" dir="ltr">
            {station ? station.titleFr : activePart.titleFr}
          </p>
        </div>

        {mode === 'explore' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البطاقة"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${bgClass}`}>
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{station ? station.gasExchangeAr : activePart.oxygenLabelAr}</span>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">
        {station ? station.actionAr : activePart.descriptionAr}
      </p>

      <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
        {activePart.keyFactAr}
      </p>

      {!isHealthy && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{HEALTH_STATE_INFO.unhealthy.noteAr}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSpeak}
        className="inline-flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
      >
        <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>
          {speechState === 'speaking-ar'
            ? 'جارٍ النطق بالعربية...'
            : speechState === 'speaking-fr'
              ? 'Prononciation en français...'
              : 'استمع للنطق (عربي / فرنسي)'}
        </span>
      </button>

      {speechState === 'unsupported' && (
        <p className="text-xs text-amber-700">
          النطق الصوتي غير مدعوم في هذا المتصفح، يمكنك قراءة المصطلح أعلاه.
        </p>
      )}
    </aside>
  );
}
