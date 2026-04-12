import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Image, Users, Settings, ChevronLeft,
  ChevronRight, Palette, BookOpen, ClipboardList, Building2, Download, Newspaper, Home,
  Globe, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Дашборд', end: true },
  { to: '/admin/pages', icon: FileText, label: 'Страницы' },
  { to: '/admin/requests', icon: ClipboardList, label: 'Заявки' },
  { to: '/admin/blocks', icon: Building2, label: 'ЖК' },
  { to: '/admin/listings', icon: Home, label: 'Квартиры' },
  { to: '/admin/feed-import', icon: Download, label: 'Импорт фидов' },
  { to: '/admin/regions', icon: Globe, label: 'Регионы' },
  { to: '/admin/homepage', icon: LayoutTemplate, label: 'Главная (блоки)' },
  { to: '/admin/news', icon: Newspaper, label: 'Новости' },
  { to: '/admin/media', icon: Image, label: 'Медиа' },
  { to: '/admin/users', icon: Users, label: 'Пользователи' },
  { to: '/admin/tokens', icon: Palette, label: 'Токены' },
  { to: '/admin/docs', icon: BookOpen, label: 'Документация' },
  { to: '/admin/settings', icon: Settings, label: 'Настройки' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
          {navItems.map(item => (
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
