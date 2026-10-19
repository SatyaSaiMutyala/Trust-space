/* Environment settings (from .env). */
import 'dotenv/config'
import path from 'node:path'

export const env = {
  port: Number(process.env.PORT) || 5001, // not 5000: macOS AirPlay Receiver listens there
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
  invoices: {
    /** Generate every lease's rent invoices on the 1st of the month (off in tests; set INVOICE_AUTOGEN=off to disable). */
    autoGenerate: process.env.INVOICE_AUTOGEN ? process.env.INVOICE_AUTOGEN !== 'off' : process.env.NODE_ENV !== 'test',
    /** Status a generated invoice starts in: Verified (ready to approve) or Submitted (staff verify first). */
    autoStatus: ['Submitted', 'Verified'].includes(process.env.INVOICE_AUTO_STATUS) ? process.env.INVOICE_AUTO_STATUS : 'Verified',
  },
  /** Outgoing mail over SMTP; with no host, mails are logged instead of sent (development, tests). */
  mail: {
    host: process.env.NODE_ENV === 'test' ? '' : (process.env.MAIL_HOST || ''),
    port: Number(process.env.MAIL_PORT) || 587,
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
    encryption: process.env.MAIL_ENCRYPTION || 'STARTTLS',
    from: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'no-reply@example.com',
    fromName: process.env.MAIL_FROM_NAME || 'TruSpace',
    codeMinutes: Number(process.env.SIGNUP_CODE_MINUTES) || 10, // sign-up email code lifetime
    contact: process.env.MAIL_CONTACT || '', // how to reach the facilities team, shown in emails (e.g. a phone number or email)
  },
  appName: process.env.APP_NAME || 'TruSpace',
  /** Push notifications: path of the Firebase service-account JSON (empty = off, notifications only logged). */
  push: { adminFile: process.env.FIREBASE_ADMIN_FILE || '' },
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
