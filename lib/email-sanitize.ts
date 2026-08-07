import DOMPurify from 'isomorphic-dompurify';

const SANITIZE_OPTIONS = {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base', 'form'],
    FORBID_ATTR: [
        'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
};

/** Pulls the inner content of a <body>...</body> block out of a full HTML
 *  document string. Falls back to the raw string if no body tag is found
 *  (some rows may already be bare HTML fragments, not a full document). */
function extractBodyContent(html: string): string {
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : html;
}

/** Strips the outreach system's outer wrapper (a styled <div> containing a
 *  full <html><body>...</body></html> document) down to just the inner body
 *  content, then sanitizes it, blocking scripts/iframes/embeds/style tags,
 *  on-event attribute handlers, and non-http(s)/mailto URLs. */
export function sanitizeEmailHtml(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;

    const bodyContent = extractBodyContent(trimmed);
    const clean = DOMPurify.sanitize(bodyContent, SANITIZE_OPTIONS);
    const result = String(clean).trim();
    return result || null;
}
