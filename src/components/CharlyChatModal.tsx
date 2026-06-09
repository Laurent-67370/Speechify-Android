import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Sparkles, Volume2, RefreshCw, BookOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CharlyChatModalProps {
  bookTitle: string;
  bookAuthor: string;
  currentChapterTitle: string;
  currentParagraphText: string;
  language: string;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { label: '📝 Résume ce passage', prompt: 'Peux-tu résumer ce passage en 3-4 phrases simples ?' },
  { label: '❓ Quiz rapide', prompt: 'Génère 3 questions de compréhension sur ce que je viens de lire, puis donne les réponses.' },
  { label: '🔍 Contexte historique', prompt: "Quel est le contexte historique ou culturel de ce passage ?" },
  { label: '💡 Points clés', prompt: 'Quels sont les 3 points clés à retenir de ce passage ?' },
  { label: '🎭 Analyser les personnages', prompt: 'Peux-tu analyser les personnages mentionnés dans ce passage ?' },
  { label: '📚 Vocabulaire difficile', prompt: 'Y a-t-il des mots ou expressions difficiles dans ce passage ? Explique-les.' },
];

export default function CharlyChatModal({
  bookTitle,
  bookAuthor,
  currentChapterTitle,
  currentParagraphText,
  language,
  onClose,
}: CharlyChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis **Charly**, votre coach de lecture IA 🎧\n\nJe vois que vous lisez **"${bookTitle}"** ${bookAuthor ? `de *${bookAuthor}*` : ''}, chapitre *${currentChapterTitle}*.\n\nPosez-moi n'importe quelle question sur ce que vous lisez, ou utilisez les suggestions rapides ci-dessous !`,
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildSystemContext = () =>
    `Tu es Charly, un assistant de lecture IA chaleureux, pédagogue et bienveillant intégré dans une liseuse audio.\n` +
    `Le lecteur est en train de lire : "${bookTitle}"${bookAuthor ? ` par ${bookAuthor}` : ''}.\n` +
    `Chapitre actuel : "${currentChapterTitle}".\n` +
    `Passage en cours :\n---\n${currentParagraphText.slice(0, 2000)}\n---\n` +
    `Réponds en ${language.startsWith('fr') ? 'français' : 'anglais'}. Sois concis, engageant, et pédagogue. Utilise des emojis avec parcimonie.`;

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const newUserMsg: Message = { role: 'user', content: userMessage.trim(), timestamp: Date.now() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: buildSystemContext(),
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          lang: language,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Désolé, je n\'ai pas pu répondre.',
        timestamp: Date.now(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Erreur de connexion avec Charly : ${err.message}. Vérifiez que le serveur est actif.`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
    u.lang = language.startsWith('fr') ? 'fr-FR' : 'en-US';
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  const renderContent = (text: string) => {
    // Rendu markdown basique
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#0f0e0e] border border-stone-800 rounded-[28px] w-full max-w-lg flex flex-col shadow-2xl"
        style={{ height: '85vh', maxHeight: '700px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-900 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-100">Charly — Coach IA</h3>
              <p className="text-[10px] text-stone-500 flex items-center gap-1">
                <BookOpen className="w-2.5 h-2.5" /> {bookTitle.slice(0, 30)}{bookTitle.length > 30 ? '…' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 scrollbar-none">
          {QUICK_PROMPTS.map((qp, i) => (
            <button key={i} onClick={() => sendMessage(qp.prompt)}
              className="flex-shrink-0 text-[10px] font-bold text-stone-400 border border-stone-800 bg-stone-900/50 hover:bg-stone-800 hover:text-white px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap">
              {qp.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-stone-700'
              }`}>
                {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-stone-300" />}
              </div>
              <div className={`flex-1 max-w-[85%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-700/60 border border-indigo-600/30 text-stone-100 rounded-tr-sm'
                    : 'bg-stone-900/80 border border-stone-800 text-stone-200 rounded-tl-sm'
                }`} dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                {msg.role === 'assistant' && (
                  <button onClick={() => speakMessage(msg.content)}
                    className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-amber-400 transition-all cursor-pointer self-start ml-1">
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                    animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-stone-900 flex-shrink-0">
          <div className="flex gap-2 items-end bg-stone-900/60 border border-stone-800 rounded-2xl px-3 py-2 focus-within:border-indigo-700/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez une question sur votre lecture..."
              className="flex-1 bg-transparent text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none max-h-24"
              rows={1}
              style={{ height: 'auto' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[9px] text-stone-700 text-center mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
        </div>
      </motion.div>
    </div>
  );
}
