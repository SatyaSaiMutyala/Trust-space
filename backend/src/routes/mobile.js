/* Combined screen data for the mobile app. Mounted on /api/mobile. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { overview, notifications, markRead, dismiss, clearAll, site } from '../controllers/mobile.js'
import * as insp from '../controllers/inspectionsMobile.js'
import { invoiceDefaults, depositRequests, depositAgree, depositDecline } from '../controllers/ownerMobile.js'
import { threads, thread, markRead as threadRead } from '../controllers/threadsMobile.js'
import { registerToken, removeToken } from '../services/push.js'
import { badRequest } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'

const router = Router()
router.get('/overview', requireAuth, overview)
router.get('/notifications', requireAuth, notifications)
router.post('/notifications/read', requireAuth, markRead)
router.delete('/notifications/:id', requireAuth, dismiss)
router.delete('/notifications', requireAuth, clearAll)
router.get('/sites/:id', requireAuth, site)
// joint inspections, one change per call (see controllers/inspectionsMobile.js)
router.get('/inspections', requireAuth, insp.list)
router.post('/inspections', requireAuth, insp.start)
router.get('/inspections/:id', requireAuth, insp.one)
router.patch('/inspections/:id', requireAuth, insp.patch)
router.patch('/inspections/:id/items/:k', requireAuth, insp.patchItem)
router.post('/inspections/:id/submit', requireAuth, insp.submit)
router.post('/inspections/:id/sign', requireAuth, insp.sign)
router.post('/inspections/:id/dispute', requireAuth, insp.dispute)
router.post('/inspections/:id/reopen', requireAuth, insp.reopen)
// owner self-service (see controllers/ownerMobile.js)
router.get('/invoice-defaults', requireAuth, invoiceDefaults)
router.get('/deposit-requests', requireAuth, depositRequests)
router.post('/deposit-requests/:leaseId/:adjId/agree', requireAuth, depositAgree)
router.post('/deposit-requests/:leaseId/:adjId/decline', requireAuth, depositDecline)
// owner messages, one thread per property (see controllers/threadsMobile.js)
router.get('/threads', requireAuth, threads)
router.get('/threads/:propertyId', requireAuth, thread)
router.post('/threads/:propertyId/read', requireAuth, threadRead)
// push notification tokens (phones and browsers)
router.post('/push-token', requireAuth, async (req, res) => { const { token, platform } = req.body || {}; if (!token || typeof token !== 'string') throw badRequest('Send the device token.'); await registerToken(req.user._id, token, platform); return ok(res, 'This device will get notifications.', { registered: true }) })
router.delete('/push-token', requireAuth, async (req, res) => { const { token } = req.body || {}; if (token) await removeToken(token); return ok(res, 'Notifications stopped on this device.', { removed: !!token }) })
export default router
