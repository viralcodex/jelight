import {
  type ChoiceQuestion,
  type EvaluateFn,
  type EvaluationAnswer,
  type EvaluationEntry,
  type HighlightOptions,
  type LineRequest,
  type LineResult,
  type Token,
} from "./models.js";
import { CATEGORIES } from "./categories.js";
import { highlightBaseLines } from "./base.js";

/** Defaults for {@link HighlightOptions}; kept in one place for the docs. */
const DEFAULTS = {
  mode: "assist",
  categories: CATEGORIES,
  questionsPerCall: 24,
  maxConcurrentCalls: 4,
  chunkRetries: 2,
  maxTokens: 400,
} as const;

/** Bound concurrent evaluate calls with a simple FIFO slot queue. */
function createCallGate(maxConcurrent: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function withSlot<T>(call: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      const start = () => {
        active++;
        resolve();
      };
      if (active < maxConcurrent) start();
      else queue.push(start);
    });
    try {
      return await call();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

/**
 * Read a selected-option probability for a Choice answer. Prefer the answer's
 * own distribution; fall back to a provider-supplied confidence statistic.
 * Returns 1 when neither is present so the UI treats it as fully confident.
 */
function readConfidence(
  answer: EvaluationAnswer,
  providerConfidence: number | undefined
): number {
  const p = answer.probabilities?.[answer.choice];
  if (typeof p === "number") return p;
  if (typeof providerConfidence === "number") return providerConfidence;
  return 1;
}

/**
 * Run ONE evaluate call for a chunk of questions and write the resulting
 * category + confidence back onto every matching token (mutated in place).
 *
 * Providers can intermittently fail (e.g. a Gateway 500), so each chunk is
 * retried with backoff. If it still fails, the chunk's tokens are left as their
 * default ("other") rather than failing the whole request — the client can
 * re-request those lines later.
 */
async function classifyChunk(
  chunk: EvaluationEntry[],
  fullCode: string,
  lang: string,
  evaluate: EvaluateFn,
  withSlot: <T>(call: () => Promise<T>) => Promise<T>,
  chunkRetries: number
): Promise<void> {
  const questions: Record<string, ChoiceQuestion> = {};
  for (const e of chunk) questions[e.key] = e.question;

  for (let attempt = 0; attempt <= chunkRetries; attempt++) {
    try {
      const result = await withSlot(() =>
        evaluate({ state: { language: lang, code: fullCode }, questions })
      );

      const confidences = result.confidence ?? {};

      for (const e of chunk) {
        const answer = result.answers[e.key];
        const confidence = readConfidence(answer, confidences[e.key]);
        for (const token of e.tokens) {
          token.category = answer.choice;
          token.confidence = confidence;
          token.provisional = false;
        }
      }
      return;
    } catch (err) {
      if (attempt === chunkRetries) {
        console.error(
          `Jev chunk failed after ${attempt + 1} attempts, leaving ` +
            `${chunk.length} token(s) unclassified:`,
          err instanceof Error ? err.message : err
        );
        return; // graceful degradation: keep default "other" tokens
      }
      // Exponential-ish backoff before retrying this chunk.
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
}

/**
 * Classify the tokens of many lines with an injected evaluator. The whole
 * document is passed as shared state (so tokens are judged with full scope).
 *
 * In the default `"assist"` mode, tokens with an unambiguous lexical role are
 * classified locally and the model sees identifiers only. In `"full"` mode the
 * local heuristics are ignored and Jev classifies every non-whitespace token —
 * a pure demonstration of the model doing all the work.
 *
 * Providers reject oversized batches and large bursts of concurrent calls, so
 * questions are split into chunks of `questionsPerCall` and enter a queue with
 * bounded concurrency, each chunk retried independently. A chunk that keeps
 * failing degrades gracefully (its tokens keep their base classification)
 * instead of failing the whole paste.
 */
export async function highlightLines(
  fullCode: string,
  lines: LineRequest[],
  lang: string,
  options: HighlightOptions
): Promise<LineResult[]> {
  const { evaluate } = options;
  const mode = options.mode ?? DEFAULTS.mode;
  const categories = options.categories ?? DEFAULTS.categories;
  const questionsPerCall = options.questionsPerCall ?? DEFAULTS.questionsPerCall;
  const chunkRetries = options.chunkRetries ?? DEFAULTS.chunkRetries;
  const maxTokens = options.maxTokens ?? DEFAULTS.maxTokens;
  const maxConcurrentCalls =
    options.maxConcurrentCalls ?? DEFAULTS.maxConcurrentCalls;

  const noun = mode === "full" ? "token" : "identifier";
  const choiceQuestion = (instructions: string): ChoiceQuestion => ({
    type: "choice" as const,
    instructions,
    criteria: categories,
  });

  // In "assist" mode Jev only resolves ambiguous identifiers; in "full" mode it
  // classifies every token that carries visible text (whitespace is skipped).
  const needsEvaluation = (token: Token): boolean =>
    mode === "full"
      ? token.text.trim().length > 0
      : token.category === "other" || token.provisional === true;

  const baseResults = highlightBaseLines(lines, lang);

  // Deduplicate tokens only when their immediate syntax also matches.
  const entries: EvaluationEntry[] = [];
  const entriesByContext = new Map<string, EvaluationEntry>();

  let budget = maxTokens;
  for (const { lineNumber, tokens } of baseResults) {
    for (const [index, token] of tokens.entries()) {
      if (!needsEvaluation(token)) continue;

      const contextKey = [
        token.text,
        token.category,
        tokens[index - 1]?.text,
        tokens[index + 1]?.text,
      ].join("\0");
      const existingEntry = entriesByContext.get(contextKey);
      if (existingEntry) {
        existingEntry.tokens.push(token);
        continue;
      }
      if (budget <= 0) continue;
      budget--;
      const entry: EvaluationEntry = {
        tokens: [token],
        key: `l${lineNumber}t${index}`,
        question: choiceQuestion(
          `In this ${lang} code, classify the ${noun} "${token.text}" on line ` +
            `${lineNumber + 1}. Judge its role from the full program context.`
        ),
      };
      entries.push(entry);
      entriesByContext.set(contextKey, entry);
    }
  }

  // Nothing needs a semantic decision. Return local classifications immediately.
  if (entries.length === 0) {
    return baseResults;
  }

  // Split into small chunks and classify them with bounded concurrency.
  const withSlot = createCallGate(maxConcurrentCalls);
  const chunks: EvaluationEntry[][] = [];
  for (let i = 0; i < entries.length; i += questionsPerCall) {
    chunks.push(entries.slice(i, i + questionsPerCall));
  }
  await Promise.all(
    chunks.map((chunk) =>
      classifyChunk(chunk, fullCode, lang, evaluate, withSlot, chunkRetries)
    )
  );

  return baseResults;
}

export type { LineRequest, LineResult } from "./models.js";
