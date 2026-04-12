import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
  [key: string]: boolean;
}

interface Props {
  checked: FilterState;
  onToggle: (key: string) => void;
}

const filterGroups = [
  {
    title: 'Расположение',
    items: [
      'До метро 5 мин', 'До метро 10 мин', 'До метро 15 мин',
      'Внутри МКАД', 'Внутри ТТК', 'Внутри Садового',
      'Московская прописка', 'Видовые квартиры',
    ],
  },
  {
    title: 'Дом',
    items: [
      'Новостройка', 'Вторичка', 'Апартаменты',
      'Эконом', 'Комфорт', 'Бизнес', 'Премиум', 'Элитный',
      'Монолит', 'Кирпич', 'Панель', 'Монолит-кирпич',
      'Паркинг', 'Лифт',
    ],
  },
  {
    title: 'Квартира',
    items: [
      'Студия', '1 комн.', '2 комн.', '3 комн.', '4+ комн.',
      'Без отделки', 'Черновая', 'Чистовая', 'Под ключ',
      'Балкон', 'Лоджия', 'Терраса',
    ],
  },
  {
    title: 'Оплата',
    items: [
      'Рассрочка', 'Ипотека', 'Субсидированная ипотека',
      'Материнский капитал', 'Военная ипотека',
      'Эскроу', 'Бронь онлайн',
      'Trade-in', 'ПВ от застройщика',
    ],
  },
];

const CatalogFilters = ({ checked, onToggle }: Props) => {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-5">
      {filterGroups.map((group, gi) => {
        const isOpen = !collapsed[gi];
        return (
          <div key={gi}>
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => setCollapsed(p => ({ ...p, [gi]: !p[gi] }))}
            >
              <h3 className="font-bold text-sm">{group.title}</h3>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="space-y-2.5">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`;
                  return (
                    <label key={ii} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <Checkbox
                        checked={!!checked[key]}
                        onCheckedChange={() => onToggle(key)}
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CatalogFilters;
