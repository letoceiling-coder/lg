import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';

const StubPage = ({ title, description }: { title: string; description: string }) => (
  <div className="min-h-screen bg-background pb-16 lg:pb-0">
    <RedesignHeader />
    <div className="max-w-[1400px] mx-auto px-4 py-12 sm:py-20 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">{description}</p>
    </div>
    <FooterSection />
  </div>
);

export default StubPage;
