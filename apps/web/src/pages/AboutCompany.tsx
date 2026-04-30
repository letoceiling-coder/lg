import RedesignHeader from '@/redesign/components/RedesignHeader';
import AboutPlatform from '@/components/AboutPlatform';
import FooterSection from '@/components/FooterSection';

export default function AboutCompany() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">О компании</h1>
        <p className="text-sm text-muted-foreground mt-1">Команда и платформа LiveGrid</p>
      </div>
      <AboutPlatform />
      <FooterSection />
    </div>
  );
}
