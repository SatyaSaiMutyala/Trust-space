/*
 * Live updates over Socket.IO: when anything the signed-in person can see changes on the server (a message, an
 * invoice, a ticket, an inspection, a deposit request), the portfolio is refreshed at once instead of waiting for the
 * next tab focus. The open conversation also gets typing indicators. Connected only while signed in.
 */
import { io } from 'socket.io-client'
import { API_URL } from './api'
import { getState, reduxStore } from './store'
import { refreshPortfolio } from './bootstrap'

const BASE = API_URL.replace(/\/api\/?$/, '')
let socket = null, started = false, current = '', typingAt = 0, refreshT = null
const typingListeners = new Set()

function refreshSoon() { clearTimeout(refreshT); refreshT = setTimeout(() => refreshPortfolio({ force: true }), 250) } // several events in a row → one refresh

function wire(s) {
  s.on('connect', () => { if (current) s.emit('thread:join', current) })
  s.on('message:new', refreshSoon)
  s.on('notify', refreshSoon)
  s.on('record:changed', refreshSoon)
  s.on('typing', t => typingListeners.forEach(fn => fn(t)))
}

function sync() {
  const st = getState()
  if (st.auth.status === 'signedIn') {
    if (socket) return
    socket = io(BASE || window.location.origin, { path: '/socket.io', auth: cb => cb({ token: getState().auth.accessToken }), reconnectionDelayMax: 10000 })
    wire(socket)
  } else if (socket) { socket.disconnect(); socket = null; current = '' }
}

/** Call once at app start. */
export function startRealtime() { if (started) return; started = true; reduxStore.subscribe(sync); sync() }
export function joinThread(pid) { current = pid || ''; if (socket?.connected && pid) socket.emit('thread:join', pid) }
export function leaveThread(pid) { if (current === pid) current = ''; if (socket?.connected && pid) socket.emit('thread:leave', pid) }
export function sendTyping(pid) { const now = Date.now(); if (!socket?.connected || now - typingAt < 1500) return; typingAt = now; socket.emit('typing', pid) }
/** Subscribe to typing events: fn({ propertyId, by, side, at }); returns the unsubscribe. */
export function onTyping(fn) { typingListeners.add(fn); return () => typingListeners.delete(fn) }
