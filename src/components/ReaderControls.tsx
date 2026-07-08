import { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Settings, List, Sliders, ChevronDown, Eye } from 'lucide-react';
import { UserSettings } from '../types';
import { AppVoice, getAllAvailableVoices } from '../utils/customVoices';

interface ReaderControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPreviousSentence: () => void;
  onNextSentence: () => void;
  settings: UserSettings;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  documentLanguage: string;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onToggleZen: () => void;
  chapterProgressText: string;
}

export default function ReaderControls({
  isPlaying,
  onPlayPause,
  onStop,
  onPreviousSentence,
  onNextSentence,
  settings,
  onSettingsChange,
  documentLanguage,
  onToggleSidebar,
  onToggleSettings,
  onToggleZen,
  chapterProgressText,
}: ReaderControlsProps) {
  const [voices, setVoices] = useState<AppVoice[]>([]);

  // Load and filter speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = getAllAvailableVoices();
      setVoices(allVoices);
      
      const docLangPrefix = (documentLanguage || 'fr').substring(0, 2).toLowerCase();
      
      // Determine best initial voice matching the document language
      const matchingVoices = allVoices.filter(v => 
        v.lang.toLowerCase().startsWith(docLangPrefix)
      );
      
      // Look for custom selected voice from settings
      const savedVoice = allVoices.find(v => v.voiceURI === settings.voiceURI);
      
      if (!savedVoice) {
        if (matchingVoices.length > 0) {
          // Default to the first matching language, favoring a custom studio voice if present
          const customFavored = matchingVoices.find(v => v.isCustom);
          const fallback = customFavored || matchingVoices[0];
          onSettingsChange({ voiceURI: fallback.voiceURI });
        } else if (allVoices.length > 0) {
          const fallback = allVoices.find(v => v.default) || allVoices[0];
          onSettingsChange({ voiceURI: fallback.voiceURI });
        }
      }
    };

    loadVoices();
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [documentLanguage, settings.voiceURI]);

  const handleVoiceChange = (voiceURI: string) => {
    onSettingsChange({ voiceURI });
  };

  // Group and sort voices to put matching language at the top
  const getGroupedVoices = () => {
    const matching: AppVoice[] = [];
    const others: AppVoice[] = [];
    const docLangPrefix = (documentLanguage || 'fr').substring(0, 2).toLowerCase();

    voices.forEach(v => {
      if (v.lang.toLowerCase().startsWith(docLangPrefix)) {
        matching.push(v);
      } else {
        others.push(v);
      }
    });

    // Custom voices first, then normal system voices sorted by name
    const sorter = (a: AppVoice, b: AppVoice) => {
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      return a.name.localeCompare(b.name);
    };

    matching.sort(sorter);
    others.sort(sorter);

    return { matching, others };
  };

  const { matching: primaryVoices, others: alternativeVoices } = getGroupedVoices();

  const getLanguageNiceName = (langCode: string) => {
    try {
      const displayNames = new Intl.DisplayNames(['fr'], { type: 'language' });
      return displayNames.of(langCode.substring(0, 2)) || langCode;
    } catch {
      return langCode.toUpperCase();
    }
  };

  return (
    <div className="bg-[#1C1917] border-t border-stone-800 py-3.5 px-4 sm:py-5 sm:px-6 md:px-8 shadow-2xl transition-colors text-stone-250 select-none">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
        
        {/* Left indicators: progress and menu toggles */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-xl border border-stone-800 flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0"
            title="Table des matières et recherche"
          >
            <List className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold hidden sm:inline">Sommaire</span>
          </button>
          
          <div className="text-left font-sans min-w-0 flex-1">
            <p className="text-xs font-extrabold text-[#F9F8F6] truncate max-w-[150px] xs:max-w-[210px] sm:max-w-sm md:max-w-md lg:max-w-lg" title={chapterProgressText}>
              {chapterProgressText || "Initialisation..."}
            </p>
            <p className="text-[10px] text-amber-500/80 font-mono mt-0.5 tracking-wider uppercase">
              SYNTHÈSE VOCALE ACTIVE
            </p>
          </div>
        </div>

        {/* Center controllers: physical deck */}
        <div className="flex items-center gap-2">
          {/* Skip back sentence */}
          <button
            onClick={onPreviousSentence}
            disabled={!settings.voiceURI}
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850 disabled:opacity-40 select-none cursor-pointer transition-all"
            title="Phrase précédente"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Master Play/Pause trigger */}
          <button
            onClick={onPlayPause}
            disabled={!settings.voiceURI}
            className={`p-4 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-40 shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-black scale-105'
                : 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-black'
            }`}
            title={isPlaying ? "Mettre en pause" : "Lancer la lecture"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Skip forward sentence */}
          <button
            onClick={onNextSentence}
            disabled={!settings.voiceURI}
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-850 disabled:opacity-40 select-none cursor-pointer transition-all"
            title="Phrase suivante"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset playback to stop state */}
          <button
            onClick={onStop}
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900 text-red-400 hover:bg-red-950/30 hover:border-red-900/40 cursor-pointer transition-colors"
            title="Arrêter la lecture"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Right deck: Voice Selector & Rates variables */}
        <div className="w-full md:w-auto flex flex-wrap items-center justify-center md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
          
          {/* Voices filter dropdown */}
          <div className="relative min-w-[180px] max-w-[240px]">
            <Volume2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <select
              value={settings.voiceURI || ''}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full pl-8 pr-6 py-2 text-xs bg-stone-900 border border-stone-800 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-300 font-bold cursor-pointer"
            >
              {voices.length === 0 ? (
                <option value="">Voix système (Hors ligne)</option>
              ) : (
                <>
                  {primaryVoices.length > 0 && (
                    <optgroup label={`Recommandées (${getLanguageNiceName(documentLanguage)})`}>
                      {primaryVoices.map((v, i) => (
                        <option key={`${v.voiceURI}-${i}`} value={v.voiceURI}>
                          {v.name.replace(/Google/gi, '').trim()} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {alternativeVoices.length > 0 && (
                    <optgroup label="Autres langues disponibles">
                      {alternativeVoices.map((v, i) => (
                        <option key={`${v.voiceURI}-${i}`} value={v.voiceURI}>
                          {v.name.replace(/Google/gi, '').trim()} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
          </div>

          {/* Speed Knob slider */}
          <div className="flex items-center space-x-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 select-none">
            <Sliders className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[10px] font-mono font-bold text-stone-300 w-8">
              {settings.speechRate.toFixed(1)}x
            </span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => onSettingsChange({ speechRate: parseFloat(e.target.value) })}
              className="w-14 h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title="Vitesse de lecture"
            />
          </div>

          {/* Mode Zen — téléprompteur plein écran */}
          <button
            onClick={onToggleZen}
            className="p-2 text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-xl border border-stone-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Mode Zen — téléprompteur plein écran"
          >
            <Eye className="w-4 h-4 text-[#646cff]" />
            <span className="text-xs font-bold hidden sm:inline">Zen</span>
          </button>

          {/* Quick Display settings modal toggle */}
          <button
            onClick={onToggleSettings}
            className="p-2 text-stone-300 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-xl border border-stone-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Ajustements visuels"
          >
            <Settings className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold hidden sm:inline">Options</span>
          </button>

        </div>
      </div>
    </div>
  );
}
