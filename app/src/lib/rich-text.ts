/** True for RichEditor output with no visible content (e.g. "<p></p>"), not just "". */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').trim().length === 0;
}

const LOOKS_LIKE_HTML = /<[a-z][\s\S]*>/i;

/**
 * Content written before RichEditor existed is plain text, not HTML — this
 * repo has no markdown/HTML pipeline anywhere until now. Rendering it
 * directly as HTML would drop paragraph breaks and could misrender any
 * stray "<" or "&". If a stored value already looks like RichEditor's own
 * output, pass it through; otherwise escape it and turn blank lines into
 * paragraphs so older content still reads correctly.
 */
export function toDisplayHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  if (LOOKS_LIKE_HTML.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Matches a whole <mark class="tm-hl" ...>...</mark> or <span class="tm-circle" ...>...</span>
// produced by RichEditor — both the plain style marks and the ones that also carry a margin note.
const MARK_RE = /<(mark|span)\b([^>]*)>([\s\S]*?)<\/\1>/g;

function attrValue(attrString: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrString);
  return m ? m[1] : null;
}

/**
 * Converts admin-authored rich HTML (from RichEditor) into email-safe HTML:
 * inline styles instead of classes (Outlook/Gmail strip <style> blocks), and
 * every margin-annotated span gets a numbered superscript reference plus a
 * visible "Margin notes" list at the end — since email has no hover/click
 * rail, the note text must be readable without any interaction.
 */
export function toEmailSafeHtml(html: string): string {
  const footnotes: string[] = [];
  let n = 0;

  const body = html.replace(MARK_RE, (full, tag, attrs, inner) => {
    const cls = attrValue(attrs, 'class') || '';
    const isHighlight = /\btm-hl\b/.test(cls);
    const isCircle = /\btm-circle\b/.test(cls);
    if (!isHighlight && !isCircle) return full;

    const style = isCircle
      ? 'border:2px solid #A8593C;border-radius:999px;padding:0 8px;'
      : 'background:#F0E4CD;border-bottom:2px solid #B68A47;padding:0 1px;';
    const note = attrValue(attrs, 'data-note');
    if (!note) return `<span style="${style}">${inner}</span>`;

    n += 1;
    footnotes.push(note);
    return `<span style="${style}">${inner}</span><sup style="color:#A8593C;font-weight:600;">[${n}]</sup>`;
  });

  if (footnotes.length === 0) return body;

  const items = footnotes
    .map(
      (note, i) =>
        `<p style="margin:0 0 10px;font-size:14px;color:#2C2822;"><strong style="color:#A8593C;">[${i + 1}]</strong> ${escapeHtml(note)}</p>`
    )
    .join('');
  return `${body}<div style="margin-top:28px;padding-top:18px;border-top:1px solid #DBD3C4;"><p style="margin:0 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6B5F54;">Margin notes</p>${items}</div>`;
}
