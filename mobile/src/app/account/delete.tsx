import { useState } from "react";
import { Body, Button, Field, Heading, Notice, Screen } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { errorMessage } from "../../lib/use-api";

/** In-app account deletion (App Store Review Guideline 5.1.1(v)). */
export default function DeleteAccount() {
  const { deleteAccount, account } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading>Delete your account</Heading>
      <Body>
        This permanently deletes your account{account?.user.email ? ` (${account.user.email})` : ""}, your products and their photos, campaigns, pins and
        usage history, on this app and on the website. It can't be undone.
      </Body>
      {account?.plan.isPaid ? <Notice tone="warning">Your active subscription is cancelled as part of the deletion, so you won't be charged again.</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Field label='Type "DELETE" to confirm' value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
      <Button label="Delete my account permanently" variant="danger" icon="trash-2" size="lg" onPress={submit} loading={busy} disabled={typed !== "DELETE"} />
    </Screen>
  );
}
