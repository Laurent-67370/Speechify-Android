# 🎧 SpeechifyPro — Votre Liseuse Audio Intelligente & Interactive

Bienvenue sur **SpeechifyPro** ! Une expérience de lecture sonore immersive, conçue pour transformer n'importe quel ouvrage, fichier **ePUB / PDF / TXT / Markdown**, ou article de presse web en une écoute fluide, captivante et animée.

Que ce soit pour reposer vos yeux fatigués, réviser des concepts clés, ou vous instruire tout en cuisinant, laissez **Charly, votre compagnon de l'IA**, vous accompagner pas à pas !

---

## 🌟 Fonctionnalités

### 🤖 1. Charly — Guide Interactif & Coach IA

- **Parcours d'Apprentissage Vivant :** Un assistant virtuel jovial vous explique le fonctionnement en 6 étapes animées.
- **Le Laboratoire Acoustique :** Entraînez-vous à façonner la voix de synthèse en temps réel.
- **Entraînement "Clic-pour-Lire" :** Simulez des clics de lecture directement dans le guide.
- **Le Grand Quiz des Lecteurs :** Validez vos connaissances et décrochez votre brevet de *Lecteur Intelligent* !
- **Coach IA contextuel :** Posez des questions sur votre lecture en cours — résumé, quiz, contexte historique, vocabulaire, analyse des personnages — directement depuis l'interface.

### 🔮 2. Résumés Intelligents par l'IA (Gemini Flash)

- **4 Styles de Résumés :** Équilibré, Points Clés, Pédagogique, Court.
- **Vocalisation Directe :** Écoutez votre résumé en un clic via la synthèse vocale intégrée.
- **Dictionnaire Contextuel IA :** Sélectionnez un mot pour obtenir définition, étymologie, synonymes et exemple.
- **Sauvegarde en Flashcard :** Depuis le dictionnaire, enregistrez n'importe quel mot dans votre deck personnel en un clic.

### ⛵ 3. Navigation Ultragranulaire

- **Geste "Click-to-Read" :** Cliquez sur un paragraphe pour déplacer instantanément la lecture.
- **Boîte à Outils de Fin de Chapitre :** Passer au chapitre suivant, relire, générer un résumé IA.
- **Skip ±15s :** Navigation temporelle dans le flux audio.

### 🖱️ 4. Popup de Sélection de Texte

Sélectionnez n'importe quel passage et accédez instantanément à 4 actions :

- **▶ Lire depuis ici** — positionne la lecture exactement à la phrase sélectionnée.
- **🖊 Annoter** — surligne le passage avec une couleur et une note personnelle.
- **📖 Définir** — ouvre le dictionnaire IA sur le mot sélectionné.
- **📋 Copier** — copie la sélection avec feedback visuel.

Fonctionne au **tap** (mobile) et à la **souris** (desktop).

### 🖊️ 5. Annotations & Surlignage

- Surlignez des passages en **4 couleurs** (jaune, vert, bleu, rose).
- Ajoutez une **note textuelle** à chaque annotation.
- **Surlignage visible pendant la lecture** : les passages annotés restent colorés dans le texte, avec la note au survol.
- **Onglet "Annot."** dans le panneau latéral : liste de toutes vos annotations avec pastille couleur, navigation directe vers le passage et suppression.
- Annotations **persistées en SQLite VPS** — retrouvez-les sur tous vos appareils.

### 🧠 6. Flashcards & Révision Vocabulaire

- Sauvegardez les mots découverts pendant la lecture dans un **deck personnel** — depuis le dictionnaire (double-clic sur un mot ou bouton 📖 Définir de la popup de sélection).
- **Mode révision** avec cartes retournables (flip recto/verso).
- Marquage **"Maîtrisée"** / **"À revoir"** avec suivi de progression.
- Prononciation des mots via synthèse vocale.
- Accessible depuis l'onglet **Cartes** (navbar), avec badge compteur.
- Deck **persisté en SQLite VPS**.

### 🌌 7. Confort d'Affichage & Design

- **3 Thèmes :** Sombre (cosmique), Jour (sable), Sépia.
- **Égaliseur Virtuel Réactif :** Onde audio animée en temps réel.
- **Mini-Lecteur Flottant Global :** Naviguez librement pendant la lecture en arrière-plan.
- **Défilement automatique :** Le texte suit la lecture en douceur.

### 📚 8. Librairie Gutenberg — Accès complet aux 70 000 livres

- **🔥 Top téléchargements :** les classiques les plus populaires du catalogue, filtrés par langue.
- **🏷️ Navigation par genres :** 15 thèmes (Aventure, Policier, SF, Romance, Fantastique, Poésie, Philosophie, Histoire, Théâtre, Contes, Jeunesse, Biographies, Voyages, Humour, Musique).
- **🎲 Découverte aléatoire :** pioche 32 livres au hasard dans tout le catalogue, bouton "Repiocher".
- **📖 Vraies couvertures :** jaquettes officielles Gutenberg sur chaque résultat, avec couverture de secours en dégradé généré.
- **📚 Pagination "Charger plus" :** compteur réel (ex. 4 521 livres) et chargement progressif sans limite.
- **🧠 État persistant :** la recherche, le genre actif et la pagination survivent aux changements d'onglet (cache module-scope).
- **Recherche** par titre/auteur en 🇫🇷 🇬🇧 🇪🇸 🇩🇪 🇮🇹 + sélection éditoriale de 22 chefs-d'œuvre.

### 📥 8bis. Import Multi-Source (6 formats + collage direct)

- **Fichiers locaux :** **PDF, ePUB, TXT, Markdown, Word (.docx)** et **HTML** — zone de drop redessinée avec cartes formats colorées et icône animée.
- **✍️ Coller du texte :** copiez n'importe quel texte (email, cours, notes) → collé → structuré en livre audio instantanément. Compteur de caractères en temps réel.
- **Import URL :** Collez une URL web pour lire un article en un instant.
- **Word :** extraction via mammoth (import dynamique, zéro impact bundle).
- **HTML :** extraction intelligente du texte (scripts/menus/footers retirés), titre de page conservé.
- **Encodage auto :** Détection UTF-8 / Latin-1 (accents corrects).
- **Chapitrage intelligent :** découpage automatique en chapitres.

### 🎙️ 9. Voix de Studio Premium

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

### 📊 10. Page Statistiques

- **Objectif journalier** avec cercle de progression animé (modifiable).
- **3 KPIs :** minutes cette semaine, série de jours consécutifs (streak), nb de livres.
- **Graphique 7 jours** avec barres animées, jour courant mis en valeur.
- **Progression par livre** avec mini-barres gradient et durée estimée.

### 💾 11. Stockage Persistant Multi-Navigateur (SQLite VPS)

- Livres, marque-pages, annotations et flashcards sauvegardés en **SQLite** côté serveur.
- Accessible depuis **n'importe quel navigateur ou appareil** via `speechify.lhusser.fr`.
- Fallback automatique sur **IndexedDB** local si le serveur est inaccessible.
- Migration automatique depuis `localStorage` legacy.

### 📱 12. Application Web Progressive (PWA)

- **Installable en un clic** sur mobile et desktop.
- **Service Worker v2** : NetworkFirst pour JS/CSS (toujours la dernière version), cache auto, fonctionnement hors ligne.
- **Manifest PWA** avec icônes haute résolution.

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite 6 |
| **Animations** | Motion (`motion/react`) |
| **Design** | Tailwind CSS 4 |
| **PWA** | Service Worker v2 (NetworkFirst) + manifest.json |
| **IA Résumés** | Google GenAI SDK — Gemini 2.5 Flash (côté serveur) |
| **IA Chat** | Gemini 2.5 Flash — Charly Coach contextuel |
| **Voix Premium** | Google Cloud TTS REST API (Neural2 / WaveNet) |
| **Stockage** | SQLite (`better-sqlite3`) — livres, marque-pages, annotations, flashcards |
| **Cache local** | IndexedDB (fallback offline) |
| **Parseurs** | PDF.js 3.4 (PDF) · JSZip (ePUB) · mammoth (Word) · DOMParser (HTML) · Custom (TXT / MD / texte collé) |
| **Encodage** | Détection auto UTF-8 / Latin-1 + normalisation apostrophes typographiques |
| **Serveur** | Node.js / Express — proxy CORS, Gutenberg, Gemini, SQLite |
| **Sécurité** | CORS restrictif (whitelist) · Rate limiting (200/min API, 10/min Gemini) |
| **Résilience** | Error Boundary React · Code splitting (`React.lazy`) |
| **Performance** | manualChunks vendor · PDF.js en import dynamique · `useMemo` lecture · cache SQLite définitions · SW v3 CacheFirst assets |
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
│   ├── TextViewer.tsx           # Lecteur : surlignage lecture + annotations colorées 🖊️
│   ├── ReaderControls.tsx       # Barre audio (play/pause/skip/vitesse)
│   ├── ReaderSettings.tsx       # Paramètres (voix, thème, taille)
│   ├── GoogleTTSSettings.tsx    # Config Google Cloud TTS ✨
│   ├── StatsPage.tsx            # Statistiques (cercle, streak, graphe) 📊 ⚡ lazy
│   ├── SelectionPopup.tsx       # Popup sélection (Lire / Annoter / Définir / Copier) 🖱️
│   ├── AnnotationModal.tsx      # Création annotation avec couleur + note 🖊️
│   ├── DictionaryModal.tsx      # Dictionnaire IA + sauvegarde flashcard 📖
│   ├── FlashcardsPage.tsx       # Deck vocabulaire + mode révision flip 🧠 ⚡ lazy
│   ├── CharlyChatModal.tsx      # Coach IA contextuel sur le livre en cours 🤖 ⚡ lazy
│   ├── HomeDashboard.tsx        # Accueil (carousel, objectif, égaliseur)
│   ├── Sidebar.tsx              # Sommaire + recherche + signets + annotations + résumés IA
│   ├── GutenbergExplorer.tsx    # Catalogue complet : genres, top, aléatoire, couvertures, pagination ⚡ lazy
│   ├── DocumentUpload.tsx       # Import 6 formats + URL + collage texte (PDF.js dynamique) 📥
│   ├── InteractiveHelpGuide.tsx # Guide Charly (6 étapes + quiz) ⚡ lazy
│   └── ErrorBoundary.tsx        # Capture erreurs React + fallback UI 🛡️
├── utils/
│   ├── useGoogleTTS.ts          # Hook Google Cloud TTS ✨
│   ├── useServerSync.ts         # Hook synchronisation SQLite VPS 💾
│   ├── customVoices.ts          # Profils voix studio système
│   ├── textUtils.ts             # Découpage phrases, préprocesseur TTS (apostrophes normalisées)
│   ├── indexedDB.ts             # Cache local IndexedDB
│   └── webParser.ts             # Extraction texte depuis URL
├── lib/
│   ├── pdfParser.ts             # Parser PDF (PDF.js) avec décodage UTF-8
│   ├── epubParser.ts            # Parser ePUB (JSZip) avec décodage UTF-8
│   └── textParser.ts            # Parser TXT/Markdown avec chapitrage auto et UTF-8/Latin-1
├── data/
│   └── samples.ts               # Extraits de démonstration
└── types.ts                     # Types TypeScript (DocumentBook, Annotation, Flashcard...)

server.ts                        # Serveur Express + CORS restrictif + Rate limiting 🛡️
├── /api/gutenberg/:bookId       # Proxy Gutenberg (UTF-8/Latin-1 auto) 🔤
├── /api/books                   # CRUD livres SQLite 💾
├── /api/bookmarks               # CRUD marque-pages SQLite 💾
├── /api/annotations             # CRUD annotations SQLite 🖊️
├── /api/flashcards              # CRUD flashcards SQLite 🧠
├── /api/proxy                   # Proxy web (import URL)
├── /api/gemini/summarize        # Résumés IA Gemini (10 req/min) 🧠
├── /api/gemini/define           # Dictionnaire IA Gemini (15 req/min)
└── /api/gemini/chat             # Coach Charly IA (20 req/min) 🤖

data/
└── speechify.db                 # Base SQLite (livres, marque-pages, annotations, flashcards) 💾
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
| v1.6 | Juin 2026 | **Sécurité** — CORS restrictif, rate limiting, Error Boundary React |
| v1.6 | Juin 2026 | **Perf** — code splitting (708→641 KB), `React.lazy` sur 3 composants ⚡ |
| v2.0 | Juin 2026 | **Annotations** — surlignage 4 couleurs + notes textuelles, persisté SQLite |
| v2.0 | Juin 2026 | **Flashcards** — deck vocabulaire + mode révision flip, persisté SQLite 🧠 |
| v2.0 | Juin 2026 | **Charly Coach IA** — chat contextuel sur le livre (résumé, quiz, analyse...) 🤖 |
| v2.0 | Juin 2026 | **SelectionPopup v2** — ajout boutons Annoter + Définir |
| v2.0 | Juin 2026 | **DictionaryModal** — bouton "Sauvegarder en flashcard" |
| v2.0 | Juin 2026 | **Fix TTS** — apostrophes typographiques normalisées (d'Amérique, l'homme...) |
| v2.0 | Juin 2026 | **SW v2** — NetworkFirst JS/CSS, nettoyage auto anciens caches |
| v2.0 | Juin 2026 | **Rate limiter** — 200 req/min sur `/api` uniquement (plus de blocage chargement) |
| v2.0 | Juin 2026 | **Bouton Charly flottant** 🤖 — accès au coach IA depuis la vue Lire |
| v2.0 | Juin 2026 | **PM2 production** — `dist/server.cjs` + NODE_ENV=production (RAM ÷4, zéro restart) |
| v2.1 | Juin 2026 | **Surlignage visuel** — passages annotés colorés dans le texte, note au survol ✨ |
| v2.1 | Juin 2026 | **Onglet Annotations** — panneau latéral : liste, navigation, suppression 🖊️ |
| v2.1 | Juin 2026 | **Popup lecteur complète** — Annoter + Définir câblés dans la vue Lire |
| v2.1 | Juin 2026 | **Flashcards depuis le lecteur** — sauvegarde d'un mot via le dictionnaire du TextViewer |
| v2.1 | Juin 2026 | **Dictionnaire FR** — fallback Wiktionnaire (définitions françaises natives) 📖 |
| v2.1 | Juin 2026 | **Charly réponses complètes** — maxOutputTokens 1500, fin de phrases garantie |
| v2.2 | Juin 2026 | **Librairie v2** — genres (15), top téléchargements, découverte aléatoire, pagination 📚 |
| v2.2 | Juin 2026 | **Couvertures réelles** — jaquettes Gutenberg + fallback dégradé + badges sujets |
| v2.2 | Juin 2026 | **État librairie persistant** — recherche/genre/pagination conservés entre onglets |
| v2.2 | Juin 2026 | **Import v2** — mode "Coller du texte", support Word (.docx) et HTML, dropzone redessinée ✍️ |
| v2.2 | Juin 2026 | **Perf bundle** — manualChunks vendor + PDF.js dynamique (bundle principal allégé) ⚡ |
| v2.2 | Juin 2026 | **Perf lecture** — `useMemo` découpage phrases (1 calcul/chapitre vs chaque render) |
| v2.2 | Juin 2026 | **Cache définitions** — table SQLite, mots déjà définis servis instantanément 💾 |
| v2.2 | Juin 2026 | **SW v3** — CacheFirst sur les assets hashés (chargements répétés instantanés) 🚀 |

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


