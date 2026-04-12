import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Apartment } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

interface Props {
  apartments: Apartment[];
  floors: number;
  sections: number;
  buildingName: string;
}

const statusBg: Record<string, string> = {
  available: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-800',
  reserved: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800',
  sold: 'bg-muted border-border text-muted-foreground',
};

const Chessboard = ({ apartments, floors, sections, buildingName }: Props) => {
  const grid = new Map<string, Apartment>();
  apartments.forEach(a => {
    grid.set(`${a.floor}-${a.section}`, a);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{buildingName}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Свободна</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Бронь</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border border-border" /> Продана</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `48px repeat(${sections}, minmax(90px, 1fr))` }}>
          {/* Header */}
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center">Эт.</div>
          {Array.from({ length: sections }, (_, s) => (
            <div key={s} className="text-xs text-muted-foreground font-medium text-center py-1.5">Секц. {s + 1}</div>
          ))}

          {/* Floors top to bottom */}
          {Array.from({ length: floors }, (_, fi) => {
            const floor = floors - fi;
            return (
              <>
                <div key={`f-${floor}`} className="text-xs text-muted-foreground flex items-center justify-center font-medium">{floor}</div>
                {Array.from({ length: sections }, (_, s) => {
                  const apt = grid.get(`${floor}-${s + 1}`);
                  if (!apt) return <div key={`${floor}-${s}`} className="h-14 bg-muted/30 rounded-lg border border-border/30" />;
                  return (
                    <Link
                      key={`${floor}-${s}`}
                      to={apt.status !== 'sold' ? `/apartment/${apt.id}` : '#'}
                      className={cn(
                        'h-14 rounded-lg border text-[10px] leading-tight flex flex-col items-center justify-center transition-all duration-150',
                        statusBg[apt.status],
                        apt.status === 'sold' && 'pointer-events-none opacity-50',
                        apt.status === 'available' && 'hover:shadow-sm hover:scale-[1.02]'
                      )}
                    >
                      <span className="font-semibold">{apt.rooms}к · {apt.area}м²</span>
                      <span className="opacity-80">{formatPrice(apt.price)}</span>
                    </Link>
                  );
                })}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Chessboard;
