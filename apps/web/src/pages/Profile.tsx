import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Profile = () => {
  // TODO: useAuth() for real data and redirect

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Личный кабинет</h1>
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-bold mb-1">Пользователь</p>
            <p className="text-xs text-muted-foreground mb-4">+7 (904) 539-34-34</p>
            <Button variant="outline" size="sm" className="w-full">Редактировать</Button>
          </div>
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold mb-3">Мои заявки</h2>
              <p className="text-sm text-muted-foreground">Заявок пока нет</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Избранное</h2>
                <Link to="/favorites" className="text-sm text-primary hover:underline">Все →</Link>
              </div>
              <p className="text-sm text-muted-foreground">Нет избранных объектов</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Сравнение</h2>
                <Link to="/compare" className="text-sm text-primary hover:underline">Все →</Link>
              </div>
              <p className="text-sm text-muted-foreground">Нет объектов для сравнения</p>
            </div>
            <Button variant="destructive" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Выйти
            </Button>
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Profile;
