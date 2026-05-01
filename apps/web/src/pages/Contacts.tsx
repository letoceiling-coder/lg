import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { telHref, yandexMapsHref } from '@/lib/contact-links';

const Contacts = () => {
  const { data: s } = useSiteSettings();
  const phone = settingOptional(s, 'phone_main');
  const phoneTel = phone ? telHref(phone) : undefined;
  const email = settingOptional(s, 'email');
  const address = settingOptional(s, 'address');
  const lat = settingOptional(s, 'office_lat');
  const lng = settingOptional(s, 'office_lng');
  const mapsUrl =
    address || (lat && lng) ? yandexMapsHref({ address, officeLat: lat, officeLng: lng }) : undefined;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Контакты</h1>
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">
            <div className="bg-muted rounded-xl h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground">
              Карта (Leaflet)
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {address ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Адрес</p>
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {address}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{address}</p>
                    )}
                  </div>
                </div>
              ) : null}
              {phone ? (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Телефон</p>
                    {phoneTel ? (
                      <a href={phoneTel} className="text-sm text-muted-foreground hover:text-primary">
                        {phone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{phone}</p>
                    )}
                  </div>
                </div>
              ) : null}
              {email ? (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary">
                      {email}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <LeadForm title="Написать нам" source="contacts" />
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Contacts;
