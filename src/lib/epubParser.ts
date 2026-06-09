import JSZip from 'jszip';
import { DocumentBook, Chapter } from '../types';

/**
 * Clean HTML and convert to text while preserving paragraph structure
 */
function extractParagraphs(htmlContent: string): { paragraphs: string[]; cleanText: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Try to find structural paragraphs first
  const pElements = Array.from(doc.querySelectorAll('p, blockquote, li, h1, h2, h3, h4'));
  const paragraphs: string[] = [];
  
  if (pElements.length > 0) {
    pElements.forEach((el) => {
      const text = (el.textContent || '').trim();
      // Skip very short or empty lines
      if (text.length > 1) {
        paragraphs.push(text);
      }
    });
  }
  
  // If no paragraphs found, fallback to block-level splitting or newline splits
  if (paragraphs.length === 0) {
    const text = (doc.body.textContent || '').trim();
    text.split(/\n+/).forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine.length > 2) {
        paragraphs.push(cleanLine);
      }
    });
  }

  const cleanText = paragraphs.join('\n\n');
  return { paragraphs, cleanText };
}

/**
 * Get the text content of a title or first heading from HTML
 */
function extractChapterTitle(htmlContent: string, fallback: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const heading = doc.querySelector('h1, h2, h3, title');
  if (heading && heading.textContent) {
    const titleText = heading.textContent.trim();
    if (titleText.length > 1 && titleText.length < 100) {
      return titleText;
    }
  }
  return fallback;
}

/**
 * Resolves a file path relative to a base directory
 */
function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.substring(1);
  }
  
  const baseParts = basePath.split('/');
  baseParts.pop(); // Remove the filename to get directory path
  
  const relativeParts = relativePath.split('/');
  
  for (const part of relativeParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  
  return baseParts.filter(p => p !== '').join('/');
}

export async function parseEpub(file: File): Promise<Omit<DocumentBook, 'progressPercent' | 'currentChapterIndex' | 'currentParagraphIndex' | 'addedAt'>> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // 1. Read container.xml to locate the OPF document
  const containerXmlStr = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXmlStr) {
    throw new Error('Fichier META-INF/container.xml manquant.');
  }
  
  const domParser = new DOMParser();
  const containerDoc = domParser.parseFromString(containerXmlStr, 'text/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');
  
  if (!opfPath) {
    throw new Error('Impossible de localiser le fichier OPF.');
  }
  
  // OPF base directory to resolve relative paths in the manifest
  let opfDir = '';
  const lastSlash = opfPath.lastIndexOf('/');
  if (lastSlash !== -1) {
    opfDir = opfPath.substring(0, lastSlash + 1);
  }
  
  const opfStr = await zip.file(opfPath)?.async('string');
  if (!opfStr) {
    throw new Error('Fichier OPF manquant ou illisible.');
  }
  
  const opfDoc = domParser.parseFromString(opfStr, 'text/xml');
  
  // 2. Parse Metadata
  const titleEl = opfDoc.querySelector('title, dc\\:title');
  const creatorEl = opfDoc.querySelector('creator, dc\\:creator');
  const langEl = opfDoc.querySelector('language, dc\\:language');
  
  const title = titleEl?.textContent || file.name.replace(/\.epub$/i, '') || 'Livre sans titre';
  const author = creatorEl?.textContent || 'Auteur inconnu';
  const language = langEl?.textContent || 'fr';
  
  // 3. Parse Manifest (maps manifest index ID to relative file path)
  const manifestItems = opfDoc.querySelectorAll('manifest > item');
  const manifestMap = new Map<string, { href: string; mediaType: string }>();
  
  manifestItems.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    if (id && href && mediaType) {
      manifestMap.set(id, { href, mediaType });
    }
  });
  
  // 4. Parse Spine (defines reading order)
  const spineItems = opfDoc.querySelectorAll('spine > itemref');
  const chapters: Chapter[] = [];
  
  for (let i = 0; i < spineItems.length; i++) {
    const itemref = spineItems[i];
    const idref = itemref.getAttribute('idref');
    if (!idref) continue;
    
    const manifestItem = manifestMap.get(idref);
    if (!manifestItem) continue;
    
    // Only load HTML/XHTML spin content
    if (manifestItem.mediaType.includes('html') || manifestItem.mediaType.includes('xml')) {
      const relativeHref = manifestItem.href;
      // Resolve path
      const fullPath = opfDir ? opfDir + relativeHref : relativeHref;
      
      // Look up zip entry with normalized exact path
      let fileEntry = zip.file(fullPath);
      if (!fileEntry) {
        // Try absolute-like resolution fallback
        const decodedPath = decodeURIComponent(fullPath);
        fileEntry = zip.file(decodedPath) || zip.file(resolvePath(opfPath, relativeHref));
      }
      
      if (fileEntry) {
        const xhtmlContent = await fileEntry.async('string');
        const fallbackTitle = `Chapitre ${chapters.length + 1}`;
        const chapterTitle = extractChapterTitle(xhtmlContent, fallbackTitle);
        const { paragraphs, cleanText } = extractParagraphs(xhtmlContent);
        
        // Skip chapters with zero content (empty spacer files)
        if (cleanText.trim().length > 0) {
          const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
          
          chapters.push({
            id: idref,
            title: chapterTitle,
            content: xhtmlContent,
            paragraphs,
            wordCount
          });
        }
      }
    }
  }
  
  // 5. Build dynamic cover if available
  let coverUrl = '';
  // Try to find cover item in manifest
  const coverItem = Array.from(manifestItems).find(
    item => item.getAttribute('id')?.includes('cover') || item.getAttribute('properties')?.includes('cover-image')
  );
  if (coverItem) {
    const coverHref = coverItem.getAttribute('href');
    if (coverHref) {
      const coverPath = opfDir ? opfDir + coverHref : coverHref;
      const coverFile = zip.file(coverPath);
      if (coverFile) {
        const coverBlob = await coverFile.async('blob');
        coverUrl = URL.createObjectURL(coverBlob);
      }
    }
  }
  
  return {
    id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title,
    author,
    language: language.substring(0, 2).toLowerCase(),
    type: 'epub',
    chapters,
    coverUrl,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
  };
}
