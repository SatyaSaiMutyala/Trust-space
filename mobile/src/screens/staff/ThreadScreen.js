/* Messages thread (design p.9) from GET /mobile/threads/:propertyId: pinned header with the owners' avatars, date
   pills, formal-notice and approval-request cards, bubbles with photos and files, and the composer with
   a type button (message / formal notice / approval request, picked from a sheet) and attachments. Sends with POST /messages; opening marks the other
   side's messages read. Newest message at the bottom; pull down for older ones. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors, ms, s, vs, gutter, fonts, shadows } from '../../theme';
import { Screen, AppText, IconButton, AvatarGroup, Card, Icon, Chip, MessageBubble, Footer, Skeleton, ErrorState, PhotoPickerSheet, usePhotoPicker, Arch, PickerSheet } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { joinThread, leaveThread, sendTyping } from '../../store/realtime';
import { useThreadQuery, useThreadReadMutation, useSendMessageMutation, useOneQuery, errorMessage, fileUrl } from '../../store/api';
import { uploadAll } from '../../store/uploads';

const KINDS = [{ value: 'Message', label: 'Message' }, { value: 'Notice', label: 'Formal notice' }, { value: 'Approval request', label: 'Approval request' }];
const KIND_ICON = { Message: 'message', Notice: 'file-text', 'Approval request': 'check-circle' };
const dayOf = iso => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const timeOf = iso => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
const isImg = f => (f?.type || '').startsWith('image') || /\.(png|jpe?g|webp|gif|heic)$/i.test(f?.name || '');

function DatePill({ text }) { return <View style={styles.datePill}><AppText variant="small" color="muted">{text}</AppText></View>; }

function Files({ files, mediaToken, out }) {
  if (!files || !files.length) return null;
  return (
    <View style={styles.files}>
      {files.map((f, i) => (isImg(f)
        ? <Pressable key={i} onPress={() => Linking.openURL(fileUrl(f.id, mediaToken))}><Image source={{ uri: fileUrl(f.id, mediaToken) }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors /></Pressable>
        : <Pressable key={i} onPress={() => Linking.openURL(fileUrl(f.id, mediaToken))} style={[styles.file, out && styles.fileOut]}><Icon name="file" size={18} color={out ? colors.white : colors.teal} /><AppText variant="smallSemi" color={out ? 'white' : 'teal'} numberOfLines={1} style={styles.flex}>{f.name || 'File'}</AppText></Pressable>))}
    </View>
  );
}

export default function ThreadScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId || route.params?.id;
  const { user, mediaToken } = useAppSelector(st => st.auth);
  const typing = useAppSelector(st => st.ui.typing);
  const [, tick] = useState(0);
  useEffect(() => { if (!typing || typing.propertyId !== propertyId) return undefined; const t = setTimeout(() => tick(x => x + 1), 4200); return () => clearTimeout(t); }, [typing, propertyId]);
  const someoneTyping = typing && typing.propertyId === propertyId && Date.now() - typing.at < 4000 ? typing.by : '';
  const { data, isLoading, error, refetch } = useThreadQuery({ propertyId }, { skip: !propertyId });
  const prop = useOneQuery({ resource: 'properties', id: propertyId }, { skip: !propertyId });
  const [markRead] = useThreadReadMutation();
  const [send, sState] = useSendMessageMutation();
  const [kind, setKind] = useState('Message');
  const [kindOpen, setKindOpen] = useState(false);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [pick, pickerProps] = usePhotoPicker();
  const listRef = useRef(null);
  const d = data?.data;
  const side = d?.side || (user?.role === 'owner' ? 'owner' : 'tdpl');
  // opening the thread (and coming back to it) refreshes it and marks the other side's messages read
  useFocusEffect(useCallback(() => { if (propertyId) { refetch(); markRead(propertyId); joinThread(propertyId); } return () => leaveThread(propertyId); }, [propertyId, refetch, markRead]));
  useEffect(() => { if (d && d.messages.some(m => m.from !== side && !(m.read || {})[side])) markRead(propertyId); }, [d, side, propertyId, markRead]);
  // rows for the inverted list: newest first, with a date pill after the last message of each day
  const rows = useMemo(() => {
    if (!d) return [];
    const out = []; let day = '';
    d.messages.forEach((m, i) => { const dd = dayOf(m.at); if (dd !== day) { if (i) out.push({ type: 'date', key: 'd' + day, text: day }); day = dd; } out.push({ type: 'msg', key: m.id, m }); });
    if (day) out.push({ type: 'date', key: 'd' + day, text: day });
    return out.reverse();
  }, [d]);
  const who = side === 'owner' ? 'the facilities team' : d?.people?.length > 1 ? 'the owners' : 'the owner';
  const placeholder = kind === 'Notice' ? `Formal notice to ${who}…` : kind === 'Approval request' ? `What do you need ${who} to approve?` : `Write to ${who}`;
  const attach = async () => { const got = await pick({ multiple: true, video: true, title: 'Attach' }); if (got.error) { setErr(got.error); return; } if (got.length) setFiles(x => x.concat(got)); };
  const submit = async () => {
    const t = text.trim(); if (!t && !files.length) return;
    setErr('');
    try {
      const assets = files.length ? await uploadAll(files) : [];
      const P = prop.data?.data;
      await send({ propertyId, ownerId: P?.ownerId || d?.people?.[0]?.id || '', from: side, by: user?.name || (side === 'owner' ? 'Owner' : 'Facilities'), kind, text: t || (assets.length ? `${assets.length} attachment${assets.length === 1 ? '' : 's'}` : ''), at: new Date().toISOString(), files: assets.map(a => ({ id: a.id, url: a.url, name: a.name, type: a.type })), read: { [side]: true } }).unwrap();
      setText(''); setFiles([]); setKind('Message');
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (e) { setErr(e.message && !e.status ? e.message : errorMessage(e)); }
  };
  const peopleLine = d ? d.people.map(p => p.name).filter(Boolean).join(', ') : '';
  const render = ({ item }) => {
    if (item.type === 'date') return <DatePill text={item.text} />;
    const m = item.m; const out = m.from === side; const meta = `${m.by || ''}${m.by ? ', ' : ''}${timeOf(m.at)}${out && m.read && Object.keys(m.read).some(k => k !== side && m.read[k]) ? ' · Read' : ''}`;
    if (m.kind === 'Notice') return (
      <Card borderColor={colors.deepTeal} style={styles.msgCard}>
        <View style={styles.cardHead}><Icon name="file" size={20} color={colors.deepTeal} /><AppText variant="title" color="deepTeal">Formal notice</AppText></View>
        <AppText variant="body" style={styles.cardBody}>{m.text}</AppText>
        <Files files={m.files} mediaToken={mediaToken} />
        <AppText variant="small" color="muted" style={styles.meta}>{meta}</AppText>
      </Card>
    );
    if (m.kind === 'Approval request') return (
      <Card borderColor="#C3D2EC" style={styles.msgCard}>
        <View style={[styles.cardHead, styles.between]}>
          <View style={styles.cardHead}><Icon name="check-circle" size={20} color={colors.blue} /><AppText variant="title" color="blue">Approval request</AppText></View>
          <Chip label={out ? 'Sent' : 'For you'} tone={out ? 'grey' : 'blue'} dot={false} size="sm" />
        </View>
        <AppText variant="body" style={styles.cardBody}>{m.text}</AppText>
        <Files files={m.files} mediaToken={mediaToken} />
        <AppText variant="small" color="muted" style={styles.meta}>{meta}</AppText>
      </Card>
    );
    return (
      <View style={[styles.bubbleWrap, out && styles.bubbleOut]}>
        <MessageBubble side={out ? 'out' : 'in'} text={m.text} meta={meta} style={styles.bubble} />
        {(m.files || []).length ? <View style={[styles.filesWrap, out && styles.filesOut]}><Files files={m.files} mediaToken={mediaToken} out={out} /></View> : null}
      </View>
    );
  };
  return (
    <Screen padded={false} scroll={false} bg="canvas" topBg="surface" header={(
      <View style={[styles.head, shadows.card]}>
        <IconButton name="chevron-left" onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))} iconSize={24} accessibilityLabel="Back" />
        <Pressable style={styles.headMain} onPress={() => nav.navigate('PropertyDetail', { id: propertyId })} accessibilityRole="button" accessibilityLabel="Open property">
          <AvatarGroup people={(d?.people || [{ initials: '?' }]).map(p => ({ initials: p.initials }))} size={40} />
          <View style={styles.headText}>
            <AppText variant="title" numberOfLines={1}>{d?.title || prop.data?.data?.name || 'Messages'}</AppText>
            <View style={styles.headSub}>
              {someoneTyping ? <View style={styles.online} /> : null}
              <AppText variant="caption" color={someoneTyping ? 'teal' : 'muted'} numberOfLines={1}>{someoneTyping ? `${someoneTyping} is typing…` : peopleLine ? `${peopleLine}${d.people.length > 1 ? ` · ${d.people.length} owners` : ''}` : d?.code || ''}</AppText>
            </View>
          </View>
        </Pressable>
        <IconButton name="building" variant="mist" size={40} iconSize={20} onPress={() => nav.navigate('PropertyDetail', { id: propertyId })} accessibilityLabel="Open property" />
      </View>
    )} footer={(
      <Footer stacked flat hint={err || undefined} hintColor="coralInk">
        {kind !== 'Message' ? (
          <Pressable onPress={() => setKindOpen(true)} style={styles.kindRow} accessibilityRole="button" accessibilityLabel="Change message type">
            <Chip label={kind === 'Notice' ? 'Formal notice' : 'Approval request'} tone={kind === 'Notice' ? 'amber' : 'teal'} />
            <AppText variant="caption" color="muted">Sending as · tap to change</AppText>
          </Pressable>
        ) : null}
        {files.length ? (
          <View style={styles.pending}>
            {files.map((f, i) => <Pressable key={i} onPress={() => setFiles(x => x.filter((_, j) => j !== i))} accessibilityLabel="Remove attachment"><Arch photo width={48} height={52} bottomRadius={10} uri={f.uri}><View style={styles.removeChip}><Icon name="x" size={12} color={colors.white} strokeWidth={2.6} /></View></Arch></Pressable>)}
            <AppText variant="caption" color="muted">{files.length} attachment{files.length === 1 ? '' : 's'} · tap to remove</AppText>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <IconButton name={KIND_ICON[kind]} variant={kind === 'Message' ? 'sunk' : 'mist'} size={46} iconSize={22} onPress={() => setKindOpen(true)} accessibilityLabel="Message type" />
          <View style={styles.composer}>
            <IconButton name="paperclip" size={36} iconSize={20} color={colors.muted} onPress={attach} accessibilityLabel="Attach" style={styles.clip} />
            <TextInput value={text} onChangeText={v => { setText(v); if (v) sendTyping(propertyId); }} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} multiline accessibilityLabel="Message" />
          </View>
          <IconButton name="arrow-right" variant="teal" size={46} iconSize={22} onPress={submit} accessibilityLabel="Send" disabled={sState.isLoading} />
        </View>
      </Footer>
    )}>
      {isLoading ? <View style={styles.list}><Skeleton h={60} r={20} /><Skeleton h={60} r={20} style={styles.skelRight} /><Skeleton h={100} r={20} /></View>
        : error && !d ? <View style={styles.list}><ErrorState title="Couldn't load this conversation" body={errorMessage(error)} action="Try again" onAction={refetch} /></View>
          : <FlatList ref={listRef} data={rows} inverted keyExtractor={r => r.key} renderItem={render} contentContainerStyle={styles.list} keyboardDismissMode="none" keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<View style={styles.emptyFlip}><AppText variant="body" color="muted" center>No messages yet. Start the conversation below.</AppText></View>} />}
      <PhotoPickerSheet {...pickerProps} />
      <PickerSheet open={kindOpen} onClose={() => setKindOpen(false)} title="Send as" options={KINDS} value={kind} onSelect={setKind} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: s(6), paddingLeft: s(6), paddingRight: s(14), paddingTop: vs(4), paddingBottom: vs(10), backgroundColor: colors.white, borderBottomLeftRadius: ms(24), borderBottomRightRadius: ms(24), zIndex: 2 },
  headMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(10) },
  headText: { flex: 1 },
  headSub: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginTop: vs(1) },
  online: { width: ms(7), height: ms(7), borderRadius: ms(4), backgroundColor: colors.teal },
  list: { paddingHorizontal: gutter, paddingVertical: vs(18), gap: vs(14) },
  skelRight: { alignSelf: 'flex-end', width: '70%' },
  emptyFlip: { transform: [{ scaleY: -1 }], paddingVertical: vs(40) },
  datePill: { alignSelf: 'center', backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: s(14), paddingVertical: vs(6) },
  msgCard: { backgroundColor: colors.white, marginLeft: s(26) },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  between: { justifyContent: 'space-between' },
  cardBody: { marginTop: vs(8), fontSize: ms(15) },
  meta: { marginTop: vs(10) },
  bubbleWrap: { alignItems: 'flex-start' },
  bubbleOut: { alignItems: 'flex-end' },
  bubble: {},
  filesWrap: { maxWidth: '78%', marginTop: vs(6) },
  filesOut: { alignItems: 'flex-end' },
  files: { gap: vs(6) },
  image: { width: s(220), height: vs(160), borderRadius: ms(16), backgroundColor: colors.photo },
  file: { flexDirection: 'row', alignItems: 'center', gap: s(8), backgroundColor: colors.white, borderRadius: ms(14), paddingHorizontal: s(12), paddingVertical: vs(10), maxWidth: s(240) },
  fileOut: { backgroundColor: colors.teal },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: vs(8) },
  pending: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: vs(10), flexWrap: 'wrap' },
  removeChip: { position: 'absolute', top: 4, right: 4, width: ms(18), height: ms(18), borderRadius: ms(9), backgroundColor: 'rgba(16,32,30,0.8)', alignItems: 'center', justifyContent: 'center' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s(10) },
  // one rounded field: clip inside on the left, text beside it; the send circle sits outside and matches the field's height
  composer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: ms(46), maxHeight: vs(130), borderRadius: ms(23), backgroundColor: colors.sunk, paddingLeft: s(6), paddingRight: s(16), paddingVertical: ms(5) },
  clip: { marginBottom: 0 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: ms(15), lineHeight: ms(20), color: colors.ink, paddingVertical: ms(8), paddingTop: ms(8), maxHeight: vs(110) },
  flex: { flex: 1 },
});
