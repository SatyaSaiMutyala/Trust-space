/*
 * One Mongoose model per resource. Records keep the app's own string ids (e.g. "p1", "lq3x9a2f1") as _id and are
 * otherwise flexible (strict: false) because leases, inspections and sites carry rich nested data.
 * Filter and date fields are indexed.
 */
import mongoose from 'mongoose'
import { RESOURCES } from '../resources/config.js'
import { newId } from '../utils/ids.js'

/* Trash: deleting a record sets deletedAt/deletedBy instead of removing it. Every query on these models leaves trashed
   records out unless it opts in with .setOptions({ withDeleted: true }) (the Trash page, restore and permanent delete). */
const NOT_DELETED = { deletedAt: { $exists: false } }
const QUERY_HOOKS = ['find', 'findOne', 'countDocuments', 'distinct', 'updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany']
function hideTrashed() { if (!this.getOptions().withDeleted) this.where(NOT_DELETED) }

const schemaFor = cfg => {
  const s = new mongoose.Schema({ _id: { type: String, default: newId } }, { strict: false, strictQuery: false, versionKey: false, minimize: false, collection: cfg.path })
  for (const [param, opts] of Object.entries(cfg.filters || {})) if (!opts.build) s.index({ [opts.field || param]: 1 })
  if (cfg.dateField) s.index({ [cfg.dateField]: -1 })
  for (const f of cfg.indexes || []) s.index({ [f]: 1 })
  s.index({ deletedAt: 1 })
  s.pre(QUERY_HOOKS, hideTrashed)
  return s
}

export const models = Object.fromEntries(RESOURCES.map(cfg => [cfg.path, mongoose.models[cfg.model] || mongoose.model(cfg.model, schemaFor(cfg))]))

/** Uploaded files (photos, videos, PDFs). The file itself lives in /uploads. */
const assetSchema = new mongoose.Schema({
  _id: { type: String, default: newId },
  name: String, type: String, size: Number, url: String, storage: String, bucket: String, key: String, storedAs: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { versionKey: false, collection: 'assets' })
assetSchema.index({ createdAt: -1 })
export const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema)

/** Lean document → API record: _id becomes id. */
export const toApi = doc => { if (!doc) return doc; const { _id, ...rest } = doc; return { id: _id, ...rest } }
