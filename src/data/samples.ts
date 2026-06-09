import { DocumentBook } from '../types';

export const SAMPLES: DocumentBook[] = [
  {
    id: 'sample_fr',
    title: 'Fables de La Fontaine (Sélection)',
    author: 'Jean de La Fontaine',
    language: 'fr',
    type: 'sample',
    chapters: [
      {
        id: 'fr_intro',
        title: 'Introduction aux Fables',
        content: `Les Fables de La Fontaine sont écrites dans un style poétique, vif et haut en couleur. Utilisant la ruse des animaux pour caricaturer la comédie humaine, Jean de La Fontaine livre des leçons morales intemporelles de sagesse, de tolérance et d'esprit. Bienvenue dans l'univers de la fable classique française où les mots chantent à voix haute.`,
        paragraphs: [
          `Les Fables de La Fontaine sont écrites dans un style poétique, vif et haut en couleur.`,
          `Utilisant la ruse des animaux pour caricaturer la comédie humaine, Jean de La Fontaine livre des leçons morales intemporelles de sagesse, de tolérance et d'esprit.`,
          `Bienvenue dans l'univers de la fable classique française où les mots chantent à voix haute.`
        ],
        wordCount: 52
      },
      {
        id: 'fr_corbeau',
        title: 'Le Corbeau et le Renard',
        content: `Maître Corbeau, sur un arbre perché, tenait en son bec un fromage.
Maître Renard, par l'odeur alléché, lui tint à peu près ce langage :
« Hé ! bonjour, Monsieur du Corbeau. Que vous êtes joli ! que vous me semblez beau !
Sans mentir, si votre ramage se rapporte à votre plumage, vous êtes le Phénix des hôtes de ces bois. »
À ces mots le Corbeau ne se sent pas de joie ; et pour montrer sa belle voix, il ouvre un large bec, laisse tomber sa proie.
Le Renard s'en saisit, et dit : « Mon bon Monsieur, apprenez que tout flatteur vit aux dépens de celui qui l'écoute : cette leçon vaut bien un fromage, sans doute. »
Le Corbeau, honteux et confus, jura, mais un peu tard, qu'on ne l'y prendrait plus.`,
        paragraphs: [
          `Maître Corbeau, sur un arbre perché, tenait en son bec un fromage.`,
          `Maître Renard, par l'odeur alléché, lui tint à peu près ce langage :`,
          `« Hé ! bonjour, Monsieur du Corbeau. Que vous êtes joli ! que vous me semblez beau !`,
          `Sans mentir, si votre ramage se rapporte à votre plumage, vous êtes le Phénix des hôtes de ces bois. »`,
          `À ces mots le Corbeau ne se sent pas de joie ; et pour montrer sa belle voix, il ouvre un large bec, laisse tomber sa proie.`,
          `Le Renard s'en saisit, et dit : « Mon bon Monsieur, apprenez que tout flatteur vit aux dépens de celui qui l'écoute : cette leçon vaut bien un fromage, sans doute. »`,
          `Le Corbeau, honteux et confus, jura, mais un peu tard, qu'on ne l'y prendrait plus.`
        ],
        wordCount: 133
      },
      {
        id: 'fr_cigale',
        title: 'La Cigale et la Fourmi',
        content: `La Cigale, ayant chanté tout l'été, se trouva fort dépourvue quand la bise fut venue : pas un seul petit morceau de mouche ou de vermisseau.
Elle alla crier famine chez la Fourmi sa voisine, la priant de lui prêter quelque grain pour subsister jusqu'à la saison nouvelle.
« Je vous paierai, lui dit-elle, avant l'août, foi d'animal, intérêt et principal. »
La Fourmi n'est pas prêteuse : c'est là son moindre défaut.
« Que faisiez-vous au temps chaud ? dit-elle à cette emprunteuse.
— Nuit et jour à tout venant je chantais, ne vous déplaise.
— Vous chantiez ? j'en suis fort aise : eh bien ! dansez maintenant. »`,
        paragraphs: [
          `La Cigale, ayant chanté tout l'été, se trouva fort dépourvue quand la bise fut venue : pas un seul petit morceau de mouche ou de vermisseau.`,
          `Elle alla crier famine chez la Fourmi sa voisine, la priant de lui prêter quelque grain pour subsister jusqu'à la saison nouvelle.`,
          `« Je vous paierai, lui dit-elle, avant l'août, foi d'animal, intérêt et principal. »`,
          `La Fourmi n'est pas prêteuse : c'est là son moindre défaut.`,
          `« Que faisiez-vous au temps chaud ? dit-elle à cette emprunteuse.`,
          `— Nuit et jour à tout venant je chantais, ne vous déplaise.`,
          `— Vous chantiez ? j'en suis fort aise : eh bien ! dansez maintenant. »`
        ],
        wordCount: 119
      }
    ],
    progressPercent: 0,
    currentChapterIndex: 0,
    currentParagraphIndex: 0,
    addedAt: 1773000000000
  },
  {
    id: 'sample_en',
    title: 'The Road Not Taken & Poetry',
    author: 'Robert Frost',
    language: 'en',
    type: 'sample',
    chapters: [
      {
        id: 'en_road',
        title: 'The Road Not Taken',
        content: `Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood and looked down one as far as I could to where it bent in the undergrowth.
Then took the other, as just as fair, and having perhaps the better claim, because it was grassy and wanted wear; though as for that the passing there had worn them really about the same.
And both that morning equally lay in leaves no step had trodden black. Oh, I kept the first for another day! Yet knowing how way leads on to way, I doubted if I should ever come back.
I shall be telling this with a sigh somewhere ages and ages hence: two roads diverged in a wood, and I—I took the one less traveled by, and that has made all the difference.`,
        paragraphs: [
          `Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood and looked down one as far as I could to where it bent in the undergrowth.`,
          `Then took the other, as just as fair, and having perhaps the better claim, because it was grassy and wanted wear; though as for that the passing there had worn them really about the same.`,
          `And both that morning equally lay in leaves no step had trodden black. Oh, I kept the first for another day! Yet knowing how way leads on to way, I doubted if I should ever come back.`,
          `I shall be telling this with a sigh somewhere ages and ages hence: two roads diverged in a wood, and I—I took the one less traveled by, and that has made all the difference.`
        ],
        wordCount: 144
      }
    ],
    progressPercent: 0,
    currentChapterIndex: 0,
    currentParagraphIndex: 0,
    addedAt: 1773000002000
  },
  {
    id: 'sample_es',
    title: 'Caminante no hay camino',
    author: 'Antonio Machado',
    language: 'es',
    type: 'sample',
    chapters: [
      {
        id: 'es_camino',
        title: 'Proverbios y cantares (XXIX)',
        content: `Caminante, son tus huellas el camino y nada más; caminante, no hay camino, se hace camino al andar.
Al andar se hace camino, y al volver la vista atrás se ve la senda que nunca se ha de volver a pisar.
Caminante no hay camino sino estelas en la mar.`,
        paragraphs: [
          `Caminante, son tus huellas el camino y nada más; caminante, no hay camino, se hace camino al andar.`,
          `Al andar se hace camino, y al volver la vista atrás se ve la senda que nunca se ha de volver a pisar.`,
          `Caminante no hay camino sino estelas en la mar.`
        ],
        wordCount: 52
      }
    ],
    progressPercent: 0,
    currentChapterIndex: 0,
    currentParagraphIndex: 0,
    addedAt: 1773000003000
  }
];
