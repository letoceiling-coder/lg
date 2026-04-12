import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import Header from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Button } from '@/components/ui/button';

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Назад ко входу
          </Link>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Восстановление пароля</h1>
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Info className="w-5 h-5 shrink-0 text-primary mt-0.5" />
              <div className="space-y-2">
                <p>
                  Автоматическая отправка ссылки на email пока не подключена (нет почтового сервиса в составе MVP).
                </p>
                <p className="text-foreground/90">
                  Если вы регистрировались с телефоном — войдите по номеру и паролю на странице{' '}
                  <Link to="/login" className="text-primary font-medium hover:underline">«Вход»</Link>
                  . При входе через Telegram откройте профиль и привяжите email с новым паролем.
                </p>
                <p>
                  Нужен сброс вручную — напишите в поддержку с адреса, указанного в аккаунте.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full rounded-full" asChild>
            <Link to="/login">Перейти ко входу</Link>
          </Button>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default ForgotPassword;
