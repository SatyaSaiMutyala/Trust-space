import { Router } from 'express'
import { upload, uploadErrors, assetsController as c } from '../controllers/assets.js'
import { requireAuth, requireMediaOrAuth, requireAuthOrSignup } from '../middleware/auth.js'

const router = Router()
// The file itself may be opened with ?t=<mediaToken> so <img>/<video> tags work.
router.get('/:id/file', requireMediaOrAuth, c.file)
router.post('/', requireAuthOrSignup, upload, uploadErrors, c.create) // sign-ups may upload their documents
router.use(requireAuth)
router.get('/', c.list)
router.route('/:id').get(c.get).delete(c.remove)
export default router
