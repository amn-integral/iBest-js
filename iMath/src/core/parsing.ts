import { evaluate } from 'mathjs';

export const parseStrictNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  // Try to parse as a direct number first
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }

  // Try to evaluate as a safe mathematical expression
  const sanitized = value.trim();
  if (!/^[\d\s+\-*/().]+$/.test(sanitized)) {
    return null;
  }

  try {
    const result = evaluate(sanitized) as number;
    return typeof result === 'number' && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};
