"use client";

/**
 * Layout mode ("vertical" stack vs "horizontal" board+sidebar) is orthogonal
 * to viewport width. Resolution order:
 *   1. `?layout=` URL override — test-only (viewport lab), never persisted.
 *   2. Settings orientation "vertical"/"horizontal" — user pinned it.
 *   3. "auto": touch devices follow OS rotation (portrait→vertical,
 *      landscape→horizontal, no toggle); desktops use the header toggle,
 *      which pins the choice into settings.
 */
import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/settings";

export type GameLayout = "vertical" | "horizontal";

function forcedLayout(): GameLayout | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("layout");
  return value === "vertical" || value === "horizontal" ? value : null;
}

function pinnedLayout(): GameLayout | null {
  const orientation = loadSettings().orientation;
  return orientation === "auto" ? null : orientation;
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
    const fixed = forcedLayout() ?? pinnedLayout();
    if (fixed) return fixed;
    if (isTouchDevice()) return isLandscape() ? "horizontal" : "vertical";
    return "vertical";
  });

  useEffect(() => {
    const touchQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    const onTouchChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    touchQuery.addEventListener("change", onTouchChange);
    return () => touchQuery.removeEventListener("change", onTouchChange);
  }, []);

  // Auto mode on touch: follow the device's physical rotation live.
  useEffect(() => {
    if (!isTouch || forcedLayout() || pinnedLayout()) return;
    const orientationQuery = window.matchMedia("(orientation: landscape)");
    const apply = (matches: boolean) => setLayout(matches ? "horizontal" : "vertical");
    apply(orientationQuery.matches);
    const onOrientationChange = (e: MediaQueryListEvent) => apply(e.matches);
    orientationQuery.addEventListener("change", onOrientationChange);
    return () => orientationQuery.removeEventListener("change", onOrientationChange);
  }, [isTouch]);

  // Settings panel changes (orientation pinned/unpinned) apply live.
  useEffect(() => {
    const onSettings = () => {
      const fixed = forcedLayout() ?? pinnedLayout();
      if (fixed) setLayout(fixed);
      else if (isTouchDevice()) setLayout(isLandscape() ? "horizontal" : "vertical");
    };
    window.addEventListener("ur:settings-changed", onSettings);
    return () => window.removeEventListener("ur:settings-changed", onSettings);
  }, []);

  const toggle = useCallback(() => {
    setLayout((prev) => {
      const next: GameLayout = prev === "vertical" ? "horizontal" : "vertical";
      // Desktop toggle pins the orientation (settings survive reloads).
      saveSettings({ ...loadSettings(), orientation: next });
      return next;
    });
  }, []);

  return { layout, isTouch, toggle };
}
