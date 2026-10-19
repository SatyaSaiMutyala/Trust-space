/* Excel import of owners, properties and leases (admin and staff): template download, preview, commit. */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { importController as c, uploadSheet, uploadSheetErrors } from '../controllers/importer.js'

const router = Router()
router.use(requireAuth, requireRole('admin', 'staff'))
router.get('/template', c.template)
router.post('/preview', uploadSheet, uploadSheetErrors, c.preview)
router.post('/', uploadSheet, uploadSheetErrors, c.commit)

export default router
