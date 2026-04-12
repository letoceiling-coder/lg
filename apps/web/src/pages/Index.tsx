import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import CategoryTiles from '@/components/CategoryTiles';
import NewListings from '@/components/NewListings';
import CatalogZhk from '@/components/CatalogZhk';
import QuizSection from '@/components/QuizSection';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import { useContentStore } from '@/admin/store/content-store';
import { useMemo } from 'react';

const sectionComponents: Record<string, React.ComponentType<any>> = {
  hero: HeroSection,
  category_tiles: CategoryTiles,
  new_listings: NewListings,
  catalog_zhk: CatalogZhk,
  quiz: QuizSection,
  about_platform: AboutPlatform,
  additional_features: AdditionalFeatures,
  latest_news: LatestNews,
  contacts: ContactsSection,
  footer: FooterSection,
};

const Index = () => {
  const pages = useContentStore(s => s.pages);
  const activeSections = useMemo(() => {
    const page = pages.find(p => p.slug === '/');
    if (!page) return [];
    return page.sections.filter(s => s.is_active).sort((a, b) => a.position - b.position);
  }, [pages]);

  // Special handling for property_grid which needs props
  const renderSection = (section: any) => {
    if (section.type === 'property_grid') {
      return (
        <PropertyGridSection
          key={section.id}
          title={section.settings?.title || section.label}
          type={section.settings?.gridType || 'hot'}
        />
      );
    }

    const Component = sectionComponents[section.type];
    if (!Component) return null;
    return <Component key={section.id} />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {activeSections.map(renderSection)}
    </div>
  );
};

export default Index;
