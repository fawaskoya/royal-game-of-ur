"use client";

import { DIFFICULTIES } from "@ur/ai";
import { useSettings, type Settings } from "@/lib/settings";
import { Modal } from "./ui/Modal";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";
import { SITE_LINKS } from "@/lib/site/pages";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-[var(--ink)]">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          role="radio"
          aria-checked={value === option.id}
          className={[
            "btn rounded-lg px-2.5 py-1 text-xs",
            value === option.id ? "ring-1 ring-[var(--gold)] text-[var(--gold)]" : "",
          ].join(" ")}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const { settings, update } = useSettings();

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="flex flex-col divide-y divide-white/5">
        <Row label="Board orientation">
          <Segmented<Settings["orientation"]>
            label="Board orientation"
            value={settings.orientation}
            options={[
              { id: "auto", label: "Auto" },
              { id: "vertical", label: "Vertical" },
              { id: "horizontal", label: "Horizontal" },
            ]}
            onChange={(orientation) => update({ orientation })}
          />
        </Row>
        <Row label="Move hints">
          <Segmented<"on" | "off">
            label="Move hints"
            value={settings.hints ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ hints: v === "on" })}
          />
        </Row>
        <Row label="Show the route">
          <Segmented<"on" | "off">
            label="Show the route"
            value={settings.route ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ route: v === "on" })}
          />
        </Row>
        <Row label="Opening tips">
          <Segmented<"on" | "off">
            label="Opening tips"
            value={settings.coach ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ coach: v === "on" })}
          />
        </Row>
        <Row label="Confirm new game">
          <Segmented<"on" | "off">
            label="Confirm new game"
            value={settings.confirmNew ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ confirmNew: v === "on" })}
          />
        </Row>
        <Row label="Animations">
          <Segmented<Settings["motion"]>
            label="Animations"
            value={settings.motion}
            options={[
              { id: "system", label: "System" },
              { id: "reduced", label: "Reduced" },
            ]}
            onChange={(motion) => update({ motion })}
          />
        </Row>
        <Row label="Dice speed">
          <Segmented<Settings["diceSpeed"]>
            label="Dice speed"
            value={settings.diceSpeed}
            options={[
              { id: "physics", label: "Physics" },
              { id: "quick", label: "Quick" },
              { id: "instant", label: "Instant" },
            ]}
            onChange={(diceSpeed) => update({ diceSpeed })}
          />
        </Row>
        <Row label="Sound">
          <Segmented<"on" | "off">
            label="Sound"
            value={settings.sound ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ sound: v === "on" })}
          />
        </Row>
        <Row label="Theme">
          <Segmented<Settings["theme"]>
            label="Theme"
            value={settings.theme}
            options={[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ]}
            onChange={(theme) => update({ theme })}
          />
        </Row>
        <p className="pt-2 text-xs text-[var(--ink-dim)]">
          Auto orientation follows your device rotation on touch screens and the header toggle on
          desktop. {DIFFICULTIES.length} AI tiers available — pick per game from the menu.
        </p>
        <p className="pt-2 text-xs text-[var(--ink-dim)]">
          Bug, idea, or something confusing? Write to{" "}
          <a className="text-[var(--gold)] underline-offset-2 hover:underline" href={CONTACT_HREF}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <nav aria-label="About this site" className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs">
          {SITE_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[var(--gold)] underline-offset-2 hover:underline">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </Modal>
  );
}
