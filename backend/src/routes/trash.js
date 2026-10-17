/* Trash: list, restore, delete permanently, empty. Mounted on /api/trash. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { list, restore, destroy, empty } from '../controllers/trash.js'

const router = Router()
router.use(requireAuth)
router.get('/', list)
router.delete('/', empty)
router.post('/:resource/:id/restore', restore)
router.delete('/:resource/:id', destroy)
export default router
