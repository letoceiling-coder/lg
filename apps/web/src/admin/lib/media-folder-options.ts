import type { MediaFolderRow } from '@/admin/components/media-types';

/** Плоский список папок с человекочитаемым путём для выбора «переместить в…». */
export function buildFolderMoveOptions(
  folders: MediaFolderRow[],
  trashId: number | null,
): { id: number; label: string }[] {
  const map = new Map(folders.map((f) => [f.id, f] as const));
  const pathOf = (id: number): string => {
    const parts: string[] = [];
    let cur: MediaFolderRow | undefined = map.get(id);
    const guard = new Set<number>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      parts.unshift(cur.name);
      cur = cur.parentId != null ? map.get(cur.parentId) : undefined;
    }
    return parts.join(' / ');
  };
  return folders
    .filter((f) => !f.isTrash && (trashId == null || f.id !== trashId))
    .map((f) => ({ id: f.id, label: pathOf(f.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
