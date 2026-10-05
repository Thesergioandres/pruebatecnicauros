/** Typed application error with an explicit HTTP status. */
export class CodedError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "CodedError";
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  readonly resource: string;

  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found`);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}
