import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import fs from "fs";

dotenv.config();

// ── SQLite init ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'speechify.db'));

// Activer WAL pour de meilleures performances en lecture/écriture simultanées
db.pragma('journal_mode = WAL');

// Création de la table books si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id          TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id          TEXT PRIMARY KEY,
    book_id     TEXT NOT NULL,
    data        TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS annotations (
    id          TEXT PRIMARY KEY,
    book_id     TEXT NOT NULL,
    data        TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS flashcards (
    id          TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS definitions_cache (
    cache_key   TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

console.log('[SQLite] Base de données initialisée :', path.join(DATA_DIR, 'speechify.db'));

// ── Helpers SQLite ──────────────────────────────────────────────────────────
const stmtGetAllBooks    = db.prepare('SELECT data FROM books ORDER BY updated_at DESC');
const stmtGetBook        = db.prepare('SELECT data FROM books WHERE id = ?');
const stmtUpsertBook     = db.prepare(`
  INSERT INTO books (id, data, updated_at) VALUES (?, ?, unixepoch())
  ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = unixepoch()
`);
const stmtDeleteBook     = db.prepare('DELETE FROM books WHERE id = ?');
const stmtGetBookmarks   = db.prepare('SELECT data FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC');
const stmtUpsertBookmark = db.prepare(`
  INSERT INTO bookmarks (id, book_id, data, created_at) VALUES (?, ?, ?, unixepoch())
  ON CONFLICT(id) DO UPDATE SET data = excluded.data
`);
const stmtDeleteBookmark = db.prepare('DELETE FROM bookmarks WHERE id = ?');
const stmtGetAnnotations   = db.prepare('SELECT data FROM annotations WHERE book_id = ? ORDER BY created_at DESC');
const stmtUpsertAnnotation = db.prepare(`
  INSERT INTO annotations (id, book_id, data, created_at) VALUES (?, ?, ?, unixepoch())
  ON CONFLICT(id) DO UPDATE SET data = excluded.data
`);
const stmtDeleteAnnotation = db.prepare('DELETE FROM annotations WHERE id = ?');
const stmtGetFlashcards    = db.prepare('SELECT data FROM flashcards ORDER BY updated_at DESC');
const stmtUpsertFlashcard  = db.prepare(`
  INSERT INTO flashcards (id, data, updated_at) VALUES (?, ?, unixepoch())
  ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = unixepoch()
`);
const stmtDeleteFlashcard  = db.prepare('DELETE FROM flashcards WHERE id = ?');
const stmtGetDefinition    = db.prepare('SELECT data FROM definitions_cache WHERE cache_key = ?');
const stmtUpsertDefinition = db.prepare(`
  INSERT INTO definitions_cache (cache_key, data, created_at) VALUES (?, ?, unixepoch())
  ON CONFLICT(cache_key) DO UPDATE SET data = excluded.data, created_at = unixepoch()
`);

// ── Rate Limiter (en mémoire, sans dépendance) ──────────────────────────────
const rateHits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute

function rateLimiter(maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateHits.get(ip);

    if (!entry || now > entry.resetAt) {
      rateHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' });
    }
    next();
  };
}

// Nettoyage périodique du rate limiter (toutes les 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateHits) {
    if (now > entry.resetAt) rateHits.delete(ip);
  }
}, 600_000).unref?.();

// ── CORS — Origines autorisées ───────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://speechify.lhusser.fr',      // VPS Hostinger (PM2 + Nginx)
  'https://speechify.lhusser.cloud',   // VPS Oracle Cloud (Coolify)
  'http://localhost:5173',       // Vite dev
  'http://localhost:3000',       // Express dev
  'http://localhost:4173',       // Vite preview
];

function corsHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin = req.headers.origin || '';
  // En dev (pas d'origin) on autorise
  if (!origin) return next();
  // Vérifier l'origine
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // En dev on tolère d'autres origines (tests mobile, etc.)
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // En prod, origine non autorisée — on bloque
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// ── Lazy Gemini client ──────────────────────────────────────────────────────
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé d'API GEMINI_API_KEY est manquante dans la configuration du serveur.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // ── CORS (origines autorisées uniquement) ───────────────────────────────
  app.use(corsHandler);

  // ── Rate limiting global (200 req/min par IP) — APIs uniquement ──────────
  app.use('/api', rateLimiter(200));

  // ════════════════════════════════════════════════════════════════════════
  // ── API LIVRES (SQLite) ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  // GET /api/books — Récupérer tous les livres
  app.get('/api/books', (req, res) => {
    try {
      const rows = stmtGetAllBooks.all() as { data: string }[];
      const books = rows.map(r => JSON.parse(r.data));
      res.json({ books, count: books.length });
    } catch (err: any) {
      console.error('[API BOOKS] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/books/:id — Récupérer un livre par ID
  app.get('/api/books/:id', (req, res) => {
    try {
      const row = stmtGetBook.get(req.params.id) as { data: string } | undefined;
      if (!row) return res.status(404).json({ error: 'Livre introuvable' });
      res.json(JSON.parse(row.data));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/books — Sauvegarder / mettre à jour un livre
  app.post('/api/books', (req, res) => {
    try {
      const book = req.body;
      if (!book?.id) return res.status(400).json({ error: 'ID du livre manquant' });
      stmtUpsertBook.run(book.id, JSON.stringify(book));
      res.json({ success: true, id: book.id });
    } catch (err: any) {
      console.error('[API BOOKS] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/books/batch — Sauvegarder plusieurs livres en une fois
  app.post('/api/books/batch', (req, res) => {
    try {
      const { books } = req.body;
      if (!Array.isArray(books)) return res.status(400).json({ error: 'books[] requis' });
      const upsertMany = db.transaction((booksArr: any[]) => {
        for (const book of booksArr) {
          if (book?.id) stmtUpsertBook.run(book.id, JSON.stringify(book));
        }
      });
      upsertMany(books);
      res.json({ success: true, count: books.length });
    } catch (err: any) {
      console.error('[API BOOKS] BATCH error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/books/:id — Supprimer un livre
  app.delete('/api/books/:id', (req, res) => {
    try {
      stmtDeleteBook.run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API MARQUE-PAGES ─────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  // GET /api/bookmarks/:bookId
  app.get('/api/bookmarks/:bookId', (req, res) => {
    try {
      const rows = stmtGetBookmarks.all(req.params.bookId) as { data: string }[];
      res.json({ bookmarks: rows.map(r => JSON.parse(r.data)) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/bookmarks
  app.post('/api/bookmarks', (req, res) => {
    try {
      const bm = req.body;
      if (!bm?.id || !bm?.documentId) return res.status(400).json({ error: 'id et documentId requis' });
      stmtUpsertBookmark.run(bm.id, bm.documentId, JSON.stringify(bm));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/bookmarks/:id
  app.delete('/api/bookmarks/:id', (req, res) => {
    try {
      stmtDeleteBookmark.run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API GUTENBERG (texte brut avec décodage UTF-8/Latin-1 côté serveur) ──
  // ════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════
  // ── API ANNOTATIONS ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  app.get('/api/annotations/:bookId', (req, res) => {
    try {
      const rows = stmtGetAnnotations.all(req.params.bookId) as { data: string }[];
      res.json({ annotations: rows.map(r => JSON.parse(r.data)) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/annotations', (req, res) => {
    try {
      const ann = req.body;
      if (!ann?.id || !ann?.documentId) return res.status(400).json({ error: 'id et documentId requis' });
      stmtUpsertAnnotation.run(ann.id, ann.documentId, JSON.stringify(ann));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.delete('/api/annotations/:id', (req, res) => {
    try { stmtDeleteAnnotation.run(req.params.id); res.json({ success: true }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API FLASHCARDS ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  app.get('/api/flashcards', (req, res) => {
    try {
      const rows = stmtGetFlashcards.all() as { data: string }[];
      res.json({ flashcards: rows.map(r => JSON.parse(r.data)) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.post('/api/flashcards', (req, res) => {
    try {
      const card = req.body;
      if (!card?.id) return res.status(400).json({ error: 'id requis' });
      stmtUpsertFlashcard.run(card.id, JSON.stringify(card));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.delete('/api/flashcards/:id', (req, res) => {
    try { stmtDeleteFlashcard.run(req.params.id); res.json({ success: true }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API GEMINI CHAT (Charly Coach) ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════
  app.post("/api/gemini/chat", rateLimiter(20), async (req, res) => {
    const { systemContext, messages, lang } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] requis" });
    }
    try {
      const ai = getGeminiClient();
      const history = messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'Utilisateur' : 'Charly'}: ${m.content}`).join("\n");
      const lastMsg = messages[messages.length - 1].content;
      const prompt = `${systemContext}\nIMPORTANT : Termine toujours tes phrases. Réponds de façon complète mais concise (max 250 mots).\n\nHistorique de la conversation:\n${history}\n\nUtilisateur: ${lastMsg}\n\nCharly:`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.7, maxOutputTokens: 1500 }
      });
      return res.json({ reply: response.text || "Je n'ai pas pu répondre." });
    } catch (error: any) {
      console.error("[API CHAT ERROR]", error);
      return res.status(500).json({ error: `Erreur Charly : ${error.message}` });
    }
  });

  app.get("/api/gutenberg/:bookId", async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: "bookId invalide" });
    }

    // URLs candidates dans l'ordre de préférence
    const candidates = [
      `https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`,
      `https://www.gutenberg.org/files/${bookId}/${bookId}.txt`,
      `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`,
      `https://www.gutenberg.org/files/${bookId}/${bookId}-8.txt`,
      `https://www.gutenberg.org/ebooks/${bookId}.txt.utf-8`,
    ];

    const headers = {
      "User-Agent": "Mozilla/5.0 (compatible; SpeechifyPro/1.0)",
      "Accept": "text/plain, */*",
    };

    let lastError = "";

    for (const url of candidates) {
      try {
        console.log(`[GUTENBERG] Trying: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = `HTTP ${response.status} for ${url}`;
          continue;
        }

        // Récupérer en buffer binaire
        const arrayBuffer = await response.arrayBuffer();
        const bytes = Buffer.from(arrayBuffer);

        // Détecter l'encodage : BOM UTF-8 ou essai UTF-8 strict, sinon Latin-1
        let text: string;
        if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
          // BOM UTF-8
          text = bytes.slice(3).toString('utf-8');
        } else {
          // Essayer UTF-8
          const utf8 = bytes.toString('utf-8');
          // Si contient des caractères de remplacement UTF-8 cassés (0xFFFD), c'est du Latin-1
          if (utf8.includes('�')) {
            text = bytes.toString('latin1');
          } else {
            text = utf8;
          }
        }

        if (!text || text.length < 500) {
          lastError = `Contenu trop court pour ${url}`;
          continue;
        }

        console.log(`[GUTENBERG] ✅ ${url} — ${text.length} chars, encodage détecté`);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.send(text);

      } catch (err: any) {
        lastError = err.message;
        console.warn(`[GUTENBERG] ❌ ${url}: ${err.message}`);
      }
    }

    return res.status(502).json({ error: `Impossible de récupérer le livre ${bookId}: ${lastError}` });
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API PROXY WEB ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "L'URL est requise" });
    }
    try {
      console.log(`[API PROXY] Fetching URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Le site distant a retourné le statut d'erreur: ${response.status} ${response.statusText}`
        });
      }
      const body = await response.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(body);
    } catch (error: any) {
      console.error(`[API PROXY ERROR] Failed to fetch: ${url}`, error);
      return res.status(500).json({
        error: `Impossible de récupérer le contenu de cette page. Erreur : ${error.message || error}`
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // ── API GEMINI ────────────────────────────────════════════════════════════
  // ════════════════════════════════════════════════════════════════════════

  app.post("/api/gemini/summarize", rateLimiter(10), async (req, res) => {
    const { text, title, tone, lang } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Le contenu textuel est requis pour pouvoir générer un résumé." });
    }
    try {
      console.log(`[API SUMMARIZE] Generating summary for: "${title || 'Sans titre'}" with tone "${tone || 'standard'}"`);
      const ai = getGeminiClient();
      let formatInstruction = "Fais un résumé structuré, aéré et clair en français.";
      if (tone === "bullet") {
        formatInstruction = "Génère une liste à puces des points clés importants (entre 5 et 8 points), précédés d'icônes ou d'emojis pertinents et gais. Sois synthétique.";
      } else if (tone === "simple") {
        formatInstruction = "Fais un résumé ultra-vulgarisé avec des mots simples pour faciliter la révision ou l'apprentissage de notions complexes. Utilise un ton très pédagogique et bienveillant.";
      } else if (tone === "short") {
        formatInstruction = "Génère un résumé court d'un seul paragraphe (environ 3 à 5 phrases maximum), condensé et captivant.";
      } else {
        formatInstruction = "Génère un résumé fluide et complet composé d'un court paragraphe d'introduction pour poser le cadre général, puis de 3 à 5 faits marquants clés sous forme de liste fluide, et d'une conclusion synthétique.";
      }
      const targetLang = lang || "fr";
      const systemInstruction = `Tu es une IA d'apprentissage intelligente, chaleureuse et captivante, intégrée directement dans cette liseuse audio vocale haut de gamme.\nTon rôle est de lire le texte fourni et d'en générer un résumé fantastique, agréable et ultra-compréhensible.\nConsignes primordiales :\n1. Réponds de préférence en français ou dans la langue cible : ${targetLang}.\n2. Sois CONVIVIAL et fluide. Formule des phrases claires, mélodieuses, faciles et agréables à écouter si elles sont lues à haute voix par notre synthèse vocale.\n3. Utilise le balisage Markdown classique de façon sobre et gracieuse.\n4. Fournis un livrable fini, propre et professionnel. NE commence JAMAIS par des phrases métas.\n5. Sois fidèle au document original.`;
      const contentForGemini = text.length > 120000 ? text.substring(0, 120000) + "\n\n[... CONTENU TRONQUÉ ...]" : text;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Titre : "${title || 'Sans titre'}"\n\nInstructions : ${formatInstruction}\n\nTexte source :\n${contentForGemini}`,
        config: { systemInstruction, temperature: 0.6 }
      });
      const summaryText = response.text || "Impossible d'extraire le résumé généré.";
      return res.json({ summary: summaryText });
    } catch (error: any) {
      console.error(`[API SUMMARIZE ERROR]`, error);
      let userFriendlyError = "Une erreur est survenue lors de l'appel au service de résumé par IA.";
      if (error.message?.includes("API_KEY")) {
        userFriendlyError = "La clé d'API de l'IA (GEMINI_API_KEY) est introuvable ou invalide sur le serveur.";
      } else {
        userFriendlyError = `Erreur de traitement IA : ${error.message || error}`;
      }
      return res.status(500).json({ error: userFriendlyError });
    }
  });

  app.post("/api/gemini/define", rateLimiter(15), async (req, res) => {
    const { word, sentence, lang } = req.body;
    if (!word || typeof word !== "string" || !word.trim()) {
      return res.status(400).json({ error: "Le mot recherché est requis." });
    }
    const cacheKey = `${(lang || 'fr')}:${word.trim().toLowerCase()}`;
    // 1. Cache SQLite : mot déjà défini → réponse instantanée, zéro quota Gemini
    try {
      const cached = stmtGetDefinition.get(cacheKey) as { data: string } | undefined;
      if (cached) {
        console.log(`[API DEFINE] Cache hit: "${word}"`);
        return res.json({ ...JSON.parse(cached.data), cached: true });
      }
    } catch (cacheErr) {
      console.warn('[API DEFINE] Cache read error', cacheErr);
    }

    try {
      console.log(`[API DEFINE] Looking up word: "${word}"`);
      const ai = getGeminiClient();
      const targetLang = lang || "fr";
      const systemInstruction = `Tu es une IA d'apprentissage, un enseignant de français et un linguiste bienveillant.\nTon rôle est d'analyser le mot fourni et d'en retourner une fiche d'apprentissage ultra-didactique sous format JSON STRICT.\nNe mets aucun filtre markdown, retourne uniquement du code JSON brut et valide.\n\nSchéma JSON attendu :\n{\n  "word": "le mot original",\n  "partOfSpeech": "nature grammaticale",\n  "definition": "définition claire et simple",\n  "etymology": "étymologie succincte",\n  "contextualExplanation": "explication dans le contexte fourni",\n  "synonyms": ["synonyme1", "synonyme2", "synonyme3"],\n  "example": "phrase d'exemple élégante"\n}\n\nRéponds en ${targetLang}.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Mot sélectionné : "${word}"\nPhrase de contexte : "${sentence || ''}"`,
        config: { systemInstruction, temperature: 0.2, responseMimeType: "application/json" }
      });
      const responseText = response.text || "{}";
      const wordDefinition = JSON.parse(responseText.trim());
      // 2. Stocker dans le cache pour les prochaines requêtes
      try {
        stmtUpsertDefinition.run(cacheKey, JSON.stringify(wordDefinition));
      } catch (cacheErr) {
        console.warn('[API DEFINE] Cache write error', cacheErr);
      }
      return res.json(wordDefinition);
    } catch (error: any) {
      console.error(`[API DEFINE ERROR]`, error);
      return res.status(500).json({ error: `Erreur : ${error.message || error}` });
    }
  });

  // ── Vite dev / production static ─────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[SQLite] Stockage livres actif → data/speechify.db`);
  });
}

startServer();





