/**
 * textParser.ts — Parsers pour fichiers TXT et Markdown
 * Convertit en DocumentBook avec découpage intelligent en chapitres et paragraphes
 */

import { DocumentBook, Chapter } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Décoder un ArrayBuffer en UTF-8 avec fallback Latin-1 */
function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // BOM UTF-8
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(buffer.slice(3));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

/** Générer un ID unique */
function uid(): string {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Compter les mots d'un texte */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Découper un texte brut en chapitres basé sur des marqueurs de titre.
 * Stratégie :
 *  1. Lignes entièrement en majuscules (style Gutenberg)
 *  2. Lignes commençant par "Chapitre", "Chapter", "Partie", "Part", "Section"
 *  3. Lignes courtes séparées par des lignes vides (titre implicite)
 *  4. Si aucun marqueur : découper par blocs de ~3000 mots
 */
function splitIntoChapters(text: string, titleHint: string): Chapter[] {
  const lines = text.split(/\r?\n/);
  const CHAPTER_RE = /^(chapitre|chapter|partie|part\s|section|livre\s|book\s|act\s|acte\s)/i;
  const ROMAN_RE = /^(I{1,3}|IV|V?I{0,3}|IX|X{1,3})[.\s—\-–]+\s*\S/i;

  // Détecter les lignes de titre
  const isTitleLine = (line: string, prevLine: string, nextLine: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return false;
    // Ligne en majuscules (min 3 chars)
    if (trimmed.length >= 3 && trimmed === trimmed.toUpperCase() && /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/.test(trimmed)) return true;
    // Commence par mot-clé chapitre
    if (CHAPTER_RE.test(trimmed)) return true;
    // Numérotation romaine
    if (ROMAN_RE.test(trimmed)) return true;
    // Ligne courte entourée de lignes vides
    if (!prevLine.trim() && !nextLine.trim() && trimmed.length < 60 && trimmed.length > 2) return true;
    return false;
  };

  interface RawChapter { title: string; lines: string[] }
  const rawChapters: RawChapter[] = [];
  let currentChapter: RawChapter = { title: titleHint || 'Introduction', lines: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = i > 0 ? lines[i - 1] : '';
    const next = i < lines.length - 1 ? lines[i + 1] : '';

    if (isTitleLine(line, prev, next) && currentChapter.lines.length > 10) {
      rawChapters.push(currentChapter);
      currentChapter = { title: line.trim(), lines: [] };
    } else {
      currentChapter.lines.push(line);
    }
  }
  if (currentChapter.lines.length > 0) rawChapters.push(currentChapter);

  // Si trop peu de chapitres (<2) → découper par blocs de ~2500 mots
  if (rawChapters.length < 2) {
    const WORDS_PER_CHAPTER = 2500;
    const allWords = text.split(/\s+/).filter(Boolean);
    const result: Chapter[] = [];
    for (let i = 0; i < allWords.length; i += WORDS_PER_CHAPTER) {
      const chunk = allWords.slice(i, i + WORDS_PER_CHAPTER).join(' ');
      const paragraphs = chunk.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 10);
      const partNum = Math.floor(i / WORDS_PER_CHAPTER) + 1;
      result.push({
        id: `ch_${partNum}`,
        title: `Partie ${partNum}`,
        content: chunk,
        paragraphs: paragraphs.length > 0 ? paragraphs : [chunk],
        wordCount: WORDS_PER_CHAPTER,
      });
    }
    return result.length > 0 ? result : [{
      id: 'ch_1', title: titleHint, content: text,
      paragraphs: [text], wordCount: countWords(text),
    }];
  }

  // Convertir en Chapter[]
  return rawChapters.map((rc, idx) => {
    const content = rc.lines.join('\n');
    // Paragraphes = blocs séparés par lignes vides
    const paragraphs = content
      .split(/\n{2,}/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 10);
    return {
      id: `ch_${idx + 1}`,
      title: rc.title || `Partie ${idx + 1}`,
      content,
      paragraphs: paragraphs.length > 0 ? paragraphs : [content.trim()],
      wordCount: countWords(content),
    };
  }).filter(c => c.wordCount > 0);
}

// ── Strip Markdown basique → texte brut ─────────────────────────────────────

function stripMarkdown(md: string): string {
  return md
    // Titres
    .replace(/^#{1,6}\s+/gm, '')
    // Gras / italique
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Code inline
    .replace(/`([^`]+)`/g, '$1')
    // Blocs de code
    .replace(/```[\s\S]*?```/g, '')
    // Liens
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Citations blockquote
    .replace(/^>\s*/gm, '')
    // Séparateurs horizontaux
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // HTML inline
    .replace(/<[^>]+>/g, '')
    // Espaces multiples
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Extraire le titre depuis le contenu :
 *  - Première ligne non vide de longueur raisonnable
 *  - Ou premier titre Markdown (#)
 */
function extractTitle(text: string, fileName: string): string {
  const mdTitle = text.match(/^#\s+(.+)/m);
  if (mdTitle) return mdTitle[1].trim().slice(0, 100);
  const firstLine = text.split(/\r?\n/).find(l => l.trim().length > 2 && l.trim().length < 100);
  if (firstLine) return firstLine.trim().slice(0, 100);
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

// ── Parsers publics ──────────────────────────────────────────────────────────

export type ParsedBook = Omit<DocumentBook, 'progressPercent' | 'currentChapterIndex' | 'currentParagraphIndex' | 'addedAt'>;

/**
 * Parser TXT — fichier texte brut
 */
export async function parsePlainText(file: File): Promise<ParsedBook> {
  const buffer = await file.arrayBuffer();
  const text = decodeBuffer(buffer);

  if (!text || text.trim().length < 10) {
    throw new Error('Le fichier texte est vide ou illisible.');
  }

  const fileName = file.name.replace(/\.txt$/i, '');
  const title = extractTitle(text, fileName);
  const chapters = splitIntoChapters(text, title);

  return {
    id: uid(),
    title,
    author: 'Auteur inconnu',
    language: 'fr',
    type: 'sample',
    chapters,
    fileSize: `${(file.size / 1024).toFixed(0)} Ko`,
  };
}

/**
 * Parser Markdown — convertit MD → texte propre
 * Conserve la structure des titres pour les chapitres
 */
export async function parseMarkdown(file: File): Promise<ParsedBook> {
  const buffer = await file.arrayBuffer();
  const rawMd = decodeBuffer(buffer);

  if (!rawMd || rawMd.trim().length < 10) {
    throw new Error('Le fichier Markdown est vide ou illisible.');
  }

  const fileName = file.name.replace(/\.(md|markdown)$/i, '');

  // Extraire le titre avant de stripper (pour garder le # titre)
  const title = extractTitle(rawMd, fileName);

  // Découper en chapitres AVANT de stripper (pour profiter des titres Markdown)
  const sections: { title: string; content: string }[] = [];
  const headingRe = /^#{1,3}\s+(.+)$/gm;
  let lastIdx = 0;
  let lastTitle = title;
  let match;

  while ((match = headingRe.exec(rawMd)) !== null) {
    if (match.index > lastIdx + 10) {
      sections.push({ title: lastTitle, content: rawMd.slice(lastIdx, match.index) });
    }
    lastTitle = match[1].trim();
    lastIdx = match.index + match[0].length;
  }
  sections.push({ title: lastTitle, content: rawMd.slice(lastIdx) });

  const chapters: Chapter[] = sections
    .map((sec, idx) => {
      const stripped = stripMarkdown(sec.content);
      const paragraphs = stripped
        .split(/\n{2,}/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 10);
      return {
        id: `ch_${idx + 1}`,
        title: sec.title || `Section ${idx + 1}`,
        content: stripped,
        paragraphs: paragraphs.length > 0 ? paragraphs : [stripped],
        wordCount: countWords(stripped),
      };
    })
    .filter(c => c.wordCount > 0);

  return {
    id: uid(),
    title,
    author: 'Auteur inconnu',
    language: 'fr',
    type: 'sample',
    chapters: chapters.length > 0 ? chapters : [{
      id: 'ch_1', title, content: stripMarkdown(rawMd),
      paragraphs: [stripMarkdown(rawMd)], wordCount: countWords(rawMd),
    }],
    fileSize: `${(file.size / 1024).toFixed(0)} Ko`,
  };
}
