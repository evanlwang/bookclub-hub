// @spec DISC-BE-002, DISC-BE-003
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Configure marked: GFM-flavored, no raw HTML in source markdown, preserve breaks.
marked.setOptions({ gfm: true, breaks: true });

/**
 * Render thread/comment body Markdown to a sanitized HTML string.
 *
 * @spec DISC-BE-002 — CommonMark via `marked`.
 * @spec DISC-BE-003 — DOMPurify strips any tag/attribute that isn't on the
 *       allowed Markdown-output set, defending against XSS even if `marked`
 *       were ever to emit something unexpected.
 */
export function renderBodyHtml(source: string): string {
  if (!source) return "";
  const rawHtml = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "code", "pre", "blockquote",
      "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
    ],
    ALLOWED_ATTR: ["href", "title", "rel", "target"],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
