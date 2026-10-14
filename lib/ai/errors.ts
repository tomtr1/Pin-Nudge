export type AiErrorKind = "rate_limited" | "unavailable" | "timeout" | "invalid_output" | "refused" | "config";

const USER_MESSAGES: Record<AiErrorKind, string> = {
  rate_limited: "The AI service is busy right now. Please wait a minute and try again.",
  unavailable: "The AI service is temporarily unavailable. Your inputs are saved — please try again shortly.",
  timeout: "Generation took too long and was stopped. Your inputs are saved — please try again.",
  invalid_output: "The AI returned content that didn't pass our quality checks. Please try again.",
  refused: "The AI declined to generate content for this request. Try adjusting the product description.",
  config: "AI generation is not configured on this server.",
};

/** Provider failure with a safe, user-facing message. Internal detail is logged, never shown. */
export class AiError extends Error {
  constructor(
    public readonly kind: AiErrorKind,
    public readonly internal?: string,
  ) {
    super(USER_MESSAGES[kind]);
    this.name = "AiError";
  }
  get userMessage() {
    return USER_MESSAGES[this.kind];
  }
  get retryable() {
    return this.kind !== "config" && this.kind !== "refused";
  }
}
