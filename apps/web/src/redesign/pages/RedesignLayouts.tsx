import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import LayoutGrid from '@/redesign/components/LayoutGrid';
import { getComplexBySlug, getLayoutGroups } from '@/redesign/data/mock-data';
import { useMemo } from 'react';

const RedesignLayouts = () => {
  const { complex: slug } = useParams<{ complex: string }>();
  const complex = getComplexBySlug(slug || '');
  const layouts = useMemo(() => complex ? getLayoutGroups(complex.id) : [], [complex]);

  if (!complex) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Комплекс не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
          <span>/</span>
          <Link to={`/complex/${complex.slug}`} className="hover:text-foreground transition-colors">{complex.name}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Планировки</span>
        </div>
        <h1 className="text-xl font-bold mb-6">Планировки — {complex.name}</h1>
        <LayoutGrid layouts={layouts} complexSlug={complex.slug} />
      </div>
    </div>
  );
};

export default RedesignLayouts;
