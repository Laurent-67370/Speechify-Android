import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Sparkles, Type, Moon, Sun, AlignLeft, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Chapter, UserSettings } from '../types';
import { splitIntoSentences } from '../utils/textUtils';
import DictionaryModal from './DictionaryModal';

interface TextViewerProps {
  chapter: Chapter;
  currentParagraphIndex: number;
  currentSentenceIndex: number;
  isPlaying: boolean;
  settings: UserSettings;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  onLocationSelect: (paragraphIdx: number, sentenceIdx: number) => void;
  onQuickBookmark: (paragraphIdx: number) => void;
  isParagraphBookmarked: (paragraphIdx: number) => boolean;
  language?: string;
}

export default function TextViewer({
  chapter,
  currentParagraphIndex,
  currentSentenceIndex,
  isPlaying,
  settings,
  onSettingsChange,
  onLocationSelect,
  onQuickBookmark,
  isParagraphBookmarked,
  language = 'fr',
}: TextViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSyllableRef = useRef<HTMLSpanElement>(null);

  // States to facilitate online Definition & Language lookups
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupContext, setLookupContext] = useState<string>('');

  // Handle auto-closing floating markers on clicking empty spaces
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
          setSelectedText(null);
          setCoords(null);
        }
      }, 50);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const handleSelectionAndMouseUp = (e: React.MouseEvent, sentenceText: string) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection) {
        const text = selection.toString().trim();
        // Avoid triggers on long paragraphs or single digits
        if (text && text.length > 1 && text.length < 50 && !text.includes('\n')) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setCoords({
              x: rect.left + rect.width / 2,
              y: rect.top - 40,
            });
            setSelectedText(text);
            setLookupContext(sentenceText);
          } catch (err) {
            setCoords({
              x: e.clientX,
              y: e.clientY - 40,
            });
            setSelectedText(text);
            setLookupContext(sentenceText);
          }
        }
      }
    }, 20);
  };

  // Auto Scroll handling
  useEffect(() => {
    if (settings.autoScroll && activeSyllableRef.current) {
      activeSyllableRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentParagraphIndex, currentSentenceIndex, settings.autoScroll, isPlaying]);

  // Translate font categories to css rules
  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'font-serif tracking-normal';
      case 'dyslexic':
        // Modern accessibility-grade spaced font configuration
        return 'font-sans tracking-[0.16em] word-spacing-[0.25em] font-medium leading-[2em]';
      case 'sans':
      default:
        return 'font-sans tracking-tight';
    }
  };

  const getLineHeightClass = () => {
    if (settings.fontFamily === 'dyslexic') return 'leading-loose'; // Dyslexic forces loose
    switch (settings.lineHeight) {
      case 'snug': return 'leading-snug';
      case 'relaxed': return 'leading-relaxed';
      case 'normal':
      default:
        return 'leading-normal';
    }
  };

  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'dark':
        return 'bg-[#0f0e0d] text-stone-100 selection:bg-amber-500/20';
      case 'sepia':
        return 'bg-[#F2EFE9] text-[#2D2926] selection:bg-[#E2DDD5]';
      case 'light':
      default:
        return 'bg-[#F9F8F6] text-[#2D2926] selection:bg-amber-500/10';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-full w-full flex flex-col transition-colors duration-300 ease-in-out select-text ${getThemeClasses()}`}
    >
      {/* Persistente Quick Layout Access Toolbar (Sticky at top of text channel for ultimate accessibility) */}
      <div className={`sticky top-0 z-20 w-full border-b backdrop-blur-md px-4 sm:px-8 py-3 hidden sm:flex items-center justify-between gap-4 overflow-x-auto scrollbar-none select-none transition-all duration-300 shadow-sm ${
        settings.theme === 'dark'
          ? 'bg-[#0f0e0d]/95 border-stone-850 text-stone-200'
          : settings.theme === 'sepia'
          ? 'bg-[#F2EFE9]/95 border-[#E2DDD5] text-[#2D2926]'
          : 'bg-[#F9F8F6]/95 border-stone-200 text-[#2D2926]'
      }`}>
        {/* Label for Large screens */}
        <div className="hidden lg:flex items-center space-x-2 flex-shrink-0 text-[11px] font-sans font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
          <AlignLeft className="w-4 h-4" />
          <span>Mise en page active</span>
        </div>

        {/* Toggles Group */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 md:gap-6 w-full lg:w-auto lg:justify-end">
          {/* 1. Theme choices */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-200/10 dark:border-stone-800/10">
            <button
              onClick={() => onSettingsChange({ theme: 'light' })}
              className={`p-1.5 px-3 rounded-md text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-[#F9F8F6]'
              }`}
              title="Thème Clair"
            >
              <Sun className="w-3 h-3" />
              <span>Clair</span>
            </button>
            <button
              onClick={() => onSettingsChange({ theme: 'sepia' })}
              className={`p-1.5 px-3 rounded-md text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                settings.theme === 'sepia'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                  : 'text-stone-500 hover:text-[#433422] dark:hover:text-[#F9F8F6]'
              }`}
              title="Thème Sépia"
            >
              <div className="w-3 h-3 bg-[#FAF7F2] border border-amber-900/20 rounded-full" />
              <span>Sépia</span>
            </button>
            <button
              onClick={() => onSettingsChange({ theme: 'dark' })}
              className={`p-1.5 px-3 rounded-md text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                  : 'text-stone-400 hover:text-stone-850 dark:hover:text-stone-100'
              }`}
              title="Thème Sombre"
            >
              <Moon className="w-3 h-3" />
              <span>Sombre</span>
            </button>
          </div>

          {/* 2. Font preferences */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-200/10 dark:border-stone-800/10">
            <button
              onClick={() => onSettingsChange({ fontFamily: 'serif' })}
              className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold font-serif transition-all cursor-pointer ${
                settings.fontFamily === 'serif'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-500 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              title="Georgia (Sérif)"
            >
              Sérif
            </button>
            <button
              onClick={() => onSettingsChange({ fontFamily: 'sans' })}
              className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold font-sans transition-all cursor-pointer ${
                settings.fontFamily === 'sans'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-500 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              title="Inter (Sans-sérif)"
            >
              Sans
            </button>
            <button
              onClick={() => onSettingsChange({ fontFamily: 'dyslexic' })}
              className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold font-sans transition-all cursor-pointer ${
                settings.fontFamily === 'dyslexic'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-505 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              title="Police Dyslexique Haute Lisibilité"
            >
              Dys
            </button>
          </div>

          {/* 3. Text size choices */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-200/10 dark:border-stone-800/10 space-x-1.5 px-2">
            <button
              onClick={() => onSettingsChange({ fontSize: Math.max(80, settings.fontSize - 10) })}
              className="h-6 w-6 rounded hover:bg-stone-500/10 dark:hover:bg-stone-500/20 flex items-center justify-center font-black text-xs cursor-pointer text-stone-500 hover:text-stone-900 dark:hover:text-[#F9F8F6]"
              title="Diminuer la police"
            >
              A-
            </button>
            <span className="text-[10px] font-mono font-black min-w-[34px] text-center text-amber-600 dark:text-amber-400">
              {settings.fontSize}%
            </span>
            <button
              onClick={() => onSettingsChange({ fontSize: Math.min(250, settings.fontSize + 10) })}
              className="h-6 w-6 rounded hover:bg-stone-500/10 dark:hover:bg-stone-500/20 flex items-center justify-center font-black text-xs cursor-pointer text-stone-500 hover:text-stone-900 dark:hover:text-[#F9F8F6]"
              title="Augmenter la police"
            >
              A+
            </button>
          </div>

          {/* 4. Line height options */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-200/10 dark:border-stone-800/10">
            <button
              onClick={() => onSettingsChange({ lineHeight: 'snug' })}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                settings.lineHeight === 'snug' && settings.fontFamily !== 'dyslexic'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-505 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              disabled={settings.fontFamily === 'dyslexic'}
              title="Interligne Serré"
            >
              Serré
            </button>
            <button
              onClick={() => onSettingsChange({ lineHeight: 'normal' })}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                settings.lineHeight === 'normal' && settings.fontFamily !== 'dyslexic'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-505 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              disabled={settings.fontFamily === 'dyslexic'}
              title="Interligne Normal"
            >
              Normal
            </button>
            <button
              onClick={() => onSettingsChange({ lineHeight: 'relaxed' })}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                settings.lineHeight === 'relaxed' || settings.fontFamily === 'dyslexic'
                  ? 'bg-amber-500 text-stone-950 font-black'
                  : 'text-stone-505 hover:text-stone-855 dark:hover:text-stone-200'
              }`}
              disabled={settings.fontFamily === 'dyslexic'}
              title="Interligne Espacé"
            >
              Espacé
            </button>
          </div>
        </div>
      </div>

      {/* Reading Document Sheet Content Container */}
      <div className="py-6 sm:py-10 px-4 sm:px-12 md:px-16 lg:px-24 w-full flex-grow min-w-0">
        {/* Chapter header */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-10 pb-4 sm:pb-6 border-b border-stone-200/40 dark:border-stone-800/40">
          <div className="flex items-center gap-1 text-[11px] font-mono tracking-wider text-stone-400 uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Section Lecture active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif">
            {chapter.title}
          </h2>
          <div className="mt-2 text-xs text-[#2D2926]/60 dark:text-stone-400/80 font-mono">
            <span>{chapter.paragraphs.length} paragraphes • ~{chapter.wordCount} mots</span>
          </div>
        </div>

        {/* Main Text Corpus */}
        <div
          style={{ fontSize: `${settings.fontSize}%` }}
          className={`max-w-2xl mx-auto space-y-6 ${getFontFamilyClass()} ${getLineHeightClass()} transition-all`}
        >
          {chapter.paragraphs.map((pText, pIdx) => {
            const isParagraphBookmarkedCurrent = isParagraphBookmarked(pIdx);
            const isParagraphCurrentlyRead = pIdx === currentParagraphIndex;
            const sentences = splitIntoSentences(pText);

            return (
              <div
                key={pIdx}
                className="group relative flex items-start gap-3 p-2.5 -mx-2.5 rounded-xl border border-transparent hover:bg-stone-500/5 dark:hover:bg-stone-900/20 transition-all duration-200"
              >
                {/* Quick Bookmark Button inside bounds (safe on mobile!) */}
                <button
                  onClick={() => onQuickBookmark(pIdx)}
                  className={`p-1 mt-0.5 rounded-lg flex-shrink-0 cursor-pointer transition-all duration-200 ${
                    isParagraphBookmarkedCurrent
                      ? 'text-amber-500 opacity-100 scale-110'
                      : 'text-stone-405 dark:text-stone-600 hover:text-amber-500 dark:hover:text-[#F9F8F6] opacity-30 sm:opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                  title={isParagraphBookmarkedCurrent ? "Retirer le signet" : "Mettre en signet"}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isParagraphBookmarkedCurrent ? 'fill-current' : ''}`} />
                </button>

                {/* Text Blocks */}
                <div className="flex-grow">
                  {sentences.map((sentence, sIdx) => {
                    const isSentenceCurrentlyRead = isParagraphCurrentlyRead && sIdx === currentSentenceIndex;
                    const isActive = isSentenceCurrentlyRead && isPlaying;

                    return (
                      <span
                        key={sIdx}
                        ref={isActive ? activeSyllableRef : null}
                        onMouseUp={(e) => handleSelectionAndMouseUp(e, sentence)}
                        onClick={() => {
                          const selectionText = window.getSelection()?.toString().trim();
                          if (!selectionText) {
                            onLocationSelect(pIdx, sIdx);
                          }
                        }}
                        className={`inline transition-all duration-300 rounded cursor-pointer ${
                          isActive
                            ? 'font-bold underline decoration-2 underline-offset-4 decoration-amber-500/40'
                            : 'hover:bg-amber-500/10 dark:hover:bg-amber-500/20'
                        }`}
                        style={{
                          backgroundColor: isActive ? settings.highlightColor : undefined,
                          borderRadius: '0.25rem',
                          padding: '0.05rem 0.15rem'
                        }}
                        title="Cliquer pour écouter cette phrase • Double-cliquer pour définir un mot"
                      >
                        {sentence}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating look-up bubble for active word highlights */}
      {selectedText && coords && (
        <div 
          style={{ 
            position: 'fixed', 
            left: `${coords.x}px`, 
            top: `${coords.y}px`, 
            transform: 'translateX(-50%)',
            zIndex: 100
          }}
          className="pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 5 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 5 }}
            className="flex items-center"
          >
            <button
              onMouseDown={(e) => {
                // Keep browser selection active!
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setLookupWord(selectedText);
                setSelectedText(null);
                setCoords(null);
              }}
              className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-[11px] px-3.5 py-2 rounded-full shadow-xl flex items-center gap-1.5 cursor-pointer hover:shadow-amber-500/20 transition-all whitespace-nowrap border border-amber-400"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-950" />
              <span>Définir "{selectedText.length > 12 ? selectedText.substring(0, 12) + '...' : selectedText}"</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Dictionary definition dialog modal */}
      {lookupWord && (
        <DictionaryModal
          word={lookupWord}
          sentenceContext={lookupContext}
          language={language}
          onClose={() => setLookupWord(null)}
        />
      )}
    </div>
  );
}
