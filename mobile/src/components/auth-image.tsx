import { useEffect, useState } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageStyle } from "expo-image";
import { authHeaders, freshToken } from "../lib/api";
import { responseToDataUri } from "../lib/data-uri";
import { colors, radius } from "../lib/theme";

/**
 * Displays an image from the PinNudge API, which requires the bearer token.
 * On iOS expo-image sends the header and caches by `cacheKey`; the web preview
 * build fetches the bytes itself because <img> can't send headers.
 */
export function AuthImage({
  uri,
  cacheKey,
  style,
  accessibilityLabel,
  contentFit = "cover",
}: {
  uri: string;
  cacheKey?: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  contentFit?: "cover" | "contain";
}) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [webUri, setWebUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await freshToken();
      if (!alive) return;
      const h = authHeaders();
      if (Platform.OS !== "web") return setHeaders(h);
      try {
        const res = await fetch(uri, { headers: h });
        if (res.ok && alive) setWebUri(await responseToDataUri(res));
      } catch {
        // leave the placeholder
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri]);

  const source = Platform.OS === "web" ? (webUri ? { uri: webUri } : null) : headers ? { uri, headers, cacheKey: cacheKey ?? uri } : null;
  if (!source) return <View style={[{ backgroundColor: colors.surfaceMuted, borderRadius: radius }, style as StyleProp<ViewStyle>]} />;
  return (
    <Image
      source={source}
      style={[{ backgroundColor: colors.surfaceMuted }, style]}
      contentFit={contentFit}
      transition={150}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
