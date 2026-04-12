interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function ContactsEditor({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Заголовок</label>
        <input
          value={settings.title || ''}
          onChange={e => onUpdate({ title: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Телефон 1</label>
          <input
            value={settings.phone1 || ''}
            onChange={e => onUpdate({ phone1: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Телефон 2</label>
          <input
            value={settings.phone2 || ''}
            onChange={e => onUpdate({ phone2: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
        <input
          value={settings.email || ''}
          onChange={e => onUpdate({ email: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Адрес</label>
        <input
          value={settings.address || ''}
          onChange={e => onUpdate({ address: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Соцсети (через запятую)</label>
        <input
          value={(settings.socials || []).join(', ')}
          onChange={e => onUpdate({ socials: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
    </div>
  );
}
