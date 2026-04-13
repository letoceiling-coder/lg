import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Loader2, Pencil, Shield, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, apiGet, apiPost, apiPut } from '@/lib/api';

interface ApiUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  role: string;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramLinked: boolean;
  isActive: boolean;
  createdAt: string;
}

type UserRole = 'admin' | 'editor' | 'manager' | 'agent' | 'client';

const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Администратор', icon: ShieldAlert, color: 'bg-red-100 text-red-700' },
  editor: { label: 'Редактор', icon: ShieldCheck, color: 'bg-blue-100 text-blue-700' },
  manager: { label: 'Менеджер', icon: Shield, color: 'bg-emerald-100 text-emerald-700' },
  agent: { label: 'Агент', icon: Shield, color: 'bg-green-100 text-green-700' },
  client: { label: 'Клиент', icon: Eye, color: 'bg-gray-100 text-gray-600' },
};

const defaultCfg = { label: 'Пользователь', icon: Eye, color: 'bg-gray-100 text-gray-600' };

const ROLE_OPTIONS: UserRole[] = ['admin', 'editor', 'manager', 'agent', 'client'];

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  telegramUsername: string;
  telegramId: string;
  isActive: boolean;
  password: string;
};

const EMPTY_FORM: UserForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'client',
  telegramUsername: '',
  telegramId: '',
  isActive: true,
  password: '',
};

function parseErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const msg = error.message?.trim();
    if (msg.startsWith('{')) {
      try {
        const parsed = JSON.parse(msg) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) return parsed.message.join(', ');
        if (parsed.message) return parsed.message;
      } catch {
        return msg;
      }
    }
    return msg || `Ошибка ${error.status}`;
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_FORM);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () =>
      apiGet<{ items: ApiUser[] }>('/admin/users').then((r) => r.items ?? []),
    staleTime: 30_000,
  });

  const editingUser = useMemo(
    () => users?.find((u) => u.id === editingId) ?? null,
    [users, editingId],
  );

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost<ApiUser>('/admin/users', payload),
    onSuccess: () => {
      toast.success('Пользователь создан');
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiPut<ApiUser>(`/admin/users/${id}`, payload),
    onSuccess: () => {
      toast.success('Изменения сохранены');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiPost(`/admin/users/${id}/reset-password`, { password }),
    onSuccess: () => toast.success('Пароль обновлен'),
    onError: (e) => toast.error(parseErrorMessage(e)),
  });

  const setCreateField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const setEditField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const openEdit = (user: ApiUser) => {
    setEditingId(user.id);
    setEditForm({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      role: (ROLE_OPTIONS.includes(user.role as UserRole) ? user.role : 'client') as UserRole,
      telegramUsername: user.telegramUsername ?? '',
      telegramId: user.telegramId ?? '',
      isActive: user.isActive,
      password: '',
    });
  };

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim()) {
      toast.error('Введите ФИО');
      return;
    }
    if (createForm.password.trim().length < 6) {
      toast.error('Пароль должен быть не короче 6 символов');
      return;
    }
    createMutation.mutate({
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim() || undefined,
      phone: createForm.phone.trim() || undefined,
      role: createForm.role,
      password: createForm.password,
      telegramUsername: createForm.telegramUsername.trim() || undefined,
      telegramId: createForm.telegramId.trim() || undefined,
      isActive: createForm.isActive,
    });
  };

  const submitEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      payload: {
        fullName: editForm.fullName.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
        telegramUsername: editForm.telegramUsername,
        telegramId: editForm.telegramId,
        isActive: editForm.isActive,
      },
    });
  };

  const askResetPassword = (user: ApiUser) => {
    const next = window.prompt(`Новый пароль для ${user.fullName || user.email || user.id}`);
    if (next === null) return;
    if (next.trim().length < 6) {
      toast.error('Пароль должен быть не короче 6 символов');
      return;
    }
    resetPasswordMutation.mutate({ id: user.id, password: next.trim() });
  };

  const isBusy =
    createMutation.isPending || updateMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <button
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          <UserPlus className="w-4 h-4" />
          {showCreateForm ? 'Скрыть форму' : 'Добавить'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={submitCreate} className="border rounded-2xl p-4 mb-4 bg-background space-y-3">
          <p className="font-medium">Новый пользователь</p>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="ФИО"
              value={createForm.fullName} onChange={(e) => setCreateField('fullName', e.target.value)} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Email"
              value={createForm.email} onChange={(e) => setCreateField('email', e.target.value)} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Телефон"
              value={createForm.phone} onChange={(e) => setCreateField('phone', e.target.value)} />
            <select className="border rounded-xl px-3 py-2 text-sm"
              value={createForm.role} onChange={(e) => setCreateField('role', e.target.value as UserRole)}>
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Telegram username (без @)"
              value={createForm.telegramUsername} onChange={(e) => setCreateField('telegramUsername', e.target.value.replace(/^@+/, ''))} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Telegram ID (число)"
              value={createForm.telegramId} onChange={(e) => setCreateField('telegramId', e.target.value)} />
            <input className="border rounded-xl px-3 py-2 text-sm md:col-span-2" placeholder="Пароль (мин. 6)"
              type="password" value={createForm.password} onChange={(e) => setCreateField('password', e.target.value)} />
          </div>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={createForm.isActive}
              onChange={(e) => setCreateField('isActive', e.target.checked)} />
            Активен
          </label>
          <div>
            <button type="submit" disabled={isBusy}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm disabled:opacity-60">
              Создать
            </button>
          </div>
        </form>
      )}

      {editingUser && (
        <form onSubmit={submitEdit} className="border rounded-2xl p-4 mb-4 bg-background space-y-3">
          <p className="font-medium">Редактирование: {editingUser.fullName || editingUser.email || editingUser.id}</p>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="ФИО"
              value={editForm.fullName} onChange={(e) => setEditField('fullName', e.target.value)} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Email"
              value={editForm.email} onChange={(e) => setEditField('email', e.target.value)} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Телефон"
              value={editForm.phone} onChange={(e) => setEditField('phone', e.target.value)} />
            <select className="border rounded-xl px-3 py-2 text-sm"
              value={editForm.role} onChange={(e) => setEditField('role', e.target.value as UserRole)}>
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Telegram username (без @)"
              value={editForm.telegramUsername} onChange={(e) => setEditField('telegramUsername', e.target.value.replace(/^@+/, ''))} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Telegram ID (пусто = отвязать)"
              value={editForm.telegramId} onChange={(e) => setEditField('telegramId', e.target.value)} />
          </div>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={editForm.isActive}
              onChange={(e) => setEditField('isActive', e.target.checked)} />
            Активен
          </label>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isBusy}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm disabled:opacity-60">
              Сохранить
            </button>
            <button type="button" onClick={() => setEditingId(null)}
              className="border px-4 py-2 rounded-xl text-sm">
              Отмена
            </button>
          </div>
        </form>
      )}

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
                  <p className="text-xs text-muted-foreground">
                    Telegram: {u.telegramLinked ? (u.telegramUsername ? `@${u.telegramUsername}` : `ID ${u.telegramId}`) : 'не привязан'}
                  </p>
                </div>
                {!u.isActive && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">Неактивен</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.color} inline-flex items-center gap-1`}>
                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                </span>
                <button
                  type="button"
                  className="text-xs px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="w-3 h-3" />
                  Изменить
                </button>
                <button
                  type="button"
                  className="text-xs px-2.5 py-1 rounded-lg border"
                  onClick={() => askResetPassword(u)}
                >
                  Пароль
                </button>
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
