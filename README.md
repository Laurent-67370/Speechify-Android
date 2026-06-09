# 🎧 SpeechifyPro — Votre Liseuse Audio Intelligente & Interactive

Bienvenue sur **SpeechifyPro** ! Une expérience de lecture sonore immersive, conçue pour transformer n'importe quel ouvrage, fichier ePUB/PDF, ou article de presse web en une écoute fluide, captivante et animée. 

Que ce soit pour reposer vos yeux fatigués, réviser des concepts clés, ou vous instruire tout en cuisinant, laissez **Charly, votre compagnon de l'IA**, vous accompagner pas à pas !

---

## 🌟 Ce qui rend l'expérience Unique & Didactique

### 🤖 1. Charly, votre Guide Interactif & Didactique
- **Parcours d'Apprentissage Vivant :** Un assistant virtuel jovial vous explique le fonctionnement en 6 étapes animées (sélectionnable en haut à droite !).
- **Le Laboratoire Acoustique :** Entraînez-vous à façonner la voix de synthèse en temps réel. Sélectionnez vos préférences de vitesse ($0.5x$ à $2.5x$) et de tessiture (grave/aigu).
- **Entraînement "Clic-pour-Lire" :** Simulez des clics de lecture directement dans le guide pour comprendre l'immédiateté du geste.
- **Le Grand Quiz des Lecteurs :** Validez vos connaissances avec un mini-quiz interactif amusant et décrochez votre brevet officiel de *Lecteur Intelligent* !

### 🔮 2. Les Résumés Extraordinaires par l'IA (Gemini 3.5 Flash)
- **Synthèse à la Carte :** En panne de temps ? Notre onglet dédié **Résumé IA** condense tout chapitre ou livre entier grâce au modèle Gemini 3.5 Flash.
- **4 Styles Uniques de Résumés :**
  - ⚖️ **Équilibré :** Un paragraphe introductif clair, suivi d'une liste structurée d'idées fortes.
  - 📌 **Points Clés :** Les notions capitales décortiquées sous forme de puces agrémentées d'émojis gais.
  - 🎓 **Pédagogique :** Idéal pour l'apprentissage, vulgarisant les termes techniques avec beaucoup de bienveillance.
  - ⚡ **Court :** Un condensé percutant de 3 à 5 phrases captivantes, idéal pour un mémo express.
- **Vocalisation Directe du Résumé :** Écoutez votre résumé intelligent en un clic grâce à la synthèse vocale intégrée, pour une mémorisation auditive maximale !

### ⚡ 3. Geste Naturel "Click-to-Read"
- **Navigation au Doigt et à l'Œil :** Cliquez simplement sur n'importe quel paragraphe du livre pour que l'orateur reprenne précisément la lecture à cet endroit. Plus besoin d'avancer ou de reculer à l'aveugle !

### 🌌 4. Confort d'Affichage & Design de Pointe
- **Thème Sombre Cosmique (Night Mode) :** Un canevas noir profond, apaisant et mystique pour vos écoutes nocturnes.
- **Thème Jour Raffiné (Sable) :** Un rendu crème ultra-agréable et lumineux, ménageant la rétine en plein soleil.
- **Égaliseur Virtuel Réactif :** Une onde audio bondissante au design épuré sur l'accueil, qui danse au rythme de la lecture vocale.
- **Mini-Lecteur Flottant Global :** Naviguez sur votre tableau de bord ou dans la librairie tout en continuant d'écouter votre livre de manière fluide en arrière-plan !

### 📚 5. Bibliothèque Universelle & Importateur Multimodes
- **Le Projet Gutenberg intégré :** Accédez directement à plus de 70 000 classiques universels gratuits (Jules Verne, Victor Hugo, Jane Austen) et importez-les en un seul clic !
- **Lecteur Intelligent d'Articles Web (URL) :** Collez le lien internet d'un blog, d'un article de journal ou d'une page Wikipédia. Notre serveur extrait et nettoie instantanément le corps de texte pour l'orner d'une lecture épurée de toute publicité.
- **Dossiers Personnels :** Choisissez ou glissez-déposez vos fichiers ePUB et PDF locaux avec détection automatique de la langue.

---

## 🛠️ Stack Technique & Technologies

- **Frontend :** ⚡ React 18+ (avec TypeScript) et Vite pour une réactivité instantanée.
- **Moteur d'Animations :** 🚀 Motion (`motion/react`) assurant des micro-animations et des transitions d'onglets particulièrement soignées.
- **Design & Styles :** 🎨 Tailwind CSS configuré avec des palettes haut de gamme et des typographies lisibles.
- **Moteur d'IA :** 🤖 SDK officiel Google GenAI (`@google/genai`) exécutant les requêtes Gemini 3.5 Flash en toute sécurité côté serveur.
- **Serveur & Proxy robuste :** 💻 Serveur Node/Express pour le proxy d'extraction web et l'appel sécurisé des API sans blocage CORS.

---

## 🚀 Guide de Démarrage Rapide

### 1. Cloner et installer les paquets
```bash
npm install
```

### 2. Configurer le secret d'IA Gemini (Optionnel)
Pour pouvoir demander des résumés intelligents à l'IA, créez un fichier `.env` à la racine (ou via l'onglet Clés d'API d'AI Studio) et renseignez-y vote clé :
```env
GEMINI_API_KEY=votre_cle_api_ici
```

### 3. Lancer l'application de développement
```bash
npm run dev
```
*L'application s'ouvre magiquement sur votre port réservé http://localhost:3000.*

### 4. Linter la structure de code pour préserver la qualité
```bash
npm run lint
```

---

## 🎯 Rejoignez l'aventure didactique !
Cliquez sur l'icône de point d'interrogation **`?`** sur le bord supérieur droit de l'application pour déclencher Charly et commencer votre premier voyage littéraire dès aujourd'hui ! Bonne écoute ! 🎧
