import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { AuthImage } from "../../components/auth-image";
import { CampaignRow } from "../../components/campaign-row";
import { ProductForm, draftFrom, draftToBody, type ProductDraft } from "../../components/product-form";
import { Button, Eyebrow, Heading, IconButton, Loading, Muted, Notice, Screen } from "../../components/ui";
import { api, ApiError, productImageUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { confirm } from "../../lib/confirm";
import { imagesForm, pickImages } from "../../lib/images";
import { radius } from "../../lib/theme";
import { errorMessage, useApi } from "../../lib/use-api";
import { categoryLabel } from "../../shared/constants";
import type { CampaignSummary, Product } from "../../shared/domain";

const MAX_IMAGES = 6;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshAccount } = useAuth();
  const { data, setData, error, loading, refreshing, refresh } = useApi<{ product: Product; campaigns: CampaignSummary[] }>(`/products/${id}`);
  const product = data?.product;
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);


  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: "danger", text: errorMessage(e) });
      if (e instanceof ApiError) setErrors(e.fieldErrors);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (!product) return <Screen>{error ? <Notice tone="danger">{error.message}</Notice> : null}</Screen>;

  const startEditing = () => {
    setDraft(draftFrom(product));
    setErrors({});
    setEditing(true);
  };

  const save = () =>
    run("save", async () => {
      if (!draft) return;
      setErrors({});
      const updated = await api.put<Product>(`/products/${product.id}`, draftToBody(draft, product));
      setData({ ...data!, product: updated });
      setEditing(false);
      setMessage({ tone: "success", text: "Product saved." });
    });

  const addImages = () =>
    run("images", async () => {
      const picked = await pickImages(MAX_IMAGES - product.images.length);
      if (!picked.length) return;
      const updated = await api.upload<Product>(`/products/${product.id}/images`, await imagesForm(picked));
      setData({ ...data!, product: updated });
    });

  const removeImage = (index: number) =>
    run(`img-${index}`, async () => {
      if (!(await confirm("Remove this photo?", "Pins that use it will fall back to another photo or none.", "Remove", true))) return;
      const updated = await api.del<Product>(`/products/${product.id}/images/${index}`);
      setData({ ...data!, product: updated });
    });

  const remove = () =>
    run("delete", async () => {
      if (!(await confirm("Delete this product?", "Its photos are deleted too. Campaigns made from it are kept.", "Delete", true))) return;
      await api.del(`/products/${product.id}`);
      void refreshAccount().catch(() => undefined);
      router.back();
    });

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      footer={
        editing && draft ? (
          <Button label="Save changes" size="lg" onPress={save} loading={busy === "save"} disabled={!draft.name.trim()} />
        ) : (
          <Button label="Create a campaign" icon="zap" variant="accent" size="lg" onPress={() => router.push({ pathname: "/campaigns/new", params: { product: product.id } })} />
        )
      }
    >
      <Stack.Screen options={{ title: product.isSample ? "Sample product" : "Product", headerRight: () => <IconButton icon={editing ? "x" : "edit-2"} label={editing ? "Cancel editing" : "Edit product"} onPress={() => (editing ? setEditing(false) : startEditing())} /> }} />
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <ScrollView horizontal contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>
        {product.images.map((img, i) => (
          <View key={img.path}>
            <AuthImage uri={productImageUrl(product.id, i)} cacheKey={img.path} style={{ width: 120, height: 120, borderRadius: radius }} accessibilityLabel={`Product photo ${i + 1}`} />
            <View style={{ position: "absolute", top: 4, right: 4 }}>
              <IconButton icon="trash-2" label={`Remove photo ${i + 1}`} onPress={() => removeImage(i)} disabled={busy !== null} />
            </View>
          </View>
        ))}
        {product.images.length < MAX_IMAGES ? <Button label="Add photos" icon="image" variant="secondary" onPress={addImages} loading={busy === "images"} style={{ alignSelf: "center" }} /> : null}
      </ScrollView>

      {editing && draft ? (
        <ProductForm draft={draft} onChange={setDraft} errors={errors} />
      ) : (
        <View style={{ gap: 8 }}>
          <Heading>{product.name}</Heading>
          <Muted>{categoryLabel(product.category)}</Muted>
          {product.mainBenefit ? <Muted style={{ color: "#13203a", fontSize: 16, lineHeight: 23 }}>{product.mainBenefit}</Muted> : null}
          {product.keywords.length ? <Muted>Keywords: {product.keywords.join(", ")}</Muted> : null}
        </View>
      )}

      <View style={{ gap: 12 }}>
        <Eyebrow>Campaigns from this product</Eyebrow>
        {data!.campaigns.length ? data!.campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />) : <Muted>None yet.</Muted>}
      </View>
      <Button label="Delete product" variant="danger" icon="trash-2" onPress={remove} loading={busy === "delete"} />
    </Screen>
  );
}
