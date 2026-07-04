"use client";

/**
 * Layout mode ("vertical" stack vs "horizontal" board+sidebar) is orthogonal
 * to viewport width. Touch devices (phones/tablets) follow the OS rotation —
 * portrait maps to vertical, landscape to horizontal — with no manual
 * control. Non-touch (desktop/laptop) devices default to vertical and expose
 * a toggle, persisted across sessions.
 *
 * `?layout=vertical|horizontal` forces the initial layout (never persisted).
 * Test-only escape hatch for the viewport lab, where per-iframe touch and
 * orientation media queries can't be faked. See .agent/DECISIONS.md.
 */
import { useCallback, useEffect, useState } from "react";

export type GameLayout = "vertical" | "horizontal";

const STORAGE_KEY = "ur-layout";

function forcedLayout(): GameLayout | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("layout");
  return value === "vertical" || value === "horizontal" ? value : null;
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function isLandscape(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: landscape)").matches;
}

export function useGameLayout(): { layout: GameLayout; isTouch: boolean; toggle(): void } {
  const [isTouch, setIsTouch] = useState(isTouchDevice);
  const [layout, setLayout] = useState<GameLayout>(() => {
    const forced = forcedLayout();
    if (forced) return forced;
    if (isTouchDevice()) return isLandscape() ? "horizontal" : "vertical";
    if (typeof window === "undefined") return "vertical";
    return window.localStorage.getItem(STORAGE_KEY) === "horizontal" ? "horizontal" : "vertical";
  });

  useEffect(() => {
    const touchQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    const onTouchChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    touchQuery.addEventListener("change", onTouchChange);
    return () => touchQuery.removeEventListener("change", onTouchChange);
  }, []);

  useEffect(() => {
    if (!isTouch || forcedLayout()) return;
    const orientationQuery = window.matchMedia("(orientation: landscape)");
    const apply = (matches: boolean) => setLayout(matches ? "horizontal" : "vertical");
    apply(orientationQuery.matches);
    const onOrientationChange = (e: MediaQueryListEvent) => apply(e.matches);
    orientationQuery.addEventListener("change", onOrientationChange);
    return () => orientationQuery.removeEventListener("change", onOrientationChange);
  }, [isTouch]);

  const toggle = useCallback(() => {
    setLayout((prev) => {
      const next: GameLayout = prev === "vertical" ? "horizontal" : "vertical";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { layout, isTouch, toggle };
}
