/* MongoDB connection. */
import mongoose from 'mongoose'

export async function connectDb(uri) {
  // Records are flexible (strict: false), so query filters on undeclared fields must be kept.
  mongoose.set('strictQuery', false)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  return mongoose.connection
}
export const dbState = () => ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
