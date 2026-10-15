/* Turns every error into the standard envelope with a readable message. */
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { send } from '../utils/respond.js'

export function notFoundRoute(req, res) {
  return send(res, 404, `There is no API at ${req.method} ${req.originalUrl.split('?')[0]}. Check the address and method.`)
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { success: false, message: err.message }
    if (err.code) body.code = err.code
    if (err.errors) body.errors = err.errors
    return res.status(err.status).json(body)
  }
  if (err.type === 'entity.parse.failed') return send(res, 400, 'The request body is not valid JSON. Please check the data and try again.')
  if (err.type === 'entity.too.large') return send(res, 413, 'The request is too large. Upload photos and files separately through /api/assets.')
  if (err instanceof mongoose.Error.CastError) return send(res, 400, `“${err.value}” is not a valid value for ${err.path}.`)
  if (err?.name === 'MongoServerSelectionError' || err?.name === 'MongoNetworkError' || err instanceof mongoose.Error.MongooseServerSelectionError)
    return send(res, 503, 'The database is not reachable right now. Please try again in a moment.')
  if (err?.code === 11000) return send(res, 409, 'This record already exists.')
  console.error(err)
  return send(res, 500, 'Something went wrong on our side. Please try again; if it keeps happening, contact support.')
}
