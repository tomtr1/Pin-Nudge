import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AnglesArt, Squiggle } from "../components/illustrations";
import { Block, Body, Button, Hand, Muted, Notice, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth";
import { APP_NAME, DISCLAIMER, TAGLINE } from "../lib/config";
import { errorMessage } from "../lib/use-api";

export default function Welcome() {
  const { server, serverError, reloadServer, startDemo } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demo = async () => {
    setBusy(true);
    setError(null);
    try {
      await startDemo();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen topInset>
      <View style={{ gap: 6, marginTop: 12 }}>
        <Hand>{APP_NAME}</Hand>
        <Title style={{ fontSize: 40, lineHeight: 44 }}>Turn one Etsy product into a whole Pinterest campaign.</Title>
        <Squiggle width={160} />
      </View>
      <Body style={{ color: "#4f586b" }}>{TAGLINE} Pick a product, get several different marketing angles, and edit ready-made pins you can save straight to Photos.</Body>

      <Block color="mint" minHeight={200} style={{ justifyContent: "center" }}>
        <AnglesArt />
      </Block>

      {serverError ? (
        <Notice tone="warning" title="Can't reach PinNudge" action={<Button label="Try again" size="sm" variant="secondary" onPress={reloadServer} />}>
          {serverError}
        </Notice>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <View style={{ gap: 12 }}>
        {server?.auth === "local-demo" ? (
          <>
            <Button label="Try the demo" icon="play" variant="accent" size="lg" onPress={demo} loading={busy} />
            <Muted style={{ textAlign: "center" }}>This server runs in demo mode with sample content.</Muted>
          </>
        ) : (
          <>
            <Button label="Create a free account" variant="accent" size="lg" onPress={() => router.push("/sign-up")} disabled={!server} />
            <Button label="I already have an account" variant="secondary" size="lg" onPress={() => router.push("/sign-in")} disabled={!server} />
          </>
        )}
      </View>

      <Muted style={{ textAlign: "center", fontSize: 12, marginTop: 8 }}>{DISCLAIMER}</Muted>
    </Screen>
  );
}
