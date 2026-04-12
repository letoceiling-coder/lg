import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';
import { Phone, Mail, MapPin } from 'lucide-react';

const Contacts = () => (
  <div className="min-h-screen bg-background pb-16 lg:pb-0">
    <RedesignHeader />
    <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Контакты</h1>
      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-6">
          {/* Map placeholder */}
          <div className="bg-muted rounded-xl h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground">
            Карта (Leaflet)
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Адрес</p>
                <p className="text-sm text-muted-foreground">[Адрес офиса]</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Телефон</p>
                <a href="tel:+79045393434" className="text-sm text-muted-foreground hover:text-primary">+7 (904) 539-34-34</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Email</p>
                <a href="mailto:info@livegrid.ru" className="text-sm text-muted-foreground hover:text-primary">info@livegrid.ru</a>
              </div>
            </div>
          </div>
        </div>
        <LeadForm title="Написать нам" source="contacts" />
      </div>
    </div>
    <FooterSection />
  </div>
);

export default Contacts;
