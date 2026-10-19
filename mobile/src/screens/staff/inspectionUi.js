/* Small helpers shared by the inspection screens: tones, labels, photo sources. */
import { fileUrl } from '../../store/api';

export const STATUS_TONE = { 'Not started': 'grey', 'In progress': 'blue', 'Awaiting owner sign-off': 'amber', Disputed: 'coral', Signed: 'teal' };
export const STATUS_LABEL = { 'Not started': 'Not started', 'In progress': 'In progress', 'Awaiting owner sign-off': 'Owner to sign', Disputed: 'Disputed', Signed: 'Completed' };
export const COND_TONE = { Good: 'teal', 'Minor issue': 'amber', Damaged: 'coral', Missing: 'coral', 'N/A': 'grey' };
/** Who bears the cost of a handover defect, as the phone shows it (the record keeps the web's values). */
export const RESP_OPTIONS = [{ label: 'Wear & tear', value: 'Fair wear & tear' }, { label: 'From deposit', value: 'TrustLab' }, { label: 'Owner', value: 'Owner' }];
export const RESP_LABEL = { 'Fair wear & tear': 'Fair wear & tear', TrustLab: 'From the deposit', Owner: 'Owner' };
export const kindLabel = kind => (kind === 'Move-out' ? 'handover' : 'take-over');
/** Image source for a stored photo ({ id, url }) or one still on the phone ({ local, uri }). */
export const photoUri = (p, mediaToken) => (p ? (p.local ? p.uri : p.id ? fileUrl(p.id, mediaToken) : null) : null);
/** "Oct 19, 11:52" from an ISO time. */
export const fmtTime = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
export const itemValue = it => (it.type === 'count' || it.type === 'reading' ? it.val : '');
export const itemDone = it => (it.type === 'count' || it.type === 'reading' ? String(it.val ?? '').trim() !== '' : !!it.cond);
/** First item of the whole checklist that is not recorded yet. */
export const firstTodo = view => { for (const s of view?.sections || []) { const it = s.items.find(x => !itemDone(x)); if (it) return it; } return null; };
export const secs = n => `${Math.round(n || 0)} s`;
