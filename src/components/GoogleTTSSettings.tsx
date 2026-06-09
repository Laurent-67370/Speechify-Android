/**
 * GoogleTTSSettings — Panneau de configuration Google Cloud TTS
 * S'intègre dans ReaderSettings.tsx (onglet Paramètres du lecteur)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronDown, ChevronUp, Volume2, Check, X, Loader } from 'lucide-react';
import { GTTSConfig, GTTSVoice, useGoogleTTS } from '../utils/useGoogleTTS';

interface GoogleTTSSettingsProps {
  documentLanguage?: string;
  theme?: string;
}

export default function GoogleTTSSettings({
  documentLanguage = 'fr',
  theme = 'dark',
}: GoogleTTSSettingsProps) {
  const { isEnabled, config, saveConfig, speak, GTTS_VOICES } = useGoogleTTS();

  const [panelOpen, setPanelOpen] = useState(false);
  const [localKey, setLocalKey]   = useState(config.key || '');
  const [localVoice, setLocalVoice] = useState(config.voice || 'fr-FR-Neural2-A');
  const [localEnabled, setLocalEnabled] = useState(config.enabled || false);
  const [testState, setTestState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const isDark = theme === 'dark';

  // Voix filtrées par langue du document (priorité), puis toutes
  const langPrefix = (documentLanguage || 'fr').substring(0, 2).toLowerCase();
  const primaryVoices  = GTTS_VOICES.filter(v => v.lang === langPrefix);
  const secondaryVoices = GTTS_VOICES.filter(v => v.lang !== langPrefix);

  const handleSave = () => {
    saveConfig({ enabled: localEnabled, key: localKey.trim(), voice: localVoice });
    setPanelOpen(false);
  };

  const handleTest = async () => {
    if (!localKey.trim()) {
      setTestState('error');
      setTestError('Clé API manquante');
      setTimeout(() => setTestState('idle'), 2500);
      return;
    }
    setTestState('loading');
    setTestError('');
    try {
      // Sauvegarder temporairement pour le test
      saveConfig({ enabled: true, key: localKey.trim(), voice: localVoice });
      await speak('Bonjour, ceci est un test de la voix premium Google Cloud.', 1.0, 1.0);
      setTestState('ok');
    } catch (e: any) {
      setTestState('error');
      setTestError(e.message?.slice(0, 80) || 'Erreur inconnue');
    }
    setTimeout(() => setTestState('idle'), 3000);
  };

  return (
    <div className="space-y-2">
      {/* Badge statut + bouton toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#646cff]" />
          <span className={`text-xs font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
            Voix premium
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge état */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isEnabled
              ? 'text-[#646cff] border-[#646cff]/30 bg-[#646cff]/10'
              : isDark
                ? 'text-stone-500 border-stone-800 bg-stone-900'
                : 'text-stone-400 border-stone-200 bg-stone-100'
          }`}>
            {isEnabled ? '✨ Premium' : '📱 Système'}
          </span>
          {/* Toggle panneau */}
          <button
            onClick={() => setPanelOpen(p => !p)}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDark
                ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="Configurer Google Cloud TTS"
          >
            {panelOpen
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      {/* Panneau de configuration (collapsible) */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`rounded-xl border p-4 space-y-3 mt-1 ${
              isDark
                ? 'bg-stone-900/80 border-stone-800'
                : 'bg-stone-50 border-stone-200'
            }`}>

              {/* Activation toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setLocalEnabled(v => !v)}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                    localEnabled ? 'bg-[#646cff]' : isDark ? 'bg-stone-700' : 'bg-stone-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    localEnabled ? 'left-5' : 'left-0.5'
                  }`} />
                </div>
                <span className={`text-xs font-semibold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  Activer les voix premium
                </span>
              </label>

              {/* Clé API */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                  isDark ? 'text-stone-500' : 'text-stone-400'
                }`}>
                  Clé API Google Cloud
                </label>
                <input
                  type="password"
                  value={localKey}
                  onChange={e => setLocalKey(e.target.value)}
                  placeholder="AIza…"
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-[#646cff] transition-colors ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 text-white placeholder-stone-600'
                      : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              {/* Sélecteur voix */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                  isDark ? 'text-stone-500' : 'text-stone-400'
                }`}>
                  Voix
                </label>
                <select
                  value={localVoice}
                  onChange={e => setLocalVoice(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-[#646cff] cursor-pointer appearance-none transition-colors ${
                    isDark
                      ? 'bg-stone-800 border-stone-700 text-white'
                      : 'bg-white border-stone-300 text-stone-900'
                  }`}
                >
                  {primaryVoices.length > 0 && (
                    <optgroup label={`Recommandées (${documentLanguage})`}>
                      {primaryVoices.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {secondaryVoices.length > 0 && (
                    <optgroup label="Autres langues">
                      {secondaryVoices.map(v => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Feedback test */}
              {testState === 'error' && testError && (
                <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> {testError}
                </p>
              )}
              {testState === 'ok' && (
                <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Test réussi — voix premium opérationnelle
                </p>
              )}

              {/* Boutons Test + Enregistrer */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleTest}
                  disabled={testState === 'loading'}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg border cursor-pointer transition-all disabled:opacity-50 ${
                    isDark
                      ? 'border-[#646cff] text-[#646cff] hover:bg-[#646cff]/10'
                      : 'border-[#646cff] text-[#646cff] hover:bg-[#646cff]/10'
                  }`}
                >
                  {testState === 'loading'
                    ? <><Loader className="w-3 h-3 animate-spin" /> Test…</>
                    : testState === 'ok'
                      ? <><Check className="w-3 h-3" /> OK</>
                      : <><Volume2 className="w-3 h-3" /> Tester</>
                  }
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 text-[11px] font-black rounded-lg bg-[#646cff] hover:bg-[#525aff] text-white cursor-pointer transition-colors"
                >
                  Enregistrer
                </button>
              </div>

              {/* Note info */}
              <p className={`text-[9px] leading-relaxed ${isDark ? 'text-stone-600' : 'text-stone-400'}`}>
                🔒 Clé stockée localement uniquement. 1M caractères/mois gratuits sur Google Cloud.
                Activez l'API "Cloud Text-to-Speech" dans la console GCP.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
