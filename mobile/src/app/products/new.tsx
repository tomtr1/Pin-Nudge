import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ProductForm, draftFrom, draftToBody } from "../../components/product-form";
import { Button, IconButton, Muted, Notice, Row, Screen } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { imagesForm, pickImages, type PickedImage } from "../../lib/images";
import { radius } from "../../lib/theme";
import { errorMessage } from "../../lib/use-api";

const MAX_IMAGES = 6;

export default function NewProduct() {
  const { refreshAccount } = useAuth();
  const [draft, setDraft] = useState(draftFrom());
  const [images, setImages] = useState<PickedImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addImages = async () => setImages([...images, ...(await pickImages(MAX_IMAGES - images.length))]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const { id } = await api.post<{ id: string }>("/products", draftToBody(draft));
      if (images.length) {
        try {
          await api.upload(`/products/${id}/images`, await imagesForm(images));
        } catch (e) {
          setError(`Your product was saved, but the photos didn't upload: ${errorMessage(e)} You can add them from the product page.`);
          router.replace(`/products/${id}`);
          return;
        }
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void refreshAccount().catch(() => undefined);
      router.replace(`/products/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label="Save product" size="lg" onPress={save} loading={busy} disabled={!draft.name.trim()} />}>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Muted>Product photos (PNG or JPEG, up to {MAX_IMAGES})</Muted>
        </Row>
        <ScrollView horizontal contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>
          {images.map((img, i) => (
            <View key={img.uri} style={{ position: "relative" }}>
              <Image source={{ uri: img.uri }} style={{ width: 96, height: 96, borderRadius: radius }} accessibilityLabel={`Photo ${i + 1}`} />
              <View style={{ position: "absolute", top: 4, right: 4 }}>
                <IconButton icon="x" label={`Remove photo ${i + 1}`} onPress={() => setImages(images.filter((_, j) => j !== i))} />
              </View>
            </View>
          ))}
          {images.length < MAX_IMAGES ? <Button label="Add photos" icon="image" variant="secondary" onPress={addImages} style={{ alignSelf: "center" }} /> : null}
        </ScrollView>
        {errors.images ? <Notice tone="danger">{errors.images}</Notice> : null}
      </View>
      <ProductForm draft={draft} onChange={setDraft} errors={errors} />
    </Screen>
  );
}
