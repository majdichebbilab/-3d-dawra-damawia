import { CheckCircle2, RotateCcw, Trophy, Volume2, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { OWNER_FB_PAGE_NAME, OWNER_FB_URL, OWNER_LOGO_URL } from '../data/branding';
import { QUIZ_QUESTIONS } from '../data/circulatoryData';
import { audioEngine } from '../utils/audioEngine';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuizModal({ isOpen, onClose }: QuizModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const question = QUIZ_QUESTIONS[currentIdx];
  const isAnswered = selectedOptionId !== null;
  const isCorrect = selectedOptionId === question.correctOptionId;

  const handleSelectOption = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
    if (optionId === question.correctOptionId) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptionId(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setScore(0);
    setIsFinished(false);
  };

  const handleSpeakQuestion = () => {
    audioEngine.speakBilingual(question.questionAr, question.questionFrHint);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-teal-700">
              اختبار التقييم الذاتي · للسنة السادسة
            </span>
            <h2 id="quiz-dialog-title" className="text-lg font-bold text-slate-900">
              {isFinished ? 'نتيجة الاختبار' : `السؤال ${currentIdx + 1} من ${QUIZ_QUESTIONS.length}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الاختبار"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {!isFinished ? (
          <div className="p-6 flex flex-col gap-4">
            {/* Progress Track */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all duration-300"
                style={{
                  width: `${((currentIdx + (isAnswered ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100}%`,
                }}
              />
            </div>

            {/* Question + French Hint + Speak */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-base font-bold text-slate-900 leading-relaxed">
                  {question.questionAr}
                </p>
                <p className="font-latin text-xs text-slate-500" dir="ltr">
                  {question.questionFrHint}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSpeakQuestion}
                title="استمع للسؤال"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2.5">
              {question.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isRightOption = opt.id === question.correctOptionId;

                let btnStyle =
                  'bg-white border-slate-200 text-slate-800 hover:border-teal-600 hover:bg-slate-50';
                if (isAnswered) {
                  if (isRightOption) {
                    btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900';
                  } else if (isSelected && !isRightOption) {
                    btnStyle = 'bg-red-50 border-red-400 text-red-900';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200 text-slate-400';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold">{opt.textAr}</span>
                      <span className="font-latin text-xs opacity-80" dir="ltr">
                        {opt.textFr}
                      </span>
                    </div>

                    {isAnswered && isRightOption && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    )}
                    {isAnswered && isSelected && !isRightOption && (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Immediate Constructive Explanation */}
            {isAnswered && (
              <div
                className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <p className="font-bold mb-1">
                  {isCorrect ? 'إجابة صحيحة! أحسنت.' : 'إجابة غير دقيقة — لنتذكر القاعدة:'}
                </p>
                <p className="text-xs leading-relaxed">{question.explanationAr}</p>
              </div>
            )}

            {/* Next Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={!isAnswered}
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {currentIdx + 1 < QUIZ_QUESTIONS.length ? 'السؤال التالي' : 'عرض النتيجة النهائية'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={OWNER_LOGO_URL}
                alt={`شعار ${OWNER_FB_PAGE_NAME}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-red-600/85 shadow-sm"
              />
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Trophy className="w-7 h-7" aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {score} / {QUIZ_QUESTIONS.length}
              </p>
              <p className="text-sm text-slate-600 max-w-sm">
                {score >= 6
                  ? 'ممتاز! أنت تتقن مسار الدورة الدموية الصغرى والكبرى بشكل رائع.'
                  : score >= 4
                    ? 'عمل جيد! جرّب تتبع مسار قطرة الدم في المجسم لمراجعة النقاط المتبقية.'
                    : 'بداية طيبة! استكشف القلب والرئتين في المجسم ثم أعد المحاولة.'}
              </p>
            </div>

            <a
              href={OWNER_FB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#1877F2] text-xs font-bold transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
              </svg>
              <span>تابع صفحة {OWNER_FB_PAGE_NAME} على فيسبوك</span>
            </a>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>إعادة الاختبار</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                العودة إلى المجسم
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
