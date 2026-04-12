import { useEffect } from 'react';
import { X, MapPin, Building, Home, House, Store, TreePine } from 'lucide-react';

const columns = [
  { icon: Building, title: 'Жилищные комплексы', items: ['ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'ЖК Смородина', 'Другие'] },
  { icon: Home, title: 'Квартиры', items: ['Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4-комнатная', 'Более 100 м.кв.', 'Более 150 м.кв.', 'Пентхаусы', 'Другие'] },
  { icon: House, title: 'Дома', items: ['До 7 млн', 'до 80 м.кв.', 'до 120 м.кв.', 'до 150 м.кв.', 'до 200 м.кв.', 'Особняки', 'Коттеджи', 'Другие'] },
  { icon: Store, title: 'Коммерческая', items: ['Отдельно стоящие', 'В торговом центре', 'До 50 м.кв.', 'до 100 м.кв.', 'Под офисы', 'В комплексах', 'Большие площади', 'Другие'] },
  { icon: TreePine, title: 'Участки', items: ['Под ИЖС', 'в СНТ', 'Под коммерцию', 'До 4 соток', 'С коммуникациями', 'С постройками', 'Более 1 га', 'Другие'] },
];

interface BurgerMenuProps { open: boolean; onClose: () => void; }

const BurgerMenu = ({ open, onClose }: BurgerMenuProps) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Москва и МО</span>
            <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium ml-4">
              Все предложения
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium" onClick={onClose}>
            Закрыть <X className="w-6 h-6 text-primary" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {columns.map((col, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-4">
                <col.icon className="w-5 h-5" />
                <h3 className="font-bold text-sm">{col.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {col.items.map((item, j) => (
                  <li key={j}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-accent rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base md:text-lg mb-3">Не нашли объект, который искали? Заполните анкету для индивидуального подбора</h3>
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium">Подобрать</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BurgerMenu;
