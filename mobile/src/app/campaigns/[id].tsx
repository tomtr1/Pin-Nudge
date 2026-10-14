import { useState } from "react";
import { Pressable, Switch, useWindowDimensions, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AuthImage } from "../../components/auth-image";
import { Block, Body, Button, Card, Empty, Eyebrow, Field, Heading, IconButton, Loading, Muted, Notice, Row, Screen, StatusBadge } from "../../components/ui";
import { api, pinImageUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { confirm } from "../../lib/confirm";
import { colors, fonts, radius } from "../../lib/theme";
import { errorMessage, useApi } from "../../lib/use-api";
import type { CampaignAngle, CampaignWithDetails } from "../../shared/domain";

function AngleCard({ angle, disabled, onSaved }: { angle: CampaignAngle; disabled: boolean; onSaved: (a: CampaignAngle) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(angle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: CampaignAngle) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api.put<CampaignAngle>(`/angles/${angle.id}`, next));
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={!angle.selected && { opacity: 0.65 }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Pressable style={{ flex: 1, gap: 4 }} onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`${angle.name}. ${open ? "Collapse" : "Expand to edit"}`}>
          <Body style={{ fontFamily: fonts.semibold }}>{angle.name}</Body>
          <Muted numberOfLines={open ? undefined : 2}>{angle.message}</Muted>
        </Pressable>
        <Switch
          value={angle.selected}
          disabled={disabled || busy}
          onValueChange={(selected) => void save({ ...angle, selected })}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel={`Use angle ${angle.name}`}
        />
      </Row>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {open ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <Field label="Angle name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={120} />
          <Field label="Audience" value={draft.audience} onChangeText={(audience) => setDraft({ ...draft, audience })} maxLength={300} />
          <Field label="Problem or wish" value={draft.problem} onChangeText={(problem) => setDraft({ ...draft, problem })} multiline maxLength={500} />
          <Field label="Main message" value={draft.message} onChangeText={(message) => setDraft({ ...draft, message })} multiline maxLength={500} />
          <Row>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => { setDraft(angle); setOpen(false); }} />
            <Button label="Save angle" size="sm" onPress={() => void save(draft)} loading={busy} disabled={!draft.name.trim() || disabled} />
          </Row>
        </View>
      ) : null}
    </Card>
  );
}

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, refreshAccount } = useAuth();
  const { data: campaign, setData, error, loading, refreshing, refresh, reload } = useApi<CampaignWithDetails>(`/campaigns/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "danger" | "success" | "info"; text: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 700) - 40 - 12) / 2);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: "danger", text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (!campaign) return <Screen>{error ? <Notice tone="danger">{error.message}</Notice> : null}</Screen>;

  const selected = campaign.angles.filter((a) => a.selected).length;
  const pins = campaign.pins.filter((p) => p.status !== "archived");
  const drafts = pins.filter((p) => p.status === "draft").length;
  const regenLeft = account?.usage.regenerations.remaining ?? 0;
  const archived = campaign.status === "archived";

  const generateAngles = () =>
    run("angles", async () => {
      if (campaign.angles.length && !(await confirm("Replace the angles?", `New angles replace the current ones. This uses 1 regeneration (${regenLeft} left this month).`, "Replace"))) return;
      setData(await api.post<CampaignWithDetails>(`/campaigns/${campaign.id}/angles`));
      void refreshAccount().catch(() => undefined);
    });

  const generatePins = () =>
    run("pins", async () => {
      setData(await api.post<CampaignWithDetails>(`/campaigns/${campaign.id}/pins`));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void refreshAccount().catch(() => undefined);
    });

  const approveAll = () =>
    run("approve", async () => {
      const res = await api.post<{ approved: number }>(`/campaigns/${campaign.id}/approve-all`);
      await reload();
      setMessage({ tone: "success", text: res.approved ? `Approved ${res.approved} pin${res.approved === 1 ? "" : "s"}.` : "No complete draft pins to approve." });
    });

  const rename = () =>
    run("rename", async () => {
      await api.patch(`/campaigns/${campaign.id}`, { name: renaming });
      setData({ ...campaign, name: renaming!.trim() });
      setRenaming(null);
    });

  const toggleArchive = () => run("archive", async () => {
    await api.patch(`/campaigns/${campaign.id}`, { archived: !archived });
    await reload();
  });

  const remove = () =>
    run("delete", async () => {
      if (!(await confirm("Delete this campaign?", "Its angles and pins are deleted permanently.", "Delete", true))) return;
      await api.del(`/campaigns/${campaign.id}`);
      router.back();
    });

  const footer =
    campaign.angles.length === 0 ? (
      <Button label={busy === "angles" ? "Finding angles…" : "Generate marketing angles"} icon="zap" variant="accent" size="lg" onPress={generateAngles} loading={busy === "angles"} disabled={archived} />
    ) : pins.length === 0 ? (
      <>
        {busy === "pins" ? <Muted style={{ textAlign: "center" }}>Writing your pins. This can take up to a minute.</Muted> : null}
        <Button
          label={busy === "pins" ? "Writing pins…" : `Generate ${campaign.config.pinCount} pins`}
          icon="zap"
          variant="accent"
          size="lg"
          onPress={generatePins}
          loading={busy === "pins"}
          disabled={selected === 0 || selected > campaign.config.pinCount || archived || busy !== null}
        />
      </>
    ) : drafts > 0 ? (
      <Button label={`Approve ${drafts} draft${drafts === 1 ? "" : "s"}`} icon="check" size="lg" onPress={approveAll} loading={busy === "approve"} />
    ) : undefined;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} footer={footer}>
      <Stack.Screen options={{ title: "Campaign", headerRight: () => <IconButton icon="edit-2" label="Rename campaign" onPress={() => setRenaming(campaign.name)} /> }} />

      {renaming !== null ? (
        <Card>
          <Field label="Campaign name" value={renaming} onChangeText={setRenaming} maxLength={160} autoFocus />
          <Row>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setRenaming(null)} />
            <Button label="Save name" size="sm" onPress={rename} loading={busy === "rename"} disabled={!renaming.trim()} />
          </Row>
        </Card>
      ) : (
        <View style={{ gap: 6 }}>
          <Heading>{campaign.name}</Heading>
          <Row>
            <StatusBadge status={campaign.status} />
            {campaign.generationSource === "demo" ? <Muted>Demo content</Muted> : null}
          </Row>
          {campaign.productSnapshot?.name ? <Muted>For {campaign.productSnapshot.name}</Muted> : null}
        </View>
      )}

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {campaign.angles.length === 0 ? (
        <Empty icon="compass" title="Generate marketing angles" body="Your settings are saved. Next, get a few distinct angles to build the pins from." color="sky" />
      ) : (
        <View style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Eyebrow>Angles · {selected} selected</Eyebrow>
            {pins.length === 0 ? <Button label="New angles" icon="refresh-cw" variant="ghost" size="sm" onPress={generateAngles} loading={busy === "angles"} disabled={regenLeft <= 0 || busy !== null} /> : null}
          </Row>
          {pins.length === 0 ? <Muted>Switch off the angles you don't want. Tap one to edit it.</Muted> : null}
          {selected > campaign.config.pinCount ? <Notice tone="warning">You've selected more angles than pins ({campaign.config.pinCount}). Switch some off first.</Notice> : null}
          {campaign.angles.map((a) => (
            <AngleCard key={a.id} angle={a} disabled={pins.length > 0 || busy !== null} onSaved={(next) => setData({ ...campaign, angles: campaign.angles.map((x) => (x.id === next.id ? next : x)) })} />
          ))}
        </View>
      )}

      {pins.length ? (
        <View style={{ gap: 12 }}>
          <Eyebrow>Pins · tap to edit</Eyebrow>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {pins.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/pins/${p.id}`)} accessibilityRole="button" accessibilityLabel={`Edit pin: ${p.headline}`} style={{ width: tile, gap: 6 }}>
                <AuthImage uri={pinImageUrl(p.id, "thumb", p.updatedAt)} cacheKey={`${p.id}-${p.updatedAt}-thumb`} style={{ width: tile, height: tile * 1.5, borderRadius: radius, borderWidth: 1.5, borderColor: colors.ink }} />
                <StatusBadge status={p.status} />
                <Muted numberOfLines={2}>{p.title}</Muted>
              </Pressable>
            ))}
          </View>
          <Block color="butter" style={{ gap: 6 }}>
            <Body style={{ fontFamily: fonts.semibold }}>Posting to Pinterest</Body>
            <Muted style={{ color: colors.ink }}>Open a pin, save it to Photos or share it to the Pinterest app, then mark it as published so your calendar stays accurate.</Muted>
          </Block>
        </View>
      ) : null}

      <View style={{ gap: 10, marginTop: 8 }}>
        <Button label={archived ? "Restore campaign" : "Archive campaign"} icon="archive" variant="secondary" onPress={toggleArchive} loading={busy === "archive"} />
        <Button label="Delete campaign" icon="trash-2" variant="danger" onPress={remove} loading={busy === "delete"} />
      </View>
    </Screen>
  );
}
