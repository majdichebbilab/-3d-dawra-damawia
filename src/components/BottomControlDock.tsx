import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gauge,
  HeartPulse,
  Layers,
  RotateCcw,
  ShieldAlert,
  Tag,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CircuitFilter, TRACE_STATIONS } from '../data/circulatoryData';
import EcgWaveform from './EcgWaveform';
import { AppMode } from './TopBar';

interface BottomControlDockProps {
  mode: AppMode;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeCircuit: CircuitFilter;
  onCircuitChange: (circuit: CircuitFilter) => void;
  isCutaway: boolean;
  onToggleCutaway: () => void;
  showBodyShell: boolean;
  onToggleBodyShell: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  isHealthy: boolean;
  onToggleHealthy: () => void;
  slowMotion: boolean;
  onToggleSlowMotion: () => void;
  cardiacStage: 'atrial' | 'ventricular' | 'diastole';
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetView: () => void;
  traceStepIndex: number;
  onTraceStepChange: (index: number) => void;
}

const ACTIVITY_PRESETS = [
  { label: 'نوم', bpm: 60 },
  { label: 'راحة', bpm: 75 },
  { label: 'مشي', bpm: 100 },
  { label: 'جري', bpm: 145 },
];

export default function BottomControlDock({
  mode,
  isCollapsed,
  onToggleCollapse,
  activeCircuit,
  onCircuitChange,
  isCutaway,
  onToggleCutaway,
  showBodyShell,
  onToggleBodyShell,
  showLabels,
  onToggleLabels,
  isHealthy,
  onToggleHealthy,
  slowMotion,
  onToggleSlowMotion,
  cardiacStage,
  bpm,
  onBpmChange,
  isMuted,
  onToggleMute,
  onResetView,
  traceStepIndex,
  onTraceStepChange,
}: BottomControlDockProps) {
  const currentStation = TRACE_STATIONS[traceStepIndex];
  const isMacro = mode !== 'alveolus' && mode !== 'capillary';
  const stageLabelAr =
    cardiacStage === 'atrial'
      ? 'انقباض الأذينين'
      : cardiacStage === 'ventricular'
        ? 'انقباض البطينين'
        : 'استراحة القلب';

  return (
    <div
      className={`pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
      style={{ width: 'min(980px, 96vw)' }}
    >
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-white border border-b-0 border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 shadow-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إظهار أدوات التحكم (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إخفاء الأدوات (H)</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      <div className="pointer-events-auto w-full bg-white/95 border border-slate-200 rounded-2xl shadow-lg px-4 py-2.5 flex flex-col gap-2.5">
        {/* Trace Stepper Row (visible in Trace mode) */}
        {mode === 'trace' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onTraceStepChange((traceStepIndex - 1 + TRACE_STATIONS.length) % TRACE_STATIONS.length)
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
                <span>المحطة السابقة</span>
              </button>

              <span className="px-2 py-1 text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">
                المحطة {currentStation.step} من {TRACE_STATIONS.length}
              </span>

              <button
                type="button"
                onClick={() => onTraceStepChange((traceStepIndex + 1) % TRACE_STATIONS.length)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>المحطة التالية</span>
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="font-bold text-slate-900">{currentStation.titleAr}</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="font-latin text-slate-600" dir="ltr">
                {currentStation.titleFr}
              </span>
            </div>
          </div>
        )}

        {/* Row 1: Circuit Filter + Heart Rate + Presets + Live ECG */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {isMacro ? (
            <div
              role="group"
              aria-label="تصفية الدورة الدموية"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl"
            >
              <button
                type="button"
                onClick={() => onCircuitChange('both')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCircuit === 'both'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الدورتان
              </button>
              <button
                type="button"
                onClick={() => onCircuitChange('pulmonary')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCircuit === 'pulmonary'
                    ? 'bg-white text-[#580a16] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الصغرى
              </button>
              <button
                type="button"
                onClick={() => onCircuitChange('systemic')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCircuit === 'systemic'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكبرى
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold text-teal-800 whitespace-nowrap">
              {mode === 'alveolus'
                ? 'المجهر: السنخ الرئوي والشعيرة الدموية'
                : 'المجهر: الشعيرات الدموية وخلايا الأعضاء'}
            </span>
          )}

          {/* Heart Rate Slider + Activity Presets + Live ECG */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {ACTIVITY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onBpmChange(preset.bpm)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    Math.abs(bpm - preset.bpm) <= 4
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <label
                htmlFor="bpm-slider"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
              </label>
              <input
                id="bpm-slider"
                type="range"
                min={60}
                max={150}
                step={2}
                value={bpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="w-20 sm:w-24 accent-teal-700 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 tabular-nums whitespace-nowrap">
                {bpm} ن/د
              </span>
            </div>

            <EcgWaveform bpm={bpm} isHealthy={isHealthy} slowMotion={slowMotion} />
            {isMacro && (
              <span className="hidden lg:inline-block min-w-[92px] text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 text-center whitespace-nowrap">
                {stageLabelAr}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: View Toggles, Health Prevention Switch, Audio & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {isMacro && (
              <>
                <button
                  type="button"
                  onClick={onToggleBodyShell}
                  aria-pressed={showBodyShell}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showBodyShell
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>هيكل الجسم</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleCutaway}
                  aria-pressed={isCutaway}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isCutaway
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>مقطع القلب</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleLabels}
                  aria-pressed={showLabels}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showLabels
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>التسميات</span>
                </button>
              </>
            )}

            {/* Health & Prevention Mode Toggle */}
            <button
              type="button"
              onClick={onToggleHealthy}
              aria-pressed={!isHealthy}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isHealthy
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-amber-50 border-amber-500 text-amber-900'
              }`}
            >
              {isHealthy ? (
                <>
                  <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>حالة سليمة (رياضة)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>تأثير التدخين والدهون</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleSlowMotion}
              aria-pressed={slowMotion}
              title="إبطاء حركة القلب والصمامات لملاحظة الفتح والإغلاق"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                slowMotion
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
              <span>حركة بطيئة 0.3×</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMute}
              aria-pressed={!isMuted}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isMuted
                  ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>تشغيل النبض</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                  <span>النبض مفعّل</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetView}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="إعادة ضبط زاوية المشاهدة"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>إعادة الضبط</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
