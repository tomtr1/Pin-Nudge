import { useState } from "react";
import { router } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { CampaignRow } from "../../components/campaign-row";
import { Button, Choice, Empty, IconButton, Loading, Notice, Screen } from "../../components/ui";
import { useApi } from "../../lib/use-api";
import type { CampaignSummary } from "../../shared/domain";

export default function Campaigns() {
  const { data, error, loading, refreshing, refresh } = useApi<CampaignSummary[]>("/campaigns");
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const list = (data ?? []).filter((c) => (filter === "archived" ? c.status === "archived" : c.status !== "archived"));

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Tabs.Screen options={{ headerRight: () => <IconButton icon="plus" label="New campaign" onPress={() => router.push("/campaigns/new")} /> }} />
      <Choice
        options={[
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty
          icon="layers"
          title={filter === "archived" ? "Nothing archived" : "No campaigns yet"}
          body={filter === "archived" ? "Archived campaigns appear here." : "A campaign turns one product into several angles and a set of pins."}
          action={filter === "active" ? <Button label="New campaign" icon="zap" onPress={() => router.push("/campaigns/new")} /> : undefined}
        />
      ) : (
        list.map((c) => <CampaignRow key={c.id} campaign={c} />)
      )}
    </Screen>
  );
}
