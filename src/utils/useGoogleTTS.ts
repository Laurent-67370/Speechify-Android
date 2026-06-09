/**
 * useGoogleTTS — Hook React pour Google Cloud Text-to-Speech
 * Portage depuis la PWA speechify-pwa (functions.js + index.html)
 *
 * Fonctionnement :
 *  - Lit la config (clé API, voix, activation) depuis localStorage clé 'gtts_config'
 *  - Appelle l'API REST Google TTS pour chaque chunk de texte → blob URL audio MP3
 *  - Cache session (Map) limité à 20 entrées pour éviter les re-synthèses inutiles
 *  - Expose synthesize() + isEnabled + config + saveConfig
 */

import { useState, useCallback, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface GTTSVoice {
  id: string;
  label: string;
  lang: string;
}

export interface GTTSConfig {
  enabled: boolean;
  key: string;
  voice: string;
}

// ── Liste des voix disponibles ──────────────────────────────────────────────

export const GTTS_VOICES: GTTSVoice[] = [
  { id: 'fr-FR-Neural2-A', label: '🇫🇷 Denise — Femme Neural2',  lang: 'fr' },
  { id: 'fr-FR-Neural2-B', label: '🇫🇷 Henri — Homme Neural2',   lang: 'fr' },
  { id: 'fr-FR-Neural2-C', label: '🇫🇷 Claire — Femme Neural2',  lang: 'fr' },
  { id: 'fr-FR-Neural2-D', label: '🇫🇷 Lucas — Homme Neural2',   lang: 'fr' },
  { id: 'fr-FR-Wavenet-A', label: '🇫🇷 WaveNet A — Femme',       lang: 'fr' },
  { id: 'fr-FR-Wavenet-B', label: '🇫🇷 WaveNet B — Homme',       lang: 'fr' },
  { id: 'en-US-Neural2-F', label: '🇺🇸 Jenny — Femme EN Neural2', lang: 'en' },
  { id: 'en-US-Neural2-D', label: '🇺🇸 Guy — Homme EN Neural2',   lang: 'en' },
  { id: 'en-GB-Neural2-A', label: '🇬🇧 Sophie — Femme EN-GB',    lang: 'en' },
  { id: 'es-ES-Neural2-A', label: '🇪🇸 Espagnol — Femme',        lang: 'es' },
  { id: 'de-DE-Neural2-B', label: '🇩🇪 Allemand — Homme',        lang: 'de' },
  { id: 'it-IT-Neural2-A', label: '🇮🇹 Italien — Femme',         lang: 'it' },
];

// ── Helpers localStorage ────────────────────────────────────────────────────

const STORAGE_KEY = 'gtts_config';

function loadConfig(): GTTSConfig {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as GTTSConfig;
  } catch {
    return { enabled: false, key: '', voice: 'fr-FR-Neural2-A' };
  }
}

function persistConfig(c: GTTSConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// ── Hook principal ──────────────────────────────────────────────────────────

export function useGoogleTTS() {
  const [config, setConfig] = useState<GTTSConfig>(() => loadConfig());
  const cacheRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isEnabled = !!(config.enabled && config.key);

  // Sauvegarder la config et mettre à jour l'état
  const saveConfig = useCallback((newConfig: GTTSConfig) => {
    persistConfig(newConfig);
    setConfig(newConfig);
  }, []);

  /**
   * Synthétise du texte via Google Cloud TTS → renvoie un blob URL MP3
   * @param text      Texte à synthétiser
   * @param rate      Vitesse (0.25 – 4.0)
   * @param pitch     Tonalité (0.5 – 2.0, converti en semitones pour l'API)
   */
  const synthesize = useCallback(async (
    text: string,
    rate = 1.0,
    pitch = 1.0,
  ): Promise<string> => {
    const cfg = loadConfig(); // toujours lire la config fraîche
    if (!cfg.key) throw new Error('Clé Google Cloud TTS manquante');

    const voiceName = cfg.voice || 'fr-FR-Neural2-A';
    const langCode  = voiceName.split('-').slice(0, 2).join('-');

    // Cache de session
    const cacheKey = `${voiceName}|${rate.toFixed(2)}|${pitch.toFixed(2)}|${text}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${cfg.key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: langCode, name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.max(0.25, Math.min(4.0, rate)),
          // API attend des semitones : 0 = neutre, -20..+20
          pitch: Math.max(-20, Math.min(20, (pitch - 1) * 10)),
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Google TTS ${resp.status}: ${errText.slice(0, 120)}`);
    }

    const data = await resp.json();
    if (!data.audioContent) throw new Error('Réponse audio vide de Google TTS');

    // base64 → Blob → URL
    const bin   = atob(data.audioContent);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob   = new Blob([bytes], { type: 'audio/mp3' });
    const blobUrl = URL.createObjectURL(blob);

    // Limiter le cache à 20 entrées
    if (cacheRef.current.size >= 20) {
      const firstKey = cacheRef.current.keys().next().value;
      URL.revokeObjectURL(cacheRef.current.get(firstKey)!);
      cacheRef.current.delete(firstKey);
    }
    cacheRef.current.set(cacheKey, blobUrl);

    return blobUrl;
  }, []);

  /**
   * Joue directement un texte (utile pour le bouton Test)
   */
  const speak = useCallback(async (
    text: string,
    rate = 1.0,
    pitch = 1.0,
  ): Promise<void> => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const blobUrl = await synthesize(text, rate, pitch);
    const audio = new Audio(blobUrl);
    audioRef.current = audio;
    await audio.play();
  }, [synthesize]);

  /** Stoppe la lecture en cours */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return {
    isEnabled,
    config,
    saveConfig,
    synthesize,
    speak,
    stop,
    audioRef,
    GTTS_VOICES,
  };
}
