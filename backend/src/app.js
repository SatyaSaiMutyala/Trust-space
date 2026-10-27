import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import resourceRouter from './routes/resources.js'
import tdsRouter from './routes/tds.js'
import leasesRouter from './routes/leases.js'
import reportsRouter from './routes/reports.js'
import trashRouter from './routes/trash.js'
import assetRouter from './routes/assets.js'
import invoicesRouter from './routes/invoices.js'
import mobileRouter from './routes/mobile.js'
import importRouter from './routes/import.js'
import provisioningRouter from './routes/provisioning.js'
import { notFoundRoute, errorHandler } from './middleware/errors.js'

if (!env.auth.jwtSecret) throw new Error('JWT_SECRET must be set in production.')

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({ origin: env.clientUrl, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// Public
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)

// PACE identity hub (server-to-server, guarded by X-Provisioning-Token)
app.use('/api/provisioning', provisioningRouter)

// Signed-in users only
app.use('/api/users', usersRouter)
app.use('/api/assets', assetRouter)
app.use('/api/tds', tdsRouter) // /tds/report etc. — before the generic /tds/:id routes
app.use('/api/leases', leasesRouter) // /leases/:id/schedule
app.use('/api/invoices', invoicesRouter) // /invoices/generate — before the generic /invoices/:id routes
app.use('/api/mobile', mobileRouter) // combined screen data for the phone app
app.use('/api/import', importRouter) // Excel import of owners, properties and leases
app.use('/api', reportsRouter) // /ledgers, /rent-roll, /rent-status
app.use('/api/trash', trashRouter)
app.use('/api', resourceRouter)

app.use(notFoundRoute)
app.use(errorHandler)

export default app
