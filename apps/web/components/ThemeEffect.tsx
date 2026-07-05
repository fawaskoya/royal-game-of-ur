"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

/** Applies the persisted theme to <html data-theme> — a leaf component so its
 * re-renders (on settings change) never touch the rest of the app's tree. */
export function ThemeEffect() {
  const { settings } = useSettings();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);
  return null;
}
