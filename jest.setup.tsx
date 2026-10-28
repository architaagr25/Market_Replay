// Icon fonts are loaded as native assets, which don't exist under Jest.
// A plain element carrying the icon name is enough for tests.
jest.mock("@expo/vector-icons", () => {
  const { Text } = jest.requireActual("react-native");
  const Icon = ({ name }: { name: string }) => <Text>{name}</Text>;
  return { Ionicons: Icon };
});
