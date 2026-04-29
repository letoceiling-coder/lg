import { useNavigate } from 'react-router-dom';
import type { LayoutGroup } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

interface Props {
  layouts: LayoutGroup[];
  complexSlug: string;
}

const LayoutCard = ({ layout }: { layout: LayoutGroup }) => {
  const navigate = useNavigate();
  const canOpen = Boolean(layout.apartmentId);
  const open = () => {
    if (canOpen) navigate(`/apartment/${layout.apartmentId}`);
  };

  return (
    <div
      role="button"
      tabIndex={canOpen ? 0 : -1}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
    >
      <div className="aspect-square bg-muted/50 flex items-center justify-center p-6">
        <img src={layout.planImage} alt={`${layout.rooms}-комн`} className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 space-y-1.5">
        <h4 className="font-semibold text-sm">{layout.rooms === 0 ? 'Студия' : `${layout.rooms}-комнатная`}</h4>
        <p className="text-xs text-muted-foreground">{layout.area} м²</p>
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm font-bold">от {formatPrice(layout.priceFrom)}</p>
          <span className="text-xs text-primary font-medium whitespace-nowrap">
            {layout.availableCount} шт.
          </span>
        </div>
      </div>
    </div>
  );
};

const LayoutGrid = ({ layouts, complexSlug }: Props) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {layouts.map(l => (
      <LayoutCard key={l.id} layout={l} />
    ))}
  </div>
);

export default LayoutGrid;
