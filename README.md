# jelight

Semantic code highlighting powered by **Jev** (TypeSafe's System One model).

Instead of regex/grammar rules, jelight asks Jev to classify each token by its **semantic
role** in the surrounding code.
This package is the **provider-agnostic core**: only houses the tokenizing, local classification, dedup, chunking, retries & confidence normalization.
You inject a provider via `evaluate` and ready-made adapters live behind subpath exports.

> Looking for the runnable editor demo (Express server + browser client)? That lives in the
> separate [`jelight-app`](https://github.com/viralcodex/jelight-app) repo.

## Install

```bash
npm install github:viralcodex/jelight

OR 

# pin to a released tag
npm install github:viralcodex/jelight#v0.1.0
```

> The `ai` package is an **optional peer dependency** — install it only if you use
> `jelight/gateway`.

## Usage

```ts
import { highlightLines, highlightBaseLines } from "jelight";
import { createGatewayEvaluate } from "jelight/gateway";   // uses VERCEL AI_GATEWAY_API_KEY
// import { createTypeSafeEvaluate } from "jelight/typesafe"; // uses TYPESAFE_API_KEY

const evaluate = createGatewayEvaluate({ model: "typesafe-ai/jev" });

const lines = [{ line: "const user = getUser(42);", lineNumber: 0 }];
const results = await highlightLines("const user = getUser(42);", lines, "javascript", {
  evaluate,
  // mode: "assist" (default) or "full"
  // optional tuning: questionsPerCall, maxConcurrentCalls, chunkRetries, maxTokens, categories to prevent 429 & slow reponses for large code blocks
});
```

## How it works

- `highlightBaseLines()` runs the synchronous classifier (comments, literals, operators,
  punctuation, keywords, plus provisional identifier roles) with **no model calls**, so base colors come back fast as you're typing.

- `highlightLines()` runs the same base pass and then asks Jev **one `choice` question per
  identifier** via the injected `evaluate` to resolve semantic roles.

- Each token is judged against the **full document** as shared state, so identifiers are
  classified with real scope context rather than in isolation.

- Answers carry a **confidence**, normalized into a per-key map.

## Modes

The `mode` option controls how much Jev does:

| Mode                 | What Jev classifies                                  | Cost |
| -------------------- | ---------------------------------------------------- | ---- |
| `"assist"` (default) | Only the ambiguous identifiers the local pass leaves | Low  |
| `"full"`             | **Every** non-whitespace token, ignoring heuristics  | High |

`"full"` mode is a pure demonstration of the model doing all the work which can take significantly more time to complete; especially pasting large code blocks at once.

## Providers

We've two providers that implement the same `EvaluateFn` seam, normalizing confidence into a per-key map regardless of where the provider reports it:

| Import             | Backend             | Auth env             | Confidence source                          |
| ------------------ | ------------------- | -------------------- | ------------------------------------------ |
| `jelight/gateway`  | Vercel AI Gateway   | `AI_GATEWAY_API_KEY` | `providerMetadata.typesafe.confidence` map |
| `jelight/typesafe` | Direct TypeSafe API | `TYPESAFE_API_KEY`   | `confidence` on each answer                |


## Structure

| Path                      | Responsibility                                                       |
| ------------------------- | -------------------------------------------------------------------- |
| `src/index.ts`            | Public library entry                    |
| `src/tokenizer.ts`        | Token types with the `tokenize()` splitter                            |
| `src/base.ts`             | `highlightBaseLines()`: synchronous lexical with provisional roles     |
| `src/highlighter.ts`      | `highlightLines()`: batched evaluation through an injected `EvaluateFn` |
| `src/categories.ts`       | `CATEGORIES`: the default label to criteria map                        |
| `src/adapters/gateway.ts` | `createGatewayEvaluate()`: Vercel AI Gateway provider (`ai`)        
| `src/adapters/typesafe.ts`| `createTypeSafeEvaluate()`: TypeSafe API (fetch)    |

## Categories

Tokens are classified into: `keyword`, `type`, `function`, `variable`, `string`, `number`,
`comment`, `operator`, `punctuation`, `other`.
Edit the `CATEGORIES` map in `src/categories.ts` (or pass a `categories` override to `highlightLines`)

## Limitations (Really, Seriously)

- **Latency & cost:** semantic identifier upgrades use a provider call; request-local
  deduplication bounds that work. The `maxTokens` option (default 400) bounds tokens
  classified per call.
- **Multi-line constructs:** each line is grouped independently, so block comments or
  multi-line strings spanning several lines may be misjudged.


## Disclaimer
not something to be used in production, this is just a PoC to play with Jev on an absurd usecase.

## License
MIT
