import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Highlighter, Save } from 'lucide-react';
import { Annotation } from '../types';

interface AnnotationModalProps {
  selectedText: string;
  documentId: string;
  chapterIndex: number;
  paragraphIndex: number;
  onSave: (annotation: Annotation) => void;
  onClose: () => void;
}

const COLORS: { key: Annotation['color']; label: string; bg: string; border: string }[] = [
  { key: 'yellow', label: 'Jaune', bg: 'bg-yellow-400/20', border: 'border-yellow-400' },
  { key: 'green',  label: 'Vert',  bg: 'bg-green-400/20',  border: 'border-green-400' },
  { key: 'blue',   label: 'Bleu',  bg: 'bg-blue-400/20',   border: 'border-blue-400' },
  { key: 'pink',   label: 'Rose',  bg: 'bg-pink-400/20',   border: 'border-pink-400' },
];

export default function AnnotationModal({
  selectedText,
  documentId,
  chapterIndex,
  paragraphIndex,
  onSave,
  onClose,
}: AnnotationModalProps) {
  const [note, setNote] = useState('');
  const [color, setColor] = useState<Annotation['color']>('yellow');

  const handleSave = () => {
    const annotation: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      documentId,
      chapterIndex,
      paragraphIndex,
      selectedText,
      note: note.trim(),
      color,
      createdAt: Date.now(),
    };
    onSave(annotation);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-[#121111]/95 text-stone-100 rounded-[24px] w-full max-w-md p-5 shadow-2xl border border-stone-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Highlighter className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-stone-200">Nouvelle annotation</h3>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white p-1 rounded-lg cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Texte sélectionné */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 mb-4">
          <p className="text-xs text-stone-400 italic line-clamp-3">"{selectedText}"</p>
        </div>

        {/* Couleur */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase font-black text-stone-500 tracking-wider mr-1">Couleur :</span>
          {COLORS.map(c => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${c.bg} ${c.border} ${color === c.key ? 'scale-125 shadow-lg' : 'opacity-50 hover:opacity-80'}`}
              title={c.label}
            />
          ))}
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ajouter une note (optionnel)..."
          className="w-full bg-stone-900/60 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none focus:border-amber-500/50 transition-colors mb-4"
          rows={3}
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-bold text-stone-400 bg-stone-900 border border-stone-800 rounded-xl hover:text-white transition-colors cursor-pointer">
            Annuler
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-black text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
