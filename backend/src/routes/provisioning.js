/*
 * PACE identity-hub provisioning routes. Guarded by the X-Provisioning-Token
 * shared secret (server-to-server, no session). Mounted at /api/provisioning.
 */
import { Router } from 'express'
import { provisioningGuard } from '../middleware/provisioning.js'
import { provisioningController as c } from '../controllers/provisioning.js'

const router = Router()
router.use(provisioningGuard) // every route below requires the token

router.get('/ping', c.ping)
router.post('/rotate-token', c.rotateToken)
router.get('/users/lookup', c.lookup)
router.post('/users', c.store)
router.post('/users/enable', c.enable)
router.post('/users/disable', c.disable)

export default router
