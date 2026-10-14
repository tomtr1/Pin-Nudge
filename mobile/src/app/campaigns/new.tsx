import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Choice, Empty, Eyebrow, Field, Loading, Muted, Notice, Screen, Stepper } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { errorMessage, useApi } from "../../lib/use-api";
import { OBJECTIVES, TONES } from "../../shared/constants";
import { TEMPLATE_META } from "../../shared/design";
import { TEMPLATE_IDS, type Product } from "../../shared/domain";

export default function NewCampaign() {
  const params = useLocalSearchParams<{ product?: string }>();
  const { account, refreshAccount } = useAuth();
  const products = useApi<Product[]>("/products");
  const limits = account?.plan.limits;
  const [productId, setProductId] = useState(params.product ?? "");
  const [objective, setObjective] = useState("traffic");
  const [tone, setTone] = useState("friendly");
  const [pinCount, setPinCount] = useState(6);
  const [angleCount, setAngleCount] = useState(2);
  const [template, setTemplate] = useState<string>("auto");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [cta, setCta] = useState("");
  const [season, setSeason] = useState("");
  const [busy, setBusy] = useState<"create" | "angles" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProduct = productId || products.data?.[0]?.id || "";
  const pins = Math.min(pinCount, limits?.pinsPerCampaign ?? pinCount);
  const angles = Math.min(angleCount, limits?.anglesPerCampaign ?? angleCount, pins);

  const outOfCampaigns = account ? !account.usage.campaigns.allowed : false;
  const allowedTemplates = account?.plan.features.templates ?? [];

  const create = async () => {
    setBusy("create");
    setError(null);
    setErrors({});
    let campaignId: string | null = null;
    try {
      const res = await api.post<{ id: string }>("/campaigns", {
        productId: selectedProduct,
        config: { objective, tone, pinCount: pins, angleCount: angles, template, primaryKeyword, cta, season, visualStyle: "minimal", language: account?.profile?.preferredLanguage ?? "en", variety: "balanced" },
      });
      campaignId = res.id;
      setBusy("angles");
      await api.post(`/campaigns/${campaignId}/angles`);
      void refreshAccount().catch(() => undefined);
      router.replace(`/campaigns/${campaignId}`);
    } catch (e) {
      if (campaignId) {
        // The draft exists; the campaign screen lets the user retry generating angles.
        router.replace(`/campaigns/${campaignId}`);
        return;
      }
      setError(errorMessage(e));
      if (e instanceof ApiError) setErrors(e.fieldErrors);
    } finally {
      setBusy(null);
    }
  };

  if (products.loading) return <Loading />;
  if (!products.data?.length) {
    return (
      <Screen>
        <Empty icon="package" title="Add a product first" body="Campaigns are built from one of your products." action={<Button label="Add a product" onPress={() => router.replace("/products/new")} />} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {busy === "angles" ? <Muted style={{ textAlign: "center" }}>Finding different angles for your product. This can take up to a minute.</Muted> : null}
          <Button label={busy === "angles" ? "Finding angles…" : "Generate marketing angles"} icon="zap" variant="accent" size="lg" onPress={create} loading={busy !== null} disabled={!selectedProduct || outOfCampaigns} />
        </>
      }
    >
      {outOfCampaigns ? <Notice tone="warning" title="Monthly campaign limit reached">You've used all campaign generations for this month on your current plan. The count resets on {new Date(account!.usage.periodEnd).toLocaleDateString()}.</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Choice label="Product" options={products.data.map((p) => ({ value: p.id, label: p.name.length > 34 ? `${p.name.slice(0, 33)}…` : p.name }))} value={selectedProduct} onChange={setProductId} />
      <Choice label="Goal" options={OBJECTIVES.map((o) => ({ value: o.value as string, label: o.label }))} value={objective} onChange={setObjective} />

      <View style={{ gap: 10 }}>
        <Eyebrow>Size</Eyebrow>
        <Stepper label="Pins" value={pins} min={1} max={limits?.pinsPerCampaign ?? 6} onChange={setPinCount} />
        <Stepper label="Angles" value={angles} min={1} max={Math.min(limits?.anglesPerCampaign ?? 2, pins)} onChange={setAngleCount} />
        <Muted>Each angle speaks to a different buyer or need. Pins are spread across the angles you keep.</Muted>
        {errors["config.angleCount"] ? <Notice tone="danger">{errors["config.angleCount"]}</Notice> : null}
      </View>

      <Choice label="Tone" options={TONES.map((o) => ({ value: o.value as string, label: o.label }))} value={tone} onChange={setTone} />
      <Choice
        label="Pin design"
        options={[{ value: "auto", label: "Mix it up" }, ...TEMPLATE_IDS.map((id) => ({ value: id as string, label: TEMPLATE_META[id].name }))]}
        value={template}
        onChange={setTemplate}
        disabledValues={TEMPLATE_IDS.filter((id) => !allowedTemplates.includes(id))}
      />
      <Field label="Main keyword (optional)" value={primaryKeyword} onChangeText={setPrimaryKeyword} placeholder="weekly planner printable" autoCapitalize="none" maxLength={80} />
      <Field label="Call to action (optional)" value={cta} onChangeText={setCta} placeholder="Get the template" maxLength={40} />
      <Field label="Season or event (optional)" value={season} onChangeText={setSeason} placeholder="Back to school" maxLength={80} />
    </Screen>
  );
}
