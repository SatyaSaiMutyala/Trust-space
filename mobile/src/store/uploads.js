/* Uploads to POST /api/assets (multipart, field "file"), the same endpoint the web uses. Photos, videos and PDFs up to
   20 MB. Returns { id, url, name, type, size }; the id is what records store (ticket photos, site photos, invoice files). */
import { API_URL } from '../config/env';
import { store } from './index';

export async function uploadAsset({ uri, type, name }, onProgress, tokenOverride) {
  const token = tokenOverride || store.getState().auth.accessToken;
  const form = new FormData();
  form.append('file', { uri, type: type || 'image/jpeg', name: name || `photo-${Date.now()}.jpg` });
  const res = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); // XHR for upload progress; fetch has none
    xhr.open('POST', `${API_URL}/assets`);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('accept', 'application/json');
    xhr.timeout = 120000;
    if (onProgress && xhr.upload) xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => { let body = {}; try { body = JSON.parse(xhr.responseText); } catch (e) { /* not json */ } resolve({ status: xhr.status, body }); };
    xhr.onerror = () => reject(Object.assign(new Error('Could not reach the server. Check your connection and try again.'), { network: true }));
    xhr.ontimeout = () => reject(Object.assign(new Error('The upload took too long. Try a smaller photo or a better connection.'), { network: true }));
    xhr.send(form);
  });
  if (res.status >= 400) throw new Error(res.body.message || 'Upload failed.');
  return res.body.data;
}

/** Upload several picked files in turn; returns the asset records in order. Skips none: a failure throws. */
export async function uploadAll(files, onEach) {
  const out = [];
  for (let i = 0; i < files.length; i++) { out.push(await uploadAsset(files[i], p => onEach && onEach(i, p))); }
  return out;
}
