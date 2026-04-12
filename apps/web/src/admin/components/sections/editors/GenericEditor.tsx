interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
  sectionType: string;
}

export default function GenericEditor({ settings, onUpdate, sectionType }: Props) {
  const keys = Object.keys(settings);

  if (keys.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Секция «{sectionType}» использует стандартные настройки. Контент управляется через компоненты.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {keys.map(key => {
        const val = settings[key];
        if (typeof val === 'string') {
          return (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block capitalize">{key}</label>
              <input
                value={val}
                onChange={e => onUpdate({ [key]: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
              />
            </div>
          );
        }
        if (typeof val === 'boolean') {
          return (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={val}
                onChange={e => onUpdate({ [key]: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm capitalize">{key}</span>
            </label>
          );
        }
        return (
          <div key={key}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block capitalize">{key}</label>
            <textarea
              value={JSON.stringify(val, null, 2)}
              onChange={e => {
                try { onUpdate({ [key]: JSON.parse(e.target.value) }); } catch {}
              }}
              className="w-full border rounded-xl px-3 py-2 text-xs bg-background font-mono"
              rows={4}
            />
          </div>
        );
      })}
    </div>
  );
}
