/* Messages thread (design p.9): stacked avatars header, date pills, formal-notice card, approval-request card,
   bubbles with a photo, composer with Message / Notice / Approval request pills. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter, fonts, shadows } from '../../theme';
import { Screen, AppText, IconButton, AvatarGroup, Card, Icon, Chip, MessageBubble, Footer } from '../../components';
import { thread } from '../../mock/data';

function DatePill({ text }) { return <View style={styles.datePill}><AppText variant="small" color="muted">{text}</AppText></View>; }

export default function ThreadScreen() {
  const nav = useNavigation();
  const [mode, setMode] = useState('Message');
  const [text, setText] = useState('');
  return (
    <Screen padded={false} bg="canvas" topBg="surface" header={(
      <View style={[styles.head, shadows.card]}>
        <IconButton name="chevron-left" onPress={() => nav.goBack()} iconSize={24} accessibilityLabel="Back" />
        <Pressable style={styles.headMain} onPress={() => nav.navigate('PropertyDetail')} accessibilityRole="button" accessibilityLabel="Open property">
          <AvatarGroup people={thread.avatars} size={40} />
          <View style={styles.headText}>
            <AppText variant="title" numberOfLines={1}>{thread.title}</AppText>
            <View style={styles.headSub}>
              <View style={styles.online} />
              <AppText variant="caption" color="muted" numberOfLines={1}>{thread.people} · 2 owners</AppText>
            </View>
          </View>
        </Pressable>
        <IconButton name="building" variant="mist" size={40} iconSize={20} onPress={() => nav.navigate('PropertyDetail')} accessibilityLabel="Open property" />
      </View>
    )} footer={(
      <Footer stacked flat>
        <View style={styles.modes}>
          {['Message', 'Notice', 'Approval request'].map(m => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.mode, mode === m && styles.modeOn]} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
              <AppText variant="title" color={mode === m ? 'teal' : 'muted'}>{m}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.composerRow}>
          <IconButton name="paperclip" onPress={() => {}} accessibilityLabel="Attach" />
          <View style={styles.composer}>
            <TextInput value={text} onChangeText={setText} placeholder="Write to the owners" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Write to the owners" />
          </View>
          <IconButton name="arrow-right" variant="teal" size={54} iconSize={24} onPress={() => setText('')} accessibilityLabel="Send" />
        </View>
      </Footer>
    )}>
      <View style={styles.list}>
        {thread.items.map((m, i) => {
          if (m.type === 'date') return <DatePill key={i} text={m.text} />;
          if (m.type === 'notice') return (
            <Card key={i} borderColor={colors.deepTeal} style={styles.msgCard}>
              <View style={styles.cardHead}><Icon name="file" size={20} color={colors.deepTeal} /><AppText variant="title" color="deepTeal">Formal notice</AppText></View>
              <AppText variant="h4" weight="semibold" style={styles.cardTitle}>{m.title}</AppText>
              <AppText variant="body" color="muted" style={styles.cardBody}>{m.text}</AppText>
              <Pressable hitSlop={6}><AppText variant="title" color="teal" style={styles.file}>{m.file}</AppText></Pressable>
              <AppText variant="small" color="muted" style={styles.meta}>{m.meta}</AppText>
            </Card>
          );
          if (m.type === 'approval') return (
            <Card key={i} borderColor="#C3D2EC" style={styles.msgCard}>
              <View style={[styles.cardHead, styles.between]}>
                <View style={styles.cardHead}><Icon name="check-circle" size={20} color={colors.blue} /><AppText variant="title" color="blue">Approval request</AppText></View>
                <Chip label={m.status} tone="teal" dot={false} />
              </View>
              <AppText variant="h4" weight="semibold" style={styles.cardTitle}>{m.title}</AppText>
              <AppText variant="mono" style={styles.cardBody}>{m.text}</AppText>
              <AppText variant="small" color="muted" style={styles.meta}>{m.meta}</AppText>
            </Card>
          );
          return <MessageBubble key={i} side={m.type} text={m.text} image={m.image} meta={m.meta} style={styles.bubble} />;
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: s(6), paddingLeft: s(6), paddingRight: s(14), paddingTop: vs(4), paddingBottom: vs(10), backgroundColor: colors.white, borderBottomLeftRadius: ms(24), borderBottomRightRadius: ms(24), zIndex: 2 },
  headMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(10) },
  headText: { flex: 1 },
  headSub: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginTop: vs(1) },
  online: { width: ms(7), height: ms(7), borderRadius: ms(4), backgroundColor: colors.teal },
  list: { paddingHorizontal: gutter, paddingTop: vs(18), gap: vs(14) },
  datePill: { alignSelf: 'center', backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: s(14), paddingVertical: vs(6) },
  msgCard: { backgroundColor: colors.white, marginLeft: s(26) },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  between: { justifyContent: 'space-between' },
  cardTitle: { marginTop: vs(10), fontSize: ms(17) },
  cardBody: { marginTop: vs(6), fontSize: ms(15) },
  file: { marginTop: vs(10) },
  meta: { marginTop: vs(10) },
  bubble: {},
  modes: { flexDirection: 'row', gap: s(6), marginBottom: vs(10) },
  mode: { paddingHorizontal: s(14), height: vs(40), borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: colors.tealTint },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  composer: { flex: 1, height: vs(54), borderRadius: 999, backgroundColor: colors.sunk, paddingHorizontal: s(18), justifyContent: 'center' },
  input: { fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
});
