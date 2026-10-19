import { Router } from 'express'
import { usersController as c } from '../controllers/users.js'
import { signupController as su } from '../controllers/signup.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('admin', 'staff'))
router.get('/pending', su.pending) // owner sign-ups waiting for approval
router.route('/').get(c.list).post(c.create)
router.route('/:id').get(c.get).patch(c.update).delete(c.remove)
router.post('/:id/unlock', c.unlock)
router.post('/:id/reset-password', c.resetPassword)
export default router
