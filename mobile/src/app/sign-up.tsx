import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Field, Heading, Muted, Notice, Row, Screen } from "../components/ui";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { LEGAL_URLS } from "../lib/config";
import { colors, fonts } from "../lib/theme";
import { errorMessage } from "../lib/use-api";

export default function SignUp() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await signUp({ email: email.trim(), password, displayName: displayName.trim() || undefined, acceptTerms });
      if (res.needsConfirmation) setConfirmSent(true);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <Screen>
        <Heading>Check your inbox</Heading>
        <Notice tone="success">We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.</Notice>
      </Screen>
    );
  }

  const link = (label: string, url: string) => (
    <Text style={{ fontFamily: fonts.semibold, textDecorationLine: "underline" }} onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link">
      {label}
    </Text>
  );

  return (
    <Screen>
      <Heading>Create your account</Heading>
      <Muted>The free plan lets you try the full workflow. Your account also works on the PinNudge website.</Muted>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Field label="Your name (optional)" value={displayName} onChangeText={setDisplayName} autoComplete="name" textContentType="name" maxLength={80} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={fieldErrors.email} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters." error={fieldErrors.password} />
      <Pressable onPress={() => setAcceptTerms((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }}>
        <Row gap={12} style={{ alignItems: "flex-start" }}>
          <Switch value={acceptTerms} onValueChange={setAcceptTerms} trackColor={{ true: colors.accent, false: colors.border }} accessibilityLabel="Accept the terms and privacy policy" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink }}>
              I agree to the {link("Terms", LEGAL_URLS.terms)} and {link("Privacy Policy", LEGAL_URLS.privacy)}.
            </Text>
            {fieldErrors.acceptTerms ? <Text style={{ color: colors.danger, fontFamily: fonts.medium, fontSize: 13 }}>{fieldErrors.acceptTerms}</Text> : null}
          </View>
        </Row>
      </Pressable>
      <Button label="Create account" variant="accent" size="lg" onPress={submit} loading={busy} disabled={!email || password.length < 8 || !acceptTerms} />
    </Screen>
  );
}
