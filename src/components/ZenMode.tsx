/**
 * ZenMode — Mode téléprompteur plein écran
 * Porté depuis la PWA speechify-pwa, adapté à l'architecture React par phrase.
 *
 * Gestes tactiles :
 *  - Swipe ← / →  : phrase précédente / suivante
 *  - Swipe ↑      : fermer le mode Zen
 *  - Double-tap   : play / pause
 *  - Tap sur phrase : positionner la lecture
 */

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { splitIntoSentences } from '../utils/textUtils';

interface ZenModeProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  paragraphs: string[];
  currentParagraphIdx: number;
  currentSentenceIdx: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onLocationSelect: (paragraphIdx: number, sentenceIdx: number) => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
}

export default function ZenMode({
  isOpen,
  onClose,
  bookTitle,
  paragraphs,
  currentParagraphIdx,
  currentSentenceIdx,
  isPlaying,
  onPlayPause,
  onLocationSelect,
  onPrevSentence,
  onNextSentence,
}: ZenModeProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef<number>(0);

  // ── Construire la liste plate de toutes les phrases du chapitre ──
  // Chaque entrée: { pIdx, sIdx, text }
  const flatSentences: { pIdx: number; sIdx: number; text: string }[] = [];
  paragraphs.forEach((para, pIdx) => {
    const sentences = splitIntoSentences(para);
    sentences.forEach((text, sIdx) => {
      flatSentences.push({ pIdx, sIdx, text });
    });
  });

  const activeFlatIdx = flatSentences.findIndex(
    s => s.pIdx === currentParagraphIdx && s.sIdx === currentSentenceIdx
  );
  const progressPct = flatSentences.length > 0
    ? Math.round(((activeFlatIdx + 1) / flatSentences.length) * 100)
    : 0;

  // ── Auto-scroll : centrer la phrase active ──
  useEffect(() => {
    if (!isOpen) return;
    const node = activeSentenceRef.current;
    const box = scrollRef.current;
    if (node && box) {
      const target = node.offsetTop - box.clientHeight / 2 + node.clientHeight / 2;
      box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }, [activeFlatIdx, isOpen]);

  // ── Bloquer le scroll body quand Zen actif ──
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // ── Touche Échap pour fermer ──
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); onPlayPause(); }
      if (e.key === 'ArrowLeft') onPrevSentence();
      if (e.key === 'ArrowRight') onNextSentence();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, onPlayPause, onPrevSentence, onNextSentence]);

  // ── Gestes tactiles ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    touchStart.current = null;

    const SWIPE_MIN = 60;   // px
    const SWIPE_MAX_TIME = 600; // ms

    // Swipe horizontal → navigation phrase
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < SWIPE_MAX_TIME) {
      if (dx > 0) onPrevSentence();
      else onNextSentence();
      return;
    }

    // Swipe vertical vers le haut → fermer
    if (dy < -SWIPE_MIN * 1.5 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < SWIPE_MAX_TIME) {
      onClose();
      return;
    }

    // Double-tap → play/pause
    const now = Date.now();
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (now - lastTap.current < 350) {
        onPlayPause();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  }, [onPrevSentence, onNextSentence, onClose, onPlayPause]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center px-6 select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Titre en haut */}
          <div className="absolute top-5 left-5 right-16 text-[11px] font-bold text-white/35 truncate">
            {bookTitle}
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/[.08] border border-white/[.15] text-white grid place-items-center hover:bg-white/[.16] transition-colors cursor-pointer z-10"
            title="Quitter le mode Zen (Échap ou swipe ↑)"
          >
            <X className="w-[18px] h-[18px]" />
          </button>

          {/* Zone téléprompteur */}
          <div
            ref={scrollRef}
            className="w-full max-w-[560px] overflow-y-auto overflow-x-hidden text-center relative
                       [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              height: 'calc(100vh - 180px)',
              fontSize: 'clamp(1.35rem, 4vw, 1.9rem)',
              lineHeight: 1.85,
              paddingBottom: 100,
              paddingTop: 60,
              maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
            }}
          >
            {flatSentences.map((s, i) => {
              const isActive = i === activeFlatIdx;
              const isRead = i < activeFlatIdx;
              return (
                <span
                  key={`${s.pIdx}-${s.sIdx}`}
                  ref={isActive ? activeSentenceRef : undefined}
                  onClick={() => onLocationSelect(s.pIdx, s.sIdx)}
                  className={`cursor-pointer rounded px-0.5 transition-colors duration-150 ${
                    isActive
                      ? 'text-white font-bold'
                      : isRead
                        ? 'text-white/[.18]'
                        : 'text-white/[.45]'
                  }`}
                  style={isActive ? {
                    textShadow: '0 0 40px rgba(100,108,255,.9), 0 0 80px rgba(100,108,255,.4)',
                  } : undefined}
                >
                  {s.text}{' '}
                </span>
              );
            })}
          </div>

          {/* Contrôles en bas */}
          <div className="absolute bottom-10 flex items-center gap-4">
            <button
              onClick={onPrevSentence}
              className="flex flex-col items-center gap-1 bg-white/[.06] border border-white/[.12] text-white/70 rounded-xl px-4 py-2.5 text-[11px] font-bold hover:bg-white/[.12] hover:text-white transition-all cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
              Préc.
            </button>

            <button
              onClick={onPlayPause}
              className="flex flex-col items-center gap-1 bg-[#646cff] text-white rounded-xl px-7 py-3 text-[11px] font-bold hover:bg-[#535bf2] transition-all cursor-pointer shadow-[0_4px_20px_rgba(100,108,255,.4)]"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isPlaying ? 'Pause' : 'Lecture'}
            </button>

            <button
              onClick={onNextSentence}
              className="flex flex-col items-center gap-1 bg-white/[.06] border border-white/[.12] text-white/70 rounded-xl px-4 py-2.5 text-[11px] font-bold hover:bg-white/[.12] hover:text-white transition-all cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
              Suiv.
            </button>
          </div>

          {/* Barre de progression */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[.08]">
            <motion.div
              className="h-full bg-[#646cff] rounded-r"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Hint gestes (disparaît après 4s) */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 4, duration: 1 }}
            className="absolute bottom-28 text-[10px] text-white/30 font-medium pointer-events-none text-center"
          >
            ← → naviguer · double-tap lecture · swipe ↑ quitter
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
