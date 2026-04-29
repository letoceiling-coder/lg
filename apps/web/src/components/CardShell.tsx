import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Включает рамку primary с подсветкой (для горячих карточек) */
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

/**
 * Единая обёртка для карточек на главной/каталоге.
 * Фиксирует высоту 300px и общие визуальные свойства, чтобы блоки
 * (Hot/Start/News) были одной высоты и с единой стилистикой.
 */
const CardShell = ({ children, className, highlighted, onMouseEnter, onMouseLeave }: Props) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'group relative flex flex-col h-[300px] rounded-xl overflow-hidden bg-card border transition-all duration-200 hover:shadow-md hover:-translate-y-px',
        highlighted ? 'border-primary/20 hover:border-primary/40' : 'border-border',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default CardShell;
