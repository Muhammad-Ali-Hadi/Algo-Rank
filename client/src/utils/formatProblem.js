/**
 * Clean and format raw Codeforces problem description HTML for proper display.
 * - Replaces $$$...$$$  with \(...\) for MathJax inline math
 * - Replaces $$...$$ with \[...\] for MathJax block math
 * - Converts bare text paragraphs to proper <p> tags
 * - Strips Codeforces-specific wrapper classes that conflict with our styles
 */
export function formatProblemDescription(raw) {
  if (!raw) return '';

  let html = raw;

  // 1. Convert $$$...$$$  (Codeforces inline math) → MathJax inline \(...\)
  html = html.replace(/\$\$\$(.+?)\$\$\$/gs, '\\($1\\)');

  // 2. Convert $$...$$ (block math) → MathJax display \[...\]
  html = html.replace(/\$\$(.+?)\$\$/gs, '\\[$1\\]');

  // 3. Wrap section titles in styled headings
  html = html.replace(
    /<div class="section-title"[^>]*>(.*?)<\/div>/gs,
    '<h3 class="problem-section-title">$1</h3>'
  );

  // 4. Remove outer Codeforces wrapper divs that break layout
  html = html.replace(/<div class="problem-statement"[^>]*>/g, '');
  html = html.replace(/<\/div>\s*$/g, '');

  // 5. Replace double newlines with paragraph breaks in plain text areas
  // Already wrapped in divs, so this is mostly for safety
  html = html.replace(/\n{2,}/g, '</p><p>');

  return html;
}

/**
 * Trigger MathJax re-typesetting after content is rendered.
 */
export function retypeset() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    setTimeout(() => {
      window.MathJax.typesetPromise().catch(err => console.error('MathJax error:', err));
    }, 150);
  }
}
