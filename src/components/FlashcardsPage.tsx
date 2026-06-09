import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Trash2, RotateCcw, ChevronLeft, ChevronRight, Check, Volume2, Trophy, BookOpen, Sparkles } from 'lucide-react';
import { Flashcard } from '../types';

interface FlashcardsPageProps {
  flashcards: Flashcard[];
  onDelete: (id: string) => void;
  onUpdate: (card: Flashcard) => void;
}

type ViewMode = 'list' | 'review';

export default function FlashcardsPage({ flashcards, onDelete, onUpdate }: FlashcardsPageProps) {
  const [mode, setMode] = useState<ViewMode>('list');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'mastered'>('all');

  const filtered = flashcards.filter(c =>
    filter === 'all' ? true : filter === 'mastered' ? c.mastered : !c.mastered
  );
  const pendingCount = flashcards.filter(c => !c.mastered).length;
  const masteredCount = flashcards.filter(c => c.mastered).length;

  const currentCard = filtered[reviewIdx];

  const handleFlip = () => setFlipped(f => !f);

  const handleMastered = (card: Flashcard, mastered: boolean) => {
    onUpdate({ ...card, mastered, reviewCount: card.reviewCount + 1, lastReviewedAt: Date.now() });
    setFlipped(false);
    setTimeout(() => setReviewIdx(i => Math.min(i, filtered.length - 2)), 50);
  };

  const handlePronounce = (word: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = lang.startsWith('fr') ? 'fr-FR' : 'en-US';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  // Reset review index when filter changes
  useEffect(() => { setReviewIdx(0); setFlipped(false); }, [filter]);

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 gap-4">
        <Brain className="w-16 h-16 text-stone-700" />
        <h3 className="text-lg font-black text-stone-400">Aucune flashcard</h3>
        <p className="text-sm text-stone-600 max-w-xs">
          Double-cliquez sur un mot pendant la lecture, puis cliquez sur <strong className="text-amber-400">💾 Sauvegarder</strong> dans le dictionnaire pour créer votre premier deck.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Stats header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-stone-900/60 border border-stone-800 rounded-2xl p-3">
          <Brain className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-xs font-black text-stone-200">{flashcards.length} carte{flashcards.length > 1 ? 's' : ''}</p>
            <p className="text-[10px] text-stone-500">{pendingCount} à revoir · {masteredCount} maîtrisées</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => { setMode('review'); setFilter('pending'); setReviewIdx(0); setFlipped(false); }}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Réviser ({pendingCount})
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['list', 'review'] as ViewMode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setReviewIdx(0); setFlipped(false); }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${mode === m ? 'bg-stone-700 text-white' : 'bg-stone-900/40 text-stone-500 hover:text-stone-300'}`}>
            {m === 'list' ? '📋 Liste' : '🧠 Révision'}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['all', 'pending', 'mastered'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] font-black rounded-full transition-all cursor-pointer ${filter === f ? 'bg-indigo-600 text-white' : 'bg-stone-900 text-stone-500 hover:text-stone-300 border border-stone-800'}`}>
            {f === 'all' ? `Tout (${flashcards.length})` : f === 'pending' ? `À revoir (${pendingCount})` : `Maîtrisées (${masteredCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'list' ? (
          <div className="space-y-2">
            {filtered.map(card => (
              <motion.div key={card.id} layout
                className={`bg-stone-900/60 border rounded-2xl p-3 flex items-start gap-3 ${card.mastered ? 'border-green-900/40' : 'border-stone-800'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-amber-400 capitalize">{card.word}</span>
                    <span className="text-[9px] text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded-full font-mono">{card.partOfSpeech}</span>
                    {card.mastered && <Trophy className="w-3 h-3 text-green-400" />}
                  </div>
                  <p className="text-xs text-stone-300 line-clamp-2">{card.definition}</p>
                  {card.sourceBookTitle && (
                    <p className="text-[10px] text-stone-600 mt-1 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" />{card.sourceBookTitle}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handlePronounce(card.word, card.language)}
                    className="p-1.5 text-stone-500 hover:text-amber-400 transition-colors cursor-pointer">
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(card.id)}
                    className="p-1.5 text-stone-600 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-stone-600 py-8">Aucune carte dans ce filtre.</p>
            )}
          </div>
        ) : (
          /* Mode révision */
          <div className="flex flex-col items-center gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <Trophy className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="font-black text-stone-300">Toutes maîtrisées !</p>
                <button onClick={() => setFilter('all')} className="mt-3 text-xs text-indigo-400 underline cursor-pointer">Revoir tout</button>
              </div>
            ) : (
              <>
                <p className="text-xs text-stone-500">{reviewIdx + 1} / {filtered.length}</p>

                {/* Carte flip */}
                <div className="w-full cursor-pointer" onClick={handleFlip} style={{ perspective: '1000px' }}>
                  <motion.div
                    className="relative w-full"
                    style={{ transformStyle: 'preserve-3d', minHeight: '200px' }}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Recto (mot) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-stone-900 border border-indigo-800/40 rounded-3xl p-6 flex flex-col items-center justify-center gap-3"
                      style={{ backfaceVisibility: 'hidden' }}>
                      <span className="text-3xl font-black text-amber-400 capitalize">{currentCard?.word}</span>
                      <span className="text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded-full">{currentCard?.partOfSpeech}</span>
                      <p className="text-[11px] text-stone-600 mt-2">Appuyez pour révéler la définition</p>
                    </div>
                    {/* Verso (définition) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-indigo-900/20 border border-stone-800 rounded-3xl p-6 flex flex-col items-start justify-center gap-3"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <p className="text-sm font-bold text-stone-200 leading-relaxed">{currentCard?.definition}</p>
                      {currentCard?.example && (
                        <p className="text-xs text-stone-500 italic border-l-2 border-indigo-600 pl-2">"{currentCard.example}"</p>
                      )}
                      {currentCard?.synonyms?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentCard.synonyms.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Actions révision */}
                <AnimatePresence>
                  {flipped && currentCard && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 w-full">
                      <button onClick={() => handleMastered(currentCard, false)}
                        className="flex-1 py-3 bg-stone-800 border border-stone-700 text-stone-300 font-black text-sm rounded-2xl hover:bg-red-900/30 hover:border-red-800 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center gap-2">
                        <RotateCcw className="w-4 h-4" />À revoir
                      </button>
                      <button onClick={() => handleMastered(currentCard, true)}
                        className="flex-1 py-3 bg-green-700/30 border border-green-700/50 text-green-300 font-black text-sm rounded-2xl hover:bg-green-600/40 transition-all cursor-pointer flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />Maîtrisée !
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center gap-4">
                  <button onClick={() => { setReviewIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
                    disabled={reviewIdx === 0}
                    className="p-2 text-stone-500 hover:text-white disabled:opacity-30 cursor-pointer transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => handlePronounce(currentCard?.word, currentCard?.language)}
                    className="p-2 text-amber-500 hover:text-amber-300 cursor-pointer transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setReviewIdx(i => Math.min(filtered.length - 1, i + 1)); setFlipped(false); }}
                    disabled={reviewIdx >= filtered.length - 1}
                    className="p-2 text-stone-500 hover:text-white disabled:opacity-30 cursor-pointer transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
