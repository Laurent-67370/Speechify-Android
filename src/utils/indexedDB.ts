import { DocumentBook } from '../types';

const DB_NAME = 'SpeechifyProDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

/**
 * Robust IndexedDB connection wrapper with Promise handles
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB n\'est pas supporté par ce navigateur.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('[IndexedDB] Échec de l\'ouverture :', event);
      reject(new Error('Impossible d\'ouvrir IndexedDB pour la liseuse.'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Returns all saved books sorted by acquisition date descending
 */
export async function getAllBooksFromDB(): Promise<DocumentBook[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = request.result || [];
        // Sort descending based on addedAt
        books.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(books);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Erreur de lecture :', event);
        reject(event);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] getAllBooks Exception :', err);
    return [];
  }
}

/**
 * Saves a single book to the DB
 */
export async function saveBookToDB(book: DocumentBook): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event);
    });
  } catch (err) {
    console.error('[IndexedDB] saveBookToDB Error :', err);
  }
}

/**
 * Removes a book from IndexedDB store by ID
 */
export async function deleteBookFromDB(bookId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(bookId);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event);
    });
  } catch (err) {
    console.error('[IndexedDB] deleteBookFromDB Error :', err);
  }
}

/**
 * Synchronizes the entire active React memory books list to IndexedDB.
 * Clears old entities and maps the full array gracefully.
 */
export async function saveAllBooksToDB(books: DocumentBook[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        if (books.length === 0) {
          resolve();
          return;
        }

        let completed = 0;
        let failed = false;

        books.forEach((book) => {
          const req = store.put(book);
          req.onsuccess = () => {
            completed++;
            if (completed === books.length && !failed) {
              resolve();
            }
          };
          req.onerror = (err) => {
            console.error('[IndexedDB] Échec de la sauvegarde d\'un livre :', err);
            if (!failed) {
              failed = true;
              reject(err);
            }
          };
        });
      };

      clearRequest.onerror = (e) => {
        console.error('[IndexedDB] Échec du nettoyage de la sauvegarde :', e);
        reject(e);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] saveAllBooks Exception :', err);
  }
}
