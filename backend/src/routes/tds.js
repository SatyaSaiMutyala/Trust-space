/* Server-computed TDS reports (register, returns, Form 16A). Mounted on /api/tds before the generic /api/tds/:id resource routes. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { report, returnCsv, ownerF16 } from '../controllers/tdsReport.js'

const router = Router()
router.use(requireAuth)
router.get('/report', report)
router.get('/return.csv', returnCsv)
router.get('/owner/:ownerId/f16', ownerF16)
export default router
