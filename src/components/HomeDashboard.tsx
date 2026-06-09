import { useState, useEffect } from 'react';
import { 
  Plus, Play, Pause, ChevronLeft, ChevronRight, HelpCircle, Share2, 
  Sun, Moon, BookOpen, Target, FileText, Settings, Sparkles, LogOut, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentBook } from '../types';
import { SAMPLES } from '../data/samples';

interface HomeDashboardProps {
  recentBooks: DocumentBook[];
  activeBook: DocumentBook | null;
  isPlaying: boolean;
  onPlayPause: (play?: boolean) => void;
  onSelectBook: (book: DocumentBook) => void;
  listeningMinutesToday: number;
  dailyGoalMinutes: number;
  onUpdateDailyGoal: (goal: number) => void;
  onNavigateToTab: (tab: 'accueil' | 'lire' | 'biblio' | 'librairie' | 'importer') => void;
  onHelpClick: () => void;
  theme: string;
  onThemeToggle: () => void;
}

export default function HomeDashboard({
  recentBooks,
  activeBook,
  isPlaying,
  onPlayPause,
  onSelectBook,
  listeningMinutesToday,
  dailyGoalMinutes,
  onUpdateDailyGoal,
  onNavigateToTab,
  onHelpClick,
  theme,
  onThemeToggle
}: HomeDashboardProps) {
  const allBooks = [...recentBooks, ...SAMPLES];
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoalMinutes);
  const [sharedMessage, setSharedMessage] = useState(false);

  // Auto select correct active book in carousel if loaded
  useEffect(() => {
    if (activeBook) {
      const idx = allBooks.findIndex(b => b.id === activeBook.id);
      if (idx !== -1) {
        setCarouselIdx(idx);
      }
    }
  }, [activeBook]);

  const activeCarouselBook = allBooks[carouselIdx] || SAMPLES[0];

  const getBookDurationMinutes = (book: DocumentBook): number => {
    if (book.id === 'sample_fr') return 42;
    if (book.id === 'sample_en') return 15;
    if (book.id === 'sample_es') return 8;

    let totalWords = 0;
    book.chapters.forEach(c => {
      totalWords += c.wordCount || c.content?.split(/\s+/).filter(Boolean).length || 0;
    });

    if (book.type === 'pdf') {
      return Math.max(5, book.chapters.length * 3);
    }
    return Math.max(5, Math.ceil(totalWords / 200));
  };

  // Compute stats
  const totalDocuments = allBooks.length;
  const totalLibraryMinutes = allBooks.reduce((sum, b) => sum + getBookDurationMinutes(b), 0);
  
  // Daily objective percentage
  const goalPercentage = Math.min(100, Math.round((listeningMinutesToday / dailyGoalMinutes) * 100));

  const handlePrevCarousel = () => {
    setCarouselIdx(prev => (prev - 1 + allBooks.length) % allBooks.length);
  };

  const handleNextCarousel = () => {
    setCarouselIdx(prev => (prev + 1) % allBooks.length);
  };

  const handleLaunchBook = (book: DocumentBook, playNow: boolean) => {
    onSelectBook(book);
    onNavigateToTab('lire');
    if (playNow) {
      setTimeout(() => {
        onPlayPause(true);
      }, 300);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setSharedMessage(true);
      setTimeout(() => setSharedMessage(false), 2000);
    }
  };

  // Equalizer visualizer bars
  const randomBars = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    delay: `${(i % 5) * 0.15}s`,
    class: i % 3 === 0 ? 'animate-music-1' : i % 3 === 1 ? 'animate-music-2' : 'animate-music-3'
  }));

  const handleSaveGoal = () => {
    const parsed = Math.max(1, Math.min(300, tempGoal));
    onUpdateDailyGoal(parsed);
    setIsEditingGoal(false);
  };

  return (
    <div className="w-full flex flex-col min-h-full bg-[#0a0a09] dark:bg-[#0a0a09] text-stone-100 p-4 sm:p-6 pb-24 overflow-y-auto font-sans select-none">
      
      {/* 1. Header Toolbar matching screenshot model exactly */}
      <div className="flex items-center justify-between py-2 mb-6">
        <div className="flex items-center space-x-2">
          {/* Custom logo & brand mimicking SpeechifyPro */}
          <div className="text-2xl font-extrabold tracking-tight select-none">
            <span className="text-white font-sans font-black">Speechify</span>
            <span className="text-[#646cff] dark:text-[#767fff] font-sans font-black ml-1">Pro</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={onHelpClick}
            className="p-3 text-stone-300 hover:text-white bg-stone-900 border border-stone-800 rounded-full transition-colors cursor-pointer"
            title="Aide d'utilisation"
            id="help-button"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleShare}
            className="p-3 text-stone-300 hover:text-white bg-stone-900 border border-stone-800 rounded-full transition-colors relative cursor-pointer"
            title="Partager l'application"
            id="share-button"
          >
            <Share2 className="w-4 h-4" />
            <AnimatePresence>
              {sharedMessage && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-0 top-12 bg-amber-500 text-stone-950 text-[10px] font-sans font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-50 uppercase tracking-widest"
                >
                  Lien Copié !
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button 
            onClick={onThemeToggle}
            className="p-3 text-stone-300 hover:text-white bg-stone-900 border border-stone-800 rounded-full transition-colors cursor-pointer"
            title="Changer de thème"
            id="theme-button"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full space-y-6">
        
        {/* 2. Stat card premium widget */}
        <div className="bg-[#131212] border border-stone-900 rounded-[28px] p-5 sm:p-6 shadow-xl space-y-5" id="stats-widget">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-stone-800">
            <div>
              <p className="text-2xl font-black text-white font-sans tracking-tight">{totalDocuments}</p>
              <p className="text-[11px] text-stone-400 mt-1 uppercase font-semibold tracking-wider">Documents</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-sans tracking-tight">{totalLibraryMinutes} m</p>
              <p className="text-[11px] text-stone-400 mt-1 uppercase font-semibold tracking-wider">Total bibliothèque</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-sans tracking-tight">{listeningMinutesToday.toFixed(1)} m</p>
              <p className="text-[11px] text-stone-400 mt-1 uppercase font-semibold tracking-wider">Aujourd'hui</p>
            </div>
          </div>

          {/* Core action buttons inside stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onNavigateToTab('importer')}
              className="bg-[#646cff] hover:bg-[#525aff] text-white font-black py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-900/15 text-sm"
              id="dashboard-add-doc"
            >
              <Plus className="w-4 h-4 font-black" />
              <span>Ajouter</span>
            </button>
            <button
              onClick={() => handleLaunchBook(activeBook || allBooks[0], true)}
              className="bg-transparent hover:bg-stone-900 text-white font-black py-3 rounded-full border border-stone-800 hover:border-stone-700 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
              id="dashboard-resume"
            >
              <Play className="w-4 h-4 text-[#646cff] fill-[#646cff]" />
              <span>Reprendre</span>
            </button>
          </div>
        </div>

        {/* 3. Section Title "Accueil" */}
        <div className="pt-2 text-left">
          <h2 className="text-3xl font-black text-white leading-none font-sans tracking-tight">Accueil</h2>
          <p className="text-stone-400 text-xs mt-1 font-sans font-medium">
            {totalDocuments} documents • {totalLibraryMinutes} min
          </p>
        </div>

        {/* 4. "Objectif du jour" widget card mimic screenshot exactly */}
        <div className="bg-[#131212] border border-stone-900 rounded-[24px] p-5 shadow-lg" id="goals-widget">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-black">
              <span className="text-base">🎯</span>
              <span className="text-sm font-black font-sans">Objectif du jour</span>
            </div>
            <div className="text-lg font-black text-[#646cff] dark:text-[#767fff]">
              {goalPercentage}%
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#1e1d1d] h-2.5 rounded-full mt-4 overflow-hidden shadow-inner relative">
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-[#646cff] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${goalPercentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-400 mt-3 font-sans font-medium">
            <span>{listeningMinutesToday.toFixed(1)} min écoutées</span>
            
            {isEditingGoal ? (
              <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)}
                  className="w-12 py-0.5 px-1.5 bg-stone-900 border border-stone-800 rounded text-center font-bold text-white text-xs focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="300"
                />
                <button
                  onClick={handleSaveGoal}
                  className="p-1 bg-amber-500 rounded text-stone-950 font-bold hover:bg-amber-600 transition-all cursor-pointer"
                  title="Enregistrer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setTempGoal(dailyGoalMinutes); setIsEditingGoal(true); }}
                className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                title="Modifier l'objectif"
              >
                <span>objectif : {dailyGoalMinutes} min</span>
                <span>✏️</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Swipeable carousel matching the exact style */}
        <div className="relative flex items-center px-2" id="carousel-outer">
          
          {/* Arrow Left */}
          <button
            onClick={handlePrevCarousel}
            className="absolute left-[-16px] z-10 p-2 bg-[#131212]/90 border border-stone-850 text-stone-300 hover:text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer shadow-md"
            title="Précédent"
            id="carousel-prev"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Focused Book Card */}
          <motion.div
            key={activeCarouselBook?.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-[#131212] border border-[#2d2a45]/30 rounded-[28px] p-5 sm:p-6 shadow-xl relative overflow-hidden"
            id={`carousel-card-${activeCarouselBook?.id}`}
          >
            <div className="flex items-start gap-4">
              {/* Cover Icon */}
              <div className="p-3 bg-stone-900/80 rounded-2xl text-stone-400 border border-stone-800 flex-shrink-0">
                <FileText className="w-6 h-6 text-[#646cff]" />
              </div>
              <div className="text-left min-w-0 pr-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg truncate tracking-tight font-sans">
                  {activeCarouselBook?.title}
                </h3>
                <p className="text-xs text-stone-400 truncate mt-0.5 font-medium font-sans prose">
                  {activeCarouselBook?.author}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2 font-mono text-[9px] font-bold text-stone-300">
                  <span className="px-2 py-0.5 bg-stone-900 rounded uppercase">{activeCarouselBook?.type}</span>
                  <span>•</span>
                  <span>{getBookDurationMinutes(activeCarouselBook)} min</span>
                  <span>•</span>
                  <span>{Math.round(activeCarouselBook?.progressPercent || 0)}% lu</span>
                </div>
              </div>
            </div>

            {/* CTA action buttons inside inside the card */}
            <div className="flex items-center gap-3 pt-5 mt-3 border-t border-stone-900/40">
              <button
                onClick={() => handleLaunchBook(activeCarouselBook, true)}
                className="flex-grow bg-[#646cff] hover:bg-[#525aff] text-white font-black py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all text-sm shadow-md"
                id="carousel-play-button"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Écouter</span>
              </button>

              <button
                onClick={() => handleLaunchBook(activeCarouselBook, false)}
                className="p-2.5 hover:bg-stone-900 text-stone-300 hover:text-white rounded-full border border-stone-800/80 cursor-pointer transition-colors"
                title="Consulter le texte"
                id="carousel-read-button"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Arrow Right */}
          <button
            onClick={handleNextCarousel}
            className="absolute right-[-16px] z-10 p-2 bg-[#131212]/90 border border-stone-850 text-stone-300 hover:text-white rounded-full hover:bg-stone-900 transition-colors cursor-pointer shadow-md"
            title="Suivant"
            id="carousel-next-btn"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Carousel Page dots indicator */}
        <div className="flex items-center justify-center gap-1.5 pt-1" id="carousel-dots">
          {allBooks.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === carouselIdx ? 'w-4 bg-[#646cff]' : 'w-1.5 bg-stone-700'
              }`}
              title={`Page ${i + 1}`}
            />
          ))}
        </div>

        {/* 6. Equalizer indicator card at the bottom */}
        <div className="bg-[#131212] border border-stone-900 rounded-[24px] p-5 text-left space-y-4" id="eq-widget">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-extrabold text-white text-sm font-sans truncate max-w-[240px]">
                {activeCarouselBook?.title}
              </h4>
              <p className="text-xs text-stone-450 font-mono mt-0.5">
                Type : <span className="uppercase font-bold text-[#646cff]">{activeCarouselBook?.type}</span> • {getBookDurationMinutes(activeCarouselBook)} min • {activeCarouselBook?.language === 'fr' ? 'Français' : activeCarouselBook?.language === 'en' ? 'Anglais' : 'Espagnol'}
              </p>
            </div>
            <span className="text-[10px] bg-[#646cff]/10 text-[#767fff] px-2.5 py-1 rounded-full font-bold font-sans uppercase tracking-widest border border-[#646cff]/20 flex-shrink-0">
              {activeCarouselBook?.type === 'sample' ? 'DÉMO' : activeCarouselBook?.type}
            </span>
          </div>

          {/* Jumping Equalizer Layout bar */}
          <div className="flex items-end justify-center gap-1 h-8 px-1 pb-1 bg-stone-950/60 rounded-xl" id="eq-bars">
            {randomBars.map(bar => (
              <div
                key={bar.id}
                className={`w-1 rounded-full bg-[#646cff] transition-all duration-300 ${isPlaying && carouselIdx === allBooks.indexOf(activeBook ?? activeCarouselBook) ? bar.class : 'h-1.5'}`}
                style={{
                  height: isPlaying && carouselIdx === allBooks.indexOf(activeBook ?? activeCarouselBook) ? '100%' : '6px',
                  animationDelay: isPlaying ? bar.delay : '0s'
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
