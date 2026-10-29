import * as Haptics from "expo-haptics";

// Haptics are a nice extra, never essential. If the device has no vibration
// motor or the call fails for any reason, carry on silently.
const safely = (run: () => Promise<void>) => {
  run().catch(() => {});
};

export const haptics = {
  /** An order went through. */
  filled: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** An order or stop-loss was refused. */
  rejected: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** A stop-loss closed the position. */
  stopHit: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A small tick for picking an option, like the replay speed. */
  selection: () => safely(() => Haptics.selectionAsync()),
};
