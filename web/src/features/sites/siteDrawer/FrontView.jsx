/* Front view with walk-around videos (frontSec). */
import { useState } from 'react'
import { zoom } from '../../../store/store'
import { fileUrl } from '../../../services/files'
import { Panel, Btn } from '../../../components/ui/Layout'
import { StatusChip } from '../../../components/ui/Status'
import { Facade } from '../../../components/ui/Media'
import { onSfront, onSphoto } from './siteActions'
import { H3, SitePhotos } from './parts'

function UploadBtn({ label, accept, primary, sm, onFiles }) {
  const [busy, setBusy] = useState(false)
  return (
    <Btn component="label" primary={primary} sm={sm}>
      {busy ? 'Uploading…' : label}
      <input type="file" hidden accept={accept} capture="environment" onChange={async e => { const fl = e.target.files; if (!fl?.length) return; setBusy(true); try { await onFiles(fl) } finally { setBusy(false); e.target.value = '' } }} />
    </Btn>
  )
}

export default function FrontView({ st }) {
  const src = st.frontPhoto ? fileUrl(st.frontPhoto) : ''
  return (
    <Panel id="it-__front" title={<H3>Front view</H3>} sub="Required. Shown as the property picture once the site moves to agreement." actions={st.frontPhoto ? <StatusChip label="Added" k="ok" /> : <StatusChip label="Required" k="bad" />}>
      <div className="front">{st.frontPhoto ? <img src={src} alt="Front view" onClick={() => zoom(src)} /> : <Facade name={st.name || 'New site'} />}</div>
      <div className="actions" style={{ marginTop: 10 }}>
        <UploadBtn label={st.frontPhoto ? 'Replace front view' : 'Take front-view photo'} primary={!st.frontPhoto} sm={!!st.frontPhoto} accept="image/*" onFiles={fl => onSfront(st, fl)} />
        <UploadBtn label="＋ Walk-around video" sm accept="video/*" onFiles={fl => onSphoto(st, '__frontvid', fl)} />
      </div>
      {(st.frontVideos || []).length ? <SitePhotos st={st} k="__frontvid" files={st.frontVideos} noAdd alt="Walk-around video" removeLabel="Remove video" sx={{ mt: 1 }} /> : null}
    </Panel>
  )
}
