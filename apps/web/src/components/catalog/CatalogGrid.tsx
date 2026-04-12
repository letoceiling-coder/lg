import PropertyCard, { type PropertyData } from '@/components/PropertyCard';

interface Props {
  items: PropertyData[];
}

const CatalogGrid = ({ items }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {items.map((p, i) => (
      <PropertyCard key={i} data={p} />
    ))}
  </div>
);

export default CatalogGrid;
