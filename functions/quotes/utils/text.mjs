/**
 * Calculate optimal font size for quote text
 * @param {string} text - Quote text
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {number} - Font size in pixels
 */
export function calculateFontSize(text, width, height) {
  const length = text.length;
  const minSize = 48;
  const maxSize = 96;

  let size;
  if (length < 50) {
    size = maxSize;
  } else if (length < 100) {
    size = 84;
  } else if (length < 150) {
    size = 72;
  } else if (length < 200) {
    size = 60;
  } else {
    size = minSize;
  }

  if (height > width) {
    size = Math.max(minSize, size * 0.85);
  }

  return size;
}

/**
 * Wrap text to fit within max width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum line width
 * @returns {string[]} - Array of text lines
 */
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate total text block height
 * @param {number} fontSize - Font size in pixels
 * @param {number} lineCount - Number of text lines
 * @returns {number} - Total height in pixels
 */
export function calculateTextHeight(fontSize, lineCount) {
  const lineHeight = fontSize * 1.3;
  return lineCount * lineHeight;
}
