import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy helper for Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé d'API GEMINI_API_KEY est manquante dans la configuration du serveur. Veuillez l'ajouter dans Paramètres > Clés d'API.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with elevated JSON limits for conveying larger book/chapter payloads safely!
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // API Route: Server-side proxy for robust fetching of external web content (bypasses browser CORS completely!)
  app.get("/api/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "L'URL est requise" });
    }

    try {
      console.log(`[API PROXY] Fetching URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

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
        error: `Impossible de récupérer le contenu de cette page directement. Erreur : ${error.message || error}` 
      });
    }
  });

  // API Route: AI-powered document & chapter summarizer using Gemini 3.5 Flash server-side!
  app.post("/api/gemini/summarize", async (req, res) => {
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

      const systemInstruction = `Tu es une IA d'apprentissage intelligente, chaleureuse et captivante, intégrée directement dans cette liseuse audio vocale haut de gamme.
Ton rôle est de lire le texte fourni et d'en générer un résumé fantastique, agréable et ultra-compréhensible.
Consignes primordiales :
1. Réponds de préférence en français ou dans la langue cible : ${targetLang}.
2. Sois CONVIVIAL et fluide. Formule des phrases claires, mélodieuses, faciles et agréables à écouter si elles sont lues à haute voix par notre synthèse vocale (évite les listes de chiffres austères sans contexte, les symboles ésotériques ou les abréviations cryptiques).
3. Utilise le balisage Markdown classique de façon sobre et gracieuse (titres h3, listes à puces gais, gras pour mettre en valeur les notions essentielles).
4. Fournis un livrable fini, propre et professionnel. NE commence JAMAIS par des phrases métas comme "Voici le résumé demandé" ou "En tant qu'assistant...". Débute directement par le coeur du sujet ou un titre de section engageant.
5. Sois fidèle au document original et ne déforme pas les faits officiels décrits dans le texte.`;

      // Limit data size safely to fit the context window without issue
      const contentForGemini = text.length > 120000 ? text.substring(0, 120000) + "\n\n[... CONTENU TRONQUÉ POUR LE RÉSUMÉ POUR RAISONS DE PERFORMANCE ...]" : text;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Titre de la section / du document : "${title || 'Sans titre'}"\n\nInstructions de formatage spécifiques : ${formatInstruction}\n\nTexte source :\n${contentForGemini}`,
        config: {
          systemInstruction,
          temperature: 0.6,
        }
      });

      const summaryText = response.text || "Impossible d'extraire le résumé généré.";
      return res.json({ summary: summaryText });
    } catch (error: any) {
      console.error(`[API SUMMARIZE ERROR]`, error);
      
      // Return a refined human-readable error response
      let userFriendlyError = "Une erreur est survenue lors de l'appel au service de résumé par IA.";
      if (error.message?.includes("API_KEY")) {
        userFriendlyError = "La clé d'API de l'IA (GEMINI_API_KEY) est introuvable ou invalide sur le serveur. Veuillez configurer le secret dans l'onglet Paramètres > Clés d'API.";
      } else {
        userFriendlyError = `Erreur de traitement IA : ${error.message || error}`;
      }

      return res.status(500).json({ error: userFriendlyError });
    }
  });

  // Vite middleware for development
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
  });
}

startServer();
