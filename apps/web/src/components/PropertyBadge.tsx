import { cn } from '@/lib/utils';
import { Flame, CalendarClock, Sparkles, Tag } from 'lucide-react';

export type BadgeType = 'discount' | 'promo' | 'new' | 'start' | 'info' | 'status';

interface Props {
  label: string;
  type?: BadgeType;
  className?: string;
}

const badgeStyles: Record<BadgeType, string> = {
  discount: 'bg-destructive text-destructive-foreground',
  promo: 'bg-primary text-primary-foreground',
  new: 'bg-accent text-accent-foreground',
  start: 'bg-primary text-primary-foreground',
  info: 'bg-background/85 backdrop-blur-sm text-foreground',
  status: 'bg-primary/90 text-primary-foreground backdrop-blur-sm',
};

const badgeIcons: Partial<Record<BadgeType, typeof Flame>> = {
  discount: Tag,
  promo: Flame,
  start: CalendarClock,
  new: Sparkles,
};

/** Auto-detect badge type from label text */
export function detectBadgeType(label: string): BadgeType {
  const l = label.toLowerCase();
  if (l.includes('скидк') || l.includes('%')) return 'discount';
  if (l.includes('акци') || l.includes('горяч')) return 'promo';
  if (l.includes('старт') || l.includes('март') || l.includes('апрел') || l.includes('май') || l.includes('июн')) return 'start';
  if (l.includes('нов') || l.includes('топ')) return 'new';
  return 'info';
}

const PropertyBadge = ({ label, type, className }: Props) => {
  const resolvedType = type ?? detectBadgeType(label);
  const Icon = badgeIcons[resolvedType];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight',
        badgeStyles[resolvedType],
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label}
    </span>
  );
};

export default PropertyBadge;
