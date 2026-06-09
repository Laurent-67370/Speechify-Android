import { DocumentBook, Chapter } from '../types';

/**
 * Clean up HTML of unneeded elements that represent non-content widgets.
 */
function pruneHtmlNoise(doc: Document): void {
  // Selectors of tags and classes that are typical page clutter
  const selectorsToExclude = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 'header', 'aside',
    'form', 'button', 'input', 'textarea', 'select', 'head', 'canvas', 'video', 'audio',
    'dialog', 'template', 'kbd',
    '.nav', '.navigation', '.footer', '.header', '.menu', '.sidebar', '.comments', '.comment',
    '.ads', '.advertisement', '.share', '.social', '.related', '.recommendations', '.popup',
    '#footer', '#header', '#sidebar', '#comments', '#comment-section', '#menu', '.widget',
    '.meta', '.breadcrumbs', '.breadcrumb', '.actions', '.button-group', '.advert', '.banner'
  ];

  selectorsToExclude.forEach(sel => {
    try {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    } catch (e) {
      // Graceful ignore if any selector is invalid in some browsers
    }
  });
}

/**
 * Smart detection of the core text container within the web document.
 */
function findMainContentContainer(doc: Document): Element {
  const possibleContainers = [
    'article', 
    'main', 
    '[role="main"]', 
    '#content', 
    '.content', 
    '.post', 
    '.article', 
    '#main-content',
    '.main-content',
    '.post-content',
    '.entry-content',
    '#main',
    '.main'
  ];

  for (const sel of possibleContainers) {
    try {
      const found = doc.querySelector(sel);
      if (found) {
        // Must contain at least a couple of paragraphs to be a valid core text block
        const pCount = found.querySelectorAll('p').length;
        if (pCount >= 2) {
          return found;
        }
      }
    } catch (e) {
      // Ignore selector errors
    }
  }

  return doc.body || doc.documentElement;
}

/**
 * Fetch HTML of a webpage using robust fallback CORS proxies.
 */
export async function fetchWebpageHtml(url: string, onProgress?: (msg: string) => void): Promise<string> {
  const proxyFetchers = [
    // 1. Local backend proxy (Extremely robust, bypasses client CORS completely because it is server-to-server)
    async (targetUrl: string) => {
      onProgress?.('Récupération sécurisée via le serveur local...');
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const body = await res.text();
        if (body && body.length > 500) return body;
      }
      throw new Error('Le serveur local a rencontré un problème ou n\'a renvoyé aucun contenu.');
    },
    // 2. corsproxy.io (Very fast direct get)
    async (targetUrl: string) => {
      onProgress?.('Connexion au proxy CORS (corsproxy.io)...');
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const body = await res.text();
        if (body && body.length > 500) return body;
      }
      throw new Error('corsproxy.io vide ou refusé');
    },
    // 3. api.codetabs.com (Reliable and fast alternative proxy)
    async (targetUrl: string) => {
      onProgress?.('Essai du proxy de secours (codetabs)...');
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const body = await res.text();
        if (body && body.length > 500) return body;
      }
      throw new Error('codetabs vide ou refusé');
    },
    // 4. allorigins.win API (JSON wrapped, extremely resilient as executed on server)
    async (targetUrl: string) => {
      onProgress?.('Essai du proxy résilient (allorigins api)...');
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.contents && data.contents.length > 500) {
          return data.contents;
        }
      }
      throw new Error('allorigins api vide ou refusé');
    },
    // 5. allorigins.win direct raw redirection
    async (targetUrl: string) => {
      onProgress?.('Essai de redirection brute (allorigins raw)...');
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const body = await res.text();
        if (body && body.length > 500) return body;
      }
      throw new Error('allorigins raw vide ou refusé');
    }
  ];

  let lastError: any = null;

  for (const fetcher of proxyFetchers) {
    try {
      const html = await fetcher(url);
      if (html) return html;
    } catch (e: any) {
      console.warn('Proxy fetch failed:', e.message || e);
      lastError = e;
    }
  }

  throw new Error(
    `Impossible de récupérer le contenu de ce site web. Les serveurs de sécurité du site hôte ou des proxies bloquent l'accès. URL d'essai : ${url}. Détails : ${lastError?.message || lastError}`
  );
}

/**
 * Parsers a webpage HTML into a structured DocumentBook
 */
export function parseWebpageHtml(url: string, html: string): Omit<DocumentBook, 'progressPercent' | 'currentChapterIndex' | 'currentParagraphIndex' | 'addedAt'> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find host domain for authorship metadata
  let authorHost = 'Site Web';
  try {
    const urlObj = new URL(url);
    authorHost = urlObj.hostname.replace('www.', '');
  } catch (e) {
    // Keep fallback
  }

  // Find meta author tag if available
  const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                     doc.querySelector('meta[property="article:author"]')?.getAttribute('content');
  const author = metaAuthor ? `${metaAuthor.trim()} (${authorHost})` : authorHost;

  // Retrieve page title or heading title
  let title = doc.querySelector('title')?.textContent?.trim() || 
              doc.querySelector('h1')?.textContent?.trim() || 
              'Article sans titre';

  // Clean trailing branding from title (e.g., "Title - BrandName")
  if (title.includes(' - ')) {
    title = title.split(' - ')[0].trim();
  } else if (title.includes(' | ')) {
    title = title.split(' | ')[0].trim();
  }

  // Detect content language
  let language = doc.documentElement?.getAttribute('lang') || 'fr';
  if (language) {
    language = language.substring(0, 2).toLowerCase();
  }
  if (!['fr', 'en', 'es', 'de', 'it'].includes(language)) {
    // If we detect typical french words in the page
    const sampleText = doc.body?.textContent?.substring(0, 1000) || '';
    if (/\b(les|des|dans|pour|avec|être)\b/i.test(sampleText)) {
      language = 'fr';
    } else {
      language = 'en'; // default baseline
    }
  }

  // Prune noise first
  pruneHtmlNoise(doc);

  // Find content body
  const container = findMainContentContainer(doc);

  // Query remaining block-level text tags
  const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, li');

  const chapters: { title: string; paragraphs: string[] }[] = [];
  let currentChapterTitle = 'Introduction';
  let currentParagraphs: string[] = [];

  elements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    const text = el.textContent?.trim();

    if (!text || text.length < 5) return;

    // Is it a header? Starts a new chapter division
    if (tagName.startsWith('h')) {
      if (currentParagraphs.length >= 2) {
        chapters.push({
          title: currentChapterTitle,
          paragraphs: [...currentParagraphs]
        });
        currentParagraphs = [];
      }
      
      // Upgrade Chapter Title
      // Prepend header marker or keep it simple
      currentChapterTitle = text;
    } else {
      // Standard text element inside current chapter, keep is as paragraph
      // If it's a long paragraph or blockquote, add it
      // Standardize the item spacing a bit (especially for list items)
      if (tagName === 'li') {
        currentParagraphs.push('• ' + text);
      } else {
        currentParagraphs.push(text);
      }
    }
  });

  // Collect residuals
  if (currentParagraphs.length > 0 || chapters.length === 0) {
    chapters.push({
      title: currentChapterTitle,
      paragraphs: currentParagraphs.length > 0 ? currentParagraphs : ['[Contenu de la page extrait sans paragraphes typiques. Les paragraphes sont peut-être masqués par des scripts ou requièrent une connexion.]']
    });
  }

  // Filter out duplicate or empty chapters/paragraphs
  const cleanChapters = chapters.map(ch => ({
    title: ch.title,
    paragraphs: ch.paragraphs.filter(p => p && p.trim().length > 0)
  })).filter(ch => ch.paragraphs.length > 0);

  // Fallback if we ended up with nothing readable
  if (cleanChapters.length === 0) {
    cleanChapters.push({
      title: 'Article extrait',
      paragraphs: [
        'Le site n\'a pas renvoyé de texte structuré identifiable.',
        'La page est vide ou son texte est dynamique (généré par JavaScript client), ce qui empêche sa récupération autonome par notre proxy hors ligne.',
        'Vous pouvez copier-coller directement le texte ou importer le document au format PDF si possible.'
      ]
    });
  }

  // Map into strictly structured Chapter interfaces
  const typedChapters: Chapter[] = cleanChapters.map((ch, idx) => {
    const content = ch.paragraphs.join('\n\n');
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return {
      id: `web_ch_${idx}`,
      title: ch.title,
      content,
      paragraphs: ch.paragraphs,
      wordCount
    };
  });

  return {
    id: `web_${Date.now()}`,
    title,
    author,
    language,
    type: 'web',
    chapters: typedChapters
  };
}
