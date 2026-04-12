import { Link } from 'react-router-dom';
import { useCompare } from '@/shared/hooks/useCompare';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Trash2 } from 'lucide-react';

const Compare = () => {
  const { ids, remove, clear } = useCompare();

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Сравнение объектов</h1>
        {ids.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Добавьте объекты для сравнения</p>
            <Link to="/catalog" className="text-primary font-medium hover:underline">Перейти в каталог</Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{ids.length} из 3 объектов</p>
              <button onClick={clear} className="text-sm text-destructive hover:underline">Очистить</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ids.map(id => (
                <div key={id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">Объект #{id}</p>
                    <button onClick={() => remove(id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Данные загрузятся из API</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
};

export default Compare;
