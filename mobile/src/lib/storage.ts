import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Session tokens live in the iOS Keychain (expo-secure-store), readable only
 * while the device is unlocked and never synced to other devices. The web
 * build (used only for development previews) falls back to localStorage.
 */
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key, options);
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // storage unavailable (private mode): the session lasts for this tab only
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, options);
}

export async function deleteSecret(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key, options);
}
