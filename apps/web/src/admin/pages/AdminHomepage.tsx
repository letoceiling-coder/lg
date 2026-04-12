import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Loader2, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

type SettingRow = { id: number; key: string; value: string; groupName: string; label: string; fieldType: string };
type GroupedSettings = Record<string, SettingRow[]>;

const HOME_KEYS = new Set([
  'home_hot_title',
  'home_hot_per_page',
  'home_hot_mode',
  'home_hot_fixed_slugs',
  'home_hot_badge',
  'home_start_title',
  'home_start_per_page',
  'home_start_window_days',
  'home_start_badge',
  'home_news_per_page',
]);

export default function AdminHomepage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiGet<GroupedSettings>('/content/settings'),
    staleTime: 60_000,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const flat: Record<string, string> = {};
    for (const rows of Object.values(data)) {
      for (const r of rows) {
        if (HOME_KEYS.has(r.key)) flat[r.key] = r.value;
      }
    }
    setValues(flat);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(values).map(([key, value]) => ({ key, value }));
      return apiPost('/content/settings', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['content', 'settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const homepageRows =
    data?.homepage?.filter((r) => HOME_KEYS.has(r.key)) ?? [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="w-7 h-7 text-primary" />
            Главная: блоки
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Горячие предложения, старт продаж и блок новостей. Полный список настроек — в разделе «Настройки сайта».
          </p>
          <p className="text-sm text-muted-foreground mt-3 rounded-xl border bg-muted/40 px-4 py-3">
            <strong className="text-foreground">Старт продаж:</strong> в блок попадают ЖК с датой старта в интервале «сегодня — сегодня+N дней»
            (поле ниже). Дата приходит из фида при импорте; её можно задать вручную в карточке ЖК (админка → ЖК). Редактор страницы «Контент»
            меняет только заголовок блока на макете, не список объектов.
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {saved ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-4 mb-4">
          {mutation.error instanceof Error ? mutation.error.message : 'Ошибка'}
        </div>
      )}

      {homepageRows.length === 0 && (
        <div className="bg-background border rounded-2xl p-8 text-sm text-muted-foreground">
          Нет полей главной в базе. Перезапустите API (подтянутся значения по умолчанию) или выполните{' '}
          <code className="text-xs bg-muted px-1 rounded">pnpm db:seed</code> в каталоге{' '}
          <code className="text-xs bg-muted px-1 rounded">packages/database</code>.
        </div>
      )}

      <div className="space-y-4">
        {homepageRows.map((row) => (
          <div key={row.key} className="bg-background border rounded-2xl p-4">
            <label className="text-sm font-medium mb-1 block">{row.label}</label>
            {row.fieldType === 'TEXTAREA' ? (
              <textarea
                value={values[row.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.value }))}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background min-h-[80px]"
              />
            ) : row.fieldType === 'BOOLEAN' ? (
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={(values[row.key] ?? '') === 'true'}
                  onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.checked ? 'true' : 'false' }))}
                  className="rounded border-input"
                />
                <span className="text-muted-foreground">включено</span>
              </label>
            ) : (
              <input
                type="text"
                value={values[row.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.value }))}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
