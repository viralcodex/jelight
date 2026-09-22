/**
 * jelight — semantic code highlighting powered by TypeSafe's Jev model.
 *
 * This is the zero-dependency core. It owns all highlighting logic (tokenizing,
 * local classification, dedup, chunking, retries, confidence normalization) but
 * NOT the transport: inject a provider via {@link HighlightOptions.evaluate}.
 * Ready-made adapters live at `jelight/gateway` and `jelight/typesafe`.
 */
export { tokenize, classifyIntrinsicToken } from "./tokenizer.js";
export { highlightBaseLines } from "./base.js";
export { highlightLines } from "./highlighter.js";
export { CATEGORIES } from "./categories.js";
export { LINE_COMMENT, SUPPORTED_LANGUAGES } from "./constants.js";

export type {
  Category,
  IntrinsicCategory,
  RawToken,
  Token,
  LineRequest,
  LineResult,
  ChoiceQuestion,
  EvaluationAnswer,
  EvaluationEntry,
  EvaluateInput,
  EvaluateResult,
  EvaluateFn,
  HighlightOptions,
} from "./models.js";
