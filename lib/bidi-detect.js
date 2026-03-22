// lib/bidi-detect.js
// Pure ES module — no DOM, no Chrome APIs. Importable by Jest in Node/jsdom.

// U+0590-05FF: Hebrew block (letters, nikkud, cantillation, punctuation)
// U+FB1D-FB4F: Hebrew Presentation Forms (legacy word processor output)
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

// Hebrew letters and presentation forms used in 30% threshold calculation
// U+05D0-05EA: Hebrew letters (alef to tav)
// U+05F0-05F4: Hebrew ligatures/punctuation letters
// U+FB1D-FB4F: Presentation Forms
const HEBREW_LETTER_RE = /[\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4F]/;

// Characters to skip in first-strong-character pass (neutrals):
// \s: whitespace (space, tab, newline — BiDi neutrals, must not trigger ltr return)
// \d: ASCII digits; ASCII punctuation ranges; surrogate pairs (emoji halves)
const SKIP_RE = /[\s\d\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]|[\uD800-\uDFFF]/;

export function detectDirection(text) {
  const chars = [...text]; // spread splits at code-point boundaries (surrogate safety)

  // Pass 1: first-strong-character (Hebrew only short-circuits)
  // If the first strong character is Hebrew → RTL immediately.
  // If the first strong character is LTR → fall through to threshold (mixed content).
  for (const ch of chars) {
    if (SKIP_RE.test(ch)) continue;
    if (HEBREW_RE.test(ch)) return 'rtl';
    break; // first strong is LTR — don't short-circuit, check threshold next
  }

  // Pass 2: 30% Hebrew letter threshold
  // Handles mixed-content like "Hi שלום world" (36% Hebrew → rtl)
  // and near-pure-LTR like "Hello world ... א" (4% Hebrew → ltr)
  const letterCount = chars.filter(ch => /\p{L}/u.test(ch)).length;
  if (letterCount === 0) return 'ltr';
  const hebrewCount = chars.filter(ch => HEBREW_LETTER_RE.test(ch)).length;
  return hebrewCount / letterCount >= 0.30 ? 'rtl' : 'ltr';
}

export function isExemptElement(el) {
  const tag = el.tagName?.toLowerCase();
  if (['code', 'pre', 'kbd', 'samp'].includes(tag)) return true;
  if (el.matches?.('.katex, .math, [class*="math"], [class*="latex"]')) return true;
  if (el.closest?.('.katex, .math, pre, code')) return true;
  const text = el.textContent?.trim() ?? '';
  if (/^(https?|ftp|file):\/\//i.test(text)) return true;
  if (/^\/[a-z0-9._\-/]+$/i.test(text)) return true;
  return false;
}

export function getFirstSubstantiveText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) return text;
  }
  return el.textContent?.trim() ?? '';
}
