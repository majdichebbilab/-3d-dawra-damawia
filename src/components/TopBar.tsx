import { ArrowUpDown, ClipboardCheck, Compass, Droplets, ExternalLink, Microscope, Route, Target } from 'lucide-react';
import { OWNER_FB_PAGE_NAME, OWNER_FB_URL, OWNER_LOGO_URL } from '../data/branding';

export type AppMode = 'explore' | 'trace' | 'alveolus' | 'capillary' | 'challenge';

interface TopBarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onOpenOrder: () => void;
  onOpenQuiz: () => void;
}

export default function TopBar({ mode, onModeChange, onOpenOrder, onOpenQuiz }: TopBarProps) {
  const navItems: { id: AppMode; label: string; Icon: typeof Compass }[] = [
    { id: 'explore', label: 'استكشاف', Icon: Compass },
    { id: 'trace', label: 'تتبع المسار', Icon: Route },
    { id: 'alveolus', label: 'السنخ الرئوي', Icon: Microscope },
    { id: 'capillary', label: 'شعيرات الأعضاء', Icon: Droplets },
    { id: 'challenge', label: 'التحدي', Icon: Target },
  ];

  return (
    <header className="pointer-events-auto w-full bg-white/95 border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 sm:gap-5">
      {/* Zone 1: User Logo + Brand Title + Facebook Page Name Link */}
      <div className="flex items-center gap-2.5 shrink-0">
        <a
          href={OWNER_FB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={`صفحة فيسبوك: ${OWNER_FB_PAGE_NAME}`}
          className="shrink-0 rounded-full overflow-hidden border-2 border-red-600/85 shadow-xs hover:scale-105 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877F2]"
        >
          <img
            src={OWNER_LOGO_URL}
            alt={`شعار ${OWNER_FB_PAGE_NAME}`}
            className="w-9 h-9 sm:w-10 sm:h-10 object-cover block"
          />
        </a>

        <div className="flex flex-col">
          <h1 className="text-xs sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap leading-tight">
            الدورة الدموية الصغرى والكبرى
          </h1>
          <a
            href={OWNER_FB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1877F2] hover:text-[#0d5bbd] transition-colors whitespace-nowrap w-fit mt-0.5"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
            </svg>
            <span className="hidden sm:inline">صفحة فيسبوك · {OWNER_FB_PAGE_NAME}</span>
            <span className="sm:hidden">{OWNER_FB_PAGE_NAME}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-75" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Zone 2: 5 Concise Single-Line Mode Links */}
      <nav aria-label="أوضاع التعلم" className="flex items-center gap-3 sm:gap-5 overflow-x-auto">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`inline-flex items-center gap-1.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
              mode === id
                ? 'text-teal-800 border-teal-700'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Zone 3: Sequence Game + Primary Quiz Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenOrder}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <ArrowUpDown className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline">رتّب المسار</span>
          <span className="md:hidden">ترتيب</span>
        </button>

        <button
          type="button"
          onClick={onOpenQuiz}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>اختبار قصير</span>
        </button>
      </div>
    </header>
  );
}
