import { useQuery } from '@tanstack/react-query';
import { useCMSStore } from '../store/cms-store';
import { useContentStore } from '../store/content-store';
import { FileText, Image, Users, Building2, Home, Layers, Plus, ClipboardList, HardHat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';

type Counters = { blocks: number; apartments: number; builders: number; regions: number };
type RequestRow = { id: number; name: string | null; phone: string | null; status: string; createdAt: string };

export default function AdminDashboard() {
  const { pages: cmsPages, media } = useCMSStore();
  const { pages: contentPages } = useContentStore();

  const { data: counters } = useQuery({
    queryKey: ['admin', 'stats', 'counters'],
    queryFn: () => apiGet<Counters>('/stats/counters'),
    staleTime: 60_000,
  });

  const { data: recentRequests } = useQuery({
    queryKey: ['admin', 'requests', 'recent'],
    queryFn: () => apiGet<{ data: RequestRow[] }>('/admin/requests?per_page=5&page=1'),
    staleTime: 30_000,
  });

  const stats = [
    { label: 'ЖК в базе', value: counters?.blocks ?? '—', icon: Building2, color: 'bg-primary/10 text-primary' },
    { label: 'Квартиры', value: counters?.apartments ?? '—', icon: Home, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Застройщики', value: counters?.builders ?? '—', icon: HardHat, color: 'bg-green-500/10 text-green-600' },
    { label: 'Медиа', value: media.length, icon: Image, color: 'bg-amber-500/10 text-amber-600' },
  ];

  const statusLabels: Record<string, string> = {
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Закрыта',
    CANCELLED: 'Отменена',
    new: 'Новая',
    in_progress: 'В работе',
    done: 'Закрыта',
    cancelled: 'Отменена',
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <p className="text-muted-foreground text-sm mt-1">Обзор платформы</p>
        </div>
        <Link
          to="/admin/pages"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Управление страницами
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-background border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-muted-foreground text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      {recentRequests?.data && recentRequests.data.length > 0 && (
        <div className="bg-background border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Последние заявки
          </h2>
          <div className="space-y-2">
            {recentRequests.data.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{r.name || 'Без имени'}</span>
                  <span className="text-xs text-muted-foreground">{r.phone}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  r.status === 'NEW' || r.status === 'new' ? 'bg-blue-100 text-blue-700' :
                  r.status === 'IN_PROGRESS' || r.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  r.status === 'COMPLETED' || r.status === 'done' ? 'bg-green-100 text-green-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {statusLabels[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content pages */}
      <div className="bg-background border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Контентные страницы
        </h2>
        <div className="space-y-2">
          {contentPages.map(p => (
            <Link
              key={p.slug}
              to={`/admin/page-editor/${encodeURIComponent(p.slug)}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{p.title}</span>
                <span className="text-xs text-muted-foreground">{p.slug}</span>
                <span className="text-xs text-muted-foreground">• {p.sections.length} секций</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${
                p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {p.status === 'published' ? 'Опубликовано' : 'Черновик'}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* CMS pages */}
      {cmsPages.length > 0 && (
        <div className="bg-background border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" /> Конструктор страниц
          </h2>
          <div className="space-y-2">
            {cmsPages.slice(0, 5).map(p => (
              <Link
                key={p.id}
                to={`/admin/editor/${p.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.slug}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  p.status === 'published' ? 'bg-green-100 text-green-700' :
                  p.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {p.status === 'published' ? 'Опубликовано' : p.status === 'draft' ? 'Черновик' : 'Архив'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
