import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Body, Button, Card, Eyebrow, Field, Meter, Muted, Notice, Row, Screen } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { confirm } from "../../lib/confirm";
import { DISCLAIMER, LEGAL_URLS } from "../../lib/config";
import { colors, fonts } from "../../lib/theme";
import { errorMessage } from "../../lib/use-api";
import type { Profile } from "../../shared/domain";

function ProfileCard({ profile, email, onSaved }: { profile: Profile; email: string; onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [storeName, setStoreName] = useState(profile.storeName ?? "");
  const [etsyShopUrl, setEtsyShopUrl] = useState(profile.etsyShopUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveProfile = async () => {
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      await api.put("/me/profile", {
        displayName,
        storeName,
        etsyShopUrl,
        pinterestProfileUrl: profile.pinterestProfileUrl ?? "",
        productTypes: profile.productTypes,
        visualStyle: profile.visualStyle ?? "",
        targetAudience: profile.targetAudience ?? "",
        marketingGoals: profile.marketingGoals,
        preferredLanguage: profile.preferredLanguage,
        destinationBehavior: profile.destinationBehavior,
      });
      setMessage({ tone: "success", text: "Profile saved." });
      await onSaved();
    } catch (e) {
      setMessage({ tone: "danger", text: errorMessage(e) });
      if (e instanceof ApiError) setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Muted>{email}</Muted>
      <Field label="Your name" value={displayName} onChangeText={setDisplayName} maxLength={80} error={errors.displayName} />
      <Field label="Shop name" value={storeName} onChangeText={setStoreName} hint="Can appear on your pins." maxLength={80} error={errors.storeName} />
      <Field label="Etsy shop URL" value={etsyShopUrl} onChangeText={setEtsyShopUrl} autoCapitalize="none" keyboardType="url" placeholder="https://www.etsy.com/shop/…" error={errors.etsyShopUrl} />
      <Button label="Save profile" onPress={saveProfile} loading={busy} />
    </Card>
  );
}

export default function Account() {
  const { account, refreshAccount, signOut, server } = useAuth();
  const profile = account?.profile;

  const doSignOut = async () => {
    if (await confirm("Sign out?", "You can sign back in any time.", "Sign out")) await signOut();
  };

  const usage = account?.usage;
  const local = server?.dataMode === "local";

  return (
    <Screen onRefresh={() => void refreshAccount().catch(() => undefined)}>
      <Eyebrow>Profile</Eyebrow>
      {profile ? <ProfileCard key={profile.updatedAt} profile={profile} email={account?.user.email ?? ""} onSaved={refreshAccount} /> : null}

      {account && usage ? (
        <>
          <Eyebrow>Plan and usage</Eyebrow>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Body style={{ fontFamily: fonts.semibold }}>{account.plan.name} plan</Body>
              {account.plan.cancelAtPeriodEnd && account.plan.endsAt ? <Muted>Ends {account.plan.endsAt.slice(0, 10)}</Muted> : null}
            </Row>
            <Meter label="Campaigns this month" used={usage.campaigns.used} limit={usage.campaigns.limit} />
            <Meter label="Regenerations this month" used={usage.regenerations.used} limit={usage.regenerations.limit} />
            <Meter label="Products" used={usage.products.used} limit={usage.products.limit} />
            <Muted>Up to {account.plan.limits.pinsPerCampaign} pins and {account.plan.limits.anglesPerCampaign} angles per campaign. Monthly counts reset on {new Date(usage.periodEnd).toLocaleDateString()}.</Muted>
          </Card>
        </>
      ) : null}

      <Eyebrow>About</Eyebrow>
      <Card>
        <Button label="Privacy policy" icon="shield" variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)} style={{ alignSelf: "flex-start" }} />
        <Button label="Terms of service" icon="file-text" variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)} style={{ alignSelf: "flex-start" }} />
        <Muted style={{ fontSize: 12 }}>{DISCLAIMER}</Muted>
        <Muted style={{ fontSize: 12 }}>Version {Constants.expoConfig?.version ?? "1.0.0"}</Muted>
      </Card>

      <View style={{ gap: 10 }}>
        <Button label="Sign out" icon="log-out" variant="secondary" onPress={doSignOut} />
        {local ? (
          <Muted style={{ textAlign: "center" }}>Account deletion isn't available on demo servers.</Muted>
        ) : (
          <Button label="Delete account" icon="trash-2" variant="danger" onPress={() => router.push("/account/delete")} />
        )}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
    </Screen>
  );
}
