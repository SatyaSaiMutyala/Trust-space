/*
 * Every response has the same envelope:
 *   { success, message, data, pagination? }
 * `message` is plain language meant to be shown to the user exactly as sent.
 */
export function send(res, status, message, data, pagination) {
  const body = { success: status < 400, message }
  if (data !== undefined) body.data = data
  if (pagination) body.pagination = pagination
  return res.status(status).json(body)
}
export const ok = (res, message, data, pagination) => send(res, 200, message, data, pagination)
export const created = (res, message, data) => send(res, 201, message, data)
