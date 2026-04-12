import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderPlus, Image as ImageIcon, Loader2, Trash2, Undo2 } from 'lucide-react';
import { apiDelete, apiGet, apiPost, apiPostForm, ApiError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MediaFileRow, MediaFolderRow } from './media-types';
import { buildFolderMoveOptions } from '@/admin/lib/media-folder-options';
import MediaFileMoveSelect from '@/admin/components/MediaFileMoveSelect';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  multiple?: boolean;
  onPick: (items: { id: number; url: string }[]) => void;
};

function buildTree(folders: MediaFolderRow[]) {
  const byParent = new Map<string, MediaFolderRow[]>();
  for (const f of folders) {
    const k = f.parentId == null ? 'root' : String(f.parentId);
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(f);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }
  return byParent;
}

function FolderTree({
  byParent,
  trashId,
  uploadsId,
  currentId,
  depth,
  parentKey,
  onSelect,
}: {
  byParent: Map<string, MediaFolderRow[]>;
  trashId: number | null;
  uploadsId: number | null;
  currentId: number | null;
  depth: number;
  parentKey: string;
  onSelect: (id: number | null) => void;
}) {
  const nodes = byParent.get(parentKey) ?? [];
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'ml-2 border-l border-border pl-2 space-y-0.5 mt-0.5'}>
      {nodes.map((n) => {
        if (trashId != null && n.id === trashId) return null;
        if (uploadsId != null && n.id === uploadsId) return null;
        const key = String(n.id);
        const children = byParent.get(key);
        const active = currentId === n.id;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              className={`w-full text-left flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="truncate">{n.name}</span>
            </button>
            {children?.length ? (
              <FolderTree
                byParent={byParent}
                trashId={trashId}
                uploadsId={uploadsId}
                currentId={currentId}
                depth={depth + 1}
                parentKey={key}
                onSelect={onSelect}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function MediaPickerDialog({ open, onOpenChange, title, multiple, onPick }: Props) {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [err, setErr] = useState('');

  const { data: folders = [] } = useQuery({
    queryKey: ['admin', 'media', 'folders'],
    queryFn: () => apiGet<MediaFolderRow[]>('/admin/media/folders'),
    enabled: open,
    staleTime: 15_000,
  });

  const trashId = useMemo(() => folders.find((f) => f.isTrash)?.id ?? null, [folders]);
  const defaultUploadsId = useMemo(
    () => folders.find((f) => !f.isTrash && f.parentId == null && f.name === 'Загрузки')?.id ?? null,
    [folders],
  );

  useEffect(() => {
    if (!open) return;
    setErr('');
    setSelectedIds(new Set());
    if (defaultUploadsId != null) setFolderId(defaultUploadsId);
    else setFolderId(null);
  }, [open, defaultUploadsId]);

  const byParent = useMemo(() => buildTree(folders), [folders]);

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['admin', 'media', 'files', folderId],
    queryFn: () => {
      const q = folderId == null ? '' : `?folder_id=${folderId}`;
      return apiGet<MediaFileRow[]>(`/admin/media/files${q}`);
    },
    enabled: open,
    staleTime: 10_000,
  });

  const inTrash = trashId != null && folderId === trashId;

  const moveFolderOptions = useMemo(
    () => buildFolderMoveOptions(folders, trashId),
    [folders, trashId],
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin', 'media'] });
  }, [qc]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setErr('');
    try {
      await apiPost('/admin/media/folders', { parentId: folderId ?? null, name });
      setNewFolderName('');
      refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось создать папку');
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setErr('');
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append('file', file);
        const q = folderId != null ? `?folder_id=${folderId}` : '';
        await apiPostForm<MediaFileRow>(`/admin/media/upload${q}`, fd);
      }
      e.target.value = '';
      refresh();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : 'Ошибка загрузки');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const confirmMulti = () => {
    const items = files.filter((f) => selectedIds.has(f.id)).map((f) => ({ id: f.id, url: f.url }));
    if (!items.length) return;
    onPick(items);
    onOpenChange(false);
  };

  const pickOne = (f: MediaFileRow) => {
    onPick([{ id: f.id, url: f.url }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 min-h-0 gap-3">
          <div className="w-52 shrink-0 border rounded-xl p-2 overflow-y-auto text-sm">
            <p className="text-xs text-muted-foreground px-2 mb-1">Папки</p>
            <button
              type="button"
              onClick={() => trashId != null && setFolderId(trashId)}
              className={`w-full text-left rounded-lg px-2 py-1 text-xs mb-1 ${
                inTrash ? 'bg-destructive/15 text-destructive font-medium' : 'hover:bg-muted'
              }`}
            >
              Корзина
            </button>
            <button
              type="button"
              onClick={() => setFolderId(defaultUploadsId)}
              className={`w-full text-left rounded-lg px-2 py-1 text-xs mb-2 hover:bg-muted ${
                folderId === defaultUploadsId ? 'bg-muted font-medium' : ''
              }`}
            >
              Загрузки
            </button>
            <FolderTree
              byParent={byParent}
              trashId={trashId}
              uploadsId={defaultUploadsId}
              currentId={folderId}
              depth={0}
              parentKey="root"
              onSelect={(id) => setFolderId(id)}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {err ? <p className="text-xs text-destructive">{err}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg cursor-pointer">
                Загрузить
                <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
              </label>
              <div className="flex flex-1 min-w-[120px] items-center gap-1">
                <Input
                  placeholder="Новая папка"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={createFolder}>
                  <FolderPlus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {inTrash ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs"
                  onClick={async () => {
                    if (!window.confirm('Удалить все файлы из корзины безвозвратно?')) return;
                    try {
                      await apiPost<{ removed: number }>('/admin/media/trash/empty');
                      refresh();
                    } catch (ex) {
                      setErr(ex instanceof ApiError ? ex.message : 'Ошибка');
                    }
                  }}
                >
                  Очистить корзину
                </Button>
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto border rounded-xl p-2">
              {filesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет файлов в этой папке</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {files.map((f) => {
                    const sel = selectedIds.has(f.id);
                    return (
                      <div key={f.id} className="flex flex-col gap-1 min-w-0">
                        <div
                          className={`relative border rounded-lg overflow-hidden group ${
                            sel ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="block w-full aspect-square bg-muted"
                            onClick={() => {
                              if (multiple) toggleSelect(f.id);
                              else pickOne(f);
                            }}
                          >
                            <img src={f.url} alt="" className="w-full h-full object-cover" />
                          </button>
                          {multiple ? (
                            <label className="absolute top-1 left-1 bg-background/90 rounded px-1 text-[10px] flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => toggleSelect(f.id)}
                              />
                            </label>
                          ) : null}
                          <div className="absolute bottom-0 inset-x-0 bg-background/90 text-[10px] px-1 py-0.5 truncate">
                            {f.originalFilename ?? f.id}
                          </div>
                          {inTrash ? (
                            <div className="absolute top-1 right-1 flex gap-0.5">
                              <button
                                type="button"
                                className="p-1 rounded bg-background/90 hover:text-primary"
                                title="Восстановить"
                                onClick={async (ev) => {
                                  ev.stopPropagation();
                                  await apiPost(`/admin/media/files/${f.id}/restore`);
                                  refresh();
                                }}
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                className="p-1 rounded bg-background/90 hover:text-destructive"
                                title="Удалить навсегда"
                                onClick={async (ev) => {
                                  ev.stopPropagation();
                                  if (!window.confirm('Удалить файл навсегда?')) return;
                                  await apiDelete(`/admin/media/files/${f.id}`);
                                  refresh();
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="absolute top-1 right-1 p-1 rounded bg-background/90 opacity-0 group-hover:opacity-100 hover:text-destructive"
                              title="В корзину"
                              onClick={async (ev) => {
                                ev.stopPropagation();
                                await apiPost(`/admin/media/files/${f.id}/trash`);
                                refresh();
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {!inTrash ? (
                          <MediaFileMoveSelect
                            fileId={f.id}
                            options={moveFolderOptions}
                            onMoved={refresh}
                            onError={(msg) => setErr(msg)}
                            className="w-full text-[10px] border rounded-md px-1 py-0.5 bg-background"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {multiple ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={confirmMulti} disabled={!selectedIds.size}>
              Добавить выбранные ({selectedIds.size})
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="text-xs text-muted-foreground sm:justify-start">
            <ImageIcon className="w-3.5 h-3.5" /> Нажмите на изображение, чтобы выбрать
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
