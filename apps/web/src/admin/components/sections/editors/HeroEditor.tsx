interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function HeroEditor({ settings, onUpdate }: Props) {
  const tabs = settings.tabs || [];

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
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Подзаголовок</label>
        <input
          value={settings.subtitle || ''}
          onChange={e => onUpdate({ subtitle: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Локация</label>
        <input
          value={settings.location || ''}
          onChange={e => onUpdate({ location: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Placeholder поиска</label>
        <input
          value={settings.searchPlaceholder || ''}
          onChange={e => onUpdate({ searchPlaceholder: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Текст кнопки</label>
        <input
          value={settings.buttonText || ''}
          onChange={e => onUpdate({ buttonText: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Табы (через запятую)</label>
        <input
          value={tabs.join(', ')}
          onChange={e => onUpdate({ tabs: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
    </div>
  );
}
