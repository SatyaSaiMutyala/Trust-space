import { Router } from 'express'
import { authController as c } from '../controllers/auth.js'
import { signupController as su } from '../controllers/signup.js'
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
// owner self sign-up (email code → details → pending approval) and closing one's own account
router.post('/register/start', loginLimiter, su.start)
router.post('/register/verify', loginLimiter, su.verify)
router.post('/register', loginLimiter, su.register)
router.post('/delete-account', requireAuth, su.deleteAccount)
export default router
