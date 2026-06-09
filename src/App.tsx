import { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, X, ChevronLeft, VolumeX, Library, Home, Headphones, Upload, Play, Pause, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, UserSettings, Bookmark, Chapter } from './types';
import { splitIntoSentences } from './utils/textUtils';
import { SAMPLES } from './data/samples';
import DocumentUpload from './components/DocumentUpload';
import Sidebar from './components/Sidebar';
import TextViewer from './components/TextViewer';
import ReaderControls from './components/ReaderControls';
import ReaderSettings from './components/ReaderSettings';
import HomeDashboard from './components/HomeDashboard';
import GutenbergExplorer from './components/GutenbergExplorer';


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
  
  // Tabbed Navigation
  const [currentTab, setCurrentTab] = useState<'accueil' | 'lire' | 'biblio' | 'librairie' | 'importer'>('accueil');
  const [libSubTab, setLibSubTab] = useState<'gutenberg' | 'samples'>('gutenberg');

  // Daily Stats trackers
  const [listeningMinutesToday, setListeningMinutesToday] = useState(0.0);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);

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

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const savedMinutes = localStorage.getItem(`vox_listened_m_${todayStr}`);
      if (savedMinutes) {
        setListeningMinutesToday(parseFloat(savedMinutes));
      }
      const savedGoal = localStorage.getItem('vox_daily_goal_m');
      if (savedGoal) {
        setDailyGoalMinutes(parseInt(savedGoal, 10));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Track actual audio listening elapsed time
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setListeningMinutesToday(prev => {
        const next = Math.round((prev + 1/60) * 100) / 100;
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          localStorage.setItem(`vox_listened_m_${todayStr}`, next.toFixed(2));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Synchronize settings.theme with the root document element for dark mode
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleUpdateDailyGoal = (goal: number) => {
    setDailyGoalMinutes(goal);
    try {
      localStorage.setItem('vox_daily_goal_m', goal.toString());
    } catch (e) {
      console.error(e);
    }
  };


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
    
    // Auto shift to 'lire' tab
    setCurrentTab('lire');

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

      // Auto shift to 'lire' tab
      setCurrentTab('lire');

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

  const handleToggleThemeGlobal = () => {
    handleSettingsChange({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 select-none pb-12 ${
      settings.theme === 'dark' ? 'bg-[#0a0a09] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
    }`}>
      {/* 1. Global Navigation Navbar (Only shown on 'lire' tab when activeBook is loaded) */}
      {currentTab === 'lire' && activeBook && (
        <header className="flex-shrink-0 flex justify-between items-center py-4 px-6 md:px-8 border-b border-stone-800 bg-[#1C1917] text-stone-200 transition-colors">
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setCurrentTab('accueil')}>
            <div className="w-8 h-8 bg-[#646cff] rounded flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-500/20">
              <span>S</span>
            </div>
            <div>
              <span className="font-extrabold text-white text-base font-sans tracking-tight">
                SpeechifyPro
              </span>
              <p className="text-[9px] font-bold text-[#767fff] uppercase font-mono tracking-widest">
                Liseuse Active
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentTab('accueil')}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-880 rounded-xl bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-semibold transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>
            <button
              onClick={() => setShowWelcomeHelp(true)}
              className="p-2 text-stone-400 hover:text-indigo-400 rounded-xl transition-colors cursor-pointer"
              title="Aide d'utilisation"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Persistent global progress bar under the navigation bar when inside 'lire' tab and activeBook is present */}
      <AnimatePresence>
        {currentTab === 'lire' && activeBook && (
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
              <span className="text-[10px] bg-indigo-500/15 text-[#646cff] dark:text-[#767fff] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wide flex-shrink-0">
                Section {currentChapterIdx + 1}/{activeBook.chapters.length}
              </span>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0 sm:w-[260px] w-full">
              {/* Progress track */}
              <div className="flex-grow bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  className="absolute top-0 left-0 bg-[#646cff] h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${activeBook.progressPercent || 0}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-mono font-black text-[#646cff] dark:text-[#767fff] min-w-[40px] text-right">
                {Math.round(activeBook.progressPercent || 0)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Reader Space / Conditional Views */}
      <div className="flex-grow flex overflow-hidden min-h-0 relative">
        <AnimatePresence mode="wait">
          {currentTab === 'accueil' && (
            <motion.div
              key="accueil-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full overflow-hidden"
            >
              <HomeDashboard
                recentBooks={recentBooks}
                activeBook={activeBook}
                isPlaying={isPlaying}
                onPlayPause={(p) => {
                  if (p !== undefined) {
                    if (p) speakCurrentSegment();
                    setIsPlaying(p);
                  } else {
                    handlePlayPause();
                  }
                }}
                onSelectBook={handleSelectBook}
                listeningMinutesToday={listeningMinutesToday}
                dailyGoalMinutes={dailyGoalMinutes}
                onUpdateDailyGoal={handleUpdateDailyGoal}
                onNavigateToTab={setCurrentTab}
                onHelpClick={() => setShowWelcomeHelp(true)}
                theme={settings.theme}
                onThemeToggle={handleToggleThemeGlobal}
              />
            </motion.div>
          )}

          {currentTab === 'biblio' && (
            <motion.div
              key="biblio-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full overflow-y-auto p-4 sm:p-6 pb-24 transition-all duration-300 ${
                settings.theme === 'dark' ? 'bg-[#0a0a09] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
              }`}
            >
              <div className="max-w-3xl mx-auto py-2 space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-stone-900 dark:text-white font-sans tracking-tight">Ma Bibliothèque</h2>
                  <p className="text-stone-400 text-xs mt-1 font-sans font-medium">Tous vos documents importés ({recentBooks.length})</p>
                </div>
                <DocumentUpload
                  onDocumentAdded={(book) => { handleDocumentAdded(book); setCurrentTab('lire'); }}
                  onSelectSample={handleSelectBook}
                  recentBooks={recentBooks}
                  bookmarks={bookmarks}
                  onSelectBookmark={handleSelectBookmark}
                  onDeleteBook={handleDeleteBook}
                  showLibraryAndBookmarksOnly={true}
                  hideHeader={true}
                  onNavigateToTab={setCurrentTab}
                />
              </div>
            </motion.div>
          )}

          {currentTab === 'librairie' && (
            <motion.div
              key="librairie-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full overflow-y-auto p-4 sm:p-6 pb-24 transition-all duration-300 ${
                settings.theme === 'dark' ? 'bg-[#0a0a09] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
              }`}
            >
              <div className="max-w-3xl mx-auto py-2 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white font-sans tracking-tight">Librairie Universelle</h2>
                    <p className="text-stone-400 text-xs mt-1 font-sans font-medium">Parcourez le domaine public ou écoutez nos chefs-d'œuvre sélectionnés</p>
                  </div>
                  
                  {/* Select inner library tab */}
                  <div className="flex p-1 bg-stone-150 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-900 select-none gap-1 focus:outline-none w-fit self-start md:self-auto font-sans font-bold text-xs">
                    <button
                      onClick={() => setLibSubTab('gutenberg')}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg cursor-pointer transition-all ${
                        libSubTab === 'gutenberg'
                          ? 'bg-[#646cff] text-white shadow-sm font-black'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Gutenberg</span>
                    </button>
                    <button
                      onClick={() => setLibSubTab('samples')}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg cursor-pointer transition-all ${
                        libSubTab === 'samples'
                          ? 'bg-[#646cff] text-white shadow-sm font-black'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Extraits de Démo ({SAMPLES.length})</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {libSubTab === 'gutenberg' ? (
                    <motion.div
                      key="gutenberg-sub"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <GutenbergExplorer
                        onDocumentAdded={handleDocumentAdded}
                        recentBooks={recentBooks}
                        onSelectSample={handleSelectBook}
                        onNavigateToTab={setCurrentTab}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="samples-sub"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DocumentUpload
                        onDocumentAdded={(book) => { handleDocumentAdded(book); setCurrentTab('lire'); }}
                        onSelectSample={handleSelectBook}
                        recentBooks={recentBooks}
                        bookmarks={bookmarks}
                        onSelectBookmark={handleSelectBookmark}
                        onDeleteBook={handleDeleteBook}
                        onlyShowSamples={true}
                        hideHeader={true}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {currentTab === 'importer' && (
            <motion.div
              key="importer-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full overflow-y-auto p-4 sm:p-6 pb-24 transition-all duration-300 ${
                settings.theme === 'dark' ? 'bg-[#0a0a09] text-stone-100' : 'bg-[#F9F8F6] text-[#2D2926]'
              }`}
            >
              <div className="max-w-3xl mx-auto py-2 space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-[#646cff] dark:text-[#767fff] font-sans tracking-tight">Importer</h2>
                  <p className="text-stone-400 text-xs mt-1 font-sans font-medium">Glissez un document PDF ou ePUB pour l'écouter instantanément</p>
                </div>
                <DocumentUpload
                  onDocumentAdded={(book) => { handleDocumentAdded(book); setCurrentTab('lire'); }}
                  onSelectSample={handleSelectBook}
                  recentBooks={recentBooks}
                  bookmarks={bookmarks}
                  onSelectBookmark={handleSelectBookmark}
                  onDeleteBook={handleDeleteBook}
                  onlyShowUpload={true}
                  hideHeader={true}
                />
              </div>
            </motion.div>
          )}

          {currentTab === 'lire' && (
            <motion.div
              key="reader-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex h-full overflow-hidden"
            >
              {!activeBook ? (
                /* Beautiful empty reading slate */
                <div className="w-full flex items-center justify-center p-6 text-center select-none bg-[#0a0a09] h-full" id="empty-reader-view">
                  <div className="max-w-sm mx-auto space-y-5 p-6 bg-[#131212] border border-stone-900 rounded-[24px]">
                    <div className="p-4 bg-stone-950 rounded-full border border-stone-850 text-stone-450 w-16 h-16 flex items-center justify-center mx-auto animate-pulse">
                      <Headphones className="w-8 h-8 text-[#646cff]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">Aucun document actif</h3>
                      <p className="text-stone-400 text-xs mt-1.5 leading-relaxed prose">
                        Veuillez charger un livre électronique dans l'onglet Importer ou sélectionner un chef-d'œuvre littéraire de la Librairie pour lancer le lecteur intelligent.
                      </p>
                    </div>
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => setCurrentTab('librairie')}
                        className="w-full py-2.5 bg-[#646cff] text-white hover:bg-[#525aff] text-xs font-black rounded-full cursor-pointer transition-colors shadow-md animate-pulse"
                        id="empty-action-explore"
                      >
                        Parcourir la librairie
                      </button>
                      <button
                        onClick={() => setCurrentTab('accueil')}
                        className="w-full py-2.5 bg-transparent text-stone-300 hover:text-white border border-stone-800 text-xs font-bold rounded-full cursor-pointer transition-colors"
                        id="empty-action-home"
                      >
                        Retour à l'accueil
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Reader Interface */
                <div className="w-full h-full flex overflow-hidden">
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
                            <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#646cff] dark:text-[#767fff]">Sommaire & Outils</span>
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
                  <div className="flex-grow h-full overflow-y-auto flex flex-col relative pb-32">
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
                      <div className="flex flex-col items-center justify-center h-full text-stone-400 bg-stone-950">
                        <VolumeX className="w-12 h-12 stroke-1 text-red-500 animate-bounce" />
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating / Sticky background Audio Player overlay widget (active in background tabs) */}
      {activeBook && currentTab !== 'lire' && (
        <motion.div 
          className="fixed bottom-[68px] left-4 right-4 z-40 bg-[#141313]/95 border border-stone-850 rounded-2xl p-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md mx-auto backdrop-blur-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          id="background-player"
        >
          <div className="flex items-center space-x-3 truncate cursor-pointer flex-grow min-w-0" onClick={() => setCurrentTab('lire')}>
            <div className="p-2 bg-stone-950 border border-stone-800 text-[#646cff] rounded-xl flex-shrink-0 animate-pulse">
              <Headphones className="w-4.5 h-4.5" />
            </div>
            <div className="text-left truncate min-w-0">
              <p className="text-xs font-extrabold text-white truncate font-sans tracking-tight">{activeBook.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-[#767fff] font-extrabold uppercase bg-[#646cff]/10 px-1.5 py-0.5 rounded border border-[#646cff]/15">
                  Section {currentChapterIdx + 1}
                </span>
                <span className="text-[9px] text-stone-400 font-medium whitespace-nowrap">
                  Arrière-plan • {Math.round(activeBook.progressPercent || 0)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
            <button 
              onClick={() => handlePlayPause()}
              className="p-2.5 bg-[#646cff] hover:bg-[#525aff] rounded-full text-white cursor-pointer transition-colors"
              title={isPlaying ? 'Pause' : 'Lecture'}
              id="bg-play-pause-btn"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <button 
              onClick={() => setCurrentTab('lire')}
              className="text-[9px] font-black text-stone-300 hover:text-white px-2.5 py-2 bg-stone-900 border border-stone-800 rounded-xl transition-all cursor-pointer uppercase font-sans tracking-wider hover:border-stone-700"
              id="bg-open-btn"
            >
              Ouvrir
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. Global Speech Ribbon Controls (floating only when inside 'lire' active tab and activeBook is present) */}
      {currentTab === 'lire' && activeBook && (
        <div className="fixed bottom-[56px] left-0 right-0 z-30 bg-[#1c1a19] shadow-lg">
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

      {/* 4. Permanently Sticky bottom tab navigation bar matching the classic SpeechifyPro design exactly */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#111110] border-t border-stone-900/80 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] py-1.5 px-3">
        <div className="max-w-xl mx-auto flex items-center justify-between text-stone-400 font-sans">
          {/* Tab 1: Accueil */}
          <button 
            onClick={() => setCurrentTab('accueil')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'accueil' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Accueil"
            id="tab-accueil"
          >
            <Home className={`w-5 h-5 transition-all duration-300 ${currentTab === 'accueil' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} />
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Accueil</span>
            {currentTab === 'accueil' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab 2: Lire */}
          <button 
            onClick={() => setCurrentTab('lire')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'lire' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Lecteur Vocal"
            id="tab-lire"
          >
            <Headphones className={`w-5 h-5 transition-all duration-300 ${currentTab === 'lire' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)] animate-pulse' : ''}`} />
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Lire</span>
            {currentTab === 'lire' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab 3: Biblio */}
          <button 
            onClick={() => setCurrentTab('biblio')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'biblio' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Bibliothèque"
            id="tab-biblio"
          >
            <Library className={`w-5 h-5 transition-all duration-300 ${currentTab === 'biblio' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} />
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Biblio</span>
            {currentTab === 'biblio' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab 4: Librairie */}
          <button 
            onClick={() => setCurrentTab('librairie')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'librairie' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Librairie"
            id="tab-librairie"
          >
            <BookOpen className={`w-5 h-5 transition-all duration-300 ${currentTab === 'librairie' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} />
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Librairie</span>
            {currentTab === 'librairie' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab 5: Importer */}
          <button 
            onClick={() => setCurrentTab('importer')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'importer' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Importer"
            id="tab-importer"
          >
            <Upload className={`w-5 h-5 transition-all duration-300 ${currentTab === 'importer' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} />
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Importer</span>
            {currentTab === 'importer' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>
        </div>
      </footer>

      {/* 5. Overlay Welcome help guide */}
      <AnimatePresence>
        {showWelcomeHelp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121111]/95 text-stone-100 rounded-[28px] max-w-lg w-full p-6 shadow-2xl relative text-left border border-stone-900"
            >
              <button
                onClick={() => setShowWelcomeHelp(false)}
                className="absolute right-4 top-4 text-stone-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2.5 text-[#646cff] mb-4">
                <BookOpen className="w-6 h-6" />
                <h3 className="text-xl font-black tracking-tight font-sans">
                  Guide de démarrage
                </h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-stone-300">
                <p>
                  Bienvenue dans l'univers de la lecture audio naturelle de <strong>SpeechifyPro</strong>. Cette liseuse intelligente convertit vos textes en fichiers de synthèse vocale vivants.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#646cff] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                    <p><strong>Domaine public et imports :</strong> Rendez-vous sur l'onglet <strong>Librairie</strong> pour rechercher, explorer et importer instantanément en 1 clic plus de 70 000 livres du **Projet Gutenberg** ! Ou importez vos propres fichiers sous l'onglet <strong>Importer</strong>.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#646cff] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                    <p><strong>Lecture d'arrière-plan globale :</strong> Écoutez vos documents tout en configurant votre liseuse ou en naviguant sur l'accueil ! Un mini-lecteur flottant persistera au bas de l'écran.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#646cff] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]/[10px]">3</span>
                    <p><strong>Geste intelligent "Clic-pour-lire" :</strong> En mode lecture, cliquez directement sur <strong>n'importe quelle phrase du texte</strong> pour y positionner instantanément la synthèse vocale.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#646cff] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
                    <p><strong>Objectifs et Motivation :</strong> Suivez vos minutes écoutées chaque jour en temps réel et réglez vos objectifs pour acquérir un rituel de lecture quotidien.</p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded bg-[#646cff] text-white font-extrabold flex items-center justify-center flex-shrink-0 text-[10px]">5</span>
                    <p><strong>Mode Sombre & Clair :</strong> Basculez à tout moment entre le mode sombre de nuit et le mode clair/crème en haut à droite de l'écran d'accueil pour soulager vos yeux.</p>
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-850 p-3 rounded-xl mt-4 text-[11px] text-stone-400 font-mono">
                  <p>💡 <em>Note : Toutes vos voix système de haute qualité sont chargées nativement. Ajustez la vitesse, le thème de lecture (sombre, clair, sépia, papier) et le pas de voix à tout moment depuis les options de lecture !</em></p>
                </div>
              </div>

              <button
                onClick={() => setShowWelcomeHelp(false)}
                className="w-full mt-6 py-2.5 bg-[#646cff] text-white font-black rounded-full hover:bg-[#525aff] transition-all text-xs cursor-pointer shadow-sm text-center"
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
