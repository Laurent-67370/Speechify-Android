export interface Chapter {
  id: string;
  title: string;
  content: string;
  paragraphs: string[];
  wordCount: number;
  summary?: string;
}

export interface DocumentBook {
  id: string;
  title: string;
  author: string;
  language: string;
  type: 'pdf' | 'epub' | 'sample' | 'web';
  chapters: Chapter[];
  coverUrl?: string;
  progressPercent: number;
  currentChapterIndex: number;
  currentParagraphIndex: number;
  addedAt: number;
  fileSize?: string;
  speechRate?: number;
  speechPitch?: number;
  voiceURI?: string;
  summary?: string;
}

export interface Bookmark {
  id: string;
  documentId: string;
  chapterIndex: number;
  paragraphIndex: number;
  textSnippet: string;
  note?: string;
  createdAt: number;
}

export interface Annotation {
  id: string;
  documentId: string;
  chapterIndex: number;
  paragraphIndex: number;
  selectedText: string;
  note: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: number;
}

export interface Flashcard {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  example: string;
  synonyms: string[];
  language: string;
  sourceBookTitle?: string;
  createdAt: number;
  reviewCount: number;
  lastReviewedAt?: number;
  mastered: boolean;
}

export type TextTheme = 'light' | 'dark' | 'sepia';
export type FontFamily = 'sans' | 'serif' | 'dyslexic';

export interface UserSettings {
  theme: TextTheme;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: 'snug' | 'normal' | 'relaxed';
  columnWidth?: 'narrow' | 'normal' | 'wide';
  autoScroll: boolean;
  highlightColor: string;
  speechRate: number;
  speechPitch: number;
  voiceURI?: string;
  saveVoicePerDocument: boolean;
}
