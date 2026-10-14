import Tabs from "expo-router/js-tabs";
import type { ColorValue } from "react-native";
import { Icon, type IconName } from "../../components/ui";
import { colors, fonts } from "../../lib/theme";

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} size={22} color={String(color)} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#8a90a0",
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab("Home", "home"), headerShown: false }} />
      <Tabs.Screen name="products" options={tab("Products", "package")} />
      <Tabs.Screen name="campaigns" options={tab("Campaigns", "layers")} />
      <Tabs.Screen name="calendar" options={tab("Calendar", "calendar")} />
      <Tabs.Screen name="account" options={tab("Account", "user")} />
    </Tabs>
  );
}
