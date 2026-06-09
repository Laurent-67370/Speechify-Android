/**
 * useServerSync — Hook React pour synchroniser les livres avec le backend SQLite VPS
 *
 * Stratégie :
 *  1. Au chargement → charge d'abord IndexedDB (rapide, hors ligne)
 *  2. En arrière-plan → fetch /api/books (serveur SQLite)
 *  3. Merge : le serveur est autoritaire pour la liste, IndexedDB reste le cache local
 *  4. Toute modification (ajout/MàJ/suppression) est envoyée au serveur ET à IndexedDB
 */

import { useCallback, useRef } from 'react';
import { DocumentBook, Bookmark } from '../types';

const API_BASE = '/api';
const SYNC_DEBOUNCE_MS = 2000; // délai avant envoi au serveur pour éviter les floods

// ── Helpers fetch ───────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      console.warn(`[ServerSync] ${path} → HTTP ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[ServerSync] ${path} fetch error:`, err);
    return null;
  }
}

// ── Hook principal ──────────────────────────────────────────────────────────

export function useServerSync() {
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Charger tous les livres depuis le serveur SQLite
   * Retourne [] si le serveur est inaccessible (fallback IndexedDB dans App.tsx)
   */
  const loadBooksFromServer = useCallback(async (): Promise<DocumentBook[]> => {
    const result = await apiFetch<{ books: DocumentBook[]; count: number }>('/books');
    if (!result) return [];
    console.log(`[ServerSync] ${result.count} livre(s) chargé(s) depuis le serveur`);
    return result.books || [];
  }, []);

  /**
   * Sauvegarder un livre sur le serveur (avec debounce pour éviter les floods)
   * Appelé à chaque changement de progression, position, etc.
   */
  const saveBookToServer = useCallback((book: DocumentBook): void => {
    // Annuler le timer précédent pour ce livre (debounce)
    const existing = saveTimers.current.get(book.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      saveTimers.current.delete(book.id);
      const result = await apiFetch<{ success: boolean }>('/books', {
        method: 'POST',
        body: JSON.stringify(book),
      });
      if (result?.success) {
        console.log(`[ServerSync] Livre sauvegardé : "${book.title}"`);
      }
    }, SYNC_DEBOUNCE_MS);

    saveTimers.current.set(book.id, timer);
  }, []);

  /**
   * Sauvegarder immédiatement (sans debounce) — pour les actions critiques
   * ex: fermeture de l'app, changement de livre
   */
  const saveBookToServerNow = useCallback(async (book: DocumentBook): Promise<void> => {
    const existing = saveTimers.current.get(book.id);
    if (existing) { clearTimeout(existing); saveTimers.current.delete(book.id); }
    await apiFetch<{ success: boolean }>('/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
  }, []);

  /**
   * Sauvegarder plusieurs livres en batch (utilisé à l'init pour migrer IndexedDB → serveur)
   */
  const saveBooksToServerBatch = useCallback(async (books: DocumentBook[]): Promise<void> => {
    if (!books.length) return;
    const result = await apiFetch<{ success: boolean; count: number }>('/books/batch', {
      method: 'POST',
      body: JSON.stringify({ books }),
    });
    if (result?.success) {
      console.log(`[ServerSync] Migration batch : ${result.count} livre(s) envoyé(s)`);
    }
  }, []);

  /**
   * Supprimer un livre du serveur
   */
  const deleteBookFromServer = useCallback(async (bookId: string): Promise<void> => {
    await apiFetch(`/books/${bookId}`, { method: 'DELETE' });
    console.log(`[ServerSync] Livre supprimé : ${bookId}`);
  }, []);

  /**
   * Charger les marque-pages d'un livre depuis le serveur
   */
  const loadBookmarksFromServer = useCallback(async (bookId: string): Promise<Bookmark[]> => {
    const result = await apiFetch<{ bookmarks: Bookmark[] }>(`/bookmarks/${bookId}`);
    return result?.bookmarks || [];
  }, []);

  /**
   * Sauvegarder un marque-page
   */
  const saveBookmarkToServer = useCallback(async (bookmark: Bookmark): Promise<void> => {
    await apiFetch('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(bookmark),
    });
  }, []);

  /**
   * Supprimer un marque-page
   */
  const deleteBookmarkFromServer = useCallback(async (bookmarkId: string): Promise<void> => {
    await apiFetch(`/bookmarks/${bookmarkId}`, { method: 'DELETE' });
  }, []);

  /**
   * Vérifier si le serveur est accessible
   */
  const isServerAvailable = useCallback(async (): Promise<boolean> => {
    const result = await apiFetch<{ books: unknown[] }>('/books');
    return result !== null;
  }, []);

  return {
    loadBooksFromServer,
    saveBookToServer,
    saveBookToServerNow,
    saveBooksToServerBatch,
    deleteBookFromServer,
    loadBookmarksFromServer,
    saveBookmarkToServer,
    deleteBookmarkFromServer,
    isServerAvailable,
  };
}
