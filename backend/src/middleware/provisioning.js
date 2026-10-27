/*
 * Guards the /api/provisioning/* routes with the X-Provisioning-Token shared
 * secret (server-to-server from PACE; no JWT, no session).
 *   503 when no token is configured on this server (feature off).
 *   401 when the presented token is missing or wrong.
 */
import { currentToken, tokenMatches } from '../auth/provisioningToken.js'
import { ApiError } from '../utils/ApiError.js'

export function provisioningGuard(req, res, next) {
  if (!currentToken()) throw new ApiError(503, 'Provisioning is not configured on this server.', { code: 'provisioning_unconfigured' })
  const presented = req.headers['x-provisioning-token'] || ''
  if (!tokenMatches(presented)) throw new ApiError(401, 'Invalid provisioning token.', { code: 'provisioning_unauthorized' })
  next()
}
