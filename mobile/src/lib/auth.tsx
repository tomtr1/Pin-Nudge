import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, loadSession, onSessionChange, setSession, currentAccessToken } from "./api";
import type { AccountSummary, ServerStatus, TokenSession } from "./types";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthValue {
  status: Status;
  server: ServerStatus | null;
  serverError: string | null;
  account: AccountSummary | null;
  refreshAccount: () => Promise<void>;
  reloadServer: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; displayName?: string; acceptTerms: boolean }) => Promise<{ needsConfirmation: boolean }>;
  startDemo: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);

  const refreshAccount = useCallback(async () => {
    setAccount(await api.get<AccountSummary>("/me"));
  }, []);

  const reloadServer = useCallback(async () => {
    try {
      setServer(await api.public<ServerStatus>("/status"));
      setServerError(null);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Can't reach PinNudge.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .public<ServerStatus>("/status")
      .then((st) => alive && setServer(st))
      .catch((error: unknown) => alive && setServerError(error instanceof Error ? error.message : "Can't reach PinNudge."));
    void loadSession().then(async (s) => {
      if (!alive) return;
      if (!s) return setStatus("signedOut");
      setStatus("signedIn");
      await refreshAccount().catch(() => undefined);
    });
    const off = onSessionChange((s) => {
      setStatus(s ? "signedIn" : "signedOut");
      if (!s) setAccount(null);
    });
    return () => {
      alive = false;
      off();
    };
  }, [refreshAccount]);

  const begin = useCallback(
    async (session: TokenSession) => {
      await setSession(session);
      await refreshAccount().catch(() => undefined);
    },
    [refreshAccount],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      server,
      serverError,
      account,
      refreshAccount,
      reloadServer,
      signIn: async (email, password) => begin(await api.public<TokenSession>("/auth/sign-in", { email, password })),
      signUp: async (input) => {
        const res = await api.public<{ session: TokenSession | null; needsConfirmation: boolean }>("/auth/sign-up", input);
        if (res.session) await begin(res.session);
        return { needsConfirmation: res.needsConfirmation };
      },
      startDemo: async () => begin(await api.public<TokenSession>("/auth/local-demo", {})),
      requestPasswordReset: async (email) => {
        await api.public("/auth/reset-password", { email });
      },
      signOut: async () => {
        const token = currentAccessToken();
        if (token) await api.post("/auth/sign-out").catch(() => undefined);
        await setSession(null);
      },
      deleteAccount: async () => {
        await api.del("/me", { confirm: "DELETE" });
        await setSession(null);
      },
    }),
    [status, server, serverError, account, refreshAccount, reloadServer, begin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
