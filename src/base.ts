import type { LineRequest, LineResult, Token } from "./models.js";
import { classifyIntrinsicToken, tokenize } from "./tokenizer.js";

/**
 * Tokenize and classify lines synchronously without Jev or a rendering system.
 * Identifiers remain `other` until the semantic pass resolves their role.
 */
export function highlightBaseLines(
  lines: LineRequest[],
  lang = "javascript"
): LineResult[] {
  return lines.map(({ line, lineNumber }) => {
    const tokens = tokenize(line, lang).map<Token>((rawToken) => ({
      ...rawToken,
      category: classifyIntrinsicToken(rawToken, lang) ?? "other",
      confidence: 1,
    }));

    for (const [index, token] of tokens.entries()) {
      if (token.category !== "other") continue;

      const previous = tokens[index - 1]?.text;
      const next = tokens[index + 1]?.text;
      const category = next === "("
        ? "function"
        : /^[A-Z]/.test(token.text)
          ? "type"
          : previous === "." || next === "."
            ? "variable"
            : undefined;

      if (category) {
        token.category = category;
        token.confidence = 0.5;
        token.provisional = true;
      }
    }

    return { lineNumber, tokens };
  });
}

export { classifyIntrinsicToken, tokenize } from "./tokenizer.js";
export type {
  Category,
  IntrinsicCategory,
  LineRequest,
  LineResult,
  RawToken,
  Token,
} from "./models.js";