import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SellerForm = {
  fullName: string;
  phone: string;
  phoneAlt: string;
  email: string;
  address: string;
  notes: string;
};

export const emptySellerForm: SellerForm = {
  fullName: '',
  phone: '',
  phoneAlt: '',
  email: '',
  address: '',
  notes: '',
};

export type ApiSeller = Partial<SellerForm> & { id?: number | null } | null | undefined;

export function sellerFormFromApi(seller: ApiSeller): SellerForm {
  return {
    fullName: seller?.fullName ?? '',
    phone: seller?.phone ?? '',
    phoneAlt: seller?.phoneAlt ?? '',
    email: seller?.email ?? '',
    address: seller?.address ?? '',
    notes: seller?.notes ?? '',
  };
}

export function normalizeSellerForm(seller: SellerForm): SellerForm | undefined {
  const normalized: SellerForm = {
    fullName: seller.fullName.trim(),
    phone: seller.phone.trim(),
    phoneAlt: seller.phoneAlt.trim(),
    email: seller.email.trim(),
    address: seller.address.trim(),
    notes: seller.notes.trim(),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

type Props = {
  value: SellerForm;
  onChange: (next: SellerForm) => void;
};

export default function SellerFields({ value, onChange }: Props) {
  const setField = <K extends keyof SellerForm>(key: K, next: SellerForm[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="rounded-2xl border p-4 space-y-3 bg-muted/10">
      <div>
        <h2 className="text-base font-semibold">Информация о продавце</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Необязательно. Эти данные сохраняются отдельно от агента/менеджера и остаются у объекта,
          даже если сотрудник больше не работает в компании.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>ФИО продавца</Label>
          <Input value={value.fullName} onChange={(e) => setField('fullName', e.target.value)} placeholder="Иванов Иван Иванович" />
        </div>
        <div className="space-y-1">
          <Label>Телефон</Label>
          <Input value={value.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+7..." />
        </div>
        <div className="space-y-1">
          <Label>Дополнительный телефон</Label>
          <Input value={value.phoneAlt} onChange={(e) => setField('phoneAlt', e.target.value)} placeholder="+7..." />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={value.email} onChange={(e) => setField('email', e.target.value)} placeholder="seller@example.com" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Адрес проживания / регистрации</Label>
          <Input value={value.address} onChange={(e) => setField('address', e.target.value)} placeholder="Город, улица, дом, квартира" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Дополнительная информация</Label>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Условия связи, документы, комментарии по собственнику"
          />
        </div>
      </div>
    </section>
  );
}
