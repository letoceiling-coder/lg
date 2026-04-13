import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

type RegionRow = { id: number; code: string; name: string };
type BlockRow = { id: number; name: string };
type ListingLand = {
  areaSotki: string | number | null;
  landCategory: string | null;
  cadastralNumber: string | null;
  hasCommunications: boolean | null;
};
type ListingDetail = {
  id: number;
  kind: 'LAND' | string;
  regionId: number;
  blockId: number | null;
  price: string | number | null;
  status: 'ACTIVE' | 'DRAFT' | 'RESERVED' | 'SOLD';
  isPublished: boolean;
  land: ListingLand | null;
};

const statusOptions = ['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD'] as const;

function parseError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      if (e.message) return e.message;
    }
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function AdminManualLand() {
  const navigate = useNavigate();
  const { listingId } = useParams<{ listingId?: string }>();
  const editId = listingId ? Number(listingId) : null;
  const isEdit = Number.isFinite(editId) && editId != null;

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60_000,
  });

  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: ['admin', 'manual-land', editId],
    queryFn: () => apiGet<ListingDetail>(`/listings/${editId}`),
    enabled: isEdit,
    staleTime: 10_000,
  });

  const initialRegionId = useMemo(
    () => current?.regionId ?? regions.find((r) => r.code.toLowerCase() === 'msk')?.id ?? regions[0]?.id ?? 0,
    [current?.regionId, regions],
  );

  const [regionId, setRegionId] = useState<number>(0);
  const [blockId, setBlockId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('DRAFT');
  const [isPublished, setIsPublished] = useState(false);
  const [areaSotki, setAreaSotki] = useState('');
  const [landCategory, setLandCategory] = useState('');
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [hasCommunications, setHasCommunications] = useState(false);
  const [didInitForm, setDidInitForm] = useState(false);

  const effectiveRegionId = regionId || initialRegionId;

  const { data: blocksData } = useQuery({
    queryKey: ['blocks', 'for-manual-land', effectiveRegionId],
    queryFn: () =>
      apiGet<{ data: BlockRow[] }>(`/blocks?region_id=${effectiveRegionId}&per_page=200&page=1&sort=name_asc`),
    enabled: effectiveRegionId > 0,
    staleTime: 30_000,
  });
  const blocks = blocksData?.data ?? [];

  useEffect(() => {
    if (!regionId && initialRegionId) setRegionId(initialRegionId);
  }, [initialRegionId, regionId]);

  useEffect(() => {
    if (!isEdit || !current || didInitForm) return;
    if (current.kind !== 'LAND') return;
    setBlockId(current.blockId ?? '');
    setPrice(current.price != null ? String(current.price) : '');
    setStatus(current.status);
    setIsPublished(Boolean(current.isPublished));
    setAreaSotki(current.land?.areaSotki != null ? String(current.land.areaSotki) : '');
    setLandCategory(current.land?.landCategory ?? '');
    setCadastralNumber(current.land?.cadastralNumber ?? '');
    setHasCommunications(Boolean(current.land?.hasCommunications));
    setDidInitForm(true);
  }, [current, didInitForm, isEdit]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedPrice = Number(price);
      if (!effectiveRegionId) throw new Error('Выберите регион');
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) throw new Error('Введите корректную цену');

      const body = {
        regionId: effectiveRegionId,
        blockId: blockId === '' ? undefined : blockId,
        price: parsedPrice,
        status,
        isPublished,
        land: {
          areaSotki: areaSotki ? Number(areaSotki) : undefined,
          landCategory: landCategory.trim() || undefined,
          cadastralNumber: cadastralNumber.trim() || undefined,
          hasCommunications,
        },
      };
      if (isEdit && editId != null) {
        return apiPatch(`/admin/listings/${editId}/manual-land`, body);
      }
      return apiPost('/admin/listings/manual-land', body);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Участок обновлён' : 'Участок создан');
      navigate('/admin/listings');
    },
    onError: (e) => toast.error(parseError(e, 'Ошибка сохранения')),
  });

  if (isEdit && loadingCurrent) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/listings">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Редактирование участка' : 'Новый участок (MANUAL)'}</h1>
      </div>

      <div className="rounded-xl border p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Регион</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={effectiveRegionId}
            onChange={(e) => {
              setRegionId(Number(e.target.value));
              setBlockId('');
            }}
          >
            <option value={0}>Выберите регион</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">ЖК (опционально)</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value ? Number(e.target.value) : '')}
            disabled={effectiveRegionId <= 0}
          >
            <option value="">—</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Цена, ₽</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Площадь, сотки</label>
          <Input value={areaSotki} onChange={(e) => setAreaSotki(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Категория земли</label>
          <Input value={landCategory} onChange={(e) => setLandCategory(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Кадастровый номер</label>
          <Input value={cadastralNumber} onChange={(e) => setCadastralNumber(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasCommunications} onChange={(e) => setHasCommunications(e.target.checked)} />
          Коммуникации подведены
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Опубликовано
        </label>
      </div>

      <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Сохранить
      </Button>
    </div>
  );
}
