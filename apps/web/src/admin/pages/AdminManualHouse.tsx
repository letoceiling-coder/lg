import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageIcon, Loader2, Plus, Save, X } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import MediaPickerDialog from '@/admin/components/MediaPickerDialog';
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
type ListingHouse = {
  houseType: 'DETACHED' | 'SEMI' | 'TOWNHOUSE' | 'DUPLEX' | null;
  material: string | null;
  areaTotal: string | number | null;
  areaLiving: string | number | null;
  areaKitchen: string | number | null;
  areaLand: string | number | null;
  floorsCount: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  districtName: string | null;
  settlement: string | null;
  street: string | null;
  houseNumber: string | null;
  synonyms: string | null;
  distanceToCity: number | null;
  directionSouth: boolean | null;
  directionNorth: boolean | null;
  directionEast: boolean | null;
  directionWest: boolean | null;
  inBelgorodDistrict: boolean | null;
  inBelgorodRegion: boolean | null;
  hasGarage: boolean | null;
  yearBuilt: number | null;
  photoUrl: string | null;
  extraPhotoUrls: unknown;
};
type ListingDetail = {
  id: number;
  kind: 'HOUSE' | string;
  regionId: number;
  blockId: number | null;
  price: string | number | null;
  status: ListingStatus;
  isPublished: boolean;
  isHot: boolean;
  address: string | null;
  description: string | null;
  house: ListingHouse | null;
  seller?: ApiSeller;
};

const materialOptions = ['Панель', 'Кирпич', 'Блок', 'Монолит', 'Железобетон', 'Дерево', 'Металл'];
const districtOptions = [
  'Алексеевский',
  'Белгородский',
  'Борисовский',
  'Валуйский',
  'Вейделевский',
  'Волоконовский',
  'Грайворонский',
  'Губкинский',
  'Ивнянский',
  'Корочанский',
  'Красненский',
  'Красногвардейский',
  'Краснояружский',
  'Новооскольский',
  'Прохоровский',
  'Ракитянский',
  'Ровеньский',
  'Старооскольский',
  'Чернянский',
  'Шебекинский',
  'Яковлевский',
];

const houseTypeOptions = [
  { value: '', label: '—' },
  { value: 'DETACHED', label: 'Отдельностоящий' },
  { value: 'SEMI', label: 'Сблокированный (SEMI)' },
  { value: 'TOWNHOUSE', label: 'Таунхаус' },
  { value: 'DUPLEX', label: 'Дуплекс' },
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

function buildHouseAddress(settlement: string, street: string, houseNumber: string) {
  return [settlement.trim(), street.trim(), houseNumber.trim()].filter(Boolean).join(', ');
}

export default function AdminManualHouse() {
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
    queryKey: ['admin', 'manual-house', editId],
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
  const [isHot, setIsHot] = useState(false);
  const [houseType, setHouseType] = useState('');
  const [material, setMaterial] = useState('Блок');
  const [areaTotal, setAreaTotal] = useState('');
  const [areaLiving, setAreaLiving] = useState('');
  const [areaKitchen, setAreaKitchen] = useState('');
  const [areaLand, setAreaLand] = useState('');
  const [floorsCount, setFloorsCount] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [districtName, setDistrictName] = useState('Белгородский');
  const [settlement, setSettlement] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [description, setDescription] = useState('');
  const [distanceToCity, setDistanceToCity] = useState('');
  const [directionSouth, setDirectionSouth] = useState(false);
  const [directionNorth, setDirectionNorth] = useState(false);
  const [directionEast, setDirectionEast] = useState(false);
  const [directionWest, setDirectionWest] = useState(false);
  const [inBelgorodDistrict, setInBelgorodDistrict] = useState(true);
  const [inBelgorodRegion, setInBelgorodRegion] = useState(true);
  const [hasGarage, setHasGarage] = useState(false);
  const [yearBuilt, setYearBuilt] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [extraPhotoUrls, setExtraPhotoUrls] = useState<string[]>([]);
  const [seller, setSeller] = useState<SellerForm>(emptySellerForm);
  const [picker, setPicker] = useState<null | 'main' | 'extra'>(null);
  const [didInitForm, setDidInitForm] = useState(false);

  const effectiveRegionId = regionId || initialRegionId;

  const { data: blocksData } = useQuery({
    queryKey: ['blocks', 'for-manual-house', effectiveRegionId],
    queryFn: () =>
      apiGet<{ data: BlockRow[] }>(`/blocks?region_id=${effectiveRegionId}&per_page=200&page=1&sort=name_asc`),
    enabled: effectiveRegionId > 0,
    staleTime: 30_000,
  });
  const blocks = blocksData?.data ?? [];

  useEffect(() => {
    if (!regionId && initialRegionId) {
      setRegionId(initialRegionId);
    }
  }, [initialRegionId, regionId]);

  useEffect(() => {
    if (!isEdit || !current || didInitForm) return;
    if (current.kind !== 'HOUSE') return;
    setBlockId(current.blockId ?? '');
    setPrice(current.price != null ? String(current.price) : '');
    setStatus(current.status);
    setIsPublished(Boolean(current.isPublished));
    setIsHot(Boolean(current.isHot));
    setDescription(current.description ?? '');
    setSeller(sellerFormFromApi(current.seller));
    setHouseType(current.house?.houseType ?? '');
    setMaterial(current.house?.material ?? 'Блок');
    setAreaTotal(current.house?.areaTotal != null ? String(current.house.areaTotal) : '');
    setAreaLiving(current.house?.areaLiving != null ? String(current.house.areaLiving) : '');
    setAreaKitchen(current.house?.areaKitchen != null ? String(current.house.areaKitchen) : '');
    setAreaLand(current.house?.areaLand != null ? String(current.house.areaLand) : '');
    setFloorsCount(current.house?.floorsCount != null ? String(current.house.floorsCount) : '');
    setBedrooms(current.house?.bedrooms != null ? String(current.house.bedrooms) : '');
    setBathrooms(current.house?.bathrooms != null ? String(current.house.bathrooms) : '');
    setDistrictName(current.house?.districtName ?? 'Белгородский');
    setSettlement(current.house?.settlement ?? '');
    setStreet(current.house?.street ?? '');
    setHouseNumber(current.house?.houseNumber ?? '');
    setSynonyms(current.house?.synonyms ?? '');
    setDistanceToCity(current.house?.distanceToCity != null ? String(current.house.distanceToCity) : '');
    setDirectionSouth(Boolean(current.house?.directionSouth));
    setDirectionNorth(Boolean(current.house?.directionNorth));
    setDirectionEast(Boolean(current.house?.directionEast));
    setDirectionWest(Boolean(current.house?.directionWest));
    setInBelgorodDistrict(current.house?.inBelgorodDistrict ?? true);
    setInBelgorodRegion(current.house?.inBelgorodRegion ?? true);
    setHasGarage(Boolean(current.house?.hasGarage));
    setYearBuilt(current.house?.yearBuilt != null ? String(current.house.yearBuilt) : '');
    setPhotoUrl(typeof current.house?.photoUrl === 'string' ? current.house.photoUrl : '');
    setExtraPhotoUrls(
      Array.isArray(current.house?.extraPhotoUrls)
        ? current.house.extraPhotoUrls.filter((v): v is string => typeof v === 'string')
        : [],
    );
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
        isHot,
        address: buildHouseAddress(settlement, street, houseNumber) || undefined,
        description: description.trim() || undefined,
        house: {
          houseType: houseType || undefined,
          material: material || undefined,
          areaTotal: areaTotal ? Number(areaTotal) : undefined,
          areaLiving: areaLiving ? Number(areaLiving) : undefined,
          areaKitchen: areaKitchen ? Number(areaKitchen) : undefined,
          areaLand: areaLand ? Number(areaLand) : undefined,
          floorsCount: floorsCount ? Number(floorsCount) : undefined,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          districtName: districtName || undefined,
          settlement: settlement.trim() || undefined,
          street: street.trim() || undefined,
          houseNumber: houseNumber.trim() || undefined,
          synonyms: synonyms.trim() || undefined,
          distanceToCity: distanceToCity ? Number(distanceToCity) : undefined,
          directionSouth,
          directionNorth,
          directionEast,
          directionWest,
          inBelgorodDistrict,
          inBelgorodRegion,
          hasGarage,
          yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
          photoUrl: photoUrl.trim() || undefined,
          extraPhotoUrls: extraPhotoUrls.length ? extraPhotoUrls : undefined,
        },
      };
      if (sellerPayload) body.seller = sellerPayload;
      if (isEdit && editId != null) {
        return apiPatch(`/admin/listings/${editId}/manual-house`, body);
      }
      return apiPost('/admin/listings/manual-house', body);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Дом обновлён' : 'Дом создан');
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
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/listings">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Редактирование дома' : 'Новый дом (MANUAL)'}</h1>
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
          <label className="text-xs text-muted-foreground mb-1 block">Кол-во комнат</label>
          <Input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Этажность</label>
          <Input value={floorsCount} onChange={(e) => setFloorsCount(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Материал</label>
          <div className="flex flex-wrap gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
            {materialOptions.map((option) => (
              <label key={option} className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="house-material"
                  value={option}
                  checked={material === option}
                  onChange={() => setMaterial(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Площадь общая, м²</label>
          <Input value={areaTotal} onChange={(e) => setAreaTotal(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Площадь жилая, м²</label>
          <Input value={areaLiving} onChange={(e) => setAreaLiving(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Кухня, м²</label>
          <Input value={areaKitchen} onChange={(e) => setAreaKitchen(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Участок, сот.</label>
          <Input value={areaLand} onChange={(e) => setAreaLand(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Район</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
          >
            {districtOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Нас. пункт</label>
          <Input value={settlement} onChange={(e) => setSettlement(e.target.value)} placeholder="пос. Майский" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Улица</label>
          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Поэтическая" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Дом</label>
          <Input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Расстояние до города, км</label>
          <Input value={distanceToCity} onChange={(e) => setDistanceToCity(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Синонимы</label>
          <Input
            value={synonyms}
            onChange={(e) => setSynonyms(e.target.value)}
            placeholder="Шопино Зелёная поляна Ерик Беломестное Беловское Терновка Игуменка"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Информация</label>
          <textarea
            rows={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Направление</label>
          <div className="flex flex-wrap gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={directionSouth} onChange={(e) => setDirectionSouth(e.target.checked)} />
              Южное
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={directionNorth} onChange={(e) => setDirectionNorth(e.target.checked)} />
              Северное
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={directionEast} onChange={(e) => setDirectionEast(e.target.checked)} />
              Восточное
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={directionWest} onChange={(e) => setDirectionWest(e.target.checked)} />
              Западное
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Тип дома</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={houseType}
            onChange={(e) => setHouseType(e.target.value)}
          >
            {houseTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Санузлы</label>
          <Input value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Год постройки</label>
          <Input value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Владелец</label>
          <Input
            value={seller.fullName}
            onChange={(e) => setSeller({ ...seller, fullName: e.target.value })}
            placeholder="ФИО собственника"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasGarage} onChange={(e) => setHasGarage(e.target.checked)} />
          Гараж
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inBelgorodDistrict} onChange={(e) => setInBelgorodDistrict(e.target.checked)} />
          Белгородский район
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inBelgorodRegion} onChange={(e) => setInBelgorodRegion(e.target.checked)} />
          Белгородская область
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isHot} onChange={(e) => setIsHot(e.target.checked)} />
          Горячее объявление
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Опубликовано
        </label>

        <div className="md:col-span-2 space-y-2 border-t pt-4 mt-1">
          <label className="text-xs text-muted-foreground mb-1 block">Основное фото (медиатека)</label>
          <div className="flex flex-wrap items-center gap-2">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-16 w-16 object-cover rounded-lg border" />
            ) : (
              <span className="text-xs text-muted-foreground">Не выбрано</span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setPicker('main')}>
              <ImageIcon className="w-4 h-4 mr-1" />
              Выбрать
            </Button>
            {photoUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoUrl('')}>
                Сброс
              </Button>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs text-muted-foreground mb-1 block">Дополнительные фото</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {extraPhotoUrls.map((u) => (
              <div key={u} className="relative h-16 w-16 rounded-lg border overflow-hidden group">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                  onClick={() => setExtraPhotoUrls((prev) => prev.filter((x) => x !== u))}
                  aria-label="Убрать"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPicker('extra')}>
            <Plus className="w-4 h-4 mr-1" />
            Добавить из медиа
          </Button>
        </div>
      </div>

      <SellerFields value={seller} onChange={setSeller} />

      <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Сохранить
      </Button>

      <MediaPickerDialog
        open={picker != null}
        onOpenChange={(o) => !o && setPicker(null)}
        title={picker === 'main' ? 'Основное фото дома' : 'Дополнительные фото дома'}
        multiple={picker === 'extra'}
        onPick={(items) => {
          const urls = items.map((i) => i.url);
          if (picker === 'main') setPhotoUrl(urls[0] ?? '');
          else {
            setExtraPhotoUrls((prev) => {
              const set = new Set(prev);
              for (const u of urls) set.add(u);
              return Array.from(set);
            });
          }
          setPicker(null);
        }}
      />
    </div>
  );
}

