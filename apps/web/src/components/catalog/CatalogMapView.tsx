import { useEffect, useRef, useState, useCallback } from 'react';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import type { PropertyData } from '@/components/PropertyCard';
import CatalogList from './CatalogList';

interface Props {
  items: PropertyData[];
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const DEFAULT_CENTER = [55.751244, 37.618423]; // Moscow
const DEFAULT_ZOOM = 11;

const CatalogMapView = ({ items }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { ready } = useYandexMapsReady();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;

    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      controls: ['zoomControl', 'geolocationControl'],
    });
  }, [ready]);

  // Create placemarks
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Clear old
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    items.forEach((item, idx) => {
      if (!item.coords) return;
      const slug = item.slug || item.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');

      const placemark = new window.ymaps.Placemark(
        item.coords,
        {
          balloonContentHeader: `<strong>${item.title}</strong>`,
          balloonContentBody: `
            <div style="max-width:240px">
              <img src="${item.image}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>
              <div style="font-weight:700;margin-bottom:4px">${item.price}</div>
              <a href="/object/${slug}" style="color:#2563eb;font-size:13px">Подробнее →</a>
            </div>
          `,
        },
        {
          preset: 'islands#blueCircleDotIcon',
        }
      );

      placemark.events.add('click', () => setActiveSlug(slug));
      map.geoObjects.add(placemark);
      markersRef.current.push(placemark);
    });
  }, [items, ready]);

  const handleSelect = useCallback((slug: string) => {
    setActiveSlug(slug);
    const item = items.find(
      i => (i.slug || i.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '')) === slug
    );
    if (item?.coords && mapInstance.current) {
      mapInstance.current.setCenter(item.coords, 14, { duration: 400 });
    }
  }, [items]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div
        ref={mapRef}
        className="w-full lg:flex-1 rounded-2xl overflow-hidden border border-border bg-muted"
        style={{ height: '70vh', minHeight: '400px' }}
      />
      <div className="w-full lg:w-[380px] lg:max-h-[70vh] overflow-y-auto shrink-0">
        <CatalogList items={items} activeSlug={activeSlug} onSelect={handleSelect} />
      </div>
    </div>
  );
};

export default CatalogMapView;
