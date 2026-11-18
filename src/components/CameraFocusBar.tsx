import { Brain, GitFork, Heart, RotateCw, User, Wind } from 'lucide-react';

export type CameraPresetId = 'full_body' | 'heart' | 'lungs' | 'brain' | 'limbs';

export interface CameraPreset {
  id: CameraPresetId;
  labelAr: string;
  titleAr: string;
  position: [number, number, number];
  target: [number, number, number];
  Icon: typeof User;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'full_body',
    labelAr: 'الجسم كامل',
    titleAr: 'عرض كامل للجسم من الرأس إلى القدمين',
    position: [0.0, -0.65, 17.8],
    target: [0.0, -0.85, 0.0],
    Icon: User,
  },
  {
    id: 'heart',
    labelAr: 'القلب',
    titleAr: 'تقريب على القلب والحجرات الأربع',
    position: [0.22, 0.72, 4.35],
    target: [0.08, 0.38, 0.22],
    Icon: Heart,
  },
  {
    id: 'lungs',
    labelAr: 'الرئتان',
    titleAr: 'تقريب على الرئتين والشبكة التنفسية',
    position: [0.0, 1.75, 6.1],
    target: [0.0, 1.35, -0.1],
    Icon: Wind,
  },
  {
    id: 'brain',
    labelAr: 'الدماغ',
    titleAr: 'تقريب على الدماغ وأوعية الرأس والرقبة',
    position: [0.0, 4.1, 5.2],
    target: [0.0, 3.65, -0.14],
    Icon: Brain,
  },
  {
    id: 'limbs',
    labelAr: 'الأعضاء والأطراف',
    titleAr: 'تقريب على الكليتين والأطراف السفلية',
    position: [0.0, -2.15, 11.2],
    target: [0.0, -2.55, 0.0],
    Icon: GitFork,
  },
];

interface CameraFocusBarProps {
  visible: boolean;
  hideOnMobile?: boolean;
  activePreset: CameraPresetId | null;
  autoRotate: boolean;
  onSelectPreset: (preset: CameraPreset) => void;
  onToggleAutoRotate: () => void;
}

export default function CameraFocusBar({
  visible,
  hideOnMobile = false,
  activePreset,
  autoRotate,
  onSelectPreset,
  onToggleAutoRotate,
}: CameraFocusBarProps) {
  if (!visible) return null;

  return (
    <nav
      aria-label="شريط التركيز السريع للكاميرا"
      className={`pointer-events-auto fixed top-16 sm:top-24 left-4 z-10 bg-white/95 border border-slate-200 rounded-2xl shadow-md p-1.5 flex-col gap-1 ${
        hideOnMobile ? 'hidden sm:flex' : 'flex'
      }`}
    >
      <span className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-slate-500 border-b border-slate-100 whitespace-nowrap">
        زوايا الكاميرا
      </span>

      {CAMERA_PRESETS.map((preset) => {
        const isActive = activePreset === preset.id;
        const Icon = preset.Icon;
        return (
          <button
            key={preset.id}
            type="button"
            title={preset.titleAr}
            onClick={() => onSelectPreset(preset)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-700 ${
              isActive
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{preset.labelAr}</span>
          </button>
        );
      })}

      <div className="border-t border-slate-100 pt-1 mt-0.5">
        <button
          type="button"
          title="تدوير تلقائي للمجسم"
          onClick={onToggleAutoRotate}
          aria-pressed={autoRotate}
          className={`w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-700 ${
            autoRotate
              ? 'bg-amber-50 border border-amber-300 text-amber-900'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>دوران تلقائي</span>
        </button>
      </div>
    </nav>
  );
}
