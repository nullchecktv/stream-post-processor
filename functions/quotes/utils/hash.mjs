/**
 * CRC32 hash implementation for deterministic pattern selection
 * @param {string} text - Quote text to hash
 * @returns {number} - Positive integer hash value
 */
export function hashQuoteText(text) {
  let crc = 0xFFFFFFFF;
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const byte = normalized.charCodeAt(i);
    crc = crc ^ byte;

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Get pattern index from quote text
 * @param {string} text - Quote text
 * @returns {number} - Pattern index (0-49)
 */
export function getPatternIndex(text) {
  return hashQuoteText(text) % 50;
}
