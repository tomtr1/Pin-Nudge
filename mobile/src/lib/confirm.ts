import { Alert, Platform } from "react-native";

/** Native confirmation dialog (window.confirm in the web preview build). */
export function confirm(title: string, message: string, confirmLabel = "OK", destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]),
  );
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") return void globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  Alert.alert(title, message);
}
