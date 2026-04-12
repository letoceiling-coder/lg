import { useState, useCallback } from 'react';
import { useCMSStore } from '../store/cms-store';
import { Upload, Search, Folder, Grid3X3, List, Trash2, Tag, X } from 'lucide-react';

export default function AdminMedia() {
  const { media, addMedia, deleteMedia } = useCMSStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);

  const folders = ['all', ...new Set(media.map(m => m.folder || 'Без папки'))];
  const filtered = media
    .filter(m => selectedFolder === 'all' || (m.folder || 'Без папки') === selectedFolder)
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      addMedia({
        name: file.name,
        url,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
        size: file.size,
        folder: 'Загрузки',
        tags: [],
      });
    });
  }, [addMedia]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      addMedia({
        name: file.name,
        url,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
        size: file.size,
        folder: 'Загрузки',
        tags: [],
      });
    });
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Медиа</h1>
        <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" /> Загрузить
          <input type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
        </label>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 mb-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Перетащите файлы сюда или нажмите «Загрузить»</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm bg-background" />
        </div>
        <select
          value={selectedFolder}
          onChange={e => setSelectedFolder(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-background"
        >
          {folders.map(f => (
            <option key={f} value={f}>{f === 'all' ? 'Все папки' : f}</option>
          ))}
        </select>
        <div className="flex bg-muted rounded-xl p-0.5">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media grid */}
      {filtered.length === 0 ? (
        <div className="bg-background border rounded-2xl p-12 text-center text-muted-foreground text-sm">
          Нет медиафайлов
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(m => (
            <div key={m.id} className="group relative bg-background border rounded-2xl overflow-hidden">
              {m.type === 'image' ? (
                <div className="aspect-square bg-muted">
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
              )}
              <div className="p-2">
                <p className="text-xs truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">{(m.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={() => deleteMedia(m.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-background border rounded-2xl divide-y">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">🎬</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.folder || 'Без папки'} · {(m.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => deleteMedia(m.id)} className="p-2 text-muted-foreground hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
