import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { AuthImage } from "../../components/auth-image";
import { Body, Button, Card, Empty, Icon, IconButton, Loading, Muted, Notice, Row, Screen } from "../../components/ui";
import { api, productImageUrl } from "../../lib/api";
import { colors, radius } from "../../lib/theme";
import { errorMessage, useApi } from "../../lib/use-api";
import { categoryLabel } from "../../shared/constants";
import type { Product } from "../../shared/domain";

export default function Products() {
  const { data, error, loading, refreshing, refresh, reload } = useApi<Product[]>("/products");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const addSample = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const { id } = await api.post<{ id: string }>("/products/sample");
      await reload();
      router.push(`/products/${id}`);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Tabs.Screen options={{ headerRight: () => <View style={{ marginRight: 16 }}><IconButton icon="plus" label="Add product" onPress={() => router.push("/products/new")} /></View> }} />
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {actionError ? <Notice tone="danger">{actionError}</Notice> : null}
      {loading ? (
        <Loading />
      ) : !data?.length ? (
        <Empty
          icon="package"
          title="Your product library"
          body="Add the digital products you sell. Every campaign starts from one of them."
          color="mint"
          action={
            <View style={{ gap: 10 }}>
              <Button label="Add a product" icon="plus" onPress={() => router.push("/products/new")} />
              <Button label="Try with a sample product" variant="secondary" onPress={addSample} loading={busy} />
            </View>
          }
        />
      ) : (
        data.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/products/${p.id}`)} accessibilityLabel={`Open ${p.name}`}>
            <Row gap={14}>
              {p.images.length ? (
                <AuthImage uri={productImageUrl(p.id, 0)} cacheKey={`${p.images[0].path}`} style={{ width: 64, height: 64, borderRadius: radius }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: radius, backgroundColor: colors.butter, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="image" />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Body style={{ fontFamily: "InstrumentSans_600SemiBold" }} numberOfLines={2}>
                  {p.name}
                </Body>
                <Muted numberOfLines={1}>
                  {categoryLabel(p.category)}
                  {p.isSample ? " · sample" : ""}
                </Muted>
              </View>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
