import React, { useEffect, useRef, useState } from 'react';
import { 
  Bookmark, 
  Sparkles, 
  Type, 
  Moon, 
  Sun, 
  AlignLeft, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Play,
  Square,
  Copy,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  ChevronDown,
  X,
  Volume2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chapter, UserSettings, DocumentBook, Bookmark as BookmarkType } from '../types';
import { splitIntoSentences } from '../utils/textUtils';
import { resolveSpeechConfig } from '../utils/customVoices';
import DictionaryModal from './DictionaryModal';
import SelectionPopup from './SelectionPopup';

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
  
  // High-value Navigation Props mapping for inline section controllers
  documentBook?: DocumentBook;
  currentChapterIndex?: number;
  onChapterSelect?: (index: number) => void;
  onUpdateBook?: (updated: DocumentBook) => void;
  bookmarks?: BookmarkType[];
  onJumpToLocation?: (chapterIdx: number, paragraphIdx: number) => void;
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
  documentBook,
  currentChapterIndex,
  onChapterSelect,
  onUpdateBook,
  bookmarks = [],
  onJumpToLocation,
}: TextViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSyllableRef = useRef<HTMLSpanElement>(null);

  // States to facilitate online Definition & Language lookups
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [lookupContext, setLookupContext] = useState<string>('');

  // Interactive Quick-Nav overlays
  const [isChapterSelectorOpen, setIsChapterSelectorOpen] = useState(false);
  const [isSummaryPopoverOpen, setIsSummaryPopoverOpen] = useState(false);
  const [isBookmarksPopoverOpen, setIsBookmarksPopoverOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Summary generation states (companionable fast access)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryTone, setSummaryTone] = useState<'standard' | 'bullet' | 'simple' | 'short'>('standard');
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);
  const [summaryCopySuccess, setSummaryCopySuccess] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Analyse littéraire en cours...",
    "Recherche des notions pivots...",
    "Modélisation de la synthèse par Gemini...",
    "Paufinage du ton didactique..."
  ];

  // Auto Scroll handling
  useEffect(() => {
    if (settings.autoScroll && activeSyllableRef.current) {
      activeSyllableRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentParagraphIndex, currentSentenceIndex, settings.autoScroll, isPlaying]);

  // Loading animation triggers
  useEffect(() => {
    let interval: any;
    if (isGeneratingSummary) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGeneratingSummary]);

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

  // Cancel Speech on chapter changes to prevent playback overlap
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChapterIndex]);

  const handleSelectionAndMouseUp = (e: React.MouseEvent, sentenceText: string) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection) {
        const text = selection.toString().trim();
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

  // Toggle helper to handle modal states smoothly
  const togglePopover = (target: 'chapters' | 'summary' | 'bookmarks' | 'settings') => {
    setIsChapterSelectorOpen(target === 'chapters' ? !isChapterSelectorOpen : false);
    setIsSummaryPopoverOpen(target === 'summary' ? !isSummaryPopoverOpen : false);
    setIsBookmarksPopoverOpen(target === 'bookmarks' ? !isBookmarksPopoverOpen : false);
    setIsMobileSettingsOpen(target === 'settings' ? !isMobileSettingsOpen : false);
  };

  // Safe inline summary generator
  const handleGenerateSummaryInline = async () => {
    if (!documentBook || !onUpdateBook || currentChapterIndex === undefined) return;

    setIsGeneratingSummary(true);
    setSummaryError(null);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingSummary(false);

    try {
      const activeCh = documentBook.chapters[currentChapterIndex];
      const textToSummarize = activeCh.paragraphs.join('\n\n');
      const targetTitle = activeCh.title;

      if (!textToSummarize.trim()) {
        throw new Error("Cette section ne contient pas de texte lisible à faire résumer.");
      }

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSummarize,
          title: targetTitle,
          tone: summaryTone,
          lang: documentBook.language || 'fr',
        }),
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => ({}));
        throw new Error(errObj.error || `Erreur serveur (${response.status})`);
      }

      const data = await response.json();
      if (!data.summary) {
        throw new Error("L'IA n'a retourné aucun résumé exploitable.");
      }

      // Update chapters array with cached summary in place
      const updatedBook = { ...documentBook };
      updatedBook.chapters = documentBook.chapters.map((ch, idx) => {
        if (idx === currentChapterIndex) {
          return { ...ch, summary: data.summary };
        }
        return ch;
      });

      onUpdateBook(updatedBook);
    } catch (err: any) {
      console.error('[AI Summary Inline Error]', err);
      setSummaryError(err.message || "Une erreur d'appel d'API Gemini s'est produite.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Vocalize the summary
  const handleToggleSpeakSummary = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("Votre navigateur ne supporte pas la synthèse vocale.");
      return;
    }

    if (isSpeakingSummary) {
      window.speechSynthesis.cancel();
      setIsSpeakingSummary(false);
      return;
    }

    const cleanText = textToSpeak
      .replace(/[#*`~_\-]/g, ' ')
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

    const voiceConfig = resolveSpeechConfig(
      settings.voiceURI,
      language || 'fr',
      settings.speechPitch || 1.0,
      settings.speechRate || 1.1
    );

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceConfig.lang;
    utterance.rate = voiceConfig.rate;
    utterance.pitch = voiceConfig.pitch;

    if (voiceConfig.voice) {
      utterance.voice = voiceConfig.voice;
    }

    utterance.onend = () => setIsSpeakingSummary(false);
    utterance.onerror = () => setIsSpeakingSummary(false);

    setIsSpeakingSummary(true);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Summary to clip board
  const handleCopySummaryText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSummaryCopySuccess(true);
      setTimeout(() => setSummaryCopySuccess(false), 2000);
    }).catch(e => console.error(e));
  };

  // Clear chapter summary cache
  const handleClearSummaryInline = () => {
    if (!documentBook || !onUpdateBook || currentChapterIndex === undefined) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingSummary(false);

    const updatedBook = { ...documentBook };
    updatedBook.chapters = documentBook.chapters.map((ch, idx) => {
      if (idx === currentChapterIndex) {
        return { ...ch, summary: undefined };
      }
      return ch;
    });
    onUpdateBook(updatedBook);
  };

  // Custom formatted markdown summaries rendering
  const renderFormattedSummary = (markdownText: string) => {
    if (!markdownText) return null;
    return markdownText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-[11px] font-black text-amber-500 mt-3 mb-1 font-sans uppercase tracking-wider block">
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <h3 key={idx} className="text-xs font-black text-amber-600 dark:text-amber-400 mt-3.5 mb-1.5 font-sans tracking-tight block">
            {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const cleanLine = trimmed.replace(/^[*•-]\s*/, '');
        return (
          <li key={idx} className="list-none pl-3 relative my-1 text-[11px] leading-relaxed font-sans">
            <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
            {renderBoldText(cleanLine)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-[11px] leading-relaxed my-1 font-sans">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (lineText: string) => {
    const parts = lineText.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-amber-700 dark:text-amber-400">{part}</strong>;
      }
      return part;
    });
  };

  // Fonts & Spacing helper classes
  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'font-serif tracking-normal';
      case 'dyslexic':
        return 'font-sans tracking-[0.16em] word-spacing-[0.25em] font-medium leading-[2em]';
      case 'sans':
      default:
        return 'font-sans tracking-tight';
    }
  };

  const getLineHeightClass = () => {
    if (settings.fontFamily === 'dyslexic') return 'leading-loose';
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

  // Local helper variables
  const hasExtendedNav = documentBook !== undefined && currentChapterIndex !== undefined && onChapterSelect !== undefined;
  const currentChapterIndexVal = currentChapterIndex || 0;
  const totalChapters = documentBook?.chapters.length || 0;
  const activeChapterSummary = documentBook?.chapters[currentChapterIndexVal]?.summary || null;
  const currentBookBookmarks = bookmarks.filter(b => b.chapterIndex === currentChapterIndexVal);

  return (
    <div
      ref={containerRef}
      className={`min-h-full w-full flex flex-col transition-colors duration-300 ease-in-out select-text ${getThemeClasses()}`}
    >
      {/* ========================================== */}
      {/* REVOLUTIONARY INTUITIVE INTERACTIVE NAVIGATION HUB */}
      {/* ========================================== */}
      <div className={`sticky top-0 z-30 w-full border-b select-none transition-all duration-300 shadow-md ${
        settings.theme === 'dark'
          ? 'bg-[#0f0e0d]/95 border-stone-900 text-stone-200'
          : settings.theme === 'sepia'
          ? 'bg-[#F2EFE9]/95 border-[#E2DDD5] text-[#2D2926]'
          : 'bg-[#F9F8F6]/95 border-stone-250 text-[#2D2926]'
      }`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2.5">
          {/* 1. Left Chapter Skipper & Menu */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
            {/* Previous Chapter button */}
            <button
              onClick={() => onChapterSelect && onChapterSelect(currentChapterIndexVal - 1)}
              disabled={!hasExtendedNav || currentChapterIndexVal === 0}
              className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                currentChapterIndexVal === 0 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-stone-500/10 active:scale-95'
              }`}
              title="Section précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick SOMMAIRE Dropdown Selector */}
            {hasExtendedNav ? (
              <button
                onClick={() => togglePopover('chapters')}
                className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-semibold hover:border-amber-500 transition-all cursor-pointer ${
                  settings.theme === 'dark' 
                    ? 'bg-stone-900 border-stone-850 text-stone-250' 
                    : settings.theme === 'sepia'
                    ? 'bg-amber-100/30 border-[#E2DDD5] text-stone-900'
                    : 'bg-white border-stone-250 text-stone-800 shadow-sm'
                }`}
                title="Sauter à un autre chapitre"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[180px] md:max-w-[240px]">
                  {chapter.title}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
              </button>
            ) : (
              <span className="text-xs font-bold px-2 py-1 text-stone-400">
                {chapter.title}
              </span>
            )}

            {/* Next Chapter button */}
            <button
              onClick={() => onChapterSelect && onChapterSelect(currentChapterIndexVal + 1)}
              disabled={!hasExtendedNav || currentChapterIndexVal >= totalChapters - 1}
              className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                currentChapterIndexVal >= totalChapters - 1
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-stone-500/10 active:scale-95'
              }`}
              title="Section suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Middle Features Shortcuts (AI Summary, Bookmark Index & Styles) */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* AI Summary Dropdown shortcut */}
            {hasExtendedNav && (
              <button
                onClick={() => togglePopover('summary')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-extrabold transition-all relative cursor-pointer ${
                  isSummaryPopoverOpen
                    ? 'bg-amber-500 text-stone-950 font-black'
                    : activeChapterSummary
                    ? 'bg-[#646cff]/10 text-[#646cff] dark:text-[#a5b4fc] hover:bg-[#646cff]/20'
                    : 'bg-stone-500/10 text-stone-600 dark:text-stone-300 hover:bg-stone-500/15'
                }`}
                title="Générer ou lire le Résumé IA de ce chapitre"
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeChapterSummary ? 'fill-current animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Résumé IA</span>
                {activeChapterSummary && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                )}
              </button>
            )}

            {/* Bookmarks popover locator */}
            {hasExtendedNav && (
              <button
                onClick={() => togglePopover('bookmarks')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isBookmarksPopoverOpen
                    ? 'bg-amber-500 text-stone-950 font-black'
                    : currentBookBookmarks.length > 0
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15'
                    : 'bg-stone-500/10 text-stone-600 dark:text-stone-300 hover:bg-stone-500/15'
                }`}
                title="Accéder aux signets de ce chapitre"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Signets</span>
                {currentBookBookmarks.length > 0 && (
                  <span className="text-[10px] font-mono px-1 rounded-md bg-indigo-500 text-white font-extrabold leading-none">
                    {currentBookBookmarks.length}
                  </span>
                )}
              </button>
            )}

            {/* Layout Options Trigger (Inline modal style) */}
            <button
              onClick={() => togglePopover('settings')}
              className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold hover:bg-stone-500/10 transition-all cursor-pointer ${
                isMobileSettingsOpen ? 'bg-amber-500 text-stone-950 font-black' : ''
              }`}
              title="Ajuster la mise en page (thème, police, zoom)"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Styles</span>
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* OVERLAY POPUPS (RENDERING AS FLOATING GLASSMOPRHIC DROPDOWNS INSIDE THE BAR) */}
        {/* ========================================== */}
        <AnimatePresence>
          {/* Chapter Selector Dropdown */}
          {isChapterSelectorOpen && hasExtendedNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-950 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <div className="p-3 max-w-2xl mx-auto space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500 pb-2 border-b border-stone-200/40 dark:border-stone-800/40 mb-1.5">
                  <span>Sections disponibles ({totalChapters})</span>
                  <span>Sélection rapide</span>
                </div>
                {documentBook.chapters.map((ch, idx) => {
                  const isActive = idx === currentChapterIndexVal;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        onChapterSelect && onChapterSelect(idx);
                        setIsChapterSelectorOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 font-extrabold border-l-4 border-amber-500 pl-2'
                          : 'hover:bg-stone-500/5 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className="text-[10px] font-mono opacity-50">S{idx + 1}</span>
                        <span className="truncate">{ch.title}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* AI Chapter Summary Popover panel */}
          {isSummaryPopoverOpen && hasExtendedNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-955 overflow-hidden"
            >
              <div className="p-4 max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200/40 dark:border-stone-800/40">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-black uppercase tracking-tight">
                    <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                    <span>Résumé IA Intelligent</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">Powered by Gemini 3.5</span>
                </div>

                {isGeneratingSummary ? (
                  /* Loading bar */
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border border-stone-200 dark:border-stone-800 animate-pulse absolute" />
                      <Sparkles className="w-5 h-5 text-amber-500 animate-spin duration-[4s]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-stone-800 dark:text-white">Analyse en cours...</p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono tracking-wide">
                        {loadingMessages[loadingStep]}
                      </p>
                    </div>
                  </div>
                ) : summaryError ? (
                  /* Error display */
                  <div className="p-3 bg-red-400/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl space-y-2">
                    <p className="font-extrabold text-[11px] text-red-500">Génération impossible</p>
                    <p className="text-[10px] text-stone-500 leading-normal">{summaryError}</p>
                    <button
                      onClick={handleGenerateSummaryInline}
                      className="px-3 py-1 bg-amber-500 text-stone-950 font-bold rounded-lg text-[10px] hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : activeChapterSummary ? (
                  /* Display existing summary */
                  <div className="space-y-3.5">
                    {/* Sticky controls toolbar */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-stone-500/5 text-[10px] font-bold">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleSpeakSummary(activeChapterSummary)}
                          className={`px-3 py-1 rounded-lg font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSpeakingSummary
                              ? 'bg-red-500 text-white'
                              : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                          }`}
                        >
                          {isSpeakingSummary ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              Arrêter la lecture
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              Écouter le résumé
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopySummaryText(activeChapterSummary)}
                          className="p-1.5 hover:bg-stone-500/10 text-stone-500 hover:text-stone-900 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Copier le résumé"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={handleClearSummaryInline}
                        className="text-stone-400 hover:text-red-500 px-2.5 py-1 rounded hover:bg-red-500/5 transition-all cursor-pointer text-[10px] uppercase font-bold"
                      >
                        Effacer
                      </button>
                    </div>

                    {/* Summary text */}
                    <div className="p-3.5 bg-white dark:bg-stone-950/60 rounded-2xl border border-stone-200/40 dark:border-stone-900 select-text max-h-60 overflow-y-auto scrollbar-thin">
                      <div className="space-y-2">
                        {renderFormattedSummary(activeChapterSummary)}
                      </div>
                    </div>

                    {summaryCopySuccess && (
                      <p className="text-[10px] text-emerald-500 font-bold text-center">✓ Résumé copié dans le presse-papiers !</p>
                    )}
                  </div>
                ) : (
                  /* Summary trigger screen */
                  <div className="py-4 text-center space-y-3">
                    <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                      L'orateur intelligent peut condenser ce chapitre à la volée. Choisissez sa tonalité d'analyse :
                    </p>
                    {/* Tone Selectors */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-w-md mx-auto">
                      {(
                        [
                          { id: 'standard', label: 'Équilibré', d: 'Synthèse fluide' },
                          { id: 'bullet', label: 'Points Clés', d: 'Idées en puces' },
                          { id: 'simple', label: 'Simple', d: 'Termes vulgarisés' },
                          { id: 'short', label: 'Court', d: 'Un paragraphe' },
                        ] as const
                      ).map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => setSummaryTone(tone.id)}
                          className={`p-1.5 border rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            summaryTone === tone.id
                              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                              : 'bg-white dark:bg-[#111] border-stone-250 dark:border-stone-900 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-[10px] font-bold">{tone.label}</span>
                          <span className="text-[8px] opacity-60 leading-none mt-0.5">{tone.d}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleGenerateSummaryInline}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs rounded-full shadow-md flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        Générer le Résumé par l'IA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Bookmarks quick view drawer */}
          {isBookmarksPopoverOpen && hasExtendedNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-955 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <div className="p-4 max-w-2xl mx-auto space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500 pb-1.5 border-b border-stone-200/40 dark:border-stone-800/40 mb-1">
                  <span>Signets de cette section ({currentBookBookmarks.length})</span>
                  <span>Historique</span>
                </div>

                {currentBookBookmarks.length > 0 ? (
                  <div className="space-y-2">
                    {currentBookBookmarks.map((bm, index) => (
                      <button
                        key={bm.id}
                        onClick={() => {
                          onJumpToLocation && onJumpToLocation(bm.chapterIndex, bm.paragraphIndex);
                          setIsBookmarksPopoverOpen(false);
                        }}
                        className="w-full text-left p-2.5 bg-white dark:bg-stone-950 rounded-xl border border-stone-200/50 dark:border-stone-900/80 hover:border-amber-500 transition-all text-xs cursor-pointer block group"
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono text-stone-400 mb-1">
                          <span>Para. {bm.paragraphIndex + 1}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity">Sauter au signet →</span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 italic truncate font-serif">
                          "{bm.textSnippet}"
                        </p>
                        {bm.note && (
                          <div className="mt-1.5 text-[10px] text-indigo-500 font-medium">
                            📝 Note : {bm.note}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-stone-400">
                    <Bookmark className="w-8 h-8 mx-auto stroke-1 text-stone-300 dark:text-stone-800" />
                    <p className="text-[10px] mt-1.5">Aucun signet dans ce chapitre. Cliquez sur le symbole de signet à gauche des phrases pour en marquer une.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick Mobile and Desktop Settings Overlay */}
          {isMobileSettingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-955"
            >
              <div className="p-4 max-w-2xl mx-auto space-y-4 text-xs font-semibold select-none">
                {/* Theme Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-stone-400">Palettes de Lecture</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onSettingsChange({ theme: 'light' })}
                      className={`p-2 rounded-xl border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        settings.theme === 'light' ? 'bg-amber-500 text-stone-950 font-black border-amber-500' : 'bg-white border-stone-200 text-stone-700'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Clair
                    </button>
                    <button
                      onClick={() => onSettingsChange({ theme: 'sepia' })}
                      className={`p-2 rounded-xl border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        settings.theme === 'sepia' ? 'bg-amber-500 text-stone-950 font-black border-amber-500' : 'bg-white border-stone-200 text-stone-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FAF7F2] border border-amber-900/30" /> Sépia
                    </button>
                    <button
                      onClick={() => onSettingsChange({ theme: 'dark' })}
                      className={`p-2 rounded-xl border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        settings.theme === 'dark' ? 'bg-amber-500 text-stone-950 font-black border-amber-500' : 'bg-white border-stone-250 text-stone-700'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Sombre
                    </button>
                  </div>
                </div>

                {/* Font selector */}
                <div className="space-y-1.5 pt-2 border-t border-stone-250/20">
                  <span className="text-[10px] uppercase font-black tracking-wider text-stone-400">Polices de Caractères</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onSettingsChange({ fontFamily: 'serif' })}
                      className={`p-2 rounded-xl border transition-all text-center font-serif cursor-pointer ${
                        settings.fontFamily === 'serif' ? 'bg-amber-500 border-amber-500 text-stone-950 font-black' : 'bg-white border-stone-200'
                      }`}
                    >
                      Sérif (Georgia)
                    </button>
                    <button
                      onClick={() => onSettingsChange({ fontFamily: 'sans' })}
                      className={`p-2 rounded-xl border transition-all text-center font-sans cursor-pointer ${
                        settings.fontFamily === 'sans' ? 'bg-amber-500 border-amber-500 text-stone-950 font-black' : 'bg-white border-stone-200'
                      }`}
                    >
                      Sans-Sérif (Inter)
                    </button>
                    <button
                      onClick={() => onSettingsChange({ fontFamily: 'dyslexic' })}
                      className={`p-2 rounded-xl border transition-all text-center font-sans cursor-pointer ${
                        settings.fontFamily === 'dyslexic' ? 'bg-amber-500 border-amber-500 text-stone-950 font-black' : 'bg-white border-stone-200'
                      }`}
                    >
                      Dyslexique
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-255/20">
                  {/* Zoom font size */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-stone-400">Taille de l'écriture</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onSettingsChange({ fontSize: Math.max(80, settings.fontSize - 10) })}
                        className="h-8 w-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        A-
                      </button>
                      <span className="text-[11px] font-mono font-black min-w-[34px] text-center text-amber-500">
                        {settings.fontSize}%
                      </span>
                      <button
                        onClick={() => onSettingsChange({ fontSize: Math.min(250, settings.fontSize + 10) })}
                        className="h-8 w-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Line height */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-stone-400">Espacement Vertical</span>
                    <div className="flex border rounded-lg overflow-hidden border-stone-200">
                      {(['snug', 'normal', 'relaxed'] as const).map((lh) => (
                        <button
                          key={lh}
                          onClick={() => onSettingsChange({ lineHeight: lh })}
                          className={`flex-1 p-1 py-1.5 text-center text-[10px] font-bold cursor-pointer transition-all ${
                            settings.lineHeight === lh && settings.fontFamily !== 'dyslexic'
                              ? 'bg-amber-500 text-stone-950 font-black'
                              : 'bg-white hover:bg-stone-50'
                          }`}
                          disabled={settings.fontFamily === 'dyslexic'}
                        >
                          {lh === 'snug' ? 'Serré' : lh === 'normal' ? 'Normal' : 'Espacé'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legacy layout bar - remains visible strictly on desktop for extra control */}
      <div className={`w-full border-b backdrop-blur-md px-4 sm:px-8 py-3 hidden md:flex items-center justify-between gap-4 overflow-x-auto scrollbar-none select-none transition-all duration-300 shadow-sm ${
        settings.theme === 'dark'
          ? 'bg-[#0f0e0d]/50 border-stone-900 text-stone-200'
          : settings.theme === 'sepia'
          ? 'bg-[#F2EFE9]/50 border-[#E2DDD5] text-[#2D2926]'
          : 'bg-[#F9F8F6]/50 border-stone-200 text-[#2D2926]'
      }`}>
        {/* Label for Large screens */}
        <div className="hidden lg:flex items-center space-x-2 flex-shrink-0 text-[11px] font-sans font-black uppercase tracking-wider text-amber-650 dark:text-amber-400">
          <AlignLeft className="w-4 h-4" />
          <span>Mise en page active</span>
        </div>

        {/* Toggles Group */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 md:gap-6 w-full lg:w-auto lg:justify-end">
          {/* 1. Theme choices */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-250/10 dark:border-stone-800/10">
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
                  : 'text-stone-400 hover:text-stone-855 dark:hover:text-stone-100'
              }`}
              title="Thème Sombre"
            >
              <Moon className="w-3 h-3" />
              <span>Sombre</span>
            </button>
          </div>

          {/* 2. Font preferences */}
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-250/10 dark:border-stone-800/10">
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
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-250/10 dark:border-stone-800/10 space-x-1.5 px-2">
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
          <div className="flex items-center bg-stone-500/5 dark:bg-stone-500/15 p-0.5 rounded-lg border border-stone-250/10 dark:border-stone-800/10">
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
      <div className="pt-6 pb-4 sm:pt-10 sm:pb-8 px-4 sm:px-12 md:px-16 lg:px-24 w-full flex-grow min-w-0">
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

        {/* Dynamic & Beautiful Chapter Completion Section */}
        <div className="max-w-2xl mx-auto mt-12 pt-8 border-t border-stone-200/40 dark:border-stone-800/40 flex flex-col items-center">
          <div className={`w-full p-6 sm:p-10 rounded-3xl border text-center transition-all duration-300 relative overflow-hidden shadow-lg ${
            settings.theme === 'dark'
              ? 'bg-[#151413] border-stone-900 text-stone-200'
              : settings.theme === 'sepia'
              ? 'bg-[#eae5db]/60 border-[#dfd8cc] text-[#2d2926]'
              : 'bg-white border-stone-200 text-stone-850'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/3 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/3 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-bounce">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              
              <div className="space-y-1.5 max-w-md">
                <span className="text-[10px] font-mono tracking-widest text-amber-500 dark:text-amber-400 uppercase font-black">
                  Section terminée
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-stone-900 dark:text-white">
                  {chapter.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Félicitations, vous êtes arrivé au terme de cette section !
                </p>
              </div>

              {/* Progress summary for this book */}
              {hasExtendedNav && (
                <div className="text-[10px] font-mono text-stone-450 dark:text-stone-405 bg-stone-500/5 px-3 py-1 rounded-full">
                  Chapitre {currentChapterIndexVal + 1} sur {totalChapters}
                </div>
              )}

              {/* Adaptive Call To Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
                {hasExtendedNav && currentChapterIndexVal < totalChapters - 1 ? (
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.scroll) {
                        window.scroll({ top: 0, behavior: 'smooth' });
                      }
                      onChapterSelect(currentChapterIndexVal + 1);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:translate-x-1 duration-200"
                  >
                    <span>Chapitre suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-xs text-emerald-500 font-extrabold bg-emerald-500/10 px-4 py-2.5 rounded-2xl w-full text-center">
                    🎉 Vous avez terminé toutes les sections de ce livre !
                  </div>
                )}
                
                <button
                  onClick={() => {
                    onLocationSelect(0, 0);
                  }}
                  className={`w-full sm:w-auto px-5 py-3 border rounded-full text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    settings.theme === 'dark'
                      ? 'bg-stone-850 hover:bg-stone-800 border-stone-800 text-stone-200'
                      : settings.theme === 'sepia'
                      ? 'bg-[#FAF7F2] hover:bg-amber-50 border-[#dfd8cc] text-stone-900'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                  Relire le chapitre
                </button>
              </div>

              {/* Tertiary utilities shortcut links inside completion footer */}
              {hasExtendedNav && (
                <div className="pt-2.5 flex items-center justify-center gap-4 text-xs font-bold flex-wrap">
                  {!activeChapterSummary && (
                    <button
                      onClick={() => togglePopover('summary')}
                      className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      Générer le résumé
                    </button>
                  )}
                  {currentBookBookmarks.length === 0 && (
                    <button
                      onClick={() => onQuickBookmark(0)}
                      className="text-stone-400 hover:text-stone-100 flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <Bookmark className="w-3 h-3" />
                      Marquer le début
                    </button>
                  )}
                  {currentChapterIndexVal > 0 && (
                    <button
                      onClick={() => {
                        onChapterSelect(currentChapterIndexVal - 1);
                      }}
                      className="text-stone-400 hover:text-stone-100 cursor-pointer text-[11px]"
                    >
                      ← Chapitre précédent
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
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

      {/* ── Popup sélection de texte ── */}
      <SelectionPopup
        containerRef={containerRef}
        paragraphs={chapter.paragraphs}
        isPlaying={isPlaying}
        onJumpToSelection={(pIdx, sIdx) => {
          onLocationSelect(pIdx, sIdx);
        }}
      />
    </div>
  );
}
