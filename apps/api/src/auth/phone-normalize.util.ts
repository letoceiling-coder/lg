/**
 * Нормализация телефона для входа/регистрации (РФ и общий +E.164).
 * В БД храним в виде +7XXXXXXXXXX для РФ.
 */
export function normalizeLoginPhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;

  if (digits.length === 10 && digits[0] === '9') {
    return `+7${digits}`;
  }
  if (digits.length === 11 && digits[0] === '8') {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits[0] === '7') {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

/** Варианты для поиска пользователя, если в БД записали иначе. */
export function phoneLookupVariants(input: string): string[] {
  const n = normalizeLoginPhone(input);
  if (!n) return [];
  const digits = input.replace(/\D/g, '');
  const set = new Set<string>();
  if (n) set.add(n);
  if (digits.length === 11 && digits.startsWith('8')) {
    set.add(`+7${digits.slice(1)}`);
  }
  if (digits.length === 10) {
    set.add(`+7${digits}`);
  }
  return [...set];
}
