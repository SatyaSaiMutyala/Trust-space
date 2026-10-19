import app from './app.js'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { startInvoiceScheduler } from './services/invoiceGenerator.js'
import { attachRealtime } from './services/realtime.js'

try {
  await connectDb(env.mongoUri)
  console.log(`MongoDB connected (${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')})`)
} catch (e) {
  console.error(`Could not connect to MongoDB at ${env.mongoUri}: ${e.message}`)
  console.error('Start MongoDB (or set MONGODB_URI in backend/.env), then run the server again.')
  process.exit(1)
}

const server = app.listen(env.port, () => console.log(`TruSpace API running on http://localhost:${env.port}/api`))
attachRealtime(server) // live updates (Socket.IO on /socket.io)
startInvoiceScheduler() // rent invoices on the 1st of every month
