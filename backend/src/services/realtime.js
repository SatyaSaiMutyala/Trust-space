/*
 * Live updates over Socket.IO (path /socket.io on the same port as the API; behind Nginx the location needs the
 * WebSocket upgrade headers). A client connects with its access token (handshake auth.token) and is placed in
 * user:<id>; while a conversation is open it joins thread:<propertyId> (scope checked) for instant messages and
 * typing. Events sent by the server:
 *   notify           { title, body, link, web, tag }   the same note as a push, to each user's sockets
 *   message:new      the message record                 to the thread room
 *   record:changed   { path, id, propertyId }           lists that may need refreshing
 *   typing           { propertyId, by, side, at }       to the others in the thread room
 */
import { Server } from 'socket.io'
import { verifyAccess } from '../auth/tokens.js'
import { User, Session } from '../models/auth.js'
import { models } from '../models/index.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { env } from '../config/env.js'

let io = null

export function attachRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: (origin, cb) => cb(null, !origin || origin === env.clientUrl), credentials: true }, // phones send no origin
    pingInterval: 25000, pingTimeout: 20000,
  })
  io.use(async (socket, next) => {
    try {
      const claims = verifyAccess(String(socket.handshake.auth?.token || ''))
      const [user, session] = await Promise.all([User.findById(claims.sub).lean(), claims.sid ? Session.exists({ _id: claims.sid }) : true])
      if (!user || user.status !== 'active' || !session) return next(new Error('unauthorized'))
      socket.data.user = user
      next()
    } catch { next(new Error('unauthorized')) }
  })
  io.on('connection', socket => {
    const u = socket.data.user
    socket.join(`user:${u._id}`)
    socket.on('thread:join', async (propertyId, ack) => {
      try {
        const P = propertyId ? await models.properties.findById(propertyId).lean() : null
        const okay = !!(P && matches(P, await scopeFilter('properties', u)))
        if (okay) socket.join(`thread:${propertyId}`)
        if (typeof ack === 'function') ack({ ok: okay })
      } catch { if (typeof ack === 'function') ack({ ok: false }) }
    })
    socket.on('thread:leave', propertyId => socket.leave(`thread:${propertyId}`))
    socket.on('typing', propertyId => {
      if (!socket.rooms.has(`thread:${propertyId}`)) return
      socket.to(`thread:${propertyId}`).emit('typing', { propertyId, by: u.name, side: u.role === 'owner' ? 'owner' : 'tdpl', at: Date.now() })
    })
  })
  return io
}

export const realtimeOn = () => !!io
/** To every socket of these users. */
export function emitUsers(userIds, event, data) { const ids = [...new Set((userIds || []).filter(Boolean))]; if (!io || !ids.length) return; io.to(ids.map(id => `user:${id}`)).emit(event, data) }
/** To everyone who has the conversation open. */
export function emitThread(propertyId, event, data) { if (io && propertyId) io.to(`thread:${propertyId}`).emit(event, data) }
/** Whether a user has a live connection right now. */
export const isOnline = userId => !!io && (io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0) > 0
