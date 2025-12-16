/**
 * Extracts specified (key = value) pairs from a GRF filename string
 * using only basic string operations (no regex).
 *
 * @example
 * ```ts
 * const filename = 'Figure 2-154.  Scaled gas impulse  (W/Vf = 0.002, i/W^(1/3) = 100)';
 * const filterKeys = ['W/Vf', 'i/W^(1/3)'];
 * const result = extractFiltersFromFilename(filename, filterKeys);
 * // Returns: {'W/Vf': 0.002, 'i/W^(1/3)': 100.0}
 * ```
 *
 * @param filename - The filename string to parse
 * @param filterKeys - Array of keys to extract from the filename
 * @returns Object containing extracted key-value pairs
 */
export function extractFiltersFromFilename(filename: string, filterKeys: string[]): Record<string, number | string> {
  // Replace newlines and multiple spaces so we can reliably search by text
  let cleanName = filename.replace(/\n/g, ' ').trim();

  // Collapse any repeated spaces
  cleanName = cleanName.split(/\s+/).join(' ');

  const filters: Record<string, number | string> = {};

  for (const key of filterKeys) {
    // Find where the key first appears
    const pos = cleanName.indexOf(key);
    if (pos === -1) {
      continue; // Key not found → skip to next key
    }

    // Find the '=' sign that follows this key
    const eqPos = cleanName.indexOf('=', pos);
    if (eqPos === -1) {
      continue; // '=' missing → skip
    }

    const afterEq = cleanName.slice(eqPos + 1).trim();

    // Determine where the numeric value ends
    let endPos = afterEq.length;
    for (const sep of [',', ')']) {
      const sepIndex = afterEq.indexOf(sep);
      if (sepIndex !== -1) {
        endPos = Math.min(endPos, sepIndex);
      }
    }

    // Extract the raw value text
    const valueStr = afterEq.slice(0, endPos).trim();

    // Try to parse as number
    const numValue = parseFloat(valueStr);
    const value = isNaN(numValue) ? valueStr : numValue;

    // Store the result
    filters[key] = value;
  }

  return filters;
}

/**
 * Print a separator line for console output
 */
export function breakLine(): void {
  console.log('-'.repeat(60));
}

/**
 * Print a new line to console
 */
export function newLine(): void {
  console.log('\n');
}
