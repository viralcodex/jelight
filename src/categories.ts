import type { Category } from "./models.js";

/**
 * Semantic categories Jev chooses from for each token. This is library data,
 * not deployment config: keys are the machine labels (also used as CSS class
 * names in the UI) and values are the human-readable criteria sent to the
 * model. Consumers may override these via {@link HighlightOptions.categories}.
 */
export const CATEGORIES = {
  keyword: "Language keyword (if, for, return, def, class, import, etc.)",
  type: "A type name, class name, or interface (int, String, MyClass)",
  function: "A function or method name being defined or called",
  variable: "A variable, parameter, or identifier holding a value",
  string: "String or character literal content, including quotes",
  number: "A numeric literal (integer, float, hex)",
  comment: "A code comment, including its markers and text (// ... , # ... , /* ... */)",
  operator: "An operator such as + - = == => && | .",
  punctuation: "Brackets, parentheses, commas, semicolons, braces",
  other: "Whitespace or anything that fits no other category",
} as const satisfies Readonly<Record<Category, string>>;
