import { useQuery } from '@tanstack/react-query';
import { Shield, ShieldCheck, ShieldAlert, Eye, UserPlus, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface ApiUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Администратор', icon: ShieldAlert, color: 'bg-red-100 text-red-700' },
  editor: { label: 'Редактор', icon: ShieldCheck, color: 'bg-blue-100 text-blue-700' },
  manager: { label: 'Менеджер', icon: Shield, color: 'bg-emerald-100 text-emerald-700' },
  agent: { label: 'Агент', icon: Shield, color: 'bg-green-100 text-green-700' },
  client: { label: 'Клиент', icon: Eye, color: 'bg-gray-100 text-gray-600' },
};

const defaultCfg = { label: 'Пользователь', icon: Eye, color: 'bg-gray-100 text-gray-600' };

export default function AdminUsers() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiGet<{ data: ApiUser[] }>('/users').then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <button
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          onClick={() => {/* TODO: create user modal */}}
        >
          <UserPlus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-4 mb-4">
          Ошибка загрузки: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </div>
      )}

      {users && (
        <div className="bg-background border rounded-2xl divide-y">
          {users.map(u => {
            const cfg = roleConfig[u.role] ?? defaultCfg;
            return (
              <div key={u.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(u.fullName || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.fullName || '—'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                </div>
                {!u.isActive && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">Неактивен</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.color} inline-flex items-center gap-1`}>
                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Нет пользователей
            </div>
          )}
        </div>
      )}
    </div>
  );
}
