import { Grid3X3, List, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list' | 'map';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'grid', icon: Grid3X3, label: 'Плитка' },
  { mode: 'list', icon: List, label: 'Список' },
  { mode: 'map', icon: MapPin, label: 'Карта' },
];

const ViewToggle = ({ value, onChange }: Props) => (
  <div className="flex items-center gap-1 border border-border rounded-full p-1">
    {modes.map(({ mode, icon: Icon, label }) => (
      <button
        key={mode}
        title={label}
        onClick={() => onChange(mode)}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          value === mode
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-secondary text-muted-foreground'
        )}
      >
        <Icon className="w-4 h-4" />
      </button>
    ))}
  </div>
);

export default ViewToggle;
