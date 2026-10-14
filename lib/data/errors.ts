/**
 * Data-layer failure. The message shown to users is always generic; the
 * operation name and database code are logged for debugging without row data.
 */
export class DataError extends Error {
  constructor(
    public readonly operation: string,
    public readonly code?: string,
    detail?: string,
  ) {
    super(`Data operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "DataError";
    if (detail && process.env.NODE_ENV !== "production") this.detail = detail;
  }
  detail?: string;
}

export class NotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found.`);
    this.name = "NotFoundError";
  }
}
