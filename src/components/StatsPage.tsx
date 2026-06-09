import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { BarChart2, Target, BookOpen, Clock, Pencil, Check, X } from 'lucide-react';
import { DocumentBook } from '../types';

interface StatsPageProps {
  recentBooks: DocumentBook[];
  listeningMinutesToday: number;
  dailyGoalMinutes: number;
  onUpdateDailyGoal: (goal: number) => void;
  theme: string;
}

interface DayData {
  label: string;
  val: number;
  isToday: boolean;
}

function _todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekData(): DayData[] {
  const data: DayData[] = [];
  const DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `speechify_day_${d.toISOString().slice(0, 10)}`;
    const val = parseFloat(localStorage.getItem(key) || '0');
    data.push({ label: DAY_LABELS[d.getDay()], val, isToday: i === 0 });
  }
  return data;
}

function getBookDurationMinutes(book: DocumentBook): number {
  // Estimation rapide : total mots / 200 mots/min
  let totalWords = 0;
  book.chapters.forEach(c => {
    totalWords += c.wordCount || c.content?.split(/\s+/).filter(Boolean).length || 0;
  });
  if (book.type === 'pdf') return Math.max(5, book.chapters.length * 3);
  return Math.max(5, Math.ceil(totalWords / 200));
}

const TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  epub: '📚',
  web: '🌐',
  sample: '✨',
};

export default function StatsPage({
  recentBooks,
  listeningMinutesToday,
  dailyGoalMinutes,
  onUpdateDailyGoal,
  theme,
}: StatsPageProps) {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [barsVisible, setBarsVisible] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoalMinutes);

  const isDark = theme === 'dark';

  const goalPct = Math.min(100, Math.round((listeningMinutesToday / dailyGoalMinutes) * 100));
  const totalLibMin = recentBooks.reduce((acc, b) => acc + getBookDurationMinutes(b), 0);

  // Calcule la progression de chaque livre (% paragraphe courant / total)
  const getBookProgress = useCallback((book: DocumentBook): number => {
    if (book.progressPercent !== undefined) return Math.round(book.progressPercent);
    const totalChapters = book.chapters.length;
    if (!totalChapters) return 0;
    const totalParagraphs = book.chapters.reduce((s, c) => s + (c.paragraphs?.length || 0), 0);
    if (!totalParagraphs) return 0;
    const done =
      book.chapters
        .slice(0, book.currentChapterIndex)
        .reduce((s, c) => s + (c.paragraphs?.length || 0), 0) +
      (book.currentParagraphIndex || 0);
    return Math.min(100, Math.round((done / totalParagraphs) * 100));
  }, []);

  useEffect(() => {
    setWeekData(getWeekData());
    // Légère temporisation pour l'animation d'entrée
    const t = setTimeout(() => setBarsVisible(true), 120);
    return () => clearTimeout(t);
  }, [listeningMinutesToday]);

  const maxVal = Math.max(...weekData.map(d => d.val), 1);

  const handleSaveGoal = () => {
    const parsed = Math.max(1, Math.min(480, tempGoal));
    onUpdateDailyGoal(parsed);
    setIsEditingGoal(false);
  };

  return (
    <div
      className={`w-full min-h-full p-4 sm:p-6 pb-28 overflow-y-auto space-y-4 font-sans transition-all duration-300 ${
        isDark ? 'bg-[#0a0a09] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
      }`}
    >
      {/* Header */}
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-stone-900' : 'bg-stone-100'}`}>
            <BarChart2 className="w-5 h-5 text-[#646cff]" />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Statistiques
            </h2>
            <p className="text-xs text-stone-400 font-medium">Votre progression d'écoute</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-4">

        {/* ── Carte : Aujourd'hui ── */}
        <div className={`rounded-[20px] border p-5 ${
          isDark ? 'bg-[#131212] border-stone-900' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center gap-1.5 mb-4">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">⏱ Aujourd'hui</span>
          </div>

          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-4xl font-black text-[#646cff] leading-none tracking-tight">
                {listeningMinutesToday.toFixed(1)}
                <span className="text-xl ml-1 font-bold text-stone-400">min</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">sur {dailyGoalMinutes} min d'objectif</p>
            </div>
            <span className="text-2xl font-black text-[#646cff]">{goalPct}%</span>
          </div>

          {/* Barre de progression objectif */}
          <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-100'}`}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #646cff, #a78bfa)' }}
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {/* Modifier objectif */}
          <div className="flex justify-end mt-3">
            {isEditingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempGoal}
                  onChange={e => setTempGoal(parseInt(e.target.value) || 1)}
                  min={1}
                  max={480}
                  className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none focus:border-[#646cff] ${
                    isDark
                      ? 'bg-stone-900 border-stone-700 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-900'
                  }`}
                />
                <button
                  onClick={handleSaveGoal}
                  className="p-1.5 bg-[#646cff] hover:bg-[#525aff] text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingGoal(false)}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'text-stone-400 hover:text-white' : 'text-stone-400 hover:text-stone-700'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempGoal(dailyGoalMinutes); setIsEditingGoal(true); }}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#646cff] hover:text-[#525aff] cursor-pointer transition-colors"
              >
                <Pencil className="w-3 h-3" />
                <span>objectif : {dailyGoalMinutes} min</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Grille : Totaux ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Documents */}
          <div className={`rounded-[20px] border p-4 ${
            isDark ? 'bg-[#131212] border-stone-900' : 'bg-white border-stone-200'
          }`}>
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">📚 Documents</span>
            </div>
            <p className="text-3xl font-black text-[#646cff] leading-none tracking-tight">
              {recentBooks.length}
            </p>
            <p className="text-[10px] text-stone-400 mt-1.5">dans la bibliothèque</p>
          </div>

          {/* Total écouté */}
          <div className={`rounded-[20px] border p-4 ${
            isDark ? 'bg-[#131212] border-stone-900' : 'bg-white border-stone-200'
          }`}>
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">🎧 Total</span>
            </div>
            <p className="text-3xl font-black text-[#646cff] leading-none tracking-tight">
              {totalLibMin}
            </p>
            <p className="text-[10px] text-stone-400 mt-1.5">minutes estimées</p>
          </div>
        </div>

        {/* ── Graphique semaine ── */}
        <div className={`rounded-[20px] border p-5 ${
          isDark ? 'bg-[#131212] border-stone-900' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">📅 Cette semaine</span>
          </div>

          <div className="flex items-end gap-2 h-[90px]">
            {weekData.map((day, i) => {
              const heightPct = barsVisible
                ? Math.max(4, Math.round((day.val / maxVal) * 72))
                : 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {/* Valeur au-dessus */}
                  <span className="text-[9px] font-bold text-stone-400 min-h-[12px]">
                    {day.val > 0 ? day.val.toFixed(1) : ''}
                  </span>
                  {/* Barre */}
                  <motion.div
                    className={`w-full rounded-t-[4px] ${
                      day.isToday
                        ? 'bg-[#646cff] shadow-[0_0_12px_rgba(100,108,255,0.4)]'
                        : isDark
                          ? 'bg-stone-800'
                          : 'bg-stone-200'
                    }`}
                    style={{ minHeight: 4 }}
                    initial={{ height: 4 }}
                    animate={{ height: heightPct }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                    title={`${day.val.toFixed(1)} min`}
                  />
                  {/* Label jour */}
                  <span className={`text-[10px] font-bold ${
                    day.isToday ? 'text-[#646cff]' : 'text-stone-400'
                  }`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progression par document ── */}
        <div className={`rounded-[20px] border p-5 ${
          isDark ? 'bg-[#131212] border-stone-900' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
              📄 Progression par document
            </span>
          </div>

          {recentBooks.length === 0 ? (
            <p className="text-[11px] text-stone-400 text-center py-4">Aucun document.</p>
          ) : (
            <div className="space-y-3">
              {recentBooks.map(book => {
                const progress = getBookProgress(book);
                const icon = TYPE_ICONS[book.type] || '📄';
                const duration = getBookDurationMinutes(book);
                return (
                  <div
                    key={book.id}
                    className={`flex items-center gap-3 py-3 border-b last:border-b-0 ${
                      isDark ? 'border-stone-900' : 'border-stone-100'
                    }`}
                  >
                    {/* Icône type */}
                    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-base ${
                      isDark ? 'bg-stone-900' : 'bg-stone-100'
                    }`}>
                      {icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-stone-900'}`}>
                        {book.title}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {book.type.toUpperCase()} · {duration} min
                      </p>
                      {/* Mini barre progression */}
                      <div className={`h-1.5 rounded-full mt-1.5 overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-200'}`}>
                        <motion.div
                          className="h-full bg-[#646cff] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    {/* % */}
                    <span className="text-xs font-black text-[#646cff] flex-shrink-0 min-w-[32px] text-right">
                      {progress}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
