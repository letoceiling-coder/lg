import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Apartment, SortField, SortDir } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

interface Props {
  apartments: Apartment[];
  sort: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: 'Свободна', className: 'text-green-600' },
  reserved: { label: 'Бронь', className: 'text-amber-500' },
  sold: { label: 'Продана', className: 'text-muted-foreground line-through' },
};

const ApartmentTable = ({ apartments, sort, onSort }: Props) => {
  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors group" onClick={() => onSort(field)}>
      {label}
      <ArrowUpDown className={cn('w-3.5 h-3.5 transition-colors', sort.field === field ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground')} />
    </button>
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-20 font-semibold"><SortBtn field="rooms" label="Комн." /></TableHead>
            <TableHead className="font-semibold"><SortBtn field="area" label="Площадь" /></TableHead>
            <TableHead className="font-semibold">Кухня</TableHead>
            <TableHead className="font-semibold"><SortBtn field="floor" label="Этаж" /></TableHead>
            <TableHead className="font-semibold"><SortBtn field="price" label="Цена" /></TableHead>
            <TableHead className="font-semibold">₽/м²</TableHead>
            <TableHead className="font-semibold">Отделка</TableHead>
            <TableHead className="font-semibold">Статус</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apartments.map(a => {
            const st = statusLabels[a.status];
            return (
              <TableRow key={a.id} className="group hover:bg-accent/30">
                <TableCell className="font-medium">{a.rooms === 0 ? 'Ст' : `${a.rooms}к`}</TableCell>
                <TableCell className="font-medium">{a.area} м²</TableCell>
                <TableCell className="text-muted-foreground">{a.kitchenArea} м²</TableCell>
                <TableCell>{a.floor}/{a.totalFloors}</TableCell>
                <TableCell className="font-semibold">{formatPrice(a.price)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{a.pricePerMeter.toLocaleString('ru-RU')} ₽</TableCell>
                <TableCell className="text-muted-foreground capitalize text-xs">{a.finishing}</TableCell>
                <TableCell className={st.className}>{st.label}</TableCell>
                <TableCell>
                  {a.status !== 'sold' && (
                    <Link to={`/apartment/${a.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApartmentTable;
