import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Field, Heading, Muted, Notice, Screen } from "../components/ui";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors, fonts } from "../lib/theme";
import { errorMessage } from "../lib/use-api";

export default function SignIn() {
  const { signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) return setFieldErrors({ email: "Enter your email first, then tap “Forgot password?” again." });
    try {
      await requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Heading>Welcome back</Heading>
      <Muted>Use the same email and password as on the PinNudge website.</Muted>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {resetSent ? <Notice tone="success">If an account exists for that email, we've sent a link to reset your password.</Notice> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={fieldErrors.email} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" error={fieldErrors.password} onSubmitEditing={submit} returnKeyType="go" />
      <Button label="Sign in" variant="primary" size="lg" onPress={submit} loading={busy} disabled={!email || !password} />
      <View style={{ alignItems: "center", gap: 14, marginTop: 4 }}>
        <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink, textDecorationLine: "underline" }}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/sign-up")} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>New here? Create an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
