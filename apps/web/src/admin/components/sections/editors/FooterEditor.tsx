interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function FooterEditor({ settings, onUpdate }: Props) {
  const columns = settings.columns || [];

  const updateColumn = (index: number, field: string, value: any) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], [field]: value };
    onUpdate({ columns: newCols });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Copyright</label>
        <input
          value={settings.copyright || ''}
          onChange={e => onUpdate({ copyright: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Колонки</label>
        <div className="space-y-3">
          {columns.map((col: any, i: number) => (
            <div key={i} className="border rounded-xl p-3 bg-background space-y-2">
              <input
                value={col.title || ''}
                onChange={e => updateColumn(i, 'title', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-background font-medium"
                placeholder="Заголовок колонки"
              />
              <textarea
                value={(col.items || []).join('\n')}
                onChange={e => updateColumn(i, 'items', e.target.value.split('\n').filter(Boolean))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-background"
                rows={4}
                placeholder="Пункты (по одному на строку)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
