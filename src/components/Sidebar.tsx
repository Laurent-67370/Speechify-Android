import { useState } from 'react';
import { BookOpen, Search, Bookmark, Trash2, ChevronRight, Check } from 'lucide-react';
import { Chapter, Bookmark as BookmarkType, DocumentBook } from '../types';
import { searchInParagraph } from '../utils/textUtils';

interface SidebarProps {
  documentBook: DocumentBook;
  currentChapterIndex: number;
  currentParagraphIndex: number;
  onChapterSelect: (index: number) => void;
  bookmarks: BookmarkType[];
  onAddBookmark: (noteText?: string) => void;
  onDeleteBookmark: (id: string) => void;
  onJumpToLocation: (chapterIdx: number, paragraphIdx: number) => void;
}

type TabType = 'toc' | 'search' | 'bookmarks';

export default function Sidebar({
  documentBook,
  currentChapterIndex,
  currentParagraphIndex,
  onChapterSelect,
  bookmarks,
  onAddBookmark,
  onDeleteBookmark,
  onJumpToLocation,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('toc');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Search through all paragraphs in all chapters
  const getSearchResults = () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const results: { chapterIndex: number; paragraphIndex: number; text: string; chapterTitle: string }[] = [];

    documentBook.chapters.forEach((chapter, chapterIdx) => {
      chapter.paragraphs.forEach((paragraph, paragraphIdx) => {
        if (searchInParagraph(paragraph, searchQuery)) {
          results.push({
            chapterIndex: chapterIdx,
            paragraphIndex: paragraphIdx,
            text: paragraph,
            chapterTitle: chapter.title,
          });
        }
      });
    });

    return results;
  };

  const results = getSearchResults();

  // Helper to highlight terms in query results safely
  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    const cleanQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const plainText = text;
    
    // Simple look-up and slice to preserve original casing
    const idx = plainText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(cleanQuery);
    if (idx === -1) return text;

    const start = text.substring(0, idx);
    const middle = text.substring(idx, idx + query.length);
    const end = text.substring(idx + query.length);

    return (
      <>
        {start}
        <mark className="bg-yellow-250 text-slate-900 rounded-sm font-semibold">{middle}</mark>
        {end}
      </>
    );
  };

  const handleSaveNoteBookmark = () => {
    onAddBookmark(noteInput.trim() || undefined);
    setNoteInput('');
    setShowNoteEditor(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-205 dark:bg-slate-950/20 dark:border-slate-800">
      {/* Drawer Mode Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 select-none">
        {(
          [
            { id: 'toc', label: 'Sommaire', icon: BookOpen },
            { id: 'search', label: 'Recherche', icon: Search },
            { id: 'bookmarks', label: 'Signets', icon: Bookmark },
          ] as { id: TabType; label: string; icon: any }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 flex flex-col items-center justify-center border-b-2 text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-[#F5F2ED] dark:bg-[#1C1917]/30'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100/50 dark:hover:bg-stone-900/10'
            }`}
          >
            <tab.icon className="w-4 h-4 mb-1" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Context Container */}
      <div className="flex-grow overflow-y-auto p-4">
        {activeTab === 'toc' && (
          <div className="space-y-1" id="toc-list">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Sections du document
            </h3>
            {documentBook.chapters.map((chapter, idx) => {
              const isActive = idx === currentChapterIndex;
              const isRead = idx < currentChapterIndex;
              
              return (
                <button
                  key={chapter.id}
                  onClick={() => onChapterSelect(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer ${
                    isActive
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 font-extrabold dark:bg-amber-950/20 dark:text-amber-300'
                      : 'border-transparent text-[#2D2926] dark:text-stone-300 hover:bg-[#F5F2ED] dark:hover:bg-stone-900/30'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 font-sans">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded bg-stone-100 dark:bg-stone-850">
                      {isRead ? (
                        <Check className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <span className="text-[10px] font-mono">{idx + 1}</span>
                      )}
                    </span>
                    <span className="truncate pr-1">{chapter.title}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher des termes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-200"
              />
            </div>

            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-mono text-stone-400">
                  {results.length} occurrence(s) trouvée(s) :
                </p>
                <div className="space-y-2">
                  {results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => onJumpToLocation(res.chapterIndex, res.paragraphIndex)}
                      className="w-full text-left p-2.5 bg-white border border-stone-200 rounded-xl hover:border-amber-500/40 dark:bg-stone-900/40 dark:border-stone-800 dark:hover:border-stone-700 transition-all cursor-pointer block text-xs"
                    >
                      <div className="flex justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                        <span className="truncate max-w-[150px]">{res.chapterTitle}</span>
                        <span>Para. {res.paragraphIndex + 1}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-3 leading-relaxed dark:text-slate-350 italic">
                        "{highlightQuery(res.text, searchQuery)}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Search className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-[11px] mt-2">Tapez au moins 2 lettres pour lancer la recherche textuelle.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Notes & Signets ({bookmarks.length})
              </h3>              <button
                onClick={() => setShowNoteEditor(!showNoteEditor)}
                className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 font-bold cursor-pointer font-sans"
              >
                + Ajouter note
              </button>
            </div>

            {showNoteEditor && (
              <div className="p-3 bg-white border border-dashed border-stone-300 rounded-xl dark:bg-[#151312] dark:border-stone-800 space-y-3">
                <p className="text-[10px] text-stone-400 font-mono">
                  Enregistrer une note sur le paragraphe en lecture en cours :
                </p>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Écrivez votre commentaire ici..."
                  className="w-full p-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-200"
                  rows={3}
                />
                <div className="flex justify-end space-x-2 text-xs">
                  <button
                    onClick={() => {
                      setShowNoteEditor(false);
                      setNoteInput('');
                    }}
                    className="px-2.5 py-1 text-stone-500 hover:text-stone-700 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveNoteBookmark}
                    className="px-2.5 py-1 bg-amber-500 text-stone-900 font-bold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            {bookmarks.length > 0 ? (
              <div className="space-y-2.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="group flex flex-col p-3 bg-white border border-stone-200 rounded-xl hover:shadow-sm dark:bg-stone-900/40 dark:border-stone-800 transition-all text-xs"
                  >
                    <div className="flex justify-between items-center mb-1 font-sans">
                      <span className="text-[10px] font-semibold text-stone-400 font-mono">
                        Sec. {bm.chapterIndex + 1} — Para. {bm.paragraphIndex + 1}
                      </span>
                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                        title="Supprimer ce signet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p
                      onClick={() => onJumpToLocation(bm.chapterIndex, bm.paragraphIndex)}
                      className="text-stone-700 cursor-pointer hover:text-amber-700 font-serif leading-relaxed line-clamp-2 italic border-l-2 border-amber-500/30 pl-2 dark:text-stone-300 dark:hover:text-amber-400"
                    >
                      "{bm.textSnippet}"
                    </p>

                    {bm.note && (
                      <div className="mt-2 p-2 bg-amber-500/5 rounded-lg border border-amber-550/10 text-stone-700 dark:bg-amber-950/10 dark:border-amber-900/15 dark:text-stone-300">
                        <span className="font-extrabold text-[10px] text-amber-700 block mb-0.5 uppercase tracking-wide">Note :</span>
                        {bm.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Bookmark className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-[11px] mt-2">Aucun signet enregistré. Ajoutez des notes pour suivre vos réflexions !</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
