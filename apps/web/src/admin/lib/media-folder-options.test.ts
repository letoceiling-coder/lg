import { describe, it, expect } from 'vitest';
import { buildFolderMoveOptions } from './media-folder-options';
import type { MediaFolderRow } from '@/admin/components/media-types';

describe('buildFolderMoveOptions', () => {
  it('строит пути и исключает корзину', () => {
    const folders: MediaFolderRow[] = [
      { id: 1, parentId: null, name: 'Корзина', isTrash: true },
      { id: 2, parentId: null, name: 'Загрузки', isTrash: false },
      { id: 3, parentId: 2, name: 'Планы', isTrash: false },
    ];
    const opts = buildFolderMoveOptions(folders, 1);
    expect(opts.map((o) => o.id).sort((a, b) => a - b)).toEqual([2, 3]);
    expect(opts.find((o) => o.id === 2)?.label).toBe('Загрузки');
    expect(opts.find((o) => o.id === 3)?.label).toBe('Загрузки / Планы');
  });
});
