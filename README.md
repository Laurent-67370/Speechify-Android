# 🎧 SpeechifyPro — Votre Liseuse Audio Intelligente & Interactive

Bienvenue sur **SpeechifyPro** ! Une expérience de lecture sonore immersive, conçue pour transformer n'importe quel ouvrage, fichier ePUB/PDF, ou article de presse web en une écoute fluide, captivante et animée. 

Que ce soit pour reposer vos yeux fatigués, réviser des concepts clés, ou vous instruire tout en cuisinant, laissez **Charly, votre compagnon de l'IA**, vous accompagner pas à pas !

---

## 🌟 Ce qui rend l'expérience Unique & Didactique

### 🤖 1. Charly, votre Guide Interactif & Didactique
- **Parcours d'Apprentissage Vivant :** Un assistant virtuel jovial vous explique le fonctionnement en 6 étapes animées (sélectionnable en haut à droite !).
- **Le Laboratoire Acoustique :** Entraînez-vous à façonner la voix de synthèse en temps réel. Sélectionnez vos préférences de vitesse ($0.5x$ à $2.5x$) et de tessiture (grave/aigu).
- **Entraînement "Clic-pour-Lire" :** Simules des clics de lecture directement dans le guide pour comprendre l'immédiateté du geste.
- **Le Grand Quiz des Lecteurs :** Validez vos connaissances avec un mini-quiz interactif amusant et décrochez votre brevet officiel de *Lecteur Intelligent* !

### 🔮 2. Les Résumés Extraordinaires par l'IA (Gemini 3.5 Flash)
- **Synthèse à la Carte :** En panne de temps ? Notre onglet dédié **Résumé IA** condense tout chapitre ou livre entier grâce au modèle Gemini 3.5 Flash.
- **4 Styles Uniques de Résumés :**
  - ⚖️ **Équilibré :** Un paragraphe introductif clair, suivi d'une liste structurée d'idées fortes.
  - 📌 **Points Clés :** Les notions capitales décortiquées sous forme de puces agrémentées d'émojis gais.
  - 🎓 **Pédagogique :** Idéal pour l'apprentissage, vulgarisant les termes techniques avec beaucoup de bienveillance.
  - ⚡ **Court :** Un condensé percutant de 3 à 5 phrases captivantes, idéal pour un mémo express.
- **Vocalisation Directe du Résumé :** Écoutez votre résumé intelligent en un clic grâce à la synthèse vocale intégrée, pour une mémorisation auditive maximale !

### ⛵ 3. Navigation Ultragranulaire & Transitions de Chapitres Fluides
- **Contrôles Ultra-Intelligents en Tête de Lecture :** Une barre de navigation redessinée, s'adaptant parfaitement aux écrans mobiles compacts, avec de grands boutons faciles d'accès pour sauter de chapitre en chapitre.
- **Butoir de Fin sans Zone Vide :** Élimination complète des espaces vides inutiles après le dernier paragraphe. À la place, une zone de complétion magnifique et engageante se présente en fin de lecture.
- **Boîte à Outils de Fin de Chapitre :** Un jalon interactif vous félicite en fin de lecture et propose immédiatement des raccourcis précieux :
  - ⚡ **Passer au chapitre suivant** d'un clic (avec rembobinage et défilement fluide vers le haut de la page).
  - 🔄 **Relire le chapitre** instantanément.
  - ✨ **Générer le résumé par l'IA** ou marquer la page.
- **Geste Naturel "Click-to-Read" :** Cliquez simplement sur n'importe quel paragraphe pour déplacer instantanément le flux de lecture vocale à cet endroit précis.

### 🌌 4. Confort d'Affichage & Design de Pointe
- **Thème Sombre Cosmique (Night Mode) :** Un canevas noir profond, apaisant et mystique pour vos écoutes nocturnes.
- **Thème Jour Raffiné (Sable) :** Un rendu crème de style littéraire, ménageant la rétine même en plein soleil.
- **Égaliseur Virtuel Réactif :** Une onde audio en mouvement qui vibre et ondule en temps réel au rythme de la voix.
- **Mini-Lecteur Flottant Global :** Naviguez librement dans la bibliothèque ou les synthèses pendant que le lecteur continue l'expérience audio en arrière-plan !

### 📚 5. Bibliothèque Immense de Classiques (12 Ouvrages Emblématiques)
La sélection Gutenberg de départ a été multipliée par trois, offrant désormais un éventail captivant de classiques préconfigurés, d'un simple clic :
- 🇫🇷 **Sélection Française :** *Madame Bovary* (Gustave Flaubert), *Candide* (Voltaire), *Le Horla* (Guy de Maupassant), et *Les Fleurs du Mal* (Charles Baudelaire).
- 🇬🇧 **Sélection Anglaise :** *The Picture of Dorian Gray* (Oscar Wilde), *Moby Dick* (Herman Melville), *Huckleberry Finn* (Mark Twain), et *The Metamorphosis* (Franz Kafka).
- 🇪🇸 **Sélection Espagnole :** *La Celestina* (Fernando de Rojas), *La vida del Buscón* (Francisco de Quevedo), *Novelas Ejemplares* (Cervantes), et *Marianela* (Pérez Galdós).
- **Importation Personnalisée :** Intégrez vos propres documents locaux ePUB et PDF avec détection automatique de la langue, ou saisissez simplement une URL web pour parser un article en un instant.

---

## 🛠️ Stack Technique & Technologies

- **Frontend :** ⚡ React 18+ (avec TypeScript) et Vite pour une réactivité instantanée.
- **Moteur d'Animations :** 🚀 Motion (`motion/react`) assurant des micro-animations et des transitions d'onglets hautement fluides.
- **Design & Styles :** 🎨 Tailwind CSS configuré avec des palettes d'excellence littéraire.
- **Moteur d'IA :** 🤖 SDK officiel Google GenAI (`@google/genai`) exécutant les requêtes Gemini 3.5 Flash côté serveur.
- **Serveur & Proxy robuste :** 💻 Serveur Node/Express pour le proxy d'extraction web et l'appel sécurisé des API sans blocage CORS.

---

## 🚀 Guide de Démarrage Rapide

### 1. Cloner et installer les paquets
```bash
npm install
```

### 2. Configurer le secret d'IA Gemini (Optionnel)
Pour pouvoir demander des résumés intelligents à l'IA, créez un fichier `.env` à la racine de votre environnement ou renseignez-y vote clé :
```env
GEMINI_API_KEY=votre_cle_api_ici
```

### 3. Lancer l'application de développement
```bash
npm run dev
```
*L'application s'ouvre sur le port réservé http://localhost:3000.*

### 4. Linter la structure de code pour préserver la qualité
```bash
npm run lint
```

---

## 🎯 Rejoignez l'aventure didactique !
Cliquez sur l'icône de point d'interrogation **`?`** sur le bord supérieur droit de l'application pour déclencher Charly et commencer votre premier voyage littéraire dès aujourd'hui ! Bonne écoute ! 🎧
