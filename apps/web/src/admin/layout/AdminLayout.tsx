import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Image, Users, Settings, ChevronLeft,
  ChevronRight, Palette, BookOpen, ClipboardList, Building2, Building, Download, Newspaper, Home, History, HardHat,
  Globe, LayoutTemplate, BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Дашборд', end: true },
  { to: '/admin/pages', icon: FileText, label: 'Страницы', roles: ['admin', 'editor'] },
  { to: '/admin/requests', icon: ClipboardList, label: 'Заявки' },
  { to: '/admin/telegram-notify', icon: BellRing, label: 'Telegram уведомления команды', roles: ['admin'] },
  { to: '/admin/audit', icon: History, label: 'Журнал действий', roles: ['admin'] },
  { to: '/admin/blocks', icon: Building2, label: 'ЖК', roles: ['admin', 'editor'] },
  { to: '/admin/builders', icon: HardHat, label: 'Застройщики', roles: ['admin', 'editor'] },
  { to: '/admin/buildings', icon: Building, label: 'Корпуса', roles: ['admin', 'editor'] },
  { to: '/admin/listings', icon: Home, label: 'Квартиры' },
  { to: '/admin/feed-import', icon: Download, label: 'Импорт фидов', roles: ['admin', 'editor'] },
  { to: '/admin/reference', icon: BookOpen, label: 'Справочники', roles: ['admin', 'editor'] },
  { to: '/admin/regions', icon: Globe, label: 'Регионы', roles: ['admin', 'editor'] },
  { to: '/admin/homepage', icon: LayoutTemplate, label: 'Главная: блоки API', roles: ['admin', 'editor'] },
  { to: '/admin/news', icon: Newspaper, label: 'Новости', roles: ['admin', 'editor'] },
  { to: '/admin/media', icon: Image, label: 'Медиа', roles: ['admin', 'editor'] },
  { to: '/admin/users', icon: Users, label: 'Пользователи', roles: ['admin'] },
  { to: '/admin/tokens', icon: Palette, label: 'Токены', roles: ['admin'] },
  { to: '/admin/docs', icon: BookOpen, label: 'Документация' },
  { to: '/admin/settings', icon: Settings, label: 'Настройки', roles: ['admin', 'editor'] },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const availableNavItems = navItems.filter((item) => {
    if (!item.roles?.length) return true;
    const role = user?.role;
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs">LG</span>
          </div>
          {!collapsed && <span className="font-bold text-sm truncate">Live Grid CMS</span>}
        </div>
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {availableNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {!collapsed ? (
          <div
            className="mx-2 mb-1 px-2 py-1 rounded-lg bg-muted/50 text-[10px] text-muted-foreground leading-tight break-all"
            title="Если дата не меняется после деплоя — на сервере старая сборка или кэш браузера (Ctrl+Shift+R)."
          >
            Сборка: {__LG_BUILD_TIME__}
          </div>
        ) : null}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center h-12 border-t text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
