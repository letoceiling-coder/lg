import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  Home,
  Loader2,
  Save,
  Store,
  Trash2,
  TreePine,
  X,
} from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MediaPickerDialog from '@/admin/components/MediaPickerDialog';
import SellerFields, { emptySellerForm, normalizeSellerForm, type SellerForm } from '@/admin/components/SellerFields';
import { listingStatusLabel, listingStatusOptions, type ListingStatus } from '@/admin/lib/listingStatus';
import {
  commercialTypeOptions,
  houseTypeOptions,
  listingWizardKindLabels,
  listingWizardMediaLabels,
  listingWizardRequiredAreaLabel,
  marketSegmentOptions,
  optionLabel,
  parkingTypeOptions,
  type ListingWizardKind,
} from '@/admin/lib/listingWizardConfig';

type Kind = ListingWizardKind;

type RegionRow = { id: number; code: string; name: string };
type BlockRow = { id: number; name: string };
type RefOpt = { id: number; name: string };
type ReviewRow = { label: string; value: string };

const KIND_OPTIONS: Array<{
  kind: Kind;
  title: string;
  hint: string;
  icon: typeof Home;
}> = [
  { kind: 'APARTMENT', ...listingWizardKindLabels.APARTMENT, icon: Building2 },
  { kind: 'HOUSE', ...listingWizardKindLabels.HOUSE, icon: Home },
  { kind: 'LAND', ...listingWizardKindLabels.LAND, icon: TreePine },
  { kind: 'COMMERCIAL', ...listingWizardKindLabels.COMMERCIAL, icon: Store },
  { kind: 'PARKING', ...listingWizardKindLabels.PARKING, icon: Car },
];

const STORAGE_KEY = 'admin:listing-wizard:draft:v1';
const STEP_TITLES = ['Тип объекта', 'Геопривязка', 'Характеристики', 'Фото', 'Проверка'] as const;

type DraftState = {
  kind: Kind | null;
  regionId: number | null;
  blockId: string;
  address: string;
  lat: string;
  lng: string;
  price: string;
  status: ListingStatus;
  isPublished: boolean;
  apartment: {
    blockAddress: string;
    marketSegment: 'auto' | 'NEW_BUILDING' | 'SECONDARY';
    areaTotal: string;
    areaKitchen: string;
    floor: string;
    floorsTotal: string;
    roomTypeId: string;
    finishingId: string;
    buildingName: string;
    number: string;
  };
  house: {
    houseType: '' | 'DETACHED' | 'SEMI' | 'TOWNHOUSE' | 'DUPLEX';
    areaTotal: string;
    areaLand: string;
    floorsCount: string;
    bedrooms: string;
    bathrooms: string;
    hasGarage: boolean;
    yearBuilt: string;
  };
  land: {
    areaSotki: string;
    landCategory: string;
    cadastralNumber: string;
    hasCommunications: boolean;
  };
  commercial: {
    commercialType: '' | 'OFFICE' | 'RETAIL' | 'WAREHOUSE' | 'RESTAURANT' | 'OTHER';
    area: string;
    floor: string;
    hasSeparateEntrance: boolean;
  };
  parking: {
    parkingType: '' | 'UNDERGROUND' | 'GROUND' | 'MULTILEVEL';
    area: string;
    floor: string;
    number: string;
  };
  mainPhotoUrl: string;
  extraPhotoUrls: string[];
  planUrl: string;
  seller: SellerForm;
};

function makeEmptyDraft(): DraftState {
  return {
    kind: null,
    regionId: null,
    blockId: '',
    address: '',
    lat: '',
    lng: '',
    price: '',
    status: 'DRAFT',
    isPublished: false,
    apartment: {
      blockAddress: '',
      marketSegment: 'auto',
      areaTotal: '',
      areaKitchen: '',
      floor: '',
      floorsTotal: '',
      roomTypeId: '',
      finishingId: '',
      buildingName: '',
      number: '',
    },
    house: {
      houseType: '',
      areaTotal: '',
      areaLand: '',
      floorsCount: '',
      bedrooms: '',
      bathrooms: '',
      hasGarage: false,
      yearBuilt: '',
    },
    land: { areaSotki: '', landCategory: '', cadastralNumber: '', hasCommunications: false },
    commercial: { commercialType: '', area: '', floor: '', hasSeparateEntrance: false },
    parking: { parkingType: '', area: '', floor: '', number: '' },
    mainPhotoUrl: '',
    extraPhotoUrls: [],
    planUrl: '',
    seller: { ...emptySellerForm },
  };
}

function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyDraft();
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    const base = makeEmptyDraft();
    const parsedKind = KIND_OPTIONS.some((option) => option.kind === parsed.kind) ? parsed.kind : base.kind;
    return {
      ...base,
      ...parsed,
      kind: parsedKind,
      apartment: { ...base.apartment, ...parsed.apartment },
      house: { ...base.house, ...parsed.house },
      land: { ...base.land, ...parsed.land },
      commercial: { ...base.commercial, ...parsed.commercial },
      parking: { ...base.parking, ...parsed.parking },
      extraPhotoUrls: Array.isArray(parsed.extraPhotoUrls)
        ? parsed.extraPhotoUrls.filter((u): u is string => typeof u === 'string').slice(0, 24)
        : [],
      seller: { ...base.seller, ...parsed.seller },
    } as DraftState;
  } catch {
    return makeEmptyDraft();
  }
}

function num(s: string): number | undefined {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
function intNum(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function hasPositive(value: string): boolean {
  const n = num(value);
  return n != null && n > 0;
}

function hasIntegerInRange(value: string, min: number, max?: number): boolean {
  const n = intNum(value);
  if (n == null) return false;
  return n >= min && (max == null || n <= max);
}

function validateDraftStep(draft: DraftState, step: number): { ok: boolean; reason?: string } {
  if (step === 0) {
    if (!draft.kind) return { ok: false, reason: 'Выберите тип объекта' };
    return { ok: true };
  }
  if (step === 1) {
    if (!draft.regionId) return { ok: false, reason: 'Выберите регион' };
    const p = num(draft.price);
    if (p == null || p < 1) return { ok: false, reason: 'Укажите цену в рублях' };
    const hasBlock = intNum(draft.blockId) != null;
    const hasAddress = draft.address.trim().length > 0;
    if (!hasBlock && !hasAddress) return { ok: false, reason: 'Укажите ЖК или адрес объекта' };
    const hasLat = draft.lat.trim().length > 0;
    const hasLng = draft.lng.trim().length > 0;
    if (hasLat !== hasLng) return { ok: false, reason: 'Заполните широту и долготу вместе' };
    const lat = num(draft.lat);
    if (hasLat && (lat == null || lat < -90 || lat > 90)) {
      return { ok: false, reason: 'Широта должна быть числом от -90 до 90' };
    }
    const lng = num(draft.lng);
    if (hasLng && (lng == null || lng < -180 || lng > 180)) {
      return { ok: false, reason: 'Долгота должна быть числом от -180 до 180' };
    }
    return { ok: true };
  }
  if (step === 2) {
    switch (draft.kind) {
      case 'APARTMENT':
        if (!hasPositive(draft.apartment.areaTotal)) return { ok: false, reason: 'Укажите площадь квартиры, м²' };
        if (draft.apartment.floorsTotal.trim() && !hasIntegerInRange(draft.apartment.floorsTotal, 1)) {
          return { ok: false, reason: 'Этажей в доме должно быть целым числом от 1' };
        }
        return { ok: true };
      case 'HOUSE':
        if (!hasPositive(draft.house.areaTotal)) return { ok: false, reason: 'Укажите площадь дома, м²' };
        if (draft.house.yearBuilt.trim() && !hasIntegerInRange(draft.house.yearBuilt, 1800, new Date().getFullYear() + 5)) {
          return { ok: false, reason: 'Проверьте год постройки дома' };
        }
        return { ok: true };
      case 'LAND':
        if (!hasPositive(draft.land.areaSotki)) return { ok: false, reason: 'Укажите площадь участка, сот.' };
        return { ok: true };
      case 'COMMERCIAL':
        if (!hasPositive(draft.commercial.area)) return { ok: false, reason: 'Укажите площадь помещения, м²' };
        return { ok: true };
      case 'PARKING':
        if (!hasPositive(draft.parking.area)) return { ok: false, reason: 'Укажите площадь машино-места, м²' };
        return { ok: true };
      default:
        return { ok: false, reason: 'Выберите тип объекта' };
    }
  }
  if (step === 3 && draft.extraPhotoUrls.length > 24) {
    return { ok: false, reason: 'В галерее может быть не более 24 фото' };
  }
  return { ok: true };
}

function validateDraft(draft: DraftState): { ok: boolean; reason?: string; step?: number } {
  for (let i = 0; i < STEP_TITLES.length; i += 1) {
    const result = validateDraftStep(draft, i);
    if (!result.ok) return { ...result, step: i };
  }
  return { ok: true };
}

export default function AdminListingWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(() => loadDraft());
  const [picker, setPicker] = useState<null | 'main' | 'extra' | 'plan'>(null);
  const [submitError, setSubmitError] = useState('');
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft]);

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const { data: blocksForRegion } = useQuery({
    queryKey: ['wizard', 'blocks', draft.regionId],
    queryFn: () =>
      apiGet<{ data: BlockRow[] }>(
        `/blocks?region_id=${draft.regionId}&per_page=200&page=1&sort=name_asc`,
      ),
    enabled: draft.regionId != null,
    staleTime: 5 * 60 * 1000,
  });

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

  const update = (patch: Partial<DraftState>) => setDraft((prev) => ({ ...prev, ...patch }));

  const stepValid = useMemo<{ ok: boolean; reason?: string }>(() => {
    return validateDraftStep(draft, step);
  }, [step, draft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rid = draft.regionId!;
      const price = num(draft.price)!;
      const bid = intNum(draft.blockId);
      const lat = num(draft.lat);
      const lng = num(draft.lng);
      const seller = normalizeSellerForm(draft.seller) ?? (draft.address.trim() ? { ...emptySellerForm, address: draft.address.trim() } : undefined);
      const common = {
        regionId: rid,
        price,
        status: draft.status,
        isPublished: draft.isPublished,
        ...(bid != null ? { blockId: bid } : {}),
        ...(draft.address.trim() ? { address: draft.address.trim() } : {}),
        ...(seller ? { seller } : {}),
        ...(lat != null ? { lat } : {}),
        ...(lng != null ? { lng } : {}),
      };
      switch (draft.kind) {
        case 'APARTMENT': {
          const apt = draft.apartment;
          const apartment: Record<string, unknown> = { areaTotal: num(apt.areaTotal) };
          if (apt.marketSegment !== 'auto') apartment.marketSegment = apt.marketSegment;
          const ak = num(apt.areaKitchen);
          if (ak != null) apartment.areaKitchen = ak;
          const fl = intNum(apt.floor);
          if (fl != null) apartment.floor = fl;
          const ft = intNum(apt.floorsTotal);
          if (ft != null) apartment.floorsTotal = ft;
          const rt = intNum(apt.roomTypeId);
          if (rt != null) apartment.roomTypeId = rt;
          const fn = intNum(apt.finishingId);
          if (fn != null) apartment.finishingId = fn;
          if (draft.planUrl.trim()) apartment.planUrl = draft.planUrl.trim();
          if (draft.mainPhotoUrl.trim()) apartment.finishingPhotoUrl = draft.mainPhotoUrl.trim();
          if (draft.extraPhotoUrls.length) apartment.extraPhotoUrls = draft.extraPhotoUrls;
          if (apt.blockAddress.trim()) apartment.blockAddress = apt.blockAddress.trim();
          else if (draft.address.trim()) apartment.blockAddress = draft.address.trim();
          if (apt.buildingName.trim()) apartment.buildingName = apt.buildingName.trim();
          if (apt.number.trim()) apartment.number = apt.number.trim();
          return apiPost('/admin/listings/manual-apartment', { ...common, apartment });
        }
        case 'HOUSE': {
          const h = draft.house;
          const house: Record<string, unknown> = {};
          if (h.houseType) house.houseType = h.houseType;
          const at = num(h.areaTotal);
          if (at != null) house.areaTotal = at;
          const al = num(h.areaLand);
          if (al != null) house.areaLand = al;
          const fc = intNum(h.floorsCount);
          if (fc != null) house.floorsCount = fc;
          const br = intNum(h.bedrooms);
          if (br != null) house.bedrooms = br;
          const ba = intNum(h.bathrooms);
          if (ba != null) house.bathrooms = ba;
          house.hasGarage = h.hasGarage;
          const yb = intNum(h.yearBuilt);
          if (yb != null) house.yearBuilt = yb;
          if (draft.mainPhotoUrl.trim()) house.photoUrl = draft.mainPhotoUrl.trim();
          if (draft.extraPhotoUrls.length) house.extraPhotoUrls = draft.extraPhotoUrls;
          return apiPost('/admin/listings/manual-house', { ...common, house });
        }
        case 'LAND': {
          const l = draft.land;
          const land: Record<string, unknown> = {};
          const a = num(l.areaSotki);
          if (a != null) land.areaSotki = a;
          if (l.landCategory.trim()) land.landCategory = l.landCategory.trim();
          if (l.cadastralNumber.trim()) land.cadastralNumber = l.cadastralNumber.trim();
          land.hasCommunications = l.hasCommunications;
          if (draft.mainPhotoUrl.trim()) land.photoUrl = draft.mainPhotoUrl.trim();
          if (draft.extraPhotoUrls.length) land.extraPhotoUrls = draft.extraPhotoUrls;
          return apiPost('/admin/listings/manual-land', { ...common, land });
        }
        case 'COMMERCIAL': {
          const c = draft.commercial;
          const commercial: Record<string, unknown> = {};
          if (c.commercialType) commercial.commercialType = c.commercialType;
          const a = num(c.area);
          if (a != null) commercial.area = a;
          const fl = intNum(c.floor);
          if (fl != null) commercial.floor = fl;
          commercial.hasSeparateEntrance = c.hasSeparateEntrance;
          if (draft.mainPhotoUrl.trim()) commercial.photoUrl = draft.mainPhotoUrl.trim();
          if (draft.extraPhotoUrls.length) commercial.extraPhotoUrls = draft.extraPhotoUrls;
          return apiPost('/admin/listings/manual-commercial', { ...common, commercial });
        }
        case 'PARKING': {
          const p = draft.parking;
          const parking: Record<string, unknown> = {};
          if (p.parkingType) parking.parkingType = p.parkingType;
          const a = num(p.area);
          if (a != null) parking.area = a;
          const fl = intNum(p.floor);
          if (fl != null) parking.floor = fl;
          if (p.number.trim()) parking.number = p.number.trim();
          if (draft.mainPhotoUrl.trim()) parking.photoUrl = draft.mainPhotoUrl.trim();
          if (draft.extraPhotoUrls.length) parking.extraPhotoUrls = draft.extraPhotoUrls;
          return apiPost('/admin/listings/manual-parking', { ...common, parking });
        }
        default:
          throw new Error('Не выбран тип объекта');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      navigate('/admin/listings');
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
      setSubmitError(msg);
    },
  });

  const goNext = () => {
    if (!stepValid.ok) {
      setSubmitError(stepValid.reason ?? '');
      return;
    }
    setSubmitError('');
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
  };
  const goPrev = () => {
    setSubmitError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const onSaveDraftLocally = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSavedNote(true);
      window.setTimeout(() => setSavedNote(false), 1800);
    } catch {
      // ignore
    }
  };

  const onResetDraft = () => {
    if (!confirm('Сбросить черновик и начать заново?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setDraft(makeEmptyDraft());
    setStep(0);
    setSubmitError('');
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link to="/admin/listings" aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Мастер добавления объекта</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Шаг {step + 1} из {STEP_TITLES.length}: {STEP_TITLES[step]}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onSaveDraftLocally} title="Сохранить черновик локально">
          <Save className="w-4 h-4 mr-2" />
          Черновик
        </Button>
        <Button type="button" variant="ghost" onClick={onResetDraft} title="Сбросить черновик">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ol className="grid grid-cols-5 gap-2 mb-6">
        {STEP_TITLES.map((t, i) => (
          <li
            key={t}
            className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs ${
              i === step
                ? 'border-primary bg-primary/5 text-primary'
                : i < step
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-border bg-background text-muted-foreground'
            }`}
          >
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full border text-[10px] font-semibold">
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span className="truncate">{t}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-4 bg-background border rounded-2xl p-6">
        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
        {savedNote ? (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 inline-block">
            Черновик сохранён локально
          </p>
        ) : null}

        {step === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Выберите тип объекта недвижимости.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {KIND_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = draft.kind === opt.kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => update({ kind: opt.kind })}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-sm">{opt.title}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Город / регион *</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
                value={draft.regionId ?? ''}
                onChange={(e) =>
                  update({ regionId: e.target.value ? Number(e.target.value) : null, blockId: '' })
                }
              >
                <option value="">— выберите —</option>
                {(regions ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>ЖК (необязательно)</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10 disabled:opacity-60"
                value={draft.blockId}
                onChange={(e) => update({ blockId: e.target.value })}
                disabled={!draft.regionId}
              >
                <option value="">— без привязки —</option>
                {(blocksForRegion?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (#{b.id})
                  </option>
                ))}
              </select>
              {!draft.regionId ? (
                <p className="text-xs text-muted-foreground">Сначала выберите регион</p>
              ) : null}
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label>Адрес для карточки и карты</Label>
                <Input
                  value={draft.address}
                  onChange={(e) => update({ address: e.target.value })}
                  placeholder="Белгород, ул. Щорса, 45"
                />
                <p className="text-xs text-muted-foreground">
                  Для квартир адрес также подставится в поле адреса корпуса, если оно не заполнено на следующем шаге.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Широта</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.lat}
                    onChange={(e) => update({ lat: e.target.value })}
                    placeholder="50.595414"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Долгота</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.lng}
                    onChange={(e) => update({ lng: e.target.value })}
                    placeholder="36.587277"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Координаты заполняются парой. Без привязки к ЖК укажите хотя бы адрес, чтобы карточка была понятной.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Цена, ₽ *</Label>
                <Input
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => update({ price: e.target.value })}
                  placeholder="12500000"
                />
              </div>
              <div className="space-y-1">
                <Label>Статус</Label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
                  value={draft.status}
                  onChange={(e) => update({ status: e.target.value as ListingStatus })}
                >
                  {listingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => update({ isPublished: e.target.checked })}
              />
              Опубликовать сразу на сайте
            </label>
            <SellerFields
              value={draft.seller}
              onChange={(seller) => update({ seller })}
            />
          </div>
        ) : null}

        {step === 2 ? <CharacteristicsStep draft={draft} setDraft={setDraft} roomTypes={roomTypes ?? []} finishings={finishings ?? []} /> : null}

        {step === 3 ? (
          <div className="space-y-4">
            {draft.kind ? (
              <p className="text-xs text-muted-foreground">
                Фото сохраняются для типа «{listingWizardKindLabels[draft.kind].title}». Используйте файлы из медиатеки.
              </p>
            ) : null}
            <div className="space-y-1">
              <Label>{draft.kind ? listingWizardMediaLabels[draft.kind].main : 'Главное фото'}</Label>
              <div className="flex items-center gap-3">
                {draft.mainPhotoUrl ? (
                  <img
                    src={draft.mainPhotoUrl}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                    нет
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" onClick={() => setPicker('main')}>
                    Выбрать из медиа
                  </Button>
                  {draft.mainPhotoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => update({ mainPhotoUrl: '' })}
                    >
                      Очистить
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {draft.kind === 'APARTMENT' ? (
              <div className="space-y-1">
                <Label>{listingWizardMediaLabels.APARTMENT.plan} (PNG/JPG)</Label>
                <div className="flex items-center gap-3">
                  {draft.planUrl ? (
                    <img
                      src={draft.planUrl}
                      alt=""
                      className="w-24 h-24 object-contain rounded-lg border bg-muted/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      нет
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" onClick={() => setPicker('plan')}>
                      Выбрать из медиа
                    </Button>
                    {draft.planUrl ? (
                      <Button type="button" variant="ghost" onClick={() => update({ planUrl: '' })}>
                        Очистить
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{draft.kind ? listingWizardMediaLabels[draft.kind].gallery : 'Галерея'} ({draft.extraPhotoUrls.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPicker('extra')}>
                  Добавить из медиа
                </Button>
              </div>
              {draft.extraPhotoUrls.length === 0 ? (
                <p className="text-xs text-muted-foreground">Можно добавить до 24 фото из медиатеки</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {draft.extraPhotoUrls.map((u, i) => (
                    <div key={`${u}-${i}`} className="relative group">
                      <img src={u} alt="" className="w-full h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            extraPhotoUrls: draft.extraPhotoUrls.filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute top-1 right-1 inline-flex w-6 h-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                        aria-label="Удалить"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 4 ? <ReviewStep draft={draft} regions={regions ?? []} blocks={blocksForRegion?.data ?? []} /> : null}
      </div>

      <div className="flex items-center justify-between mt-4">
        <Button type="button" variant="outline" onClick={goPrev} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        {step < STEP_TITLES.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Далее
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => {
              const validation = validateDraft(draft);
              if (!validation.ok) {
                setStep(validation.step ?? 0);
                setSubmitError(validation.reason ?? 'Проверьте обязательные поля');
                return;
              }
              setSubmitError('');
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Сохранение…
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Создать объявление
              </>
            )}
          </Button>
        )}
      </div>

      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(v) => !v && setPicker(null)}
        title={
          picker === 'main'
            ? 'Главное фото'
            : picker === 'plan'
              ? 'Планировка'
              : 'Добавить фото в галерею'
        }
        multiple={picker === 'extra'}
        onPick={(items) => {
          if (picker === 'main' && items[0]) {
            update({ mainPhotoUrl: items[0].url });
          } else if (picker === 'plan' && items[0]) {
            update({ planUrl: items[0].url });
          } else if (picker === 'extra') {
            const urls = items.map((it) => it.url);
            const merged = Array.from(new Set([...draft.extraPhotoUrls, ...urls])).slice(0, 24);
            update({ extraPhotoUrls: merged });
          }
          setPicker(null);
        }}
      />
    </div>
  );
}

function CharacteristicsStep({
  draft,
  setDraft,
  roomTypes,
  finishings,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  roomTypes: RefOpt[];
  finishings: RefOpt[];
}) {
  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));

  switch (draft.kind) {
    case 'APARTMENT': {
      const a = draft.apartment;
      const upd = (patch: Partial<DraftState['apartment']>) =>
        set('apartment', { ...a, ...patch });
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label>Адрес объекта</Label>
            <Input value={a.blockAddress} onChange={(e) => upd({ blockAddress: e.target.value })} placeholder="г. Москва, ул. ..." />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Тип рынка</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={a.marketSegment}
              onChange={(e) => upd({ marketSegment: e.target.value as DraftState['apartment']['marketSegment'] })}
            >
              {marketSegmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label>{listingWizardRequiredAreaLabel.APARTMENT} *</Label>
            <Input value={a.areaTotal} onChange={(e) => upd({ areaTotal: e.target.value })} placeholder="54.2" />
          </div>
          <div className="space-y-1">
            <Label>Кухня, м²</Label>
            <Input value={a.areaKitchen} onChange={(e) => upd({ areaKitchen: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Этаж</Label>
            <Input value={a.floor} onChange={(e) => upd({ floor: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Этажей в доме</Label>
            <Input value={a.floorsTotal} onChange={(e) => upd({ floorsTotal: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Комнатность</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={a.roomTypeId}
              onChange={(e) => upd({ roomTypeId: e.target.value })}
            >
              <option value="">—</option>
              {roomTypes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Отделка</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={a.finishingId}
              onChange={(e) => upd({ finishingId: e.target.value })}
            >
              <option value="">—</option>
              {finishings.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Корпус</Label>
            <Input value={a.buildingName} onChange={(e) => upd({ buildingName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Номер квартиры</Label>
            <Input value={a.number} onChange={(e) => upd({ number: e.target.value })} />
          </div>
        </div>
      );
    }
    case 'HOUSE': {
      const h = draft.house;
      const upd = (patch: Partial<DraftState['house']>) => set('house', { ...h, ...patch });
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Тип дома</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={h.houseType}
              onChange={(e) => upd({ houseType: e.target.value as DraftState['house']['houseType'] })}
            >
              <option value="">—</option>
              {houseTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Год постройки</Label>
            <Input value={h.yearBuilt} onChange={(e) => upd({ yearBuilt: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{listingWizardRequiredAreaLabel.HOUSE} *</Label>
            <Input value={h.areaTotal} onChange={(e) => upd({ areaTotal: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Площадь участка, сот.</Label>
            <Input value={h.areaLand} onChange={(e) => upd({ areaLand: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Этажей</Label>
            <Input value={h.floorsCount} onChange={(e) => upd({ floorsCount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Спален</Label>
            <Input value={h.bedrooms} onChange={(e) => upd({ bedrooms: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Санузлов</Label>
            <Input value={h.bathrooms} onChange={(e) => upd({ bathrooms: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={h.hasGarage}
              onChange={(e) => upd({ hasGarage: e.target.checked })}
            />
            Гараж
          </label>
        </div>
      );
    }
    case 'LAND': {
      const l = draft.land;
      const upd = (patch: Partial<DraftState['land']>) => set('land', { ...l, ...patch });
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{listingWizardRequiredAreaLabel.LAND} *</Label>
            <Input value={l.areaSotki} onChange={(e) => upd({ areaSotki: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Категория земли</Label>
            <Input value={l.landCategory} onChange={(e) => upd({ landCategory: e.target.value })} placeholder="ИЖС" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Кадастровый номер</Label>
            <Input value={l.cadastralNumber} onChange={(e) => upd({ cadastralNumber: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={l.hasCommunications}
              onChange={(e) => upd({ hasCommunications: e.target.checked })}
            />
            Есть коммуникации
          </label>
        </div>
      );
    }
    case 'COMMERCIAL': {
      const c = draft.commercial;
      const upd = (patch: Partial<DraftState['commercial']>) => set('commercial', { ...c, ...patch });
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Тип</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={c.commercialType}
              onChange={(e) =>
                upd({ commercialType: e.target.value as DraftState['commercial']['commercialType'] })
              }
            >
              <option value="">—</option>
              {commercialTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{listingWizardRequiredAreaLabel.COMMERCIAL} *</Label>
            <Input value={c.area} onChange={(e) => upd({ area: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Этаж</Label>
            <Input value={c.floor} onChange={(e) => upd({ floor: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={c.hasSeparateEntrance}
              onChange={(e) => upd({ hasSeparateEntrance: e.target.checked })}
            />
            Отдельный вход
          </label>
        </div>
      );
    }
    case 'PARKING': {
      const p = draft.parking;
      const upd = (patch: Partial<DraftState['parking']>) => set('parking', { ...p, ...patch });
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Тип паркинга</Label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background h-10"
              value={p.parkingType}
              onChange={(e) =>
                upd({ parkingType: e.target.value as DraftState['parking']['parkingType'] })
              }
            >
              <option value="">—</option>
              {parkingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{listingWizardRequiredAreaLabel.PARKING} *</Label>
            <Input value={p.area} onChange={(e) => upd({ area: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Этаж/уровень</Label>
            <Input value={p.floor} onChange={(e) => upd({ floor: e.target.value })} placeholder="-1" />
          </div>
          <div className="space-y-1">
            <Label>Номер места</Label>
            <Input value={p.number} onChange={(e) => upd({ number: e.target.value })} placeholder="A-114" />
          </div>
        </div>
      );
    }
    default:
      return <p className="text-sm text-muted-foreground">Сначала выберите тип объекта</p>;
  }
}

function formatPrice(value: string): string {
  const n = num(value);
  return n != null ? `${n.toLocaleString('ru-RU')} ₽` : '—';
}

function boolLabel(value: boolean): string {
  return value ? 'Да' : 'Нет';
}

function sellerSummary(seller: SellerForm): string {
  const parts = [seller.fullName, seller.phone, seller.email, seller.address].map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function kindReviewRows(draft: DraftState): ReviewRow[] {
  switch (draft.kind) {
    case 'APARTMENT':
      return [
        { label: 'Тип рынка', value: optionLabel(marketSegmentOptions, draft.apartment.marketSegment) },
        { label: 'Адрес квартиры', value: draft.apartment.blockAddress || draft.address || '—' },
        { label: 'Площадь', value: draft.apartment.areaTotal ? `${draft.apartment.areaTotal} м²` : '—' },
        { label: 'Кухня', value: draft.apartment.areaKitchen ? `${draft.apartment.areaKitchen} м²` : '—' },
        { label: 'Этаж', value: [draft.apartment.floor, draft.apartment.floorsTotal].filter(Boolean).join(' / ') || '—' },
        { label: 'Корпус', value: draft.apartment.buildingName || '—' },
        { label: 'Номер квартиры', value: draft.apartment.number || '—' },
        { label: 'Планировка', value: draft.planUrl || '—' },
      ];
    case 'HOUSE':
      return [
        { label: 'Тип дома', value: optionLabel(houseTypeOptions, draft.house.houseType) },
        { label: 'Площадь дома', value: draft.house.areaTotal ? `${draft.house.areaTotal} м²` : '—' },
        { label: 'Площадь участка', value: draft.house.areaLand ? `${draft.house.areaLand} сот.` : '—' },
        { label: 'Этажей', value: draft.house.floorsCount || '—' },
        { label: 'Спален', value: draft.house.bedrooms || '—' },
        { label: 'Санузлов', value: draft.house.bathrooms || '—' },
        { label: 'Гараж', value: boolLabel(draft.house.hasGarage) },
        { label: 'Год постройки', value: draft.house.yearBuilt || '—' },
      ];
    case 'LAND':
      return [
        { label: 'Площадь участка', value: draft.land.areaSotki ? `${draft.land.areaSotki} сот.` : '—' },
        { label: 'Категория земли', value: draft.land.landCategory || '—' },
        { label: 'Кадастровый номер', value: draft.land.cadastralNumber || '—' },
        { label: 'Коммуникации', value: boolLabel(draft.land.hasCommunications) },
      ];
    case 'COMMERCIAL':
      return [
        { label: 'Тип помещения', value: optionLabel(commercialTypeOptions, draft.commercial.commercialType) },
        { label: 'Площадь', value: draft.commercial.area ? `${draft.commercial.area} м²` : '—' },
        { label: 'Этаж', value: draft.commercial.floor || '—' },
        { label: 'Отдельный вход', value: boolLabel(draft.commercial.hasSeparateEntrance) },
      ];
    case 'PARKING':
      return [
        { label: 'Тип паркинга', value: optionLabel(parkingTypeOptions, draft.parking.parkingType) },
        { label: 'Площадь', value: draft.parking.area ? `${draft.parking.area} м²` : '—' },
        { label: 'Этаж/уровень', value: draft.parking.floor || '—' },
        { label: 'Номер места', value: draft.parking.number || '—' },
      ];
    default:
      return [];
  }
}

function ReviewSection({ title, rows }: { title: string; rows: ReviewRow[] }) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </section>
  );
}

function ReviewStep({ draft, regions, blocks }: { draft: DraftState; regions: RegionRow[]; blocks: BlockRow[] }) {
  const region = regions.find((r) => r.id === draft.regionId);
  const block = blocks.find((b) => String(b.id) === draft.blockId);
  const kindLabel = draft.kind ? listingWizardKindLabels[draft.kind].title : '—';
  const coords = draft.lat.trim() && draft.lng.trim() ? `${draft.lat.trim()}, ${draft.lng.trim()}` : '—';
  return (
    <div className="space-y-3 text-sm">
      <ReviewSection
        title="Основное"
        rows={[
          { label: 'Тип', value: kindLabel },
          { label: 'Регион', value: region ? `${region.name} (${region.code})` : '—' },
          { label: 'ЖК', value: block ? `${block.name} (#${block.id})` : draft.blockId ? `#${draft.blockId}` : '—' },
          { label: 'Адрес', value: draft.address || '—' },
          { label: 'Координаты', value: coords },
          { label: 'Цена', value: formatPrice(draft.price) },
          { label: 'Статус', value: listingStatusLabel(draft.status) },
          { label: 'Публикация', value: boolLabel(draft.isPublished) },
        ]}
      />
      <ReviewSection title="Характеристики" rows={kindReviewRows(draft)} />
      <ReviewSection
        title="Фото"
        rows={[
          { label: 'Главное фото', value: draft.mainPhotoUrl || '—' },
          { label: 'Галерея', value: `${draft.extraPhotoUrls.length} шт.` },
          ...(draft.kind === 'APARTMENT' ? [{ label: 'Планировка', value: draft.planUrl || '—' }] : []),
        ]}
      />
      <ReviewSection title="Продавец" rows={[{ label: 'Контакты', value: sellerSummary(draft.seller) }]} />
      <p className="text-xs text-muted-foreground pt-2">
        Нажмите «Создать объявление», чтобы сохранить. Локальный черновик будет очищен.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-32 shrink-0 text-muted-foreground">{label}:</span>
      <span className="flex-1 break-all">{value}</span>
    </div>
  );
}
