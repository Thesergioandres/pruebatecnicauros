export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  readonly resource: string;

  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found`);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}
