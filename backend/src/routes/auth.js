import { Router } from 'express'
import { authController as c } from '../controllers/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimit.js'

const router = Router()
router.post('/login', loginLimiter, c.login)
router.post('/refresh', c.refresh)
router.post('/logout', c.logout)
router.post('/forgot-password', loginLimiter, c.forgotPassword)
router.post('/reset-password', loginLimiter, c.resetPassword)
router.get('/me', requireAuth, c.me)
router.post('/logout-all', requireAuth, c.logoutAll)
router.post('/change-password', requireAuth, c.changePassword)
export default router
