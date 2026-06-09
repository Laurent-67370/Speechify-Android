import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { BarChart2, Target, BookOpen, Clock, Pencil, Check, X, TrendingUp, Award } from 'lucide-react';
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
  const DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `speechify_day_${d.toISOString().slice(0, 10)}`;
    return {
      label: DAY_LABELS[d.getDay()],
      val: parseFloat(localStorage.getItem(key) || '0'),
      isToday: i === 6,
    };
  });
}

function getWeekTotal(data: DayData[]): number {
  return parseFloat(data.reduce((s, d) => s + d.val, 0).toFixed(1));
}

function getStreak(data: DayData[]): number {
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].val > 0) streak++;
    else break;
  }
  return streak;
}

function getBookProgress(book: DocumentBook): number {
  if (book.progressPercent !== undefined) return Math.round(book.progressPercent);
  const totalParagraphs = book.chapters.reduce((s, c) => s + (c.paragraphs?.length || 0), 0);
  if (!totalParagraphs) return 0;
  const done = book.chapters.slice(0, book.currentChapterIndex)
    .reduce((s, c) => s + (c.paragraphs?.length || 0), 0) + (book.currentParagraphIndex || 0);
  return Math.min(100, Math.round((done / totalParagraphs) * 100));
}

function getBookDuration(book: DocumentBook): number {
  let totalWords = 0;
  book.chapters.forEach(c => {
    totalWords += c.wordCount || c.content?.split(/\s+/).filter(Boolean).length || 0;
  });
  if (book.type === 'pdf') return Math.max(5, book.chapters.length * 3);
  return Math.max(5, Math.ceil(totalWords / 200));
}

const TYPE_ICONS: Record<string, string> = { pdf: '📄', epub: '📚', web: '🌐', sample: '✨' };

export default function StatsPage({
  recentBooks, listeningMinutesToday, dailyGoalMinutes, onUpdateDailyGoal, theme,
}: StatsPageProps) {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [barsVisible, setBarsVisible] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoalMinutes);

  const isDark = theme === 'dark';
  const goalPct = Math.min(100, Math.round((listeningMinutesToday / dailyGoalMinutes) * 100));
  const weekTotal = getWeekTotal(weekData);
  const streak = getStreak(weekData);
  const totalLibMin = recentBooks.reduce((acc, b) => acc + getBookDuration(b), 0);

  useEffect(() => {
    const data = getWeekData();
    setWeekData(data);
    const t = setTimeout(() => setBarsVisible(true), 150);
    return () => clearTimeout(t);
  }, [listeningMinutesToday]);

  const maxVal = Math.max(...weekData.map(d => d.val), 1);

  const handleSaveGoal = () => {
    const parsed = Math.max(1, Math.min(480, tempGoal));
    onUpdateDailyGoal(parsed);
    setIsEditingGoal(false);
  };

  const base = isDark
    ? 'bg-[#0a0a09] text-stone-100'
    : 'bg-[#F9F8F6] text-[#2D2926]';
  const card = isDark
    ? 'bg-[#131212] border-stone-900'
    : 'bg-white border-stone-200/80 shadow-sm';

  return (
    <div className={`w-full min-h-full overflow-y-auto pb-28 ${base}`}>
      {/* ── Header ── */}
      <div className={`sticky top-0 z-10 px-4 pt-5 pb-3 ${isDark ? 'bg-[#0a0a09]' : 'bg-[#F9F8F6]'}`}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-[#646cff]/10' : 'bg-[#646cff]/10'}`}>
            <BarChart2 className="w-5 h-5 text-[#646cff]" />
          </div>
          <div>
            <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Statistiques
            </h2>
            <p className="text-[11px] text-stone-400 font-medium">Votre progression d'écoute</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">

        {/* ── Objectif du jour ── */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#646cff]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Aujourd'hui</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-[#646cff] leading-none">
                  {listeningMinutesToday.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-stone-400">min</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">objectif : {dailyGoalMinutes} min</p>
            </div>
            {/* Cercle % */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke={isDark ? '#1e1e1d' : '#f1f0ee'} strokeWidth="6" />
                <motion.circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke="#646cff" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - goalPct / 100) }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-[#646cff]">{goalPct}%</span>
              </div>
            </div>
          </div>

          {/* Barre linéaire */}
          <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-stone-800' : 'bg-stone-100'}`}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#646cff,#a78bfa)' }}
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {/* Modifier objectif */}
          <div className="flex justify-end">
            {isEditingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" value={tempGoal}
                  onChange={e => setTempGoal(parseInt(e.target.value) || 1)}
                  min={1} max={480}
                  className={`w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none focus:border-[#646cff] ${
                    isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                  }`}
                />
                <button onClick={handleSaveGoal} className="p-1.5 bg-[#646cff] text-white rounded-lg cursor-pointer">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsEditingGoal(false)} className="p-1.5 text-stone-400 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempGoal(dailyGoalMinutes); setIsEditingGoal(true); }}
                className="flex items-center gap-1 text-[11px] font-bold text-[#646cff] cursor-pointer"
              >
                <Pencil className="w-3 h-3" /> Modifier l'objectif
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Cette semaine', value: `${weekTotal}`, unit: 'min' },
            { icon: <Award className="w-4 h-4" />, label: 'Série active', value: `${streak}`, unit: streak > 1 ? 'jours' : 'jour' },
            { icon: <BookOpen className="w-4 h-4" />, label: 'Bibliothèque', value: `${recentBooks.length}`, unit: 'livre' + (recentBooks.length > 1 ? 's' : '') },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl border p-3.5 flex flex-col gap-1 ${card}`}
            >
              <div className="text-[#646cff]">{kpi.icon}</div>
              <p className="text-2xl font-black text-[#646cff] leading-none">{kpi.value}</p>
              <p className="text-[10px] text-stone-400 font-medium leading-tight">{kpi.unit}</p>
              <p className="text-[9px] text-stone-500 font-medium">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Graphique semaine ── */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">📅 7 derniers jours</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isDark ? 'bg-[#646cff]/10 text-[#646cff]' : 'bg-[#646cff]/10 text-[#646cff]'
            }`}>{weekTotal} min total</span>
          </div>

          <div className="flex items-end gap-1.5" style={{ height: 80 }}>
            {weekData.map((day, i) => {
              const heightPx = barsVisible ? Math.max(4, Math.round((day.val / maxVal) * 64)) : 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[8px] font-bold transition-all ${day.val > 0 ? 'opacity-100' : 'opacity-0'} ${
                    day.isToday ? 'text-[#646cff]' : 'text-stone-400'
                  }`}>
                    {day.val > 0 ? day.val.toFixed(0) : ''}
                  </span>
                  <motion.div
                    className={`w-full rounded-t-md ${
                      day.isToday
                        ? 'bg-[#646cff] shadow-[0_0_10px_rgba(100,108,255,0.35)]'
                        : isDark ? 'bg-stone-800' : 'bg-stone-200'
                    }`}
                    style={{ minHeight: 4 }}
                    initial={{ height: 4 }}
                    animate={{ height: heightPx }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                  />
                  <span className={`text-[10px] font-bold ${day.isToday ? 'text-[#646cff]' : 'text-stone-400'}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progression par document ── */}
        {recentBooks.length > 0 && (
          <div className={`rounded-2xl border p-5 ${card}`}>
            <div className="flex items-center gap-1.5 mb-4">
              <Target className="w-3.5 h-3.5 text-[#646cff]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Progression par livre</span>
            </div>

            <div className="space-y-4">
              {recentBooks.map((book, i) => {
                const progress = getBookProgress(book);
                const duration = getBookDuration(book);
                return (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-base ${
                      isDark ? 'bg-stone-900' : 'bg-stone-100'
                    }`}>
                      {TYPE_ICONS[book.type] || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-bold truncate mr-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>
                          {book.title}
                        </p>
                        <span className="text-xs font-black text-[#646cff] flex-shrink-0">{progress}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-100'}`}>
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#646cff] to-[#a78bfa] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.06 }}
                        />
                      </div>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        {book.type.toUpperCase()} · {duration} min estimées
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Message vide ── */}
        {recentBooks.length === 0 && (
          <div className={`rounded-2xl border p-8 text-center ${card}`}>
            <p className="text-2xl mb-2">📚</p>
            <p className={`text-sm font-bold ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Aucun livre dans la bibliothèque
            </p>
            <p className="text-[11px] text-stone-500 mt-1">Importez un livre pour voir vos statistiques</p>
          </div>
        )}

      </div>
    </div>
  );
}
