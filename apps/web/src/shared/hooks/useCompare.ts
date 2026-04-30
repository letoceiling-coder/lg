import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'lg_compare';
const MAX_ITEMS = 3;

/** В localStorage: slug ЖК ИЛИ ключ объявления `l:<listingId>`. */

function readStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>(readStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_ITEMS) return prev;
      return [...prev, id];
    });
  }, []);

  const isCompared = useCallback((id: string) => ids.includes(id), [ids]);
  const clear = useCallback(() => setIds([]), []);
  const remove = useCallback((id: string) => setIds(prev => prev.filter(x => x !== id)), []);

  return { ids, toggle, isCompared, clear, remove, count: ids.length };
}
