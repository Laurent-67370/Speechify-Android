import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Search, Download, BookOpen, Sparkles, Globe, RefreshCw, AlertCircle, CheckCircle, TrendingUp, ChevronRight, ChevronLeft, Flame, Dices, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook, Chapter } from '../types';

// Helper : décoder un ArrayBuffer en détectant l'encodage (UTF-8 ou Latin-1/ISO-8859-1)
function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Détecter BOM UTF-8 (EF BB BF)
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(buffer);
  }
  // Tenter UTF-8 strict
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return decoded;
  } catch {
    // Fallback Latin-1 (ISO-8859-1) pour les vieux fichiers Gutenberg
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

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

// ── Cache module-scope : préserve l'état de la librairie entre les changements d'onglet ──
// Le composant est lazy-loadé et démonté quand on quitte l'onglet ; ce cache survit
// tant que la page n'est pas rechargée et restaure recherche/genre/pagination au retour.
interface ExplorerCacheState {
  searchQuery: string;
  activeLang: 'all' | 'fr' | 'en' | 'es' | 'de' | 'it';
  isSearching: boolean;
  searchResults: any[];
  activeTopic: string | null;
  resultsTitle: string;
  totalCount: number;
  nextPageUrl: string | null;
}
let explorerCache: ExplorerCacheState | null = null;

// Genres/thèmes navigables — le paramètre topic de Gutendex cherche dans subjects + bookshelves
const GUTENBERG_TOPICS = [
  { id: 'adventure',   label: '🗺️ Aventure',        query: 'adventure' },
  { id: 'detective',   label: '🔍 Policier',         query: 'detective' },
  { id: 'scifi',       label: '🚀 Science-Fiction',  query: 'science fiction' },
  { id: 'love',        label: '💌 Romance',          query: 'love stories' },
  { id: 'horror',      label: '👻 Fantastique',      query: 'horror' },
  { id: 'poetry',      label: '🖋️ Poésie',           query: 'poetry' },
  { id: 'philosophy',  label: '🤔 Philosophie',      query: 'philosophy' },
  { id: 'history',     label: '🏛️ Histoire',         query: 'history' },
  { id: 'drama',       label: '🎭 Théâtre',          query: 'drama' },
  { id: 'fairy',       label: '🧚 Contes',           query: 'fairy tales' },
  { id: 'children',    label: '🧒 Jeunesse',         query: 'children' },
  { id: 'biography',   label: '👤 Biographies',      query: 'biography' },
  { id: 'travel',      label: '✈️ Voyages',          query: 'travel' },
  { id: 'humor',       label: '😄 Humour',           query: 'humor' },
  { id: 'music',       label: '🎵 Musique',          query: 'music' },
];

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
    cover: '🎩',
    bgClasses: 'from-[#0f172a] via-[#1e293b] to-[#020617]',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    spineColor: 'bg-amber-500/25',
    textColor: 'text-amber-50',
    secondaryColor: 'text-slate-350'
  },
  {
    id: 800,
    title: 'Le Tour du monde en 80 jours',
    author: 'Jules Verne',
    language: 'fr',
    genre: 'Aventure',
    description: 'Le pari fou de Phileas Fogg et son fidèle passepartout à travers le globe.',
    cover: '🎈',
    bgClasses: 'from-[#7c2d12] via-[#ea580c] to-[#431407]',
    accentColor: 'text-orange-300',
    borderColor: 'border-orange-500/35',
    spineColor: 'bg-orange-450/20',
    textColor: 'text-orange-50',
    secondaryColor: 'text-orange-200'
  },
  {
    id: 13951,
    title: 'Les Trois Mousquetaires',
    author: 'Alexandre Dumas',
    language: 'fr',
    genre: 'Action / Historique',
    description: '« Un pour tous, tous pour un ! » L\'arrivée tumultueuse de d\'Artagnan à Paris face au cardinal.',
    cover: '⚔️',
    bgClasses: 'from-[#7f1d1d] via-[#b91c1c] to-[#450a0a]',
    accentColor: 'text-yellow-400',
    borderColor: 'border-yellow-600/30',
    spineColor: 'bg-yellow-500/20',
    textColor: 'text-amber-100',
    secondaryColor: 'text-red-200'
  },
  {
    id: 5097,
    title: 'Vingt mille lieues sous les mers',
    author: 'Jules Verne',
    language: 'fr',
    genre: 'Science-Fiction / Classique',
    description: 'Voyagez à bord du Nautilus en compagnie du mystérieux et fascinant Capitaine Nemo.',
    cover: '🐙',
    bgClasses: 'from-teal-950 via-[#0d9488] to-[#134e4a]',
    accentColor: 'text-teal-300',
    borderColor: 'border-teal-500/30',
    spineColor: 'bg-teal-400/20',
    textColor: 'text-teal-100',
    secondaryColor: 'text-teal-300'
  },
  {
    id: 14155,
    title: 'Madame Bovary',
    author: 'Gustave Flaubert',
    language: 'fr',
    genre: 'Drame / Réalisme',
    description: 'Le destin tragique d\'Emma Bovary, captive de ses rêves romantiques et de ses désillusions éperdues.',
    cover: '🥀',
    bgClasses: 'from-[#4c0519] via-[#881337] to-[#1e0000]',
    accentColor: 'text-rose-300',
    borderColor: 'border-rose-500/25',
    spineColor: 'bg-rose-500/10',
    textColor: 'text-rose-50',
    secondaryColor: 'text-rose-200'
  },
  {
    id: 4650,
    title: 'Candide ou l\'Optimisme',
    author: 'Voltaire',
    language: 'fr',
    genre: 'Philosophie / Satire',
    description: 'Le jeune et naïf Candide parcourt le monde, guidé par l\'idée que "tout est au mieux dans le meilleur des mondes possibles".',
    cover: '🍃',
    bgClasses: 'from-[#064e3b] via-[#059669] to-[#012e20]',
    accentColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/20',
    spineColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-50',
    secondaryColor: 'text-emerald-200'
  },
  {
    id: 13264,
    title: 'Le Horla',
    author: 'Guy de Maupassant',
    language: 'fr',
    genre: 'Fantastique / Épouvante',
    description: 'Un journal intime terrifiant traquant la descente dans la folie d\'un homme hanté par un être invisible.',
    cover: '👁️‍🗨️',
    bgClasses: 'from-[#1c1917] via-[#44403c] to-[#0c0a09]',
    accentColor: 'text-stone-350',
    borderColor: 'border-stone-550/25',
    spineColor: 'bg-stone-500/15',
    textColor: 'text-stone-50',
    secondaryColor: 'text-stone-400'
  },
  {
    id: 5058,
    title: 'Les Fleurs du Mal',
    author: 'Charles Baudelaire',
    language: 'fr',
    genre: 'Poésie / Symbolisme',
    description: 'L\'œuvre majeure de la poésie française moderne, oscillant douloureusement entre le Spleen d\'une réalité amère et l\'Idéal sublime.',
    cover: '🖤',
    bgClasses: 'from-[#2e1065] via-[#5b21b6] to-[#120024]',
    accentColor: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-500/20',
    spineColor: 'bg-fuchsia-500/10',
    textColor: 'text-fuchsia-50',
    secondaryColor: 'text-purple-200'
  },
  // English
  {
    id: 11,
    title: 'Alice\'s Adventures in Wonderland',
    author: 'Lewis Carroll',
    language: 'en',
    genre: 'Fantasy / Merveilleux',
    description: 'Follow Alice down the rabbit hole into a world of nonsense, queens and tea parties.',
    cover: '🐇',
    bgClasses: 'from-purple-950 via-fuchsia-900 to-indigo-950',
    accentColor: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-500/30',
    spineColor: 'bg-fuchsia-400/25',
    textColor: 'text-pink-100',
    secondaryColor: 'text-purple-300'
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    language: 'en',
    genre: 'Romance / Satire',
    description: 'The romantic clash between the opinionated Elizabeth Bennet and the proud Mr. Darcy.',
    cover: '💌',
    bgClasses: 'from-[#db2777] via-pink-600 to-pink-950',
    accentColor: 'text-pink-100',
    borderColor: 'border-pink-300/35',
    spineColor: 'bg-pink-400/25',
    textColor: 'text-white',
    secondaryColor: 'text-pink-200'
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    language: 'en',
    genre: 'Mystère / Détective',
    description: 'A collection of the finest and most brain-teasing cases solved by Sherlock Holmes.',
    cover: '🔍',
    bgClasses: 'from-[#451a03] via-[#78350f] to-[#1c0d02]',
    accentColor: 'text-yellow-501',
    borderColor: 'border-amber-600/30',
    spineColor: 'bg-amber-500/20',
    textColor: 'text-amber-100',
    secondaryColor: 'text-amber-300'
  },
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    language: 'en',
    genre: 'Gothique / Science-Fiction',
    description: 'A brilliant scientist crafts a living creature out of anatomical components.',
    cover: '⚡',
    bgClasses: 'from-zinc-900 via-emerald-950 to-neutral-950',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/35',
    spineColor: 'bg-emerald-400/20',
    textColor: 'text-emerald-100',
    secondaryColor: 'text-stone-400'
  },
  {
    id: 174,
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    language: 'en',
    genre: 'Gothic / Philosophical',
    description: 'A beautiful young man remains pristine while his painted portrait displays the hideous marks of his sinful life.',
    cover: '🎨',
    bgClasses: 'from-[#065f46] via-[#047857] to-[#022c22]',
    accentColor: 'text-teal-200',
    borderColor: 'border-teal-500/20',
    spineColor: 'bg-teal-500/15',
    textColor: 'text-teal-50',
    secondaryColor: 'text-teal-300'
  },
  {
    id: 2701,
    title: 'Moby Dick; Or, The Whale',
    author: 'Herman Melville',
    language: 'en',
    genre: 'Adventure / Marine',
    description: 'The obsessive, self-destructive quest of Captain Ahab to slay the legendary white whale.',
    cover: '🐋',
    bgClasses: 'from-[#172554] via-[#1d4ed8] to-[#081a3d]',
    accentColor: 'text-blue-300',
    borderColor: 'border-blue-500/20',
    spineColor: 'bg-blue-500/15',
    textColor: 'text-blue-50',
    secondaryColor: 'text-blue-200'
  },
  {
    id: 76,
    title: 'Adventures of Huckleberry Finn',
    author: 'Mark Twain',
    language: 'en',
    genre: 'Drama / Frontier Life',
    description: 'A young boy floating down the Mississippi River with an escaped slave, experiencing the core American frontier life.',
    cover: '🚣',
    bgClasses: 'from-[#1e3a8a] via-[#3b82f6] to-[#172554]',
    accentColor: 'text-sky-300',
    borderColor: 'border-sky-500/25',
    spineColor: 'bg-sky-500/15',
    textColor: 'text-sky-50',
    secondaryColor: 'text-sky-200'
  },
  {
    id: 5200,
    title: 'Metamorphosis',
    author: 'Franz Kafka',
    language: 'en',
    genre: 'Absurdist / Fiction',
    description: 'Gregor Samsa wakes up one morning to find himself transformed in his bed into a monstrous vermin.',
    cover: '🪲',
    bgClasses: 'from-[#374151] via-[#4b5563] to-[#1f2937]',
    accentColor: 'text-gray-300',
    borderColor: 'border-gray-500/20',
    spineColor: 'bg-gray-500/10',
    textColor: 'text-gray-50',
    secondaryColor: 'text-gray-300'
  },
  // Spanish
  {
    id: 2000,
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes Saavedra',
    language: 'es',
    genre: 'Classique / Satire',
    description: 'Las aventuras del hidalgo caballero Alonso Quijano y su fiel escudero Sancho Panza.',
    cover: '🛡️',
    bgClasses: 'from-[#7c2d12] via-amber-800 to-stone-900',
    accentColor: 'text-yellow-400',
    borderColor: 'border-yellow-600/25',
    spineColor: 'bg-yellow-500/15',
    textColor: 'text-yellow-50',
    secondaryColor: 'text-amber-200'
  },
  {
    id: 31221,
    title: 'Rimas',
    author: 'Gustavo Adolfo Bécquer',
    language: 'es',
    genre: 'Poésie / Романтизм',
    description: 'Una célebre colección de versos delicados y emotivos de la lírica castellana.',
    cover: '✍️',
    bgClasses: 'from-stone-900 via-stone-850 to-neutral-900 border-neutral-700/30',
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-450/20',
    spineColor: 'bg-rose-400/10',
    textColor: 'text-rose-100',
    secondaryColor: 'text-stone-400'
  },
  {
    id: 1619,
    title: 'La Celestina',
    author: 'Fernando de Rojas',
    language: 'es',
    genre: 'Tragicomedia / Clásico',
    description: 'La célebre tragicomedia de Calisto y Melibea, mediada por las astucias de la vieja alcahueta Celestina.',
    cover: '👵',
    bgClasses: 'from-[#4a044e] via-[#86198f] to-[#1e0122]',
    accentColor: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-500/20',
    spineColor: 'bg-fuchsia-500/10',
    textColor: 'text-fuchsia-50',
    secondaryColor: 'text-pink-250'
  },
  {
    id: 31853,
    title: 'La vida del Buscón',
    author: 'Francisco de Quevedo',
    language: 'es',
    genre: 'Novela Picaresca',
    description: 'Las andanzas humorísticas y picarescas de don Pablos de Segovia en busca de fortuna y estatus social.',
    cover: '💰',
    bgClasses: 'from-[#0f172a] via-[#334155] to-[#1e293b]',
    accentColor: 'text-slate-300',
    borderColor: 'border-slate-500/20',
    spineColor: 'bg-slate-500/10',
    textColor: 'text-slate-50',
    secondaryColor: 'text-slate-200'
  },
  {
    id: 14842,
    title: 'Novelas Ejemplares',
    author: 'Miguel de Cervantes Saavedra',
    language: 'es',
    genre: 'Cuentos / Clásicos',
    description: 'Una extraordinaria colección de doce novelas cortas escritas con magisterio y afán moralizador.',
    cover: '🎭',
    bgClasses: 'from-[#422006] via-[#78350f] to-[#1c1917]',
    accentColor: 'text-amber-300',
    borderColor: 'border-amber-500/20',
    spineColor: 'bg-amber-500/10',
    textColor: 'text-amber-50',
    secondaryColor: 'text-amber-200'
  },
  {
    id: 16075,
    title: 'Marianela',
    author: 'Benito Pérez Galdos',
    language: 'es',
    genre: 'Novela / Realismo',
    description: 'La trágica vida de Marianela, huérfana bondadosa que sirve de lazarillo al ciego y adinerado Pablo.',
    cover: '🌟',
    bgClasses: 'from-[#0369a1] via-[#0284c7] to-[#0c4a6e]',
    accentColor: 'text-sky-305',
    borderColor: 'border-sky-500/25',
    spineColor: 'bg-sky-505/10',
    textColor: 'text-sky-50',
    secondaryColor: 'text-sky-300'
  }
];

export default function GutenbergExplorer({
  onDocumentAdded,
  recentBooks,
  onSelectSample,
  onNavigateToTab
}: GutenbergExplorerProps) {
  const [searchQuery, setSearchQuery] = useState(explorerCache?.searchQuery ?? '');
  const [activeLang, setActiveLang] = useState<'all' | 'fr' | 'en' | 'es' | 'de' | 'it'>(explorerCache?.activeLang ?? 'fr');
  const [searchResults, setSearchResults] = useState<GutendexBook[]>(explorerCache?.searchResults ?? []);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(explorerCache?.isSearching ?? false);

  // Navigation catalogue complet : genres, top, pagination
  const [activeTopic, setActiveTopic] = useState<string | null>(explorerCache?.activeTopic ?? null);
  const [resultsTitle, setResultsTitle] = useState(explorerCache?.resultsTitle ?? 'Résultats de recherche');
  const [totalCount, setTotalCount] = useState(explorerCache?.totalCount ?? 0);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(explorerCache?.nextPageUrl ?? null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sauvegarder l'état dans le cache module-scope à chaque changement
  useEffect(() => {
    explorerCache = {
      searchQuery,
      activeLang,
      isSearching,
      searchResults,
      activeTopic,
      resultsTitle,
      totalCount,
      nextPageUrl,
    };
  }, [searchQuery, activeLang, isSearching, searchResults, activeTopic, resultsTitle, totalCount, nextPageUrl]);
  
  // Carousel states for featured books
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Filter our local hand-picked classics list
  const filteredFeatured = activeLang === 'all'
    ? FEATURED_GUTENBERG
    : FEATURED_GUTENBERG.filter(b => b.language === activeLang);

  // Reset carousel index if category changes to stay safe
  useEffect(() => {
    setCarouselIndex(0);
  }, [activeLang]);

  // Handle continuous rotation for the eye-catching carousel
  useEffect(() => {
    if (isHovered || filteredFeatured.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % filteredFeatured.length);
    }, 6000); // Transitions nicely every 6 seconds
    return () => clearInterval(interval);
  }, [isHovered, filteredFeatured.length]);

  const handleNextFeatured = () => {
    if (filteredFeatured.length === 0) return;
    setCarouselIndex((prev) => (prev + 1) % filteredFeatured.length);
  };

  const handlePrevFeatured = () => {
    if (filteredFeatured.length === 0) return;
    setCarouselIndex((prev) => (prev - 1 + filteredFeatured.length) % filteredFeatured.length);
  };

  // Tracking download progress
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [successId, setSuccessId] = useState<number | null>(null);

  // Load popular on start
  useEffect(() => {
    // We remain on local hand-picked classics by default, then load live searches when requested
  }, []);

  // ── Moteur de requête générique Gutendex (recherche, genres, top, aléatoire) ──
  const runCatalogQuery = async (url: string, title: string) => {
    setLoading(true);
    setErrorText(null);
    setIsSearching(true);
    setResultsTitle(title);
    setSearchResults([]);
    setNextPageUrl(null);
    setTotalCount(0);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Impossible de contacter la bibliothèque Gutenberg (Gutendex).');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
      setTotalCount(data.count || 0);
      setNextPageUrl(data.next || null);
    } catch (err: any) {
      console.error(err);
      setErrorText('Erreur lors de la recherche. Veuillez vérifier votre connexion internet et réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const langParam = () => (activeLang !== 'all' ? `&languages=${activeLang}` : '');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setActiveTopic(null);
      return;
    }
    setActiveTopic(null);
    await runCatalogQuery(
      `https://gutendex.com/books/?search=${encodeURIComponent(searchQuery)}${langParam()}`,
      `Résultats pour « ${searchQuery} »`
    );
  };

  // Naviguer par genre/thème
  const handleTopicSelect = async (topicId: string) => {
    const topic = GUTENBERG_TOPICS.find(t => t.id === topicId);
    if (!topic) return;
    setSearchQuery('');
    setActiveTopic(topicId);
    await runCatalogQuery(
      `https://gutendex.com/books/?topic=${encodeURIComponent(topic.query)}${langParam()}&sort=popular`,
      `Genre : ${topic.label}`
    );
  };

  // Top des livres les plus téléchargés
  const handleTopPopular = async () => {
    setSearchQuery('');
    setActiveTopic('__top__');
    await runCatalogQuery(
      `https://gutendex.com/books/?sort=popular${langParam()}`,
      '🔥 Les plus téléchargés'
    );
  };

  // Découverte aléatoire : tirer une page au hasard du catalogue
  const handleRandomDiscovery = async () => {
    setSearchQuery('');
    setActiveTopic('__random__');
    setLoading(true);
    setErrorText(null);
    setIsSearching(true);
    setResultsTitle('🎲 Découverte aléatoire');
    setSearchResults([]);
    setNextPageUrl(null);

    try {
      // 1er appel : connaître le nombre total de pages pour cette langue
      const probe = await fetch(`https://gutendex.com/books/?${langParam().replace('&', '')}`);
      if (!probe.ok) throw new Error('Gutendex indisponible.');
      const probeData = await probe.json();
      const count = probeData.count || 1000;
      const totalPages = Math.max(1, Math.min(Math.floor(count / 32), 500));
      const randomPage = Math.floor(Math.random() * totalPages) + 1;

      // 2e appel : la page aléatoire
      const response = await fetch(`https://gutendex.com/books/?page=${randomPage}${langParam()}`);
      if (!response.ok) throw new Error('Gutendex indisponible.');
      const data = await response.json();
      // Mélanger les 32 résultats pour plus de surprise
      const shuffled = (data.results || []).sort(() => Math.random() - 0.5);
      setSearchResults(shuffled);
      setTotalCount(count);
      setNextPageUrl(null); // pas de pagination en mode aléatoire — recliquer pour repiocher
    } catch (err: any) {
      console.error(err);
      setErrorText('Erreur lors de la découverte aléatoire. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // Pagination : charger la page suivante (append)
  const handleLoadMore = async () => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(nextPageUrl);
      if (!response.ok) throw new Error('Erreur de pagination.');
      const data = await response.json();
      setSearchResults(prev => [...prev, ...(data.results || [])]);
      setNextPageUrl(data.next || null);
    } catch (err: any) {
      console.error(err);
      setErrorText('Impossible de charger la suite. Réessayez.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Relancer la requête active quand la langue change (mais PAS au montage,
  // sinon le retour sur l'onglet écrase les résultats restaurés et la pagination)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchQuery.trim()) {
      handleSearch();
    } else if (activeTopic === '__top__') {
      handleTopPopular();
    } else if (activeTopic && activeTopic !== '__random__') {
      handleTopicSelect(activeTopic);
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
        // 0. Notre propre proxy VPS — décodage UTF-8/Latin-1 côté serveur Node.js ✅
        async (_url: string) => {
          const res = await fetch(`/api/gutenberg/${bookId}`);
          if (res.ok) {
            const body = await res.text(); // déjà décodé côté serveur en UTF-8
            if (body && body.length > 500 && !isHtmlOrError(body)) return body;
          }
          throw new Error('Proxy VPS indisponible');
        },
        // 1. corsproxy.io (Rapide pour requêtes directes)
        async (url: string) => {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const body = decodeBuffer(buf);
            if (body && body.length > 500 && !isHtmlOrError(body)) return body;
          }
          throw new Error('corsproxy.io vide, non-valide ou bloqué');
        },
        // 2. codetabs.com (Proxy d'appoint libre extremely performant et résilient)
        async (url: string) => {
          const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const body = decodeBuffer(buf);
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
            const buf = await res.arrayBuffer();
            const body = decodeBuffer(buf);
            if (body && body.length > 550 && !isHtmlOrError(body)) return body;
          }
          throw new Error('allorigins raw vide ou bloqué');
        },
        // 5. thingproxy.freeboard.io
        async (url: string) => {
          const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const body = decodeBuffer(buf);
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
      case 'de': return 'Allemand';
      case 'it': return 'Italien';
      default: return lang.toUpperCase();
    }
  };

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
        <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200 dark:border-stone-900 self-stretch sm:self-auto justify-center select-none font-sans text-[11px] font-bold">
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
            onClick={() => setActiveLang('de')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'de' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Allemand
          </button>
          <button 
            type="button"
            onClick={() => setActiveLang('it')} 
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeLang === 'it' ? 'bg-[#646cff] text-white' : 'text-stone-500 hover:text-stone-950 dark:hover:text-white'}`}
          >
            Italien
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

      {/* 2bis. Navigation catalogue : Top, Découverte, Genres */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTopPopular}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
              activeTopic === '__top__'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Top téléchargements
          </button>
          <button
            type="button"
            onClick={handleRandomDiscovery}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
              activeTopic === '__random__'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
            }`}
            title="Piocher 32 livres au hasard parmi tout le catalogue"
          >
            <Dices className="w-3.5 h-3.5" />
            Découverte aléatoire
          </button>
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-stone-400 font-mono ml-auto">
            <Tags className="w-3 h-3" />
            Ou explorez par genre :
          </span>
        </div>

        {/* Chips genres — scrollables horizontalement sur mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1">
          {GUTENBERG_TOPICS.map(topic => (
            <button
              key={topic.id}
              type="button"
              onClick={() => handleTopicSelect(topic.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border whitespace-nowrap ${
                activeTopic === topic.id
                  ? 'bg-[#646cff] text-white border-[#646cff] shadow-md'
                  : 'bg-white dark:bg-stone-900/40 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-850 hover:border-[#646cff]/50 hover:text-[#646cff]'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

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
                  <span>{resultsTitle}</span>
                  {totalCount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-stone-400 bg-stone-100 dark:bg-stone-900 px-2 py-0.5 rounded-full">
                      {totalCount.toLocaleString('fr-FR')} livres
                    </span>
                  )}
                </h4>
                <button
                  onClick={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); setActiveTopic(null); setNextPageUrl(null); }}
                  className="text-xs text-stone-500 hover:text-[#646cff] font-bold cursor-pointer"
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

              {/* Pagination : Charger plus */}
              {!loading && searchResults.length > 0 && nextPageUrl && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-white dark:bg-stone-900/60 border-2 border-[#646cff]/30 hover:border-[#646cff] text-[#646cff] dark:text-[#767fff] rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Chargement...</>
                    ) : (
                      <>📚 Charger plus de livres ({searchResults.length} / {totalCount.toLocaleString('fr-FR')})</>
                    )}
                  </button>
                </div>
              )}

              {/* Mode aléatoire : bouton repiocher */}
              {!loading && searchResults.length > 0 && activeTopic === '__random__' && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleRandomDiscovery}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Dices className="w-4 h-4" />
                    Repiocher 32 nouveaux livres au hasard
                  </button>
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
              className="space-y-8"
            >
              {/* Spectacular Book Carousel Showcase */}
              {filteredFeatured.length > 0 && (
                <div 
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative overflow-hidden rounded-[28px] border border-stone-200 dark:border-stone-850 bg-white dark:bg-[#111010] shadow-lg p-5 sm:p-7 flex flex-col lg:flex-row gap-6 sm:gap-8 items-center transition-all duration-300"
                >
                  {/* Subtle color-reflective back glow matching the book's custom background color list */}
                  <div className={`absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-gradient-to-tr ${filteredFeatured[carouselIndex].bgClasses} opacity-[0.05] dark:opacity-[0.12] blur-3xl pointer-events-none`} />
                  <div className={`absolute -left-16 -top-16 w-60 h-60 rounded-full bg-gradient-to-br ${filteredFeatured[carouselIndex].bgClasses} opacity-[0.03] dark:opacity-[0.08] blur-2xl pointer-events-none`} />

                  {/* LEFT: 3D Floating Book Cover Display with physical spine shading */}
                  <div className="flex-shrink-0 relative select-none">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={filteredFeatured[carouselIndex].id}
                        initial={{ opacity: 0, scale: 0.94, y: 8, rotateY: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateY: -4 }}
                        exit={{ opacity: 0, scale: 0.94, y: -8, rotateY: 4 }}
                        transition={{ duration: 0.35 }}
                        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                        className="relative"
                      >
                        {/* Real Soft 3D Shadow Cover Container */}
                        <motion.div 
                          whileHover={{ scale: 1.05, rotateY: -14, rotateX: 2, rotate: -0.5, z: 15 }}
                          transition={{ type: "spring", stiffness: 180, damping: 15 }}
                          onClick={() => handleImportGutenberg(filteredFeatured[carouselIndex].id, filteredFeatured[carouselIndex].title, filteredFeatured[carouselIndex].author, filteredFeatured[carouselIndex].language)}
                          className={`w-[140px] h-[210px] sm:w-[170px] sm:h-[255px] rounded-r-lg rounded-l-[4px] shadow-[10px_12px_24px_-4px_rgba(0,0,0,0.35)] dark:shadow-[10px_12px_28px_-4px_rgba(0,0,0,0.65)] border-t border-r border-b ${filteredFeatured[carouselIndex].borderColor} text-white bg-gradient-to-br ${filteredFeatured[carouselIndex].bgClasses} relative flex flex-col justify-between p-4 sm:p-5 overflow-hidden group/cover cursor-pointer`}
                        >
                          {/* Book spine side-crease shadows for perfect mechanical texture */}
                          <div className="absolute left-0 top-0 w-3.5 h-full bg-gradient-to-r from-black/28 via-black/10 to-transparent z-20" />
                          <div className="absolute left-[3px] top-0 w-[1px] h-full bg-white/10 z-20" />
                          <div className="absolute left-3.5 top-0 w-[1px] h-full bg-gradient-to-r from-black/12 to-transparent z-10" />

                          {/* Deco corners */}
                          <div className="absolute top-1.5 right-1.5 border-r border-t border-white/20 w-2.5 h-2.5 rounded-tr-sm" />
                          <div className="absolute bottom-1.5 right-1.5 border-r border-b border-white/20 w-2.5 h-2.5 rounded-br-sm" />
                          <div className="absolute top-1.5 left-5 border-l border-t border-white/20 w-2.5 h-2.5 rounded-tl-sm" />
                          <div className="absolute bottom-1.5 left-5 border-l border-b border-white/20 w-2.5 h-2.5 rounded-bl-sm" />

                          {/* Genre Header on cover */}
                          <div className="text-[8px] font-mono tracking-widest text-center uppercase opacity-50 font-bold sm:pt-1 z-10">
                            {filteredFeatured[carouselIndex].genre.split('/')[0].trim()}
                          </div>

                          {/* Large Cover Emblem */}
                          <div className="flex flex-col items-center justify-center my-auto z-10">
                            <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] group-hover/cover:scale-110 duration-500 transform transition-all select-none">
                              {filteredFeatured[carouselIndex].cover}
                            </span>
                          </div>

                          {/* Footer information on cover */}
                          <div className="text-center space-y-1 pb-1 z-10">
                            <h4 className="font-serif font-extrabold text-[#ffffff] text-[10px] sm:text-[11px] tracking-tight line-clamp-2 leading-tight">
                              {filteredFeatured[carouselIndex].title}
                            </h4>
                            <p className={`text-[8px] font-sans font-medium uppercase tracking-wider ${filteredFeatured[carouselIndex].accentColor}`}>
                              {filteredFeatured[carouselIndex].author}
                            </p>
                          </div>

                          <div className="absolute right-0 top-[1px] bottom-[1px] w-[1px] bg-white/20 z-10" />
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* RIGHT: Informative Description & Instant Action Panel */}
                  <div className="flex-grow flex flex-col justify-between text-left h-full min-w-0 space-y-4">
                    <div className="space-y-3">
                      {/* Active Label Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#646cff]/10 text-[#646cff] dark:text-[#767fff] tracking-wide border border-[#646cff]/15">
                          <Sparkles className="w-2.5 h-2.5 fill-current text-amber-500" />
                          <span>À LA UNE SUR COGNITIVE SENS</span>
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-850">
                          {getLanguageLabel(filteredFeatured[carouselIndex].language)}
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase font-mono tracking-wider hidden sm:block">
                          Domaine Public Complet
                        </span>
                      </div>

                      {/* Display Typography Title & Author */}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black font-sans text-stone-900 dark:text-white leading-tight tracking-tight">
                          {filteredFeatured[carouselIndex].title}
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400 mt-1">
                          Écrit par <span className="text-[#646cff] dark:text-[#767fff]">{filteredFeatured[carouselIndex].author}</span>
                        </p>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-stone-400 font-mono">
                        <div>
                          Genre : <strong className="text-stone-700 dark:text-stone-250 font-sans font-semibold">{filteredFeatured[carouselIndex].genre}</strong>
                        </div>
                        <div className="hidden sm:block">
                          Format : <strong className="text-stone-700 dark:text-stone-250 font-sans font-semibold">Gutenberg TXT optimisé</strong>
                        </div>
                      </div>

                      {/* Description / Review snippet */}
                      <p className="text-xs sm:text-[13px] text-stone-500 dark:text-stone-400 leading-relaxed italic border-l-2 border-[#646cff] pl-3 py-0.5">
                        "{filteredFeatured[carouselIndex].description}"
                      </p>
                    </div>

                    {/* Lower Controls & Slider arrows */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-4 border-t border-stone-100 dark:border-stone-900/60 w-full">
                      <div className="flex-grow">
                        {recentBooks.some(b => b.id === `gutenberg_${filteredFeatured[carouselIndex].id}`) ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs border border-emerald-500/15">
                              <CheckCircle className="w-4 h-4" />
                              <span>Déjà téléchargé !</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const saved = recentBooks.find(b => b.id === `gutenberg_${filteredFeatured[carouselIndex].id}`);
                                if (saved) {
                                  onSelectSample(saved);
                                  onNavigateToTab?.('lire');
                                }
                              }}
                              className="px-4 py-2 bg-[#646cff] hover:bg-[#525aff] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow flex items-center gap-1"
                            >
                              <span>Laancer la liseuse</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        ) : downloadingId === filteredFeatured[carouselIndex].id ? (
                          <div className="px-3.5 py-2.5 bg-[#646cff]/5 border border-[#646cff]/15 text-[#646cff] rounded-xl flex items-center gap-2 text-xs font-black">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                            <span>{downloadProgress}</span>
                          </div>
                        ) : successId === filteredFeatured[carouselIndex].id ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#646cff]/10 text-[#646cff] rounded-xl font-black text-xs">
                            Prêt ! Initialisation liseuse...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportGutenberg(filteredFeatured[carouselIndex].id, filteredFeatured[carouselIndex].title, filteredFeatured[carouselIndex].author, filteredFeatured[carouselIndex].language)}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#646cff] to-[#7b83f8] hover:from-[#525aff] hover:to-[#646cff] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Télécharger & Écouter ce livre</span>
                          </button>
                        )}
                      </div>

                      {/* Carousel Arrow selectors & Dot lists */}
                      <div className="flex items-center justify-center gap-1.5 select-none self-center sm:self-auto">
                        <button
                          type="button"
                          onClick={handlePrevFeatured}
                          className="p-1.5 border border-stone-200 dark:border-stone-900 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-500 dark:text-stone-300 cursor-pointer"
                          title="Précédent"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center space-x-1 mt-0.5">
                          {filteredFeatured.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCarouselIndex(idx)}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                idx === carouselIndex 
                                  ? 'w-3.5 bg-[#646cff]' 
                                  : 'w-1.5 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400'
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleNextFeatured}
                          className="p-1.5 border border-stone-200 dark:border-stone-900 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-500 dark:text-stone-300 cursor-pointer"
                          title="Suivant"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete catalog section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Toute la Sélection Littéraire ({filteredFeatured.length})</span>
                  </h4>
                  <p className="text-[10px] text-stone-400 font-mono font-bold hidden sm:block">SÉLECTION INTERNATIONALE COGNITIVE</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFeatured.map((book) => {
                    const hasRecent = recentBooks.some(b => b.id === `gutenberg_${book.id}`);
                    
                    return (
                      <div
                        key={book.id}
                        className="flex flex-col p-4 bg-white dark:bg-[#111010] border border-stone-200 dark:border-stone-900 rounded-[20px] shadow-sm relative group hover:border-[#646cff]/40 transition-all text-left space-y-3.5"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${book.bgClasses || 'from-stone-100 to-stone-200'} flex shadow-inner items-center justify-center text-lg border ${book.borderColor || 'border-stone-200'} flex-shrink-0`}>
                            {book.cover}
                          </div>
                          <div className="min-w-0 pr-2">
                            <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 uppercase">
                              {getLanguageLabel(book.language)}
                            </span>
                            <h4 className="font-extrabold text-stone-900 dark:text-white text-[13px] leading-snug font-sans group-hover:text-[#646cff] transition-all tracking-tight mt-0.5 truncate">
                              {book.title}
                            </h4>
                            <p className="text-[11px] text-stone-450 dark:text-stone-400 font-medium">
                              {book.author}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-stone-500 dark:text-stone-450 leading-relaxed font-sans line-clamp-2">
                          {book.description}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-900/40">
                          <span className="text-[10px] text-stone-400 font-mono">Genre : <strong className="text-stone-600 dark:text-stone-300 font-sans font-medium">{book.genre}</strong></span>

                          {hasRecent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" /> Importé
                            </span>
                          ) : downloadingId === book.id ? (
                            <span className="text-[10px] font-bold text-[#646cff] flex items-center gap-1.5 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              {downloadProgress}
                            </span>
                          ) : successId === book.id ? (
                            <span className="text-[11px] font-bold text-[#646cff]">
                              Prêt ! 🚀
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleImportGutenberg(book.id, book.title, book.author, book.language)}
                              className="bg-stone-100 hover:bg-[#646cff] hover:text-white text-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-[#646cff] dark:hover:text-white text-[10px] font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Écouter</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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


