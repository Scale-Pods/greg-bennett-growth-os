import sanitizeHtml from 'sanitize-html';

// sanitize-html is pure JS (no jsdom/native deps), unlike isomorphic-dompurify
// which pulls in jsdom and reliably crashes Vercel's serverless Node runtime
// at module-load time (every request to a route importing it returns a
// platform-level 500 before the route handler ever runs).
const FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base', 'form'];
const BLOCKED_EVENT_ATTRS = [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
];

const ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags.filter((tag) => !FORBIDDEN_TAGS.includes(tag));

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
    const clean = sanitizeHtml(bodyContent, {
        disallowedTagsMode: 'discard',
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: false, // keep all attributes on allowed tags; event handlers stripped below via exclusiveFilter
        allowedSchemes: ['http', 'https', 'mailto'],
        allowProtocolRelative: false,
        exclusiveFilter: (frame) =>
            BLOCKED_EVENT_ATTRS.some((attr) => Object.prototype.hasOwnProperty.call(frame.attribs || {}, attr)),
    });

    const result = String(clean).trim();
    return result || null;
}
