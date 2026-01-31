/**
 * Text Sanitization Utilities
 *
 * Converts HTML content from ProductBoard API responses to clean plain text
 * suitable for agent consumption.
 */

/**
 * Common HTML entity mappings
 */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&mdash;': '\u2014', // —
  '&ndash;': '\u2013', // –
  '&hellip;': '\u2026', // …
  '&bull;': '\u2022', // •
  '&copy;': '\u00A9', // ©
  '&reg;': '\u00AE', // ®
  '&trade;': '\u2122', // ™
  '&lsquo;': '\u2018', // '
  '&rsquo;': '\u2019', // '
  '&ldquo;': '\u201C', // "
  '&rdquo;': '\u201D', // "
};

/**
 * Decode HTML entities to their character equivalents
 */
function decodeEntities(text: string): string {
  // Replace named entities
  let result = text.replace(/&[a-zA-Z]+;/g, (match) => HTML_ENTITIES[match] || match);

  // Replace decimal numeric entities (&#123;)
  result = result.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  );

  // Replace hex numeric entities (&#x1F;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}

/**
 * Strip HTML tags and convert to plain text
 *
 * Handles:
 * - Block elements (p, div, br) → newlines
 * - List items → bullet points
 * - Inline elements → stripped
 * - HTML entities → decoded
 * - Whitespace → normalized
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';

  let text = html;

  // Convert block elements to appropriate spacing
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeEntities(text);

  // Normalize whitespace: collapse multiple spaces/tabs to single space
  text = text.replace(/[ \t]+/g, ' ');

  // Normalize newlines: collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace from each line and overall
  text = text.split('\n').map(line => line.trim()).join('\n').trim();

  return text;
}

/**
 * Truncate text at word boundary with ellipsis
 *
 * - Returns original if within limit
 * - Finds last space within threshold (70% of max)
 * - Adds ellipsis character (…) instead of three dots
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If we find a space in the last 30% of the string, break there
  // Otherwise just truncate at maxLength
  const breakPoint = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;

  return truncated.substring(0, breakPoint).trimEnd() + '\u2026';
}

/**
 * Clean HTML content and truncate in one step
 *
 * This is the main function to use for sanitizing ProductBoard API responses.
 * Strips HTML, decodes entities, normalizes whitespace, and truncates at word boundary.
 *
 * @param html - Raw HTML content from API
 * @param maxLength - Maximum length (default: 200)
 * @returns Clean plain text, truncated with ellipsis if needed
 */
export function cleanText(html: string | undefined | null, maxLength = 200): string {
  return truncate(stripHtml(html), maxLength);
}
