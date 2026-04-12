import { useState } from 'react';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { User, LogOut, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/shared/hooks/useAuth';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { ApiError } from '@/lib/api';

function parseApiMessage(err: unknown): string {
  if (err instanceof ApiError) {
    try {
      const j = JSON.parse(err.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      if (err.message) return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Ошибка запроса';
}

const Profile = () => {
  const { user, logout, linkEmail } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkEmailErr, setLinkEmailErr] = useState<string | null>(null);
  const [linkEmailOk, setLinkEmailOk] = useState<string | null>(null);
  const [linkTgErr, setLinkTgErr] = useState<string | null>(null);
  const [linkTgOk, setLinkTgOk] = useState<string | null>(null);

  if (!user) return null;

  const hasEmail = !!(user.email && user.email.trim());
  const hasTg =
    !!user.telegramLinked || !!(user.telegramUsername && user.telegramUsername.trim());

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkEmailErr(null);
    setLinkEmailOk(null);
    try {
      await linkEmail(email.trim(), password);
      setLinkEmailOk('Email и пароль сохранены. Теперь можно входить по email.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setLinkEmailErr(parseApiMessage(err));
    }
  };

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
            <p className="font-bold mb-1">{user.name}</p>
            {user.phone ? (
              <p className="text-xs text-muted-foreground mb-2">{user.phone}</p>
            ) : null}
            {hasEmail ? (
              <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3 shrink-0" />
                {user.email}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-4">Email не указан</p>
            )}
            {hasTg ? (
              <p className="text-xs text-muted-foreground mb-4">
                Telegram
                {user.telegramUsername ? `: @${user.telegramUsername}` : ' привязан'}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="w-full" disabled>
              Редактировать
            </Button>
          </div>
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold mb-2">Вход в один аккаунт</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Привяжите Telegram к аккаунту с email или добавьте email к аккаунту из Telegram —
                так не появится второй пользователь при смене способа входа.
              </p>
              {!hasTg ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Привязать Telegram</p>
                  {linkTgOk ? (
                    <p className="text-sm text-green-600 dark:text-green-400">{linkTgOk}</p>
                  ) : null}
                  {linkTgErr ? (
                    <p className="text-sm text-destructive">{linkTgErr}</p>
                  ) : null}
                  <TelegramLoginButton
                    mode="link"
                    onSuccess={() => {
                      setLinkTgErr(null);
                      setLinkTgOk('Telegram привязан.');
                    }}
                    onError={(m) => {
                      setLinkTgOk(null);
                      setLinkTgErr(m);
                    }}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Telegram уже привязан.</p>
              )}
              {!hasEmail ? (
                <form onSubmit={handleLinkEmail} className="mt-6 space-y-3 max-w-sm">
                  <p className="text-sm font-medium">Добавить email и пароль</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="link-email">Email</Label>
                    <Input
                      id="link-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="link-password">Пароль (мин. 6 символов)</Label>
                    <Input
                      id="link-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  {linkEmailOk ? (
                    <p className="text-sm text-green-600 dark:text-green-400">{linkEmailOk}</p>
                  ) : null}
                  {linkEmailErr ? (
                    <p className="text-sm text-destructive">{linkEmailErr}</p>
                  ) : null}
                  <Button type="submit" size="sm">
                    Сохранить
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">Email уже указан.</p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold mb-3">Мои заявки</h2>
              <p className="text-sm text-muted-foreground">Заявок пока нет</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Избранное</h2>
                <Link to="/favorites" className="text-sm text-primary hover:underline">Все →</Link>
              </div>
              <p className="text-sm text-muted-foreground">
                {favoritesCount > 0 ? `Сохранено в избранном: ${favoritesCount}` : 'Нет избранных объектов'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Сравнение</h2>
                <Link to="/compare" className="text-sm text-primary hover:underline">Все →</Link>
              </div>
              <p className="text-sm text-muted-foreground">Нет объектов для сравнения</p>
            </div>
            <Button
              variant="destructive"
              className="flex items-center gap-2"
              type="button"
              onClick={() => void logout()}
            >
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
