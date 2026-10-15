import { Router } from 'express'
import { upload, uploadErrors, assetsController as c } from '../controllers/assets.js'
import { requireAuth, requireMediaOrAuth } from '../middleware/auth.js'

const router = Router()
// The file itself may be opened with ?t=<mediaToken> so <img>/<video> tags work.
router.get('/:id/file', requireMediaOrAuth, c.file)
router.use(requireAuth)
router.route('/').get(c.list).post(upload, uploadErrors, c.create)
router.route('/:id').get(c.get).delete(c.remove)
export default router
