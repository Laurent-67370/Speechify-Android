import { Type, Moon, Sun, Scroll, AlignLeft, Paintbrush, Languages, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserSettings, TextTheme, FontFamily } from '../types';

import GoogleTTSSettings from './GoogleTTSSettings';

interface ReaderSettingsProps {
  settings: UserSettings;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  documentLanguage: string;
}

const THEMES: { id: TextTheme; label: string; bg: string; text: string; border: string }[] = [
  { id: 'light', label: 'Clair', bg: 'bg-[#F9F8F6]', text: 'text-[#2D2926]', border: 'border-stone-200' },
  { id: 'sepia', label: 'Sépia', bg: 'bg-[#F2EFE9]', text: 'text-[#2D2926]', border: 'border-stone-300' },
  { id: 'dark', label: 'Sombre', bg: 'bg-[#0f0e0d]', text: 'text-stone-200', border: 'border-stone-800' },
];

const FONTS: { id: FontFamily; label: string; preview: string }[] = [
  { id: 'sans', label: 'Inter (Sans-serif)', preview: 'Aa' },
  { id: 'serif', label: 'Georgia (Serif)', preview: 'Gg' },
  { id: 'dyslexic', label: 'Dyslexique (Haute lisibilité)', preview: 'Dd' },
];

const HIGHLIGHT_COLORS = [
  { id: 'rgba(245, 158, 11, 0.25)', label: 'Ambre', class: 'bg-amber-400' },
  { id: 'rgba(16, 185, 129, 0.25)', label: 'Émeraude', class: 'bg-emerald-500' },
  { id: 'rgba(59, 130, 246, 0.25)', label: 'Azur', class: 'bg-blue-400' },
  { id: 'rgba(236, 72, 153, 0.25)', label: 'Rose', class: 'bg-pink-400' },
];

export default function ReaderSettings({ settings, onSettingsChange, documentLanguage }: ReaderSettingsProps) {
  return (
    <div id="settings-pannel" className="space-y-6">
      {/* 1. Theme choices */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center">
          <Moon className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Thème d'affichage
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSettingsChange({ theme: t.id })}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-semibold border transition-all ${t.bg} ${t.text} ${
                settings.theme === t.id
                  ? 'ring-2 ring-amber-500 scale-[1.02] border-transparent'
                  : 'hover:scale-[1.01] cursor-pointer'
              } ${t.border}`}
            >
              <span className="text-sm font-bold mb-1 font-serif">Abc</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Font preferences */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center">
          <Type className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Style de police
        </h4>
        <div className="space-y-2">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => onSettingsChange({ fontFamily: f.id })}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs font-bold cursor-pointer ${
                settings.fontFamily === f.id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-900 ring-1 ring-amber-500 dark:text-amber-300 dark:bg-amber-950/20'
                  : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900/40 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-sm h-7 w-7 rounded bg-stone-150 dark:bg-stone-800 flex items-center justify-center font-serif">
                  {f.preview}
                </span>
                <span>{f.label}</span>
              </div>
              {f.id === 'dyslexic' && (
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded">
                  Aide cognit.
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Text size choices */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center">
            <Type className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Taille de police
          </h4>
          <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
            {settings.fontSize}%
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSettingsChange({ fontSize: Math.max(80, settings.fontSize - 10) })}
            className="h-8 w-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-stone-200 dark:border-stone-800 dark:hover:bg-stone-800 dark:bg-stone-900/50 dark:text-stone-350"
          >
            A-
          </button>
          <input
            type="range"
            min="80"
            max="250"
            step="10"
            value={settings.fontSize}
            onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value) })}
            className="flex-grow h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <button
            onClick={() => onSettingsChange({ fontSize: Math.min(250, settings.fontSize + 10) })}
            className="h-8 w-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-stone-200 dark:border-stone-800 dark:hover:bg-stone-800 dark:bg-stone-900/50 dark:text-stone-350"
          >
            A+
          </button>
        </div>
      </div>

      {/* 4. Line height options */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center">
          <AlignLeft className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Hauteur d'interligne
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {(['snug', 'normal', 'relaxed'] as ('snug' | 'normal' | 'relaxed')[]).map((lh) => (
            <button
              key={lh}
              onClick={() => onSettingsChange({ lineHeight: lh })}
              className={`py-2 px-1 text-xs font-bold border rounded-xl hover:scale-[1.01] cursor-pointer transition-all ${
                settings.lineHeight === lh
                  ? 'border-amber-505 bg-amber-500/10 text-amber-900 dark:text-amber-300 dark:bg-amber-950/20 font-extrabold'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              {lh === 'snug' && 'Serré'}
              {lh === 'normal' && 'Normal'}
              {lh === 'relaxed' && 'Espacé'}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Highlight color selections */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center">
          <Paintbrush className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Surligneur de parole
        </h4>
        <div className="flex space-x-3 items-center">
          {HIGHLIGHT_COLORS.map((hc) => (
            <button
              key={hc.id}
              onClick={() => onSettingsChange({ highlightColor: hc.id })}
              className={`h-7 w-7 rounded-lg ${hc.class} relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110`}
              title={hc.label}
            >
              {settings.highlightColor === hc.id && (
                <span className="h-2 w-2 rounded-full bg-stone-900 block shadow-sm"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Voice Customization */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center">
          <Volume2 className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Options de la voix
        </h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-stone-605 dark:text-stone-400">
              <span className="font-bold">Hauteur de voix (Pitch)</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {settings.speechPitch.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speechPitch}
              onChange={(e) => onSettingsChange({ speechPitch: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 7. Utility toggles */}
      <div className="space-y-4 pt-3 border-t border-stone-200 dark:border-stone-800">
        <label className="flex items-start justify-between cursor-pointer select-none">
          <div className="flex items-start space-x-2 text-xs text-[#2D2926] dark:text-stone-300 font-bold pr-2">
            <Volume2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col">
              <span>Voix par livre</span>
              <span className="text-[10px] font-mono text-stone-400 font-normal leading-normal mt-0.5">
                Retient les préférences vocales pour ce livre
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.saveVoicePerDocument}
            onChange={(e) => onSettingsChange({ saveVoicePerDocument: e.target.checked })}
            className="w-4 h-4 mt-1 text-amber-600 border-stone-300 rounded focus:ring-amber-500 accent-amber-500"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center space-x-2 text-xs text-stone-605 dark:text-stone-400 font-bold">
            <Scroll className="w-4 h-4 text-amber-500" />
            <span>Défilement automatique</span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoScroll}
            onChange={(e) => onSettingsChange({ autoScroll: e.target.checked })}
            className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500 accent-amber-500"
          />
        </label>
        
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-550 font-mono">
          <div className="flex items-center space-x-2">
            <Languages className="w-4 h-4 text-stone-400" />
            <span>Langue du document :</span>
          </div>
          <span className="uppercase text-stone-700 bg-stone-100 border border-stone-150 dark:bg-stone-800 dark:text-stone-300 px-1.5 py-0.5 rounded font-bold">
            {documentLanguage}
          </span>
        </div>

        {/* ── Google Cloud TTS Premium ── */}
        <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
          <GoogleTTSSettings
            documentLanguage={documentLanguage}
            theme={settings.theme}
          />
        </div>
      </div>
    </div>
  );
}
