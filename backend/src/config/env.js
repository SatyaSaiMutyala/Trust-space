/* Environment settings (from .env). */
import 'dotenv/config'
import path from 'node:path'

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/truspace',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  auth: {
    // Must be set in production. The development fallback is only for local use.
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-truspace-secret-change-me'),
    accessTtl: Number(process.env.ACCESS_TOKEN_TTL) || 900, // seconds (15 min)
    refreshDays: Number(process.env.REFRESH_DAYS) || 1, // session length without “Remember me”
    rememberDays: Number(process.env.REMEMBER_DAYS) || 30, // with “Remember me”
    maxFailed: Number(process.env.LOGIN_MAX_FAILED) || 5, // failed sign-ins before a temporary lock
    lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES) || 15,
    resetMinutes: Number(process.env.RESET_MINUTES) || 30, // password-reset link lifetime
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  },
  /** 's3' (AWS S3) or 'local' (backend/uploads) */
  storageDriver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  s3: {
    bucket: process.env.S3_BUCKET || 'trust-space',
    region: process.env.AWS_REGION || 'ap-south-1',
    prefix: (process.env.S3_PREFIX ?? 'uploads/').replace(/^\/+/, ''),
    urlExpires: Number(process.env.S3_URL_EXPIRES) || 3600,
    endpoint: process.env.S3_ENDPOINT || '',
    // Optional: leave empty to use the standard AWS credential chain (env vars, ~/.aws, IAM role).
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}
