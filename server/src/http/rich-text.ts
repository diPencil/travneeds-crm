import sanitizeHtml from 'sanitize-html';

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
    },
    allowedStyles: { '*': { 'text-align': [/^(left|right|center)$/] } },
    allowedSchemes: ['https', 'mailto'],
    allowProtocolRelative: false,
  });
}
