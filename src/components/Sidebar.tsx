import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Bookmark, 
  Trash2, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Play, 
  Square, 
  Copy, 
  RefreshCw, 
  FileText, 
  HelpCircle, 
  AlertCircle 
} from 'lucide-react';
import { Chapter, Bookmark as BookmarkType, DocumentBook } from '../types';
import { searchInParagraph } from '../utils/textUtils';

interface SidebarProps {
  documentBook: DocumentBook;
  currentChapterIndex: number;
  currentParagraphIndex: number;
  onChapterSelect: (index: number) => void;
  bookmarks: BookmarkType[];
  onAddBookmark: (noteText?: string) => void;
  onDeleteBookmark: (id: string) => void;
  onJumpToLocation: (chapterIdx: number, paragraphIdx: number) => void;
  onUpdateBook: (updated: DocumentBook) => void;
}

type TabType = 'toc' | 'search' | 'bookmarks' | 'summary';

export default function Sidebar({
  documentBook,
  currentChapterIndex,
  currentParagraphIndex,
  onChapterSelect,
  bookmarks,
  onAddBookmark,
  onDeleteBookmark,
  onJumpToLocation,
  onUpdateBook,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('toc');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // States for summary generator
  const [summaryTarget, setSummaryTarget] = useState<'chapter' | 'book'>('chapter');
  const [summaryTone, setSummaryTone] = useState<'standard' | 'bullet' | 'simple' | 'short'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle loading captions for an immersive, companionable waiting experience
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Cancel Speech on Tab changes or component unmount to prevent audio leaks
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeTab]);

  // Search through all paragraphs in all chapters
  const getSearchResults = () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const results: { chapterIndex: number; paragraphIndex: number; text: string; chapterTitle: string }[] = [];

    documentBook.chapters.forEach((chapter, chapterIdx) => {
      chapter.paragraphs.forEach((paragraph, paragraphIdx) => {
        if (searchInParagraph(paragraph, searchQuery)) {
          results.push({
            chapterIndex: chapterIdx,
            paragraphIndex: paragraphIdx,
            text: paragraph,
            chapterTitle: chapter.title,
          });
        }
      });
    });

    return results;
  };

  const results = getSearchResults();

  // Helper to highlight terms in query results safely
  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    const cleanQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const plainText = text;
    
    const idx = plainText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(cleanQuery);
    if (idx === -1) return text;

    const start = text.substring(0, idx);
    const middle = text.substring(idx, idx + query.length);
    const end = text.substring(idx + query.length);

    return (
      <>
        {start}
        <mark className="bg-yellow-205 text-slate-900 rounded-sm font-semibold">{middle}</mark>
        {end}
      </>
    );
  };

  const handleSaveNoteBookmark = () => {
    onAddBookmark(noteInput.trim() || undefined);
    setNoteInput('');
    setShowNoteEditor(false);
  };

  // Main generator call
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setGenError(null);

    // Cancel existing TTS speaking before generating
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingSummary(false);

    try {
      let textToSummarize = '';
      let targetTitle = '';

      if (summaryTarget === 'chapter') {
        const activeChapter = documentBook.chapters[currentChapterIndex];
        if (!activeChapter) {
          throw new Error("Impossible de localiser la section active.");
        }
        textToSummarize = activeChapter.paragraphs.join('\n\n');
        targetTitle = activeChapter.title;
      } else {
        // Collect text from the book
        const snippets: string[] = [];
        documentBook.chapters.forEach((ch, idx) => {
          snippets.push(`### Chapitre ${idx + 1}: ${ch.title}`);
          // Gather first 15 paragraphs of each section to construct a holistic representation
          snippets.push(ch.paragraphs.slice(0, 15).join('\n\n'));
        });
        textToSummarize = snippets.join('\n\n');
        targetTitle = documentBook.title;
      }

      if (!textToSummarize.trim()) {
        throw new Error("Le document ne comporte aucun texte lisible à faire résumer.");
      }

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Merge and save summary
      const updatedBook = { ...documentBook };
      if (summaryTarget === 'chapter') {
        updatedBook.chapters = documentBook.chapters.map((ch, idx) => {
          if (idx === currentChapterIndex) {
            return { ...ch, summary: data.summary };
          }
          return ch;
        });
      } else {
        updatedBook.summary = data.summary;
      }

      onUpdateBook(updatedBook);
    } catch (err: any) {
      console.error('[AI Summary Error]', err);
      setGenError(err.message || "Une erreur d'appel d'API Gemini s'est produite.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Vocalizing of the summary
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

    // Strip Markdown symbols and emojis to render cleaner raw speech
    const cleanText = textToSpeak
      .replace(/[#*`~_\-]/g, ' ') // strip markdown syntactics
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ''); // strip emojis

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = documentBook.language || 'fr';
    
    // Attempt to match current reading settings
    utterance.rate = documentBook.speechRate || 1.1;
    utterance.pitch = documentBook.speechPitch || 1.0;
    
    if (documentBook.voiceURI) {
      const allVoices = window.speechSynthesis.getVoices();
      const match = allVoices.find(v => v.voiceURI === documentBook.voiceURI);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      setIsSpeakingSummary(false);
    };
    utterance.onerror = () => {
      setIsSpeakingSummary(false);
    };

    setIsSpeakingSummary(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(e => console.error(e));
  };

  const handleClearSummary = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingSummary(false);

    const updatedBook = { ...documentBook };
    if (summaryTarget === 'chapter') {
      updatedBook.chapters = documentBook.chapters.map((ch, idx) => {
        if (idx === currentChapterIndex) {
          return { ...ch, summary: undefined };
        }
        return ch;
      });
    } else {
      updatedBook.summary = undefined;
    }
    onUpdateBook(updatedBook);
  };

  // Custom high-quality, lightweight markdown renderer
  const renderFormattedSummary = (markdownText: string) => {
    if (!markdownText) return null;
    return markdownText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      // H3 (### Header)
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-[11px] font-black text-[#646cff] dark:text-[#a5b4fc] mt-4 mb-1.5 font-sans uppercase tracking-wider block">
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      // H2 or H1 (## Header)
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <h3 key={idx} className="text-sm font-black text-[#525aff] dark:text-[#818cf8] mt-4 mb-2 font-sans tracking-tight block">
            {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }
      // Bullet point (* or -)
      if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const cleanLine = trimmed.replace(/^[*•-]\s*/, '');
        return (
          <li key={idx} className="list-none pl-4 relative my-1.5 text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
            <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#646cff]" />
            {renderBoldText(cleanLine)}
          </li>
        );
      }
      
      return (
        <p key={idx} className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed my-1.5 font-sans">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (lineText: string) => {
    const parts = lineText.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-[#111] dark:text-white">{part}</strong>;
      }
      return part;
    });
  };

  // Determine if active target currently has a cached summary
  const getCachedSummary = () => {
    if (summaryTarget === 'chapter') {
      return documentBook.chapters[currentChapterIndex]?.summary || null;
    }
    return documentBook.summary || null;
  };

  const currentCachedSummary = getCachedSummary();

  const loadingMessages = [
    "Analyse de la structure littéraire...",
    "Extraction des informations essentielles...",
    "Simplification et mise en page conviviale...",
    "Finalisation du résumé par Gemini..."
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-[#E5E3DF] dark:bg-stone-950 dark:border-stone-900">
      {/* Tab Select Header Panel */}
      <div className="grid grid-cols-4 border-b border-stone-200 dark:border-stone-900 select-none bg-[#F5F2ED] dark:bg-stone-950/60 sticky top-0 z-10">
        {(
          [
            { id: 'toc', label: 'Sommaire', icon: BookOpen },
            { id: 'search', label: 'Recherche', icon: Search },
            { id: 'bookmarks', label: 'Signets', icon: Bookmark },
            { id: 'summary', label: 'Résumé IA', icon: Sparkles },
          ] as { id: TabType; label: string; icon: any }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-1 flex flex-col items-center justify-center border-b-2 text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#646cff] text-[#646cff] dark:text-[#767fff] bg-[#eae6e0] dark:bg-stone-900/40 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100/40 dark:hover:bg-stone-900/10'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 mb-1 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content pane */}
      <div className="flex-grow overflow-y-auto p-4 flex flex-col min-h-0">
        {activeTab === 'toc' && (
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2 px-1">
              Sections du document
            </h3>
            {documentBook.chapters.map((chapter, idx) => {
              const isActive = idx === currentChapterIndex;
              const isRead = idx < currentChapterIndex;
              
              return (
                <button
                  key={chapter.id}
                  onClick={() => onChapterSelect(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer ${
                    isActive
                      ? 'border-[#646cff]/40 bg-[#646cff]/10 text-stone-900 font-extrabold dark:bg-[#646cff]/5 dark:text-stone-250'
                      : 'border-transparent text-stone-850 dark:text-stone-300 hover:bg-[#eae6e0]/60 dark:hover:bg-stone-950/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 font-sans">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded bg-stone-150 dark:bg-stone-900">
                      {isRead ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-[10px] font-mono">{idx + 1}</span>
                      )}
                    </span>
                    <span className="truncate pr-1">{chapter.title}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-stone-400 flex-shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher des termes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-stone-250 dark:border-stone-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#646cff] focus:border-[#646cff] dark:bg-stone-950 dark:text-stone-200"
              />
            </div>

            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-stone-450 dark:text-stone-500 px-1 font-bold uppercase">
                  {results.length} occurrence{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''} :
                </p>
                <div className="space-y-2">
                  {results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => onJumpToLocation(res.chapterIndex, res.paragraphIndex)}
                      className="w-full text-left p-2.5 bg-white dark:bg-stone-900/30 border border-stone-150 dark:border-stone-900 rounded-xl hover:border-[#646cff]/40 dark:hover:border-[#646cff]/20 transition-all cursor-pointer block text-xs"
                    >
                      <div className="flex justify-between text-[10px] font-bold text-[#646cff] dark:text-[#767fff] mb-1">
                        <span className="truncate max-w-[150px]">{res.chapterTitle}</span>
                        <span>Para. {res.paragraphIndex + 1}</span>
                      </div>
                      <p className="text-stone-600 line-clamp-3 leading-relaxed dark:text-stone-400 italic">
                        "{highlightQuery(res.text, searchQuery)}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <Search className="w-8 h-8 mx-auto stroke-1 text-stone-300 dark:text-stone-700" />
                <p className="text-[10px] mt-2 font-medium px-4">Tapez au moins 2 lettres pour lancer la recherche textuelle.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-1">
                Notes & Signets ({bookmarks.length})
              </h3>
              <button
                onClick={() => setShowNoteEditor(!showNoteEditor)}
                className="text-[10px] bg-stone-150 text-stone-850 px-2.5 py-1 rounded-lg border border-stone-250 dark:border-stone-900 hover:bg-[#eae6e0] dark:bg-stone-900 dark:text-stone-200 font-bold cursor-pointer font-sans"
              >
                + Ajouter note
              </button>
            </div>

            {showNoteEditor && (
              <div className="p-3 bg-white border border-dashed border-stone-300 rounded-xl dark:bg-stone-900/30 dark:border-stone-800 space-y-3">
                <p className="text-[10px] text-stone-400 font-semibold font-sans">
                  Créer une note sur le paragraphe actif :
                </p>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Saisissez votre commentaire..."
                  className="w-full p-2 text-xs border border-stone-250 dark:border-stone-800 focus:border-[#646cff] focus:outline-none rounded-lg dark:bg-stone-950 dark:text-stone-200"
                  rows={3}
                />
                <div className="flex justify-end space-x-2 text-xs">
                  <button
                    onClick={() => {
                      setShowNoteEditor(false);
                      setNoteInput('');
                    }}
                    className="px-2.5 py-1 text-stone-455 hover:text-stone-700 cursor-pointer font-bold text-[10px]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveNoteBookmark}
                    className="px-2.5 py-1 bg-[#646cff] text-white font-bold rounded-lg hover:bg-[#525aff] transition-colors cursor-pointer text-[10px]"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            {bookmarks.length > 0 ? (
              <div className="space-y-2.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="group flex flex-col p-3 bg-white border border-stone-200 rounded-xl hover:shadow-sm dark:bg-[#111] dark:border-stone-900 transition-all text-xs"
                  >
                    <div className="flex justify-between items-center mb-1 font-sans">
                      <span className="text-[10px] font-semibold text-stone-400 font-mono">
                        Sec. {bm.chapterIndex + 1} — Para. {bm.paragraphIndex + 1}
                      </span>
                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        title="Supprimer ce signet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p
                      onClick={() => onJumpToLocation(bm.chapterIndex, bm.paragraphIndex)}
                      className="text-stone-700 cursor-pointer hover:text-[#646cff] font-serif leading-relaxed line-clamp-2 italic border-l-2 border-[#646cff] pl-2 dark:text-stone-300 dark:hover:text-[#767fff]"
                    >
                      "{bm.textSnippet}"
                    </p>

                    {bm.note && (
                      <div className="mt-2 p-2 bg-[#646cff]/5 rounded-lg border border-[#646cff]/10 text-stone-700 dark:bg-stone-950/50 dark:border-stone-900 dark:text-stone-300">
                        <span className="font-extrabold text-[10px] text-[#646cff] block mb-0.5 uppercase tracking-wide">Note :</span>
                        {bm.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                <Bookmark className="w-8 h-8 mx-auto stroke-1 text-stone-300 dark:text-stone-750" />
                <p className="text-[10px] mt-2 font-medium px-4">Aucun signet enregistré. Ajoutez des notes pour suivre vos réflexions !</p>
              </div>
            )}
          </div>
        )}

        {/* AI SUMMARY TAB (FRENCH, INTUITIVE, HIGH CONFLICT RESILIENT) */}
        {activeTab === 'summary' && (
          <div className="space-y-4 flex-grow flex flex-col min-h-0">
            {/* Control Panel: Configuration / Selection */}
            <div className="p-3 bg-white dark:bg-stone-900/20 border border-stone-200 dark:border-stone-900 rounded-xl space-y-3 flex-shrink-0">
              {/* Target Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                  Étendue de l'analyse
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSummaryTarget('chapter')}
                    className={`p-2 py-1.5 rounded-lg text-[10.5px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      summaryTarget === 'chapter'
                        ? 'bg-[#646cff]/10 border-[#646cff] text-[#646cff] dark:text-[#767fff]'
                        : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-900 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    Section actuelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryTarget('book')}
                    disabled={documentBook.chapters.length <= 1}
                    className={`p-2 py-1.5 rounded-lg text-[10.5px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      summaryTarget === 'book'
                        ? 'bg-[#646cff]/10 border-[#646cff] text-[#646cff] dark:text-[#767fff]'
                        : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-900 text-stone-600 hover:bg-stone-100'
                    }`}
                    title={documentBook.chapters.length <= 1 ? "Résume l'ensemble des sections s'il y en a plusieurs" : ""}
                  >
                    <BookOpen className="w-3 h-3" />
                    Tout le document
                  </button>
                </div>
              </div>

              {/* Tone/Format Selection */}
              <div className="space-y-1.5 pt-1.5 border-t border-stone-100 dark:border-stone-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                  Style du résumé
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'standard', label: 'Équilibré', desc: 'Synthèse fluide' },
                      { id: 'bullet', label: 'Points Clés', desc: 'Idées fortes en puces' },
                      { id: 'simple', label: 'Pédagogique', desc: 'Notions vulgarisées' },
                      { id: 'short', label: 'Court', desc: 'Un seul paragraphe' },
                    ] as const
                  ).map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSummaryTone(style.id)}
                      className={`p-2 py-1 flex flex-col items-center justify-center text-center border rounded-lg transition-all cursor-pointer ${
                        summaryTone === style.id
                          ? 'bg-[#646cff]/10 border-[#646cff] text-[#646cff] dark:text-[#767fff]'
                          : 'bg-stone-50 dark:bg-stone-950 border-stone-100 dark:border-stone-900 text-stone-600 hover:bg-stone-100/65'
                      }`}
                    >
                      <span className="text-[10.5px] font-bold">{style.label}</span>
                      <span className="text-[8px] opacity-75 font-sans leading-none mt-0.5">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Area: Render Summary, Empty Placeholders, Loading States */}
            <div className="flex-grow flex flex-col min-h-0 min-w-0">
              {isGenerating ? (
                /* Advanced Loading Mode with cycling checkpoints */
                <div className="flex-grow flex flex-col items-center justify-center p-6 border border-dashed border-stone-250 dark:border-stone-900 rounded-xl bg-[#F5F2ED]/50 dark:bg-stone-950/20 text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-stone-200 dark:border-stone-800 animate-pulse absolute" />
                    <Sparkles className="w-6 h-6 text-[#646cff] dark:text-[#767fff] animate-spin duration-[4s]" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-stone-900 dark:text-white font-sans">
                      Génération du résumé par IA...
                    </p>
                    <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 transition-all duration-300 font-mono tracking-wide h-6">
                      {loadingMessages[loadingStep]}
                    </p>
                  </div>
                </div>
              ) : genError ? (
                /* Clean error handling card */
                <div className="p-4 bg-red-400/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[11px] text-red-500 font-sans">Génération impossible</h4>
                      <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                        {genError}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    className="w-full py-2 bg-stone-950 hover:bg-stone-900 border border-stone-850 hover:border-red-500/30 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono tracking-wider transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Réessayer la génération
                  </button>
                </div>
              ) : currentCachedSummary ? (
                /* Generated Summary Presentation Card */
                <div className="flex-grow flex flex-col min-h-0 bg-white dark:bg-stone-955 border border-stone-250 dark:border-stone-900 rounded-xl overflow-hidden shadow-inner">
                  {/* Summary Controls Ribbon */}
                  <div className="flex items-center justify-between p-2 py-1.5 bg-stone-50 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-900 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-stone-450 dark:text-stone-500 text-[9px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#646cff]" />
                      Résumé Prêt
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {/* Hear TTS */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeakSummary(currentCachedSummary)}
                        className={`p-1.5 px-2.5 rounded-md flex items-center gap-1 cursor-pointer font-extrabold transition-all text-[9.5px] ${
                          isSpeakingSummary 
                            ? 'bg-red-500 text-white' 
                            : 'bg-[#646cff]/10 hover:bg-[#646cff]/20 text-[#646cff] dark:text-[#767fff]'
                        }`}
                        title={isSpeakingSummary ? "Arrêter la lecture audio" : "Écouter le résumé de synthèse"}
                      >
                        {isSpeakingSummary ? (
                          <>
                            <Square className="w-2.5 h-2.5 fill-current" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            Écouter
                          </>
                        )}
                      </button>

                      {/* Copy summary */}
                      <button
                        type="button"
                        onClick={() => handleCopySummary(currentCachedSummary)}
                        className="p-1 px-1.5 hover:bg-stone-150 dark:hover:bg-stone-900 text-stone-500 hover:text-stone-900 dark:text-stone-450 dark:hover:text-white rounded transition-colors cursor-pointer"
                        title="Copier le résumé"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Clear/Delete caching summary */}
                      <button
                        type="button"
                        onClick={handleClearSummary}
                        className="p-1 px-1.5 hover:bg-red-50 hover:text-red-500 text-stone-450 rounded transition-colors cursor-pointer"
                        title="Réinitialiser ce résumé"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Text Content Scroller */}
                  <div className="flex-grow overflow-y-auto p-3.5 prose prose-stone dark:prose-invert max-w-none bg-[#FDFDFD] dark:bg-stone-950/20 scrollbar-thin">
                    <div className="space-y-2">
                      {renderFormattedSummary(currentCachedSummary)}
                    </div>
                    {/* Tiny feedback message on copy */}
                    {copySuccess && (
                      <div className="fixed bottom-24 right-6 bg-emerald-500 text-white font-mono text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl animate-bounce">
                        Résumé copié !
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Summary Onboarding screen */
                <div className="flex-grow flex flex-col items-center justify-center p-6 border border-dashed border-stone-250 dark:border-stone-900 rounded-xl bg-[#F5F2ED]/50 dark:bg-stone-950/20 text-center space-y-3.5">
                  <div className="p-3.5 bg-white dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-900 text-[#646cff] drop-shadow-sm hover:scale-105 transition-transform duration-300">
                    <Sparkles className="w-7 h-7 stroke-1" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-stone-900 dark:text-white font-sans">
                      {summaryTarget === 'chapter' ? "Découvrir la section en un clin d'œil" : "Générer un résumé global"}
                    </h4>
                    <p className="text-[10px] text-stone-450 dark:text-stone-500 leading-normal max-w-[210px] mx-auto font-sans">
                      {summaryTarget === 'chapter' 
                        ? "L'IA va lire le chapitre en cours pour vous présenter ses idées majeures de manière intuitive."
                        : "L'IA va assembler la structure globale du livre pour vous restituer son fil d'idées principal."
                      }
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    className="w-full py-3 bg-[#646cff] hover:bg-[#525aff] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider font-mono shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Générer mon résumé IA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
