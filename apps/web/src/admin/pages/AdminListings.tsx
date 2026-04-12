import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Home, Loader2, ChevronLeft, ChevronRight, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ListingRow = {
  id: number;
  price: string | number | null;
  dataSource?: string;
  status?: string;
  isPublished?: boolean;
  blockId?: number | null;
  apartment: {
    areaTotal: string | number | null;
    floor: number | null;
    roomType: { name: string } | null;
  } | null;
};

interface Paginated {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

type RegionRow = { id: number; code: string; name: string };
type RefOpt = { id: number; name: string };

export default function AdminListings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [sourceTab, setSourceTab] = useState<'feed' | 'manual'>('feed');
  const perPage = 30;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [regionId, setRegionId] = useState<number | ''>('');
  const [blockId, setBlockId] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('DRAFT');
  const [isPublished, setIsPublished] = useState(false);
  const [areaTotal, setAreaTotal] = useState('');
  const [areaKitchen, setAreaKitchen] = useState('');
  const [floor, setFloor] = useState('');
  const [floorsTotal, setFloorsTotal] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [finishingId, setFinishingId] = useState('');
  const [planUrl, setPlanUrl] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [number, setNumber] = useState('');
  const [formError, setFormError] = useState('');

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const regionIdDefault =
    regions?.find((r) => (r.code ?? '').toLowerCase() === 'msk')?.id ?? regions?.[0]?.id;

  const { data: roomTypes } = useQuery({
    queryKey: ['reference', 'room-types'],
    queryFn: () => apiGet<RefOpt[]>('/reference/room-types'),
    staleTime: 60 * 60 * 1000,
  });

  const { data: finishings } = useQuery({
    queryKey: ['reference', 'finishings'],
    queryFn: () => apiGet<RefOpt[]>('/reference/finishings'),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (regionId === '' && regionIdDefault != null) setRegionId(regionIdDefault);
  }, [regionIdDefault, regionId]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', regionIdDefault, page, sourceTab],
    queryFn: () => {
      const sp = new URLSearchParams({
        region_id: String(regionIdDefault),
        page: String(page),
        per_page: String(perPage),
        kind: 'APARTMENT',
        data_source: sourceTab === 'feed' ? 'FEED' : 'MANUAL',
      });
      if (sourceTab === 'feed') sp.set('status', 'ACTIVE');
      return apiGet<Paginated>(`/listings?${sp}`);
    },
    enabled: regionIdDefault != null,
    staleTime: 20_000,
  });

  const { data: editListing } = useQuery({
    queryKey: ['listing', 'admin-edit', editingId],
    queryFn: () => apiGet<Record<string, unknown>>(`/listings/${editingId}`),
    enabled: dialogOpen && editingId != null,
    staleTime: 0,
  });

  useEffect(() => {
    if (!dialogOpen || !editListing || editingId == null) return;
    const apt = editListing.apartment as Record<string, unknown> | undefined;
    setRegionId(Number(editListing.regionId) || regionIdDefault || '');
    setBlockId(editListing.blockId != null ? String(editListing.blockId) : '');
    setPrice(editListing.price != null ? String(editListing.price) : '');
    setStatus((editListing.status as 'ACTIVE' | 'DRAFT') || 'DRAFT');
    setIsPublished(Boolean(editListing.isPublished));
    if (apt) {
      setAreaTotal(apt.areaTotal != null ? String(apt.areaTotal) : '');
      setAreaKitchen(apt.areaKitchen != null ? String(apt.areaKitchen) : '');
      setFloor(apt.floor != null ? String(apt.floor) : '');
      setFloorsTotal(apt.floorsTotal != null ? String(apt.floorsTotal) : '');
      const rtId =
        apt.roomTypeId ??
        (typeof apt.roomType === 'object' && apt.roomType && 'id' in apt.roomType
          ? (apt.roomType as { id: number }).id
          : undefined);
      setRoomTypeId(rtId != null ? String(rtId) : '');
      const finId =
        apt.finishingId ??
        (typeof apt.finishing === 'object' && apt.finishing && 'id' in apt.finishing
          ? (apt.finishing as { id: number }).id
          : undefined);
      setFinishingId(finId != null ? String(finId) : '');
      setPlanUrl(typeof apt.planUrl === 'string' ? apt.planUrl : '');
      setBuildingName(typeof apt.buildingName === 'string' ? apt.buildingName : '');
      setNumber(typeof apt.number === 'string' ? apt.number : '');
    }
  }, [dialogOpen, editListing, editingId, regionIdDefault]);

  const resetForm = () => {
    setEditingId(null);
    setFormError('');
    setBlockId('');
    setPrice('');
    setStatus('DRAFT');
    setIsPublished(false);
    setAreaTotal('');
    setAreaKitchen('');
    setFloor('');
    setFloorsTotal('');
    setRoomTypeId('');
    setFinishingId('');
    setPlanUrl('');
    setBuildingName('');
    setNumber('');
    if (regionIdDefault != null) setRegionId(regionIdDefault);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setFormError('');
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rid = typeof regionId === 'number' ? regionId : Number(regionId);
      if (!Number.isFinite(rid)) throw new Error('Выберите регион');
      const p = Number(price.replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(p) || p < 1) throw new Error('Укажите цену');
      const at = Number(areaTotal.replace(',', '.'));
      if (!Number.isFinite(at) || at <= 0) throw new Error('Укажите общую площадь');
      const bid = blockId.trim() ? Number.parseInt(blockId.trim(), 10) : undefined;
      if (blockId.trim() && !Number.isFinite(bid)) throw new Error('Некорректный ID ЖК');

      const apartment: Record<string, unknown> = {
        areaTotal: at,
      };
      const ak = areaKitchen.trim() ? Number(areaKitchen.replace(',', '.')) : undefined;
      if (ak !== undefined && Number.isFinite(ak)) apartment.areaKitchen = ak;
      const fl = floor.trim() ? Number.parseInt(floor.trim(), 10) : undefined;
      if (fl !== undefined && Number.isFinite(fl)) apartment.floor = fl;
      const ft = floorsTotal.trim() ? Number.parseInt(floorsTotal.trim(), 10) : undefined;
      if (ft !== undefined && Number.isFinite(ft)) apartment.floorsTotal = ft;
      const rt = roomTypeId.trim() ? Number.parseInt(roomTypeId.trim(), 10) : undefined;
      if (rt !== undefined && Number.isFinite(rt)) apartment.roomTypeId = rt;
      const fn = finishingId.trim() ? Number.parseInt(finishingId.trim(), 10) : undefined;
      if (fn !== undefined && Number.isFinite(fn)) apartment.finishingId = fn;
      if (planUrl.trim()) apartment.planUrl = planUrl.trim();
      if (buildingName.trim()) apartment.buildingName = buildingName.trim();
      if (number.trim()) apartment.number = number.trim();

      if (editingId != null) {
        const patch: Record<string, unknown> = {
          price: p,
          status,
          isPublished,
          apartment,
        };
        if (blockId.trim() === '') patch.blockId = null;
        else patch.blockId = bid;
        return apiPatch(`/admin/listings/${editingId}/manual-apartment`, patch);
      }

      const body: Record<string, unknown> = {
        regionId: rid,
        price: p,
        status,
        isPublished,
        apartment,
      };
      if (bid != null) body.blockId = bid;
      return apiPost('/admin/listings/manual-apartment', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: unknown) => {
      let msg = 'Ошибка сохранения';
      if (e instanceof ApiError) {
        try {
          const j = JSON.parse(e.message) as { message?: string | string[] };
          if (Array.isArray(j.message)) msg = j.message.join(', ');
          else if (typeof j.message === 'string') msg = j.message;
          else if (e.message) msg = e.message;
        } catch {
          if (e.message) msg = e.message;
        }
      } else if (e instanceof Error) msg = e.message;
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/listings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Квартиры</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Витрина из фида и ручные объявления (<code className="text-xs bg-muted px-1 rounded">MANUAL</code>).
              Ручные: создание/правка/удаление через API; импорт TrendAgent не перезаписывает их по <code className="text-xs bg-muted px-1 rounded">external_id</code>.
            </p>
          </div>
        </div>
        {sourceTab === 'manual' ? (
          <Button type="button" onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Ручная квартира
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2 mb-4 border-b">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            sourceTab === 'feed'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => { setSourceTab('feed'); setPage(1); }}
        >
          Из фида (FEED)
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            sourceTab === 'manual'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => { setSourceTab('manual'); setPage(1); }}
        >
          Ручные (MANUAL)
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="border rounded-2xl p-8 text-center text-muted-foreground text-sm">Нет записей</div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">Комн.</th>
                  <th className="px-4 py-3 font-medium">Площадь</th>
                  <th className="px-4 py-3 font-medium">Этаж</th>
                  <th className="px-4 py-3 font-medium text-right">Цена</th>
                  <th className="px-4 py-3 font-medium text-center">Сайт</th>
                  {sourceTab === 'manual' ? (
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const priceN = r.price != null ? Number(r.price) : 0;
                  const area = r.apartment?.areaTotal != null ? Number(r.apartment.areaTotal) : null;
                  const isManual = (r.dataSource ?? '').toUpperCase() === 'MANUAL';
                  return (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2 text-muted-foreground text-xs">{r.id}</td>
                      <td className="px-4 py-2 text-xs">{r.dataSource ?? '—'}</td>
                      <td className="px-4 py-2">{r.apartment?.roomType?.name ?? '—'}</td>
                      <td className="px-4 py-2">{area != null && Number.isFinite(area) ? `${area} м²` : '—'}</td>
                      <td className="px-4 py-2">{r.apartment?.floor ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {priceN > 0 ? `${(priceN / 1_000_000).toFixed(1)} млн` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={`/apartment/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex justify-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                      {sourceTab === 'manual' && isManual ? (
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground mr-1"
                            title="Править"
                            onClick={() => openEdit(r.id)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-muted text-destructive"
                            title="Удалить"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Удалить объявление #${r.id}?`)) deleteMutation.mutate(r.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      ) : sourceTab === 'manual' ? (
                        <td className="px-4 py-2" />
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Стр. {meta.page} из {meta.total_pages} · {meta.total} шт.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.total_pages}
                  className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId != null ? `Редактировать #${editingId}` : 'Новая ручная квартира'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <div className="space-y-1">
              <Label>Регион</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={regionId === '' ? '' : String(regionId)}
                onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : '')}
                disabled={editingId != null}
              >
                {(regions ?? []).map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} ({reg.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>ID ЖК (необязательно)</Label>
              <Input value={blockId} onChange={(e) => setBlockId(e.target.value)} placeholder="Напр. 123" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Цена, ₽</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12500000" />
              </div>
              <div className="space-y-1">
                <Label>Статус</Label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DRAFT')}
                >
                  <option value="DRAFT">Черновик (DRAFT)</option>
                  <option value="ACTIVE">Активно (ACTIVE)</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Публиковать на сайте
            </label>
            <div className="space-y-1">
              <Label>Площадь общая, м² *</Label>
              <Input value={areaTotal} onChange={(e) => setAreaTotal(e.target.value)} placeholder="54.2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Кухня, м²</Label>
                <Input value={areaKitchen} onChange={(e) => setAreaKitchen(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Этаж</Label>
                <Input value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Этажей в доме</Label>
              <Input value={floorsTotal} onChange={(e) => setFloorsTotal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Комнатность (справочник)</Label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                >
                  <option value="">—</option>
                  {(roomTypes ?? []).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Отделка</Label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
                  value={finishingId}
                  onChange={(e) => setFinishingId(e.target.value)}
                >
                  <option value="">—</option>
                  {(finishings ?? []).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL планировки</Label>
              <Input value={planUrl} onChange={(e) => setPlanUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Корпус / литер (текст)</Label>
              <Input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Номер квартиры</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => {
                setFormError('');
                saveMutation.mutate();
              }}
            >
              {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
