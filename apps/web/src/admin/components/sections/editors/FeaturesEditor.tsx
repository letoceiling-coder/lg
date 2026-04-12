interface Props {
  settings: Record<string, any>;
  onUpdate: (s: Record<string, any>) => void;
}

export default function FeaturesEditor({ settings, onUpdate }: Props) {
  const items = settings.items || [];

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ items: newItems });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Заголовок секции</label>
        <input
          value={settings.title || ''}
          onChange={e => onUpdate({ title: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Карточки</label>
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="border rounded-xl p-3 bg-background space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Карточка {i + 1}</div>
              <input
                value={item.title || ''}
                onChange={e => updateItem(i, 'title', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-background"
                placeholder="Заголовок"
              />
              <input
                value={item.button || ''}
                onChange={e => updateItem(i, 'button', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-background"
                placeholder="Текст кнопки"
              />
              <select
                value={item.action || ''}
                onChange={e => updateItem(i, 'action', e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                <option value="calc">Калькулятор</option>
                <option value="modal">Модальное окно</option>
                <option value="catalog">Каталог</option>
                <option value="auth">Авторизация</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
