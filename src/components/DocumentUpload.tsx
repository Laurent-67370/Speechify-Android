import { useState, useRef, DragEvent, ChangeEvent, useEffect, FormEvent } from 'react';
import { 
  Upload, BookOpen, AlertCircle, Loader2, Sparkles, FileText, 
  Bookmark as BookmarkIcon, Trash2, Globe, Link, Search, Filter, 
  ArrowUpDown, CheckCircle2, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, Bookmark } from '../types';
import { SAMPLES } from '../data/samples';
import { parseEpub } from '../lib/epubParser';
import { parsePdf } from '../lib/pdfParser';
import { fetchWebpageHtml, parseWebpageHtml } from '../utils/webParser';

interface DocumentUploadProps {
  onDocumentAdded: (doc: DocumentBook) => void;
  onSelectSample: (doc: DocumentBook) => void;
  recentBooks: DocumentBook[];
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onDeleteBook: (bookId: string) => void;
  initialTab?: 'library' | 'samples' | 'bookmarks';
  
  // Custom flags to remove redundancies across tab views
  hideHeader?: boolean;
  onlyShowUpload?: boolean;
  onlyShowSamples?: boolean;
  showLibraryAndBookmarksOnly?: boolean;
  onNavigateToTab?: (tab: 'accueil' | 'lire' | 'biblio' | 'librairie' | 'importer') => void;
}

export default function DocumentUpload({ 
  onDocumentAdded, 
  onSelectSample, 
  recentBooks, 
  bookmarks, 
  onSelectBookmark, 
  onDeleteBook,
  initialTab,
  hideHeader = false,
  onlyShowUpload = false,
  onlyShowSamples = false,
  showLibraryAndBookmarksOnly = false,
  onNavigateToTab
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [webUrl, setWebUrl] = useState('');
  
  // Filter and Sorting states for recentBooks in Bibliothèque
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'epub' | 'web' | 'sample'>('all');
  const [progressFilter, setProgressFilter] = useState<'all' | 'notStarted' | 'inProgress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'progress'>('newest');
  
  // Clean default logic for the active sub-tab inside library
  const [activeTab, setActiveTab] = useState<'library' | 'samples' | 'bookmarks'>(() => {
    if (initialTab) return initialTab;
    if (showLibraryAndBookmarksOnly) return 'library';
    return recentBooks.length > 0 ? 'library' : 'samples';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const processFile = async (file: File) => {
    setLoading(true);
    setErrorStatus(null);
    setProgressMessage('Préparation du document...');

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let importedBook: Omit<DocumentBook, 'progressPercent' | 'currentChapterIndex' | 'currentParagraphIndex' | 'addedAt'>;

      if (extension === 'epub') {
        setProgressMessage('Extraction de l\'archive ePUB...');
        importedBook = await parseEpub(file);
      } else if (extension === 'pdf') {
        setProgressMessage('Chargement du PDF...');
        importedBook = await parsePdf(file, (curr, total) => {
          setProgressMessage(`Extraction du texte : Page ${curr} sur ${total}`);
        });
      } else {
        throw new Error('Format de fichier non supporté. Veuillez importer un fichier PDF ou ePUB.');
      }

      // Finalize book object
      const newBook: DocumentBook = {
        ...importedBook,
        progressPercent: 0,
        currentChapterIndex: 0,
        currentParagraphIndex: 0,
        addedAt: Date.now(),
      };

      onDocumentAdded(newBook);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Une erreur inconnue est survenue lors du traitement du document.');
    } finally {
      setLoading(false);
      setProgressMessage('');
    }
  };

  const QUICK_URL_SAMPLES = [
    { name: 'Wikipédia : Léonard de Vinci', url: 'https://fr.wikipedia.org/wiki/L%C3%A9onard_de_Vinci' },
    { name: 'Wikipédia : Synthèse vocale', url: 'https://fr.wikipedia.org/wiki/Synth%C3%A8se_vocale' },
    { name: 'Wikipédia : Lecture', url: 'https://fr.wikipedia.org/wiki/Lecture' },
  ];

  const handleUrlSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!webUrl || !webUrl.trim()) {
      setErrorStatus('Veuillez spécifier une URL de site internet valide.');
      return;
    }

    let targetUrl = webUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setErrorStatus(null);
    setProgressMessage('Préparation du proxy de connexion...');

    try {
      const htmlContent = await fetchWebpageHtml(targetUrl, (msg) => {
        setProgressMessage(msg);
      });

      setProgressMessage('Extraction et nettoyage de l\'article principal...');
      const parsedBook = parseWebpageHtml(targetUrl, htmlContent);

      const newBook: DocumentBook = {
        ...parsedBook,
        progressPercent: 0,
        currentChapterIndex: 0,
        currentParagraphIndex: 0,
        addedAt: Date.now(),
      };

      onDocumentAdded(newBook);
      setWebUrl('');
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || 'Une erreur inconnue est survenue lors de l\'importation de l\'URL.');
    } finally {
      setLoading(false);
      setProgressMessage('');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const selectFileInput = () => {
    fileInputRef.current?.click();
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'fr': return 'Français';
      case 'en': return 'Anglais';
      case 'es': return 'Espagnol';
      default: return lang.toUpperCase();
    }
  };

  // 1. Rendering only the drag-and-drop file uploader (for 'importer' tab)
  if (onlyShowUpload) {
    return (
      <div className="w-full font-sans">
        {/* Segmented control for file vs webpage import */}
        <div className="flex p-0.5 bg-stone-950/60 rounded-xl border border-stone-850 select-none gap-0.5 focus:outline-none w-fit mb-6 font-sans font-bold text-xs mx-auto sm:mx-0">
          <button
            onClick={() => { setImportMode('file'); setErrorStatus(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg cursor-pointer transition-all ${
              importMode === 'file'
                ? 'bg-[#646cff] text-white shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-900/40'
            }`}
            disabled={loading}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Fichier local</span>
          </button>
          <button
            onClick={() => { setImportMode('url'); setErrorStatus(null); }}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg cursor-pointer transition-all ${
              importMode === 'url'
                ? 'bg-[#646cff] text-white shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-900/40'
            }`}
            disabled={loading}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Site Web (URL)</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl border border-stone-850 p-10 md:p-14 text-center bg-stone-950/40 flex flex-col items-center justify-center space-y-4 py-11"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-[#646cff] animate-spin" />
                <BookOpen className="w-5 h-5 text-[#767fff] absolute top-3.5 left-3.5 font-bold" />
              </div>
              <p className="font-semibold text-white">{progressMessage}</p>
              <p className="text-xs text-stone-400">Analyse et formatage prosodique autonome en cours...</p>
            </motion.div>
          ) : importMode === 'file' ? (
            <motion.div
              key="dropzone-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              id="dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={loading ? undefined : selectFileInput}
              className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-[#646cff] bg-[#646cff]/5 scale-[1.01] shadow-lg dark:bg-[#646cff]/10'
                  : 'border-stone-850 bg-stone-950/40 hover:border-stone-700 hover:bg-stone-950/70'
              }`}
            >
              <input
                type="file"
                id="file-pick"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.epub"
                className="hidden"
                disabled={loading}
              />

              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-stone-900 border border-stone-805 rounded-full text-stone-300">
                  <Upload className="w-10 h-10 text-[#646cff]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    Déposez votre document ici, ou <span className="text-[#646cff] hover:text-[#767fff] underline decoration-2 underline-offset-2">parcourez</span>
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    Prend en charge les formats <strong className="text-stone-300">PDF</strong> et <strong className="text-stone-300">ePUB</strong> (sans DRM)
                  </p>
                </div>
                <div className="flex gap-4 pt-2 text-[10px] text-stone-500 font-mono">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> PDF (Texte indexé)
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> ePUB (Chapitré)
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="url-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl border border-stone-850 p-6 md:p-10 bg-[#131212] hover:border-stone-700 transition-all text-center"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-left max-w-2xl mx-auto mb-6">
                <div className="p-4 bg-stone-900 border border-stone-850 rounded-2xl text-stone-300 flex-shrink-0">
                  <Globe className="w-8 h-8 text-[#646cff]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Importer depuis le Web</h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed leading-relaxed">
                    Collez l'adresse URL d'un article de presse, d'une page Wikipédia ou d'un blog. Notre liseur extrait et structure automatiquement le texte principal pour le lire sans éléments distrayants.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl mx-auto">
                <div className="relative flex-grow">
                  <Link className="absolute left-4 top-3.5 w-4 h-4 text-stone-550" />
                  <input
                    type="text"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="Saisissez ou collez l'URL de votre choix... (ex: https://fr.wikipedia.org/...)"
                    className="w-full bg-stone-950/80 border border-stone-850 text-stone-100 placeholder-stone-600 rounded-xl py-3 pl-11 pr-4 text-xs font-medium focus:outline-none focus:border-[#646cff] transition-all"
                    disabled={loading}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#646cff] hover:bg-[#525aff] text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                  disabled={loading}
                >
                  <span>Lancer l'extraction</span>
                </button>
              </form>

              <div className="max-w-2xl mx-auto pt-6 text-left border-t border-stone-900 mt-6">
                <p className="text-[9px] font-bold text-stone-500 font-mono uppercase tracking-widest mb-3">⚡ Liens de test rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_URL_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWebUrl(sample.url)}
                      className="text-[10px] font-bold font-mono py-1.5 px-3 bg-stone-900/80 hover:bg-stone-850 border border-stone-850 hover:border-stone-700 text-stone-300 rounded-lg cursor-pointer transition-colors active:scale-95"
                      title={sample.url}
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        <AnimatePresence>
          {errorStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-xl bg-red-950/20 border border-red-900/35 text-red-300 flex items-start space-x-3 text-xs"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
              <div>
                <p className="font-bold">Une erreur est survenue lors de l'import :</p>
                <p className="text-stone-300 mt-1">{errorStatus}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 2. Rendering only the Classic masterpieces grid (for 'librairie' tab)
  if (onlyShowSamples) {
    return (
      <div className="w-full font-sans pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAMPLES.map((sample) => (
            <motion.div
              key={sample.id}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
              onClick={() => onSelectSample(sample)}
              className="flex flex-col bg-stone-900/40 border border-stone-900 rounded-2xl p-5 cursor-pointer hover:border-[#646cff]/50 hover:bg-stone-900/60 transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-[#646cff]/10 text-[#767fff] uppercase border border-[#646cff]/15">
                  {getLanguageLabel(sample.language)}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold font-mono bg-stone-950/80 text-stone-400 px-2 py-0.5 rounded">
                  Classique
                </span>
              </div>
              
              <h3 className="text-base font-black text-white flex-grow leading-snug font-sans group-hover:text-[#646cff] transition-colors">
                {sample.title}
              </h3>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                {sample.author}
              </p>

              <div className="mt-4 pt-4 border-t border-stone-900 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                <span>{sample.chapters.length} section(s)</span>
                <span className="flex items-center text-[#646cff] group-hover:text-[#767fff] font-bold">
                  Écouter &rarr;
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Helper styles for tab switching
  // Filter and sort the recentBooks array based on active library settings
  const filteredAndSortedBooks = [...recentBooks]
    .filter((book) => {
      // 1. Search filter
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Type filter
      const matchesType = typeFilter === 'all' || book.type === typeFilter;
      
      // 3. Progress filter
      const p = book.progressPercent || 0;
      let matchesProgress = true;
      if (progressFilter === 'notStarted') {
        matchesProgress = p === 0;
      } else if (progressFilter === 'inProgress') {
        matchesProgress = p > 0 && p < 99;
      } else if (progressFilter === 'completed') {
        matchesProgress = p >= 99;
      }
      
      return matchesSearch && matchesType && matchesProgress;
    })
    .sort((a, b) => {
      // 4. Sort handling
      if (sortBy === 'newest') {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }
      if (sortBy === 'oldest') {
        return (a.addedAt || 0) - (b.addedAt || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'progress') {
        return (b.progressPercent || 0) - (a.progressPercent || 0);
      }
      return 0;
    });

  const isLibraryActive = activeTab === 'library';
  const isBookmarksActive = activeTab === 'bookmarks';

  // 3 & 4. Normal render with full or filtered tabs (for 'biblio' tab or others)
  return (
    <div className="w-full font-sans">
      {!hideHeader && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-[#767fff] bg-[#646cff]/10 rounded-full border border-[#646cff]/20 uppercase">
            Synthèse Vocale Pro / Hors Ligne
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-sans">
            Liseur Acoustique
          </h1>
          <p className="mt-3 text-base text-stone-400 max-w-xl mx-auto">
            Convertissez vos documents PDF et ePUB en récits audio immersifs avec notre moteur de synthèse naturelle fluide et autonome.
          </p>
        </motion.div>
      )}

      {/* Conditional uploader box (only shown when not filtered to library-only) */}
      {!showLibraryAndBookmarksOnly && !onlyShowUpload && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          id="dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={loading ? undefined : selectFileInput}
          className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all duration-300 ${
            isDragging
              ? 'border-[#646cff] bg-[#646cff]/5 scale-[1.01] shadow-lg dark:bg-[#646cff]/10'
              : 'border-stone-850 bg-[#131212] hover:border-stone-700'
          }`}
        >
          <input
            type="file"
            id="file-pick"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.epub"
            className="hidden"
            disabled={loading}
          />

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-4 py-6"
              >
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-[#646cff] animate-spin" />
                  <BookOpen className="w-5 h-5 text-[#767fff] absolute top-3.5 left-3.5 font-bold" />
                </div>
                <p className="font-semibold text-white">{progressMessage}</p>
                <p className="text-xs text-stone-500">Analyse de la structure du fichier en cours, veuillez patienter...</p>
              </motion.div>
            ) : (
              <motion.div
                key="upload-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="p-4 bg-stone-900 border border-stone-800 rounded-full text-stone-400">
                  <Upload className="w-10 h-10 text-[#646cff]" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    Déposez votre document ici, ou <span className="text-[#646cff] hover:text-[#767fff] underline decoration-2 underline-offset-2">parcourez</span>
                  </p>
                  <p className="text-sm text-stone-400 mt-2">
                    Prend en charge les formats <strong className="text-stone-300">PDF</strong> et <strong className="text-stone-300">ePUB</strong> (sans DRM)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Tab Switcher for Libraries */}
      <div className="mt-4 mb-6 flex justify-start">
        <div className="flex p-1 bg-stone-950 rounded-xl border border-stone-900 select-none gap-1 focus:outline-none">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-all whitespace-nowrap cursor-pointer ${
              isLibraryActive
                ? 'bg-[#646cff] text-white font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documents ({recentBooks.length})</span>
          </button>

          {!showLibraryAndBookmarksOnly && (
            <button
              onClick={() => setActiveTab('samples')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-[#646cff] text-white font-black'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Librairie ({SAMPLES.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-all whitespace-nowrap cursor-pointer ${
              isBookmarksActive
                ? 'bg-[#646cff] text-white font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>Mes Signets & Notes ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* Dynamic Views Rendering Panel */}
      <div className="mt-2">
        <AnimatePresence mode="wait">
          {isLibraryActive && (
            <motion.div
              key="library-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {recentBooks.length > 0 ? (
                <div className="space-y-6">
                  {/* Rich Search & Filter Panel */}
                  <div className="p-4 sm:p-5 bg-[#111110] border border-stone-900 rounded-[22px] space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Search Input */}
                      <div className="flex-grow relative">
                        <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher par titre, auteur..."
                          className="w-full bg-stone-950 border border-stone-900 focus:border-[#646cff]/60 px-4 py-3 pl-10 pr-10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none transition-all"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-3 text-[10px] text-stone-500 hover:text-white font-mono uppercase bg-stone-900/50 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Vider
                          </button>
                        )}
                      </div>

                      {/* Sorting Combo */}
                      <div className="flex items-center gap-2 bg-stone-950 border border-stone-900 rounded-xl px-3 py-2.5 min-w-[160px] md:max-w-[200px]">
                        <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-transparent border-none text-xs text-stone-300 focus:outline-none w-full cursor-pointer font-bold font-sans"
                        >
                          <option value="newest" className="bg-[#111] text-white">Plus récent</option>
                          <option value="oldest" className="bg-[#111] text-white">Plus ancien</option>
                          <option value="title" className="bg-[#111] text-white">Titre (A-Z)</option>
                          <option value="progress" className="bg-[#111] text-white">Progression</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter categories segment */}
                    <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 pt-3 border-t border-stone-900">
                      {/* Left: Document type filter */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-mono text-stone-500 font-extrabold flex items-center gap-1">
                          <Filter className="w-3 h-3" />
                          Format :
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(['all', 'pdf', 'epub', 'web', 'sample'] as const).map((type) => {
                            const labels: Record<string, string> = {
                              all: 'Tous',
                              pdf: 'PDF',
                              epub: 'ePUB',
                              web: 'Sites Web',
                              sample: 'Classiques'
                            };
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setTypeFilter(type)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                  typeFilter === type
                                    ? 'bg-[#646cff] text-white'
                                    : 'bg-stone-950 text-stone-400 hover:text-white hover:bg-stone-900 border border-stone-900'
                                }`}
                              >
                                {labels[type]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Progress filter */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-mono text-stone-500 font-extrabold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          État :
                        </span>
                        <div className="flex gap-1">
                          {(['all', 'notStarted', 'inProgress', 'completed'] as const).map((prog) => {
                            const labels: Record<string, string> = {
                              all: 'Tous',
                              notStarted: 'Non commencés',
                              inProgress: 'En cours',
                              completed: 'Terminés'
                            };
                            return (
                              <button
                                key={prog}
                                type="button"
                                onClick={() => setProgressFilter(prog)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                  progressFilter === prog
                                    ? 'bg-[#646cff] text-white'
                                    : 'bg-stone-950 text-stone-400 hover:text-white hover:bg-stone-900 border border-stone-900'
                                }`}
                              >
                                {labels[prog]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Active Filters Summary Banner */}
                    {(searchQuery || typeFilter !== 'all' || progressFilter !== 'all') && (
                      <div className="flex items-center justify-between bg-stone-950/40 p-2 px-3 border border-stone-900/40 rounded-xl text-[10px] text-stone-400 font-medium">
                        <div className="flex items-center space-x-1">
                          <span>Filtres actifs —</span>
                          <strong className="text-white">{filteredAndSortedBooks.length}</strong>
                          <span>document{filteredAndSortedBooks.length > 1 ? 's' : ''} trouvé{filteredAndSortedBooks.length > 1 ? 's' : ''} sur</span>
                          <strong className="text-stone-300">{recentBooks.length}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('all');
                            setProgressFilter('all');
                          }}
                          className="text-[#767fff] hover:text-[#646cff] font-bold font-mono uppercase cursor-pointer text-[9px] tracking-wide"
                        >
                          Réinitialiser tous les filtres
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Main Grid for Filtered Books */}
                  {filteredAndSortedBooks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAndSortedBooks.map((book) => {
                        const isPdfState = book.type === 'pdf';
                        const isEpubState = book.type === 'epub';
                        const isWebState = book.type === 'web';
                        const isSampleState = book.type === 'sample' || !book.type;

                        // Beautiful color styling classes based on file type
                        let blockCardStyles = 'bg-[#111110] border-stone-900 hover:border-[#646cff]/40 hover:bg-stone-900/10';
                        let visualAccentBg = 'bg-stone-950 border-stone-850 text-[#646cff]';
                        let typeBadgeStyles = 'text-[#767fff] bg-[#646cff]/10 border-[#646cff]/15';

                        if (isPdfState) {
                          blockCardStyles = 'bg-[#131010] border-rose-950/40 hover:border-rose-500/30 hover:bg-rose-950/5';
                          visualAccentBg = 'bg-rose-950/20 border-rose-900/30 text-rose-400';
                          typeBadgeStyles = 'text-rose-400 bg-rose-500/10 border-rose-500/15';
                        } else if (isEpubState) {
                          blockCardStyles = 'bg-[#101215] border-sky-950/40 hover:border-sky-500/30 hover:bg-sky-950/5';
                          visualAccentBg = 'bg-sky-950/20 border-sky-900/30 text-sky-450';
                          typeBadgeStyles = 'text-sky-400 bg-sky-500/10 border-sky-500/15';
                        } else if (isWebState) {
                          blockCardStyles = 'bg-[#101412] border-emerald-950/40 hover:border-emerald-500/30 hover:bg-emerald-950/5';
                          visualAccentBg = 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400';
                          typeBadgeStyles = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15';
                        } else if (isSampleState) {
                          blockCardStyles = 'bg-[#141210] border-amber-950/40 hover:border-amber-500/30 hover:bg-amber-950/5';
                          visualAccentBg = 'bg-amber-950/20 border-amber-900/30 text-amber-500';
                          typeBadgeStyles = 'text-amber-400 bg-amber-500/10 border-amber-500/15';
                        }

                        return (
                          <motion.div
                            key={book.id}
                            whileHover={{ y: -3, scale: 1.005, transition: { duration: 0.12 } }}
                            onClick={() => onSelectSample(book)}
                            className={`flex items-start p-4 sm:p-5 border rounded-2xl cursor-pointer transition-all text-left relative group font-sans ${blockCardStyles}`}
                          >
                            <div className={`p-3.5 border rounded-xl mr-3.5 mt-0.5 flex-shrink-0 transition-transform group-hover:scale-105 duration-300 ${visualAccentBg}`}>
                              {isPdfState ? (
                                <span className="text-xl select-none font-bold">📄</span>
                              ) : isEpubState ? (
                                <span className="text-xl select-none font-bold">📖</span>
                              ) : isWebState ? (
                                <span className="text-xl select-none font-bold">🌐</span>
                              ) : (
                                <span className="text-xl select-none font-bold">✨</span>
                              )}
                            </div>
                            
                            <div className="flex-grow min-w-0 pr-6 space-y-2">
                              <div>
                                <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug truncate group-hover:text-[#646cff] transition-colors tracking-tight">
                                  {book.title}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-stone-400 truncate font-semibold mt-0.5">
                                  {book.author}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`uppercase font-mono text-[8px] font-bold px-2 py-0.5 rounded border ${typeBadgeStyles}`}>
                                  {book.type === 'web' ? 'SITEPAGE' : book.type || 'CLASSIQUE'}
                                </span>
                                {book.fileSize && (
                                  <span className="text-[9px] font-mono text-stone-500 dark:text-stone-400 bg-[#111] dark:bg-stone-950/80 px-1.5 py-0.5 rounded border border-stone-900">
                                    {book.fileSize}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-stone-500 dark:text-stone-400 bg-[#111] dark:bg-stone-950/80 px-1.5 py-0.5 rounded border border-stone-900">
                                  {book.chapters?.length || 1} {book.chapters?.length > 1 ? 'chapitres' : 'chapitre'}
                                </span>
                              </div>
                              
                              {book.currentChapterIndex !== undefined && (
                                <div className="p-2 py-1.5 bg-[#111110] dark:bg-stone-950/40 rounded-xl border border-stone-900 text-[10px] text-stone-400 leading-normal flex items-center justify-between gap-1.5 font-sans">
                                  <span className="truncate max-w-[140px] sm:max-w-[200px] text-stone-300 font-bold block">
                                    🔖 {book.chapters && book.chapters[book.currentChapterIndex]
                                      ? book.chapters[book.currentChapterIndex].title
                                      : `Section ${book.currentChapterIndex + 1}`}
                                  </span>
                                  <span className="text-[9px] text-[#767fff] font-bold font-mono">REPRENDRE &rarr;</span>
                                </div>
                              )}
                              
                              {/* Progress Tracker */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-stone-400 font-sans">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${book.progressPercent >= 99 ? 'text-emerald-500' : 'text-stone-600'}`} />
                                    <span>
                                      {book.progressPercent >= 99 
                                        ? 'Terminé' 
                                        : book.progressPercent > 0 
                                          ? 'En cours de lecture' 
                                          : 'Non commencé'
                                      }
                                    </span>
                                  </div>
                                  <span className="font-mono text-stone-350">{Math.round(book.progressPercent || 0)}%</span>
                                </div>
                                <div className="bg-stone-950 rounded-full h-1.5 overflow-hidden border border-stone-900">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${book.progressPercent || 0}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className={`h-1.5 rounded-full ${
                                      book.progressPercent >= 99 
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                        : 'bg-gradient-to-r from-[#646cff] to-[#7b83f8]'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Delete actions */}
                            {confirmDeleteId === book.id ? (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-2 right-2 flex items-center space-x-2 z-20 bg-stone-950 border border-red-500/30 p-1.5 rounded-xl text-[10px]"
                              >
                                <span className="font-extrabold text-red-400 uppercase tracking-tight text-[9px] px-1">Effacer ?</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteBook(book.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 bg-red-650 hover:bg-red-750 text-white rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-medium transition-all cursor-pointer"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(book.id);
                                }}
                                className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-950 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer"
                                title="Supprimer ce document de ma bibliothèque"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Search filter returned 0 results */
                    <div className="p-10 border border-stone-900 rounded-2xl bg-[#111110]/50 text-center flex flex-col items-center justify-center space-y-3">
                      <Search className="w-8 h-8 text-stone-600" />
                      <div>
                        <h4 className="font-black text-sm text-white font-sans">Aucun résultat trouvé</h4>
                        <p className="text-xs text-stone-400 mt-1 max-w-sm leading-relaxed font-sans">
                          Aucun de vos livres ou articles importés ne correspond à la recherche "{searchQuery}" ou aux filtres actifs.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('all');
                          setProgressFilter('all');
                        }}
                        className="px-4 py-1.5 bg-[#646cff] text-white hover:bg-[#525aff] font-mono text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        REINITIALISER LES RECHERCHES
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border border-stone-900 rounded-2xl bg-[#111110] text-center flex flex-col items-center justify-center">
                  <FileText className="w-10 h-10 text-stone-700 mb-3" />
                  <h3 className="font-black text-sm text-white font-sans font-sans">Votre bibliothèque est vide</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm leading-relaxed font-sans font-sans">
                    Glissez-déposez ou parcourez des documents électroniques PDF ou ePUB pour les ajouter à votre bibliothèque de lecture audio !
                  </p>
                  <div className="flex gap-3 mt-4">
                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('importer')}
                        className="px-4 py-2 bg-[#646cff] text-white hover:bg-[#525aff] font-bold rounded-full transition-all text-xs cursor-pointer"
                      >
                        Importer un document
                      </button>
                    )}
                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('librairie')}
                        className="px-4 py-2 bg-transparent text-stone-300 hover:text-white border border-stone-800 font-bold rounded-full transition-all text-xs cursor-pointer"
                      >
                        Explorer les Classiques
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'samples' && !showLibraryAndBookmarksOnly && (
            <motion.div
              key="samples-tab-inner"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SAMPLES.map((sample) => (
                  <motion.div
                    key={sample.id}
                    whileHover={{ y: -3, transition: { duration: 0.1 } }}
                    onClick={() => onSelectSample(sample)}
                    className="flex flex-col bg-stone-900/40 border border-stone-900 rounded-2xl p-5 cursor-pointer hover:border-[#646cff]/50 hover:bg-stone-900/60 transition-all text-left group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-[#646cff]/10 text-[#767fff] uppercase border border-[#646cff]/15">
                        {getLanguageLabel(sample.language)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold font-mono bg-stone-950 text-stone-400 px-2 py-0.5 rounded">
                        Classique
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-black text-white flex-grow leading-snug font-sans group-hover:text-[#646cff] transition-all">
                      {sample.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 font-sans">
                      {sample.author}
                    </p>

                    <div className="mt-4 pt-4 border-t border-stone-900 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                      <span>{sample.chapters.length} sections</span>
                      <span className="flex items-center text-[#646cff] group-hover:text-[#767fff] font-bold">
                        Écouter &rarr;
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {isBookmarksActive && (
            <motion.div
              key="bookmarks-tab-inner"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {bookmarks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.map((bm) => {
                    const matchingBook = recentBooks.find(b => b.id === bm.documentId) || SAMPLES.find(s => s.id === bm.documentId);
                    const dateLabel = new Date(bm.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                    
                    return (
                      <div
                        key={bm.id}
                        onClick={() => onSelectBookmark(bm)}
                        className="flex flex-col p-4 bg-[#111110] border border-stone-900 rounded-2xl hover:border-[#646cff]/50 hover:shadow-sm transition-all cursor-pointer text-left text-xs"
                      >
                        <div className="flex items-center justify-between mb-2 text-[10px] font-mono font-bold text-stone-550">
                          <span className="truncate max-w-[200px] text-stone-300 font-bold">
                            📖 {matchingBook?.title || 'Document'}
                          </span>
                          <span>
                            {dateLabel}
                          </span>
                        </div>

                        <p className="text-stone-200 font-serif italic mb-2.5 pl-2.5 border-l-2 border-[#646cff]/40 line-clamp-2 leading-relaxed text-xs">
                          "{bm.textSnippet}"
                        </p>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-[#767fff] font-bold uppercase tracking-wider font-mono">
                          <span>Sec. {bm.chapterIndex + 1} — Para. {bm.paragraphIndex + 1}</span>
                          <span>Reprendre ici &rarr;</span>
                        </div>

                        {bm.note && (
                          <div className="mt-2.5 p-2 bg-[#646cff]/5 border border-[#646cff]/10 rounded-xl text-stone-300">
                            <span className="font-extrabold text-[9px] text-[#767fff] block uppercase tracking-wide mb-0.5">Note personnelle :</span>
                            <p className="leading-relaxed">{bm.note}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border border-stone-900 rounded-2xl bg-[#111110] text-center flex flex-col items-center justify-center">
                  <BookmarkIcon className="w-10 h-10 text-stone-700 mb-3" />
                  <h3 className="font-black text-sm text-white font-sans">Aucun signet ou note</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm leading-relaxed font-sans">
                    Pendant que vous lisez, double-cliquez ou configurez des signets pour épingler des citations et rédiger des notes vocales ou écrites !
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
