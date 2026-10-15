/* File uploads (photos, videos, PDFs → POST /api/assets → S3) and downloads (CSV, HTML documents). */
import { toast } from '../store/store'
import { callApi, getState } from '../app/store'
import { API_URL } from '../app/api'

/** Upload files one by one; each result is announced with the API's message. Returns [{ id, url, name, type }]. */
export async function uploadFiles(fileList, max) {
  const files = [...(fileList || [])].slice(0, max || 10); const out = []
  for (const f of files) {
    try {
      const res = await callApi('upload', f)
      const a = res.data
      out.push({ id: a.id, url: a.url, name: a.name, type: a.type })
      toast(res.message, 'success')
    } catch (e) { toast(e.message, 'error') }
  }
  return out
}

/**
 * URL to show a stored file. API files (/api/assets/:id/file) get the media token so <img>/<video> can load them;
 * older inline files (data: URLs) are used as they are.
 */
export function fileUrl(f) {
  const u = f?.url || (f?.id ? `/api/assets/${f.id}/file` : '')
  if (!u.startsWith('/api/')) return u
  const t = getState().auth.mediaToken
  return API_URL.replace(/\/api$/, '') + u + (t ? (u.includes('?') ? '&' : '?') + 't=' + encodeURIComponent(t) : '')
}
export const isVid = f => (f?.type || '').startsWith('video') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f?.name || '')
export const isImg = f => isVid(f) || (f?.type || '').startsWith('image') || /\.(png|jpe?g|webp|gif|heic)$/i.test(f?.name || '')

/** Save text content as a file in the browser. */
export function offerDownload(filename, data) {
  const type = filename.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8'
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Duration of a local video file in seconds (null if unknown). */
export function videoMeta(file) { return new Promise(res => { try { const u = URL.createObjectURL(file); const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(u) }; v.onerror = () => res(null); v.src = u; setTimeout(() => res(null), 6000) } catch { res(null) } }) }
