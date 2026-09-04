"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

const CLIENT_SANITIZE_OPTIONS = {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base', 'form'],
    FORBID_ATTR: [
        'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
};

function extractBodyContent(html: string): string {
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : html;
}

interface SanitizedEmailBodyProps {
    html: string | null | undefined;
    /** Set false when the HTML has not been sanitized upstream (e.g. it came
     *  straight off /api/leads, a route this feature doesn't own) — the
     *  component will then sanitize it itself before rendering. Defaults to
     *  true since new routes owned by this feature sanitize server-side. */
    alreadySanitized?: boolean;
    fallback?: string;
    className?: string;
}

export function SanitizedEmailBody({ html, alreadySanitized = true, fallback = "No content available.", className }: SanitizedEmailBodyProps) {
    const safeHtml = useMemo(() => {
        if (!html) return null;
        const trimmed = String(html).trim();
        if (!trimmed) return null;
        if (alreadySanitized) return trimmed;

        const bodyContent = extractBodyContent(trimmed);
        const clean = DOMPurify.sanitize(bodyContent, CLIENT_SANITIZE_OPTIONS);
        const result = String(clean).trim();
        return result || null;
    }, [html, alreadySanitized]);

    if (!safeHtml) {
        return (
            <div className={`email-content-empty ${className || ''}`}>
                <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: 0 }}>{fallback}</p>
            </div>
        );
    }

    return (
        <div
            className={`email-content ${className || ''}`}
            style={{ overflowX: 'auto', maxWidth: '100%' }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
}
