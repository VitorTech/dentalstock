"use client";

import { useEffect, useState } from "react";
import { getSession, type SessionView } from "./api";

/** Session identity, as the screens see it. */
export type Me = SessionView;

/**
 * Module-level cache of the session identity.
 *
 * It exists for a measured reason: the hook is consumed by the header, by the
 * page AND by every procedure card. Without the cache, opening a specialty
 * with 12 procedures fired 14 identical calls to /api/auth/me — and each one
 * costs three database queries (session, clinic and user).
 *
 * `inFlight` is what solves the real case: the components mount on the same
 * tick, so a cache filled only when the first response lands would arrive too
 * late. By sharing the promise, simultaneous mounts await the SAME request.
 *
 * The scope is the page load. Signing out performs a hard navigation
 * (`window.location`), which recreates the module — there is no risk of a
 * stale identity surviving a user switch.
 */
let cache: Me | null = null;
let inFlight: Promise<Me | null> | null = null;
const subscribers = new Set<(me: Me | null) => void>();

async function load(): Promise<Me | null> {
  if (cache) return cache;

  inFlight ??= getSession().then((data) => {
    // Failures are not memoized: the next component to mount tries again,
    // instead of the screen being stuck on a momentary network error.
    if (data) cache = data;
    inFlight = null;
    subscribers.forEach((notify) => notify(data));
    return data;
  });

  return inFlight;
}

/** Drops the memoized identity (clinic switch, role change). */
export function invalidateMe() {
  cache = null;
  inFlight = null;
}

/**
 * The current session identity, so the interface can adapt to the role.
 *
 * Important: this is VISUAL CONVENIENCE, not security. Hiding a button
 * protects nothing — the route guard on the server is what decides. The screen
 * uses this only to avoid offering an action that would end in a 403.
 */
export function useMe() {
  const [me, setMe] = useState<Me | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let active = true;
    const receive = (value: Me | null) => {
      if (active) setMe(value);
    };
    subscribers.add(receive);

    load().then((value) => {
      if (!active) return;
      setMe(value);
      setLoading(false);
    });

    return () => {
      active = false;
      subscribers.delete(receive);
    };
  }, []);

  const role = me?.user.role;

  return {
    me,
    loading,
    /** May change the clinic's catalog (materials, instruments, procedures). */
    canManage: role === "OWNER" || role === "MEMBER",
    /** May see costs. */
    canSeeCosts: role === "OWNER" || role === "MEMBER",
  };
}
