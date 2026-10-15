/* Photos, videos, documents and the façade placeholder. */
import { useState } from 'react'
import { zoom } from '../../store/store'
import { fileUrl, isVid, isImg } from '../../services/files'

/** Drawn shop-front used when a property has no front-view photo. sub='' hides the caption. */
export function Facade({ name, sub }) {
  const nm = String(name || '').toUpperCase().slice(0, 26)
  return (
    <svg className="facade" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" role="img" aria-label="No front-view photo yet">
      <rect width="320" height="140" fill="var(--sunk)" />
      <rect x="40" y="18" width="240" height="122" fill="var(--surface)" stroke="var(--line)" />
      <rect x="52" y="28" width="216" height="26" rx="3" fill="var(--accent)" />
      <circle cx="66" cy="41" r="6" fill="var(--sun)" />
      <text x="78" y="45.5" fontSize="11" fontWeight="700" fill="var(--accent-ink)" fontFamily="Bricolage Grotesque, sans-serif">{nm}</text>
      <rect x="60" y="66" width="70" height="74" fill="var(--sunk)" stroke="var(--line)" />
      <line x1="95" y1="66" x2="95" y2="140" stroke="var(--line)" />
      <rect x="146" y="66" width="114" height="44" fill="var(--sunk)" stroke="var(--line)" />
      {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1="146" y1={72 + i * 7} x2="260" y2={72 + i * 7} stroke="var(--line)" />)}
      {sub === '' ? null : <text x="160" y="128" fontSize="9.5" fill="var(--muted)" fontFamily="IBM Plex Sans, sans-serif">{sub || 'Front-view photo not added'}</text>}
    </svg>
  )
}

/** Photo or video thumbnail that opens the lightbox. */
export function Media({ f, alt }) {
  const src = fileUrl(f)
  if (isVid(f)) {
    return (
      <span className="vthumb" role="button" tabIndex={0} aria-label={`Play video ${alt || ''}`} onClick={() => zoom(src, true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoom(src, true) } }}>
        <video src={src + '#t=0.5'} muted playsInline preload="metadata" /><i aria-hidden="true">▶</i>
      </span>
    )
  }
  return <img src={src} alt={alt || ''} onClick={() => zoom(src)} />
}

/** Row of thumbnails (documents render as links). onRemove(index) shows a × on each. */
export function PhotoStrip({ files, empty = 'No photos', onRemove, children }) {
  if ((!files || !files.length) && !children) return <div className="photos"><div className="ph0">{empty}</div></div>
  return (
    <div className="photos">
      {(files || []).map((f, i) => {
        const node = isImg(f) ? <Media f={f} alt={f.name || 'photo'} /> : <a className="file" href={fileUrl(f)} target="_blank" rel="noopener noreferrer">📄 {f.name || 'file'}</a>
        return onRemove ? <span className="pwrap" key={f.id || i}>{node}<button type="button" className="px" onClick={() => onRemove(i)} aria-label="Remove photo">×</button></span> : <span key={f.id || i} style={{ display: 'contents' }}>{node}</span>
      })}
      {children}
    </div>
  )
}

/** Dashed “＋ Photo / ＋ Video” tile that opens the camera on phones. onFiles(FileList) may be async. */
export function AddMedia({ onFiles, video, multiple = !video, need, label, capture = 'environment' }) {
  const [busy, setBusy] = useState(false)
  return (
    <label className={`addph ${need ? 'need' : ''} ${video ? 'vid' : ''}`}>
      {busy ? 'Uploading…' : label || (video ? '＋ Video' : '＋ Photo')}
      <input type="file" hidden accept={video ? 'video/*' : 'image/*'} capture={capture} multiple={multiple}
        onChange={async e => { const fl = e.target.files; if (!fl?.length) return; setBusy(true); try { await onFiles(fl) } finally { setBusy(false); e.target.value = '' } }} />
    </label>
  )
}

/** Document links (PDF / file). */
export function FileLinks({ files }) {
  return <>{(files || []).map((f, i) => <a key={f.id || i} className="file" href={fileUrl(f)} target="_blank" rel="noopener noreferrer" style={{ marginRight: 6 }}>{(f.type || '').includes('pdf') ? 'PDF' : 'File'} · {f.name || 'document'}</a>)}</>
}
