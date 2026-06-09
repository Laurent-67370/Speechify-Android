# 🎧 SpeechifyPro — Liseuse Audio Intelligente & Interactive

SpeechifyPro est une application web de lecture de livres électroniques (e-reader) ultra-moderne, spécialisée dans la conversion de documents textuels en flux vocaux clairs, naturels et dynamiques. Construite avec **React**, **Vite** et **Tailwind CSS**, elle offre une expérience d'écoute fluide d'arrière-plan, des statistiques quotidiennes stimulantes et une polyvalence d'affichage inégalée.

---

## 🌟 Fonctionnalités Majeures

### 1. Synthèse Vocale Premium (Text-to-Speech)
- **Voix Natives & Multi-langues :** Intégration en temps réel avec l'API Web Speech de votre navigateur, offrant un large catalogue de voix de haute qualité (Français, Anglais, Espagnol).
- **Contrôles Avancés de Lecture :** Ajustez précisément la vitesse d'élocution (de 0.5x à 3x), la hauteur tonale (pitch) et choisissez de sauvegarder vos préférences vocales spécifiquement par livre.
- **Interactivité "Click-to-Read" :** Cliquez sur n'importe quel segment de phrase dans le document actif pour y repositionner instantanément la tête de lecture vocale.

### 2. Gestion de Thèmes & Confort de Lecture
- **Nouveau Theme Toggler Fonctionnel :** Basculez instantanément depuis l'icône de la barre d'outils d'accueil (en haut à droite) entre :
  - **Mode Sombre Cosmique :** Un thème sombre ultra-élégant et eye-safe pour l'écoute nocturne.
  - **Mode Jour Raffiné (Crème) :** Un affichage haute clarté, doux sur fond crème sablé pour la lecture diurne.
- **Visualiseur Actif (Jumping Equalizer) :** Barre de son animée réactive à l'écoute sur l'écran d'accueil pour refléter l'activité audio en temps réel.

### 3. Importation Multi-formats & Librairie intégrée
- **Uploader Drag-&-Drop :** Glissez-déposez ou sélectionnez manuellement des livres électroniques au format **PDF** et **ePUB**, ou importez du texte brut (.txt).
- **Librairie Classique Universelle :** Accédez directement à des œuvres renommées pré-intégrées (Le Corbeau d'Edgar Allan Poe, Alice au Pays des Merveilles, Don Quichotte) pour commencer l'expérience sans attendre.

### 4. Statistiques de Consommation & Gamification
- **Suivi d'Objectifs Quotidiens :** Visualisez votre temps d'écoute quotidien en minutes par rapport à votre objectif modifiable personnalisé (ex: 30 minutes de lecture active par jour).
- **Progrès de Lecture :** Barre d'avancement globale du document et enregistrement persistant en local-storage pour reprendre la lecture exactement là où vous vous êtes arrêté.

### 5. Indexation, Sommaire & Signets (Bookmarks)
- **Menu Sommaire Réactif :** Accédez au tiroir latéral gauche pour basculer facilement entre les chapitres de l'œuvre.
- **Signets & Notes Écrites :** Enregistrez des passages clés avec des notes personnalisées pour référence future, triés par livre.
- **Recherche plein texte :** Localisez rapidement des mots-clés à travers tout le livre avec surbrillance dynamique du texte.

---

## 🛠️ Stack Technique

- **Framework :** React 18+ (TypeScript) avec Vite (compilation ultra-rapide).
- **Styling :** Tailwind CSS pour un design responsive pixel-perfect.
- **Animations :** Motion (`motion/react`) pour des transitions fluides et organiques entre les onglets et fenêtres modales.
- **Iconographie :** Lucide React.
- **Données / Stockage :** Persistance locale complète (`localStorage`) des préférences utilisateur, statistiques quotidiennes de lecture, signets et historique de livres.

---

## 🚀 Lancement du Projet en Développement

1. **Installation des dépendances :**
   ```bash
   npm install
   ```

2. **Lancement du serveur de développement local :**
   ```bash
   npm run dev
   ```
   *L'application s'exécute par défaut à l'adresse http://localhost:3000.*

3. **Validation & Qualité :**
   ```bash
   npm run lint
   ```

---

## 🗺️ Guide de l'Aide Intégrée

Vous pouvez à tout moment consulter le **Guide de démarrage** interactif directement depuis l'application en cliquant sur le bouton d'aide d'utilisation `?` situé en haut à droite du tableau de bord.
