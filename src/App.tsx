import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BookOpen, HelpCircle, X, ChevronLeft, VolumeX, Library, Home, Headphones, Upload, Play, Pause, Globe , Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, UserSettings, Bookmark, Chapter, Annotation, Flashcard } from './types';
import { splitIntoSentences, preprocessTextForSpeech } from './utils/textUtils';
import { resolveSpeechConfig } from './utils/customVoices';
import { getAllBooksFromDB, saveAllBooksToDB } from './utils/indexedDB';
import { useServerSync } from './utils/useServerSync';
import { SAMPLES } from './data/samples';
import { ErrorBoundary } from './components/ErrorBoundary';
import DocumentUpload from './components/DocumentUpload';
import Sidebar from './components/Sidebar';
import TextViewer from './components/TextViewer';
import ReaderControls from './components/ReaderControls';
import ReaderSettings from './components/ReaderSettings';
import HomeDashboard from './components/HomeDashboard';
import { useGoogleTTS } from './utils/useGoogleTTS';

// ── Code splitting : composants chargés à la demande ────────────────────────
const GutenbergExplorer   = lazy(() => import('./components/GutenbergExplorer'));
const InteractiveHelpGuide = lazy(() => import('./components/InteractiveHelpGuide'));
const StatsPage           = lazy(() => import('./components/StatsPage'));
const FlashcardsPage      = lazy(() => import('./components/FlashcardsPage'));
const CharlyChatModal     = lazy(() => import('./components/CharlyChatModal'));
import AnnotationModal from './components/AnnotationModal';
import DictionaryModal from './components/DictionaryModal';
import SelectionPopup from './components/SelectionPopup';

// ── Loader Suspense ─────────────────────────────────────────────────────────
function SuspenseLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-8 h-8 border-3 border-stone-700 border-t-[#646cff] rounded-full animate-spin" />
    </div>
  );
}


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
  const [currentTab, setCurrentTab] = useState<'accueil' | 'lire' | 'biblio' | 'librairie' | 'importer' | 'stats' | 'flashcards'>('accueil');
  const [libSubTab, setLibSubTab] = useState<'gutenberg' | 'samples'>('gutenberg');

  // Daily Stats trackers
  const [listeningMinutesToday, setListeningMinutesToday] = useState(0.0);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWelcomeHelp, setShowWelcomeHelp] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{ text: string; pIdx: number } | null>(null);

  // Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Dictionnaire
  const [dictionaryWord, setDictionaryWord] = useState<{ word: string; sentence: string } | null>(null);

  // Charly Chat
  const [showCharlyChatModal, setShowCharlyChatModal] = useState(false);


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

  const speechTimeoutRef = useRef<any>(null);

  // ── Synchronisation serveur SQLite ──
  const {
    loadBooksFromServer,
    saveBookToServer,
    deleteBookFromServer,
    saveBooksToServerBatch,
  } = useServerSync();

  // ── Google Cloud TTS premium ──
  const { isEnabled: gttsEnabled, synthesize: gttsSynthesize, audioRef: gttsAudioRef } = useGoogleTTS();

  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

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

  // 1. Initial configuration load from LocalStorage & IndexedDB
  useEffect(() => {
    try {
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

    // Load books : serveur SQLite en priorité, IndexedDB en fallback
    const loadBooksData = async () => {
      try {
        // 1. Essayer le serveur VPS en priorité
        const serverBooks = await loadBooksFromServer();
        if (serverBooks.length > 0) {
          setRecentBooks(serverBooks);
          // Mettre à jour IndexedDB en arrière-plan
          saveAllBooksToDB(serverBooks).catch(() => {});
          console.log(`[App] ${serverBooks.length} livre(s) chargé(s) depuis le serveur`);
          return;
        }

        // 2. Fallback : IndexedDB local
        const dbBooks = await getAllBooksFromDB();
        if (dbBooks && dbBooks.length > 0) {
          setRecentBooks(dbBooks);
          // Migrer vers le serveur en arrière-plan
          saveBooksToServerBatch(dbBooks).catch(() => {});
          console.log(`[App] ${dbBooks.length} livre(s) chargé(s) depuis IndexedDB (migration serveur en cours)`);
        } else {
          // 3. Fallback legacy localStorage
          const legacySaved = localStorage.getItem('liseuse_recent_books_v1');
          if (legacySaved) {
            const parsedLegacy = JSON.parse(legacySaved);
            if (parsedLegacy && parsedLegacy.length > 0) {
              setRecentBooks(parsedLegacy);
              await saveAllBooksToDB(parsedLegacy);
              saveBooksToServerBatch(parsedLegacy).catch(() => {});
              localStorage.removeItem('liseuse_recent_books_v1');
            }
          }
        }
      } catch (err) {
        console.error('[App] Failed to load/migrate books database.', err);
      }
    };

    loadBooksData();

    // Charger flashcards depuis le serveur
    fetch('/api/flashcards').then(r => r.json()).then(data => {
      if (data.flashcards) setFlashcards(data.flashcards);
    }).catch(() => {});

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
          // Sauvegarder aussi pour le graphique semaine (format speechify_day_YYYY-MM-DD)
          localStorage.setItem(`speechify_day_${todayStr}`, next.toFixed(2));
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

  // Handlers annotations
  const handleAnnotate = (selectedText: string, pIdx: number) => {
    if (!activeBook) return;
    setPendingAnnotation({ text: selectedText, pIdx });
    setShowAnnotationModal(true);
  };

  const handleSaveAnnotation = async (annotation: Annotation) => {
    const updated = [...annotations, annotation];
    setAnnotations(updated);
    try {
      await fetch('/api/annotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation)
      });
    } catch (e) { console.error('[Annotations] Save error', e); }
  };

  const handleDeleteAnnotation = async (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    try { await fetch(`/api/annotations/${id}`, { method: 'DELETE' }); }
    catch (e) { console.error('[Annotations] Delete error', e); }
  };

  // Charger les annotations du livre actif depuis le serveur
  useEffect(() => {
    if (!activeBook?.id) { setAnnotations([]); return; }
    fetch(`/api/annotations/${activeBook.id}`)
      .then(r => r.json())
      .then(data => { if (data.annotations) setAnnotations(data.annotations); })
      .catch(() => setAnnotations([]));
  }, [activeBook?.id]);

  // Handlers flashcards
  const handleSaveFlashcard = async (card: Flashcard) => {
    const updated = [...flashcards.filter(c => c.id !== card.id), card];
    setFlashcards(updated);
    try {
      await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    } catch (e) { console.error('[Flashcards] Save error', e); }
  };

  const handleDeleteFlashcard = async (id: string) => {
    setFlashcards(prev => prev.filter(c => c.id !== id));
    try { await fetch(`/api/flashcards/${id}`, { method: 'DELETE' }); }
    catch (e) { console.error('[Flashcards] Delete error', e); }
  };

  const handleUpdateFlashcard = async (card: Flashcard) => {
    setFlashcards(prev => prev.map(c => c.id === card.id ? card : c));
    try {
      await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    } catch (e) { console.error('[Flashcards] Update error', e); }
  };

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
    // A. Update in-memory state instantly for snappy navigation
    setRecentBooks(books);

    // B. Save asynchronously to IndexedDB (local cache)
    saveAllBooksToDB(books).catch((err) => {
      console.error('[Storage] Save to IndexedDB failed:', err);
    });

    // C. Sync avec le serveur SQLite VPS (batch)
    saveBooksToServerBatch(books).catch((err) => {
      console.warn('[ServerSync] Batch save failed:', err);
    });
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

    // Terminate any ongoing audio structures and clear scheduled pauses
    clearSpeechTimeout();
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

    // Preprocess text to format double-punctuations and strip raw artifacts (like em-dashes / underscores)
    const language = state.activeBook.language || 'fr';
    const preprocessedText = preprocessTextForSpeech(sentenceToRead, language);

    // Resolve our custom parameters (including voice, language, pitch and rate overrides)
    const voiceConfig = resolveSpeechConfig(
      state.settings.voiceURI,
      language,
      state.settings.speechPitch,
      state.settings.speechRate
    );

    // Instantiate Utterance object with clean audible text
    const utterance = new SpeechSynthesisUtterance(preprocessedText);
    utterance.lang = voiceConfig.lang;
    utterance.rate = voiceConfig.rate;
    utterance.pitch = voiceConfig.pitch;

    if (voiceConfig.voice) {
      utterance.voice = voiceConfig.voice;
    }

    // Bind playback progress callbacks
    utterance.onend = () => {
      clearSpeechTimeout();

      // Determine the ideal breath pause between sentences based on end of sentence punctuation and paragraph layouts.
      // This establishes a soothing, professional human-like cadence.
      const trimmedSentence = sentenceToRead.trim();
      const lastChar = trimmedSentence.slice(-1);
      
      let baseDelay = 400; // default full stop pause (in ms)

      if (lastChar === '?' || lastChar === '!') {
        baseDelay = 650; // strong exclamation/interrogative rhetorical pause
      } else if (lastChar === ';' || lastChar === ':') {
        baseDelay = 250; // semi-structural clause-boundary pause
      } else if (lastChar === ',' || trimmedSentence.endsWith('...')) {
        baseDelay = 350; // soft or ellipsis ellipsis pause
      }

      // If at paragraph boundary (and not block EOF), increase pause to represent layout shift
      const isParagraphEnd = state.sentenceIdx === sentences.length - 1;
      if (isParagraphEnd) {
        baseDelay = 950; // restful breath between paragraphs
      }

      // Scale the pause inversely with the speech rate so faster readers description get bogged down
      const scaledDelay = Math.max(80, Math.round(baseDelay / state.settings.speechRate));

      speechTimeoutRef.current = setTimeout(() => {
        speechTimeoutRef.current = null;
        if (speechStateRef.current.isPlaying) {
          handleNextSentence();
        }
      }, scaledDelay);
    };

    utterance.onerror = (evt) => {
      // Do not error out on manual triggers
      if (evt.error !== 'interrupted') {
        console.error('Speech synthesis execution errored:', evt);
        // Fallback or restart synthesis gently
        setIsPlaying(false);
      }
    };

    // Si Google TTS premium activé → appel API, sinon voix système
    if (gttsEnabled) {
      (async () => {
        try {
          const blobUrl = await gttsSynthesize(
            preprocessedText,
            voiceConfig.rate,
            state.settings.speechPitch
          );
          if (!speechStateRef.current.isPlaying) return;
          if (gttsAudioRef.current) { gttsAudioRef.current.pause(); }
          const audio = new Audio(blobUrl);
          gttsAudioRef.current = audio;
          audio.onended = () => {
            clearSpeechTimeout();
            if (speechStateRef.current.isPlaying) {
              const isParagraphEnd = state.sentenceIdx === splitIntoSentences(
                speechStateRef.current.activeBook?.chapters[state.chapterIdx]?.paragraphs[state.paragraphIdx] || ''
              ).length - 1;
              const scaledDelay = Math.max(80, isParagraphEnd ? Math.round(950 / state.settings.speechRate) : 300);
              speechTimeoutRef.current = setTimeout(() => {
                speechTimeoutRef.current = null;
                if (speechStateRef.current.isPlaying) handleNextSentence();
              }, scaledDelay);
            }
          };
          audio.onerror = () => { if (speechStateRef.current.isPlaying) handleNextSentence(); };
          await audio.play();
        } catch (e) {
          console.warn('[GTTS] Erreur, fallback voix système:', e);
          window.speechSynthesis.speak(utterance);
        }
      })();
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  // Cancel synthesis on component unmount
  useEffect(() => {
    return () => {
      clearSpeechTimeout();
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
      clearSpeechTimeout();
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
    clearSpeechTimeout();
    setCurrentSentenceIdx(0);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (gttsAudioRef.current) { gttsAudioRef.current.pause(); gttsAudioRef.current = null; }
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
    clearSpeechTimeout();
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
    // Supprimer du serveur SQLite
    deleteBookFromServer(id).catch((err) => {
      console.warn('[ServerSync] Delete failed:', err);
    });
  };

  const handleUpdateBook = (updatedBook: DocumentBook) => {
    setActiveBook(updatedBook);
    const updatedList = recentBooks.map(b => b.id === updatedBook.id ? updatedBook : b);
    saveRecentBooks(updatedList);
    // Sauvegarder immédiatement sur le serveur (progression lecture)
    saveBookToServer(updatedBook);
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
    <ErrorBoundary>
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
                      <ErrorBoundary>
                        <Suspense fallback={<SuspenseLoader />}>
                          <GutenbergExplorer
                            onDocumentAdded={handleDocumentAdded}
                            recentBooks={recentBooks}
                            onSelectSample={handleSelectBook}
                            onNavigateToTab={setCurrentTab}
                          />
                        </Suspense>
                      </ErrorBoundary>
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

          {currentTab === 'stats' && (
            <motion.div
              key="stats-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full overflow-hidden"
            >
              <ErrorBoundary>
                <Suspense fallback={<SuspenseLoader />}>
                  <StatsPage
                    recentBooks={recentBooks}
                    listeningMinutesToday={listeningMinutesToday}
                    dailyGoalMinutes={dailyGoalMinutes}
                    onUpdateDailyGoal={handleUpdateDailyGoal}
                    theme={settings.theme}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}

          {/* Tab Flashcards */}
          {currentTab === 'flashcards' && (
            <motion.div
              key="flashcards-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <ErrorBoundary>
                <Suspense fallback={<SuspenseLoader />}>
                  <FlashcardsPage
                    flashcards={flashcards}
                    onDelete={handleDeleteFlashcard}
                    onUpdate={handleUpdateFlashcard}
                  />
                </Suspense>
              </ErrorBoundary>
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
                              onUpdateBook={handleUpdateBook}
                              annotations={annotations}
                              onDeleteAnnotation={handleDeleteAnnotation}
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
                        language={activeBook?.language || 'fr'}
                        documentBook={activeBook || undefined}
                        currentChapterIndex={currentChapterIdx}
                        onChapterSelect={(idx) => handleJumpToLocation(idx, 0)}
                        onUpdateBook={handleUpdateBook}
                        bookmarks={activeBookBookmarks}
                        onJumpToLocation={handleJumpToLocation}
                        annotations={annotations}
                        onAnnotate={handleAnnotate}
                        onSaveFlashcard={handleSaveFlashcard}
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

      {/* Bouton flottant Charly Coach IA */}
      {currentTab === 'lire' && activeBook && !showCharlyChatModal && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 15 }}
          onClick={() => setShowCharlyChatModal(true)}
          className="fixed bottom-[150px] right-4 z-40 w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 rounded-full shadow-[0_4px_20px_rgba(100,108,255,0.4)] flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 group"
          title="Discuter avec Charly, votre coach de lecture IA"
          id="charly-coach-fab"
        >
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0a09] animate-pulse" />
        </motion.button>
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

          {/* Tab 5: Stats */}
          <button
            onClick={() => setCurrentTab('stats')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'stats' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Statistiques"
            id="tab-stats"
          >
            <svg className={`w-5 h-5 transition-all duration-300 ${currentTab === 'stats' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Stats</span>
            {currentTab === 'stats' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab Flash: Flashcards */}
          <button
            onClick={() => setCurrentTab('flashcards')}
            className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 flex-1 relative ${
              currentTab === 'flashcards' ? 'text-white' : 'hover:text-stone-200 text-stone-500'
            }`}
            title="Flashcards"
            id="tab-flashcards"
          >
            <svg className={`w-5 h-5 transition-all duration-300 ${currentTab === 'flashcards' ? 'text-[#646cff] drop-shadow-[0_0_10px_rgba(100,108,255,0.4)]' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
            <span className="text-[10px] mt-1 font-semibold tracking-tight">Cartes</span>
            {flashcards.length > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">{flashcards.filter(c=>!c.mastered).length || flashcards.length}</span>
            )}
            {currentTab === 'flashcards' && (
              <motion.div className="absolute top-[-7px] w-5 h-[2px] bg-[#646cff] rounded-full" layoutId="purple-active-tab" />
            )}
          </button>

          {/* Tab 6: Importer */}
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

      {/* Annotation Modal */}
      <AnimatePresence>
        {showAnnotationModal && pendingAnnotation && activeBook && (
          <AnnotationModal
            selectedText={pendingAnnotation.text}
            documentId={activeBook.id}
            chapterIndex={currentChapterIdx}
            paragraphIndex={pendingAnnotation.pIdx}
            onSave={handleSaveAnnotation}
            onClose={() => { setShowAnnotationModal(false); setPendingAnnotation(null); }}
          />
        )}
      </AnimatePresence>

      {/* Dictionary Modal */}
      <AnimatePresence>
        {dictionaryWord && (
          <DictionaryModal
            word={dictionaryWord.word}
            sentenceContext={dictionaryWord.sentence}
            language={activeBook?.language || 'fr'}
            onClose={() => setDictionaryWord(null)}
            onSaveFlashcard={handleSaveFlashcard}
            sourceBookTitle={activeBook?.title}
          />
        )}
      </AnimatePresence>

      {/* Charly Chat Modal */}
      <AnimatePresence>
        {showCharlyChatModal && activeBook && (
          <ErrorBoundary>
            <Suspense fallback={<SuspenseLoader />}>
              <CharlyChatModal
                bookTitle={activeBook.title}
                bookAuthor={activeBook.author}
                currentChapterTitle={activeBook.chapters[currentChapterIdx]?.title || ''}
                currentParagraphText={activeBook.chapters[currentChapterIdx]?.paragraphs[currentParagraphIdx] || ''}
                language={activeBook.language || 'fr'}
                onClose={() => setShowCharlyChatModal(false)}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* 5. Overlay Welcome help guide */}
      <AnimatePresence>
        {showWelcomeHelp && (
          <ErrorBoundary>
            <Suspense fallback={<SuspenseLoader />}>
              <InteractiveHelpGuide
                onClose={() => setShowWelcomeHelp(false)}
                documentLanguage={activeBook?.language || 'fr'}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}




