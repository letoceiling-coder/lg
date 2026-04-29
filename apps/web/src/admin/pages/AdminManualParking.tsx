import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import SellerFields, {
  emptySellerForm,
  normalizeSellerForm,
  sellerFormFromApi,
  type ApiSeller,
  type SellerForm,
} from '@/admin/components/SellerFields';
import { listingStatusOptions, type ListingStatus } from '@/admin/lib/listingStatus';

type RegionRow = { id: number; code: string; name: string };
type BlockRow = { id: number; name: string };
type ListingParking = {
  parkingType: 'UNDERGROUND' | 'GROUND' | 'MULTILEVEL' | null;
  area: string | number | null;
  floor: number | null;
  number: string | null;
};
type ListingDetail = {
  id: number;
  kind: 'PARKING' | string;
  regionId: number;
  blockId: number | null;
  price: string | number | null;
  status: ListingStatus;
  isPublished: boolean;
  parking: ListingParking | null;
  seller?: ApiSeller;
};

const parkingTypeOptions = [
  { value: '', label: '—' },
  { value: 'UNDERGROUND', label: 'Подземный' },
  { value: 'GROUND', label: 'Наземный' },
  { value: 'MULTILEVEL', label: 'Многоуровневый' },
] as const;

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

export default function AdminManualParking() {
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
    queryKey: ['admin', 'manual-parking', editId],
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
  const [status, setStatus] = useState<ListingStatus>('DRAFT');
  const [isPublished, setIsPublished] = useState(false);
  const [parkingType, setParkingType] = useState('');
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [number, setNumber] = useState('');
  const [seller, setSeller] = useState<SellerForm>(emptySellerForm);
  const [didInitForm, setDidInitForm] = useState(false);

  const effectiveRegionId = regionId || initialRegionId;

  const { data: blocksData } = useQuery({
    queryKey: ['blocks', 'for-manual-parking', effectiveRegionId],
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
    if (current.kind !== 'PARKING') return;
    setBlockId(current.blockId ?? '');
    setPrice(current.price != null ? String(current.price) : '');
    setStatus(current.status);
    setIsPublished(Boolean(current.isPublished));
    setSeller(sellerFormFromApi(current.seller));
    setParkingType(current.parking?.parkingType ?? '');
    setArea(current.parking?.area != null ? String(current.parking.area) : '');
    setFloor(current.parking?.floor != null ? String(current.parking.floor) : '');
    setNumber(current.parking?.number ?? '');
    setDidInitForm(true);
  }, [current, didInitForm, isEdit]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedPrice = Number(price);
      if (!effectiveRegionId) throw new Error('Выберите регион');
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) throw new Error('Введите корректную цену');

      const sellerPayload = normalizeSellerForm(seller);
      const body: Record<string, unknown> = {
        regionId: effectiveRegionId,
        blockId: blockId === '' ? undefined : blockId,
        price: parsedPrice,
        status,
        isPublished,
        parking: {
          parkingType: parkingType || undefined,
          area: area ? Number(area) : undefined,
          floor: floor ? Number(floor) : undefined,
          number: number.trim() || undefined,
        },
      };
      if (sellerPayload) body.seller = sellerPayload;
      if (isEdit && editId != null) {
        return apiPatch(`/admin/listings/${editId}/manual-parking`, body);
      }
      return apiPost('/admin/listings/manual-parking', body);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Паркинг обновлён' : 'Паркинг создан');
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
        <h1 className="text-2xl font-bold">{isEdit ? 'Редактирование паркинга' : 'Новый паркинг (MANUAL)'}</h1>
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
            onChange={(e) => setStatus(e.target.value as ListingStatus)}
          >
            {listingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Тип паркинга</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={parkingType}
            onChange={(e) => setParkingType(e.target.value)}
          >
            {parkingTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Площадь, м²</label>
          <Input value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Этаж</label>
          <Input value={floor} onChange={(e) => setFloor(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Номер места</label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Опубликовано
        </label>
      </div>

      <SellerFields value={seller} onChange={setSeller} />

      <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Сохранить
      </Button>
    </div>
  );
}

