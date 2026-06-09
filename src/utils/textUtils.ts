/**
 * Split a paragraph into sentences, taking abbreviations into account.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  
  // Standard abbreviations to avoid splitting on (French, English, Spanish)
  const abbreviations = [
    'av', 'al', 'art', 'assoc', 'boul', 'c-à-d', 'ca', 'cap', 'cf', 'ch', 'cie', 'col', 'coord', 'corp', 'dr', 'drs', 'etc',
    'ex', 'fém', 'fig', 'fr', 'gen', 'gouv', 'h-f', 'hab', 'ibid', 'id', 'i.e', 'inc', 'inf', 'int', 'janv', 'juil', 'ltd',
    'm', 'me', 'mes', 'mgr', 'mlle', 'mlles', 'mme', 'mmes', 'mr', 'mrs', 'ms', 'no', 'nos', 'nov', 'oct', 'p', 'pp', 'p.s',
    'prof', 'r-v', 'rég', 'réf', 's.a', 's.a.r.l', 'sec', 'sept', 'sg', 'sing', 'soc', 'st', 'ste', 'tél', 'trad', 'univ',
    'v', 'vol', 'vs'
  ];

  // Lookbehind for abbreviation tokens
  // Since some older regex engines don't support full lookbehind, we use a robust tokenizer
  const sentenceEndRegex = /([.!?])(\s+|$)/g;
  const sentenceStarts: number[] = [0];
  let match;

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const punctIndex = match.index;
    const endOfMatch = sentenceEndRegex.lastIndex;
    
    // Extract preceding word to check against abbreviations
    const precedingPart = text.substring(0, punctIndex).trim();
    const lastWordMatch = precedingPart.match(/(\w+)$/);
    const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';
    
    if (abbreviations.includes(lastWord) || (lastWord.length === 1 && lastWord >= 'a' && lastWord <= 'z')) {
      // It's likely an initial or common abbreviation, don't split here
      continue;
    }
    
    sentenceStarts.push(endOfMatch);
  }

  // Ensure last segment is represented
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

  // Fallback split if empty
  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
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
