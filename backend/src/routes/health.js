import { Router } from 'express'
import { dbState } from '../config/db.js'
import { storage } from '../storage/index.js'
import { send } from '../utils/respond.js'

const router = Router()
/** GET /api/health — database and file-storage status. ?storage=check also tests access to the S3 bucket. */
router.get('/', async (req, res) => {
  const db = dbState(); const st = storage()
  const stCheck = req.query.storage === 'check' ? await st.check() : null
  const up = db === 'connected' && (!stCheck || stCheck.ok)
  const message = db !== 'connected' ? `TruSpace API is running but the database is ${db}.`
    : stCheck && !stCheck.ok ? stCheck.message
      : `TruSpace API is running, the database is connected and files are stored in ${st.label}${stCheck ? ' (access checked)' : ''}.`
  return send(res, up ? 200 : 503, message, { status: up ? 'ok' : 'degraded', db, storage: { driver: st.kind, ...(st.bucket ? { bucket: st.bucket } : {}), ...(stCheck ? { reachable: stCheck.ok } : {}) }, node: process.version, time: new Date().toISOString() })
})
export default router
