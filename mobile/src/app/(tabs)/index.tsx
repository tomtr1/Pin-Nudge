import { View } from "react-native";
import { router } from "expo-router";
import { CampaignRow } from "../../components/campaign-row";
import { Squiggle } from "../../components/illustrations";
import { Block, Body, Button, Empty, Eyebrow, Hand, Heading, Meter, Muted, Notice, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/use-api";
import type { CampaignSummary, Product } from "../../shared/domain";

export default function Home() {
  const { account, refreshAccount } = useAuth();
  const campaigns = useApi<CampaignSummary[]>("/campaigns");
  const products = useApi<Product[]>("/products");
  const name = account?.profile?.displayName?.split(" ")[0];
  const usage = account?.usage;

  const refresh = () => {
    void refreshAccount().catch(() => undefined);
    void campaigns.refresh();
    void products.refresh();
  };

  const hasProducts = (products.data?.length ?? 0) > 0;
  const recent = (campaigns.data ?? []).filter((c) => c.status !== "archived").slice(0, 4);

  return (
    <Screen topInset onRefresh={refresh} refreshing={campaigns.refreshing}>
      <View style={{ gap: 4 }}>
        <Hand>{name ? `Hi ${name},` : "Hi there,"}</Hand>
        <Title>What are we pinning today?</Title>
        <Squiggle width={120} />
      </View>

      {account?.app.aiMode === "demo" ? (
        <Notice tone="info" title="Demo content">
          AI writing isn't connected on this server, so pins use clearly labelled sample copy.
        </Notice>
      ) : null}
      {account?.plan.paymentIssue ? <Notice tone="warning">There's a problem with your subscription payment. Paid features stay on for a short grace period.</Notice> : null}

      <Block color="sky" style={{ gap: 10 }}>
        <Heading>{hasProducts ? "Start a new campaign" : "Start with a product"}</Heading>
        <Body>{hasProducts ? "Pick a product and get several different angles, each with its own pins." : "Add one of your Etsy digital products. A name and its main benefit are enough to begin."}</Body>
        <Button
          label={hasProducts ? "New campaign" : "Add a product"}
          icon={hasProducts ? "zap" : "plus"}
          variant="primary"
          onPress={() => router.push(hasProducts ? "/campaigns/new" : "/products/new")}
        />
      </Block>

      {usage && account ? (
        <View style={{ gap: 12 }}>
          <Eyebrow>This month on the {account.plan.name} plan</Eyebrow>
          <Meter label="Campaigns" used={usage.campaigns.used} limit={usage.campaigns.limit} />
          <Meter label="Regenerations" used={usage.regenerations.used} limit={usage.regenerations.limit} />
          <Meter label="Products" used={usage.products.used} limit={usage.products.limit} />
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Eyebrow>Recent campaigns</Eyebrow>
        {campaigns.error ? <Notice tone="danger">{campaigns.error.message}</Notice> : null}
        {recent.length === 0 && !campaigns.loading ? (
          <Empty icon="layers" title="No campaigns yet" body="Your campaigns will show up here once you create one." color="butter" />
        ) : (
          recent.map((c) => <CampaignRow key={c.id} campaign={c} />)
        )}
        {(campaigns.data?.length ?? 0) > recent.length ? <Button label="See all campaigns" variant="secondary" onPress={() => router.push("/campaigns")} /> : null}
      </View>
      <Muted style={{ textAlign: "center", fontSize: 12 }}>Pinterest publishing is done by you: save pins to Photos or share them to the Pinterest app.</Muted>
    </Screen>
  );
}
