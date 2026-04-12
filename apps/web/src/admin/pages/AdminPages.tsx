import { useState } from 'react';
import { useContentStore } from '../store/content-store';
import { useCMSStore } from '../store/cms-store';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, MoreHorizontal, Trash2, Copy, Edit, Eye, Archive, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPages() {
  const { pages: cmsPages, addPage, deletePage, duplicatePage, setPageStatus } = useCMSStore();
  const { pages: contentPages } = useContentStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'content' | 'cms'>('all');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const slug = newSlug.trim() || '/' + newTitle.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-');
    const page = addPage(newTitle.trim(), slug);
    setShowNew(false);
    setNewTitle('');
    setNewSlug('');
    navigate(`/admin/editor/${page.id}`);
  };

  // Filter content pages
  const filteredContent = contentPages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  // Filter CMS pages (editor-based)
  const filteredCms = cmsPages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Страницы</h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Новая страница
        </button>
      </div>

      {showNew && (
        <div className="bg-background border rounded-2xl p-5 mb-6">
          <h3 className="font-semibold mb-3">Новая страница</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название" className="border rounded-xl px-3 py-2 text-sm bg-background" autoFocus />
            <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="Slug (авто)" className="border rounded-xl px-3 py-2 text-sm bg-background" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">Создать</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex bg-muted rounded-xl p-0.5">
          {(['all', 'content', 'cms'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              {f === 'all' ? 'Все' : f === 'content' ? 'Контентные' : 'Конструктор'}
            </button>
          ))}
        </div>
      </div>

      {/* Content-managed pages */}
      {(filter === 'all' || filter === 'content') && filteredContent.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Контентные страницы
          </h2>
          <div className="bg-background border rounded-2xl divide-y mb-6">
            {filteredContent.map(p => (
              <div key={p.slug} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-lg',
                    p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {p.status === 'published' ? 'Опубликовано' : 'Черновик'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">{p.sections.length} секций</span>
                  <Link
                    to={`/admin/page-editor/${encodeURIComponent(p.slug)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Редактировать
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CMS/Editor pages */}
      {(filter === 'all' || filter === 'cms') && filteredCms.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Конструктор страниц
          </h2>
          <div className="bg-background border rounded-2xl divide-y">
            {filteredCms.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-lg',
                    p.status === 'published' ? 'bg-green-100 text-green-700' :
                    p.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {p.status === 'published' ? 'Опубликовано' : p.status === 'draft' ? 'Черновик' : 'Архив'}
                  </span>
                  <Link to={`/admin/editor/${p.id}`} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Edit className="w-4 h-4" />
                  </Link>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === p.id && (
                      <div className="absolute right-0 top-full mt-1 bg-background border rounded-xl shadow-lg py-1 z-50 w-44">
                        <button onClick={() => { duplicatePage(p.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted">
                          <Copy className="w-3.5 h-3.5" /> Дублировать
                        </button>
                        <button onClick={() => { setPageStatus(p.id, p.status === 'published' ? 'draft' : 'published'); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted">
                          <Eye className="w-3.5 h-3.5" /> {p.status === 'published' ? 'В черновик' : 'Опубликовать'}
                        </button>
                        <button onClick={() => { setPageStatus(p.id, 'archived'); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted">
                          <Archive className="w-3.5 h-3.5" /> Архивировать
                        </button>
                        <hr className="my-1" />
                        <button onClick={() => { deletePage(p.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" /> Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
