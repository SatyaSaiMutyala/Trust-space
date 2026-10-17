/* Section heading with an optional right-hand action ("All 11", "5 of 7 met", "After photo needed"). */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, vs } from '../theme';
import AppText from './AppText';

export default function SectionHeader({ title, action, actionColor = 'teal', onAction, right, style, variant = 'h2' }) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant={variant}>{title}</AppText>
      {right ? right : action ? (
        <Pressable onPress={onAction} hitSlop={8} disabled={!onAction}>
          <AppText variant={onAction ? 'bodySemi' : 'body'} color={actionColor}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: vs(20), marginBottom: vs(8), borderColor: colors.lineSoft } });
