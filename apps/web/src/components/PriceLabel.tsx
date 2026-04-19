import { cn } from '@/lib/utils';

type Props = {
  /** Готовая строка цены (например, "от 5.4 млн ₽" или "—") */
  value: string | null | undefined;
  className?: string;
  /** true — выделять красным как «горячее» */
  hot?: boolean;
};

/**
 * Единый стиль ценника на карточках. Принимает уже отформатированную строку
 * (исходники: formatPrice / formatListingPriceMinRub), чтобы во всех блоках
 * на главной и в каталоге цена выглядела одинаково.
 */
const PriceLabel = ({ value, className, hot }: Props) => {
  const text = value && value.trim() ? value : '—';
  return (
    <span
      className={cn(
        'font-bold text-sm shrink-0',
        hot ? 'text-[#EF4444]' : 'text-primary',
        className,
      )}
    >
      {text}
    </span>
  );
};

export default PriceLabel;
