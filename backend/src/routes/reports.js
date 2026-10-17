/* Server-computed money reports (ledgers, rent roll, rent status). Mounted on /api before the generic resource routes. */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { ledger, ledgerCsv, rentRoll, rentStatus } from '../controllers/ledgerReport.js'
import { opening } from '../controllers/openingReport.js'
import { deposits } from '../controllers/depositReport.js'

const router = Router()
router.get('/ledgers', requireAuth, ledger)
router.get('/ledgers.csv', requireAuth, ledgerCsv)
router.get('/rent-roll', requireAuth, rentRoll)
router.get('/rent-status', requireAuth, rentStatus)
router.get('/opening', requireAuth, opening)
router.get('/deposits', requireAuth, deposits)
export default router
