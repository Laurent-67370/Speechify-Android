import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, BookOpen, Sparkles, HelpCircle, ArrowRight, ExternalLink, RefreshCw, BookmarkPlus, Check } from 'lucide-react';
import { Flashcard } from '../types';

interface DictionaryResult {
  word: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  contextualExplanation: string;
  synonyms: string[];
  example: string;
}

interface DictionaryModalProps {
  word: string;
  sentenceContext?: string;
  language?: string;
  onClose: () => void;
  onDefineWord?: (word: string) => void; // Support recursive lookups
  onSaveFlashcard?: (card: Flashcard) => void;
  sourceBookTitle?: string;
}

export default function DictionaryModal({
  word: initialWord,
  sentenceContext = '',
  language = 'fr',
  onClose,
  onSaveFlashcard,
  sourceBookTitle,
}: DictionaryModalProps) {
  const [word, setWord] = useState(initialWord);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [savedAsFlashcard, setSavedAsFlashcard] = useState(false);

  const handleSaveFlashcard = () => {
    if (!result || !onSaveFlashcard) return;
    const card: Flashcard = {
      id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      word: result.word,
      partOfSpeech: result.partOfSpeech,
      definition: result.definition,
      etymology: result.etymology,
      example: result.example,
      synonyms: result.synonyms || [],
      language,
      sourceBookTitle,
      createdAt: Date.now(),
      reviewCount: 0,
      mastered: false,
    };
    onSaveFlashcard(card);
    setSavedAsFlashcard(true);
    setTimeout(() => setSavedAsFlashcard(false), 2500);
  };

  // Function to load the word definition
  const loadDefinition = async (targetWord: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanWord = targetWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, "").trim();
      
      const response = await fetch('/api/gemini/define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          sentence: sentenceContext,
          lang: language
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erreur de chargement");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn("Gemini define failed, doing alternative public fallback lookup", err);
      // Fallback: try public dictionary API
        const cleanWord = targetWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'']/g, "").trim();
        // Fallback Wiktionnaire (API officielle, supporte le français nativement)
        const isFr = language.startsWith('fr');
        const wikiLang = isFr ? 'fr' : 'en';
        const wikiRes = await fetch(
          `https://${wikiLang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cleanWord)}`
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const entries = wikiData[wikiLang] || wikiData['en'] || Object.values(wikiData)[0] as any[] || [];
          const firstEntry = (entries as any[])[0] || {};
          const definitions = firstEntry.definitions || [];
          const firstDef = definitions[0] || {};
          const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const definition = stripHtml(firstDef.definition || '') || 'Définition non disponible.';
          const example = stripHtml(firstDef.examples?.[0] || '');
          setResult({
            word: cleanWord,
            partOfSpeech: firstEntry.partOfSpeech || 'Mot',
            definition,
            etymology: isFr ? 'Source : Wiktionnaire français.' : 'Source: Wiktionary.',
            contextualExplanation: sentenceContext ? `Mot repéré dans : "${sentenceContext}".` : '',
            synonyms: [],
            example,
          });
        } else {
          // Fallback 2 : dictionaryapi.dev (anglais uniquement)
          const fallbackRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const entry = fallbackData[0];
            setResult({
              word: entry.word || cleanWord,
              partOfSpeech: entry.meanings?.[0]?.partOfSpeech || 'Mot',
              definition: entry.meanings?.[0]?.definitions?.[0]?.definition || 'Définition non disponible.',
              etymology: 'Source: Dictionary API.',
              contextualExplanation: '',
              synonyms: entry.meanings?.[0]?.synonyms?.slice(0, 4) || [],
              example: entry.meanings?.[0]?.definitions?.[0]?.example || '',
            });
          } else {
            throw new Error('Mot introuvable dans les dictionnaires disponibles.');
          }
        }
      } catch (fallbackErr: any) {
        setError(err.message || "Impossible d'obtenir une définition.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinition(word);
  }, [word]);

  // Pronounce the word using web SpeechSynthesis
  const handlePronounce = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Handle clicking a synonym (recursive look up!)
  const handleSynonymClick = (syn: string) => {
    setHistory((prev) => [...prev, word]);
    setWord(syn);
  };

  // Go back in navigation hierarchy
  const handleGoBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((prevList) => prevList.slice(0, -1));
      setWord(prev);
    }
  };

  // Web search triggers
  const getSearchURL = (type: 'larousse' | 'wikipedia' | 'google') => {
    // Extract first word only, strip punctuation & quotes, lowercase for Larousse
    const lemme = word.toLowerCase().trim().split(/[\s.,;!?]+/)[0].replace(/['"«»'']/g, '');
    const encoded = encodeURIComponent(lemme);
    if (type === 'larousse') {
      return `https://www.larousse.fr/dictionnaires/francais/${encoded}`;
    } else if (type === 'wikipedia') {
      return `https://fr.wikipedia.org/wiki/${encodeURIComponent(word.trim().split(/\s+/)[0])}`;
    }
    return `https://www.google.com/search?q=d%C3%A9finition+${encodeURIComponent(word.trim())}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-[#121111]/95 text-stone-100 rounded-[28px] max-w-lg w-full p-6 shadow-2xl relative border border-stone-900 flex flex-col max-h-[90vh]"
      >
        {/* Absolute Top Controls */}
        <div className="flex items-center justify-between border-b border-stone-900 pb-3 mb-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black tracking-tight font-sans text-stone-300">
              Dictionnaire Intuitif
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            {history.length > 0 && (
              <button
                onClick={handleGoBack}
                className="text-stone-400 hover:text-white px-2.5 py-1 text-xs rounded-lg hover:bg-stone-900 transition-all font-sans cursor-pointer flex items-center gap-1"
                title="Retourner au mot précédent"
              >
                ← Retour
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1.5 rounded-lg cursor-pointer hover:bg-stone-900 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Definition Content Panel */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
          
          {loading ? (
            /* Elegant Shimmer Loading State */
            <div className="space-y-4 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-32 bg-stone-800 rounded-lg"></div>
                  <div className="h-3 w-20 bg-stone-800 rounded-md"></div>
                </div>
                <div className="h-9 w-9 bg-stone-800 rounded-full"></div>
              </div>
              <div className="space-y-2.5 pt-4">
                <div className="h-4 w-full bg-stone-800 rounded"></div>
                <div className="h-4 w-5/6 bg-stone-800 rounded"></div>
                <div className="h-4 w-4/5 bg-stone-800 rounded"></div>
              </div>
              <div className="h-20 bg-stone-900 border border-stone-850 rounded-xl mt-4"></div>
            </div>
          ) : error ? (
            /* Friendly Error display with shortcuts */
            <div className="space-y-4 py-2">
              <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs space-y-2">
                <p className="font-extrabold text-red-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Définition introuvable automatiquement
                </p>
                <p className="text-stone-400">
                  Nous n'avons pas pu charger d'explication automatique pour le terme <strong className="text-stone-200">"{word}"</strong>. Vous pouvez essayer de rafraîchir ou explorer via nos raccourcis officiels ci-dessous.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => loadDefinition(word)}
                    className="px-3 py-1.5 bg-stone-900 border border-stone-850 text-[11px] text-[#646cff] hover:text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Réessayer
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-550">Rechercher en ligne :</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <a
                    href={getSearchURL('larousse')}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-850 rounded-xl flex items-center justify-between text-amber-500 font-extrabold hover:text-white transition-all"
                  >
                    <span>📖 Consulter le Larousse</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={getSearchURL('wikipedia')}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-850 rounded-xl flex items-center justify-between text-cyan-400 font-extrabold hover:text-white transition-all"
                  >
                    <span>🌐 Chercher sur Wikipédia</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : result ? (
            /* Successful dictionary render */
            <div className="space-y-4">
              {/* Header: Word & Action */}
              <div className="flex items-center justify-between bg-stone-950/20 p-3 rounded-2xl border border-stone-900/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight font-serif text-amber-500 capitalize leading-none">
                      {result.word}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-stone-900 border border-stone-850 text-stone-400 uppercase">
                      {result.partOfSpeech}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-mono">
                    {language.startsWith('fr') ? "Prononciation instantanée" : "Native listening"}
                  </p>
                </div>

                <button
                  onClick={handlePronounce}
                  className="h-10 w-10 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-stone-950 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
                  title="Écouter la prononciation"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Definition Block */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Définition</h4>
                <div className="p-3.5 bg-stone-900/60 border border-stone-850/80 rounded-xl text-stone-200 text-xs leading-relaxed font-sans font-medium">
                  {result.definition}
                </div>
              </div>

              {/* 2. Etymology Block */}
              {result.etymology && result.etymology !== "N/A" && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-500">Histoire & Origine</h4>
                  <div className="p-3 bg-stone-950/30 border border-stone-900/40 rounded-xl text-stone-400 text-[11px] leading-relaxed font-sans italic">
                    💡 {result.etymology}
                  </div>
                </div>
              )}

              {/* 3. Contextual Explanation Block (Highly didactique!) */}
              {sentenceContext && result.contextualExplanation && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Sens en Contexte</h4>
                  </div>
                  <div className="p-3.5 bg-indigo-950/10 border border-indigo-900/20 rounded-xl text-xs space-y-2 leading-relaxed">
                    <p className="text-[11px] text-stone-400 font-serif border-l-2 border-indigo-500 pl-2.5 italic">
                      "...{sentenceContext.length > 120 ? sentenceContext.substring(0, 120) + '...' : sentenceContext}..."
                    </p>
                    <p className="text-stone-300 font-sans font-medium">
                      {result.contextualExplanation}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Usage Example */}
              {result.example && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-500">Exemple d'exercice</h4>
                  <div className="p-3 bg-stone-900/30 rounded-xl border border-stone-900 text-stone-300 text-xs font-serif leading-relaxed">
                    "{result.example}"
                  </div>
                </div>
              )}

              {/* 5. Synonyms Pill list (Recursive Lookups!) */}
              {result.synonyms && result.synonyms.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-500">Synonymes explorables</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.synonyms.map((syn, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSynonymClick(syn)}
                        className="text-xs px-2.5 py-1 bg-stone-900 hover:bg-amber-500 border border-stone-850 text-stone-300 hover:text-stone-950 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span>{syn}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Online Lookups shortcuts */}
              <div className="pt-2 border-t border-stone-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-stone-550 mr-1">Sorties directes :</span>
                  <a
                    href={getSearchURL('wikipedia')}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-[10px] font-extrabold text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    Wikipédia <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-stone-700 font-mono">•</span>
                  <a
                    href={getSearchURL('larousse')}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-[10px] font-extrabold text-amber-500 hover:underline flex items-center gap-0.5"
                  >
                    Larousse <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-stone-700 font-mono">•</span>
                  <a
                    href={getSearchURL('google')}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-[10px] font-extrabold text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Google Search <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : null}

        </div>

        {/* Footer info tip */}
        {/* Bouton Flashcard */}
        {result && onSaveFlashcard && (
          <button
            onClick={handleSaveFlashcard}
            className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-2xl transition-all cursor-pointer ${
              savedAsFlashcard
                ? 'bg-green-700/30 border border-green-700/50 text-green-300'
                : 'bg-indigo-700/20 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-700/30'
            }`}
          >
            {savedAsFlashcard ? (
              <><Check className="w-4 h-4" />Ajoutée à vos flashcards !</>
            ) : (
              <><BookmarkPlus className="w-4 h-4" />Sauvegarder en flashcard</>
            )}
          </button>
        )}

        <div className="bg-stone-950/40 p-3 rounded-2xl text-[10px] text-stone-500 text-center border border-stone-950 leading-normal flex-shrink-0 mt-4 font-mono">
          💡 En lecture, <strong>double-cliquez</strong> sur un mot ou faites une <strong>sélection de texte</strong> pour déclencher cette aide instantanée.
        </div>
      </motion.div>
    </div>
  );
}


