import { useEffect, useRef, useState } from 'react';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MapPin, X } from 'lucide-react';
import { formatListingPriceFromApi } from '@/redesign/data/mock-data';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const DEFAULT_ZOOM = 11;
const PRICE_LABEL_ZOOM = 12;

export interface ListingMapItem {
  id: number;
  lat: number | string;
  lng: number | string;
  price: string | number | null;
  title: string | null;
  kind: string;
  address: string | null;
  photoUrl?: string | null;
  slug?: string;
}

/** Подпись на метке — без дублирующего «₽» в шаблоне */
function formatPriceShort(price: string | number | null): string {
  const s = formatListingPriceFromApi(price);
  return s === 'Цена по запросу' ? s : s.replace(/\s*₽\s*/g, '').trim();
}

interface Props {
  listings: ListingMapItem[];
  regionId?: number | null;
  regionCenter?: [number, number] | null;
  activeId?: number | null;
  onSelect?: (id: number | null) => void;
  height?: string;
  compact?: boolean;
}

const ListingsMapSearch = ({ listings, regionCenter, activeId, onSelect, height = '70vh', compact }: Props) => {
  const fillParent = Boolean(compact) || height === '100%';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const { ready } = useYandexMapsReady();

  const active = listings.find((l) => l.id === activeId);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: regionCenter ?? DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      controls: ['zoomControl'],
    });
    mapInstance.current.events.add('boundschange', () => {
      const nextZoom = mapInstance.current?.getZoom?.();
      if (typeof nextZoom === 'number') setZoom(nextZoom);
    });
  }, [ready, regionCenter]);

  useEffect(() => {
    if (!mapInstance.current || !regionCenter) return;
    mapInstance.current.setCenter(regionCenter);
  }, [regionCenter]);

  // Render markers
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;

    if (clustererRef.current) {
      map.geoObjects.remove(clustererRef.current);
      clustererRef.current = null;
    }

    const validListings = listings.filter(
      (l) => l.lat != null && l.lng != null && parseFloat(String(l.lat)) !== 0,
    );

    if (validListings.length === 0) return;

    const clusterer = new window.ymaps.Clusterer({
      preset: 'islands#blueCircleClusterIcons',
      clusterIconLayout: 'default#pieChart',
      clusterDisableClickZoom: false,
    });

    const showPriceLabels = zoom >= PRICE_LABEL_ZOOM;

    const placemarks = validListings.map((l) => {
      const isActive = l.id === activeId;
      const priceLabel = formatPriceShort(l.price);
      const color = isActive ? '#ef4444' : '#2563EB';

      const layout = window.ymaps.templateLayoutFactory.createClass(
        showPriceLabels
          ? `<div style="
              background: ${color};
              color: #ffffff;
              padding: 5px 10px;
              border-radius: 999px;
              font-size: 11px;
              line-height: 1;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 8px 20px rgba(37,99,235,0.28);
              cursor: pointer;
              transform: translate(-50%, -100%);
              border: 2px solid #ffffff;
              position: relative;
            ">${priceLabel}<div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0; height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 8px solid ${color};
              filter: drop-shadow(0 2px 2px rgba(15,23,42,0.15));
            "></div></div>`
          : `<div style="
              width: ${isActive ? 22 : 16}px;
              height: ${isActive ? 22 : 16}px;
              border-radius: 999px;
              background: ${color};
              border: 3px solid #ffffff;
              box-shadow: 0 8px 20px rgba(37,99,235,0.32);
              cursor: pointer;
              transform: translate(-50%, -50%);
            "></div>`,
      );

      const pm = new window.ymaps.Placemark(
        [parseFloat(String(l.lat)), parseFloat(String(l.lng))],
        {},
        {
          iconLayout: layout,
          iconShape: { type: 'Rectangle', coordinates: [[-35, -28], [35, 0]] },
        },
      );

      pm.events.add('click', () => onSelect?.(l.id === activeId ? null : l.id));
      return pm;
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);
    clustererRef.current = clusterer;
  }, [listings, ready, activeId, onSelect, zoom]);

  // Center on active
  useEffect(() => {
    if (!activeId || !mapInstance.current) return;
    const l = listings.find((x) => x.id === activeId);
    if (l && l.lat && l.lng) {
      mapInstance.current.setCenter(
        [parseFloat(String(l.lat)), parseFloat(String(l.lng))],
        15,
        { duration: 300 },
      );
    }
  }, [activeId, listings]);

  return (
    <div
      className={cn('relative', fillParent ? 'h-full min-h-0' : '')}
      style={fillParent ? undefined : { height }}
    >
      <div
        ref={mapRef}
        className={cn(
          'h-full w-full rounded-xl border border-border bg-muted',
          fillParent ? 'min-h-0 overflow-hidden' : 'min-h-[300px] overflow-hidden',
        )}
      />

      {active && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[300px] z-10 animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => onSelect?.(null)}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {active.slug ? (
              <Link to={`/listing/${active.id}`} className="block p-3">
                {active.photoUrl && (
                  <img
                    src={active.photoUrl}
                    alt=""
                    className="w-full h-[100px] object-cover rounded-lg mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <p className="font-semibold text-sm leading-snug">{active.title ?? active.address}</p>
                {active.address && active.title && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{active.address}</span>
                  </div>
                )}
                <p className="text-sm font-bold text-primary mt-1">
                  {formatPriceShort(active.price)}
                </p>
                <span className="text-primary text-[11px] font-medium mt-1 inline-block">Подробнее →</span>
              </Link>
            ) : (
              <Link to={`/listing/${active.id}`} className="block p-3">
                <p className="font-semibold text-sm">{active.title ?? active.address}</p>
                <p className="text-sm font-bold text-primary mt-1">{formatPriceShort(active.price)}</p>
                <span className="text-primary text-[11px] font-medium">Подробнее →</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingsMapSearch;
