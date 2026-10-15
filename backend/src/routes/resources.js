/* Mounts the CRUD endpoints for every resource in resources/config.js (signed-in users only). */
import { Router } from 'express'
import { RESOURCES } from '../resources/config.js'
import { crudController } from '../controllers/crud.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
for (const cfg of RESOURCES) {
  const c = crudController(cfg)
  router.use(`/${cfg.path}`, requireAuth)
  router.route(`/${cfg.path}`).get(c.list).post(c.create)
  router.route(`/${cfg.path}/:id`).get(c.get).put(c.replace).patch(c.patch).delete(c.remove)
}
export default router
