"use client";

/**
 * Persisted app settings (versioned, fail-safe). Settings are orthogonal to
 * game saves: they live under their own key and survive New Game.
 *
 * `useSettings` keeps all mounted consumers in sync via a window event —
 * single-tab is the design target; cross-tab sync can ride the storage
 * event later if ever needed.
 */
import { useCallback, useEffect, useState } from "react";

export const SETTINGS_VERSION = 1;
const SETTINGS_KEY = "ur:settings";
const CHANGE_EVENT = "ur:settings-changed";

export interface Settings {
  /** Board orientation: follow device/toggle ("auto") or force one. */
  readonly orientation: "auto" | "vertical" | "horizontal";
  /** Show the Hint button / H shortcut. */
  readonly hints: boolean;
  /** Ask before replacing a live game. */
  readonly confirmNew: boolean;
  /** "system" respects prefers-reduced-motion; "reduced" always reduces. */
  readonly motion: "system" | "reduced";
  /** Dice tumble: full spring, a faster settle, or an immediate result. */
  readonly diceSpeed: "physics" | "quick" | "instant";
  /** Short synthesized sound effects (roll, move, capture, rosette, win). */
  readonly sound: boolean;
  /** "light" = parchment palette for the page chrome; the board stays wood/ivory in both. */
  readonly theme: "dark" | "light";
}

export const DEFAULT_SETTINGS: Settings = {
  orientation: "auto",
  hints: true,
  confirmNew: true,
  motion: "system",
  diceSpeed: "physics",
  sound: true,
  theme: "dark",
};

/**
 * All fields are read individually with a safe fallback, so adding a field
 * here (as above) never needs a version bump or migration — an old stored
 * payload just gets the new field's default. Only a field *shape* change
 * (not a new field) would need SETTINGS_VERSION bumped + a migration.
 */
export function loadSettings(): Settings {
  try {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as { version?: unknown; settings?: Partial<Settings> };
    if (parsed.version !== SETTINGS_VERSION || typeof parsed.settings !== "object" || parsed.settings === null) {
      return DEFAULT_SETTINGS;
    }
    const s = parsed.settings;
    return {
      orientation: s.orientation === "vertical" || s.orientation === "horizontal" ? s.orientation : "auto",
      hints: typeof s.hints === "boolean" ? s.hints : DEFAULT_SETTINGS.hints,
      confirmNew: typeof s.confirmNew === "boolean" ? s.confirmNew : DEFAULT_SETTINGS.confirmNew,
      motion: s.motion === "reduced" ? "reduced" : "system",
      diceSpeed: s.diceSpeed === "quick" || s.diceSpeed === "instant" ? s.diceSpeed : "physics",
      sound: typeof s.sound === "boolean" ? s.sound : DEFAULT_SETTINGS.sound,
      theme: s.theme === "light" ? "light" : "dark",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, settings }));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* storage unavailable — settings stay in-memory for this session */
  }
}

export function useSettings(): { settings: Settings; update(patch: Partial<Settings>): void } {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Read after mount (SSR-safe), and follow changes from other components.
  useEffect(() => {
    setSettings(loadSettings());
    const onChange = () => setSettings(loadSettings());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}
