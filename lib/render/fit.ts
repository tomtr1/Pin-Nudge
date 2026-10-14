/**
 * Approximate text fitting. Satori lays out text but cannot shrink it to fit,
 * so we estimate wrapped line counts from average glyph widths and pick the
 * largest font size that fits in maxLines. Templates also apply lineClamp as a
 * hard guarantee that text never overflows its box.
 */
export function estimateLines(text: string, fontSize: number, maxWidth: number, widthFactor: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const charWidth = fontSize * widthFactor;
  const spaceWidth = charWidth * 0.55;
  let lines = 1;
  let current = 0;
  for (const word of words) {
    const w = word.length * charWidth;
    if (current === 0) {
      current = w;
      // A single word wider than the line wraps by character.
      if (w > maxWidth) {
        lines += Math.ceil(w / maxWidth) - 1;
        current = w % maxWidth;
      }
    } else if (current + spaceWidth + w <= maxWidth) {
      current += spaceWidth + w;
    } else {
      lines++;
      current = w;
    }
  }
  return lines;
}

export function fitFontSize(
  text: string,
  opts: { maxWidth: number; maxLines: number; max: number; min: number; widthFactor: number; step?: number },
): number {
  const step = opts.step ?? 2;
  for (let size = opts.max; size > opts.min; size -= step) {
    if (estimateLines(text, size, opts.maxWidth, opts.widthFactor) <= opts.maxLines) return size;
  }
  return opts.min;
}
