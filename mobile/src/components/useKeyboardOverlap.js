/* How many points of a view the on-screen keyboard covers.
     const ref = useRef(null); const overlap = useKeyboardOverlap(ref);   <View ref={ref} style={{ paddingBottom: overlap }}>
   Measured against the view's real position in the window, so it is right on iOS and on Android edge-to-edge (where the
   window no longer shrinks for the keyboard), and it is 0 on any device that does resize the window itself — the
   keyboard then no longer overlaps the view, so nothing is added twice. iOS animates in step with the keyboard. */
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, TextInput } from 'react-native';
import { vs } from '../theme';

/** Provided by Screen and BottomSheet: { overlap: points under the keyboard, reveal(ref?): scroll a field into view }. */
export const KeyboardScope = createContext({ overlap: 0, reveal: () => {} });

const SHOW = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

function animate(e) {
  if (Platform.OS !== 'ios' || !e?.duration) return;
  LayoutAnimation.configureNext({ duration: e.duration, update: { duration: e.duration, type: LayoutAnimation.Types[e.easing] || 'keyboard' } });
}

export default function useKeyboardOverlap(ref, enabled = true) {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (!enabled) { setOverlap(0); return undefined; }
    let alive = true;
    const onShow = e => {
      const top = e?.endCoordinates?.screenY;
      const node = ref.current;
      if (!node || top == null) return;
      node.measureInWindow((x, y, w, h) => {
        if (!alive) return;
        const next = Math.max(0, Math.round(y + h - top));
        animate(e);
        setOverlap(next);
      });
    };
    const onHide = e => { animate(e); setOverlap(0); };
    const subs = [Keyboard.addListener(SHOW, onShow), Keyboard.addListener(HIDE, onHide)];
    return () => { alive = false; subs.forEach(s => s.remove()); };
  }, [ref, enabled]);
  return overlap;
}

/* Scroll a field into view inside a ScrollView while the keyboard is up.
     const overlap = useKeyboardOverlap(boxRef);
     const { reveal, onScroll, onLayout } = useReveal(scrollRef, overlap);
   reveal(ref?) — ref of the field, or of a view around it (e.g. a dropdown panel); default: the focused TextInput.
   Called before the keyboard is up (onFocus), it is remembered and done as soon as the keyboard opens; with no request,
   the focused field is revealed when the keyboard opens. Spread onScroll / onLayout (+ scrollEventThrottle) on the ScrollView. */
export function useReveal(scrollRef, overlap, enabled = true) {
  const scrollY = useRef(0);
  const viewH = useRef(0);
  const up = useRef(false);
  const pending = useRef(null);
  up.current = overlap > 0;
  const reveal = useCallback(target => {
    if (!enabled) return;
    if (target) pending.current = target;
    if (!up.current) return; // keyboard still opening — done when it is up
    const want = target || pending.current;
    // wait for the keyboard padding to be laid out before measuring
    setTimeout(() => {
      const sv = scrollRef.current;
      const inner = sv?.getInnerViewRef?.();
      const field = (want && (want.current || want)) || TextInput.State.currentlyFocusedInput?.();
      if (!sv || !inner || !field?.measureLayout || !up.current) return;
      field.measureLayout(inner, (x, y, w, h) => {
        const room = vs(20);
        const top = scrollY.current, height = viewH.current;
        if (y + h + room > top + height) sv.scrollTo({ y: Math.max(0, Math.min(y - room, y + h + room - height)), animated: true });
        else if (y - room < top) sv.scrollTo({ y: Math.max(0, y - room), animated: true });
      }, () => {}); // not inside this ScrollView (e.g. the field lives in a sheet) — nothing to do
    }, Platform.OS === 'ios' ? 60 : 140);
  }, [enabled, scrollRef]);
  // keyboard opened (or changed size): reveal the requested / focused field; closed: forget the request
  useEffect(() => { if (overlap > 0) reveal(); else pending.current = null; }, [overlap, reveal]);
  const onScroll = useCallback(e => { scrollY.current = e.nativeEvent.contentOffset.y; }, []);
  const onLayout = useCallback(e => { viewH.current = e.nativeEvent.layout.height; }, []);
  return { reveal, onScroll, onLayout };
}
