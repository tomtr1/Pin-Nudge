import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { AuthImage } from "../../components/auth-image";
import { Body, Button, Card, Choice, Eyebrow, Field, IconButton, Loading, Muted, Notice, Row, Screen, StatusBadge } from "../../components/ui";
import { api, ApiError, authHeaders, freshToken, pinImageUrl, previewUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { confirm } from "../../lib/confirm";
import { responseToDataUri } from "../../lib/data-uri";
import { savePinToPhotos, sharePin } from "../../lib/files";
import { colors, fonts, radius } from "../../lib/theme";
import { errorMessage, useApi } from "../../lib/use-api";
import { BASIC_FONT_PRESETS, COLOR_PRESETS, TEMPLATE_META } from "../../shared/design";
import { FONT_PRESETS, TEMPLATE_IDS, type EditablePinField, type FontPreset, type Pin, type PinDesign } from "../../shared/domain";

interface Draft {
  headline: string;
  subheadline: string;
  bullets: string;
  cta: string;
  title: string;
  description: string;
  altText: string;
  destinationUrl: string;
  keywords: string;
  design: PinDesign;
}

const toDraft = (p: Pin): Draft => ({
  headline: p.headline,
  subheadline: p.subheadline,
  bullets: p.bullets.join("\n"),
  cta: p.cta,
  title: p.title,
  description: p.description,
  altText: p.altText,
  destinationUrl: p.destinationUrl ?? "",
  keywords: p.keywords.join(", "),
  design: p.design,
});

const FONT_LABELS: Record<FontPreset, string> = { editorial: "Editorial serif", modern: "Modern sans", classic: "Classic", bold: "Bold grotesk" };
const PLACEMENTS = [
  { value: "auto", label: "Auto" },
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
  { value: "none", label: "No photo" },
] as const;

function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PinEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pin, error, loading } = useApi<Pin>(`/pins/${id}`);
  if (loading) return <Loading />;
  if (!pin) return <Screen>{error ? <Notice tone="danger">{error.message}</Notice> : null}</Screen>;
  return <PinEditor key={pin.id} initialPin={pin} />;
}

function PinEditor({ initialPin }: { initialPin: Pin }) {
  const { account, refreshAccount } = useAuth();
  const [pin, setPin] = useState(initialPin);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialPin));
  const [preview, setPreview] = useState<{ key: string; uri: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "danger" | "success" | "info" | "warning"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [plannedInput, setPlannedInput] = useState(initialPin.plannedFor ?? "");
  const previewSeq = useRef(0);

  const dirty = useMemo(() => JSON.stringify(toDraft(pin)) !== JSON.stringify(draft), [pin, draft]);
  const visualKey = JSON.stringify([draft.headline, draft.subheadline, draft.bullets, draft.cta, draft.design]);
  const savedVisualKey = JSON.stringify([pin.headline, pin.subheadline, pin.bullets.join("\n"), pin.cta, pin.design]);
  const previewUri = visualKey !== savedVisualKey && preview?.key === visualKey ? preview.uri : null;

  // Live preview of unsaved visual edits, rendered by the same server renderer as the export.
  useEffect(() => {
    if (visualKey === savedVisualKey) return;
    const seq = ++previewSeq.current;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        await freshToken();
        const res = await fetch(previewUrl(pin.id), {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            headline: draft.headline.slice(0, 90),
            subheadline: draft.subheadline.slice(0, 140),
            bullets: draft.bullets.split("\n").map((b) => b.trim()).filter(Boolean).slice(0, 5).map((b) => b.slice(0, 60)),
            cta: draft.cta.slice(0, 40),
            design: draft.design,
          }),
        });
        if (res.ok && seq === previewSeq.current) setPreview({ key: visualKey, uri: await responseToDataUri(res) });
      } catch {
        // keep the last preview
      } finally {
        if (seq === previewSeq.current) setPreviewing(false);
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visual fields only
  }, [visualKey, savedVisualKey]);

  const features = account?.plan.features;
  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const setDesign = (patch: Partial<PinDesign>) => setDraft({ ...draft, design: { ...draft.design, ...patch } });
  const usesBullets = TEMPLATE_META[draft.design.template].usesBullets;
  const lockedTemplates = TEMPLATE_IDS.filter((t) => features && !features.templates.includes(t) && t !== pin.design.template);
  const lockedFonts = FONT_PRESETS.filter((f) => features && !features.allFontPresets && !BASIC_FONT_PRESETS.includes(f) && f !== pin.design.fontPreset);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: "danger", text: errorMessage(e) });
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
    } finally {
      setBusy(null);
    }
  };

  const persist = async (): Promise<Pin> => {
    setFieldErrors({});
    const saved = await api.put<Pin>(`/pins/${pin.id}`, {
      title: draft.title,
      description: draft.description,
      primaryKeyword: pin.primaryKeyword,
      keywords: draft.keywords,
      creativeConcept: pin.creativeConcept,
      headline: draft.headline,
      subheadline: draft.subheadline,
      bullets: draft.bullets,
      cta: draft.cta,
      destinationUrl: draft.destinationUrl,
      altText: draft.altText,
      filename: pin.filename,
      design: draft.design,
    });
    setPin(saved);
    setDraft(toDraft(saved));
    return saved;
  };

  const save = () =>
    run("save", async () => {
      await persist();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage({ tone: "success", text: "Pin saved." });
    });

  const exportPin = (kind: "photos" | "share") =>
    run(kind, async () => {
      const current = dirty ? await persist() : pin;
      const name = current.filename || current.title;
      if (kind === "photos") {
        const result = await savePinToPhotos(current.id, name);
        if (result === "saved") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
          setMessage({ tone: "success", text: "Saved to Photos at full size (1000 × 1500)." });
        } else if (result === "denied") {
          setMessage({ tone: "warning", text: "PinNudge needs permission to add photos. You can allow it in Settings › PinNudge › Photos." });
        } else {
          setMessage({ tone: "info", text: "Saving to Photos works in the iPhone app." });
        }
      } else if (!(await sharePin(current.id, name))) {
        setMessage({ tone: "info", text: "Sharing works in the iPhone app." });
      }
    });

  const setStatus = (status: Pin["status"]) =>
    run(`status-${status}`, async () => {
      const updated = await api.put<Pin>(`/pins/${pin.id}/status`, { status });
      setPin(updated);
      if (status === "published") setMessage({ tone: "success", text: "Marked as published. Nice work." });
    });

  const plan = (date: string | null) =>
    run("plan", async () => {
      const updated = await api.put<Pin>(`/pins/${pin.id}/planned-date`, { date });
      setPin(updated);
      setPlannedInput(updated.plannedFor ?? "");
    });

  const regenerate = () =>
    run("regen", async () => {
      const left = account?.usage.regenerations.remaining ?? 0;
      const edited = pin.editedFields.length > 0;
      if (!(await confirm("Rewrite this pin's copy?", `${edited ? "Fields you edited by hand are kept. " : ""}Uses 1 regeneration (${left} left this month).`, "Rewrite"))) return;
      const res = await api.post<{ pin: Pin; keptFields: EditablePinField[] }>(`/pins/${pin.id}/regenerate`, { mode: "copy", overwriteEdits: false });
      setPin(res.pin);
      setDraft(toDraft(res.pin));
      void refreshAccount().catch(() => undefined);
      setMessage({ tone: "success", text: res.keptFields.length ? `New copy written. Kept your edits to: ${res.keptFields.join(", ")}.` : "New copy written." });
    });

  const duplicate = () =>
    run("duplicate", async () => {
      const copy = await api.post<Pin>(`/pins/${pin.id}/duplicate`);
      router.replace(`/pins/${copy.id}`);
    });

  const remove = () =>
    run("delete", async () => {
      if (!(await confirm("Delete this pin?", "This can't be undone.", "Delete", true))) return;
      await api.del(`/pins/${pin.id}`);
      router.back();
    });

  return (
    <Screen
      footer={
        <Row gap={10}>
          <Button label={dirty ? "Save changes" : "Saved"} icon="check" onPress={save} loading={busy === "save"} disabled={!dirty || busy !== null} style={{ flex: 1 }} />
          <Button label="Photos" icon="download" variant="secondary" onPress={() => exportPin("photos")} loading={busy === "photos"} disabled={busy !== null} />
          <IconButton icon="share" label="Share pin" onPress={() => exportPin("share")} disabled={busy !== null} />
        </Row>
      }
    >
      <Stack.Screen options={{ title: "Edit pin" }} />

      <View style={{ alignItems: "center", gap: 8 }}>
        <View style={{ width: 240, height: 360 }}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: 240, height: 360, borderRadius: radius, borderWidth: 1.5, borderColor: colors.ink }} accessibilityLabel="Preview of your unsaved changes" />
          ) : (
            <AuthImage uri={pinImageUrl(pin.id, "preview", pin.updatedAt)} cacheKey={`${pin.id}-${pin.updatedAt}`} style={{ width: 240, height: 360, borderRadius: radius, borderWidth: 1.5, borderColor: colors.ink }} accessibilityLabel={pin.altText || "Pin image"} />
          )}
        </View>
        <Row>
          <StatusBadge status={pin.status} />
          {pin.plannedFor ? <Muted>Planned for {pin.plannedFor}</Muted> : null}
          {previewing && dirty ? <Muted>Updating preview…</Muted> : dirty ? <Muted>Unsaved changes</Muted> : null}
        </Row>
      </View>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Eyebrow>On the image</Eyebrow>
      <Field label="Headline" value={draft.headline} onChangeText={set("headline")} counter={{ value: draft.headline, max: 90 }} multiline error={fieldErrors.headline} />
      <Field label="Subheadline" value={draft.subheadline} onChangeText={set("subheadline")} counter={{ value: draft.subheadline, max: 140 }} multiline error={fieldErrors.subheadline} />
      {usesBullets ? <Field label="Bullets" value={draft.bullets} onChangeText={set("bullets")} multiline hint="One per line, up to 5. Keep them short." error={fieldErrors.bullets} /> : null}
      <Field label="Call to action" value={draft.cta} onChangeText={set("cta")} counter={{ value: draft.cta, max: 40 }} error={fieldErrors.cta} />

      <Eyebrow>Design</Eyebrow>
      <Choice label="Template" options={TEMPLATE_IDS.map((t) => ({ value: t, label: TEMPLATE_META[t].name }))} value={draft.design.template} onChange={(template) => setDesign({ template })} disabledValues={lockedTemplates} />
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>Colours</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Colours">
          {COLOR_PRESETS.map((c) => {
            const active = c.background === draft.design.background && c.textColor === draft.design.textColor && c.accentColor === draft.design.accentColor;
            return (
              <Pressable
                key={c.name}
                onPress={() => setDesign({ background: c.background, textColor: c.textColor, accentColor: c.accentColor })}
                accessibilityRole="radio"
                accessibilityLabel={c.name}
                accessibilityState={{ checked: active }}
                style={{ alignItems: "center", gap: 4 }}
              >
                <View style={{ width: 48, height: 48, backgroundColor: c.background, borderRadius: radius, borderWidth: active ? 3 : 1.5, borderColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, color: c.textColor }}>Aa</Text>
                  <View style={{ position: "absolute", bottom: 5, width: 20, height: 3, backgroundColor: c.accentColor }} />
                </View>
                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Choice label="Typography" options={FONT_PRESETS.map((f) => ({ value: f, label: FONT_LABELS[f] }))} value={draft.design.fontPreset} onChange={(fontPreset) => setDesign({ fontPreset })} disabledValues={lockedFonts} />
      <Choice label="Product photo" options={PLACEMENTS} value={draft.design.imagePlacement} onChange={(imagePlacement) => setDesign({ imagePlacement })} />

      <Eyebrow>Pinterest details</Eyebrow>
      <Field label="Pin title" value={draft.title} onChangeText={set("title")} counter={{ value: draft.title, max: 100 }} error={fieldErrors.title} />
      <Field label="Description" value={draft.description} onChangeText={set("description")} counter={{ value: draft.description, max: 500 }} multiline error={fieldErrors.description} />
      <Field label="Keywords" value={draft.keywords} onChangeText={set("keywords")} hint="Comma-separated keyword ideas. Not search-volume data." autoCapitalize="none" error={fieldErrors.keywords} />
      <Field label="Link" value={draft.destinationUrl} onChangeText={set("destinationUrl")} autoCapitalize="none" keyboardType="url" placeholder="https://www.etsy.com/listing/…" error={fieldErrors.destinationUrl} />
      <Field label="Alt text" value={draft.altText} onChangeText={set("altText")} counter={{ value: draft.altText, max: 500 }} multiline hint="Describes the image for people using screen readers." error={fieldErrors.altText} />

      <Eyebrow>Status</Eyebrow>
      <Card>
        {pin.status === "draft" ? (
          <>
            <Body>Happy with it? Approve the pin so it's ready to post.</Body>
            <Button label="Approve pin" icon="check" onPress={() => setStatus("approved")} loading={busy === "status-approved"} disabled={busy !== null || dirty} />
          </>
        ) : pin.status === "approved" ? (
          <>
            <Body>Posted it on Pinterest? Mark it as published to keep your records straight. {"\n"}PinNudge doesn't post for you.</Body>
            <Button label="Mark as published" icon="send" variant="accent" onPress={() => setStatus("published")} loading={busy === "status-published"} disabled={busy !== null} />
            <Button label="Back to draft" variant="ghost" size="sm" onPress={() => setStatus("draft")} disabled={busy !== null} />
          </>
        ) : pin.status === "published" ? (
          <>
            <Body>Published{pin.publishedAt ? ` on ${pin.publishedAt.slice(0, 10)}` : ""}.</Body>
            <Button label="Undo: mark as approved" variant="ghost" size="sm" onPress={() => setStatus("approved")} disabled={busy !== null} />
          </>
        ) : (
          <Button label="Restore to draft" variant="secondary" onPress={() => setStatus("draft")} disabled={busy !== null} />
        )}
        {dirty && pin.status === "draft" ? <Muted>Save your changes before approving.</Muted> : null}
      </Card>

      <Eyebrow>Plan a date</Eyebrow>
      {features?.calendar ? (
        <Card>
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {[
              { label: "Today", d: 0 },
              { label: "Tomorrow", d: 1 },
              { label: "In 3 days", d: 3 },
              { label: "Next week", d: 7 },
            ].map((o) => (
              <Button key={o.label} label={o.label} size="sm" variant={pin.plannedFor === isoDay(o.d) ? "primary" : "secondary"} onPress={() => plan(isoDay(o.d))} disabled={busy !== null} />
            ))}
          </Row>
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <Field label="Or a date (YYYY-MM-DD)" value={plannedInput} onChangeText={setPlannedInput} placeholder="2026-11-02" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
            </View>
          </Row>
          <Row>
            <Button label="Set date" size="sm" onPress={() => plan(plannedInput.trim() || null)} loading={busy === "plan"} disabled={busy !== null || plannedInput === (pin.plannedFor ?? "")} />
            {pin.plannedFor ? <Button label="Clear" size="sm" variant="ghost" onPress={() => plan(null)} disabled={busy !== null} /> : null}
          </Row>
        </Card>
      ) : (
        <Muted>The content calendar isn't part of your current plan.</Muted>
      )}

      <Eyebrow>More</Eyebrow>
      <Button label="Rewrite the copy" icon="refresh-cw" variant="secondary" onPress={regenerate} loading={busy === "regen"} disabled={busy !== null || (account?.usage.regenerations.remaining ?? 1) <= 0} />
      <Button label="Duplicate pin" icon="copy" variant="secondary" onPress={duplicate} loading={busy === "duplicate"} disabled={busy !== null} />
      <Button label="Delete pin" icon="trash-2" variant="danger" onPress={remove} loading={busy === "delete"} disabled={busy !== null} />
    </Screen>
  );
}
