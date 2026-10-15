/* Accounts, sign-in sessions and password-reset requests. */
import mongoose from 'mongoose'
import { newId } from '../utils/ids.js'

const opts = { versionKey: false, minimize: false }

const userSchema = new mongoose.Schema({
  _id: { type: String, default: newId },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  phoneDigits: String, // last 10 digits, for sign-in by mobile number
  passwordHash: String,
  role: { type: String, enum: ['admin', 'staff', 'owner', 'franchisee'], required: true },
  ownerId: String, // role = owner
  partnerId: String, // role = franchisee
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  failedLogins: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
  passwordChangedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { ...opts, collection: 'users' })
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } })
userSchema.index({ phoneDigits: 1 }, { unique: true, partialFilterExpression: { phoneDigits: { $type: 'string' } } })
userSchema.index({ role: 1 }); userSchema.index({ status: 1 }); userSchema.index({ ownerId: 1 }); userSchema.index({ partnerId: 1 })

const sessionSchema = new mongoose.Schema({
  _id: { type: String, default: newId },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  remember: Boolean,
  userAgent: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { ...opts, collection: 'sessions' })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // MongoDB removes expired sessions

const resetSchema = new mongoose.Schema({
  _id: { type: String, default: newId },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
}, { ...opts, collection: 'password_resets' })
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema)
export const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', resetSchema)

export const digitsOf = phone => { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : '' }

/** User as sent to clients — never includes the password hash or lock counters. */
export function publicUser(u) {
  if (!u) return u
  const { _id, name, email, phone, role, ownerId, partnerId, status, lastLoginAt, createdAt, updatedAt, lockedUntil } = u
  return { id: _id, name, email, phone, role, ownerId, partnerId, status, locked: !!(lockedUntil && new Date(lockedUntil) > new Date()), lastLoginAt, createdAt, updatedAt }
}
