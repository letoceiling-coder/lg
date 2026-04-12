import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '@/shared/hooks/useFavorites';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Heart, Printer } from 'lucide-react';

const Favorites = () => {
  const { ids, toggle } = useFavorites();
  const navigate = useNavigate();

  // TODO: check auth, redirect to /login if not authenticated

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Избранное</h1>
          {ids.length > 0 && (
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Printer className="w-4 h-4" /> Скачать подборку
            </button>
          )}
        </div>
        {ids.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">У вас пока нет избранных объектов</p>
            <Link to="/catalog" className="text-primary font-medium hover:underline">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ids.map(id => (
              <div key={id} className="bg-card border border-border rounded-xl p-4">
                <p className="font-medium text-sm mb-1">Объект #{id}</p>
                <p className="text-xs text-muted-foreground mb-3">Данные загрузятся из API</p>
                <button onClick={() => toggle(id)} className="text-xs text-destructive hover:underline">Удалить</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
};

export default Favorites;
