import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Newspaper,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Rss,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ApiError, apiDelete, apiGet, apiPost, apiPut, apiUrl, getAccessToken } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import MediaPickerDialog from '@/admin/components/MediaPickerDialog';

interface NewsRow {
  id: number;
  slug: string;
  regionId: number | null;
  title: string;
  body: string | null;
  imageUrl: string | null;
  mediaFiles?: { id: number; url: string }[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

function formatApiError(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      /* plain text */
    }
    return e.message || `${e.status}`;
  }
  return e instanceof Error ? e.message : 'Ошибка';
}

interface TelegramParserStatus {
  ready: boolean;
  credentialsOk: boolean;
  credentials: { apiIdOk: boolean; apiHashOk: boolean; sessionOk: boolean };
  channels: { inDatabaseTotal: number; inDatabaseEnabled: number; envListCount: number };
  telegramAuth: {
    connected: boolean;
    sessionSource: 'env' | 'database' | 'none';
    lastConnectedAt: string | null;
  };
  hints: string[];
}

interface TgQrPoll {
  phase: 'starting' | 'awaiting_scan' | 'awaiting_password' | 'success' | 'error' | 'cancelled';
  loginUrl?: string;
  expiresAtMs?: number;
  passwordHint?: string | null;
  errorMessage?: string | null;
}

interface TelegramChannelRow {
  id: number;
  regionId: number;
  channelRef: string;
  label: string | null;
  isEnabled: boolean;
  limitPerRun: number;
  publishOnImport: boolean;
  sortOrder: number;
}

interface RegionRow {
  id: number;
  code: string;
  name: string;
}

function TelegramChannelEditorRow({
  row,
  regions,
  selected,
  onToggleSelect,
  onUpdated,
}: {
  row: TelegramChannelRow;
  regions: RegionRow[];
  selected: boolean;
  onToggleSelect: () => void;
  onUpdated: () => void;
}) {
  const [regionId, setRegionId] = useState(String(row.regionId));
  const [channelRef, setChannelRef] = useState(row.channelRef);
  const [label, setLabel] = useState(row.label ?? '');
  const [isEnabled, setIsEnabled] = useState(row.isEnabled);
  const [limitPerRun, setLimitPerRun] = useState(String(row.limitPerRun));
  const [publishOnImport, setPublishOnImport] = useState(row.publishOnImport);
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));

  useEffect(() => {
    setRegionId(String(row.regionId));
    setChannelRef(row.channelRef);
    setLabel(row.label ?? '');
    setIsEnabled(row.isEnabled);
    setLimitPerRun(String(row.limitPerRun));
    setPublishOnImport(row.publishOnImport);
    setSortOrder(String(row.sortOrder));
  }, [row]);

  const saveMut = useMutation({
    mutationFn: () =>
      apiPut(`/admin/news/telegram-channels/${row.id}`, {
        regionId: Number(regionId),
        channelRef,
        label: label.trim() ? label.trim() : null,
        isEnabled,
        limitPerRun: Math.max(1, Math.min(100, Number(limitPerRun) || 20)),
        publishOnImport,
        sortOrder: Number(sortOrder) || 0,
      }),
    onSuccess: () => {
      toast.success('Канал сохранён');
      onUpdated();
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const delMut = useMutation({
    mutationFn: () => apiDelete(`/admin/news/telegram-channels/${row.id}`),
    onSuccess: () => {
      toast.success('Канал удалён');
      onUpdated();
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="rounded mt-1" title="Участвует в выборочном импорте" />
      </td>
      <td className="px-3 py-2">
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs w-full min-w-[130px] bg-background"
        >
          {regions.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={channelRef}
          onChange={(e) => setChannelRef(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs w-full min-w-[140px] bg-background"
          placeholder="@channel или ссылка"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs w-full min-w-[100px] bg-background"
          placeholder="Подпись в списке"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="rounded" title="Участвует в импорте" />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={1}
          max={100}
          value={limitPerRun}
          onChange={(e) => setLimitPerRun(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs w-16 bg-background"
          title="Сколько последних постов за один запуск"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={publishOnImport}
          onChange={(e) => setPublishOnImport(e.target.checked)}
          className="rounded"
          title="Сразу на сайте или черновик"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs w-14 bg-background"
          title="Порядок в списке"
        />
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button
          type="button"
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate()}
          className="text-xs px-2 py-1 rounded-lg border hover:bg-muted mr-1 disabled:opacity-50"
        >
          {saveMut.isPending ? '…' : 'Сохранить'}
        </button>
        <button
          type="button"
          disabled={delMut.isPending}
          onClick={() => {
            if (confirm('Удалить канал из списка?')) delMut.mutate();
          }}
          className="text-xs p-1 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

function formatCountdown(secondsLeft: number): string {
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function AdminNews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    body: '',
    isPublished: false,
    regionId: '',
    mediaFileIds: [] as number[],
    mediaUrls: [] as string[],
  });
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'news', page],
    queryFn: () => apiGet<PaginatedResult>(`/admin/news?page=${page}&per_page=20`),
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost('/admin/news', {
        title: form.title,
        slug: form.slug,
        body: form.body,
        isPublished: form.isPublished,
        mediaFileIds: form.mediaFileIds,
        regionId: form.regionId ? Number(form.regionId) : null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'news'] }); setCreating(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiPut(`/admin/news/${editing!.id}`, {
        title: form.title,
        slug: form.slug,
        body: form.body,
        isPublished: form.isPublished,
        mediaFileIds: form.mediaFileIds,
        regionId: form.regionId ? Number(form.regionId) : null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'news'] }); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/news/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'news'] }),
  });

  const rssMutation = useMutation({
    mutationFn: (url?: string) =>
      apiPost<{ imported: number; skipped: number; totalInFeed: number; feedUrl: string }>('/admin/news/sync-rss', url ? { url } : {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'news'] });
      qc.invalidateQueries({ queryKey: ['news'] });
      toast.success(`RSS: добавлено ${res.imported}, пропущено ${res.skipped} (в ленте ${res.totalInFeed})`);
    },
    onError: (e: Error) => {
      toast.error(formatApiError(e));
    },
  });

  const [tgNewRef, setTgNewRef] = useState('');
  const [tgNewLabel, setTgNewLabel] = useState('');
  const [tgNewRegionId, setTgNewRegionId] = useState('');
  const [tgRunLimit, setTgRunLimit] = useState('20');
  const [selectedTgIds, setSelectedTgIds] = useState<number[]>([]);

  const tgStatusQuery = useQuery({
    queryKey: ['admin', 'news', 'telegram-parser-status'],
    queryFn: () => apiGet<TelegramParserStatus>('/admin/news/telegram-parser/status'),
    staleTime: 10_000,
  });

  const tgChannelsQuery = useQuery({
    queryKey: ['admin', 'news', 'telegram-channels'],
    queryFn: () => apiGet<TelegramChannelRow[]>('/admin/news/telegram-channels'),
    staleTime: 10_000,
  });

  const tgAddMutation = useMutation({
    mutationFn: () =>
      apiPost<TelegramChannelRow>('/admin/news/telegram-channels', {
        regionId: Number(tgNewRegionId),
        channelRef: tgNewRef.trim(),
        label: tgNewLabel.trim() ? tgNewLabel.trim() : null,
      }),
    onSuccess: () => {
      setTgNewRef('');
      setTgNewLabel('');
      toast.success('Канал добавлен');
      void qc.invalidateQueries({ queryKey: ['admin', 'news', 'telegram-channels'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'news', 'telegram-parser-status'] });
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const tgSyncMutation = useMutation({
    mutationFn: () =>
      apiPost<{
        imported: number;
        skipped: number;
        channelsTotal: number;
        byChannel: { channel: string; imported: number; skipped: number }[];
      }>('/admin/news/sync-telegram', {
        ...(selectedTgIds.length ? { onlyChannelIds: selectedTgIds } : {}),
        limitPerChannel: Math.max(1, Math.min(100, Number(tgRunLimit) || 20)),
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'news', 'telegram-parser-status'] });
      const parts = res.byChannel.map((b) => `${b.channel}: +${b.imported}`).join('; ');
      toast.success(`Telegram: новых записей ${res.imported}, пропущено ${res.skipped}. ${parts}`);
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const tgBackfillPhotosMutation = useMutation({
    mutationFn: (limit: number) =>
      apiPost<{ scanned: number; updated: number; skipped: number; failed: number }>(
        '/admin/news/backfill-telegram-photos',
        { limit },
      ),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
      toast.success(
        `Фото: обновлено ${res.updated} из ${res.scanned}. Пропущено ${res.skipped}, ошибок ${res.failed}.`,
      );
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const [tgQrFlowId, setTgQrFlowId] = useState<string | null>(null);
  const [tgQrPwd, setTgQrPwd] = useState('');
  const [tgQrDataUrl, setTgQrDataUrl] = useState<string | null>(null);
  const [tgQrWizardOpen, setTgQrWizardOpen] = useState(false);
  const [tgNowMs, setTgNowMs] = useState(() => Date.now());

  const tgQrPollQuery = useQuery({
    queryKey: ['admin', 'news', 'telegram-qr', tgQrFlowId],
    queryFn: () => apiGet<TgQrPoll>(`/admin/news/telegram-qr/${tgQrFlowId}`),
    enabled: !!tgQrFlowId,
    refetchInterval: (q) => {
      const p = q.state.data?.phase;
      if (!p) return 1500;
      if (['success', 'error', 'cancelled'].includes(p)) return false;
      return 1500;
    },
  });
  const tgQrPoll = tgQrPollQuery.data;
  const tgQrSecondsLeft =
    tgQrPoll?.expiresAtMs != null
      ? Math.max(0, Math.ceil((tgQrPoll.expiresAtMs - tgNowMs) / 1000))
      : null;

  useEffect(() => {
    if (!tgQrWizardOpen || !tgQrPoll?.expiresAtMs) return;
    const timer = window.setInterval(() => setTgNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [tgQrWizardOpen, tgQrPoll?.expiresAtMs]);

  useEffect(() => {
    const url = tgQrPoll?.loginUrl;
    if (!url) {
      setTgQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: 'M' }).then((u) => {
      if (!cancelled) setTgQrDataUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [tgQrPoll?.loginUrl]);

  const tgQrHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!tgQrFlowId || !tgQrPoll) return;
    const mark = `${tgQrFlowId}:${tgQrPoll.phase}`;
    if (!['success', 'error', 'cancelled'].includes(tgQrPoll.phase)) return;
    if (tgQrHandled.current === mark) return;
    tgQrHandled.current = mark;
    if (tgQrPoll.phase === 'success') {
      toast.success('Telegram MTProto: сессия сохранена. Можно запускать импорт.');
      void qc.invalidateQueries({ queryKey: ['admin', 'news', 'telegram-parser-status'] });
      setTgQrFlowId(null);
      setTgQrPwd('');
      setTgQrWizardOpen(false);
    } else if (tgQrPoll.phase === 'error' && tgQrPoll.errorMessage) {
      toast.error(tgQrPoll.errorMessage);
    } else if (tgQrPoll.phase === 'cancelled') {
      setTgQrFlowId(null);
      setTgQrPwd('');
      setTgQrWizardOpen(false);
    }
  }, [tgQrFlowId, tgQrPoll, qc]);

  const tgQrStartMut = useMutation({
    mutationFn: () => apiPost<{ flowId: string; reused?: boolean }>('/admin/news/telegram-qr/start'),
    onSuccess: (d) => {
      tgQrHandled.current = null;
      setTgQrFlowId(d.flowId);
      toast.message(
        d.reused
          ? 'Подхватили уже запущенное подключение по QR. Можно дождаться завершения или отменить.'
          : 'Откройте Telegram на телефоне → Настройки → Устройства → Подключить устройство → Сканировать QR.',
      );
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const tgQrCancelMut = useMutation({
    mutationFn: (flowId: string) => apiPost('/admin/news/telegram-qr/cancel', { flowId }),
    onSuccess: () => {
      setTgQrFlowId(null);
      setTgQrPwd('');
      setTgQrWizardOpen(false);
      toast.message('Вход по QR отменён');
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const tgQrResetMut = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; hadActive?: boolean }>('/admin/news/telegram-qr/reset', {}),
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  const tgQrPwdMut = useMutation({
    mutationFn: (p: { flowId: string; password: string }) =>
      apiPost('/admin/news/telegram-qr/password', p),
    onSuccess: () => {
      setTgQrPwd('');
      toast.message('Пароль отправлен…');
    },
    onError: (e: unknown) => toast.error(formatApiError(e)),
  });

  async function startQrWizard() {
    if (
      !tgStatusQuery.data?.credentials.apiIdOk ||
      !tgStatusQuery.data?.credentials.apiHashOk
    ) {
      toast.error('Сначала настройте TG_API_ID и TG_API_HASH на сервере.');
      return;
    }
    setTgQrWizardOpen(true);
    setTgQrPwd('');
    setTgNowMs(Date.now());
    tgQrHandled.current = null;
    try {
      await tgQrStartMut.mutateAsync();
    } catch {
      // Error toast is handled in mutation onError.
    }
  }

  async function resetAndStartQrWizard() {
    try {
      await tgQrResetMut.mutateAsync();
      setTgQrFlowId(null);
      setTgQrPwd('');
      setTgNowMs(Date.now());
      tgQrHandled.current = null;
      await tgQrStartMut.mutateAsync();
    } catch {
      // Error toast is handled in mutation onError.
    }
  }

  const tgChannels = tgChannelsQuery.data ?? [];
  const enabledTgIds = tgChannels.filter((c) => c.isEnabled).map((c) => c.id);
  const allEnabledSelected =
    enabledTgIds.length > 0 && enabledTgIds.every((id) => selectedTgIds.includes(id));

  useEffect(() => {
    if (regions.length === 0) return;
    const preferred = regions.find((r) => (r.code ?? '').toLowerCase() === 'msk') ?? regions[0];
    if (!tgNewRegionId) setTgNewRegionId(String(preferred.id));
    setForm((prev) => (prev.regionId ? prev : { ...prev, regionId: String(preferred.id) }));
  }, [regions, tgNewRegionId]);

  function resetForm() {
    const preferred = regions.find((r) => (r.code ?? '').toLowerCase() === 'msk') ?? regions[0];
    setForm({
      title: '',
      slug: '',
      body: '',
      isPublished: false,
      regionId: preferred ? String(preferred.id) : '',
      mediaFileIds: [],
      mediaUrls: [],
    });
  }
  function startEdit(row: NewsRow) {
    setEditing(row);
    setCreating(false);
    setForm({
      title: row.title,
      slug: row.slug,
      body: row.body ?? '',
      isPublished: row.isPublished,
      regionId: row.regionId != null ? String(row.regionId) : '',
      mediaFileIds: (row.mediaFiles ?? []).map((m) => m.id),
      mediaUrls: (row.mediaFiles ?? []).map((m) => m.url),
    });
  }
  function startCreate() {
    setEditing(null);
    setCreating(true);
    resetForm();
  }

  const meta = data?.meta;
  const rows = data?.data ?? [];
  const showForm = creating || editing;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Новости</h1>
          {meta && <span className="text-sm text-muted-foreground ml-2">({meta.total})</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const raw = window.prompt(
                'URL RSS или Atom (https://…). Пусто — взять из настроек сайта «home_news_rss_url» (группа Главная).',
                '',
              );
              if (raw === null) return;
              const u = raw.trim();
              rssMutation.mutate(u || undefined);
            }}
            disabled={rssMutation.isPending}
            className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {rssMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
            Импорт RSS
          </button>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {/* Импорт из Telegram: настройки в БД, секреты только на сервере */}
      <div className="bg-background border rounded-2xl p-5 mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <h2 className="font-semibold text-base">Новости из Telegram-каналов</h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Добавьте каналы (@имя или ссылка t.me/…). Для работы импорта администратор сервера указывает в .env{' '}
                <code className="text-[11px] bg-muted px-1 rounded">TG_API_ID</code>,{' '}
                <code className="text-[11px] bg-muted px-1 rounded">TG_API_HASH</code>,{' '}
                <code className="text-[11px] bg-muted px-1 rounded">TG_SESSION_STRING</code>.
                Дубликаты не создаются: совпадение по ссылке на пост.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 hover:bg-muted"
              onClick={() => {
                void tgStatusQuery.refetch();
                void tgChannelsQuery.refetch();
              }}
              disabled={tgStatusQuery.isFetching || tgChannelsQuery.isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tgStatusQuery.isFetching || tgChannelsQuery.isFetching ? 'animate-spin' : ''}`} />
              Обновить статус
            </button>
            <span
              className={`text-xs px-2 py-1 rounded-lg font-medium ${
                tgStatusQuery.data?.ready
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
              }`}
            >
              {tgStatusQuery.isLoading ? 'Проверка…' : tgStatusQuery.data?.ready ? 'Готово к импорту' : 'Требуется настройка'}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-lg font-medium ${
                tgStatusQuery.data?.telegramAuth.connected
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                  : 'bg-zinc-500/15 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {tgStatusQuery.data?.telegramAuth.connected ? 'Telegram подключен' : 'Telegram не подключен'}
            </span>
          </div>
        </div>

        {tgStatusQuery.data && (
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside border border-dashed rounded-xl px-3 py-2 bg-muted/30">
            {tgStatusQuery.data.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Вход по QR (MTProto)</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Нужны <code className="text-[11px] bg-muted px-1 rounded">TG_API_ID</code> и{' '}
                <code className="text-[11px] bg-muted px-1 rounded">TG_API_HASH</code> в .env сервера. После сканирования
                string session сохраняется в базе (приоритет у переменной{' '}
                <code className="text-[11px] bg-muted px-1 rounded">TG_SESSION_STRING</code> в .env, если задана).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  tgQrStartMut.isPending ||
                  !tgStatusQuery.data?.credentials.apiIdOk ||
                  !tgStatusQuery.data?.credentials.apiHashOk
                }
                onClick={() => {
                  void startQrWizard();
                }}
                className="inline-flex items-center gap-2 text-sm border border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-2 rounded-xl hover:bg-sky-500/10 disabled:opacity-50"
              >
                {tgQrStartMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Открыть мастер 1-2-3
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Последнее успешное подключение:{' '}
            <span className="font-medium text-foreground">
              {formatDateTime(tgStatusQuery.data?.telegramAuth.lastConnectedAt)}
            </span>
            {' · '}
            Источник сессии:{' '}
            <span className="font-medium text-foreground">
              {tgStatusQuery.data?.telegramAuth.sessionSource === 'env'
                ? '.env'
                : tgStatusQuery.data?.telegramAuth.sessionSource === 'database'
                  ? 'База данных (QR)'
                  : 'не задан'}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <p className="font-medium text-foreground">Подключение Telegram</p>
            <p>
              {tgStatusQuery.data?.telegramAuth.connected ? 'Активно' : 'Не подключено'}
            </p>
            <p className="text-muted-foreground">
              {formatDateTime(tgStatusQuery.data?.telegramAuth.lastConnectedAt)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <p className="font-medium text-foreground">Сервер (env)</p>
            <p>
              API ID / hash / сессия:{' '}
              {tgStatusQuery.data?.credentials.apiIdOk &&
              tgStatusQuery.data?.credentials.apiHashOk &&
              tgStatusQuery.data?.credentials.sessionOk
                ? 'задано'
                : 'неполный набор'}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <p className="font-medium text-foreground">Каналы в базе</p>
            <p>
              Включённых: {tgStatusQuery.data?.channels.inDatabaseEnabled ?? '—'} из{' '}
              {tgStatusQuery.data?.channels.inDatabaseTotal ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <p className="font-medium text-foreground">Запасной список в env</p>
            <p>Каналов в TG_NEWS_CHANNELS: {tgStatusQuery.data?.channels.envListCount ?? '—'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end border-t pt-4">
          <div className="min-w-[170px]">
            <label className="text-xs font-medium block mb-1">Город</label>
            <select
              value={tgNewRegionId}
              onChange={(e) => setTgNewRegionId(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
            >
              <option value="">Выберите город</option>
              {regions.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium block mb-1">Канал</label>
            <input
              value={tgNewRef}
              onChange={(e) => setTgNewRef(e.target.value)}
              placeholder="@news или https://t.me/news"
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium block mb-1">Подпись (необязательно)</label>
            <input
              value={tgNewLabel}
              onChange={(e) => setTgNewLabel(e.target.value)}
              placeholder="Например: Застройщик X"
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
            />
          </div>
          <button
            type="button"
            disabled={tgAddMutation.isPending || !tgNewRef.trim() || !tgNewRegionId}
            onClick={() => tgAddMutation.mutate()}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-700 disabled:opacity-50 h-[42px]"
          >
            {tgAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Добавить канал
          </button>
        </div>

        {tgChannelsQuery.isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!tgChannelsQuery.isLoading && tgChannels.length === 0 && (
          <p className="text-sm text-muted-foreground">Пока нет каналов — добавьте первый выше.</p>
        )}

        {tgChannels.length > 0 && (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allEnabledSelected}
                      onChange={() => {
                        if (allEnabledSelected) setSelectedTgIds([]);
                        else setSelectedTgIds([...enabledTgIds]);
                      }}
                      title="Выбрать все включённые (для выборочного импорта)"
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Город</th>
                  <th className="px-3 py-2 font-medium">Канал</th>
                  <th className="px-3 py-2 font-medium">Подпись</th>
                  <th className="px-3 py-2 font-medium text-center">Вкл.</th>
                  <th className="px-3 py-2 font-medium">Лимит</th>
                  <th className="px-3 py-2 font-medium text-center">Сразу на сайте</th>
                  <th className="px-3 py-2 font-medium">Порядок</th>
                  <th className="px-3 py-2 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {tgChannels.map((row) => (
                  <TelegramChannelEditorRow
                    key={row.id}
                    row={row}
                    regions={regions}
                    selected={selectedTgIds.includes(row.id)}
                    onToggleSelect={() =>
                      setSelectedTgIds((prev) =>
                        prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id],
                      )
                    }
                    onUpdated={() => {
                      void tgChannelsQuery.refetch();
                      void tgStatusQuery.refetch();
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <div>
            <label className="text-xs font-medium block mb-1">За один запуск (на канал), макс. 100</label>
            <input
              type="number"
              min={1}
              max={100}
              value={tgRunLimit}
              onChange={(e) => setTgRunLimit(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm w-24 bg-background"
            />
          </div>
          <button
            type="button"
            disabled={tgSyncMutation.isPending}
            onClick={() => tgSyncMutation.mutate()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {tgSyncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {selectedTgIds.length ? `Импорт: выбранные (${selectedTgIds.length})` : 'Импортировать все включённые'}
          </button>
          <button
            type="button"
            disabled={tgBackfillPhotosMutation.isPending}
            onClick={() => {
              const raw = window.prompt('Сколько последних Telegram-новостей проверить на фото?', '30');
              if (raw === null) return;
              const limit = Math.max(1, Math.min(200, Number(raw) || 30));
              tgBackfillPhotosMutation.mutate(limit);
            }}
            className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {tgBackfillPhotosMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Дотянуть фото
          </button>
          {selectedTgIds.length > 0 && (
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setSelectedTgIds([])}>
              Сбросить выбор
            </button>
          )}
        </div>
      </div>

      {tgQrWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Подключение Telegram: мастер 1-2-3</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Выполните шаги ниже, чтобы сохранить MTProto-сессию и запускать импорт без CLI.
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-muted"
                onClick={() => setTgQrWizardOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border p-3">
                  <p className="font-semibold">1. Сканируйте QR</p>
                  <p className="text-muted-foreground mt-1">Telegram → Настройки → Устройства → Подключить устройство.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold">2. Введите 2FA</p>
                  <p className="text-muted-foreground mt-1">Если Telegram запросит облачный пароль, введите его здесь.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold">3. Дождитесь “Готово”</p>
                  <p className="text-muted-foreground mt-1">После сохранения сессии можно сразу запускать импорт.</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                Статус:{' '}
                <span className="font-semibold">
                  {tgQrPoll?.phase === 'starting' && 'Подготовка…'}
                  {tgQrPoll?.phase === 'awaiting_scan' && 'Ждём сканирование'}
                  {tgQrPoll?.phase === 'awaiting_password' && 'Нужен облачный пароль Telegram'}
                  {tgQrPoll?.phase === 'success' && 'Готово'}
                  {tgQrPoll?.phase === 'error' && 'Ошибка'}
                  {tgQrPoll?.phase === 'cancelled' && 'Отменено'}
                  {!tgQrPoll && (tgQrStartMut.isPending ? 'Запуск…' : 'Ожидание запуска')}
                </span>
              </div>

              {!tgQrFlowId && !tgQrStartMut.isPending && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Нажмите кнопку ниже, чтобы запустить новый QR-flow.</p>
                  <button
                    type="button"
                    onClick={() => {
                      void startQrWizard();
                    }}
                    className="inline-flex items-center gap-2 text-sm border border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-2 rounded-xl hover:bg-sky-500/10"
                  >
                    Запустить подключение
                  </button>
                </div>
              )}

              {tgQrDataUrl && tgQrPoll?.phase === 'awaiting_scan' && (
                <div className="rounded-lg border p-4 flex justify-center bg-muted/20">
                  <img src={tgQrDataUrl} alt="QR для входа в Telegram" className="w-[260px] h-[260px] rounded-lg border bg-white" />
                </div>
              )}

              {tgQrPoll?.phase === 'awaiting_password' && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="text-sm font-semibold">Введите облачный пароль Telegram</span>
                    </div>
                    {tgQrSecondsLeft != null && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-600/20 text-amber-900 dark:text-amber-100">
                        Осталось: {formatCountdown(tgQrSecondsLeft)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Это пароль двухэтапной аутентификации Telegram (2FA), не SMS-код.
                  </p>
                  <div className="rounded-lg border border-amber-500/30 bg-background/70 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Где взять облачный пароль?</p>
                    <p>
                      Откройте Telegram: <span className="font-medium">Настройки → Конфиденциальность → Двухэтапная аутентификация</span>.
                    </p>
                    <p>
                      Если пароль не помните — нажмите <span className="font-medium">«Забыли пароль?»</span> в Telegram и восстановите через привязанный email.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[220px]">
                      <label className="text-[11px] font-medium block mb-1">Облачный пароль</label>
                      <input
                        type="password"
                        value={tgQrPwd}
                        onChange={(e) => setTgQrPwd(e.target.value)}
                        autoComplete="current-password"
                        className="border rounded-lg px-2 py-2 text-sm w-full bg-background"
                        placeholder={tgQrPoll.passwordHint ? `Подсказка: ${tgQrPoll.passwordHint}` : 'Пароль 2FA'}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={tgQrPwdMut.isPending || !tgQrPwd.trim()}
                      onClick={() => tgQrFlowId && tgQrPwdMut.mutate({ flowId: tgQrFlowId, password: tgQrPwd })}
                      className="text-sm bg-sky-600 text-white px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      {tgQrPwdMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отправить пароль'}
                    </button>
                  </div>
                </div>
              )}

              {tgQrPoll?.phase === 'success' && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4" />
                  <p className="text-sm font-medium">Сессия успешно сохранена. Теперь импорт из Telegram доступен.</p>
                </div>
              )}

              {tgQrPoll?.phase === 'error' && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">Подключение не завершено</p>
                  <p className="text-xs text-muted-foreground mt-1">{tgQrPoll.errorMessage ?? 'Произошла ошибка входа по QR.'}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-sm px-3 py-2 rounded-lg border hover:bg-muted"
                onClick={() => setTgQrWizardOpen(false)}
              >
                Закрыть
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={tgQrResetMut.isPending || tgQrStartMut.isPending}
                  onClick={() => {
                    void resetAndStartQrWizard();
                  }}
                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
                >
                  {(tgQrResetMut.isPending || tgQrStartMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Сбросить и начать заново
                </button>
                {tgQrFlowId && (
                  <button
                    type="button"
                    disabled={tgQrCancelMut.isPending}
                    onClick={() => tgQrCancelMut.mutate(tgQrFlowId)}
                    className="text-sm px-3 py-2 rounded-lg border hover:bg-muted disabled:opacity-50"
                  >
                    Отменить текущий
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-background border rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold">{editing ? 'Редактирование' : 'Новая статья'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Заголовок</label>
              <input
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value, ...(creating ? { slug: slugify(e.target.value) } : {}) })); }}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Город</label>
              <select
                value={form.regionId}
                onChange={e => setForm(f => ({ ...f, regionId: e.target.value }))}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              >
                <option value="">Выберите город</option>
                {regions.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Текст</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5}
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Фото из медиа</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.mediaUrls.map((u) => (
                <div key={u} className="relative h-16 w-16 rounded-lg border overflow-hidden group">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                    onClick={() =>
                      setForm((prev) => {
                        const idx = prev.mediaUrls.indexOf(u);
                        if (idx < 0) return prev;
                        const mediaUrls = prev.mediaUrls.filter((_, i) => i !== idx);
                        const mediaFileIds = prev.mediaFileIds.filter((_, i) => i !== idx);
                        return { ...prev, mediaUrls, mediaFileIds };
                      })
                    }
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 rounded-xl text-sm hover:bg-muted"
            >
              <Plus className="w-4 h-4" />
              Добавить из медиа
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
              className="rounded"
            />
            Опубликовать
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
              disabled={createMutation.isPending || updateMutation.isPending || !form.title || !form.slug || !form.regionId}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); resetForm(); }} className="text-sm text-muted-foreground hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      )}

      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        title="Фото новости"
        multiple
        onPick={(items) =>
          setForm((prev) => {
            const seen = new Set(prev.mediaFileIds);
            const mediaFileIds = [...prev.mediaFileIds];
            const mediaUrls = [...prev.mediaUrls];
            for (const item of items) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              mediaFileIds.push(item.id);
              mediaUrls.push(item.url);
            }
            return { ...prev, mediaFileIds, mediaUrls };
          })
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && !showForm && (
        <div className="bg-background border rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Нет новостей
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Заголовок</th>
                  <th className="px-4 py-3 font-medium text-center">Статус</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.title}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isPublished
                        ? <Eye className="w-4 h-4 text-green-600 inline" />
                        : <EyeOff className="w-4 h-4 text-muted-foreground inline" />
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.publishedAt
                        ? new Date(r.publishedAt).toLocaleDateString('ru-RU')
                        : new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Редактировать">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(r.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">Стр. {meta.page} из {meta.total_pages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))} disabled={page >= meta.total_pages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
