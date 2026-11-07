export class NotFound extends Error {
  constructor(id: number) { super(`not found ${id}`); }
}
