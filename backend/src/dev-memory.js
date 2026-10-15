/*
 * Run the API without installing MongoDB: starts an in-memory MongoDB, loads the sample data and serves the API.
 * Data is lost when the process stops.   npm run dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongo = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongo.getUri('truspace')
const { env } = await import('./config/env.js')
const { connectDb } = await import('./config/db.js')
const { seed } = await import('./seed/seed.js')
const { default: app } = await import('./app.js')

await connectDb(process.env.MONGODB_URI)
const { counts } = await seed()
console.log('In-memory MongoDB ready with sample data: ' + Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', '))
console.log(`Sign in with admin@trustlab.example (or any owner / partner email from the sample data), password ${process.env.SEED_PASSWORD || 'Trust@1234'}`)
const server = app.listen(env.port, () => console.log(`TruSpace API running on http://localhost:${env.port}/api (in-memory database)`))

const stop = async () => { server.close(); await mongo.stop(); process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
