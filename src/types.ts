export interface Chapter {
  id: string;
  title: string;
  content: string; // The full raw or HTML/text content
  paragraphs: string[]; // Segmented paragraphs for reading and navigation
  wordCount: number;
  summary?: string; // Cache AI summary of this chapter
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
  summary?: string; // Cache AI summary of the full book
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

export type TextTheme = 'light' | 'dark' | 'sepia';

export type FontFamily = 'sans' | 'serif' | 'dyslexic';

export interface UserSettings {
  theme: TextTheme;
  fontFamily: FontFamily;
  fontSize: number; // in percentage, e.g., 100, 120, 150
  lineHeight: 'snug' | 'normal' | 'relaxed';
  autoScroll: boolean;
  highlightColor: string; // Hex or tailwind color class
  speechRate: number; // 0.5 to 3
  speechPitch: number; // 0.5 to 2
  voiceURI?: string; // Voice URI identifier for speechSynthesis
  saveVoicePerDocument: boolean;
}
