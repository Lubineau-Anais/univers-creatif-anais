import DOMPurify from 'dompurify'

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 's', 'br', 'p', 'span', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel'],
    RETURN_TRUSTED_TYPE: false,
  }) as string
}
