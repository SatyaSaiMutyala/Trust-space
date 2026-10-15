import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import resourceRouter from './routes/resources.js'
import assetRouter from './routes/assets.js'
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

// Signed-in users only
app.use('/api/users', usersRouter)
app.use('/api/assets', assetRouter)
app.use('/api', resourceRouter)

app.use(notFoundRoute)
app.use(errorHandler)

export default app
