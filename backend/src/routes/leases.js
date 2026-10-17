/* Server-computed lease reports (rent schedule). Mounted on /api/leases before the generic /api/leases/:id resource routes. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { leaseSchedule, leaseScheduleCsv } from '../controllers/leaseReport.js'
import { openingFill, openingPay } from '../controllers/openingReport.js'
import { leaseDeposit } from '../controllers/depositReport.js'

const router = Router()
router.use(requireAuth)
router.get('/:id/schedule', leaseSchedule)
router.get('/:id/schedule.csv', leaseScheduleCsv)
router.get('/:id/opening-fill', openingFill)
router.get('/:id/opening-pay/:itemId', openingPay)
router.get('/:id/deposit', leaseDeposit)
export default router
