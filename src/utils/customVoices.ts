export interface AppVoice {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  isCustom?: boolean;
  pitchModifier?: number;
  rateModifier?: number;
  gender?: 'M' | 'F';
}

export const CUSTOM_VOICES: AppVoice[] = [
  // French (fr)
  {
    voiceURI: 'custom-fr-charly',
    name: 'Charly - Voix Studio (Français Chaleureux 🎙️)',
    lang: 'fr-FR',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.82,
    rateModifier: 0.95,
    gender: 'M'
  },
  {
    voiceURI: 'custom-fr-clara',
    name: 'Clara - Voix Studio (Français Doux ✨)',
    lang: 'fr-FR',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 1.15,
    rateModifier: 1.0,
    gender: 'F'
  },
  {
    voiceURI: 'custom-fr-victor',
    name: 'Victor - Voix Classique (Français Théâtral 📜)',
    lang: 'fr-FR',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.76,
    rateModifier: 0.88,
    gender: 'M'
  },
  // English (en)
  {
    voiceURI: 'custom-en-arthur',
    name: 'Arthur - Studio Voice (English Deep 🎙️)',
    lang: 'en-US',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.80,
    rateModifier: 0.95,
    gender: 'M'
  },
  {
    voiceURI: 'custom-en-emily',
    name: 'Emily - Studio Voice (English Bright ✨)',
    lang: 'en-US',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 1.20,
    rateModifier: 1.05,
    gender: 'F'
  },
  {
    voiceURI: 'custom-en-winston',
    name: 'Winston - Oxford Classic (English Noblesse 👑)',
    lang: 'en-GB',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.72,
    rateModifier: 0.90,
    gender: 'M'
  },
  // German (de)
  {
    voiceURI: 'custom-de-hans',
    name: 'Hans - Studio Voice (Deutsch Ernst 🌲)',
    lang: 'de-DE',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.82,
    rateModifier: 0.95,
    gender: 'M'
  },
  {
    voiceURI: 'custom-de-lena',
    name: 'Lena - Studio Voice (Deutsch Klar ☀️)',
    lang: 'de-DE',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 1.12,
    rateModifier: 1.0,
    gender: 'F'
  },
  // Spanish (es)
  {
    voiceURI: 'custom-es-mateo',
    name: 'Mateo - Voz de Estudio (Español Natural 🇪🇸)',
    lang: 'es-ES',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.88,
    rateModifier: 0.98,
    gender: 'M'
  },
  {
    voiceURI: 'custom-es-isabella',
    name: 'Isabella - Voz de Estudio (Español Melódico 🌹)',
    lang: 'es-ES',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 1.15,
    rateModifier: 1.02,
    gender: 'F'
  },
  // Italian (it)
  {
    voiceURI: 'custom-it-giovanni',
    name: 'Giovanni - Voce di Studio (Italiano Profondo 🇮🇹)',
    lang: 'it-IT',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 0.84,
    rateModifier: 0.95,
    gender: 'M'
  },
  {
    voiceURI: 'custom-it-sofia',
    name: 'Sofia - Voce di Studio (Italiano Vivace 🍋)',
    lang: 'it-IT',
    default: false,
    localService: true,
    isCustom: true,
    pitchModifier: 1.16,
    rateModifier: 1.05,
    gender: 'F'
  }
];

const ALLOWED_LANGUAGES = ['fr', 'de', 'es', 'it', 'en'];

// Check if a language code belongs to our 5 allowed tongues
export function isAllowedLanguage(langCode: string): boolean {
  if (!langCode) return false;
  const normalized = langCode.toLowerCase().split('-')[0].split('_')[0];
  return ALLOWED_LANGUAGES.includes(normalized);
}

// Get system voice list filtered to fr, de, es, it, en
export function getFilteredSystemVoices(): AppVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const systemAvailable = window.speechSynthesis.getVoices();
  
  return systemAvailable
    .filter(v => isAllowedLanguage(v.lang))
    .map(v => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      default: v.default,
      localService: v.localService,
      isCustom: false
    }));
}

// Get all voices (Customs + Filtered System)
export function getAllAvailableVoices(): AppVoice[] {
  const system = getFilteredSystemVoices();
  return [...CUSTOM_VOICES, ...system];
}

// Find a custom voice by URI
export function findCustomVoice(voiceURI: string): AppVoice | undefined {
  return CUSTOM_VOICES.find(v => v.voiceURI === voiceURI);
}

// Resolve custom voice to standard parameters
export interface SpeechSynthesisConfig {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  pitch: number;
  rate: number;
}

export function resolveSpeechConfig(
  voiceURI: string | undefined,
  baseLang: string,
  userPitch: number,
  userRate: number
): SpeechSynthesisConfig {
  const config: SpeechSynthesisConfig = {
    voice: null,
    lang: baseLang,
    pitch: userPitch,
    rate: userRate
  };

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return config;
  }

  const allSystemVoices = window.speechSynthesis.getVoices();

  if (voiceURI && voiceURI.startsWith('custom-')) {
    const custom = findCustomVoice(voiceURI);
    if (custom) {
      config.lang = custom.lang;
      config.pitch = userPitch * (custom.pitchModifier || 1.0);
      config.rate = userRate * (custom.rateModifier || 1.0);
      
      // Attempt to bind to a real system voice that matches this specific language prefix
      const customPrefix = custom.lang.substring(0, 2).toLowerCase();
      const matchedSystemVoice = allSystemVoices.find(v => 
        v.lang.toLowerCase().startsWith(customPrefix)
      );
      if (matchedSystemVoice) {
        config.voice = matchedSystemVoice;
      }
    }
  } else if (voiceURI) {
    const systemMatch = allSystemVoices.find(v => v.voiceURI === voiceURI);
    if (systemMatch) {
      config.voice = systemMatch;
      config.lang = systemMatch.lang;
    }
  }

  // Fallback if no voice bound but we have matching language
  if (!config.voice) {
    const fallbackLang = baseLang.substring(0, 2).toLowerCase();
    const match = allSystemVoices.find(v => v.lang.toLowerCase().startsWith(fallbackLang));
    if (match) {
      config.voice = match;
    }
  }

  // Sanitize limits for SpeechSynthesis
  config.pitch = Math.max(0.5, Math.min(2.0, config.pitch));
  config.rate = Math.max(0.1, Math.min(10.0, config.rate));

  return config;
}
