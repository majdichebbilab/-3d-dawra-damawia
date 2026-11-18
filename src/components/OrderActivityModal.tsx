import { ArrowUpDown, CheckCircle2, RotateCcw, Sparkles, X, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

interface OrderActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SequenceItem {
  id: string;
  labelAr: string;
  labelFr: string;
  bloodHintAr: string;
}

const PULMONARY_SEQUENCE: SequenceItem[] = [
  {
    id: 'p1',
    labelAr: 'البطين الأيمن',
    labelFr: 'Ventricule droit',
    bloodHintAr: 'انطلاق الدم القاتم (CO₂)',
  },
  {
    id: 'p2',
    labelAr: 'الشريان الرئوي',
    labelFr: 'Artère pulmonaire',
    bloodHintAr: 'نحو الرئتين',
  },
  {
    id: 'p3',
    labelAr: 'الأسناخ الرئوية',
    labelFr: 'Alvéoles pulmonaires',
    bloodHintAr: 'طرح CO₂ وأخذ O₂',
  },
  {
    id: 'p4',
    labelAr: 'الأوردة الرئوية ← الأذين الأيسر',
    labelFr: 'Veines pulmonaires → Oreillette gauche',
    bloodHintAr: 'عودة الدم القاني (O₂)',
  },
];

const SYSTEMIC_SEQUENCE: SequenceItem[] = [
  {
    id: 's1',
    labelAr: 'البطين الأيسر',
    labelFr: 'Ventricule gauche',
    bloodHintAr: 'ضخ قوي للدم القاني (O₂)',
  },
  {
    id: 's2',
    labelAr: 'الشريان الأبهر',
    labelFr: "L'aorte",
    bloodHintAr: 'توزيع O₂ والمغذيات',
  },
  {
    id: 's3',
    labelAr: 'شعيرات الأعضاء والخلايا',
    labelFr: 'Capillaires des organes',
    bloodHintAr: 'تبادل غازي وغذائي خلوي',
  },
  {
    id: 's4',
    labelAr: 'الوريدان الأجوفان ← الأذين الأيمن',
    labelFr: 'Veines caves → Oreillette droite',
    bloodHintAr: 'عودة الدم القاتم (CO₂)',
  },
];

function deterministicShuffle(items: SequenceItem[], roundSeed: number): SequenceItem[] {
  const arr = [...items];
  // Guaranteed non-sorted permutation
  const swaps = [
    [0, 2],
    [1, 3],
    [0, 1],
  ];
  const offset = roundSeed % 3;
  for (let k = 0; k < swaps.length; k++) {
    const [a, b] = swaps[(k + offset) % swaps.length];
    const tmp = arr[a];
    arr[a] = arr[b];
    arr[b] = tmp;
  }
  return arr;
}

export default function OrderActivityModal({ isOpen, onClose }: OrderActivityModalProps) {
  const [circuitTab, setCircuitTab] = useState<'pulmonary' | 'systemic'>('pulmonary');
  const [roundSeed, setRoundSeed] = useState(0);
  const [placedIds, setPlacedIds] = useState<(string | null)[]>([null, null, null, null]);
  const [checked, setChecked] = useState(false);

  const targetList = circuitTab === 'pulmonary' ? PULMONARY_SEQUENCE : SYSTEMIC_SEQUENCE;

  const poolItems = useMemo(
    () => deterministicShuffle(targetList, roundSeed),
    [targetList, roundSeed],
  );

  if (!isOpen) return null;

  const handleSwitchCircuit = (next: 'pulmonary' | 'systemic') => {
    setCircuitTab(next);
    setPlacedIds([null, null, null, null]);
    setChecked(false);
    setRoundSeed((s) => s + 1);
  };

  const handlePickFromPool = (id: string) => {
    if (placedIds.includes(id)) return;
    const firstEmpty = placedIds.findIndex((x) => x === null);
    if (firstEmpty === -1) return;
    const next = [...placedIds];
    next[firstEmpty] = id;
    setPlacedIds(next);
    setChecked(false);
  };

  const handleRemoveSlot = (slotIdx: number) => {
    if (!placedIds[slotIdx]) return;
    const next = [...placedIds];
    next[slotIdx] = null;
    setPlacedIds(next);
    setChecked(false);
  };

  const handleReset = () => {
    setPlacedIds([null, null, null, null]);
    setChecked(false);
    setRoundSeed((s) => s + 1);
  };

  const allFilled = placedIds.every((x) => x !== null);
  const correctCount = placedIds.filter((id, idx) => id === targetList[idx].id).length;
  const isPerfect = checked && correctCount === targetList.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-teal-700" aria-hidden="true" />
            <div>
              <h2 id="order-modal-title" className="text-base font-bold text-slate-900">
                رتّب مراحل مسار الدم
              </h2>
              <p className="text-xs text-slate-600">
                اضغط على المحطات بالترتيب الصحيح من البداية إلى العودة للقلب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النشاط"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Circuit Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => handleSwitchCircuit('pulmonary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                circuitTab === 'pulmonary'
                  ? 'bg-white text-[#580a16] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الدورة الدموية الصغرى
            </button>
            <button
              type="button"
              onClick={() => handleSwitchCircuit('systemic')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                circuitTab === 'systemic'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الدورة الدموية الكبرى
            </button>
          </div>

          {/* 4 Ordered Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {targetList.map((targetItem, idx) => {
              const placedId = placedIds[idx];
              const placedItem = targetList.find((x) => x.id === placedId) ?? null;
              const isSlotCorrect = checked && placedId === targetItem.id;
              const isSlotWrong = checked && placedId !== null && placedId !== targetItem.id;

              return (
                <button
                  key={targetItem.id}
                  type="button"
                  onClick={() => handleRemoveSlot(idx)}
                  disabled={!placedItem}
                  className={`flex items-center justify-between gap-2 p-3 rounded-xl border-2 text-right transition-colors ${
                    isSlotCorrect
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                      : isSlotWrong
                        ? 'bg-amber-50 border-amber-400 text-amber-950'
                        : placedItem
                          ? 'bg-white border-teal-600 text-slate-900 hover:bg-slate-50 cursor-pointer'
                          : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-800 text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    {placedItem ? (
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">{placedItem.labelAr}</span>
                        <span className="font-latin text-[11px] text-slate-500 truncate" dir="ltr">
                          {placedItem.labelFr}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold">اختر المحطة رقم {idx + 1}</span>
                    )}
                  </div>

                  {isSlotCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  )}
                  {isSlotWrong && (
                    <XCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Available Scrambled Cards */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">المحطات المتاحة:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {poolItems.map((item) => {
                const isUsed = placedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isUsed}
                    onClick={() => handlePickFromPool(item.id)}
                    className={`p-3 rounded-xl border text-right transition-colors ${
                      isUsed
                        ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-slate-900 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{item.labelAr}</span>
                      <span className="text-[11px] text-slate-500">{item.bloodHintAr}</span>
                    </div>
                    <p className="font-latin text-[11px] text-slate-500 mt-0.5" dir="ltr">
                      {item.labelFr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {checked && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                isPerfect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isPerfect
                  ? 'ممتاز! رتبت جميع مراحل الدورة الدموية بنجاح (4 / 4).'
                  : `أصبت في ${correctCount} من 4 محطات — اضغط على البطاقة الخاطئة لإعادتها وتصحيح الترتيب.`}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>

          <button
            type="button"
            disabled={!allFilled}
            onClick={() => setChecked(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>تحقق من الترتيب</span>
          </button>
        </div>
      </div>
    </div>
  );
}
