import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, BookOpen, AlertCircle, Loader2, Sparkles, FileText, Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, Bookmark } from '../types';
import { SAMPLES } from '../data/samples';
import { parseEpub } from '../lib/epubParser';
import { parsePdf } from '../lib/pdfParser';

interface DocumentUploadProps {
  onDocumentAdded: (doc: DocumentBook) => void;
  onSelectSample: (doc: DocumentBook) => void;
  recentBooks: DocumentBook[];
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onDeleteBook: (bookId: string) => void;
}

export default function DocumentUpload({ onDocumentAdded, onSelectSample, recentBooks, bookmarks, onSelectBookmark, onDeleteBook }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'samples' | 'bookmarks'>(
    recentBooks.length > 0 ? 'library' : 'samples'
  );

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-amber-800 bg-amber-500/10 rounded-full border border-amber-500/20 uppercase dark:text-amber-300">
          Synthèse Vocale Pro / Hors Ligne
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 font-serif">
          Liseur Acoustique
        </h1>
        <p className="mt-3 text-base text-stone-600 max-w-xl mx-auto dark:text-stone-400">
          Convertissez vos documents PDF et ePUB en récits audio immersifs avec notre moteur de synthèse naturelle fluide et autonome.
        </p>
      </motion.div>

      {/* Upload Zone */}
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
            ? 'border-amber-500 bg-amber-500/5 scale-[1.01] shadow-lg dark:bg-amber-500/10'
            : 'border-stone-300 bg-white hover:border-stone-400 hover:shadow-md dark:border-stone-700 dark:bg-[#151312] dark:hover:border-stone-600'
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
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                <BookOpen className="w-5 h-5 text-amber-600 absolute top-3.5 left-3.5 font-bold" />
              </div>
              <p className="font-semibold text-stone-700 dark:text-stone-300">{progressMessage}</p>
              <p className="text-xs text-stone-400">Analyse de la structure du fichier en cours, veuillez patienter...</p>
            </motion.div>
          ) : (
            <motion.div
              key="upload-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="p-4 bg-stone-50 rounded-full text-stone-400 dark:bg-stone-800 dark:text-stone-300">
                <Upload className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
                  Déposez votre document ici, ou <span className="text-amber-600 underline decoration-2 underline-offset-2 hover:text-amber-500">parcourez</span>
                </p>
                <p className="text-sm text-stone-400 mt-2">
                  Prend en charge les formats <strong className="text-stone-600 dark:text-stone-350">PDF</strong> et <strong className="text-stone-600 dark:text-stone-350">ePUB</strong> (sans DRM)
                </p>
              </div>
              <div className="flex gap-4 pt-2 text-xs text-stone-400 font-mono">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> PDF (Texte indexé)
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> ePUB (Chapitré)
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Alert */}
      <AnimatePresence>
        {errorStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-300"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Une erreur est survenue lors de l'import :</p>
              <p className="text-sm mt-1">{errorStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switcher */}
      <div className="mt-12 mb-8 flex justify-center">
        <div className="flex p-1.5 bg-[#FAF9F5] dark:bg-[#151312] rounded-xl border border-stone-200 dark:border-stone-850 max-w-full overflow-x-auto select-none gap-1 sm:gap-1.5 focus:outline-none scrollbar-none">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'library'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-605 dark:text-stone-400 hover:text-stone-900 dark:hover:text-[#F9F8F6] hover:bg-stone-50 dark:hover:bg-stone-850/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ma Bibliothèque ({recentBooks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-605 dark:text-stone-400 hover:text-stone-900 dark:hover:text-[#F9F8F6] hover:bg-stone-50 dark:hover:bg-stone-850/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Suggestions Classiques ({SAMPLES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-605 dark:text-stone-400 hover:text-stone-900 dark:hover:text-[#F9F8F6] hover:bg-stone-50 dark:hover:bg-stone-850/50'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>Mes Signets & Notes ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* Tabs Dynamic Rendering Panel */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'samples' && (
            <motion.div
              key="samples-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="font-sans"
            >
              <div className="flex items-center space-x-2 mb-6">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-extrabold text-stone-800 dark:text-stone-100 font-serif">
                  Explorer des chefs-d'œuvre (Prêts à l'écoute)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SAMPLES.map((sample) => (
                  <motion.div
                    key={sample.id}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    onClick={() => onSelectSample(sample)}
                    className="flex flex-col bg-[#F5F2ED] border border-stone-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-amber-500/50 dark:bg-[#1a1816] dark:border-stone-800 dark:hover:bg-[#22201e] dark:hover:border-amber-500/40 transition-all text-left group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/10 text-amber-800 dark:text-amber-305 uppercase">
                        {getLanguageLabel(sample.language)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold font-mono bg-stone-200/60 text-stone-700 px-2 py-0.5 rounded dark:bg-stone-800 dark:text-stone-305">
                        Échantillon
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-stone-850 dark:text-stone-200 flex-grow leading-snug font-serif group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {sample.title}
                    </h3>
                    <p className="text-sm text-stone-605 mt-1 dark:text-stone-400">
                      {sample.author}
                    </p>

                    <div className="mt-4 pt-4 border-t border-stone-300/30 dark:border-stone-800/60 flex items-center justify-between text-xs text-stone-500 font-mono">
                      <span>{sample.chapters.length} section(s)</span>
                      <span className="flex items-center text-amber-600 font-bold dark:text-amber-400">
                        Débuter l'écoute →
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="font-sans"
            >
              <div className="flex items-center space-x-2.5 mb-6">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-extrabold text-stone-800 dark:text-stone-100 font-serif">
                  Vos documents importés ({recentBooks.length})
                </h2>
              </div>

              {recentBooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentBooks.map((book) => (
                    <motion.div
                      key={book.id}
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      onClick={() => onSelectSample(book)}
                      className="flex items-start p-4 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-amber-500/50 hover:shadow-sm dark:bg-[#151312] dark:border-stone-800 dark:hover:border-stone-700 transition-all text-left relative group"
                    >
                      <div className="p-3 bg-stone-50 rounded-lg mr-4 mt-0.5 text-amber-500 dark:bg-stone-800 dark:text-amber-400 flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-grow min-w-0 pr-6">
                        <h3 className="font-bold text-stone-805 truncate dark:text-stone-100 font-serif group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-stone-400 truncate mt-0.5">
                          {book.author} — <span className="uppercase font-mono text-[9px] font-bold text-stone-500">{book.type}</span>
                        </p>
                        
                        {/* Position details */}
                        {book.currentChapterIndex !== undefined && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            <span>Dernier arrêt :</span>
                            <span className="truncate max-w-[180px] sm:max-w-[240px]">
                              {book.chapters && book.chapters[book.currentChapterIndex]
                                ? `${book.chapters[book.currentChapterIndex].title} (Para. ${(book.currentParagraphIndex || 0) + 1})`
                                : `Section ${book.currentChapterIndex + 1}`}
                            </span>
                          </div>
                        )}
                        
                        {/* Progress Line */}
                        <div className="mt-3 flex items-center space-x-2">
                          <div className="flex-grow bg-stone-100 rounded-full h-1.5 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${book.progressPercent || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-semibold text-stone-500 min-w-[28px] text-right font-mono">
                            {Math.round(book.progressPercent || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Confirm Delete state or Simple delete button */}
                      {confirmDeleteId === book.id ? (
                        <div className="absolute top-2 right-2 flex items-center space-x-1.5 z-10 bg-[#FAF9F5] dark:bg-[#151312] p-1.5 rounded-lg border border-red-200 dark:border-red-950/40 shadow-sm">
                          <span className="text-[10px] font-bold text-red-500">Supprimer ?</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBook(book.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-extrabold hover:bg-red-650 transition-colors cursor-pointer"
                          >
                            Oui
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded text-[10px] font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(book.id);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-450 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer"
                          title="Supprimer ce document de ma bibliothèque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-10 border border-stone-200 dark:border-stone-850 rounded-2xl bg-[#F5F2ED]/30 dark:bg-[#100e0d]/20 text-center flex flex-col items-center justify-center">
                  <FileText className="w-10 h-10 text-stone-300 dark:text-stone-700 mb-3" />
                  <h3 className="font-bold text-base text-stone-750 dark:text-stone-300 font-serif">Votre bibliothèque est vide</h3>
                  <p className="text-xs text-stone-400 mt-1.5 max-w-sm leading-relaxed">
                    Glissez-déposez un fichier PDF ou ePUB ci-dessus pour l'ajouter à VoxRead Pro, ou commencez par explorer un de nos classiques littéraires suggérés !
                  </p>
                  <button
                    onClick={() => setActiveTab('samples')}
                    className="mt-5 px-4.5 py-2.5 bg-amber-500/15 text-amber-800 hover:bg-amber-500 hover:text-stone-950 font-extrabold rounded-xl transition-all duration-200 text-xs cursor-pointer border border-amber-500/20"
                  >
                    Découvrir les Classiques →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bookmarks' && (
            <motion.div
              key="bookmarks-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="font-sans"
            >
              <div className="flex items-center space-x-2.5 mb-6">
                <BookmarkIcon className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-extrabold text-stone-800 dark:text-stone-100 font-serif">
                  Vos Signets & Notes de lecture ({bookmarks.length})
                </h2>
              </div>

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
                        className="flex flex-col p-4 bg-white border border-stone-200 rounded-xl hover:border-amber-500/50 hover:shadow-sm dark:bg-[#151312] dark:border-stone-800 dark:hover:border-stone-700 transition-all cursor-pointer text-left text-xs"
                      >
                        <div className="flex items-center justify-between mb-2 text-[10px] font-mono font-bold text-stone-400">
                          <span className="truncate max-w-[200px] text-stone-605 dark:text-stone-300 font-bold">
                            📚 {matchingBook?.title || 'Document'}
                          </span>
                          <span>
                            {dateLabel}
                          </span>
                        </div>

                        <p className="text-[#2D2926] dark:text-stone-200 font-serif italic mb-2.5 pl-2.5 border-l-2 border-amber-500/40 line-clamp-2 leading-relaxed">
                          "{bm.textSnippet}"
                        </p>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                          <span>Sec. {bm.chapterIndex + 1} — Para. {bm.paragraphIndex + 1}</span>
                          <span className="group-hover:translate-x-1 duration-200 transition-transform">Reprendre ici &rarr;</span>
                        </div>

                        {bm.note && (
                          <div className="mt-2.5 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-stone-700 dark:text-stone-300">
                            <span className="font-extrabold text-[9px] text-amber-700 dark:text-amber-400 block uppercase tracking-wide mb-0.5">Note personnelle :</span>
                            <p className="leading-relaxed">{bm.note}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 border border-stone-200 dark:border-stone-850 rounded-2xl bg-[#F5F2ED]/30 dark:bg-[#100e0d]/20 text-center flex flex-col items-center justify-center">
                  <BookmarkIcon className="w-10 h-10 text-stone-300 dark:text-stone-700 mb-3" />
                  <h3 className="font-bold text-base text-stone-750 dark:text-stone-300 font-serif">Aucun signet enregistré</h3>
                  <p className="text-xs text-stone-400 mt-1.5 max-w-sm leading-relaxed">
                    Pendant que vous écoutez un texte, cliquez sur le paragraphe pour marquer des points d'arrêt, dictez ou rédigez vos notes. Tout sera sauvegardé ici !
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
