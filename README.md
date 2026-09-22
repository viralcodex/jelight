# jelight

Semantic code highlighting powered by **Jev** (TypeSafe's System One model).

Instead of regex/grammar rules, jelight asks Jev to classify each token by its **semantic
role** in the surrounding code — keywords, types, functions, variables, strings, and more.
This package is the **provider-agnostic core**: it owns tokenizing, local classification,
dedup, chunking, retries, and confidence normalization, but not the network call. You inject
a provider via `evaluate`, and ready-made adapters live behind subpath exports.

> Looking for the runnable editor demo (Express server + browser client)? That lives in the
> separate [`jelight-app`](https://github.com/viralcodex/jelight-app) repo.

## Install

jelight is distributed straight from GitHub — no npm registry involved.

```bash
# latest from the default branch
npm install github:viralcodex/jelight

# pin to a released tag (recommended)
npm install github:viralcodex/jelight#v0.1.0
```

pnpm and yarn understand the same `github:` shorthand. On install, the `prepare` hook
compiles TypeScript to `dist/`, so no separate build step is needed.

No package manager at all? Because the build output is plain ESM, you can import it directly
from a CDN that serves GitHub (use a build-on-demand CDN like esm.sh, or a tag with `dist/`
committed):

```js
import { highlightLines } from "https://esm.sh/gh/viralcodex/jelight";
```

> The `ai` package is an **optional peer dependency** — install it only if you use
> `jelight/gateway`.

## Usage

```ts
import { highlightLines, highlightBaseLines } from "jelight";
import { createGatewayEvaluate } from "jelight/gateway";   // uses AI_GATEWAY_API_KEY
// import { createTypeSafeEvaluate } from "jelight/typesafe"; // uses TYPESAFE_API_KEY

const evaluate = createGatewayEvaluate({ model: "typesafe-ai/jev" });

const lines = [{ line: "const user = getUser(42);", lineNumber: 0 }];
const results = await highlightLines("const user = getUser(42);", lines, "javascript", {
  evaluate,
  // mode: "assist" (default) or "full"
  // optional tuning: questionsPerCall, maxConcurrentCalls, chunkRetries, maxTokens, categories
});
```

`highlightBaseLines()` has no model, DOM, or editor dependency and returns lexical colors
immediately. Completed member and call expressions receive low-confidence provisional
`type`, `variable`, or `function` roles; other identifiers remain `other`.

## How it works

- `highlightBaseLines()` runs the synchronous classifier (comments, literals, operators,
  punctuation, keywords, plus provisional identifier roles) with **no model calls**, so base
  colors come back fast.
- `highlightLines()` runs the same base pass and then asks Jev **one `choice` question per
  identifier** via the injected `evaluate` to resolve semantic roles.
- Each token is judged against the **full document** as shared state, so identifiers are
  classified with real scope context — not in isolation.
- Answers carry a **confidence**, normalized into a per-key map regardless of provider.

## Modes

The `mode` option controls how much Jev does:

| Mode                 | What Jev classifies                                  | Cost |
| -------------------- | ---------------------------------------------------- | ---- |
| `"assist"` (default) | Only the ambiguous identifiers the local pass leaves | Low  |
| `"full"`             | **Every** non-whitespace token, ignoring heuristics  | High |

`"full"` mode is a pure demonstration of the model doing all the work — keywords, literals,
operators, and punctuation are all sent to Jev rather than resolved locally.

## Providers

Both adapters implement the same `EvaluateFn` seam, normalizing confidence into a per-key
map regardless of where the provider reports it:

| Import             | Backend             | Auth env             | Confidence source                          |
| ------------------ | ------------------- | -------------------- | ------------------------------------------ |
| `jelight/gateway`  | Vercel AI Gateway   | `AI_GATEWAY_API_KEY` | `providerMetadata.typesafe.confidence` map |
| `jelight/typesafe` | Direct TypeSafe API | `TYPESAFE_API_KEY`   | `confidence` on each answer                |

Rendering remains the caller's responsibility, so the library works with plain DOM, canvas,
CodeMirror, or another adapter.

## Structure

| Path                      | Responsibility                                                       |
| ------------------------- | -------------------------------------------------------------------- |
| `src/index.ts`            | Public library entry (core, zero runtime deps)                       |
| `src/tokenizer.ts`        | Token types and the `tokenize()` splitter                            |
| `src/base.ts`             | `highlightBaseLines()` — synchronous lexical + provisional roles     |
| `src/highlighter.ts`      | `highlightLines()` — batched evaluation via an injected `EvaluateFn` |
| `src/categories.ts`       | `CATEGORIES` — the default label→criteria map                        |
| `src/adapters/gateway.ts` | `createGatewayEvaluate()` — Vercel AI Gateway provider (`ai`)        |
| `src/adapters/typesafe.ts`| `createTypeSafeEvaluate()` — direct TypeSafe API provider (fetch)    |

## Categories

Tokens are classified into: `keyword`, `type`, `function`, `variable`, `string`, `number`,
`comment`, `operator`, `punctuation`, `other`. Edit the `CATEGORIES` map in
`src/categories.ts` (or pass a `categories` override to `highlightLines`) to change the
labels or their descriptions.

## Caveats

- **Latency & cost:** semantic identifier upgrades use a provider call; request-local
  deduplication bounds that work. The `maxTokens` option (default 400) bounds tokens
  classified per call.
- **Multi-line constructs:** each line is grouped independently, so block comments or
  multi-line strings spanning several lines may be misjudged.

## License

MIT
