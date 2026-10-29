// Icon fonts are loaded as native assets, which don't exist under Jest.
// A plain element carrying the icon name is enough for tests.
jest.mock("@expo/vector-icons", () => {
  const { Text } = jest.requireActual("react-native");
  const Icon = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { Ionicons: Icon };
});

// No vibration motor under Jest
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));
