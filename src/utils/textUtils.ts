/**
 * Split a paragraph into sentences, taking abbreviations into account.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Normaliser apostrophes typographiques pour éviter les erreurs de découpage
  text = text.replace(/[\u2018\u2019\u02BC]/g, "'");

  // Standard abbreviations to avoid splitting on (French, English, Spanish)
  const abbreviations = [
    'av', 'al', 'art', 'assoc', 'boul', 'c-à-d', 'ca', 'cap', 'cf', 'ch', 'cie', 'col', 'coord', 'corp', 'dr', 'drs', 'etc',
    'ex', 'fém', 'fig', 'fr', 'gen', 'gouv', 'h-f', 'hab', 'ibid', 'id', 'i.e', 'inc', 'inf', 'int', 'janv', 'juil', 'ltd',
    'm', 'me', 'mes', 'mgr', 'mlle', 'mlles', 'mme', 'mmes', 'mr', 'mrs', 'ms', 'no', 'nos', 'nov', 'oct', 'p', 'pp', 'p.s',
    'prof', 'r-v', 'rég', 'réf', 's.a', 's.a.r.l', 'sec', 'sept', 'sg', 'sing', 'soc', 'st', 'ste', 'tél', 'trad', 'univ',
    'v', 'vol', 'vs'
  ];

  const sentenceEndRegex = /([.!?])(\s+|$)/g;
  const sentenceStarts: number[] = [0];
  let match;

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const punctIndex = match.index;
    const endOfMatch = sentenceEndRegex.lastIndex;
    
    const precedingPart = text.substring(0, punctIndex).trim();
    const lastWordMatch = precedingPart.match(/(\w+)$/);
    const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';
    
    if (abbreviations.includes(lastWord) || (lastWord.length === 1 && lastWord >= 'a' && lastWord <= 'z')) {
      continue;
    }
    
    sentenceStarts.push(endOfMatch);
  }

  if (sentenceStarts[sentenceStarts.length - 1] < text.length) {
    sentenceStarts.push(text.length);
  }

  const sentences: string[] = [];
  for (let i = 0; i < sentenceStarts.length - 1; i++) {
    const sentence = text.substring(sentenceStarts[i], sentenceStarts[i + 1]).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
  }

  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
}

/**
 * Preprocess text for natural-sounding speech synthesis.
 */
export function preprocessTextForSpeech(text: string, lang: string = 'fr'): string {
  if (!text) return '';

  let cleaned = text;

  // ── APOSTROPHES TYPOGRAPHIQUES ──────────────────────────────────────────
  // CRITIQUE : ' (U+2019) et ' (U+2018) sont des apostrophes d'élision
  // (d'Amérique, l'homme, c'est, j'ai...) — NE PAS les supprimer !
  // On les normalise en apostrophe droite ASCII avant tout traitement.
  cleaned = cleaned.replace(/\u2019/g, "'"); // ' RIGHT SINGLE QUOTATION MARK
  cleaned = cleaned.replace(/\u2018/g, "'"); // ' LEFT SINGLE QUOTATION MARK
  cleaned = cleaned.replace(/\u02BC/g, "'"); // ʼ MODIFIER LETTER APOSTROPHE

  // Remove Project Gutenberg underscore formatting for italics (e.g. _italics_)
  cleaned = cleaned.replace(/_/g, ' ');

  // Standardize spacing around ellipses
  cleaned = cleaned.replace(/…/g, '... ');
  cleaned = cleaned.replace(/\.{3,}/g, '... ');

  // Strip leading punctuation often used as dialogue or decorative bullets
  cleaned = cleaned.replace(/^[\u2014\u2013\u2212\-*•\s]+/, ''); 

  // Replace inline em-dashes and double dashes with commas
  cleaned = cleaned.replace(/\s*[\u2014\u2013\u2212]\s*/g, ', ');
  cleaned = cleaned.replace(/\s*\-\-\s*/g, ', ');

  // Replace parentheses and brackets with commas
  cleaned = cleaned.replace(/\s*[\(\[\{]\s*/g, ', ');
  cleaned = cleaned.replace(/\s*[\)\]\}]\s*/g, ', ');

  // Remove vrais guillemets de citation (PAS les apostrophes d'élision)
  // On retire uniquement : « » " " „ ` (guillemets doubles et backtick)
  // On NE retire PAS ' ' qui sont des apostrophes (déjà normalisées en ' ci-dessus)
  cleaned = cleaned.replace(/[«»\u201C\u201D\u201E\u0060]/g, ' ');

  // Language-specific double punctuation spacing
  if (lang.toLowerCase().startsWith('fr')) {
    cleaned = cleaned.replace(/\s*;\s*/g, ' ; ');
    cleaned = cleaned.replace(/\s*:\s*/g, ' : ');
    cleaned = cleaned.replace(/\s*!\s*/g, ' ! ');
    cleaned = cleaned.replace(/\s*\?\s*/g, ' ? ');
  } else {
    cleaned = cleaned.replace(/\s*;\s*/g, '; ');
    cleaned = cleaned.replace(/\s*:\s*/g, ': ');
    cleaned = cleaned.replace(/\s*!\s*/g, '! ');
    cleaned = cleaned.replace(/\s*\?\s*/g, '? ');
  }

  // Remove double commas, redundant trailing spaces
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Calculates reading time in minutes based on average reading speeds (200 words-per-minute)
 */
export function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Clean search string and find query match indices within simple content
 */
export function searchInParagraph(text: string, query: string): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
    query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}
