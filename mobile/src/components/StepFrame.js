/* Multi-step form frame: back, "Step 3 of 7" eyebrow, progress bars, title, intro, body, footer buttons. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ms, vs } from '../theme';
import AppText from './AppText';
import Button from './Button';
import Footer from './Footer';
import Header from './Header';
import Screen from './Screen';
import { ProgressSegments } from './Progress';

export default function StepFrame({ step, steps, title, intro, children, nextTitle = 'Continue', onNext, backTitle, onBack, hint, nextLoading, nextDisabled, headerRight }) {
  return (
    <Screen footer={(
      <Footer hint={hint}>
        {backTitle ? <Button title={backTitle} variant="secondary" onPress={onBack} /> : null}
        <Button title={nextTitle} variant="primary" full onPress={onNext} loading={nextLoading} disabled={nextDisabled} />
      </Footer>
    )}>
      <Header right={headerRight} />
      <AppText variant="small" color="muted" style={styles.eyebrow}>Step {step} of {steps}</AppText>
      <ProgressSegments items={Array.from({ length: steps }).map((_, i) => ({ value: i < step ? 1 : 0 }))} height={5} gap={5} style={styles.bars} />
      <AppText variant="h1" style={styles.title}>{title}</AppText>
      {intro ? <AppText variant="body" color="muted" style={styles.intro}>{intro}</AppText> : null}
      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: vs(2) },
  bars: { marginTop: vs(8) },
  title: { marginTop: vs(16) },
  intro: { marginTop: vs(8), fontSize: ms(15) },
  body: { marginTop: vs(18) },
});
