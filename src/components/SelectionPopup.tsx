import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Copy, Check, Highlighter, BookOpen } from 'lucide-react';

interface SelectionPopupProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onJumpToSelection: (paragraphIdx: number, sentenceIdx: number) => void;
  paragraphs: string[];
  isPlaying: boolean;
  onAnnotate?: (selectedText: string, paragraphIdx: number) => void;
  onDefineWord?: (word: string, sentence: string) => void;
}

interface PopupPos { x: number; y: number; }

export default function SelectionPopup({
  containerRef,
  onJumpToSelection,
  paragraphs,
  isPlaying,
  onAnnotate,
  onDefineWord,
}: SelectionPopupProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<PopupPos>({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selRef = useRef<string>('');
  const paragraphIdxRef = useRef<number>(-1);

  const hide = useCallback(() => {
    setVisible(false);
    selRef.current = '';
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { hide(); return; }
      const container = containerRef.current;
      if (!container || !container.contains(sel.anchorNode)) { hide(); return; }
      const selectedText = sel.toString().trim();
      if (!selectedText) { hide(); return; }
      selRef.current = selectedText;

      // Trouver l'index du paragraphe
      const lc = selectedText.toLowerCase();
      let foundPIdx = -1;
      for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].toLowerCase().includes(lc)) { foundPIdx = i; break; }
      }
      paragraphIdxRef.current = foundPIdx;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const popupWidth = 280;
      const x = Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 8);
      const y = rect.top + window.scrollY - 8;
      setPos({ x: Math.max(8, x), y });
      setVisible(true);
    }, 80);
  }, [containerRef, hide, paragraphs]);

  useEffect(() => {
    const onMouseUp = () => handleSelectionChange();
    const onTouchEnd = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(handleSelectionChange, 200); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.shiftKey) handleSelectionChange(); };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('keyup', onKeyUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const popup = document.getElementById('selection-popup-root');
      if (popup && popup.contains(e.target as Node)) return;
      hide();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [hide]);

  const findLocation = useCallback((): { pIdx: number; sIdx: number } | null => {
    const selectedText = selRef.current.toLowerCase();
    if (!selectedText) return null;
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx].toLowerCase();
      const charIdx = para.indexOf(selectedText);
      if (charIdx !== -1) {
        const sentences = paragraphs[pIdx].match(/[^.!?]+[.!?]*/g) || [paragraphs[pIdx]];
        let cumLen = 0;
        for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
          cumLen += sentences[sIdx].length;
          if (cumLen > charIdx) return { pIdx, sIdx };
        }
        return { pIdx, sIdx: 0 };
      }
    }
    return null;
  }, [paragraphs]);

  const handleJump = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const loc = findLocation();
    if (loc) { window.getSelection()?.removeAllRanges(); hide(); onJumpToSelection(loc.pIdx, loc.sIdx); }
    else { hide(); }
  }, [findLocation, hide, onJumpToSelection]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const text = selRef.current;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => { setCopied(false); hide(); }, 1500);
    } catch { hide(); }
  }, [hide]);

  const handleAnnotate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const text = selRef.current;
    const pIdx = paragraphIdxRef.current;
    if (text && onAnnotate) {
      window.getSelection()?.removeAllRanges();
      hide();
      onAnnotate(text, pIdx >= 0 ? pIdx : 0);
    }
  }, [hide, onAnnotate]);

  const handleDefine = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const text = selRef.current.trim();
    if (!text || !onDefineWord) return;
    // Pour la définition, prendre seulement le premier mot si sélection longue
    const word = text.split(/\s+/)[0];
    const sentence = paragraphIdxRef.current >= 0 ? paragraphs[paragraphIdxRef.current] : '';
    window.getSelection()?.removeAllRanges();
    hide();
    onDefineWord(word, sentence);
  }, [hide, onDefineWord, paragraphs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="selection-popup-root"
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, transform: 'translateY(-100%)' }}
          className="flex items-center gap-0.5 bg-[#1a1919] border border-stone-700 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden select-none px-1"
          onMouseDown={e => e.preventDefault()}
        >
          {/* Lire depuis ici */}
          <button onMouseDown={e => e.preventDefault()} onClick={handleJump}
            className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-black text-white hover:bg-[#646cff] transition-colors cursor-pointer whitespace-nowrap rounded-full"
            title="Lire depuis ce mot">
            <Play className="w-3 h-3 fill-current flex-shrink-0" />
            <span>Lire</span>
          </button>

          <div className="w-px h-4 bg-stone-700 flex-shrink-0" />

          {/* Annoter */}
          {onAnnotate && (
            <>
              <button onMouseDown={e => e.preventDefault()} onClick={handleAnnotate}
                className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-black text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap rounded-full"
                title="Annoter ce passage">
                <Highlighter className="w-3 h-3 flex-shrink-0" />
                <span>Annoter</span>
              </button>
              <div className="w-px h-4 bg-stone-700 flex-shrink-0" />
            </>
          )}

          {/* Définir */}
          {onDefineWord && (
            <>
              <button onMouseDown={e => e.preventDefault()} onClick={handleDefine}
                className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-black text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-colors cursor-pointer whitespace-nowrap rounded-full"
                title="Définir ce mot">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                <span>Définir</span>
              </button>
              <div className="w-px h-4 bg-stone-700 flex-shrink-0" />
            </>
          )}

          {/* Copier */}
          <button onMouseDown={e => e.preventDefault()} onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-black text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap rounded-full"
            title="Copier la sélection">
            {copied ? (
              <><Check className="w-3 h-3 flex-shrink-0 text-green-400" /><span className="text-green-400">Copié !</span></>
            ) : (
              <><Copy className="w-3 h-3 flex-shrink-0" /><span>Copier</span></>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
