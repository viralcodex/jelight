import { experimental_evaluate as evaluate } from "ai";
import type {
  EvaluateFn,
  EvaluateResult,
  EvaluationAnswer,
} from "../models.js";

/** Options for the Vercel AI Gateway adapter. */
export interface GatewayAdapterOptions {
  /**
   * Model identifier passed to the Gateway. Defaults to `typesafe-ai/jev`.
   * The Gateway reads its credentials from `AI_GATEWAY_API_KEY`.
   */
  model?: string;
}

/**
 * Provider adapter backed by the Vercel AI Gateway (`ai` package).
 *
 * The Gateway returns selection confidence separately in
 * `providerMetadata.typesafe.confidence`, so this adapter lifts that into the
 * normalized per-key `confidence` map the library expects.
 */
export function createGatewayEvaluate(
  options: GatewayAdapterOptions = {}
): EvaluateFn {
  const model = options.model ?? "typesafe-ai/jev";
  return async ({ state, questions }): Promise<EvaluateResult> => {
    const result = await evaluate({ model, state, questions });
    return {
      answers: result.answers as Record<string, EvaluationAnswer>,
      confidence: result.providerMetadata?.typesafe?.confidence as
        | Record<string, number>
        | undefined,
    };
  };
}
