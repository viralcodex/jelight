/** Semantic categories available to the classifier and UI. */
export type Category =
  | "keyword"
  | "type"
  | "function"
  | "variable"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "punctuation"
  | "other";

/** A raw token with offsets relative to the text it was extracted from. */
export interface RawToken {
  text: string;
  start: number;
  end: number;
}

/** A classified token: a raw token plus Jev's category and confidence. */
export interface Token extends RawToken {
  category: Category;
  /** Selected-option probability in [0, 1], when the provider supplies one. */
  confidence: number;
  /** True when local syntax inferred the role pending semantic classification. */
  provisional?: boolean;
}

/** A category that syntax determines without semantic model context. */
export type IntrinsicCategory = Exclude<
  Category,
  "type" | "function" | "variable" | "other"
>;

/** A line the client wants classified, with its index in the document. */
export interface LineRequest {
  line: string;
  lineNumber: number;
}

/** Classified tokens for one requested line, keyed by that line's number. */
export interface LineResult {
  lineNumber: number;
  tokens: Token[];
}

/** A choice question accepted by TypeSafe's evaluation API. */
export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Readonly<Record<Category, string>>;
}

/** The answer shape consumed from a TypeSafe choice evaluation. */
export interface EvaluationAnswer {
  choice: Category;
  probabilities?: Record<string, number>;
}

/** One unique identifier classification queued for a batched evaluation. */
export interface EvaluationEntry {
  tokens: Token[];
  key: string;
  question: ChoiceQuestion;
}

/** Input passed to a provider adapter for one batched evaluation call. */
export interface EvaluateInput {
  /** Shared context: the whole document and its language. */
  state: { language: string; code: string };
  /** Questions to answer, keyed by a stable id the caller reads back. */
  questions: Record<string, ChoiceQuestion>;
}

/**
 * Normalized result of one evaluation, independent of provider.
 *
 * Providers disagree on where selection confidence lives: the direct TypeSafe
 * API puts it on each answer, while the Vercel Gateway returns it in a separate
 * `providerMetadata.typesafe.confidence` map. Adapters MAY surface a separate
 * per-key `confidence` map here; the library also reads `answer.probabilities`.
 */
export interface EvaluateResult {
  answers: Record<string, EvaluationAnswer>;
  confidence?: Record<string, number>;
}

/**
 * The provider seam. A consumer injects one of these so the library owns all
 * highlighting logic (chunking, dedup, retries, confidence normalization) while
 * staying transport- and vendor-agnostic.
 */
export type EvaluateFn = (input: EvaluateInput) => Promise<EvaluateResult>;

/** Tuning + provider injection for {@link highlightLines}. */
export interface HighlightOptions {
  /** Provider adapter that performs one batched evaluation call. */
  evaluate: EvaluateFn;
  /**
   * How much of the classification Jev performs:
   * - `"assist"` (default): the local base pass classifies keywords, literals,
   *   comments, operators, and punctuation, and Jev only resolves the
   *   ambiguous identifiers left as `other`/provisional. Fast and cheap.
   * - `"full"`: Jev classifies **every** non-whitespace token, ignoring the
   *   local heuristics entirely. Slower and more expensive, but a pure
   *   demonstration of the model doing all the work.
   */
  mode?: "assist" | "full";
  /** Category label to criteria map. Defaults to the built-in {@link CATEGORIES}. */
  categories?: Readonly<Record<Category, string>>;
  /** Max Choice questions per evaluate call. Default 24. */
  questionsPerCall?: number;
  /** Max evaluate calls in flight at once. Default 4. */
  maxConcurrentCalls?: number;
  /** Per-chunk retry attempts before tokens fall back to "other". Default 2. */
  chunkRetries?: number;
  /** Overall cap on tokens classified per request. Default 400. */
  maxTokens?: number;
}