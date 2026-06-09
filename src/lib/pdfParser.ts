import { DocumentBook, Chapter } from '../types';

// Declare pdfjs types or globals
let pdfjsCached: any = null;

/**
 * Loads the PDF.js library from a reliable CDN dynamically
 */
export function loadPdfJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (pdfjsCached) {
      resolve(pdfjsCached);
      return;
    }

    if ((window as any).pdfjsLib) {
      pdfjsCached = (window as any).pdfjsLib;
      resolve(pdfjsCached);
      return;
    }

    // Create script tag for pdf.min.js
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        reject(new Error('PDF.js chargé mais l\'objet global pdfjsLib est introuvable.'));
        return;
      }
      
      // Set worker source URL
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      pdfjsCached = pdfjsLib;
      resolve(pdfjsLib);
    };

    script.onerror = () => {
      reject(new Error('Échec du chargement de la bibliothèque de lecture PDF (PDF.js).'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Clean and merge individual PDF text items into cohesive paragraphs
 */
function processTextItems(textContentItems: any[]): string[] {
  const lines: { text: string; y: number; x: number }[] = [];
  
  // 1. Group items into physical text lines using coordinate spacing
  textContentItems.forEach((item) => {
    if (!item.str || item.str.trim() === '') return;
    
    // transform elements: [scaleX, skewY, skewX, scaleY, transformX, transformY]
    const x = item.transform[4];
    const y = item.transform[5];
    
    lines.push({ text: item.str, y, x });
  });

  // Sort lines top-to-bottom, left-to-right
  lines.sort((a, b) => b.y - a.y || a.x - b.x);

  const paragraphs: string[] = [];
  let currentParagraph = '';
  let lastY = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (lastY === -1) {
      currentParagraph = line.text;
    } else {
      const yDifference = Math.abs(lastY - line.y);
      
      // If line coordinates have a significant gap, treat as new paragraph
      if (yDifference > 12) {
        if (currentParagraph.trim().length > 1) {
          paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = line.text;
      } else {
        // Otherwise, join line (e.g. hyphenation or column flow)
        if (currentParagraph.endsWith('-')) {
          currentParagraph = currentParagraph.slice(0, -1) + line.text;
        } else {
          currentParagraph += ' ' + line.text;
        }
      }
    }
    
    lastY = line.y;
  }

  if (currentParagraph.trim().length > 1) {
    paragraphs.push(currentParagraph.trim());
  }

  // Refine and split any extra long blocks on punctuation triggers
  const refinedParagraphs: string[] = [];
  paragraphs.forEach(p => {
    // Normalize spaces
    const cleanP = p.replace(/\s+/g, ' ').trim();
    if (cleanP.length > 5) {
      refinedParagraphs.push(cleanP);
    }
  });

  return refinedParagraphs;
}

export async function parsePdf(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<Omit<DocumentBook, 'progressPercent' | 'currentChapterIndex' | 'currentParagraphIndex' | 'addedAt'>> {
  
  // Ensure library is loaded
  const pdfjsLib = await loadPdfJS();
  
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  
  const chapters: Chapter[] = [];
  let fullTitle = file.name.replace(/\.pdf$/i, '');
  let author = 'Auteur inconnu';
  
  // Try to read metadata from PDF document
  try {
    const metadata = await pdfDoc.getMetadata();
    if (metadata && metadata.info) {
      if (metadata.info.Title && metadata.info.Title.trim().length > 0) {
        fullTitle = metadata.info.Title.trim();
      }
      if (metadata.info.Author && metadata.info.Author.trim().length > 0) {
        author = metadata.info.Author.trim();
      }
    }
  } catch (e) {
    console.warn('Metadata parsing failed. Falling back to default headers.', e);
  }

  // Parse page by page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }
    
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const paragraphs = processTextItems(textContent.items);
    
    const pageText = paragraphs.join('\n\n');
    const wordCount = pageText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Create chapter for this page (omit completely empty pages)
    if (paragraphs.length > 0) {
      chapters.push({
        id: `page_${pageNum}`,
        title: `Page ${pageNum}`,
        content: pageText,
        paragraphs,
        wordCount
      });
    }
  }

  if (chapters.length === 0) {
    throw new Error('Le document PDF semble vide ou est composé uniquement d\'images scannées.');
  }

  return {
    id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: fullTitle,
    author: author,
    language: 'fr', // Default, we will trigger detection in App
    type: 'pdf',
    chapters,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
  };
}
