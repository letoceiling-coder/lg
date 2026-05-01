import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';
import { Phone, Mail, MapPin, Navigation } from 'lucide-react';
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
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted h-[300px] sm:h-[400px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.20),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(249,115,22,0.16),transparent_30%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:42px_42px]" />
              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <MapPin className="h-7 w-7" />
                </div>
                <p className="max-w-md text-lg font-semibold">{address ?? 'Офис LiveGrid'}</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Откройте маршрут в Яндекс Картах или свяжитесь с нами через форму справа.
                </p>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Navigation className="h-4 w-4" />
                    Построить маршрут
                  </a>
                ) : null}
              </div>
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
