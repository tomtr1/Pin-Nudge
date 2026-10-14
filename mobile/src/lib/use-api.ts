import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, ApiError } from "./api";

interface Result<T> {
  path: string | null;
  data: T | null;
  error: ApiError | null;
}

/**
 * Loads `path` from the API, refetching whenever the screen regains focus so
 * lists stay current after edits made on other screens.
 */
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<Result<T>>({ path: null, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);

  /** Starts a request; the returned promise resolves to a state updater (or null if superseded). */
  const start = useCallback((): Promise<((r: Result<T>) => Result<T>) | null> => {
    if (!path) return Promise.resolve(null);
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    return api.get<T>(path, c.signal).then(
      (data) => (c.signal.aborted ? null : () => ({ path, data, error: null })),
      (e: unknown) => {
        if (c.signal.aborted) return null;
        const error = e instanceof ApiError ? e : new ApiError("Something went wrong.", 0, "server");
        return (r: Result<T>) => ({ path, data: r.path === path ? r.data : null, error });
      },
    );
  }, [path]);

  const fetchPath = useCallback(async () => {
    const update = await start();
    if (update) setResult(update);
  }, [start]);

  useEffect(() => {
    start().then((update) => update && setResult(update));
    return () => controller.current?.abort();
  }, [start]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void fetchPath();
    }, [fetchPath]),
  );

  const current = result.path === path;
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: path !== null && !current,
    refreshing,
    setData: (data: T) => setResult({ path, data, error: null }),
    reload: fetchPath,
    refresh: async () => {
      setRefreshing(true);
      await fetchPath();
      setRefreshing(false);
    },
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
