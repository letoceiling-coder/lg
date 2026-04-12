import { useEffect, useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

const filterGroups = [
  { title: 'Объекты', items: ['Дома', 'Квартиры', 'Кондоминиумы', 'Земельные участки', 'Таунхаусы', 'Виллы', 'Коттеджи', 'Шале', 'Острова'] },
  { title: 'Тип недвижимости', items: ['Новостройки', 'Вторичные', 'Коммерческая недвижимость'] },
  { title: 'Район', items: ['Джомтьен', 'Центральная Паттайя', 'Пратамнак', 'Южная Паттайя', 'Восточная Паттайя', 'Вонгамат', 'Северная Паттайя', 'Банг Сарай', 'Восточный Джомтьен, Хуай Яй', 'На Джомтьен', 'Баан Амфур', 'Восточная Наклуа', 'Шоссе 36'] },
  { title: '', items: ['Мабпрахан', 'Наклуа', 'Laem Mae Phim Beach', 'Baan Dusit', 'Cozy Beach', 'Khamala Beach', 'Nai Yang', 'Лаем-Чабанг', 'Теппразит'] },
  { title: 'Спальни', items: ['Студия', '1+', '2+', '3+', '4+', '5+'] },
  { title: 'Ванные', items: ['1+', '2+', '3+', '4+'] },
];

interface Props { open: boolean; onClose: () => void; }

const FiltersOverlay = ({ open, onClose }: Props) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <span className="font-bold">Фильтры</span>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium" onClick={onClose}>
            Закрыть <X className="w-6 h-6 text-primary" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6">
          {filterGroups.map((group, i) => (
            <div key={i}>
              {group.title && <h3 className="font-bold text-sm mb-4">{group.title}</h3>}
              <div className="space-y-3">
                {group.items.map((item, j) => {
                  const key = `${i}-${j}`;
                  return (
                    <label key={j} className="flex items-center gap-2.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={!!checked[key]}
                        onChange={() => toggle(key)}
                        className="w-4 h-4 rounded border-2 border-border accent-primary"
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FiltersOverlay;
