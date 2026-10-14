import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Newsreader_400Regular_Italic, Newsreader_500Medium } from "@expo-google-fonts/newsreader";
import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { AuthProvider, useAuth } from "../lib/auth";
import { colors, fonts } from "../lib/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { status } = useAuth();
  useEffect(() => {
    if (status !== "loading") void SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);
  if (status === "loading") return null;
  const signedIn = status === "signedIn";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="products/new" options={{ title: "New product", presentation: "modal" }} />
        <Stack.Screen name="products/[id]" options={{ title: "Product" }} />
        <Stack.Screen name="campaigns/new" options={{ title: "New campaign", presentation: "modal" }} />
        <Stack.Screen name="campaigns/[id]" options={{ title: "Campaign" }} />
        <Stack.Screen name="pins/[id]" options={{ title: "Edit pin" }} />
        <Stack.Screen name="account/delete" options={{ title: "Delete account", presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Newsreader_500Medium,
    Newsreader_400Regular_Italic,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    Caveat_600SemiBold,
  });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
