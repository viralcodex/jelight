import type { IntrinsicCategory, RawToken } from "./models.js";
import {
  BLOCK_COMMENT,
  KEYWORDS,
  LINE_COMMENT,
  NUMBER_LITERAL,
  OPERATOR,
  PUNCTUATION,
  STRING_LITERAL,
  TOKEN_TAIL,
} from "./constants.js";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Build a per-language token regex, comment patterns first (highest priority). */
function tokenRe(lang: string): RegExp {
  const parts: string[] = [];
  for (const marker of LINE_COMMENT[lang] ?? ["//"]) {
    parts.push(`${escape(marker)}[^\\n]*`);
  }
  if (BLOCK_COMMENT.has(lang)) parts.push(`/\\*[\\s\\S]*?(?:\\*/|$)`);
  if (lang === "html") parts.push(`<!--[\\s\\S]*?(?:-->|$)`);
  parts.push(TOKEN_TAIL);
  return new RegExp(parts.join("|"), "g");
}

/**
 * Split source into raw tokens, keeping character offsets so the UI can map
 * each classification back onto the exact substring. Whitespace is skipped.
 * Comments are captured as single tokens using the language's syntax, so Jev
 * classifies a whole comment (e.g. `// note`) as one `comment` token.
 */
export function tokenize(text: string, lang = "javascript"): RawToken[] {
  const re = tokenRe(lang);
  const tokens: RawToken[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const value = m[0];
    if (value.trim() === "") continue;
    tokens.push({ text: value, start: m.index, end: m.index + value.length });
  }
  return tokens;
}

/** Classify a token whose category is evident from its spelling and language. */
export function classifyIntrinsicToken(
  token: RawToken,
  lang: string
): IntrinsicCategory | undefined {
  const { text } = token;
  if (isComment(text, lang)) return "comment";
  if (STRING_LITERAL.test(text)) return "string";
  if (NUMBER_LITERAL.test(text)) return "number";
  if (KEYWORDS[lang]?.has(text)) return "keyword";
  if (PUNCTUATION.test(text)) return "punctuation";
  if (OPERATOR.test(text)) return "operator";
  return undefined;
}

function isComment(text: string, lang: string): boolean {
  return (LINE_COMMENT[lang] ?? ["//"]).some((marker) => text.startsWith(marker)) ||
    (BLOCK_COMMENT.has(lang) && text.startsWith("/*")) ||
    (lang === "html" && text.startsWith("<!--"));
}
