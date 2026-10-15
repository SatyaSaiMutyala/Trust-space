/*
 * File uploads (photos, videos, PDFs) used by tickets, inspections, sites, invoices and messages.
 * Files are stored in S3 (bucket "trust-space") or on local disk, depending on STORAGE_DRIVER.
 *   POST   /api/assets                multipart/form-data, field "file" (max 20 MB)
 *   GET    /api/assets?search=&page=&limit=&type=image|video|pdf
 *   GET    /api/assets/:id            details (+ a temporary download link for S3)
 *   GET    /api/assets/:id/file       the file itself (S3: redirects to a short-lived signed URL)
 *   DELETE /api/assets/:id
 */
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { Asset, toApi } from '../models/index.js'
import { ApiError, notFound, badRequest } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'
import { buildListQuery, pageInfo } from '../utils/listQuery.js'
import { count } from '../utils/text.js'
import { newId } from '../utils/ids.js'
import { env } from '../config/env.js'
import { storage } from '../storage/index.js'

export const MAX_UPLOAD_MB = 20
const ALLOWED = /^(image\/|video\/|application\/pdf$)/
const kindOf = type => type.startsWith('image/') ? 'Photo' : type.startsWith('video/') ? 'Video' : 'PDF'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => ALLOWED.test(file.mimetype)
    ? cb(null, true)
    : cb(new ApiError(415, `“${file.originalname}” can’t be uploaded — only photos, videos and PDF files are allowed.`, { code: 'unsupported_type' })),
}).single('file')

/** Multer errors → readable messages. */
export function uploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, `This file is larger than ${MAX_UPLOAD_MB} MB. Please upload a smaller file (record videos at 720p or keep them short).`, { code: 'too_large' }))
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') return next(badRequest('Upload one file at a time in a form field named “file”.'))
    return next(badRequest(`The upload could not be read: ${err.message}.`))
  }
  next(err)
}

const ASSET_CFG = { singular: 'file', plural: 'files', search: ['name'], filters: {}, sort: { createdAt: -1 }, dateField: 'createdAt' }
/** uploads/2026/10/<id>.jpg */
const keyFor = (st, id, name, now) => `${st.kind === 's3' ? env.s3.prefix : ''}${now.toISOString().slice(0, 4)}/${now.toISOString().slice(5, 7)}/${id}${path.extname(name).toLowerCase()}`
const missing = id => notFound(`No file found with id “${id}”. It may have been deleted.`)
/** Older records stored on disk before S3 was set up have no `key`. */
const keyOf = a => a.key || a.storedAs

export const assetsController = {
  async create(req, res) {
    if (!req.file) throw badRequest('Choose a file to upload (form field “file”).')
    const f = req.file; const id = newId(); const now = new Date()
    const st = storage()
    const key = keyFor(st, id, f.originalname, now)
    await st.put({ key, body: f.buffer, type: f.mimetype, name: f.originalname })
    const doc = { _id: id, name: f.originalname, type: f.mimetype, size: f.size, storage: st.kind, key, url: `/api/assets/${id}/file`, createdAt: now.toISOString() }
    if (st.kind === 's3') doc.bucket = st.bucket
    try { await Asset.create(doc) } catch (e) { await st.remove(key).catch(() => {}); throw e }
    return created(res, `${kindOf(f.mimetype)} “${f.originalname}” uploaded.`, toApi(doc))
  },

  async list(req, res) {
    const q = buildListQuery(ASSET_CFG, req.query)
    const type = req.query.type
    if (type) {
      const map = { image: /^image\//, video: /^video\//, pdf: /^application\/pdf$/ }
      if (!map[type]) throw badRequest('“type” must be image, video or pdf.')
      q.filter = { $and: [...(q.filter.$and || []), { type: map[type] }] }
    }
    const [items, total] = await Promise.all([Asset.find(q.filter).sort(q.sort).skip(q.skip).limit(q.limit).lean(), Asset.countDocuments(q.filter)])
    const p = pageInfo(total, q.page, q.limit)
    const message = total ? `${count(total, 'file', 'files')} found${q.search ? ` for “${q.search}”` : ''}.` : (q.search ? `No files match “${q.search}”.` : 'No files uploaded yet.')
    return ok(res, message, items.map(toApi), p)
  },

  async get(req, res) {
    const a = await Asset.findById(req.params.id).lean()
    if (!a) throw missing(req.params.id)
    const data = toApi(a)
    if ((a.storage || 'local') === 's3') {
      data.downloadUrl = await storage().readUrl(keyOf(a))
      data.downloadUrlExpiresIn = env.s3.urlExpires
    }
    return ok(res, `File “${a.name}” loaded.`, data)
  },

  /** Streams a local file, or redirects to a signed S3 URL. */
  async file(req, res) {
    const a = await Asset.findById(req.params.id).lean()
    if (!a) throw missing(req.params.id)
    const st = storage()
    if ((a.storage || 'local') === 's3') {
      if (st.kind !== 's3') throw new ApiError(503, 'This file is stored in S3, but S3 storage is not switched on for this server.', { code: 'storage_unavailable' })
      return res.redirect(302, await st.readUrl(keyOf(a)))
    }
    const p = st.localPath(keyOf(a)) || path.join(env.uploadDir, ...keyOf(a).split('/'))
    if (!fs.existsSync(p)) throw notFound(`The file “${a.name}” is missing from storage.`)
    res.type(a.type)
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(a.name)}`)
    return res.sendFile(p)
  },

  async remove(req, res) {
    const a = await Asset.findById(req.params.id).lean()
    if (!a) throw missing(req.params.id)
    await storage().remove(keyOf(a))
    await Asset.deleteOne({ _id: a._id })
    return ok(res, `File “${a.name}” deleted.`, { id: a._id })
  },
}
