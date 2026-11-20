/**
 * The one error shape the engine raises. The API turns it into
 * {"error": {"code", "field", "message"}} (phase 1 spec, section 7).
 */
export type EngineErrorCode =
  | "invalid_rules"
  | "unknown_rules_version"
  | "unknown_profile"
  | "invalid_profile"
  | "unknown_setting"
  | "invalid_setting"
  | "invalid_input";

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly field: string | undefined;

  constructor(code: EngineErrorCode, message: string, field?: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.field = field;
  }

  toJSON(): { code: EngineErrorCode; field?: string; message: string } {
    return this.field === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, field: this.field, message: this.message };
  }
}
