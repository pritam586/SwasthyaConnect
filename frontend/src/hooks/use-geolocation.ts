"use client";

import { useCallback, useState } from "react";

export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unavailable" };

/** Asks for location only when called (never on page load), and reports denial explicitly. */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback(
    () =>
      new Promise<GeoState>((resolve) => {
        const finish = (next: GeoState) => {
          setState(next);
          resolve(next);
        };
        if (!("geolocation" in navigator)) {
          finish({ status: "unavailable" });
          return;
        }
        setState({ status: "locating" });
        navigator.geolocation.getCurrentPosition(
          (position) => finish({ status: "ready", latitude: position.coords.latitude, longitude: position.coords.longitude }),
          (error) => finish({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
        );
      }),
    [],
  );

  return { state, locate };
}
