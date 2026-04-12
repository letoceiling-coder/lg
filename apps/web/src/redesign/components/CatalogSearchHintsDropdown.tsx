import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Train, MapPin, MapPinned, Landmark, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';

const PLACEHOLDER = '/placeholder.svg';

type Props = {
  hints: CatalogHints | undefined;
  isLoading: boolean;
  className?: string;
  onPick?: () => void;
};

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 bg-card">
      {children}
    </p>
  );
}

/**
 * Одна категория подсказок: заголовок всегда снаружи скролла; список — отдельный скролл-контейнер
 * (как на livegrid/trendagent: свой скролл у ЖК, у метро, у улиц и т.д., без общего скролла панели).
 */
function HintCategorySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 isolate">
      <SectionTitle>{title}</SectionTitle>
      <div className="min-h-0 max-h-[min(260px,38vh)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y [scrollbar-gutter:stable]">
        {children}
      </div>
    </div>
  );
}

export default function CatalogSearchHintsDropdown({ hints, isLoading, className, onPick }: Props) {
  const navigate = useNavigate();
  const c = hints?.complexes ?? [];
  const m = hints?.metro ?? [];
  const d = hints?.districts ?? [];
  const s = hints?.streets ?? [];
  const hasAny = c.length + m.length + d.length + s.length > 0;

  const goCatalog = (search: string) => {
    navigate(`/catalog?type=apartments&search=${encodeURIComponent(search)}`);
    onPick?.();
  };

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl shadow-lg z-50 overflow-x-hidden overflow-y-visible animate-in fade-in-0 slide-in-from-top-1 duration-150',
        className,
      )}
    >
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Поиск…
        </div>
      )}

      {!isLoading && !hasAny && (
        <p className="py-8 px-4 text-center text-sm text-muted-foreground">Ничего не найдено</p>
      )}

      {!isLoading && hasAny && (
        <>
          {c.length > 0 && (
            <HintCategorySection title="Жилые комплексы">
              {c.map((row) => (
                <Link
                  key={row.id}
                  to={`/complex/${encodeURIComponent(row.slug)}`}
                  onClick={onPick}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <img
                    src={row.imageUrl?.trim() ? row.imageUrl : PLACEHOLDER}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[row.districtName, row.metroName ? `м. ${row.metroName}` : null].filter(Boolean).join(' · ') || 'ЖК'}
                    </p>
                  </div>
                  <Landmark className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                </Link>
              ))}
            </HintCategorySection>
          )}

          {c.length > 0 && (m.length > 0 || d.length > 0 || s.length > 0) && <div className="h-px bg-border mx-2" />}

          {m.length > 0 && (
            <HintCategorySection title="Метро">
              {m.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => goCatalog(row.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <Train className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{row.name}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Метро</span>
                </button>
              ))}
            </HintCategorySection>
          )}

          {m.length > 0 && (d.length > 0 || s.length > 0) && <div className="h-px bg-border mx-2" />}

          {d.length > 0 && (
            <HintCategorySection title="Районы">
              {d.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => goCatalog(row.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <MapPinned className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{row.name}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Район</span>
                </button>
              ))}
            </HintCategorySection>
          )}

          {d.length > 0 && s.length > 0 && <div className="h-px bg-border mx-2" />}

          {s.length > 0 && (
            <HintCategorySection title="Улицы и адреса">
              {s.map((row, idx) => (
                <button
                  key={`${row.blockId}-${idx}-${row.address.slice(0, 40)}`}
                  type="button"
                  onClick={() => goCatalog(row.address)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate text-left">{row.address}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Улица</span>
                </button>
              ))}
            </HintCategorySection>
          )}
        </>
      )}
    </div>
  );
}
