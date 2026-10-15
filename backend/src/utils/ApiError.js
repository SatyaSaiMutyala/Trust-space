/** Error with an HTTP status and a human-readable message that is sent to the client as-is. */
export class ApiError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}
export const badRequest = (message, errors) => new ApiError(400, message, { code: 'validation_failed', errors })
export const notFound = message => new ApiError(404, message, { code: 'not_found' })
export const conflict = message => new ApiError(409, message, { code: 'conflict' })
