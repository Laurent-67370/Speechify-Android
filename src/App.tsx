import { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, X, ChevronLeft, VolumeX, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, UserSettings, Bookmark, Chapter } from './types';
import { splitIntoSentences } from './utils/textUtils';
import { SAMPLES } from './data/samples';
import DocumentUpload from './components/DocumentUpload';
import Sidebar from './components/Sidebar';
import TextViewer from './components/TextViewer';
import ReaderControls from './components/ReaderControls';
import ReaderSettings from './components/ReaderSettings';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'sepia',
  fontFamily: 'serif',
  fontSize: 110,
  lineHeight: 'relaxed',
  autoScroll: true,
  highlightColor: 'rgba(245, 158, 11, 0.25)', // Amber matching professional polish theme
  speechRate: 1.1,
  speechPitch: 1.0,
  saveVoicePerDocument: true,
};

export default function App() {
  // State managers
  const [activeBook, setActiveBook] = useState<DocumentBook | null>(null);
  const [recentBooks, setRecentBooks] = useState<DocumentBook[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWelcomeHelp, setShowWelcomeHelp] = useState(false);

  // Speech tracker states
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentParagraphIdx, setCurrentParagraphIdx] = useState(0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // References to keep speech callbacks synced with state values
  const speechStateRef = useRef({
    isPlaying: false,
    chapterIdx: 0,
    paragraphIdx: 0,
    sentenceIdx: 0,
    settings: DEFAULT_SETTINGS,
    activeBook: null as DocumentBook | null,
  });

  // Sync references with React state to access inside async synthesizer event callbacks
  useEffect(() => {
    speechStateRef.current = {
      isPlaying,
      chapterIdx: currentChapterIdx,
      paragraphIdx: currentParagraphIdx,
      sentenceIdx: currentSentenceIdx,
      settings,
      activeBook,
    };
  }, [isPlaying, currentChapterIdx, currentParagraphIdx, currentSentenceIdx, settings, activeBook]);

  // 1. Initial configuration load from LocalStorage
  useEffect(() => {
    try {
      const savedBooks = localStorage.getItem('liseuse_recent_books_v1');
      if (savedBooks) {
        setRecentBooks(JSON.parse(savedBooks));
      }

      const savedSettings = localStorage.getItem('liseuse_settings_v1');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      const savedBookmarks = localStorage.getItem('liseuse_bookmarks_v1');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
    } catch (e) {
      console.error('Failed to parse localStorage caches.', e);
    }

    // Set sidebar open on widescreen display (PC) by default, close on smaller tablets/smartphones
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // 2. Persist recent books and bookmarks whenever updated
  const saveRecentBooks = (books: DocumentBook[]) => {
    setRecentBooks(books);
    try {
      localStorage.setItem('liseuse_recent_books_v1', JSON.stringify(books));
    } catch (e) {
      console.error(e);
    }
  };

  const saveBookmarks = (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem('liseuse_bookmarks_v1', JSON.stringify(newBookmarks));
    } catch (e) {
      console.error(e);
    }
  };

  // Save specific reading progress of the active book
  const updateProgress = (chapterIdx: number, paragraphIdx: number) => {
    if (!activeBook) return;

    const totalChapters = activeBook.chapters.length;
    const currentChapter = activeBook.chapters[chapterIdx];
    const totalChapterParagraphs = currentChapter ? currentChapter.paragraphs.length : 1;
    
    // Smooth progress formulation
    const chapterWeight = 100 / totalChapters;
    const currentChapterBase = chapterIdx * chapterWeight;
    const paragraphAddition = (paragraphIdx / totalChapterParagraphs) * chapterWeight;
    const percentage = Math.min(100, Math.max(0, currentChapterBase + paragraphAddition));

    const updatedBook: DocumentBook = {
      ...activeBook,
      currentChapterIndex: chapterIdx,
      currentParagraphIndex: paragraphIdx,
      progressPercent: percentage,
    };

    setActiveBook(updatedBook);

    // Save into history pool
    const filtered = recentBooks.filter(b => b.id !== activeBook.id);
    saveRecentBooks([updatedBook, ...filtered].slice(0, 10)); // Keep last 10
  };

  // 3. Core speech synthesis runner
  const speakCurrentSegment = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Terminate any ongoing audio structures
    window.speechSynthesis.cancel();

    const state = speechStateRef.current;
    if (!state.activeBook) return;

    const chapter = state.activeBook.chapters[state.chapterIdx];
    if (!chapter) return;

    const paragraph = chapter.paragraphs[state.paragraphIdx];
    if (!paragraph) return;

    const sentences = splitIntoSentences(paragraph);
    const sentenceToRead = sentences[state.sentenceIdx];
    
    // If no text, skip forward
    if (!sentenceToRead || sentenceToRead.trim().length === 0) {
      handleNextSentence();
      return;
    }

    // Instantiate Utterance object
    const utterance = new SpeechSynthesisUtterance(sentenceToRead);
    utterance.lang = state.activeBook.language || 'fr';
    utterance.rate = state.settings.speechRate;
    utterance.pitch = state.settings.speechPitch;

    // Apply voice binding
    if (state.settings.voiceURI) {
      const allVoices = window.speechSynthesis.getVoices();
      const matched = allVoices.find(v => v.voiceURI === state.settings.voiceURI);
      if (matched) {
        utterance.voice = matched;
      }
    }

    // Bind playback progress callbacks
    utterance.onend = () => {
      // Execute only if we description playback remains active
      if (speechStateRef.current.isPlaying) {
        handleNextSentence();
      }
    };

    utterance.onerror = (evt) => {
      // Do not error out on manual triggers
      if (evt.error !== 'interrupted') {
        console.error('Speech synthesis execution errored:', evt);
        // Fallback or restart synthesis gently
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Cancel synthesis on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Watch playback trigger, fire utterance whenever active location shifts
  useEffect(() => {
    if (isPlaying) {
      speakCurrentSegment();
    }
  }, [isPlaying, currentChapterIdx, currentParagraphIdx, currentSentenceIdx]);

  // Pause or Resume trigger
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Clears channel safely
      }
    } else {
      setIsPlaying(true);
      // Fires speech via hook reaction
    }
  };

  // Stops reading entirely and resets to paragraph origin
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentSentenceIdx(0);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Playback Navigation skips
  const handleNextSentence = () => {
    if (!activeBook) return;

    const chapter = activeBook.chapters[currentChapterIdx];
    if (!chapter) return;

    const paragraph = chapter.paragraphs[currentParagraphIdx];
    const sentences = splitIntoSentences(paragraph);

    if (currentSentenceIdx + 1 < sentences.length) {
      // Next sentence in paragraph
      setCurrentSentenceIdx(currentSentenceIdx + 1);
    } else if (currentParagraphIdx + 1 < chapter.paragraphs.length) {
      // Next paragraph, first sentence
      setCurrentParagraphIdx(currentParagraphIdx + 1);
      setCurrentSentenceIdx(0);
      updateProgress(currentChapterIdx, currentParagraphIdx + 1);
    } else if (currentChapterIdx + 1 < activeBook.chapters.length) {
      // Next chapter, first paragraph
      setCurrentChapterIdx(currentChapterIdx + 1);
      setCurrentParagraphIdx(0);
      setCurrentSentenceIdx(0);
      updateProgress(currentChapterIdx + 1, 0);
    } else {
      // End of document
      setIsPlaying(false);
      setCurrentSentenceIdx(0);
      setCurrentParagraphIdx(0);
      setCurrentChapterIdx(0);
      updateProgress(0, 0);
      alert('Fin de la lecture du document !');
    }
  };

  const handlePreviousSentence = () => {
    if (!activeBook) return;

    if (currentSentenceIdx > 0) {
      setCurrentSentenceIdx(currentSentenceIdx - 0.5 < 0 ? 0 : currentSentenceIdx - 1);
    } else if (currentParagraphIdx > 0) {
      // Previous paragraph, last sentence
      const prevParagraphIdx = currentParagraphIdx - 1;
      const chapter = activeBook.chapters[currentChapterIdx];
      const prevParagraph = chapter.paragraphs[prevParagraphIdx];
      const prevSentences = splitIntoSentences(prevParagraph);

      setCurrentParagraphIdx(prevParagraphIdx);
      setCurrentSentenceIdx(Math.max(0, prevSentences.length - 1));
      updateProgress(currentChapterIdx, prevParagraphIdx);
    } else if (currentChapterIdx > 0) {
      // Previous chapter, last paragraph
      const prevChapterIdx = currentChapterIdx - 1;
      const prevChapter = activeBook.chapters[prevChapterIdx];
      const prevParagraphIdx = Math.max(0, prevChapter.paragraphs.length - 1);
      const prevParagraph = prevChapter.paragraphs[prevParagraphIdx];
      const prevSentences = splitIntoSentences(prevParagraph);

      setCurrentChapterIdx(prevChapterIdx);
      setCurrentParagraphIdx(prevParagraphIdx);
      setCurrentSentenceIdx(Math.max(0, prevSentences.length - 1));
      updateProgress(prevChapterIdx, prevParagraphIdx);
    }
  };

  // Jump to raw coordinates via TOC or Search selection
  const handleJumpToLocation = (chapterIdx: number, paragraphIdx: number, sentenceIdx = 0) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setCurrentChapterIdx(chapterIdx);
    setCurrentParagraphIdx(paragraphIdx);
    setCurrentSentenceIdx(sentenceIdx);
    updateProgress(chapterIdx, paragraphIdx);

    // If already reading, it will speak automatically on trigger. If not, wait for Play gesture
  };

  // Save changes to settings
  const handleSettingsChange = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem('liseuse_settings_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Save on activeBook if saveVoicePerDocument is active
    if (activeBook && updated.saveVoicePerDocument) {
      const updatedBook: DocumentBook = {
        ...activeBook,
      };
      
      let hasBookChange = false;
      if (newSettings.voiceURI !== undefined) {
        updatedBook.voiceURI = newSettings.voiceURI;
        hasBookChange = true;
      }
      if (newSettings.speechRate !== undefined) {
        updatedBook.speechRate = newSettings.speechRate;
        hasBookChange = true;
      }
      if (newSettings.speechPitch !== undefined) {
        updatedBook.speechPitch = newSettings.speechPitch;
        hasBookChange = true;
      }

      if (hasBookChange) {
        setActiveBook(updatedBook);
        const filtered = recentBooks.filter(b => b.id !== activeBook.id);
        saveRecentBooks([updatedBook, ...filtered].slice(0, 10));
      }
    }

    // Apply speech parameter shifts immediately if playing
    if (isPlaying && (newSettings.speechRate !== undefined || newSettings.speechPitch !== undefined || newSettings.voiceURI !== undefined)) {
      speakCurrentSegment();
    }
  };

  // Local storage bookmarks handling
  const handleAddBookmark = (noteText?: string) => {
    if (!activeBook) return;
    
    const chapter = activeBook.chapters[currentChapterIdx];
    const paragraphText = chapter?.paragraphs[currentParagraphIdx] || '';
    const snippet = paragraphText.substring(0, 100) + (paragraphText.length > 100 ? '...' : '');

    const newBookmark: Bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      documentId: activeBook.id,
      chapterIndex: currentChapterIdx,
      paragraphIndex: currentParagraphIdx,
      textSnippet: snippet,
      note: noteText,
      createdAt: Date.now(),
    };

    saveBookmarks([newBookmark, ...bookmarks]);
  };

  const handleQuickBookmarkToggle = (paragraphIdx: number) => {
    if (!activeBook) return;

    const isBookmarked = bookmarks.some(
      b => b.documentId === activeBook.id && b.chapterIndex === currentChapterIdx && b.paragraphIndex === paragraphIdx
    );

    if (isBookmarked) {
      // Remove it
      const filtered = bookmarks.filter(
        b => !(b.documentId === activeBook.id && b.chapterIndex === currentChapterIdx && b.paragraphIndex === paragraphIdx)
      );
      saveBookmarks(filtered);
    } else {
      // Add quickly
      const chapter = activeBook.chapters[currentChapterIdx];
      const paragraphText = chapter?.paragraphs[paragraphIdx] || '';
      const snippet = paragraphText.substring(0, 100) + (paragraphText.length > 100 ? '...' : '');

      const newBookmark: Bookmark = {
        id: `bookmark_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        documentId: activeBook.id,
        chapterIndex: currentChapterIdx,
        paragraphIndex: paragraphIdx,
        textSnippet: snippet,
        createdAt: Date.now(),
      };
      saveBookmarks([newBookmark, ...bookmarks]);
    }
  };

  const isParagraphBookmarked = (paragraphIdx: number) => {
    if (!activeBook) return false;
    return bookmarks.some(
      b => b.documentId === activeBook.id && b.chapterIndex === currentChapterIdx && b.paragraphIndex === paragraphIdx
    );
  };

  const handleDeleteBookmark = (id: string) => {
    saveBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const handleDeleteBook = (id: string) => {
    saveRecentBooks(recentBooks.filter(b => b.id !== id));
    saveBookmarks(bookmarks.filter(b => b.documentId !== id));
  };

  // Launch a book (sample or upload)
  const handleSelectBook = (book: DocumentBook) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setActiveBook(book);
    setCurrentChapterIdx(book.currentChapterIndex || 0);
    setCurrentParagraphIdx(book.currentParagraphIndex || 0);
    setCurrentSentenceIdx(0);
    setIsPlaying(false);
    setSettingsOpen(false);

    // Close the sidebar on mobile and tablets when launching a book so they can see the text
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    // Apply document-specific voice parameters if saveVoicePerDocument is enabled
    if (settings.saveVoicePerDocument) {
      const voiceURI = book.voiceURI || undefined;
      const speechRate = book.speechRate || DEFAULT_SETTINGS.speechRate;
      const speechPitch = book.speechPitch || DEFAULT_SETTINGS.speechPitch;
      setSettings(prev => ({
        ...prev,
        voiceURI: voiceURI !== undefined ? voiceURI : prev.voiceURI,
        speechRate,
        speechPitch,
      }));
    }
  };

  const handleSelectBookmark = (bookmark: Bookmark) => {
    let targetBook = recentBooks.find(b => b.id === bookmark.documentId);
    if (!targetBook) {
      targetBook = SAMPLES.find(s => s.id === bookmark.documentId);
    }

    if (targetBook) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      setActiveBook(targetBook);
      setCurrentChapterIdx(bookmark.chapterIndex);
      setCurrentParagraphIdx(bookmark.paragraphIndex);
      setCurrentSentenceIdx(0);
      setIsPlaying(false);
      setSettingsOpen(false);

      // Close the sidebar on mobile and tablets when launching a bookmark so they can see the text
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }

      // Apply document-specific voice overrides
      if (settings.saveVoicePerDocument) {
        const voiceURI = targetBook.voiceURI || undefined;
        const speechRate = targetBook.speechRate || DEFAULT_SETTINGS.speechRate;
        const speechPitch = targetBook.speechPitch || DEFAULT_SETTINGS.speechPitch;
        setSettings(prev => ({
          ...prev,
          voiceURI: voiceURI !== undefined ? voiceURI : prev.voiceURI,
          speechRate,
          speechPitch,
        }));
      }
    }
  };

  const handleDocumentAdded = (book: DocumentBook) => {
    // Add to library
    const updatedLibrary = [book, ...recentBooks.filter(b => b.id !== book.id)];
    saveRecentBooks(updatedLibrary);
    
    // Jump straight to reading mode
    handleSelectBook(book);
  };

  const logoutCurrentBook = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveBook(null);
  };

  const activeChapter = activeBook?.chapters[currentChapterIdx];
  const activeBookBookmarks = bookmarks.filter(b => b.documentId === activeBook?.id);

  // Formatting chapter progress label
  const getChapterProgressText = () => {
    if (!activeBook) return '';
    const chapterLabel = activeBook.type === 'pdf' ? '' : 'Section ';
    const current = currentChapterIdx + 1;
    const total = activeBook.chapters.length;
    return `${chapterLabel}${current} sur ${total} : ${activeChapter?.title || ''}`;
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 select-none ${
      settings.theme === 'dark' ? 'bg-[#0f0e0d] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
    }`}>
      {/* 1. Global Navigation Navbar */}
      <header className="flex-shrink-0 flex justify-between items-center py-4 px-6 md:px-8 border-b border-stone-800 bg-[#1C1917] text-stone-200 transition-colors">
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={logoutCurrentBook}>
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-stone-900 font-extrabold shadow-md shadow-amber-500/20">
            <span>V</span>
          </div>
          <div>
            <span className="font-extrabold text-white text-base font-sans tracking-tight">
              VoxRead Pro
            </span>
            <p className="text-[9px] font-bold text-amber-500 uppercase font-mono tracking-widest">
              Liseuse Multilingue
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {activeBook && (
            <button
              onClick={logoutCurrentBook}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-800 rounded-xl bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Library className="w-4 h-4" />
              <span>Ma Bibliothèque</span>
            </button>
          )}
          <button
            onClick={() => setShowWelcomeHelp(true)}
            className="p-2 text-stone-400 hover:text-amber-500 rounded-xl transition-colors cursor-pointer"
            title="Aide d'utilisation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Persistent global progress bar under the navigation bar when a document is active */}
      <AnimatePresence>
        {activeBook && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 bg-[#F5F2ED] dark:bg-[#151312] border-b border-stone-200 dark:border-stone-850 py-2.5 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs transition-colors overflow-hidden"
          >
            <div className="flex items-center space-x-2.5 min-w-0 mb-2 sm:mb-0">
              <span className="font-serif font-extrabold text-[#2D2926] dark:text-stone-100 truncate text-[13px]">
                📖 {activeBook.title}
              </span>
              <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wide flex-shrink-0">
                Section {currentChapterIdx + 1}/{activeBook.chapters.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0 sm:w-[260px] w-full">
              {/* Progress track */}
              <div className="flex-grow bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  className="absolute top-0 left-0 bg-amber-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${activeBook.progressPercent || 0}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-mono font-black text-amber-600 dark:text-amber-400 min-w-[40px] text-right">
                {Math.round(activeBook.progressPercent || 0)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Reader Space */}
      <div className="flex-grow flex overflow-hidden min-h-0 relative">
        <AnimatePresence mode="wait">
          {!activeBook ? (
            /* Upload Screen Selection */
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full overflow-y-auto"
            >
              <DocumentUpload
                onDocumentAdded={handleDocumentAdded}
                onSelectSample={handleSelectBook}
                recentBooks={recentBooks}
                bookmarks={bookmarks}
                onSelectBookmark={handleSelectBookmark}
                onDeleteBook={handleDeleteBook}
              />
            </motion.div>
          ) : (
            /* Active Reader Interface */
            <motion.div
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex h-full overflow-hidden"
            >
              {/* Collapsible Left navigation Sidebar */}
              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <>
                    {/* Backdrop cover for mobile devices and tablets */}
                    <div
                      className="absolute inset-0 bg-black/45 backdrop-blur-sm z-40 lg:hidden"
                      onClick={() => setSidebarOpen(false)}
                    ></div>
                    
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                      className="absolute lg:static left-0 top-0 bottom-0 w-[310px] h-full bg-[#F9F8F6] dark:bg-[#0f0e0d] border-r border-stone-200 dark:border-stone-900 z-50 flex flex-col shadow-2xl lg:shadow-none"
                    >
                      {/* Close Header for Mobile and Tablets */}
                      <div className="lg:hidden flex justify-between items-center p-3.5 border-b border-stone-200 dark:border-stone-850 bg-[#F5F2ED] dark:bg-[#151312]">
                        <span className="font-serif font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Sommaire & Outils</span>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          className="p-1 px-2.5 bg-stone-150 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-[10px] font-black tracking-wide font-sans transition-all cursor-pointer"
                        >
                          FERMER
                        </button>
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <Sidebar
                          documentBook={activeBook}
                          currentChapterIndex={currentChapterIdx}
                          currentParagraphIndex={currentParagraphIdx}
                          onChapterSelect={(idx) => {
                            handleJumpToLocation(idx, 0);
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false);
                            }
                          }}
                          bookmarks={activeBookBookmarks}
                          onAddBookmark={handleAddBookmark}
                          onDeleteBookmark={handleDeleteBookmark}
                          onJumpToLocation={(cIdx, pIdx) => {
                            handleJumpToLocation(cIdx, pIdx);
                            if (window.innerWidth < 1024) {
                              setSidebarOpen(false);
                            }
                          }}
                        />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Central Reading document sheet */}
              <div className="flex-grow h-full overflow-y-auto flex flex-col relative">
                {activeChapter ? (
                  <TextViewer
                    chapter={activeChapter}
                    currentParagraphIndex={currentParagraphIdx}
                    currentSentenceIndex={currentSentenceIdx}
                    isPlaying={isPlaying}
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onLocationSelect={(pIdx, sIdx) => handleJumpToLocation(currentChapterIdx, pIdx, sIdx)}
                    onQuickBookmark={handleQuickBookmarkToggle}
                    isParagraphBookmarked={isParagraphBookmarked}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <VolumeX className="w-12 h-12 stroke-1 text-red-400 animate-bounce" />
                    <p className="mt-4 text-sm">Aucun texte lisible dans cette section.</p>
                  </div>
                )}
              </div>

              {/* Collapsible Right visual Settings panel */}
              <AnimatePresence>
                {settingsOpen && (
                  <>
                    {/* Backdrop cover for mobile devices and tablets */}
                    <div
                      className="absolute inset-0 bg-black/45 backdrop-blur-sm z-45 lg:hidden"
                      onClick={() => setSettingsOpen(false)}
                    ></div>
                    
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                      className="absolute lg:static right-0 top-0 bottom-0 w-[290px] h-full bg-[#F9F8F6] dark:bg-[#0f0e0d] border-l border-stone-200 dark:border-stone-900 p-5 overflow-y-auto z-50 shadow-xl lg:shadow-none"
                    >
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-200 dark:border-stone-800">
                        <h3 className="font-black text-sm text-stone-900 dark:text-stone-100 uppercase tracking-tight font-serif">
                          Options de mise en page
                        </h3>
                        <button
                          onClick={() => setSettingsOpen(false)}
                          className="p-1.5 text-stone-400 hover:text-stone-650 rounded-lg cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <ReaderSettings
                        settings={settings}
                        onSettingsChange={handleSettingsChange}
                        documentLanguage={activeBook.language || 'fr'}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Global Speech Ribbon Controls (floating if book is active) */}
      {activeBook && (
        <div className="flex-shrink-0 z-30">
          <ReaderControls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onPreviousSentence={handlePreviousSentence}
            onNextSentence={handleNextSentence}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            documentLanguage={activeBook.language || 'fr'}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleSettings={() => setSettingsOpen(!settingsOpen)}
            chapterProgressText={getChapterProgressText()}
          />
        </div>
      )}

      {/* 4. Overlay Welcome help guide */}
      <AnimatePresence>
        {showWelcomeHelp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#F9F8F6] dark:bg-[#0f0e0d] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left border border-stone-200 dark:border-stone-850"
            >
              <button
                onClick={() => setShowWelcomeHelp(false)}
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-650 dark:hover:text-stone-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2.5 text-amber-600 dark:text-amber-400 mb-4">
                <BookOpen className="w-6 h-6" />
                <h3 className="text-xl font-bold tracking-tight font-serif">
                  Guide de démarrage
                </h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                <p>
                  Bienvenue dans l'univers de la lecture audio naturelle. Cette application lit vos documents de manière intelligente et fluide, sans aucune connexion nécessaire.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-amber-500 text-stone-900 font-extrabold flex items-center justify-center flex-shrink-0 text-[10px] dark:bg-amber-950/45 dark:text-amber-305">1</span>
                    <p><strong>Chargement facile :</strong> Glissez n'importe quel fichier <strong>PDF</strong> ou <strong>ePUB</strong> (sans verrous DRM) dans le cadre, ou sélectionnez l'un des trois classiques d'exemple.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-amber-500 text-stone-900 font-extrabold flex items-center justify-center flex-shrink-0 text-[10px] dark:bg-amber-950/45 dark:text-amber-305">2</span>
                    <p><strong>Synthèse naturelle hors ligne :</strong> L'application extrait le texte et utilise les voix de votre appareil mobile ou ordinateur. Sélectionnez des voix enrichies dans la liste en bas de l'écran.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-amber-500 text-stone-900 font-extrabold flex items-center justify-center flex-shrink-0 text-[10px] dark:bg-amber-950/45 dark:text-amber-305">3</span>
                    <p><strong>Clic pour lire :</strong> Pendant que vous lisez, vous pouvez cliquer sur <strong>n'importe quelle phrase dans le texte</strong> pour y déplacer instantanément le curseur de lecture vocale.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-amber-500 text-stone-900 font-extrabold flex items-center justify-center flex-shrink-0 text-[10px] dark:bg-amber-950/45 dark:text-amber-305">4</span>
                    <p><strong>Notes & Signets :</strong> Enregistrez des passages importants ou prenez des notes de cours. Tout est sauvegardé au sein de votre navigateur d'une session sur l'autre !</p>
                  </div>
                </div>

                <div className="bg-[#F2EFE9] border border-stone-200 p-3 rounded-xl mt-4 dark:bg-stone-900 dark:border-stone-850 text-[11px] text-stone-550 dark:text-stone-400 font-mono">
                  <p>💡 <em>Note : Certains systèmes d'exploitation (comme iOS et MacOS) demandent un premier geste de clic (Play) avant de charger la totalité des voix système.</em></p>
                </div>
              </div>

              <button
                onClick={() => setShowWelcomeHelp(false)}
                className="w-full mt-6 py-2.5 bg-amber-500 text-stone-950 font-black rounded-xl hover:bg-amber-600 transition-all text-xs cursor-pointer shadow-sm text-center"
              >
                C'est compris, bonne lecture !
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
