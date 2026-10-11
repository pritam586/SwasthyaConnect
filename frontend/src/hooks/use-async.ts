"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export function useAsync<T>(loader: () => Promise<T>, deps: ReadonlyArray<unknown> = []) {
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const result = await loader();
      setData(result);
      setStatus("success");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setStatus("error");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { status, data, error, reload: run, setData };
}
