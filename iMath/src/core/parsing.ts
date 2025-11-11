export const parseStrictNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  // Try to parse as a direct number first
  let num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }

  // Try to evaluate as a safe mathematical expression
  // Only allow numbers, operators, spaces, and parentheses
  const sanitized = value.trim();
  if (!/^[\d\s+\-*/().]+$/.test(sanitized)) {
    return null;
  }

  try {
    // Use Function constructor instead of eval for safer evaluation
    // This still evaluates the expression but in a more controlled way
    num = Function(`"use strict"; return (${sanitized})`)();
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
};