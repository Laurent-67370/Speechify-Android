# 🎧 SpeechifyPro — Votre Liseuse Audio Intelligente & Interactive

Bienvenue sur **SpeechifyPro** ! Une expérience de lecture sonore immersive, conçue pour transformer n'importe quel ouvrage, fichier **ePUB / PDF / TXT / Markdown**, ou article de presse web en une écoute fluide, captivante et animée.

Que ce soit pour reposer vos yeux fatigués, réviser des concepts clés, ou vous instruire tout en cuisinant, laissez **Charly, votre compagnon de l'IA**, vous accompagner pas à pas !

---

## 🌟 Fonctionnalités

### 🤖 1. Charly, votre Guide Interactif & Didactique
- **Parcours d'Apprentissage Vivant :** Un assistant virtuel jovial vous explique le fonctionnement en 6 étapes animées.
- **Le Laboratoire Acoustique :** Entraînez-vous à façonner la voix de synthèse en temps réel.
- **Entraînement "Clic-pour-Lire" :** Simulez des clics de lecture directement dans le guide.
- **Le Grand Quiz des Lecteurs :** Validez vos connaissances et décrochez votre brevet de *Lecteur Intelligent* !

### 🔮 2. Résumés Intelligents par l'IA (Gemini Flash)
- **4 Styles de Résumés :** Équilibré, Points Clés, Pédagogique, Court.
- **Vocalisation Directe :** Écoutez votre résumé en un clic via la synthèse vocale intégrée.
- **Dictionnaire Contextuel IA :** Sélectionnez un mot pour obtenir définition, étymologie, synonymes et exemple.

### ⛵ 3. Navigation Ultragranulaire
- **Geste "Click-to-Read" :** Cliquez sur un paragraphe pour déplacer instantanément la lecture.
- **Boîte à Outils de Fin de Chapitre :** Passer au chapitre suivant, relire, générer un résumé IA.
- **Skip ±15s :** Navigation temporelle dans le flux audio.

### 🌌 4. Confort d'Affichage & Design
- **3 Thèmes :** Sombre (cosmique), Jour (sable), Sépia.
- **Égaliseur Virtuel Réactif :** Onde audio animée en temps réel.
- **Mini-Lecteur Flottant Global :** Naviguez librement pendant la lecture en arrière-plan.
- **Défilement automatique :** Le texte suit la lecture en douceur.

### 📚 5. Bibliothèque & Import Multi-Source
- **Projet Gutenberg :** 70 000+ ouvrages classiques en 🇫🇷 🇬🇧 🇪🇸 🇩🇪 🇮🇹.
- **Import de fichiers :** Glissez-déposez vos **ePUB, PDF, TXT et Markdown** (.md, .markdown) locaux.
- **Import URL :** Collez une URL web pour lire un article en un instant.
- **Encodage auto :** Détection UTF-8 / Latin-1 pour les classiques Gutenberg et les fichiers TXT (accents corrects).
- **Chapitrage intelligent :** Les fichiers TXT et Markdown sont découpés automatiquement en chapitres (titres `#`, `##`, doubles sauts de ligne).

### 🎙️ 6. Voix de Studio Premium

**Voix Studio système** (sans clé API) — profils optimisés par langue :
- 🇫🇷 *Charly* (Chaleureux), *Clara* (Lumineux), *Victor* (Théâtral)
- 🇬🇧 *Arthur* (Profond), *Emily* (Brillant), *Winston* (Oxford)
- 🇩🇪 *Hans* (Posé), *Lena* (Détaillé)
- 🇪🇸 *Mateo* (Naturel), *Isabella* (Mélodique)
- 🇮🇹 *Giovanni* (Chaleureux), *Sofia* (Vivace)

**✨ Google Cloud TTS Premium** (avec clé API Google Cloud) :
- Voix neurales **Neural2 & WaveNet** — qualité studio
- 🇫🇷 Denise, Henri, Claire, Lucas · 🇺🇸 Jenny, Guy · 🇬🇧 Sophie
- 🇪🇸 Neural2 · 🇩🇪 Neural2 · 🇮🇹 Neural2
- Fonctionne sur **tous les navigateurs et OS** (Firefox Linux, Chrome, Android)
- 1M caractères/mois gratuits sur Google Cloud

### 📊 7. Page Statistiques
- **Objectif journalier** avec cercle de progression animé (modifiable).
- **3 KPIs :** minutes cette semaine, série de jours consécutifs (streak), nb de livres.
- **Graphique 7 jours** avec barres animées, jour courant mis en valeur.
- **Progression par livre** avec mini-barres gradient et durée estimée.
- Données persistées en `localStorage` (clé `speechify_day_YYYY-MM-DD`).

### 🖱️ 8. Popup de Sélection de Texte
- **▶ Lire depuis ici** — positionne la lecture exactement à la phrase sélectionnée.
- **📋 Copier** — copie la sélection avec feedback visuel.
- Fonctionne au **tap** (mobile) et à la **souris** (desktop).

### 💾 9. Stockage Persistant Multi-Navigateur (SQLite VPS)
- Les livres et marque-pages sont sauvegardés dans une base **SQLite** côté serveur.
- Accessible depuis **n'importe quel navigateur ou appareil** via `speechify.lhusser.fr`.
- Fallback automatique sur **IndexedDB** local si le serveur est inaccessible.
- Migration automatique depuis `localStorage` legacy.

### 📱 10. Application Web Progressive (PWA)
- **Installable en un clic** sur mobile et desktop.
- **Service Worker** : cache automatique, fonctionnement hors ligne.
- **Manifest PWA** avec icônes haute résolution.

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite 6 |
| **Animations** | Motion (`motion/react`) |
| **Design** | Tailwind CSS 4 |
| **PWA** | Service Worker + manifest.json |
| **IA Résumés** | Google GenAI SDK — Gemini Flash (côté serveur) |
| **Voix Premium** | Google Cloud TTS REST API (Neural2 / WaveNet) |
| **Stockage livres** | SQLite (`better-sqlite3`) côté serveur + IndexedDB local |
| **Parseurs** | PDF.js 3.4 (PDF) · JSZip (ePUB) · Custom (TXT / Markdown) |
| **Encodage** | Détection auto UTF-8 / Latin-1 (TextDecoder + Buffer Node.js) |
| **Serveur** | Node.js / Express — proxy CORS, Gutenberg, Gemini, SQLite |
| **Déploiement** | PM2 + Nginx + Let's Encrypt (HTTPS) |

---

## 🚀 Guide de Démarrage

### 1. Cloner et installer

```bash
git clone https://github.com/Laurent-67370/Speechify-Android.git
cd Speechify-Android
npm install
```

### 2. Variables d'environnement (optionnel)

```env
# .env
GEMINI_API_KEY=votre_cle_gemini
```

> La clé Google Cloud TTS se configure directement dans l'app : **Lire → Options → Voix premium**.

### 3. Lancer en développement

```bash
# Local
npm run dev

# Exposé sur le réseau (VPS, test mobile)
npm run dev -- --host 0.0.0.0
```

### 4. Build de production

```bash
npm run build
pm2 start "node dist/server.cjs" --name speechify --cwd /chemin/vers/app
pm2 save
```

### 5. Mise à jour (workflow VPS)

```bash
cd ~/Speechify-Android
git pull --rebase
npm run build
pm2 restart speechify
```

---

## 📁 Architecture du projet

```
src/
├── components/
│   ├── TextViewer.tsx           # Lecteur avec surlignage phrase par phrase
│   ├── ReaderControls.tsx       # Barre audio (play/pause/skip/vitesse)
│   ├── ReaderSettings.tsx       # Paramètres (voix, thème, taille)
│   ├── GoogleTTSSettings.tsx    # Config Google Cloud TTS ✨
│   ├── StatsPage.tsx            # Statistiques (cercle, streak, graphe) 📊
│   ├── SelectionPopup.tsx       # Popup sélection texte 🖱️
│   ├── HomeDashboard.tsx        # Accueil (carousel, objectif, égaliseur)
│   ├── Sidebar.tsx              # Table des matières + marque-pages
│   ├── GutenbergExplorer.tsx    # Recherche + import Gutenberg (70k livres)
│   ├── DocumentUpload.tsx       # Import PDF/ePUB/TXT/MD/URL
│   ├── InteractiveHelpGuide.tsx # Guide Charly (6 étapes + quiz)
│   └── DictionaryModal.tsx      # Définition mot sélectionné
├── utils/
│   ├── useGoogleTTS.ts          # Hook Google Cloud TTS ✨
│   ├── useServerSync.ts         # Hook synchronisation SQLite VPS 💾
│   ├── customVoices.ts          # Profils voix studio système
│   ├── textUtils.ts             # Découpage phrases, préprocesseur TTS
│   ├── indexedDB.ts             # Cache local IndexedDB
│   └── webParser.ts             # Extraction texte depuis URL
├── lib/
│   ├── pdfParser.ts             # Parser PDF (PDF.js) avec décodage UTF-8
│   ├── epubParser.ts            # Parser ePUB (JSZip) avec décodage UTF-8
│   └── textParser.ts            # Parser TXT/Markdown avec chapitrage auto et UTF-8/Latin-1
├── data/
│   └── samples.ts               # Extraits de démonstration
└── types.ts                     # Types TypeScript partagés

server.ts                        # Serveur Express
├── /api/gutenberg/:bookId       # Proxy Gutenberg (UTF-8/Latin-1 auto) 🔤
├── /api/books                   # CRUD livres SQLite 💾
├── /api/bookmarks               # CRUD marque-pages SQLite 💾
├── /api/proxy                   # Proxy web (import URL)
├── /api/gemini/summarize        # Résumés IA Gemini
└── /api/gemini/define           # Dictionnaire IA Gemini

data/
└── speechify.db                 # Base SQLite (livres + marque-pages) 💾
```

---

## 🗓️ Historique des versions

| Version | Date | Nouveautés |
|---|---|---|
| v1.0 | Juin 2026 | Version initiale — lecteur React/TS, voix système, Gutenberg |
| v1.1 | Juin 2026 | **StatsPage** — graphique semaine, objectif, progression par document |
| v1.1 | Juin 2026 | **SelectionPopup** — "Lire depuis ici" + "Copier" |
| v1.2 | Juin 2026 | **Google Cloud TTS Premium** — Neural2/WaveNet, hook `useGoogleTTS` |
| v1.3 | Juin 2026 | **SQLite VPS** — stockage persistant multi-navigateur |
| v1.3 | Juin 2026 | **Fix encodage** — UTF-8/Latin-1 auto (accents Gutenberg) |
| v1.4 | Juin 2026 | **StatsPage v2** — cercle animé, streak, KPIs, redesign complet |
| v1.4 | Juin 2026 | **HTTPS** — `speechify.lhusser.fr` via Nginx + Let's Encrypt + PM2 |
| v1.5 | Juin 2026 | **Import TXT & Markdown** — parser avec chapitrage auto, détection UTF-8/Latin-1 |

---

## 🔒 Production

L'application est déployée sur :

```
https://speechify.lhusser.fr
```

- Serveur : VPS Ubuntu 24.04 (IP 76.13.43.193)
- Process manager : PM2 (redémarrage auto au boot)
- Reverse proxy : Nginx
- SSL : Let's Encrypt (renouvellement auto)
- Base de données : SQLite (`/root/Speechify-Android/data/speechify.db`)

---

## 🎯 Commencer !

Cliquez sur **`?`** en haut à droite pour déclencher Charly et commencer votre premier voyage littéraire. Bonne écoute ! 🎧
