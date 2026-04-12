import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContentStore, type SectionConfig } from '../store/content-store';
import {
  ArrowLeft, Eye, EyeOff, Save, GripVertical, ChevronDown, ChevronUp,
  Settings, FileText, Image, Search as SearchIcon, Globe, Check, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import SectionEditorForm from '../components/sections/SectionEditorForm';

const tabs = [
  { id: 'content', label: 'Контент', icon: FileText },
  { id: 'seo', label: 'SEO', icon: SearchIcon },
  { id: 'media', label: 'Медиа', icon: Image },
  { id: 'settings', label: 'Настройки', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const sectionTypeLabels: Record<string, string> = {
  hero: 'Hero',
  category_tiles: 'Категории',
  new_listings: 'Новые объявления',
  catalog_zhk: 'Каталог ЖК',
  quiz: 'Квиз',
  property_grid: 'Сетка объектов',
  about_platform: 'О платформе',
  additional_features: 'Доп. возможности',
  latest_news: 'Новости',
  contacts: 'Контакты',
  footer: 'Подвал',
  catalog_search: 'Поиск каталога',
  catalog_grid: 'Сетка каталога',
  catalog_filters: 'Фильтры',
  zhk_grid: 'Сетка ЖК',
  news_grid: 'Сетка новостей',
};

export default function AdminPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const decodedSlug = decodeURIComponent(slug || '/');
  const { getPageContent, updatePageMeta, toggleSection, reorderSections, updateSectionSettings } = useContentStore();

  const page = getPageContent(decodedSlug);
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!page) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Страница не найдена</p>
        <Link to="/admin/pages" className="text-primary text-sm mt-2 inline-block">← Назад</Link>
      </div>
    );
  }

  const sortedSections = [...page.sections].sort((a, b) => a.position - b.position);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedSections.length) return;
    reorderSections(decodedSlug, index, newIndex);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/pages')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-sm truncate">{page.title}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-lg',
            page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          )}>
            {page.status === 'published' ? 'Опубликовано' : 'Черновик'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить'}
          </button>
          <button
            onClick={() => updatePageMeta(decodedSlug, { status: page.status === 'published' ? 'draft' : 'published' })}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90"
          >
            <Globe className="w-3 h-3" />
            {page.status === 'published' ? 'В черновик' : 'Опубликовать'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b px-4 flex gap-0.5 bg-background">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'content' && (
          <div className="max-w-4xl space-y-3">
            <h2 className="text-lg font-semibold mb-4">Секции страницы</h2>
            {sortedSections.map((section, index) => (
              <div key={section.id} className="bg-background border rounded-2xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{section.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {sectionTypeLabels[section.type] || section.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === sortedSections.length - 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={() => toggleSection(decodedSlug, section.id)}
                    />
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className={cn(
                        'p-1.5 rounded-lg text-xs font-medium transition-colors',
                        expandedSection === section.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {expandedSection === section.id ? 'Свернуть' : 'Редактировать'}
                    </button>
                  </div>
                </div>

                {/* Section editor */}
                {expandedSection === section.id && (
                  <div className="border-t px-4 py-4 bg-muted/30">
                    <SectionEditorForm
                      section={section}
                      onUpdate={(settings) => updateSectionSettings(decodedSlug, section.id, settings)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold mb-4">SEO настройки</h2>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Title</label>
              <input
                value={page.meta_title}
                onChange={e => updatePageMeta(decodedSlug, { meta_title: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">{page.meta_title.length}/60 символов</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Description</label>
              <textarea
                value={page.meta_description}
                onChange={e => updatePageMeta(decodedSlug, { meta_description: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">{page.meta_description.length}/160 символов</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">OG Image URL</label>
              <input
                value={page.og_image}
                onChange={e => updatePageMeta(decodedSlug, { og_image: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
                placeholder="https://..."
              />
              {page.og_image && (
                <div className="mt-2 rounded-xl overflow-hidden border max-w-[300px]">
                  <img src={page.og_image} alt="OG Preview" className="w-full aspect-[1200/630] object-cover" />
                </div>
              )}
            </div>

            {/* OG Preview */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Предпросмотр в поиске</h3>
              <div className="border rounded-xl p-4 bg-background max-w-lg">
                <p className="text-primary text-sm truncate">{page.slug}</p>
                <p className="text-base font-medium text-foreground truncate">{page.meta_title || page.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{page.meta_description}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold mb-4">Медиа страницы</h2>
            <div className="border-2 border-dashed rounded-2xl p-12 text-center">
              <Image className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Перетащите файлы или используйте медиа-библиотеку</p>
              <Link to="/admin/media" className="text-primary text-sm font-medium hover:underline">
                Открыть медиа-библиотеку →
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-lg font-semibold mb-4">Настройки страницы</h2>
            <div>
              <label className="text-sm font-medium mb-1 block">Название</label>
              <input
                value={page.title}
                onChange={e => updatePageMeta(decodedSlug, { title: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <input
                value={page.slug}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-muted text-muted-foreground"
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Статус</label>
              <div className="flex gap-2">
                {(['draft', 'published'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => updatePageMeta(decodedSlug, { status: s })}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                      page.status === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'
                    )}
                  >
                    {s === 'draft' ? 'Черновик' : 'Опубликовано'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
