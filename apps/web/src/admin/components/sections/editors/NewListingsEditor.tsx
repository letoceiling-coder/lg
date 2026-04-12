interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function NewListingsEditor({ settings, onUpdate }: Props) {
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
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Промо текст</label>
        <input
          value={settings.promoText || ''}
          onChange={e => onUpdate({ promoText: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Промо подпись</label>
        <input
          value={settings.promoLabel || ''}
          onChange={e => onUpdate({ promoLabel: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Текст кнопки промо</label>
        <input
          value={settings.promoButton || ''}
          onChange={e => onUpdate({ promoButton: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
    </div>
  );
}
