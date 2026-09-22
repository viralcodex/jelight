import type {
  EvaluateFn,
  EvaluateResult,
  EvaluationAnswer,
} from "../models.js";

/** Options for the direct TypeSafe API adapter. */
export interface TypeSafeAdapterOptions {
  /** API key. Defaults to `process.env.TYPESAFE_API_KEY`. */
  apiKey?: string;
  /** System One model. Defaults to `jev-latest`. */
  model?: string;
  /** Base URL. Defaults to `https://api.typesafe.ai/v1`. */
  baseUrl?: string;
  /** Optional custom fetch (e.g. for tests). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

/** The direct API's Choice answer carries confidence on the answer itself. */
interface DirectChoiceAnswer extends EvaluationAnswer {
  type: "choice";
  confidence?: number;
}

/**
 * Provider adapter backed by the direct TypeSafe System One API.
 *
 * Unlike the Gateway, the direct API returns selection confidence ON each
 * answer, so this adapter reads `answer.confidence` and rebuilds the normalized
 * per-key `confidence` map. Requires an API key — never call this from a
 * browser; the key must stay server-side.
 */
export function createTypeSafeEvaluate(
  options: TypeSafeAdapterOptions = {}
): EvaluateFn {
  const apiKey = options.apiKey ?? process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TypeSafe adapter requires an API key (options.apiKey or TYPESAFE_API_KEY)"
    );
  }
  const model = options.model ?? "jev-latest";
  const baseUrl = (options.baseUrl ?? "https://api.typesafe.ai/v1").replace(
    /\/$/,
    ""
  );
  const doFetch = options.fetch ?? fetch;

  return async ({ state, questions }): Promise<EvaluateResult> => {
    const res = await doFetch(`${baseUrl}/systemone`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ state, model, questions }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `TypeSafe API ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`
      );
    }

    const data = (await res.json()) as {
      answers: Record<string, DirectChoiceAnswer>;
    };

    const confidence: Record<string, number> = {};
    for (const [key, answer] of Object.entries(data.answers)) {
      if (typeof answer.confidence === "number") {
        confidence[key] = answer.confidence;
      }
    }

    return { answers: data.answers, confidence };
  };
}
