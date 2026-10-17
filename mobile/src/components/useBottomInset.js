/* Bottom system inset, read from the device (never hard-coded or scaled).
   - 0            older iPhones / no bar
   - 16–34        gesture areas (iPhone home indicator 34, Android gesture nav ~16–24): nothing opaque is drawn, so a
                  floating element may sit a little into it for a compact look
   - > 34         Android 3-button navigation (48): an opaque button bar — pad the full amount, always.
   Returns { inset, opaque, gap(min) } where gap(min) is the distance a floating element should keep from the screen
   edge: full inset + min above an opaque bar, otherwise at least `min`, trimming only the gesture area. */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const GESTURE_MAX = 34;

export default function useBottomInset() {
  const { bottom } = useSafeAreaInsets();
  const opaque = bottom > GESTURE_MAX;
  return {
    inset: bottom,
    opaque,
    gap: (min = 0) => (opaque ? bottom + min : Math.max(min, bottom - 12)),
    /** Padding to put INSIDE a bottom container (footer, sheet): the full inset above an opaque bar, else at least `min`. */
    pad: (min = 0) => (opaque ? bottom : Math.max(min, bottom)),
  };
}
