import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import contactMap from '@/assets/contact-map.jpg';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { telHref, yandexMapsHref } from '@/lib/contact-links';

const SOCIAL_DEFS = [
  { label: 'VK' as const, key: 'vk_url' as const },
  { label: 'TG' as const, key: 'telegram_url' as const },
  { label: 'YT' as const, key: 'youtube_url' as const },
  { label: 'OK' as const, key: 'ok_url' as const },
];

const ContactsSection = React.forwardRef<HTMLElement>((_, ref) => {
  const { data: s } = useSiteSettings();

  const phone = settingOptional(s, 'phone_main');
  const phoneTel = phone ? telHref(phone) : undefined;
  const email = settingOptional(s, 'email');
  const address = settingOptional(s, 'address');
  const workHours = settingOptional(s, 'work_hours');
  const lat = settingOptional(s, 'office_lat');
  const lng = settingOptional(s, 'office_lng');
  const mapsUrl =
    address || (lat && lng)
      ? yandexMapsHref({ address, officeLat: lat, officeLng: lng })
      : undefined;
  const officeTitle = settingOptional(s, 'office_title');

  const socials = SOCIAL_DEFS.map(({ label, key }) => ({
    label,
    href: settingOptional(s, key),
  })).filter((x): x is { label: (typeof SOCIAL_DEFS)[number]['label']; href: string } => Boolean(x.href));

  const showOverlay = Boolean(officeTitle || address);

  return (
    <section ref={ref} id="contacts" className="py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6">
          Свяжитесь с <span className="text-primary">LiveGrid</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-4 sm:space-y-5">
            {phone ? (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <div>
                  <a href={phoneTel} className="text-sm font-medium hover:text-primary transition-colors">
                    {phone}
                  </a>
                  {workHours ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">{workHours}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {!phone && workHours ? (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 opacity-50" />
                <p className="text-xs sm:text-sm text-muted-foreground">{workHours}</p>
              </div>
            ) : null}
            {email ? (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <a href={`mailto:${email}`} className="text-xs sm:text-sm hover:text-primary transition-colors">
                  {email}
                </a>
              </div>
            ) : null}
            {address && mapsUrl ? (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm hover:text-primary transition-colors"
                >
                  {address}
                </a>
              </div>
            ) : null}
            {socials.length > 0 ? (
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                {socials.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-[10px] sm:text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative rounded-xl overflow-hidden min-h-[240px] sm:min-h-[300px]">
            <img src={contactMap} alt="Расположение офиса LiveGrid" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
            {showOverlay ? (
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[min(100%-2rem,320px)]">
                {officeTitle ? <p className="text-xs font-semibold">{officeTitle}</p> : null}
                {address ? <p className="text-[11px] text-muted-foreground">{address}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
});

ContactsSection.displayName = 'ContactsSection';

export default ContactsSection;
