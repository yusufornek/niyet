export function moneyToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return Number.parseFloat((value as { toString: () => string }).toString());
  }

  return 0;
}
