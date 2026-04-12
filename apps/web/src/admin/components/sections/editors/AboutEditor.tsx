interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function AboutEditor({ settings, onUpdate }: Props) {
  const stats = settings.stats || [];

  const updateStat = (index: number, field: string, value: string) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    onUpdate({ stats: newStats });
  };

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
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Описание</label>
        <textarea
          value={settings.description || ''}
          onChange={e => onUpdate({ description: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
          rows={4}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Статистика</label>
        <div className="space-y-2">
          {stats.map((stat: any, i: number) => (
            <div key={i} className="flex gap-2">
              <input
                value={stat.value || ''}
                onChange={e => updateStat(i, 'value', e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-sm bg-background"
                placeholder="Значение"
              />
              <input
                value={stat.label || ''}
                onChange={e => updateStat(i, 'label', e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-sm bg-background"
                placeholder="Подпись"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
