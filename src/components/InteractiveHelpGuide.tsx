import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BookOpen, 
  Play, 
  Square, 
  Sparkles, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  BookLock, 
  HelpCircle, 
  Search, 
  Smile, 
  Zap, 
  Sliders, 
  Download,
  CheckCircle2,
  Bookmark,
  Highlighter,
  Brain,
  Bot,
  BookmarkPlus
, Eye } from 'lucide-react';

interface InteractiveHelpGuideProps {
  onClose: () => void;
  documentLanguage?: string;
}

type GuideStep = 'welcome' | 'vocalLab' | 'gestures' | 'aiFeatures' | 'gutenberg' | 'annotations' | 'comfort' | 'flashcardsCoach' | 'quiz' | 'congrats';

export default function InteractiveHelpGuide({ onClose, documentLanguage = 'fr' }: InteractiveHelpGuideProps) {
  const [currentStep, setCurrentStep] = useState<GuideStep>('welcome');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.1);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [isDemoSpeaking, setIsDemoSpeaking] = useState<boolean>(false);
  const [spokenWordIdx, setSpokenWordIdx] = useState<number>(-1);
  const [selectedCompanionColor, setSelectedCompanionColor] = useState<'violet' | 'emerald' | 'rose' | 'amber'>('violet');
  
  // Quiz states
  const [quiz1Answer, setQuiz1Answer] = useState<string | null>(null);
  const [quiz2Answer, setQuiz2Answer] = useState<string | null>(null);
  const [completedQuiz, setCompletedQuiz] = useState<boolean>(false);

  // Interactive Gesture simulation states
  const [simulatedParagraphIdx, setSimulatedParagraphIdx] = useState<number>(-1);
  const [isSimulatedPlaying, setIsSimulatedPlaying] = useState<boolean>(false);
  
  // Interactive AI Summary simulation states
  const [isSimulatingAISummary, setIsSimulatingAISummary] = useState<boolean>(false);
  const [simulatedAISummaryText, setSimulatedAISummaryText] = useState<string>('');

  // Voices list for WebSpeech demo
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Cancel any running speech when closing or changing steps
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStep]);

  const testPhrase = "Bonjour ! Je suis Charly, votre guide intelligent. Ajustez ma vitesse de lecture ci-dessous et cliquez pour essayer !";
  
  const handleTestVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("La synthèse vocale n'est pas supportée dans votre navigateur.");
      return;
    }

    if (isDemoSpeaking) {
      window.speechSynthesis.cancel();
      setIsDemoSpeaking(false);
      setSpokenWordIdx(-1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.lang = documentLanguage;
    utterance.rate = voiceSpeed;
    utterance.pitch = voicePitch;

    // Filter high quality voice if available
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.lang.startsWith(documentLanguage)) || voices[0];
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Word boundary tracking
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const textBefore = testPhrase.substring(0, event.charIndex);
        const matchWords = textBefore.trim().split(/\s+/);
        setSpokenWordIdx(textBefore === '' ? 0 : matchWords.length);
      }
    };

    utterance.onend = () => {
      setIsDemoSpeaking(false);
      setSpokenWordIdx(-1);
    };

    utterance.onerror = () => {
      setIsDemoSpeaking(false);
      setSpokenWordIdx(-1);
    };

    setIsDemoSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const companionColors = {
    violet: {
      accent: 'text-[#646cff] dark:text-[#767fff]',
      bg: 'bg-[#646cff]/10 border-[#646cff]/20',
      btn: 'bg-[#646cff] hover:bg-[#525aff]',
      pill: 'bg-[#646cff]/10 text-[#646cff] border-[#646cff]/25',
      ripple: 'from-[#646cff] to-[#767fff]',
    },
    emerald: {
      accent: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/5 border-emerald-500/10',
      btn: 'bg-emerald-600 hover:bg-emerald-500',
      pill: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      ripple: 'from-emerald-500 to-teal-400',
    },
    rose: {
      accent: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500/5 border-rose-500/10',
      btn: 'bg-[#e11d48] hover:bg-rose-500',
      pill: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      ripple: 'from-rose-500 to-pink-500',
    },
    amber: {
      accent: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/5 border-amber-500/10',
      btn: 'bg-amber-600 hover:bg-amber-500',
      pill: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      ripple: 'from-amber-500 to-orange-400',
    }
  };

  const styleSet = companionColors[selectedCompanionColor];

  // Steps Navigator
  const stepsOrder: GuideStep[] = ['welcome', 'vocalLab', 'gestures', 'aiFeatures', 'gutenberg', 'annotations', 'comfort', 'flashcardsCoach', 'quiz', 'congrats'];
  
  const handleNext = () => {
    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex < stepsOrder.length - 1) {
      setCurrentStep(stepsOrder[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepsOrder[currentIndex - 1]);
    }
  };

  const currentStepNum = stepsOrder.indexOf(currentStep) + 1;
  const progressPercent = (currentStepNum / stepsOrder.length) * 100;

  // Simulator triggering summary
  const runSimulatedSummary = () => {
    setIsSimulatingAISummary(true);
    setSimulatedAISummaryText('');
    setTimeout(() => {
      setIsSimulatingAISummary(false);
      setSimulatedAISummaryText(
        "✨ **Résumé Express** :\n\n- **Idée Majeure 1** : La liseuse propose une écoute immersive fluide d'œuvres classiques.\n- **Idée Majeure 2** : La navigation est simplifiée par le clic direct sur les phrases.\n- **Idée Majeure 3** : L'IA Gemini 3.5 Flash offre un accompagnement ludique et didactique."
      );
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 text-stone-900 select-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 rounded-[32px] max-w-xl w-full flex flex-col shadow-2xl overflow-hidden relative border border-stone-200 dark:border-stone-900 h-auto max-h-[92vh]"
      >
        {/* Progress header ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-100 dark:bg-stone-900 overflow-hidden">
          <motion.div 
            className={`h-full bg-gradient-to-r ${styleSet.ripple}`}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-5 top-4 text-stone-400 hover:text-stone-700 dark:hover:text-white p-2 rounded-full transition-all bg-stone-50 dark:bg-stone-900/40 border border-stone-150 dark:border-stone-850 hover:scale-105 cursor-pointer z-20"
          title="Fermer le guide didactique"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Main Step Wrapper */}
        <div className="p-6 pt-10 sm:p-8 flex-grow overflow-y-auto max-h-[75vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Step 1: Welcome & Avatar Look */}
              {currentStep === 'welcome' && (
                <div className="space-y-4 text-center">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-full bg-[#646cff]/10 text-white flex items-center justify-center mx-auto text-3xl shadow-inner border border-stone-200 dark:border-stone-800 animate-bounce cursor-pointer">
                      🤖
                    </div>
                    <span className="absolute bottom-0 right-1 px-1 bg-emerald-500 rounded-full text-[8px] font-bold text-white uppercase border-2 border-white dark:border-stone-950 animate-pulse">
                      Actif
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black font-sans leading-tight text-stone-900 dark:text-white tracking-tight">
                      Bienvenue, apprenti lecteur !
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      Je suis <strong className="text-stone-900 dark:text-white font-black">Charly</strong>, votre compagnon intelligent de lecture audio. 
                    </p>
                  </div>

                  <div className="text-left bg-stone-50 dark:bg-stone-900/40 p-4 border border-stone-100 dark:border-stone-900 rounded-2xl space-y-3 font-sans">
                    <p className="text-xs text-stone-750 dark:text-stone-300 leading-relaxed font-normal">
                      Cette liseuse a été forgée pour redéfinir votre façon d'apprendre et de dévorer des livres. Que ce soit pour réviser, soulager vos yeux, ou lire en cuisinant, laissez la synthèse vocale s'occuper du reste de manière fantastique !
                    </p>
                    
                    {/* Visual Customization Interactive Panel */}
                    <div className="pt-2 border-t border-stone-150 dark:border-stone-900/60 space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 block">
                        Personnaliser la couleur d'accent de Charly :
                      </span>
                      <div className="flex gap-2.5">
                        {(['violet', 'emerald', 'rose', 'amber'] as const).map((color) => {
                          const labels = { violet: 'Lavande', emerald: 'Émeraude', rose: 'Corail', amber: 'Ambre' };
                          const dotColors = { violet: 'bg-[#646cff]', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-500' };
                          const isSel = selectedCompanionColor === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSelectedCompanionColor(color)}
                              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isSel
                                  ? 'border-transparent text-white ' + companionColors[color].btn
                                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-850 hover:bg-stone-50'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
                              {labels[color]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Interactive Speech Lab */}
              {currentStep === 'vocalLab' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#646cff]">
                    <Sliders className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 2 : Le laboratoire de voix
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Testez la synthèse vocale en temps réel ! Modifiez le rythme et le ton à votre guise pour trouver votre vitesse de croisière idéale.
                  </p>

                  <div className="p-4 bg-stone-50 dark:bg-stone-900/30 border border-stone-150 dark:border-stone-900 rounded-2xl space-y-4">
                    {/* Live Word Boundary Reader */}
                    <div className="bg-white dark:bg-stone-950 p-4 border border-stone-150 dark:border-stone-900 rounded-xl min-h-[70px] flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs select-none shadow-inner font-sans">
                      {testPhrase.split(/\s+/).map((word, index) => {
                        const isSpoken = spokenWordIdx === index;
                        return (
                          <motion.span
                            key={index}
                            className={`px-1 rounded-md py-0.5 text-xs font-semibold transition-all duration-150 ${
                              isSpoken 
                                ? 'bg-[#646cff]/20 text-[#646cff] dark:text-[#767fff] scale-110 font-bold border border-[#646cff]/30' 
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                            animate={isSpoken ? { scale: 1.1 } : { scale: 1 }}
                          >
                            {word}
                          </motion.span>
                        );
                      })}
                    </div>

                    {/* Controls Speed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Vitesse */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-stone-550">Vitesse :</span>
                          <span className={`font-mono ${styleSet.accent}`}>{voiceSpeed.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={voiceSpeed}
                          onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                          className="w-full accent-[#646cff] h-1.5 bg-stone-200 dark:bg-stone-850 rounded-lg cursor-pointer"
                        />
                      </div>
                      
                      {/* Hauteur */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-stone-550">Hauteur de voix :</span>
                          <span className={`font-mono ${styleSet.accent}`}>{voicePitch.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={voicePitch}
                          onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                          className="w-full accent-[#646cff] h-1.5 bg-stone-200 dark:bg-stone-850 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Interactive Trigger Button */}
                    <button
                      type="button"
                      onClick={handleTestVoice}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-white ${
                        isDemoSpeaking 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : styleSet.btn
                      }`}
                    >
                      {isDemoSpeaking ? (
                        <>
                          <Square className="w-4 h-4 fill-current animate-pulse" />
                          ARRÊTER LE TEST VOCAL
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          TESTER LA SYNTHÈSE VOCALE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Interactive Clic-Pour-Lire Gestures */}
              {currentStep === 'gestures' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#646cff]">
                    <Zap className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 3 : Geste "Clic-pour-lire"
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Plus besoin de rembobiner pour réécouter une notion ! <strong className="text-stone-900 dark:text-white font-bold">Cliquez directement sur n'importe quel paragraphe</strong> dans le texte du livre pour y déplacer instantanément la lecture vocale.
                  </p>

                  <div className="space-y-2 border border-stone-200 dark:border-stone-900 rounded-2xl p-4 bg-[#F5F2ED]/30 dark:bg-[#111] shadow-inner font-serif">
                    <span className="text-[10px] font-bold uppercase font-mono tracking-wide text-stone-400 dark:text-stone-500 mb-1 block">
                      Zone d'entraînement (Simulez un clic) :
                    </span>
                    
                    {[
                      "Un clic sur cette première phrase place immédiatement le curseur de lecture ici.",
                      "Si l'orateur allait trop vite, cliquez gentiment sur ce paragraphe secondaire pour obtenir une répétition.",
                      "C'est simple, intuitif et extrêmement agréable pour réviser à son rythme !"
                    ].map((para, idx) => {
                      const isActive = simulatedParagraphIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSimulatedParagraphIdx(idx);
                            setIsSimulatedPlaying(true);
                          }}
                          className={`p-2 px-3 rounded-lg border text-xs cursor-pointer transition-all ${
                            isActive
                              ? `bg-[#646cff]/10 dark:bg-stone-950/80 border-[#646cff] relative text-stone-900 dark:text-white font-bold`
                              : 'bg-white/40 border-transparent text-stone-600 dark:text-stone-400 hover:bg-stone-100/40 dark:hover:bg-stone-900/30'
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -left-1.5 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#646cff] opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#646cff]" />
                            </span>
                          )}
                          <p className="leading-relaxed">"{para}"</p>
                        </div>
                      );
                    })}

                    {isSimulatedPlaying && simulatedParagraphIdx !== -1 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#646cff] dark:text-[#767fff] font-bold font-sans tracking-tight pt-1.5 animate-pulse">
                        <Play className="w-3 h-3 fill-current" />
                        <span>Lecture simulée à partir du paragraphe {simulatedParagraphIdx + 1}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Intelligent AI Summarizing */}
              {currentStep === 'aiFeatures' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#646cff]">
                    <Sparkles className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 4 : Résumés intelligents par IA (Nouveauté)
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Peur de perdre le fil des chapitres ? Notre assistant intégré utilise <strong className="text-stone-900 dark:text-white font-black">Gemini 3.5 Flash</strong> pour condenser et extraire le sens profond de vos documents de façon conviviale et structurée en 1 clic.
                  </p>

                  <div className="bg-stone-50 dark:bg-stone-900/30 border border-stone-150 dark:border-stone-900 rounded-2xl p-4 space-y-3 font-sans">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-stone-400 dark:text-stone-500 block">
                      Démonstration interactive (Cliquez sur Générer) :
                    </span>
                    
                    <button
                      type="button"
                      onClick={runSimulatedSummary}
                      disabled={isSimulatingAISummary}
                      className={`w-full py-2 bg-gradient-to-r ${styleSet.ripple} text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.01] cursor-pointer disabled:opacity-45`}
                    >
                      {isSimulatingAISummary ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          L'IA analyse le texte...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          Simuler le résumé de section
                        </>
                      )}
                    </button>

                    <AnimatePresence mode="wait">
                      {simulatedAISummaryText && (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-white dark:bg-stone-950 p-3 border border-stone-150 dark:border-[#1e1d1d] rounded-xl text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed"
                        >
                          {simulatedAISummaryText.split('\n').map((line, ix) => (
                            <p key={ix} className={line.startsWith('-') ? 'my-1 pl-3 font-medium' : 'font-semibold text-stone-900 dark:text-stone-200'}>
                              {line}
                            </p>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Step 5: Gutenberg Library Exploration + Import */}
              {currentStep === 'gutenberg' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#646cff]">
                    <BookOpen className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 5 : 70 000 classiques & vos documents
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    L'onglet <strong className="text-stone-900 dark:text-white font-extrabold">Librairie</strong> donne accès au catalogue complet du Projet Gutenberg avec <strong className="text-stone-900 dark:text-white font-bold">4 modes d'exploration</strong> :
                  </p>

                  <div className="grid grid-cols-2 gap-2 font-sans">
                    {[
                      { icon: '🔥', label: 'Top téléchargements', desc: 'Les classiques les plus populaires, filtrés par langue.' },
                      { icon: '🏷️', label: '15 genres', desc: 'Aventure, Policier, SF, Poésie, Contes, Histoire...' },
                      { icon: '🎲', label: 'Découverte aléatoire', desc: '32 livres piochés au hasard — repiochez à volonté !' },
                      { icon: '🔍', label: 'Recherche + pagination', desc: 'Par titre/auteur, avec « Charger plus » sans limite.' },
                    ].map((item, i) => (
                      <div key={i} className="p-2.5 rounded-xl border border-stone-150 dark:border-stone-900 bg-stone-50 dark:bg-stone-900/40 space-y-0.5">
                        <p className="text-[11px] font-black text-stone-900 dark:text-white">{item.icon} {item.label}</p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    Chaque résultat affiche sa <strong className="text-stone-700 dark:text-stone-200">vraie couverture</strong> 📖 et sa popularité. Votre recherche est conservée même si vous changez d'onglet.
                  </p>

                  <div className="bg-[#646cff]/5 border border-[#646cff]/20 rounded-xl p-3 text-[11px] text-stone-600 dark:text-stone-300 font-sans space-y-1">
                    <p className="font-black text-[#646cff] dark:text-[#767fff]">📥 Et vos propres documents ?</p>
                    <p>L'onglet <strong>Importer</strong> accepte <strong>6 formats</strong> (PDF, ePUB, TXT, Markdown, Word, HTML), les pages web par URL, et même le <strong>texte collé directement</strong> — copiez un email ou un cours, il devient un livre audio !</p>
                  </div>
                </div>
              )}


              {/* Step 6: Annotations & Surlignage */}
              {currentStep === 'annotations' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Highlighter className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 6 : Annoter & Surligner
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Sélectionnez n'importe quel passage pendant la lecture : un mini-menu apparaît avec <strong className="text-stone-900 dark:text-white font-bold">4 actions instantanées</strong>.
                  </p>

                  <div className="space-y-2 font-sans">
                    {[
                      { icon: '▶', color: 'bg-[#646cff]/10 border-[#646cff]/30 text-[#646cff]', label: 'Lire depuis ici', desc: 'Place le curseur vocal exactement à la phrase sélectionnée.' },
                      { icon: '🖊', color: 'bg-amber-400/10 border-amber-400/30 text-amber-500', label: 'Annoter', desc: 'Surligne en jaune, vert, bleu ou rose + note textuelle persistée.' },
                      { icon: '📖', color: 'bg-indigo-400/10 border-indigo-400/30 text-indigo-400', label: 'Définir', desc: 'Ouvre le dictionnaire IA — définition, étymologie, synonymes.' },
                      { icon: '📋', color: 'bg-stone-400/10 border-stone-400/30 text-stone-500', label: 'Copier', desc: 'Copie le texte sélectionné dans le presse-papiers.' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.color}`}>
                        <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div>
                          <p className="text-xs font-black text-stone-900 dark:text-white">{item.label}</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-400 font-sans space-y-1.5">
                    <p>✨ <strong>Les passages annotés restent surlignés</strong> dans leur couleur pendant la lecture — survolez-les pour voir votre note.</p>
                    <p>📂 Retrouvez toutes vos annotations dans le panneau latéral, onglet <strong>Annot.</strong> — touchez une annotation pour sauter directement au passage.</p>
                    <p>💾 <strong>Synchronisées</strong> sur tous vos appareils via le serveur SQLite.</p>
                  </div>
                </div>
              )}

              {/* Step 7: Confort de lecture — Zen, largeur, temps estimé */}
              {currentStep === 'comfort' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Eye className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 7 : Confort de lecture
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    SpeechifyPro s'adapte à <strong className="text-stone-900 dark:text-white font-bold">votre confort visuel</strong> pour des sessions de lecture agréables et sans fatigue.
                  </p>

                  <div className="space-y-2 font-sans">
                    {[
                      { icon: '🧘', color: 'bg-[#646cff]/10 border-[#646cff]/30 text-[#646cff]', label: 'Mode Zen', desc: 'Téléprompteur plein écran. Swipe ←→ pour naviguer, double-tap pour lire/pause, swipe ↑ pour quitter.' },
                      { icon: '⏱️', color: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-500', label: 'Temps estimé', desc: 'Minutes restantes du chapitre et du livre, ajustées à votre vitesse de lecture.' },
                      { icon: '📐', color: 'bg-amber-400/10 border-amber-400/30 text-amber-500', label: 'Largeur réglable', desc: 'Colonne étroite, normale ou large selon votre écran et votre préférence.' },
                      { icon: '⬇️', color: 'bg-indigo-400/10 border-indigo-400/30 text-indigo-400', label: 'Bouton Reprendre', desc: 'Si vous faites défiler, un bouton vous ramène instantanément à la phrase en cours.' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${item.color}`}>
                        <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div>
                          <p className="text-xs font-black text-stone-900 dark:text-white">{item.label}</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#646cff]/5 border border-[#646cff]/20 rounded-xl p-3 text-[11px] text-[#646cff] dark:text-[#a78bfa] font-sans space-y-1.5">
                    <p>🎨 Réglez tout ça via le bouton <strong>Options</strong> dans la barre du lecteur : 3 thèmes (Clair / Sépia / Sombre), police dyslexie, taille, interligne et largeur.</p>
                    <p>📊 Suivez votre progression dans l'onglet <strong>Stats</strong> : objectif quotidien, série de jours, temps par livre.</p>
                    <p>📁 Importez vos propres fichiers : <strong>PDF, ePUB, TXT et Markdown</strong> — glissez-déposez dans l'onglet Importer.</p>
                  </div>
                </div>
              )}

              {/* Step 7: Flashcards & Charly Coach */}
              {currentStep === 'flashcardsCoach' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Brain className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 8 : Flashcards & Charly Coach IA
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Deux outils puissants pour <strong className="text-stone-900 dark:text-white font-bold">apprendre en lisant</strong>, pas seulement écouter.
                  </p>

                  <div className="space-y-3 font-sans">
                    {/* Flashcards */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <BookmarkPlus className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-black text-stone-900 dark:text-white">Deck de Flashcards</span>
                        <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Onglet Cartes</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                        Double-cliquez sur un mot → Dictionnaire → <strong className="text-indigo-400">Sauvegarder en flashcard</strong>. Retrouvez vos mots dans l'onglet <strong>Cartes</strong> pour les réviser en mode flip (recto : mot, verso : définition + exemple).
                      </p>
                      <div className="flex gap-2 text-[10px]">
                        <span className="bg-stone-800 text-stone-300 px-2 py-1 rounded-lg">📋 Mode liste</span>
                        <span className="bg-indigo-800/50 text-indigo-300 px-2 py-1 rounded-lg">🔄 Mode révision flip</span>
                        <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded-lg">🏆 Marquage maîtrisé</span>
                      </div>
                    </div>

                    {/* Charly Coach */}
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-black text-stone-900 dark:text-white">Charly Coach IA</span>
                        <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Contextuel</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                        Posez des questions à Charly sur votre lecture en cours — il connaît le titre, le chapitre et le passage actuel.
                      </p>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {['📝 Résume ce passage', '❓ Quiz rapide', '🔍 Contexte historique', '💡 Points clés', '📚 Vocabulaire'].map((q, i) => (
                          <span key={i} className="bg-stone-800 text-stone-400 px-2 py-1 rounded-full">{q}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Educational interactive Quiz */}
              {currentStep === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#646cff]">
                    <Award className={`w-5 h-5 ${styleSet.accent}`} />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide text-stone-900 dark:text-white font-sans">
                      Étape 9 : Quiz interactif rapide !
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    C'est l'heure de valider vos connaissances et d'officialiser votre titre de lecteur intelligent ! Deux questions courtes pour tout verrouiller.
                  </p>

                  <div className="space-y-4 text-left font-sans">
                    {/* Q1 */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 dark:text-stone-500 flex items-center gap-1">
                        <span className="text-[#646cff] font-sans">Q1 •</span> Comment passer rapidement à l'écoute d'un paragraphe précis ?
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { key: 'A', text: "En secouant énergiquement sa souris devant l'écran." },
                          { key: 'B', text: "En cliquant directement sur la phrase souhaitée dans le livre." },
                          { key: 'C', text: "En envoyant un email au support technique." },
                        ].map((choice) => {
                          const isSel = quiz1Answer === choice.key;
                          const isWrong = isSel && choice.key !== 'B';
                          const isCorrect = isSel && choice.key === 'B';
                          return (
                            <button
                              key={choice.key}
                              type="button"
                              onClick={() => setQuiz1Answer(choice.key)}
                              className={`p-2 px-3 border rounded-xl text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                                isCorrect 
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600'
                                  : isWrong 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                    : 'bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-850 border-stone-150 dark:border-stone-850'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center ${
                                isCorrect 
                                  ? 'bg-emerald-500 text-white' 
                                  : isWrong 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600'
                              }`}>
                                {choice.key}
                              </span>
                              <span className="font-bold">{choice.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Q2 */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 dark:text-stone-500 flex items-center gap-1">
                        <span className="text-[#646cff] font-sans">Q2 •</span> Que se passe-t-il si vous changez d'onglet pendant l'écoute ?
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { key: 'A', text: "Le son continue en arrière-plan avec un mini-lecteur flottant persistant." },
                          { key: 'B', text: "L'application s'éteint et supprime vos livres." },
                          { key: 'C', text: "Votre ordinateur commence à chanter du jazz." },
                        ].map((choice) => {
                          const isSel = quiz2Answer === choice.key;
                          const isWrong = isSel && choice.key !== 'A';
                          const isCorrect = isSel && choice.key === 'A';
                          return (
                            <button
                              key={choice.key}
                              type="button"
                              onClick={() => setQuiz2Answer(choice.key)}
                              className={`p-2 px-3 border rounded-xl text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                                isCorrect 
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600'
                                  : isWrong 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                    : 'bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-850 border-stone-150 dark:border-stone-850'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center ${
                                isCorrect 
                                  ? 'bg-emerald-500 text-white' 
                                  : isWrong 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600'
                              }`}>
                                {choice.key}
                              </span>
                              <span className="font-bold">{choice.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Q3 — Nouvelles fonctionnalités */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 dark:text-stone-500 flex items-center gap-1">
                        <span className="text-[#646cff] font-sans">Q3 •</span> Comment sauvegarder un mot inconnu pour le réviser plus tard ?
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { key: 'A', text: "Double-clic sur le mot → Dictionnaire IA → bouton Sauvegarder en flashcard → onglet Cartes." },
                          { key: 'B', text: "Imprimer la page et surligner au feutre fluo." },
                          { key: 'C', text: "Demander à Charly de le mémoriser par télépathie." },
                        ].map((choice) => {
                          const isSel = (quiz2Answer === ('q3_' + choice.key));
                          const isWrong = isSel && choice.key !== 'A';
                          const isCorrect = isSel && choice.key === 'A';
                          return (
                            <button
                              key={choice.key}
                              type="button"
                              onClick={() => setQuiz2Answer('q3_' + choice.key)}
                              className={`p-2 px-3 border rounded-xl text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                                isCorrect 
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600'
                                  : isWrong 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                    : 'bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-850 border-stone-150 dark:border-stone-850'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center ${
                                isCorrect 
                                  ? 'bg-emerald-500 text-white' 
                                  : isWrong 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600'
                              }`}>
                                {choice.key}
                              </span>
                              <span className="font-bold">{choice.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Congrats & achievement unlocked */}
              {currentStep === 'congrats' && (
                <div className="space-y-4 text-center">
                  <motion.div
                    initial={{ scale: 0.8, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-white font-extrabold flex items-center justify-center mx-auto text-4xl shadow-xl border border-amber-300 drop-shadow-md"
                  >
                    🏆
                  </motion.div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black font-sans leading-tight text-stone-900 dark:text-white tracking-tight">
                      Félicitations, vous êtes prêt !
                    </h3>
                    <p className="text-xs text-rose-500 dark:text-rose-400 uppercase font-mono tracking-wider font-extrabold">
                      Badge Débloqué : Lecteur Émérite de SpeechifyPro
                    </p>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-900/45 p-4 border border-stone-150 dark:border-stone-900 rounded-2xl font-sans text-xs leading-relaxed text-stone-655 dark:text-stone-300">
                    <p>
                      Vous comprenez désormais l'ensemble des interactions nécessaires pour tirer le maximum de bénéfices de votre liseuse audio. 
                    </p>
                    <p className="mt-2 text-[11px] text-stone-500 italic">
                      "Celui qui lit beaucoup et marche beaucoup, voit beaucoup et sait beaucoup." — Miguel de Cervantes
                    </p>
                  </div>

                  {/* Ultimate CTA to close dialog */}
                  <button
                    onClick={onClose}
                    type="button"
                    className="w-full mt-4 py-3 bg-[#646cff] text-white hover:bg-[#525aff] font-black font-mono tracking-wider text-xs rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    COMMENCER L'EXPÉRIENCE AUDIO VIVANTE
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons lower panel */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-900 bg-stone-50/50 dark:bg-[#111] flex items-center justify-between font-sans">
          {/* Back btn */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 'welcome'}
            className="px-3 py-1.5 flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-850 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>

          {/* Steps Indicator dots */}
          <div className="flex gap-1.5 items-center">
            {stepsOrder.map((stepName, i) => {
              const isPassed = stepsOrder.indexOf(currentStep) > i;
              const isCur = currentStep === stepName;
              return (
                <span
                  key={stepName}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isCur 
                      ? 'w-5 bg-[#646cff]' 
                      : isPassed 
                        ? 'bg-[#646cff]/40' 
                        : 'bg-stone-300 dark:bg-stone-800'
                  }`}
                />
              );
            })}
          </div>

          {/* Next/Finish btn */}
          {currentStep === 'congrats' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wide cursor-pointer transition-all hover:scale-105"
            >
              Terminer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 bg-[#646cff] hover:bg-[#525aff] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
            >
              Continuer
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}



