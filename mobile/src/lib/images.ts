import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface PickedImage {
  uri: string;
  name: string;
  type: "image/jpeg" | "image/png";
}

/**
 * Lets the user choose product photos. HEIC photos are transcoded to JPEG
 * ("compatible" representation) because the server accepts PNG and JPEG only.
 * The system picker runs out of process, so no Photos permission is needed.
 */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.85,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((a, i) => {
    const png = a.mimeType === "image/png" || /\.png$/i.test(a.fileName ?? "");
    return { uri: a.uri, name: png ? `photo-${i + 1}.png` : `photo-${i + 1}.jpg`, type: png ? "image/png" : "image/jpeg" };
  });
}

/** Builds the multipart body for POST /products/:id/images. */
export async function imagesForm(images: PickedImage[]): Promise<FormData> {
  const form = new FormData();
  for (const img of images) {
    if (Platform.OS === "web") {
      const blob = await (await fetch(img.uri)).blob();
      form.append("images", blob, img.name);
    } else {
      // React Native's FormData streams the file from its URI.
      form.append("images", { uri: img.uri, name: img.name, type: img.type } as unknown as Blob);
    }
  }
  return form;
}
