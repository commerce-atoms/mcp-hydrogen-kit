/**
 * Confidence level for tool results.
 */
export type Confidence = "high" | "medium" | "low";

/**
 * Warning information for tool results.
 */
export type ToolWarning = {
  code: string;
  message: string;
};

/**
 * Standardized tool result envelope.
 */
export type ToolResult<T> =
  | {
      ok: true;
      data: T;
      confidence: Confidence;
      warnings?: ToolWarning[];
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
      confidence: Confidence;
      warnings?: ToolWarning[];
    };
