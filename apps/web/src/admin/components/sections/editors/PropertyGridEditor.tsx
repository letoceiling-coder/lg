interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function PropertyGridEditor({ settings, onUpdate }: Props) {
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
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип сетки</label>
        <select
          value={settings.gridType || 'hot'}
          onChange={e => onUpdate({ gridType: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        >
          <option value="hot">Горячие предложения</option>
          <option value="start">Старт продаж</option>
        </select>
      </div>
    </div>
  );
}
