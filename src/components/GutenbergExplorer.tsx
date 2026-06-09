import React, { useState, useEffect, FormEvent } from 'react';
import { Search, Download, BookOpen, Sparkles, Globe, RefreshCw, AlertCircle, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, Chapter } from '../types';

// Helper function to detect if the downloaded contents are actually HTML code/error pages/API errors
function isHtmlOrError(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();

  // Basic tags or JSON objects representing errors
  if (
    s.startsWith('<!doctype html') ||
    s.startsWith('<html') ||
    s.startsWith('<xml') ||
    s.startsWith('{"error":') ||
    s.startsWith('error:') ||
    s.startsWith('{"message":')
  ) {
    return true;
  }

  // Common titles, markers for proxy failures/blocks or HTTP redirects
  if (
    s.includes('403 forbidden') ||
    s.includes('451 unavailable') ||
    s.includes('404 not found') ||
    s.includes('too many requests') ||
    s.includes('cloudflare') ||
    s.includes('access denied') ||
    s.includes('attention required!') ||
    s.includes('error 404') ||
    s.includes('site is down') ||
    s.includes('unauthorized access') ||
    s.includes('request limit exceeded') ||
    s.includes('blocked by') ||
    (s.includes('<head') && s.includes('<body'))
  ) {
    return true;
  }

  // Reject extremely short snippet HTML files
  if (s.length < 1500 && (s.includes('</div>') || s.includes('</span>') || s.includes('</p>'))) {
    return true;
  }

  // If the header looks like standard web stylesheet CSS or JavaScript block
  if (s.substring(0, 500).includes('<script') || s.substring(0, 500).includes('<style')) {
    return true;
  }

  return false;
}

interface GutenbergExplorerProps {
  onDocumentAdded: (doc: DocumentBook) => void;
  recentBooks: DocumentBook[];
  onSelectSample: (doc: DocumentBook) => void;
  onNavigateToTab?: (tab: 'accueil' | 'lire' | 'biblio' | 'librairie' | 'importer') => void;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  languages: string[];
  download_count: number;
  formats: { [mimeType: string]: string };
}

// Hand-picked famous Gutenberg masterpieces across languages with verified IDs
const FEATURED_GUTENBERG = [
  // French
  {
    id: 32854,
    title: 'Arsène Lupin, gentleman-cambrioleur',
    author: 'Maurice Leblanc',
    language: 'fr',
    genre: 'Policier / Mystère',
    description: 'La première apparition du célèbre bandit au grand cœur, élégant et facétieux.',
    cover: '🎩'
  },
  {
    id: 800,
    title: 'Le Tour du monde en 80 jours',
    author: 'Jules Verne',
    language: 'fr',
    genre: 'Aventure',
    description: 'Le pari fou de Phileas Fogg et son fidèle passepartout à travers le globe.',
    cover: '🎈'
  },
  {
    id: 13951,
    title: 'Les Trois Mousquetaires',
    author: 'Alexandre Dumas',
    language: 'fr',
    genre: 'Action / Historique',
    description: '« Un pour tous, tous pour un ! » L\'arrivée tumultueuse de d\'Artagnan à Paris.',
    cover: '⚔️'
  },
  {
    id: 5097,
    title: 'Vingt mille lieues sous les mers',
    author: 'Jules Verne',
    language: 'fr',
    genre: 'Science-Fiction / Classique',
    description: 'Voyagez à bord du Nautilus en compagnie du mystérieux et fascinant Capitaine Nemo.',
    cover: '🐙'
  },
  // English
  {
    id: 11,
    title: 'Alice\'s Adventures in Wonderland',
    author: 'Lewis Carroll',
    language: 'en',
    genre: 'Fantasy / Merveilleux',
    description: 'Follow Alice down the rabbit hole into a world of nonsense, queens and tea parties.',
    cover: '🐇'
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    language: 'en',
    genre: 'Romance / Satire',
    description: 'The romantic clash between the opinionated Elizabeth Bennet and the proud Mr. Darcy.',
    cover: '💌'
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    language: 'en',
    genre: 'Mystère / Détective',
    description: 'A collection of the finest and most brain-teasing cases solved by Sherlock Holmes.',
    cover: '🔍'
  },
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    language: 'en',
    genre: 'Gothique / Science-Fiction',
    description: 'A brilliant scientist crafts a living creature out of anatomical components.',
    cover: '⚡'
  },
  // Spanish
  {
    id: 2000,
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes Saavedra',
    language: 'es',
    genre: 'Classique / Satire',
    description: 'Las aventuras del hidalgo caballero Alonso Quijano y su fiel escudero Sancho Panza.',
    cover: '🛡️'
  },
  {
    id: 31221,
    title: 'Rimas',
    author: 'Gustavo Adolfo Bécquer',
    language: 'es',
    genre: 'Poesía / Romanticismo',
    description: 'Una célebre colección de versos delicados y emotivos de la lírica castellana.',
    cover: '✍️'
  }
];

export default function GutenbergExplorer({
  onDocumentAdded,
  recentBooks,
  onSelectSample,
  onNavigateToTab
}: GutenbergExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLang, setActiveLang] = useState<'all' | 'fr' | 'en' | 'es'>('fr');
  const [searchResults, setSearchResults] = useState<GutendexBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Tracking download progress
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [successId, setSuccessId] = useState<number | null>(null);

  // Load popular on start
  useEffect(() => {
    // We remain on local hand-picked classics by default, then load live searches when requested
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setErrorText(null);
    setIsSearching(true);
    
    try {
      // Gutenberg search API
      let url = `https://gutendex.com/books/?search=${encodeURIComponent(searchQuery)}`;
      if (activeLang !== 'all') {
        url += `&languages=${activeLang}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Impossible de contacter la bibliothèque Gutenberg (Gutendex).');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setErrorText('Erreur lors de la recherche. Veuillez vérifier votre connexion internet et réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Run search automatically when active language changes while search matches
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [activeLang]);

  // Download and parse text
  const handleImportGutenberg = async (bookId: number, title: string, author: string, language: string) => {
    setDownloadingId(bookId);
    setErrorText(null);
    setDownloadProgress('Recherche du document...');

    try {
      let text = '';
      let fetchSuccess = false;
      const candidateUrls: string[] = [];

      // Phase 1: Tenter de requêter les métadonnées Gutendex d'abord pour trouver l'URL texte exacte
      try {
        setDownloadProgress('Recherche du format adapté sur Gutendex...');
        const bookMetaRes = await fetch(`https://gutendex.com/books/${bookId}`);
        if (bookMetaRes.ok) {
          const meta = await bookMetaRes.json();
          const formats = meta.formats || {};
          
          // Mimes préférés dans l'ordre de compatibilité texte brute
          const preferredMimes = [
            'text/plain; charset=utf-8',
            'text/plain; charset=us-ascii',
            'text/plain',
            'text/plain; charset=iso-8859-1'
          ];
          
          for (const mime of preferredMimes) {
            if (formats[mime]) {
              candidateUrls.push(formats[mime]);
            }
          }
        }
      } catch (metaErr) {
        console.warn('Echec de la récupération des métadonnées, passage aux URLs classiques devinées', metaErr);
      }

      // Ajouter les formats classiques devinés comme fallbacks
      candidateUrls.push(`https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`);
      candidateUrls.push(`https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`);
      candidateUrls.push(`https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`);
      candidateUrls.push(`https://www.gutenberg.org/files/${bookId}/${bookId}.txt`);
      candidateUrls.push(`https://www.gutenberg.org/files/${bookId}/${bookId}-8.txt`);

      // Dédoublonner les candidats
      const uniqueUrls = Array.from(new Set(candidateUrls));

      // Proxy list function wrapper to guarantee robust retrieval
      const proxyFetchers = [
        // 1. corsproxy.io (Rapide pour requêtes directes)
        async (url: string) => {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
          if (res.ok) {
            const body = await res.text();
            if (body && body.length > 500 && !isHtmlOrError(body)) return body;
          }
          throw new Error('corsproxy.io vide, non-valide ou bloqué');
        },
        // 2. codetabs.com (Proxy d'appoint libre extremely performant et résilient)
        async (url: string) => {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
          if (res.ok) {
            const body = await res.text();
            if (body && body.length > 500 && !isHtmlOrError(body)) return body;
          }
          throw new Error('codetabs vide, non-valide ou bloqué');
        },
        // 3. allorigins.win JSON API (Extrêmement robuste contre le blocage géocinglé car exécuté sur serveur)
        async (url: string) => {
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.contents && data.contents.length > 500 && !isHtmlOrError(data.contents)) {
              return data.contents;
            }
          }
          throw new Error('allorigins api renvoie vide, faux ou bloqué');
        },
        // 4. allorigins.win direct raw redirection
        async (url: string) => {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            const body = await res.text();
            if (body && body.length > 550 && !isHtmlOrError(body)) return body;
          }
          throw new Error('allorigins raw vide ou bloqué');
        },
        // 5. thingproxy.freeboard.io
        async (url: string) => {
          const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`);
          if (res.ok) {
            const body = await res.text();
            if (body && body.length > 500 && !isHtmlOrError(body)) return body;
          }
          throw new Error('thingproxy vide ou bloqué');
        }
      ];

      // Essayer systématiquement les URLs via tous les proxies
      outerLoop:
      for (let u = 0; u < uniqueUrls.length; u++) {
        const url = uniqueUrls[u];
        for (let p = 0; p < proxyFetchers.length; p++) {
          try {
            setDownloadProgress(`Téléchargement (Source ${u + 1}/${uniqueUrls.length}, Proxy ${p + 1}/${proxyFetchers.length})...`);
            const fetchedContent = await proxyFetchers[p](url);
            if (fetchedContent && fetchedContent.length > 1000 && !isHtmlOrError(fetchedContent)) {
              text = fetchedContent;
              fetchSuccess = true;
              break outerLoop;
            }
          } catch (e) {
            console.warn(`Le proxy ${p + 1} a échoué pour l'URL : ${url}`, e);
          }
        }
      }

      if (!fetchSuccess || !text || text.length < 500 || isHtmlOrError(text)) {
        throw new Error('Impossible d\'extraire le contenu textuel de cette œuvre classique depuis les serveurs du Projet Gutenberg. Les serveurs de transit tiers ou Gutenberg sont peut-être temporairement indisponibles.');
      }

      setDownloadProgress('Génération de la liseuse (découpage chapitres)...');
      
      // Parse Gutenberg text
      const chapters = parseGutenbergText(text, title, author);

      const newGutenbergBook: DocumentBook = {
        id: `gutenberg_${bookId}`,
        title: title || 'Livre Gutenberg sans titre',
        author: author || 'Auteur anonyme',
        language: language || 'fr',
        type: 'sample', // Marks it as sample/text structured book
        chapters,
        progressPercent: 0,
        currentChapterIndex: 0,
        currentParagraphIndex: 0,
        addedAt: Date.now(),
        fileSize: `${(text.length / 1024).toFixed(0)} KB`
      };

      // Add to local database
      onDocumentAdded(newGutenbergBook);
      setSuccessId(bookId);
      
      // Sensation of accomplishment! Auto select and navigate to reader in 1.4s
      setTimeout(() => {
        onSelectSample(newGutenbergBook);
        if (onNavigateToTab) {
          onNavigateToTab('lire');
        }
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Le téléchargement de l\'œuvre a échoué. Veuillez réessayer.');
    } finally {
      setDownloadingId(null);
      setDownloadProgress('');
    }
  };

  // Gutenberg parser helper to strip metadata legal items and divide into readable chunks
  const parseGutenbergText = (text: string, title: string, author: string): Chapter[] => {
    let cleanText = text;
    
    const startMarkers = [
      '*** START OF THE PROJECT GUTENBERG EBOOK',
      '*** START OF THIS PROJECT GUTENBERG',
      '***START OF THE PROJECT GUTENBERG',
      'START OF THE PROJECT GUTENBERG',
      '*END*THE SMALL PRINT!'
    ];
    
    const endMarkers = [
      '*** END OF THIS PROJECT GUTENBERG',
      '*** END OF THE PROJECT GUTENBERG',
      '***END OF THE PROJECT GUTENBERG',
      'End of the Project Gutenberg',
      'End of Project Gutenberg'
    ];
    
    let startIndex = 0;
    for (const marker of startMarkers) {
      const idx = cleanText.indexOf(marker);
      if (idx !== -1) {
        const lineEnd = cleanText.indexOf('\n', idx);
        if (lineEnd !== -1) {
          startIndex = lineEnd + 1;
        } else {
          startIndex = idx + marker.length;
        }
        break;
      }
    }
    
    let endIndex = cleanText.length;
    for (const marker of endMarkers) {
      const idx = cleanText.indexOf(marker, startIndex);
      if (idx !== -1) {
        endIndex = idx;
        break;
      }
    }
    
    cleanText = cleanText.substring(startIndex, endIndex).trim();
    
    // Identify headings
    const chapterLinesRegex = /^\s*(?:CHAPITRE\s+[I|V|X|L|C|D|M\d]+|CHAPTER\s+[I|V|X|L|C|D|M\d]+|ACT\s+[I|V|X|L|C|D|M\d]+|SCENE\s+[I|V|X|L|C|D|M\d]+|PRÓLOGO|SECCIÓN\s+[I|V|X|L|C|D|M\d]+|INTRO|INTRODUCTION|PREFACE|PROLOGUE)\b/im;
    
    const rawParagraphs = cleanText.split(/\r?\n\r?\n+/);
    
    const chapters: Chapter[] = [];
    let currentChapterTitle = 'Début de l\'œuvre';
    let currentChapterParagraphs: string[] = [];
    
    const createAndPushChapter = (titleStr: string, paragraphs: string[]) => {
      if (paragraphs.length === 0) return;
      const content = paragraphs.join('\n\n');
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      
      chapters.push({
        id: `gt_ch_${chapters.length + 1}`,
        title: titleStr.trim(),
        content,
        paragraphs: paragraphs.map(p => p.trim()).filter(Boolean),
        wordCount
      });
    };
    
    for (const paragraph of rawParagraphs) {
      const lines = paragraph.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && lines[0].length < 100 && chapterLinesRegex.test(lines[0])) {
        // We found a new chapter heading!
        createAndPushChapter(currentChapterTitle, currentChapterParagraphs);
        currentChapterTitle = lines.join(' — ');
        currentChapterParagraphs = [];
      } else {
        const pText = lines.join(' ');
        if (pText) {
          currentChapterParagraphs.push(pText);
        }
      }
    }
    
    createAndPushChapter(currentChapterTitle, currentChapterParagraphs);
    
    // Ensure we actually chunked nicely, fallback if single huge chapter
    if (chapters.length <= 1) {
      const allParas = chapters.length === 1 ? chapters[0].paragraphs : currentChapterParagraphs;
      const chunkedChapters: Chapter[] = [];
      const paraSize = 40;
      
      for (let i = 0; i < allParas.length; i += paraSize) {
        const chunkParas = allParas.slice(i, i + paraSize);
        const content = chunkParas.join('\n\n');
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        chunkedChapters.push({
          id: `gt_part_${chunkedChapters.length + 1}`,
          title: `Partie ${chunkedChapters.length + 1}`,
          content,
          paragraphs: chunkParas,
          wordCount
        });
      }
      
      return chunkedChapters.length > 0 ? chunkedChapters : [
        {
          id: 'gt_single',
          title: 'Livre complet',
          content: cleanText,
          paragraphs: [cleanText],
          wordCount: cleanText.split(/\s+/).filter(Boolean).length
        }
      ];
    }
    
    return chapters;
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'fr': return 'Français';
      case 'en': return 'Anglais';
      case 'es': return 'Espagnol';
      default: return lang.toUpperCase();
    }
  };

  // Filter our local hand-picked classics list
  const filteredFeatured = activeLang === 'all'
    ? FEATURED_GUTENBERG
    : FEATURED_GUTENBERG.filter(b => b.language === activeLang);

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* 1. Header Information Bar */}
      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#646cff]/10 text-[#646cff] dark:text-[#767fff] rounded-xl flex-shrink-0">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 dark:text-white text-sm">Projet Gutenberg Intégré</h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">Accédez à plus de 70 000 œuvres littéraires gratuites, téléchargeables et prêtes à l'écoute vocale !</p>
          </div>
        </div>
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200 dark:border-stone-900 self-stretch sm:self-auto justify-center select-none font-sans text-[11px] font-bold">
          <button 
            type="button"
            onClick={() => setActiveLang('fr')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'fr' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Français
          </button>
          <button 
            type="button"
            onClick={() => setActiveLang('en')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'en' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Anglais
          </button>
          <button 
            type="button"
            onClick={() => setActiveLang('es')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'es' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Espagnol
          </button>
          <button 
            type="button"
            onClick={() => setActiveLang('all')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'all' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Tous
          </button>
        </div>
      </div>

      {/* 2. Interactive Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2.5">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre ou auteur... (ex: 'Victor Hugo', 'Verne', 'Sherlock')"
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-stone-900/40 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-850 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#646cff] focus:ring-1 focus:ring-[#646cff] placeholder-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setIsSearching(false); setSearchResults([]); }}
              className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-white text-xs font-bold"
            >
              Effacer
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-[#646cff] hover:bg-[#525aff] text-white rounded-2xl font-black transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 shadow-md flex-shrink-0"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Rechercher</span>
        </button>
      </form>

      {/* Error prompt */}
      <AnimatePresence>
        {errorText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-500 dark:text-red-300 flex items-start space-x-2.5 text-xs"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Rendering Area */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          
          {/* A. Search Results Grid */}
          {isSearching ? (
            <motion.div
              key="search-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#646cff]" />
                  <span>Résultats de recherche ({searchResults.length})</span>
                </h4>
                <button
                  onClick={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }}
                  className="text-xs text-stone-500 hover:text-[#646cff] font-bold"
                >
                  Retour aux sélections
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                  <LoaderIcon className="w-10 h-10 text-[#646cff] animate-spin" />
                  <p className="text-sm font-bold text-stone-600 dark:text-stone-300">Recherche dans la base universelle Gutenberg...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((book) => {
                    const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : 'Auteur classique';
                    const hasRecent = recentBooks.some(b => b.id === `gutenberg_${book.id}`);
                    
                    return (
                      <div
                        key={book.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-white dark:bg-[#131212]/90 border border-stone-200 dark:border-stone-900 rounded-[20px] shadow-sm hover:border-[#646cff]/50 transition-all text-xs"
                      >
                        <div className="min-w-0 pr-4 text-left flex-grow space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-905 text-[9px] font-mono font-bold text-stone-500 uppercase border border-stone-200 dark:border-[#131212]">
                              ID {book.id}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-[#646cff] text-[9px] font-mono font-bold uppercase">
                              {book.languages.join(', ').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-stone-400 font-medium">
                              {book.download_count?.toLocaleString()} dlds
                            </span>
                          </div>
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-sm truncate font-sans tracking-tight">
                            {book.title}
                          </h4>
                          <p className="text-stone-500 dark:text-stone-400 text-xs font-sans truncate">
                            {authorName}
                          </p>
                        </div>

                        {/* Import button */}
                        <div className="mt-3 sm:mt-0 flex-shrink-0 self-end sm:self-auto">
                          {hasRecent ? (
                            <span className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold font-sans">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Importé</span>
                            </span>
                          ) : downloadingId === book.id ? (
                            <div className="flex flex-col items-end min-w-[124px]">
                              <span className="text-[10px] text-[#646cff] font-bold flex items-center gap-1.5 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {downloadProgress}
                              </span>
                            </div>
                          ) : successId === book.id ? (
                            <span className="inline-flex items-center gap-1 px-3 py-2 bg-[#646cff]/10 text-[#646cff] dark:text-[#767fff] rounded-xl font-black">
                              Prêt ! &rarr;
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleImportGutenberg(book.id, book.title, authorName, book.languages[0] || 'fr')}
                              className="px-3.5 py-2 bg-stone-100 hover:bg-[#646cff] text-stone-700 hover:text-white dark:bg-stone-900 dark:hover:bg-[#646cff] dark:text-stone-300 rounded-xl font-black cursor-pointer shadow-sm hover:shadow transition-all flex items-center gap-1.5 border border-stone-200 dark:border-stone-800"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Importer</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center flex flex-col items-center justify-center p-6 border border-dashed border-stone-200 dark:border-stone-850 rounded-[32px]">
                  <p className="text-stone-500 text-sm">Aucun résultat trouvé pour votre recherche.</p>
                  <p className="text-xs text-stone-400 mt-1">Veuillez essayer avec un autre mot-clé ou changer le filtre linguistique.</p>
                </div>
              )}
            </motion.div>
          ) : (
            
            // B. Hand-Picked Famous Classics (Default Screen)
            <motion.div
              key="featured-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Chefs-d'œuvre Classiques du Domaine Public ({filteredFeatured.length})</span>
                </h4>
                <p className="text-[10px] text-stone-400 font-mono font-bold hidden sm:block">CLIQUEZ POUR IMPORTER ET ÉCOUTER</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredFeatured.map((book) => {
                  const hasRecent = recentBooks.some(b => b.id === `gutenberg_${book.id}`);
                  
                  return (
                    <div
                      key={book.id}
                      className="flex flex-col p-5 bg-white dark:bg-[#131212]/90 border border-stone-200 dark:border-stone-900 rounded-[24px] shadow-sm relative group hover:border-[#646cff]/40 transition-all text-left space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-950 flex shadow-inner items-center justify-center text-xl border border-stone-100 dark:border-stone-905 flex-shrink-0">
                          {book.cover}
                        </div>
                        <div className="min-w-0 pr-2">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-[#646cff]/10 text-indigo-700 dark:text-[#767fff] uppercase border border-[#646cff]/15">
                            {getLanguageLabel(book.language)}
                          </span>
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-base leading-snug font-sans group-hover:text-[#646cff] transition-all tracking-tight mt-1">
                            {book.title}
                          </h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                            {book.author}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-stone-400 dark:text-stone-400 leading-relaxed font-sans line-clamp-2">
                        {book.description}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-900/50">
                        <span className="text-[10px] text-stone-400 font-mono">Genre : <strong className="text-stone-600 dark:text-stone-300 font-sans font-medium">{book.genre}</strong></span>

                        {hasRecent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4" /> Importé
                          </span>
                        ) : downloadingId === book.id ? (
                          <span className="text-[10px] font-bold text-[#646cff] flex items-center gap-1.5 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            {downloadProgress}
                          </span>
                        ) : successId === book.id ? (
                          <span className="text-xs font-black text-[#646cff] animate-bounce">
                            Prêt ! 🚀
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportGutenberg(book.id, book.title, book.author, book.language)}
                            className="bg-[#646cff] hover:bg-[#525aff] text-white text-xs font-black py-2 px-4 rounded-full flex items-center gap-1.5 cursor-pointer shadow transition-all hover:scale-[1.02]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Lire & Écouter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

// Helper icon render to avoid missing component
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
